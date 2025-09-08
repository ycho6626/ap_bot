import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig, config, resetConfig, isDevelopment, isProduction, isTest } from '../src/config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset config instance
    resetConfig();
    
    // Set up test environment variables
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      OPENAI_API_KEY: 'test-openai-key',
      VERIFIER_URL: 'http://localhost:8000',
      VAM_MIN_TRUST: '0.92',
      STRIPE_SECRET_KEY: 'test-stripe-secret',
      STRIPE_WEBHOOK_SECRET: 'test-webhook-secret',
      STRIPE_PRICE_CALC_MONTHLY: 'price-calc-monthly',
      STRIPE_PRICE_CALC_YEARLY: 'price-calc-yearly',
      STRIPE_PRICE_ALL_ACCESS_MONTHLY: 'price-all-monthly',
      STRIPE_PRICE_ALL_ACCESS_YEARLY: 'price-all-yearly',
      NODE_ENV: 'test',
      PORT: '3000',
      API_PORT: '3001',
      CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001',
      LOG_LEVEL: 'info',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
  });

  describe('getConfig', () => {
    it('should return valid configuration with all required fields', () => {
      const config = getConfig();
      
      expect(config.SUPABASE_URL).toBe('https://test.supabase.co');
      expect(config.SUPABASE_ANON_KEY).toBe('test-anon-key');
      expect(config.SUPABASE_SERVICE_KEY).toBe('test-service-key');
      expect(config.OPENAI_API_KEY).toBe('test-openai-key');
      expect(config.VERIFIER_URL).toBe('http://localhost:8000');
      expect(config.VAM_MIN_TRUST).toBe(0.92);
      expect(config.STRIPE_SECRET_KEY).toBe('test-stripe-secret');
      expect(config.STRIPE_WEBHOOK_SECRET).toBe('test-webhook-secret');
      expect(config.STRIPE_PRICE_CALC_MONTHLY).toBe('price-calc-monthly');
      expect(config.STRIPE_PRICE_CALC_YEARLY).toBe('price-calc-yearly');
      expect(config.STRIPE_PRICE_ALL_ACCESS_MONTHLY).toBe('price-all-monthly');
      expect(config.STRIPE_PRICE_ALL_ACCESS_YEARLY).toBe('price-all-yearly');
      expect(config.NODE_ENV).toBe('test');
      expect(config.PORT).toBe(3000);
      expect(config.API_PORT).toBe(3001);
      expect(config.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3001']);
      expect(config.LOG_LEVEL).toBe('info');
    });

    it('should use default values for optional fields', () => {
      delete process.env.VERIFIER_URL;
      delete process.env.VAM_MIN_TRUST;
      delete process.env.REDIS_URL;
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.API_PORT;
      delete process.env.CORS_ORIGINS;
      delete process.env.LOG_LEVEL;

      const config = getConfig();
      
      expect(config.VERIFIER_URL).toBe('http://localhost:8000');
      expect(config.VAM_MIN_TRUST).toBe(0.92);
      expect(config.REDIS_URL).toBeUndefined();
      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe(3000);
      expect(config.API_PORT).toBe(3001);
      expect(config.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3001']);
      expect(config.LOG_LEVEL).toBe('info');
    });

    it('should transform string numbers to numbers', () => {
      process.env.PORT = '8080';
      process.env.API_PORT = '8081';
      process.env.VAM_MIN_TRUST = '0.95';

      const config = getConfig();
      
      expect(config.PORT).toBe(8080);
      expect(config.API_PORT).toBe(8081);
      expect(config.VAM_MIN_TRUST).toBe(0.95);
    });

    it('should transform CORS_ORIGINS string to array', () => {
      process.env.CORS_ORIGINS = 'https://example.com,https://app.example.com';

      const config = getConfig();
      
      expect(config.CORS_ORIGINS).toEqual(['https://example.com', 'https://app.example.com']);
    });

    it('should throw error for missing required fields', () => {
      delete process.env.SUPABASE_URL;

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error for invalid URL', () => {
      process.env.SUPABASE_URL = 'invalid-url';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error for invalid NODE_ENV', () => {
      process.env.NODE_ENV = 'invalid';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error for invalid PORT', () => {
      process.env.PORT = 'invalid';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error for PORT out of range', () => {
      process.env.PORT = '70000';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error for invalid VAM_MIN_TRUST', () => {
      process.env.VAM_MIN_TRUST = '1.5';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error for invalid CORS_ORIGINS', () => {
      process.env.CORS_ORIGINS = 'invalid-url';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error for invalid LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'invalid';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });
  });

  describe('config singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const config1 = config();
      const config2 = config();
      
      expect(config1).toBe(config2);
    });

    it('should reset when resetConfig is called', () => {
      const config1 = config();
      resetConfig();
      const config2 = config();
      
      expect(config1).not.toBe(config2);
    });
  });

  describe('environment helpers', () => {
    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      resetConfig();
      
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      resetConfig();
      
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(true);
      expect(isTest()).toBe(false);
    });

    it('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      resetConfig();
      
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty CORS_ORIGINS', () => {
      process.env.CORS_ORIGINS = '';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should handle whitespace in CORS_ORIGINS', () => {
      process.env.CORS_ORIGINS = '  https://example.com  ,  https://app.example.com  ';

      const config = getConfig();
      
      expect(config.CORS_ORIGINS).toEqual(['https://example.com', 'https://app.example.com']);
    });

    it('should handle REDIS_URL as optional', () => {
      delete process.env.REDIS_URL;

      const config = getConfig();
      
      expect(config.REDIS_URL).toBeUndefined();
    });

    it('should validate REDIS_URL when provided', () => {
      process.env.REDIS_URL = 'invalid-url';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should handle valid REDIS_URL', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const config = getConfig();
      
      expect(config.REDIS_URL).toBe('redis://localhost:6379');
    });
  });
});
