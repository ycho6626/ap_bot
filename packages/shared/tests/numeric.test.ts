import { describe, it, expect } from 'vitest';
import {
  parseNumeric,
  countSigFigs,
  roundToSigFigs,
  roundToDecimals,
  formatNumber,
  attachUnit,
  approximatelyEqual,
  isZero,
  isPositive,
  isNegative,
  clamp,
  percentageChange,
  relativeError,
  absoluteError,
  formatPercentage,
  parsePercentage,
} from '../src/numeric';

describe('parseNumeric', () => {
  it('should parse valid numbers', () => {
    expect(parseNumeric('123')).toBe(123);
    expect(parseNumeric('123.45')).toBe(123.45);
    expect(parseNumeric('-123.45')).toBe(-123.45);
    expect(parseNumeric('0')).toBe(0);
    expect(parseNumeric('0.0')).toBe(0);
  });

  it('should parse numbers with scientific notation', () => {
    expect(parseNumeric('1e3')).toBe(1000);
    expect(parseNumeric('1.23e-2')).toBe(0.0123);
    expect(parseNumeric('-1.23e+2')).toBe(-123);
  });

  it('should parse infinity values', () => {
    expect(parseNumeric('infinity')).toBe(Infinity);
    expect(parseNumeric('inf')).toBe(Infinity);
    expect(parseNumeric('-infinity')).toBe(-Infinity);
    expect(parseNumeric('-inf')).toBe(-Infinity);
  });

  it('should handle number inputs', () => {
    expect(parseNumeric(123)).toBe(123);
    expect(parseNumeric(123.45)).toBe(123.45);
    expect(parseNumeric(0)).toBe(0);
  });

  it('should return NaN for invalid inputs', () => {
    expect(parseNumeric('')).toBeNaN();
    expect(parseNumeric('abc')).toBeNaN();
    expect(parseNumeric('12.34.56')).toBeNaN();
    expect(parseNumeric(null as any)).toBeNaN();
    expect(parseNumeric(undefined as any)).toBeNaN();
  });

  it('should handle whitespace', () => {
    expect(parseNumeric('  123  ')).toBe(123);
    expect(parseNumeric('\t456\n')).toBe(456);
  });
});

describe('countSigFigs', () => {
  it('should count significant figures correctly', () => {
    expect(countSigFigs(123)).toBe(3);
    expect(countSigFigs(123.45)).toBe(5);
    expect(countSigFigs(0.00123)).toBe(3);
    expect(countSigFigs(1.23)).toBe(3); // JavaScript converts to 1.23e+0
    expect(countSigFigs(1000)).toBe(1);
    expect(countSigFigs(1000.0)).toBe(1); // JavaScript converts to 1e+3
  });

  it('should handle zero and infinity', () => {
    expect(countSigFigs(0)).toBe(0);
    expect(countSigFigs(Infinity)).toBe(0);
    expect(countSigFigs(-Infinity)).toBe(0);
    expect(countSigFigs(NaN)).toBe(0);
  });

  it('should handle very small numbers', () => {
    expect(countSigFigs(0.000001)).toBe(1);
    expect(countSigFigs(0.00000123)).toBe(3);
  });

  it('should handle very large numbers', () => {
    expect(countSigFigs(1000000)).toBe(1);
    expect(countSigFigs(1230000)).toBe(3);
  });
});

describe('roundToSigFigs', () => {
  it('should round to correct significant figures', () => {
    expect(roundToSigFigs(123.456, 3)).toBe(123);
    expect(roundToSigFigs(123.456, 4)).toBe(123.5);
    expect(roundToSigFigs(0.001234, 2)).toBe(0.0012);
    expect(roundToSigFigs(0.001234, 3)).toBe(0.00123);
  });

  it('should handle zero and infinity', () => {
    expect(roundToSigFigs(0, 3)).toBe(0);
    expect(roundToSigFigs(Infinity, 3)).toBe(Infinity);
    expect(roundToSigFigs(-Infinity, 3)).toBe(-Infinity);
    expect(roundToSigFigs(NaN, 3)).toBeNaN();
  });

  it('should handle edge cases', () => {
    expect(roundToSigFigs(123.456, 0)).toBe(0);
    expect(roundToSigFigs(123.456, -1)).toBe(0);
  });

  it('should use half-away-from-zero rounding', () => {
    expect(roundToSigFigs(1.25, 2)).toBe(1.3); // rounds up
    expect(roundToSigFigs(-1.25, 2)).toBe(-1.3); // rounds down
    expect(roundToSigFigs(1.15, 2)).toBe(1.2); // rounds up
    expect(roundToSigFigs(-1.15, 2)).toBe(-1.2); // rounds down
  });
});

