/* Paciga — zber Core Web Vitals z terénu.
   Beží až po load, cez sendBeacon, takže nesúperí o pásmo s ničím, čo
   návštevník naozaj potrebuje. Neukladá nič osobné: len metriku, cestu,
   typ zariadenia a typ siete. Žiadne ID, cookie ani IP.

   Metriky sa zbierajú do fronty a odchádzajú spolu v jednom beacone, keď
   sa stránka skryje. Do 18. 9. 2026 išla každá metrika zvlášť: až päť
   požiadaviek a päť spustení funkcie na jedno zobrazenie stránky. */
(function () {
  'use strict';

  if (!window.webVitals || !navigator.sendBeacon) return;

  // Lokálny vývoj do štatistiky nepatrí, skreslil by p75.
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return;

  var zariadenie = 'unknown';
  try {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
      zariadenie = navigator.userAgentData.mobile ? 'mobile' : 'desktop';
    } else {
      zariadenie = window.innerWidth < 768 ? 'mobile' : 'desktop';
    }
  } catch (e) { /* staršie prehliadače */ }

  var siet = null;
  try {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c && c.effectiveType) siet = c.effectiveType;
  } catch (e) { /* Network Information API nie je všade */ }

  /* Cesta bez query a bez hashu. Slugy parte sú verejné, ale query môže
     niesť čokoľvek, tak ju zahadzujem. */
  var cesta = location.pathname.replace(/\/+$/, '') || '/';
  if (cesta.length > 200) cesta = cesta.slice(0, 200);

  var fronta = [];

  function zarad(m) {
    fronta.push({
      metrika: m.name,
      // CLS je bezrozmerné a malé, zvyšok sú milisekundy
      hodnota: m.name === 'CLS' ? Math.round(m.value * 10000) / 10000 : Math.round(m.value),
      rating: m.rating,
      navigacia: m.navigationType || null
    });
  }

  function odosli() {
    if (!fronta.length) return;
    var telo = JSON.stringify({
      cesta: cesta,
      zariadenie: zariadenie,
      siet: siet,
      metriky: fronta
    });
    fronta = [];
    /* Typ musí byť application/json, nie text/plain. Astro chráni POST
       pred CSRF a odmieta „jednoduché" content typy (text/plain,
       form-urlencoded, multipart) cez 403 aj pri požiadavke z rovnakej
       domény. sendBeacon vráti true aj tak, lebo len zaradí request do
       fronty, takže sa tá chyba nedá odchytiť na klientovi. */
    try {
      navigator.sendBeacon('/api/vitals', new Blob([telo], { type: 'application/json' }));
    } catch (e) { /* ticho, telemetria nesmie rušiť stránku */ }
  }

  /* FCP, TTFB a LCP prídu počas návštevy. INP a CLS sa dopočítavajú celý
     čas, preto ich web-vitals ohlási až pri skrytí stránky. */
  webVitals.onLCP(zarad);
  webVitals.onCLS(zarad);
  webVitals.onINP(zarad);
  webVitals.onFCP(zarad);
  webVitals.onTTFB(zarad);

  /* Poslucháč musí byť na window, nie na document. web-vitals počúva
     visibilitychange na document a práve vtedy zaradí CLS a INP.
     Udalosť bublá z document na window, takže tento poslucháč beží až
     po ňom a fronta už obe metriky má. Na document by sme ho pridali
     skôr než web-vitals a odoslali by sme bez CLS a INP.
     Keď sa človek na kartu vráti a znova ju skryje, odíde len to, čo
     medzitým pribudlo.

     Zámerne bez zálohy na pagehide. Pri odchode na inú stránku príde
     pagehide PRED visibilitychange, takže by odoslal frontu bez CLS a INP
     a tie by odišli v druhom beacone. Overené v Edge 18. 9. 2026: s
     pagehide dva beacony, bez neho jeden. web-vitals sa tiež spolieha
     len na visibilitychange. */
  addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') odosli();
  });
})();
