import { createLogger } from '@ap/shared';
// import { traceLlmOperation } from '@ap/shared';
import { llmClient, llmUtils } from './llm';
import { hybridRetrieval } from './retrieval';
import { canonicalManager, CanonicalSearchOptions } from './canonical';
import { rubricEnforcer, loadRubricConfig } from './postprocess';
import { verifierClient } from './verify';
import type { SearchResult } from './retrieval';
// import type { CanonicalResult } from './canonical';
import type { PostprocessResult } from './postprocess';
import type { VerifierResponse } from './verify';

/**
 * VAM (Verified Answer Mode) configuration
 */
export interface VAMConfig {
  minTrustThreshold: number;
  maxRetries: number;
  enableCanonicalFirst: boolean;
  enableRetrieval: boolean;
  enableVerification: boolean;
  enablePostprocessing: boolean;
  cacheVerifiedOnly: boolean;
  suggestionsCount: number;
}

/**
 * Coach response
 */
export interface CoachResponse {
  answer: string;
  verified: boolean;
  trustScore: number;
  confidence: number;
  sources: Array<{
    type: 'canonical' | 'retrieval' | 'generated';
    id: string;
    title?: string;
    snippet?: string;
    score?: number;
  }>;
  suggestions: string[];
  metadata: {
    examVariant: 'calc_ab' | 'calc_bc';
    topic?: string;
    subtopic?: string;
    difficulty?: string;
    processingTime: number;
    retryCount: number;
  };
}

/**
 * Coach context
 */
export interface CoachContext {
  examVariant: 'calc_ab' | 'calc_bc';
  topic?: string;
  subtopic?: string;
  difficulty?: string;
  studentLevel?: 'beginner' | 'intermediate' | 'advanced';
  previousQuestions?: string[];
  sessionId?: string;
}

/**
 * VAM Coach for AP Calculus
 */
export class VAMCoach {
  private logger = createLogger('vam-coach');
  private config: VAMConfig;
  private answerCache = new Map<string, CoachResponse>();

  constructor(config: VAMConfig = {
    minTrustThreshold: 0.92,
    maxRetries: 1,
    enableCanonicalFirst: true,
    enableRetrieval: true,
    enableVerification: true,
    enablePostprocessing: true,
    cacheVerifiedOnly: true,
    suggestionsCount: 3,
  }) {
    this.config = config;
  }

  /**
   * Process a student question using VAM
   * @param question - Student's question
   * @param context - Coach context
   * @returns Coach response
   */
  async processQuestion(
    question: string,
    context: CoachContext,
  ): Promise<CoachResponse> {
    const startTime = Date.now();
    const { examVariant } = context;

    this.logger.debug(
      { question, examVariant, sessionId: context.sessionId },
      'Processing student question',
    );

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(question, context);
      const cached = this.answerCache.get(cacheKey);
      if (cached && this.config.cacheVerifiedOnly && cached.verified) {
        this.logger.debug({ cacheKey }, 'Returning cached verified answer');
        return cached;
      }

      // Try canonical-first approach
      let response: CoachResponse;
      if (this.config.enableCanonicalFirst) {
        response = await this.tryCanonicalFirst(question, context);
        if (response.verified && response.trustScore >= this.config.minTrustThreshold) {
          this.cacheResponse(cacheKey, response);
          return response;
        }
      }

      // Try retrieval + generation approach
      if (this.config.enableRetrieval) {
        response = await this.tryRetrievalGeneration(question, context);
        if (response.verified && response.trustScore >= this.config.minTrustThreshold) {
          this.cacheResponse(cacheKey, response);
          return response;
        }
      }

      // Try corrective decode if below threshold
      if (response!.trustScore < this.config.minTrustThreshold && this.config.maxRetries > 0) {
        response = await this.tryCorrectiveDecode(question, context, response!);
      }

      // If still below threshold, abstain with suggestions
      if (response!.trustScore < this.config.minTrustThreshold) {
        response = await this.abstainWithSuggestions(question, context);
      }

      this.cacheResponse(cacheKey, response!);
      return response!;

    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to process question',
      );

