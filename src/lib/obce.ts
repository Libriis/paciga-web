/*
  Obec a pobočka parte, odvodené z miesta rozlúčky (SEO fáza 5, oprava Parte, 10. 11. 2026).

  Prečo: ľudia hľadajú „parte Liptovský Mikuláš“ alebo meno a obec. Parte doteraz
  obec v názve nemalo a stránky pobočiek na parte neodkazovali. Obec sa nevypĺňa
  ručne: berie sa z textu „Dom smútku v Poprade-Veľkej“, takže funguje aj pri
  parte zo synchronizácie s Moderným pohrebníctvom.

  Pobočka podľa okresu: okres Kežmarok = Spišská Belá, okres Liptovský Mikuláš
  = Liptovský Mikuláš, všetko ostatné = Poprad.

  Nová obec: pridaj riadok do OBCE (tvar v 1. páde, tvary v texte, pobočka).
  Neznáma obec nič nepokazí, parte len nebude mať obec v názve.
*/

export type PobockaSlug = 'poprad' | 'spisska-bela' | 'liptovsky-mikulas';

type Obec = { obec: string; tvary: string[]; pobocka: PobockaSlug };

const P: PobockaSlug = 'poprad', SB: PobockaSlug = 'spisska-bela', LM: PobockaSlug = 'liptovsky-mikulas';
const o = (obec: string, pobocka: PobockaSlug, ...tvary: string[]): Obec => ({ obec, pobocka, tvary: [obec, ...tvary] });

