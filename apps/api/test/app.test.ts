import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildApp } from '../src/app.js';
import { HttpError, fromDbError } from '../src/errors.js';
import { loadEnv } from '../src/env.js';
import { parseBranchQr } from '@pg/contracts';

const env = loadEnv({
  APP_ENV: 'test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(40),
  CORS_ORIGINS: 'https://demo.example.com',
});

// Cliente falso: registra llamadas RPC y responde lo configurado
function fakeAdmin(rpcResult: { data?: unknown; error?: unknown } = {}) {
  const calls: { fn: string; args: unknown }[] = [];
  const admin = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return { data: rpcResult.data ?? null, error: rpcResult.error ?? null };
    },
    from: () => {
      const q: Record<string, unknown> = {};
      const chain = () => q;
      for (const m of ['select', 'eq', 'in', 'order', 'limit', 'lte', 'gt', 'upsert', 'insert', 'update']) q[m] = chain;
      q.maybeSingle = async () => ({ data: null, error: null });
      q.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
      return q;
    },
  } as unknown as SupabaseClient;
  return { admin, calls };
}

const USER = { id: '11111111-1111-4111-8111-111111111111', email: null };

async function appWith(opts: { authed?: boolean; rpc?: { data?: unknown; error?: unknown } } = {}) {
  const { admin, calls } = fakeAdmin(opts.rpc);
  const app = await buildApp(env, {
    admin,
    verify: async () => {
      if (!opts.authed) throw new HttpError(401, 'unauthenticated', 'Inicia sesión');
      return USER;
    },
  });
  return { app, calls };
}

describe('api', () => {
  it('health no expone secretos', async () => {
    const { app } = await appWith();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('x'.repeat(40));
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('rechaza solicitudes sin token', async () => {
    const { app } = await appWith();
    const res = await app.inject({ method: 'POST', url: '/v1/visit-requests', payload: { qrCode: 'cafe-volcan-7k2q' } });
    expect(res.statusCode).toBe(401);
  });

  it('valida el cuerpo antes de tocar la base', async () => {
    const { app, calls } = await appWith({ authed: true });
    const res = await app.inject({ method: 'POST', url: '/v1/visit-requests', payload: { qrCode: "x'; drop" } });
    expect(res.statusCode).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('pasa el usuario autenticado (no el del cliente) a la función SQL', async () => {
    const { app, calls } = await appWith({ authed: true, rpc: { data: { id: 'v1', status: 'pending' } } });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/visit-requests',
      payload: { qrCode: 'cafe-volcan-7k2q', userId: 'atacante' },
    });
    expect(res.statusCode).toBe(201);
    expect(calls[0]).toEqual({
      fn: 'create_visit_request',
      args: { p_user: USER.id, p_qr_code: 'cafe-volcan-7k2q', p_campaign: null },
    });
  });

  it('traduce errores de negocio', async () => {
    const { app } = await appWith({ authed: true, rpc: { error: { message: 'forbidden', details: 'forbidden' } } });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/visit-requests/22222222-2222-4222-8222-222222222222/approve',
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('forbidden');
  });

  it('canje con código inválido responde 422', async () => {
    const { app } = await appWith({ authed: true, rpc: { data: { error: 'invalid_code', message: 'Código inválido' } } });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/redemptions',
      payload: { code: '123456', branchId: '22222222-2222-4222-8222-222222222222' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('CORS solo permite orígenes configurados', async () => {
    const { app } = await appWith();
    const ok = await app.inject({ method: 'OPTIONS', url: '/v1/routes', headers: { origin: 'https://demo.example.com', 'access-control-request-method': 'GET' } });
    const bad = await app.inject({ method: 'OPTIONS', url: '/v1/routes', headers: { origin: 'https://evil.example', 'access-control-request-method': 'GET' } });
    expect(ok.headers['access-control-allow-origin']).toBe('https://demo.example.com');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('utilidades', () => {
  it('mapea errores desconocidos a 500 genérico', () => {
    const e = fromDbError({ message: 'relation x does not exist' });
    expect(e.status).toBe(500);
    expect(e.message).toBe('Error interno');
  });

  it('parsea QR válidos y rechaza otros', () => {
    expect(parseBranchQr('pguanaco://branch/cafe-volcan-7k2q')).toBe('cafe-volcan-7k2q');
    expect(parseBranchQr('https://demo.netlify.app/b/taller-anil-6r9k')).toBe('taller-anil-6r9k');
    expect(parseBranchQr('https://evil.com/x?y=1')).toBeNull();
    expect(parseBranchQr('cafe-volcan-7k2q')).toBeNull();
  });
});
