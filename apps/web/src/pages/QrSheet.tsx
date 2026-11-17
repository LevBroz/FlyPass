import { QRCodeSVG } from 'qrcode.react';
import { QR_PREFIX } from '@pg/contracts';
import { api } from '../lib/api';
import { useApi } from '../lib/hooks';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function QrSheet() {
  const { data, error } = useApi(() => api<{ merchants: any[] }>('/v1/admin/overview'), []);
  const branches = (data?.merchants ?? []).flatMap((m) => m.branches.map((b: any) => ({ ...b, demo: m.is_demo })));

  return (
    <div className="container">
      <div className="row spread no-print" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>QR de establecimientos</h1>
          <p className="muted" style={{ margin: 0 }}>Muéstralos en una laptop o imprímelos para la presentación.</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>Imprimir</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="qr-sheet">
        {branches.map((b) => (
          <div key={b.id} className="card qr-card">
            <QRCodeSVG value={`${QR_PREFIX}${b.qr_code}`} size={200} level="M" marginSize={2} />
            <h3 style={{ marginTop: 8 }}>{b.name}</h3>
            <div className="muted small">{b.city}</div>
            {b.demo && <span className="badge badge-demo" style={{ marginTop: 6 }}>DEMOSTRACIÓN</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
