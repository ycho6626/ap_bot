/**
 * API Bridge Layer
 * 
 * This module provides a unified interface for API calls, adapting existing
 * API helpers to the new naming convention while maintaining backward compatibility.
 * 
 * All pages should import from this module instead of directly from api.ts
 */

import { apiClient, type CoachRequest, type CoachResponse, type KbSearchRequest, type KbSearchResponse, type UserProfile, type StripeCheckoutSession } from './api';
import type { UserRole } from '@ap/shared/types';
// import type { ExamVariant } from '@ap/shared/types';

// Re-export types for convenience
export type { CoachRequest, CoachResponse, KbSearchRequest, KbSearchResponse, UserProfile, StripeCheckoutSession };

/**
 * Search the knowledge base for relevant content
 */
export async function searchKB(query: string, variant: 'calc_ab' | 'calc_bc'): Promise<KbSearchResponse> {
  const request: KbSearchRequest = {
    subject: 'calc',
    examVariant: variant,
    query: query.trim(),
    limit: 10,
    minScore: 0.1,
  };
  
  return apiClient.searchKnowledgeBase(request);
}

/**
 * Send a question to the coach and get a verified answer
 */
export async function coach(question: string, variant: 'calc_ab' | 'calc_bc'): Promise<CoachResponse> {
  const request: CoachRequest = {
    subject: 'calc',
    examVariant: variant,
    mode: 'vam', // Use Verified Answer Mode by default
    question: question.trim(),
    context: {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
  };
  
  return apiClient.askCoach(request);
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function startCheckout(priceId: string): Promise<StripeCheckoutSession> {
  return apiClient.createCheckoutSession(priceId);
}

/**
 * Open Stripe billing portal for existing customers
 */
export async function openBillingPortal(): Promise<{ url: string }> {
  // This would typically call a different endpoint for billing portal
  // For now, we'll use the checkout endpoint as a placeholder
  // In a real implementation, this would be: apiClient.openBillingPortal()
  throw new Error('Billing portal not yet implemented');
}

/**
 * List review cases for teacher-lite functionality
 */
export async function listReviewCases(): Promise<Array<{
  id: string;
  question: string;
  answer: string;
  verified: boolean;
  trustScore: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}>> {
  // This would typically call: apiClient.getReviewCases()
  // For now, return mock data
  return [
    {
      id: 'case_1',
      question: 'Find the derivative of x² + 3x + 2',
      answer: 'The derivative is 2x + 3',
      verified: true,
      trustScore: 0.95,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Resolve a review case
 */
export async function resolveCase(id: string, action: 'approve' | 'reject', feedback?: string): Promise<void> {
  // This would typically call: apiClient.resolveReviewCase(id, action, feedback)
  // For now, just log the action
  console.log(`Resolving case ${id} with action: ${action}`, feedback ? `Feedback: ${feedback}` : '');
}

/**
 * Get user profile information
 */
export async function getUserProfile(): Promise<UserProfile> {
  return apiClient.getUserProfile();
}

/**
 * Get available pricing plans
 */
export async function getPricingPlans(): Promise<Array<{
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  role: UserRole;
}>> {
  return apiClient.getPricingPlans();
}

/**
 * Health check for the API
 */
export async function healthCheck(): Promise<{
  status: string;
  timestamp: string;
  services: Record<string, string>;
}> {
  return apiClient.healthCheck();
}
