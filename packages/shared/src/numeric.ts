import type { NumericFormatOptions } from './types';

/**
 * Parse a numeric string or number into a number
 * @param value - Value to parse
 * @returns Parsed number or NaN if invalid
 */
export function parseNumeric(value: string | number): number {
  if (typeof value === 'number') {
    return isNaN(value) ? NaN : value;
  }

  if (typeof value !== 'string') {
    return NaN;
  }

  // Remove whitespace
  const trimmed = value.trim();

  // Handle empty string
  if (trimmed === '') {
    return NaN;
  }

  // Handle infinity
  if (trimmed.toLowerCase() === 'infinity' || trimmed.toLowerCase() === 'inf') {
    return Infinity;
  }

  // Handle negative infinity
  if (trimmed.toLowerCase() === '-infinity' || trimmed.toLowerCase() === '-inf') {
    return -Infinity;
  }

  // Parse as number
  const parsed = Number(trimmed);
  return isNaN(parsed) ? NaN : parsed;
}

/**
 * Count significant figures in a number
 * @param value - Number to count significant figures for
 * @returns Number of significant figures
 */
export function countSigFigs(value: number): number {
  if (!isFinite(value) || value === 0) {
    return 0;
  }

  // Convert to scientific notation string
  const scientific = value.toExponential();

  // Extract the mantissa (part before 'e')
  const parts = scientific.split('e');
  const mantissa = parts[0];

  if (!mantissa) {
    return 0;
  }

  // Count significant figures by counting all digits in mantissa
  const digits = mantissa.replace('.', '');

  // Count all digits (including trailing zeros in scientific notation)
  return digits.length;
}

/**
 * Round a number to a specified number of significant figures using half-away-from-zero rounding
 * @param value - Number to round
 * @param sigFigs - Number of significant figures
 * @returns Rounded number
 */
export function roundToSigFigs(value: number, sigFigs: number): number {
  if (!isFinite(value) || value === 0) {
    return value;
  }

  if (sigFigs <= 0) {
    return 0;
  }

  // Convert to scientific notation
  const scientific = value.toExponential();
  const parts = scientific.split('e');
  const exponent = parts[1];
  const exp = exponent ? parseInt(exponent, 10) : 0;

  // Calculate the decimal place to round to
  const decimalPlaces = sigFigs - 1 - exp;

  return roundToDecimals(value, decimalPlaces);
}

/**
 * Round a number to a specified number of decimal places using half-away-from-zero rounding
 * @param value - Number to round
 * @param decimalPlaces - Number of decimal places
 * @returns Rounded number
 */
export function roundToDecimals(value: number, decimalPlaces: number): number {
  if (!isFinite(value)) {
    return value;
  }

  if (decimalPlaces < 0) {
    // For negative decimal places, round to the nearest 10^(-decimalPlaces)
    const factor = Math.pow(10, -decimalPlaces);
    const scaled = value / factor;
    const rounded = scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5);
    return rounded * factor;
  }

  if (decimalPlaces === 0) {
    return Math.round(value);
  }

  // Use half-away-from-zero rounding
  const factor = Math.pow(10, decimalPlaces);
  const scaled = value * factor;

  // Apply half-away-from-zero rounding
  const rounded = scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5);

  return rounded / factor;
}

/**
 * Format a number with specified options
 * @param value - Number to format
 * @param options - Formatting options
 * @returns Formatted number string
 */
export function formatNumber(value: number, options: NumericFormatOptions = {}): string {
  const { significantFigures, decimalPlaces, unit, scientificNotation = false } = options;

  if (!isFinite(value)) {
    return value.toString();
  }

  let formatted: string;

  if (significantFigures !== undefined) {
    const rounded = roundToSigFigs(value, significantFigures);
    if (scientificNotation) {
      formatted = rounded.toExponential(significantFigures - 1);
    } else {
      formatted = rounded.toString();
    }
  } else if (decimalPlaces !== undefined) {
    const rounded = roundToDecimals(value, decimalPlaces);
    if (scientificNotation) {
      formatted = rounded.toExponential(decimalPlaces);
    } else {
      formatted = rounded.toFixed(decimalPlaces);
    }
  } else if (scientificNotation) {
    formatted = value.toExponential();
  } else {
    formatted = value.toString();
  }

  // Attach unit if provided
  if (unit) {
    return attachUnit(formatted, unit);
  }

  return formatted;
}

