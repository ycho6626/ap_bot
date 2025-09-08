import { createLogger } from '@ap/shared';
import { createVerifierClient } from '@ap/shared';
// import { traceHttpOperation } from '@ap/shared';
// import { approximatelyEqual, isZero, isPositive, isNegative } from '@ap/shared/numeric';

/**
 * Verifier check types
 */
export type VerifierCheckType = 
  | 'derivative'
  | 'integral'
  | 'limit'
  | 'algebra'
  | 'units'
  | 'dimensional_analysis';

/**
 * Verifier check result
 */
export interface VerifierCheckResult {
  type: VerifierCheckType;
  passed: boolean;
  confidence: number;
  message: string;
  expected?: string;
  actual?: string;
  details?: Record<string, unknown>;
}

/**
 * Verifier response
 */
export interface VerifierResponse {
  ok: boolean;
  checks: VerifierCheckResult[];
  normalizedAnswer: string;
  overallConfidence: number;
  error?: string;
}

/**
 * Verification options
 */
export interface VerificationOptions {
  checkTypes?: VerifierCheckType[];
  tolerance?: number;
  allowConstants?: boolean;
  strictUnits?: boolean;
  timeout?: number;
}

/**
 * Trust score calculation
 */
export interface TrustScore {
  score: number;
  breakdown: {
    mathematical: number;
    units: number;
    notation: number;
    consistency: number;
  };
  confidence: number;
}

/**
 * Verifier client for AP Calculus
 */
export class VerifierClient {
  private logger = createLogger('verifier-client');
  private client = createVerifierClient();

