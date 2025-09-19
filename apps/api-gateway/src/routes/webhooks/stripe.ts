import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ap/shared/logger';
import { withSpan } from '@ap/shared/tracing';
import { processStripeWebhook } from '@ap/payments/stripe';
import {
  stripeWebhookHeadersSchema,
  stripeWebhookErrorSchema,
  stripeWebhookSuccessSchema,
  stripeWebhookHealthSchema,
  stripeWebhookConfigSchema,
  makeErrorResponse,
} from '../../schemas';
import { ensureErrorHandling } from '../../utils/errorHandling';

const logger = createLogger('stripe-webhook-routes');

/**
 * Stripe webhook routes
 */
export const stripeWebhookRoutes: FastifyPluginAsync = async fastify => {
  ensureErrorHandling(fastify);

  // Stripe webhook endpoint
  fastify.post(
    '/stripe',
    {
      schema: {
        description: 'Handle Stripe webhook events',
        tags: ['webhooks'],
        // Headers schema is added for documentation only; Fastify validates using raw body.
        headers: stripeWebhookHeadersSchema,
        response: {
          200: stripeWebhookSuccessSchema,
          400: stripeWebhookErrorSchema,
          401: stripeWebhookErrorSchema,
          500: stripeWebhookErrorSchema,
        },
      },
      config: {
        // Disable body parsing for raw body access
        rawBody: true,
      },
    },
    async (request, reply) => {
      const requestId = request.requestId ?? request.id;

      try {
        // Get raw body for signature verification
        const rawBody = request.getRawBody();
        if (!rawBody) {
          logger.warn(
            {
              requestId,
            },
            'No raw body available for Stripe webhook'
          );

          void reply.status(400);
          return makeErrorResponse(400, 'No raw body available');
        }

        // Get Stripe signature from headers
        const signatureHeader = request.headers['stripe-signature'];
        if (typeof signatureHeader !== 'string') {
          logger.warn(
            {
              requestId,
            },
            'No Stripe signature header found'
          );

          void reply.status(400);
          return makeErrorResponse(400, 'Missing Stripe signature header');
        }

        const signature = signatureHeader;

        logger.info(
          {
            signatureLength: signature.length,
            bodyLength: rawBody.length,
            requestId,
          },
          'Processing Stripe webhook'
        );

        // Process the webhook with tracing
        const result = await withSpan(
          'stripe_webhook_process',
          async () => {
            return processStripeWebhook(rawBody.toString(), signature);
          },
          {
            attributes: {
              'webhook.provider': 'stripe',
              'webhook.body_length': rawBody.length,
              'webhook.has_signature': !!signature,
            },
          }
        );

        // Set appropriate status code
        void reply.status(result.statusCode);

        if (result.success) {
          logger.info(
            {
              statusCode: result.statusCode,
              message: result.message,
              userId: result.userId,
              role: result.role,
              requestId,
            },
            'Stripe webhook processed successfully'
          );

          return {
            success: true,
            message: result.message,
          };
        } else {
          logger.warn(
            {
              statusCode: result.statusCode,
              message: result.message,
              requestId,
            },
            'Stripe webhook processing failed'
          );

          return makeErrorResponse(result.statusCode, result.message, {
            code: 'STRIPE_WEBHOOK_FAILED',
          });
      }
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId,
        },
        'Stripe webhook processing error'
      );

      void reply.status(500);
      return makeErrorResponse(500, 'Internal server error');
      }
    }
  );

  // Webhook health check
  fastify.get(
    '/stripe/health',
    {
      schema: {
        description: 'Health check for Stripe webhook endpoint',
        tags: ['webhooks'],
        response: {
          200: stripeWebhookHealthSchema,
          500: stripeWebhookErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const requestId = request.requestId ?? request.id;

      try {
        const healthData = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          provider: 'stripe',
        };

        logger.debug({ requestId }, 'Stripe webhook health check completed');

        return healthData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
          },
          'Stripe webhook health check failed'
        );

        void reply.status(500);
        return makeErrorResponse(500, 'Internal server error');
      }
    }
  );

  // Webhook configuration info
  fastify.get(
    '/stripe/config',
    {
      schema: {
        description: 'Get Stripe webhook configuration',
        tags: ['webhooks'],
        response: {
          200: stripeWebhookConfigSchema,
          500: stripeWebhookErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const requestId = request.requestId ?? request.id;

      try {
        const configData = {
          provider: 'stripe',
          supportedEvents: [
            'invoice.payment_succeeded',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'customer.subscription.created',
          ],
          signatureVerification: true,
          idempotency: true,
        };

        logger.debug({ requestId }, 'Stripe webhook config requested');

        return configData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
          },
          'Failed to get Stripe webhook config'
        );

        reply.status(500);
        return makeErrorResponse(500, 'Internal server error');
      }
    }
  );

  logger.info('Stripe webhook routes registered');

  await Promise.resolve();
};