/**
 * Attach a unit to a formatted number
 * @param formatted - Formatted number string
 * @param unit - Unit to attach
 * @returns Number with unit attached
 */
export function attachUnit(formatted: string, unit: string): string {
  // Handle special cases for units
  if (unit === 'degrees' || unit === '°') {
    return `${formatted}°`;
  }

  if (unit === 'percent' || unit === '%') {
    return `${formatted}%`;
  }

  if (unit === 'radians' || unit === 'rad') {
    return `${formatted} rad`;
  }

  // Default: space between number and unit
  return `${formatted} ${unit}`;
}

/**
 * Check if two numbers are approximately equal within a tolerance
 * @param a - First number
 * @param b - Second number
 * @param tolerance - Tolerance for comparison (default: 1e-10)
 * @returns True if numbers are approximately equal
 */
export function approximatelyEqual(a: number, b: number, tolerance = 1e-10): boolean {
  if (a === b) {
    return true;
  }

  if (!isFinite(a) || !isFinite(b)) {
    return false;
  }

  const diff = Math.abs(a - b);
  const max = Math.max(Math.abs(a), Math.abs(b));

  // Use relative tolerance for small numbers, absolute tolerance for large numbers
  return diff <= tolerance || (max > 0 && diff <= max * tolerance);
}

/**
 * Check if a number is zero within a tolerance
 * @param value - Number to check
 * @param tolerance - Tolerance for comparison (default: 1e-10)
 * @returns True if number is approximately zero
 */
export function isZero(value: number, tolerance = 1e-10): boolean {
  return Math.abs(value) <= tolerance;
}

/**
 * Check if a number is positive within a tolerance
 * @param value - Number to check
 * @param tolerance - Tolerance for comparison (default: 1e-10)
 * @returns True if number is positive
 */
export function isPositive(value: number, tolerance = 1e-10): boolean {
  return value > tolerance;
}

/**
 * Check if a number is negative within a tolerance
 * @param value - Number to check
 * @param tolerance - Tolerance for comparison (default: 1e-10)
 * @returns True if number is negative
 */
export function isNegative(value: number, tolerance = 1e-10): boolean {
  return value < -tolerance;
}

/**
 * Clamp a number between min and max values
 * @param value - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  // Handle case where min > max by swapping them
  if (min > max) {
    [min, max] = [max, min];
  }

  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate the percentage change between two values
 * @param oldValue - Original value
 * @param newValue - New value
 * @returns Percentage change
 */
export function percentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : Infinity;
  }

  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Calculate the relative error between two values
 * @param expected - Expected value
 * @param actual - Actual value
 * @returns Relative error as a decimal
 */
export function relativeError(expected: number, actual: number): number {
  if (expected === 0) {
    return actual === 0 ? 0 : Infinity;
  }

  return Math.abs((actual - expected) / expected);
}

/**
 * Calculate the absolute error between two values
 * @param expected - Expected value
 * @param actual - Actual value
 * @returns Absolute error
 */
export function absoluteError(expected: number, actual: number): number {
  return Math.abs(actual - expected);
}

/**
 * Format a number as a percentage
 * @param value - Number to format (as decimal, e.g., 0.15 for 15%)
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimalPlaces = 2): string {
  const percentage = value * 100;
  return `${roundToDecimals(percentage, decimalPlaces)}%`;
}

/**
 * Parse a percentage string to a decimal number
 * @param percentage - Percentage string (e.g., "15%" or "15")
 * @returns Decimal number (e.g., 0.15 for "15%")
 */
export function parsePercentage(percentage: string): number {
  const cleaned = percentage.trim().replace('%', '');
  const value = parseNumeric(cleaned);
  return isNaN(value) ? NaN : value / 100;
}
