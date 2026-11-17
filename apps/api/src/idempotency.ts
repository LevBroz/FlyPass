import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Si el cliente envía Idempotency-Key, la primera respuesta exitosa se
 * guarda y se repite ante reintentos (mala conexión). Las funciones SQL
 * además son idempotentes por sí mismas; esto evita trabajo y respuestas distintas.
 */
export async function withIdempotency<T>(
  admin: SupabaseClient,
  req: FastifyRequest,
  reply: FastifyReply,
  userId: string,
  endpoint: string,
  run: () => Promise<{ status: number; body: T }>,
) {
  const raw = req.headers['idempotency-key'];
  const key = typeof raw === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(raw) ? raw : null;

  if (key) {
    const { data } = await admin
      .from('idempotency_keys')
      .select('status_code, response, endpoint')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();
    if (data && data.endpoint === endpoint) {
      reply.header('idempotent-replay', 'true');
      return reply.code(data.status_code).send(data.response);
    }
  }

  const result = await run();

  if (key && result.status < 300) {
    await admin
      .from('idempotency_keys')
      .upsert(
        { user_id: userId, key, endpoint, status_code: result.status, response: result.body as object },
        { onConflict: 'user_id,key', ignoreDuplicates: true },
      );
  }
  return reply.code(result.status).send(result.body);
}
