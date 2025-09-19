import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import type { FastifyInstance } from 'fastify';

const fallbackEnv: Record<string, string> = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_KEY: 'service-key',
  OPENAI_API_KEY: 'test-openai-key',
  VERIFIER_URL: 'http://localhost:8000',
  VAM_MIN_TRUST: '0.92',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
  STRIPE_PRICE_CALC_MONTHLY: 'price_calc_monthly',
  STRIPE_PRICE_CALC_YEARLY: 'price_calc_yearly',
  STRIPE_PRICE_ALL_ACCESS_MONTHLY: 'price_all_access_monthly',
  STRIPE_PRICE_ALL_ACCESS_YEARLY: 'price_all_access_yearly',
  NODE_ENV: 'development',
  PORT: '3000',
  API_PORT: '3001',
  WEB_URL: 'http://localhost:3000',
  CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001',
  LOG_LEVEL: 'info',
};

for (const [key, value] of Object.entries(fallbackEnv)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

if (!process.env['OTEL_DISABLED']) {
  process.env['OTEL_DISABLED'] = 'true';
}

async function generate(): Promise<void> {
  const { createServer } = await import('../src/server');
  const server: FastifyInstance = await createServer();

  try {
    await server.ready();
    const specification = server.swagger();
    const outputDir = path.resolve(__dirname, '..', 'openapi');
    await mkdir(outputDir, { recursive: true });

    const jsonPath = path.join(outputDir, 'openapi.json');
    const yamlPath = path.join(outputDir, 'openapi.yaml');

    const jsonContent = JSON.stringify(specification, null, 2);
    const yamlContent = yaml.stringify(specification);

    await writeFile(jsonPath, `${jsonContent}\n`);
    await writeFile(yamlPath, yamlContent);

    console.log(`OpenAPI spec generated:\n- ${jsonPath}\n- ${yamlPath}`);
  } finally {
    await server.close();
  }
}

generate()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to generate OpenAPI specification', error);
    process.exit(1);
  });
