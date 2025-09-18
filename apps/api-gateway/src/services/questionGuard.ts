import { createLogger } from '@ap/shared/logger';

export type ClassificationLabel = 'in_scope' | 'math_adjacent' | 'out_of_scope';

export interface ClassificationResult {
  label: ClassificationLabel;
  score: number;
  matchedTerms: string[];
  reasons: string[];
}

export interface SafetyResult {
  status: 'safe' | 'unsafe';
  category?: 'self_harm' | 'violence' | 'sexual_content' | 'hate' | 'unknown';
  matches: string[];
}

export interface GuardrailEvaluation {
  classification: ClassificationResult;
  safety: SafetyResult;
}

const logger = createLogger('question-guard');

const CALCULUS_KEYWORDS = [
  'derivative',
  'd/dx',
  'integral',
  '∫',
  'limit',
  'as x approaches',
  'slope field',
  'related rates',
  'implicit differentiation',
  'u-substitution',
  'integration by parts',
  'fundamental theorem of calculus',
  'mvt',
  'ivt',
  "rolle's theorem",
  'power series',
  'taylor series',
  'maclaurin series',
  'radius of convergence',
  'parametric',
  'polar',
  'arc length',
  'partial fractions',
  'differential equation',
  'instantaneous rate',
  'concavity',
  'inflection',
  "l'hopital",
  'riemann sum',
];

const MATH_KEYWORDS = [
  'algebra',
  'geometry',
  'trigonometry',
  'statistics',
  'probability',
  'matrix',
  'vector',
  'physics',
  'chemistry',
  'biology',
  'science',
  'solve for',
  'equation',
  'fraction',
  'percentage',
  'word problem',
  'math',
];

const UNSAFE_PATTERNS: Array<{ pattern: RegExp; category: SafetyResult['category'] }> = [
  { pattern: /(kill|hurt)\s+(myself|my self|themselves|himself|herself)/i, category: 'self_harm' },
  { pattern: /(suicide|self-harm|self harm)/i, category: 'self_harm' },
  { pattern: /(bomb|weapon|attack).*(build|make|create)/i, category: 'violence' },
  { pattern: /(sexual|porn|explicit)/i, category: 'sexual_content' },
  { pattern: /(hate|racist|bigot|genocide)/i, category: 'hate' },
];

const NON_ACADEMIC_PATTERNS = [
  /(what|who) are you/i,
  /tell me a joke/i,
  /how are you/i,
  /favorite movie/i,
  /weather today/i,
  /write a poem/i,
  /have a conversation/i,
];

const CALCULUS_SYMBOLS = [/d\s*\/\s*dx/i, /∫/, /lim\s*_{?/i];
const MIN_CALCULUS_SCORE = 0.6;
const MIN_MATH_SCORE = 0.3;

function escapeRegex(keyword: string): string {
  return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectKeywordMatches(question: string, keywords: string[]): string[] {
  const matches = new Set<string>();
  const normalized = question.toLowerCase();

  for (const keyword of keywords) {
    const pattern = new RegExp(`\\b${escapeRegex(keyword.toLowerCase())}\\b`, 'i');
    if (pattern.test(normalized)) {
      matches.add(keyword);
    }
  }

  return Array.from(matches);
}

function hasSymbolMatch(question: string): boolean {
  return CALCULUS_SYMBOLS.some(regex => regex.test(question));
}

function containsPattern(question: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(question));
}

export function evaluateQuestion(question: string): GuardrailEvaluation {
  const trimmed = question.trim();

  for (const { pattern, category } of UNSAFE_PATTERNS) {
    if (pattern.test(trimmed)) {
      const resolvedCategory = category ?? 'unknown';
      logger.warn(
        { category: resolvedCategory, questionSnippet: trimmed.slice(0, 80) },
        'Unsafe content detected'
      );
      return {
        safety: {
          status: 'unsafe',
          category: resolvedCategory,
          matches: [pattern.source],
        },
        classification: {
          label: 'out_of_scope',
          matchedTerms: [],
          score: 0,
          reasons: ['unsafe_content_detected'],
        },
      };
    }
  }

  if (!trimmed) {
    return {
      safety: { status: 'safe', matches: [] },
      classification: {
        label: 'out_of_scope',
        matchedTerms: [],
        score: 0,
        reasons: ['empty_question'],
      },
    };
  }

  const calculusMatches = collectKeywordMatches(trimmed, CALCULUS_KEYWORDS);
  let calculusScore = calculusMatches.length / CALCULUS_KEYWORDS.length;

  if (hasSymbolMatch(trimmed)) {
    calculusScore = Math.max(calculusScore, 0.75);
  }

  const mathMatches = collectKeywordMatches(trimmed, MATH_KEYWORDS);
  const mathScore = Math.max(mathMatches.length / MATH_KEYWORDS.length, 0.2 * mathMatches.length);

  const reasons: string[] = [];
  let label: ClassificationLabel = 'out_of_scope';
  let score = 0.05;

  const hasCalculusIndicator = calculusMatches.length > 0 || hasSymbolMatch(trimmed);
  if (calculusScore >= MIN_CALCULUS_SCORE || hasCalculusIndicator) {
    label = 'in_scope';
    score = Math.max(
      calculusScore,
      hasSymbolMatch(trimmed) ? 0.85 : 0.7 + 0.05 * calculusMatches.length
    );
    reasons.push('calculus_terms_detected');
  } else if (mathScore >= MIN_MATH_SCORE || mathMatches.length >= 1) {
    label = 'math_adjacent';
    score = Math.min(0.6, mathScore + 0.25);
    reasons.push('general_math_terms_detected');
  } else if (containsPattern(trimmed, NON_ACADEMIC_PATTERNS)) {
    label = 'out_of_scope';
    score = 0.1;
    reasons.push('non_academic_chatter');
  } else if (/[0-9]/.test(trimmed) && /(solve|calculate|find)/i.test(trimmed)) {
    label = 'math_adjacent';
    score = 0.4;
    reasons.push('math_verb_detected_without_calculus_terms');
  } else {
    reasons.push('no_relevant_terms');
  }

  return {
    safety: { status: 'safe', matches: [] },
    classification: {
      label,
      matchedTerms: [...new Set([...calculusMatches, ...mathMatches])],
      score,
      reasons,
    },
  };
}
