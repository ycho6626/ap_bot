/**
 * @ap/payments - Stripe payment processing for AP Calculus bot
 *
 * This package provides:
 * - Stripe price ID to user role mapping
 * - Webhook signature verification and idempotency
 * - Event processing for invoice.paid and subscription.updated
 * - User role management based on subscription status
 */

export * from './roles';
export * from './stripe';
