import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { MeView } from '@pg/contracts';
import { api, supabase } from './api';

interface AuthState {
  session: Session | null;
  me: MeView | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<MeView | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (s: Session | null) => {
    if (!s) {
      setMe(null);
      return;
    }
    try {
      const r = await api<{ me: MeView }>('/v1/me');
      setMe(r.me);
    } catch {
      setMe(null);
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

  return <Ctx.Provider value={{ session, me, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}
