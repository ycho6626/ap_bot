import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ap/shared/logger';
import { withSpan } from '@ap/shared/tracing';
import { config } from '@ap/shared/config';
import { getValidStripePriceIds } from '@ap/payments/roles';
import type { UserRole } from '@ap/shared/types';
import Stripe from 'stripe';

const logger = createLogger('payments-routes');

/**
 * Get Stripe client instance
 */
function getStripeClient(): Stripe {
  return new Stripe(config().STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Payment routes
 */
export const paymentRoutes: FastifyPluginAsync = async fastify => {
  // Get pricing plans
  fastify.get(
    '/plans',
    {
      schema: {
        description: 'Get available pricing plans',
        tags: ['payments'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                price: { type: 'number' },
                currency: { type: 'string' },
                interval: { type: 'string', enum: ['month', 'year'] },
                features: {
                  type: 'array',
                  items: { type: 'string' },
                },
                role: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const plans = [
          {
            id: 'price_free',
            name: 'Free',
            description: 'Perfect for trying out our platform',
            price: 0,
            currency: 'usd',
            interval: 'month' as const,
            features: [
              '5 questions per day',
              'Basic explanations',
              'Public knowledge base',
              'AB & BC support',
            ],
            role: 'public' as UserRole,
          },
          {
            id: config().STRIPE_PRICE_CALC_MONTHLY,
            name: 'Pro Monthly',
            description: 'For serious AP Calculus students',
            price: 19,
            currency: 'usd',
            interval: 'month' as const,
            features: [
              'Unlimited questions',
              'Verified answers with trust scores',
              'Step-by-step solutions',
              'Premium knowledge base',
              'AB & BC support',
              'Priority support',
              'Citations and sources',
            ],
            role: 'calc_paid' as UserRole,
          },
          {
            id: config().STRIPE_PRICE_CALC_YEARLY,
            name: 'Pro Yearly',
            description: 'For serious AP Calculus students (save 20%)',
            price: 182, // $19 * 12 * 0.8
            currency: 'usd',
            interval: 'year' as const,
            features: [
              'Unlimited questions',
              'Verified answers with trust scores',
              'Step-by-step solutions',
              'Premium knowledge base',
              'AB & BC support',
              'Priority support',
              'Citations and sources',
              '20% savings',
            ],
            role: 'calc_paid' as UserRole,
          },
          {
            id: 'price_teacher_monthly',
            name: 'Teacher Monthly',
            description: 'For educators and institutions',
            price: 49,
            currency: 'usd',
            interval: 'month' as const,
            features: [
              'Everything in Pro',
              'Private knowledge base',
              'Student progress tracking',
              'Custom content creation',
              'API access',
              'Bulk student management',
              'Advanced analytics',
            ],
            role: 'teacher' as UserRole,
          },
        ];

        logger.info({ planCount: plans.length }, 'Retrieved pricing plans');

        return plans;
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to get pricing plans'
        );
        reply.status(500);
        return {
          error: {
            message: 'Failed to get pricing plans',
            statusCode: 500,
          },
        };
      }
    }
  );

  // Create checkout session
  fastify.post(
    '/checkout',
    {
      schema: {
        description: 'Create Stripe checkout session',
        tags: ['payments'],
        body: {
          type: 'object',
          properties: {
            priceId: { type: 'string' },
          },
          required: ['priceId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              url: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  statusCode: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { priceId } = request.body as { priceId: string };

        // Validate price ID
        const validPriceIds = getValidStripePriceIds();
        if (!validPriceIds.includes(priceId) && priceId !== 'price_free') {
          reply.status(400);
          return {
            error: {
              message: 'Invalid price ID',
              statusCode: 400,
            },
          };
        }

        // Handle free plan
        if (priceId === 'price_free') {
          reply.status(400);
          return {
            error: {
              message: 'Free plan does not require checkout',
              statusCode: 400,
            },
          };
        }

        // Get user ID from auth (for now, use a placeholder)
        // In a real implementation, you'd extract this from the JWT token
        const userId = 'demo-user'; // TODO: Extract from auth token

        const stripe = getStripeClient();

        // Create checkout session
        const session = await withSpan(
          'stripe_create_checkout_session',
          async () => {
            return stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              line_items: [
                {
                  price: priceId,
                  quantity: 1,
                },
              ],
              mode: 'subscription',
              success_url: `${config().WEB_URL}/account?success=true`,
              cancel_url: `${config().WEB_URL}/pricing?canceled=true`,
              customer_email: 'demo@example.com', // TODO: Get from user profile
              metadata: {
                userId,
                priceId,
              },
            });
          },
          {
            attributes: {
              'stripe.price_id': priceId,
              'stripe.user_id': userId,
            },
          }
        );

        logger.info(
          {
            sessionId: session.id,
            priceId,
            userId,
          },
          'Created Stripe checkout session'
        );

        return {
          id: session.id,
          url: session.url!,
        };
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to create checkout session'
        );
        reply.status(500);
        return {
          error: {
            message: 'Failed to create checkout session',
            statusCode: 500,
          },
        };
      }
    }
  );

  // Create billing portal session
  fastify.post(
    '/stripe/portal',
    {
      schema: {
        description: 'Create Stripe billing portal session',
        tags: ['payments'],
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  statusCode: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // Get user ID from auth (for now, use a placeholder)
        // In a real implementation, you'd extract this from the JWT token
        const userId = 'demo-user'; // TODO: Extract from auth token

        // For demo purposes, create a customer if one doesn't exist
        const stripe = getStripeClient();

        // Check if customer exists, create if not
        let customerId: string;
        try {
          // In a real implementation, you'd store the Stripe customer ID in your user table
          // For now, we'll create a new customer each time
          const customer = await stripe.customers.create({
            email: 'demo@example.com',
            metadata: {
              userId,
            },
          });
          customerId = customer.id;
        } catch (error) {
          logger.error(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            'Failed to create/find Stripe customer'
          );
          reply.status(500);
          return {
            error: {
              message: 'Failed to create customer',
              statusCode: 500,
            },
          };
        }

        // Create billing portal session
        const portalSession = await withSpan(
          'stripe_create_portal_session',
          async () => {
            return stripe.billingPortal.sessions.create({
              customer: customerId,
              return_url: `${config().WEB_URL}/account`,
            });
          },
          {
            attributes: {
              'stripe.customer_id': customerId,
              'stripe.user_id': userId,
            },
          }
        );

        logger.info(
          {
            sessionId: portalSession.id,
            customerId,
            userId,
          },
          'Created Stripe billing portal session'
        );

        return {
          url: portalSession.url,
        };
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to create billing portal session'
        );
        reply.status(500);
        return {
          error: {
            message: 'Failed to create billing portal session',
            statusCode: 500,
          },
        };
      }
    }
  );

  logger.info('Payment routes registered');
};
