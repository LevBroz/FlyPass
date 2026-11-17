import * as Crypto from 'expo-crypto';
import { API_URL, supabase } from './supabase';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function newIdempotencyKey() {
  return Crypto.randomUUID();
}

/**
 * Llamada a la API con el token de Supabase. Para POST con valor, pasar
 * idempotencyKey estable: los reintentos por mala conexión no duplican.
 */
export async function api<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string; timeoutMs?: number } = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { accept: 'application/json' };
  if (data.session) headers.authorization = `Bearer ${data.session.access_token}`;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.idempotencyKey) headers['idempotency-key'] = init.idempotencyKey;

  const ctrl = new AbortController();
  // Render gratuito puede tardar en "despertar": margen amplio
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 45000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(0, 'network', 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.');
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) await supabase.auth.signOut().catch(() => {});
    throw new ApiError(res.status, json?.error?.code ?? 'error', json?.error?.message ?? `Error ${res.status}`);
  }
  return json as T;
}
