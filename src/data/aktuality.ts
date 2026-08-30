/*
  Aktuality — jediný zdroj pravdy pre prehľad aj pre detail článku.

  Články sú prevzaté z paciga.sk (migrácia 30. 7. 2026).
  Náhľadové fotky sú od 30. 8. 2026 pôvodné featured obrázky zo starého
  WordPressu (src/assets/clanky/<slug>.jpg, stiahnuté cez curl --resolve
  na 93.184.77.195). Po zmene spusti scripts/staticke-obrazky.mjs. Text je doslovný,
  jediná úprava je názov firmy: brand pravidlo hovorí „Paciga" bez s.r.o.

  Článok dostane vlastnú stránku /aktuality/<slug> len vtedy, keď má
  vyplnené `telo`. Karta bez tela sa neprekliká na prázdnu stránku.

  Formát odstavcov v `telo`:
    "## Nadpis"  → medzinadpis h2
    "→ Položka"  → odrážka (susedné sa zlúčia do zoznamu)
    ostatné      → odstavec
*/

export interface Clanok {
  slug: string;
  datum: string;
  /** ISO dátum pre <time> a schema.org */
  datumIso: string;
  tag: 'Prvé kroky' | 'Smútok a spomínanie' | 'Plánovanie vopred' | 'Spomienkové šperky' | 'Zo života Paciga';
  /** kľúč filtra na prehľade */
  t: 'prve-kroky' | 'smutok' | 'planovanie' | 'sperky' | 'zo-zivota';
  foto: string;
  fotoAlt: string;
  titulok: string;
  /** perex na karte aj v úvode článku */
  text: string;
  /** telo článku; prázdne = článok zatiaľ nemá detail */
  telo?: string[];
  /** odkaz z karty, keď článok nemá vlastnú stránku */
  link?: string;
  linkText?: string;
  /** CTA na konci článku */
  cta?: { nadpis: string; text: string; odkaz: string; odkazText: string };
}

const CTA_KONTAKT = {
  nadpis: 'Napíšte nám. Radi vám poradíme.',
  text: 'Sme tu pre vás nepretržite, každý deň v roku. Zavolajte alebo sa zastavte na ktorejkoľvek pobočke.',
  odkaz: '/kontakt',
  odkazText: 'Kontakt a pobočky',
};

