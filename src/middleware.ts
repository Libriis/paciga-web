import { defineMiddleware } from 'astro:middleware';

// Staré statické URL (index.html, o-nas.html, parte/meno.html) sa zdieľali
// na sociálnych sieťach — presmeruj ich natrvalo na čisté cesty.
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search, hostname } = context.url;
  if (pathname.endsWith('.html')) {
    let clean = pathname.slice(0, -'.html'.length);
    if (clean === '/index' || clean === '') clean = '/';
    return context.redirect(clean + search, 301);
  }

  const response = await next();

  /* Starý WordPress mal niektoré parte priamo na koreni (/jozef-mikusiak).
     Ak by adresa skončila na 404 a parte s takou adresou existuje, presmeruj
     natrvalo na /parte/<slug>. Search Console, 10. 11. 2026. Tu, nie v 404.astro,
     lebo tam Astro vynúti stav 404 aj pri presmerovaní. */
  if (response.status === 404) {
    const slug = pathname.replace(/^\/+|\/+$/g, '');
    if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(slug)) {
      try {
        const { getParteBySlug } = await import('./lib/parte');
        if (await getParteBySlug(slug)) {
          return new Response(null, { status: 301, headers: { Location: '/parte/' + slug } });
        }
      } catch { /* výpadok databázy: nechaj 404 */ }
    }
  }

  // Staging nesmie skončiť v indexe. Podmienka je na hoste, nie natvrdo:
  // na www.paciga.sk sa hlavička nikdy nepridá, takže sa pri prepnutí
  // domény nemá čo odniesť so sebou.
  // Pozor na dosah. Pri output: 'static' beží middleware za behu len na
  // stránkach s prerender = false (/, /opustili-nas, /parte/*, /api/*).
  // Predgenerované stránky servíruje Vercel priamo z CDN a tie hlavičku
  // nedostanú. Hlavnou obranou je preto robots.txt (pages/robots.txt.ts),
  // ktorý platí pre celý host. Toto je druhá vrstva.
  if (hostname.endsWith('.vercel.app')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
});
