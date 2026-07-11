/* Paciga — scrollytelling homepage (GSAP ScrollTrigger + Lenis, self-hosted) */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  var nav = document.getElementById('site-nav');
  var burger = document.getElementById('nav-burger');

  /* ---------- mobile menu (works with or without GSAP) ---------- */
  var lenis = null;

  function closeMenu() {
    if (!nav || !nav.classList.contains('nav-open')) return;
    nav.classList.remove('nav-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { nav.setAttribute('data-solid', '1'); if (lenis) lenis.stop(); }
      else if (lenis) lenis.start();
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  /* ---------- scene videá ----------
     Hrajú len vo viewporte (perf). Ak prehliadač blokuje autoplay
     (Firefox nastavenie), označia sa a spustia pri prvom geste užívateľa. */
  var videoDbg = window.__videoDbg = { attempts: 0, blocked: 0, lastErr: null };

  function tryPlay(v) {
    videoDbg.attempts++;
    var p = v.play();
    if (p && p.catch) p.catch(function (e) {
      videoDbg.blocked++;
      videoDbg.lastErr = e && e.name;
      v.dataset.blocked = '1';
    });
  }

  if (!reduced) {
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) tryPlay(en.target);
          else en.target.pause();
        });
      }, { rootMargin: '140px' });
      document.querySelectorAll('.scene-video').forEach(function (v) { vio.observe(v); });
    }

    /* gesto = povolenie médií: pri scrolle/kliku znova spusti zablokované videá vo viewporte */
    var unlockVideos = function () {
      document.querySelectorAll('.scene-video[data-blocked]').forEach(function (v) {
        var r = v.getBoundingClientRect();
        if (r.bottom > 0 && r.top < (window.innerHeight || 800)) {
          delete v.dataset.blocked;
          tryPlay(v);
        }
      });
    };
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, unlockVideos, { passive: true });
    });
  }

  /* ---------- fallbacks when GSAP or motion is unavailable ---------- */
  function navSolidFallback() {
    /* IntersectionObserver namiesto scroll listenera (žiadny per-frame JS) */
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:60px;left:0;width:1px;height:1px;pointer-events:none;';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !nav.classList.contains('nav-open')) nav.removeAttribute('data-solid');
      else nav.setAttribute('data-solid', '1');
    }).observe(sentinel);
  }

  if (!hasGsap || reduced) {
    if (nav) navSolidFallback();
    // show everything, count nothing
    document.querySelectorAll('[data-count]').forEach(function (el) {
      el.textContent = el.getAttribute('data-count');
    });
    var qt = document.getElementById('quote-text');
    if (qt) qt.style.opacity = '1';
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('js');

  /* ---------- preloader ---------- */
  var pre = document.createElement('div');
  pre.id = 'preloader';
  pre.innerHTML = '<img src="assets/feather.png" alt="">' +
    '<div class="pre-line"><span></span></div>' +
    '<div class="pre-label">S úctou od roku 2018</div>';
  document.body.appendChild(pre);
  gsap.to(pre.querySelector('.pre-line span'), { scaleX: 1, duration: 2.0, ease: 'power2.inOut' });

  var preDone = false;
  var preT0 = performance.now();
  function hidePreloader() {
    if (preDone) return;
    /* minimálne 1,4 s — nech sa linka stihne dokresliť a nepôsobí to ako blik */
    var left = 1400 - (performance.now() - preT0);
    if (left > 0) { setTimeout(hidePreloader, left); return; }
    preDone = true;
    gsap.to(pre, {
      opacity: 0, duration: 0.7, ease: 'power2.inOut', delay: 0.2,
      onComplete: function () { pre.remove(); }
    });
    heroTl.play(0);
    setTimeout(function () { ScrollTrigger.refresh(); }, 80);
  }
  window.addEventListener('load', function () { setTimeout(hidePreloader, 350); });
  setTimeout(hidePreloader, 3000); /* failsafe — nikdy nedržať dlhšie */

  /* ---------- Lenis smooth scroll ---------- */
  lenis = new Lenis({
    duration: 1.35,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  /* eased anchor scrolling */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = (a.getAttribute('href') || '').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      lenis.scrollTo(target, { offset: -72, duration: 1.5 });
    });
  });

  /* ---------- nav: solid + hide on scroll down ---------- */
  var lastY = 0;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: function (self) {
      var y = self.scroll();
      if (nav) {
        if (y > 60 || nav.classList.contains('nav-open')) nav.setAttribute('data-solid', '1');
        else nav.removeAttribute('data-solid');
        if (y > 500 && y > lastY + 4 && !nav.classList.contains('nav-open')) nav.classList.add('nav-hidden');
        else if (y < lastY - 4 || y <= 500) nav.classList.remove('nav-hidden');
      }
      lastY = y;
    }
  });

  /* ---------- scroll progress bar ---------- */
  gsap.to('#progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
  });

  /* ---------- hero: char split + load intro + scroll-out parallax ---------- */
  document.querySelectorAll('#hero-title .line > span').forEach(function (sp) {
    var words = sp.textContent.split(' ');
    sp.textContent = '';
    words.forEach(function (w, wi) {
      if (wi) sp.appendChild(document.createTextNode(' '));
      var wspan = document.createElement('span');
      wspan.className = 'word';
      for (var i = 0; i < w.length; i++) {
        var s = document.createElement('span');
        s.className = 'ch';
        s.textContent = w[i];
        wspan.appendChild(s);
      }
      sp.appendChild(wspan);
    });
  });

  var heroTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  heroTl
    .from('#hero-title .ch', { yPercent: 120, duration: 1.05, stagger: 0.026 }, 0)
    .from('[data-hero-el]', { opacity: 0, y: 26, duration: 1.0, stagger: 0.12 }, 0.45);

  /* ---------- posledná cesta: pinovaná jazda (frame scrub kreslí journey.js) ---------- */
  var journeyPin = document.getElementById('journey-pin');
  if (journeyPin) {
    window.__journeyProgress = 0;
    var jStations = gsap.utils.toArray('.jh-station');
    var jTexts = gsap.utils.toArray('.journey-text');
    var jTl = gsap.timeline({
      scrollTrigger: {
        trigger: journeyPin,
        start: 'top top',
        /* dlhá dráha = pomalé, dôstojné tempo jazdy */
        end: function () { return '+=' + (window.innerWidth < 701 ? 550 : 750) + '%'; },
        pin: true,
        scrub: 1.4,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          window.__journeyProgress = self.progress;
          gsap.set('#jh-fill', { height: (self.progress * 100) + '%' });
          var st = Math.min(4, Math.floor(self.progress * 5));
          for (var i = 0; i < jStations.length; i++) jStations[i].classList.toggle('on', i === st);
          for (var t = 0; t < jTexts.length; t++) {
            jTexts[t].classList.toggle('is-on', parseFloat(gsap.getProperty(jTexts[t], 'opacity')) > 0.5);
          }
        }
      },
      defaults: { ease: 'none' }
    });
    /* okná textov: každá stanica má svoje (čas 0–5 = päť klipov) */
    jTl
      .to(jTexts[0], { autoAlpha: 0, duration: 0.35 }, 0.55)
      .fromTo(jTexts[1], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.15)
      .to(jTexts[1], { autoAlpha: 0, duration: 0.3 }, 1.8)
      .fromTo(jTexts[2], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 2.15)
      .to(jTexts[2], { autoAlpha: 0, duration: 0.3 }, 2.8)
      .fromTo(jTexts[3], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 3.15)
      .to(jTexts[3], { autoAlpha: 0, duration: 0.3 }, 3.8)
      .fromTo(jTexts[4], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, 4.35)
      .to({}, { duration: 0.65 });
  }

  /* spoločná WebGL sonda pre 3D scény (limuzína, kniha) */
  var glOK = (function () {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  })();
  var bookFallback = reduced || window.innerWidth < 901 || !glOK;
  if (bookFallback) {
    document.documentElement.classList.add('book-fallback');
    var bookCss = document.getElementById('book-css');
    if (bookCss) bookCss.removeAttribute('hidden');
  }

  /* sviečky v Opustili nás — zapálenie zostáva uložené v prehliadači */
  var litKey = 'paciga-candles';
  var lit = [];
  try { lit = JSON.parse(localStorage.getItem(litKey) || '[]'); } catch (e) {}
  document.querySelectorAll('.memoriam-card').forEach(function (card) {
    var name = (card.querySelector('h3') || {}).textContent || '';
    if (lit.indexOf(name) !== -1) card.classList.add('lit');
    var btn = card.querySelector('.candle-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (card.classList.contains('lit')) return;
      card.classList.add('lit');
      if (name && lit.indexOf(name) === -1) {
        lit.push(name);
        try { localStorage.setItem(litKey, JSON.stringify(lit)); } catch (e) {}
      }
    });
  });

  /* ---------- quote: word-by-word scrub reveal ---------- */
  var quoteText = document.getElementById('quote-text');
  if (quoteText) {
    var words = quoteText.textContent.trim().split(/\s+/);
    quoteText.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    gsap.to(quoteText.querySelectorAll('.w'), {
      opacity: 1,
      stagger: 0.35,
      ease: 'none',
      scrollTrigger: { trigger: '#quote', start: 'top 72%', end: 'center 38%', scrub: 0.4 }
    });
  }

  /* ---------- generic reveals ---------- */
  gsap.utils.toArray('[data-reveal]').forEach(function (el) {
    gsap.from(el, {
      opacity: 0,
      y: 30,
      duration: 1.0,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  gsap.utils.toArray('[data-line]').forEach(function (el) {
    gsap.from(el, {
      scaleX: 0,
      duration: 1.1,
      ease: 'power3.inOut',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });

  /* ---------- counters ---------- */
  gsap.utils.toArray('[data-count]').forEach(function (el) {
    var to = parseInt(el.getAttribute('data-count'), 10) || 0;
    var obj = { v: 0 };
    gsap.to(obj, {
      v: to,
      duration: 1.6,
      ease: 'power2.out',
      snap: { v: 1 },
      onUpdate: function () { el.textContent = obj.v; },
      scrollTrigger: { trigger: el, start: 'top 86%', once: true }
    });
  });

  /* ---------- magnetické tlačidlá ---------- */
  document.querySelectorAll('.btn-gold, .nav-cta').forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var r = btn.getBoundingClientRect();
      gsap.to(btn, {
        x: (e.clientX - (r.left + r.width / 2)) * 0.18,
        y: (e.clientY - (r.top + r.height / 2)) * 0.3,
        duration: 0.4, ease: 'power2.out'
      });
    });
    btn.addEventListener('mouseleave', function () {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    });
  });

  /* ---------- desktop-only pinned scenes ---------- */
  var mm = gsap.matchMedia();

  mm.add('(min-width: 901px)', function () {

    /* POZOR: pinované triggery vytvárame v poradí dokumentu (jazda → služby → kniha),
       inak ScrollTrigger zle započíta pin spacery predchádzajúcich sekcií.
       Jazda (journey) sa vytvára už vyššie, pred matchMedia. */

    /* services: pinned horizontal scroll */
    var track = document.getElementById('services-track');
    var pin = document.getElementById('services-pin');
    if (track && pin) {
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      gsap.to(track, {
        x: function () { return -dist(); },
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: function () { return '+=' + (dist() + window.innerHeight * 0.2); },
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            gsap.set('#services-bar', { scaleX: self.progress });
          }
        }
      });
    }

    /* kniha spomienok: pin + scrub, samotné 3D kreslí book3d.js */
    var bookPin = document.getElementById('book-pin');
    if (bookPin && !bookFallback) {
      window.__bookProgress = 0;
      var caps = [
        'Keď obrad skončí, spomienka zostáva. Listujte scrollom.',
        'Spomienkové šperky s odtlačkom prsta — „Nikdy nezabudnem.“',
        'Spomienkové karty — odkaz, ktorý si rodina ponechá.',
        'Kondolencie — tichá spomienka patrí všetkým.'
      ];
      var capEl = document.getElementById('book-cap');
      var capIdx = 0;
      gsap.timeline({
        scrollTrigger: {
          trigger: bookPin,
          start: 'top top',
          end: '+=280%',
          pin: true,
          scrub: 1,
          onUpdate: function (self) {
            window.__bookProgress = self.progress;
            var idx = self.progress < 0.22 ? 0 : self.progress < 0.5 ? 1 : self.progress < 0.76 ? 2 : 3;
            if (idx !== capIdx && capEl) {
              capIdx = idx;
              gsap.to(capEl, {
                opacity: 0, duration: 0.18, onComplete: function () {
                  capEl.textContent = caps[capIdx];
                  gsap.to(capEl, { opacity: 1, duration: 0.3 });
                }
              });
            }
          }
        }
      }).to({}, { duration: 1 }); /* dĺžku drží scrub — kreslenie rieši modul */
    }

    /* 3D tilt kariet za kurzorom */
    gsap.utils.toArray('.svc, .branch-card, .memoriam-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotationY: px * 7, rotationX: -py * 7, y: -6, transformPerspective: 900, duration: 0.45, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(card, { rotationY: 0, rotationX: 0, y: 0, duration: 0.7, ease: 'power3.out', clearProps: 'transform' });
      });
    });

    /* branch card photos: subtle parallax */
    gsap.utils.toArray('[data-parallax] > span').forEach(function (ph) {
      gsap.fromTo(ph, { yPercent: -7 }, {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: ph.closest('.branch-card'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    return function () {};
  });


  /* ---------- refresh after everything (fonts, video poster) settles ---------- */
  window.addEventListener('load', function () {
    ScrollTrigger.refresh();
  });
})();
