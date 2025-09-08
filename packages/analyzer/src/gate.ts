#!/usr/bin/env tsx

import { z } from 'zod';
import { supabase } from '@ap/shared';
import { logger } from '@ap/shared';
import { analyzeVAM, VAMAnalysis } from './vam.js';

// Quality gate thresholds
const QUALITY_GATES = {
  min_verified_share: 0.985,
  min_verifier_equiv: 0.99,
  max_avg_response_time_ms: 5000,
  max_error_rate: 0.01,
  min_trust_score: 0.92,
} as const;

// Schema for gate configuration
const GateConfigSchema = z.object({
  environment: z.enum(['staging', 'production']),
  time_window_hours: z.number().positive().default(24),
  exam_variant: z.enum(['calc_ab', 'calc_bc']).optional(),
  custom_thresholds: z.object({
    min_verified_share: z.number().min(0).max(1).optional(),
    min_verifier_equiv: z.number().min(0).max(1).optional(),
    max_avg_response_time_ms: z.number().positive().optional(),
    max_error_rate: z.number().min(0).max(1).optional(),
    min_trust_score: z.number().min(0).max(1).optional(),
  }).optional(),
});

type GateConfig = z.infer<typeof GateConfigSchema>;

interface GateResult {
  passed: boolean;
  environment: string;
  time_window_hours: number;
  thresholds: typeof QUALITY_GATES;
  metrics: {
    verified_share: number;
    verifier_equiv_rate: number;
    avg_response_time_ms: number;
    error_rate: number;
    avg_trust_score: number;
  };
  failures: string[];
  warnings: string[];
  summary: string;
}

/**
 * Validates gate configuration
 */
function validateGateConfig(config: unknown): GateConfig {
  try {
    return GateConfigSchema.parse(config);
  } catch (error) {
    logger.error('Invalid gate configuration', { config, error });
    throw new Error(`Invalid gate configuration: ${error}`);
  }
}

/**
 * Applies custom thresholds to default gates
 */
function applyCustomThresholds(
  defaultGates: typeof QUALITY_GATES,
  customThresholds?: GateConfig['custom_thresholds']
): typeof QUALITY_GATES {
  if (!customThresholds) {
    return defaultGates;
  }

  return {
    min_verified_share: customThresholds.min_verified_share ?? defaultGates.min_verified_share,
    min_verifier_equiv: customThresholds.min_verifier_equiv ?? defaultGates.min_verifier_equiv,
    max_avg_response_time_ms: customThresholds.max_avg_response_time_ms ?? defaultGates.max_avg_response_time_ms,
    max_error_rate: customThresholds.max_error_rate ?? defaultGates.max_error_rate,
    min_trust_score: customThresholds.min_trust_score ?? defaultGates.min_trust_score,
  };
}

/**
 * Checks if metrics meet quality gates
 */
function checkQualityGates(
  analysis: VAMAnalysis,
  thresholds: typeof QUALITY_GATES
): { passed: boolean; failures: string[]; warnings: string[] } {
  const { overall } = analysis;
  const failures: string[] = [];
  const warnings: string[] = [];

  // Check verified share
  if (overall.verified_share < thresholds.min_verified_share) {
    failures.push(
      `Verified share ${overall.verified_share.toFixed(4)} below threshold ${thresholds.min_verified_share}`
    );
  } else if (overall.verified_share < thresholds.min_verified_share + 0.005) {
    warnings.push(
      `Verified share ${overall.verified_share.toFixed(4)} close to threshold ${thresholds.min_verified_share}`
    );
  }

  // Check verifier equivalence
  if (overall.verifier_equiv_rate < thresholds.min_verifier_equiv) {
    failures.push(
      `Verifier equivalence ${overall.verifier_equiv_rate.toFixed(4)} below threshold ${thresholds.min_verifier_equiv}`
    );
  } else if (overall.verifier_equiv_rate < thresholds.min_verifier_equiv + 0.005) {
    warnings.push(
      `Verifier equivalence ${overall.verifier_equiv_rate.toFixed(4)} close to threshold ${thresholds.min_verifier_equiv}`
    );
  }

  // Check response time
  if (overall.avg_response_time_ms > thresholds.max_avg_response_time_ms) {
    failures.push(
      `Average response time ${overall.avg_response_time_ms}ms exceeds threshold ${thresholds.max_avg_response_time_ms}ms`
    );
  } else if (overall.avg_response_time_ms > thresholds.max_avg_response_time_ms * 0.8) {
    warnings.push(
      `Average response time ${overall.avg_response_time_ms}ms approaching threshold ${thresholds.max_avg_response_time_ms}ms`
    );
  }

  // Check error rate
  const errorRate = overall.verification_failures / overall.total_requests;
  if (errorRate > thresholds.max_error_rate) {
    failures.push(
      `Error rate ${errorRate.toFixed(4)} exceeds threshold ${thresholds.max_error_rate}`
    );
  } else if (errorRate > thresholds.max_error_rate * 0.8) {
    warnings.push(
      `Error rate ${errorRate.toFixed(4)} approaching threshold ${thresholds.max_error_rate}`
    );
  }

  // Check trust score
  if (overall.avg_trust_score < thresholds.min_trust_score) {
    failures.push(
      `Average trust score ${overall.avg_trust_score.toFixed(4)} below threshold ${thresholds.min_trust_score}`
    );
  } else if (overall.avg_trust_score < thresholds.min_trust_score + 0.01) {
    warnings.push(
      `Average trust score ${overall.avg_trust_score.toFixed(4)} close to threshold ${thresholds.min_trust_score}`
    );
  }

  // Check for low sample size
  if (overall.total_requests < 100) {
    warnings.push(
      `Low sample size: ${overall.total_requests} requests (recommend at least 100 for reliable metrics)`
    );
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
  };
}

