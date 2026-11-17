import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MerchantMetrics } from '@pg/contracts';
import { api } from '../lib/api';
import { fmtDate, useApi } from '../lib/hooks';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Overview {
  merchants: any[];
  campaigns: any[];
  offers: any[];
  memberships: any[];
}
interface AuditEvent {
  id: number;
  action: string;
  object_type: string;
  object_id: string | null;
  actorName: string;
  created_at: string;
  data: Record<string, unknown>;
}

const PLAN_LABEL: Record<string, string> = { aliado: 'Aliado $100', impulso: 'Impulso $300', red: 'Red $900' };
const STATUS_LABEL: Record<string, string> = { active: 'Activo', paused: 'Pausado', prospect: 'Prospecto' };

export function Admin() {
  const ov = useApi(() => api<Overview>('/v1/admin/overview'), []);
  const audit = useApi(() => api<{ events: AuditEvent[] }>('/v1/admin/audit?limit=60'), [], 10000);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [metricsFor, setMetricsFor] = useState<string | null>(null);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    setErr(null);
    try {
      await api(`/v1/admin/merchants/${id}`, { method: 'PATCH', body: { status } });
      await Promise.all([ov.refresh(), audit.refresh()]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const d = ov.data;
  return (
    <div className="container stack">
      <div className="row spread">
        <h1 style={{ fontSize: '1.8rem' }}>Administración de plataforma</h1>
        <Link to="/admin/qr" className="btn btn-ghost">Hoja de QR para imprimir</Link>
      </div>
      {ov.error && <div className="alert alert-error">{ov.error}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      {d && (
        <>
          <div className="card">
            <h2>Comercios ({d.merchants.length})</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Comercio</th><th>Plan</th><th>Sucursales</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {d.merchants.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.name}</strong> {m.is_demo && <span className="badge badge-demo">DEMO</span>}
                      </td>
                      <td>{PLAN_LABEL[m.plan] ?? m.plan}</td>
                      <td className="small">{m.branches.map((b: any) => `${b.name} (${b.city})`).join(', ')}</td>
                      <td>
                        <select
                          value={m.status}
                          disabled={busy === m.id}
                          onChange={(e) => setStatus(m.id, e.target.value)}
                          style={{ minHeight: 36, padding: '6px 10px' }}
                          aria-label={`Estado de ${m.name}`}
                        >
                          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td>
                        <button className="btn btn-ghost" style={{ minHeight: 36, padding: '6px 12px' }} onClick={() => setMetricsFor(metricsFor === m.id ? null : m.id)}>
                          Métricas
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {metricsFor && <MiniMetrics merchantId={metricsFor} />}
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h2>Campañas y niveles</h2>
              <ul className="list">
                {d.campaigns.map((c) => {
                  const active = new Date(c.starts_at) <= new Date() && new Date(c.ends_at) > new Date();
                  return (
                    <li key={c.id}>
                      <div className="row spread">
                        <strong>{c.name}</strong>
                        <span className={`badge ${active ? 'badge-approved' : 'badge-expired'}`}>{active ? 'Activa' : 'Finalizada'}</span>
                      </div>
                      <div className="muted small">{fmtDate(c.starts_at)} → {fmtDate(c.ends_at)}</div>
                      <div className="small">
                        {[...c.reward_tiers].sort((a: any, b: any) => a.stamps_required - b.stamps_required)
                          .map((t: any) => `${t.name}: ${t.stamps_required} sellos`).join(' · ')}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="card">
              <h2>Personal asignado</h2>
              <ul className="list">
                {d.memberships.map((m, i) => (
                  <li key={i} className="row spread">
                    <span><strong>{m.profiles?.display_name}</strong> · {m.role === 'owner' ? 'Dueño' : 'Personal'}</span>
                    <span className="muted small">{m.merchants?.name}{m.branches ? ` / ${m.branches.name}` : ' (todas)'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card">
            <h2>Beneficios e inventario</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Beneficio</th><th>Comercio</th><th>Nivel</th><th>Cupo</th><th>Reservado</th><th>Canjeado</th><th>Disponible</th></tr></thead>
                <tbody>
                  {d.offers.map((o) => {
                    const inv = Array.isArray(o.reward_inventory) ? o.reward_inventory[0] : o.reward_inventory;
                    return (
                      <tr key={o.id}>
                        <td>{o.title}</td>
                        <td>{o.merchants?.name}</td>
                        <td>{o.reward_tiers?.name ?? '—'}</td>
                        <td>{inv?.total ?? 0}</td>
                        <td>{inv?.reserved ?? 0}</td>
                        <td>{inv?.redeemed ?? 0}</td>
                        <td><strong>{inv ? inv.total - inv.reserved - inv.redeemed : 0}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2>Auditoría</h2>
        <p className="muted small" style={{ marginTop: 0 }}>Últimos eventos, actualización automática.</p>
        {audit.error && <div className="alert alert-error">{audit.error}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Objeto</th></tr></thead>
            <tbody>
              {(audit.data?.events ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="small">{fmtDate(e.created_at)}</td>
                  <td>{e.actorName}</td>
                  <td><code>{e.action}</code></td>
                  <td className="small muted">{e.object_type} {e.object_id?.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniMetrics({ merchantId }: { merchantId: string }) {
  const { data, error } = useApi(() => api<{ metrics: MerchantMetrics }>(`/v1/merchant/metrics?merchantId=${merchantId}`), [merchantId]);
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <p className="muted">Cargando…</p>;
  const m = data.metrics;
  return (
    <div className="grid grid-4" style={{ marginTop: 12 }}>
      <div className="stat"><b>{m.visitRequests}</b><span>Solicitudes</span></div>
      <div className="stat"><b>{m.approved}</b><span>Sellos</span></div>
      <div className="stat"><b>{m.couponsIssued}</b><span>Cupones</span></div>
      <div className="stat"><b>{m.redemptions}</b><span>Canjes</span></div>
    </div>
  );
}
