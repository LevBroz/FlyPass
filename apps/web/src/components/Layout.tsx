import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { configMissing } from '../lib/api';

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#0b2029" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="#DCAE64" strokeWidth="4" strokeDasharray="6 4" />
      <path d="M22 34l7 7 14-16" fill="none" stroke="#00a59c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Layout() {
  const { session, me, signOut } = useAuth();
  const nav = useNavigate();
  const isStaff = (me?.memberships.length ?? 0) > 0;
  const isAdmin = me?.platformRole === 'admin';

  return (
    <>
      <div className="demo-banner" role="status">Entorno de demostración · datos y comercios ficticios</div>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            <Logo /> Pasaporte Guanaco
          </NavLink>
          <nav>
            {session && isStaff && <NavLink to="/panel">Panel comercio</NavLink>}
            {session && isAdmin && <NavLink to="/admin" end>Administración</NavLink>}
            {session && isAdmin && <NavLink to="/admin/qr">QR</NavLink>}
            {session ? (
              <button
                onClick={async () => {
                  await signOut();
                  nav('/');
                }}
              >
                Salir ({me?.displayName ?? '…'})
              </button>
            ) : (
              <NavLink to="/login">Acceso comercios</NavLink>
            )}
          </nav>
        </div>
      </header>
      {configMissing && (
        <div className="container" style={{ paddingBottom: 0 }}>
          <div className="alert alert-error">
            Falta configurar VITE_API_URL, VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY.
          </div>
        </div>
      )}
      <Outlet />
    </>
  );
}
