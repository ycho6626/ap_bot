import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runQualityGates } from '../src/gate';
import { analyzeVAM, VAMAnalysis } from '../src/vam';

// Mock the VAM analysis function
vi.mock('../src/vam', () => ({
  analyzeVAM: vi.fn(),
}));

describe('Quality Gates', () => {
  const mockVAMAnalysis: VAMAnalysis = {
    overall: {
      total_requests: 100,
      verified_count: 99,
      abstain_count: 1,
      verification_failures: 1,
      verified_share: 0.99,
      abstain_rate: 0.01,
      avg_trust_score: 0.95,
      avg_response_time_ms: 2000,
      verifier_equiv_count: 99,
      verifier_equiv_rate: 0.99,
    },
    by_variant: {
      calc_ab: {
        total_requests: 50,
        verified_count: 49,
        abstain_count: 1,
        verification_failures: 0,
        verified_share: 0.98,
        abstain_rate: 0.02,
        avg_trust_score: 0.96,
        avg_response_time_ms: 1900,
        verifier_equiv_count: 48,
        verifier_equiv_rate: 0.96,
      },
      calc_bc: {
        total_requests: 50,
        verified_count: 50,
        abstain_count: 0,
        verification_failures: 1,
        verified_share: 1.0,
        abstain_rate: 0.0,
        avg_trust_score: 0.94,
        avg_response_time_ms: 2100,
        verifier_equiv_count: 50,
        verifier_equiv_rate: 1.0,
      },
    },
    by_time_period: {
      last_hour: {
        total_requests: 10,
        verified_count: 10,
        abstain_count: 0,
        verification_failures: 0,
        verified_share: 1.0,
        abstain_rate: 0.0,
        avg_trust_score: 0.98,
        avg_response_time_ms: 1800,
        verifier_equiv_count: 10,
        verifier_equiv_rate: 1.0,
      },
      last_day: {
        total_requests: 50,
        verified_count: 49,
        abstain_count: 1,
        verification_failures: 0,
        verified_share: 0.98,
        abstain_rate: 0.02,
        avg_trust_score: 0.95,
        avg_response_time_ms: 2000,
        verifier_equiv_count: 49,
        verifier_equiv_rate: 0.98,
      },
      last_week: {
        total_requests: 100,
        verified_count: 99,
        abstain_count: 1,
        verification_failures: 1,
        verified_share: 0.99,
        abstain_rate: 0.01,
        avg_trust_score: 0.95,
        avg_response_time_ms: 2000,
        verifier_equiv_count: 98,
        verifier_equiv_rate: 0.98,
      },
    },
    trends: {
      verified_share_trend: 'stable' as const,
      response_time_trend: 'stable' as const,
    },
  };

  const mockVAMAnalysisFailing: VAMAnalysis = {
    overall: {
      total_requests: 100,
      verified_count: 90,
      abstain_count: 10,
      verification_failures: 10,
      verified_share: 0.9,
      abstain_rate: 0.1,
      avg_trust_score: 0.85,
      avg_response_time_ms: 6000,
      verifier_equiv_count: 85,
      verifier_equiv_rate: 0.85,
    },
    by_variant: {
      calc_ab: {
        total_requests: 50,
        verified_count: 45,
        abstain_count: 5,
        verification_failures: 5,
        verified_share: 0.9,
        abstain_rate: 0.1,
        avg_trust_score: 0.85,
        avg_response_time_ms: 6000,
        verifier_equiv_count: 42,
        verifier_equiv_rate: 0.84,
      },
      calc_bc: {
        total_requests: 50,
        verified_count: 45,
        abstain_count: 5,
        verification_failures: 5,
        verified_share: 0.9,
        abstain_rate: 0.1,
        avg_trust_score: 0.85,
        avg_response_time_ms: 6000,
        verifier_equiv_count: 43,
        verifier_equiv_rate: 0.86,
      },
    },
    by_time_period: {
      last_hour: {
        total_requests: 10,
        verified_count: 9,
        abstain_count: 1,
        verification_failures: 1,
        verified_share: 0.9,
        abstain_rate: 0.1,
        avg_trust_score: 0.85,
        avg_response_time_ms: 6000,
        verifier_equiv_count: 8,
        verifier_equiv_rate: 0.8,
      },
      last_day: {
        total_requests: 50,
        verified_count: 45,
        abstain_count: 5,
        verification_failures: 5,
        verified_share: 0.9,
        abstain_rate: 0.1,
        avg_trust_score: 0.85,
        avg_response_time_ms: 6000,
        verifier_equiv_count: 42,
        verifier_equiv_rate: 0.84,
      },
      last_week: {
        total_requests: 100,
        verified_count: 90,
        abstain_count: 10,
        verification_failures: 10,
        verified_share: 0.9,
        abstain_rate: 0.1,
        avg_trust_score: 0.85,
        avg_response_time_ms: 6000,
        verifier_equiv_count: 85,
        verifier_equiv_rate: 0.85,
      },
    },
    trends: {
      verified_share_trend: 'declining' as const,
      response_time_trend: 'declining' as const,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runQualityGates', () => {
    it('should pass when all metrics meet thresholds', async () => {
      vi.mocked(analyzeVAM).mockResolvedValue(mockVAMAnalysis);

      const result = await runQualityGates({
        environment: 'production',
        time_window_hours: 24,
      });

      expect(result).toMatchObject({
        passed: true,
        environment: 'production',
        time_window_hours: 24,
        failures: [],
        warnings: expect.any(Array),
      });

      expect(result.metrics.verified_share).toBe(0.99);
      expect(result.metrics.verifier_equiv_rate).toBe(0.99);
      expect(result.metrics.avg_response_time_ms).toBe(2000);
    });

    it('should fail when verified share is too low', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        overall: {
          ...mockVAMAnalysis.overall,
          verified_share: 0.9, // Below 0.985 threshold
        },
      };
      vi.mocked(analyzeVAM).mockResolvedValue(failingAnalysis);

      const result = await runQualityGates({
        environment: 'production',
        time_window_hours: 24,
      });

      expect(result).toMatchObject({
        passed: false,
        environment: 'production',
        time_window_hours: 24,
        failures: expect.arrayContaining([
          expect.stringContaining('Verified share 0.9000 below threshold 0.985'),
        ]),
      });
    });

    it('should fail when verifier equivalence is too low', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        overall: {
          ...mockVAMAnalysis.overall,
          verifier_equiv_rate: 0.95, // Below 0.99 threshold
        },
      };
      vi.mocked(analyzeVAM).mockResolvedValue(failingAnalysis);

      const result = await runQualityGates({
        environment: 'production',
        time_window_hours: 24,
      });

      expect(result).toMatchObject({
        passed: false,
        failures: expect.arrayContaining([
          expect.stringContaining('Verifier equivalence 0.9500 below threshold 0.99'),
        ]),
      });
    });

    it('should fail when response time is too high', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        overall: {
          ...mockVAMAnalysis.overall,
          avg_response_time_ms: 6000, // Above 5000ms threshold
        },
      };
      vi.mocked(analyzeVAM).mockResolvedValue(failingAnalysis);

      const result = await runQualityGates({
        environment: 'production',
        time_window_hours: 24,
      });

      expect(result).toMatchObject({
        passed: false,
        failures: expect.arrayContaining([
          expect.stringContaining('Average response time 6000ms exceeds threshold 5000ms'),
        ]),
      });
    });

    it('should fail when error rate is too high', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        overall: {
          ...mockVAMAnalysis.overall,
          verification_failures: 5, // 5% error rate, above 1% threshold
        },
      };
      vi.mocked(analyzeVAM).mockResolvedValue(failingAnalysis);

      const result = await runQualityGates({
        environment: 'production',
        time_window_hours: 24,
      });

      expect(result).toMatchObject({
        passed: false,
        failures: expect.arrayContaining([
          expect.stringContaining('Error rate 0.0500 exceeds threshold 0.01'),
        ]),
      });
    });

    it('should fail when trust score is too low', async () => {
      const failingAnalysis = {
        ...mockVAMAnalysis,
        overall: {
          ...mockVAMAnalysis.overall,
          avg_trust_score: 0.85, // Below 0.92 threshold
        },
      };
      vi.mocked(analyzeVAM).mockResolvedValue(failingAnalysis);

      const result = await runQualityGates({
        environment: 'production',
        time_window_hours: 24,
      });

      expect(result).toMatchObject({
        passed: false,
        failures: expect.arrayContaining([
          expect.stringContaining('Average trust score 0.8500 below threshold 0.92'),
        ]),
      });
    });

    it('should fail when multiple metrics are below thresholds', async () => {
      vi.mocked(analyzeVAM).mockResolvedValue(mockVAMAnalysisFailing);

      const result = await runQualityGates({
        environment: 'production',
        time_window_hours: 24,
      });

      expect(result).toMatchObject({
        passed: false,
        failures: expect.arrayContaining([
          expect.stringContaining('Verified share'),
          expect.stringContaining('Verifier equivalence'),
          expect.stringContaining('Average response time'),
          expect.stringContaining('Error rate'),
          expect.stringContaining('Average trust score'),
        ]),
      });
    });

    it('should handle custom thresholds', async () => {
      vi.mocked(analyzeVAM).mockResolvedValue(mockVAMAnalysis);

      const result = await runQualityGates({
        environment: 'production',
        time_window_hours: 24,
        custom_thresholds: {
          min_verified_share: 0.99,
          min_verifier_equiv: 0.99,
        },
      });

      expect(result.thresholds.min_verified_share).toBe(0.99);
      expect(result.thresholds.min_verifier_equiv).toBe(0.99);
    });

    it('should generate proper summary', async () => {
      vi.mocked(analyzeVAM).mockResolvedValue(mockVAMAnalysis);

      const result = await runQualityGates({
        environment: 'production',
        time_window_hours: 24,
      });

      expect(result.summary).toContain('Quality Gate ✅ PASSED');
      expect(result.summary).toContain('Environment: production');
      expect(result.summary).toContain('Time Window: 24 hours');
      expect(result.summary).toContain('Total Requests: 100');
    });
  });
});
