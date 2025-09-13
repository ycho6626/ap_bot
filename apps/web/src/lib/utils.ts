import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ExamVariant } from '@ap/shared/types';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a trust score as a percentage
 */
export function formatTrustScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get trust score color based on value
 */
export function getTrustScoreColor(score: number): string {
  if (score >= 0.9) return 'bg-success-500';
  if (score >= 0.7) return 'bg-warning-500';
  return 'bg-error-500';
}

/**
 * Format exam variant for display
 */
export function formatExamVariant(variant: ExamVariant): string {
  return variant === 'calc_ab' ? 'AP Calculus AB' : 'AP Calculus BC';
}

/**
 * Get exam variant abbreviation
 */
export function getExamVariantAbbr(variant: ExamVariant): string {
  return variant === 'calc_ab' ? 'AB' : 'BC';
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Generate a session ID for chat sessions
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a string contains LaTeX
 */
export function containsLatex(text: string): boolean {
  return /\$.*\$|\\[a-zA-Z]|\\begin\{|\\end\{/.test(text);
}

/**
 * Extract LaTeX expressions from text
 */
export function extractLatexExpressions(text: string): string[] {
  const inlineMatches = text.match(/\$([^$]+)\$/g) ?? [];
  const blockMatches = text.match(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g) ?? [];
  return [...inlineMatches, ...blockMatches];
}

/**
 * Debounce function for search inputs
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Local storage helpers with error handling
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Silently fail if localStorage is not available
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail if localStorage is not available
    }
  },
};

/**
 * Constants for the application
 */
export const CONSTANTS = {
  MAX_QUESTION_LENGTH: 2000,
  MAX_QUERY_LENGTH: 500,
  DEFAULT_SEARCH_LIMIT: 10,
  MIN_TRUST_THRESHOLD: 0.92,
  SESSION_STORAGE_KEY: 'ap_bot_session',
  EXAM_VARIANT_STORAGE_KEY: 'ap_bot_exam_variant',
  USER_PREFERENCES_STORAGE_KEY: 'ap_bot_user_preferences',
} as const;
