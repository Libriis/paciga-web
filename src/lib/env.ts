/* Tajomstvá sa čítajú až za behu, nie pri builde.

   Audit ASVS 5.0 L2 (23. 8. 2026), nález #5: `import.meta.env.NIECO` Vite
   pri builde nahradí hotovou hodnotou. Soľ na hashovanie IP, podpisový kľúč
   sviečok aj Resend kľúč tak skončili ako obyčajný text priamo v nasadenom
   balíku. Overené: `grep -rl -- "$SVIECKA_SALT" .vercel dist` našlo chunky
   ratelimit a sviecka s hodnotou vpísanou do kódu, a
   `grep -rho 'import.meta.env.[A-Z_]*' .vercel/output/_functions` už
   nevrátilo nič okrem SITE — po vložení hodnoty tam žiadne čítanie nezostalo.

   Dôsledok: kto sa dostane k build cache, k logu z CI alebo k stiahnutému
   nasadeniu, má kľúče. To je širšie publikum než Vercel trezor. So soľou sa
   navyše každý „anonymný" hash IP v sviecky_log a rate_limit vráti na reálnu
   IPv4 adresu za pár sekúnd — hrubou silou cez 4 miliardy možností.

   Preto dynamický kľúč: `process.env[kluc]` sa staticky nahradiť nedá, takže
   vo výstupe ostane skutočné čítanie a hodnota príde až z prostredia funkcie.

   POZOR na lokálny vývoj: Vite načíta .env do `import.meta.env`, nie vždy do
   `process.env`. Keď niektorý koncový bod lokálne hlási chýbajúci kľúč,
   exportuj premenné do shellu pred `npm run dev`. Na Verceli sú v prostredí
   funkcie vždy.

   PUBLIC_* premenné sem nepatria. Tie do prehliadača patriť majú a čítajú sa
   ďalej cez import.meta.env. */

type Prostredie = { env?: Record<string, string | undefined> };

/** Prečíta premennú prostredia za behu. Vráti undefined, keď nie je. */
export function zaBehu(kluc: string): string | undefined {
  const proces = (globalThis as { process?: Prostredie }).process;
  const hodnota = proces?.env?.[kluc];
  return hodnota === '' ? undefined : hodnota;
}
