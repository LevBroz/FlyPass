/**
 * Restablece el escenario de presentación: borra transacciones de usuarios
 * demo, reinicia inventario demo y precarga 2 sellos + cupones históricos.
 * Solo opera sobre el proyecto DEMO_PROJECT_REF y usuarios is_demo.
 *
 *   pnpm demo:reset
 */
import { demoAdminClient, fail, findUserIdByEmail, DEMO_ACCOUNTS } from './lib.ts';

const { admin, ref } = demoAdminClient();
const email = (k: string) => DEMO_ACCOUNTS.find((a) => a.key === k)!.email;

const traveler = await findUserIdByEmail(admin, email('viajero'));
const staff = await findUserIdByEmail(admin, email('flores'));
if (!traveler || !staff) fail('No existen las cuentas demo. Ejecuta primero: pnpm demo:users');

const { data, error } = await admin.rpc('demo_reset', { p_traveler_a: traveler, p_staff: staff });
if (error) fail(`demo_reset: ${error.message}`);
console.log(`✔ Demo restablecida en ${ref}:`, data);
