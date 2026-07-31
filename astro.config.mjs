// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

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
  // React islands pre komponenty z 21st.dev (shadcn ekosystém).
  // Tailwind je scoped cez src/styles/ui21.css — globálny preflight sa nepoužíva,
  // ručné CSS webu (styles.css) ostáva nedotknuté.
  integrations: [react()],
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
