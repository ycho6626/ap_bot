import ky, { type KyInstance } from 'ky';
import { config } from './config';
import { createLogger } from './logger';
import { traceHttpRequest } from './tracing';
import type { HttpClientOptions } from './types';

/**
 * Create HTTP client with retries and exponential backoff
 * @param options - HTTP client options
 * @returns Configured ky instance
 */
export function createHttpClient(options: HttpClientOptions = {}): KyInstance {
  const logger = createLogger('http-client');

  const {
    timeout = 30000,
    retries = 3,
    headers = {},
  } = options;

  return ky.create({
    timeout,
    retry: {
      limit: retries,
      methods: ['get', 'post', 'put', 'delete', 'patch'],
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
      backoffLimit: 10000,
    },
    hooks: {
      beforeRequest: [
        (request) => {
          // Add default headers
          Object.entries(headers).forEach(([key, value]) => {
            request.headers.set(key, value);
          });

          // Add tracing
          return traceHttpRequest(request.url, request.method, async () => {
            logger.debug(
              {
                url: request.url,
                method: request.method,
                headers: Object.fromEntries(request.headers.entries()),
              },
              'Making HTTP request',
            );
          });
        },
      ],
      beforeRetry: [
        ({ request, error, retryCount }) => {
          logger.warn(
            {
              url: request.url,
              method: request.method,
              retryCount,
              error: error.message,
            },
            'HTTP request failed, retrying',
          );
        },
      ],
      afterResponse: [
        (request, _options, response) => {
          logger.debug(
            {
              url: request.url,
              method: request.method,
              status: response.status,
              statusText: response.statusText,
            },
            'HTTP request completed',
          );
        },
      ],
      beforeError: [
        (error) => {
          logger.error(
            {
              url: error.request?.url,
              method: error.request?.method,
              status: error.response?.status,
              statusText: error.response?.statusText,
              message: error.message,
            },
            'HTTP request failed',
          );
          return error;
        },
      ],
    },
  });
}

/**
 * Default HTTP client instance
 */
export const httpClient = createHttpClient();

/**
 * Create HTTP client with authentication
 * @param apiKey - API key for authentication
 * @param options - Additional HTTP client options
 * @returns Configured ky instance with authentication
 */
export function createAuthenticatedClient(
  apiKey: string,
  options: HttpClientOptions = {},
): KyInstance {
  return createHttpClient({
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

/**
 * Create OpenAI API client
 * @param options - Additional HTTP client options
 * @returns Configured ky instance for OpenAI API
 */
export function createOpenAIClient(options: HttpClientOptions = {}): KyInstance {
  return createAuthenticatedClient(config().OPENAI_API_KEY, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Create Supabase API client
 * @param options - Additional HTTP client options
 * @returns Configured ky instance for Supabase API
 */
export function createSupabaseClient(options: HttpClientOptions = {}): KyInstance {
  return createHttpClient({
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': config().SUPABASE_ANON_KEY,
      ...options.headers,
    },
  });
}

/**
 * Create verifier service client
 * @param options - Additional HTTP client options
 * @returns Configured ky instance for verifier service
 */
export function createVerifierClient(options: HttpClientOptions = {}): KyInstance {
  const baseUrl = config().VERIFIER_URL;
  
  return createHttpClient({
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }).extend({
    prefixUrl: baseUrl,
  });
}

/**
 * HTTP client utilities
 */
export const httpUtils = {
  /**
   * Check if an error is a timeout error
   * @param error - Error to check
   * @returns True if it's a timeout error
   */
  isTimeoutError: (error: unknown): boolean => {
    return error instanceof Error && (
      error.name === 'TimeoutError' ||
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT')
    );
  },

  /**
   * Check if an error is a network error
   * @param error - Error to check
   * @returns True if it's a network error
   */
  isNetworkError: (error: unknown): boolean => {
    return error instanceof Error && (
      error.name === 'NetworkError' ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND')
    );
  },

  /**
   * Check if an error is a rate limit error
   * @param error - Error to check
   * @returns True if it's a rate limit error
   */
  isRateLimitError: (error: unknown): boolean => {
    if (error instanceof Error && 'response' in error) {
      const response = (error as any).response;
      return response?.status === 429;
    }
    return false;
  },

  /**
   * Get retry delay with exponential backoff
   * @param retryCount - Current retry count
   * @param baseDelay - Base delay in milliseconds
   * @param maxDelay - Maximum delay in milliseconds
   * @returns Delay in milliseconds
   */
  getRetryDelay: (retryCount: number, baseDelay = 1000, maxDelay = 10000): number => {
    const delay = baseDelay * Math.pow(2, retryCount);
    return Math.min(delay, maxDelay);
  },

  /**
   * Check if a status code indicates a retryable error
   * @param statusCode - HTTP status code
   * @returns True if the error is retryable
   */
  isRetryableStatus: (statusCode: number): boolean => {
    return [408, 413, 429, 500, 502, 503, 504].includes(statusCode);
  },
};
