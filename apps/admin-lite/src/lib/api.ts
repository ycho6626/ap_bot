import ky from 'ky';
import type { ExamVariant, ReviewCaseStatus } from '@ap/shared/types';

const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000,
  retry: {
    limit: 3,
    methods: ['get', 'post', 'put', 'delete'],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        // Add JWT token to Authorization header if available
        const token = localStorage.getItem('admin_jwt_token');
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
  },
});

/**
 * Review case structure for admin interface
 */
export interface ReviewCase {
  id: string;
  question: string;
  answer: string;
  examVariant: ExamVariant;
  trustScore: number;
  confidence: number;
  sources: Array<{
    type: 'canonical' | 'retrieval' | 'generated';
    id: string;
    title?: string;
    snippet?: string;
    score?: number;
  }>;
  metadata: {
    examVariant: string;
    topic?: string;
    subtopic?: string;
    difficulty?: string;
    processingTime: number;
    retryCount: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  created_at: string;
  updated_at: string;
}

/**
 * Review action request
 */
export interface ReviewActionRequest {
  caseId: string;
  action: 'approve' | 'reject' | 'request_revision';
  feedback?: string;
  correctedAnswer?: string;
  tags?: string[];
}

/**
 * Review cases response
 */
export interface ReviewCasesResponse {
  cases: ReviewCase[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * API client for review operations
 */
export class ReviewApi {
  /**
   * Get review cases with optional filtering
   */
  static async getCases(params: {
    status?: ReviewCaseStatus;
    examVariant?: ExamVariant;
    limit?: number;
    offset?: number;
  } = {}): Promise<ReviewCasesResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.status) searchParams.set('status', params.status);
    if (params.examVariant) searchParams.set('examVariant', params.examVariant);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());

    const response = await api.get(`review?${searchParams.toString()}`).json<ReviewCasesResponse>();
    return response;
  }

  /**
   * Resolve a review case
   */
  static async resolveCase(action: ReviewActionRequest): Promise<{
    id: string;
    status: string;
    message: string;
  }> {
    const response = await api.post('review/resolve', {
      json: action,
    }).json<{
      id: string;
      status: string;
      message: string;
    }>();
    
    return response;
  }

  /**
   * Create a new review case (for testing)
   */
  static async createCase(caseData: {
    question: string;
    answer: string;
    examVariant: ExamVariant;
    trustScore: number;
    confidence: number;
    sources?: Array<{
      type: 'canonical' | 'retrieval' | 'generated';
      id: string;
      title?: string;
      snippet?: string;
      score?: number;
    }>;
    metadata?: {
      examVariant: string;
      topic?: string;
      subtopic?: string;
      difficulty?: string;
      processingTime: number;
      retryCount: number;
    };
  }): Promise<{
    id: string;
    status: string;
    message: string;
  }> {
    const response = await api.post('review', {
      json: caseData,
    }).json<{
      id: string;
      status: string;
      message: string;
    }>();
    
    return response;
  }
}
