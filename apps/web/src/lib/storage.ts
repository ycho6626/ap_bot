/**
 * Storage utilities for AB/BC variant persistence and user preferences
 */

import type { ExamVariant } from '@ap/shared/types';

/**
 * Storage keys for different data types
 */
export const STORAGE_KEYS = {
  EXAM_VARIANT: 'ap_bot_exam_variant',
  USER_PREFERENCES: 'ap_bot_user_preferences',
  SESSION_ID: 'ap_bot_session_id',
  SEARCH_HISTORY: 'ap_bot_search_history',
  CHAT_HISTORY: 'ap_bot_chat_history',
} as const;

/**
 * User preferences interface
 */
export interface UserPreferences {
  examVariant: ExamVariant;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoSave: boolean;
  defaultSearchLimit: number;
}

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  examVariant: 'calc_ab',
  theme: 'system',
  notifications: true,
  autoSave: true,
  defaultSearchLimit: 10,
};

/**
 * Enhanced storage utilities with error handling and type safety
 */
export const storage = {
  /**
   * Get a value from localStorage with type safety
   */
  get: <T>(key: string, defaultValue: T): T => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  /**
   * Set a value in localStorage with error handling
   */
  set: <T>(key: string, value: T): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to set ${key} in localStorage:`, error);
    }
  },

  /**
   * Remove a value from localStorage
   */
  remove: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  },

  /**
   * Clear all AP Bot related data from localStorage
   */
  clear: (): void => {
    try {
      if (typeof window === 'undefined') return;
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },
};

/**
 * Exam variant specific storage utilities
 */
export const examVariantStorage = {
  /**
   * Get the current exam variant
   */
  get: (): ExamVariant => {
    return storage.get<ExamVariant>(STORAGE_KEYS.EXAM_VARIANT, 'calc_ab');
  },

  /**
   * Set the current exam variant
   */
  set: (variant: ExamVariant): void => {
    storage.set(STORAGE_KEYS.EXAM_VARIANT, variant);
  },

  /**
   * Get the current exam variant (alias for get)
   */
  getVariant: (): 'calc_ab' | 'calc_bc' => {
    return storage.get<ExamVariant>(STORAGE_KEYS.EXAM_VARIANT, 'calc_ab');
  },

  /**
   * Set the current exam variant (alias for set)
   */
  setVariant: (variant: 'calc_ab' | 'calc_bc'): void => {
    storage.set(STORAGE_KEYS.EXAM_VARIANT, variant);
  },

  /**
   * Check if the variant is AB
   */
  isAB: (): boolean => {
    return examVariantStorage.get() === 'calc_ab';
  },

  /**
   * Check if the variant is BC
   */
  isBC: (): boolean => {
    return examVariantStorage.get() === 'calc_bc';
  },
};

/**
 * User preferences storage utilities
 */
export const preferencesStorage = {
  /**
   * Get user preferences
   */
  get: (): UserPreferences => {
    return storage.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
  },

  /**
   * Set user preferences
   */
  set: (preferences: Partial<UserPreferences>): void => {
    const current = preferencesStorage.get();
    const updated = { ...current, ...preferences };
    storage.set(STORAGE_KEYS.USER_PREFERENCES, updated);
  },

  /**
   * Reset preferences to defaults
   */
  reset: (): void => {
    storage.set(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
  },
};

/**
 * Session storage utilities
 */
export const sessionStorage = {
  /**
   * Get or create a session ID
   */
  getSessionId: (): string => {
    let sessionId = storage.get<string>(STORAGE_KEYS.SESSION_ID, '');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      storage.set(STORAGE_KEYS.SESSION_ID, sessionId);
    }
    return sessionId;
  },

  /**
   * Clear the current session
   */
  clearSession: (): void => {
    storage.remove(STORAGE_KEYS.SESSION_ID);
  },
};

/**
 * Search history storage utilities
 */
export const searchHistoryStorage = {
  /**
   * Get search history
   */
  get: (): string[] => {
    return storage.get<string[]>(STORAGE_KEYS.SEARCH_HISTORY, []);
  },

  /**
   * Add a search query to history
   */
  add: (query: string): void => {
    if (!query.trim()) return;
    const history = searchHistoryStorage.get();
    const filtered = history.filter(item => item !== query);
    const updated = [query, ...filtered].slice(0, 10); // Keep last 10
    storage.set(STORAGE_KEYS.SEARCH_HISTORY, updated);
  },

  /**
   * Clear search history
   */
  clear: (): void => {
    storage.remove(STORAGE_KEYS.SEARCH_HISTORY);
  },
};

/**
 * Chat history storage utilities
 */
export const chatHistoryStorage = {
  /**
   * Get chat history for a session
   */
  get: (sessionId: string): any[] => {
    const key = `${STORAGE_KEYS.CHAT_HISTORY}_${sessionId}`;
    return storage.get<any[]>(key, []);
  },

  /**
   * Save chat history for a session
   */
  set: (sessionId: string, messages: any[]): void => {
    const key = `${STORAGE_KEYS.CHAT_HISTORY}_${sessionId}`;
    storage.set(key, messages);
  },

  /**
   * Clear chat history for a session
   */
  clear: (sessionId: string): void => {
    const key = `${STORAGE_KEYS.CHAT_HISTORY}_${sessionId}`;
    storage.remove(key);
  },
};
