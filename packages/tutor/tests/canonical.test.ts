import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanonicalManager } from '../src/canonical';
import { supabaseService } from '@ap/shared';

// Mock @ap/shared
vi.mock('@ap/shared', () => ({
  supabaseService: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          or: vi.fn(() => ({
            in: vi.fn(() => ({
              not: vi.fn(() => ({
                limit: vi.fn(() =>
                  Promise.resolve({
                    data: [],
                    error: null,
                  })
                ),
              })),
            })),
          })),
        })),
        single: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: 'PGRST116' },
          })
        ),
      })),
    })),
  },
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  traceDatabaseOperation: vi.fn((name, table, fn) => fn()),
}));

describe('CanonicalManager', () => {
  let manager: CanonicalManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock query builder that returns itself for chaining
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    (supabaseService as any).from = vi.fn().mockReturnValue(mockQuery);

    manager = new CanonicalManager();
  });

  describe('findBestCanonical', () => {
    it('should find best canonical solution', async () => {
      const mockData = [
        {
          id: '1',
          subject: 'calc',
          exam_variant: 'calc_ab',
          unit: 'Unit 1',
          skill: 'Derivatives',
          problem_key: 'derivative_power_rule',
          question_template: 'Find the derivative of f(x) = x^2',
          steps: [
            {
              step: 1,
              description: 'Apply the power rule',
              work: 'd/dx(x^2) = 2x',
            },
          ],
          final_answer: '2x',
          rubric: {},
          tags: ['derivatives', 'power_rule'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Override the mock to return our test data
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      // Make the queryBuilder itself awaitable
      Object.setPrototypeOf(mockQuery, Promise.prototype);
      mockQuery.then = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabaseService as any).from = vi.fn().mockReturnValue(mockQuery);

      const result = await manager.findBestCanonical('How to find the derivative of x^2?', {
        examVariant: 'calc_ab',
      });

      expect(result).toBeTruthy();
      expect(result!.solution.id).toBe('1');
      expect(result!.score).toBeGreaterThan(0);
    });

    it('should return null when no solutions found', async () => {
      // Override the mock to return empty data
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      // Make the queryBuilder itself awaitable
      Object.setPrototypeOf(mockQuery, Promise.prototype);
      mockQuery.then = vi.fn().mockResolvedValue({ data: [], error: null });

      (supabaseService as any).from = vi.fn().mockReturnValue(mockQuery);

      const result = await manager.findBestCanonical('Unknown topic', {
        examVariant: 'calc_ab',
      });

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Override the mock to return an error
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      // Make the queryBuilder itself awaitable
      Object.setPrototypeOf(mockQuery, Promise.prototype);
      mockQuery.then = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Database error' } });

      (supabaseService as any).from = vi.fn().mockReturnValue(mockQuery);

      await expect(manager.findBestCanonical('test query')).rejects.toThrow(
        'Canonical solution search failed: Database error'
      );
    });
  });

  describe('calculateRelevance', () => {
    it('should calculate relevance based on content match', () => {
      const solution = {
        id: '1',
        subject: 'calc',
        exam_variant: 'calc_ab' as const,
        unit: 'Unit 1',
        skill: 'Derivatives',
        problem_key: 'derivative_basic',
        question_template: 'This is about derivatives and rates of change',
        steps: [
          {
            step: 1,
            description: 'Apply the derivative rules',
            work: "d/dx(f(x)) = f'(x)",
          },
        ],
        final_answer: "f'(x)",
        rubric: {},
        tags: ['derivatives', 'basic'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const relevance = (manager as any).calculateRelevance(
        solution,
        'derivatives rate of change',
        'calc_ab'
      );
      expect(relevance).toBeGreaterThanOrEqual(0.5);
    });

    it('should boost exact variant match', () => {
      const solution = {
        id: '1',
        subject: 'calc',
        exam_variant: 'calc_ab' as const,
        unit: 'Unit 1',
        skill: 'Test',
        problem_key: 'test_problem',
        question_template: 'test content',
        steps: [
          {
            step: 1,
            description: 'Test step',
            work: 'test work',
          },
        ],
        final_answer: 'test answer',
        rubric: {},
        tags: ['test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const relevance = (manager as any).calculateRelevance(solution, 'test', 'calc_ab');
      expect(relevance).toBeGreaterThan(0.2); // Should include variant boost
    });

    it('should give medium boost to null variant', () => {
      const solution = {
        id: '1',
        subject: 'calc',
        exam_variant: null,
        unit: 'Unit 1',
        skill: 'Test',
        problem_key: 'test_problem',
        question_template: 'test content',
        steps: [
          {
            step: 1,
            description: 'Test step',
            work: 'test work',
          },
        ],
        final_answer: 'test answer',
        rubric: {},
        tags: ['test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const relevance = (manager as any).calculateRelevance(solution, 'test', 'calc_ab');
      expect(relevance).toBeGreaterThan(0.1); // Should include null variant boost
    });
  });

  describe('formatSteps', () => {
    it('should format step-by-step solutions', () => {
      const solution = {
        id: '1',
        subject: 'calc',
        exam_variant: 'calc_ab' as const,
        unit: 'Unit 1',
        skill: 'Test',
        problem_key: 'test_problem',
        question_template: 'Find the derivative of f(x) = x^2',
        steps: [
          {
            step: 1,
            description: 'Find the derivative\nApply the power rule',
            work: 'd/dx(x^2) = 2x',
          },
          {
            step: 2,
            description: 'Simplify\nget 2x',
            work: '2x',
          },
        ],
        final_answer: '2x',
        rubric: {},
        tags: ['test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const steps = manager.formatSteps(solution);
      expect(steps).toHaveLength(2);
      expect(steps[0].step).toBe(1);
      expect(steps[0].description).toContain('Find the derivative');
      expect(steps[1].step).toBe(2);
      expect(steps[1].description).toContain('Simplify');
    });

    it('should handle solutions without structured steps', () => {
      const solution = {
        id: '1',
        subject: 'calc',
        exam_variant: 'calc_ab' as const,
        unit: 'Unit 1',
        skill: 'Test',
        problem_key: 'test_problem',
        question_template: 'Test question',
        steps: [],
        final_answer: 'This is just a regular solution without steps',
        rubric: {},
        tags: ['test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const steps = manager.formatSteps(solution);
      expect(steps).toHaveLength(1);
      expect(steps[0].step).toBe(1);
      expect(steps[0].description).toBe('Solution');
      expect(steps[0].work).toBe('This is just a regular solution without steps');
    });

    it('should extract justifications', () => {
      const solution = {
        id: '1',
        subject: 'calc',
        exam_variant: 'calc_ab' as const,
        unit: 'Unit 1',
        skill: 'Test',
        problem_key: 'test_problem',
        question_template: 'Test question',
        steps: [
          {
            step: 1,
            description: 'Find the derivative\nApply the power rule because it is a polynomial',
            work: 'd/dx(x^2) = 2x',
          },
          {
            step: 2,
            description: 'Simplify',
            work: '2x',
          },
        ],
        final_answer: '2x',
        rubric: {},
        tags: ['test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const steps = manager.formatSteps(solution);
      expect(steps[0].justification).toContain('because it is a polynomial');
    });

    it('should extract theorem references', () => {
      const solution = {
        id: '1',
        subject: 'calc',
        exam_variant: 'calc_ab' as const,
        unit: 'Unit 1',
        skill: 'Test',
        problem_key: 'test_problem',
        question_template: 'Test question',
        steps: [
          {
            step: 1,
            description:
              'Apply the Mean Value Theorem\nThis guarantees a point where the derivative equals the average rate of change',
            work: 'MVT application',
          },
        ],
        final_answer: 'MVT result',
        rubric: {},
        tags: ['test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const steps = manager.formatSteps(solution);
      expect(steps[0].theorem).toBe('Mean Value Theorem');
    });
  });

  describe('getCanonicalById', () => {
    it('should get canonical solution by ID', async () => {
      const mockData = {
        id: '1',
        content: 'Test solution',
        title: 'Test',
        subject: 'calc',
        exam_variant: 'calc_ab',
        topic: 'test',
        subtopic: 'test',
        difficulty: 'easy',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Override the mock to return our test data
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        or: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      (supabaseService as any).from = vi.fn().mockReturnValue(mockQuery);

      const result = await manager.getCanonicalById('1');
      expect(result).toEqual(mockData);
    });

    it('should return null for non-existent ID', async () => {
      // Override the mock to return not found error
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        or: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      (supabaseService as any).from = vi.fn().mockReturnValue(mockQuery);

      const result = await manager.getCanonicalById('nonexistent');
      expect(result).toBeNull();
    });
  });
});
