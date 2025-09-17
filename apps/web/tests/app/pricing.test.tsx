import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PricingPage from '@/app/pricing/page';
import * as apiBridge from '@/lib/api.bridge';

// Mock the API bridge
vi.mock('@/lib/api.bridge', () => ({
  getPricingPlans: vi.fn(),
  startCheckout: vi.fn(),
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

describe('PricingPage', () => {
  const mockGetPricingPlans = vi.mocked(apiBridge.getPricingPlans);
  const mockStartCheckout = vi.mocked(apiBridge.startCheckout);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssign.mockClear();
  });

  it('should display pricing plans', async () => {
    const mockPlans = [
      {
        id: 'price_free',
        name: 'Free',
        description: 'Perfect for trying out our platform',
        price: 0,
        currency: 'usd',
        interval: 'month' as const,
        features: ['5 questions per day', 'Basic explanations'],
        role: 'public' as const,
      },
      {
        id: 'price_pro_monthly',
        name: 'Pro',
        description: 'For serious AP Calculus students',
        price: 19,
        currency: 'usd',
        interval: 'month' as const,
        features: ['Unlimited questions', 'Verified answers'],
        role: 'calc_paid' as const,
        popular: true,
      },
    ];

    mockGetPricingPlans.mockResolvedValue(mockPlans);

    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  it('should handle free plan upgrade by redirecting to coach', async () => {
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

    mockGetPricingPlans.mockResolvedValue(mockPlans);

    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    const getStartedButton = screen.getAllByText('Get Started')[1]; // Get the button in the pricing card, not the header
    fireEvent.click(getStartedButton);

    expect(window.location.href).toBe('/coach');
  });

  it('should call startCheckout and redirect for paid plans', async () => {
    const mockPlans = [
      {
        id: 'price_pro_monthly',
        name: 'Pro',
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

    mockGetPricingPlans.mockResolvedValue(mockPlans);
    mockStartCheckout.mockResolvedValue(mockCheckoutSession);

    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    const upgradeButton = screen.getByText('Upgrade Now');
    fireEvent.click(upgradeButton);

    await waitFor(() => {
      expect(mockStartCheckout).toHaveBeenCalledWith('price_pro_monthly');
      expect(mockAssign).toHaveBeenCalledWith('https://checkout.stripe.com/test');
    });
  });

  it('should show loading state during checkout', async () => {
    const mockPlans = [
      {
        id: 'price_pro_monthly',
        name: 'Pro',
        description: 'For serious AP Calculus students',
        price: 19,
        currency: 'usd',
        interval: 'month' as const,
        features: ['Unlimited questions'],
        role: 'calc_paid' as const,
      },
    ];

    mockGetPricingPlans.mockResolvedValue(mockPlans);
    mockStartCheckout.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    const upgradeButton = screen.getByText('Upgrade Now');
    fireEvent.click(upgradeButton);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(upgradeButton).toBeDisabled();
  });

  it('should handle checkout errors gracefully', async () => {
    const mockPlans = [
      {
        id: 'price_pro_monthly',
        name: 'Pro',
        description: 'For serious AP Calculus students',
        price: 19,
        currency: 'usd',
        interval: 'month' as const,
        features: ['Unlimited questions'],
        role: 'calc_paid' as const,
      },
    ];

    mockGetPricingPlans.mockResolvedValue(mockPlans);
    mockStartCheckout.mockRejectedValue(new Error('Checkout failed'));

    // Suppress console.error for this test since we're testing error handling
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    const upgradeButton = screen.getByText('Upgrade Now');
    fireEvent.click(upgradeButton);

    await waitFor(() => {
      expect(mockStartCheckout).toHaveBeenCalledWith('price_pro_monthly');
      expect(mockAssign).not.toHaveBeenCalled();
    }, { timeout: 5000 });
    
    // Restore console.error
    consoleSpy.mockRestore();
  });
});
