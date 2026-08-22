/* Paciga — scrollytelling homepage (GSAP ScrollTrigger + Lenis, self-hosted) */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  var nav = document.getElementById('site-nav');
  var burger = document.getElementById('nav-burger');

  /* ---------- nekonečné animácie len v okne ----------
     Audit 22. 8. 2026: homepage má 22 prvkov s animation-iteration-count
     infinite (orby, iskry a plameň sviečok, vlna log partnerov, shimmer
     čísla). Bežali aj keď boli ďaleko mimo okna, a na telefóne to znamená
     prekresľovanie a batériu za nič. Trieda .anim-off ich pozastaví
     (animation-play-state: paused v styles.css) a IO ju sníma podľa toho,
     či je prvok aspoň 200 px od okna. Prvky v hlavičke a pill sú fixné
     a vždy v okne, tých sa to netýka. */
  if ('IntersectionObserver' in window) {
    var animEls = [];
    document.querySelectorAll('.orb, .spark, .flame, .pcloud-item, .phone-primary, .kron-dot, .rev-col').forEach(function (el) { animEls.push(el); });
    if (animEls.length) {
      var aio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.classList.toggle('anim-off', !e.isIntersecting); });
      }, { rootMargin: '200px 0px' });
      animEls.forEach(function (el) { el.classList.add('anim-off'); aio.observe(el); });
    }
  }

  /* ---------- odložené postery a zdroje videí (beží aj bez GSAP) ----------
     Videá v kartách pobočiek majú preload="none", ale poster sa sťahoval
     hneď. Boli to tri fotky pod ohybom, spolu vyše 1 MB, ktoré štartovali
     v tej istej sekunde ako styles.css a font. Na Slow 4G tým dusili
     kritickú cestu: 37 kB CSS sa ťahalo 2,5 s a FCP čakal na jeho koniec.
     Poster preto visí na data-poster a nasadí sa až keď sa karta blíži.

     Od 22. 8. 2026 to isté platí pre samotné video. Merané na iPhone
     a Fast 4G: tri klipy miest ťahali 934 kB na karte vysokej 210 px pod
     ohybom. Poster povie to isté za nulu navyše. Zdroj preto visí na
     data-src a nasadzuje sa len tam, kde má zmysel: široký displej,
     bez šetrenia dát, bez prefers-reduced-motion. Na mobile ostane
     v karte poster a video sa nestiahne vôbec. */
  var chceVidea = (function () {
    if (reduced) return false;
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
    if (c.saveData) return false;
    if (/2g/.test(c.effectiveType || '')) return false;
    return !!(window.matchMedia && window.matchMedia('(min-width: 900px)').matches);
  })();

  var posterEls = document.querySelectorAll('video[data-poster], video[data-src]');
  if (posterEls.length) {
    var nasadZdroje = function (v) {
      if (v.dataset.poster) { v.poster = v.dataset.poster; delete v.dataset.poster; }
      /* Bez data-src sa nič nemení: video, ktoré má src priamo v HTML,
         sa správa ako predtým. */
      if (chceVidea && v.dataset.src) { v.src = v.dataset.src; delete v.dataset.src; }
    };
    if ('IntersectionObserver' in window) {
      var po = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { nasadZdroje(e.target); po.unobserve(e.target); }
        });
      }, { rootMargin: '400px 0px' });
      posterEls.forEach(function (v) { po.observe(v); });
    } else {
      posterEls.forEach(nasadZdroje);
    }
  }

  /* ---------- mobile menu (works with or without GSAP) ---------- */
  var lenis = null;

  /* Zámok scrollu pod otvoreným menu.
     lenis.stop() na dotyku nestačí: Lenis má syncTouch vypnutý, takže prsty
     hýbu natívnym scrollom, ktorý o Lenis nevie. Body ide do position: fixed
     s odloženým offsetom (CSS trieda .nav-locked na <html>) a pri zavretí sa
     pozícia vráti presne — layout je rovnaký, ScrollTrigger nič neprepočítava. */
  var lockedY = 0;

  function lockScroll() {
    if (document.documentElement.classList.contains('nav-locked')) return;
    lockedY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = -lockedY + 'px';
    document.documentElement.classList.add('nav-locked');
  }

  function unlockScroll() {
    if (!document.documentElement.classList.contains('nav-locked')) return;
    document.documentElement.classList.remove('nav-locked');
    document.body.style.top = '';
    window.scrollTo(0, lockedY);
  }

  function closeMenu() {
    if (!nav || !nav.classList.contains('nav-open')) return;
    nav.classList.remove('nav-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    unlockScroll();
    if (lenis) lenis.start();
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        nav.setAttribute('data-solid', '1');
        lockScroll();
        if (lenis) lenis.stop();
      } else {
        unlockScroll();
        if (lenis) lenis.start();
      }
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    /* Escape zatvára menu aj na tabletoch s klávesnicou. */
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------- mega menu: Pohrebné služby ----------
     Desktop hover s odkladom zavretia: kurzor cestou z odkazu do pásu
     opúšťa .nav-item (spodný padding lišty nie je jeho súčasťou), takže
     okamžité zavretie by pás zhodilo. 180 ms cestu prežije. Klávesnica
     ide mimo JS cez :focus-within v CSS. */
  var megaItem = document.getElementById('nav-sluzby');
  if (megaItem && nav) {
    var megaLink = document.getElementById('nav-sluzby-link');
    var megaTimer = null;
    /* 1201, nie 901: drawer s burgerom ide do 1200 px (styles.css, lišta sa
       pod tým lámala na dva riadky). Hover pás má zmysel len tam, kde je
       vodorovná lišta, inak by sa otváral nad zavretým drawerom. */
    var megaMq = window.matchMedia('(hover: hover) and (min-width: 1201px)');

    var megaOpen = function () {
      if (!megaMq.matches) return;
      if (megaTimer) { clearTimeout(megaTimer); megaTimer = null; }
      nav.classList.add('mega-open');
      if (megaLink) megaLink.setAttribute('aria-expanded', 'true');
    };
    var megaClose = function (hned) {
      if (megaTimer) { clearTimeout(megaTimer); megaTimer = null; }
      var run = function () {
        nav.classList.remove('mega-open');
        if (megaLink) megaLink.setAttribute('aria-expanded', 'false');
      };
      if (hned) run(); else megaTimer = setTimeout(run, 180);
    };

    megaItem.addEventListener('mouseenter', megaOpen);
    megaItem.addEventListener('mouseleave', function () { megaClose(false); });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') megaClose(true);
    });
    /* klik na odkaz v páse zavrie pás hneď, nech pri kotvách nevisí nad obsahom */
    megaItem.querySelectorAll('.megamenu a').forEach(function (a) {
      a.addEventListener('click', function () { megaClose(true); });
    });

    /* mobil: rozbaľovací zoznam skupín v draweri */
    var subToggle = document.getElementById('nav-sub-toggle');
    if (subToggle) {
      subToggle.addEventListener('click', function () {
        var open = megaItem.classList.toggle('sub-open');
        subToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
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

  /* chceVidea je false na mobile a pri šetrení dát — tam sa zdroj vôbec
     nenasadil, takže nie je čo prehrávať a celý pozorovateľ je zbytočný. */
  if (!reduced && chceVidea) {
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          /* Video ešte nemusí mať zdroj: poster sa nasadzuje pri 400 px,
             prehrávanie sa spúšťa až pri 140 px, ale poradie nie je isté. */
          if (!en.target.currentSrc && !en.target.src) return;
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
      /* fmtCount je deklarácia funkcie nižšie v tom istom IIFE, hoisting ju
         sprístupní aj tu — bez toho by tisíce ostali bez medzery (3000). */
      el.textContent = fmtCount(parseInt(el.getAttribute('data-count'), 10) || 0);
    });
    var qt = document.getElementById('quote-text');
    if (qt) qt.style.opacity = '1';
    var fsFillStatic = document.getElementById('fs-beam-fill');
    if (fsFillStatic) fsFillStatic.style.width = '100%';
    document.querySelectorAll('.fs-beam-dot').forEach(function (d) { d.classList.add('on'); });
    var kronFillStatic = document.getElementById('kron-fill');
    if (kronFillStatic) kronFillStatic.style.height = '100%';
    document.querySelectorAll('.kron-dot').forEach(function (d) { d.classList.add('on'); });
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
      /* -90 = výška lišty (82) s rezervou; rovnaká hodnota ako scroll-margin-top
         v CSS, aby skok cez JS a natívny skok cez hash skončili rovnako */
      lenis.scrollTo(target, { offset: -90, duration: 1.5 });
    });
  });

  /* ---------- nav: solid + hide on scroll down ---------- */
  var lastY = 0;
  var callPill = document.getElementById('callpill');
  var mqMobile = window.matchMedia('(max-width: 700px)');
  /* Je na obrazovke telefón, ktorý si vie užívateľ ťuknúť priamo?
     Pill je fixný vpravo dole a na mobile prekrýval koniec stránky: v pätičke
     riadok s IČO, na službách a v informáciách presne vlastnú CTA s číslom.
     Keď je na obrazovke skutočný tel: odkaz, pill je zbytočný a len zavadzia.
     Sledujeme každý tel: odkaz mimo lišty a mimo samotného pillu — nové sekcie
     tak netreba nikde dopisovať. */
  var telVisible = 0;
  if ('IntersectionObserver' in window) {
    var telIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var was = en.target.dataset.telSeen === '1';
        if (en.isIntersecting && !was) { telVisible++; en.target.dataset.telSeen = '1'; }
        else if (!en.isIntersecting && was) { telVisible--; delete en.target.dataset.telSeen; }
      });
      syncCallPill();
    }, { threshold: 0.4 });
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      if (a === callPill || (nav && nav.contains(a))) return;
      telIo.observe(a);
    });
  }

  /* telefón vždy poruke: na mobile po hero (v nav je za burgerom),
     na desktope keď sa nav schová. */
  function syncCallPill() {
    if (!callPill || !nav) return;
    var pillOn = mqMobile.matches ? lastY > 500 : nav.classList.contains('nav-hidden');
    if (pillOn && telVisible > 0) pillOn = false;
    callPill.classList.toggle('on', pillOn);
  }

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: function (self) {
      var y = self.scroll();
      if (nav) {
        /* menu sa uz neskryva pri scrolle a pozadie je solid v CSS zaklade;
           data-solid ostava pre pripadne buduce odlisenie stavu po scrolle */
        if (y > 60 || nav.classList.contains('nav-open')) nav.setAttribute('data-solid', '1');
        else nav.removeAttribute('data-solid');
      }
      lastY = y;
      syncCallPill();
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
    /* .hero-lead je LCP element. Fade cezeň Chrome nepočíta ako vykreslenie,
       takže si intro drží LCP až kým animácia nedobehne. Preto len posun, bez
       opacity. Eyebrow a akcie fadeujú ďalej, časy držia pôvodný stagger 0.12. */
    .from('.eyebrow[data-hero-el]', { opacity: 0, y: 26, duration: 1.0 }, 0.45)
    .from('.hero-lead[data-hero-el]', { y: 26, duration: 1.0 }, 0.57)
    .from('.hero-actions[data-hero-el]', { opacity: 0, y: 26, duration: 1.0 }, 0.69);

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

  /* ---------- kronika: plniaca sa os ----------
     Zrkadlo tracing beamu vyššie, len zvislo. Uzol sa rozsvieti, keď ho
     čelo osi prejde; porovnáva sa v pixeloch, lebo riadky nie sú rovnako
     vysoké a percentá by uzly rozsvecovali skôr, než k nim os dorazí. */
  var kronFill = document.getElementById('kron-fill');
  if (kronFill) {
    var kronRail = kronFill.parentNode;
    var kronDots = gsap.utils.toArray('.kron-dot');
    gsap.to(kronFill, {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.kron',
        start: 'top 72%',
        end: 'bottom 72%',
        scrub: 0.4,
        onUpdate: function (self) {
          var railTop = kronRail.getBoundingClientRect().top;
          var head = railTop + kronRail.offsetHeight * self.progress;
          kronDots.forEach(function (d) {
            var r = d.getBoundingClientRect();
            d.classList.toggle('on', head >= r.top + r.height / 2);
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

  /* ---------- counters ----------
     Tisíce oddelené pevnou medzerou (3 000, slovenská norma). Číslo pri
     dobiehaní doznieva z rozostrenia — pôsobí to ako pohybová stopa, nie
     ako preblikávanie číslic. Štart skôr (top 95%), aby sa počítadlo
     rozbehlo hneď, ako riadok vojde do obrazu. */
  function fmtCount(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  gsap.utils.toArray('[data-count]').forEach(function (el) {
    var to = parseInt(el.getAttribute('data-count'), 10) || 0;
    var obj = { v: 0 };
    var trigger = { trigger: el, start: 'top 95%', once: true };
    gsap.to(obj, {
      v: to,
      duration: 1.25,
      ease: 'power2.out',
      snap: { v: 1 },
      onUpdate: function () { el.textContent = fmtCount(obj.v); },
      scrollTrigger: trigger
    });
    gsap.fromTo(el,
      { filter: 'blur(5px)', opacity: 0.6 },
      { filter: 'blur(0px)', opacity: 1, duration: 1.2, ease: 'power2.out', scrollTrigger: trigger }
    );
  });

  /* ---------- čísla: tichý pás ----------
     Vodorovná linka sa kreslí zľava, zvislé delidlá rastú zhora (škáluje ich
     --divh na kontejneri, ::before sa z GSAP osloviť nedá) a stĺpce dobiehajú
     staggerom. Posuny sú zámerne malé: sekcia má byť pokojná, nie efektná. */
  var statStrip = document.querySelector('[data-statstrip]');
  if (statStrip) {
    gsap.timeline({ scrollTrigger: { trigger: statStrip, start: 'top 90%', once: true } })
      .fromTo(statStrip.querySelector('.stat-rule'),
        { scaleX: 0 },
        { scaleX: 1, duration: 1.05, ease: 'power3.inOut' })
      .fromTo(statStrip.querySelectorAll('.stat'),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.85, stagger: 0.11, ease: 'power3.out' }, 0.15)
      .fromTo(statStrip,
        { '--divh': 0 },
        { '--divh': 1, duration: 0.9, ease: 'power2.out' }, 0.28);
  }

  /* ---------- nadpis s maskou (21st.dev soralabs/text-reveal-mask) ----------
     Každé slovo dostane obal s overflow: hidden a zdola z neho vystúpi. Rozdiel
     proti data-textreveal, ktorý web používa inde: tam slová preblikávajú
     z rozostrenia, tu vychádzajú spod hrany. Pokojnejšie a viac editoriálne.

     Namerané v predlohe (režim words): posun 110 % výšky, trvanie 0.6 s,
     stagger 0.06 s, easing cubic-bezier(0.19, 1, 0.22, 1), čo je expo.out,
     medzera medzi slovami 0.25em a spustenie na top 75 % (v predlohe
     viewportMargin -25 %). Beží raz.

     Predloha je React s motion; tu to robí GSAP nad rozdeleným textom, bez
     hydratácie. Pri prefers-reduced-motion sa sem beh vôbec nedostane
     (skoršia vetva), takže nadpis ostane obyčajným textom. */
  gsap.utils.toArray('[data-maskreveal]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    var targets = [];
    /* medzery medzi slovami nesie margin, nie text, takže rozdelený nadpis by
       sa čítal ako jedno slovo. Predloha to rieši rovnako: celok dostane
       aria-label a rozsekané slová sa pre čítačku skryjú. */
    el.setAttribute('aria-label', words.join(' '));
    el.textContent = '';
    words.forEach(function (w, i) {
      var mask = document.createElement('span');
      mask.className = 'mr-mask';
      mask.setAttribute('aria-hidden', 'true');
      if (i < words.length - 1) mask.style.marginInlineEnd = '0.25em';
      var word = document.createElement('span');
      word.className = 'mr-word';
      word.textContent = w;
      mask.appendChild(word);
      el.appendChild(mask);
      targets.push(word);
    });
    gsap.fromTo(targets, { yPercent: 110 }, {
      yPercent: 0,
      duration: 0.6,
      stagger: 0.06,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 75%', once: true }
    });
  });

  /* ---------- svetelný oblúk na kartách (21st.dev glowing-effect) ----------
     Mechanika predlohy: uhol od stredu karty ku kurzoru sa animuje do
     --glow-start easingom, --glow-active svieti len keď je kurzor pri
     okrajoch karty a v jej okolí. Farebný gradient nahradený bielym.

     Zámerne NIE na kartách v Opustili nás. Svetelný prstenec sledujúci
     kurzor po parte konkrétneho zosnulého je nevhodný; tie karty majú
     vlastnú rec — sviečku, ktorá sa rozhorí. */
  var glowCards = gsap.utils.toArray('.svc-card, .branch-card');
  if (glowCards.length && window.matchMedia('(hover: hover)').matches) {
    var GLOW_INACTIVE = 0.55;  /* podiel polomeru karty, kde oblúk nesvieti */
    var GLOW_PROX = 64;        /* px okolo karty, kde sa už aktivuje */
    var glows = glowCards.map(function (el) {
      el.classList.add('has-glow');
      var ring = document.createElement('i');
      ring.className = 'glow-ring';
      ring.setAttribute('aria-hidden', 'true');
      el.appendChild(ring);
      return { el: el, angle: 0, active: -1, tw: null };
    });
    var glowX = -9999, glowY = -9999, glowQueued = false;

    function glowApply() {
      glowQueued = false;
      glows.forEach(function (g) {
        var r = g.el.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var near = glowX > r.left - GLOW_PROX && glowX < r.right + GLOW_PROX
                && glowY > r.top - GLOW_PROX && glowY < r.bottom + GLOW_PROX;
        var dead = 0.5 * Math.min(r.width, r.height) * GLOW_INACTIVE;
        var on = (near && Math.hypot(glowX - cx, glowY - cy) >= dead) ? 1 : 0;
        if (on !== g.active) {
          g.active = on;
          g.el.style.setProperty('--glow-active', String(on));
        }
        if (!on) return;
        /* najkratšia cesta k cieľovému uhlu, aby oblúk nepreskočil cez 360 */
        var target = 180 * Math.atan2(glowY - cy, glowX - cx) / Math.PI + 90;
        var diff = ((((target - g.angle) % 360) + 540) % 360) - 180;
        if (g.tw) g.tw.kill();
        g.tw = gsap.to(g, {
          angle: g.angle + diff,
          duration: 1.1,
          ease: 'expo.out',
          onUpdate: function () { g.el.style.setProperty('--glow-start', g.angle.toFixed(1)); }
        });
      });
    }

    function glowSchedule() {
      if (glowQueued) return;
      glowQueued = true;
      requestAnimationFrame(glowApply);
    }

    window.addEventListener('pointermove', function (e) {
      glowX = e.clientX;
      glowY = e.clientY;
      glowSchedule();
    }, { passive: true });
    /* pri scrolle sa karty hýbu pod nehybným kurzorom — prepočítaj */
    window.addEventListener('scroll', glowSchedule, { passive: true });
  }

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

    /* POZOR: pinované triggery vytvárame v poradí dokumentu (služby → kniha),
       inak ScrollTrigger zle započíta pin spacery predchádzajúcich sekcií. */

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
        scrollTrigger: { trigger: ph.closest('.branch-card, .album-band, .fleetband'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    return function () {};
  });


  /* ---------- refresh after everything (fonts, video poster) settles ---------- */
  window.addEventListener('load', function () {
    ScrollTrigger.refresh();
  });
})();
