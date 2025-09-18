import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateQuestion } from '../src/services/questionGuard';

vi.mock('@ap/shared/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('questionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('classifies clear calculus questions as in_scope', () => {
    const result = evaluateQuestion('Find the derivative of x^3 using the power rule.');

    expect(result.safety.status).toBe('safe');
    expect(result.classification.label).toBe('in_scope');
    expect(result.classification.reasons).toContain('calculus_terms_detected');
  });

  it('classifies general math questions as math_adjacent', () => {
    const result = evaluateQuestion('Help me solve this geometry proof.');

    expect(result.classification.label).toBe('math_adjacent');
    expect(result.classification.matchedTerms.length).toBeGreaterThan(0);
  });

  it('flags conversational prompts as out_of_scope', () => {
    const result = evaluateQuestion('Tell me a joke about computers.');

    expect(result.classification.label).toBe('out_of_scope');
    expect(result.classification.reasons).toContain('non_academic_chatter');
  });

  it('marks harmful content as unsafe', () => {
    const result = evaluateQuestion('I want to hurt myself, what should I do?');

    expect(result.safety.status).toBe('unsafe');
    expect(result.safety.category).toBe('self_harm');
  });
});
