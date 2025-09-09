import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RoleGuard } from '../RoleGuard';
import { createMockJwtToken } from '@ap/shared/auth';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('RoleGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when user has required role', async () => {
    const token = createMockJwtToken({ role: 'teacher' });
    mockLocalStorage.getItem.mockReturnValue(token);
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    // Wait for role check to complete and content to appear
    await screen.findByText('Protected Content');
  });

  it('should show access denied for insufficient role', async () => {
    const token = createMockJwtToken({ role: 'public' });
    mockLocalStorage.getItem.mockReturnValue(token);
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    await screen.findByText('Access Denied');
    expect(screen.getByText('Access denied. Required role: teacher')).toBeInTheDocument();
  });

  it('should show teacher sign-in required for no token', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    await screen.findByText('Access Denied');
    expect(screen.getByText('Teacher sign-in required')).toBeInTheDocument();
  });

  it('should allow higher roles to access', async () => {
    const token = createMockJwtToken({ role: 'all_paid' });
    mockLocalStorage.getItem.mockReturnValue(token);
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    await screen.findByText('Protected Content');
  });

  it('should render custom fallback when provided', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    render(
      <RoleGuard 
        requiredRole="teacher" 
        fallback={<div>Custom Access Denied</div>}
      >
        <div>Protected Content</div>
      </RoleGuard>
    );

    await screen.findByText('Custom Access Denied');
  });

  it('should show error for invalid token', async () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-token');
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    await screen.findByText('Access Denied');
    expect(screen.getByText('Invalid JWT format')).toBeInTheDocument();
  });

  it('should show error for expired token', async () => {
    const expiredToken = createMockJwtToken({ 
      role: 'teacher',
      exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    });
    mockLocalStorage.getItem.mockReturnValue(expiredToken);
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    await screen.findByText('Access Denied');
    expect(screen.getByText('Token expired')).toBeInTheDocument();
  });
});