  /**
   * Verify a mathematical solution
   * @param problem - Problem statement
   * @param solution - Solution to verify
   * @param options - Verification options
   * @returns Verification result
   */
  async verify(
    problem: string,
    solution: string,
    options: VerificationOptions = {},
  ): Promise<VerifierResponse> {
    const {
      checkTypes = ['derivative', 'integral', 'limit', 'algebra', 'units'],
      tolerance = 1e-6,
      allowConstants = true,
      strictUnits = false,
      timeout = 30000,
    } = options;

    this.logger.debug(
      { 
        problemLength: problem.length,
        solutionLength: solution.length,
        checkTypes,
        tolerance,
      },
      'Starting verification',
    );

    try {
      const response = await this.client.post('verify', {
        json: {
          problem,
          solution,
          check_types: checkTypes,
          tolerance,
          allow_constants: allowConstants,
          strict_units: strictUnits,
        },
        timeout,
      }).json<VerifierResponse>();

      this.logger.debug(
        { 
          ok: response.ok,
          checksCount: response.checks.length,
          overallConfidence: response.overallConfidence,
        },
        'Verification completed',
      );

      return response;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Verification failed',
      );

      return {
        ok: false,
        checks: [],
        normalizedAnswer: solution,
        overallConfidence: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify derivative
   * @param func - Function to differentiate
   * @param derivative - Claimed derivative
   * @param variable - Variable of differentiation
   * @returns Verification result
   */
  async verifyDerivative(
    func: string,
    derivative: string,
    variable: string = 'x',
  ): Promise<VerifierCheckResult> {
    try {
      const response = await this.client.post('verify/derivative', {
        json: {
          function: func,
          derivative,
          variable,
        },
      }).json<VerifierCheckResult>();

      return response;
    } catch (error) {
      return {
        type: 'derivative',
        passed: false,
        confidence: 0,
        message: `Derivative verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Verify integral
   * @param func - Function to integrate
   * @param integral - Claimed integral
   * @param variable - Variable of integration
   * @param bounds - Integration bounds (optional)
   * @returns Verification result
   */
  async verifyIntegral(
    func: string,
    integral: string,
    variable: string = 'x',
    bounds?: { lower: number; upper: number },
  ): Promise<VerifierCheckResult> {
    try {
      const response = await this.client.post('verify/integral', {
        json: {
          function: func,
          integral,
          variable,
          bounds,
        },
      }).json<VerifierCheckResult>();

      return response;
    } catch (error) {
      return {
        type: 'integral',
        passed: false,
        confidence: 0,
        message: `Integral verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Verify limit
   * @param expression - Expression to evaluate
   * @param limit - Claimed limit
   * @param variable - Variable approaching the limit
   * @param value - Value the variable approaches
   * @returns Verification result
   */
  async verifyLimit(
    expression: string,
    limit: string,
    variable: string = 'x',
    value: string = '0',
  ): Promise<VerifierCheckResult> {
    try {
      const response = await this.client.post('verify/limit', {
        json: {
          expression,
          limit,
          variable,
          value,
        },
      }).json<VerifierCheckResult>();

      return response;
    } catch (error) {
      return {
        type: 'limit',
        passed: false,
        confidence: 0,
        message: `Limit verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Verify algebraic manipulation
   * @param expression1 - First expression
   * @param expression2 - Second expression
   * @param variable - Variable to check
   * @returns Verification result
   */
  async verifyAlgebra(
    expression1: string,
    expression2: string,
    variable: string = 'x',
  ): Promise<VerifierCheckResult> {
    try {
      const response = await this.client.post('verify/algebra', {
        json: {
          expression1,
          expression2,
          variable,
        },
      }).json<VerifierCheckResult>();

      return response;
    } catch (error) {
      return {
        type: 'algebra',
        passed: false,
        confidence: 0,
        message: `Algebra verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Verify units
   * @param expression - Expression with units
   * @param expectedUnits - Expected units
   * @returns Verification result
   */
  async verifyUnits(
    expression: string,
    expectedUnits: string,
  ): Promise<VerifierCheckResult> {
    try {
      const response = await this.client.post('verify/units', {
        json: {
          expression,
          expected_units: expectedUnits,
        },
      }).json<VerifierCheckResult>();

      return response;
    } catch (error) {
      return {
        type: 'units',
        passed: false,
        confidence: 0,
        message: `Units verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Verify dimensional analysis
   * @param expression - Expression to analyze
   * @param expectedDimensions - Expected dimensions
   * @returns Verification result
   */
  async verifyDimensionalAnalysis(
    expression: string,
    expectedDimensions: string,
  ): Promise<VerifierCheckResult> {
    try {
      const response = await this.client.post('verify/dimensional', {
        json: {
          expression,
          expected_dimensions: expectedDimensions,
        },
      }).json<VerifierCheckResult>();

      return response;
    } catch (error) {
      return {
        type: 'dimensional_analysis',
        passed: false,
        confidence: 0,
        message: `Dimensional analysis verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Calculate trust score
   * @param response - Verifier response
   * @param solution - Original solution
   * @returns Trust score
   */
  calculateTrustScore(response: VerifierResponse, solution: string): TrustScore {
    const checks = response.checks;
    
    // Mathematical correctness
    const mathematicalScore = this.calculateMathematicalScore(checks);
    
    // Units correctness
    const unitsScore = this.calculateUnitsScore(checks);
    
    // Notation correctness
    const notationScore = this.calculateNotationScore(solution);
    
    // Consistency
    const consistencyScore = this.calculateConsistencyScore(checks);

    const breakdown = {
      mathematical: mathematicalScore,
      units: unitsScore,
      notation: notationScore,
      consistency: consistencyScore,
    };

    // Weighted average
    const score = (
      mathematicalScore * 0.4 +
      unitsScore * 0.2 +
      notationScore * 0.2 +
      consistencyScore * 0.2
    );

    // Confidence based on number of checks and their quality
    const confidence = this.calculateConfidence(checks, response.overallConfidence);

    return {
      score: Math.max(0, Math.min(1, score)),
      breakdown,
      confidence,
    };
  }

  /**
   * Calculate mathematical correctness score
   * @param checks - Verification checks
   * @returns Score (0-1)
   */
  private calculateMathematicalScore(checks: VerifierCheckResult[]): number {
    const mathChecks = checks.filter(check => 
      ['derivative', 'integral', 'limit', 'algebra'].includes(check.type)
    );

    if (mathChecks.length === 0) return 0.5; // Neutral if no math checks

    const passedChecks = mathChecks.filter(check => check.passed);
    const avgConfidence = mathChecks.reduce((sum, check) => sum + check.confidence, 0) / mathChecks.length;

    return (passedChecks.length / mathChecks.length) * avgConfidence;
  }

  /**
   * Calculate units correctness score
   * @param checks - Verification checks
   * @returns Score (0-1)
   */
  private calculateUnitsScore(checks: VerifierCheckResult[]): number {
    const unitChecks = checks.filter(check => 
      ['units', 'dimensional_analysis'].includes(check.type)
    );

    if (unitChecks.length === 0) return 0.5; // Neutral if no unit checks

    const passedChecks = unitChecks.filter(check => check.passed);
    const avgConfidence = unitChecks.reduce((sum, check) => sum + check.confidence, 0) / unitChecks.length;

    return (passedChecks.length / unitChecks.length) * avgConfidence;
  }

  /**
   * Calculate notation correctness score
   * @param solution - Solution text
   * @returns Score (0-1)
   */
  private calculateNotationScore(solution: string): number {
    let score = 0.5; // Base score

    // Check for proper mathematical notation
    const hasProperNotation = /[a-zA-Z]\s*\([^)]+\)/.test(solution); // Functions
    const hasOperators = /[+\-*/^=<>≤≥]/.test(solution); // Operators
    const hasNumbers = /\d+/.test(solution); // Numbers

    if (hasProperNotation) score += 0.2;
    if (hasOperators) score += 0.2;
    if (hasNumbers) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Calculate consistency score
   * @param checks - Verification checks
   * @returns Score (0-1)
   */
  private calculateConsistencyScore(checks: VerifierCheckResult[]): number {
    if (checks.length === 0) return 0.5;

    // Check for consistency in confidence levels
    const confidences = checks.map(check => check.confidence);
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - avgConfidence, 2), 0) / confidences.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    const consistency = Math.max(0, 1 - stdDev);
    
    return consistency;
  }

  /**
   * Calculate confidence score
   * @param checks - Verification checks
   * @param overallConfidence - Overall confidence from verifier
   * @returns Confidence (0-1)
   */
  private calculateConfidence(checks: VerifierCheckResult[], overallConfidence: number): number {
    if (checks.length === 0) return 0.1;

    // Base confidence on number of checks and their quality
    const avgCheckConfidence = checks.reduce((sum, check) => sum + check.confidence, 0) / checks.length;
    const checkCountFactor = Math.min(1, checks.length / 5); // Normalize to 5 checks max

    return (avgCheckConfidence * 0.7 + overallConfidence * 0.3) * checkCountFactor;
  }

  /**
   * Check if verification is reliable
   * @param response - Verifier response
   * @returns True if reliable
   */
  isReliable(response: VerifierResponse): boolean {
    if (!response.ok) return false;
    if (response.overallConfidence < 0.7) return false;
    if (response.checks.length === 0) return false;

    const passedChecks = response.checks.filter(check => check.passed);
    const passRate = passedChecks.length / response.checks.length;

    return passRate >= 0.8;
  }

  /**
   * Get verification summary
   * @param response - Verifier response
   * @returns Summary string
   */
  getVerificationSummary(response: VerifierResponse): string {
    if (!response.ok) {
      return `Verification failed: ${response.error || 'Unknown error'}`;
    }

    const passedChecks = response.checks.filter(check => check.passed);
    const totalChecks = response.checks.length;
    const passRate = totalChecks > 0 ? (passedChecks.length / totalChecks) * 100 : 0;

    return `Verification passed ${passedChecks.length}/${totalChecks} checks (${passRate.toFixed(1)}%) with ${(response.overallConfidence * 100).toFixed(1)}% confidence`;
  }
}

/**
 * Default verifier client instance
 */
export const verifierClient = new VerifierClient();
