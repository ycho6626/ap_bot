import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VAMCoach } from '../src/coach';

// Mock dependencies
vi.mock('../src/llm', () => ({
  llmClient: {
    complete: vi.fn(),
  },
  llmUtils: {
    createSystemMessage: vi.fn(() => 'System message'),
    createUserMessage: vi.fn((question, context) => context ? `${question}\n\n${context}` : question),
  },
}));

vi.mock('../src/retrieval', () => ({
  hybridRetrieval: {
    search: vi.fn(),
  },
}));

vi.mock('../src/canonical', () => ({
  canonicalManager: {
    findBestCanonical: vi.fn(),
    formatSteps: vi.fn(),
  },
}));

vi.mock('../src/postprocess', () => ({
  RubricEnforcer: vi.fn().mockImplementation(() => ({
    enforceRubric: vi.fn().mockReturnValue({
      formattedAnswer: 'formatted answer',
      violations: [],
      score: 0.95,
    }),
  })),
  loadRubricConfig: vi.fn(() => ({})),
}));

vi.mock('../src/verify', () => ({
  verifierClient: {
    verify: vi.fn(),
    calculateTrustScore: vi.fn(() => ({
      score: 0.9,
      breakdown: { mathematical: 0.9, units: 0.8, notation: 0.9, consistency: 0.8 },
      confidence: 0.9,
    })),
  },
}));

vi.mock('@ap/shared', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  traceLlmOperation: vi.fn((name, model, fn) => fn()),
}));

