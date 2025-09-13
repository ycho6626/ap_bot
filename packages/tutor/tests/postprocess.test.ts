import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RubricEnforcer, loadRubricConfig } from '../src/postprocess';

// Mock @ap/shared
vi.mock('@ap/shared', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  formatNumber: vi.fn((num, options) => {
    if (options?.sigFigs) {
      return num.toPrecision(options.sigFigs);
    }
    if (options?.decimalPlaces !== undefined) {
      return num.toFixed(options.decimalPlaces);
    }
    return num.toString();
  }),
  attachUnit: vi.fn((num, unit) => `${num} ${unit}`),
  roundToSigFigs: vi.fn((num, sigFigs) => parseFloat(num.toPrecision(sigFigs))),
  roundToDecimals: vi.fn((num, decimals) => parseFloat(num.toFixed(decimals))),
  approximatelyEqual: vi.fn(() => true),
  isZero: vi.fn(() => false),
  isPositive: vi.fn(() => true),
  isNegative: vi.fn(() => false),
}));

describe('RubricEnforcer', () => {
  let enforcer: RubricEnforcer;
  const mockConfig = {
    formatting: {
      units: {
        required: true,
        enforce: true,
        format: 'parentheses' as const,
        examples: ['m/s', 'ft/s²'],
      },
      significant_figures: {
        required: true,
        enforce: true,
        default: 3,
        rounding: 'half_away_from_zero' as const,
      },
      decimal_places: {
        required: false,
        enforce: false,
        default: 2,
      },
      scientific_notation: {
        required: false,
        enforce: false,
        threshold: 1000,
      },
    },
    justification: {
      theorems: {
        required: true,
        enforce: true,
        theorems: ['Mean Value Theorem', 'Chain Rule'],
        format: 'name_theorem_when_used',
      },
      rules: {
        required: true,
        enforce: true,
        rules: ['Power Rule', 'Product Rule'],
        format: 'state_rule_when_applied',
      },
      steps: {
        required: true,
        enforce: true,
        format: 'show_all_work',
        min_steps: 2,
      },
    },
    notation: {
      derivatives: {
        format: 'dy/dx',
        alternative: "f'(x)",
        enforce: true,
      },
      integrals: {
        format: '∫',
        enforce: true,
      },
      limits: {
        format: 'lim',
        enforce: true,
      },
      functions: {
        format: 'f(x)',
        enforce: true,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    enforcer = new RubricEnforcer(mockConfig);
  });

  describe('postprocess', () => {
    it('should postprocess content according to rubric', async () => {
      const content =
        'Step 1: Find the derivative of x^2\nStep 2: Apply the power rule\nStep 3: Simplify to get 2x';
      const result = await enforcer.postprocess(content, 'calc_ab');

      expect(result.content).toBeDefined();
      expect(result.formattedSteps).toHaveLength(3);
      expect(result.violations).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.metadata.stepCount).toBe(3);
    });

    it('should detect violations', async () => {
      const content = 'The answer is 2x'; // No steps, no theorems, no rules
      const result = await enforcer.postprocess(content, 'calc_ab');

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(1);
    });

    it('should format steps correctly', async () => {
      const content = 'Step 1: Find the derivative\nApply the power rule\nStep 2: Simplify\nget 2x';
      const result = await enforcer.postprocess(content, 'calc_ab');

      expect(result.formattedSteps).toHaveLength(2);
      expect(result.formattedSteps[0].step).toBe(1);
      expect(result.formattedSteps[0].description).toContain('Find the derivative');
      expect(result.formattedSteps[1].step).toBe(2);
      expect(result.formattedSteps[1].description).toContain('Simplify');
    });
  });

  describe('formatSignificantFigures', () => {
    it('should format numbers with significant figures', () => {
      const content = 'The answer is 3.14159';
      const result = (enforcer as any).formatSignificantFigures(content, []);

      expect(result).toContain('3.14'); // Should be formatted to 3 sig figs
    });
  });

  describe('formatUnits', () => {
    it('should format units in parentheses', () => {
      const content = 'The velocity is 5 m/s';
      const result = (enforcer as any).formatUnits(content, []);

      expect(result).toContain('5 (m/s)');
    });
  });

  describe('checkTheoremUsage', () => {
    it('should detect missing theorems', () => {
      const content = 'The solution is correct';
      const violations: any[] = [];

      (enforcer as any).checkTheoremUsage(content, violations);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('justification');
      expect(violations[0].rule).toBe('theorem_usage');
    });

    it('should not flag when theorems are present', () => {
      const content = 'Using the Mean Value Theorem, we can find the derivative';
      const violations: any[] = [];

      (enforcer as any).checkTheoremUsage(content, violations);

      expect(violations.length).toBe(0);
    });
  });

  describe('checkRuleUsage', () => {
    it('should detect missing rules', () => {
      const content = 'The solution is correct';
      const violations: any[] = [];

      (enforcer as any).checkRuleUsage(content, violations);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('justification');
      expect(violations[0].rule).toBe('rule_usage');
    });

    it('should not flag when rules are present', () => {
      const content = 'Using the Power Rule, we get 2x';
      const violations: any[] = [];

      (enforcer as any).checkRuleUsage(content, violations);

      expect(violations.length).toBe(0);
    });
  });

  describe('checkStepCount', () => {
    it('should flag insufficient steps', () => {
      const content = 'The answer is 2x';
      const violations: any[] = [];

      (enforcer as any).checkStepCount(content, violations);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('justification');
      expect(violations[0].rule).toBe('step_count');
    });

    it('should not flag sufficient steps', () => {
      const content = 'Step 1: Find the derivative\nStep 2: Apply the rule\nStep 3: Simplify';
      const violations: any[] = [];

      (enforcer as any).checkStepCount(content, violations);

      expect(violations.length).toBe(0);
    });
  });

  describe('formatDerivativeNotation', () => {
    it("should convert f'(x) to dy/dx format", () => {
      const content = "f'(x) = 2x";
      const result = (enforcer as any).formatDerivativeNotation(content, []);

      expect(result).toContain('d/dx');
    });
  });

  describe('formatIntegralNotation', () => {
    it('should convert integral of to ∫', () => {
      const content = 'integral of x dx';
      const result = (enforcer as any).formatIntegralNotation(content, []);

      expect(result).toContain('∫');
    });
  });

  describe('formatLimitNotation', () => {
    it('should convert limit as to lim', () => {
      const content = 'limit as x approaches 0';
      const result = (enforcer as any).formatLimitNotation(content, []);

      expect(result).toContain('lim');
    });
  });

  describe('parseSteps', () => {
    it('should parse structured steps', () => {
      const content = 'Step 1: Find the derivative\nApply the power rule\nStep 2: Simplify\nget 2x';
      const steps = (enforcer as any).parseSteps(content);

      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe(1);
      expect(steps[0].work).toContain('Apply the power rule');
      expect(steps[1].step).toBe(2);
      expect(steps[1].work).toContain('get 2x');
    });

    it('should handle unstructured content', () => {
      const content = 'This is just a regular solution';
      const steps = (enforcer as any).parseSteps(content);

      expect(steps).toHaveLength(1);
      expect(steps[0].step).toBe(1);
      expect(steps[0].description).toBe('Solution');
      expect(steps[0].work).toBe('This is just a regular solution');
    });
  });

  describe('extractDescription', () => {
    it('should extract description from step text', () => {
      const stepText = 'Step 1: Find the derivative of x^2';
      const description = (enforcer as any).extractDescription(stepText);

      expect(description).toContain('Find the derivative');
    });

    it('should handle different description patterns', () => {
      const stepText = 'First, we need to apply the power rule';
      const description = (enforcer as any).extractDescription(stepText);

      expect(description).toContain('First, we need to apply the power rule');
    });
  });

  describe('extractWork', () => {
    it('should extract work from step text', () => {
      const stepText = 'Step 1: Find the derivative\nApply the power rule\nd/dx(x^2) = 2x';
      const work = (enforcer as any).extractWork(stepText);

      expect(work).toContain('Apply the power rule');
      expect(work).toContain('d/dx(x^2) = 2x');
    });
  });

  describe('extractJustification', () => {
    it('should extract justification from step text', () => {
      const stepText = 'Apply the power rule because it is a polynomial function';
      const justification = (enforcer as any).extractJustification(stepText);

      expect(justification).toContain('because it is a polynomial function');
    });

    it('should return undefined when no justification found', () => {
      const stepText = 'Apply the power rule';
      const justification = (enforcer as any).extractJustification(stepText);

      expect(justification).toBeUndefined();
    });
  });

  describe('extractTheorem', () => {
    it('should extract theorem references', () => {
      const stepText = 'Using the Mean Value Theorem, we can find the derivative';
      const theorem = (enforcer as any).extractTheorem(stepText);

      expect(theorem).toBe('Mean Value Theorem');
    });

    it('should return undefined when no theorem found', () => {
      const stepText = 'Apply the power rule';
      const theorem = (enforcer as any).extractTheorem(stepText);

      expect(theorem).toBeUndefined();
    });
  });

  describe('calculateMetadata', () => {
    it('should calculate metadata correctly', () => {
      const content = "Using the Mean Value Theorem, we get f'(x) = 2x (m/s)";
      const steps = [
        { step: 1, description: 'test', work: 'test' },
        { step: 2, description: 'test', work: 'test' },
      ];

      const metadata = (enforcer as any).calculateMetadata(content, steps);

      expect(metadata.hasUnits).toBe(true);
      expect(metadata.hasJustification).toBe(true);
      expect(metadata.hasTheorems).toBe(true);
      expect(metadata.hasRules).toBe(false);
      expect(metadata.stepCount).toBe(2);
      expect(metadata.wordCount).toBeGreaterThan(0);
    });
  });

  describe('calculateScore', () => {
    it('should calculate score based on violations and metadata', () => {
      const violations = [{ severity: 'error' }, { severity: 'warning' }];
      const metadata = {
        hasUnits: true,
        hasJustification: true,
        hasTheorems: true,
        hasRules: true,
        stepCount: 3,
        wordCount: 100,
      };

      const score = (enforcer as any).calculateScore(violations, metadata);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});

describe('loadRubricConfig', () => {
  it('should load rubric configuration for AB variant', () => {
    const config = loadRubricConfig('calc_ab');

    expect(config.formatting.units.required).toBe(true);
    expect(config.formatting.significant_figures.required).toBe(true);
    expect(config.justification.theorems.required).toBe(true);
    expect(config.notation.derivatives.format).toBe('dy/dx');
  });

  it('should load rubric configuration for BC variant', () => {
    const config = loadRubricConfig('calc_bc');

    expect(config.formatting.units.required).toBe(true);
    expect(config.formatting.significant_figures.required).toBe(true);
    expect(config.justification.theorems.required).toBe(true);
    expect(config.notation.derivatives.format).toBe('dy/dx');
  });
});
