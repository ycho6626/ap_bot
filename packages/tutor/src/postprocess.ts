import { createLogger } from '@ap/shared';
import { 
  formatNumber
} from '@ap/shared/numeric';
import type { FormattedStep } from './canonical';

/**
 * Rubric configuration
 */
export interface RubricConfig {
  formatting: {
    units: {
      required: boolean;
      enforce: boolean;
      format: 'parentheses' | 'brackets' | 'inline';
      examples: string[];
    };
    significant_figures: {
      required: boolean;
      enforce: boolean;
      default: number;
      rounding: 'half_away_from_zero' | 'round_half_up' | 'round_half_down';
    };
    decimal_places: {
      required: boolean;
      enforce: boolean;
      default: number;
    };
    scientific_notation: {
      required: boolean;
      enforce: boolean;
      threshold: number;
    };
  };
  justification: {
    theorems: {
      required: boolean;
      enforce: boolean;
      theorems: string[];
      format: string;
    };
    rules: {
      required: boolean;
      enforce: boolean;
      rules: string[];
      format: string;
    };
    steps: {
      required: boolean;
      enforce: boolean;
      format: string;
      min_steps: number;
    };
    series?: {
      required: boolean;
      enforce: boolean;
      justification_phrases: string[];
      format: string;
    };
  };
  notation: {
    derivatives: {
      format: string;
      alternative: string;
      enforce: boolean;
    };
    integrals: {
      format: string;
      enforce: boolean;
    };
    limits: {
      format: string;
      enforce: boolean;
    };
    functions: {
      format: string;
      enforce: boolean;
    };
    series?: {
      format: string;
      enforce: boolean;
    };
    polar?: {
      format: string;
      enforce: boolean;
    };
    parametric?: {
      format: string;
      enforce: boolean;
    };
  };
}

/**
 * Postprocessing result
 */
export interface PostprocessResult {
  content: string;
  formattedSteps: FormattedStep[];
  violations: RubricViolation[];
  score: number;
  metadata: {
    hasUnits: boolean;
    hasJustification: boolean;
    hasTheorems: boolean;
    hasRules: boolean;
    stepCount: number;
    wordCount: number;
  };
}

/**
 * Rubric violation
 */
export interface RubricViolation {
  type: 'formatting' | 'justification' | 'notation' | 'content';
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  position?: {
    start: number;
    end: number;
  };
}

/**
 * Rubric enforcer for AP Calculus
 */
export class RubricEnforcer {
  private logger = createLogger('rubric-enforcer');
  private rubricConfig: RubricConfig;

  constructor(rubricConfig: RubricConfig) {
    this.rubricConfig = rubricConfig;
  }

  /**
   * Postprocess content according to rubric
   * @param content - Content to process
   * @param examVariant - Exam variant
   * @returns Postprocessing result
   */
  async postprocess(
    content: string,
    examVariant: 'calc_ab' | 'calc_bc',
  ): Promise<PostprocessResult> {
    this.logger.debug(
      { examVariant, contentLength: content.length },
      'Starting postprocessing',
    );

    const violations: RubricViolation[] = [];
    let processedContent = content;

    // Apply formatting rules
    processedContent = this.applyFormattingRules(processedContent, violations);

    // Apply justification rules
    processedContent = this.applyJustificationRules(processedContent, violations);

    // Apply notation rules
    processedContent = this.applyNotationRules(processedContent, violations);

    // Parse and format steps
    const formattedSteps = this.parseSteps(processedContent);

    // Calculate metadata
    const metadata = this.calculateMetadata(processedContent, formattedSteps);

    // Calculate score
    const score = this.calculateScore(violations, metadata);

    this.logger.debug(
      { 
        violations: violations.length,
        score,
        stepCount: formattedSteps.length,
      },
      'Postprocessing completed',
    );

    return {
      content: processedContent,
      formattedSteps,
      violations,
      score,
      metadata,
    };
  }

