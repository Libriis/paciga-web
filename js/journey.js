/* Paciga — „Posledná cesta": scrollovaná filmová jazda.
   Reťaz Seedance klipov je rozbitá na frame sekvenciu (WebP) a scroll ňou
   listuje na canvase — video nehrá samo, pohyb ovláda návštevník.
   main.js zapisuje window.__journeyProgress (0..1); tento modul len kreslí.
   Progresívne načítanie: najprv každý 8. frame, potom každý 2., potom všetky. */
(function () {
  'use strict';

  var DBG = window.__journey = { stage: 'start', drawn: 0, loaded: 0, err: null };

  var canvas = document.getElementById('journey-canvas');
  var pinEl = document.getElementById('journey-pin');
  var poster = document.getElementById('journey-poster');
  if (!canvas || !pinEl) { DBG.stage = 'no-dom'; return; }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { DBG.stage = 'reduced-motion'; return; /* CSS fallback ukáže statické zábery */ }

  var isMobile = window.innerWidth < 701;
  var TOTAL = parseInt(canvas.getAttribute(isMobile ? 'data-frames-m' : 'data-frames'), 10) || 0;
  var PATH = canvas.getAttribute(isMobile ? 'data-path-m' : 'data-path') || '';
  if (!TOTAL || !PATH) { DBG.stage = 'no-config'; return; }

  var ctx = canvas.getContext('2d');
  var frames = new Array(TOTAL);      /* Image | undefined */
  var ready = new Array(TOTAL);       /* bool */
  var current = -1;                   /* naposledy nakreslený index */
  var needsRender = true;

  function src(i) { return PATH.replace('{i}', String(i + 1).padStart(4, '0')); }

  /* ---------- veľkosť ---------- */
  var W = 0, H = 0, DPR = 1;
  function size() {
    var r = pinEl.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.round(r.width * DPR);
    H = Math.round(r.height * DPR);
    canvas.width = W;
    canvas.height = H;
    needsRender = true;
  }
  size();
  window.addEventListener('resize', size);

  /* ---------- kreslenie (cover-fit) ---------- */
  function draw(i) {
    var im = frames[i];
    if (!im || !ready[i]) return false;
    var ir = im.width / im.height, cr = W / H;
    var sw = im.width, sh = im.height, sx = 0, sy = 0;
    if (ir > cr) { sw = im.height * cr; sx = (im.width - sw) / 2; }
    else { sh = im.width / cr; sy = (im.height - sh) / 2; }
    ctx.drawImage(im, sx, sy, sw, sh, 0, 0, W, H);
    DBG.drawn++;
    return true;
  }

  /* najbližší načítaný frame k cieľu (preferuje smer dozadu — plynulejšie) */
  function nearestReady(target) {
    if (ready[target]) return target;
    for (var d = 1; d < TOTAL; d++) {
      if (target - d >= 0 && ready[target - d]) return target - d;
      if (target + d < TOTAL && ready[target + d]) return target + d;
    }
    return -1;
  }

  /* ---------- progresívny loader ---------- */
  var passes = [8, 2, 1];
  var passIdx = 0;
  var inflight = 0;
  var MAX_INFLIGHT = 6;
  var cursor = 0;

  function pump() {
    while (inflight < MAX_INFLIGHT) {
      /* nájdi ďalší nenačítaný index aktuálnej passy */
      var step = passes[passIdx];
      var found = -1;
      while (cursor < TOTAL) {
        if (cursor % step === 0 && !frames[cursor]) { found = cursor; break; }
        cursor++;
      }
      if (found === -1) {
        if (passIdx < passes.length - 1) { passIdx++; cursor = 0; continue; }
        DBG.stage = 'all-loaded';
        return;
      }
      load(found);
      cursor++;
    }
  }

  function load(i) {
    inflight++;
    var im = new Image();
    im.decoding = 'async';
    im.onload = function () {
      inflight--;
      ready[i] = true;
      DBG.loaded++;
      needsRender = true;
      pump();
    };
    im.onerror = function () {
      inflight--;
      DBG.err = 'frame ' + i;
      pump();
    };
    im.src = src(i);
    frames[i] = im;
  }

  /* prvá passa hneď po loade stránky, plné rozlíšenie po prvej interakcii/idle */
  function startFull() { if (passIdx === 0 && DBG.stage === 'coarse') { DBG.stage = 'loading'; } }
  window.addEventListener('load', function () {
    DBG.stage = 'coarse';
    pump();
    if ('requestIdleCallback' in window) requestIdleCallback(startFull, { timeout: 4000 });
    else setTimeout(startFull, 3000);
  });
  /* keby load už prebehol (modul je defer na konci) */
  if (document.readyState === 'complete') { DBG.stage = 'coarse'; pump(); }

  /* ---------- render loop: kreslí len pri zmene ---------- */
  function loop() {
    requestAnimationFrame(loop);
    var p = Math.min(Math.max(window.__journeyProgress || 0, 0), 1);
    var target = Math.round(p * (TOTAL - 1));
    var idx = nearestReady(target);
    if (idx === -1) return;
    if (idx === current && !needsRender) return;
    if (draw(idx)) {
      current = idx;
      needsRender = false;
      /* poster skryjeme po prvom nakreslenom frame */
      if (poster && !poster.dataset.hidden) {
        poster.dataset.hidden = '1';
        poster.style.opacity = '0';
      }
    }
  }
  loop();
})();
