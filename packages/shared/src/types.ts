/**
 * Shared type definitions for the AP Calculus bot
 */

/**
 * User roles in the system
 */
export type UserRole = 'public' | 'calc_paid' | 'teacher' | 'all_paid';

/**
 * Exam variants for AP Calculus
 */
export type ExamVariant = 'calc_ab' | 'calc_bc';

/**
 * Knowledge base document partitions
 */
export type KbPartition = 'public_kb' | 'paraphrased_kb' | 'private_kb';

/**
 * Review case status
 */
export type ReviewCaseStatus = 'new' | 'in_progress' | 'resolved' | 'canonicalized';

/**
 * Analytics event kinds
 */
export type AnalyticsEventKind = 
  | 'vam_answer_verified'
  | 'vam_answer_abstained'
  | 'retrieval_performed'
  | 'canonical_solution_used'
  | 'webhook_received'
  | 'review_case_created'
  | 'review_case_resolved';

/**
 * Knowledge base document structure
 */
export interface KbDocument {
  id: string;
  subject: 'calc';
  exam_variant: ExamVariant | null;
  partition: KbPartition;
  topic: string | null;
  subtopic: string | null;
  year: number | null;
  difficulty: string | null;
  type: string | null;
  bloom_level: string | null;
  refs: Record<string, unknown>;
  content: string;
  latex: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Knowledge base embedding structure
 */
export interface KbEmbedding {
  doc_id: string;
  embedding: number[];
  created_at: string;
}

/**
 * Canonical solution structure
 */
export interface KbCanonicalSolution {
  id: string;
  subject: 'calc';
  exam_variant: ExamVariant | null;
  unit: string;
  skill: string;
  problem_key: string;
  question_template: string;
  steps: Array<{
    step: number;
    description: string;
    work: string;
  }>;
  final_answer: string;
  rubric: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Canonical solution embedding structure
 */
export interface KbCanonicalEmbedding {
  solution_id: string;
  embedding: number[];
  created_at: string;
}

/**
 * Review case structure
 */
export interface ReviewCase {
  id: string;
  user_id: string;
  subject: 'calc';
  exam_variant: ExamVariant | null;
  question: string;
  context: Record<string, unknown>;
  status: ReviewCaseStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Review action structure
 */
export interface ReviewAction {
  id: string;
  case_id: string;
  actor: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  id: string;
  kind: AnalyticsEventKind;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Webhook event structure
 */
export interface WebhookEvent {
  id: string;
  provider: string;
  event_type: string;
  received_at: string;
  signature_ok: boolean;
  http_status: number | null;
  payload: Record<string, unknown>;
  dedupe_key: string;
  created_at: string;
}

/**
 * User role structure
 */
export interface UserRoleRecord {
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Numeric formatting options
 */
export interface NumericFormatOptions {
  significantFigures?: number;
  decimalPlaces?: number;
  unit?: string;
  scientificNotation?: boolean;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: unknown) => string;
}

/**
 * HTTP client options
 */
export interface HttpClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

/**
 * VAM (Verified Answer Mode) result
 */
export interface VamResult {
  verified: boolean;
  trustScore: number;
  answer: string;
  suggestions?: string[];
  citations?: Array<{
    source: string;
    snippet: string;
    score: number;
  }>;
}

/**
 * Retrieval result
 */
export interface RetrievalResult {
  documents: Array<{
    id: string;
    content: string;
    score: number;
    metadata: Record<string, unknown>;
  }>;
  totalCount: number;
  query: string;
}

/**
 * Error types
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}
