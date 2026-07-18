import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { sendEmail } from '../../lib/email';

export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!supabase) return json({ error: 'Databáza nie je nakonfigurovaná.' }, 503);

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Neplatná požiadavka.' }, 400);

  // honeypot — boti pole vyplnia, ľudia ho nevidia
  if (typeof body.web === 'string' && body.web.trim() !== '') return json({ ok: true });

  const slug = typeof body.slug === 'string' ? body.slug : '';
  const meno = typeof body.meno === 'string' ? body.meno.trim() : '';
  const odkaz = typeof body.odkaz === 'string' ? body.odkaz.trim() : '';

  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return json({ error: 'Neplatná požiadavka.' }, 400);
  if (!meno || meno.length > 120) return json({ error: 'Zadajte prosím svoje meno (max. 120 znakov).' }, 400);
  if (!odkaz || odkaz.length > 2000) return json({ error: 'Zadajte prosím odkaz (max. 2000 znakov).' }, 400);

  const { data: parte } = await supabase
    .from('parte').select('id, meno').eq('slug', slug).eq('published', true).maybeSingle();
  if (!parte) return json({ error: 'Parte sa nenašlo.' }, 404);

  const { error } = await supabase
    .from('kondolencie')
    .insert({ parte_id: parte.id, meno, odkaz, schvalene: false });
  if (error) return json({ error: 'Kondolenciu sa nepodarilo uložiť. Skúste to prosím neskôr.' }, 500);

  await sendEmail({
    subject: `Nová kondolencia na schválenie — ${parte.meno}`,
    text: `Parte: ${parte.meno}\nOd: ${meno}\n\n${odkaz}\n\nSchváliť ju môžete v administrácii: https://paciga.sk/admin`,
  });

  return json({ ok: true });
};
