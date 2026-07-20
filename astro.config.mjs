// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://paciga.sk',
  // Statické stránky sa predgenerujú pri builde; dynamické (index, opustili-nas,
  // parte, api) majú `export const prerender = false` a bežia ako Vercel funkcia.
  output: 'static',
  adapter: vercel(),
  // React islands pre komponenty z 21st.dev (shadcn ekosystém).
  // Tailwind je scoped cez src/styles/ui21.css — globálny preflight sa nepoužíva,
  // ručné CSS webu (styles.css) ostáva nedotknuté.
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
