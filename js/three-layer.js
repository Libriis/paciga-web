/* Paciga — 3D storytelling vrstva: pierko + svetelné častice (Three.js)
   Pierko letí stránkou podľa scroll progressu; častice tvoria tichý "prach v svetle".
   Vrstva je čisto dekoratívna: pointer-events none, vypína sa pri reduced-motion
   a bez WebGL — stránka funguje aj bez nej. */
import * as THREE from 'three';

(function () {
  'use strict';

  var DBG = window.__gl3d = { stage: 'start', frames: 0, err: null };

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { DBG.stage = 'reduced-motion'; return; }

  /* Viditeľný canvas je 2D — WebGL kreslíme bokom a kopírujeme doň.
     Obchádza to chybné skladanie priehľadných WebGL canvasov
     (Firefox + Windows/NVIDIA kompozítor skladá canvas ako čierny). */
  var canvas = document.createElement('canvas');
  canvas.id = 'gl3d';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx2d = canvas.getContext('2d');

  var glCanvas = document.createElement('canvas');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true });
    DBG.stage = 'renderer-ok';
  } catch (e) {
    DBG.stage = 'renderer-fail'; DBG.err = String(e && e.message);
    canvas.remove();
    return;
  }

  var isMobile = window.innerWidth < 900;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);

  function sizeAll() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(DPR);
    renderer.setSize(window.innerWidth, window.innerHeight);
    canvas.width = Math.round(window.innerWidth * DPR);
    canvas.height = Math.round(window.innerHeight * DPR);
  }
  sizeAll();
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 60);
  camera.position.z = 10;

  /* ---------- pierko ---------- */
  var feather = new THREE.Group();
  var featherMat = null;

  new THREE.TextureLoader().load('assets/feather.png', function (tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    var geo = new THREE.PlaneGeometry(2.6, 2.6, 24, 24);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.9) * 0.12 + Math.cos(y * 1.3) * 0.06);
    }
    featherMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0
    });
    var mesh = new THREE.Mesh(geo, featherMat);
    feather.add(mesh);
    DBG.stage = 'texture-ok';
  }, undefined, function (e) { DBG.stage = 'texture-fail'; DBG.err = String(e && (e.message || e.type)); });
  scene.add(feather);

  /* ---------- častice (prach v lúči svetla) ---------- */
  function makeSprite() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(232, 210, 160, 1)');
    grad.addColorStop(0.4, 'rgba(232, 210, 160, 0.35)');
    grad.addColorStop(1, 'rgba(232, 210, 160, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  var COUNT = isMobile ? 140 : 320;
  var pGeo = new THREE.BufferGeometry();
  var arr = new Float32Array(COUNT * 3);
  var speed = new Float32Array(COUNT);
  var phase = new Float32Array(COUNT);
  for (var i = 0; i < COUNT; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 16;
    arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 7;
    speed[i] = 0.05 + Math.random() * 0.12;
    phase[i] = Math.random() * Math.PI * 2;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  var pMat = new THREE.PointsMaterial({
    map: makeSprite(),
    size: 0.09,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  var particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* ---------- scroll choreografia pierka ----------
     p = celostránkový scroll progress 0..1 (vrátane pin dráh).
     Waypointy: pozícia/rotácia/scale/opacity — medzi nimi smoothstep. */
  var WP = [
    { p: 0.00, x:  3.4, y:  0.6, z: 0,    rx: 0.15, ry: -0.4, rz: -0.35, s: 1.05, o: 0.95 }, // hero — vpravo od textu
    { p: 0.06, x:  2.6, y: -0.4, z: 0.5,  rx: 0.3,  ry:  0.5, rz: -0.8,  s: 1.0,  o: 0.95 },
    { p: 0.12, x: -2.8, y:  0.3, z: -0.5, rx: 0.1,  ry:  1.6, rz: 0.4,   s: 0.85, o: 0.9  }, // quote — preletí doľava
    { p: 0.20, x: -3.6, y: -0.8, z: -1.5, rx: 0.4,  ry:  2.6, rz: 1.1,   s: 0.7,  o: 0.7  }, // nonstop
    { p: 0.30, x:  0.0, y:  2.1, z: -2,   rx: 0.2,  ry:  3.6, rz: 2.4,   s: 0.55, o: 0.6  }, // služby — malé, hore nad kartami
    { p: 0.44, x:  3.4, y:  1.6, z: -1,   rx: 0.5,  ry:  5.0, rz: 3.4,   s: 0.6,  o: 0.65 }, // koniec horizontály
    { p: 0.52, x:  4.6, y:  0.0, z: -3,   rx: 0.2,  ry:  6.3, rz: 4.0,   s: 0.45, o: 0.0  }, // fleet reveal — uhne a zmizne
    { p: 0.64, x: -3.9, y: -0.5, z: -1,   rx: 0.3,  ry:  7.6, rz: 4.9,   s: 0.7,  o: 0.75 }, // stats — vráti sa zľava
    { p: 0.74, x:  3.2, y:  0.4, z: 0,    rx: 0.15, ry:  8.8, rz: 5.6,   s: 0.85, o: 0.85 }, // pobočky
    { p: 0.86, x:  0.0, y:  0.2, z: 1.2,  rx: 0.1,  ry: 10.1, rz: 6.28,  s: 1.0,  o: 0.9  }, // opustili nás — stred, pomaly
    { p: 0.94, x:  0.0, y: -1.6, z: 0.8,  rx: 0.35, ry: 10.8, rz: 6.6,   s: 0.9,  o: 0.7  }, // cta — znáša sa dole
    { p: 1.00, x:  0.2, y: -3.4, z: 0,    rx: 0.5,  ry: 11.3, rz: 6.9,   s: 0.85, o: 0.0  }  // footer — dosadne a zmizne
  ];

  function smooth(t) { return t * t * (3 - 2 * t); }

  function sample(p) {
    if (p <= WP[0].p) return WP[0];
    if (p >= WP[WP.length - 1].p) return WP[WP.length - 1];
    var a, b, i;
    for (i = 0; i < WP.length - 1; i++) {
      if (p >= WP[i].p && p <= WP[i + 1].p) { a = WP[i]; b = WP[i + 1]; break; }
    }
    var t = smooth((p - a.p) / (b.p - a.p));
    var out = {};
    ['x', 'y', 'z', 'rx', 'ry', 'rz', 's', 'o'].forEach(function (k) {
      out[k] = a[k] + (b[k] - a[k]) * t;
    });
    return out;
  }

  /* ---------- vstupy: scroll + myš ---------- */
  var mouseX = 0, mouseY = 0, mx = 0, my = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  window.addEventListener('resize', function () {
    isMobile = window.innerWidth < 900;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    sizeAll();
  });

  function progress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    return h > 0 ? Math.min(Math.max((window.scrollY || 0) / h, 0), 1) : 0;
  }

  /* ---------- render loop ---------- */
  var clock = new THREE.Clock();
  var running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { clock.getDelta(); loop(); }
  });

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    DBG.frames++;

    var t = clock.getElapsedTime();
    var k = sample(progress());

    mx += (mouseX - mx) * 0.04;
    my += (mouseY - my) * 0.04;

    var mob = isMobile ? 0.72 : 1;

    // pierko: scroll keyframe + idle "padajúci list" mikropohyb + vplyv myši
    feather.position.set(
      k.x * mob + mx * 0.7 + Math.sin(t * 0.55) * 0.14,
      k.y + my * -0.45 + Math.sin(t * 0.85) * 0.1,
      k.z
    );
    feather.rotation.set(
      k.rx + Math.sin(t * 0.7) * 0.1 + my * 0.25,
      k.ry + mx * 0.35,
      k.rz + Math.sin(t * 0.5) * 0.14
    );
    var s = k.s * mob;
    feather.scale.set(s, s, s);
    if (featherMat) featherMat.opacity += (k.o - featherMat.opacity) * 0.08;

    // častice: pomalé klesanie + kolektívny drift, mierna väzba na scroll
    var posAttr = pGeo.attributes.position;
    for (var i = 0; i < COUNT; i++) {
      var y = posAttr.getY(i) - speed[i] * 0.016;
      if (y < -5.2) y = 5.2;
      posAttr.setY(i, y);
      posAttr.setX(i, posAttr.getX(i) + Math.sin(t * 0.35 + phase[i]) * 0.0012);
    }
    posAttr.needsUpdate = true;
    particles.rotation.y = Math.sin(t * 0.05) * 0.12 + mx * 0.05;

    renderer.render(scene, camera);

    // prekopíruj WebGL výsledok do 2D canvasu (spoľahlivá kompozícia)
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    ctx2d.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);
  }
  loop();
})();