const OBCE: Obec[] = [
  // ---- okres Kežmarok: pobočka Spišská Belá ----
  o('Spišská Belá-Strážky', SB, 'Spišskej Belej-Strážkach', 'Strážkach', 'Strážky'),
  o('Spišská Belá', SB, 'Spišskej Belej'),
  o('Lendak', SB, 'Lendaku'),
  o('Ždiar', SB, 'Ždiari'),
  o('Tatranská Javorina', SB, 'Tatranskej Javorine'),
  o('Slovenská Ves', SB, 'Slovenskej Vsi'),
  o('Krížová Ves', SB, 'Krížovej Vsi', 'Križová Ves', 'Križovej Vsi'),
  o('Kežmarok', SB, 'Kežmarku'),
  o('Ľubica', SB, 'Ľubici'),
  o('Výborná', SB, 'Výbornej'),
  o('Vlková', SB, 'Vlkovej'),
  o('Holumnica', SB, 'Holumnici'),
  o('Podhorany', SB, 'Podhoranoch'),
  o('Osturňa', SB, 'Osturni'),
  o('Ihľany', SB, 'Ihľanoch'),
  o('Jurské', SB, 'Jurskom'),
  o('Toporec', SB, 'Toporci'),
  o('Žakovce', SB, 'Žakovciach'),
  o('Veľká Lomnica', SB, 'Veľkej Lomnici'),
  o('Stará Lesná', SB, 'Starej Lesnej'),
  o('Mlynčeky', SB, 'Mlynčekoch'),
  o('Bušovce', SB, 'Bušovciach'),
  o('Veľká Franková', SB, 'Veľkej Frankovej'),
  o('Matiašovce', SB, 'Matiašovciach'),
  o('Vojňany', SB, 'Vojňanoch'),
  o('Huncovce', SB, 'Huncovciach'),
  o('Vrbov', SB, 'Vrbove'),
  o('Rakúsy', SB, 'Rakúsoch'),
  o('Spišské Hanušovce', SB, 'Spišských Hanušovciach'),

  // ---- okres Liptovský Mikuláš ----
  o('Liptovský Mikuláš', LM, 'Liptovskom Mikuláši'),
  o('Liptovský Ján', LM, 'Liptovskom Jáne'),
  o('Liptovská Porúbka', LM, 'Liptovskej Porúbke'),
  o('Liptovský Hrádok', LM, 'Liptovskom Hrádku'),
  o('Važec', LM, 'Važci'),
  o('Pribylina', LM, 'Pribyline'),

  // ---- ostatné: pobočka Poprad ----
  o('Poprad-Veľká', P, 'Poprade-Veľkej', 'Poprade - Veľkej', 'Poprade – Veľkej', 'Poprad - Veľká', 'Poprad Veľká'),
  o('Poprad-Matejovce', P, 'Poprade-Matejovciach', 'Matejovciach', 'Matejovce'),
  o('Poprad-Spišská Sobota', P, 'Spišskej Sobote', 'Spišská Sobota'),
  o('Poprad-Stráže pod Tatrami', P, 'Strážach pod Tatrami', 'Stráže pod Tatrami'),
  o('Poprad', P, 'Poprade', 'Poprad-Juh', 'Poprade-Juhu'),
  o('Hôrka-Kišovce', P, 'Hôrke-Kišovciach', 'Hôrke – Kišovciach', 'Hôrke - Kišovciach', 'Kišovciach', 'Kišovce'),
  o('Hôrka-Ondrej', P, 'Hôrke-Ondreji', 'Hôrke - Ondreji'),
  o('Hozelec', P, 'Hozelci'),
  o('Nový Smokovec', P, 'Novom Smokovci'),
  o('Tatranská Lomnica', P, 'Tatranskej Lomnici'),
  o('Spišský Štiavnik', P, 'Spišskom Štiavniku'),
  o('Kravany', P, 'Kravanoch'),
  o('Švábovce', P, 'Švábovciach'),
  o('Vikartovce', P, 'Vikartovciach'),
  o('Spišské Bystré', P, 'Spišskom Bystrom'),
  o('Štrba', P, 'Štrbe'),
  o('Vernár', P, 'Vernári'),
  o('Batizovce', P, 'Batizovciach'),
  o('Nová Lesná', P, 'Novej Lesnej'),
  o('Veľká Lesná', P, 'Veľkej Lesnej'),
  o('Svit', P, 'Svite'),
  o('Gerlachov', P, 'Gerlachove'),
  o('Vydrník', P, 'Vydrníku'),
  o('Liptovská Teplička', P, 'Liptovskej Tepličke'),
  o('Hranovnica', P, 'Hranovnici'),
  o('Vyšná Šuňava', P, 'Vyšnej Šuňave'),
  o('Gánovce', P, 'Gánovciach'),
  o('Spišská Teplica', P, 'Spišskej Teplici'),
  o('Lučivná', P, 'Lučivnej'),
  o('Veľký Slavkov', P, 'Veľkom Slavkove'),
  o('Štôla', P, 'Štôle'),
  o('Hrabušice', P, 'Hrabušiciach'),
  o('Betlanovce', P, 'Betlanovciach'),
  o('Letanovce', P, 'Letanovciach'),
  o('Spišské Tomášovce', P, 'Spišských Tomášovciach'),
  o('Spišský Štvrtok', P, 'Spišskom Štvrtku'),
  o('Spišské Vlachy', P, 'Spišských Vlachoch'),
  o('Olcnava', P, 'Olcnave'),
  o('Dravce', P, 'Dravciach'),
  o('Dlhé Stráže', P, 'Dlhých Strážach', 'Dlhých Strážoch'),
  o('Ordzovany', P, 'Ordzovanoch'),
  o('Margecany', P, 'Margecanoch'),
  o('Spišská Nová Ves', P, 'Spišskej Novej Vsi'),
  o('Levoča', P, 'Levoči'),
  o('Košice', P, 'Košiciach'),
  o('Bardejov', P, 'Bardejove'),
  o('Tekovské Nemce', P, 'Tekovských Nemciach'),
];

/** Obec a pobočka podľa miesta rozlúčky. Berie prvú obec, ktorá sa v texte objaví
    („… v Spišskej Belej a následne na cintoríne v Podhoranoch“ = Spišská Belá). */
export function obecZMiesta(miesto: string | null | undefined): { obec: string; pobocka: PobockaSlug } | null {
  if (!miesto) return null;
  let naj: { obec: Obec; pos: number; dlzka: number } | null = null;
  for (const ob of OBCE) {
    for (const t of ob.tvary) {
      const re = new RegExp(`(^|[\\s,(])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s,.)])`, 'u');
      const m = re.exec(miesto);
      if (!m) continue;
      const pos = m.index + m[1].length;
      if (!naj || pos < naj.pos || (pos === naj.pos && t.length > naj.dlzka)) naj = { obec: ob, pos, dlzka: t.length };
    }
  }
  return naj ? { obec: naj.obec.obec, pobocka: naj.obec.pobocka } : null;
}
