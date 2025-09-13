import { describe, it, expect } from 'vitest';
import {
  parseJwtToken,
  hasRequiredRole,
  extractTokenFromHeader,
  createMockJwtToken,
  type JwtPayload,
} from '../auth';
import type { UserRole } from '../types';

describe('parseJwtToken', () => {
  it('should parse valid JWT token', () => {
    const payload: JwtPayload = {
      sub: 'user123',
      email: 'test@example.com',
      role: 'teacher',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = createMockJwtToken(payload);
    const result = parseJwtToken(token);

    expect(result.isValid).toBe(true);
    expect(result.payload).toEqual(payload);
    expect(result.error).toBeUndefined();
  });

  it('should handle Bearer prefix', () => {
    const payload: JwtPayload = {
      sub: 'user123',
      email: 'test@example.com',
      role: 'teacher',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = createMockJwtToken(payload);
    const result = parseJwtToken(`Bearer ${token}`);

    expect(result.isValid).toBe(true);
    expect(result.payload).toEqual(payload);
  });

  it('should reject invalid JWT format', () => {
    const result = parseJwtToken('invalid-token');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid JWT format');
    expect(result.payload).toBeUndefined();
  });

  it('should reject expired token', () => {
    const payload: JwtPayload = {
      sub: 'user123',
      email: 'test@example.com',
      role: 'teacher',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };

    const token = createMockJwtToken(payload);
    const result = parseJwtToken(token);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Token expired');
  });

  it('should reject token with missing required fields', () => {
    // Create a token with missing required fields by manually constructing it
    const invalidPayload = {
      sub: 'user123',
      // missing email and role
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(invalidPayload));
    const signature = 'mock-signature';
    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    const result = parseJwtToken(token);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid token payload');
  });

  it('should reject token with invalid role', () => {
    const payload = {
      sub: 'user123',
      email: 'test@example.com',
      role: 'invalid_role',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = createMockJwtToken(payload as any);
    const result = parseJwtToken(token);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid user role');
  });

  it('should handle malformed JSON', () => {
    const result = parseJwtToken('invalid.base64.signature');

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('JSON');
  });
});

describe('hasRequiredRole', () => {
  it('should return true for exact role match', () => {
    expect(hasRequiredRole('teacher', 'teacher')).toBe(true);
    expect(hasRequiredRole('public', 'public')).toBe(true);
  });

  it('should return true for higher role', () => {
    expect(hasRequiredRole('all_paid', 'teacher')).toBe(true);
    expect(hasRequiredRole('teacher', 'calc_paid')).toBe(true);
    expect(hasRequiredRole('calc_paid', 'public')).toBe(true);
  });

  it('should return false for lower role', () => {
    expect(hasRequiredRole('public', 'calc_paid')).toBe(false);
    expect(hasRequiredRole('calc_paid', 'teacher')).toBe(false);
    expect(hasRequiredRole('teacher', 'all_paid')).toBe(false);
  });

  it('should handle all role combinations', () => {
    const roles: UserRole[] = ['public', 'calc_paid', 'teacher', 'all_paid'];

    for (let i = 0; i < roles.length; i++) {
      for (let j = 0; j < roles.length; j++) {
        const userRole = roles[i];
        const requiredRole = roles[j];
        const expected = i >= j;
        expect(hasRequiredRole(userRole, requiredRole)).toBe(expected);
      }
    }
  });
});

describe('extractTokenFromHeader', () => {
  it('should extract token from Bearer header', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const header = `Bearer ${token}`;

    expect(extractTokenFromHeader(header)).toBe(token);
  });

  it('should handle case insensitive Bearer', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const header = `bearer ${token}`;

    expect(extractTokenFromHeader(header)).toBe(token);
  });

  it('should return null for missing header', () => {
    expect(extractTokenFromHeader(undefined)).toBe(null);
  });

  it('should return null for invalid format', () => {
    expect(extractTokenFromHeader('Invalid token')).toBe(null);
    expect(extractTokenFromHeader('Basic dXNlcjpwYXNz')).toBe(null);
  });

  it('should handle extra whitespace', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const header = `  Bearer   ${token}  `;

    expect(extractTokenFromHeader(header)).toBe(token);
  });
});

describe('createMockJwtToken', () => {
  it('should create valid mock token with default values', () => {
    const token = createMockJwtToken({});

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const result = parseJwtToken(token);
    expect(result.isValid).toBe(true);
    expect(result.payload?.sub).toBe('test-user');
    expect(result.payload?.email).toBe('test@example.com');
    expect(result.payload?.role).toBe('public');
  });

  it('should create token with custom payload', () => {
    const now = Math.floor(Date.now() / 1000);
    const customPayload: Partial<JwtPayload> = {
      sub: 'custom-user',
      email: 'custom@example.com',
      role: 'teacher',
      exam_variant: 'calc_bc',
      iat: now,
      exp: now + 3600,
    };

    const token = createMockJwtToken(customPayload);
    const result = parseJwtToken(token);

    expect(result.isValid).toBe(true);
    expect(result.payload?.sub).toBe('custom-user');
    expect(result.payload?.email).toBe('custom@example.com');
    expect(result.payload?.role).toBe('teacher');
    expect(result.payload?.exam_variant).toBe('calc_bc');
    expect(result.payload?.iat).toBe(now);
    expect(result.payload?.exp).toBe(now + 3600);
  });

  it('should merge custom payload with defaults', () => {
    const token = createMockJwtToken({
      role: 'teacher',
      exam_variant: 'calc_bc',
    });

    const result = parseJwtToken(token);

    expect(result.isValid).toBe(true);
    expect(result.payload?.role).toBe('teacher');
    expect(result.payload?.exam_variant).toBe('calc_bc');
    expect(result.payload?.sub).toBe('test-user'); // default value
    expect(result.payload?.email).toBe('test@example.com'); // default value
  });

  it('should create token with future expiration', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
    const token = createMockJwtToken({ exp: futureExp });

    const result = parseJwtToken(token);
    expect(result.isValid).toBe(true);
    expect(result.payload?.exp).toBe(futureExp);
  });
});
