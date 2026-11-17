import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const DEMO_ACCOUNTS = [
  { key: 'viajero', email: 'viajero.demo@pasaporteguanaco.test', name: 'Ana (viajera demo)', role: 'traveler' },
  { key: 'nueva', email: 'viajera.nueva@pasaporteguanaco.test', name: 'Bea (sin progreso)', role: 'traveler' },
  { key: 'flores', email: 'personal.flores@pasaporteguanaco.test', name: 'Carlos · Personal Ruta Flores', role: 'traveler' },
  { key: 'horizonte', email: 'dueno.horizonte@pasaporteguanaco.test', name: 'Diana · Dueña Hostal Horizonte', role: 'traveler' },
  { key: 'lago', email: 'personal.lago@pasaporteguanaco.test', name: 'Ernesto · Personal Kayak Caldera', role: 'traveler' },
  { key: 'admin', email: 'admin.demo@pasaporteguanaco.test', name: 'Admin plataforma (demo)', role: 'admin' },
] as const;

export type DemoKey = (typeof DEMO_ACCOUNTS)[number]['key'];

const M = (n: number) => `a0000000-0000-4000-a000-0000000000${String(n).padStart(2, '0')}`;
const B = (n: number) => `b0000000-0000-4000-a000-0000000000${String(n).padStart(2, '0')}`;

/** Personal asignado a comercios distintos para demostrar aislamiento. */
export const DEMO_MEMBERSHIPS: { key: DemoKey; merchant: string; branch: string | null; role: 'staff' | 'owner' }[] = [
  { key: 'flores', merchant: M(1), branch: B(1), role: 'staff' }, // Café Volcán
  { key: 'flores', merchant: M(8), branch: B(8), role: 'staff' }, // Taller Añil
  { key: 'flores', merchant: M(2), branch: B(2), role: 'staff' }, // Pupusería La Ceiba
  { key: 'flores', merchant: M(12), branch: B(12), role: 'staff' }, // Tostaduría Cumbre
  { key: 'horizonte', merchant: M(5), branch: null, role: 'owner' }, // Hostal Horizonte (todas)
  { key: 'lago', merchant: M(9), branch: null, role: 'staff' }, // Kayak Caldera
];

/**
 * Cliente administrativo con comprobación explícita del proyecto.
 * Se niega a operar si la URL no corresponde a DEMO_PROJECT_REF o si el
 * proyecto figura en PROTECTED_PROJECT_REFS.
 */
export function demoAdminClient(): { admin: SupabaseClient; ref: string } {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const demoRef = (process.env.DEMO_PROJECT_REF ?? '').trim();
  const protectedRefs = (process.env.PROTECTED_PROJECT_REFS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!url || !key || !demoRef) {
    fail('Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o DEMO_PROJECT_REF en .env (raíz).');
  }
  let ref = '';
  try {
    ref = new URL(url).hostname.split('.')[0] ?? '';
  } catch {
    fail('SUPABASE_URL no es una URL válida.');
  }
  if (ref !== demoRef) fail(`El proyecto (${ref}) no coincide con DEMO_PROJECT_REF (${demoRef}). Abortado.`);
  if (protectedRefs.includes(ref)) fail(`El proyecto ${ref} está marcado como protegido (producción). Abortado.`);

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return { admin, ref };
}

export async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

export function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}
