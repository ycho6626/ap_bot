import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';
import type { KbDocument, KbCanonicalSolution, ReviewCase, UserRole } from './types';

// Database schema type definitions removed for now to simplify compilation

/**
 * Anonymous Supabase client for public operations
 */
export const supabaseAnon: SupabaseClient = createClient(
  config().SUPABASE_URL,
  config().SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

/**
 * Service role Supabase client for admin operations
 */
export const supabaseService: SupabaseClient = createClient(
  config().SUPABASE_URL,
  config().SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

/**
 * Default Supabase client (alias for service client)
 * @deprecated Use supabaseService or supabaseAnon explicitly
 */
export const supabase = supabaseService;

/**
 * Get user role by user ID
 * @param userId - User ID to get role for
 * @returns User role or 'public' if not found
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabaseService
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return 'public';
  }

  return (data as any).role as UserRole;
}

/**
 * Set user role
 * @param userId - User ID to set role for
 * @param role - Role to set
 */
export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabaseService.from('user_roles').upsert({
    user_id: userId,
    role,
  } as any);

  if (error) {
    throw new Error(`Failed to set user role: ${error.message}`);
  }
}

/**
 * Search knowledge base documents
 * @param query - Search query
 * @param examVariant - Exam variant filter
 * @param limit - Maximum number of results
 * @returns Array of matching documents
 */
export async function searchKbDocuments(
  query: string,
  examVariant?: string,
  limit = 10
): Promise<KbDocument[]> {
  let queryBuilder = supabaseAnon
    .from('kb_document')
    .select('*')
    .textSearch('content', query)
    .limit(limit);

  if (examVariant) {
    queryBuilder = queryBuilder.eq('exam_variant', examVariant);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    throw new Error(`Failed to search KB documents: ${error.message}`);
  }

  return data || [];
}

/**
 * Get knowledge base document by ID
 * @param id - Document ID
 * @returns Document or null if not found
 */
export async function getKbDocument(id: string): Promise<KbDocument | null> {
  const { data, error } = await supabaseAnon.from('kb_document').select('*').eq('id', id).single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Insert analytics event
 * @param kind - Event kind
 * @param payload - Event payload
 * @returns Created event ID
 */
export async function insertAnalyticsEvent(
  kind: string,
  payload: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabaseAnon
    .from('analytics_event')
    .insert({
      kind,
      payload,
    } as any)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert analytics event: ${error.message}`);
  }

  return (data as any).id;
}

/**
 * Get canonical solution by problem key
 * @param problemKey - Problem key to search for
 * @returns Canonical solution or null if not found
 */
export async function getCanonicalSolution(
  problemKey: string
): Promise<KbCanonicalSolution | null> {
  const { data, error } = await supabaseService
    .from('kb_canonical_solution')
    .select('*')
    .eq('problem_key', problemKey)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Create review case
 * @param reviewCase - Review case data
 * @returns Created review case ID
 */
export async function createReviewCase(
  reviewCase: Omit<ReviewCase, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const { data, error } = await supabaseAnon
    .from('review_case')
    .insert(reviewCase as any)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create review case: ${error.message}`);
  }

  return (data as any).id;
}

/**
 * Get review cases for a user
 * @param userId - User ID
 * @param status - Optional status filter
 * @returns Array of review cases
 */
export async function getReviewCases(userId: string, status?: string): Promise<ReviewCase[]> {
  let queryBuilder = supabaseAnon
    .from('review_case')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    queryBuilder = queryBuilder.eq('status', status);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    throw new Error(`Failed to get review cases: ${error.message}`);
  }

  return data || [];
}

/**
 * Update review case status
 * @param caseId - Review case ID
 * @param status - New status
 * @param actor - User ID of the actor
 * @param action - Action taken
 * @param details - Action details
 */
export async function updateReviewCaseStatus(
  caseId: string,
  status: string,
  actor: string,
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const { error: updateError } = await supabaseService
    .from('review_case')
    .update({ status } as any)
    .eq('id', caseId);

  if (updateError) {
    throw new Error(`Failed to update review case: ${updateError.message}`);
  }

  const { error: actionError } = await supabaseService.from('review_action').insert({
    case_id: caseId,
    actor,
    action,
    details,
  } as any);

  if (actionError) {
    throw new Error(`Failed to create review action: ${actionError.message}`);
  }
}
