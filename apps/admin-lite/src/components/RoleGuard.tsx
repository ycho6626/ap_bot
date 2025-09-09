'use client';

import { useEffect, useState } from 'react';
import { UserRole, type JwtPayload } from '@ap/shared/types';
import { parseJwtToken, hasRequiredRole } from '@ap/shared/auth';
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
        // Check for JWT token in localStorage
        const token = localStorage.getItem('admin_jwt_token');
        
        if (!token) {
          if (fallback) {
            setUserRole(null);
            setLoading(false);
            return;
          }
          setError('Teacher sign-in required');
          setLoading(false);
          return;
        }

        // Parse and validate JWT token
        const authResult = parseJwtToken(token);
        
        if (!authResult.isValid) {
          setError(authResult.error || 'Invalid authentication token');
          setLoading(false);
          return;
        }

        if (!authResult.payload) {
          setError('Invalid token payload');
          setLoading(false);
          return;
        }

        // Check if user has required role
        if (!hasRequiredRole(authResult.payload.role, requiredRole)) {
          setError(`Access denied. Required role: ${requiredRole}`);
          setLoading(false);
          return;
        }

        setUserRole(authResult.payload.role);
      } catch (err) {
        console.error('Failed to check user role:', err);
        setError('Failed to verify user permissions');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [requiredRole]);

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

  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShieldXIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {error === 'Teacher sign-in required' ? 'Teacher Sign-In Required' : 'Access Denied'}
          </h2>
          <p className="text-gray-500 mb-4">{error}</p>
          {userRole && (
            <p className="text-sm text-gray-400">
              Current role: {userRole}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show fallback if no user role and fallback is provided
  if (!userRole && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}


/**
 * Hook to get current user role from JWT token
 */
export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const token = localStorage.getItem('admin_jwt_token');
        
        if (!token) {
          setUserRole(null);
          setLoading(false);
          return;
        }

        const authResult = parseJwtToken(token);
        
        if (authResult.isValid && authResult.payload) {
          setUserRole(authResult.payload.role);
        } else {
          setUserRole(null);
        }
      } catch (err) {
        console.error('Failed to check user role:', err);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  return { userRole, loading };
}
