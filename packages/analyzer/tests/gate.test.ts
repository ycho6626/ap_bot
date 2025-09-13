import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkQualityGates, QualityGateResult } from '../src/gate';
import { analyzeVAM, VAMAnalysis } from '../src/vam';

// Mock the logger
vi.mock('@ap/shared/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Quality Gates', () => {
  const mockVAMAnalysis: VAMAnalysis = {
    total_events: 100,
    verified_count: 99,
    verifier_equiv_count: 98,
    error_count: 1,
    avg_response_time_ms: 2000,
    avg_trust_score: 0.95,
    verified_share: 0.99,
    verifier_equiv_rate: 0.98,
    error_rate: 0.01,
    abstain_rate: 0.01,
  };

  const mockVAMAnalysisFailing: VAMAnalysis = {
    total_events: 100,
    verified_count: 90,
    verifier_equiv_count: 85,
    error_count: 10,
    avg_response_time_ms: 6000,
    avg_trust_score: 0.85,
    verified_share: 0.9,
    verifier_equiv_rate: 0.85,
    error_rate: 0.1,
    abstain_rate: 0.1,
  };

  describe('checkQualityGates', () => {
    it('should pass when all metrics meet thresholds', async () => {
      const result = await checkQualityGates(mockVAMAnalysis);

      expect(result).toMatchObject({
        passed: true,
        verified_share_ok: true,
        verifier_equiv_ok: true,
        response_time_ok: true,
        error_rate_ok: true,
        trust_score_ok: true,
        overall_score: expect.any(Number),
      });

      expect(result.overall_score).toBeGreaterThan(0.9);
    });

    it('should fail when verified share is too low', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        verified_share: 0.9, // Below 0.985 threshold
      };

      const result = await checkQualityGates(failingAnalysis);

      expect(result).toMatchObject({
        passed: false,
        verified_share_ok: false,
        verifier_equiv_ok: true,
        response_time_ok: true,
        error_rate_ok: true,
        trust_score_ok: true,
        overall_score: expect.any(Number),
      });
    });

    it('should fail when verifier equivalence is too low', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        verifier_equiv_rate: 0.95, // Below 0.99 threshold
      };

      const result = await checkQualityGates(failingAnalysis);

      expect(result).toMatchObject({
        passed: false,
        verified_share_ok: true,
        verifier_equiv_ok: false,
        response_time_ok: true,
        error_rate_ok: true,
        trust_score_ok: true,
        overall_score: expect.any(Number),
      });
    });

    it('should fail when response time is too high', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        avg_response_time_ms: 6000, // Above 5000ms threshold
      };

      const result = await checkQualityGates(failingAnalysis);

      expect(result).toMatchObject({
        passed: false,
        verified_share_ok: true,
        verifier_equiv_ok: true,
        response_time_ok: false,
        error_rate_ok: true,
        trust_score_ok: true,
        overall_score: expect.any(Number),
      });
    });

    it('should fail when error rate is too high', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        error_rate: 0.05, // Above 0.01 threshold
      };

      const result = await checkQualityGates(failingAnalysis);

      expect(result).toMatchObject({
        passed: false,
        verified_share_ok: true,
        verifier_equiv_ok: true,
        response_time_ok: true,
        error_rate_ok: false,
        trust_score_ok: true,
        overall_score: expect.any(Number),
      });
    });

    it('should fail when trust score is too low', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        avg_trust_score: 0.85, // Below 0.92 threshold
      };

      const result = await checkQualityGates(failingAnalysis);

      expect(result).toMatchObject({
        passed: false,
        verified_share_ok: true,
        verifier_equiv_ok: true,
        response_time_ok: true,
        error_rate_ok: true,
        trust_score_ok: false,
        overall_score: expect.any(Number),
      });
    });

    it('should fail when multiple metrics are below thresholds', async () => {
      const result = await checkQualityGates(mockVAMAnalysisFailing);

      expect(result).toMatchObject({
        passed: false,
        verified_share_ok: false,
        verifier_equiv_ok: false,
        response_time_ok: false,
        error_rate_ok: false,
        trust_score_ok: false,
        overall_score: expect.any(Number),
      });
    });

    it('should calculate overall score correctly', async () => {
      const result = await checkQualityGates(mockVAMAnalysis);

      // Overall score should be a weighted average of all metrics
      expect(result.overall_score).toBeGreaterThan(0);
      expect(result.overall_score).toBeLessThanOrEqual(1);
    });

    it('should handle edge cases', async () => {
      const edgeCaseAnalysis: VAMAnalysis = {
        total_events: 0,
        verified_count: 0,
        verifier_equiv_count: 0,
        error_count: 0,
        avg_response_time_ms: 0,
        avg_trust_score: 0,
        verified_share: 0,
        verifier_equiv_rate: 0,
        error_rate: 0,
        abstain_rate: 0,
      };

      const result = await checkQualityGates(edgeCaseAnalysis);

      expect(result).toMatchObject({
        passed: false,
        verified_share_ok: false,
        verifier_equiv_ok: false,
        response_time_ok: true, // 0ms is below threshold
        error_rate_ok: true, // 0% is below threshold
        trust_score_ok: false,
        overall_score: expect.any(Number),
      });
    });
  });

  describe('QualityGateResult interface', () => {
    it('should have correct structure', () => {
      const result = checkQualityGates(mockVAMAnalysis);

      expect(result).resolves.toMatchObject({
        passed: expect.any(Boolean),
        verified_share_ok: expect.any(Boolean),
        verifier_equiv_ok: expect.any(Boolean),
        response_time_ok: expect.any(Boolean),
        error_rate_ok: expect.any(Boolean),
        trust_score_ok: expect.any(Boolean),
        overall_score: expect.any(Number),
      });
    });
  });
});
