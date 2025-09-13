import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridRetrieval } from '../src/retrieval/hybrid';
import {
  expandQuery,
  createSearchTerms,
  boostTermsByVariant,
  extractMathExpressions,
  normalizeMathNotation,
} from '../src/retrieval/query';
import { supabaseService } from '@ap/shared';

// Mock @ap/shared
vi.mock('@ap/shared', () => ({
  supabaseService: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        textSearch: vi.fn(() => ({
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
        })),
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

describe('HybridRetrieval', () => {
  let retrieval: HybridRetrieval;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a simple mock query builder that returns itself for chaining
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Make the queryBuilder itself awaitable
    Object.setPrototypeOf(mockQuery, Promise.prototype);
    mockQuery.then = vi.fn().mockResolvedValue({ data: [], error: null });

    (supabaseService as any).from = vi.fn().mockReturnValue(mockQuery);

    retrieval = new HybridRetrieval();
  });

  describe('search', () => {
    it('should perform hybrid search', async () => {
      const mockData = [
        {
          id: '1',
          content: 'Derivatives are rates of change',
          title: 'Introduction to Derivatives',
          subject: 'calc',
          exam_variant: 'calc_ab',
          partition: 'public_kb',
          topic: 'derivatives',
          subtopic: 'basic',
        },
      ];

      // Mock the database response
      // Override the mock to return our test data
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      // Make the queryBuilder itself awaitable
      Object.setPrototypeOf(mockQuery, Promise.prototype);
      mockQuery.then = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabaseService as any).from = vi.fn().mockReturnValue(mockQuery);

      const results = await retrieval.search('What is a derivative?', {
        examVariant: 'calc_ab',
        limit: 5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('1');
      expect(results[0].snippet).toContain('Derivatives are rates of change');
    });

    it('should handle search errors gracefully', async () => {
      // Override the mock to return an error
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      // Make the queryBuilder itself awaitable
      Object.setPrototypeOf(mockQuery, Promise.prototype);
      mockQuery.then = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Database error' } });

      (supabaseService as any).from = vi.fn().mockReturnValue(mockQuery);

      await expect(retrieval.search('test query')).rejects.toThrow(
        'Textual search failed: Database error'
      );
    });
  });

  describe('extractSnippet', () => {
    it('should extract relevant snippet', () => {
      const content =
        'This is a long document about derivatives. Derivatives are rates of change. They measure how fast a function changes.';
      const query = 'derivatives rate of change';

      const snippet = (retrieval as any).extractSnippet(content, query);

      expect(snippet).toContain('Derivatives are rates of change');
    });

    it('should fallback to first sentences if no matches', () => {
      const content =
        'This is a document about integrals. It explains how to calculate areas under curves.';
      const query = 'derivatives';

      const snippet = (retrieval as any).extractSnippet(content, query);

      expect(snippet).toContain('This is a document about integrals');
    });
  });

  describe('calculateVariantBoost', () => {
    it('should boost exact variant match', () => {
      const document = {
        id: '1',
        content: 'test',
        title: 'test',
        subject: 'calc',
        exam_variant: 'calc_ab' as const,
        partition: 'public_kb',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const boost = (retrieval as any).calculateVariantBoost(document, 'calc_ab');
      expect(boost).toBe(1.5);
    });

    it('should give medium boost to null variant', () => {
      const document = {
        id: '1',
        content: 'test',
        title: 'test',
        subject: 'calc',
        exam_variant: null,
        partition: 'public_kb',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const boost = (retrieval as any).calculateVariantBoost(document, 'calc_ab');
      expect(boost).toBe(1.2);
    });

    it('should give lower boost to other variant', () => {
      const document = {
        id: '1',
        content: 'test',
        title: 'test',
        subject: 'calc',
        exam_variant: 'calc_bc' as const,
        partition: 'public_kb',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const boost = (retrieval as any).calculateVariantBoost(document, 'calc_ab');
      expect(boost).toBe(0.8);
    });
  });
});

describe('Query Expansion', () => {
  describe('expandQuery', () => {
    it('should expand derivative terms', () => {
      const terms = expandQuery('derivative', 'calc_ab');
      expect(terms).toContain('derivative');
      expect(terms).toContain('rate of change');
      expect(terms).toContain('slope');
    });

    it('should expand integral terms', () => {
      const terms = expandQuery('integral', 'calc_ab');
      expect(terms).toContain('integral');
      expect(terms).toContain('antiderivative');
      expect(terms).toContain('primitive');
    });

    it('should include BC-specific terms for BC variant', () => {
      const terms = expandQuery('series', 'calc_bc');
      expect(terms).toContain('series');
      expect(terms).toContain('infinite sum');
      expect(terms).toContain('convergence');
    });

    it('should not include BC-specific terms for AB variant', () => {
      const terms = expandQuery('series', 'calc_ab');
      expect(terms).not.toContain('polar');
      expect(terms).not.toContain('parametric');
    });
  });

  describe('createSearchTerms', () => {
    it('should create comprehensive search terms', () => {
      const terms = createSearchTerms('Find the derivative of x^2', 'calc_ab');
      expect(terms).toContain('derivative');
      expect(terms).toContain('find');
      expect(terms).toContain('x^2');
    });

    it('should include problem type indicators', () => {
      const terms = createSearchTerms('Calculate the limit as x approaches 0', 'calc_ab');
      expect(terms).toContain('calculate');
      expect(terms).toContain('limit');
      expect(terms).toContain('approaches');
    });
  });

  describe('boostTermsByVariant', () => {
    it('should boost variant-specific terms', () => {
      const terms = ['derivative', 'series', 'polar'];
      const boosted = boostTermsByVariant(terms, 'calc_bc');

      const derivativeBoost = boosted.find(t => t.term === 'derivative');
      const seriesBoost = boosted.find(t => t.term === 'series');
      const polarBoost = boosted.find(t => t.term === 'polar');

      expect(derivativeBoost?.boost).toBe(1.3); // Core calculus term
      expect(seriesBoost?.boost).toBe(1.4); // BC-specific term
      expect(polarBoost?.boost).toBe(1.4); // BC-specific term
    });

    it('should give different boosts for AB vs BC', () => {
      const terms = ['series', 'polar', 'parametric'];
      const abBoosted = boostTermsByVariant(terms, 'calc_ab');
      const bcBoosted = boostTermsByVariant(terms, 'calc_bc');

      const abSeries = abBoosted.find(t => t.term === 'series');
      const bcSeries = bcBoosted.find(t => t.term === 'series');

      expect(abSeries?.boost).toBe(1.0); // No special boost for AB
      expect(bcSeries?.boost).toBe(1.4); // Special boost for BC
    });
  });

  describe('extractMathExpressions', () => {
    it('should extract mathematical expressions', () => {
      const text = 'f(x) = x^2 + 3x - 1 and g(x) = sin(x)';
      const expressions = extractMathExpressions(text);
      expect(expressions).toContain('f(x)');
      expect(expressions).toContain('g(x)');
      expect(expressions).toContain('x^2 + 3x - 1');
    });

    it('should extract derivatives', () => {
      const text = 'dy/dx = 2x and df/dx = 3x^2';
      const expressions = extractMathExpressions(text);
      expect(expressions).toContain('dy/dx');
      expect(expressions).toContain('df/dx');
    });

    it('should extract integrals', () => {
      const text = '∫x dx = x^2/2 + C';
      const expressions = extractMathExpressions(text);
      expect(expressions).toContain('∫x dx');
    });
  });

  describe('normalizeMathNotation', () => {
    it('should normalize mathematical notation', () => {
      const text = 'x**2 + 3*x - 1 = 0';
      const normalized = normalizeMathNotation(text);
      expect(normalized).toBe('x^2 + 3 * x - 1 = 0');
    });

    it('should normalize whitespace', () => {
      const text = 'x  +  3  *  y  =  5';
      const normalized = normalizeMathNotation(text);
      expect(normalized).toBe('x + 3 * y = 5');
    });

    it('should convert ** to ^', () => {
      const text = 'x**2 + y**3';
      const normalized = normalizeMathNotation(text);
      expect(normalized).toBe('x^2 + y^3');
    });
  });
});
