import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { sendEmail } from '../../lib/email';

export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Neplatná požiadavka.' }, 400);

  // honeypot
  if (typeof body.web === 'string' && body.web.trim() !== '') return json({ ok: true });

  const meno = typeof body.meno === 'string' ? body.meno.trim() : '';
  const telefon = typeof body.telefon === 'string' ? body.telefon.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const sprava = typeof body.sprava === 'string' ? body.sprava.trim() : '';

  if (!meno || meno.length > 120) return json({ error: 'Zadajte prosím svoje meno.' }, 400);
  if (!sprava || sprava.length > 4000) return json({ error: 'Napíšte prosím správu (max. 4000 znakov).' }, 400);
  if (!telefon && !email) return json({ error: 'Zadajte prosím telefón alebo e-mail, aby sme sa vám vedeli ozvať.' }, 400);
  if (telefon.length > 40 || email.length > 200) return json({ error: 'Neplatný kontakt.' }, 400);

  let ulozene = false;
  if (supabase) {
    const { error } = await supabase
      .from('dopyty')
      .insert({ meno, telefon: telefon || null, email: email || null, sprava });
    ulozene = !error;
  }

  const odoslane = await sendEmail({
    subject: `Nový dopyt z webu — ${meno}`,
    text: `Meno: ${meno}\nTelefón: ${telefon || '—'}\nE-mail: ${email || '—'}\n\n${sprava}`,
    replyTo: email || undefined,
  });

  if (!ulozene && !odoslane) {
    return json({ error: 'Správu sa nepodarilo odoslať. Zavolajte nám prosím na 0903 596 364.' }, 500);
  }
  return json({ ok: true });
};
