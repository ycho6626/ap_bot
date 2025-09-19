import type { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { makeErrorResponse } from '../schemas';

const ERROR_HANDLER_KEY = '__apErrorHandlerRegistered';

type FlaggedFastify = FastifyInstance & {
  [ERROR_HANDLER_KEY]?: boolean;
};

type FastifyErrorDetails = Error & {
  statusCode?: number;
  code?: unknown;
  validation?: unknown;
  validationContext?: unknown;
};

export interface ErrorHandlingOptions {
  logError?: (payload: {
    error: {
      message: string;
      stack?: string | undefined;
      code?: unknown;
    };
    request: {
      method: string;
      url: string;
      headers: Record<string, unknown>;
    };
  }) => void;
  getEnvironment?: () => string;
}

export function ensureErrorHandling(
  fastify: FastifyInstance,
  options: ErrorHandlingOptions = {}
): FastifyInstance {
  const instance = fastify as FlaggedFastify;

  if (instance[ERROR_HANDLER_KEY]) {
    return fastify;
  }

  const typed = fastify.withTypeProvider<ZodTypeProvider>();

  typed.setValidatorCompiler(validatorCompiler);
  typed.setSerializerCompiler(serializerCompiler);

  typed.setErrorHandler((error, request, reply) => {
    const typedError = error as FastifyErrorDetails;

    options.logError?.({
      error: {
        message: error.message,
        stack: error.stack,
        code: typedError.code,
      },
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
      },
    });

    const nodeEnv = options.getEnvironment?.() ?? process.env['NODE_ENV'] ?? 'development';
    const isDevelopment = nodeEnv === 'development';
    const statusCode = typedError.statusCode ?? 500;
    const isClientError = statusCode >= 400 && statusCode < 500;
    const message = isClientError || isDevelopment ? error.message : 'Internal Server Error';

    const { validation, code } = typedError;
    let validationContext: unknown;
    if (Object.prototype.hasOwnProperty.call(typedError, 'validationContext')) {
      validationContext = (typedError as { validationContext?: unknown }).validationContext;
    }

    const details: Record<string, unknown> = {};
    if (validationContext !== undefined) {
      details['validationContext'] = validationContext;
    }
    const maybeStack = Object.prototype.hasOwnProperty.call(error, 'stack')
      ? (error as { stack?: string }).stack
      : undefined;
    if (isDevelopment && maybeStack) {
      details['stack'] = maybeStack;
    }

    const response = makeErrorResponse(statusCode, message, {
      ...(code ? { code: String(code) } : {}),
      ...(validation ? { validation } : {}),
      ...(Object.keys(details).length ? { details } : {}),
    });

    void reply.status(statusCode).send(response);
  });

  instance[ERROR_HANDLER_KEY] = true;

  return fastify;
}
