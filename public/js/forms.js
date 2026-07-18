/* Paciga — odoslanie formulárov (kondolencia, kontakt) na API bez reloadu. */
(function () {
  'use strict';

  function bind(form, buildPayload, url, successHtml) {
    var btn = form.querySelector('button[type="submit"]');
    var status = form.querySelector('.form-status');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Odosielam…'; }
      if (status) { status.textContent = ''; status.classList.remove('err'); }

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(form))
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok) {
            form.innerHTML = successHtml;
          } else {
            if (status) { status.textContent = (res.d && res.d.error) || 'Nepodarilo sa odoslať. Skúste to prosím neskôr.'; status.classList.add('err'); }
            if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
          }
        })
        .catch(function () {
          if (status) { status.textContent = 'Nepodarilo sa odoslať. Skúste to prosím neskôr, alebo nám zavolajte.'; status.classList.add('err'); }
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
        });
    });
  }

  var kond = document.getElementById('kondolencia-form');
  if (kond) {
    bind(kond, function (f) {
      return {
        slug: f.getAttribute('data-slug'),
        meno: f.elements.meno.value,
        odkaz: f.elements.odkaz.value,
        web: f.elements.web.value
      };
    }, '/api/kondolencia', '<p class="form-success">Ďakujeme za vašu kondolenciu. S úctou ju odovzdáme rodine a po schválení ju zverejníme pri parte.</p>');
  }

  var kontakt = document.getElementById('kontakt-form');
  if (kontakt) {
    bind(kontakt, function (f) {
      return {
        meno: f.elements.meno.value,
        telefon: f.elements.telefon.value,
        email: f.elements.email.value,
        sprava: f.elements.sprava.value,
        web: f.elements.web.value
      };
    }, '/api/kontakt', '<p class="form-success">Ďakujeme, vaša správa je u nás. Ozveme sa vám čo najskôr. Ak je to súrne, volajte NON STOP linku 0903 596 364.</p>');
  }
})();
