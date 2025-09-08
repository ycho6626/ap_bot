import OpenAI from 'openai';
import { config, createLogger } from '@ap/shared';
import { createOpenAIClient, httpUtils } from '@ap/shared';
import { traceLlmOperation } from '@ap/shared';

/**
 * LLM completion options
 */
export interface CompletionOptions {
  system?: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * LLM completion result
 */
export interface CompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

/**
 * LLM error types
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * LLM client with fallback support
 */
export class LLMClient {
  private openai: OpenAI;
  private logger = createLogger('llm-client');
  private fallbackModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4'];

  constructor() {
    this.openai = new OpenAI({
      apiKey: config().OPENAI_API_KEY,
      httpAgent: createOpenAIClient(),
    });
  }

  /**
   * Complete a conversation with the LLM
   * @param options - Completion options
   * @returns Completion result
   */
  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const {
      system,
      messages,
      maxTokens = 4000,
      temperature = 0.1,
      model = 'gpt-5',
    } = options;

    const allMessages = system
      ? [{ role: 'system' as const, content: system }, ...messages]
      : messages;

    return this.completeWithFallback({
      messages: allMessages,
      maxTokens,
      temperature,
      model,
    });
  }

  /**
   * Complete with fallback models
   * @param options - Completion options with model
   * @returns Completion result
   */
  private async completeWithFallback(options: CompletionOptions & { model: string }): Promise<CompletionResult> {
    const models = [options.model, ...this.fallbackModels];
    
    for (const model of models) {
      try {
        return await traceLlmOperation(
          'complete',
          model,
          () => this.completeWithModel({ ...options, model }),
        );
      } catch (error) {
        this.logger.warn(
          { model, error: error instanceof Error ? error.message : String(error) },
          `Model ${model} failed, trying next fallback`,
        );
        
        if (model === models[models.length - 1]) {
          // Last model failed, re-throw the error
          throw error;
        }
      }
    }

    throw new LLMError('All models failed', 'ALL_MODELS_FAILED');
  }

  /**
   * Complete with a specific model
   * @param options - Completion options
   * @returns Completion result
   */
  private async completeWithModel(options: CompletionOptions & { model: string }): Promise<CompletionResult> {
    const { messages, maxTokens, temperature, model } = options;

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: messages as any,
        max_tokens: maxTokens || null,
        temperature: temperature || null,
        response_format: { type: 'text' },
      });

      const choice = response.choices[0];
      if (!choice || !choice.message.content) {
        throw new LLMError('No content in response', 'NO_CONTENT');
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model: response.model,
        finishReason: choice.finish_reason || 'unknown',
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        const retryable = this.isRetryableError(error);
        throw new LLMError(
          `OpenAI API error: ${error.message}`,
          error.code || 'API_ERROR',
          retryable,
        );
      }
      
      if (error instanceof Error) {
        const retryable = httpUtils.isTimeoutError(error) || httpUtils.isNetworkError(error);
        throw new LLMError(
          `LLM request failed: ${error.message}`,
          'REQUEST_FAILED',
          retryable,
        );
      }

      throw new LLMError('Unknown error occurred', 'UNKNOWN_ERROR');
    }
  }

  /**
   * Check if an error is retryable
   * @param error - OpenAI API error
   * @returns True if the error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Rate limit errors are retryable
    if (error.status === 429) {
      return true;
    }

    // Server errors are retryable
    if (error.status && error.status >= 500) {
      return true;
    }

    // Specific error codes that are retryable
    const retryableCodes = [
      'rate_limit_exceeded',
      'server_error',
      'service_unavailable',
      'timeout',
    ];

    return retryableCodes.includes(error.code || '');
  }

  /**
   * Complete with JSON-safe output
   * @param options - Completion options
   * @returns JSON-safe completion result
   */
  async completeJSON<T = unknown>(options: CompletionOptions): Promise<T> {
    const result = await this.complete({
      ...options,
      system: `${options.system || ''}\n\nRespond with valid JSON only. No markdown, no code blocks, no additional text.`,
    });

    try {
      return JSON.parse(result.content) as T;
    } catch (error) {
      this.logger.error(
        { content: result.content, error: error instanceof Error ? error.message : String(error) },
        'Failed to parse JSON response',
      );
      throw new LLMError('Invalid JSON response', 'INVALID_JSON');
    }
  }

  /**
   * Complete with retry and exponential backoff
   * @param options - Completion options
   * @param maxRetries - Maximum number of retries
   * @returns Completion result
   */
  async completeWithRetry(
    options: CompletionOptions,
    maxRetries = 3,
  ): Promise<CompletionResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.complete(options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof LLMError && !error.retryable) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        const delay = httpUtils.getRetryDelay(attempt, 1000, 10000);
        this.logger.warn(
          { attempt, delay, error: lastError.message },
          'Retrying LLM request after delay',
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new LLMError('Max retries exceeded', 'MAX_RETRIES_EXCEEDED');
  }

  /**
   * Get available models
   * @returns Array of available model names
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      return models.data
        .filter(model => model.id.startsWith('gpt-'))
        .map(model => model.id)
        .sort();
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to get available models',
      );
      return this.fallbackModels;
    }
  }

  /**
   * Check if a model is available
   * @param model - Model name to check
   * @returns True if the model is available
   */
  async isModelAvailable(model: string): Promise<boolean> {
    try {
      const availableModels = await this.getAvailableModels();
      return availableModels.includes(model);
    } catch (error) {
      this.logger.warn(
        { model, error: error instanceof Error ? error.message : String(error) },
        'Failed to check model availability, assuming available',
      );
      return true;
    }
  }
}

