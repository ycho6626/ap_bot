import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ap/shared/logger';
import { withSpan } from '@ap/shared/tracing';
import { processStripeWebhook } from '@ap/payments/stripe';

const logger = createLogger('stripe-webhook-routes');

/**
 * Stripe webhook routes
 */
export const stripeWebhookRoutes: FastifyPluginAsync = async fastify => {
  // Stripe webhook endpoint
  fastify.post(
    '/stripe',
    {
      schema: {
        description: 'Handle Stripe webhook events',
        tags: ['webhooks'],
        headers: {
          type: 'object',
          properties: {
            'stripe-signature': {
              type: 'string',
              description: 'Stripe signature for webhook verification',
            },
          },
          required: ['stripe-signature'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
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
          401: {
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
          500: {
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
      config: {
        // Disable body parsing for raw body access
        rawBody: true,
      },
    },
    async (request, reply) => {
      try {
        // Get raw body for signature verification
        const rawBody = request.getRawBody();
        if (!rawBody) {
          logger.warn(
            {
              requestId: (request as any).requestId,
            },
            'No raw body available for Stripe webhook'
          );

          reply.status(400);
          return {
            error: {
              message: 'No raw body available',
              statusCode: 400,
            },
          };
        }

        // Get Stripe signature from headers
        const signature = request.headers['stripe-signature'] as string;
        if (!signature) {
          logger.warn(
            {
              requestId: (request as any).requestId,
            },
            'No Stripe signature header found'
          );

          reply.status(400);
          return {
            error: {
              message: 'Missing Stripe signature header',
              statusCode: 400,
            },
          };
        }

        logger.info(
          {
            signatureLength: signature.length,
            bodyLength: rawBody.length,
            requestId: (request as any).requestId,
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
        reply.status(result.statusCode);

        if (result.success) {
          logger.info(
            {
              statusCode: result.statusCode,
              message: result.message,
              userId: result.userId,
              role: result.role,
              requestId: (request as any).requestId,
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
              requestId: (request as any).requestId,
            },
            'Stripe webhook processing failed'
          );

          return {
            error: {
              message: result.message,
              statusCode: result.statusCode,
            },
          };
        }
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: (request as any).requestId,
          },
          'Stripe webhook processing error'
        );

        reply.status(500);
        return {
          error: {
            message: 'Internal server error',
            statusCode: 500,
          },
        };
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
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              provider: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const healthData = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          provider: 'stripe',
        };

        logger.debug(
          {
            requestId: (request as any).requestId,
          },
          'Stripe webhook health check completed'
        );

        return healthData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: (request as any).requestId,
          },
          'Stripe webhook health check failed'
        );

        reply.status(500);
        return {
          error: {
            message: 'Internal server error',
            statusCode: 500,
          },
        };
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
          200: {
            type: 'object',
            properties: {
              provider: { type: 'string' },
              supportedEvents: {
                type: 'array',
                items: { type: 'string' },
              },
              signatureVerification: { type: 'boolean' },
              idempotency: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
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

        logger.debug(
          {
            requestId: (request as any).requestId,
          },
          'Stripe webhook config requested'
        );

        return configData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: (request as any).requestId,
          },
          'Failed to get Stripe webhook config'
        );

        reply.status(500);
        return {
          error: {
            message: 'Internal server error',
            statusCode: 500,
          },
        };
      }
    }
  );

  logger.info('Stripe webhook routes registered');
};
