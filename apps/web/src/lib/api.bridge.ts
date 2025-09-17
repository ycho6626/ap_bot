/**
 * Resilient API Bridge Layer
 *
 * This module provides a unified interface for API calls, adapting existing
 * API helpers to the new naming convention while maintaining backward compatibility.
 *
 * All pages should import from this module instead of directly from api.ts
 */

import { createClient } from '@supabase/supabase-js';
import { reportError, reportWarning, reportInfo } from './logging';
import {
  apiClient,
  type CoachRequest,
  type CoachResponse,
  type KbSearchRequest,
  type KbSearchResponse,
  type UserProfile,
  type StripeCheckoutSession,
} from './api';
import type { UserRole } from '@ap/shared/types';

// Re-export types for convenience
export type {
  CoachRequest,
  CoachResponse,
  KbSearchRequest,
  KbSearchResponse,
  UserProfile,
  StripeCheckoutSession,
};

// Note: Response validation with Zod can be added later if needed

// Supabase client for authentication
const supabase = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? 'https://placeholder.supabase.co',
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? 'placeholder-key'
);

/**
 * Get the current Supabase session and extract JWT token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (error) {
    reportWarning('Failed to get auth session:', error);
    return null;
  }
}

/**
 * Fetch helper that adds authentication headers
 */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Search the knowledge base for relevant content
 */
export async function searchKB(
  query: string,
  variant: 'calc_ab' | 'calc_bc'
): Promise<KbSearchResponse> {
  const request: KbSearchRequest = {
    subject: 'calc',
    examVariant: variant,
    query: query.trim(),
    limit: 10,
    minScore: 0.1,
  };

  try {
    const response = await apiClient.searchKnowledgeBase(request);
    return response;
  } catch (error) {
    reportError('Knowledge base search failed:', error);
    throw new Error('Failed to search knowledge base');
  }
}

/**
 * Send a question to the coach and get a verified answer
 */
export async function coach(
  question: string,
  variant: 'calc_ab' | 'calc_bc'
): Promise<CoachResponse> {
  const request: CoachRequest = {
    subject: 'calc',
    examVariant: variant,
    mode: 'vam', // Use Verified Answer Mode by default
    question: question.trim(),
    context: {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
  };

  try {
    const response = await apiClient.askCoach(request);
    return response;
  } catch (error) {
    reportError('Coach request failed:', error);
    throw new Error('Failed to get coach response');
  }
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function startCheckout(priceId: string): Promise<StripeCheckoutSession> {
  try {
    return await apiClient.createCheckoutSession(priceId);
  } catch (error) {
    reportError('Checkout session creation failed:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Open Stripe billing portal for existing customers
 */
export async function openBillingPortal(): Promise<{ url: string }> {
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

  try {
    const response = await fetchWithAuth(`${baseUrl}/payments/stripe/portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { url: data.url };
  } catch (error) {
    reportError('Billing portal request failed:', error);
    throw new Error('Failed to open billing portal');
  }
}

/**
 * List review cases for teacher-lite functionality
 */
export async function listReviewCases(): Promise<
  Array<{
    id: string;
    question: string;
    answer: string;
    verified: boolean;
    trustScore: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
  }>
> {
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

  try {
    const response = await fetchWithAuth(`${baseUrl}/review/cases`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as Array<{
      id: string;
      question: string;
      answer: string;
      verified: boolean;
      trustScore: number;
      status: 'pending' | 'approved' | 'rejected';
      createdAt: string;
      updatedAt: string;
    }>;
  } catch (error) {
    reportError('Review cases request failed:', error);
    // Fallback to mock data for development
    return [
      {
        id: 'case_1',
        question: 'Find the derivative of x² + 3x + 2',
        answer: 'The derivative is 2x + 3',
        verified: true,
        trustScore: 0.95,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}

/**
 * Resolve a review case
 */
export async function resolveCase(
  id: string,
  action: 'approve' | 'reject',
  feedback?: string
): Promise<void> {
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

  try {
    const response = await fetchWithAuth(`${baseUrl}/review/cases/${id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, feedback }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    reportError('Resolve case request failed:', error);
    reportInfo(`Resolving case ${id} with action: ${action}`, feedback ? { feedback } : undefined);
  }
}

/**
 * Get user profile information
 */
export async function getUserProfile(): Promise<UserProfile> {
  try {
    return await apiClient.getUserProfile();
  } catch (error) {
    reportError('Get user profile failed:', error);
    throw new Error('Failed to get user profile');
  }
}

/**
 * Get available pricing plans
 */
export async function getPricingPlans(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    role: UserRole;
  }>
> {
  try {
    return await apiClient.getPricingPlans();
  } catch (error) {
    reportError('Get pricing plans failed:', error);
    throw new Error('Failed to get pricing plans');
  }
}

/**
 * Health check for the API
 */
export async function healthCheck(): Promise<{
  status: string;
  timestamp: string;
  services: Record<string, string>;
}> {
  try {
    return await apiClient.healthCheck();
  } catch (error) {
    reportError('Health check failed:', error);
    throw new Error('Failed to perform health check');
  }
}
