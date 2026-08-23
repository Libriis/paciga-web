#!/usr/bin/env node
// Stiahne súbory z verejných Supabase bucketov podľa zoznamu mien.
//
//   node scripts/zaloha-storage.mjs --bucket parte-foto --zoznam subory.txt --kam <cesta>
//
// Prečo samostatný skript: zaloha-db.mjs sťahuje bucket cez /storage/v1/object/list,
// a ten anon kľúčom vráti prázdny zoznam aj vtedy, keď v buckete súbory sú.
// Zistené 23. 8. 2026 — záloha vypísala „0 storage/parte-foto", hoci ich tam
// bolo 30. Prázdny zoznam sa tvári ako úspech, takže to nikto nezbadá.
//
// Zoznam mien preto berieme odinakiaľ (SQL nad storage.objects) a sťahujeme
// po jednom cez verejnú adresu, ktorá anon kľúčom funguje.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

const bucket = arg('--bucket');
const zoznamSubor = arg('--zoznam');
const kam = arg('--kam');
if (!bucket || !zoznamSubor || !kam) {
  console.error('Pouzitie: --bucket <nazov> --zoznam <subor.txt> --kam <cesta>');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(join(KOREN, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((r) => r && !r.startsWith('#') && r.includes('='))
    .map((r) => { const i = r.indexOf('='); return [r.slice(0, i).trim(), r.slice(i + 1).trim()]; })
);
const base = env.PUBLIC_SUPABASE_URL;
const kluc = env.PUBLIC_SUPABASE_ANON_KEY;

const mena = readFileSync(zoznamSubor, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const ciel = join(kam, 'storage', bucket);
mkdirSync(ciel, { recursive: true });

let ok = 0;
let chyb = 0;
for (const meno of mena) {
  const cesta = join(ciel, meno.replace(/[/\\]/g, '_'));
  if (existsSync(cesta)) { ok++; continue; }
  const url = `${base}/storage/v1/object/public/${bucket}/${meno.split('/').map(encodeURIComponent).join('/')}`;
  const r = await fetch(url, { headers: { apikey: kluc, Authorization: `Bearer ${kluc}` } });
  if (!r.ok) { console.log(`  ! ${meno}: HTTP ${r.status}`); chyb++; continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length) { console.log(`  ! ${meno}: prazdny subor`); chyb++; continue; }
  writeFileSync(cesta, buf);
  ok++;
}

console.log(`${bucket}: ${ok} z ${mena.length} stiahnutych${chyb ? `, ${chyb} chyb` : ''}`);
process.exit(chyb ? 1 : 0);
