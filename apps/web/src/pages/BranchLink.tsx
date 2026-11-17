import { useParams } from 'react-router-dom';
import type { BranchDetail } from '@pg/contracts';
import { CATEGORY_LABEL } from '@pg/contracts';
import { api } from '../lib/api';
import { useApi } from '../lib/hooks';

/** Destino web del QR si se escanea con la cámara del teléfono en vez de la app. */
export function BranchLink() {
  const { code = '' } = useParams();
  const { data, error, loading } = useApi(() => api<{ branch: BranchDetail }>(`/v1/branches/by-qr/${encodeURIComponent(code)}`), [code]);

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="card stack">
        {loading && <p className="muted">Cargando…</p>}
        {error && <div className="alert alert-error">{error}</div>}
        {data && (
          <>
            <div className="row spread">
              <span className="muted small">{CATEGORY_LABEL[data.branch.category]} · {data.branch.city}</span>
              {data.branch.isDemo && <span className="badge badge-demo">DEMO</span>}
            </div>
            <h1 style={{ fontSize: '1.7rem' }}>{data.branch.name}</h1>
            <p>{data.branch.description}</p>
            <a className="btn btn-primary btn-lg" href={`pguanaco://branch/${code}`}>Abrir en la app y pedir sello</a>
            <p className="muted small">
              ¿No tienes la app? En esta demo se instala desde un enlace privado del equipo (Android).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
