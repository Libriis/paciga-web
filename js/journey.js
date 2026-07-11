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

  /* ---------- kreslenie ----------
     Canvas beží v natívnom rozlíšení frames (1:1 blit bez škálovania);
     na viewport ho roztiahne GPU cez CSS object-fit: cover.
     Pri pomalom pohybe sa susedné frames prelínajú alfou — medzi zábermi
     vzniká plynulý prechod namiesto tvrdého preskoku (zdroj má len 8 fps). */
  function srcFor(i) {
    var bm = bitmaps.get(i);
    return bm && bm.width ? bm : frames[i];
  }

  function draw(pos) {
    var i = Math.floor(pos);
    var f = pos - i;
    if (!ready[i]) {
      i = nearestReady(Math.round(pos));
      if (i === -1) return false;
      f = 0;
    }
    var im = frames[i];
    if (canvas.width !== im.width || canvas.height !== im.height) {
      canvas.width = im.width;
      canvas.height = im.height;
    }
    ctx.drawImage(srcFor(i), 0, 0);
    if (f > 0.04 && f < 0.96 && i + 1 < TOTAL && ready[i + 1]) {
      ctx.globalAlpha = f;
      ctx.drawImage(srcFor(i + 1), 0, 0);
      ctx.globalAlpha = 1;
    }
    DBG.drawn++;
    return true;
  }

  /* ---------- rolujúce okno dekódovaných bitmap ----------
     ImageBitmap drží pixely natrvalo dekódované — okolie prehrávacej hlavy
     sa tak kreslí okamžite a nič sa nedekóduje uprostred scrollu. */
  var bitmaps = new Map();
  var AHEAD = 16, BEHIND = 8, KEEP = 26;
  var lastDir = 1;

  function requestBitmap(i) {
    if (bitmaps.has(i) || !ready[i] || !('createImageBitmap' in window)) return;
    bitmaps.set(i, null); /* pending */
    createImageBitmap(frames[i]).then(function (bm) {
      if (bitmaps.has(i)) {
        bitmaps.set(i, bm);
        if (i === current) needsRender = true;
      } else {
        bm.close();
      }
    }, function () { bitmaps.delete(i); });
  }

  function ensureBitmaps(center) {
    var back = lastDir > 0 ? BEHIND : AHEAD;
    var fwd = lastDir > 0 ? AHEAD : BEHIND;
    for (var i = Math.max(0, center - back); i <= Math.min(TOTAL - 1, center + fwd); i++) requestBitmap(i);
    bitmaps.forEach(function (bm, k) {
      if (Math.abs(k - center) > KEEP) {
        if (bm && bm.close) bm.close();
        bitmaps.delete(k);
      }
    });
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
    function done() {
      inflight--;
      ready[i] = true;
      DBG.loaded++;
      needsRender = true;
      pump();
    }
    im.onload = function () {
      /* predekódovanie — drawImage potom nezadrháva synchrónnym dekódom */
      if (im.decode) im.decode().then(done, done);
      else done();
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

  /* ---------- render loop ----------
     Zobrazená pozícia sa k cieľu približuje interpoláciou (lerp) s minimálnou
     rýchlosťou — dobiehanie na konci „dosadne", nespomaľuje donekonečna.
     Sub-frame pohyb kreslí draw() ako prelínanie susedných záberov. */
  var shown = -1;      /* float pozícia zobrazeného framu */
  var lastDrawn = -9;  /* naposledy nakreslená pozícia */
  function loop() {
    requestAnimationFrame(loop);
    var p = Math.min(Math.max(window.__journeyProgress || 0, 0), 1);
    var target = p * (TOTAL - 1);
    if (shown < 0) shown = target;
    var diff = target - shown;
    if (Math.abs(diff) > 0.01) lastDir = diff > 0 ? 1 : -1;
    if (Math.abs(diff) < 0.02) {
      shown = target;
    } else {
      /* proporčné dobiehanie so stropom 6 a minimom 0.3 framu za rAF */
      var step = Math.max(Math.abs(diff) * 0.22, 0.3);
      shown += lastDir * Math.min(step, Math.min(6, Math.abs(diff)));
    }
    ensureBitmaps(Math.round(shown));
    if (Math.abs(shown - lastDrawn) < 0.012 && !needsRender) return;
    if (draw(shown)) {
      lastDrawn = shown;
      current = Math.round(shown);
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
