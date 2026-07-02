// Paciga FX — shared UX animation module (page fade, magnetic buttons, photo mask reveal)
(function () {
  'use strict';

  /* ---------- 0) day/night theme (applied ASAP to minimise flash) ---------- */
  var THEME_KEY = 'paciga-theme';
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'day' ? 'day' : 'night'; } catch (e) { return 'night'; }
  }
  function applyTheme(t) {
    if (t === 'day') document.documentElement.setAttribute('data-theme', 'day');
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(getTheme());

  function init() {
    /* ---------- 1) page transition fade ---------- */
    var ov = document.createElement('div');
    ov.id = 'paciga-fade-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:' + (getTheme() === 'day' ? '#f2f2f2' : '#0c0d0f') + ';z-index:9999;pointer-events:none;opacity:1;transition:opacity .55s ease;';
    document.body.appendChild(ov);
    setTimeout(function () { ov.style.opacity = '0'; }, 80);

    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      // only internal page links (not anchors, tel:, mailto:, external)
      if (!/\.dc\.html$/i.test(href.split('#')[0])) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      e.preventDefault();
      ov.style.pointerEvents = 'auto';
      ov.style.opacity = '1';
      setTimeout(function () { window.location.href = href; }, 400);
    }, true);

    /* ---------- 2) magnetic buttons ---------- */
    var mags = [].slice.call(document.querySelectorAll('[data-magnetic]'));
    if (mags.length && window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
      mags.forEach(function (el) {
        var t = window.getComputedStyle(el).transitionProperty;
        el.style.transition = (t && t !== 'all' && t !== 'none' ? t.split(',').map(function (p) { return p.trim() + ' .3s ease'; }).join(', ') + ', ' : '') + 'transform .3s cubic-bezier(.2,.7,.3,1)';
      });
      document.addEventListener('mousemove', function (e) {
        for (var i = 0; i < mags.length; i++) {
          var el = mags[i];
          var r = el.getBoundingClientRect();
          if (!r.width) continue;
          var dx = e.clientX - (r.left + r.width / 2);
          var dy = e.clientY - (r.top + r.height / 2);
          var dist = Math.sqrt(dx * dx + dy * dy);
          var rad = Math.max(r.width * 0.9, 130);
          if (dist < rad) {
            var f = (1 - dist / rad) * 0.32;
            el.style.transform = 'translate(' + (dx * f).toFixed(1) + 'px,' + (dy * f).toFixed(1) + 'px)';
          } else if (el.style.transform) {
            el.style.transform = '';
          }
        }
      }, { passive: true });
    }

    /* ---------- 3) photo mask reveal on scroll ---------- */
    var imgs = [].slice.call(document.querySelectorAll('[data-mask-reveal]'));
    if (imgs.length && 'IntersectionObserver' in window) {
      imgs.forEach(function (el) {
        var vh = window.innerHeight || 800;
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) return; // already on screen: leave visible
        el.setAttribute('data-mask-pending', '1');
        el.style.clipPath = 'inset(0 100% 0 0)';
        el.style.transition = 'clip-path 1s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1)';
      });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.style.clipPath = 'inset(0 0 0 0)';
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.22 });
      imgs.forEach(function (el) { if (el.hasAttribute('data-mask-pending')) io.observe(el); });
    }

    /* ---------- 4) theme toggle button ---------- */
    var tg = document.createElement('button');
    tg.id = 'paciga-theme-toggle';
    tg.setAttribute('data-kd', '');
    tg.setAttribute('aria-label', 'Prepnúť dennú / nočnú verziu');
    function paintToggle() {
      var day = getTheme() === 'day';
      tg.textContent = day ? 'NOC' : 'DEŇ';
      tg.style.cssText = 'position:fixed;bottom:26px;right:26px;z-index:80;display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;cursor:pointer;font:600 11px/1 Archivo,sans-serif;letter-spacing:.22em;font-variation-settings:\'wdth\' 125;transition:opacity .3s ease;'
        + (day
          ? 'background:rgba(20,21,23,.92);color:#f5f5f5;border:1px solid rgba(20,21,23,.9);'
          : 'background:rgba(240,240,240,.94);color:#141517;border:1px solid rgba(255,255,255,.9);');
    }
    paintToggle();
    tg.addEventListener('click', function () {
      var next = getTheme() === 'day' ? 'night' : 'day';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
      paintToggle();
      ov.style.background = next === 'day' ? '#f2f2f2' : '#0c0d0f';
    });
    document.body.appendChild(tg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