describe('roundToDecimals', () => {
  it('should round to correct decimal places', () => {
    expect(roundToDecimals(123.456, 2)).toBe(123.46);
    expect(roundToDecimals(123.456, 1)).toBe(123.5);
    expect(roundToDecimals(123.456, 0)).toBe(123);
  });

  it('should handle zero and infinity', () => {
    expect(roundToDecimals(0, 2)).toBe(0);
    expect(roundToDecimals(Infinity, 2)).toBe(Infinity);
    expect(roundToDecimals(-Infinity, 2)).toBe(-Infinity);
    expect(roundToDecimals(NaN, 2)).toBeNaN();
  });

  it('should use half-away-from-zero rounding', () => {
    expect(roundToDecimals(1.25, 1)).toBe(1.3); // rounds up
    expect(roundToDecimals(-1.25, 1)).toBe(-1.3); // rounds down
    expect(roundToDecimals(1.15, 1)).toBe(1.2); // rounds up
    expect(roundToDecimals(-1.15, 1)).toBe(-1.2); // rounds down
  });

  it('should handle negative decimal places', () => {
    expect(roundToDecimals(123.456, -1)).toBe(120);
    expect(roundToDecimals(123.456, -2)).toBe(100);
  });
});

describe('formatNumber', () => {
  it('should format with significant figures', () => {
    expect(formatNumber(123.456, { significantFigures: 3 })).toBe('123');
    expect(formatNumber(123.456, { significantFigures: 4 })).toBe('123.5');
    expect(formatNumber(0.001234, { significantFigures: 2 })).toBe('0.0012');
  });

  it('should format with decimal places', () => {
    expect(formatNumber(123.456, { decimalPlaces: 2 })).toBe('123.46');
    expect(formatNumber(123.456, { decimalPlaces: 1 })).toBe('123.5');
    expect(formatNumber(123.456, { decimalPlaces: 0 })).toBe('123');
  });

  it('should format with scientific notation', () => {
    expect(formatNumber(123.456, { scientificNotation: true })).toBe('1.23456e+2');
    expect(formatNumber(0.001234, { scientificNotation: true })).toBe('1.234e-3');
  });

  it('should attach units', () => {
    expect(formatNumber(123.456, { unit: 'm' })).toBe('123.456 m');
    expect(formatNumber(123.456, { unit: 'degrees' })).toBe('123.456°');
    expect(formatNumber(123.456, { unit: '%' })).toBe('123.456%');
  });

  it('should handle infinity and NaN', () => {
    expect(formatNumber(Infinity)).toBe('Infinity');
    expect(formatNumber(-Infinity)).toBe('-Infinity');
    expect(formatNumber(NaN)).toBe('NaN');
  });
});

describe('attachUnit', () => {
  it('should attach units correctly', () => {
    expect(attachUnit('123.45', 'm')).toBe('123.45 m');
    expect(attachUnit('123.45', 'degrees')).toBe('123.45°');
    expect(attachUnit('123.45', '°')).toBe('123.45°');
    expect(attachUnit('123.45', 'percent')).toBe('123.45%');
    expect(attachUnit('123.45', '%')).toBe('123.45%');
    expect(attachUnit('123.45', 'radians')).toBe('123.45 rad');
    expect(attachUnit('123.45', 'rad')).toBe('123.45 rad');
  });
});

describe('approximatelyEqual', () => {
  it('should compare numbers correctly', () => {
    expect(approximatelyEqual(1.0, 1.0)).toBe(true);
    expect(approximatelyEqual(1.0, 1.0000001)).toBe(false); // 1e-7 > 1e-10
    expect(approximatelyEqual(1.0, 1.1)).toBe(false);
    expect(approximatelyEqual(0.0, 0.0)).toBe(true);
  });

  it('should handle infinity and NaN', () => {
    expect(approximatelyEqual(Infinity, Infinity)).toBe(true);
    expect(approximatelyEqual(-Infinity, -Infinity)).toBe(true);
    expect(approximatelyEqual(Infinity, -Infinity)).toBe(false);
    expect(approximatelyEqual(NaN, NaN)).toBe(false);
    expect(approximatelyEqual(1.0, NaN)).toBe(false);
  });

  it('should use custom tolerance', () => {
    expect(approximatelyEqual(1.0, 1.1, 0.2)).toBe(true);
    expect(approximatelyEqual(1.0, 1.1, 0.05)).toBe(false);
  });
});

