#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@ap/shared';

interface TestResult {
  id: string;
  exam_variant: 'calc_ab' | 'calc_bc';
  question: string;
  expected_answer: string;
  actual_answer: string;
  is_verified: boolean;
  trust_score: number;
  verifier_equiv: boolean;
  response_time_ms: number;
  error?: string;
}

interface HarnessResults {
  golden: TestResult[];
  traps: TestResult[];
  summary: {
    total_tests: number;
    verified_count: number;
    verifier_equiv_count: number;
    verified_share: number;
    verifier_equiv_rate: number;
    avg_response_time_ms: number;
    error_count: number;
  };
}

interface QualityGates {
  min_verified_share: number;
  min_verifier_equiv: number;
  max_avg_response_time_ms: number;
  max_error_rate: number;
}

/**
 * Loads harness results from JSON file
 */
function loadResults(filePath: string): HarnessResults {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.error('Failed to load results', { filePath, error });
    throw error;
  }
}

/**
 * Analyzes results by exam variant
 */
function analyzeByVariant(results: TestResult[]) {
  const variants = ['calc_ab', 'calc_bc'] as const;
  const analysis: Record<string, any> = {};

  for (const variant of variants) {
    const variantResults = results.filter(r => r.exam_variant === variant);
    if (variantResults.length === 0) continue;

    const verifiedCount = variantResults.filter(r => r.is_verified).length;
    const verifierEquivCount = variantResults.filter(r => r.verifier_equiv).length;
    const errorCount = variantResults.filter(r => r.error).length;
    const avgResponseTime = variantResults.reduce((sum, r) => sum + r.response_time_ms, 0) / variantResults.length;

    analysis[variant] = {
      total_tests: variantResults.length,
      verified_count: verifiedCount,
      verifier_equiv_count: verifierEquivCount,
      verified_share: verifiedCount / variantResults.length,
      verifier_equiv_rate: verifierEquivCount / variantResults.length,
      avg_response_time_ms: Math.round(avgResponseTime),
      error_count: errorCount,
      error_rate: errorCount / variantResults.length,
    };
  }

  return analysis;
}

/**
 * Analyzes results by difficulty level (for golden tests)
 */
/*
function analyzeByDifficulty(results: TestResult[]) {
  const difficulties = ['easy', 'medium', 'hard'];
  const analysis: Record<string, any> = {};

  for (const difficulty of difficulties) {
    // Note: This assumes difficulty is available in the test results
    // In practice, you might need to map test IDs to difficulty levels
    const difficultyResults = results; // Placeholder - would need difficulty mapping
    
    if (difficultyResults.length === 0) continue;

    const verifiedCount = difficultyResults.filter(r => r.is_verified).length;
    const verifierEquivCount = difficultyResults.filter(r => r.verifier_equiv).length;

    analysis[difficulty] = {
      total_tests: difficultyResults.length,
      verified_share: verifiedCount / difficultyResults.length,
      verifier_equiv_rate: verifierEquivCount / difficultyResults.length,
    };
  }

  return analysis;
}
*/

/**
 * Identifies failed tests for detailed analysis
 */
function identifyFailures(results: TestResult[]) {
  const failures = {
    verification_failures: results.filter(r => !r.is_verified && !r.error),
    verifier_mismatches: results.filter(r => r.is_verified && !r.verifier_equiv),
    errors: results.filter(r => r.error),
    slow_responses: results.filter(r => r.response_time_ms > 10000), // > 10s
  };

  return failures;
}

/**
 * Checks if results meet quality gates
 */
