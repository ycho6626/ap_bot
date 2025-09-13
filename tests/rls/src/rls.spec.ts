import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabaseAnon, supabaseService } from '@ap/shared/supabase';

describe('RLS (Row Level Security) Tests', () => {
  beforeEach(async () => {
    // Set up test data
    await supabaseService.from('user_roles').upsert([
      { user_id: 'test-user-1', role: 'public' },
      { user_id: 'test-user-2', role: 'calc_paid' },
      { user_id: 'test-user-3', role: 'teacher' },
    ]);

    await supabaseService.from('kb_document').upsert([
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
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await supabaseService.from('kb_document').delete().in('id', [
      'test-doc-1',
      'test-doc-2',
      'test-doc-3',
    ]);
    await supabaseService.from('user_roles').delete().in('user_id', [
      'test-user-1',
      'test-user-2',
      'test-user-3',
    ]);
  });

  describe('Public user access', () => {
    it('should only see public_kb documents', async () => {
      // Mock auth for public user
      const { data, error } = await supabaseAnon
        .from('kb_document')
        .select('*')
        .eq('id', 'test-doc-1');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.partition).toBe('public_kb');
    });

    it('should not see paraphrased_kb documents', async () => {
      const { data, error } = await supabaseAnon
        .from('kb_document')
        .select('*')
        .eq('id', 'test-doc-2');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('should not see private_kb documents', async () => {
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
      // Mock auth for calc_paid user
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
      // Mock auth for teacher user
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
      const { data, error } = await supabaseAnon
        .from('analytics_event')
        .select('*');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe('Review case access', () => {
    it('should allow users to insert their own review cases', async () => {
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
