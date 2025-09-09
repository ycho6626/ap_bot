import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchKB, coach, startCheckout, openBillingPortal, listReviewCases, resolveCase } from '../api.bridge';

// Mock the apiClient
vi.mock('../api', () => ({
  apiClient: {
    searchKnowledgeBase: vi.fn(),
    askCoach: vi.fn(),
    createCheckoutSession: vi.fn(),
    openBillingPortal: vi.fn(),
    listReviewCases: vi.fn(),
    resolveReviewCase: vi.fn(),
  }
}));

import { apiClient } from '../api';

describe('API Bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchKB', () => {
    it('should call searchKnowledgeBase with correct parameters', async () => {
      const mockResponse = {
        documents: [
          {
            id: 'doc1',
            title: 'Test Document',
            content: 'Test content',
            relevanceScore: 0.9
          }
        ]
      };
      
      vi.mocked(apiClient.searchKnowledgeBase).mockResolvedValue(mockResponse);

      const result = await searchKB('test query', 'calc_ab');

      expect(apiClient.searchKnowledgeBase).toHaveBeenCalledWith({
        subject: 'calc',
        examVariant: 'calc_ab',
        query: 'test query',
        limit: 10,
        minScore: 0.1
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('coach', () => {
    it('should call askCoach with correct parameters', async () => {
      const mockResponse = {
        answer: 'Test answer',
        trustScore: 0.8,
        verified: true,
        citations: []
      };
      
      vi.mocked(apiClient.askCoach).mockResolvedValue(mockResponse);

      const result = await coach('test question', 'calc_bc');

      expect(apiClient.askCoach).toHaveBeenCalledWith({
        subject: 'calc',
        examVariant: 'calc_bc',
        mode: 'vam',
        question: 'test question',
        context: {
          sessionId: expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
        }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('startCheckout', () => {
    it('should call createCheckoutSession with correct parameters', async () => {
      const mockResponse = {
        url: 'https://checkout.stripe.com/test'
      };
      
      vi.mocked(apiClient.createCheckoutSession).mockResolvedValue(mockResponse);

      const result = await startCheckout('price_123');

      expect(apiClient.createCheckoutSession).toHaveBeenCalledWith('price_123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('openBillingPortal', () => {
    it('should throw error for not implemented functionality', async () => {
      await expect(openBillingPortal()).rejects.toThrow('Billing portal not yet implemented');
    });
  });

  describe('listReviewCases', () => {
    it('should return mock review cases', async () => {
      const result = await listReviewCases();

      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          question: expect.any(String),
          answer: expect.any(String),
          verified: expect.any(Boolean),
          trustScore: expect.any(Number),
          status: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      ]));
    });
  });

  describe('resolveCase', () => {
    it('should log the resolution action', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await resolveCase('case1', 'approve', 'Good answer');

      expect(consoleSpy).toHaveBeenCalledWith('Resolving case case1 with action: approve', 'Feedback: Good answer');
      
      consoleSpy.mockRestore();
    });
  });
});