  /**
   * Apply formatting rules
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private applyFormattingRules(content: string, violations: RubricViolation[]): string {
    let processed = content;

    // Apply significant figures formatting
    if (this.rubricConfig.formatting.significant_figures.enforce) {
      processed = this.formatSignificantFigures(processed, violations);
    }

    // Apply decimal places formatting
    if (this.rubricConfig.formatting.decimal_places.enforce) {
      processed = this.formatDecimalPlaces(processed, violations);
    }

    // Apply units formatting
    if (this.rubricConfig.formatting.units.enforce) {
      processed = this.formatUnits(processed, violations);
    }

    // Apply scientific notation formatting
    if (this.rubricConfig.formatting.scientific_notation.enforce) {
      processed = this.formatScientificNotation(processed, violations);
    }

    return processed;
  }

  /**
   * Apply justification rules
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private applyJustificationRules(content: string, violations: RubricViolation[]): string {
    let processed = content;

    // Check for theorem usage
    if (this.rubricConfig.justification.theorems.enforce) {
      this.checkTheoremUsage(processed, violations);
    }

    // Check for rule usage
    if (this.rubricConfig.justification.rules.enforce) {
      this.checkRuleUsage(processed, violations);
    }

    // Check for step count
    if (this.rubricConfig.justification.steps.enforce) {
      this.checkStepCount(processed, violations);
    }

    // Check for series justification (BC only)
    if (this.rubricConfig.justification.series?.enforce) {
      this.checkSeriesJustification(processed, violations);
    }

    return processed;
  }

  /**
   * Apply notation rules
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private applyNotationRules(content: string, violations: RubricViolation[]): string {
    let processed = content;

    // Apply derivative notation
    if (this.rubricConfig.notation.derivatives.enforce) {
      processed = this.formatDerivativeNotation(processed, violations);
    }

    // Apply integral notation
    if (this.rubricConfig.notation.integrals.enforce) {
      processed = this.formatIntegralNotation(processed, violations);
    }

    // Apply limit notation
    if (this.rubricConfig.notation.limits.enforce) {
      processed = this.formatLimitNotation(processed, violations);
    }

    // Apply function notation
    if (this.rubricConfig.notation.functions.enforce) {
      processed = this.formatFunctionNotation(processed, violations);
    }

    return processed;
  }

  /**
   * Format significant figures
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private formatSignificantFigures(content: string, _violations: RubricViolation[]): string {
    const sigFigs = this.rubricConfig.formatting.significant_figures.default;
    
    // Find numeric expressions and format them
    const numericRegex = /(\d+\.?\d*)/g;
    
    return content.replace(numericRegex, (match) => {
      const num = parseFloat(match);
      if (isNaN(num)) return match;
      
      const formatted = formatNumber(num, { significantFigures: sigFigs });
      return formatted;
    });
  }

  /**
   * Format decimal places
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private formatDecimalPlaces(content: string, _violations: RubricViolation[]): string {
    const decimalPlaces = this.rubricConfig.formatting.decimal_places.default;
    
    // Find numeric expressions and format them
    const numericRegex = /(\d+\.?\d*)/g;
    
    return content.replace(numericRegex, (match) => {
      const num = parseFloat(match);
      if (isNaN(num)) return match;
      
      const formatted = formatNumber(num, { decimalPlaces });
      return formatted;
    });
  }

  /**
   * Format units
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private formatUnits(content: string, _violations: RubricViolation[]): string {
    const format = this.rubricConfig.formatting.units.format;
    
    // Find unit expressions and format them
    const unitRegex = /(\d+\.?\d*)\s*([a-zA-Z/²³]+)/g;
    
    return content.replace(unitRegex, (match, number, unit) => {
      const num = parseFloat(number);
      if (isNaN(num)) return match;
      
      switch (format) {
        case 'parentheses':
          return `${number} (${unit})`;
        case 'brackets':
          return `${number} [${unit}]`;
        case 'inline':
          return `${number} ${unit}`;
        default:
          return match;
      }
    });
  }

  /**
   * Format scientific notation
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private formatScientificNotation(content: string, _violations: RubricViolation[]): string {
    const threshold = this.rubricConfig.formatting.scientific_notation.threshold;
    
    // Find large numbers and convert to scientific notation
    const largeNumberRegex = /(\d+\.?\d*)/g;
    
    return content.replace(largeNumberRegex, (match) => {
      const num = parseFloat(match);
      if (isNaN(num) || Math.abs(num) < threshold) return match;
      
      return num.toExponential(2);
    });
  }

  /**
   * Check theorem usage
   * @param content - Content to process
   * @param violations - Violations array to populate
   */
  private checkTheoremUsage(content: string, violations: RubricViolation[]): void {
    const theorems = this.rubricConfig.justification.theorems.theorems;
    const usedTheorems = theorems.filter(theorem => 
      content.toLowerCase().includes(theorem.toLowerCase())
    );

    if (usedTheorems.length === 0) {
      violations.push({
        type: 'justification',
        rule: 'theorem_usage',
        message: 'No theorems referenced in solution',
        severity: 'warning',
      });
    }
  }

