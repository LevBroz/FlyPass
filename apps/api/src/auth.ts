import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import type { Env } from './env.js';
import { HttpError } from './errors.js';

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * Verifica el access token de Supabase Auth:
 * - Claves asimétricas (ES256/RS256): firma vía JWKS + emisor, audiencia y expiración.
 * - Proyectos con secreto HS256 heredado: se valida contra el servidor de Auth.
 * En ambos casos se exige que el usuario exista.
 */
export function createAuthVerifier(env: Env, admin: SupabaseClient) {
  const issuer = `${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  return async function verify(req: FastifyRequest): Promise<AuthUser> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'unauthenticated', 'Inicia sesión');
    const token = header.slice(7).trim();
    if (token.length < 20 || token.length > 4096) throw new HttpError(401, 'unauthenticated', 'Token inválido');

    let alg: string | undefined;
    try {
      alg = decodeProtectedHeader(token).alg;
    } catch {
      throw new HttpError(401, 'unauthenticated', 'Token inválido');
    }

    if (alg && alg !== 'HS256') {
      try {
        const { payload } = await jwtVerify(token, jwks, { issuer, audience: 'authenticated' });
        if (!payload.sub) throw new Error('sin sub');
        return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : null };
      } catch {
        throw new HttpError(401, 'unauthenticated', 'Sesión inválida o vencida');
      }
    }

    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, 'unauthenticated', 'Sesión inválida o vencida');
    return { id: data.user.id, email: data.user.email ?? null };
  };
}
