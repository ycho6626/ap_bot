import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountPage from '@/app/account/page';
import * as apiBridge from '@/lib/api.bridge';

// Mock the API bridge
vi.mock('@/lib/api.bridge', () => ({
  getUserProfile: vi.fn(),
  getPricingPlans: vi.fn(),
  startCheckout: vi.fn(),
  openBillingPortal: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock window.location.assign
const mockAssign = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    assign: mockAssign,
  },
  writable: true,
});

describe('AccountPage', () => {
  const mockGetUserProfile = vi.mocked(apiBridge.getUserProfile);
  const mockGetPricingPlans = vi.mocked(apiBridge.getPricingPlans);
  const mockStartCheckout = vi.mocked(apiBridge.startCheckout);
  const mockOpenBillingPortal = vi.mocked(apiBridge.openBillingPortal);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssign.mockClear();
  });

  it('should display user profile information', async () => {
    const mockUser = {
      id: 'demo-user',
      email: 'demo@example.com',
      role: 'public',
      examVariant: 'calc_ab',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockPlans = [
      {
        id: 'price_free',
        name: 'Free',
        description: 'Perfect for trying out our platform',
        price: 0,
        currency: 'usd',
        interval: 'month' as const,
        features: ['5 questions per day'],
        role: 'public' as const,
      },
    ];

    mockGetUserProfile.mockResolvedValue(mockUser);
    mockGetPricingPlans.mockResolvedValue(mockPlans);

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('demo@example.com')).toBeInTheDocument();
      expect(screen.getAllByText('Free')).toHaveLength(2); // Badge and plan name
      expect(screen.getByText('AP Calculus AB')).toBeInTheDocument();
    });
  });

  it('should show current plan as active', async () => {
    const mockUser = {
      id: 'demo-user',
      email: 'demo@example.com',
      role: 'calc_paid',
      examVariant: 'calc_ab',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockPlans = [
      {
        id: 'price_free',
        name: 'Free',
        description: 'Perfect for trying out our platform',
        price: 0,
        currency: 'usd',
        interval: 'month' as const,
        features: ['5 questions per day'],
        role: 'public' as const,
      },
      {
        id: 'price_pro_monthly',
        name: 'Pro Monthly',
        description: 'For serious AP Calculus students',
        price: 19,
        currency: 'usd',
        interval: 'month' as const,
        features: ['Unlimited questions'],
        role: 'calc_paid' as const,
      },
    ];

    mockGetUserProfile.mockResolvedValue(mockUser);
    mockGetPricingPlans.mockResolvedValue(mockPlans);

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Pro Monthly')).toBeInTheDocument();
    });
  });

  it('should handle billing portal redirect', async () => {
    const mockUser = {
      id: 'demo-user',
      email: 'demo@example.com',
      role: 'calc_paid',
      examVariant: 'calc_ab',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockPlans = [
      {
        id: 'price_pro_monthly',
        name: 'Pro Monthly',
        description: 'For serious AP Calculus students',
        price: 19,
        currency: 'usd',
        interval: 'month' as const,
        features: ['Unlimited questions'],
        role: 'calc_paid' as const,
      },
    ];

    const mockPortalSession = {
      url: 'https://billing.stripe.com/test',
    };

    mockGetUserProfile.mockResolvedValue(mockUser);
    mockGetPricingPlans.mockResolvedValue(mockPlans);
    mockOpenBillingPortal.mockResolvedValue(mockPortalSession);

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Manage Billing')).toBeInTheDocument();
    });

    const manageBillingButton = screen.getByText('Manage Billing');
    fireEvent.click(manageBillingButton);

    await waitFor(() => {
      expect(mockOpenBillingPortal).toHaveBeenCalled();
      expect(mockAssign).toHaveBeenCalledWith('https://billing.stripe.com/test');
    });
  });

  it('should show upgrade options for free users', async () => {
    const mockUser = {
      id: 'demo-user',
      email: 'demo@example.com',
      role: 'public',
      examVariant: 'calc_ab',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockPlans = [
      {
        id: 'price_free',
        name: 'Free',
        description: 'Perfect for trying out our platform',
        price: 0,
        currency: 'usd',
        interval: 'month' as const,
        features: ['5 questions per day'],
        role: 'public' as const,
      },
      {
        id: 'price_pro_monthly',
        name: 'Pro Monthly',
        description: 'For serious AP Calculus students',
        price: 19,
        currency: 'usd',
        interval: 'month' as const,
        features: ['Unlimited questions'],
        role: 'calc_paid' as const,
      },
    ];

    const mockCheckoutSession = {
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    };

    mockGetUserProfile.mockResolvedValue(mockUser);
    mockGetPricingPlans.mockResolvedValue(mockPlans);
    mockStartCheckout.mockResolvedValue(mockCheckoutSession);

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
    });

    const upgradeButton = screen.getByText('Upgrade Now');
    expect(upgradeButton).toBeInTheDocument();
    
    // Check if button is enabled
    expect(upgradeButton).not.toBeDisabled();
    
    fireEvent.click(upgradeButton);

    // Wait for the async operation
    await waitFor(() => {
      expect(mockStartCheckout).toHaveBeenCalledWith('price_pro_monthly');
    });

    expect(mockAssign).toHaveBeenCalledWith('https://checkout.stripe.com/test');
  });

  it('should show no billing info for free users', async () => {
    const mockUser = {
      id: 'demo-user',
      email: 'demo@example.com',
      role: 'public',
      examVariant: 'calc_ab',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockPlans = [
      {
        id: 'price_free',
        name: 'Free',
        description: 'Perfect for trying out our platform',
        price: 0,
        currency: 'usd',
        interval: 'month' as const,
        features: ['5 questions per day'],
        role: 'public' as const,
      },
    ];

    mockGetUserProfile.mockResolvedValue(mockUser);
    mockGetPricingPlans.mockResolvedValue(mockPlans);

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('No billing information available. Upgrade to a paid plan to see billing details.')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully with fallback data', async () => {
    mockGetUserProfile.mockRejectedValue(new Error('API Error'));
    mockGetPricingPlans.mockRejectedValue(new Error('API Error'));

    render(<AccountPage />);

    await waitFor(() => {
      // Should show fallback mock data when API fails
      expect(screen.getByText('demo@example.com')).toBeInTheDocument();
      expect(screen.getAllByText('Free')).toHaveLength(2); // Badge and plan name
    });
  });
});
