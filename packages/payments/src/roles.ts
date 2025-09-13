import { config } from '@ap/shared/config';
import type { UserRole } from '@ap/shared/types';

/**
 * Stripe price ID to user role mapping
 */
export interface StripePriceRoleMapping {
  [priceId: string]: UserRole;
}

/**
 * Get the role mapping for Stripe price IDs
 * Maps Stripe price IDs to user roles based on environment configuration
 * @returns Object mapping price IDs to roles
 */
export function getStripePriceRoleMapping(): StripePriceRoleMapping {
  const cfg = config();

  return {
    // Calc-specific pricing maps to calc_paid
    [cfg.STRIPE_PRICE_CALC_MONTHLY]: 'calc_paid',
    [cfg.STRIPE_PRICE_CALC_YEARLY]: 'calc_paid',

    // All access pricing maps to all_paid
    [cfg.STRIPE_PRICE_ALL_ACCESS_MONTHLY]: 'all_paid',
    [cfg.STRIPE_PRICE_ALL_ACCESS_YEARLY]: 'all_paid',
  };
}

/**
 * Get user role from Stripe price ID
 * @param priceId - Stripe price ID
 * @returns User role or null if price ID is not recognized
 */
export function getRoleFromStripePrice(priceId: string): UserRole | null {
  const mapping = getStripePriceRoleMapping();
  return mapping[priceId] ?? null;
}

/**
 * Check if a Stripe price ID is valid (has a role mapping)
 * @param priceId - Stripe price ID to check
 * @returns True if price ID has a role mapping, false otherwise
 */
export function isValidStripePrice(priceId: string): boolean {
  return getRoleFromStripePrice(priceId) !== null;
}

/**
 * Get all valid Stripe price IDs
 * @returns Array of all configured Stripe price IDs
 */
export function getValidStripePriceIds(): string[] {
  const mapping = getStripePriceRoleMapping();
  return Object.keys(mapping);
}

/**
 * Get all Stripe price IDs for a specific role
 * @param role - User role to get price IDs for
 * @returns Array of price IDs that map to the given role
 */
export function getStripePriceIdsForRole(role: UserRole): string[] {
  const mapping = getStripePriceRoleMapping();
  return Object.entries(mapping)
    .filter(([, mappedRole]) => mappedRole === role)
    .map(([priceId]) => priceId);
}

/**
 * Check if a role is a paid role
 * @param role - User role to check
 * @returns True if role is a paid role, false otherwise
 */
export function isPaidRole(role: UserRole): boolean {
  return role === 'calc_paid' || role === 'all_paid' || role === 'teacher';
}

/**
 * Get the highest priority role from a list of roles
 * Priority order: all_paid > teacher > calc_paid > public
 * @param roles - Array of user roles
 * @returns Highest priority role
 */
export function getHighestPriorityRole(roles: UserRole[]): UserRole {
  if (roles.includes('all_paid')) return 'all_paid';
  if (roles.includes('teacher')) return 'teacher';
  if (roles.includes('calc_paid')) return 'calc_paid';
  return 'public';
}
