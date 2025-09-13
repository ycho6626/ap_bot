#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { coach } from '@ap/tutor';
import { logger } from '@ap/shared';

// Schema for golden test items
const GoldenItemSchema = z.object({
  id: z.string(),
  exam_variant: z.enum(['calc_ab', 'calc_bc']),
  question: z.string(),
  expected_answer: z.string(),
  expected_justification: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  topic: z.string(),
});

// Schema for trap test items
const TrapItemSchema = z.object({
  id: z.string(),
  exam_variant: z.enum(['calc_ab', 'calc_bc']),
  question: z.string(),
  expected_answer: z.string(),
  trap_type: z.string(),
  wrong_answer: z.string(),
  description: z.string(),
});

type GoldenItem = z.infer<typeof GoldenItemSchema>;
type TrapItem = z.infer<typeof TrapItemSchema>;

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

interface HarnessConfig {
  mockOpenAI: boolean;
  maxConcurrency: number;
  timeoutMs: number;
}

/**
 * Loads golden test items from JSONL file
 */
function loadGoldenItems(filePath: string): GoldenItem[] {
  const content = readFileSync(filePath, 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return GoldenItemSchema.parse(JSON.parse(line));
      } catch (error) {
        logger.error('Failed to parse golden item', { line, error });
        throw error;
      }
    });
}

/**
 * Loads trap test items from JSONL file
 */
function loadTrapItems(filePath: string): TrapItem[] {
  const content = readFileSync(filePath, 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return TrapItemSchema.parse(JSON.parse(line));
      } catch (error) {
        logger.error('Failed to parse trap item', { line, error });
        throw error;
      }
    });
}

/**
 * Runs a single test item through the tutor
 */
async function runTestItem(
  item: GoldenItem | TrapItem,
  _config: HarnessConfig
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await coach({
      question: item.question,
      exam_variant: item.exam_variant,
      user_id: 'qa-harness',
      session_id: `test-${item.id}`,
    });

    const responseTime = Date.now() - startTime;

    return {
      id: item.id,
      exam_variant: item.exam_variant,
      question: item.question,
      expected_answer: item.expected_answer,
      actual_answer: response.answer,
      is_verified: response.is_verified,
      trust_score: response.trust_score,
      verifier_equiv: response.verifier_equiv,
      response_time_ms: responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      id: item.id,
      exam_variant: item.exam_variant,
      question: item.question,
      expected_answer: item.expected_answer,
      actual_answer: '',
      is_verified: false,
      trust_score: 0,
      verifier_equiv: false,
      response_time_ms: responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Runs the QA harness with specified configuration
 */
export async function runHarness(config: HarnessConfig = {
  mockOpenAI: true,
  maxConcurrency: 5,
  timeoutMs: 30000,
}): Promise<{
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
}> {
  logger.info('Starting QA harness', { config });

  // Load test data
  const goldenItems = loadGoldenItems(join(__dirname, '../data/gold/ap_calc.jsonl'));
  const trapItems = loadTrapItems(join(__dirname, '../data/traps.jsonl'));

  logger.info('Loaded test data', {
    golden_count: goldenItems.length,
    trap_count: trapItems.length,
  });

  // Run golden tests
  logger.info('Running golden tests...');
  const goldenResults: TestResult[] = [];
  
  for (let i = 0; i < goldenItems.length; i += config.maxConcurrency) {
    const batch = goldenItems.slice(i, i + config.maxConcurrency);
    const batchPromises = batch.map(item => runTestItem(item, config));
    const batchResults = await Promise.all(batchPromises);
    goldenResults.push(...batchResults);
    
    logger.info('Golden batch completed', {
      completed: Math.min(i + config.maxConcurrency, goldenItems.length),
      total: goldenItems.length,
    });
  }

  // Run trap tests
  logger.info('Running trap tests...');
  const trapResults: TestResult[] = [];
  
  for (let i = 0; i < trapItems.length; i += config.maxConcurrency) {
    const batch = trapItems.slice(i, i + config.maxConcurrency);
    const batchPromises = batch.map(item => runTestItem(item, config));
    const batchResults = await Promise.all(batchPromises);
    trapResults.push(...batchResults);
    
    logger.info('Trap batch completed', {
      completed: Math.min(i + config.maxConcurrency, trapItems.length),
      total: trapItems.length,
    });
  }

  // Calculate summary statistics
  const allResults = [...goldenResults, ...trapResults];
  const verifiedCount = allResults.filter(r => r.is_verified).length;
  const verifierEquivCount = allResults.filter(r => r.verifier_equiv).length;
  const errorCount = allResults.filter(r => r.error).length;
  const avgResponseTime = allResults.reduce((sum, r) => sum + r.response_time_ms, 0) / allResults.length;

  const summary = {
    total_tests: allResults.length,
    verified_count: verifiedCount,
    verifier_equiv_count: verifierEquivCount,
    verified_share: verifiedCount / allResults.length,
    verifier_equiv_rate: verifierEquivCount / allResults.length,
    avg_response_time_ms: Math.round(avgResponseTime),
    error_count: errorCount,
  };

  logger.info('QA harness completed', summary);

  return {
    golden: goldenResults,
    traps: trapResults,
    summary,
  };
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: HarnessConfig = {
    mockOpenAI: process.env['MOCK_OPENAI'] !== 'false',
    maxConcurrency: parseInt(process.env['MAX_CONCURRENCY'] || '5'),
    timeoutMs: parseInt(process.env['TIMEOUT_MS'] || '30000'),
  };

  runHarness(config)
    .then(results => {
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      logger.error('Harness failed', { error });
      process.exit(1);
    });
}
