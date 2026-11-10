-- SEO fáza 2, Dátumy zmien (10. 11. 2026).
-- Dátum vecnej zmeny textu článku. Redaktor ho nastaví v admine len pri zmene
-- faktov. Web z neho skladá dateModified a lastmod v mape stránok.
-- updated_at ostáva, ale na tento účel sa už nepoužíva (posúva ho každá úprava).
-- Prázdne = článok sa od vydania vecne nezmenil, platí dátum vydania.
alter table public.clanky add column if not exists obsah_upraveny date;

comment on column public.clanky.obsah_upraveny is
  'Dátum poslednej vecnej zmeny textu. Nastavuje redaktor, nie trigger. Zdroj pre dateModified a lastmod.';
