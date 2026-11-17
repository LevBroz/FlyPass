import { z } from 'zod';

const Env = z.object({
  APP_ENV: z.enum(['development', 'demo', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  CORS_ORIGINS: z.string().default(''),
});

export type Env = z.infer<typeof Env>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    // No imprimir valores: solo nombres de variables con problema
    const names = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Variables de entorno inválidas o ausentes: ${names}`);
  }
  return parsed.data;
}
