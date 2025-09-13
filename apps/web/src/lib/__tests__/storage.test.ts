import { describe, it, expect, beforeEach, vi } from 'vitest';
import { examVariantStorage, searchHistoryStorage } from '../storage';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Storage Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('examVariantStorage', () => {
    it('should get exam variant from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('"calc_bc"');

      const result = examVariantStorage.get();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('ap_bot_exam_variant');
      expect(result).toBe('calc_bc');
    });

    it('should return calc_ab as default when no value in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = examVariantStorage.get();

      expect(result).toBe('calc_ab');
    });

    it('should set exam variant in localStorage', () => {
      examVariantStorage.set('calc_bc');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('ap_bot_exam_variant', '"calc_bc"');
    });
  });

  describe('searchHistoryStorage', () => {
    it('should get search history from localStorage', () => {
      const mockHistory = ['query1', 'query2', 'query3'];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));

      const result = searchHistoryStorage.get();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('ap_bot_search_history');
      expect(result).toEqual(mockHistory);
    });

    it('should return empty array when no value in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = searchHistoryStorage.get();

      expect(result).toEqual([]);
    });

    it('should clear search history', () => {
      searchHistoryStorage.clear();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ap_bot_search_history');
    });

    it('should add new query to search history', () => {
      const existingHistory = ['query1', 'query2'];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory));

      searchHistoryStorage.add('query3');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ap_bot_search_history',
        JSON.stringify(['query3', 'query1', 'query2'])
      );
    });

    it('should not add empty query to search history', () => {
      searchHistoryStorage.add('');

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});
