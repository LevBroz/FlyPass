/**
 * Crea (o rota la contraseña de) las cuentas demo, asigna roles y
 * membresías, y deja el escenario listo con demo_reset.
 *
 *   pnpm demo:users
 *
 * Las contraseñas se generan al azar y se escriben SOLO en
 * demo-credentials.local.txt (ignorado por git). Compártelas por un canal privado.
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_ACCOUNTS, DEMO_MEMBERSHIPS, demoAdminClient, fail, findUserIdByEmail } from './lib.ts';

const { admin, ref } = demoAdminClient();
console.log(`Proyecto demo: ${ref}`);

const ids: Record<string, string> = {};
const lines: string[] = [
  `# Credenciales DEMO · proyecto ${ref} · ${new Date().toISOString()}`,
  '# No subir a git ni pegar en canales públicos.',
  '',
];

for (const acc of DEMO_ACCOUNTS) {
  const password = randomBytes(12).toString('base64url');
  let id = await findUserIdByEmail(admin, acc.email);
  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, { password, email_confirm: true });
    if (error) fail(`No se pudo actualizar ${acc.email}: ${error.message}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: acc.name },
    });
    if (error || !data.user) fail(`No se pudo crear ${acc.email}: ${error?.message}`);
    id = data.user.id;
  }
  ids[acc.key] = id;

  const { error: pErr } = await admin
    .from('profiles')
    .upsert({ id, display_name: acc.name, is_demo: true, platform_role: acc.role }, { onConflict: 'id' });
  if (pErr) fail(`Perfil ${acc.email}: ${pErr.message}`);

  lines.push(`${acc.key.padEnd(10)} ${acc.email.padEnd(42)} ${password}`);
  console.log(`✔ ${acc.email}`);
}

// Membresías: reemplazar las de usuarios demo
const demoIds = Object.values(ids);
const { error: delErr } = await admin.from('merchant_memberships').delete().in('user_id', demoIds);
if (delErr) fail(`Membresías: ${delErr.message}`);
const { error: insErr } = await admin.from('merchant_memberships').insert(
  DEMO_MEMBERSHIPS.map((m) => ({ user_id: ids[m.key], merchant_id: m.merchant, branch_id: m.branch, role: m.role })),
);
if (insErr) fail(`Membresías: ${insErr.message}`);
console.log('✔ membresías asignadas');

const { error: rErr } = await admin.rpc('demo_reset', { p_traveler_a: ids.viajero, p_staff: ids.flores });
if (rErr) fail(`demo_reset: ${rErr.message}`);
console.log('✔ escenario demo restablecido');

const file = join(import.meta.dirname, '..', 'demo-credentials.local.txt');
writeFileSync(file, lines.join('\n') + '\n', { mode: 0o600 });
console.log(`\nCredenciales escritas en ${file}`);
