import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
// import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { config } from './config';

/**
 * Initialize OpenTelemetry tracing
 */
export function initializeTracing(): void {
  if (process.env['OTEL_DISABLED'] === 'true') {
    return;
  }

  const resource = {
    [SemanticResourceAttributes.SERVICE_NAME]: 'ap-calculus-bot',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config().NODE_ENV,
  };

  const traceExporter = new OTLPTraceExporter({
    url: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || 'http://localhost:4318/v1/traces',
  });

  const sdk = new NodeSDK({
    resource: resource as any,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable some instrumentations that might be too noisy
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch(error => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}

/**
 * Get the current tracer
 */
export function getTracer(name: string) {
  return trace.getTracer(name);
}

/**
 * Create a span for an operation
 * @param name - Span name
 * @param fn - Function to execute within the span
 * @param options - Span options
 * @returns Result of the function execution
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  options: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
  } = {}
): Promise<T> {
  const tracer = getTracer('ap-calculus-bot');
  const span = tracer.startSpan(name, {
    kind: options.kind || SpanKind.INTERNAL,
    attributes: options.attributes || {},
  });

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Create a span for a synchronous operation
 * @param name - Span name
 * @param fn - Function to execute within the span
 * @param options - Span options
 * @returns Result of the function execution
 */
export function withSpanSync<T>(
  name: string,
  fn: () => T,
  options: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
  } = {}
): T {
  const tracer = getTracer('ap-calculus-bot');
  const span = tracer.startSpan(name, {
    kind: options.kind || SpanKind.INTERNAL,
    attributes: options.attributes || {},
  });

  try {
    const result = context.with(trace.setSpan(context.active(), span), fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add attributes to the current span
 * @param attributes - Attributes to add
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Add an event to the current span
 * @param name - Event name
 * @param attributes - Event attributes
 */
export function addSpanEvent(
  name: string,
  attributes: Record<string, string | number | boolean> = {}
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Set the status of the current span
 * @param code - Status code
 * @param message - Optional status message
 */
export function setSpanStatus(code: SpanStatusCode, message?: string): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setStatus({ code, message: message || '' });
  }
}

/**
 * Record an exception in the current span
 * @param error - Error to record
 */
export function recordSpanException(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
  }
}

/**
 * Trace HTTP requests
 * @param url - Request URL
 * @param method - HTTP method
 * @param fn - Function to execute
 * @returns Result of the function execution
 */
export async function traceHttpRequest<T>(
  url: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`HTTP ${method} ${url}`, fn, {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.method': method,
      'http.url': url,
    },
  });
}

/**
 * Trace database operations
 * @param operation - Database operation name
 * @param table - Table name
 * @param fn - Function to execute
 * @returns Result of the function execution
 */
export async function traceDatabaseOperation<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`DB ${operation} ${table}`, fn, {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.operation': operation,
      'db.sql.table': table,
    },
  });
}

/**
 * Trace LLM operations
 * @param operation - LLM operation name
 * @param model - Model name
 * @param fn - Function to execute
 * @returns Result of the function execution
 */
export async function traceLlmOperation<T>(
  operation: string,
  model: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(`LLM ${operation}`, fn, {
    kind: SpanKind.CLIENT,
    attributes: {
      'llm.operation': operation,
      'llm.model': model,
    },
  });
}
