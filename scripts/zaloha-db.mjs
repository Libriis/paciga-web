#!/usr/bin/env node
// Záloha Supabase databázy a storage do priečinka mimo repa.
//
//   node scripts/zaloha-db.mjs              plná záloha (bez telemetrie)
//   node scripts/zaloha-db.mjs --vitals     aj tabuľka web_vitals
//   node scripts/zaloha-db.mjs --kam <cesta>
//
// Kľúč sa hľadá v tomto poradí:
//   1. env SUPABASE_SERVICE_KEY
//   2. súbor ~/.claude/.paciga_supabase_service_key
//   3. PUBLIC_SUPABASE_ANON_KEY z .env  (len verejné dáta, viď nižšie)
//
// Bez service kľúča platí RLS aj na zálohu: stiahnu sa publikované parte
// a schválené kondolencie, ale dopyty, CRM ani zoznam adminov nie. Skript
// to nezamlčí, vypíše to a označí zálohu ako neúplnú.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');

// Tabuľky v poradí, v akom sa dajú vkladať späť (cudzie kľúče).
const TABULKY = [
  { nazov: 'parte', kluc: 'slug' },
  { nazov: 'admini', kluc: 'email', vynechajStlpce: ['user_id'] },
  { nazov: 'kondolencie', kluc: 'id' },
  { nazov: 'dopyty', kluc: 'id' },
  { nazov: 'kontakty', kluc: 'id' },
  { nazov: 'zakazky', kluc: 'id' },
  { nazov: 'ukony', kluc: 'id' },
  { nazov: 'dokumenty', kluc: 'id' },
  { nazov: 'sviecky_log', kluc: null },
];
const BUCKETY = ['parte-foto', 'dokumenty'];

const args = process.argv.slice(2);
const chceVitals = args.includes('--vitals');
const kamIdx = args.indexOf('--kam');

function citajEnv() {
  const cesta = join(KOREN, '.env');
  if (!existsSync(cesta)) return {};
  return Object.fromEntries(
    readFileSync(cesta, 'utf8')
      .split(/\r?\n/)
      .filter((r) => r && !r.startsWith('#') && r.includes('='))
      .map((r) => {
        const i = r.indexOf('=');
        let v = r.slice(i + 1).trim();
        const q = v[0];
        if ((q === '"' || q === "'") && v.endsWith(q)) v = v.slice(1, -1);
        return [r.slice(0, i).trim(), v];
      })
  );
}

function zistiKluc(env) {
  if (process.env.SUPABASE_SERVICE_KEY) {
    return { kluc: process.env.SUPABASE_SERVICE_KEY, service: true, zdroj: 'env SUPABASE_SERVICE_KEY' };
  }
  const subor = join(homedir(), '.claude', '.paciga_supabase_service_key');
  if (existsSync(subor)) {
    const k = readFileSync(subor, 'utf8').trim();
    if (k) return { kluc: k, service: true, zdroj: subor };
  }
  if (env.PUBLIC_SUPABASE_ANON_KEY) {
    return { kluc: env.PUBLIC_SUPABASE_ANON_KEY, service: false, zdroj: '.env (anon)' };
  }
  return null;
}

// Prevod hodnoty na SQL literál. Nie je to kozmetika: bez správneho
// zdvojenia apostrofov by meno typu O'Brien rozbilo celý dump.
function sql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function stiahniTabulku(base, kluc, nazov) {
  const riadky = [];
  const KROK = 1000;
  for (let od = 0; ; od += KROK) {
    const r = await fetch(`${base}/rest/v1/${nazov}?select=*&limit=${KROK}&offset=${od}`, {
      headers: { apikey: kluc, Authorization: `Bearer ${kluc}` },
    });
    if (!r.ok) throw new Error(`${nazov}: HTTP ${r.status} ${await r.text()}`);
    const d = await r.json();
    riadky.push(...d);
    if (d.length < KROK) break;
  }
  return riadky;
}

async function stiahniBucket(base, kluc, bucket, kam) {
  const r = await fetch(`${base}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: { apikey: kluc, Authorization: `Bearer ${kluc}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!r.ok) throw new Error(`bucket ${bucket}: HTTP ${r.status}`);
  const subory = (await r.json()).filter((s) => s.id);
  if (!subory.length) return 0;

  const ciel = join(kam, 'storage', bucket);
  mkdirSync(ciel, { recursive: true });
  for (const s of subory) {
    const d = await fetch(`${base}/storage/v1/object/${bucket}/${encodeURIComponent(s.name)}`, {
      headers: { apikey: kluc, Authorization: `Bearer ${kluc}` },
    });
    if (!d.ok) {
      console.log(`  ! ${bucket}/${s.name}: HTTP ${d.status}, preskakujem`);
      continue;
    }
    writeFileSync(join(ciel, s.name.replace(/[/\\]/g, '_')), Buffer.from(await d.arrayBuffer()));
  }
  return subory.length;
}

