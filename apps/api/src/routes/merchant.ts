import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RedeemBody, RejectVisitBody, type MerchantMetrics } from '@pg/contracts';
import { type Ctx, operableBranchIds, rpc } from '../context.js';
import { fromDbError, HttpError } from '../errors.js';
import { withIdempotency } from '../idempotency.js';
import { mapVisit } from './traveler.js';

const IdParam = z.object({ id: z.uuid() });
const ListQuery = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const MetricsQuery = z.object({ merchantId: z.uuid() });

export function merchantRoutes(app: FastifyInstance, ctx: Ctx) {
  // Bandeja del personal: solo solicitudes de sus sucursales
  app.get('/v1/merchant/visit-requests', async (req) => {
    const user = await ctx.verify(req);
    const q = ListQuery.parse(req.query);
    const branchIds = await operableBranchIds(ctx, user.id);
    if (!branchIds.length) return { visitRequests: [] };
    const { data, error } = await ctx.admin
      .from('visit_requests')
      .select(
        'id, status, branch_id, created_at, decided_at, reject_reason, branches(name), profiles!visit_requests_user_id_fkey(display_name)',
      )
      .in('branch_id', branchIds)
      .eq('status', q.status)
      .order(q.status === 'pending' ? 'created_at' : 'decided_at', { ascending: q.status === 'pending' })
      .limit(q.limit);
    if (error) throw fromDbError(error);
    return { visitRequests: (data ?? []).map(mapVisit) };
  });

  app.post('/v1/visit-requests/:id/approve', async (req, reply) => {
    const user = await ctx.verify(req);
    const { id } = IdParam.parse(req.params);
    return withIdempotency(ctx.admin, req, reply, user.id, `visit-requests.approve:${id}`, async () => {
      const res = await rpc(ctx, 'approve_visit', { p_actor: user.id, p_request: id });
      return { status: 200, body: { result: res } };
    });
  });

  app.post('/v1/visit-requests/:id/reject', async (req, reply) => {
    const user = await ctx.verify(req);
    const { id } = IdParam.parse(req.params);
    const body = RejectVisitBody.parse(req.body);
    return withIdempotency(ctx.admin, req, reply, user.id, `visit-requests.reject:${id}`, async () => {
      const res = await rpc(ctx, 'reject_visit', { p_actor: user.id, p_request: id, p_reason: body.reason });
      return { status: 200, body: { result: res } };
    });
  });

  app.post('/v1/redemptions', { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } }, async (req, reply) => {
    const user = await ctx.verify(req);
    const body = RedeemBody.parse(req.body);
    return withIdempotency(ctx.admin, req, reply, user.id, 'redemptions.create', async () => {
      const res = await rpc<{ error?: string; message?: string }>(ctx, 'redeem_coupon', {
        p_actor: user.id,
        p_code: body.code,
        p_branch: body.branchId,
      });
      if (res?.error) throw new HttpError(422, res.error, res.message ?? 'Código inválido');
      return { status: 201, body: { redemption: res } };
    });
  });

  app.get('/v1/merchant/metrics', async (req) => {
    const user = await ctx.verify(req);
    const { merchantId } = MetricsQuery.parse(req.query);
    const metrics = await rpc<MerchantMetrics>(ctx, 'merchant_metrics', { p_actor: user.id, p_merchant: merchantId });
    return { metrics };
  });

  // Sucursales operables (selector del panel)
  app.get('/v1/merchant/branches', async (req) => {
    const user = await ctx.verify(req);
    const ids = await operableBranchIds(ctx, user.id);
    if (!ids.length) return { branches: [] };
    const { data, error } = await ctx.admin
      .from('branches')
      .select('id, name, city, qr_code, merchant_id, merchants(name)')
      .in('id', ids)
      .order('name');
    if (error) throw fromDbError(error);
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      branches: (data ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        city: b.city,
        qrCode: b.qr_code,
        merchantId: b.merchant_id,
        merchantName: b.merchants?.name ?? '',
      })),
    };
  });
}
