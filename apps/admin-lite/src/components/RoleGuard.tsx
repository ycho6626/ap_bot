'use client';

import { useEffect, useState } from 'react';
import { UserRole } from '@ap/shared/types';
import { ShieldXIcon, LoaderIcon } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  fallback?: React.ReactNode;
}

/**
 * Component that guards access based on user role
 * Only renders children if user has the required role or higher
 */
export function RoleGuard({ children, requiredRole, fallback }: RoleGuardProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        // In a real app, this would check the user's authentication status
        // and fetch their role from the API or local storage
        // For now, we'll simulate this with a mock implementation
        
        // Check if we have a stored role (for testing)
        const storedRole = localStorage.getItem('admin_user_role');
        if (storedRole) {
          setUserRole(storedRole as UserRole);
        } else {
          // Default to 'public' for demo purposes
          // In production, this would redirect to login
          setUserRole('public');
        }
      } catch (err) {
        console.error('Failed to check user role:', err);
        setError('Failed to verify user permissions');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoaderIcon className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShieldXIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!userRole || !hasRequiredRole(userRole, requiredRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShieldXIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-4">
            You need {requiredRole} role or higher to access this page.
          </p>
          <p className="text-sm text-gray-400">
            Current role: {userRole || 'none'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Check if user has the required role or higher
 * Role hierarchy: public < calc_paid < teacher < all_paid
 */
function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    public: 0,
    calc_paid: 1,
    teacher: 2,
    all_paid: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Hook to get current user role
 */
export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const storedRole = localStorage.getItem('admin_user_role');
        setUserRole(storedRole as UserRole || 'public');
      } catch (err) {
        console.error('Failed to check user role:', err);
        setUserRole('public');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  return { userRole, loading };
}
