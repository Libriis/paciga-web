import { defineMiddleware } from 'astro:middleware';

// Staré statické URL (index.html, o-nas.html, parte/meno.html) sa zdieľali
// na sociálnych sieťach — presmeruj ich natrvalo na čisté cesty.
export const onRequest = defineMiddleware((context, next) => {
  const { pathname, search } = context.url;
  if (pathname.endsWith('.html')) {
    let clean = pathname.slice(0, -'.html'.length);
    if (clean === '/index' || clean === '') clean = '/';
    return context.redirect(clean + search, 301);
  }
  return next();
});
