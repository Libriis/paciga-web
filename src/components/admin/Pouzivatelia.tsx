/* Správa právomocí. Vidí ju iba hlavný správca.

   Stránka mení, kto sa ku ktorej sekcii dostane. Samotné účty (e-mail
   a heslo) sa zakladajú v Supabase, lebo vytvorenie používateľa vyžaduje
   servisný kľúč a ten do prehliadača nepatrí.

   Skrytie položky v menu nie je ochrana. Prístupy sa vynucujú v RLS na
   tabuľkách; toto rozhranie ich len nastavuje. */
import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  Bunka, HlavaPanelu, HlavaStranky, Hlaska, Nacitavam, Pole, Prazdno,
  Ramec, Stitok, Tlacidlo, Vstup,
} from './ui';
import { getClient, mojProfil, SEKCIE } from '@/scripts/admin-core.js';

type Sekcia = { key: string; label: string; popis: string };
type Clovek = { email: string; meno: string | null; pristupy: string[]; hlavny: boolean; user_id?: string | null };

const naLogin = (email: string | null) => String(email ?? '').replace(/@paciga\.sk$/, '');
const naEmail = (login: string) => {
  const v = login.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@paciga.sk`;
};

const PRAZDNY = { povodnyEmail: '', login: '', meno: '', hlavny: false, sekcie: [] as string[] };

export function Pouzivatelia() {
  const [ludia, setLudia] = useState<Clovek[] | null>(null);
  const [ja, setJa] = useState<{ email: string | null } | null>(null);
  const [formular, setFormular] = useState<typeof PRAZDNY | null>(null);
  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);

  const nacitaj = async () => {
    const { data, error } = await getClient()
      .from('admini').select('*').order('hlavny', { ascending: false }).order('email');
    if (error) {
      setHlaska('Nepodarilo sa načítať: ' + error.message);
      setChyba(true);
      setLudia([]);
      return;
    }
    setLudia(data || []);
  };

  useEffect(() => {
    (async () => {
      const profil = await mojProfil();
      // Naozajstnú hranicu drží RLS: politika na tabuľke admini pustí dnu
      // len je_hlavny_admin(), takže bežný redaktor by aj tak nedostal riadok.
      if (!profil.hlavny) { location.href = '/admin'; return; }
      setJa(profil);
      await nacitaj();
    })().catch(() => setLudia([]));
  }, []);

  const otvor = (u?: Clovek) => {
    setHlaska('');
    setChyba(false);
    setFormular(u
      ? {
          povodnyEmail: u.email,
          login: naLogin(u.email),
          meno: u.meno || '',
          hlavny: !!u.hlavny,
          sekcie: (u.pristupy || []).includes('*')
            ? SEKCIE.map((s: Sekcia) => s.key)
            : (u.pristupy || []),
        }
      : { ...PRAZDNY });
  };

  const prepniSekciu = (key: string) => setFormular((f) => f && ({
    ...f,
    sekcie: f.sekcie.includes(key) ? f.sekcie.filter((k) => k !== key) : [...f.sekcie, key],
  }));

  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formular) return;
    if (!formular.hlavny && !formular.sekcie.length) {
      setHlaska('Vyber aspoň jednu sekciu, inak sa používateľ nedostane nikam.');
      setChyba(true);
      return;
    }
    setUklada(true);
    setChyba(false);
    setHlaska('Ukladám…');
    const zaznam = {
      email: naEmail(formular.login),
      meno: formular.meno.trim() || null,
      pristupy: formular.hlavny ? ['*'] : formular.sekcie,
      hlavny: formular.hlavny,
    };
    const sb = getClient();
    const { error } = formular.povodnyEmail
      ? await sb.from('admini').update(zaznam).eq('email', formular.povodnyEmail)
      : await sb.from('admini').insert(zaznam);
    setUklada(false);
    if (error) {
      setHlaska((error as any).code === '23505'
        ? 'Používateľ s týmto menom už existuje.'
        : 'Uloženie zlyhalo: ' + error.message);
      setChyba(true);
      return;
    }
    setHlaska('');
    setFormular(null);
    await nacitaj();
  };

  const odober = async (u: Clovek) => {
    const otazka = `Odobrať prístup používateľovi „${u.meno || naLogin(u.email)}"?\n\n` +
      'Účet v Supabase ostane, len sa nedostane do administrácie.';
    if (!confirm(otazka)) return;
    const { error } = await getClient().from('admini').delete().eq('email', u.email);
    if (error) { alert('Odobratie zlyhalo: ' + error.message); return; }
    await nacitaj();
  };

  const nazovSekcie = (k: string) => SEKCIE.find((s: Sekcia) => s.key === k)?.label ?? k;

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis="Používatelia"
        popis="Kto sa dostane do ktorej sekcie administrácie."
        akcie={
          <Tlacidlo variant="plne" onClick={() => otvor()}>
            <Plus className="size-4" /> Pridať používateľa
          </Tlacidlo>
        }
      />

      <Ramec>
        <Bunka className="bg-secondary">
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Ako to funguje.</strong>{' '}
            Tu určuješ, kto čo vidí. Samotný účet (prihlasovacie meno a heslo) sa zakladá
            v Supabase: Authentication → Users → Add user, so zapnutým Auto Confirm User.
            Meno <code className="text-foreground">peter</code> znamená adresu{' '}
            <code className="text-foreground">peter@paciga.sk</code>. Riadok tu a účet tam
            sa musia zhodovať, inak sa používateľ prihlási, ale neuvidí nič.
          </p>
        </Bunka>
      </Ramec>

      {formular && (
        <Ramec>
          <Bunka>
            <form onSubmit={uloz}>
              <HlavaPanelu
                nadpis={formular.povodnyEmail ? `Úprava: ${formular.meno || formular.login}` : 'Nový používateľ'}
                vpravo={
                  <button type="button" onClick={() => setFormular(null)} aria-label="Zavrieť"
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Pole popis="Prihlasovacie meno">
                  <Vstup required maxLength={80} autoCapitalize="none" spellCheck={false} placeholder="napr. peter"
                    value={formular.login} onChange={(e) => setFormular({ ...formular, login: e.target.value })} />
                  <span className="mt-1 block text-[12px] text-muted-foreground">
                    Bez diakritiky a medzier. Doplní sa naň <code>@paciga.sk</code>.
                  </span>
                </Pole>
                <Pole popis="Meno osoby">
                  <Vstup maxLength={120} placeholder="napr. Peter Kováč"
                    value={formular.meno} onChange={(e) => setFormular({ ...formular, meno: e.target.value })} />
                  <span className="mt-1 block text-[12px] text-muted-foreground">
                    Len pre prehľad, na prihlásenie nemá vplyv.
                  </span>
                </Pole>
              </div>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Čo uvidí po prihlásení
              </p>
              <div className={`mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 ${formular.hlavny ? 'pointer-events-none opacity-45' : ''}`}>
                {SEKCIE.map((s: Sekcia) => (
                  <label key={s.key}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors hover:border-foreground/25">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-white"
                      checked={formular.hlavny || formular.sekcie.includes(s.key)}
                      onChange={() => prepniSekciu(s.key)}
                    />
                    <span>
                      <span className="block text-[14px] font-semibold">{s.label}</span>
                      <span className="block text-[12.5px] leading-snug text-muted-foreground">{s.popis}</span>
                    </span>
                  </label>
                ))}
              </div>

              <label className="mt-5 flex cursor-pointer items-center gap-3 text-[14.5px]">
                <input type="checkbox" className="size-4 accent-white"
                  checked={formular.hlavny} onChange={(e) => setFormular({ ...formular, hlavny: e.target.checked })} />
                Hlavný správca
              </label>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Vidí všetko a smie meniť právomoci ostatných. Nechaj vypnuté, ak ide o redaktora.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
                <Tlacidlo type="submit" variant="plne" cakaj={uklada}>Uložiť</Tlacidlo>
                <Tlacidlo type="button" onClick={() => setFormular(null)}>Zrušiť</Tlacidlo>
              </div>
              <Hlaska text={hlaska} chyba={chyba} />
            </form>
          </Bunka>
        </Ramec>
      )}

      <Ramec>
        {ludia === null ? (
          <Bunka><Nacitavam /></Bunka>
        ) : ludia.length === 0 ? (
          <Bunka><Prazdno text="Zatiaľ nikto nemá prístup." /></Bunka>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-border">
            {ludia.map((u) => {
              const vsetko = u.hlavny || (u.pristupy || []).includes('*');
              return (
                <div key={u.email} className="flex flex-wrap items-center gap-4 bg-background p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-[13px] font-semibold text-muted-foreground">
                    {naLogin(u.email).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-40 flex-1">
                    <p className="text-[14.5px] font-semibold">{u.meno || naLogin(u.email)}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                      <span>{naLogin(u.email)}</span>
                      {u.hlavny && <Stitok ton="ceka">hlavný správca</Stitok>}
                      {!u.user_id && <Stitok ton="ceka">účet ešte nevznikol</Stitok>}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      {vsetko
                        ? <Stitok ton="hotovo">všetky sekcie</Stitok>
                        : (u.pristupy || []).length
                          ? (u.pristupy || []).map((p) => <Stitok key={p}>{nazovSekcie(p)}</Stitok>)
                          : <Stitok ton="skryte">bez prístupu</Stitok>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Tlacidlo maly onClick={() => otvor(u)}>Upraviť</Tlacidlo>
                    {u.email !== ja?.email && (
                      <Tlacidlo maly variant="nebezpecne" onClick={() => odober(u)}>Odobrať</Tlacidlo>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Ramec>
    </div>
  );
}

export default Pouzivatelia;
