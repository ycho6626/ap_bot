import ky from 'ky';
import type { ExamVariant, UserRole } from '@ap/shared/types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

const api = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 30000,
  retry: {
    limit: 2,
    methods: ['get', 'post'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      (_request, _options, response) => {
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            throw new Error(`Rate limited. Please try again in ${retryAfter} seconds.`);
          }
        }
      },
    ],
  },
});

export interface CoachRequest {
  subject: 'calc';
  examVariant: ExamVariant;
  mode: 'vam' | 'standard';
  question: string;
  context?: {
    topic?: string;
    subtopic?: string;
    difficulty?: string;
    studentLevel?: 'beginner' | 'intermediate' | 'advanced';
    previousQuestions?: string[];
    sessionId?: string;
  };
}

export interface CoachResponse {
  answer: string;
  verified: boolean;
  trustScore: number;
  confidence: number;
  sources: Array<{
    type: 'canonical' | 'retrieval' | 'generated';
    id: string;
    title: string;
    snippet: string;
    score: number;
  }>;
  suggestions?: string[];
  metadata: {
    examVariant: string;
    topic?: string;
    subtopic?: string;
    difficulty?: string;
    processingTime: number;
    retryCount: number;
  };
}

export interface KbSearchRequest {
  subject: 'calc';
  examVariant: ExamVariant;
  query: string;
  limit?: number;
  minScore?: number;
  includePartitions?: string[];
  excludePartitions?: string[];
}

export interface KbSearchResponse {
  results: Array<{
    document: {
      id: string;
      content: string;
      subject: string;
      exam_variant: string | null;
      partition: string;
      topic: string | null;
      subtopic: string | null;
      created_at: string;
      updated_at: string;
    };
    score: number;
    snippet: string;
    provenance: {
      source: string;
      partition: string;
      topic: string | null;
      subtopic: string | null;
    };
  }>;
  metadata: {
    query: string;
    examVariant: string;
    totalResults: number;
    maxScore: number;
    searchTime: number;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  examVariant?: ExamVariant;
  createdAt: string;
  updatedAt: string;
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
}

/**
 * API client for communicating with the AP Bot API Gateway
 */
export class ApiClient {
  /**
   * Send a question to the coach and get a verified answer
   */
  async askCoach(request: CoachRequest): Promise<CoachResponse> {
    return api.post('coach', { json: request }).json();
  }

  /**
   * Search the knowledge base for relevant content
   */
  async searchKnowledgeBase(request: KbSearchRequest): Promise<KbSearchResponse> {
    const searchParams = new URLSearchParams({
      subject: request.subject,
      examVariant: request.examVariant,
      query: request.query,
      ...(request.limit && { limit: request.limit.toString() }),
      ...(request.minScore && { minScore: request.minScore.toString() }),
      ...(request.includePartitions && { includePartitions: request.includePartitions.join(',') }),
      ...(request.excludePartitions && { excludePartitions: request.excludePartitions.join(',') }),
    });

    return api.get(`kb/search?${searchParams}`).json();
  }

  /**
   * Get a specific knowledge base document by ID
   */
  async getDocument(id: string): Promise<{ document: KbSearchResponse['results'][0]['document'] }> {
    return api.get(`kb/document/${id}`).json();
  }

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<UserProfile> {
    return api.get('auth/profile').json();
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(priceId: string): Promise<StripeCheckoutSession> {
    return api.post('payments/checkout', { 
      json: { priceId } 
    }).json();
  }

  /**
   * Get available pricing plans
   */
  async getPricingPlans(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    role: UserRole;
  }>> {
    return api.get('payments/plans').json();
  }

  /**
   * Get coach configuration
   */
  async getCoachConfig(): Promise<{
    vam: {
      minTrustThreshold: number;
      maxRetries: number;
      enableCanonicalFirst: boolean;
      enableRetrieval: boolean;
      enableVerification: boolean;
      enablePostprocessing: boolean;
      cacheVerifiedOnly: boolean;
      suggestionsCount: number;
    };
    supportedSubjects: string[];
    supportedVariants: string[];
  }> {
    return api.get('coach/config').json();
  }

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    services: Record<string, string>;
  }> {
    return api.get('health').json();
  }
}

// Export a default instance
export const apiClient = new ApiClient();

// Export individual functions for convenience
export const {
  askCoach,
  searchKnowledgeBase,
  getDocument,
  getUserProfile,
  createCheckoutSession,
  getPricingPlans,
  getCoachConfig,
  healthCheck,
} = apiClient;
