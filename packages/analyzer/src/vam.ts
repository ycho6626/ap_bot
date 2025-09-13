#!/usr/bin/env tsx

import { z } from 'zod';
import { supabase } from '@ap/shared';
import { logger } from '@ap/shared';

// Schema for analytics events
const AnalyticsEventSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  session_id: z.string(),
  event_type: z.enum(['vam_outcome', 'abstain', 'verification_failure']),
  exam_variant: z.enum(['calc_ab', 'calc_bc']),
  is_verified: z.boolean(),
  trust_score: z.number().min(0).max(1),
  verifier_equiv: z.boolean().optional(),
  response_time_ms: z.number().positive(),
  created_at: z.string(),
  metadata: z.record(z.any()).optional(),
});

type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

interface VAMMetrics {
  total_requests: number;
  verified_count: number;
  abstain_count: number;
  verification_failures: number;
  verified_share: number;
  abstain_rate: number;
  avg_trust_score: number;
  avg_response_time_ms: number;
  verifier_equiv_count: number;
  verifier_equiv_rate: number;
}

export interface VAMAnalysis {
  overall: VAMMetrics;
  by_variant: Record<'calc_ab' | 'calc_bc', VAMMetrics>;
  by_time_period: {
    last_hour: VAMMetrics;
    last_day: VAMMetrics;
    last_week: VAMMetrics;
  };
  trends: {
    verified_share_trend: 'improving' | 'declining' | 'stable';
    response_time_trend: 'improving' | 'declining' | 'stable';
  };
}

/**
 * Fetches analytics events from the database
 */
async function fetchAnalyticsEvents(
  startDate?: Date,
  endDate?: Date,
  examVariant?: 'calc_ab' | 'calc_bc'
): Promise<AnalyticsEvent[]> {
  let query = supabase
    .from('analytics_event')
    .select('*')
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  if (examVariant) {
    query = query.eq('exam_variant', examVariant);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch analytics events', { error });
    throw error;
  }

  return data.map(event => AnalyticsEventSchema.parse(event));
}

/**
 * Calculates VAM metrics from analytics events
 */
function calculateVAMMetrics(events: AnalyticsEvent[]): VAMMetrics {
  if (events.length === 0) {
    return {
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
    };
  }

  const verifiedCount = events.filter(e => e.is_verified).length;
  const abstainCount = events.filter(e => e.event_type === 'abstain').length;
  const verificationFailures = events.filter(e => e.event_type === 'verification_failure').length;
  const verifierEquivCount = events.filter(e => e.verifier_equiv === true).length;

  const avgTrustScore = events.reduce((sum, e) => sum + e.trust_score, 0) / events.length;
  const avgResponseTime = events.reduce((sum, e) => sum + e.response_time_ms, 0) / events.length;

  return {
    total_requests: events.length,
    verified_count: verifiedCount,
    abstain_count: abstainCount,
    verification_failures: verificationFailures,
    verified_share: verifiedCount / events.length,
    abstain_rate: abstainCount / events.length,
    avg_trust_score: avgTrustScore,
    avg_response_time_ms: Math.round(avgResponseTime),
    verifier_equiv_count: verifierEquivCount,
    verifier_equiv_rate: verifierEquivCount / events.length,
  };
}

/**
 * Analyzes VAM performance by exam variant
 */
function analyzeByVariant(events: AnalyticsEvent[]): Record<'calc_ab' | 'calc_bc', VAMMetrics> {
  const abEvents = events.filter(e => e.exam_variant === 'calc_ab');
  const bcEvents = events.filter(e => e.exam_variant === 'calc_bc');

  return {
    calc_ab: calculateVAMMetrics(abEvents),
    calc_bc: calculateVAMMetrics(bcEvents),
  };
}

/**
 * Analyzes VAM performance by time period
 */
function analyzeByTimePeriod(events: AnalyticsEvent[]): VAMAnalysis['by_time_period'] {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const lastHourEvents = events.filter(e => new Date(e.created_at) >= oneHourAgo);
  const lastDayEvents = events.filter(e => new Date(e.created_at) >= oneDayAgo);
  const lastWeekEvents = events.filter(e => new Date(e.created_at) >= oneWeekAgo);

  return {
    last_hour: calculateVAMMetrics(lastHourEvents),
    last_day: calculateVAMMetrics(lastDayEvents),
    last_week: calculateVAMMetrics(lastWeekEvents),
  };
}

/**
 * Analyzes trends in VAM performance
 */
