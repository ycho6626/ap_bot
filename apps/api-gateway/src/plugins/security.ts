import { FastifyPluginAsync } from 'fastify';
import { config } from '@ap/shared/config';
import { createLogger } from '@ap/shared/logger';

const logger = createLogger('security-plugin');

/**
 * Security plugin with CSP and CORS configuration
 */
export const securityPlugin: FastifyPluginAsync = async fastify => {
  // Register helmet for security headers
  await fastify.register(import('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Swagger UI
          'https://fonts.googleapis.com',
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Swagger UI
          "'unsafe-eval'", // Required for Swagger UI
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://api.openai.com',
          'https://*.supabase.co',
          'https://api.stripe.com',
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for Swagger UI compatibility
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  });

  // Register CORS
  await fastify.register(import('@fastify/cors'), {
    origin: (origin, callback) => {
      const allowedOrigins = config().CORS_ORIGINS;

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(
        {
          origin,
          allowedOrigins,
        },
        'CORS request blocked from disallowed origin'
      );

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-Answer-Verified', 'X-Answer-Trust', 'X-Request-ID'],
  });

  // Add security headers middleware
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Add custom security headers
    void reply.headers({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });

    // Add request ID for tracing
    const headerRequestId =
      typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : undefined;
    const requestId =
      headerRequestId ??
      request.requestId ??
      request.id ??
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    void reply.header('X-Request-ID', requestId);

    return payload;
  });

  // Request ID middleware
  fastify.addHook('onRequest', async (request, reply) => {
    const headerRequestId =
      typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : undefined;
    const requestId =
      headerRequestId ??
      request.requestId ??
      request.id ??
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    request.requestId = requestId;

    // Add to reply headers
    void reply.header('X-Request-ID', requestId);
  });

  logger.info('Security plugin registered');
};
