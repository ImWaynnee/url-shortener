import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .url()
    .default('http://sh-api-local.wyzwyz.xyz'),

  VITE_REDIRECT_DOMAIN: z
    .url()
    .default('http://s-local.wyzwyz.xyz'),
    
  VITE_APP_MODE: z.enum(['development', 'production', 'test']).default('development')
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error
  );
  throw new Error("Invalid environment variables");
}

// 4. Export the validated data
export const env = parsed.data;