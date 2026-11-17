import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Panel } from './pages/Panel';
import { Admin } from './pages/Admin';
import { QrSheet } from './pages/QrSheet';
import { BranchLink } from './pages/BranchLink';
import type { ReactNode } from 'react';

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { session, me, loading } = useAuth();
  if (loading) return <div className="container muted">Cargando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!me) return <div className="container"><div className="alert alert-error">No se pudo cargar tu perfil. Revisa la conexión con la API.</div></div>;
  if (admin && me.platformRole !== 'admin') {
    return <div className="container"><div className="alert alert-error">Esta sección es solo para administradores de plataforma.</div></div>;
  }
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/panel" element={<RequireAuth><Panel /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
            <Route path="/admin/qr" element={<RequireAuth admin><QrSheet /></RequireAuth>} />
            <Route path="/b/:code" element={<BranchLink />} />
            <Route path="*" element={<div className="container"><h1>Página no encontrada</h1><a href="/">Volver al inicio</a></div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
