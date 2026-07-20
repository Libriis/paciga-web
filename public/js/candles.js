/* Paciga — sviečky: zapálenie sa počíta na serveri (/api/sviecka),
   stav „moja sviečka horí" zostáva v prehliadači. Beží aj bez GSAP
   a pri prefers-reduced-motion. */
(function () {
  'use strict';

  var KEY = 'paciga-candles-v2';
  var lit = [];
  try { lit = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(lit)); } catch (e) {} }

  function svieckyText(n) {
    if (n === 1) return '1 zapálená sviečka';
    if (n >= 2 && n <= 4) return n + ' zapálené sviečky';
    return n + ' zapálených sviečok';
  }

  function light(slug, onCount) {
    if (lit.indexOf(slug) === -1) { lit.push(slug); save(); }
    fetch('/api/sviecka', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && typeof d.sviecky === 'number' && onCount) onCount(d.sviecky); })
      .catch(function () {});
  }

  /* karty v Opustili nás (homepage + zoznam) */
  document.querySelectorAll('.memoriam-card[data-slug]').forEach(function (card) {
    var slug = card.getAttribute('data-slug');
    if (lit.indexOf(slug) !== -1) card.classList.add('lit');
    var btn = card.querySelector('.candle-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (card.classList.contains('lit')) return;
      card.classList.add('lit');
      light(slug, function (n) {
        var cnt = card.querySelector('.candle-count');
        if (cnt) cnt.textContent = ' · ' + n;
        /* V2 svetlo sviečky: kartu zahrej podľa nového počtu */
        card.classList.add('warm');
        card.classList.toggle('heat2', n >= 3 && n < 10);
        card.classList.toggle('heat3', n >= 10);
      });
    });
  });

  /* veľká sviečka na parte */
  var phero = document.querySelector('.phero[data-slug]');
  if (phero) {
    var slug = phero.getAttribute('data-slug');
    var btn = document.getElementById('phero-light');
    if (lit.indexOf(slug) !== -1) {
      phero.classList.add('lit');
      if (btn) btn.setAttribute('aria-pressed', 'true');
    }
    if (btn) {
      btn.addEventListener('click', function () {
        if (phero.classList.contains('lit')) return;
        phero.classList.add('lit');
        btn.setAttribute('aria-pressed', 'true');
        light(slug, function (n) {
          var cnt = document.querySelector('.phero-count');
          if (cnt) cnt.textContent = svieckyText(n);
        });
      });
    }
  }
})();
