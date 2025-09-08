import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStripePriceRoleMapping,
  getRoleFromStripePrice,
  isValidStripePrice,
  getValidStripePriceIds,
  getStripePriceIdsForRole,
  isPaidRole,
  getHighestPriorityRole,
} from '../src/roles';
import { config } from '@ap/shared/config';

// Mock the config module
vi.mock('@ap/shared/config', () => ({
  config: vi.fn(),
}));

describe('roles', () => {
  const mockConfig = {
    STRIPE_PRICE_CALC_MONTHLY: 'price_calc_monthly_123',
    STRIPE_PRICE_CALC_YEARLY: 'price_calc_yearly_456',
    STRIPE_PRICE_ALL_ACCESS_MONTHLY: 'price_all_monthly_789',
    STRIPE_PRICE_ALL_ACCESS_YEARLY: 'price_all_yearly_012',
  };

  beforeEach(() => {
    vi.mocked(config).mockReturnValue(mockConfig as any);
  });

  describe('getStripePriceRoleMapping', () => {
    it('should return correct price to role mapping', () => {
      const mapping = getStripePriceRoleMapping();
      
      expect(mapping).toEqual({
        'price_calc_monthly_123': 'calc_paid',
        'price_calc_yearly_456': 'calc_paid',
        'price_all_monthly_789': 'all_paid',
        'price_all_yearly_012': 'all_paid',
      });
    });
  });

  describe('getRoleFromStripePrice', () => {
    it('should return correct role for calc monthly price', () => {
      const role = getRoleFromStripePrice('price_calc_monthly_123');
      expect(role).toBe('calc_paid');
    });

    it('should return correct role for calc yearly price', () => {
      const role = getRoleFromStripePrice('price_calc_yearly_456');
      expect(role).toBe('calc_paid');
    });

    it('should return correct role for all access monthly price', () => {
      const role = getRoleFromStripePrice('price_all_monthly_789');
      expect(role).toBe('all_paid');
    });

    it('should return correct role for all access yearly price', () => {
      const role = getRoleFromStripePrice('price_all_yearly_012');
      expect(role).toBe('all_paid');
    });

    it('should return null for unknown price ID', () => {
      const role = getRoleFromStripePrice('price_unknown_999');
      expect(role).toBeNull();
    });
  });

  describe('isValidStripePrice', () => {
    it('should return true for valid price IDs', () => {
      expect(isValidStripePrice('price_calc_monthly_123')).toBe(true);
      expect(isValidStripePrice('price_calc_yearly_456')).toBe(true);
      expect(isValidStripePrice('price_all_monthly_789')).toBe(true);
      expect(isValidStripePrice('price_all_yearly_012')).toBe(true);
    });

    it('should return false for invalid price IDs', () => {
      expect(isValidStripePrice('price_unknown_999')).toBe(false);
      expect(isValidStripePrice('')).toBe(false);
    });
  });

  describe('getValidStripePriceIds', () => {
    it('should return all configured price IDs', () => {
      const priceIds = getValidStripePriceIds();
      
      expect(priceIds).toHaveLength(4);
      expect(priceIds).toContain('price_calc_monthly_123');
      expect(priceIds).toContain('price_calc_yearly_456');
      expect(priceIds).toContain('price_all_monthly_789');
      expect(priceIds).toContain('price_all_yearly_012');
    });
  });

  describe('getStripePriceIdsForRole', () => {
    it('should return correct price IDs for calc_paid role', () => {
      const priceIds = getStripePriceIdsForRole('calc_paid');
      
      expect(priceIds).toHaveLength(2);
      expect(priceIds).toContain('price_calc_monthly_123');
      expect(priceIds).toContain('price_calc_yearly_456');
    });

    it('should return correct price IDs for all_paid role', () => {
      const priceIds = getStripePriceIdsForRole('all_paid');
      
      expect(priceIds).toHaveLength(2);
      expect(priceIds).toContain('price_all_monthly_789');
      expect(priceIds).toContain('price_all_yearly_012');
    });

    it('should return empty array for public role', () => {
      const priceIds = getStripePriceIdsForRole('public');
      expect(priceIds).toHaveLength(0);
    });

    it('should return empty array for teacher role', () => {
      const priceIds = getStripePriceIdsForRole('teacher');
      expect(priceIds).toHaveLength(0);
    });
  });

  describe('isPaidRole', () => {
    it('should return true for paid roles', () => {
      expect(isPaidRole('calc_paid')).toBe(true);
      expect(isPaidRole('all_paid')).toBe(true);
      expect(isPaidRole('teacher')).toBe(true);
    });

    it('should return false for public role', () => {
      expect(isPaidRole('public')).toBe(false);
    });
  });

  describe('getHighestPriorityRole', () => {
    it('should return all_paid when present', () => {
      expect(getHighestPriorityRole(['public', 'calc_paid', 'all_paid'])).toBe('all_paid');
      expect(getHighestPriorityRole(['all_paid'])).toBe('all_paid');
    });

    it('should return teacher when all_paid not present', () => {
      expect(getHighestPriorityRole(['public', 'calc_paid', 'teacher'])).toBe('teacher');
      expect(getHighestPriorityRole(['teacher'])).toBe('teacher');
    });

    it('should return calc_paid when only calc_paid and public present', () => {
      expect(getHighestPriorityRole(['public', 'calc_paid'])).toBe('calc_paid');
      expect(getHighestPriorityRole(['calc_paid'])).toBe('calc_paid');
    });

    it('should return public when only public present', () => {
      expect(getHighestPriorityRole(['public'])).toBe('public');
      expect(getHighestPriorityRole([])).toBe('public');
    });
  });
});
