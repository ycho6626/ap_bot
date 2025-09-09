/**
 * Authentication utilities for JWT token handling
 */

import { UserRole } from './types';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: UserRole;
  exam_variant?: 'calc_ab' | 'calc_bc';
  iat: number;
  exp: number;
}

/**
 * Authentication result
 */
export interface AuthResult {
  isValid: boolean;
  payload?: JwtPayload;
  error?: string;
}

/**
 * Parse and validate JWT token
 * @param token JWT token string
 * @returns Authentication result with payload or error
 */
export function parseJwtToken(token: string): AuthResult {
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    
    // Split token into parts
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      return {
        isValid: false,
        error: 'Invalid JWT format',
      };
    }

    // Decode payload (base64url)
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')));

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return {
        isValid: false,
        error: 'Token expired',
      };
    }

    // Validate required fields
    if (!payload.sub || !payload.email || !payload.role) {
      return {
        isValid: false,
        error: 'Invalid token payload',
      };
    }

    // Validate role
    const validRoles: UserRole[] = ['public', 'calc_paid', 'teacher', 'all_paid'];
    if (!validRoles.includes(payload.role)) {
      return {
        isValid: false,
        error: 'Invalid user role',
      };
    }

    return {
      isValid: true,
      payload: payload as JwtPayload,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to parse token',
    };
  }
}

/**
 * Check if user has required role or higher
 * Role hierarchy: public < calc_paid < teacher < all_paid
 */
export function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    public: 0,
    calc_paid: 1,
    teacher: 2,
    all_paid: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Extract token from Authorization header
 * @param authHeader Authorization header value
 * @returns Token string or null if not found
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^\s*Bearer\s+(.+?)\s*$/i);
  return match ? match[1]!.trim() : null;
}

/**
 * Create a mock JWT token for testing
 * @param payload Token payload
 * @returns Mock JWT token string
 */
export function createMockJwtToken(payload: Partial<JwtPayload>): string {
  const now = Math.floor(Date.now() / 1000);
  const defaultPayload: JwtPayload = {
    sub: 'test-user',
    email: 'test@example.com',
    role: 'public',
    iat: now,
    exp: now + 3600, // 1 hour
    ...payload,
  };

  // Create a simple mock JWT (not cryptographically secure)
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(defaultPayload));
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
