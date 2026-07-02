/* Paciga — homepage (implementované z Paciga.dc.html, Claude Design) */
(function () {
  'use strict';

  var root = document.getElementById('paci');
  if (!root) return;
  root.classList.add('js');

  var easeOut = function (p) { return 1 - Math.pow(1 - p, 3); };

  function tween(dur, onFrame, onDone) {
    var t0 = performance.now();
    (function step() {
      var p = Math.min((performance.now() - t0) / dur, 1);
      onFrame(p);
      if (p < 1) requestAnimationFrame(step);
      else if (onDone) onDone();
    })();
  }

  /* ---- counters ---- */
  function runCount(el) {
    var to = parseInt(el.getAttribute('data-count'), 10) || 0;
    tween(1300, function (p) { el.textContent = Math.round(easeOut(p) * to); }, function () { el.textContent = to; });
  }

  /* ---- scroll reveal ---- */
  function reveal(el, extraDelay) {
    if (el.dataset.revealed) return;
    el.dataset.revealed = '1';
    var delay = parseInt(el.getAttribute('data-delay'), 10);
    if (isNaN(delay)) delay = extraDelay || 0;
    if (delay > 0) setTimeout(function () { el.classList.add('revealed'); }, delay);
    else el.classList.add('revealed');
  }

  /* ---- scroll handler: nav, progress, parallax, reveals ---- */
  var mx = 0, mxT = 0;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var vh = window.innerHeight || 800;

    var nav = document.getElementById('site-nav');
    if (nav) {
      // solid when scrolled, when the menu is open, or when links wrapped to a second row
      if (y > 60 || nav.classList.contains('nav-open') || nav.offsetHeight > 84) nav.setAttribute('data-solid', '1');
      else nav.removeAttribute('data-solid');
    }

    var heroMedia = document.getElementById('hero-media');
    if (heroMedia && y < vh * 1.2) {
      heroMedia.style.transform = 'translate(' + mx.toFixed(2) + 'px, ' + (y * 0.24) + 'px)';
    }

    var limoMedia = document.getElementById('limo-media');
    if (limoMedia) {
      var rect = limoMedia.parentElement.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < vh) {
        limoMedia.style.transform = 'translateY(' + ((rect.top - vh) * -0.05) + 'px)';
      }
    }

    var progress = document.getElementById('progress');
    if (progress) {
      var h = document.documentElement.scrollHeight - vh;
      progress.style.width = (h > 0 ? Math.min((y / h) * 100, 100) : 0) + '%';
    }

    var reveals = root.querySelectorAll('[data-reveal]');
    var batch = [];
    for (var i = 0; i < reveals.length; i++) {
      var el = reveals[i];
      if (el.dataset.revealed) continue;
      if (el.getBoundingClientRect().top < vh * 0.88) batch.push(el);
    }
    for (var b = 0; b < batch.length; b++) {
      reveal(batch[b], Math.min(b, 5) * 110);
    }

    var counters = root.querySelectorAll('[data-count]');
    for (var j = 0; j < counters.length; j++) {
      var c = counters[j];
      if (c.dataset.counted) continue;
      if (c.getBoundingClientRect().top < vh * 0.85) { c.dataset.counted = '1'; runCount(c); }
    }

    var lines = root.querySelectorAll('[data-line]');
    for (var k = 0; k < lines.length; k++) {
      var ln = lines[k];
      if (ln.dataset.lined) continue;
      if (ln.getBoundingClientRect().top < vh * 0.9) {
        ln.dataset.lined = '1';
        (function (elLine) { setTimeout(function () { elLine.classList.add('drawn'); }, 250); })(ln);
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
  requestAnimationFrame(onScroll);
  setTimeout(onScroll, 200);
  setTimeout(onScroll, 700);

  /* failsafe: never leave in-view content hidden */
  setTimeout(function () {
    var vh = window.innerHeight || 800;
    root.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (!el.dataset.revealed && el.getBoundingClientRect().top < vh) reveal(el, 0);
    });
  }, 1500);

  /* ---- mouse drift on hero ---- */
  window.addEventListener('mousemove', function (e) {
    mxT = ((e.clientX / (window.innerWidth || 1)) - 0.5) * 18;
  }, { passive: true });

  (function drift() {
    mx += (mxT - mx) * 0.05;
    var y = window.scrollY || 0;
    var vh = window.innerHeight || 800;
    if (y < vh) {
      var hi = document.getElementById('hero-media');
      if (hi) hi.style.transform = 'translate(' + mx.toFixed(2) + 'px, ' + (y * 0.24) + 'px)';
    }
    requestAnimationFrame(drift);
  })();

  /* ---- smooth eased anchor scrolling ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = (a.getAttribute('href') || '').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      var from = window.scrollY || 0;
      var to = target.getBoundingClientRect().top + from - 84;
      tween(950, function (p) {
        var ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        window.scrollTo(0, from + (to - from) * ease);
      });
    });
  });

  /* ---- branch switcher ---- */
  var BRANCHES = {
    poprad: { city: 'Poprad', addr: 'Francisciho 3288/35, 058 01 Poprad', tel: '0903 596 364', hours: 'NON STOP prevoz zosnulých · 24/7' },
    bela: { city: 'Spišská Belá', addr: 'Letná 17, 059 01 Spišská Belá', tel: '0948 110 109', hours: 'Sídlo firmy · NON STOP prevoz 24/7' },
    lm: { city: 'Liptovský Mikuláš', addr: 'Ester Šimerovej Martinčekovej 4506/4, 031 01 Liptovský Mikuláš', tel: '0903 596 364', hours: 'NON STOP prevoz zosnulých · 24/7' }
  };
  var currentBranch = 'poprad';

  function setBranch(key) {
    if (key === currentBranch || !BRANCHES[key]) return;
    currentBranch = key;
    var b = BRANCHES[key];

    document.querySelectorAll('.branch-tab').forEach(function (t) {
      var active = t.getAttribute('data-branch') === key;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    document.getElementById('branch-city').textContent = b.city;
    document.getElementById('branch-addr').textContent = b.addr;
    var tel = document.getElementById('branch-tel');
    tel.textContent = b.tel;
    tel.setAttribute('href', 'tel:' + b.tel.replace(/\s+/g, ''));
    document.getElementById('branch-hours').textContent = b.hours;

    var frame = document.getElementById('branch-map-frame');
    if (frame) frame.src = 'https://www.google.com/maps?q=' + encodeURIComponent(b.addr) + '&output=embed&hl=sk';

    var panel = document.getElementById('branch-info');
    if (panel) {
      tween(480, function (p) {
        var e = easeOut(p);
        panel.style.opacity = String(0.15 + 0.85 * e);
        panel.style.transform = 'translateY(' + (12 * (1 - e)) + 'px)';
      }, function () {
        panel.style.opacity = '1';
        panel.style.transform = 'none';
      });
    }
  }

  document.querySelectorAll('.branch-tab').forEach(function (btn) {
    btn.addEventListener('click', function () { setBranch(btn.getAttribute('data-branch')); });
  });

  /* ---- mobile menu ---- */
  var navEl = document.getElementById('site-nav');
  var burger = document.getElementById('nav-burger');

  function closeMenu() {
    if (!navEl || !navEl.classList.contains('nav-open')) return;
    navEl.classList.remove('nav-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    onScroll();
  }

  if (burger && navEl) {
    burger.addEventListener('click', function () {
      var open = navEl.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) navEl.setAttribute('data-solid', '1');
      else onScroll();
    });
    navEl.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }
})();
