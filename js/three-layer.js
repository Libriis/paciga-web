/* Paciga — dekoratívna vrstva svetelných častíc (Three.js) — tichý "prach v svetle".
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
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  function sizeAll() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
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
  DBG.stage = 'particles-ok';

  /* ---------- vstupy: myš ---------- */
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

    mx += (mouseX - mx) * 0.04;
    my += (mouseY - my) * 0.04;

    // častice: pomalé klesanie + kolektívny drift, mierna väzba na myš
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
