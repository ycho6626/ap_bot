import Fastify from 'fastify';
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
import { stripeWebhookRoutes } from './routes/webhooks/stripe';

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
  const server = Fastify({
    logger: {
      level: config().LOG_LEVEL,
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          headers: req.headers,
          remoteAddress: req.ip,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    },
    trustProxy: true,
    bodyLimit: 1048576, // 1MB limit for regular requests
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
  });

  await server.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  // Register routes
  await server.register(healthRoutes, { prefix: '/health' });
  await server.register(kbRoutes, { prefix: '/kb' });
  await server.register(coachRoutes, { prefix: '/coach' });
  await server.register(reviewRoutes, { prefix: '/review' });
  await server.register(stripeWebhookRoutes, { prefix: '/webhooks' });

  // Global error handler
  server.setErrorHandler((error, request, reply) => {
    logger.error(
      {
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
        request: {
          method: request.method,
          url: request.url,
          headers: request.headers,
        },
      },
      'Request error',
    );

    // Don't expose internal errors in production
    const isDevelopment = config().NODE_ENV === 'development';
    const statusCode = error.statusCode || 500;
    const message = isDevelopment ? error.message : 'Internal Server Error';

    reply.status(statusCode).send({
      error: {
        message,
        statusCode,
        ...(isDevelopment && { stack: error.stack }),
      },
    });
  });

  // Global request logging
  server.addHook('onRequest', async (request, reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
      'Incoming request',
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
      'Request completed',
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
      'API Gateway server started',
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
  startServer().catch((error) => {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  });
}
