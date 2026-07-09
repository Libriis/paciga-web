/* Paciga — Kniha spomienok (Three.js).
   Kniha sa scrollom otvorí a prelistuje tri dvojstrany: šperky s odtlačkom,
   spomienkové karty, kondolencie. main.js zapisuje window.__bookProgress (0..1).
   Na mobile / bez WebGL sa nič nekreslí — CSS fallback (statické dvojstrany)
   zapína main.js triedou html.book-fallback. */
import * as THREE from 'three';

(function () {
  'use strict';

  var DBG = window.__book3d = { stage: 'start', frames: 0, err: null };

  if (document.documentElement.classList.contains('book-fallback')) { DBG.stage = 'fallback'; return; }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { DBG.stage = 'reduced-motion'; return; }
  if (window.innerWidth < 901) { DBG.stage = 'mobile-skip'; return; }

  var canvas = document.getElementById('book-canvas');
  var stage = document.getElementById('book-stage');
  var pinEl = document.getElementById('book-pin');
  if (!canvas || !stage || !pinEl) { DBG.stage = 'no-dom'; return; }

  var inited = false;
  var visible = false;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      visible = en.isIntersecting;
      if (en.isIntersecting && !inited) { inited = true; init(); }
    });
  }, { rootMargin: '900px' });
  io.observe(pinEl);

  function smooth(t) { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t); }

  /* ---------- kreslenie strán (papier + obsah, font Archivo zo stránky) ---------- */
  var PW = 1024, PH = 1332;

  function pageCanvas(paperImg, draw) {
    var c = document.createElement('canvas');
    c.width = PW; c.height = PH;
    var g = c.getContext('2d');
    if (paperImg) {
      g.drawImage(paperImg, 0, 0, PW, PH);
    } else {
      g.fillStyle = '#efe9dd';
      g.fillRect(0, 0, PW, PH);
    }
    draw(g);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function frameRect(g, x, y, w, h) {
    g.strokeStyle = 'rgba(150, 122, 62, 0.55)';
    g.lineWidth = 3;
    g.strokeRect(x, y, w, h);
  }

  function drawPhoto(g, img, x, y, w, h) {
    if (!img) return;
    var ir = img.width / img.height, fr = w / h;
    var sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ir > fr) { sw = img.height * fr; sx = (img.width - sw) / 2; }
    else { sh = img.width / fr; sy = (img.height - sh) / 2; }
    g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    frameRect(g, x - 1, y - 1, w + 2, h + 2);
  }

  function centered(g, text, y, font, color, spacing) {
    g.font = font;
    g.fillStyle = color;
    g.textAlign = 'center';
    if (spacing) {
      /* ručný letter-spacing pre verzálkové titulky */
      var total = 0, i;
      for (i = 0; i < text.length; i++) total += g.measureText(text[i]).width + spacing;
      var x = PW / 2 - total / 2;
      for (i = 0; i < text.length; i++) {
        g.textAlign = 'left';
        g.fillText(text[i], x, y);
        x += g.measureText(text[i]).width + spacing;
      }
      g.textAlign = 'center';
    } else {
      g.fillText(text, PW / 2, y);
    }
  }

  function bodyLines(g, lines, y0, lh) {
    g.font = '400 34px Archivo, sans-serif';
    g.fillStyle = 'rgba(40, 38, 32, 0.78)';
    g.textAlign = 'center';
    lines.forEach(function (ln, i) { g.fillText(ln, PW / 2, y0 + i * lh); });
  }

  function goldRule(g, y, w) {
    g.fillStyle = 'rgba(160, 128, 62, 0.8)';
    g.fillRect(PW / 2 - w / 2, y, w, 3);
  }

  /* ---------- inicializácia ---------- */
  function init() {
    var ctx2d = canvas.getContext('2d');
    var glCanvas = document.createElement('canvas');
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
      DBG.stage = 'renderer-ok';
    } catch (e) {
      DBG.stage = 'renderer-fail'; DBG.err = String(e && e.message);
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1.6, 0.1, 40);
    /* pohľad zhora-spredu (~40°), aby boli strany čitateľné, nie hrana knihy */
    camera.position.set(0, 5.0, 6.4);
    camera.lookAt(0, -0.5, 0);

    function size() {
      var r = stage.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      renderer.setPixelRatio(dpr);
      renderer.setSize(r.width, r.height);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    }
    size();
    window.addEventListener('resize', size);

    scene.add(new THREE.HemisphereLight(0xfff6e6, 0x1a1812, 1.25));
    var key = new THREE.PointLight(0xffe6b8, 70, 30, 1.9);
    key.position.set(2.0, 5.4, 2.6);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xd8b56e, 0.5);
    rim.position.set(-3, 1.5, -2);
    scene.add(rim);

    /* načítaj obrázky, potom postav knihu */
    var loader = new THREE.TextureLoader();
    var imgs = {};
    var toLoad = { cover: 'assets/book-cover.webp', paper: 'assets/paper.webp', sperk: 'assets/sperk.jpg', bokeh: 'assets/bokeh.webp' };
    var pending = Object.keys(toLoad).length + 1;

    function done() { if (--pending === 0) build(); }
    Object.keys(toLoad).forEach(function (k) {
      var im = new Image();
      im.onload = function () { imgs[k] = im; done(); };
      im.onerror = function () { imgs[k] = null; done(); };
      im.src = toLoad[k];
    });
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('650 84px Archivo'),
        document.fonts.load('400 34px Archivo'),
        document.fonts.load('600 44px Archivo')
      ]).then(done, done);
    } else { done(); }

    var group, cover, t1, t2;
    var W = 2.55, H = 3.4;

    function pagePlane(frontTex, backTex, w, h) {
      /* dvojstranná strana s pántom na x=0: predná rovina (normála +z)
         a zadná rovina otočená okolo vlastnej osi (normála -z, UV ostávajú
         korektné pri preklopení strany na ľavú stranu) */
      var grp = new THREE.Group();
      var geoF = new THREE.PlaneGeometry(w, h, 20, 1);
      geoF.translate(w / 2, 0, 0);
      var front = new THREE.Mesh(geoF, new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.92, metalness: 0 }));
      var geoB = new THREE.PlaneGeometry(w, h, 20, 1);
      geoB.rotateY(Math.PI);
      geoB.translate(w / 2, 0, 0);
      var back = new THREE.Mesh(geoB, new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.92, metalness: 0 }));
      grp.add(front);
      grp.add(back);
      return grp;
    }

    function build() {
      DBG.stage = 'build';

      var texCoverFront = pageCanvas(null, function (g) {
        /* z vygenerovanej fotky knihy berieme len plátno obalu (stred),
           nie čierne pozadie okolo */
        if (imgs.cover) g.drawImage(imgs.cover, 95, 235, 706, 840, 0, 0, PW, PH);
        else { g.fillStyle = '#23252a'; g.fillRect(0, 0, PW, PH); }
      });
      var texS1L = pageCanvas(imgs.paper, function (g) {
        goldRule(g, 476, 120);
        centered(g, 'KNIHA', 600, '650 96px Archivo, sans-serif', '#2b2924', 14);
        centered(g, 'SPOMIENOK', 700, '650 96px Archivo, sans-serif', '#2b2924', 14);
        goldRule(g, 760, 120);
        centered(g, 'Paciga · s úctou od roku 2018', 850, '400 30px Archivo, sans-serif', 'rgba(40,38,32,0.6)');
      });
      var texS1R = pageCanvas(imgs.paper, function (g) {
        drawPhoto(g, imgs.sperk, 152, 170, 720, 620);
        centered(g, '„Nikdy nezabudnem.“', 930, '600 52px Archivo, sans-serif', '#2b2924');
        bodyLines(g, ['Spomienkové šperky s gravírovaním', 'odtlačku prsta blízkeho človeka.'], 1010, 48);
      });
      var texS2L = pageCanvas(imgs.paper, function (g) {
        drawPhoto(g, imgs.bokeh, 152, 240, 720, 850);
      });
      var texS2R = pageCanvas(imgs.paper, function (g) {
        centered(g, 'Spomienkové karty', 330, '600 58px Archivo, sans-serif', '#2b2924');
        goldRule(g, 380, 90);
        bodyLines(g, [
          'Uctenie pamiatky a odkaz,',
          'ktorý si rodina ponechá.',
          '',
          'Pripravíme ich s citom,',
          'podľa vášho želania.'
        ], 480, 56);
      });
      var texS3L = pageCanvas(imgs.paper, function (g) {
        centered(g, 'Kondolencie', 330, '600 58px Archivo, sans-serif', '#2b2924');
        goldRule(g, 380, 90);
        bodyLines(g, ['Tichá spomienka', 'patrí všetkým.'], 480, 56);
        /* linajky kondolenčnej knihy */
        g.strokeStyle = 'rgba(90, 80, 58, 0.28)';
        g.lineWidth = 2;
        for (var i = 0; i < 5; i++) {
          g.beginPath();
          g.moveTo(190, 720 + i * 92);
          g.lineTo(PW - 190, 720 + i * 92);
          g.stroke();
        }
      });
      var texS3R = pageCanvas(imgs.paper, function (g) {
        centered(g, 'OPUSTILI NÁS', 620, '650 64px Archivo, sans-serif', '#2b2924', 10);
        goldRule(g, 680, 110);
        bodyLines(g, ['Zapáľte sviečku alebo', 'zanechajte odkaz rodine.'], 780, 52);
      });
      var texPaper = pageCanvas(imgs.paper, function () {});

      group = new THREE.Group();
      group.rotation.x = -0.1; /* kniha leží; hĺbku dodáva vysoká kamera */
      scene.add(group);

      /* zadná doska + blok strán */
      var backBoard = new THREE.Mesh(
        new THREE.BoxGeometry(W + 0.14, H + 0.14, 0.06),
        new THREE.MeshStandardMaterial({ map: texCoverFront, roughness: 0.85 })
      );
      backBoard.geometry.translate((W + 0.14) / 2 - 0.07, 0, 0);
      backBoard.rotation.x = -Math.PI / 2;
      backBoard.position.y = -0.09;
      group.add(backBoard);

      /* statická spodná pravá strana (posledná dvojstrana vpravo) */
      var base = new THREE.Mesh(
        new THREE.PlaneGeometry(W, H).translate(W / 2, 0, 0),
        new THREE.MeshStandardMaterial({ map: texS3R, roughness: 0.92 })
      );
      base.rotation.x = -Math.PI / 2;
      base.position.y = -0.045;
      group.add(base);

      /* listy: obal (vnútro = titulná strana), list 1, list 2 */
      cover = pagePlane(texCoverFront, texS1L, W + 0.1, H + 0.1);
      t1 = pagePlane(texS1R, texS2L, W, H);
      t2 = pagePlane(texS2R, texS3L, W, H);
      [cover, t1, t2].forEach(function (pg) {
        pg.rotation.x = -Math.PI / 2;           /* strany ležia vodorovne */
        group.add(pg);
      });

      DBG.stage = 'build-ok';
    }

    var clock = new THREE.Clock();
    function loop() {
      requestAnimationFrame(loop);
      if (!visible || !group) return;
      DBG.frames++;
      var p = Math.min(Math.max(window.__bookProgress || 0, 0), 1);
      var t = clock.getElapsedTime();

      /* intro: kniha sa nadýchne */
      var intro = smooth(p / 0.1);
      group.scale.setScalar(0.94 + intro * 0.06);
      group.position.y = -0.35 + intro * 0.15;
      group.rotation.z = Math.sin(t * 0.3) * 0.008;

      /* otváranie: obal → list 1 → list 2 (rotation.y = pánt, strany sa
         dvíhajú oblúkom nahor; poradie výšok sa počas otočenia vymení,
         aby otočený list pristál NAD skôr otočenými) */
      var cT = smooth((p - 0.10) / 0.24);
      var t1T = smooth((p - 0.42) / 0.22);
      var t2T = smooth((p - 0.68) / 0.22);
      if (cover) {
        cover.rotation.y = -cT * Math.PI * 0.99;
        t1.rotation.y = -t1T * Math.PI * 0.985;
        t2.rotation.y = -t2T * Math.PI * 0.98;
        cover.position.y = 0.045 - cT * 0.045;   /* najvyšší → po otočení najnižší vľavo */
        t1.position.y = 0.022;
        t2.position.y = t2T * 0.045;             /* najnižší → po otočení najvyšší vľavo */
        /* zatvorená kniha je vycentrovaná; otvorená sa centruje na chrbát */
        group.position.x = -(W / 2) * (1 - cT);
      }

      renderer.render(scene, camera);
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);
    }
    loop();
  }
})();
