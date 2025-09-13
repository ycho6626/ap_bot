import pino from 'pino';
import { config } from './config';

/**
 * Redaction patterns for sensitive data
 */
const redactionPatterns = [
  // API keys
  /api[_-]?key/gi,
  /secret[_-]?key/gi,
  /access[_-]?token/gi,
  /refresh[_-]?token/gi,
  // Passwords
  /password/gi,
  /passwd/gi,
  // Database credentials
  /database[_-]?url/gi,
  /db[_-]?url/gi,
  // Stripe keys
  /stripe[_-]?secret/gi,
  /stripe[_-]?key/gi,
  // Supabase keys
  /supabase[_-]?key/gi,
  /supabase[_-]?secret/gi,
  // OpenAI keys
  /openai[_-]?key/gi,
  // JWT tokens
  /jwt[_-]?token/gi,
  /bearer[_-]?token/gi,
  // Webhook secrets
  /webhook[_-]?secret/gi,
  // Redis URLs
  /redis[_-]?url/gi,
];

/**
 * Redaction function for sensitive data
 */
function redactSensitiveData(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted = { ...obj } as Record<string, unknown>;

  for (const [key, value] of Object.entries(redacted)) {
    // Check if key matches any redaction pattern
    const shouldRedact = redactionPatterns.some(pattern => pattern.test(key));

    if (shouldRedact) {
      if (typeof value === 'string') {
        // Redact string values
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively redact object values
        redacted[key] = redactSensitiveData(value);
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      redacted[key] = redactSensitiveData(value);
    }
  }

  return redacted;
}

/**
 * Create base logger configuration
 */
function createBaseLogger() {
  return pino({
    level: config().LOG_LEVEL,
    formatters: {
      level: label => ({ level: label }),
    },
    serializers: {
      req: req => {
        if (!req) return req;
        return {
          method: req.method,
          url: req.url,
          headers: redactSensitiveData(req.headers),
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        };
      },
      res: res => {
        if (!res) return res;
        return {
          statusCode: res.statusCode,
          headers: redactSensitiveData(res.headers),
        };
      },
      err: err => {
        if (!err) return err;
        return {
          type: err.constructor.name,
          message: err.message,
          stack: err.stack,
          ...(typeof err === 'object' && err !== null
            ? (redactSensitiveData(err) as Record<string, unknown>)
            : {}),
        };
      },
    },
    hooks: {
      logMethod(inputArgs, method) {
        // Redact sensitive data in log arguments
        const redactedArgs = inputArgs.map(arg => redactSensitiveData(arg));
        return method.apply(this, redactedArgs as [string, ...any[]]);
      },
    },
  });
}

/**
 * Base logger instance
 */
const baseLogger = createBaseLogger();

/**
 * Default logger instance (alias for base logger)
 * @deprecated Use createLogger() or getLogger() explicitly
 */
export const logger = baseLogger;

/**
 * Create a child logger for a specific module
 * @param module - Module name
 * @param context - Additional context to include in logs
 * @returns Child logger instance
 */
export function createLogger(module: string, context: Record<string, unknown> = {}): pino.Logger {
  return baseLogger.child({
    module,
    ...(typeof context === 'object' && context !== null
      ? (redactSensitiveData(context) as Record<string, unknown>)
      : {}),
  });
}

/**
 * Get the base logger instance
 * @returns Base logger instance
 */
export function getLogger(): pino.Logger {
  return baseLogger;
}

/**
 * Log levels for type safety
 */
export const LogLevel = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Structured logging helpers
 */
export const log = {
  /**
   * Log a fatal error
   */
  fatal: (obj: Record<string, unknown>, msg: string) => baseLogger.fatal(obj, msg),

  /**
   * Log an error
   */
  error: (obj: Record<string, unknown>, msg: string) => baseLogger.error(obj, msg),

  /**
   * Log a warning
   */
  warn: (obj: Record<string, unknown>, msg: string) => baseLogger.warn(obj, msg),

  /**
   * Log an info message
   */
  info: (obj: Record<string, unknown>, msg: string) => baseLogger.info(obj, msg),

  /**
   * Log a debug message
   */
  debug: (obj: Record<string, unknown>, msg: string) => baseLogger.debug(obj, msg),

  /**
   * Log a trace message
   */
  trace: (obj: Record<string, unknown>, msg: string) => baseLogger.trace(obj, msg),
};

/**
 * Performance timing helper
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: pino.Logger;
  private operation: string;

  constructor(logger: pino.Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
  }

  /**
   * End the timer and log the duration
   * @param context - Additional context to include in the log
   */
  end(context: Record<string, unknown> = {}): void {
    const duration = Date.now() - this.startTime;
    this.logger.info(
      {
        operation: this.operation,
        duration,
        ...context,
      },
      `Operation completed in ${duration}ms`
    );
  }
}

/**
 * Create a performance timer
 * @param logger - Logger instance
 * @param operation - Operation name
 * @returns Performance timer instance
 */
export function createTimer(logger: pino.Logger, operation: string): PerformanceTimer {
  return new PerformanceTimer(logger, operation);
}