const env = citajEnv();
const base = process.env.PUBLIC_SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
const auth = zistiKluc(env);

if (!base) {
  console.error('Chyba: PUBLIC_SUPABASE_URL nie je v .env ani v prostredi.');
  process.exit(1);
}
if (!auth) {
  console.error('Chyba: nenasiel som ziadny kluc. Nastav SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const den = new Date().toISOString().slice(0, 10);
const kam = kamIdx >= 0 ? args[kamIdx + 1] : join(KOREN, '..', 'zalohy', `db-${den}`);
mkdirSync(kam, { recursive: true });

console.log(`Supabase : ${base}`);
console.log(`Kluc     : ${auth.zdroj}${auth.service ? '' : '  << ANON, zaloha bude NEUPLNA'}`);
console.log(`Ciel     : ${kam}\n`);

const zoznam = chceVitals ? [...TABULKY, { nazov: 'web_vitals', kluc: 'id' }] : TABULKY;
const casti = [];
const suhrn = [];
let zlyhalo = 0;

for (const t of zoznam) {
  try {
    const riadky = await stiahniTabulku(base, auth.kluc, t.nazov);
    suhrn.push(`${t.nazov}: ${riadky.length}`);
    console.log(`  ${String(riadky.length).padStart(5)}  ${t.nazov}`);
    if (!riadky.length) continue;

    casti.push(`\n-- ---------- ${t.nazov.toUpperCase()} (${riadky.length}) ----------`);
    for (const r of riadky) {
      const stlpce = Object.keys(r).filter((s) => !(t.vynechajStlpce || []).includes(s));
      const konflikt = t.kluc ? ` on conflict (${t.kluc}) do nothing` : '';
      casti.push(
        `insert into public.${t.nazov} (${stlpce.join(', ')}) values (${stlpce.map((s) => sql(r[s])).join(', ')})${konflikt};`
      );
    }
  } catch (e) {
    zlyhalo++;
    console.log(`  CHYBA  ${t.nazov}: ${e.message}`);
    casti.push(`\n-- ${t.nazov}: NEZALOHOVANE (${e.message})`);
  }
}

const hlavicka = `-- ============================================================
-- Paciga Supabase — zaloha dat, ${den}
-- Projekt: ${base}
-- Kluc: ${auth.service ? 'service role (uplna zaloha)' : 'ANON — ZALOHA JE NEUPLNA, RLS skryla cast dat'}
--
-- Struktura je v gite: web/supabase/schema*.sql
-- Obnova: najprv schema.sql, schema-crm.sql, schema-vitals.sql,
-- schema-admin.sql (v tomto poradi), potom tento subor.
--
-- user_id v tabulke admini sa zamerne nezalohuje. Po obnove vzniknu
-- v auth.users nove identifikatory a stare by nesedeli. Doplnenie:
--   update public.admini a set user_id = u.id
--   from auth.users u where lower(u.email) = lower(a.email) and a.user_id is null;
--
-- Suhrn: ${suhrn.join(', ')}
-- ============================================================
`;

writeFileSync(join(kam, 'data.sql'), hlavicka + casti.join('\n') + '\n', 'utf8');
console.log(`\n  data.sql zapisane`);

for (const b of BUCKETY) {
  try {
    const n = await stiahniBucket(base, auth.kluc, b, kam);
    console.log(`  ${String(n).padStart(5)}  storage/${b}`);
  } catch (e) {
    zlyhalo++;
    console.log(`  CHYBA  storage/${b}: ${e.message}`);
  }
}

// Číselný prefix nie je ozdoba. Schémy sa musia spúšťať v tomto poradí
// a schema-admin.sql posledný, inak sa vrátia slabé admin politiky.
const SCHEMY = ['schema.sql', 'schema-crm.sql', 'schema-vitals.sql', 'schema-admin.sql'];
SCHEMY.forEach((s, i) => {
  const z = join(KOREN, 'supabase', s);
  if (existsSync(z)) writeFileSync(join(kam, `0${i + 1}-${s}`), readFileSync(z));
});

console.log(`\nHotovo. ${zlyhalo ? `${zlyhalo} chyb, zalohu preverte.` : 'Bez chyb.'}`);
if (!auth.service) {
  console.log('Zaloha je NEUPLNA. Service kluc: Supabase Dashboard → Settings → API →');
  console.log('service_role, uloz do ~/.claude/.paciga_supabase_service_key');
}
process.exit(zlyhalo ? 1 : 0);
