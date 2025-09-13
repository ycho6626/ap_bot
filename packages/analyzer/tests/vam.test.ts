import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyzeVAM, VAMAnalysis } from '../src/vam';

describe('VAM Analysis', () => {
  const mockAnalyticsEvents = [
    {
      id: 'event-1',
      kind: 'vam_outcome',
      payload: {
        verified: true,
        verifier_equiv: true,
        trust_score: 0.95,
        response_time_ms: 2000,
        error_rate: 0.0,
      },
      created_at: new Date('2024-01-01T00:00:00Z').toISOString(),
    },
    {
      id: 'event-2',
      kind: 'vam_outcome',
      payload: {
        verified: true,
        verifier_equiv: true,
        trust_score: 0.98,
        response_time_ms: 1500,
        error_rate: 0.0,
      },
      created_at: new Date('2024-01-01T00:01:00Z').toISOString(),
    },
    {
      id: 'event-3',
      kind: 'vam_outcome',
      payload: {
        verified: false,
        verifier_equiv: false,
        trust_score: 0.85,
        response_time_ms: 3000,
        error_rate: 0.0,
      },
      created_at: new Date('2024-01-01T00:02:00Z').toISOString(),
    },
    {
      id: 'event-4',
      kind: 'vam_outcome',
      payload: {
        verified: true,
        verifier_equiv: false,
        trust_score: 0.92,
        response_time_ms: 2500,
        error_rate: 0.0,
      },
      created_at: new Date('2024-01-01T00:03:00Z').toISOString(),
    },
    {
      id: 'event-5',
      kind: 'vam_outcome',
      payload: {
        verified: false,
        verifier_equiv: false,
        trust_score: 0.8,
        response_time_ms: 4000,
        error_rate: 0.1,
      },
      created_at: new Date('2024-01-01T00:04:00Z').toISOString(),
    },
  ];

  describe('analyzeVAM', () => {
    it('should calculate correct VAM metrics', () => {
      const result = analyzeVAM(mockAnalyticsEvents);

      expect(result).toMatchObject({
        total_events: 5,
        verified_count: 3,
        verifier_equiv_count: 2,
        error_count: 1,
        avg_response_time_ms: 2600,
        avg_trust_score: 0.9,
        verified_share: 0.6, // 3/5
        verifier_equiv_rate: 0.4, // 2/5
        error_rate: 0.2, // 1/5
        abstain_rate: 0.4, // 2/5 (verified: false)
      });
    });

    it('should handle empty events array', () => {
      const result = analyzeVAM([]);

      expect(result).toMatchObject({
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
      });
    });

    it('should handle events with missing fields', () => {
      const incompleteEvents = [
        {
          id: 'event-1',
          kind: 'vam_outcome',
          payload: {
            verified: true,
            // Missing other fields
          },
          created_at: new Date().toISOString(),
        },
      ];

      const result = analyzeVAM(incompleteEvents);

      expect(result.total_events).toBe(1);
      expect(result.verified_count).toBe(1);
      expect(result.verifier_equiv_count).toBe(0);
      expect(result.error_count).toBe(0);
    });

    it('should filter events by time window', () => {
      const now = new Date('2024-01-01T00:05:00Z');
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const result = analyzeVAM(mockAnalyticsEvents, oneHourAgo, now);

      expect(result.total_events).toBe(5);
    });

    it('should filter events by exam variant', () => {
      const eventsWithVariant = mockAnalyticsEvents.map(event => ({
        ...event,
        payload: {
          ...event.payload,
          exam_variant: 'calc_ab',
        },
      }));

      const result = analyzeVAM(eventsWithVariant, undefined, undefined, 'calc_ab');

      expect(result.total_events).toBe(5);
    });

    it('should calculate abstain rate correctly', () => {
      const result = analyzeVAM(mockAnalyticsEvents);

      // Abstain rate = (total - verified) / total
      expect(result.abstain_rate).toBe(0.4); // (5 - 3) / 5
    });

    it('should calculate error rate correctly', () => {
      const result = analyzeVAM(mockAnalyticsEvents);

      // Error rate = error_count / total
      expect(result.error_rate).toBe(0.2); // 1 / 5
    });

    it('should calculate average response time correctly', () => {
      const result = analyzeVAM(mockAnalyticsEvents);

      // Average response time = (2000 + 1500 + 3000 + 2500 + 4000) / 5
      expect(result.avg_response_time_ms).toBe(2600);
    });

    it('should calculate average trust score correctly', () => {
      const result = analyzeVAM(mockAnalyticsEvents);

      // Average trust score = (0.95 + 0.98 + 0.85 + 0.92 + 0.80) / 5
      expect(result.avg_trust_score).toBe(0.9);
    });
  });

  describe('VAMAnalysis interface', () => {
    it('should have correct structure', () => {
      const result = analyzeVAM(mockAnalyticsEvents);

      expect(result).toHaveProperty('total_events');
      expect(result).toHaveProperty('verified_count');
      expect(result).toHaveProperty('verifier_equiv_count');
      expect(result).toHaveProperty('error_count');
      expect(result).toHaveProperty('avg_response_time_ms');
      expect(result).toHaveProperty('avg_trust_score');
      expect(result).toHaveProperty('verified_share');
      expect(result).toHaveProperty('verifier_equiv_rate');
      expect(result).toHaveProperty('error_rate');
      expect(result).toHaveProperty('abstain_rate');
    });

    it('should have numeric values', () => {
      const result = analyzeVAM(mockAnalyticsEvents);

      expect(typeof result.total_events).toBe('number');
      expect(typeof result.verified_count).toBe('number');
      expect(typeof result.verifier_equiv_count).toBe('number');
      expect(typeof result.error_count).toBe('number');
      expect(typeof result.avg_response_time_ms).toBe('number');
      expect(typeof result.avg_trust_score).toBe('number');
      expect(typeof result.verified_share).toBe('number');
      expect(typeof result.verifier_equiv_rate).toBe('number');
      expect(typeof result.error_rate).toBe('number');
      expect(typeof result.abstain_rate).toBe('number');
    });
  });
});