function checkQualityGates(
  results: HarnessResults,
  gates: QualityGates = {
    min_verified_share: 0.985,
    min_verifier_equiv: 0.99,
    max_avg_response_time_ms: 5000,
    max_error_rate: 0.01,
  }
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  if (results.summary.verified_share < gates.min_verified_share) {
    failures.push(
      `Verified share ${results.summary.verified_share.toFixed(4)} below threshold ${gates.min_verified_share}`
    );
  }

  if (results.summary.verifier_equiv_rate < gates.min_verifier_equiv) {
    failures.push(
      `Verifier equivalence ${results.summary.verifier_equiv_rate.toFixed(4)} below threshold ${gates.min_verifier_equiv}`
    );
  }

  if (results.summary.avg_response_time_ms > gates.max_avg_response_time_ms) {
    failures.push(
      `Average response time ${results.summary.avg_response_time_ms}ms exceeds threshold ${gates.max_avg_response_time_ms}ms`
    );
  }

  const errorRate = results.summary.error_count / results.summary.total_tests;
  if (errorRate > gates.max_error_rate) {
    failures.push(
      `Error rate ${errorRate.toFixed(4)} exceeds threshold ${gates.max_error_rate}`
    );
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Generates a comprehensive report
 */
export function generateReport(results: HarnessResults): string {
  const goldenAnalysis = analyzeByVariant(results.golden);
  const trapAnalysis = analyzeByVariant(results.traps);
  const goldenFailures = identifyFailures(results.golden);
  const trapFailures = identifyFailures(results.traps);
  const gateCheck = checkQualityGates(results);

  const report = `
# QA Harness Report

## Summary
- **Total Tests**: ${results.summary.total_tests}
- **Verified Count**: ${results.summary.verified_count}
- **Verifier Equiv Count**: ${results.summary.verifier_equiv_count}
- **Verified Share**: ${(results.summary.verified_share * 100).toFixed(2)}%
- **Verifier Equiv Rate**: ${(results.summary.verifier_equiv_rate * 100).toFixed(2)}%
- **Average Response Time**: ${results.summary.avg_response_time_ms}ms
- **Error Count**: ${results.summary.error_count}

## Quality Gates
- **Status**: ${gateCheck.passed ? '✅ PASSED' : '❌ FAILED'}
${gateCheck.failures.length > 0 ? `- **Failures**:\n${gateCheck.failures.map(f => `  - ${f}`).join('\n')}` : ''}

## Golden Tests Analysis
${Object.entries(goldenAnalysis).map(([variant, stats]) => `
### ${variant.toUpperCase()}
- Total: ${stats.total_tests}
- Verified Share: ${(stats.verified_share * 100).toFixed(2)}%
- Verifier Equiv Rate: ${(stats.verifier_equiv_rate * 100).toFixed(2)}%
- Avg Response Time: ${stats.avg_response_time_ms}ms
- Errors: ${stats.error_count} (${(stats.error_rate * 100).toFixed(2)}%)
`).join('')}

## Trap Tests Analysis
${Object.entries(trapAnalysis).map(([variant, stats]) => `
### ${variant.toUpperCase()}
- Total: ${stats.total_tests}
- Verified Share: ${(stats.verified_share * 100).toFixed(2)}%
- Verifier Equiv Rate: ${(stats.verifier_equiv_rate * 100).toFixed(2)}%
- Avg Response Time: ${stats.avg_response_time_ms}ms
- Errors: ${stats.error_count} (${(stats.error_rate * 100).toFixed(2)}%)
`).join('')}

## Failure Analysis

### Golden Test Failures
- Verification Failures: ${goldenFailures.verification_failures.length}
- Verifier Mismatches: ${goldenFailures.verifier_mismatches.length}
- Errors: ${goldenFailures.errors.length}
- Slow Responses (>10s): ${goldenFailures.slow_responses.length}

### Trap Test Failures
- Verification Failures: ${trapFailures.verification_failures.length}
- Verifier Mismatches: ${trapFailures.verifier_mismatches.length}
- Errors: ${trapFailures.errors.length}
- Slow Responses (>10s): ${trapFailures.slow_responses.length}

## Detailed Failures
${goldenFailures.verification_failures.length > 0 ? `
### Golden Verification Failures
${goldenFailures.verification_failures.slice(0, 10).map(f => 
  `- ${f.id}: Expected "${f.expected_answer}", Got "${f.actual_answer}" (Trust: ${f.trust_score.toFixed(3)})`
).join('\n')}
${goldenFailures.verification_failures.length > 10 ? `... and ${goldenFailures.verification_failures.length - 10} more` : ''}
` : ''}

${trapFailures.verification_failures.length > 0 ? `
### Trap Verification Failures
${trapFailures.verification_failures.slice(0, 10).map(f => 
  `- ${f.id}: Expected "${f.expected_answer}", Got "${f.actual_answer}" (Trust: ${f.trust_score.toFixed(3)})`
).join('\n')}
${trapFailures.verification_failures.length > 10 ? `... and ${trapFailures.verification_failures.length - 10} more` : ''}
` : ''}

${goldenFailures.errors.length > 0 ? `
### Errors
${goldenFailures.errors.slice(0, 5).map(f => 
  `- ${f.id}: ${f.error}`
).join('\n')}
${goldenFailures.errors.length > 5 ? `... and ${goldenFailures.errors.length - 5} more` : ''}
` : ''}
`;

  return report.trim();
}

/**
 * Saves report to file
 */
export function saveReport(report: string, outputPath: string): void {
  writeFileSync(outputPath, report, 'utf-8');
  logger.info('Report saved', { outputPath });
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const resultsPath = process.argv[2] || join(__dirname, '../results.json');
  const outputPath = process.argv[3] || join(__dirname, '../report.md');

  try {
    const results = loadResults(resultsPath);
    const report = generateReport(results);
    
    console.log(report);
    saveReport(report, outputPath);
    
    // Exit with error code if gates failed
    const gateCheck = checkQualityGates(results);
    process.exit(gateCheck.passed ? 0 : 1);
  } catch (error) {
    logger.error('Report generation failed', { error });
    process.exit(1);
  }
}