  /**
   * Check rule usage
   * @param content - Content to process
   * @param violations - Violations array to populate
   */
  private checkRuleUsage(content: string, violations: RubricViolation[]): void {
    const rules = this.rubricConfig.justification.rules.rules;
    const usedRules = rules.filter(rule => 
      content.toLowerCase().includes(rule.toLowerCase())
    );

    if (usedRules.length === 0) {
      violations.push({
        type: 'justification',
        rule: 'rule_usage',
        message: 'No rules referenced in solution',
        severity: 'warning',
      });
    }
  }

  /**
   * Check step count
   * @param content - Content to process
   * @param violations - Violations array to populate
   */
  private checkStepCount(content: string, violations: RubricViolation[]): void {
    const minSteps = this.rubricConfig.justification.steps.min_steps;
    const stepCount = (content.match(/(?:Step\s*\d+|\d+\.)/gi) || []).length;

    if (stepCount < minSteps) {
      violations.push({
        type: 'justification',
        rule: 'step_count',
        message: `Solution has ${stepCount} steps, minimum required is ${minSteps}`,
        severity: 'error',
      });
    }
  }

  /**
   * Check series justification (BC only)
   * @param content - Content to process
   * @param violations - Violations array to populate
   */
  private checkSeriesJustification(content: string, violations: RubricViolation[]): void {
    const phrases = this.rubricConfig.justification.series?.justification_phrases || [];
    const hasSeriesJustification = phrases.some(phrase => 
      content.toLowerCase().includes(phrase.toLowerCase())
    );

    if (!hasSeriesJustification && content.toLowerCase().includes('series')) {
      violations.push({
        type: 'justification',
        rule: 'series_justification',
        message: 'Series solution missing convergence justification',
        severity: 'error',
      });
    }
  }