function analyzeTrends(events: AnalyticsEvent[]): VAMAnalysis['trends'] {
  if (events.length < 2) {
    return {
      verified_share_trend: 'stable',
      response_time_trend: 'stable',
    };
  }

  // Sort events by time
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Split into two halves for trend analysis
  const midpoint = Math.floor(sortedEvents.length / 2);
  const firstHalf = sortedEvents.slice(0, midpoint);
  const secondHalf = sortedEvents.slice(midpoint);

  const firstHalfMetrics = calculateVAMMetrics(firstHalf);
  const secondHalfMetrics = calculateVAMMetrics(secondHalf);

  const verifiedShareTrend =
    secondHalfMetrics.verified_share > firstHalfMetrics.verified_share
      ? 'improving'
      : secondHalfMetrics.verified_share < firstHalfMetrics.verified_share
        ? 'declining'
        : 'stable';

  const responseTimeTrend =
    secondHalfMetrics.avg_response_time_ms < firstHalfMetrics.avg_response_time_ms
      ? 'improving'
      : secondHalfMetrics.avg_response_time_ms > firstHalfMetrics.avg_response_time_ms
        ? 'declining'
        : 'stable';

  return {
    verified_share_trend: verifiedShareTrend,
    response_time_trend: responseTimeTrend,
  };
}

/**
 * Performs comprehensive VAM analysis
 */
export async function analyzeVAM(
  startDate?: Date,
  endDate?: Date,
  examVariant?: 'calc_ab' | 'calc_bc'
): Promise<VAMAnalysis> {
  logger.info('Starting VAM analysis', { startDate, endDate, examVariant });

  const events = await fetchAnalyticsEvents(startDate, endDate, examVariant);

  if (events.length === 0) {
    logger.warn('No analytics events found for the specified criteria');
  }

  const overall = calculateVAMMetrics(events);
  const byVariant = analyzeByVariant(events);
  const byTimePeriod = analyzeByTimePeriod(events);
  const trends = analyzeTrends(events);

  const analysis: VAMAnalysis = {
    overall,
    by_variant: byVariant,
    by_time_period: byTimePeriod,
    trends,
  };

  logger.info('VAM analysis completed', {
    total_events: events.length,
    verified_share: overall.verified_share,
    verifier_equiv_rate: overall.verifier_equiv_rate,
  });

  return analysis;
}

/**
 * Formats VAM analysis as a readable report
 */
export function formatVAMReport(analysis: VAMAnalysis): string {
  const { overall, by_variant, by_time_period, trends } = analysis;

  return `
# VAM Analysis Report

## Overall Metrics
- **Total Requests**: ${overall.total_requests}
- **Verified Share**: ${(overall.verified_share * 100).toFixed(2)}%
- **Abstain Rate**: ${(overall.abstain_rate * 100).toFixed(2)}%
- **Verifier Equiv Rate**: ${(overall.verifier_equiv_rate * 100).toFixed(2)}%
- **Avg Trust Score**: ${overall.avg_trust_score.toFixed(3)}
- **Avg Response Time**: ${overall.avg_response_time_ms}ms
- **Verification Failures**: ${overall.verification_failures}

## By Exam Variant

### Calc AB
- **Total Requests**: ${by_variant.calc_ab.total_requests}
- **Verified Share**: ${(by_variant.calc_ab.verified_share * 100).toFixed(2)}%
- **Verifier Equiv Rate**: ${(by_variant.calc_ab.verifier_equiv_rate * 100).toFixed(2)}%
- **Avg Response Time**: ${by_variant.calc_ab.avg_response_time_ms}ms

### Calc BC
- **Total Requests**: ${by_variant.calc_bc.total_requests}
- **Verified Share**: ${(by_variant.calc_bc.verified_share * 100).toFixed(2)}%
- **Verifier Equiv Rate**: ${(by_variant.calc_bc.verifier_equiv_rate * 100).toFixed(2)}%
- **Avg Response Time**: ${by_variant.calc_bc.avg_response_time_ms}ms

## Time Period Analysis

### Last Hour
- **Total Requests**: ${by_time_period.last_hour.total_requests}
- **Verified Share**: ${(by_time_period.last_hour.verified_share * 100).toFixed(2)}%
- **Avg Response Time**: ${by_time_period.last_hour.avg_response_time_ms}ms

### Last Day
- **Total Requests**: ${by_time_period.last_day.total_requests}
- **Verified Share**: ${(by_time_period.last_day.verified_share * 100).toFixed(2)}%
- **Avg Response Time**: ${by_time_period.last_day.avg_response_time_ms}ms

### Last Week
- **Total Requests**: ${by_time_period.last_week.total_requests}
- **Verified Share**: ${(by_time_period.last_week.verified_share * 100).toFixed(2)}%
- **Avg Response Time**: ${by_time_period.last_week.avg_response_time_ms}ms

## Trends
- **Verified Share Trend**: ${trends.verified_share_trend}
- **Response Time Trend**: ${trends.response_time_trend}
`;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const startDate = process.argv[2] ? new Date(process.argv[2]) : undefined;
  const endDate = process.argv[3] ? new Date(process.argv[3]) : undefined;
  const examVariant = process.argv[4] as 'calc_ab' | 'calc_bc' | undefined;

  analyzeVAM(startDate, endDate, examVariant)
    .then(analysis => {
      const report = formatVAMReport(analysis);
      console.log(report);
      process.exit(0);
    })
    .catch(error => {
      logger.error('VAM analysis failed', { error });
      process.exit(1);
    });
}
