import { buildApp } from './app.js';
import { createAuthVerifier } from './auth.js';
import { loadEnv } from './env.js';
import { createAdminClient } from './supabase.js';

const env = loadEnv();
const admin = createAdminClient(env);
const app = await buildApp(env, { admin, verify: createAuthVerifier(env, admin) });

// Render inyecta PORT; escuchar en 0.0.0.0
await app.listen({ host: '0.0.0.0', port: env.PORT });

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, () => {
    app.close().then(() => process.exit(0));
  });
}
