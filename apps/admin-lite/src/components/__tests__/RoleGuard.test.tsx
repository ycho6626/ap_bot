import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { RoleGuard } from '../RoleGuard';
import { UserRole } from '@ap/shared/types';

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
    mockLocalStorage.getItem.mockReturnValue('teacher');
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    // Wait for role check to complete and content to appear
    await screen.findByText('Protected Content');
  });

  it('should show access denied for insufficient role', async () => {
    mockLocalStorage.getItem.mockReturnValue('public');
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    await screen.findByText('Access Denied');
    expect(screen.getByText('You need teacher role or higher to access this page.')).toBeInTheDocument();
    expect(screen.getByText('Current role: public')).toBeInTheDocument();
  });

  it('should show access denied for no role', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    await screen.findByText('Access Denied');
    expect(screen.getByText('Current role: public')).toBeInTheDocument();
  });

  it('should allow higher roles to access', async () => {
    mockLocalStorage.getItem.mockReturnValue('all_paid');
    
    render(
      <RoleGuard requiredRole="teacher">
        <div>Protected Content</div>
      </RoleGuard>
    );

    await screen.findByText('Protected Content');
  });

  it('should render custom fallback when provided', async () => {
    mockLocalStorage.getItem.mockReturnValue('public');
    
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
});
