import { useMemo, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QR_PREFIX, type MerchantMetrics, type VisitRequestView } from '@pg/contracts';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDate, timeAgo, useApi } from '../lib/hooks';

interface OperableBranch {
  id: string;
  name: string;
  city: string;
  qrCode: string;
  merchantId: string;
  merchantName: string;
}

type Tab = 'pending' | 'approved' | 'rejected';

export function Panel() {
  const { me } = useAuth();
  const branches = useApi(() => api<{ branches: OperableBranch[] }>('/v1/merchant/branches'), []);
  const list = branches.data?.branches ?? [];
  const merchants = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of list) m.set(b.merchantId, b.merchantName);
    return [...m.entries()];
  }, [list]);

  const [metricsVersion, setMetricsVersion] = useState(0);
  const bump = () => setMetricsVersion((v) => v + 1);

  return (
    <div className="container stack">
      <div className="row spread">
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Panel del comercio</h1>
          <p className="muted" style={{ margin: 0 }}>
            {me?.displayName} · {list.map((b) => b.name).join(', ') || 'sin sucursales asignadas'}
          </p>
        </div>
      </div>

      {branches.error && <div className="alert alert-error">{branches.error}</div>}

      <div className="grid grid-2">
        <VisitInbox onChange={bump} />
        <RedeemForm branches={list} onRedeemed={bump} />
      </div>

      {merchants.map(([id, name]) => (
        <Metrics key={`${id}-${metricsVersion}`} merchantId={id} merchantName={name} />
      ))}

      {list.length > 0 && (
        <div className="card">
          <h2>QR de tus sucursales</h2>
          <p className="muted small">Imprime y coloca en caja o recepción. El QR identifica el local; el sello solo se emite cuando tú lo apruebas.</p>
          <div className="qr-sheet">
            {list.map((b) => (
              <div key={b.id} className="qr-card">
                <QRCodeSVG value={`${QR_PREFIX}${b.qrCode}`} size={180} level="M" marginSize={2} />
                <div><strong>{b.name}</strong></div>
                <div className="muted small">{b.qrCode}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VisitInbox({ onChange }: { onChange: () => void }) {
  const [tab, setTab] = useState<Tab>('pending');
  const { data, error, loading, refresh } = useApi(
    () => api<{ visitRequests: VisitRequestView[] }>(`/v1/merchant/visit-requests?status=${tab}`),
    [tab],
    tab === 'pending' ? 4000 : undefined, // consulta periódica solo con la bandeja abierta
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id);
    setMsg(null);
    try {
      await api(`/v1/visit-requests/${id}/${action}`, {
        method: 'POST',
        idempotent: true,
        body: action === 'reject' ? { reason } : undefined,
      });
      setMsg({ kind: 'ok', text: action === 'approve' ? 'Visita aprobada: sello emitido.' : 'Solicitud rechazada.' });
      setRejecting(null);
      setReason('');
      onChange();
      await refresh();
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const items = data?.visitRequests ?? [];
  return (
    <div className="card">
      <div className="row spread">
        <h2>Solicitudes de sello {tab === 'pending' && items.length > 0 && <span className="badge badge-pending">{items.length}</span>}</h2>
        <select value={tab} onChange={(e) => setTab(e.target.value as Tab)} style={{ width: 'auto', minHeight: 38 }} aria-label="Filtrar">
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
        </select>
      </div>
      {tab === 'pending' && <p className="muted small" style={{ marginTop: 0 }}>Se actualiza automáticamente cada pocos segundos.</p>}
      {msg && <div className={`alert alert-${msg.kind}`}>{msg.text}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && !data && <p className="muted">Cargando…</p>}
      {!loading && items.length === 0 && <p className="muted">No hay solicitudes {tab === 'pending' ? 'pendientes' : 'en esta vista'}.</p>}
      <ul className="list">
        {items.map((v) => (
          <li key={v.id}>
            <div className="row spread">
              <div>
                <strong>{v.travelerName || 'Viajero'}</strong>
                <div className="muted small">
                  {v.branchName} · {tab === 'pending' ? timeAgo(v.createdAt) : v.decidedAt && fmtDate(v.decidedAt)}
                </div>
                {v.rejectReason && <div className="small">Motivo: {v.rejectReason}</div>}
              </div>
              {tab === 'pending' ? (
                <div className="row">
                  <button className="btn btn-danger" disabled={busy === v.id} onClick={() => setRejecting(rejecting === v.id ? null : v.id)}>
                    Rechazar
                  </button>
                  <button className="btn btn-primary" disabled={busy === v.id} onClick={() => act(v.id, 'approve')}>
                    {busy === v.id ? 'Procesando…' : 'Aprobar sello'}
                  </button>
                </div>
              ) : (
                <span className={`badge badge-${v.status}`}>{v.status === 'approved' ? 'Aprobada' : 'Rechazada'}</span>
              )}
            </div>
            {rejecting === v.id && (
              <div className="row" style={{ marginTop: 10 }}>
                <input placeholder="Motivo (ej. no realizó consumo)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-danger" disabled={reason.trim().length < 2 || busy === v.id} onClick={() => act(v.id, 'reject')}>
                  Confirmar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RedeemForm({ branches, onRedeemed }: { branches: OperableBranch[]; onRedeemed: () => void }) {
  const [branchId, setBranchId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const selected = branchId || branches[0]?.id || '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ redemption: { offerTitle: string } }>('/v1/redemptions', {
        method: 'POST',
        idempotent: true,
        body: { code, branchId: selected },
      });
      setMsg({ kind: 'ok', text: `Canje confirmado: ${r.redemption.offerTitle}. Entrega el beneficio.` });
      setCode('');
      onRedeemed();
    } catch (err) {
      const e2 = err as ApiError;
      setMsg({ kind: 'error', text: e2.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2>Canjear beneficio</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Pide al viajero el código de 6 dígitos que muestra su app (vigente 10 minutos). No aceptes capturas de pantalla antiguas: el código se valida en el servidor y solo funciona una vez.
      </p>
      <form onSubmit={submit} className="stack">
        {branches.length > 1 && (
          <div>
            <label htmlFor="branch">Sucursal</label>
            <select id="branch" value={selected} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="code">Código del viajero</label>
          <input
            id="code"
            className="code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        {msg && <div className={`alert alert-${msg.kind}`}>{msg.text}</div>}
        <button className="btn btn-gold btn-lg" disabled={busy || code.length !== 6 || !selected} style={{ width: '100%' }}>
          {busy ? 'Validando…' : 'Confirmar canje'}
        </button>
      </form>
    </div>
  );
}

function Metrics({ merchantId, merchantName }: { merchantId: string; merchantName: string }) {
  const { data, error } = useApi(
    () => api<{ metrics: MerchantMetrics }>(`/v1/merchant/metrics?merchantId=${merchantId}`),
    [merchantId],
    15000,
  );
  const m = data?.metrics;
  return (
    <div className="card">
      <h2>Métricas · {merchantName}</h2>
      <p className="muted small" style={{ marginTop: 0 }}>Calculadas a partir de operaciones registradas en el entorno demo.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {m && (
        <>
          <div className="grid grid-4">
            <div className="stat"><b>{m.visitRequests}</b><span>Solicitudes</span></div>
            <div className="stat"><b>{m.approved}</b><span>Sellos aprobados</span></div>
            <div className="stat"><b>{m.pending}</b><span>Pendientes</span></div>
            <div className="stat"><b>{m.rejected}</b><span>Rechazadas</span></div>
            <div className="stat"><b>{m.couponsIssued}</b><span>Cupones emitidos</span></div>
            <div className="stat"><b>{m.redemptions}</b><span>Canjes</span></div>
          </div>
          {m.inventory.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table>
                <thead><tr><th>Beneficio</th><th>Cupo</th><th>Reservado</th><th>Canjeado</th><th>Disponible</th><th style={{ width: '25%' }}>Uso</th></tr></thead>
                <tbody>
                  {m.inventory.map((i) => (
                    <tr key={i.offerTitle}>
                      <td>{i.offerTitle}</td><td>{i.total}</td><td>{i.reserved}</td><td>{i.redeemed}</td><td><strong>{i.available}</strong></td>
                      <td><div className="bar"><i style={{ width: `${i.total ? ((i.reserved + i.redeemed) / i.total) * 100 : 0}%` }} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
