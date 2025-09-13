/**
 * HTTP utility functions
 */

/**
 * Check if an error is a timeout error
 * @param error - Error to check
 * @returns True if the error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('timeout') ||
      error.message.includes('TIMEOUT') ||
      error.name === 'TimeoutError'
    );
  }
  return false;
}

/**
 * Check if an error is a network error
 * @param error - Error to check
 * @returns True if the error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('NETWORK') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ECONNRESET')
    );
  }
  return false;
}

/**
 * Calculate retry delay with exponential backoff
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
export function getRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Check if an HTTP status code indicates a retryable error
 * @param status - HTTP status code
 * @returns True if the status code indicates a retryable error
 */
export function isRetryableStatus(status: number): boolean {
  // 5xx server errors are retryable
  if (status >= 500 && status < 600) {
    return true;
  }

  // 429 rate limit is retryable
  if (status === 429) {
    return true;
  }

  // 408 timeout is retryable
  if (status === 408) {
    return true;
  }

  return false;
}

/**
 * Check if an HTTP status code indicates a client error
 * @param status - HTTP status code
 * @returns True if the status code indicates a client error
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Check if an HTTP status code indicates a server error
 * @param status - HTTP status code
 * @returns True if the status code indicates a server error
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Get a human-readable error message for an HTTP status code
 * @param status - HTTP status code
 * @returns Human-readable error message
 */
export function getStatusMessage(status: number): string {
  const statusMessages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    408: 'Request Timeout',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  return statusMessages[status] || `HTTP ${status}`;
}

/**
 * Check if an error should be retried
 * @param error - Error to check
 * @param attempt - Current attempt number
 * @param maxAttempts - Maximum number of attempts
 * @returns True if the error should be retried
 */
export function shouldRetry(error: unknown, attempt: number, maxAttempts: number): boolean {
  // Don't retry if we've exceeded max attempts
  if (attempt >= maxAttempts) {
    return false;
  }

  // Retry on timeout errors
  if (isTimeoutError(error)) {
    return true;
  }

  // Retry on network errors
  if (isNetworkError(error)) {
    return true;
  }

  // Retry on retryable HTTP status codes
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status;
    if (typeof status === 'number' && isRetryableStatus(status)) {
      return true;
    }
  }

  return false;
}
