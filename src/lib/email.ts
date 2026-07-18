// Odosielanie e-mailov cez Resend API. Ak RESEND_API_KEY chýba, funkcia
// ticho preskočí — e-mail je best-effort, dáta sú vždy uložené v databáze.
export async function sendEmail(opts: {
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<boolean> {
  const key = import.meta.env.RESEND_API_KEY;
  if (!key) return false;

  const to = import.meta.env.KONTAKT_EMAIL ?? 'paciga@paciga.sk';
  const from = import.meta.env.RESEND_FROM ?? 'Paciga web <onboarding@resend.dev>';

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
