import Stripe from 'stripe';
import { config } from '@ap/shared/config';
import { supabaseService } from '@ap/shared/supabase';
import { getLogger } from '@ap/shared/logger';
import { getRoleFromStripePrice } from './roles';
import type { UserRole } from '@ap/shared/types';

/**
 * Get logger instance
 */
function getLoggerInstance() {
  return getLogger();
}

/**
 * Get Stripe client instance
 */
function getStripeClient(): Stripe {
  return new Stripe(config().STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Webhook event processing result
 */
export interface WebhookProcessingResult {
  success: boolean;
  statusCode: number;
  message: string;
  userId?: string;
  role?: UserRole;
}

/**
 * Verify Stripe webhook signature
 * @param payload - Raw webhook payload
 * @param signature - Stripe signature header
 * @returns True if signature is valid, false otherwise
 */
export function verifyStripeSignature(payload: string, signature: string): boolean {
  try {
    const webhookSecret = config().STRIPE_WEBHOOK_SECRET;
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return !!event;
  } catch (error) {
    getLoggerInstance().warn(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Stripe signature verification failed'
    );
    return false;
  }
}

/**
 * Check if webhook event has already been processed (idempotency)
 * @param eventId - Stripe event ID
 * @returns True if event already processed, false otherwise
 */
export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('webhook_event')
    .select('id')
    .eq('provider', 'stripe')
    .eq('dedupe_key', eventId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    getLoggerInstance().error(
      { error: error.message, eventId },
      'Failed to check webhook event idempotency'
    );
    throw new Error(`Failed to check webhook event idempotency: ${error.message}`);
  }

  return !!data;
}

/**
 * Record webhook event for idempotency tracking
 * @param eventId - Stripe event ID
 * @param eventType - Stripe event type
 * @param payload - Event payload
 * @param signatureOk - Whether signature verification passed
 * @param httpStatus - HTTP status code returned
 * @returns Created webhook event ID
 */
export async function recordWebhookEvent(
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>,
  signatureOk: boolean,
  httpStatus: number
): Promise<string> {
  const { data, error } = await supabaseService
    .from('webhook_event')
    .insert({
      provider: 'stripe',
      event_type: eventType,
      dedupe_key: eventId,
      payload,
      signature_ok: signatureOk,
      http_status: httpStatus,
    })
    .select('id')
    .single();

  if (error) {
    getLoggerInstance().error(
      { error: error.message, eventId, eventType },
      'Failed to record webhook event'
    );
    throw new Error(`Failed to record webhook event: ${error.message}`);
  }

  return (data as { id: string }).id;
}

/**
 * Process Stripe invoice.paid event
 * @param invoice - Stripe invoice object
 * @returns Processing result
 */
export async function processInvoicePaidEvent(
  invoice: Stripe.Invoice
): Promise<WebhookProcessingResult> {
  try {
    if (!invoice.subscription || typeof invoice.subscription === 'string') {
      return {
        success: false,
        statusCode: 400,
        message: 'Invoice does not have a valid subscription',
      };
    }

    // Get subscription details
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!subscription.items.data.length) {
      return {
        success: false,
        statusCode: 400,
        message: 'Subscription has no items',
      };
    }

    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      return {
        success: false,
        statusCode: 400,
        message: 'Subscription item has no price ID',
      };
    }
    const role = getRoleFromStripePrice(priceId);

    if (!role) {
      getLoggerInstance().warn({ priceId }, 'Unknown Stripe price ID in invoice.paid event');
      return {
        success: false,
        statusCode: 400,
        message: `Unknown price ID: ${priceId}`,
      };
    }

    // Get customer ID
    const customerId = subscription.customer as string;
    if (!customerId) {
      return {
        success: false,
        statusCode: 400,
        message: 'Subscription has no customer',
      };
    }

    // For now, we'll use the customer ID as the user ID
    // In a real implementation, you'd have a mapping between Stripe customer IDs and user IDs
    const userId = customerId;

    // Update user role
    await supabaseService.from('user_roles').upsert({
      user_id: userId,
      role,
    });

    getLoggerInstance().info(
      { userId, role, priceId },
      'User role updated from invoice.paid event'
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Invoice paid event processed successfully',
      userId,
      role,
    };
  } catch (error) {
    getLoggerInstance().error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to process invoice.paid event'
    );
    return {
      success: false,
      statusCode: 500,
      message: `Failed to process invoice.paid event: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Process Stripe customer.subscription.updated event
 * @param subscription - Stripe subscription object
 * @returns Processing result
 */
export async function processSubscriptionUpdatedEvent(
  subscription: Stripe.Subscription
): Promise<WebhookProcessingResult> {
  try {
    const customerId = subscription.customer as string;
    if (!customerId) {
      return {
        success: false,
        statusCode: 400,
        message: 'Subscription has no customer',
      };
    }

    const userId = customerId;

    if (subscription.status === 'active') {
      // Subscription is active, update role based on current price
      if (!subscription.items.data.length) {
        return {
          success: false,
          statusCode: 400,
          message: 'Active subscription has no items',
        };
      }

      const priceId = subscription.items.data[0]?.price.id;
      if (!priceId) {
        return {
          success: false,
          statusCode: 400,
          message: 'Active subscription item has no price ID',
        };
      }
      const role = getRoleFromStripePrice(priceId);

      if (!role) {
        getLoggerInstance().warn(
          { priceId },
          'Unknown Stripe price ID in subscription.updated event'
        );
        return {
          success: false,
          statusCode: 400,
          message: `Unknown price ID: ${priceId}`,
        };
      }

      await supabaseService.from('user_roles').upsert({
        user_id: userId,
        role,
      });

      getLoggerInstance().info(
        { userId, role, priceId },
        'User role updated from subscription.updated event'
      );

      return {
        success: true,
        statusCode: 200,
        message: 'Subscription updated event processed successfully',
        userId,
        role,
      };
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      // Subscription canceled or unpaid, downgrade to public unless user has all_paid
      const { data: currentRoles } = await supabaseService
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const currentRole = currentRoles?.[0]?.role as UserRole;

      // Only downgrade if user doesn't have all_paid role
      if (currentRole !== 'all_paid') {
        await supabaseService.from('user_roles').upsert({
          user_id: userId,
          role: 'public',
        });

        getLoggerInstance().info(
          { userId, previousRole: currentRole },
          'User downgraded to public from subscription cancellation'
        );

        return {
          success: true,
          statusCode: 200,
          message: 'User downgraded to public due to subscription cancellation',
          userId,
          role: 'public',
        };
      } else {
        getLoggerInstance().info(
          { userId },
          'User retains all_paid role despite subscription cancellation'
        );
        return {
          success: true,
          statusCode: 200,
          message: 'User retains all_paid role despite subscription cancellation',
          userId,
          role: 'all_paid',
        };
      }
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Subscription status change not requiring role update',
    };
  } catch (error) {
    getLoggerInstance().error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to process subscription.updated event'
    );
    return {
      success: false,
      statusCode: 500,
      message: `Failed to process subscription.updated event: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Process Stripe webhook event
 * @param payload - Raw webhook payload
 * @param signature - Stripe signature header
 * @returns Processing result
 */
export async function processStripeWebhook(
  payload: string,
  signature: string
): Promise<WebhookProcessingResult> {
  try {
    // Verify signature
    const signatureOk = verifyStripeSignature(payload, signature);

    if (!signatureOk) {
      await recordWebhookEvent('unknown', 'signature_verification_failed', {}, false, 401);
      return {
        success: false,
        statusCode: 401,
        message: 'Invalid signature',
      };
    }

    // Parse event
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config().STRIPE_WEBHOOK_SECRET
    );

    // Check idempotency
    const alreadyProcessed = await isWebhookEventProcessed(event.id);
    if (alreadyProcessed) {
      getLoggerInstance().info(
        { eventId: event.id, eventType: event.type },
        'Webhook event already processed, skipping'
      );
      return {
        success: true,
        statusCode: 200,
        message: 'Event already processed',
      };
    }

    let result: WebhookProcessingResult;

    // Process based on event type
    switch (event.type) {
      case 'invoice.payment_succeeded':
        result = await processInvoicePaidEvent(event.data.object);
        break;
      case 'customer.subscription.updated':
        result = await processSubscriptionUpdatedEvent(event.data.object);
        break;
      default:
        getLoggerInstance().info({ eventType: event.type }, 'Unhandled webhook event type');
        result = {
          success: true,
          statusCode: 200,
          message: `Unhandled event type: ${event.type}`,
        };
    }

    // Record the event
    await recordWebhookEvent(
      event.id,
      event.type,
      event.data.object as Record<string, unknown>,
      signatureOk,
      result.statusCode
    );

    return result;
  } catch (error) {
    getLoggerInstance().error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to process Stripe webhook'
    );

    // Try to record the failed event
    try {
      await recordWebhookEvent('unknown', 'processing_error', {}, false, 500);
    } catch (recordError) {
      getLoggerInstance().error(
        { error: recordError instanceof Error ? recordError.message : 'Unknown error' },
        'Failed to record failed webhook event'
      );
    }

    return {
      success: false,
      statusCode: 500,
      message: `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
