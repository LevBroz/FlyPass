/**
 * Prueba de integración de migraciones + seed + reglas de negocio + RLS
 * sobre Postgres 17 real (PGlite/WASM). Simula los esquemas mínimos de
 * Supabase (auth.users, auth.uid(), roles anon/authenticated/service_role).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const ROOT = join(import.meta.dirname, '..', '..', '..', 'supabase');

const SUPABASE_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema extensions;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth, extensions to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const U = {
  a: '10000000-0000-4000-8000-00000000000a',
  b: '10000000-0000-4000-8000-00000000000b',
  flores: '10000000-0000-4000-8000-0000000000f1',
  lago: '10000000-0000-4000-8000-0000000000f2',
  admin: '10000000-0000-4000-8000-0000000000ad',
};
const BR = {
  cafe: 'b0000000-0000-4000-a000-000000000001',
  taller: 'b0000000-0000-4000-a000-000000000008',
  tostaduria: 'b0000000-0000-4000-a000-000000000012',
  pupuseria: 'b0000000-0000-4000-a000-000000000002',
};
const M = { cafe: 'a0000000-0000-4000-a000-000000000001', kayak: 'a0000000-0000-4000-a000-000000000009' };

let db: PGlite;

async function call<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  const r = await db.query<{ r: T }>(`select ${sql} as r`, params);
  return r.rows[0]!.r;
}
async function expectErr(sql: string, params: unknown[], code: string) {
  await expect(db.query(`select ${sql}`, params)).rejects.toThrow(code);
}
async function count(table: string, where = 'true', params: unknown[] = []) {
  const r = await db.query<{ c: number }>(`select count(*)::int c from ${table} where ${where}`, params);
  return r.rows[0]!.c;
}

beforeAll(async () => {
  db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUBS);
  const migrations = readdirSync(join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migrations) await db.exec(readFileSync(join(ROOT, 'migrations', f), 'utf8'));
  await db.exec(readFileSync(join(ROOT, 'seed.sql'), 'utf8'));

  // Usuarios demo (el trigger crea perfiles con rol traveler)
  for (const [k, id] of Object.entries(U)) {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
      id,
      `${k}@demo.test`,
      JSON.stringify({ display_name: k, platform_role: 'admin' }), // intento de escalar rol: debe ignorarse
    ]);
  }
  await db.query(`update public.profiles set is_demo = true`);
  await db.query(`update public.profiles set platform_role = 'admin' where id = $1`, [U.admin]);
  await db.query(
    `insert into public.merchant_memberships (user_id, merchant_id, branch_id, role) values
      ($1, 'a0000000-0000-4000-a000-000000000001', $3, 'staff'),
      ($1, 'a0000000-0000-4000-a000-000000000008', $4, 'staff'),
      ($2, 'a0000000-0000-4000-a000-000000000009', null, 'staff')`,
    [U.flores, U.lago, BR.cafe, BR.taller],
  );
  await call(`public.demo_reset($1, $2)`, [U.a, U.flores]);
}, 60_000);

describe('perfiles', () => {
  it('el rol nunca se toma de metadatos del usuario', async () => {
    const r = await db.query<{ platform_role: string }>(`select platform_role from public.profiles where id = $1`, [U.b]);
    expect(r.rows[0]!.platform_role).toBe('traveler');
  });
});

describe('flujo completo de demo', () => {
  let requestId = '';
  let couponId = '';
  let code = '';

  it('demo_reset precarga 2 sellos y 3 cupones históricos', async () => {
    expect(await count('public.stamps', 'user_id = $1 and campaign_id = $2', [U.a, 'd0000000-0000-4000-a000-000000000001'])).toBe(2);
    const r = await db.query<{ status: string }>(`select status::text from public.coupons where user_id = $1 order by status::text`, [U.a]);
    expect(r.rows.map((x) => x.status)).toEqual(['expired', 'issued', 'redeemed']);
  });

  it('escanear QR crea solicitud pendiente idempotente', async () => {
    const r1 = await call<{ id: string }>(`public.create_visit_request($1, $2)`, [U.a, 'taller-anil-6r9k']);
    const r2 = await call<{ id: string }>(`public.create_visit_request($1, $2)`, [U.a, 'taller-anil-6r9k']);
    expect(r1.id).toBe(r2.id);
    requestId = r1.id;
    expect(await count('public.visit_requests', 'user_id = $1 and status = $2', [U.a, 'pending'])).toBe(1);
  });

  it('QR desconocido falla', async () => {
    await expectErr(`public.create_visit_request($1, $2)`, [U.a, 'no-existe-123'], 'not_found');
  });

  it('personal de otro comercio no puede aprobar (aislamiento)', async () => {
    await expectErr(`public.approve_visit($1, $2)`, [U.lago, requestId], 'forbidden');
    await expectErr(`public.approve_visit($1, $2)`, [U.a, requestId], 'forbidden');
  });

  it('aprobar emite un solo sello y desbloquea cupón con inventario', async () => {
    const r1 = await call<{ replayed: boolean; stampId: string }>(`public.approve_visit($1, $2)`, [U.flores, requestId]);
    const r2 = await call<{ replayed: boolean; stampId: string }>(`public.approve_visit($1, $2)`, [U.flores, requestId]);
    expect(r1.replayed).toBe(false);
    expect(r2.replayed).toBe(true);
    expect(r2.stampId).toBe(r1.stampId);
    expect(await count('public.stamps', 'user_id = $1 and campaign_id = $2', [U.a, 'd0000000-0000-4000-a000-000000000001'])).toBe(3);

    const c = await db.query<{ id: string; offer_id: string }>(
      `select c.id, c.offer_id from public.coupons c join public.reward_entitlements e on e.id = c.entitlement_id
       where c.user_id = $1 and e.campaign_id = 'd0000000-0000-4000-a000-000000000001'`,
      [U.a],
    );
    expect(c.rows).toHaveLength(1);
    expect(c.rows[0]!.offer_id).toBe('f0000000-0000-4000-a000-000000000001'); // mayor prioridad
    couponId = c.rows[0]!.id;
    const inv = await db.query<{ reserved: number }>(`select reserved from public.reward_inventory where offer_id = $1`, [c.rows[0]!.offer_id]);
    expect(inv.rows[0]!.reserved).toBe(1);
  });

  it('no se puede volver a sellar el mismo lugar', async () => {
    await expectErr(`public.create_visit_request($1, $2)`, [U.a, 'taller-anil-6r9k'], 'already_stamped');
  });

  it('código temporal de 6 dígitos; solo se guarda hash', async () => {
    const t = await call<{ code: string }>(`public.issue_redemption_token($1, $2)`, [U.a, couponId]);
    expect(t.code).toMatch(/^\d{6}$/);
    code = t.code;
    const row = await db.query<{ code_hash: string }>(`select code_hash from public.coupons where id = $1`, [couponId]);
    expect(row.rows[0]!.code_hash).not.toContain(code);
    await expectErr(`public.issue_redemption_token($1, $2)`, [U.b, couponId], 'not_found');
  });

  it('canje: comercio no autorizado / sucursal de otro comercio rechazados', async () => {
    await expectErr(`public.redeem_coupon($1, $2, $3)`, [U.lago, code, BR.cafe], 'forbidden');
    const wrong = await call<{ error?: string }>(`public.redeem_coupon($1, $2, $3)`, [U.flores, code, BR.taller]);
    expect(wrong.error).toBe('invalid_code');
  });

  it('canje exitoso una sola vez', async () => {
    const ok = await call<{ couponId: string; error?: string }>(`public.redeem_coupon($1, $2, $3)`, [U.flores, code, BR.cafe]);
    expect(ok.error).toBeUndefined();
    expect(ok.couponId).toBe(couponId);
    const again = await call<{ error?: string }>(`public.redeem_coupon($1, $2, $3)`, [U.flores, code, BR.cafe]);
    expect(again.error).toBe('invalid_code');
    await expectErr(`public.issue_redemption_token($1, $2)`, [U.a, couponId], 'invalid_state');
    const inv = await db.query<{ reserved: number; redeemed: number }>(
      `select reserved, redeemed from public.reward_inventory where offer_id = 'f0000000-0000-4000-a000-000000000001'`,
    );
    expect(inv.rows[0]).toEqual({ reserved: 0, redeemed: 1 });
    expect(await count('public.redemptions', 'coupon_id = $1', [couponId])).toBe(1);
  });

  it('métricas limitadas al comercio autorizado', async () => {
    const m = await call<{ redemptions: number; couponsIssued: number }>(`public.merchant_metrics($1, $2)`, [U.flores, M.cafe]);
    expect(m.redemptions).toBe(2); // 1 histórico demo + 1 en vivo
    await expectErr(`public.merchant_metrics($1, $2)`, [U.lago, M.cafe], 'forbidden');
    await call(`public.merchant_metrics($1, $2)`, [U.admin, M.cafe]);
  });
});

describe('inventario y vencimiento', () => {
  it('sin inventario: conserva derecho y emite cuando hay cupo', async () => {
    await db.query(`update public.reward_inventory set total = reserved + redeemed where offer_id in (
      select id from public.offers where tier_id = 'e0000000-0000-4000-a000-000000000001')`);
    for (const qr of ['cafe-volcan-7k2q', 'pupuseria-ceiba-3m8x', 'tostaduria-cumbre-7n4g']) {
      const r = await call<{ id: string }>(`public.create_visit_request($1, $2)`, [U.b, qr]);
      const staff = qr.startsWith('cafe') ? U.flores : U.admin;
      if (staff === U.admin) {
        // admin no es personal del comercio: debe fallar; aprobamos con membresía temporal
        await expectErr(`public.approve_visit($1, $2)`, [U.admin, r.id], 'forbidden');
        await db.query(`insert into public.merchant_memberships (user_id, merchant_id) select $1, merchant_id from public.branches where qr_code = $2`, [U.flores, qr]);
      }
      await call(`public.approve_visit($1, $2)`, [U.flores, r.id]);
    }
    expect(await count('public.reward_entitlements', 'user_id = $1', [U.b])).toBe(1);
    expect(await count('public.coupons', 'user_id = $1', [U.b])).toBe(0);

    await db.query(`update public.reward_inventory set total = total + 1 where offer_id = 'f0000000-0000-4000-a000-000000000003'`);
    await call(`public.refresh_user_rewards($1)`, [U.b]);
    expect(await count('public.coupons', 'user_id = $1 and status = $2', [U.b, 'issued'])).toBe(1);
  });

  it('vencer libera la reserva exactamente una vez', async () => {
    const before = await db.query<{ reserved: number }>(`select reserved from public.reward_inventory where offer_id = 'f0000000-0000-4000-a000-000000000003'`);
    await db.query(`update public.coupons set expires_at = now() - interval '1 minute' where user_id = $1`, [U.b]);
    expect(await call<number>(`public.expire_coupons()`)).toBe(1);
    expect(await call<number>(`public.expire_coupons()`)).toBe(0);
    const after = await db.query<{ reserved: number }>(`select reserved from public.reward_inventory where offer_id = 'f0000000-0000-4000-a000-000000000003'`);
    expect(after.rows[0]!.reserved).toBe(before.rows[0]!.reserved - 1);
  });

  it('límite de intentos fallidos de canje', async () => {
    let attempts = 0;
    let limited = false;
    for (; attempts < 12 && !limited; attempts++) {
      try {
        await call(`public.redeem_coupon($1, $2, $3)`, [U.flores, '000000', BR.cafe]);
      } catch (e) {
        expect(String(e)).toContain('rate_limited');
        limited = true;
      }
    }
    expect(limited).toBe(true);
    expect(attempts).toBeLessThanOrEqual(9);
    // un código correcto tampoco pasa mientras dure el bloqueo
    await expectErr(`public.redeem_coupon($1, $2, $3)`, [U.flores, '123456', BR.cafe], 'rate_limited');
  });
});

describe('RLS: el cliente no tiene atajos', () => {
  async function asUser<T>(uid: string, fn: () => Promise<T>) {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
    try {
      return await fn();
    } finally {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
    }
  }

  it('viajero no puede insertar sellos ni modificar inventario o rol', async () => {
    await asUser(U.b, async () => {
      await expect(
        db.query(`insert into public.stamps (user_id, campaign_id, branch_id) values ($1, 'd0000000-0000-4000-a000-000000000001', $2)`, [U.b, BR.taller]),
      ).rejects.toThrow(/permission denied/);
      await expect(db.query(`update public.reward_inventory set total = 999`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`update public.profiles set platform_role = 'admin' where id = $1`, [U.b])).rejects.toThrow(/permission denied/);
    });
  });

  it('viajero no puede ejecutar funciones de negocio directamente', async () => {
    await asUser(U.b, async () => {
      await expect(db.query(`select public.approve_visit($1, gen_random_uuid())`, [U.b])).rejects.toThrow(/permission denied/);
      await expect(db.query(`select public.demo_reset($1, $1)`, [U.b])).rejects.toThrow(/permission denied/);
    });
  });

  it('viajero solo ve sus propios sellos; no ve cupones/hash ni secretos', async () => {
    await asUser(U.b, async () => {
      const own = await db.query<{ user_id: string }>(`select user_id from public.stamps`);
      expect(own.rows.length).toBeGreaterThan(0);
      expect(own.rows.every((r) => r.user_id === U.b)).toBe(true);
      await expect(db.query(`select code_hash from public.coupons`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select * from public.app_secrets`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select * from public.merchant_memberships`)).rejects.toThrow(/permission denied/);
    });
  });

  it('anónimo lee catálogo publicado', async () => {
    await db.exec(`set role anon`);
    try {
      const r = await db.query(`select id from public.branches`);
      expect(r.rows).toHaveLength(12);
    } finally {
      await db.exec(`reset role`);
    }
  });
});
