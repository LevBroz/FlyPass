import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { type Ctx, requireAdmin } from '../context.js';
import { fromDbError, HttpError } from '../errors.js';

const IdParam = z.object({ id: z.uuid() });
const MerchantPatch = z.object({ status: z.enum(['prospect', 'active', 'paused']) });
const AuditQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) });

export function adminRoutes(app: FastifyInstance, ctx: Ctx) {
  app.get('/v1/admin/overview', async (req) => {
    const user = await ctx.verify(req);
    await requireAdmin(ctx, user.id);
    const [merchants, campaigns, offers, members] = await Promise.all([
      ctx.admin.from('merchants').select('id, name, plan, status, is_demo, branches(id, name, city, qr_code)').order('name'),
      ctx.admin.from('campaigns').select('id, name, starts_at, ends_at, is_demo, reward_tiers(id, name, stamps_required)').order('starts_at', { ascending: false }),
      ctx.admin.from('offers').select('id, title, active, merchants(name), reward_tiers(name), reward_inventory(total, reserved, redeemed)').order('title'),
      ctx.admin.from('merchant_memberships').select('role, profiles(display_name), merchants(name), branches(name)'),
    ]);
    for (const r of [merchants, campaigns, offers, members]) if (r.error) throw fromDbError(r.error);
    return {
      merchants: merchants.data,
      campaigns: campaigns.data,
      offers: offers.data,
      memberships: members.data,
    };
  });

  app.patch('/v1/admin/merchants/:id', async (req) => {
    const user = await ctx.verify(req);
    await requireAdmin(ctx, user.id);
    const { id } = IdParam.parse(req.params);
    const body = MerchantPatch.parse(req.body);
    const { data, error } = await ctx.admin.from('merchants').update({ status: body.status }).eq('id', id).select('id, status').maybeSingle();
    if (error) throw fromDbError(error);
    if (!data) throw new HttpError(404, 'not_found', 'Comercio no encontrado');
    await ctx.admin.from('audit_events').insert({
      actor_id: user.id,
      action: 'merchant.status_changed',
      object_type: 'merchant',
      object_id: id,
      data: { status: body.status },
    });
    return { merchant: data };
  });

  app.get('/v1/admin/audit', async (req) => {
    const user = await ctx.verify(req);
    await requireAdmin(ctx, user.id);
    const { limit } = AuditQuery.parse(req.query);
    const { data, error } = await ctx.admin
      .from('audit_events')
      .select('id, actor_id, action, object_type, object_id, data, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw fromDbError(error);
    // Nombres de actores para lectura humana
    const ids = [...new Set((data ?? []).map((e) => e.actor_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await ctx.admin.from('profiles').select('id, display_name').in('id', ids);
      for (const p of profiles ?? []) names.set(p.id, p.display_name);
    }
    return {
      events: (data ?? []).map((e) => ({ ...e, actorName: e.actor_id ? (names.get(e.actor_id) ?? 'desconocido') : 'sistema' })),
    };
  });
}
