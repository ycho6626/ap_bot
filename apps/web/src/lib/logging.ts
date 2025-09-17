/* eslint-disable no-console */

/**
 * Lightweight client-side logging helpers that avoid sprinkling console usage
 * throughout the app while keeping development diagnostics available.
 */
function shouldLog(): boolean {
  return process.env['NODE_ENV'] !== 'production';
}

export function reportError(message: string, error?: unknown): void {
  if (!shouldLog()) return;
  if (error !== undefined) {
    console.error(message, error);
  } else {
    console.error(message);
  }
}

export function reportWarning(message: string, detail?: unknown): void {
  if (!shouldLog()) return;
  if (detail !== undefined) {
    console.warn(message, detail);
  } else {
    console.warn(message);
  }
}

export function reportInfo(message: string, detail?: unknown): void {
  if (!shouldLog()) return;
  if (detail !== undefined) {
    console.info(message, detail);
  } else {
    console.info(message);
  }
}
