/* Paciga — 3D finále sekvencie „Posledná cesta".
   Model limuzíny (GLB vygenerovaný z reálnej fotky) sa otáča podľa scrollu:
   main.js zapisuje window.__limoProgress (0..1), tento modul len kreslí.
   Desktop-only, lazy — GLB (~3,8 MB) sa sťahuje, až keď sa sekcia blíži. */
import * as THREE from 'three';
import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';

(function () {
  'use strict';

  var DBG = window.__limo3d = { stage: 'start', frames: 0, err: null };

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { DBG.stage = 'reduced-motion'; return; }
  if (window.innerWidth < 901) { DBG.stage = 'mobile-skip'; return; }

  var canvas = document.getElementById('limo-canvas');
  var pinEl = document.getElementById('fleet-pin');
  if (!canvas || !pinEl) { DBG.stage = 'no-dom'; return; }

  var inited = false;
  var visible = false;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      visible = en.isIntersecting;
      if (en.isIntersecting && !inited) { inited = true; init(); }
    });
  }, { rootMargin: '900px' });
  io.observe(pinEl);

  function init() {
    /* rovnaký kompozičný trik ako three-layer.js: WebGL bokom, kopírované do 2D canvasu */
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
    renderer.toneMappingExposure = 1.05;

    var scene = new THREE.Scene();
    /* jemná grafitová "studio" hmla v pozadí necháva model vyniknúť */
    scene.fog = new THREE.Fog(0x0c0d0f, 12, 26);

    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

    function size() {
      var w = pinEl.clientWidth || window.innerWidth;
      var h = pinEl.clientHeight || window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    size();
    window.addEventListener('resize', size);

    camera.position.set(0, 1.15, 8.2);
    camera.lookAt(0, 0.1, 0);

    scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x2a281f, 1.05));
    var key = new THREE.DirectionalLight(0xfff1d6, 1.7);
    key.position.set(4, 6, 3);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xd8b56e, 1.15);
    rim.position.set(-5, 2.5, -4);
    scene.add(rim);

    /* mäkký kruhový tieň pod autom */
    var sc = document.createElement('canvas');
    sc.width = sc.height = 256;
    var sg = sc.getContext('2d');
    var grad = sg.createRadialGradient(128, 128, 10, 128, 128, 126);
    grad.addColorStop(0, 'rgba(0,0,0,0.62)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 256, 256);
    var shadowTex = new THREE.CanvasTexture(sc);
    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 3.6),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    scene.add(shadow);

    var group = new THREE.Group();
    scene.add(group);

    new GLTFLoader().load('assets/limo3d.glb', function (gltf) {
      var model = gltf.scene;
      var box = new THREE.Box3().setFromObject(model);
      var sizeV = box.getSize(new THREE.Vector3());
      var scale = 4.5 / Math.max(sizeV.x, sizeV.z);
      model.scale.setScalar(scale);
      box.setFromObject(model);
      var center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      group.add(model);
      DBG.stage = 'model-ok';
    }, undefined, function (e) {
      DBG.stage = 'model-fail'; DBG.err = String(e && (e.message || e.type));
    });

    var clock = new THREE.Clock();
    function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      DBG.frames++;
      var p = Math.min(Math.max(window.__limoProgress || 0, 0), 1);
      var t = clock.getElapsedTime();
      /* scroll otáča autom zo zadného 3/4 pohľadu na predný */
      group.rotation.y = -0.95 + p * 1.55 + Math.sin(t * 0.4) * 0.012;
      camera.position.z = 8.2 - p * 0.9;
      camera.position.y = 1.15 + p * 0.1;
      camera.lookAt(0, 0.1, 0);
      renderer.render(scene, camera);
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);
    }
    loop();
  }
})();
