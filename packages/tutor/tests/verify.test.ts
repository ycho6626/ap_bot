import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPost, mockVerifierClient } = vi.hoisted(() => {
  const mockPost = vi.fn();
  const mockVerifierClient = { post: mockPost };
  return { mockPost, mockVerifierClient };
});

// Mock @ap/shared
vi.mock('@ap/shared', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  createVerifierClient: vi.fn(() => mockVerifierClient),
  traceHttpOperation: vi.fn((name, service, fn) => fn()),
  approximatelyEqual: vi.fn(() => true),
  isZero: vi.fn(() => false),
  isPositive: vi.fn(() => true),
  isNegative: vi.fn(() => false),
}));

// Import after mocking
import { VerifierClient } from '../src/verify';

describe('VerifierClient', () => {
  let client: VerifierClient;
  let mockClient: typeof mockVerifierClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockReset();
    client = new VerifierClient();
    mockClient = (client as any).client;
  });

  const setPostResponse = (response: any) => {
    mockClient.post.mockReturnValueOnce({
      json: vi.fn().mockResolvedValue(response),
    });
  };

  const setPostError = (error: Error) => {
    mockClient.post.mockReturnValueOnce({
      json: vi.fn().mockRejectedValue(error),
    });
  };

  describe('verify', () => {
    it('should verify a solution successfully', async () => {
      const mockResponse = {
        ok: true,
        checks: [
          {
            type: 'derivative',
            passed: true,
            confidence: 0.95,
            message: 'Derivative is correct',
          },
        ],
        normalizedAnswer: '2x',
        overallConfidence: 0.95,
      };

      setPostResponse(mockResponse);

      const result = await client.verify('Find the derivative of x^2', '2x');

      expect(result).toEqual(mockResponse);
      expect(mockClient.post).toHaveBeenCalledWith('verify', {
        json: {
          problem: 'Find the derivative of x^2',
          solution: '2x',
          check_types: ['derivative', 'integral', 'limit', 'algebra', 'units'],
          tolerance: 1e-6,
          allow_constants: true,
          strict_units: false,
        },
        timeout: 30000,
      });
    });

    it('should handle verification errors', async () => {
      const error = new Error('Verification failed');
      setPostError(error);

      const result = await client.verify('test problem', 'test solution');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Verification failed');
      expect(result.checks).toEqual([]);
      expect(result.overallConfidence).toBe(0);
    });

    it('should use custom options', async () => {
      const mockResponse = {
        ok: true,
        checks: [],
        normalizedAnswer: 'test',
        overallConfidence: 0.8,
      };

      setPostResponse(mockResponse);

      await client.verify('test problem', 'test solution', {
        checkTypes: ['derivative'],
        tolerance: 1e-3,
        allowConstants: false,
        strictUnits: true,
        timeout: 10000,
      });

      expect(mockClient.post).toHaveBeenCalledWith('verify', {
        json: {
          problem: 'test problem',
          solution: 'test solution',
          check_types: ['derivative'],
          tolerance: 1e-3,
          allow_constants: false,
          strict_units: true,
        },
        timeout: 10000,
      });
    });
  });

  describe('verifyDerivative', () => {
    it('should verify derivative correctly', async () => {
      const mockResponse = {
        type: 'derivative',
        passed: true,
        confidence: 0.95,
        message: 'Derivative is correct',
      };

      setPostResponse(mockResponse);

      const result = await client.verifyDerivative('x^2', '2x', 'x');

      expect(result).toEqual(mockResponse);
      expect(mockClient.post).toHaveBeenCalledWith('verify/derivative', {
        json: {
          function: 'x^2',
          derivative: '2x',
          variable: 'x',
        },
      });
    });

    it('should handle derivative verification errors', async () => {
      const error = new Error('Derivative verification failed');
      setPostError(error);

      const result = await client.verifyDerivative('x^2', '2x', 'x');

      expect(result.type).toBe('derivative');
      expect(result.passed).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.message).toContain('Derivative verification failed');
    });
  });

  describe('verifyIntegral', () => {
    it('should verify integral correctly', async () => {
      const mockResponse = {
        type: 'integral',
        passed: true,
        confidence: 0.9,
        message: 'Integral is correct',
      };

      setPostResponse(mockResponse);

      const result = await client.verifyIntegral('2x', 'x^2 + C', 'x');

      expect(result).toEqual(mockResponse);
      expect(mockClient.post).toHaveBeenCalledWith('verify/integral', {
        json: {
          function: '2x',
          integral: 'x^2 + C',
          variable: 'x',
          bounds: undefined,
        },
      });
    });

    it('should verify integral with bounds', async () => {
      const mockResponse = {
        type: 'integral',
        passed: true,
        confidence: 0.9,
        message: 'Integral is correct',
      };

      setPostResponse(mockResponse);

      const result = await client.verifyIntegral('2x', 'x^2', 'x', { lower: 0, upper: 1 });

      expect(mockClient.post).toHaveBeenCalledWith('verify/integral', {
        json: {
          function: '2x',
          integral: 'x^2',
          variable: 'x',
          bounds: { lower: 0, upper: 1 },
        },
      });
    });
  });

  describe('verifyLimit', () => {
    it('should verify limit correctly', async () => {
      const mockResponse = {
        type: 'limit',
        passed: true,
        confidence: 0.85,
        message: 'Limit is correct',
      };

      setPostResponse(mockResponse);

      const result = await client.verifyLimit('x^2', '0', 'x', '0');

      expect(result).toEqual(mockResponse);
      expect(mockClient.post).toHaveBeenCalledWith('verify/limit', {
        json: {
          expression: 'x^2',
          limit: '0',
          variable: 'x',
          value: '0',
        },
      });
    });
  });

  describe('verifyAlgebra', () => {
    it('should verify algebraic manipulation', async () => {
      const mockResponse = {
        type: 'algebra',
        passed: true,
        confidence: 0.9,
        message: 'Algebraic manipulation is correct',
      };

      setPostResponse(mockResponse);

      const result = await client.verifyAlgebra('x^2 + 2x + 1', '(x + 1)^2', 'x');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('verifyUnits', () => {
    it('should verify units correctly', async () => {
      const mockResponse = {
        type: 'units',
        passed: true,
        confidence: 0.8,
        message: 'Units are correct',
      };

      setPostResponse(mockResponse);

      const result = await client.verifyUnits('5 m/s', 'm/s');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('verifyDimensionalAnalysis', () => {
    it('should verify dimensional analysis', async () => {
      const mockResponse = {
        type: 'dimensional_analysis',
        passed: true,
        confidence: 0.85,
        message: 'Dimensional analysis is correct',
      };

      setPostResponse(mockResponse);

      const result = await client.verifyDimensionalAnalysis('v = d/t', 'L/T');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('calculateTrustScore', () => {
    it('should calculate trust score correctly', () => {
      const response = {
        ok: true,
        checks: [
          {
            type: 'derivative',
            passed: true,
            confidence: 0.9,
            message: 'Correct',
          },
          {
            type: 'units',
            passed: true,
            confidence: 0.8,
            message: 'Correct',
          },
        ],
        normalizedAnswer: '2x',
        overallConfidence: 0.85,
      };

      const solution = 'The derivative is 2x';

      const trustScore = client.calculateTrustScore(response, solution);

      expect(trustScore.score).toBeGreaterThan(0);
      expect(trustScore.score).toBeLessThanOrEqual(1);
      expect(trustScore.breakdown.mathematical).toBeGreaterThan(0);
      expect(trustScore.breakdown.units).toBeGreaterThan(0);
      expect(trustScore.breakdown.notation).toBeGreaterThan(0);
      expect(trustScore.breakdown.consistency).toBeGreaterThan(0);
      expect(trustScore.confidence).toBeGreaterThan(0);
    });

    it('should handle empty checks', () => {
      const response = {
        ok: true,
        checks: [],
        normalizedAnswer: 'test',
        overallConfidence: 0.5,
      };

      const solution = 'test solution';

      const trustScore = client.calculateTrustScore(response, solution);

      expect(trustScore.score).toBeGreaterThan(0);
      expect(trustScore.confidence).toBeLessThan(1);
    });
  });

  describe('calculateMathematicalScore', () => {
    it('should calculate mathematical score', () => {
      const checks = [
        {
          type: 'derivative',
          passed: true,
          confidence: 0.9,
        },
        {
          type: 'integral',
          passed: false,
          confidence: 0.3,
        },
        {
          type: 'units',
          passed: true,
          confidence: 0.8,
        },
      ];

      const score = (client as any).calculateMathematicalScore(checks);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should return neutral score for no math checks', () => {
      const checks = [
        {
          type: 'units',
          passed: true,
          confidence: 0.8,
        },
      ];

      const score = (client as any).calculateMathematicalScore(checks);

      expect(score).toBe(0.5);
    });
  });

  describe('calculateUnitsScore', () => {
    it('should calculate units score', () => {
      const checks = [
        {
          type: 'units',
          passed: true,
          confidence: 0.9,
        },
        {
          type: 'dimensional_analysis',
          passed: false,
          confidence: 0.2,
        },
      ];

      const score = (client as any).calculateUnitsScore(checks);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });
  });

  describe('calculateNotationScore', () => {
    it('should calculate notation score', () => {
      const solution = 'f(x) = x^2 + 3x - 1';

      const score = (client as any).calculateNotationScore(solution);

      expect(score).toBeGreaterThan(0.5);
    });

    it('should give lower score for poor notation', () => {
      const solution = 'just text';

      const score = (client as any).calculateNotationScore(solution);

      expect(score).toBe(0.5);
    });
  });

  describe('calculateConsistencyScore', () => {
    it('should calculate consistency score', () => {
      const checks = [{ confidence: 0.9 }, { confidence: 0.8 }, { confidence: 0.85 }];

      const score = (client as any).calculateConsistencyScore(checks);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('isReliable', () => {
    it('should determine if verification is reliable', () => {
      const reliableResponse = {
        ok: true,
        overallConfidence: 0.9,
        checks: [{ passed: true }, { passed: true }, { passed: true }],
      };

      expect(client.isReliable(reliableResponse)).toBe(true);
    });

    it('should reject unreliable verification', () => {
      const unreliableResponse = {
        ok: false,
        overallConfidence: 0.5,
        checks: [],
      };

      expect(client.isReliable(unreliableResponse)).toBe(false);
    });
  });

  describe('getVerificationSummary', () => {
    it('should generate verification summary', () => {
      const response = {
        ok: true,
        overallConfidence: 0.9,
        checks: [{ passed: true }, { passed: true }, { passed: false }],
      };

      const summary = client.getVerificationSummary(response);

      expect(summary).toContain('2/3');
      expect(summary).toContain('90.0%');
    });

    it('should handle failed verification', () => {
      const response = {
        ok: false,
        error: 'Verification failed',
        overallConfidence: 0,
        checks: [],
      };

      const summary = client.getVerificationSummary(response);

      expect(summary).toContain('Verification failed');
    });
  });
});
