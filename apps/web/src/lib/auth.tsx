import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { MeView } from '@pg/contracts';
import { api, ApiError, API_URL, supabase } from './api';

interface AuthState {
  session: Session | null;
  me: MeView | null;
  meError: string | null;
  reloadMe: () => Promise<void>;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<MeView | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (s: Session | null) => {
    setMeError(null);
    if (!s) {
      setMe(null);
      return;
    }
    try {
      const r = await api<{ me: MeView }>('/v1/me');
      setMe(r.me);
    } catch (err) {
      setMe(null);
      setMeError(describeApiFailure(err));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadMe(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void loadMe(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadMe]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Correo o contraseña incorrectos');
    setSession(data.session);
    await loadMe(data.session);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setMe(null);
  };

  const reloadMe = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadMe(data.session);
  }, [loadMe]);

  return <Ctx.Provider value={{ session, me, meError, reloadMe, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}

function describeApiFailure(err: unknown): string {
  if (!API_URL) return 'Falta VITE_API_URL en la configuración del sitio. Agrégala en Netlify y vuelve a desplegar.';
  if (err instanceof ApiError) {
    if (err.status === 0)
      return `No se pudo conectar con la API (${API_URL}). Puede estar arrancando (espera ~1 min) o CORS_ORIGINS en Render no incluye ${location.origin}.`;
    if (err.status === 401) return 'La API rechazó la sesión (401). Revisa que SUPABASE_URL de Render sea el mismo proyecto que VITE_SUPABASE_URL.';
    return `La API respondió ${err.status}: ${err.message}`;
  }
  return 'Error inesperado al cargar tu perfil.';
}
