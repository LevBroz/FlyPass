import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import type { Env } from './env.js';
import type { Ctx } from './context.js';
import { HttpError } from './errors.js';
import { catalogRoutes } from './routes/catalog.js';
import { travelerRoutes } from './routes/traveler.js';
import { merchantRoutes } from './routes/merchant.js';
import { adminRoutes } from './routes/admin.js';

export async function buildApp(env: Env, ctx: Ctx): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: 16 * 1024,
    trustProxy: true, // Render está detrás de un proxy
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      return typeof incoming === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    },
    logger:
      env.APP_ENV === 'test'
        ? false
        : {
            level: env.APP_ENV === 'production' ? 'info' : 'debug',
            // Nunca registrar tokens ni secretos
            redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["idempotency-key"]'],
          },
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
    reply.header('x-content-type-options', 'nosniff');
    reply.header('cache-control', 'no-store');
  });

  // CORS limita navegadores; NO sustituye la autenticación.
  const norm = (o: string) => o.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '').toLowerCase();
  const origins = env.CORS_ORIGINS.split(',').map(norm).filter(Boolean);
  if (!origins.length) app.log.warn('CORS_ORIGINS vacío: ningún navegador podrá llamar a la API');
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || origins.includes(norm(origin))),
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
    maxAge: 600,
  });

  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.status).send({ error: { code: err.code, message: err.message, requestId: req.id } });
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: { code: 'validation', message: err.issues[0]?.message ?? 'Datos inválidos', requestId: req.id },
      });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      return reply.code(status).send({ error: { code: 'bad_request', message: (err as Error).message, requestId: req.id } });
    }
    req.log.error({ err }, 'unhandled');
    return reply.code(500).send({ error: { code: 'internal', message: 'Error interno', requestId: req.id } });
  });

  app.setNotFoundHandler((req, reply) =>
    reply.code(404).send({ error: { code: 'not_found', message: 'Ruta no encontrada', requestId: req.id } }),
  );

  app.get('/health', async () => ({ ok: true, env: env.APP_ENV }));

  app.get('/ready', async (_req, reply) => {
    const { error } = await ctx.admin.from('campaigns').select('id').limit(1);
    if (error) return reply.code(503).send({ ok: false });
    return { ok: true };
  });

  catalogRoutes(app, ctx);
  travelerRoutes(app, ctx);
  merchantRoutes(app, ctx);
  adminRoutes(app, ctx);

  return app;
}
