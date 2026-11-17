import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateVisitRequestBody,
  type CouponView,
  type MeView,
  type PassportView,
  type RedemptionTokenView,
  type VisitRequestView,
} from '@pg/contracts';
import { type Ctx, getProfile, rpc } from '../context.js';
import { fromDbError } from '../errors.js';
import { withIdempotency } from '../idempotency.js';

const IdParam = z.object({ id: z.uuid() });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapVisit(v: any): VisitRequestView {
  return {
    id: v.id,
    status: v.status,
    branchId: v.branch_id,
    branchName: v.branches?.name ?? '',
    travelerName: v.profiles?.display_name ?? '',
    createdAt: v.created_at,
    decidedAt: v.decided_at,
    rejectReason: v.reject_reason,
  };
}

export function travelerRoutes(app: FastifyInstance, ctx: Ctx) {
  app.get('/v1/me', async (req) => {
    const user = await ctx.verify(req);
    const p = await getProfile(ctx, user.id);
    const { data, error } = await ctx.admin
      .from('merchant_memberships')
      .select('merchant_id, branch_id, role, merchants(name), branches(name)')
      .eq('user_id', user.id);
    if (error) throw fromDbError(error);
    const me: MeView = {
      userId: user.id,
      displayName: p.display_name,
      platformRole: p.platform_role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberships: (data ?? []).map((m: any) => ({
        merchantId: m.merchant_id,
        merchantName: m.merchants?.name ?? '',
        branchId: m.branch_id,
        branchName: m.branches?.name ?? null,
        role: m.role,
      })),
    };
    return { me };
  });

  app.post('/v1/visit-requests', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const user = await ctx.verify(req);
    const body = CreateVisitRequestBody.parse(req.body);
    return withIdempotency(ctx.admin, req, reply, user.id, 'visit-requests.create', async () => {
      const res = await rpc<{ id: string; branchId: string; branchName: string; status: string }>(
        ctx,
        'create_visit_request',
        { p_user: user.id, p_qr_code: body.qrCode, p_campaign: body.campaignId ?? null },
      );
      return { status: 201, body: { visitRequest: res } };
    });
  });

  app.get('/v1/me/passport', async (req) => {
    const user = await ctx.verify(req);
    await rpc(ctx, 'refresh_user_rewards', { p_user: user.id });

    const now = new Date().toISOString();
    const { data: campaign } = await ctx.admin
      .from('campaigns')
      .select('id, name, starts_at, ends_at')
      .lte('starts_at', now)
      .gt('ends_at', now)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!campaign) {
      const empty: PassportView = { campaign: null, stamps: [], pending: [], tiers: [], notices: [] };
      return { passport: empty };
    }

    const [stampsRes, pendingRes, tiersRes, entRes] = await Promise.all([
      ctx.admin
        .from('stamps')
        .select('id, branch_id, created_at, is_demo_preload, branches(name, category)')
        .eq('user_id', user.id)
        .eq('campaign_id', campaign.id)
        .order('created_at'),
      ctx.admin
        .from('visit_requests')
        .select('id, status, branch_id, created_at, decided_at, reject_reason, branches(name)')
        .eq('user_id', user.id)
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      ctx.admin
        .from('reward_tiers')
        .select('id, name, stamps_required, description')
        .eq('campaign_id', campaign.id)
        .order('stamps_required'),
      ctx.admin
        .from('reward_entitlements')
        .select('id, tier_id, reward_tiers(name), coupons(id, status)')
        .eq('user_id', user.id)
        .eq('campaign_id', campaign.id),
    ]);
    for (const r of [stampsRes, pendingRes, tiersRes, entRes]) if (r.error) throw fromDbError(r.error);

    const stamps = stampsRes.data ?? [];
    const notices: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const e of (entRes.data ?? []) as any[]) {
      const live = (e.coupons ?? []).some((c: { status: string }) => c.status !== 'expired');
      if (!live) {
        notices.push(
          `Alcanzaste el nivel "${e.reward_tiers?.name ?? ''}", pero sus beneficios están agotados. ` +
            'Conservas tu derecho y emitiremos el cupón cuando haya cupo.',
        );
      }
    }

    const passport: PassportView = {
      campaign: { id: campaign.id, name: campaign.name, startsAt: campaign.starts_at, endsAt: campaign.ends_at },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stamps: stamps.map((s: any) => ({
        id: s.id,
        branchId: s.branch_id,
        branchName: s.branches?.name ?? '',
        category: s.branches?.category ?? 'food',
        createdAt: s.created_at,
        isDemo: s.is_demo_preload,
      })),
      pending: (pendingRes.data ?? []).map(mapVisit),
      tiers: (tiersRes.data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        stampsRequired: t.stamps_required,
        description: t.description,
        unlocked: stamps.length >= t.stamps_required,
      })),
      notices,
    };
    return { passport };
  });

  app.get('/v1/me/coupons', async (req) => {
    const user = await ctx.verify(req);
    await rpc(ctx, 'refresh_user_rewards', { p_user: user.id });
    const { data, error } = await ctx.admin
      .from('coupons')
      .select(
        'id, status, issued_at, expires_at, redeemed_at, offers(title, conditions, merchants(name)), reward_entitlements(reward_tiers(name))',
      )
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })
      .limit(100);
    if (error) throw fromDbError(error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coupons: CouponView[] = (data ?? []).map((c: any) => ({
      id: c.id,
      status: c.status,
      offerTitle: c.offers?.title ?? '',
      conditions: c.offers?.conditions ?? '',
      merchantName: c.offers?.merchants?.name ?? '',
      tierName: c.reward_entitlements?.reward_tiers?.name ?? '',
      issuedAt: c.issued_at,
      expiresAt: c.expires_at,
      redeemedAt: c.redeemed_at,
    }));
    return { coupons };
  });

  app.get('/v1/me/history', async (req) => {
    const user = await ctx.verify(req);
    const { data, error } = await ctx.admin
      .from('visit_requests')
      .select('id, status, branch_id, created_at, decided_at, reject_reason, branches(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw fromDbError(error);
    return { visits: (data ?? []).map(mapVisit) };
  });

  app.post(
    '/v1/coupons/:id/redemption-token',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req) => {
      const user = await ctx.verify(req);
      const { id } = IdParam.parse(req.params);
      const token = await rpc<RedemptionTokenView>(ctx, 'issue_redemption_token', { p_user: user.id, p_coupon: id });
      return { token };
    },
  );
}
