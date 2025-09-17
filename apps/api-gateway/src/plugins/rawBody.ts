import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createLogger } from '@ap/shared/logger';

const logger = createLogger('rawbody-plugin');

/**
 * Raw body plugin for handling webhook signatures
 * This plugin preserves the raw body for webhook signature verification
 */
export const rawBodyPlugin: FastifyPluginAsync = async fastify => {
  // Add raw body to request object for webhook signature verification
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body);
      req.rawBody = rawBody;

      // Parse JSON for normal processing
      const json = JSON.parse(rawBody.toString());
      done(null, json);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          contentType: req.headers['content-type'],
        },
        'Failed to parse JSON body'
      );
      done(error as Error, undefined);
    }
  });

  // Handle text/plain content type for webhooks
  fastify.addContentTypeParser('text/plain', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body);
      req.rawBody = rawBody;

      done(null, rawBody.toString());
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          contentType: req.headers['content-type'],
        },
        'Failed to parse text body'
      );
      done(error as Error, undefined);
    }
  });

  // Handle application/x-www-form-urlencoded for webhooks
  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body);
        req.rawBody = rawBody;

        const formData = rawBody.toString();
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
          'Failed to parse form data body'
        );
        done(error as Error, undefined);
      }
    }
  );

  // Add helper method to get raw body
  fastify.decorateRequest('getRawBody', function (this: FastifyRequest) {
    return this.rawBody;
  });

  // Add helper method to check if raw body exists
  fastify.decorateRequest('hasRawBody', function (this: FastifyRequest) {
    return this.rawBody !== undefined;
  });

  logger.info('Raw body plugin registered');

  await Promise.resolve();
};
