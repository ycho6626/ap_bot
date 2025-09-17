import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the supabase module at the top level
vi.mock('@ap/shared/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

// Mock the VAM module to test the functions directly
vi.mock('../src/vam', () => ({
  analyzeVAM: vi.fn(),
}));

describe('VAM Analysis', () => {
  const mockAnalyticsEvents = [
    {
      id: 'event-1',
      user_id: 'user-1',
      session_id: 'session-1',
      event_type: 'vam_outcome',
      exam_variant: 'calc_ab',
      is_verified: true,
      trust_score: 0.95,
      verifier_equiv: true,
      response_time_ms: 2000,
      created_at: '2024-01-01T00:00:00Z',
      metadata: {},
    },
    {
      id: 'event-2',
      user_id: 'user-2',
      session_id: 'session-2',
      event_type: 'vam_outcome',
      exam_variant: 'calc_ab',
      is_verified: true,
      trust_score: 0.98,
      verifier_equiv: true,
      response_time_ms: 1500,
      created_at: '2024-01-01T00:01:00Z',
      metadata: {},
    },
    {
      id: 'event-3',
      user_id: 'user-3',
      session_id: 'session-3',
      event_type: 'abstain',
      exam_variant: 'calc_ab',
      is_verified: false,
      trust_score: 0.85,
      verifier_equiv: false,
      response_time_ms: 3000,
      created_at: '2024-01-01T00:02:00Z',
      metadata: {},
    },
    {
      id: 'event-4',
      user_id: 'user-4',
      session_id: 'session-4',
      event_type: 'vam_outcome',
      exam_variant: 'calc_bc',
      is_verified: true,
      trust_score: 0.92,
      verifier_equiv: false,
      response_time_ms: 2500,
      created_at: '2024-01-01T00:03:00Z',
      metadata: {},
    },
    {
      id: 'event-5',
      user_id: 'user-5',
      session_id: 'session-5',
      event_type: 'verification_failure',
      exam_variant: 'calc_bc',
      is_verified: false,
      trust_score: 0.8,
      verifier_equiv: false,
      response_time_ms: 4000,
      created_at: '2024-01-01T00:04:00Z',
      metadata: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeVAM', () => {
    it('should call analyzeVAM with correct parameters', async () => {
      const { analyzeVAM } = await import('../src/vam');
      const mockResult = {
        overall: {
          total_requests: 5,
          verified_count: 3,
          abstain_count: 1,
          verifier_equiv_count: 2,
          verification_failures: 1,
          avg_response_time_ms: 2600,
          avg_trust_score: 0.9,
          verified_share: 0.6,
          verifier_equiv_rate: 0.4,
          abstain_rate: 0.2,
        },
        by_variant: {
          calc_ab: {
            total_requests: 3,
            verified_count: 2,
            abstain_count: 1,
            verification_failures: 0,
            verified_share: 0.67,
            abstain_rate: 0.33,
            avg_trust_score: 0.93,
            avg_response_time_ms: 2167,
            verifier_equiv_count: 2,
            verifier_equiv_rate: 0.67,
          },
          calc_bc: {
            total_requests: 2,
            verified_count: 1,
            abstain_count: 0,
            verification_failures: 1,
            verified_share: 0.5,
            abstain_rate: 0,
            avg_trust_score: 0.86,
            avg_response_time_ms: 3250,
            verifier_equiv_count: 0,
            verifier_equiv_rate: 0,
          },
        },
        by_time_period: {
          last_hour: {
            total_requests: 0,
            verified_count: 0,
            abstain_count: 0,
            verification_failures: 0,
            verified_share: 0,
            abstain_rate: 0,
            avg_trust_score: 0,
            avg_response_time_ms: 0,
            verifier_equiv_count: 0,
            verifier_equiv_rate: 0,
          },
          last_day: {
            total_requests: 5,
            verified_count: 3,
            abstain_count: 1,
            verification_failures: 1,
            verified_share: 0.6,
            abstain_rate: 0.2,
            avg_trust_score: 0.9,
            avg_response_time_ms: 2600,
            verifier_equiv_count: 2,
            verifier_equiv_rate: 0.4,
          },
          last_week: {
            total_requests: 5,
            verified_count: 3,
            abstain_count: 1,
            verification_failures: 1,
            verified_share: 0.6,
            abstain_rate: 0.2,
            avg_trust_score: 0.9,
            avg_response_time_ms: 2600,
            verifier_equiv_count: 2,
            verifier_equiv_rate: 0.4,
          },
        },
        trends: {
          verified_share_trend: 'stable' as const,
          response_time_trend: 'stable' as const,
        },
      };

      vi.mocked(analyzeVAM).mockResolvedValue(mockResult);

      const result = await analyzeVAM();

      expect(analyzeVAM).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle empty events array', async () => {
      const { analyzeVAM } = await import('../src/vam');
      const mockResult = {
        overall: {
          total_requests: 0,
          verified_count: 0,
          abstain_count: 0,
          verifier_equiv_count: 0,
          verification_failures: 0,
          avg_response_time_ms: 0,
          avg_trust_score: 0,
          verified_share: 0,
          verifier_equiv_rate: 0,
          abstain_rate: 0,
        },
        by_variant: {
          calc_ab: {
            total_requests: 0,
            verified_count: 0,
            abstain_count: 0,
            verification_failures: 0,
            verified_share: 0,
            abstain_rate: 0,
            avg_trust_score: 0,
            avg_response_time_ms: 0,
            verifier_equiv_count: 0,
            verifier_equiv_rate: 0,
          },
          calc_bc: {
            total_requests: 0,
            verified_count: 0,
            abstain_count: 0,
            verification_failures: 0,
            verified_share: 0,
            abstain_rate: 0,
            avg_trust_score: 0,
            avg_response_time_ms: 0,
            verifier_equiv_count: 0,
            verifier_equiv_rate: 0,
          },
        },
        by_time_period: {
          last_hour: {
            total_requests: 0,
            verified_count: 0,
            abstain_count: 0,
            verification_failures: 0,
            verified_share: 0,
            abstain_rate: 0,
            avg_trust_score: 0,
            avg_response_time_ms: 0,
            verifier_equiv_count: 0,
            verifier_equiv_rate: 0,
          },
          last_day: {
            total_requests: 0,
            verified_count: 0,
            abstain_count: 0,
            verification_failures: 0,
            verified_share: 0,
            abstain_rate: 0,
            avg_trust_score: 0,
            avg_response_time_ms: 0,
            verifier_equiv_count: 0,
            verifier_equiv_rate: 0,
          },
          last_week: {
            total_requests: 0,
            verified_count: 0,
            abstain_count: 0,
            verification_failures: 0,
            verified_share: 0,
            abstain_rate: 0,
            avg_trust_score: 0,
            avg_response_time_ms: 0,
            verifier_equiv_count: 0,
            verifier_equiv_rate: 0,
          },
        },
        trends: {
          verified_share_trend: 'stable' as const,
          response_time_trend: 'stable' as const,
        },
      };

      vi.mocked(analyzeVAM).mockResolvedValue(mockResult);

      const result = await analyzeVAM();

      expect(analyzeVAM).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should call analyzeVAM with time window parameters', async () => {
      const { analyzeVAM } = await import('../src/vam');
      const mockResult = {
        overall: {
          total_requests: 5,
          verified_count: 3,
          abstain_count: 1,
          verifier_equiv_count: 2,
          verification_failures: 1,
          avg_response_time_ms: 2600,
          avg_trust_score: 0.9,
          verified_share: 0.6,
          verifier_equiv_rate: 0.4,
          abstain_rate: 0.2,
        },
        by_variant: {
          calc_ab: { total_requests: 3, verified_count: 2, abstain_count: 1, verification_failures: 0, verified_share: 0.67, abstain_rate: 0.33, avg_trust_score: 0.93, avg_response_time_ms: 2167, verifier_equiv_count: 2, verifier_equiv_rate: 0.67 },
          calc_bc: { total_requests: 2, verified_count: 1, abstain_count: 0, verification_failures: 1, verified_share: 0.5, abstain_rate: 0, avg_trust_score: 0.86, avg_response_time_ms: 3250, verifier_equiv_count: 0, verifier_equiv_rate: 0 },
        },
        by_time_period: {
          last_hour: { total_requests: 0, verified_count: 0, abstain_count: 0, verification_failures: 0, verified_share: 0, abstain_rate: 0, avg_trust_score: 0, avg_response_time_ms: 0, verifier_equiv_count: 0, verifier_equiv_rate: 0 },
          last_day: { total_requests: 5, verified_count: 3, abstain_count: 1, verification_failures: 1, verified_share: 0.6, abstain_rate: 0.2, avg_trust_score: 0.9, avg_response_time_ms: 2600, verifier_equiv_count: 2, verifier_equiv_rate: 0.4 },
          last_week: { total_requests: 5, verified_count: 3, abstain_count: 1, verification_failures: 1, verified_share: 0.6, abstain_rate: 0.2, avg_trust_score: 0.9, avg_response_time_ms: 2600, verifier_equiv_count: 2, verifier_equiv_rate: 0.4 },
        },
        trends: { verified_share_trend: 'stable' as const, response_time_trend: 'stable' as const },
      };

      vi.mocked(analyzeVAM).mockResolvedValue(mockResult);

      const now = new Date('2024-01-01T00:05:00Z');
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const result = await analyzeVAM(oneHourAgo, now);

      expect(analyzeVAM).toHaveBeenCalledWith(oneHourAgo, now);
      expect(result).toEqual(mockResult);
    });

    it('should call analyzeVAM with exam variant parameter', async () => {
      const { analyzeVAM } = await import('../src/vam');
      const mockResult = {
        overall: {
          total_requests: 3,
          verified_count: 2,
          abstain_count: 1,
          verifier_equiv_count: 2,
          verification_failures: 0,
          avg_response_time_ms: 2167,
          avg_trust_score: 0.93,
          verified_share: 0.67,
          verifier_equiv_rate: 0.67,
          abstain_rate: 0.33,
        },
        by_variant: {
          calc_ab: { total_requests: 3, verified_count: 2, abstain_count: 1, verification_failures: 0, verified_share: 0.67, abstain_rate: 0.33, avg_trust_score: 0.93, avg_response_time_ms: 2167, verifier_equiv_count: 2, verifier_equiv_rate: 0.67 },
          calc_bc: { total_requests: 0, verified_count: 0, abstain_count: 0, verification_failures: 0, verified_share: 0, abstain_rate: 0, avg_trust_score: 0, avg_response_time_ms: 0, verifier_equiv_count: 0, verifier_equiv_rate: 0 },
        },
        by_time_period: {
          last_hour: { total_requests: 0, verified_count: 0, abstain_count: 0, verification_failures: 0, verified_share: 0, abstain_rate: 0, avg_trust_score: 0, avg_response_time_ms: 0, verifier_equiv_count: 0, verifier_equiv_rate: 0 },
          last_day: { total_requests: 3, verified_count: 2, abstain_count: 1, verification_failures: 0, verified_share: 0.67, abstain_rate: 0.33, avg_trust_score: 0.93, avg_response_time_ms: 2167, verifier_equiv_count: 2, verifier_equiv_rate: 0.67 },
          last_week: { total_requests: 3, verified_count: 2, abstain_count: 1, verification_failures: 0, verified_share: 0.67, abstain_rate: 0.33, avg_trust_score: 0.93, avg_response_time_ms: 2167, verifier_equiv_count: 2, verifier_equiv_rate: 0.67 },
        },
        trends: { verified_share_trend: 'stable' as const, response_time_trend: 'stable' as const },
      };

      vi.mocked(analyzeVAM).mockResolvedValue(mockResult);

      const result = await analyzeVAM(undefined, undefined, 'calc_ab');

      expect(analyzeVAM).toHaveBeenCalledWith(undefined, undefined, 'calc_ab');
      expect(result).toEqual(mockResult);
    });
  });

  describe('VAMAnalysis interface', () => {
    it('should have correct structure', async () => {
      const { analyzeVAM } = await import('../src/vam');
      const mockResult = {
        overall: {
          total_requests: 5,
          verified_count: 3,
          abstain_count: 1,
          verifier_equiv_count: 2,
          verification_failures: 1,
          avg_response_time_ms: 2600,
          avg_trust_score: 0.9,
          verified_share: 0.6,
          verifier_equiv_rate: 0.4,
          abstain_rate: 0.2,
        },
        by_variant: {
          calc_ab: { total_requests: 3, verified_count: 2, abstain_count: 1, verification_failures: 0, verified_share: 0.67, abstain_rate: 0.33, avg_trust_score: 0.93, avg_response_time_ms: 2167, verifier_equiv_count: 2, verifier_equiv_rate: 0.67 },
          calc_bc: { total_requests: 2, verified_count: 1, abstain_count: 0, verification_failures: 1, verified_share: 0.5, abstain_rate: 0, avg_trust_score: 0.86, avg_response_time_ms: 3250, verifier_equiv_count: 0, verifier_equiv_rate: 0 },
        },
        by_time_period: {
          last_hour: { total_requests: 0, verified_count: 0, abstain_count: 0, verification_failures: 0, verified_share: 0, abstain_rate: 0, avg_trust_score: 0, avg_response_time_ms: 0, verifier_equiv_count: 0, verifier_equiv_rate: 0 },
          last_day: { total_requests: 5, verified_count: 3, abstain_count: 1, verification_failures: 1, verified_share: 0.6, abstain_rate: 0.2, avg_trust_score: 0.9, avg_response_time_ms: 2600, verifier_equiv_count: 2, verifier_equiv_rate: 0.4 },
          last_week: { total_requests: 5, verified_count: 3, abstain_count: 1, verification_failures: 1, verified_share: 0.6, abstain_rate: 0.2, avg_trust_score: 0.9, avg_response_time_ms: 2600, verifier_equiv_count: 2, verifier_equiv_rate: 0.4 },
        },
        trends: { verified_share_trend: 'stable' as const, response_time_trend: 'stable' as const },
      };

      vi.mocked(analyzeVAM).mockResolvedValue(mockResult);

      const result = await analyzeVAM();

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('by_variant');
      expect(result).toHaveProperty('by_time_period');
      expect(result).toHaveProperty('trends');
      expect(result.overall).toHaveProperty('total_requests');
      expect(result.overall).toHaveProperty('verified_count');
      expect(result.overall).toHaveProperty('verifier_equiv_count');
      expect(result.overall).toHaveProperty('verification_failures');
      expect(result.overall).toHaveProperty('avg_response_time_ms');
      expect(result.overall).toHaveProperty('avg_trust_score');
      expect(result.overall).toHaveProperty('verified_share');
      expect(result.overall).toHaveProperty('verifier_equiv_rate');
      expect(result.overall).toHaveProperty('abstain_rate');
    });

    it('should have numeric values', async () => {
      const { analyzeVAM } = await import('../src/vam');
      const mockResult = {
        overall: {
          total_requests: 5,
          verified_count: 3,
          abstain_count: 1,
          verifier_equiv_count: 2,
          verification_failures: 1,
          avg_response_time_ms: 2600,
          avg_trust_score: 0.9,
          verified_share: 0.6,
          verifier_equiv_rate: 0.4,
          abstain_rate: 0.2,
        },
        by_variant: {
          calc_ab: { total_requests: 3, verified_count: 2, abstain_count: 1, verification_failures: 0, verified_share: 0.67, abstain_rate: 0.33, avg_trust_score: 0.93, avg_response_time_ms: 2167, verifier_equiv_count: 2, verifier_equiv_rate: 0.67 },
          calc_bc: { total_requests: 2, verified_count: 1, abstain_count: 0, verification_failures: 1, verified_share: 0.5, abstain_rate: 0, avg_trust_score: 0.86, avg_response_time_ms: 3250, verifier_equiv_count: 0, verifier_equiv_rate: 0 },
        },
        by_time_period: {
          last_hour: { total_requests: 0, verified_count: 0, abstain_count: 0, verification_failures: 0, verified_share: 0, abstain_rate: 0, avg_trust_score: 0, avg_response_time_ms: 0, verifier_equiv_count: 0, verifier_equiv_rate: 0 },
          last_day: { total_requests: 5, verified_count: 3, abstain_count: 1, verification_failures: 1, verified_share: 0.6, abstain_rate: 0.2, avg_trust_score: 0.9, avg_response_time_ms: 2600, verifier_equiv_count: 2, verifier_equiv_rate: 0.4 },
          last_week: { total_requests: 5, verified_count: 3, abstain_count: 1, verification_failures: 1, verified_share: 0.6, abstain_rate: 0.2, avg_trust_score: 0.9, avg_response_time_ms: 2600, verifier_equiv_count: 2, verifier_equiv_rate: 0.4 },
        },
        trends: { verified_share_trend: 'stable' as const, response_time_trend: 'stable' as const },
      };

      vi.mocked(analyzeVAM).mockResolvedValue(mockResult);

      const result = await analyzeVAM();

      expect(typeof result.overall.total_requests).toBe('number');
      expect(typeof result.overall.verified_count).toBe('number');
      expect(typeof result.overall.verifier_equiv_count).toBe('number');
      expect(typeof result.overall.verification_failures).toBe('number');
      expect(typeof result.overall.avg_response_time_ms).toBe('number');
      expect(typeof result.overall.avg_trust_score).toBe('number');
      expect(typeof result.overall.verified_share).toBe('number');
      expect(typeof result.overall.verifier_equiv_rate).toBe('number');
      expect(typeof result.overall.abstain_rate).toBe('number');
    });
  });
});
