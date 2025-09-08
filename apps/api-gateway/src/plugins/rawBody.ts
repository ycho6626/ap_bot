import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@ap/shared/logger';

const logger = createLogger('rawbody-plugin');

/**
 * Raw body plugin for handling webhook signatures
 * This plugin preserves the raw body for webhook signature verification
 */
export const rawBodyPlugin: FastifyPluginAsync = async (fastify) => {
  // Add raw body to request object for webhook signature verification
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      // Store raw body for webhook signature verification
      (req as any).rawBody = body;
      
      // Parse JSON for normal processing
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          contentType: req.headers['content-type'],
        },
        'Failed to parse JSON body',
      );
      done(error as Error, undefined);
    }
  });

  // Handle text/plain content type for webhooks
  fastify.addContentTypeParser('text/plain', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      // Store raw body for webhook signature verification
      (req as any).rawBody = body;
      
      // Return as string for normal processing
      done(null, body.toString());
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          contentType: req.headers['content-type'],
        },
        'Failed to parse text body',
      );
      done(error as Error, undefined);
    }
  });

  // Handle application/x-www-form-urlencoded for webhooks
  fastify.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      // Store raw body for webhook signature verification
      (req as any).rawBody = body;
      
      // Parse form data
      const formData = body.toString();
      const parsed = new URLSearchParams(formData);
      const result: Record<string, string> = {};
      
      for (const [key, value] of parsed.entries()) {
        result[key] = value;
      }
      
      done(null, result);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          contentType: req.headers['content-type'],
        },
        'Failed to parse form data body',
      );
      done(error as Error, undefined);
    }
  });

  // Add helper method to get raw body
  fastify.decorateRequest('getRawBody', function (this: FastifyRequest) {
    return (this as any).rawBody;
  });

  // Add helper method to check if raw body exists
  fastify.decorateRequest('hasRawBody', function (this: FastifyRequest) {
    return !!(this as any).rawBody;
  });

  logger.info('Raw body plugin registered');
};

// Extend FastifyRequest type to include raw body methods
declare module 'fastify' {
  interface FastifyRequest {
    getRawBody(): Buffer | undefined;
    hasRawBody(): boolean;
  }
}
