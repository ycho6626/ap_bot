import { z } from 'zod';

/**
 * Environment configuration schema with validation
 */
const configSchema = z.object({
  // Supabase Configuration
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // Verifier Service Configuration
  VERIFIER_URL: z.string().url('VERIFIER_URL must be a valid URL').default('http://localhost:8000'),

  // VAM (Verified Answer Mode) Configuration
  VAM_MIN_TRUST: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0).max(1))
    .default('0.92'),

  // Stripe Configuration
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_PRICE_CALC_MONTHLY: z.string().min(1, 'STRIPE_PRICE_CALC_MONTHLY is required'),
  STRIPE_PRICE_CALC_YEARLY: z.string().min(1, 'STRIPE_PRICE_CALC_YEARLY is required'),
  STRIPE_PRICE_ALL_ACCESS_MONTHLY: z.string().min(1, 'STRIPE_PRICE_ALL_ACCESS_MONTHLY is required'),
  STRIPE_PRICE_ALL_ACCESS_YEARLY: z.string().min(1, 'STRIPE_PRICE_ALL_ACCESS_YEARLY is required'),

  // Redis Configuration (Optional)
  REDIS_URL: z.string().url().optional(),

  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535))
    .default('3000'),
  API_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535))
    .default('3001'),

  // CORS Configuration
  CORS_ORIGINS: z
    .string()
    .transform((val) => val.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.string().url()))
    .default('http://localhost:3000,http://localhost:3001'),

  // Logging Configuration
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

/**
 * Validated configuration object
 */
export type Config = z.infer<typeof configSchema>;

/**
 * Get validated configuration from environment variables
 * @returns Validated configuration object
 * @throws Error if validation fails
 */
export function getConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`,
      );
      throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Singleton configuration instance
 */
let configInstance: Config | null = null;

/**
 * Get singleton configuration instance
 * @returns Validated configuration object
 */
export function config(): Config {
  if (!configInstance) {
    configInstance = getConfig();
  }
  return configInstance;
}

/**
 * Reset configuration instance (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return config().NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return config().NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return config().NODE_ENV === 'test';
}
