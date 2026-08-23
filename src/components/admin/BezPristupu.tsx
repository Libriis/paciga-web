/* Používateľ je prihlásený, ale nemá pridelenú ani jednu sekciu.
   Bez tejto stránky by ho requireAuth posielal dokola medzi stránkami,
   ku ktorým sa nedostane. */
import { useEffect, useState } from 'react';
import { Bunka, HlavaStranky, Ramec, Tlacidlo, OdkazTlacidlo } from './ui';
import { getClient, mojProfil } from '@/scripts/admin-core.js';

export function BezPristupu() {
  const [kto, setKto] = useState('—');

  useEffect(() => {
    (async () => {
      const ja = await mojProfil();
      // Kto prístup medzitým dostal, nech tu neuviazne.
      if (ja.hlavny || (ja.pristupy ?? []).length) { location.href = '/admin'; return; }
      setKto(ja.meno || String(ja.email ?? '').replace(/@paciga\.sk$/, '') || '—');
    })().catch(() => {});
  }, []);

  const odhlasit = async () => {
    await getClient().auth.signOut();
    location.href = '/admin/login';
  };

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <HlavaStranky nadpis="Zatiaľ nemáš pridelený prístup" />
      <Ramec>
        <Bunka>
          <p className="text-[14.5px] leading-relaxed text-muted-foreground">
            Prihlásenie prebehlo, ale k žiadnej časti administrácie ti zatiaľ nebol
            pridelený prístup. Ozvi sa správcovi, ktorý ti ho nastaví.
          </p>
          <p className="mt-4 text-[13px] text-muted-foreground">
            Prihlásený ako <strong className="font-semibold text-foreground">{kto}</strong>
          </p>
        </Bunka>
      </Ramec>
      <div className="flex flex-wrap gap-2">
        <OdkazTlacidlo href="/" target="_blank" rel="noopener">Zobraziť web</OdkazTlacidlo>
        <Tlacidlo onClick={odhlasit}>Odhlásiť sa</Tlacidlo>
      </div>
    </div>
  );
}

export default BezPristupu;
