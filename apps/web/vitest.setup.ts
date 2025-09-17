import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

// Suppress console errors in tests unless explicitly testing error handling
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Only show console errors if they're not from test error handling
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || 
       args[0].includes('Error creating checkout session') ||
       args[0].includes('Knowledge base search failed:') ||
       args[0].includes('Coach request failed:') ||
       args[0].includes('Checkout session creation failed:') ||
       args[0].includes('Failed to get auth session:') ||
       args[0].includes('Billing portal request failed:') ||
       args[0].includes('Review cases request failed:') ||
       args[0].includes('Resolve case request failed:') ||
       args[0].includes('Get user profile failed:') ||
       args[0].includes('Get pricing plans failed:') ||
       args[0].includes('Health check failed:') ||
       args[0].includes('Error loading user profile:') ||
       args[0].includes('Error loading pricing plans:'))
    ) {
      // Suppress these specific warnings/errors
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
