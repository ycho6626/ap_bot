import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchKB,
  coach,
  startCheckout,
  openBillingPortal,
  listReviewCases,
  resolveCase,
  getUserProfile,
  getPricingPlans,
  healthCheck,
} from '../../src/lib/api.bridge';

// Mock the apiClient
vi.mock('../../src/lib/api', () => ({
  apiClient: {
    searchKnowledgeBase: vi.fn(),
    askCoach: vi.fn(),
    createCheckoutSession: vi.fn(),
    getUserProfile: vi.fn(),
    getPricingPlans: vi.fn(),
    healthCheck: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
    },
  })),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Headers
global.Headers = vi.fn().mockImplementation(init => {
  const headers = new Map();
  if (init) {
    Object.entries(init).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
  return {
    set: vi.fn((key, value) => headers.set(key, value)),
    get: vi.fn(key => headers.get(key)),
    has: vi.fn(key => headers.has(key)),
    delete: vi.fn(key => headers.delete(key)),
    forEach: vi.fn(callback => headers.forEach(callback)),
    entries: vi.fn(() => headers.entries()),
    keys: vi.fn(() => headers.keys()),
    values: vi.fn(() => headers.values()),
  };
});

import { apiClient } from '../../src/lib/api';
import { createClient } from '@supabase/supabase-js';

describe('API Bridge', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    (createClient as any).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchKB', () => {
    it('should call searchKnowledgeBase with correct parameters and validate response', async () => {
      const mockResponse = {
        results: [
          {
            document: {
              id: 'doc1',
              content: 'Test content',
              subject: 'calc',
              exam_variant: 'calc_ab',
              partition: 'public',
              topic: 'derivatives',
              subtopic: 'power_rule',
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z',
            },
            score: 0.9,
            snippet: 'Test snippet',
            provenance: {
              source: 'test',
              partition: 'public',
              topic: 'derivatives',
              subtopic: 'power_rule',
            },
          },
        ],
        metadata: {
          query: 'test query',
          examVariant: 'calc_ab',
          totalResults: 1,
          maxScore: 0.9,
          searchTime: 100,
        },
      };

      vi.mocked(apiClient.searchKnowledgeBase).mockResolvedValue(mockResponse);

      const result = await searchKB('test query', 'calc_ab');

      expect(apiClient.searchKnowledgeBase).toHaveBeenCalledWith({
        subject: 'calc',
        examVariant: 'calc_ab',
        query: 'test query',
        limit: 10,
        minScore: 0.1,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle searchKnowledgeBase errors', async () => {
      vi.mocked(apiClient.searchKnowledgeBase).mockRejectedValue(new Error('API Error'));

      await expect(searchKB('test query', 'calc_ab')).rejects.toThrow(
        'Failed to search knowledge base'
      );
    });
  });

  describe('coach', () => {
    it('should call askCoach with correct parameters and validate response', async () => {
      const mockResponse = {
        answer: 'Test answer',
        verified: true,
        trustScore: 0.8,
        confidence: 0.9,
        sources: [
          {
            type: 'canonical' as const,
            id: 'src1',
            title: 'Test Source',
            snippet: 'Test snippet',
            score: 0.9,
          },
        ],
        suggestions: ['Try this approach'],
        metadata: {
          examVariant: 'calc_ab',
          topic: 'derivatives',
          subtopic: 'power_rule',
          difficulty: 'medium',
          processingTime: 150,
          retryCount: 0,
        },
      };

      vi.mocked(apiClient.askCoach).mockResolvedValue(mockResponse);

      const result = await coach('test question', 'calc_bc');

      expect(apiClient.askCoach).toHaveBeenCalledWith({
        subject: 'calc',
        examVariant: 'calc_bc',
        mode: 'vam',
        question: 'test question',
        context: {
          sessionId: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle askCoach errors', async () => {
      vi.mocked(apiClient.askCoach).mockRejectedValue(new Error('API Error'));

      await expect(coach('test question', 'calc_ab')).rejects.toThrow(
        'Failed to get coach response'
      );
    });
  });

  describe('startCheckout', () => {
    it('should call createCheckoutSession with correct parameters', async () => {
      const mockResponse = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      };

      vi.mocked(apiClient.createCheckoutSession).mockResolvedValue(mockResponse);

      const result = await startCheckout('price_123');

      expect(apiClient.createCheckoutSession).toHaveBeenCalledWith('price_123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle createCheckoutSession errors', async () => {
      vi.mocked(apiClient.createCheckoutSession).mockRejectedValue(new Error('API Error'));

      await expect(startCheckout('price_123')).rejects.toThrow('Failed to create checkout session');
    });
  });

  describe('openBillingPortal', () => {
    it('should make authenticated request to billing portal endpoint', async () => {
      const mockToken = 'test-jwt-token';
      const mockResponse = { url: 'https://billing.stripe.com/test' };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await openBillingPortal();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/payments/stripe/portal',
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle billing portal errors', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(openBillingPortal()).rejects.toThrow('Failed to open billing portal');
    });
  });

  describe('listReviewCases', () => {
    it('should make authenticated request to review cases endpoint', async () => {
      const mockToken = 'test-jwt-token';
      const mockResponse = [
        {
          id: 'case_1',
          question: 'Test question',
          answer: 'Test answer',
          verified: true,
          trustScore: 0.95,
          status: 'pending',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ];

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await listReviewCases();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/review/cases',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fallback to mock data on error', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await listReviewCases();

      expect(result).toEqual([
        expect.objectContaining({
          id: 'case_1',
          question: 'Find the derivative of x² + 3x + 2',
          answer: 'The derivative is 2x + 3',
          verified: true,
          trustScore: 0.95,
          status: 'pending',
        }),
      ]);
    });
  });

  describe('resolveCase', () => {
    it('should make authenticated request to resolve case endpoint', async () => {
      const mockToken = 'test-jwt-token';

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await resolveCase('case_1', 'approve', 'Good answer');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/review/cases/case_1/resolve',
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: JSON.stringify({ action: 'approve', feedback: 'Good answer' }),
        })
      );
    });

    it('should fallback to logging on error', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockRejectedValue(new Error('Network error'));

      await resolveCase('case_1', 'reject', 'Needs improvement');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Resolving case case_1 with action: reject',
        'Feedback: Needs improvement'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getUserProfile', () => {
    it('should call getUserProfile and handle errors', async () => {
      const mockResponse = {
        id: 'user_1',
        email: 'test@example.com',
        role: 'public',
        examVariant: 'calc_ab',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      vi.mocked(apiClient.getUserProfile).mockResolvedValue(mockResponse);

      const result = await getUserProfile();

      expect(apiClient.getUserProfile).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should handle getUserProfile errors', async () => {
      vi.mocked(apiClient.getUserProfile).mockRejectedValue(new Error('API Error'));

      await expect(getUserProfile()).rejects.toThrow('Failed to get user profile');
    });
  });

  describe('getPricingPlans', () => {
    it('should call getPricingPlans and handle errors', async () => {
      const mockResponse = [
        {
          id: 'price_1',
          name: 'Free',
          description: 'Basic plan',
          price: 0,
          currency: 'usd',
          interval: 'month' as const,
          features: ['Basic features'],
          role: 'public' as const,
        },
      ];

      vi.mocked(apiClient.getPricingPlans).mockResolvedValue(mockResponse);

      const result = await getPricingPlans();

      expect(apiClient.getPricingPlans).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should handle getPricingPlans errors', async () => {
      vi.mocked(apiClient.getPricingPlans).mockRejectedValue(new Error('API Error'));

      await expect(getPricingPlans()).rejects.toThrow('Failed to get pricing plans');
    });
  });

  describe('healthCheck', () => {
    it('should call healthCheck and handle errors', async () => {
      const mockResponse = {
        status: 'healthy',
        timestamp: '2023-01-01T00:00:00Z',
        services: { api: 'healthy', db: 'healthy' },
      };

      vi.mocked(apiClient.healthCheck).mockResolvedValue(mockResponse);

      const result = await healthCheck();

      expect(apiClient.healthCheck).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should handle healthCheck errors', async () => {
      vi.mocked(apiClient.healthCheck).mockRejectedValue(new Error('API Error'));

      await expect(healthCheck()).rejects.toThrow('Failed to perform health check');
    });
  });
});
