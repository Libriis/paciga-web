// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://paciga.sk',
  // Statické stránky sa predgenerujú pri builde; dynamické (index, opustili-nas,
  // parte, api) majú `export const prerender = false` a bežia ako Vercel funkcia.
  output: 'static',
  adapter: vercel(),
});
