/*
  Úprava obsahu priamo na živom webe.

  Načíta sa až vtedy, keď je v prehliadači prihlásený správca. Bežný
  návštevník stiahne len pár riadkov v Base.astro, ktoré zistia, že žiadna
  relácia neexistuje, a tým to preň končí.

  Čo vie: prepísať text a vymeniť fotku v blokoch označených data-obsah.
  Čo zámerne nevie: meniť poradie sekcií, pridávať bloky ani siahať na
  dizajn. Klient tak nemá ako web rozbiť.
*/
(async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

  const cfg = document.getElementById('edit-cfg');
  if (!cfg) return;
  const sb = createClient(cfg.dataset.url, cfg.dataset.kluc);

  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  // Právomoc overíme na serveri, nie podľa toho, čo si niekto prepíše v konzole.
  const { data: profil } = await sb.rpc('moje_pristupy');
  const ja = Array.isArray(profil) ? profil[0] : profil;
  const smie = ja && (ja.hlavny || (ja.pristupy || []).some((p) => p === '*' || p === 'obsah'));
  if (!smie) return;

  const bloky = () => [...document.querySelectorAll('[data-obsah]')];
  if (!bloky().length) return;

  let rezim = false;
  const zmeny = new Map(); // kluc -> { hodnota, typ }
  const povodne = new Map();

  /* ---------- panel ---------- */

  const panel = document.createElement('div');
  panel.className = 'ed-panel-web';
  panel.innerHTML = `
    <button type="button" class="ed-prepnut">Upraviť obsah</button>
    <span class="ed-info"></span>
    <span class="ed-akcie hidden">
      <button type="button" class="ed-ulozit">Uložiť zmeny</button>
      <button type="button" class="ed-zrusit">Zahodiť</button>
    </span>`;
  document.body.appendChild(panel);

  const $ = (s) => panel.querySelector(s);
  const info = $('.ed-info');

  const spocitaj = () => {
    const n = zmeny.size;
    info.textContent = !rezim ? ''
      : n === 0 ? 'Klikni do textu alebo na fotku a uprav ju.'
      : `${n} ${n === 1 ? 'zmena' : n < 5 ? 'zmeny' : 'zmien'} čaká na uloženie`;
    $('.ed-akcie').classList.toggle('hidden', n === 0);
  };

  /* ---------- výmena fotky ---------- */

  const vstupFoto = document.createElement('input');
  vstupFoto.type = 'file';
  vstupFoto.accept = 'image/*';
  vstupFoto.style.display = 'none';
  document.body.appendChild(vstupFoto);
  let ciel = null;

  /** Fotku zmenšíme v prehliadači, nech sa do úložiska nedostane 8 MB z mobilu. */
  function zmensi(file, max = 1800) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const m = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * m);
        c.height = Math.round(img.height * m);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('prevod zlyhal'))), 'image/webp', 0.85);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error('obrázok sa nepodarilo načítať'));
      img.src = URL.createObjectURL(file);
    });
  }

  vstupFoto.addEventListener('change', async () => {
    const file = vstupFoto.files[0];
    if (!file || !ciel) return;
    const kluc = ciel.dataset.obsah;
    info.textContent = 'Nahrávam fotku…';
    try {
      const blob = await zmensi(file);
      const cesta = `${kluc.replace(/\./g, '-')}-${Date.now()}.webp`;
      const { error } = await sb.storage.from('obsah-foto').upload(cesta, blob, { contentType: 'image/webp' });
      if (error) throw error;
      const url = sb.storage.from('obsah-foto').getPublicUrl(cesta).data.publicUrl;

      // srcset by inak prebil nový src a fotka by sa nezmenila.
      ciel.removeAttribute('srcset');
      ciel.src = url;
      zmeny.set(kluc, { hodnota: url, typ: 'obrazok' });
      spocitaj();
    } catch (e) {
      info.textContent = 'Fotku sa nepodarilo nahrať: ' + (e.message || e);
    }
    vstupFoto.value = '';
    ciel = null;
  });

  /* ---------- režim úprav ---------- */

  function zapni() {
    rezim = true;
    document.body.classList.add('ed-rezim');
    $('.ed-prepnut').textContent = 'Skončiť úpravy';

    for (const el of bloky()) {
      const kluc = el.dataset.obsah;
      if (el.dataset.obsahTyp === 'obrazok') {
        el.addEventListener('click', naFotku);
        continue;
      }
      povodne.set(kluc, el.innerHTML);
      el.setAttribute('contenteditable', 'plaintext-only');
      el.addEventListener('input', naText);
      el.addEventListener('paste', bezFormatovania);
    }
    spocitaj();
  }

  function vypni() {
    rezim = false;
    document.body.classList.remove('ed-rezim');
    $('.ed-prepnut').textContent = 'Upraviť obsah';
    for (const el of bloky()) {
      el.removeAttribute('contenteditable');
      el.removeEventListener('input', naText);
      el.removeEventListener('paste', bezFormatovania);
      el.removeEventListener('click', naFotku);
    }
    zmeny.clear();
    spocitaj();
  }

  function naFotku(e) {
    if (!rezim) return;
    e.preventDefault();
    ciel = e.currentTarget;
    vstupFoto.click();
  }

  function naText(e) {
    const el = e.currentTarget;
    const kluc = el.dataset.obsah;
    const text = el.innerText.trim();
    if (text === (povodne.get(kluc) ?? '').replace(/<br\s*\/?>/g, '\n').trim()) zmeny.delete(kluc);
    else zmeny.set(kluc, { hodnota: text, typ: 'text' });
    spocitaj();
  }

  /* Vložený text zo schránky nesie formátovanie aj cudzie značky.
     Berieme z neho iba holý text, inak by sa do stránky dostalo HTML z Wordu. */
  function bezFormatovania(e) {
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, t);
  }

  /* ---------- uloženie ---------- */

  $('.ed-prepnut').addEventListener('click', () => {
    if (rezim && zmeny.size && !confirm('Máš neuložené zmeny. Zahodiť ich?')) return;
    rezim ? (vypni(), location.reload()) : zapni();
  });

  $('.ed-zrusit').addEventListener('click', () => {
    if (!confirm('Zahodiť všetky neuložené zmeny?')) return;
    location.reload();
  });

  $('.ed-ulozit').addEventListener('click', async () => {
    const tlacidlo = $('.ed-ulozit');
    tlacidlo.disabled = true;
    info.textContent = 'Ukladám…';

    const stranka = location.pathname.replace(/\/$/, '') || '/';
    const riadky = [...zmeny.entries()].map(([kluc, z]) => ({
      kluc,
      hodnota: z.hodnota,
      typ: z.typ,
      stranka,
      upravil: session.user.email,
    }));

    const { error } = await sb.from('obsah').upsert(riadky, { onConflict: 'kluc' });
    tlacidlo.disabled = false;

    if (error) {
      info.textContent = 'Uloženie zlyhalo: ' + error.message;
      return;
    }
    info.textContent = 'Uložené. Načítavam stránku…';
    setTimeout(() => location.reload(), 700);
  });

  /* ---------- štýly ---------- */

  const styl = document.createElement('style');
  styl.textContent = `
    .ed-panel-web {
      position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
      z-index: 99999; display: flex; align-items: center; gap: 12px;
      max-width: calc(100vw - 24px); padding: 10px 14px;
      background: #16181c; border: 1px solid rgba(245,245,245,.16); border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,.5);
      font: 500 14px/1.4 system-ui, sans-serif; color: #f5f5f5;
    }
    .ed-panel-web button {
      font: inherit; font-weight: 650; cursor: pointer; white-space: nowrap;
      padding: 8px 15px; border-radius: 8px; border: 1px solid transparent;
      background: #f5f5f5; color: #0c0d0f;
    }
    .ed-panel-web .ed-zrusit, .ed-panel-web .ed-prepnut {
      background: none; color: rgba(245,245,245,.75); border-color: rgba(245,245,245,.18);
    }
    .ed-panel-web .ed-zrusit:hover, .ed-panel-web .ed-prepnut:hover { color: #fff; border-color: #fff; }
    .ed-panel-web .ed-info { font-size: 13px; color: rgba(245,245,245,.6); }
    .ed-panel-web .ed-akcie { display: flex; gap: 8px; }
    .ed-panel-web .hidden { display: none; }

    .ed-rezim [data-obsah] {
      outline: 1px dashed rgba(245,245,245,.35); outline-offset: 3px;
      transition: outline-color .15s ease;
    }
    .ed-rezim [data-obsah]:hover { outline-color: rgba(245,245,245,.8); }
    .ed-rezim [data-obsah]:focus { outline: 2px solid #f5f5f5; outline-offset: 3px; }
    .ed-rezim img[data-obsah] { cursor: pointer; }
    .ed-rezim img[data-obsah]:hover { outline-color: #fff; }

    @media (max-width: 640px) {
      .ed-panel-web { flex-wrap: wrap; justify-content: center; bottom: 10px; }
      .ed-panel-web .ed-info { width: 100%; text-align: center; order: 3; }
    }
  `;
  document.head.appendChild(styl);
})();
