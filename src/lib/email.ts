import { zaBehu } from './env';

// Odosielanie e-mailov cez Resend API. Ak RESEND_API_KEY chýba, funkcia
// ticho preskočí — e-mail je best-effort, dáta sú vždy uložené v databáze.
export async function sendEmail(opts: {
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<boolean> {
  // zaBehu, nie import.meta.env: kľúč sa inak vpíše do balíka. Pozri src/lib/env.ts.
  const key = zaBehu('RESEND_API_KEY');
  if (!key) return false;

  const to = zaBehu('KONTAKT_EMAIL') ?? 'paciga@paciga.sk';
  const from = zaBehu('RESEND_FROM') ?? 'Paciga web <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: opts.subject,
        text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type SpravaResend = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
};

/**
 * Viac e-mailov jedným volaním (Resend batch, max 100). Na rozdiel od
 * sendEmail tu výsledok záleží: obsluha musí vedieť, či e-mail odišiel.
 * Resend celú dávku buď prijme, alebo odmietne, takže polovičné
 * odoslanie nehrozí. Vracia chybu ako text, null = odoslané.
 */
export async function sendBatch(spravy: SpravaResend[]): Promise<string | null> {
  const key = zaBehu('RESEND_API_KEY');
  if (!key) return 'Odosielanie e-mailov nie je nastavené (chýba RESEND_API_KEY).';

  try {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(spravy),
    });
    if (res.ok) return null;
    const j = await res.json().catch(() => null);
    console.error('[resend batch]', res.status, j);
    return `Resend e-mail odmietol (${res.status}${j?.message ? `: ${j.message}` : ''}).`;
  } catch (e) {
    console.error('[resend batch]', e);
    return 'Nepodarilo sa spojiť so službou Resend.';
  }
}