      return this.createErrorResponse(context);
    } finally {
      const processingTime = Date.now() - startTime;
      this.logger.debug(
        { processingTime, question },
        'Question processing completed',
      );
    }
  }

  /**
   * Try canonical-first approach
   * @param question - Student's question
   * @param context - Coach context
   * @returns Coach response
   */
  private async tryCanonicalFirst(
    question: string,
    context: CoachContext,
  ): Promise<CoachResponse> {
    this.logger.debug({ question }, 'Trying canonical-first approach');

    try {
      // Find best canonical solution
      const searchOptions: CanonicalSearchOptions = {
        examVariant: context.examVariant,
      };
      
      if (context.topic) searchOptions.topic = context.topic;
      if (context.subtopic) searchOptions.subtopic = context.subtopic;
      if (context.difficulty) searchOptions.difficulty = context.difficulty;
      
      const canonical = await canonicalManager.findBestCanonical(question, searchOptions);

      if (!canonical) {
        throw new Error('No canonical solution found');
      }

      // Format the canonical solution
      const formattedSteps = canonicalManager.formatSteps(canonical.solution);
      const answer = this.formatCanonicalAnswer(formattedSteps);

      // Verify the answer
      let verification: VerifierResponse | null = null;
      let trustScore = 0.95; // Canonical solutions are highly trusted

      if (this.config.enableVerification) {
        verification = await verifierClient.verify(question, answer, {
          checkTypes: ['derivative', 'integral', 'limit', 'algebra'],
        });
        trustScore = verifierClient.calculateTrustScore(verification, answer).score;
      }

      // Postprocess if enabled
      let postprocess: PostprocessResult | null = null;
      if (this.config.enablePostprocessing) {
        const rubricConfig = loadRubricConfig(context.examVariant);
        const enforcer = new (rubricEnforcer.constructor as any)(rubricConfig);
        postprocess = await enforcer.postprocess(answer, context.examVariant);
      }

      return {
        answer: postprocess?.content || answer,
        verified: true,
        trustScore,
        confidence: verification?.overallConfidence || 0.95,
        sources: [{
          type: 'canonical',
          id: canonical.solution.id,
          title: canonical.solution.question_template,
          snippet: canonical.solution.final_answer.substring(0, 200),
          score: canonical.score,
        }],
        suggestions: [],
        metadata: {
          examVariant: context.examVariant,
          ...(context.topic && { topic: context.topic }),
          ...(context.subtopic && { subtopic: context.subtopic }),
          ...(context.difficulty && { difficulty: context.difficulty }),
          processingTime: 0,
          retryCount: 0,
        },
      };

    } catch (error) {
      this.logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'Canonical-first approach failed',
      );
      throw error;
    }
  }

  /**
   * Try retrieval + generation approach
   * @param question - Student's question
   * @param context - Coach context
   * @returns Coach response
   */
  private async tryRetrievalGeneration(
    question: string,
    context: CoachContext,
  ): Promise<CoachResponse> {
    this.logger.debug({ question }, 'Trying retrieval + generation approach');

    try {
      // Retrieve relevant documents
      const searchResults = await hybridRetrieval.search(question, {
        examVariant: context.examVariant,
        limit: 5,
        minScore: 0.3,
      });

      if (searchResults.length === 0) {
        throw new Error('No relevant documents found');
      }

      // Generate answer using LLM
      const systemMessage = llmUtils.createSystemMessage(context.examVariant);
      const userMessage = llmUtils.createUserMessage(question, this.formatContext(context));

      const llmResponse = await llmClient.complete({
        system: systemMessage,
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: this.formatRetrievalContext(searchResults) },
        ],
        maxTokens: 2000,
        temperature: 0.1,
      });

      const answer = llmResponse.content;

      // Verify the answer
      let verification: VerifierResponse | null = null;
      let trustScore = 0.5; // Base trust for generated answers

      if (this.config.enableVerification) {
        verification = await verifierClient.verify(question, answer, {
          checkTypes: ['derivative', 'integral', 'limit', 'algebra', 'units'],
        });
        trustScore = verifierClient.calculateTrustScore(verification, answer).score;
      }

      // Postprocess if enabled
      let postprocess: PostprocessResult | null = null;
      if (this.config.enablePostprocessing) {
        const rubricConfig = loadRubricConfig(context.examVariant);
        const enforcer = new (rubricEnforcer.constructor as any)(rubricConfig);
        postprocess = await enforcer.postprocess(answer, context.examVariant);
      }

      return {
        answer: postprocess?.content || answer,
        verified: verification?.ok || false,
        trustScore,
        confidence: verification?.overallConfidence || 0.5,
        sources: searchResults.map(result => ({
          type: 'retrieval' as const,
          id: result.document.id,
          title: result.document.topic || 'Document',
          snippet: result.snippet,
          score: result.score,
        })),
        suggestions: [],
        metadata: {
          examVariant: context.examVariant,
          ...(context.topic && { topic: context.topic }),
          ...(context.subtopic && { subtopic: context.subtopic }),
          ...(context.difficulty && { difficulty: context.difficulty }),
          processingTime: 0,
          retryCount: 0,
        },
      };

    } catch (error) {
      this.logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'Retrieval + generation approach failed',
      );
      throw error;
    }
  }

  /**
   * Try corrective decode
   * @param question - Student's question
   * @param context - Coach context
   * @param previousResponse - Previous response
   * @returns Coach response
   */
  private async tryCorrectiveDecode(
    question: string,
    context: CoachContext,
    previousResponse: CoachResponse,
  ): Promise<CoachResponse> {
    this.logger.debug({ question }, 'Trying corrective decode');

    try {
      const systemMessage = llmUtils.createSystemMessage(context.examVariant);
      const userMessage = llmUtils.createUserMessage(question, `
Previous attempt had low confidence. Please provide a more accurate and detailed solution.

Previous answer: ${previousResponse.answer}
Issues identified: ${previousResponse.sources.map(s => s.title).join(', ')}
      `);

      const llmResponse = await llmClient.complete({
        system: systemMessage,
        messages: [
          { role: 'user', content: userMessage },
        ],
        maxTokens: 2000,
        temperature: 0.05, // Lower temperature for more focused response
      });

      const answer = llmResponse.content;

      // Verify the corrected answer
      let verification: VerifierResponse | null = null;
      let trustScore = 0.5;

      if (this.config.enableVerification) {
        verification = await verifierClient.verify(question, answer, {
          checkTypes: ['derivative', 'integral', 'limit', 'algebra', 'units'],
        });
        trustScore = verifierClient.calculateTrustScore(verification, answer).score;
      }

      // Postprocess if enabled
      let postprocess: PostprocessResult | null = null;
      if (this.config.enablePostprocessing) {
        const rubricConfig = loadRubricConfig(context.examVariant);
        const enforcer = new (rubricEnforcer.constructor as any)(rubricConfig);
        postprocess = await enforcer.postprocess(answer, context.examVariant);
      }

      return {
        answer: postprocess?.content || answer,
        verified: verification?.ok || false,
        trustScore,
        confidence: verification?.overallConfidence || 0.5,
        sources: [{
          type: 'generated',
          id: 'corrective-decode',
          title: 'Corrected Answer',
          snippet: answer.substring(0, 200),
        }],
        suggestions: [],
        metadata: {
          examVariant: context.examVariant,
          ...(context.topic && { topic: context.topic }),
          ...(context.subtopic && { subtopic: context.subtopic }),
          ...(context.difficulty && { difficulty: context.difficulty }),
          processingTime: 0,
          retryCount: 1,
        },
      };

    } catch (error) {
      this.logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'Corrective decode failed',
      );
      throw error;
    }
  }

  /**
   * Abstain with suggestions
   * @param question - Student's question
   * @param context - Coach context
   * @returns Coach response
   */
  private async abstainWithSuggestions(
    question: string,
    context: CoachContext,
  ): Promise<CoachResponse> {
    this.logger.debug({ question }, 'Abstaining with suggestions');

    try {
      // Get relevant suggestions from knowledge base
      const searchResults = await hybridRetrieval.search(question, {
        examVariant: context.examVariant,
        limit: this.config.suggestionsCount,
        minScore: 0.2,
      });

      const suggestions = searchResults.map(result => 
        `Check out: ${result.document.topic || 'Document'} - ${result.snippet}`
      );

      // Add generic suggestions if needed
      if (suggestions.length < this.config.suggestionsCount) {
        const genericSuggestions = [
          'Review the fundamental concepts of calculus',
          'Practice similar problems from your textbook',
          'Ask your teacher for clarification',
          'Use online resources like Khan Academy',
        ];
        
        suggestions.push(...genericSuggestions.slice(0, this.config.suggestionsCount - suggestions.length));
      }

      return {
        answer: `I'm not confident enough in my answer to provide a reliable solution. Here are some suggestions to help you:`,
        verified: false,
        trustScore: 0,
        confidence: 0,
        sources: searchResults.map(result => ({
          type: 'retrieval' as const,
          id: result.document.id,
          title: result.document.topic || 'Document',
          snippet: result.snippet,
          score: result.score,
        })),
        suggestions,
        metadata: {
          examVariant: context.examVariant,
          ...(context.topic && { topic: context.topic }),
          ...(context.subtopic && { subtopic: context.subtopic }),
          ...(context.difficulty && { difficulty: context.difficulty }),
          processingTime: 0,
          retryCount: 0,
        },
      };

    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to generate suggestions',
      );

      return {
        answer: 'I apologize, but I cannot provide a reliable answer to your question at this time.',
        verified: false,
        trustScore: 0,
        confidence: 0,
        sources: [],
        suggestions: [
          'Please try rephrasing your question',
          'Ask your teacher for help',
          'Review the relevant textbook material',
        ],
        metadata: {
          examVariant: context.examVariant,
          ...(context.topic && { topic: context.topic }),
          ...(context.subtopic && { subtopic: context.subtopic }),
          ...(context.difficulty && { difficulty: context.difficulty }),
          processingTime: 0,
          retryCount: 0,
        },
      };
    }
  }

  /**
   * Format canonical answer
   * @param steps - Formatted steps
   * @param context - Coach context
   * @returns Formatted answer
   */
  private formatCanonicalAnswer(steps: any[]): string {
    let answer = `Here's a step-by-step solution:\n\n`;
    
    steps.forEach((step) => {
      answer += `**Step ${step.step}**: ${step.description}\n`;
      answer += `${step.work}\n`;
      if (step.justification) {
        answer += `*${step.justification}*\n`;
      }
      if (step.theorem) {
        answer += `*Using ${step.theorem}*\n`;
      }
      answer += `\n`;
    });

    return answer;
  }

  /**
   * Format retrieval context
   * @param searchResults - Search results
   * @returns Formatted context
   */
  private formatRetrievalContext(searchResults: SearchResult[]): string {
    let context = `Here are some relevant resources:\n\n`;
    
    searchResults.forEach((result, index) => {
      context += `${index + 1}. **${result.document.topic || 'Document'}**\n`;
      context += `${result.snippet}\n\n`;
    });

    return context;
  }

  /**
   * Format coach context
   * @param context - Coach context
   * @returns Formatted context string
   */
  private formatContext(context: CoachContext): string {
    let formatted = '';
    
    if (context.topic) {
      formatted += `Topic: ${context.topic}\n`;
    }
    if (context.subtopic) {
      formatted += `Subtopic: ${context.subtopic}\n`;
    }
    if (context.difficulty) {
      formatted += `Difficulty: ${context.difficulty}\n`;
    }
    if (context.studentLevel) {
      formatted += `Student Level: ${context.studentLevel}\n`;
    }

    return formatted;
  }

  /**
   * Create error response
   * @param question - Student's question
   * @param context - Coach context
   * @param error - Error that occurred
   * @returns Error response
   */
  private createErrorResponse(
    context: CoachContext,
  ): CoachResponse {
    return {
      answer: 'I apologize, but I encountered an error while processing your question. Please try again.',
      verified: false,
      trustScore: 0,
      confidence: 0,
      sources: [],
      suggestions: [
        'Please try rephrasing your question',
        'Check your internet connection',
        'Contact support if the problem persists',
      ],
      metadata: {
        examVariant: context.examVariant,
        ...(context.topic && { topic: context.topic }),
        ...(context.subtopic && { subtopic: context.subtopic }),
        ...(context.difficulty && { difficulty: context.difficulty }),
        processingTime: 0,
        retryCount: 0,
      },
    };
  }

  /**
   * Get cache key
   * @param question - Student's question
   * @param context - Coach context
   * @returns Cache key
   */
  private getCacheKey(question: string, context: CoachContext): string {
    const key = `${context.examVariant}:${question}:${context.topic || ''}:${context.subtopic || ''}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * Cache response
   * @param key - Cache key
   * @param response - Response to cache
   */
  private cacheResponse(key: string, response: CoachResponse): void {
    if (this.config.cacheVerifiedOnly && !response.verified) {
      return;
    }

    this.answerCache.set(key, response);
    
      // Simple LRU: remove oldest entries if cache is too large
      if (this.answerCache.size > 100) {
        const firstKey = this.answerCache.keys().next().value;
        if (firstKey) {
          this.answerCache.delete(firstKey);
        }
      }
  }
}

/**
 * Default VAM coach instance
 */
export const vamCoach = new VAMCoach();

/**
 * Coach function interface for QA harness and API
 */
export interface CoachRequest {
  question: string;
  exam_variant: 'calc_ab' | 'calc_bc';
  user_id: string;
  session_id: string;
}

export interface CoachResponseSimple {
  answer: string;
  is_verified: boolean;
  trust_score: number;
  verifier_equiv: boolean;
  sources: Array<{
    type: 'canonical' | 'retrieval' | 'generated';
    id: string;
    title?: string;
    snippet?: string;
    score?: number;
  }>;
  suggestions: string[];
  metadata: {
    exam_variant: 'calc_ab' | 'calc_bc';
    topic?: string;
    subtopic?: string;
    difficulty?: string;
    retry_count: number;
  };
}

/**
 * Coach function for QA harness and API
 */
export async function coach(request: CoachRequest): Promise<CoachResponseSimple> {
  const context: CoachContext = {
    examVariant: request.exam_variant,
    sessionId: request.session_id,
  };

  const response = await vamCoach.processQuestion(request.question, context);

  return {
    answer: response.answer,
    is_verified: response.verified,
    trust_score: response.trustScore,
    verifier_equiv: response.trustScore >= 0.92, // Simple verifier equivalence check
    sources: response.sources,
    suggestions: response.suggestions,
    metadata: {
      exam_variant: response.metadata.examVariant,
      ...(response.metadata.topic && { topic: response.metadata.topic }),
      ...(response.metadata.subtopic && { subtopic: response.metadata.subtopic }),
      ...(response.metadata.difficulty && { difficulty: response.metadata.difficulty }),
      retry_count: response.metadata.retryCount,
    },
  };
}
