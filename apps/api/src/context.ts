import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import type { AuthUser } from './auth.js';
import { fromDbError, HttpError } from './errors.js';

export interface Ctx {
  admin: SupabaseClient;
  verify: (req: FastifyRequest) => Promise<AuthUser>;
}

/** Ejecuta una función SQL de negocio y traduce errores. */
export async function rpc<T>(ctx: Ctx, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await ctx.admin.rpc(fn, args);
  if (error) throw fromDbError(error);
  return data as T;
}

export function check<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw fromDbError(res.error as { message?: string });
  if (res.data === null) throw new HttpError(404, 'not_found', 'No encontrado');
  return res.data;
}

export async function getProfile(ctx: Ctx, userId: string) {
  const { data } = await ctx.admin
    .from('profiles')
    .select('id, display_name, platform_role, is_demo')
    .eq('id', userId)
    .maybeSingle();
  if (!data) throw new HttpError(403, 'forbidden', 'Perfil no encontrado');
  return data as { id: string; display_name: string; platform_role: 'traveler' | 'admin'; is_demo: boolean };
}

export async function requireAdmin(ctx: Ctx, userId: string) {
  const p = await getProfile(ctx, userId);
  if (p.platform_role !== 'admin') throw new HttpError(403, 'forbidden', 'Solo administradores');
  return p;
}

/** Sucursales operables por el usuario (vía memberships). */
export async function operableBranchIds(ctx: Ctx, userId: string): Promise<string[]> {
  const { data, error } = await ctx.admin
    .from('merchant_memberships')
    .select('merchant_id, branch_id')
    .eq('user_id', userId);
  if (error) throw fromDbError(error);
  if (!data?.length) return [];
  const direct = data.filter((m) => m.branch_id).map((m) => m.branch_id as string);
  const wholeMerchants = data.filter((m) => !m.branch_id).map((m) => m.merchant_id as string);
  let all: string[] = [];
  if (wholeMerchants.length) {
    const { data: br } = await ctx.admin.from('branches').select('id').in('merchant_id', wholeMerchants);
    all = (br ?? []).map((b) => b.id as string);
  }
  return [...new Set([...direct, ...all])];
}

export const BRANCH_COLS =
  'id, name, category, city, description, image_url, lat, lng, hours, is_demo, published, merchants!inner(name, status)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBranch(b: any) {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    city: b.city,
    description: b.description,
    imageUrl: b.image_url,
    lat: b.lat,
    lng: b.lng,
    hours: b.hours,
    isDemo: b.is_demo,
    merchantName: b.merchants?.name ?? '',
  };
}
