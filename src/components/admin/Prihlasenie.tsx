/* Prihlásenie do administrácie.
   Rozvrhnutie podľa 21st.dev lavikatiyar/login: vľavo formulár, vpravo
   fotka cez celú výšku. Prevzatý je tvar a nábeh, nie obsah — Paciga sa
   prihlasuje menom, nie e-mailom, registrácia je zatvorená a heslo si
   nikto neresetuje sám, takže polia „vytvor účet", „zabudnuté heslo"
   a „zapamätaj si ma" z originálu nedávajú zmysel a sú preč.

   Vedome bez react-hook-form a zod. Sú to dve polia a schéma originálu by
   nám škodila: overuje e-mailový tvar (my berieme aj krátke meno) a heslo
   od 8 znakov (staršie účty môžu mať kratšie a nedostali by sa dnu). */
import { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { getClient, DEMO } from '@/scripts/admin-core.js';

type Props = {
  /** URL optimalizovanej fotky do pravého panelu (rieši ju Astro pri builde) */
  fotoSrc: string;
  fotoAlt: string;
};

/* Supabase Auth prihlasuje e-mailom alebo telefónom, prihlasovacie meno
   nepozná. Riešime to bez vlastnej tabuľky a bez verejného vyhľadávania:
   krátke meno doplníme na firemnú adresu. Účet „paciga" má teda v Supabase
   e-mail paciga@paciga.sk.

   Kto zadá celú adresu (obsahuje @), pošle sa tak, ako ju napísal. Vďaka
   tomu fungujú aj správcovské účty mimo firemnej domény. */
const DOMENA = 'paciga.sk';
const naEmail = (vstup: string) => {
  const v = vstup.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${DOMENA}`;
};

const obal = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const polozka = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const TRIEDA_VSTUPU =
  'mt-1.5 block h-11 w-full rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none [color-scheme:dark] placeholder:text-muted-foreground/70 focus:border-foreground/30 disabled:opacity-60';

export function Prihlasenie({ fotoSrc, fotoAlt }: Props) {
  const [meno, setMeno] = useState('');
  const [heslo, setHeslo] = useState('');
  const [caka, setCaka] = useState(false);
  const [chyba, setChyba] = useState('');

  const dalej = typeof location !== 'undefined'
    ? new URLSearchParams(location.search).get('next') || '/admin'
    : '/admin';

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaka(true);
    setChyba('');
    const { error } = await getClient().auth.signInWithPassword({
      email: naEmail(meno),
      password: heslo,
    });
    if (error) {
      // Zámerne nehovoríme, ktorá z dvoch hodnôt je zlá.
      setChyba('Nesprávne prihlasovacie meno alebo heslo.');
      setCaka(false);
      return;
    }
    location.href = dalej;
  };

  return (
    <div data-ui21 className="flex min-h-svh w-full flex-col bg-background font-sans text-foreground md:flex-row">
      {/* Ľavý panel: formulár */}
      <div className="flex w-full flex-col justify-center px-6 py-14 sm:px-10 md:w-1/2 lg:px-16">
        <motion.div variants={obal} initial="hidden" animate="visible" className="mx-auto flex w-full max-w-md flex-col gap-6">
          <motion.a variants={polozka} href="/" className="flex w-fit items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[6px] bg-primary text-[14px] font-bold text-primary-foreground">P</span>
            <span className="text-[16px] font-semibold tracking-tight">Paciga</span>
          </motion.a>

          <motion.div variants={polozka}>
            <h1 className="text-2xl font-semibold tracking-tight">Administrácia</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Prihlás sa menom, ktoré ti nastavil správca.
            </p>
          </motion.div>

          {DEMO && (
            <motion.div variants={polozka}
              className="rounded-md border border-border bg-secondary px-4 py-3 text-[13px] text-muted-foreground">
              <strong className="font-semibold text-foreground">DEMO režim.</strong>{' '}
              Prihlásiš sa ľubovoľným menom a heslom.
            </motion.div>
          )}

          <form onSubmit={odosli} className="flex flex-col gap-4">
            <motion.label variants={polozka} className="block">
              <span className="text-[13.5px] font-medium">Prihlasovacie meno</span>
              <input
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="napr. paciga"
                disabled={caka}
                value={meno}
                onChange={(e) => setMeno(e.target.value)}
                className={TRIEDA_VSTUPU}
              />
            </motion.label>

            <motion.label variants={polozka} className="block">
              <span className="text-[13.5px] font-medium">Heslo</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={caka}
                value={heslo}
                onChange={(e) => setHeslo(e.target.value)}
                className={TRIEDA_VSTUPU}
              />
            </motion.label>

            <motion.div variants={polozka}>
              <button
                type="submit"
                disabled={caka}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-[14.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
              >
                {caka && <Loader2 className="size-4 animate-spin" />}
                Prihlásiť sa
              </button>
              <p className="mt-3 min-h-5 text-[13.5px] text-[#d18a8a]" role="alert">{chyba}</p>
            </motion.div>
          </form>

          <motion.p variants={polozka} className="text-[13px] leading-relaxed text-muted-foreground">
            Zabudnuté heslo alebo nový účet rieši správca. Ozvi sa mu, sám sa
            účet založiť nedá.
          </motion.p>
        </motion.div>
      </div>

      {/* Pravý panel: fotka. Na mobile sa nesťahuje vôbec. */}
      <div className="relative hidden md:block md:w-1/2">
        <img src={fotoSrc} alt={fotoAlt} className="size-full object-cover" />
        {/* Prechod len zjemňuje šev s ľavou polovicou a podkladá text dole.
            Fotka showroomu je sama tmavá, silnejší závoj by ju zhasol. */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0c0d0f] via-[#0c0d0f]/25 to-transparent" />
        <p className="absolute bottom-8 left-8 right-8 text-[14px] text-white/85">
          Ľudskosť, dôstojnosť, empatia.
        </p>
      </div>
    </div>
  );
}

export default Prihlasenie;
