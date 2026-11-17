import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Login() {
  const { session, me, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session && me) {
    if (me.memberships.length) return <Navigate to="/panel" replace />;
    if (me.platformRole === 'admin') return <Navigate to="/admin" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="card stack">
        <h1 style={{ fontSize: '1.6rem' }}>Acceso para comercios</h1>
        <p className="muted small">Personal autorizado y administración. Las cuentas demo se entregan por canal privado.</p>
        {session && me && !me.memberships.length && me.platformRole !== 'admin' && (
          <div className="alert alert-info">
            Tu cuenta es de viajero. Usa la app móvil para tu pasaporte.
          </div>
        )}
        <form onSubmit={onSubmit} className="stack">
          <div>
            <label htmlFor="email">Correo</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pw">Contraseña</label>
            <input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-lg" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
