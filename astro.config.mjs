// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { PRESMEROVANIA } from './src/data/presmerovania.mjs';

// Tajomstvá sa od 23. 8. 2026 čítajú za behu cez process.env (src/lib/env.ts),
// aby ich Vite nevpísal ako hotový text do nasadeného balíka. Vite ale .env
// načítava len do import.meta.env, takže pri `npm run dev` by process.env
// ostal prázdny a /api/sviecka by hlásil 503. Tento plugin to dorovná —
// a beží LEN pri dev serveri (command 'serve'), takže do buildu sa nič
// z .env nedostane. Overené: po builde `grep -rl "$SVIECKA_SALT" .vercel dist`
// nenájde ani jeden súbor.
const envDoProcesu = {
  name: 'paciga-env-do-procesu',
  /** @param {{ command: string, mode: string }} config */
  configResolved(config) {
    if (config.command !== 'serve') return;
    const env = loadEnv(config.mode, process.cwd(), '');
    let pridane = 0;
    for (const [kluc, hodnota] of Object.entries(env)) {
      if (process.env[kluc] === undefined) { process.env[kluc] = hodnota; pridane++; }
    }
    // Vypísané zámerne: bez tejto hlášky sa ticho spustí dev server, ktorý
    // nevidí tajomstvá, a chyba sa prejaví až ako 503 z /api/sviecka.
    console.log(`[paciga] .env -> process.env: ${pridane} premenných (len dev)`);
  },
};

export default defineConfig({
  // Kanonický host je www: paciga.sk robí 301 na www.paciga.sk. Z `site` sa
  // skladajú absolútne OG cesty (Base.astro) aj robots.txt, takže non-www
  // hodnota by ich všetky poslala na adresu, ktorá sa presmeruje.
  site: 'https://www.paciga.sk',
  // Statické stránky sa predgenerujú pri builde; dynamické (index, opustili-nas,
  // parte, api) majú `export const prerender = false` a bežia ako Vercel funkcia.
  output: 'static',
  // Pozor na imageService: true. Zapne síce endpoint /_image, ale zároveň
  // vypne predgenerovanie: všetky obrázky idú za behu cez Vercel Image
  // Optimization a srcset sa scvrkne na jednu veľkosť 1200w q=100. Overené
  // buildom 31.7.2026, vo výstupe nezostal ani jeden predgenerovaný WebP.
  // Obrázky na SSR stránkach preto riešime hotovými súbormi v public/,
  // rovnako ako postery kariet pobočiek (commit fc64033).
  adapter: vercel(),
  // Presmerovania zo starého WordPressu (529 adries v Google indexe) plus
  // starý lab odkaz. Zoznam aj dôvody sú v src/data/presmerovania.mjs.
  redirects: PRESMEROVANIA,
  // React islands pre komponenty z 21st.dev (shadcn ekosystém).
  // Tailwind je scoped cez src/styles/ui21.css — globálny preflight sa nepoužíva,
  // ručné CSS webu (styles.css) ostáva nedotknuté.
  //
  // sitemap: robots.txt.ts sľuboval Googlu /sitemap-index.xml, ale ten súbor
  // nikdy neexistoval — balík nebol nainštalovaný a adresa vracala 404
  // (zistené 22. 8. 2026). Vyrába sa len z predgenerovaných stránok, takže
  // homepage, /opustili-nas ani parte v ňom nebudú: majú prerender = false.
  // Tie nájde Google cez odkazy z menu a zo zoznamu parte.
  integrations: [
    react(),
    sitemap({
      // Administrácia, API a lab náhľady nepatria do vyhľadávania.
      // Rovnaký zoznam ako Disallow v src/pages/robots.txt.ts.
      //
      filter: (stranka) =>
        !/\/(admin|api)\/|\/lab-/.test(stranka),
      // Bez lomky na konci. Musí to sedieť s <link rel="canonical">
      // v Base.astro, inak by mapa stránok ponúkala Googlu inú adresu,
      // než akú tá istá stránka označí za kanonickú. Koreň si lomku necháva.
      serialize: (polozka) => {
        polozka.url = polozka.url.replace(/(.+)\/$/, '$1');
        return polozka;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss(), envDoProcesu],
    resolve: {
      // motion/react si inak vie potiahnut vlastnu instanciu Reactu (useContext null)
      dedupe: ['react', 'react-dom'],
    },
    server: {
      watch: {
        // Build output nesledovať. Watcher inak drží handle na každom súbore
        // v .vercel/output aj dist a po prvom builde počas behu dev servera
        // vyčerpá file handles: tisíce EMFILE a proces spadne.
        ignored: ['**/.vercel/**', '**/dist/**'],
      },
    },
  },
});
