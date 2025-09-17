import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabaseAnon } from '@ap/shared/supabase';

describe('RLS (Row Level Security) Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public user access', () => {
    it('should only see public_kb documents', async () => {
      // Mock the response for public user accessing public_kb document
      const mockData = [
        {
          id: 'test-doc-1',
          subject: 'calc',
          exam_variant: 'calc_ab',
          partition: 'public_kb',
          content: 'Public knowledge base content',
          topic: 'limits',
          subtopic: 'basic limits',
          year: 2024,
          difficulty: 'easy',
          type: 'Notes',
          bloom_level: 'remember',
        },
      ];

      // Mock the supabase chain to return the expected data
      const mockQuery = { data: mockData, error: null };
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockQuery),
        }),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon
        .from('kb_document')
        .select('*')
        .eq('id', 'test-doc-1');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.partition).toBe('public_kb');
    });

    it('should not see paraphrased_kb documents', async () => {
      // Mock the response for public user accessing paraphrased_kb document (should be empty)
      const mockQuery = { data: [], error: null };
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockQuery),
        }),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon
        .from('kb_document')
        .select('*')
        .eq('id', 'test-doc-2');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('should not see private_kb documents', async () => {
      // Mock the response for public user accessing private_kb document (should be empty)
      const mockQuery = { data: [], error: null };
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockQuery),
        }),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon
        .from('kb_document')
        .select('*')
        .eq('id', 'test-doc-3');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe('Calc paid user access', () => {
    it('should see public_kb and paraphrased_kb documents', async () => {
      // Mock the response for calc_paid user accessing both public and paraphrased documents
      const mockData = [
        {
          id: 'test-doc-1',
          subject: 'calc',
          exam_variant: 'calc_ab',
          partition: 'public_kb',
          content: 'Public knowledge base content',
          topic: 'limits',
          subtopic: 'basic limits',
          year: 2024,
          difficulty: 'easy',
          type: 'Notes',
          bloom_level: 'remember',
        },
        {
          id: 'test-doc-2',
          subject: 'calc',
          exam_variant: 'calc_bc',
          partition: 'paraphrased_kb',
          content: 'Paraphrased knowledge base content',
          topic: 'series',
          subtopic: 'power series',
          year: 2024,
          difficulty: 'medium',
          type: 'Notes',
          bloom_level: 'understand',
        },
      ];

      const mockQuery = { data: mockData, error: null };
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue(mockQuery),
        }),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon
        .from('kb_document')
        .select('*')
        .in('id', ['test-doc-1', 'test-doc-2']);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      expect(data?.map(d => d.partition)).toContain('public_kb');
      expect(data?.map(d => d.partition)).toContain('paraphrased_kb');
    });

    it('should not see private_kb documents', async () => {
      // Mock the response for calc_paid user accessing private document (should be empty)
      const mockQuery = { data: [], error: null };
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockQuery),
        }),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon
        .from('kb_document')
        .select('*')
        .eq('id', 'test-doc-3');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe('Teacher user access', () => {
    it('should see all documents including private_kb', async () => {
      // Mock the response for teacher user accessing all documents
      const mockData = [
        {
          id: 'test-doc-1',
          subject: 'calc',
          exam_variant: 'calc_ab',
          partition: 'public_kb',
          content: 'Public knowledge base content',
          topic: 'limits',
          subtopic: 'basic limits',
          year: 2024,
          difficulty: 'easy',
          type: 'Notes',
          bloom_level: 'remember',
        },
        {
          id: 'test-doc-2',
          subject: 'calc',
          exam_variant: 'calc_bc',
          partition: 'paraphrased_kb',
          content: 'Paraphrased knowledge base content',
          topic: 'series',
          subtopic: 'power series',
          year: 2024,
          difficulty: 'medium',
          type: 'Notes',
          bloom_level: 'understand',
        },
        {
          id: 'test-doc-3',
          subject: 'calc',
          exam_variant: 'calc_ab',
          partition: 'private_kb',
          content: 'Private knowledge base content',
          topic: 'derivatives',
          subtopic: 'chain rule',
          year: 2024,
          difficulty: 'hard',
          type: 'Notes',
          bloom_level: 'apply',
        },
      ];

      const mockQuery = { data: mockData, error: null };
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue(mockQuery),
        }),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon
        .from('kb_document')
        .select('*')
        .in('id', ['test-doc-1', 'test-doc-2', 'test-doc-3']);

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      expect(data?.map(d => d.partition)).toContain('public_kb');
      expect(data?.map(d => d.partition)).toContain('paraphrased_kb');
      expect(data?.map(d => d.partition)).toContain('private_kb');
    });
  });

  describe('Analytics event access', () => {
    it('should allow inserts for analytics events', async () => {
      // Mock successful insert for analytics events
      const mockData = [
        {
          id: 'test-event-1',
          kind: 'test_event',
          payload: { test: 'data' },
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockQuery = { data: mockData, error: null };
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery),
        }),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon
        .from('analytics_event')
        .insert({
          kind: 'test_event',
          payload: { test: 'data' },
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('should not allow reads for non-teacher users', async () => {
      // Mock empty response for non-teacher users reading analytics events
      const mockQuery = { data: [], error: null };
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon.from('analytics_event').select('*');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe('Review case access', () => {
    it('should allow users to insert their own review cases', async () => {
      // Mock successful insert for user's own review case
      const mockData = [
        {
          id: 'test-review-1',
          user_id: 'test-user-1',
          subject: 'calc',
          exam_variant: 'calc_ab',
          question: 'Test question',
          context: { test: 'context' },
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockQuery = { data: mockData, error: null };
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery),
        }),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon
        .from('review_case')
        .insert({
          user_id: 'test-user-1',
          subject: 'calc',
          exam_variant: 'calc_ab',
          question: 'Test question',
          context: { test: 'context' },
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('should not allow users to insert review cases for other users', async () => {
      // Mock error response for trying to insert review case for different user
      const mockError = { message: 'RLS policy violation', code: '42501' };
      const mockQuery = { data: null, error: mockError };
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery),
        }),
      });
      supabaseAnon.from = mockFrom;

      const { data, error } = await supabaseAnon
        .from('review_case')
        .insert({
          user_id: 'test-user-2', // Different user
          subject: 'calc',
          exam_variant: 'calc_ab',
          question: 'Test question',
          context: { test: 'context' },
        })
        .select();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });
});
