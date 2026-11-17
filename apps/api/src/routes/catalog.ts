import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BranchDetail, RouteDetail, RouteSummary } from '@pg/contracts';
import { BRANCH_COLS, type Ctx, mapBranch } from '../context.js';
import { fromDbError, HttpError } from '../errors.js';

const IdParam = z.object({ id: z.uuid() });
const QrParam = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{4,64}$/) });

export function catalogRoutes(app: FastifyInstance, ctx: Ctx) {
  app.get('/v1/routes', async () => {
    const { data, error } = await ctx.admin
      .from('routes')
      .select('id, name, region, description, cover_url, is_demo, route_stops(count)')
      .eq('published', true)
      .order('sort_order');
    if (error) throw fromDbError(error);
    const routes: RouteSummary[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      region: r.region,
      description: r.description,
      coverUrl: r.cover_url,
      isDemo: r.is_demo,
      stopCount: (r.route_stops as unknown as { count: number }[])[0]?.count ?? 0,
    }));
    return { routes };
  });

  app.get('/v1/routes/:id', async (req) => {
    const { id } = IdParam.parse(req.params);
    const { data, error } = await ctx.admin
      .from('routes')
      .select(`id, name, region, description, cover_url, is_demo, route_stops(position, branches!inner(${BRANCH_COLS}))`)
      .eq('id', id)
      .eq('published', true)
      .maybeSingle();
    if (error) throw fromDbError(error);
    if (!data) throw new HttpError(404, 'not_found', 'Ruta no encontrada');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stops = (data.route_stops as any[])
      .filter((s) => s.branches?.published && s.branches?.merchants?.status === 'active')
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ ...mapBranch(s.branches), position: s.position }));
    const route: RouteDetail = {
      id: data.id,
      name: data.name,
      region: data.region,
      description: data.description,
      coverUrl: data.cover_url,
      isDemo: data.is_demo,
      stopCount: stops.length,
      stops,
    };
    return { route };
  });

  async function branchDetail(filter: { col: 'id' | 'qr_code'; value: string }): Promise<BranchDetail> {
    const { data, error } = await ctx.admin
      .from('branches')
      .select(BRANCH_COLS + ', merchant_id')
      .eq(filter.col, filter.value)
      .eq('published', true)
      .eq('merchants.status', 'active')
      .maybeSingle();
    if (error) throw fromDbError(error);
    if (!data) throw new HttpError(404, 'not_found', 'Lugar no encontrado');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = data as any;
    const { data: offers } = await ctx.admin
      .from('offers')
      .select('id, title, conditions')
      .eq('merchant_id', b.merchant_id)
      .eq('active', true);
    return {
      ...mapBranch(b),
      offers: (offers ?? []).map((o) => ({ id: o.id, title: o.title, conditions: o.conditions, merchantName: b.merchants.name })),
    };
  }

  app.get('/v1/branches/:id', async (req) => {
    const { id } = IdParam.parse(req.params);
    return { branch: await branchDetail({ col: 'id', value: id }) };
  });

  app.get('/v1/branches/by-qr/:code', async (req) => {
    const { code } = QrParam.parse(req.params);
    return { branch: await branchDetail({ col: 'qr_code', value: code }) };
  });
}
