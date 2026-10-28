import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';
import { ROBOT } from '../lib/robot';

export const prerender = false;

/* Adresa z QR kódu (citylight). Sken zapíšeme tu na serveri, takže sa
   započíta aj vtedy, keď prehliadač blokuje počítadlo. Potom človeka
   pošleme na hlavnú stránku. Parameter z=qr povie beaconu, že návšteva
   je už zapísaná a nemá ju rátať druhýkrát. Admin ju ukáže ako zdroj
   „QR kód“. */
const DALEJ = { Location: '/?z=qr', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

export const GET: APIRoute = async ({ request }) => {
  const ua = request.headers.get('user-agent') ?? '';
  if (supabase && ua && !ROBOT.test(ua)) {
    const mobil = request.headers.get('sec-ch-ua-mobile') === '?1' || /Mobi|Android|iPhone|iPad/i.test(ua);
    const krajinaRaw = request.headers.get('x-vercel-ip-country') ?? '';
    const { error } = await supabase.from('navstevy').insert({
      cesta: '/qr',
      zdroj: 'priamo',
      zariadenie: mobil ? 'mobile' : 'desktop',
      nova: true,
      krajina: /^[A-Za-z]{2}$/.test(krajinaRaw) ? krajinaRaw.toUpperCase() : null,
    });
    // Počítadlo nesmie zastaviť človeka. Pri chybe ho aj tak pošleme ďalej.
    if (error) console.error('[qr]', error.message);
  }
  return new Response(null, { status: 302, headers: DALEJ });
};

// HEAD posielajú kontroly odkazov, nie ľudia. Presmerujeme, nerátame.
export const HEAD: APIRoute = () => new Response(null, { status: 302, headers: DALEJ });
