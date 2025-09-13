// Core LLM functionality
export { llmClient, llmUtils, LLMClient, LLMError } from './llm';
export type { CompletionOptions, CompletionResult } from './llm';

// Retrieval system
export { hybridRetrieval, HybridRetrieval } from './retrieval';
export type { SearchResult, HybridSearchOptions } from './retrieval';

// Query expansion
export {
  expandQuery,
  createSearchTerms,
  boostTermsByVariant,
  extractMathExpressions,
  normalizeMathNotation,
  CALC_TERMS,
  VARIANT_TERMS,
} from './retrieval/query';

// Canonical solutions
export { canonicalManager, CanonicalManager } from './canonical';
export type { CanonicalResult, CanonicalSearchOptions, FormattedStep } from './canonical';

// Postprocessing and rubrics
export { rubricEnforcer, RubricEnforcer, loadRubricConfig } from './postprocess';
export type { PostprocessResult, RubricViolation } from './postprocess';

// Verification system
export { verifierClient, VerifierClient } from './verify';
export type {
  VerifierResponse,
  VerifierCheckResult,
  VerificationOptions,
  TrustScore,
} from './verify';

// VAM Coach
export { vamCoach, VAMCoach, coach } from './coach';
export type {
  CoachResponse,
  CoachContext,
  VAMConfig,
  CoachRequest,
  CoachResponseSimple,
} from './coach';
