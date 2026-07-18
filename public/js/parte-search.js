/* ============================================================
   Vyhľadávanie v zozname spomienok (Opustili nás)
   Filtruje karty podľa mena. Diakritika ani veľkosť písmen
   nehrajú rolu, takže „kicakova" nájde „Kičáková".
   Beží celé na klientovi nad už vykresleným zoznamom.
   ============================================================ */
(function () {
  var wrap = document.getElementById('parte-search');
  var grid = document.getElementById('parte-list');
  if (!wrap || !grid) return;

  var input = wrap.querySelector('input[type="search"]');
  var clearBtn = wrap.querySelector('.ps-clear');
  var count = document.getElementById('parte-count');
  var empty = document.getElementById('parte-empty');
  if (!input) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.memoriam-card'));
  var months = Array.prototype.slice.call(grid.querySelectorAll('.memoriam-month'));
  if (!cards.length) return;

  function norm(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp('[\u0300-\u036f]', 'g'), '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  cards.forEach(function (c) {
    c.setAttribute('data-key', norm(c.getAttribute('data-meno')));
  });

  function plural(n) {
    if (n === 0) return 'nič sme nenašli';
    if (n === 1) return '1 spomienka';
    if (n >= 2 && n <= 4) return n + ' spomienky';
    return n + ' spomienok';
  }

  /* Karty sa odkrývajú animáciou pri scrollovaní. Pri filtrovaní by
     mohla zostať niektorá karta neviditeľná, tak odkrývanie po prvom
     hľadaní vypneme a všetko zobrazíme naplno. */
  var revealsOff = false;
  function stopReveals() {
    if (revealsOff) return;
    revealsOff = true;
    if (!window.gsap) return;
    if (window.ScrollTrigger) {
      window.ScrollTrigger.getAll().forEach(function (st) {
        if (cards.indexOf(st.trigger) !== -1) st.kill();
      });
    }
    window.gsap.set(cards, { clearProps: 'opacity,transform' });
  }

  function apply() {
    var q = norm(input.value);
    wrap.classList.toggle('has-query', q.length > 0);

    var shown = 0;
    cards.forEach(function (c) {
      var hit = !q || c.getAttribute('data-key').indexOf(q) !== -1;
      c.hidden = !hit;
      if (hit) shown++;
    });

    /* nadpis mesiaca aj jeho mriežku skryjeme, keď v nej nič nezostalo */
    months.forEach(function (m) {
      var g = m.nextElementSibling;
      if (!g || !g.classList.contains('memoriam-grid')) return;
      var any = Array.prototype.some.call(
        g.querySelectorAll('.memoriam-card'),
        function (c) { return !c.hidden; }
      );
      m.hidden = !any;
      g.hidden = !any;
    });

    if (empty) empty.hidden = shown !== 0;
    if (count) count.textContent = q ? plural(shown) : '';
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  var timer;
  input.addEventListener('input', function () {
    stopReveals();
    clearTimeout(timer);
    timer = setTimeout(apply, 120);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      input.value = '';
      apply();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      input.value = '';
      apply();
      input.focus();
    });
  }

  /* pole má v HTML atribút hidden, ukážeme ho až keď skript beží */
  wrap.hidden = false;
})();
