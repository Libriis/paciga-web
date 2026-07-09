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

  /* ---------- hero video: keep playing, politely ---------- */
  var heroVideo = document.getElementById('hero-video');
  if (heroVideo) {
    if (reduced) {
      heroVideo.removeAttribute('autoplay');
      heroVideo.pause();
    } else {
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () { /* poster stays — fine */ });
    }
  }

  /* ---------- fallbacks when GSAP or motion is unavailable ---------- */
  function navSolidFallback() {
    var onScroll = function () {
      var y = window.scrollY || 0;
      if (y > 60 || (nav && nav.classList.contains('nav-open'))) nav.setAttribute('data-solid', '1');
      else nav.removeAttribute('data-solid');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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

  /* ---------- Lenis smooth scroll ---------- */
  lenis = new Lenis({
    duration: 1.15,
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

  /* ---------- hero: load intro + scroll-out parallax ---------- */
  var heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTl
    .from('#hero-title .line > span', { yPercent: 115, duration: 1.25, stagger: 0.12 }, 0.15)
    .from('[data-hero-el]', { opacity: 0, y: 26, duration: 1.0, stagger: 0.12 }, 0.5)
    .from('#scroll-hint', { opacity: 0, duration: 1.2 }, 1.1);

  gsap.timeline({
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
  })
    .to('#hero-media', { yPercent: 14, scale: 1.08, ease: 'none' }, 0)
    .to('#hero-content', { yPercent: -18, opacity: 0.1, ease: 'none' }, 0)
    .to('#scroll-hint', { opacity: 0, ease: 'none' }, 0);

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

  /* ---------- desktop-only pinned scenes ---------- */
  var mm = gsap.matchMedia();

  mm.add('(min-width: 901px)', function () {

    /* services: pinned horizontal scroll */
    var track = document.getElementById('services-track');
    var pin = document.getElementById('services-pin');
    if (track && pin) {
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var horiz = gsap.to(track, {
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

    /* fleet: clip-path window opens to full bleed */
    var fleetPin = document.getElementById('fleet-pin');
    if (fleetPin) {
      gsap.timeline({
        scrollTrigger: {
          trigger: fleetPin,
          start: 'top top',
          end: '+=120%',
          pin: true,
          scrub: 1
        }
      })
        .fromTo('#fleet-media',
          { clipPath: 'inset(18% 26% 18% 26% round 22px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 0.6 }, 0)
        .fromTo('#fleet-media img', { scale: 1.18 }, { scale: 1, ease: 'none', duration: 1 }, 0)
        .from('#fleet-content', { opacity: 0, y: 50, duration: 0.35, ease: 'power2.out' }, 0.55);
    }

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

  /* fleet on mobile: simple reveal instead of pin */
  mm.add('(max-width: 900px)', function () {
    gsap.from('#fleet-content', {
      opacity: 0,
      y: 36,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: '#fleet-pin', start: 'top 70%', once: true }
    });
    return function () {};
  });

  /* ---------- refresh after everything (fonts, video poster) settles ---------- */
  window.addEventListener('load', function () {
    ScrollTrigger.refresh();
  });
})();
