import Fastify from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { createLogger } from '@ap/shared/logger';
import { initializeTracing } from '@ap/shared/tracing';
import { config } from '@ap/shared/config';
import { securityPlugin } from './plugins/security';
import { rawBodyPlugin } from './plugins/rawBody';
import { rateLimitPlugin } from './plugins/rateLimit';
import { healthRoutes } from './routes/health';
import { kbRoutes } from './routes/kb';
import { coachRoutes } from './routes/coach';
import { reviewRoutes } from './routes/review';
import { authRoutes } from './routes/auth';
import { paymentRoutes } from './routes/payments';
import { stripeWebhookRoutes } from './routes/webhooks/stripe';
import { ensureErrorHandling } from './utils/errorHandling';

/**
 * Initialize OpenTelemetry tracing
 */
initializeTracing();

/**
 * Create logger for the API Gateway
 */
const logger = createLogger('api-gateway');

/**
 * Create Fastify server instance
 */
export async function createServer() {
  const baseServer = Fastify({
    logger: {
      level: config().LOG_LEVEL,
      serializers: {
        req: req => ({
          method: req.method,
          url: req.url,
          headers: req.headers,
          remoteAddress: req.ip,
        }),
        res: res => ({
          statusCode: res.statusCode,
        }),
      },
    },
    trustProxy: true,
    bodyLimit: 1048576, // 1MB limit for regular requests
  });

  const server = ensureErrorHandling(baseServer, {
    logError: payload => {
      logger.error(payload, 'Request error');
    },
    getEnvironment: () => config().NODE_ENV,
  });
  // Register plugins
  await server.register(securityPlugin);
  await server.register(rawBodyPlugin);
  await server.register(rateLimitPlugin);

  // Register Swagger for API documentation
  await server.register(import('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'AP Calculus Bot API',
        description: 'API Gateway for AP Calculus AB/BC tutoring bot with verified answers',
        version: '0.1.0',
      },
      servers: [
        {
          url: `http://localhost:${config().API_PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: args => {
      try {
        return jsonSchemaTransform(args);
      } catch (error) {
        logger.error(
          {
            url: args.url,
            schemaKeys: args.schema ? Object.keys(args.schema) : [],
            responseKeys: args.schema?.response ? Object.keys(args.schema.response) : undefined,
            schemaPreview: args.schema,
            error,
          },
          'Failed to transform schema for OpenAPI'
        );
        throw error;
      }
    },
  });

  await server.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (_request, _reply, next) {
        next();
      },
      preHandler: function (_request, _reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: header => header,
    transformSpecification: (swaggerObject, _request, _reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  // Register routes
  await server.register(healthRoutes, { prefix: '/health' });
  await server.register(kbRoutes, { prefix: '/kb' });
  await server.register(coachRoutes, { prefix: '/coach' });
  await server.register(reviewRoutes, { prefix: '/review' });
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(paymentRoutes, { prefix: '/payments' });
  await server.register(stripeWebhookRoutes, { prefix: '/webhooks' });

  // Global request logging
  server.addHook('onRequest', async (request, _reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
      'Incoming request'
    );
  });

  // Global response logging
  server.addHook('onResponse', async (request, reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
      },
      'Request completed'
    );
  });

  return server;
}

/**
 * Start the server
 */
export async function startServer() {
  try {
    const server = await createServer();
    const port = config().API_PORT;
    const host = '0.0.0.0';

    await server.listen({ port, host });

    logger.info(
      {
        port,
        host,
        environment: config().NODE_ENV,
      },
      'API Gateway server started'
    );

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');
      try {
        await server.close();
        logger.info('Server closed gracefully');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch(error => {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  });
}
