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
