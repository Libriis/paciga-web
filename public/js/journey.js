/* Paciga — „Posledná cesta": scrollovaná filmová jazda.
   Reťaz Seedance klipov je rozbitá na frame sekvenciu (WebP) a scroll ňou
   listuje na canvase — video nehrá samo, pohyb ovláda návštevník.
   main.js zapisuje window.__journeyProgress (0..1); tento modul len kreslí.

   Architektúra: celé dekódovanie aj kreslenie beží vo WORKERI nad
   OffscreenCanvas — hlavné vlákno len posiela progress. Scroll stránky tak
   nikdy nečaká na blit ani dekód (na slabých CPU to robilo seknutia).
   Canvas má rozlíšenie displeja (cover-fit, strop 1:1 k natívu framov) a
   bitmapy sa zmenšujú už pri dekóde — menšia pamäť, lacnejší blit, nulová
   viditeľná strata (viac pixelov než má displej neukážeš).
   Prehliadače bez OffscreenCanvas idú legacy cestou na hlavnom vlákne.

   POZOR — poučenie z 19.7.2026: GPU-akcelerovaný canvas2d tu padal na access
   violation v GPU procese (SwiftShader aj NVIDIA D3D11) pri rýchlom kreslení
   mnohých rozdielnych 1080p bitmáp — pád VŠETKÝCH tabov na origine. Preto:
   1) kontext vždy s willReadFrequently: true (CPU raster),
   2) ImageBitmap.close() nikdy hneď po kreslení — vždy cez odkladací rad,
   3) strop súbežných createImageBitmap. Neuberať z týchto ochrán. */
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

  function viewportMsg() {
    return {
      t: 'vp',
      vw: window.innerWidth || 0,
      vh: window.innerHeight || 0,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    };
  }

  /* ============================================================
     WORKER CESTA (default v moderných prehliadačoch)
     ============================================================ */

  var workerOk = typeof Worker !== 'undefined'
    && typeof OffscreenCanvas !== 'undefined'
    && typeof canvas.transferControlToOffscreen === 'function'
    && typeof createImageBitmap === 'function';

  /* Telo workera — serializuje sa cez toString do Blob URL, nech ostane
     všetko v jednom súbore. Vnútri žiadne referencie na vonkajší scope. */
  function workerBody() {
    'use strict';

    /* rAF shim — starší worker scope bez requestAnimationFrame */
    var requestAnimationFrame = self.requestAnimationFrame
      ? self.requestAnimationFrame.bind(self)
      : function (cb) { return setTimeout(function () { cb(performance.now()); }, 16); };

    var cv = null, ctx = null;
    var TOTAL = 0, PATH = '', BASE = '';
    var NAT_W = 0, NAT_H = 0;      /* natívny rozmer framov (z prvého dekódu) */
    var BACK_W = 0, BACK_H = 0;    /* backing rozmer canvasu (display-size) */
    var vp = { vw: 0, vh: 0, dpr: 1 };
    var canResize = true;          /* createImageBitmap resize options podpora */

    var blobs = new Array(0);      /* Blob | undefined — enkódované frames (~90 kB/ks) */
    var ready = new Array(0);      /* bool — blob stiahnutý */
    var stage = 'start', loadedN = 0, drawnN = 0, errMsg = null;
    var current = -1;
    var needsRender = true;

    function src(i) {
      var n = String(i + 1);
      while (n.length < 4) n = '0' + n;
      /* šablónu nahraď PRED new URL — tá by '{i}' percentovo zakódovala */
      return new URL(PATH.replace('{i}', n), BASE).href;
    }

    /* ---------- sťahovanie blobov (progresívne passy 8/2/1) ----------
       Intent gating: bez gesta užívateľa sa sťahuje len coarse pass
       (každý 8. frame ≈ desatina dát). Plné passy odomkne až prvý scroll
       či dotyk — návštevník, ktorý prišiel len po telefón, nestiahne 80 MB. */
    var passes = [8, 2, 1];
    var passIdx = 0, inflight = 0, cursor = 0;
    var MAX_INFLIGHT = 6;
    var maxPass = 0; /* 0 = len coarse; zdvihne správa 'go' */

    function pump() {
      while (inflight < MAX_INFLIGHT) {
        if (passIdx > maxPass) { stage = 'coarse-hold'; return; }
        var step = passes[passIdx];
        var found = -1;
        while (cursor < TOTAL) {
          if (cursor % step === 0 && !blobs[cursor] && !pendingLoad[cursor]) { found = cursor; break; }
          cursor++;
        }
        if (found === -1) {
          if (passIdx < passes.length - 1) { passIdx++; cursor = 0; continue; }
          stage = 'all-loaded';
          return;
        }
        load(found);
        cursor++;
      }
    }

    var pendingLoad = {};
    function load(i) {
      inflight++;
      pendingLoad[i] = true;
      fetch(src(i)).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.blob();
      }).then(function (b) {
        blobs[i] = b;
        ready[i] = true;
        loadedN++;
        delete pendingLoad[i];
        inflight--;
        needsRender = true;
        if (!NAT_W) probeNative(i);
        pump();
      }).catch(function () {
        delete pendingLoad[i];
        inflight--;
        errMsg = 'frame ' + i;
        pump();
      });
    }

    /* prvý stiahnutý frame prezradí natívny rozmer → nastav backing canvasu */
    var probing = false;
    function probeNative(i) {
      if (probing) return;
      probing = true;
      createImageBitmap(blobs[i]).then(function (bm) {
        NAT_W = bm.width; NAT_H = bm.height;
        bm.close();
        applyBacking();
      }, function () { probing = false; });
    }

    function applyBacking() {
      if (!NAT_W || !cv) return;
      var scale = Math.min(1, Math.max(vp.vw * vp.dpr / NAT_W, vp.vh * vp.dpr / NAT_H) || 1);
      var w = Math.max(2, Math.round(NAT_W * scale));
      var h = Math.max(2, Math.round(NAT_H * scale));
      if (w === BACK_W && h === BACK_H) return;
      BACK_W = w; BACK_H = h;
      cv.width = w; cv.height = h;
      /* bitmapy sú viazané na starý rozmer — preč s nimi (cez odkladací rad) */
      bitmaps.forEach(function (bm, k) { if (bm && bm.close) boneyard.push({ bm: bm, at: rafN }); });
      bitmaps.clear();
      bmQueue.length = 0;
      needsRender = true;
    }

    /* ---------- okno dekódovaných bitmáp ----------
       Dekódy so stropom súbežnosti; bitmapy hneď v backing rozlíšení. */
    var bitmaps = new Map();
    /* 24 fps zdroj: okno drží ~1 s predstihu v smere jazdy. Bitmapy sú
       display-size (~4-6 MB), živé okno teda ~150-200 MB. Nezväčšovať bez
       merania pamäte na slabom stroji. */
    var AHEAD = 24, BEHIND = 6, KEEP = 30;
    var lastDir = 1;
    var bmInflight = 0, BM_MAX = 4, bmQueue = [];

    /* KRITICKÉ: bitmapu NIKDY nezatvárame hneď — drawImage z nej mohol práve
       odísť do pipeline a close() v tom okne = use-after-free (pád GPU procesu). */
    var boneyard = [];
    function reapBoneyard() {
      while (boneyard.length && rafN - boneyard[0].at > 6) boneyard.shift().bm.close();
    }

    function requestBitmap(i) {
      if (bitmaps.has(i) || !ready[i] || !BACK_W) return;
      if (bmInflight >= BM_MAX) {
        if (bmQueue.indexOf(i) === -1) bmQueue.push(i);
        return;
      }
      bitmaps.set(i, null); /* pending */
      bmInflight++;
      var p;
      if (canResize) {
        try {
          p = createImageBitmap(blobs[i], { resizeWidth: BACK_W, resizeHeight: BACK_H, resizeQuality: 'high' });
        } catch (e) { canResize = false; }
      }
      if (!p) p = createImageBitmap(blobs[i]);
      p.then(function (bm) {
        bmInflight--;
        if (bitmaps.has(i)) {
          bitmaps.set(i, bm);
          needsRender = true;
        } else {
          boneyard.push({ bm: bm, at: rafN });
        }
        drainBmQueue();
      }, function () {
        bmInflight--;
        bitmaps.delete(i);
        drainBmQueue();
      });
    }

    function drainBmQueue() {
      while (bmInflight < BM_MAX && bmQueue.length) {
        var next = bmQueue.shift();
        if (current >= 0 && Math.abs(next - current) > KEEP) continue;
        requestBitmap(next);
      }
    }

    function ensureBitmaps(center) {
      var back = lastDir > 0 ? BEHIND : AHEAD;
      var fwd = lastDir > 0 ? AHEAD : BEHIND;
      for (var i = Math.max(0, center - back); i <= Math.min(TOTAL - 1, center + fwd); i++) requestBitmap(i);
      bitmaps.forEach(function (bm, k) {
        if (Math.abs(k - center) > KEEP) {
          if (bm && bm.close) boneyard.push({ bm: bm, at: rafN });
          bitmaps.delete(k);
        }
      });
    }

    function nearestReady(target) {
      if (ready[target]) return target;
      for (var d = 1; d < TOTAL; d++) {
        if (target - d >= 0 && ready[target - d]) return target - d;
        if (target + d < TOTAL && ready[target + d]) return target + d;
      }
      return -1;
    }

    function nearestBitmap(i) {
      var best = -1, bestD = Infinity;
      bitmaps.forEach(function (bm, k) {
        if (!bm || !bm.width) return;
        var d = Math.abs(k - i);
        if (d < bestD) { bestD = d; best = k; }
      });
      return best;
    }

    /* ---------- kreslenie ---------- */
    var firstDrawn = false;
    var drawLog = []; /* efektívna nakreslená pozícia (i + alfa) — diagnostika spojitosti */

    function draw(pos) {
      if (!ctx || !BACK_W) return false;
      var i = Math.floor(pos);
      var f = pos - i;
      if (!ready[i]) {
        i = nearestReady(Math.round(pos));
        if (i === -1) return false;
        f = 0;
      }
      var bm = bitmaps.get(i);
      if (!bm || !bm.width) {
        var j = nearestBitmap(i);
        if (j === -1) return false;
        i = j;
        f = 0;
        bm = bitmaps.get(i);
      }
      ctx.drawImage(bm, 0, 0, BACK_W, BACK_H);
      /* Prelínanie SPOJITÉ v celom rozsahu f (0..1) so smoothstep alfou.
         Mŕtva zóna (bývalé f>0.04 && f<0.96) robila pri pomalom dojazde
         viditeľný sek: alfa skočila z ~0.96 na 0 v jednom rAF. Smoothstep má
         na krajoch nulovú deriváciu, výmena framu je tak úplne plynulá. */
      var A = f > 0.001 ? f * f * (3 - 2 * f) : 0;
      if (A > 0.001 && i + 1 < TOTAL) {
        var bm2 = bitmaps.get(i + 1);
        if (bm2 && bm2.width) {
          ctx.globalAlpha = A;
          ctx.drawImage(bm2, 0, 0, BACK_W, BACK_H);
          ctx.globalAlpha = 1;
        } else {
          A = 0; /* sused nedekódovaný — kresli bez blendu a priznaj to v logu */
        }
      }
      drawLog.push(i + A);
      if (drawLog.length > 240) drawLog.shift();
      drawnN++;
      if (!firstDrawn) { firstDrawn = true; postMessage({ t: 'first' }); }
      return true;
    }

    /* ---------- render slučka (lerp + settle zámok) ---------- */
    var P = 0, PRAW = 0, PDEST = 0;
    var shown = -1, lastDrawnPos = -9, prevTarget = -1;
    var stillCount = 0, settleTarget = -1, settled = false;
    var settleFrom = 0, settleT0 = 0, settleDur = 0, settleDest = 0, settledRaw = 0;
    /* V3 pristátie: zvyšná dráha jazdy namapovaná na zvyšnú dráhu Lenisu */
    var landing = false, landFrom = 0, landGapS = 0, landGapR = 0, landDest = 0, landT0 = 0;
    var prevDest = -1, destStableN = 0;
    var rafN = 0;

    function clamp01(x) { return Math.min(Math.max(x, 0), 1); }

    function loop() {
      requestAnimationFrame(loop);
      rafN++;
      reapBoneyard();
      var p = clamp01(P);
      var praw = clamp01(PRAW);
      var target = p * (TOTAL - 1);
      var rawF = praw * (TOTAL - 1);
      var destF = clamp01(PDEST) * (TOTAL - 1);
      if (shown < 0) shown = target;

      /* prahy sú vo frameoch — škálované na 24 fps zdroj (3× hustejší než 8 fps).
         Budenie meria pohyb scrollu OD usadenia (nie voči shown) — pristátie
         vedome zahadzuje scrub rest, takže raw môže legálne stáť ďalej. */
      if (settled) {
        if (Math.abs(rawF - settledRaw) > 1.8) {
          settled = false;
          stillCount = 0;
          settleTarget = -1;
          prevTarget = -1;
        } else {
          if (needsRender && draw(shown)) { lastDrawnPos = shown; needsRender = false; }
          return;
        }
      }

      var v = prevTarget < 0 ? 0 : target - prevTarget;
      prevTarget = target;
      if (Math.abs(v) > 0.75) stillCount = 0;
      else if (Math.abs(v) < 0.3) stillCount++;
      var settling = stillCount > 5;

      /* Dojazd: zvyšok sa dohrá JEDNÝM easeOut pohybom rovno na frame, kde
         scroll skončí. ANTICIPÁCIA: glide štartuje už počas dobiehania Lenisu
         (posledných ~1.5 framu k cieľu), takže pristátie splynie so scrollom
         a po zastavení sa už nedeje nič — žiadna udalosť „po scrolle". */
      /* stabilita cieľa: nehýbal sa X rAF = užívateľ nekrúti kolieskom */
      var gapRaw = destF - rawF;
      if (prevDest >= 0 && Math.abs(destF - prevDest) < 0.1) destStableN++;
      else destStableN = 0;
      prevDest = destF;

      /* ---- V3: spoločné brzdenie s Lenisom ----
         Zvyšná dráha jazdy sa lineárne mapuje na zvyšnú dráhu scrollu.
         Obraz brzdí tou istou krivkou ako stránka a zastane V TOM ISTOM
         okamihu, na ostrom celom frame. Po zastavení sa už nedeje nič. */
      if (landing) {
        if (Math.abs(destF - landDest) > 0.5) {
          landing = false; /* užívateľ znova pohol — späť do normálneho vedenia */
        } else {
          var rr = landGapR !== 0 ? 1 - (destF - rawF) / landGapR : 1;
          rr = Math.min(1, Math.max(0, rr));
          shown = landFrom + landGapS * rr;
          if (Math.abs(landGapS) > 0.01) lastDir = landGapS > 0 ? 1 : -1;
          if (rr >= 1 || Math.abs(destF - rawF) < 0.12 || performance.now() - landT0 > 1200) {
            shown = landFrom + landGapS;
            landing = false;
            settled = true;
            settledRaw = rawF;
            needsRender = true;
          }
        }
      }
      if (!settled && !landing) {
        if (destStableN > 3 && Math.abs(gapRaw) < 6 && Math.abs(gapRaw) > 0.12 && Math.abs(v) < 1.5) {
          /* vstup do pristátia: cieľ stojí, Lenis dobieha */
          var lt = Math.round(destF);
          if (lastDir > 0) {
            lt = Math.max(lt, Math.ceil(shown - 0.02));
            lt = Math.min(lt, Math.ceil(shown) + 3);
          } else {
            lt = Math.min(lt, Math.floor(shown + 0.02));
            lt = Math.max(lt, Math.floor(shown) - 3);
          }
          lt = Math.max(0, Math.min(TOTAL - 1, lt));
          landing = true;
          landFrom = shown;
          landGapS = lt - shown;
          landGapR = gapRaw;
          landDest = destF;
          landT0 = performance.now();
        } else if (settling && Math.abs(gapRaw) <= 0.12) {
          /* fallback bez Lenis cieľa (touch, kotvy): mikro-snap max 2 framy, lineárne */
          if (settleTarget < 0) {
            var idealT = Math.round(destF);
            if (lastDir > 0) {
              idealT = Math.max(idealT, Math.ceil(shown - 0.02));
              idealT = Math.min(idealT, Math.ceil(shown) + 2);
            } else {
              idealT = Math.min(idealT, Math.floor(shown + 0.02));
              idealT = Math.max(idealT, Math.floor(shown) - 2);
            }
            settleTarget = Math.max(0, Math.min(TOTAL - 1, idealT));
            settleFrom = shown;
            settleT0 = performance.now();
            settleDur = Math.min(140, Math.max(60, Math.abs(settleTarget - settleFrom) * 40));
          }
          var tt = Math.min(1, (performance.now() - settleT0) / settleDur);
          shown = settleFrom + (settleTarget - settleFrom) * tt;
          if (Math.abs(settleTarget - settleFrom) > 0.01) lastDir = settleTarget > settleFrom ? 1 : -1;
          if (tt >= 1) {
            shown = settleTarget;
            settled = true;
            settledRaw = rawF;
            needsRender = true;
          }
        } else {
          settleTarget = -1;
          /* ---- V2: adaptívne tesné vedenie ----
             Pri nízkej rýchlosti cieľa sa catch-up utiahne (0.22 → 0.6),
             takže obraz nemá voči scrollu dlh a dojazd nemá z čoho vzniknúť. */
          var goal = target;
          var diff = goal - shown;
          if (Math.abs(diff) > 0.01) lastDir = diff > 0 ? 1 : -1;
          if (Math.abs(diff) < 0.02) {
            shown = goal;
          } else {
            var k = 0.22 + 0.38 * (1 - Math.min(1, Math.abs(v) / 3));
            var floor = Math.max(0.12, Math.min(0.9, Math.abs(diff) * 0.3));
            var step = Math.max(Math.abs(diff) * k, floor);
            shown += (diff > 0 ? 1 : -1) * Math.min(step, Math.min(18, Math.abs(diff)));
          }
        }
      }

      ensureBitmaps(Math.round(shown));
      if (Math.abs(shown - lastDrawnPos) < 0.012 && !needsRender) return;
      if (draw(shown)) {
        lastDrawnPos = shown;
        current = Math.round(shown);
        needsRender = false;
      }
    }

    /* ---------- diagnostika pre hlavné vlákno ---------- */
    setInterval(function () {
      var live = 0;
      bitmaps.forEach(function (bm) { if (bm && bm.width) live++; });
      postMessage({
        t: 'dbg',
        stage: stage, drawn: drawnN, loaded: loadedN, err: errMsg,
        bmLive: live, shown: shown, settled: settled,
        backW: BACK_W, backH: BACK_H,
        drawLog: drawLog.slice(-240)
      });
    }, 400);

    onmessage = function (e) {
      var m = e.data;
      if (m.t === 'init') {
        cv = m.canvas;
        ctx = cv.getContext('2d', { willReadFrequently: true }); /* CPU raster — nemeniť */
        TOTAL = m.total;
        PATH = m.path;
        BASE = m.base;
        vp = { vw: m.vw, vh: m.vh, dpr: m.dpr };
        blobs = new Array(TOTAL);
        ready = new Array(TOTAL);
        stage = 'coarse';
        /* eco (saveData): ani coarse pass bez gesta — poster stačí */
        if (!m.eco) pump();
        loop();
      } else if (m.t === 'p') {
        P = m.p;
        PRAW = m.praw;
        PDEST = typeof m.dest === 'number' ? m.dest : m.praw;
      } else if (m.t === 'vp') {
        vp = { vw: m.vw, vh: m.vh, dpr: m.dpr };
        applyBacking();
      } else if (m.t === 'go') {
        if (maxPass < 2) {
          maxPass = 2;
          pump();
        }
      }
    };
  }

  if (workerOk) {
    var blobUrl = URL.createObjectURL(new Blob(['(' + workerBody.toString() + ')()'], { type: 'text/javascript' }));
    var worker = null;
    try {
      worker = new Worker(blobUrl);
    } catch (e) {
      worker = null;
    }
    if (worker) {
      DBG.stage = 'worker';
      var off = canvas.transferControlToOffscreen();
      var vm = viewportMsg();
      var eco = !!(navigator.connection && navigator.connection.saveData);
      worker.postMessage({ t: 'init', canvas: off, total: TOTAL, path: PATH, base: window.location.href, vw: vm.vw, vh: vm.vh, dpr: vm.dpr, eco: eco }, [off]);

      /* intent: prvé gesto odomkne plné sťahovanie frameov */
      var goSent = false;
      function sendGo() {
        if (goSent) return;
        goSent = true;
        worker.postMessage({ t: 'go' });
        ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'].forEach(function (ev) {
          window.removeEventListener(ev, sendGo);
        });
      }
      ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'].forEach(function (ev) {
        window.addEventListener(ev, sendGo, { passive: true, once: false });
      });

      worker.onmessage = function (e) {
        var m = e.data;
        if (m.t === 'first') {
          if (poster && !poster.dataset.hidden) {
            poster.dataset.hidden = '1';
            poster.style.opacity = '0';
          }
        } else if (m.t === 'dbg') {
          DBG.stage = 'worker:' + m.stage;
          DBG.drawn = m.drawn;
          DBG.loaded = m.loaded;
          DBG.err = m.err;
          DBG.bmLive = m.bmLive;
          if (!DBG.bmPeak || m.bmLive > DBG.bmPeak) DBG.bmPeak = m.bmLive;
          DBG.shown = m.shown;
          DBG.settled = m.settled;
          DBG.back = m.backW + 'x' + m.backH;
          DBG.drawLog = m.drawLog;
        }
      };
      worker.onerror = function (err) {
        /* canvas je po transfere nenávratne workerov — pri páde ostáva poster */
        DBG.err = 'worker: ' + (err && err.message);
      };

      /* progress forwarder: pošli len pri zmene */
      var lastP = -1, lastRaw = -1, lastDest = -1;
      (function fwd() {
        requestAnimationFrame(fwd);
        var p = window.__journeyProgress || 0;
        var praw = typeof window.__journeyRawProgress === 'number' ? window.__journeyRawProgress : p;
        var dest = typeof window.__journeyDestProgress === 'number' ? window.__journeyDestProgress : praw;
        if (p !== lastP || praw !== lastRaw || dest !== lastDest) {
          lastP = p; lastRaw = praw; lastDest = dest;
          worker.postMessage({ t: 'p', p: p, praw: praw, dest: dest });
        }
      })();

      var rszT = null;
      window.addEventListener('resize', function () {
        clearTimeout(rszT);
        rszT = setTimeout(function () { worker.postMessage(viewportMsg()); }, 300);
      });
      return;
    }
  }

  /* ============================================================
     LEGACY CESTA (bez OffscreenCanvas) — hlavné vlákno, CPU raster
     ============================================================ */

  DBG.stage = 'legacy';
  var ctx = canvas.getContext('2d', { willReadFrequently: true }); /* CPU raster — nemeniť */
  var frames = new Array(TOTAL);
  var ready = new Array(TOTAL);
  var current = -1;
  var needsRender = true;

  function src(i) { return PATH.replace('{i}', String(i + 1).padStart(4, '0')); }

  function srcFor(i) {
    var bm = bitmaps.get(i);
    return bm && bm.width ? bm : frames[i];
  }

  var HAS_CIB = 'createImageBitmap' in window;

  function nearestBitmap(i) {
    var best = -1, bestD = Infinity;
    bitmaps.forEach(function (bm, k) {
      if (!bm || !bm.width) return;
      var d = Math.abs(k - i);
      if (d < bestD) { bestD = d; best = k; }
    });
    return best;
  }

  function draw(pos) {
    var i = Math.floor(pos);
    var f = pos - i;
    if (!ready[i]) {
      i = nearestReady(Math.round(pos));
      if (i === -1) return false;
      f = 0;
    }
    if (HAS_CIB && current !== -1) {
      var bm = bitmaps.get(i);
      if (!bm || !bm.width) {
        var j = nearestBitmap(i);
        if (j === -1) return false;
        i = j;
        f = 0;
      }
    }
    var im = frames[i];
    if (canvas.width !== im.width || canvas.height !== im.height) {
      canvas.width = im.width;
      canvas.height = im.height;
    }
    ctx.drawImage(srcFor(i), 0, 0);
    /* spojitý smoothstep blend — bez mŕtvej zóny (viditeľný sek pri dojazde) */
    var A = f > 0.001 ? f * f * (3 - 2 * f) : 0;
    if (A > 0.001 && i + 1 < TOTAL && ready[i + 1]) {
      var bm2 = bitmaps.get(i + 1);
      if (!HAS_CIB || (bm2 && bm2.width)) {
        ctx.globalAlpha = A;
        ctx.drawImage(srcFor(i + 1), 0, 0);
        ctx.globalAlpha = 1;
      }
    }
    DBG.drawn++;
    return true;
  }

  var bitmaps = new Map();
  var AHEAD = 16, BEHIND = 5, KEEP = 20; /* 24 fps zdroj; legacy drží full-res bitmapy, okno mierne */
  var lastDir = 1;
  var bmInflight = 0, BM_MAX = 3, bmQueue = [];

  /* KRITICKÉ: close() vždy odložene — use-after-free padal GPU proces. */
  var boneyard = [];
  function reapBoneyard() {
    while (boneyard.length && rafN - boneyard[0].at > 6) boneyard.shift().bm.close();
  }

  function requestBitmap(i) {
    if (bitmaps.has(i) || !ready[i] || !HAS_CIB) return;
    if (bmInflight >= BM_MAX) {
      if (bmQueue.indexOf(i) === -1) bmQueue.push(i);
      return;
    }
    bitmaps.set(i, null);
    bmInflight++;
    createImageBitmap(frames[i]).then(function (bm) {
      bmInflight--;
      if (bitmaps.has(i)) {
        bitmaps.set(i, bm);
        needsRender = true;
      } else {
        boneyard.push({ bm: bm, at: rafN });
      }
      drainBmQueue();
    }, function () {
      bmInflight--;
      bitmaps.delete(i);
      drainBmQueue();
    });
  }

  function drainBmQueue() {
    while (bmInflight < BM_MAX && bmQueue.length) {
      var next = bmQueue.shift();
      if (current >= 0 && Math.abs(next - current) > KEEP) continue;
      requestBitmap(next);
    }
  }

  function ensureBitmaps(center, transit) {
    var back = transit ? 1 : (lastDir > 0 ? BEHIND : AHEAD);
    var fwd = transit ? 2 : (lastDir > 0 ? AHEAD : BEHIND);
    for (var i = Math.max(0, center - back); i <= Math.min(TOTAL - 1, center + fwd); i++) requestBitmap(i);
    var live = 0;
    bitmaps.forEach(function (bm, k) {
      if (Math.abs(k - center) > KEEP) {
        if (bm && bm.close) boneyard.push({ bm: bm, at: rafN });
        bitmaps.delete(k);
      } else if (bm && bm.width) live++;
    });
    DBG.bmLive = live;
    if (!DBG.bmPeak || live > DBG.bmPeak) DBG.bmPeak = live;
  }

  function nearestReady(target) {
    if (ready[target]) return target;
    for (var d = 1; d < TOTAL; d++) {
      if (target - d >= 0 && ready[target - d]) return target - d;
      if (target + d < TOTAL && ready[target + d]) return target + d;
    }
    return -1;
  }

  var passes = [8, 2, 1];
  var passIdx = 0;
  var inflight = 0;
  var MAX_INFLIGHT = 6;
  var cursor = 0;
  var maxPass = 0; /* intent gating ako vo worker vetve */

  function unlockFull() {
    if (maxPass >= 2) return;
    maxPass = 2;
    pump();
    ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'].forEach(function (ev) {
      window.removeEventListener(ev, unlockFull);
    });
  }
  ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, unlockFull, { passive: true });
  });

  function pump() {
    while (inflight < MAX_INFLIGHT) {
      if (passIdx > maxPass) { return; }
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

  function startFull() { if (passIdx === 0 && DBG.stage === 'coarse') { DBG.stage = 'loading'; } }
  window.addEventListener('load', function () {
    DBG.stage = 'coarse';
    pump();
    if ('requestIdleCallback' in window) requestIdleCallback(startFull, { timeout: 4000 });
    else setTimeout(startFull, 3000);
  });
  if (document.readyState === 'complete') { DBG.stage = 'coarse'; pump(); }

  var shown = -1;
  var rafN = 0;
  var lastDrawn = -9;
  var prevTarget = -1;
  var stillCount = 0;
  var settleTarget = -1;
  var settled = false;
  var settleFrom = 0, settleT0 = 0, settleDur = 0, settleDest = 0, settledRaw = 0;
  var landing = false, landFrom = 0, landGapS = 0, landGapR = 0, landDest = 0, landT0 = 0;
  var prevDest = -1, destStableN = 0;

  function clamp01(x) { return Math.min(Math.max(x, 0), 1); }

  function loop() {
    requestAnimationFrame(loop);
    rafN++;
    reapBoneyard();
    var p = clamp01(window.__journeyProgress || 0);
    var praw = typeof window.__journeyRawProgress === 'number' ? clamp01(window.__journeyRawProgress) : p;
    var target = p * (TOTAL - 1);
    var rawF = praw * (TOTAL - 1);
    if (shown < 0) shown = target;

    /* prahy vo frameoch — škálované na 24 fps zdroj; budenie od usadenia */
    if (settled) {
      if (Math.abs(rawF - settledRaw) > 1.8) {
        settled = false;
        stillCount = 0;
        settleTarget = -1;
        prevTarget = -1;
      } else {
        if (needsRender && draw(shown)) { lastDrawn = shown; needsRender = false; }
        return;
      }
    }

    var v = prevTarget < 0 ? 0 : target - prevTarget;
    prevTarget = target;
    if (Math.abs(v) > 0.75) stillCount = 0;
    else if (Math.abs(v) < 0.3) stillCount++;
    var settling = stillCount > 5;

    var destP = typeof window.__journeyDestProgress === 'number' ? clamp01(window.__journeyDestProgress) : praw;
    var destF = destP * (TOTAL - 1);

    /* časovo ohraničený dojazd s anticipáciou — viď worker vetva */
    /* V3 + V2 — zrkadlo worker vetvy (spoločné brzdenie s Lenisom + adaptívne vedenie) */
    var gapRaw = destF - rawF;
    if (prevDest >= 0 && Math.abs(destF - prevDest) < 0.1) destStableN++;
    else destStableN = 0;
    prevDest = destF;

    if (landing) {
      if (Math.abs(destF - landDest) > 0.5) {
        landing = false;
      } else {
        var rr = landGapR !== 0 ? 1 - (destF - rawF) / landGapR : 1;
        rr = Math.min(1, Math.max(0, rr));
        shown = landFrom + landGapS * rr;
        if (Math.abs(landGapS) > 0.01) lastDir = landGapS > 0 ? 1 : -1;
        if (rr >= 1 || Math.abs(destF - rawF) < 0.12 || performance.now() - landT0 > 1200) {
          shown = landFrom + landGapS;
          landing = false;
          settled = true;
          settledRaw = rawF;
          needsRender = true;
        }
      }
    }
    if (!settled && !landing) {
      if (destStableN > 3 && Math.abs(gapRaw) < 6 && Math.abs(gapRaw) > 0.12 && Math.abs(v) < 1.5) {
        var lt = Math.round(destF);
        if (lastDir > 0) {
          lt = Math.max(lt, Math.ceil(shown - 0.02));
          lt = Math.min(lt, Math.ceil(shown) + 3);
        } else {
          lt = Math.min(lt, Math.floor(shown + 0.02));
          lt = Math.max(lt, Math.floor(shown) - 3);
        }
        lt = Math.max(0, Math.min(TOTAL - 1, lt));
        landing = true;
        landFrom = shown;
        landGapS = lt - shown;
        landGapR = gapRaw;
        landDest = destF;
        landT0 = performance.now();
      } else if (settling && Math.abs(gapRaw) <= 0.12) {
        if (settleTarget < 0) {
          var idealT = Math.round(destF);
          if (lastDir > 0) {
            idealT = Math.max(idealT, Math.ceil(shown - 0.02));
            idealT = Math.min(idealT, Math.ceil(shown) + 2);
          } else {
            idealT = Math.min(idealT, Math.floor(shown + 0.02));
            idealT = Math.max(idealT, Math.floor(shown) - 2);
          }
          settleTarget = Math.max(0, Math.min(TOTAL - 1, idealT));
          settleFrom = shown;
          settleT0 = performance.now();
          settleDur = Math.min(140, Math.max(60, Math.abs(settleTarget - settleFrom) * 40));
        }
        var tt = Math.min(1, (performance.now() - settleT0) / settleDur);
        shown = settleFrom + (settleTarget - settleFrom) * tt;
        if (Math.abs(settleTarget - settleFrom) > 0.01) lastDir = settleTarget > settleFrom ? 1 : -1;
        if (tt >= 1) {
          shown = settleTarget;
          settled = true;
          settledRaw = rawF;
          needsRender = true;
        }
      } else {
        settleTarget = -1;
        var goal = target;
        var diff = goal - shown;
        if (Math.abs(diff) > 0.01) lastDir = diff > 0 ? 1 : -1;
        if (Math.abs(diff) < 0.02) {
          shown = goal;
        } else {
          var k = 0.22 + 0.38 * (1 - Math.min(1, Math.abs(v) / 3));
          var stepFloor = Math.max(0.12, Math.min(0.9, Math.abs(diff) * 0.3));
          var step = Math.max(Math.abs(diff) * k, stepFloor);
          shown += (diff > 0 ? 1 : -1) * Math.min(step, Math.min(18, Math.abs(diff)));
        }
      }
    }

    var transit = Math.abs(target - shown) > 30;
    ensureBitmaps(Math.round(shown), transit);
    /* Legacy na hlavnom vlákne: pri rýchlom presune kresli max každý 3. rAF —
       šetrí main thread aj GPU (historicky tu padal GPU proces). */
    if (transit && (rafN % 3)) return;
    if (Math.abs(shown - lastDrawn) < 0.012 && !needsRender) return;
    if (draw(shown)) {
      lastDrawn = shown;
      current = Math.round(shown);
      needsRender = false;
      DBG.shown = shown;
      DBG.settled = settled;
      if (poster && !poster.dataset.hidden) {
        poster.dataset.hidden = '1';
        poster.style.opacity = '0';
      }
    }
  }
  loop();
})();
