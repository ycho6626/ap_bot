import { vi } from 'vitest';

// Mock all required environment variables for testing
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubEnv('SUPABASE_SERVICE_KEY', 'test-service-key');
vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
vi.stubEnv('VERIFIER_URL', 'http://localhost:8000');
vi.stubEnv('VAM_MIN_TRUST', '0.92');
vi.stubEnv('STRIPE_SECRET_KEY', 'test-stripe-secret');
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'test-stripe-webhook-secret');
vi.stubEnv('STRIPE_PRICE_CALC_MONTHLY', 'price_calc_monthly_test');
vi.stubEnv('STRIPE_PRICE_CALC_YEARLY', 'price_calc_yearly_test');
vi.stubEnv('STRIPE_PRICE_ALL_ACCESS_MONTHLY', 'price_all_access_monthly_test');
vi.stubEnv('STRIPE_PRICE_ALL_ACCESS_YEARLY', 'price_all_access_yearly_test');
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('PORT', '3000');
vi.stubEnv('API_PORT', '3001');
vi.stubEnv('WEB_URL', 'http://localhost:3000');
vi.stubEnv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001');
vi.stubEnv('LOG_LEVEL', 'info');

// Mock the logger module
vi.mock('@ap/shared/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the supabase module
vi.mock('@ap/shared/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      })),
    })),
  },
}));
