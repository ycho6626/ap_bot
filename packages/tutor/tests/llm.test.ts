import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMClient, llmUtils } from '../src/llm';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
      models: {
        list: vi.fn(),
      },
    })),
    APIError: class extends Error {
      constructor(
        public status: number,
        public code: string,
        message: string
      ) {
        super(message);
      }
    },
  };
});

// Mock @ap/shared
vi.mock('@ap/shared', () => ({
  config: vi.fn(() => ({
    OPENAI_API_KEY: 'test-key',
  })),
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  createOpenAIClient: vi.fn(() => ({})),
  httpUtils: {
    isTimeoutError: vi.fn(() => false),
    isNetworkError: vi.fn(() => false),
    getRetryDelay: vi.fn(attempt => 1000 * Math.pow(2, attempt)),
  },
  traceLlmOperation: vi.fn((name, model, fn) => fn()),
}));

describe.skip('LLMClient', () => {
  let client: LLMClient;
  let mockOpenAI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LLMClient();
    mockOpenAI = (client as any).openai;
  });

  describe('complete', () => {
    it('should complete a conversation successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        model: 'gpt-5',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.complete({
        messages: [{ role: 'user', content: 'Test question' }],
      });

      expect(result).toEqual({
        content: 'Test response',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        model: 'gpt-5',
        finishReason: 'stop',
      });
    });

    it('should include system message when provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-5',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await client.complete({
        system: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Test question' }],
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Test question' },
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: 'text' },
      });
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockOpenAI.chat.completions.create.mockRejectedValue(error);

      await expect(
        client.complete({
          messages: [{ role: 'user', content: 'Test question' }],
        })
      ).rejects.toThrow('LLM request failed: API Error');
    });

    it('should use fallback models when primary fails', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-4o',
      };

      // First call fails, second succeeds
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Model not available'))
        .mockResolvedValueOnce(mockResponse);

      const result = await client.complete({
        messages: [{ role: 'user', content: 'Test question' }],
        model: 'gpt-5',
      });

      expect(result.model).toBe('gpt-4o');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('completeJSON', () => {
    it('should parse JSON response correctly', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: '{"result": "success"}' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-5',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.completeJSON<{ result: string }>({
        messages: [{ role: 'user', content: 'Test question' }],
      });

      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error for invalid JSON', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Invalid JSON' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-5',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(
        client.completeJSON({
          messages: [{ role: 'user', content: 'Test question' }],
        })
      ).rejects.toThrow('Invalid JSON response');
    });
  });

  describe('completeWithRetry', () => {
    it('should retry on retryable errors', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-5',
      };

      // First two calls fail, third succeeds
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValueOnce(mockResponse);

      const result = await client.completeWithRetry(
        {
          messages: [{ role: 'user', content: 'Test question' }],
        },
        2
      );

      expect(result.content).toBe('Test response');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const error = new Error('Non-retryable error');
      mockOpenAI.chat.completions.create.mockRejectedValue(error);

      await expect(
        client.completeWithRetry({
          messages: [{ role: 'user', content: 'Test question' }],
        })
      ).rejects.toThrow('Non-retryable error');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });
});

describe('llmUtils', () => {
  describe('createSystemMessage', () => {
    it('should create system message for AB variant', () => {
      const message = llmUtils.createSystemMessage('calc_ab');
      expect(message).toContain('AP Calculus AB');
      expect(message).toContain('tutor');
    });

    it('should create system message for BC variant', () => {
      const message = llmUtils.createSystemMessage('calc_bc');
      expect(message).toContain('AP Calculus BC');
      expect(message).toContain('series');
      expect(message).toContain('polar');
      expect(message).toContain('parametric');
    });
  });

  describe('createUserMessage', () => {
    it('should create user message without context', () => {
      const message = llmUtils.createUserMessage('What is a derivative?');
      expect(message).toBe('What is a derivative?');
    });

    it('should create user message with context', () => {
      const message = llmUtils.createUserMessage(
        'What is a derivative?',
        'This is for a calculus class'
      );
      expect(message).toContain('Question: What is a derivative?');
      expect(message).toContain('Context: This is for a calculus class');
    });
  });

  describe('extractMathExpressions', () => {
    it('should extract mathematical expressions', () => {
      const text = 'f(x) = x^2 + 3x - 1 and g(x) = sin(x)';
      const expressions = llmUtils.extractMathExpressions(text);
      expect(expressions).toContain('f(x)');
      expect(expressions).toContain('g(x)');
    });

    it('should return empty array for non-mathematical text', () => {
      const text = 'This is just plain text';
      const expressions = llmUtils.extractMathExpressions(text);
      expect(expressions).toEqual([]);
    });
  });

  describe('validateMathNotation', () => {
    it('should validate mathematical notation', () => {
      expect(llmUtils.validateMathNotation('x^2 + 3x - 1')).toBe(true);
      expect(llmUtils.validateMathNotation('f(x) = sin(x)')).toBe(true);
      expect(llmUtils.validateMathNotation('2 + 3 = 5')).toBe(true);
    });

    it('should reject non-mathematical text', () => {
      expect(llmUtils.validateMathNotation('Hello world')).toBe(false);
      expect(llmUtils.validateMathNotation('Just text')).toBe(false);
    });
  });
});
