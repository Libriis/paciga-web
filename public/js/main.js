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
    var fsFillStatic = document.getElementById('fs-beam-fill');
    if (fsFillStatic) fsFillStatic.style.width = '100%';
    document.querySelectorAll('.fs-beam-dot').forEach(function (d) { d.classList.add('on'); });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('js');

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
  var callPill = document.getElementById('callpill');
  var mqMobile = window.matchMedia('(max-width: 700px)');
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
      /* telefón vždy poruke: na mobile po hero (v nav je za burgerom),
         na desktope keď sa nav schová */
      if (callPill && nav) {
        var pillOn = mqMobile.matches ? y > 500 : nav.classList.contains('nav-hidden');
        callPill.classList.toggle('on', pillOn);
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

  /* hero intro beží hneď — stránku nedrží žiadny preloader */
  var heroTl = gsap.timeline({ delay: 0.15, defaults: { ease: 'power3.out' } });
  heroTl
    .from('#hero-title .ch', { yPercent: 120, duration: 1.05, stagger: 0.026 }, 0)
    .from('[data-hero-el]', { opacity: 0, y: 26, duration: 1.0, stagger: 0.12 }, 0.45);

  /* ---------- posledná cesta: pinovaná jazda (frame scrub kreslí journey.js) ---------- */
  var journeyPin = document.getElementById('journey-pin');
  if (journeyPin) {
    window.__journeyProgress = 0;
    var jStations = gsap.utils.toArray('.jh-station');
    var jTexts = gsap.utils.toArray('.journey-text');
    var jSkip = document.getElementById('journey-skip');
    var jTl = gsap.timeline({
      scrollTrigger: {
        trigger: journeyPin,
        start: 'top top',
        /* dlhá dráha = pomalé, dôstojné tempo jazdy (46 s materiálu) */
        end: function () { return '+=' + (window.innerWidth < 701 ? 630 : 860) + '%'; },
        pin: true,
        /* scrub krátky: dlhší (1.4) robil po zastavení scrollu ~1.5 s chvost,
           počas ktorého jazda ešte viditeľne „dochádzala" frame po frame */
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          window.__journeyProgress = self.progress;
          /* nevyhladený progress = skutočné miesto scrollu; journey.js na ňom
             stavia cieľ usadenia, ktorý sa počas dobiehania nehýbe */
          window.__journeyRawProgress = Math.min(Math.max((self.scroll() - self.start) / (self.end - self.start), 0), 1);
          /* cieľ Lenis animácie = kde scroll naozaj SKONČÍ; dojazd jazdy mieri
             rovno tam a pristane jedným pohybom, nie naháňaním dobiehajúceho scrollu */
          var destPx = (lenis && typeof lenis.targetScroll === 'number') ? lenis.targetScroll : self.scroll();
          window.__journeyDestProgress = Math.min(Math.max((destPx - self.start) / (self.end - self.start), 0), 1);
          gsap.set('#jh-fill', { height: (self.progress * 100) + '%' });
          /* hranice staníc podľa dĺžok klipov: 8+8+6+8+8+8 s */
          var bounds = [0.174, 0.478, 0.652, 0.826];
          var st = 0;
          while (st < bounds.length && self.progress >= bounds[st]) st++;
          for (var i = 0; i < jStations.length; i++) jStations[i].classList.toggle('on', i === st);
          for (var t = 0; t < jTexts.length; t++) {
            jTexts[t].classList.toggle('is-on', parseFloat(gsap.getProperty(jTexts[t], 'opacity')) > 0.5);
          }
          if (jSkip) jSkip.classList.toggle('on', self.progress > 0.01 && self.progress < 0.985);
        }
      },
      defaults: { ease: 'none' }
    });
    /* Okná textov (čas 0–1 = celý priebeh jazdy; švy klipov pri
       0.174 / 0.348 / 0.478 / 0.652 / 0.826 — klipy 8+8+6+8+8+8 s).
       Informačný oblúk: kto sme → čo robiť + telefón → limuzína
       → rozsah služieb → spomienkové šperky → kde sme + kontakt.
       Jednotný rytmus: po šve krátky nádych len s obrazom, text nabehne
       fadom s miernym zdvihom, drží väčšinu scény a odchádza tesne pred
       ďalším švom. Naraz je na obrazovke vždy len jeden text. */
    var jtFade = 0.038;
    var jtLift = 0.046;
    function jtIn(el, at, dur) {
      jTl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur || jtFade }, at)
         .fromTo(el.children, { y: 34 }, { y: 0, duration: jtLift, ease: 'power2.out', stagger: 0.006 }, at);
    }
    function jtOut(el, at, dur) {
      jTl.to(el, { autoAlpha: 0, duration: dur || jtFade }, at)
         .to(el.children, { y: -30, duration: jtLift, ease: 'power2.in', stagger: 0.004 }, at);
    }
    /* hero drží celú scénu hmly a odíde pred švom prvého klipu */
    jTl.to(jTexts[0], { autoAlpha: 0, duration: 0.05 }, 0.112)
       .to(jTexts[0].children, { y: -34, duration: 0.05, ease: 'power1.in' }, 0.112);
    jtIn(jTexts[1], 0.180); jtOut(jTexts[1], 0.304);  /* sprievod */
    jtIn(jTexts[2], 0.354); jtOut(jTexts[2], 0.444);  /* limuzína */
    jtIn(jTexts[3], 0.494); jtOut(jTexts[3], 0.610);  /* starostlivosť */
    jtIn(jTexts[4], 0.660); jtOut(jTexts[4], 0.784);  /* šperky */
    jtIn(jTexts[5], 0.834, 0.052);                    /* záver: kraj + CTA, zostáva */
    jTl.to({}, { duration: 0.114 }, 0.886);           /* dotiahnutie osi na 1.0 */

    /* klikateľné stanice: prelet jazdy na začiatok kapitoly */
    var stationProg = [0.02, 0.20, 0.50, 0.68, 0.85];
    jStations.forEach(function (b) {
      b.addEventListener('click', function () {
        var st = jTl.scrollTrigger;
        if (!st) return;
        var i = parseInt(b.getAttribute('data-station'), 10) || 0;
        lenis.scrollTo(st.start + stationProg[i] * (st.end - st.start), { duration: 1.6 });
      });
    });
    if (jSkip) {
      jSkip.addEventListener('click', function () {
        var st = jTl.scrollTrigger;
        if (!st) return;
        lenis.scrollTo(st.end + 4, { duration: 1.4 });
      });
    }
  }

  /* sviečky (karty aj parte hero) rieši js/candles.js — počíta ich server */

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

  /* ---------- text reveal: hlavné nadpisy a leady po slovách ----------
     Štýl 21st.dev cnippet text-reveal (preset fade-in-blur, per word):
     slová nabiehajú so zdvihom, rozostrením a staggerom 50 ms.
     React verzia komponentu žije v src/components/ui/text-reveal.tsx
     (pre ostrovy); tu beží ekvivalent cez GSAP bez hydratácie. */
  function splitRevealWords(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    var spans = [];
    nodes.forEach(function (node) {
      if (!/\S/.test(node.nodeValue)) return;
      var frag = document.createDocumentFragment();
      /* nbsp ( ) nerozdeľuje — nezalomiteľné dvojice ostávajú v jednom slove */
      node.nodeValue.split(/([^\S\u00A0]+)/).forEach(function (part) {
        if (!part) return;
        if (/^[^\S\u00A0]+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.className = 'tr-w';
        s.textContent = part;
        frag.appendChild(s);
        spans.push(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return spans;
  }

  gsap.utils.toArray('[data-textreveal]').forEach(function (el) {
    var words = splitRevealWords(el);
    if (!words.length) return;
    gsap.from(words, {
      opacity: 0,
      y: 18,
      filter: 'blur(12px)',
      duration: 0.4,
      ease: 'power2.out',
      stagger: 0.05,
      clearProps: 'filter,transform,opacity',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* ---------- tracing beam: Čo spraviť ako prvé ---------- */
  var fsFill = document.getElementById('fs-beam-fill');
  if (fsFill) {
    var fsDots = gsap.utils.toArray('.fs-beam-dot');
    gsap.to(fsFill, {
      width: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.firststeps ol',
        start: 'top 85%',
        end: 'top 35%',
        scrub: 0.4,
        onUpdate: function (self) {
          fsDots.forEach(function (d) {
            d.classList.toggle('on', self.progress * 100 >= parseFloat(d.style.left));
          });
        }
      }
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

    /* branch card photos + album bands (o nás): subtle parallax */
    gsap.utils.toArray('[data-parallax] > span').forEach(function (ph) {
      gsap.fromTo(ph, { yPercent: -7 }, {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: ph.closest('.branch-card, .album-band'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    return function () {};
  });


  /* ---------- refresh after everything (fonts, video poster) settles ---------- */
  window.addEventListener('load', function () {
    ScrollTrigger.refresh();
  });
})();
