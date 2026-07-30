/* Paciga — zber Core Web Vitals z terénu.
   Beží až po load, cez sendBeacon, takže nesúperí o pásmo s ničím, čo
   návštevník naozaj potrebuje. Neukladá nič osobné: len metriku, cestu,
   typ zariadenia a typ siete. Žiadne ID, cookie ani IP. */
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

  function posli(m) {
    var telo = JSON.stringify({
      metrika: m.name,
      // CLS je bezrozmerné a malé, zvyšok sú milisekundy
      hodnota: m.name === 'CLS' ? Math.round(m.value * 10000) / 10000 : Math.round(m.value),
      rating: m.rating,
      cesta: cesta,
      zariadenie: zariadenie,
      siet: siet,
      navigacia: m.navigationType || null
    });
    try {
      navigator.sendBeacon('/api/vitals', new Blob([telo], { type: 'text/plain;charset=UTF-8' }));
    } catch (e) { /* ticho, telemetria nesmie rušiť stránku */ }
  }

  /* Každá metrika sa hlási raz, pri skrytí stránky alebo pri jej ustálení.
     INP a CLS sa dopočítavajú celý čas, preto ich web-vitals pošle až na
     konci návštevy. */
  webVitals.onLCP(posli);
  webVitals.onCLS(posli);
  webVitals.onINP(posli);
  webVitals.onFCP(posli);
  webVitals.onTTFB(posli);
})();
