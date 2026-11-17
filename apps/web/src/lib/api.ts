import { createClient } from '@supabase/supabase-js';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const configMissing = !API_URL || !SUPABASE_URL || !SUPABASE_KEY;

// La clave publicable no es un secreto; la seguridad depende de RLS y de la API.
export const supabase = createClient(SUPABASE_URL ?? 'https://invalid.local', SUPABASE_KEY ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
});

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; idempotent?: boolean } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (data.session) headers.authorization = `Bearer ${data.session.access_token}`;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.idempotent) headers['idempotency-key'] = crypto.randomUUID();

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? 'error', json?.error?.message ?? `Error ${res.status}`);
  }
  return json as T;
}
