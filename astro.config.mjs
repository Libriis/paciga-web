// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { PRESMEROVANIA } from './src/data/presmerovania.mjs';

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
      // Ochrana osobných údajov je vonku dočasne: má v texte tri miesta
      // označené [DOPLNIŤ], na ktoré čakáme od klienta. Keď ich doplní,
      // vyhoď ju z tohto filtra, zruš noindex na stránke, odkomentuj odkaz
      // v pätičke (Base.astro) a prehoď /ochrana-sukromia z /kontakt na ňu
      // (presmerovania.mjs).
      filter: (stranka) =>
        !/\/(admin|api)\/|\/lab-|\/ochrana-osobnych-udajov/.test(stranka),
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
    plugins: [tailwindcss()],
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
