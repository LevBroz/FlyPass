/**
 * Genera PNG + hoja HTML imprimible con los QR de las sucursales demo.
 * No requiere red: usa los códigos del seed (supabase/seed.sql).
 *
 *   pnpm demo:qr   →  qr-out/
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import QRCode from 'qrcode';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'qr-out');
mkdirSync(OUT, { recursive: true });

const seed = readFileSync(join(ROOT, 'supabase', 'seed.sql'), 'utf8');
// ('b…', 'a…', 'Nombre', 'categoria', 'Ciudad', ... 'qr-code', true)
const re = /\('b0000000-[^']+', '[^']+', '([^']+)', '\w+', '([^']+)',[\s\S]*?'([a-z0-9-]+)', true\)/g;
const branches = [...seed.matchAll(re)].map((m) => ({ name: m[1]!, city: m[2]!, code: m[3]! }));
if (!branches.length) throw new Error('No se encontraron sucursales en seed.sql');

const cards: string[] = [];
for (const b of branches) {
  const value = `pguanaco://branch/${b.code}`;
  await QRCode.toFile(join(OUT, `${b.code}.png`), value, { width: 600, margin: 2, errorCorrectionLevel: 'M' });
  const svg = await QRCode.toString(value, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' });
  cards.push(`<div class="c">${svg}<h3>${b.name}</h3><p>${b.city}</p><code>${b.code}</code><b>DEMOSTRACIÓN</b></div>`);
}

writeFileSync(
  join(OUT, 'index.html'),
  `<!doctype html><html lang="es"><meta charset="utf-8"><title>QR demo · Pasaporte Guanaco</title>
<style>body{font-family:system-ui;margin:24px;color:#102A35}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.c{border:2px solid #102A35;border-radius:14px;padding:14px;text-align:center;page-break-inside:avoid}
.c svg{width:180px;height:180px}h3{margin:6px 0 2px}p{margin:0;color:#5B6E75}code{display:block;margin:6px 0}
b{background:#DCAE64;padding:2px 8px;border-radius:99px;font-size:12px}</style>
<h1>QR de establecimientos (demo)</h1><div class="g">${cards.join('')}</div></html>`,
);
console.log(`✔ ${branches.length} QR generados en ${OUT}`);
