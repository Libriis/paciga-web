/* Paciga — vlastné počítadlo návštevnosti.
   Beží až po načítaní stránky, cez sendBeacon, takže nesúperí o pásmo
   s ničím, čo návštevník naozaj potrebuje.

   Neukladá nič osobné: žiadne cookie, žiadne ID, žiadna IP. Do databázy
   ide len cesta, typ zariadenia, doména odkazujúcej stránky a príznak
   „prvé zobrazenie v tejto relácii". Príznak drží sessionStorage, ktorý
   sa zavretím karty zabudne. */
(function () {
  'use strict';

  if (!navigator.sendBeacon) return;
  // Automat v prehliadači nie je návštevník.
  if (navigator.webdriver) return;

  // Lokálny vývoj a náhľady do štatistiky nepatria, skreslili by čísla.
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return;

  // Administrácia sa nepočíta. Vlastná práca nie je návštevnosť.
  if (location.pathname.indexOf('/admin') === 0) return;

  var zariadenie = 'unknown';
  try {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
      zariadenie = navigator.userAgentData.mobile ? 'mobile' : 'desktop';
    } else {
      zariadenie = window.innerWidth < 768 ? 'mobile' : 'desktop';
    }
  } catch (e) { /* staršie prehliadače */ }

  /* Cesta bez query a bez hashu. Slugy parte sú verejné, ale query môže
     niesť čokoľvek (napríklad utm alebo e-mail), tak ju zahadzujem. */
  var cesta = location.pathname.replace(/\/+$/, '') || '/';
  if (cesta.length > 200) cesta = cesta.slice(0, 200);

  /* Prvé zobrazenie v relácii = jedna návšteva. Ďalšie prekliky sú už
     len zobrazenia. Kľúč je obyčajná jednotka, nie identifikátor. */
  var nova = true;
  try {
    if (sessionStorage.getItem('pg_bol_tu') === '1') nova = false;
    else sessionStorage.setItem('pg_bol_tu', '1');
  } catch (e) { /* prehliadač bez sessionStorage: rátame ako novú */ }

  /* Z odkazovača len doména. Celá adresa by mohla niesť cudzie parametre
     a tie do našej databázy nepatria. */
  var odkazovac = null;
  try {
    if (document.referrer) odkazovac = new URL(document.referrer).hostname || null;
  } catch (e) { /* neplatný referrer */ }

  function posli() {
    var telo = JSON.stringify({
      cesta: cesta,
      zariadenie: zariadenie,
      nova: nova,
      odkazovac: odkazovac
    });
    /* Typ musí byť application/json, nie text/plain. Astro chráni POST
       pred CSRF a „jednoduché" content typy odmieta cez 403 aj pri
       požiadavke z rovnakej domény. */
    try {
      navigator.sendBeacon('/api/navsteva', new Blob([telo], { type: 'application/json' }));
    } catch (e) { /* ticho, telemetria nesmie rušiť stránku */ }
  }

  /* Až keď je stránka hotová a prehliadač má chvíľu voľno. Návštevník
     nesmie na počítadlo čakať ani milisekundu. */
  function naplanuj() {
    if (window.requestIdleCallback) requestIdleCallback(posli, { timeout: 3000 });
    else setTimeout(posli, 1200);
  }

  if (document.readyState === 'complete') naplanuj();
  else window.addEventListener('load', naplanuj, { once: true });
})();