/**
 * Generates a summary of gate results
 */
function generateSummary(
  result: GateResult,
  analysis: VAMAnalysis
): string {
  const { passed, failures, warnings, metrics } = result;
  const { by_variant, trends } = analysis;

  let summary = `Quality Gate ${passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
  
  summary += `Environment: ${result.environment}\n`;
  summary += `Time Window: ${result.time_window_hours} hours\n`;
  summary += `Total Requests: ${analysis.overall.total_requests}\n\n`;

  summary += `Key Metrics:\n`;
  summary += `- Verified Share: ${(metrics.verified_share * 100).toFixed(2)}% (threshold: ${(result.thresholds.min_verified_share * 100).toFixed(1)}%)\n`;
  summary += `- Verifier Equiv: ${(metrics.verifier_equiv_rate * 100).toFixed(2)}% (threshold: ${(result.thresholds.min_verifier_equiv * 100).toFixed(1)}%)\n`;
  summary += `- Avg Response Time: ${metrics.avg_response_time_ms}ms (threshold: ${result.thresholds.max_avg_response_time_ms}ms)\n`;
  summary += `- Error Rate: ${(metrics.error_rate * 100).toFixed(2)}% (threshold: ${(result.thresholds.max_error_rate * 100).toFixed(1)}%)\n`;
  summary += `- Avg Trust Score: ${metrics.avg_trust_score.toFixed(3)} (threshold: ${result.thresholds.min_trust_score})\n\n`;

  if (by_variant.calc_ab.total_requests > 0 || by_variant.calc_bc.total_requests > 0) {
    summary += `By Variant:\n`;
    if (by_variant.calc_ab.total_requests > 0) {
      summary += `- Calc AB: ${(by_variant.calc_ab.verified_share * 100).toFixed(2)}% verified (${by_variant.calc_ab.total_requests} requests)\n`;
    }
    if (by_variant.calc_bc.total_requests > 0) {
      summary += `- Calc BC: ${(by_variant.calc_bc.verified_share * 100).toFixed(2)}% verified (${by_variant.calc_bc.total_requests} requests)\n`;
    }
    summary += `\n`;
  }

  summary += `Trends:\n`;
  summary += `- Verified Share: ${trends.verified_share_trend}\n`;
  summary += `- Response Time: ${trends.response_time_trend}\n\n`;

  if (failures.length > 0) {
    summary += `❌ Failures:\n`;
    failures.forEach(failure => summary += `- ${failure}\n`);
    summary += `\n`;
  }

  if (warnings.length > 0) {
    summary += `⚠️  Warnings:\n`;
    warnings.forEach(warning => summary += `- ${warning}\n`);
    summary += `\n`;
  }

  return summary.trim();
}

/**
 * Runs quality gates for deployment
 */
export async function runQualityGates(config: unknown): Promise<GateResult> {
  const gateConfig = validateGateConfig(config);
  const thresholds = applyCustomThresholds(QUALITY_GATES, gateConfig.custom_thresholds);

  logger.info('Running quality gates', {
    environment: gateConfig.environment,
    time_window_hours: gateConfig.time_window_hours,
    thresholds,
  });

  // Calculate time window
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - gateConfig.time_window_hours * 60 * 60 * 1000);

  // Run VAM analysis
  const analysis = await analyzeVAM(startDate, endDate, gateConfig.exam_variant);

  // Check quality gates
  const gateCheck = checkQualityGates(analysis, thresholds);

  const result: GateResult = {
    passed: gateCheck.passed,
    environment: gateConfig.environment,
    time_window_hours: gateConfig.time_window_hours,
    thresholds,
    metrics: {
      verified_share: analysis.overall.verified_share,
      verifier_equiv_rate: analysis.overall.verifier_equiv_rate,
      avg_response_time_ms: analysis.overall.avg_response_time_ms,
      error_rate: analysis.overall.verification_failures / analysis.overall.total_requests,
      avg_trust_score: analysis.overall.avg_trust_score,
    },
    failures: gateCheck.failures,
    warnings: gateCheck.warnings,
    summary: '',
  };

  result.summary = generateSummary(result, analysis);

  logger.info('Quality gates completed', {
    passed: result.passed,
    failures: result.failures.length,
    warnings: result.warnings.length,
  });

  return result;
}

/**
 * Runs quality gates with default configuration
 */
export async function runDefaultQualityGates(environment: 'staging' | 'production' = 'production'): Promise<GateResult> {
  return runQualityGates({
    environment,
    time_window_hours: 24,
  });
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const environment = (process.argv[2] as 'staging' | 'production') || 'production';
  const timeWindowHours = parseInt(process.argv[3] || '24');

  const config = {
    environment,
    time_window_hours: timeWindowHours,
  };

  runQualityGates(config)
    .then(result => {
      console.log(result.summary);
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      logger.error('Quality gates failed', { error });
      process.exit(1);
    });
}