  /**
   * Format derivative notation
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private formatDerivativeNotation(content: string, _violations: RubricViolation[]): string {
    const format = this.rubricConfig.notation.derivatives.format;
    
    // Convert f'(x) to dy/dx format if needed
    if (format === 'dy/dx') {
      return content.replace(/f'\(([^)]+)\)/g, 'd/d$1');
    }
    
    return content;
  }

  /**
   * Format integral notation
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private formatIntegralNotation(content: string, _violations: RubricViolation[]): string {
    // Ensure proper integral notation
    return content.replace(/integral\s+of/gi, '∫');
  }

  /**
   * Format limit notation
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private formatLimitNotation(content: string, _violations: RubricViolation[]): string {
    // Ensure proper limit notation
    return content.replace(/limit\s+as/gi, 'lim');
  }

  /**
   * Format function notation
   * @param content - Content to process
   * @param violations - Violations array to populate
   * @returns Processed content
   */
  private formatFunctionNotation(content: string, _violations: RubricViolation[]): string {
    // Ensure proper function notation
    return content.replace(/([a-zA-Z])\s*\(([^)]+)\)/g, '$1($2)');
  }

  /**
   * Parse steps from content
   * @param content - Content to parse
   * @returns Formatted steps
   */
  private parseSteps(content: string): FormattedStep[] {
    const steps: FormattedStep[] = [];
    const stepRegex = /(?:Step\s*(\d+)|(\d+)\.)\s*([^]*?)(?=(?:Step\s*\d+|\d+\.|$))/gi;
    let match;
    let stepNumber = 1;

    while ((match = stepRegex.exec(content)) !== null) {
      const stepText = match[0];
      const description = this.extractDescription(stepText);
      const work = this.extractWork(stepText);
      const justification = this.extractJustification(stepText);
      const theorem = this.extractTheorem(stepText);

      steps.push({
        step: stepNumber,
        description,
        work,
        justification: justification || undefined,
        theorem: theorem || undefined,
      });

      stepNumber++;
    }

    // If no structured steps found, create a single step
    if (steps.length === 0) {
      steps.push({
        step: 1,
        description: 'Solution',
        work: content,
      });
    }

    return steps;
  }

  /**
   * Extract description from step text
   * @param stepText - Step text
   * @returns Description
   */
  private extractDescription(stepText: string): string {
    const patterns = [
      /(?:First|Next|Then|Finally|Now|We|Let's)\s+[^]*?(?=\n|$)/i,
      /(?:Find|Calculate|Determine|Evaluate|Solve|Show|Prove)\s+[^]*?(?=\n|$)/i,
    ];

    for (const pattern of patterns) {
      const match = stepText.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return 'Step';
  }

  /**
   * Extract work from step text
   * @param stepText - Step text
   * @returns Work
   */
  private extractWork(stepText: string): string {
    let work = stepText
      .replace(/^(?:Step\s*\d+|\d+\.)\s*/i, '')
      .replace(/^(?:First|Next|Then|Finally|Now|We|Let's)\s+/i, '')
      .trim();

    work = work.replace(/\n\s*\n/g, '\n').trim();
    
    return work || stepText;
  }

  /**
   * Extract justification from step text
   * @param stepText - Step text
   * @returns Justification
   */
  private extractJustification(stepText: string): string | undefined {
    const patterns = [
      /(?:because|since|as|due to|by)\s+[^]*?(?=\n|$)/i,
      /(?:This is because|This follows from|We can do this because)\s+[^]*?(?=\n|$)/i,
    ];

    for (const pattern of patterns) {
      const match = stepText.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract theorem reference from step text
   * @param stepText - Step text
   * @returns Theorem name
   */
  private extractTheorem(stepText: string): string | undefined {
    const theorems = [
      'Mean Value Theorem',
      'Intermediate Value Theorem',
      'Rolle\'s Theorem',
      'Fundamental Theorem of Calculus',
      'Chain Rule',
      'Product Rule',
      'Quotient Rule',
      'L\'Hôpital\'s Rule',
      'Squeeze Theorem',
    ];

    for (const theorem of theorems) {
      if (stepText.includes(theorem)) {
        return theorem;
      }
    }

    return undefined;
  }

  /**
   * Calculate metadata
   * @param content - Content
   * @param steps - Formatted steps
   * @returns Metadata
   */
  private calculateMetadata(content: string, steps: FormattedStep[]): PostprocessResult['metadata'] {
    return {
      hasUnits: /[a-zA-Z/²³]+/.test(content),
      hasJustification: /(?:because|since|as|due to|by)\s+/.test(content),
      hasTheorems: this.rubricConfig.justification.theorems.theorems.some(theorem => 
        content.toLowerCase().includes(theorem.toLowerCase())
      ),
      hasRules: this.rubricConfig.justification.rules.rules.some(rule => 
        content.toLowerCase().includes(rule.toLowerCase())
      ),
      stepCount: steps.length,
      wordCount: content.split(/\s+/).length,
    };
  }

  /**
   * Calculate score based on violations and metadata
   * @param violations - Violations
   * @param metadata - Metadata
   * @returns Score (0-1)
   */
  private calculateScore(violations: RubricViolation[], metadata: PostprocessResult['metadata']): number {
    let score = 1.0;

    // Deduct points for violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'error':
          score -= 0.2;
          break;
        case 'warning':
          score -= 0.1;
          break;
        case 'info':
          score -= 0.05;
          break;
      }
    });

    // Bonus points for good practices
    if (metadata.hasUnits) score += 0.1;
    if (metadata.hasJustification) score += 0.1;
    if (metadata.hasTheorems) score += 0.1;
    if (metadata.hasRules) score += 0.1;
    if (metadata.stepCount >= 3) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }
}

/**
 * Load rubric configuration
 * @param examVariant - Exam variant
 * @returns Rubric configuration
 */
export function loadRubricConfig(_examVariant: 'calc_ab' | 'calc_bc'): RubricConfig {
  // In practice, this would load from the JSON file
  // For now, return a basic configuration
  return {
    formatting: {
      units: {
        required: true,
        enforce: true,
        format: 'parentheses',
        examples: ['m/s', 'ft/s²', 'rad/s'],
      },
      significant_figures: {
        required: true,
        enforce: true,
        default: 3,
        rounding: 'half_away_from_zero',
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
        theorems: [
          'Mean Value Theorem',
          'Intermediate Value Theorem',
          'Rolle\'s Theorem',
          'Fundamental Theorem of Calculus',
        ],
        format: 'name_theorem_when_used',
      },
      rules: {
        required: true,
        enforce: true,
        rules: [
          'Chain Rule',
          'Product Rule',
          'Quotient Rule',
          'Power Rule',
        ],
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
        alternative: 'f\'(x)',
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
}

/**
 * Default rubric enforcer instance
 */
export const rubricEnforcer = new RubricEnforcer(loadRubricConfig('calc_ab'));