export const CLANKY: Clanok[] = [
  {
    slug: 'odtlacok-prsta-zosnuleho-na-pamiatku',
    datum: '29. mája 2026',
    datumIso: '2026-05-29',
    tag: 'Spomienkové šperky',
    t: 'sperky',
    foto: '/assets/clanky/odtlacok-prsta-zosnuleho-na-pamiatku.jpg',
    fotoAlt: 'Prívesky a náramky s odtlačkom prsta na bielych stojanoch',
    titulok: 'Odtlačok prsta zosnulého na pamiatku',
    text: 'Ako vzniká spomienkový šperk: od sňatia odtlačku až po gravírovanie do striebra, zlata alebo ružového zlata. Kúsok blízkeho človeka, ktorý zostáva navždy.',
    telo: [
      'Spomienkové predmety na zosnulých sú bežnou záležitosťou po celom svete. Aj Slováci si chcú zvečniť pamiatku na svojho zosnulého rôznymi spôsobmi. Už to nie sú len podobizne zosnulých vo fotorámčekoch, ale aj popol, vlasy, či odtlačok prstov zosnulého. V súčasnej dobe existujú rôzne ozdobné predmety s vygravírovanou podobizňou zosnulého, jeho pozostatky zaliate v skle, keramike, umiestnené v príveskoch, náramkoch, či šperkoch.',
      'Pohrebné služby Paciga rozšírili svoju ponuku o predmety s vygravírovanými odtlačkami prstov. Ponúkame rôzne tvary a farby príveskov na krk alebo náramkov na ruku, na ktoré je možné vygravírovať odtlačok prsta zosnulého. Taktiež je možné k odtlačku vygravírovať aj rôzny text. Tieto prívesky si môže u nás objednať ktokoľvek, kto k nám prinesie odtlačky prstov, teda nie iba pozostalí či obstarávateľ pohrebu.',
      'Odtlačky berieme vždy z toho prsta, na ktorom sú najlepšie vidieť papilárne línie prsta, najčastejšie je to však ukazovák alebo palec. Po odobratí odtlačkov ich následne vložíme do skenera a po zoskenovaní odtlačok prenesieme do digitálnej podoby. Nasleduje zadanie grafiky do gravírovacieho stroja, ktorý prenesie odtlačok do kovu. My používame zlato a striebro v tvare srdca alebo kruhu v štyroch farebných prevedeniach. Vybavenie každej objednávky bežne trvá maximálne 10 dní.',
    ],
    cta: {
      nadpis: 'Napíšte nám. Radi vám poradíme.',
      text: 'Tvary, farby aj znenie gravíru si môžete vyskúšať v konfigurátore alebo pozrieť naživo v showroome v Poprade.',
      odkaz: '/sperky',
      odkazText: 'Pozrieť kolekciu šperkov',
    },
  },
  {
    slug: 'medzinarodna-konferencia-pohrebnych-sluzieb-2026',
    datum: '26. mája 2026',
    datumIso: '2026-05-26',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/medzinarodna-konferencia-pohrebnych-sluzieb-2026.jpg',
    fotoAlt: 'Rečník na pódiu Medzinárodnej konferencie pohrebných služieb 2026 v Bratislave',
    titulok: 'Zúčastnili sme sa Medzinárodnej konferencie pohrebných služieb na Slovensku',
    text: 'Priniesli sme si poznatky a kontakty, ktoré posúvajú naše služby ďalej. Vzdelávame sa, aby ste u nás vždy našli aktuálny štandard starostlivosti.',
    telo: [
      'Dňa 7. 5. 2026 sa v hoteli Bratislava konala konferencia z oblasti pohrebníctva a činností s ňou súvisiacich pod názvom Medzinárodná konferencia pohrebných služieb na Slovensku. Organizátorom podujatia je tradične Slovenská asociácia pohrebných a kremačných služieb. Pozvaných bolo vyše 30 hostí z európskych krajín a vyše 90 domácich podnikateľov a zástupcov štátnych i legislatívnych inštitúcií. Ani tento rok medzi nimi nechýbali zástupcovia našej firmy.',
      'V rámci obsahu programu konferencie bola jednou z najdôležitejších tém elektronizácia dokumentov pri úmrtiach zo strany obhliadajúceho lekára až po konečný záznam v matrike. Ide o nevyhnutný, dobou nastolený nový spôsob, ktorý reflektuje na elektronizáciu všetkých služieb i medzi štátnymi orgánmi.',
      'Repatriácia tiel zosnulých je stále nedoriešenou témou vzhľadom na súčasný turbulentný stav v Európe a vo svete. Tejto i ďalším otázkam súvisiacimi so spoluprácou pohrebných služieb a štátnych úradov pri riešení opakujúcich sa situácií, ktoré nie sú jednoznačne definované legislatívou sa venovali zástupcovia ÚVZ SR a ZMOS.',
      'Konferencia ponúkla jedinečnú príležitosť nielen na výmenu skúseností a diskusiu o aktuálnych trendoch v pohrebníctve. Stále je priestor na hľadanie nových možností ako ešte citlivejšie a profesionálnejšie pristupovať k službám, ktoré poskytujeme. Účasť na konferencii považujeme za veľmi dôležitý krok k neustálemu zvyšovaniu kvality našich služieb. Z konferencie sme si odniesli množstvo inšpirácie a nových podnetov.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'viac-nez-pohrebna-sluzba',
    datum: '30. januára 2026',
    datumIso: '2026-01-30',
    tag: 'Plánovanie vopred',
    t: 'planovanie',
    foto: '/assets/clanky/viac-nez-pohrebna-sluzba.jpg',
    fotoAlt: 'Vizuál Paciga: dotyk rúk, kríž a západ slnka',
    titulok: 'Viac než pohrebná služba: kompletné riešenie pre pozostalých',
    text: 'Od prevozu a obradu po kamenárstvo a smútkové poradenstvo. Prehľad všetkého, čo za vás vieme vybaviť, aby ste sa mohli sústrediť na rozlúčku.',
    telo: [
      'Na pohrebné služby sa každý obráti až vtedy, keď ho bezprostredne zastihne úmrtie blízkeho človeka. V súčasnosti na trhu pôsobí mnoho pohrebných služieb, no nie každá ponúka kompletné služby. Priemerná pohrebná služba vám zabezpečí prevoz zosnulého v rámci Slovenska a všetky úkony súvisiace s pohrebom a vybavením úmrtného listu. Znamená to, že keď sa pozostalí rozhodnú pre niektorú pohrebnú službu, je dobré si vopred zistiť akú škálu služieb konkrétne pohrebníctvo ponúka. Pohrebné a kamenárske služby Paciga ponúkajú kompletné služby a našim cieľom je čo najviac odbremeniť pozostalých a umožniť im vybaviť všetky náležitosti na jednom mieste.',
      'Kompletné služby u nás znamenajú, že okrem vybavenia pohrebu a úmrtného listu vám navyše na jednom mieste poskytneme mnoho ďalších úkonov. Medzi nich patria aj medzinárodné prevozy zosnulých v rámci Európy. Tieto služby ponúka veľmi málo pohrebných služieb a my sa im venujeme už dlhodobo. Ak sa pozostalí rozhodnú mať občiansky obrad, mnoho pohrebných služieb to rieši prostredníctvom mestského, či obecného úradu. V meste má tieto záležitosti na starosti kancelária občianskych záležitostí, ktorá zabezpečí rečníka a spevácky zbor. V obci zabezpečí smútočný príhovor väčšinou starosta. U nás občiansky obrad pripravíme my a celý ho aj uskutočníme, keďže máme vlastných rečníkov. Táto služba nie je pozostalým navyše účtovaná.',
      'Zabezpečujeme aj kvetinovú výzdobu na pohrebe, takže smútiaci nemusia vybavovať tieto veci v kvetinárstve. Ponúkame rezané kvety, rakvové kytice, smútočné vence a kytice z rezaných alebo umelých kvetov. Ak sa pozostalí rozhodnú pre pochovanie zosnulého do hrobky a hrobku ešte nemajú pripravenú, nemusia vyhľadávať kamenárstvo. Poskytujeme aj kamenárske služby a do pohrebu výstavbu hrobky zabezpečíme. Navyše si pozostalí u nás môžu vybrať aj žulový pomník s tabuľou, ktorý nainštalujeme po uplynutí potrebného času od pohrebu. Pri existujúcich žulových pomníkoch zabezpečíme dosekanie údajov na náhrobnej tabuli.',
      'V prípade, že zosnulý bude po pohrebnom obrade odvezený do krematória na spopolnenie, zabezpečujeme aj kompletné služby v tejto oblasti. Urnu s popolom zosnulého uložíme podľa želania smútiacej rodiny do kolumbária alebo urnového hrobu. Ponúkame rôzne druhy obalov na urny, od plastových a kovových po keramické, rôznych tvarov, farieb a veľkostí. Vyhotovíme vám urnové schránky na cintoríne a nainštalujeme žulový alebo kamenný urnový pomník. Zákazníkom, ktorí po pohrebe využijú aj naše kamenárske služby, poskytneme výhodnú zľavu.',
    ],
    cta: {
      nadpis: 'Napíšte nám. Radi vám poradíme.',
      text: 'Pätnásť služieb pod jednou strechou. Zavoláte raz a o všetko ostatné sa postaráme my.',
      odkaz: '/pohrebne-sluzby',
      odkazText: 'Prehľad služieb',
    },
  },
  {
    slug: 'riesenie-pozostalosti-po-pohrebe',
    datum: '14. januára 2026',
    datumIso: '2026-01-14',
    tag: 'Prvé kroky',
    t: 'prve-kroky',
    foto: '/assets/clanky/riesenie-pozostalosti-po-pohrebe.jpg',
    fotoAlt: 'Podpisovanie dokumentov pri stole',
    titulok: 'Riešenie pozostalosti po pohrebe',
    text: 'Dedičské konanie, úrady, zmluvy a účty. Na koho sa obrátiť po pohrebe a s čím vám vieme pomôcť my a naši partneri.',
    telo: [
      'Po úmrtí a po pohrebe blízkej osoby vás čaká niekoľko administratívnych krokov, ktoré je potrebné vybaviť. Väčšina pohrebných služieb v súčasnej dobe vybaví základné náležitosti na matričnom úrade na základe udelenia plnej moci, teda odovzdanie občianskeho preukazu zosnulého a vybavenie úmrtného listu. Úmrtný list, resp. jeho kópiu budete potrebovať pri vybavovaní ďalších potrebných krokov.',
      '## Sociálna poisťovňa',
      'Pozostalí nemusia informovať Sociálnu poisťovňu o úmrtí svojho blízkeho, nemajú v tejto oblasti voči poisťovni žiadne povinnosti. Úmrtie poisťovni nahlasuje príslušná matrika. Pri úmrtí zamestnanca, by mali pozostalí nahlásiť túto skutočnosť predovšetkým jeho zamestnávateľovi, pretože všetky povinnosti spojené so zánikom sociálneho poistenia voči Sociálnej poisťovni plní práve zamestnávateľ. Ak bol zosnulý sporiteľom v druhom dôchodkovom pilieri, mali by pozostalí informovať aj príslušnú dôchodkovú správcovskú spoločnosť (DSS), a to zaslaním kópie úmrtného listu.',
      'Ak bol zosnulý nezamestnaný a poberal dávku v nezamestnanosti, o jeho úmrtí Sociálnu poisťovňu informuje Úrad práce, sociálnych vecí a rodiny, ktorý ho vyradí dňom úmrtia z evidencie uchádzačov o zamestnanie a Sociálna poisťovňa potom zastaví výplatu dávky. V prípade, ak zosnulý príbuzný poberal iné dávky od Sociálnej poisťovne, napr. dôchodok, pozostalí ju taktiež nemusia informovať o jeho úmrtí. Úmrtie každej fyzickej osoby Sociálnej poisťovni vždy nahlasuje príslušná matrika.',
      '## Zdravotná poisťovňa',
      'Pozostalí nemusia sami oznamovať úmrtie blízkeho zdravotnej poisťovni. Úrad pre dohľad nad zdravotnou starostlivosťou túto informáciu poisťovni zašle elektronicky. Vrátenie preukazu poistenca nie je povinné, ale odporúča sa. Kontaktujte konkrétnu zdravotnú poisťovňu a informujte sa, či vyžadujú vrátenie preukazu poistenca zosnulého.',
      '## Mobilní operátori, poskytovatelia internetu a TV',
      'Medzi ďalšie dôležité kroky patrí aj zrušenie paušálu, resp. mobilného čísla telefónu. Úmrtie môže nahlásiť ktokoľvek z pozostalých, podmienkou býva preukázanie sa úmrtným listom. Zrušenie zmluvy z dôvodu úmrtia je bezplatné. Úmrtie klienta možno nahlásiť na predajnom mieste, v špecifických prípadoch ak to nie je možné, pozostalí tak môžu urobiť aj prostredníctvom webového formulára. Operátor následne vystaví vyúčtovaciu faktúru za služby do momentu odpojenia čísla, teda oznámenia o úmrtí. Ten istý postup platí aj pri nahlásení úmrtia poskytovateľom internetu a TV.',
      '## Dodávatelia plynu a elektriny',
      'Úmrtie zákazníka je potrebné nahlásiť aj dodávateľom energií. Pozostalí by mali čo najskôr kontaktovať svojho dodávateľa energií. Ten im poskytne informácie, ako majú ďalej postupovať. Relevantným dokladom je záver z dedičského konania. Z neho je jasné, kto je dedičom nehnuteľnosti, do ktorej bol dodávaný plyn alebo elektrina. Je možné požiadať o zmenu odberateľa, čím sa ukončí zmluva zosnulého a uzatvorí sa zmluva s novým zákazníkom. V prípade, že sa pozostalí rozhodnú elektrickú energiu ďalej nevyužívať, je možné ukončiť existujúcu zmluvu. Zmenu odberateľa alebo ukončenie zmluvy, možno urobiť písomnou formou, prostredníctvom určeného formulára, ktorý mávajú spoločnosti uverejnené na webovej stránke.',
      '## Banka',
      'Tiež treba myslieť na bankové účty zosnulého. V prípade, ak mal zosnulý založený účet v banke alebo si sporil, je potrebné informovať banku predložením úmrtného listu. Jeho účty sa tak zablokujú. V prípade, ak banku neinformujú pozostalí, účet je zablokovaný hneď, ako jej túto informáciu poskytne iný hodnoverný zdroj, napr. Sociálna poisťovňa alebo notár.',
      'V prípade, ak mal poručiteľ úver alebo hypotéku, banky príbuzným odporúčajú, aby čo najskôr banku informovali o úmrtí blízkeho a predložili úmrtný list. Neinformovanie banky o smrti klienta môže mať za následok omeškanie sa so splátkami a následné platenie upomienok. Do úvahy treba zobrať, že nie je možné splácať splátky z účtu zosnulého klienta až do konca dedičského konania, keďže aj tento účet je predmetom dedičského konania.',
      '## Polícia',
      'Ak mal zosnulý cestovný pas, vodičský preukaz, či zbrojný preukaz, príbuzní by mali odovzdať jeho doklady na polícii. Zbrojný preukaz stráca platnosť dňom smrti držiteľa. Odovzdať ho treba do siedmych dní tomu, kto zbrojný preukaz vydal, teda príslušnému oddeleniu Policajného zboru. Polícii treba oznámiť aj miesto uloženia zbrane, ktorú mal občan v držbe. Polícia následne zabezpečí jej prevzatie a uloží ju do dočasnej úschovy. Zbraň je súčasťou dedičského konania a znovu môže byť vydaná len držiteľovi zbrojného preukazu, teda dedičovi alebo inej osobe, ktorá je držiteľom zbrojného preukazu a od dediča túto zbraň legálne získala.',
      'V prípade, že zosnulý vlastnil motorové vozidlo, to sa dá prehlásiť na nového držiteľa, teda vlastníka, až od okamihu, keď bolo vozidlo zahrnuté do dedičského konania a toto konanie nadobudlo právoplatnosť. Takéto vozidlo sa dá prehlásiť priamo na inú osobu bez toho, aby vozidlo bolo najprv prehlásené na dediča.',
    ],
    cta: {
      nadpis: 'Napíšte nám. Radi vám poradíme.',
      text: 'Krok za krokom sme spísali, čo vás čaká pri úmrtí blízkeho a čo za vás vybavíme.',
      odkaz: '/informacie-pre-pozostalych',
      odkazText: 'Sprievodca pre pozostalých',
    },
  },
  {
    slug: 'spolupraca-so-spominam-sk',
    datum: '11. decembra 2025',
    datumIso: '2025-12-11',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/spolupraca-so-spominam-sk.jpg',
    fotoAlt: 'Logo portálu Spomínam.sk',
    titulok: 'Spolupráca so Spomínam.sk',
    text: 'Spájame sa s platformou Spomínam.sk, aby spomienky na blízkych zostali živé aj v digitálnom priestore.',
    telo: [
      'Pohrebná služba Paciga je partnerom platformy Spomínam.sk. Na stránkach platformy nájdete online databázu smútočných oznámení, informácie o pohreboch, priestor na uctenie si pamiatky zosnulého a prejavenie podpory pozostalým, inšpirácie na dôstojnú poslednú rozlúčku a na vyrovnanie sa so smrťou.',
      'Spomínam.sk je oporou pozostalým v ťažkých chvíľach a ponúka celú škálu možností, ako sa vyrovnať so smutnou udalosťou, prejaviť súcit pozostalým a uľahčiť širokému okruhu známych poskytnúť oporu myšlienkou, slovom, kvetmi a hlavne fyzickou, alebo duševnou prítomnosťou v najťažších chvíľach.',
      'Vďaka našej spolupráci so Spomínam.sk majú pozostalí už aj v Poprade, Spišskej Belej a v celom podtatranskom regióne jednoduchý prístup k informáciám a možnosť vyjadriť sústrasť aj online. Môžu tak získať všetky informácie o poslednej rozlúčke, napísať kondolenciu, zapáliť virtuálnu sviečku, pridať spomienkovú fotografiu a poslať smútočnú kyticu priamo na pohreb. Spoločne tak prinášame možnosť z pohodlia domova prejaviť poslednú úctu zosnulému, či získať všetky potrebné informácie a prehľad o poslednej rozlúčke.',
      'Vnútorné prežívanie najťažších chvíľ chceme uľahčiť nielen množstvom praktických informácií a článkov, ale vieme sprostredkovať aj priamu pomoc pozostalým. Ak sa pohrebu nemôžete osobne zúčastniť, navštívte Spomínam.sk a všetko vybavíte online.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'digitalna-pomoc-po-pohrebe-potom-sk',
    datum: '26. novembra 2025',
    datumIso: '2025-11-26',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/digitalna-pomoc-po-pohrebe-potom-sk.jpg',
    fotoAlt: 'Logo platformy Potom.sk s ilustráciou dvojice na lavičke',
    titulok: 'Digitálna pomoc po pohrebe: spolupracujeme s platformou Potom.sk',
    text: 'Potom.sk uľahčuje pozostalým vybavovanie všetkého, čo po pohrebe nasleduje. Sme radi, že našim rodinám vieme ponúknuť aj túto podporu.',
    telo: [
      'Naša pohrebná služba Paciga spolupracuje s platformou Potom.sk. Bezplatná online platforma pomáha pozostalým zvládať obdobie po úmrtí blízkeho, krok za krokom. Človek po úmrtí blízkeho vyplní jednoduchý formulár, v ktorom zodpovie otázky o zosnulom: napríklad či bol dôchodca, živnostník, býval sám alebo mal zbrojný preukaz. Na základe týchto odpovedí mu platforma vygeneruje zoznam povinností, ktoré ho čakajú a aj v akom poradí by sa mal na ne zamerať. Tento digitálny nástroj, ktorý pomáha tisícom ľudí mesačne, slúži ako praktická pomoc pozostalým po pohrebe.',
      'Napriek tomu, že pohrebná služba Paciga na svojej webovej stránke poskytuje podrobné informácie ako majú pozostalí postupovať nielen v prípade úmrtia blízkej osoby, ale aj čo všetko je potrebné zariadiť následne, rozhodli sme sa pre spoluprácu s Potom.sk. Prostredníctvom tejto platformy sú všetky potrebné informácie nielen o našich službách ešte viac dostupné tým, ktorí ich v ťažkej životnej chvíli potrebujú.',
      'Platformu Potom.sk tak nevnímame ako konkurenciu, ale práve naopak, ako nášho partnera. Rozširuje naše služby a našu pomoc smerom k ľuďom, ktorí sú práve v jednom z najťažších období života. A robí to spôsobom, ktorý je praktický, empatický a bezplatný.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'smutocne-oznamenia-fotografia-a-hudba',
    datum: '13. októbra 2025',
    datumIso: '2025-10-13',
    tag: 'Prvé kroky',
    t: 'prve-kroky',
    foto: '/assets/clanky/smutocne-oznamenia-fotografia-a-hudba.jpg',
    fotoAlt: 'Husle na stole v dome smútku',
    titulok: 'Smútočné oznámenia, fotografia zosnulého a smútočná hudba',
    text: 'Praktický sprievodca prípravou parte, výberom fotografie a hudby na rozlúčku. Malé rozhodnutia, ktoré dodajú obradu osobný tón.',
    telo: [
      '## Smútočné oznámenie (parte)',
      'Súčasťou prípravy pohrebného obradu je aj výber smútočného oznámenia (parte), jeho vytvorenie a distribúcia podľa rozhodnutia pozostalých. Slúži na informovanie nielen rodiny, ale aj kolegov a známych o úmrtí vášho blízkeho. Okrem toho sú na ňom aj informácie o termíne a mieste poslednej rozlúčky so zosnulým. Smútočné oznámenie teda predstavuje verejné oznámenie o úmrtí osoby a jej pohrebu.',
      'Väčšina pohrebných služieb má pripravené hotové šablóny rôznych druhov smútočných oznámení a veršov, do ktorých sa doplnia potrebné údaje, prípadne sa upraví vzhľad smútočného oznámenia. Na parte je možné umiestniť aj fotografiu zosnulého. Je na pozostalých, koľko kusov smútočných oznámení si v pohrebnej službe nechajú vyhotoviť. Tlač smútočného oznámenia zabezpečí buď pohrebná služba podľa želania pozostalých, alebo pozostalí sami podľa vlastného rozhodnutia.',
      'K tomu, aby pohrebná služba mohla smútočné oznámenie zverejniť, bude potrebovať váš súhlas ako objednávateľa pohrebu. Bez vášho podpisu oficiálne smútočné oznámenie nikde uvádzať nesmie.',
      '## Portrétna fotografia',
      'Štandardom počas smútočného obradu je aj umiestnenie portrétnej fotografie zosnulého pri rakve v dome smútku alebo kostole. Fotografiu je možné vyhotoviť v rôznych veľkostiach, umiestniť ju v rámčeku rôznych farieb buď priamo na rakvu alebo na stolík či stojan. Taktiež je možné fotografiu vyhotoviť v rôznych veľkostiach a prevedeniach na plátne v drevenom ráme. Po skončení obradu fotografia ostáva na pamiatku pozostalým. V niektorých domoch smútku sú umiestnené monitory, na ktorých je možné zobraziť fotografiu zosnulého. Pred pohrebným obradom je možné zobraziť aj rôzne koláže a prezentácie spomienkových rodinných fotografií zosnulého.',
      '## Výber smútočnej hudby',
      'Väčšina pohrebných služieb v súčasnosti ponúka počas pohrebného obradu aj reprodukovanú hudbu. Pozostalí si teda môžu vybrať hudbu, ktorá bude znieť pred začiatkom pohrebného obradu alebo na jeho konci. Mnoho pozostalých si želá, aby na pohrebe ich blízkeho príbuzného znela hudba, ktorú mal zosnulý rád ešte za života a sprevádzala ho na jeho poslednej ceste. Ak si pozostalí nevedia hudbu zabezpečiť sami, obrátia sa s touto požiadavkou priamo na pohrebnú službu. Takmer každá pohrebná služba má k dispozícii ponukový katalóg, v ktorom si pozostalí môžu vybrať hudobný žáner, interpreta alebo konkrétnu skladbu.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'xxi-konferencia-hca-slovakia',
    datum: '9. októbra 2025',
    datumIso: '2025-10-09',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/xxi-konferencia-hca-slovakia.jpg',
    fotoAlt: 'Účastníci XXI. konferencie HCA Slovakia v sále',
    titulok: 'XXI. Konferencia HCA Slovakia',
    text: 'Boli sme pri tom: odborná konferencia o štandardoch a inováciách v pohrebníctve. Držíme krok s tým najlepším v odbore.',
    telo: [
      'Tento rok sa v Hoteli Grand Vígľaš dňa 24. septembra 2025 konala v poradí už XXI. Konferencia HCA Slovakia, ktorej témou bola EFEKTIVITA A RAST FIRMY. Na tejto konferencii sa zúčastnil aj konateľ našej firmy Pohrebné a kamenárske služby Paciga Marek Paciga. Cieľom konferencie bolo získať rady a tipy od úspešných majiteľov, ktoré môžu nakopnúť podnikanie k lepším výsledkom.',
      'Prudký nárast, teda expanzia, je dôkazom mimoriadnej schopnosti predvídať, plánovať, riadiť, koordinovať a dosahovať tie správne ciele. Bez ohľadu na to, ako dobre sa firme darí dnes, situácia sa vždy môže rýchlo zmeniť. Podnikáme v časoch, kedy je zvyšovanie efektivity a optimalizácia procesov nevyhnutná pre to, aby firma úspešne rástla. Preto sa treba zamýšľať aj nad tým ako zabezpečiť pre svoju firmu a jej ľudí dobrú budúcnosť a udržať trvalý nárast firmy.',
      'Na konferencii vystúpili slovenskí podnikatelia, ktorých spája jedna vec. Všetci toho v živote veľa dokázali a zvládli problémy, pred ktorými by väčšina ľudí utiekla. Stálo ich veľa potu a úsilia, množstvo peňazí a často aj veľa bezsenných nocí a vrások na čele, pokiaľ si uvedomili, že podnikanie pozostáva zo zopár kľúčových bodov úspechu, ktorých sa dnes držia zubami-nechtami. Už vedia, čo sa má robiť a čo sa nesmie. Dozvedeli sme sa informácie, ktoré sa nikde inde nedozviete a nikto z konkurencie vám ich neprezradí. Konferencia bola určená pre majiteľov, výkonných riaditeľov a TOP manažérov firiem.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'od-prezidenta-az-po-obycajnych-ludi',
    datum: '10. septembra 2025',
    datumIso: '2025-09-10',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/od-prezidenta-az-po-obycajnych-ludi.jpg',
    fotoAlt: 'Nosiči Paciga nesú rakvu s kvetmi pred kostolom',
    titulok: 'Od prezidenta až po obyčajných ľudí: dôstojné pohrebné rozlúčky pod Tatrami',
    text: 'Nerobíme rozdiely. Rovnaká starostlivosť pre každú rodinu, od bežných rozlúčok po pohreby známych osobností.',
    telo: [
      'Naša pohrebná služba Paciga ponúka svoje služby dvadsaťštyri hodín denne sedem dní v týždni pre všetkých obyvateľov podtatranského regiónu a blízkeho okolia. U nás si naše služby vyberú všetci rovnako. My nerobíme rozdiely, či zosnulý bol pracovník alebo riaditeľ firmy. To všetko máme zahrnuté aj v našej ponuke. Od obyčajných laminátových a drevených rakiev, cez vyrezávané smrekové a dubové rakvy až po luxusné rakvy amerického štýlu. Zákazník si u nás na pohrebný obrad môže vybrať štandardnú kvetinovú výzdobu i honosné smútočné vence, či kytice. K dispozícii máme bežné pohrebné vozidlá, pohrebnú limuzínu v retro štýle, ale aj luxusnú pohrebnú limuzínu najvyššej triedy.',
      'Sme poctení, že naše služby už v minulosti využili aj významné osobnosti nášho spoločenského a politického života. Okrem bývalého prezidenta SR, to boli aj poslanci NR SR, ktorým zomreli ich rodinní príslušníci. Pochovávali sme manželku nebohého slovenského spisovateľa, chatára, nosiča a horolezca Bela Kapolku, bývalú rozhlasovú redaktorku Slovenského rozhlasu, podnikateľov, športovcov a iných. V najťažších chvíľach sme boli oporou rodinám, ktoré zasiahli náhle úmrtia, či rôzne nešťastia a tragédie.',
      'Naše služby dokonca využil aj filmový priemysel. Minulý rok sme sa zúčastnili nakrúcania poľského seriálu s názvom Šleboda, ktorý u nás diváci poznajú pod názvom Osudové putá. Tento napínavý kriminálny seriál, ktorý sa odohráva v oblasti Vysokých a Belianskych Tatier, žne u našich severných susedov veľký úspech. Našu prácu vykonávame vždy profesionálne a na čo najvyššej úrovni. O tom svedčí aj doterajší záujem o naše služby.',
      'Od augusta tohto roku naše služby využíva aj Úrad pre dohľad nad zdravotnou starostlivosťou v Bratislave, keďže sme uspeli vo výberovom konaní. V praxi to znamená, že uskutočňujeme prevozy zosnulých z okresov Kežmarok a Poprad na pitvu na Súdnolekárske pracovisko úradu v Martine. Okrem toho uskutočňujeme prevozy zosnulých nielen na území Slovenska, ale aj medzinárodné prevozy v rámci Európy.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'kvetinova-vyzdoba-na-pohrebe',
    datum: '5. septembra 2025',
    datumIso: '2025-09-05',
    tag: 'Prvé kroky',
    t: 'prve-kroky',
    foto: '/assets/clanky/kvetinova-vyzdoba-na-pohrebe.jpg',
    fotoAlt: 'Rakvová kytica zo žltých a bielych kvetov na drevenej rakve',
    titulok: 'Kvetinová výzdoba na pohrebe',
    text: 'Rakvová kytica, vence a stuhy. Ako vybrať kvety, ktoré zdôraznia osobnosť zosnulého, a čo všetko zariadime za vás.',
    telo: [
      'Kvety sú vždy neoddeliteľnou súčasťou každého pohrebného obradu. Vieme nimi vyjadriť naše pocity a prejaviť sústrasť smútiacej rodine. Súčasťou našich pohrebných služieb je aj kvetinárstvo. To pozostalým umožňuje pri vybavovaní pohrebu zariadiť všetko potrebné na jednom mieste. Na objednávku podľa želania zákazníka zhotovíme rakvovú kyticu, smútočné vence a kytice.',
      'Pre pozostalých je dôležitý výber rakvovej alebo smútočnej kytice, či venca. Výber kvetov a ich farba by mal zdôrazňovať osobnosť zosnulého. Rakvovú kyticu zhotovujeme v štandardnom tvare. Smútočné vence a kytice je možné navrhnúť v najrôznejších tvaroch (okrúhle, oválne, v tvare srdca alebo slzy), v rôznych farbách a veľkostiach, s pohrebnou stuhou alebo bez nej. Na smútočných stuhách je priestor na záverečný pozdrav, posledné zbohom od najbližších. V ponuke máme aj umelé smútočné vence rôznych veľkostí a tvarov. Rakvovú kyticu je možné ponechať na rakve alebo ju z nej odstrániť po spustení rakvy do hrobu, resp. ak ide zosnulý na kremáciu, po vložení rakvy do pohrebného vozidla a umiestniť na vaše rodinné hrobové miesto.',
      'Druh kvetov, počet a farbu si môžete navrhnúť podľa vlastnej predstavy. Živé kvety sú objednávané priamo vo veľkosklade pre konkrétnu objednávku a sú vždy čerstvé. Na želanie sa podľa výberu môžu aranžovať umelé kvety do živej čečiny alebo kombinácia živých a umelých kvetov do živej čečiny. Prihliada sa vždy aj na miestne zvyky, zvlášť na vidieku, kde kvetinovú výzdobu na pohreb dovezieme spolu s rakvou jednu až dve hodiny pred začiatkom pohrebného obradu. Taktiež vždy zabezpečujeme vetvičky ihličnanov (smrek, borovica, jedľa či jalovec) k hrobu, ktoré sú umiestnené v nerezových stojanoch.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'druh-pohrebneho-obradu',
    datum: '13. augusta 2025',
    datumIso: '2025-08-13',
    tag: 'Prvé kroky',
    t: 'prve-kroky',
    foto: '/assets/clanky/druh-pohrebneho-obradu.jpg',
    fotoAlt: 'Ruka s ľaliou položená na rakve',
    titulok: 'Druh pohrebného obradu',
    text: 'Cirkevný alebo občiansky obrad. Čím sa líšia, čo zabezpečí farský úrad a čo pohrebná služba.',
    telo: [
      'Slovensko je prevažne kresťanská krajina. Najpočetnejšia skupina obyvateľstva je rímskokatolíckeho vierovyznania, takmer 60 %, ku gréckokatolíckej cirkvi sa hlási 4 % obyvateľstva, k pravoslávnej necelé 1 % a k evanjelickej cirkvi a. v. viac ako 5 % obyvateľstva. K ostatným cirkvám sa hlási alebo bez vyznania je okolo 30 % obyvateľstva. Ročne na Slovensku zomrie okolo 53 000 osôb. Približne 43 000 pohrebov je cirkevných, zvyšok tvoria občianske pohrebné obrady alebo sa pohreby uskutočnia bez obradu.',
      '## Cirkevný pohreb',
      'Organizuje sa podľa príslušnosti zosnulého k cirkvi. Preto je potrebné kontaktovať príslušný farský úrad a dohodnúť termín pohrebu s príslušným duchovným. Termín je potrebné skoordinovať s pohrebnou službou, ktorá organizuje pohrebný obrad. Duchovný zároveň zabezpečí miništrantov a kantora (organista a spevák v kostole). Cirkevný obrad prebieha prevažne v dome smútku, obradnej sieni krematória alebo v kostole. Ak sa uskutoční v kostole, jeho súčasťou je väčšinou aj svätá omša. V prípade, že zosnulý bude pochovaný do zeme, pohrebné obrady pokračujú a ukončené sú pri hrobovom mieste.',
      '## Občiansky pohreb',
      'Prebieha podobným spôsobom ako cirkevný pohreb v dome smútku alebo obradnej sieni krematória. V plnom rozsahu ho však zabezpečuje vybraná pohrebná služba, ktorá má vlastného obradníka (rečníka) alebo ho zabezpečí. Niektoré mestá a obce majú svojho obradníka, ktorý vykoná pohrebný obrad v súčinnosti s pohrebnou službou. Obstarávateľ pohrebu pohrebnej službe poskytne požadované informácie o zosnulom, teda životopis, jeho fotografie, prípadne obľúbenú hudbu. Či už ide o cirkevný alebo občiansky pohrebný obrad, pohrebná služba odbremení pozostalých od organizačných povinností a je im nápomocná v ich ťažkom životnom okamihu. V niektorých prípadoch sa nekoná žiaden pohrebný obrad a na žiadosť pozostalých je zosnulý prevezený priamo do krematória k spopolneniu. Pohrebný obrad (rozlúčka) sa vykoná až následne s urnou.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'sposoby-pochovavania',
    datum: '22. júla 2025',
    datumIso: '2025-07-22',
    tag: 'Plánovanie vopred',
    t: 'planovanie',
    foto: '/assets/clanky/sposoby-pochovavania.jpg',
    fotoAlt: 'Muž v obleku drží urnu vedľa sviečok',
    titulok: 'Spôsoby pochovávania',
    text: 'Do zeme, do hrobky alebo kremácia. Prehľad možností a toho, čo každá z nich obnáša.',
    telo: [
      'Napriek tomu, že pohrebná služba organizačne zabezpečí podstatnú časť pohrebu, je potrebné urobiť niekoľko rozhodnutí, ktoré musia urobiť pozostalí. Najdôležitejším rozhodnutím je vybrať spôsob pochovania zosnulého. V súčasnej dobe existuje niekoľko spôsobov pochovávania. Slovensko je konzervatívna krajina a to platí aj pre formy ukladania pozostatkov zosnulých. Postupne však badať, že tradičné pochovávanie v rakve s cirkevným obradom, ktoré je typické pre historický vývoj nášho územia, už preferuje čoraz menej Slovákov. Viac a viac ľudí volí spopolnenie v krematóriu.',
      '## Klasický pohreb: pochovanie v rakve do zeme',
      'Pochovanie môže vykonať buď do nového hrobového miesta alebo do existujúceho hrobového miesta, ktorým disponujú pozostalí. Za hrobové miesto sa platí poplatok stanovený pre daný cintorín. Nové hrobové miesto zabezpečí správca cintorína, resp. obec alebo mesto. So správcom cintorína je následne potrebné zabezpečiť výkop alebo sprístupnenie hrobového miesta (buď to zabezpečí vybratá pohrebná služba alebo pozostalí).',
      '## Klasický pohreb: pochovanie v rakve do hrobky',
      'Pochovať zosnulého je možné aj do vopred pripravenej betónovej hrobky. Do hrobky je možné uložiť aj viacero rakiev s ľudskými pozostatkami. Rakva uložená do hrobky musí byť zabezpečená pred únikom zápachu do okolia. Hrobka je po vložení rakvy uzatvorená betónovými prefabrikátmi, izoláciou a vrstvou betónu. Musí byť vyrobená a zabezpečená tak, aby chránila ľudské pozostatky pred vonkajšími vplyvmi.',
      '## Spopolnenie (kremácia)',
      'V prípade spopolnenia sa vykoná najskôr pohrebný obrad, teda rozlúčka so zosnulým, a neskôr prebehne spopolnenie. Až potom sa uskutoční uloženie urny s popolom zosnulého do hrobového miesta, urnového miesta alebo kolumbária. Taktiež je možný rozptyl alebo vsyp na miestach na to určených, teda rozptylová alebo vsypová lúka. Celý postup je vhodné dohodnúť s vybratou pohrebnou službou. Spopolnenie a následné uloženie urny do kolumbária patrí medzi najmodernejší spôsob pochovávania. Zároveň je ideálnym riešením z dôvodu vyťaženia kapacít cintorínov a čoraz väčším nedostatkom miest pre klasické a urnové pomníky.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'vyber-pohrebnej-sluzby-a-organizacia-pohrebu',
    datum: '2. júla 2025',
    datumIso: '2025-07-02',
    tag: 'Prvé kroky',
    t: 'prve-kroky',
    foto: '/assets/clanky/vyber-pohrebnej-sluzby-a-organizacia-pohrebu.jpg',
    fotoAlt: 'Interiér pobočky Paciga so stolom pre pozostalých a vitrínou urien',
    titulok: 'Výber pohrebnej služby a organizácia pohrebu',
    text: 'Podľa čoho si vybrať pohrebnú službu, čo si priniesť na pobočku a čo za vás vybavíme.',
    telo: [
      'Po úmrtí blízkej osoby sa musíte vysporiadať nielen s veľkou stratou, ale popri žiaľu musíte zorganizovať aj pohreb. Táto situácia je veľmi bolestná a náročná, netreba mať však zbytočný strach a obavy. Pracovníci pohrebných služieb sú s ňou konfrontovaní denne, a preto bývajú nápomocní a vybavovanie pohrebu vám uľahčia. Sú vyškolení postupovať profesionálne, citlivo vám dokážu poradiť a odbremenia pozostalých od celej rady starostí.',
      'Na základe čoho si ale vybrať kvalitné pohrebné služby? Výber takejto firmy je dôležitý, pretože kvalitné pohrebné služby vás odbremenia od organizácie pohrebu. Najmä však zabezpečia dôstojnú rozlúčku s vašim blízkym zosnulým. V každom meste sú firmy, ktoré poskytujú komplexné pohrebné služby už dlhé roky. Tieto pohrebné služby majú za sebou už množstvo rozlúčok so zosnulými, a teda aj množstvo skúseností a odporúčaní zo strany klientov. Jednou z takýchto pohrebných služieb v podtatranskom regióne je i naša spoločnosť Pohrebné a kamenárske služby Paciga. Naša rodinná firma pôsobí pod Vysokými Tatrami už viac ako desať rokov. Ročne vybavíme viac ako dvesto pohrebov a niekoľko prevozov zosnulých zo zahraničia.',
      'Ak vás zasiahlo úmrtie blízkeho človeka a rozhodnete sa pre naše profesionálne pohrebné služby, zavolajte nám NON STOP 0903 596 364 alebo 0948 110 109. Na týchto číslach vám 24 hodín denne, 7 dní v týždni poskytneme všetky dôležité informácie. Následne navštívte ktorúkoľvek z našich pobočiek v Poprade alebo v Spišskej Belej. Naši pracovníci na základe vašich požiadaviek zabezpečia všetky potrebné úkony s organizáciou pohrebu.',
      'Na našu pobočku si prineste občiansky preukaz, ak budete objednávateľ pohrebu, a taktiež občiansky preukaz zosnulého. Ak máte k dispozícii aj listy o prehliadke alebo potvrdenie o prehliadke zosnulého od prehliadajúceho lekára, je potrebné ich tiež priniesť. Na základe splnomocnenia, ktoré nám podpíšete, naši pracovníci zabezpečia nielen samotnú organizáciu pohrebu, ale aj ďalšie služby súvisiace s vybavovaním. Jednou z takýchto služieb je aj vybavenie úmrtného listu na matričnom úrade v mieste úmrtia. Na základe služieb, ktoré si u nás vyberiete, budete vopred informovaní o nákladoch, ktoré vás čakajú s organizáciou pohrebu.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'umrtie-v-zahranici',
    datum: '4. júna 2025',
    datumIso: '2025-06-04',
    tag: 'Prvé kroky',
    t: 'prve-kroky',
    foto: '/assets/clanky/umrtie-v-zahranici.jpg',
    fotoAlt: 'Vozidlo Paciga pred budovou cintorína v zahraničí',
    titulok: 'Úmrtie v zahraničí',
    text: 'Čo zabezpečí veľvyslanectvo, aké doklady sú potrebné a ako prebieha prevoz zosnulého na Slovensko.',
    telo: [
      'V prípade úmrtia občana SR (s trvalým pobytom na území Slovenskej republiky) v zahraničí zabezpečí konzulárne pracovisko veľvyslanectva SR, prípadne konzulárny odbor MZV SR urýchlené vyrozumenie príbuzných zosnulého v SR spolu s nasledujúcimi informáciami, ak ich už má k dispozícii:',
      '→ dátum, miesto a príčina smrti',
      '→ adresa a kontakt na ústav, kde sa nachádzajú telesné pozostatky nebohého a podmienky vydania tela zosnulého pozostalým, resp. pohrebnej službe',
      '→ podmienky pre vydanie tela zosnulého na jeho prevoz do SR',
      '→ predpokladaná výška nákladov na prevoz tela zosnulého do SR, prípadne náklady na kremáciu a prevoz urny do SR, alebo výška nákladov spojených s pohrebom v zahraničí',
      'V súlade s predpismi miestnych úradov zabezpečí konzulárne pracovisko taktiež vystavenie sprievodného listu na prepravu telesných pozostatkov do zahraničia. Konzulárni pracovníci poskytnú pozostalým kontakt na miestne pohrebné služby s orientačným uvedením ceny prepravy, prípadne pohrebu alebo kremácie v cudzine. Okolnosti, termíny a spôsob pohrebu si dohodnú pozostalí v spolupráci s miestnou, prípadne slovenskou špecializovanou pohrebnou službou a na vlastné náklady. Ak došlo k úmrtiu občana SR v dôsledku trestného činu alebo autonehody v zahraničí, informujte sa o termíne, kedy miestne úrady uvoľnia telesné pozostatky na prevoz a pohreb.',
      '## Preprava zosnulých zo zahraničia',
      'Ak sa rozhodnete pre pohreb vášho príbuzného na Slovensku, teda že chcete telo zosnulého prepraviť zo zahraničia domov, vyberte si na to špecializovanú pohrebnú službu. Máte možnosť využiť samotnú prepravu tela zosnulého, alebo prevoz spolu s vybavením všetkých potrebných dokumentov v zahraničí, pre pochovanie zosnulého na Slovensku. Telo zosnulého je možné na Slovensko previezť podľa medzinárodných dohôd. V mieste, kde došlo k úmrtiu, obhliadajúci lekár vystaví takzvaný pas pre mŕtvolu. Pod jeho dohľadom je telo zosnulého vložené do prepravnej rakvy a zapečatené. Prevoz zabezpečí pohrebná služba Paciga. Preprava je najčastejšie realizovaná pohrebným vozidlom po cestách, ale aj letecky, loďou alebo železnicou (podľa toho, v ktorej krajine došlo k úmrtiu). Telesné pozostatky musia byť preto uložené v prepravnej schránke prispôsobenej na tento účel. Sprievodné dokumenty musia byť vystavené v súlade s právom východzej, ale aj prejazdnej a cieľovej krajiny. Ak je telo zosnulého spopolnené v mieste smrti, urnu je možné poslať na Slovensko poštovou alebo kuriérskou službou spolu s náležitými dokumentami.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'ako-postupovat-pri-umrti-blizkeho-cloveka',
    datum: '28. mája 2025',
    datumIso: '2025-05-28',
    tag: 'Prvé kroky',
    t: 'prve-kroky',
    foto: '/assets/clanky/ako-postupovat-pri-umrti-blizkeho-cloveka.jpg',
    fotoAlt: 'Smútiaca žena s vreckovkou',
    titulok: 'Ako postupovať pri úmrtí blízkeho človeka',
    text: 'Komu zavolať ako prvému, čo urobí obhliadajúci lekár a čo nasleduje doma aj v nemocnici.',
    telo: [
      'Každý z nás je niekoľkokrát v živote priamo konfrontovaný s úmrtím blízkeho človeka. Či je to smrť starých rodičov, rodičov alebo niekoho iného v rodine, táto situácia je veľmi zraňujúca, emočne vypätá a pôsobí ochromujúco. Aj keď sa snažíme uvažovať racionálne a vieme, že smrť k životu jednoducho patrí, zvládame ju veľmi ťažko. Prečítajte si niekoľko praktických rád, ktoré vám pomôžu zvládnuť túto ťažkú situáciu.',
      '## Úmrtie doma',
      'V prípade úmrtia vášho blízkeho mimo zdravotníckeho zariadenia, resp. ak umrie doma, musíte túto skutočnosť bezodkladne oznámiť. Zavolajte na tiesňovú linku 112, ktorá na miesto vyšle obhliadajúceho lekára. Privolaný lekár vykoná obhliadku a vystaví list o prehliadke mŕtveho v troch vyhotoveniach. Budete ho neskôr potrebovať, preto si ho odložte. Lekár tiež vystaví štatistické hlásenie o úmrtí. Každý je povinný lekárovi poskytnúť informácie o okolnostiach, za ktorých došlo k úmrtiu. Lekár v liste o prehliadke mŕtveho uvedie aj to, či je potrebné vykonať pitvu, alebo je možné telo zosnulého pochovať bez pitvy.',
      'Ak lekár nariadil pitvu, jeho povinnosťou je privolať na prepravu zosnulého pohrebnú službu, ktorá má zmluvu s Úradom pre dohľad nad zdravotnou starostlivosťou. Úrad zastrešuje pracoviská súdneho lekárstva a patologickej anatómie, ktoré zabezpečujú výkon prehliadok mŕtvych, pitiev a laboratórnych vyšetrovacích metód.',
      '→ Úlohou zmluvnej pohrebnej služby je vykonať prepravu zosnulého na pracovisko v Martine aj s vypísanou dokumentáciou od obhliadajúceho lekára.',
      '→ Pozostalí nie sú povinní si u tejto pohrebnej služby objednávať ďalšie služby. Pohrebnú službu, ktorá prepraví zosnulého a zabezpečí poslednú rozlúčku s vašim drahým zosnulým, si vyberte sami podľa vlastného uváženia. Nedajte sa ovplyvniť a zneužiť vaše momentálne psychické rozpoloženie. Nikto nemá právo rozhodnúť o tom, kto vám bude zabezpečovať pohrebné služby.',
      'Ak lekár pitvu nenariadil a rozhodli ste sa pre našu pohrebnú službu, zavolajte na naše čísla NON STOP 0903 596 364 alebo 0948 110 109. My prepravíme zosnulého do chladiaceho zariadenia na dočasné uloženie pokiaľ neprebehne samotný pohreb. Zároveň zabezpečíme všetky potrebné náležitosti týkajúce sa samotného pohrebného obradu.',
      '## Úmrtie v nemocnici',
      'V prípade úmrtia vašej blízkej osoby v nemocnici, v domove sociálnych služieb, alebo v zariadení pre seniorov, vás bude kontaktovať poverený zamestnanec daného zariadenia. Oznámi vám, či obhliadajúci lekár nariadil pitvu, alebo nie. Aj v tomto prípade je postup rovnaký, ako pri úmrtí doma. Ak ste sa rozhodli pre našu pohrebnú službu, zavolajte na naše čísla NON STOP 0903 596 364 alebo 0948 110 109. My prepravíme zosnulého do chladiaceho zariadenia na dočasné uloženie pokiaľ neprebehne samotný pohreb. Zároveň zabezpečíme všetky potrebné náležitosti týkajúce sa samotného pohrebného obradu.',
    ],
    cta: {
      nadpis: 'Napíšte nám. Radi vám poradíme.',
      text: 'Celý postup krok za krokom nájdete v našom sprievodcovi pre pozostalých.',
      odkaz: '/informacie-pre-pozostalych',
      odkazText: 'Sprievodca pre pozostalých',
    },
  },
  {
    slug: 'medzinarodna-konferencia-pohrebnych-sluzieb-2025',
    datum: '9. mája 2025',
    datumIso: '2025-05-09',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/medzinarodna-konferencia-pohrebnych-sluzieb-2025.jpg',
    fotoAlt: 'Sála Medzinárodnej konferencie pohrebných služieb na Slovensku 2025',
    titulok: 'Zúčastnili sme sa Medzinárodnej konferencie pohrebných služieb na Slovensku',
    text: 'Druhý ročník konferencie spojil profesionálov z celej Európy. Témou bola elektronizácia dokumentov aj repatriácia zosnulých.',
    telo: [
      'V Hoteli Bratislava v Bratislave sa dňa 7. 5. 2025 konala Medzinárodná konferencia pohrebných služieb na Slovensku. Druhý ročník tohto významného odborného podujatia organizovala Slovenská asociácia pohrebných a kremačných služieb, ktoré každoročne spája profesionálov z oblasti pohrebníctva z celej Európy. Zástupcovia našej firmy nechýbali medzi účastníkmi.',
      'Jednou z najdôležitejších tém konferencie bola elektronizácia dokumentov pri úmrtí zo strany obhliadajúceho lekára až po konečný záznam v matrike. Ide o nevyhnutný, dobou nastolený nový spôsob, ktorý reflektuje na elektronizáciu všetkých služieb i medzi štátnymi orgánmi. Ďalšími témami bola repatriácia tiel zosnulých, spolupráca v medzinárodnej oblasti a špecifikácia vzťahov medzi Ukrajinou a Slovenskom pri vývoze tiel zosnulých a fungovanie pohrebných služieb v rámci platnej legislatívy a rešpektovanie zvykov na Slovensku a v iných krajinách EÚ.',
      'Konferencia bola jedinečnou príležitosťou nielen na výmenu skúseností a diskusiu o aktuálnych trendoch v pohrebníctve, ale najmä na hľadanie nových možností ako ešte citlivejšie a profesionálnejšie pristupovať k službám, ktoré poskytujeme. Účasť na konferencii považujeme za veľmi dôležitý krok k neustálemu zvyšovaniu kvality našich služieb. Stretnutia s odborníkmi z iných krajín nám priniesli množstvo inšpirácie a nových podnetov.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'absolvovali-sme-odborne-skolenie',
    datum: '22. apríla 2025',
    datumIso: '2025-04-22',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/absolvovali-sme-odborne-skolenie.jpg',
    fotoAlt: 'Účastníci odborného školenia v Lučenci pri práci s modelmi hláv',
    titulok: 'Absolvovali sme odborné školenie',
    text: 'Konzervácia, balzamovanie a rekonštrukcia tváre zosnulého. Ako jediní zo Spiša sme sa zúčastnili medzinárodného školenia v Lučenci.',
    telo: [
      'Práca v pohrebnej službe nie je len povolanie, je to poslanie. Pozostalým sme vždy oporou v tých najťažších chvíľach. Pozostalí sa ale nie vždy môžu so svojim zosnulým rozlúčiť pri otvorenej rakve. Mnohokrát to neumožnia posmrtné zmeny či devastačné poranenia zosnulého. Naši zamestnanci sa preto neustále vzdelávajú a pravidelne zúčastňujú rôznych odborných školení. V piatok 11. apríla 2025 sme sa zúčastnili medzinárodného odborného školenia v Lučenci.',
      'Školenie bolo zamerané na celkovú bezpečnosť, dezinfekciu pracovníkov i upravovaného ľudského tela. Nasledovala prednáška o činnosti pri zabezpečovaní čiastočnej konzervácie, plnej konzervácie a balzamovania zosnulých.',
      'Lektor a skúsený školiteľ Adam Ragiel z Poľska pracovníkom pohrebných služieb odprezentoval viacero spôsobov rekonštrukcie tváre zosnulého, za použitia rôznych materiálov a postupov. Samostatná časť sa týkala postupov pri úprave tvárovej oblasti, dekoltu a rúk. Niektoré postupy sme si mohli priamo aj vyskúšať.',
      'Účasťou na tomto odbornom školení sme získali nielen certifikát, ale najmä zvýšili svoju kvalifikáciu na prácu s telami zosnulých, ktoré si vyžadujú rekonštrukčné zásahy a vyššie hygienické zaopatrenie. Školenie organizovala Slovenská asociácia pohrebných a kremačných služieb a konalo sa v priestoroch Pohrebnej služby Archa. Zúčastnili sa ho pracovníci pohrebných služieb nielen zo Slovenska, ale aj z Česka. Pohrebné a kamenárske služby Paciga sa tohto školenia zúčastnili ako jediné pohrebné služby zo Spiša.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'pohreb-nie-je-vzdy-iba-o-ciernej-farbe',
    datum: '4. apríla 2025',
    datumIso: '2025-04-04',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/pohreb-nie-je-vzdy-iba-o-ciernej-farbe.jpg',
    fotoAlt: 'Čierny stan Paciga na cintoríne pri kríži',
    titulok: 'Pohreb nie je vždy iba o čiernej farbe',
    text: 'Rozhovor o tom, prečo sú naše vozidlá biele a nie čierne. Článok vyšiel v časopise Slovenské pohrebníctvo.',
    telo: [
      'Pracovníci pohrebných služieb sú so smrťou konfrontovaní denne, a preto bývajú nápomocní a vybavovanie pohrebu vám uľahčia. O pôsobení najväčšej pohrebnej služby pod Vysokými Tatrami Pohrebné a kamenárske služby Paciga sa dozviete v nasledujúcom článku.',
      'Rodinná firma Pohrebné a kamenárske služby Paciga pôsobí pod Vysokými Tatrami už viac ako desať rokov. „Prvotnou myšlienkou jej vzniku bolo, aby pohreb vyzeral trochu inak ako bolo dovtedy bežné. Chceli sme priniesť niečo nové, aby posledná rozlúčka zo zosnulým prebehla dôstojne a profesionálne." povedal o svojich začiatkoch majiteľ firmy Marek Paciga.',
      'Najskôr museli s manželkou absolvovať rôzne školenia, navštevovali pohrebné výstavy na Slovensku i v zahraničí, aby obyvateľom v regióne mohli ukázať, že posledná rozlúčka môže byť naozaj dôstojná a nezabudnuteľná. „Naša firma sa ako jediná pohrebná služba pod Vysokými Tatrami stala členom Asociácie pohrebných a kremačných služieb na Slovensku, čo znamená, že sa v našej oblasti pravidelne vzdelávame, zúčastňujeme sa rôznych školení a seminárov." pokračuje Marek Paciga.',
      'Spoločnosť Pohrebné a kamenárske služby Paciga poskytuje svoje služby obyvateľom okresov Poprad a Kežmarok, jej služby však využívajú aj obyvatelia susedných okresov Stará Ľubovňa, Levoča, Spišská Nová Ves a Liptovský Mikuláš. „Sídlo spoločnosti je v Spišskej Belej, kde máme aj svoju pobočku. Ďalšiu pobočku máme v Poprade. Sme tak obyvateľom podtatranských miest a obcí k dispozícii 24 hodín denne 7 dní v týždni." dodáva Marek Paciga.',
      '„Chceme poskytovať čo najkvalitnejšie služby, aj preto sme vo firme zaviedli interné predpisy, ktorými sa riadime. Naši zamestnanci majú predpísaný dress code, čo znamená, že do práce prichádzajú vždy upravení a ustrojení. Voči našim zákazníkom sa snažíme vždy vystupovať nielen reprezentatívne, ale za každých okolností zdvorilo a citlivo." dopĺňa majiteľov syn Kamil Paciga, ktorý je spolumajiteľom firmy.',
      'V súčasnej dobe patrí spoločnosť Pohrebné a kamenárske služby Paciga medzi najväčšie pohrebníctva pod Vysokými Tatrami. Zamestnáva 8 pracovníkov na plný pracovný úväzok. Vozový park firmy tvoria kvalitné vozidlá značky Mercedes-Benz, dve pohrebné vozidlá a dve pohrebné limuzíny, taktiež dva valníky iných značiek. Svedčí o tom aj zisk 1. miesta na zraze pohrebných vozidiel, ktoré sa konalo v októbri 2024 v Lučenci.',
      'Podujatie každoročne organizuje Slovenská asociácia pohrebných a kremačných služieb. Firma tam prezentovala svoju najnovšiu luxusnú pohrebnú limuzínu Mercedes-Benz E 400. „Naše pohrebné vozidlá sú bielej farby, nie čiernej ako bežné pohrebné autá. Aj týmto sa chceme odlíšiť od ostatných pohrebných služieb. Čierna farba pôsobí deprimujúco, kým biela symbolizuje čistotu a začiatok. Veď aj smrť je začiatok niečoho nového…" vysvetľuje Marek Paciga a dodáva: „Našim cieľom je neustále zlepšovať naše služby, aby sme pozostalým mohli sprostredkovať dôstojnú poslednú rozlúčku na vysokej úrovni. Na prvom mieste je vždy ľudskosť, citlivosť a profesionalita."',
      'Okrem toho, že spoločnosť Pohrebné a kamenárske služby Paciga každý rok rozširuje rady zamestnancov a taktiež svoj vozový park, snaží sa poskytovať zákazníkom služby na najvyššej profesionálnej úrovni. „Od 1. februára 2025 naša popradská pobočka pôsobí na novej adrese na Francisciho ulici č. 35, vedľa Obchodného centra Fórum v Poprade. Týmto krokom sme vyšli v ústrety svojim zákazníkom, aby sme k nim boli bližšie. V centre mesta sa okrem všetkých úradov nachádza aj nemocnica, čo uľahčí a urýchli nielen vybavovanie našich služieb, ale aj potrebnej dokumentácie na jednom mieste." informuje Kamil Paciga.',
      'Pohrebné a kamenárske služby Paciga zabezpečujú kompletné služby, vrátane vnútroštátnej a medzinárodnej prepravy zosnulých, poradenskú a konzultačnú činnosť, či vybavenie potrebnej dokumentácie. Do podtatranského regiónu sa stále snažíme prinášať nové poznatky a trendy v oblasti pohrebníctva a prenášať ich do praxe. V prípade potreby sme ako jediná pohrebná služba pripravení použiť aj prenosné chladiace zariadenie.',
      'Článok bol publikovaný v časopise Slovenské pohrebníctvo dňa 1. apríla 2025.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'najkrajsie-pohrebne-vozidlo-na-slovensku',
    datum: '5. januára 2025',
    datumIso: '2025-01-05',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/najkrajsie-pohrebne-vozidlo-na-slovensku.jpg',
    fotoAlt: 'Diplom za 1. miesto v súťaži Najkrajšie pohrebné vozidlo, Lučenec 2024',
    titulok: 'Najkrajšie pohrebné vozidlo na Slovensku',
    text: 'Na zraze pohrebných vozidiel v Lučenci sme s limuzínou Mercedes-Benz E 400 získali prvé miesto.',
    telo: [
      'Firma Pohrebné a kamenárske služby Paciga sa v dňoch 11. a 12. októbra 2024 zúčastnila zrazu pohrebných vozidiel, ktorý sa uskutočnil v Lučenci. Prezentovala tam svoju najnovšiu luxusnú pohrebnú limuzínu Mercedes-Benz E 400. Podujatie každoročne organizuje Slovenská asociácia pohrebných a kremačných služieb v spolupráci s Pohrebnou službou Archa Lučenec. Najväčším lákadlom pre návštevníkov boli pohrebné vozidlá. V Lučenci boli prítomné staršie pohrebné vozidlá, dokonca aj historický pohrebný koč s konským záprahom, ale i najmodernejšie pohrebné limuzíny. Pohrebné a kamenárske služby Paciga získali 1. miesto za „Najkrajšie pohrebné vozidlo na Slovensku".',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'netradicne-ulozenie-urny',
    datum: '5. januára 2025',
    datumIso: '2025-01-05',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/netradicne-ulozenie-urny.jpg',
    fotoAlt: 'Urnová stena na cintoríne a otvorený kufor pohrebného vozidla',
    titulok: 'Netradičné uloženie urny',
    text: 'Po tridsiatich rokoch sa urna partizánskeho veliteľa vrátila z Austrálie na cintorín v Poprade-Veľkej.',
    telo: [
      'Uloženie urny s popolom zosnulého sú bežnou súčasťou ponuky každej pohrebnej služby po vykonaní pohrebného obradu a následného spopolnenia zosnulého. Firma Pohrebné a kamenárske služby Paciga sa tento rok zúčastnila na jednom netradičnom uložení urny. Pri príležitosti 80. výročia Slovenského národného povstania sa v kolumbáriu na cintoríne v Poprade-Veľkej uskutočnilo uloženie urny s popolom partizánskeho veliteľa, ktorý zomrel v roku 1994. Urnu odvtedy uchovávala doma jeho dcéra, ktorá žije v austrálskom Sydney. Po 30-tich rokoch od smrti svojho otca sa rozhodla uložiť jeho telesné pozostatky na miestach, kde v rokoch 1944 až 1945 bojoval ako partizán.',
    ],
    cta: CTA_KONTAKT,
  },
  {
    slug: 'novy-obetny-stol-a-kazatelnica',
    datum: '5. januára 2025',
    datumIso: '2025-01-05',
    tag: 'Zo života Paciga',
    t: 'zo-zivota',
    foto: '/assets/clanky/novy-obetny-stol-a-kazatelnica.jpg',
    fotoAlt: 'Biskup pri požehnaní nového obetného stola v kostole',
    titulok: 'Nový obetný stôl a kazateľnica',
    text: 'Podieľali sme sa na obnove oltára vo Farskom kostole Obetovania Pána v Slovenskej Vsi, pod dohľadom Pamiatkového úradu.',
    telo: [
      'Začiatkom roka 2024 sa naša firma Pohrebné a kamenárske služby Paciga podieľala na výrobe a inštalovaní nového obetného stola a kazateľnice vo Farskom kostole Obetovania Pána v Slovenskej Vsi. Celý proces obnovy oltára prebiehal pod dohľadom Pamiatkového úradu, keďže kostol je zapísaný v zozname národných kultúrnych pamiatok SR. Dňa 26. apríla 2024 počas svätej omše kostol a obnovený oltár konsekroval spišský diecézny biskup Mons. František Trstenský. Na tomto slávnostnom akte sa zúčastnilo vedenie a zamestnanci našej firmy.',
    ],
    cta: CTA_KONTAKT,
  },
];

/** článok má vlastnú stránku, len keď má telo */
export const maDetail = (c: Clanok): boolean => !!c.telo && c.telo.length > 0;

export const getClanok = (slug: string): Clanok | undefined =>
  CLANKY.find((c) => c.slug === slug && maDetail(c));

/** ďalšie články pod detailom: najnovšie okrem aktuálneho */
export const ostatneClanky = (slug: string, n = 3): Clanok[] =>
  CLANKY.filter((c) => c.slug !== slug).slice(0, n);

/** telo článku rozdelené na bloky pre šablónu */
export type Blok = { typ: 'h'; text: string } | { typ: 'p'; text: string } | { typ: 'ul'; polozky: string[] };

export function bloky(telo: string[]): Blok[] {
  const out: Blok[] = [];
  for (const r of telo) {
    if (r.startsWith('## ')) {
      out.push({ typ: 'h', text: r.slice(3) });
    } else if (r.startsWith('→ ')) {
      const posledny = out[out.length - 1];
      if (posledny && posledny.typ === 'ul') posledny.polozky.push(r.slice(2));
      else out.push({ typ: 'ul', polozky: [r.slice(2)] });
    } else {
      out.push({ typ: 'p', text: r });
    }
  }
  return out;
}