describe('VAMCoach', () => {
  let coach: VAMCoach;
  let mockLLMClient: any;
  let mockHybridRetrieval: any;
  let mockCanonicalManager: any;
  let mockVerifierClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    coach = new VAMCoach();
    
    // Get mocked instances
    const { llmClient } = await import('../src/llm');
    const { hybridRetrieval } = await import('../src/retrieval');
    const { canonicalManager } = await import('../src/canonical');
    const { verifierClient } = await import('../src/verify');
    
    mockLLMClient = llmClient;
    mockHybridRetrieval = hybridRetrieval;
    mockCanonicalManager = canonicalManager;
    mockVerifierClient = verifierClient;
  });

  describe('processQuestion', () => {
    it('should process question successfully with canonical-first approach', async () => {
      const mockCanonical = {
        solution: {
          id: '1',
          content: 'Step 1: Find the derivative\nStep 2: Apply the power rule',
          title: 'Derivative Solution',
        },
        score: 0.95,
        relevance: 0.9,
        metadata: {
          topic: 'derivatives',
          subtopic: 'power_rule',
        },
      };

      const mockFormattedSteps = [
        { step: 1, description: 'Find the derivative', work: 'Apply the power rule' },
        { step: 2, description: 'Simplify', work: 'Get 2x' },
      ];

      const mockVerification = {
        ok: true,
        checks: [{ type: 'derivative', passed: true, confidence: 0.9 }],
        normalizedAnswer: '2x',
        overallConfidence: 0.9,
      };

      mockCanonicalManager.findBestCanonical.mockResolvedValue(mockCanonical);
      mockCanonicalManager.formatSteps.mockReturnValue(mockFormattedSteps);
      mockVerifierClient.verify.mockResolvedValue(mockVerification);

      const context = {
        examVariant: 'calc_ab' as const,
        topic: 'derivatives',
      };

      const result = await coach.processQuestion('How to find the derivative of x^2?', context);

      expect(result.verified).toBe(true);
      expect(result.trustScore).toBe(0.9);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].type).toBe('canonical');
      expect(result.sources[0].id).toBe('1');
    });

    it('should fall back to retrieval + generation when canonical fails', async () => {
      const mockSearchResults = [
        {
          document: {
            id: '1',
            title: 'Derivatives Guide',
            content: 'Derivatives are rates of change',
          },
          snippet: 'Derivatives are rates of change',
          score: 0.8,
        },
      ];

      const mockLLMResponse = {
        content: 'The derivative of x^2 is 2x',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        model: 'gpt-5',
        finishReason: 'stop',
      };

      const mockVerification = {
        ok: true,
        checks: [{ type: 'derivative', passed: true, confidence: 0.8 }],
        normalizedAnswer: '2x',
        overallConfidence: 0.8,
      };

      mockCanonicalManager.findBestCanonical.mockResolvedValue(null);
      mockHybridRetrieval.search.mockResolvedValue(mockSearchResults);
      mockLLMClient.complete.mockResolvedValue(mockLLMResponse);
      mockVerifierClient.verify.mockResolvedValue(mockVerification);

      const context = {
        examVariant: 'calc_ab' as const,
      };

      const result = await coach.processQuestion('What is the derivative of x^2?', context);

      expect(result.verified).toBe(true);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].type).toBe('retrieval');
      expect(result.sources[0].id).toBe('1');
    });

    it('should try corrective decode when trust score is low', async () => {
      const mockSearchResults = [
        {
          document: { id: '1', title: 'Test', content: 'Test content' },
          snippet: 'Test snippet',
          score: 0.5,
        },
      ];

      const mockLLMResponse = {
        content: 'The derivative is 2x',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        model: 'gpt-5',
        finishReason: 'stop',
      };

      const mockVerification = {
        ok: false,
        checks: [{ type: 'derivative', passed: false, confidence: 0.3 }],
        normalizedAnswer: '2x',
        overallConfidence: 0.3,
      };

      const mockCorrectiveResponse = {
        content: 'The derivative of x^2 is 2x, using the power rule',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        model: 'gpt-5',
        finishReason: 'stop',
      };

      const mockCorrectiveVerification = {
        ok: true,
        checks: [{ type: 'derivative', passed: true, confidence: 0.9 }],
        normalizedAnswer: '2x',
        overallConfidence: 0.9,
      };

      mockCanonicalManager.findBestCanonical.mockResolvedValue(null);
      mockHybridRetrieval.search.mockResolvedValue(mockSearchResults);
      mockLLMClient.complete
        .mockResolvedValueOnce(mockLLMResponse)
        .mockResolvedValueOnce(mockCorrectiveResponse);
      mockVerifierClient.verify
        .mockResolvedValueOnce(mockVerification)
        .mockResolvedValueOnce(mockCorrectiveVerification);

      const context = {
        examVariant: 'calc_ab' as const,
      };

      const result = await coach.processQuestion('What is the derivative of x^2?', context);

      expect(result.verified).toBe(true);
      expect(result.trustScore).toBe(0.9);
      expect(result.metadata.retryCount).toBe(1);
    });

    it('should abstain with suggestions when trust score remains low', async () => {
      const mockSearchResults = [
        {
          document: { id: '1', title: 'Derivatives Guide', content: 'Test content' },
          snippet: 'Test snippet',
          score: 0.3,
        },
      ];

      const mockLLMResponse = {
        content: 'The derivative is 2x',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        model: 'gpt-5',
        finishReason: 'stop',
      };

      const mockVerification = {
        ok: false,
        checks: [{ type: 'derivative', passed: false, confidence: 0.2 }],
        normalizedAnswer: '2x',
        overallConfidence: 0.2,
      };

      mockCanonicalManager.findBestCanonical.mockResolvedValue(null);
      mockHybridRetrieval.search.mockResolvedValue(mockSearchResults);
      mockLLMClient.complete.mockResolvedValue(mockLLMResponse);
      mockVerifierClient.verify.mockResolvedValue(mockVerification);

      const context = {
        examVariant: 'calc_ab' as const,
      };

      const result = await coach.processQuestion('What is the derivative of x^2?', context);

      expect(result.verified).toBe(false);
      expect(result.trustScore).toBe(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.answer).toContain('not confident enough');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Processing failed');
      mockCanonicalManager.findBestCanonical.mockRejectedValue(error);

      const context = {
        examVariant: 'calc_ab' as const,
      };

      const result = await coach.processQuestion('Test question', context);

      expect(result.verified).toBe(false);
      expect(result.trustScore).toBe(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.answer).toContain('error while processing');
    });
  });

  describe('formatCanonicalAnswer', () => {
    it('should format canonical answer with steps', () => {
      const steps = [
        {
          step: 1,
          description: 'Find the derivative',
          work: 'Apply the power rule',
          justification: 'because it is a polynomial',
          theorem: 'Power Rule',
        },
        {
          step: 2,
          description: 'Simplify',
          work: 'Get 2x',
        },
      ];

      const context = {
        examVariant: 'calc_ab' as const,
      };

      const answer = (coach as any).formatCanonicalAnswer(steps, context);

      expect(answer).toContain('Step 1: Find the derivative');
      expect(answer).toContain('Apply the power rule');
      expect(answer).toContain('because it is a polynomial');
      expect(answer).toContain('Using Power Rule');
      expect(answer).toContain('Step 2: Simplify');
    });
  });

  describe('formatRetrievalContext', () => {
    it('should format retrieval context', () => {
      const searchResults = [
        {
          document: { id: '1', title: 'Derivatives Guide' },
          snippet: 'Derivatives are rates of change',
        },
        {
          document: { id: '2', title: 'Power Rule' },
          snippet: 'The power rule states that d/dx(x^n) = nx^(n-1)',
        },
      ];

      const context = (coach as any).formatRetrievalContext(searchResults);

      expect(context).toContain('1. **Derivatives Guide**');
      expect(context).toContain('Derivatives are rates of change');
      expect(context).toContain('2. **Power Rule**');
      expect(context).toContain('The power rule states that');
    });
  });

  describe('formatContext', () => {
    it('should format coach context', () => {
      const context = {
        examVariant: 'calc_ab' as const,
        topic: 'derivatives',
        subtopic: 'power_rule',
        difficulty: 'easy',
        studentLevel: 'beginner' as const,
      };

      const formatted = (coach as any).formatContext(context);

      expect(formatted).toContain('Topic: derivatives');
      expect(formatted).toContain('Subtopic: power_rule');
      expect(formatted).toContain('Difficulty: easy');
      expect(formatted).toContain('Student Level: beginner');
    });

    it('should handle minimal context', () => {
      const context = {
        examVariant: 'calc_ab' as const,
      };

      const formatted = (coach as any).formatContext(context);

      expect(formatted).toBe('');
    });
  });

  describe('getCacheKey', () => {
    it('should generate cache key', () => {
      const context = {
        examVariant: 'calc_ab' as const,
        topic: 'derivatives',
        subtopic: 'power_rule',
      };

      const key = (coach as any).getCacheKey('What is a derivative?', context);

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
  });

  describe('cacheResponse', () => {
    it('should cache verified responses', () => {
      const key = 'test-key';
      const response = {
        answer: 'Test answer',
        verified: true,
        trustScore: 0.9,
        confidence: 0.9,
        sources: [],
        suggestions: [],
        metadata: {
          examVariant: 'calc_ab' as const,
          processingTime: 100,
          retryCount: 0,
        },
      };

      (coach as any).cacheResponse(key, response);

      // Check if response was cached
      const cached = (coach as any).answerCache.get(key);
      expect(cached).toEqual(response);
    });

    it('should not cache unverified responses when cacheVerifiedOnly is true', () => {
      const key = 'test-key';
      const response = {
        answer: 'Test answer',
        verified: false,
        trustScore: 0.5,
        confidence: 0.5,
        sources: [],
        suggestions: [],
        metadata: {
          examVariant: 'calc_ab' as const,
          processingTime: 100,
          retryCount: 0,
        },
      };

      (coach as any).cacheResponse(key, response);

      // Check if response was not cached
      const cached = (coach as any).answerCache.get(key);
      expect(cached).toBeUndefined();
    });
  });
});
