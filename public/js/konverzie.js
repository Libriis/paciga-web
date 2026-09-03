/* Paciga — konverzie pre Google Tag Manager (GTM-K6GK3MN5).
   Web len pushuje udalosti do window.dataLayer. Či a kam odídu, riadi
   GTM kontajner marketéra a súhlas s cookies (Base.astro): bez súhlasu sa
   gtm.js nenačíta a dataLayer ostáva len polom v pamäti prehliadača.

   Udalosti (názov = trigger „Custom Event" v GTM), detaily v GTM-UDALOSTI.md:
     telefon_klik          klik na odkaz tel:            cislo, miesto
     email_klik            klik na odkaz mailto:         miesto
     zdielanie_klik        zdieľanie parte alebo článku  kanal
     dopyt_odoslany        kontaktný formulár prešiel    (forms.js)
     kondolencia_odoslana  kondolencia prešla            slug (forms.js)
     sviecka_zapalena      server sviečku zarátal        slug (candles.js)
   Každá nesie aj stranka = cesta bez query a hashu. */
(function () {
  'use strict';

  /* Administrácia sa nemeria. Vlastná práca nie je konverzia. */
  if (location.pathname.indexOf('/admin') === 0) return;

  var dl = window.dataLayer = window.dataLayer || [];

  function udalost(nazov, data) {
    var z = { event: nazov, stranka: location.pathname };
    if (data) {
      for (var k in data) {
        if (data[k] !== undefined && data[k] !== null && data[k] !== '') z[k] = data[k];
      }
    }
    dl.push(z);
  }
  /* forms.js a candles.js hlásia úspech cez tento helper */
  window.pgUdalost = udalost;

  /* Kde na stránke návštevník klikol: id, inak prvá trieda odkazu.
     Triedy sú stabilné (nav-cta, callpill, footer-phone, branch-tel, ...). */
  function miesto(el) {
    if (el.id) return el.id;
    var t = el.getAttribute('class') || '';
    return t.split(/\s+/)[0] || 'odkaz';
  }

  /* Jedno delegované počúvanie na celý dokument. Capture fáza, aby klik
     zachytil aj vtedy, keď iný skript zastaví bublanie. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var el = t.closest('a[href], button');
    if (!el) return;
    var href = el.getAttribute('href') || '';

    /* Zdieľanie (Zdielanie.astro): tlačidlá aj odkazy majú triedu zd-btn */
    if (el.classList.contains('zd-btn')) {
      var kanal = 'odkaz';
      if (el.classList.contains('zd-share')) kanal = 'systemova-ponuka';
      else if (el.classList.contains('zd-copy')) kanal = 'kopirovanie';
      else if (el.classList.contains('zd-sms')) kanal = 'sms';
      else if (href.indexOf('mailto:') === 0) kanal = 'email';
      else if (/facebook\.com/.test(href)) kanal = 'facebook';
      else if (/wa\.me|whatsapp/.test(href)) kanal = 'whatsapp';
      udalost('zdielanie_klik', { kanal: kanal });
      return;
    }

    if (href.indexOf('tel:') === 0) {
      udalost('telefon_klik', {
        cislo: href.slice(4).replace(/[^\d+]/g, ''),
        miesto: miesto(el)
      });
      return;
    }

    if (href.indexOf('mailto:') === 0) {
      udalost('email_klik', { miesto: miesto(el) });
    }
  }, true);
})();