/**
 * Default LLM client instance
 */
export const llmClient = new LLMClient();

/**
 * Utility functions for LLM operations
 */
export const llmUtils = {
  /**
   * Create a system message for AP Calculus tutoring
   * @param examVariant - Exam variant (AB or BC)
   * @returns System message
   */
  createSystemMessage(examVariant: 'calc_ab' | 'calc_bc'): string {
    const variant = examVariant === 'calc_ab' ? 'AB' : 'BC';
    return `You are an expert AP Calculus ${variant} tutor. You help students understand calculus concepts, solve problems, and prepare for the AP exam. 

Key principles:
- Provide clear, step-by-step explanations
- Use proper mathematical notation and terminology
- Show all work and justify each step
- Reference relevant theorems (MVT, IVT, Rolle's, etc.) when applicable
- Ensure answers are mathematically correct and well-formatted
- For BC: Include series, polar, and parametric concepts when relevant

Always be encouraging and help students understand the underlying concepts, not just memorize procedures.`;
  },

  /**
   * Create a user message with context
   * @param question - Student's question
   * @param context - Additional context or constraints
   * @returns User message
   */
  createUserMessage(question: string, context?: string): string {
    if (context) {
      return `Question: ${question}\n\nContext: ${context}`;
    }
    return question;
  },

  /**
   * Extract mathematical expressions from text
   * @param text - Text to extract expressions from
   * @returns Array of mathematical expressions
   */
  extractMathExpressions(text: string): string[] {
    // Simple regex to find mathematical expressions
    const mathRegex = /[a-zA-Z]\s*[=<>≤≥]\s*[^a-zA-Z\n]+|[a-zA-Z]\s*\([^)]+\)|[0-9]+\s*[+\-*/^]\s*[0-9]+/g;
    return text.match(mathRegex) || [];
  },

  /**
   * Validate mathematical notation
   * @param text - Text to validate
   * @returns True if notation appears valid
   */
  validateMathNotation(text: string): boolean {
    // Check for common mathematical notation patterns
    const hasMathContent = /[0-9]+\s*[+\-*/^=<>≤≥]\s*[0-9]+/.test(text);
    const hasVariables = /[a-zA-Z]\s*[=<>≤≥]/.test(text);
    const hasFunctions = /[a-zA-Z]\s*\([^)]+\)/.test(text);
    
    return hasMathContent || hasVariables || hasFunctions;
  },
};
