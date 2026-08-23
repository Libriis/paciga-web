# Lab stránky — archív, nie sú na webe

Tieto stránky slúžili na výber variantov pri návrhu. Rozhodnutia už padli
a sú zapísané v kóde webu (napr. `o-nas.astro` má v komentári „Vybraný
variant V2 z /lab-tim").

**23. 8. 2026 sa presunuli sem zo `src/pages/`.** Dovtedy sa nasadzovali na
produkciu a ktokoľvek si ich vedel otvoriť bez prihlásenia. Audit ASVS 5.0
Level 2 to zachytil ako súčasť nálezu #4: `/lab-admin` napríklad načítaval
ostrovy `EditorClanku` a `FotoPole`, čiže editor článkov a pole na nahrávanie
fotiek, komukoľvek na internete.

Presun, nie zmazanie: obsah je stále po ruke ako referencia, len sa
nezostavuje a nenasadzuje. Astro stavia iba to, čo je v `src/pages/`.

## Keď niektorú potrebuješ znova

Skopíruj ju späť do `src/pages/`, pozri sa na ňu, a **potom ju vráť sem**.
Relatívne cesty v importoch fungujú v oboch priečinkoch rovnako (oba sú
jednu úroveň pod `src/`), takže netreba nič prepisovať.

Lepšia možnosť: spusti `npm run dev` a otvor ju z tohto priečinka len lokálne.

## Zoznam

| súbor | na čo bol |
|---|---|
| `lab-21.astro` | náhľady komponentov z 21st.dev |
| `lab-admin.astro` | obsahové polia administrácie (EditorClanku, FotoPole) |
| `lab-karty.astro` | varianty kariet služieb |
| `lab-kroky.astro` | varianty blokov s krokmi |
| `lab-o-nas.astro` | varianty stránky O nás |
| `lab-sluzba-uvod.astro` | varianty úvodného textového bloku služby (vybraný A) |
| `lab-sluzby.astro` | varianty sekcie služieb (vybraný D, karusel) |
| `lab-tim.astro` | varianty sekcie tímu (vybraný V2) |