describe('isZero', () => {
  it('should detect zero values', () => {
    expect(isZero(0)).toBe(true);
    expect(isZero(0.0)).toBe(true);
    expect(isZero(0.0000001)).toBe(false); // 1e-7 > 1e-10
    expect(isZero(0.1)).toBe(false);
    expect(isZero(-0.1)).toBe(false);
  });

  it('should handle infinity and NaN', () => {
    expect(isZero(Infinity)).toBe(false);
    expect(isZero(-Infinity)).toBe(false);
    expect(isZero(NaN)).toBe(false);
  });
});

describe('isPositive', () => {
  it('should detect positive values', () => {
    expect(isPositive(1)).toBe(true);
    expect(isPositive(0.1)).toBe(true);
    expect(isPositive(0)).toBe(false);
    expect(isPositive(-0.1)).toBe(false);
    expect(isPositive(-1)).toBe(false);
  });

  it('should handle infinity and NaN', () => {
    expect(isPositive(Infinity)).toBe(true);
    expect(isPositive(-Infinity)).toBe(false);
    expect(isPositive(NaN)).toBe(false);
  });
});

describe('isNegative', () => {
  it('should detect negative values', () => {
    expect(isNegative(-1)).toBe(true);
    expect(isNegative(-0.1)).toBe(true);
    expect(isNegative(0)).toBe(false);
    expect(isNegative(0.1)).toBe(false);
    expect(isNegative(1)).toBe(false);
  });

  it('should handle infinity and NaN', () => {
    expect(isNegative(Infinity)).toBe(false);
    expect(isNegative(-Infinity)).toBe(true);
    expect(isNegative(NaN)).toBe(false);
  });
});

describe('clamp', () => {
  it('should clamp values correctly', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('should handle edge cases', () => {
    expect(clamp(5, 10, 0)).toBe(5); // min > max
    expect(clamp(NaN, 0, 10)).toBeNaN();
  });
});

describe('percentageChange', () => {
  it('should calculate percentage change correctly', () => {
    expect(percentageChange(100, 110)).toBe(10);
    expect(percentageChange(100, 90)).toBe(-10);
    expect(percentageChange(100, 100)).toBe(0);
    expect(percentageChange(50, 75)).toBe(50);
  });

  it('should handle zero original value', () => {
    expect(percentageChange(0, 10)).toBe(Infinity);
    expect(percentageChange(0, 0)).toBe(0);
  });
});

describe('relativeError', () => {
  it('should calculate relative error correctly', () => {
    expect(relativeError(100, 110)).toBe(0.1);
    expect(relativeError(100, 90)).toBe(0.1);
    expect(relativeError(100, 100)).toBe(0);
    expect(relativeError(50, 75)).toBe(0.5);
  });

  it('should handle zero expected value', () => {
    expect(relativeError(0, 10)).toBe(Infinity);
    expect(relativeError(0, 0)).toBe(0);
  });
});

describe('absoluteError', () => {
  it('should calculate absolute error correctly', () => {
    expect(absoluteError(100, 110)).toBe(10);
    expect(absoluteError(100, 90)).toBe(10);
    expect(absoluteError(100, 100)).toBe(0);
    expect(absoluteError(50, 75)).toBe(25);
  });
});

describe('formatPercentage', () => {
  it('should format percentages correctly', () => {
    expect(formatPercentage(0.15)).toBe('15%');
    expect(formatPercentage(0.1234)).toBe('12.34%');
    expect(formatPercentage(0.1234, 1)).toBe('12.3%');
    expect(formatPercentage(0.1234, 0)).toBe('12%');
  });

  it('should handle edge cases', () => {
    expect(formatPercentage(0)).toBe('0%');
    expect(formatPercentage(1)).toBe('100%');
    expect(formatPercentage(1.5)).toBe('150%');
  });
});

describe('parsePercentage', () => {
  it('should parse percentages correctly', () => {
    expect(parsePercentage('15%')).toBe(0.15);
    expect(parsePercentage('15')).toBe(0.15);
    expect(parsePercentage('12.34%')).toBe(0.1234);
    expect(parsePercentage('12.34')).toBe(0.1234);
  });

  it('should handle edge cases', () => {
    expect(parsePercentage('0%')).toBe(0);
    expect(parsePercentage('0')).toBe(0);
    expect(parsePercentage('100%')).toBe(1);
    expect(parsePercentage('100')).toBe(1);
  });

  it('should handle invalid inputs', () => {
    expect(parsePercentage('abc')).toBeNaN();
    expect(parsePercentage('')).toBeNaN();
    expect(parsePercentage('12.34.56%')).toBeNaN();
  });
});
