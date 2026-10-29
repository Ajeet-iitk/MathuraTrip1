/* ============================================================
   BHAI, DHEERE CHALA! — a first-person Innova road-trip game
   Built with Three.js (r152, classic build)
   ============================================================ */
(() => {
  'use strict';

  if (!window.THREE) {
    document.body.innerHTML = '<div style="position:fixed;inset:0;display:grid;place-items:center;background:#0b0c0e;color:#ffb64a;font:700 18px system-ui;text-align:center;padding:30px">Three.js could not load.<br><span style="color:#d8c8b4;font-weight:400;font-size:13px">Keep three.min.js next to index.html and reload.</span></div>';
    return;
  }

  /* ------------------------------------------------------------
     DOM + helpers
  ------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const dom = {
    canvas: $('game-canvas'), hud: $('hud'), menu: $('menu'), pause: $('pause'), gameover: $('gameover'),
    menuBest: $('menuBest'), menuBest2: $('menuBest2'), startBtn: $('startBtn'),
    speedCluster: $('speedCluster'), speedValue: $('speedValue'), speedArc: $('speedArc'), gearValue: $('gearValue'), rpmBars: $('rpmBars'),
    stabilityFill: $('stabilityFill'), stabilityLabel: $('stabilityLabel'), gripFill: $('gripFill'), gripLine: $('gripLine'),
    destinationValue: $('destinationValue'), destinationBar: $('destinationBar'), odoValue: $('odoValue'), bestValue: $('bestValue'),
    quip: $('quip'), quipAvatar: $('quipAvatar'), quipName: $('quipName'), quipText: $('quipText'),
    toast: $('toast'), toastTitle: $('toastTitle'), toastText: $('toastText'),
    warning: $('warning'), lookbackHint: $('lookbackHint'), helpStrip: $('helpStrip'),
    speedFx: $('speedFx'), flash: $('flash'), countdown: $('countdown'), countdownText: $('countdownText'),
    pauseBtn: $('btnPause'), soundBtn: $('btnSound'), resumeBtn: $('resumeBtn'), restartBtn: $('restartBtn'),
    menuBtn: $('menuBtn'), retryBtn: $('retryBtn'), goMenuBtn: $('goMenuBtn'),
    goDistance: $('goDistance'), goTopSpeed: $('goTopSpeed'), goNearMisses: $('goNearMisses'), goSmooth: $('goSmooth'),
    goReason: $('goReason'), goBest: $('goBest'), dialogueStack: $('dialogueStack'),
    touch: $('touch-controls')
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, speed, dt) => lerp(a, b, 1 - Math.exp(-speed * dt));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fmt = (n, d = 1) => Number(n).toFixed(d);
  const setText = (el, v) => { if (el && el.textContent !== String(v)) el.textContent = String(v); };

  function loadBest() {
    try { return parseFloat(localStorage.getItem('bhaiDheereBest') || '0') || 0; } catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem('bhaiDheereBest', String(v)); } catch (e) {}
  }

  const FRIENDS = {
    ajeet:    { name: 'Ajeet',    cls: 'av-ajeet',    initial: 'A' },
    saurabh:  { name: 'Saurabh',  cls: 'av-saurabh',  initial: 'S' },
    shubham:  { name: 'Shubham',  cls: 'av-shubham',  initial: 'S' },
    abhishek: { name: 'Abhishek', cls: 'av-abhishek', initial: 'A' },
    sahil:    { name: 'Sahil',    cls: 'av-sahil',    initial: 'S' }
  };

  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  if (isTouch) document.body.classList.add('is-touch');

  /* ------------------------------------------------------------
     Renderer / scene / camera
  ------------------------------------------------------------ */
  const renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfb58e);
  scene.fog = new THREE.Fog(0xe6c3a1, 95, 520);

  const CAR_CENTER_Y = 0.92;
  const CAR_CAM_X = 0.55;
  const CAR_CAM_Y = 0.45;
  const CAR_CAM_Z = 0.17;
  const BASE_FOV = 68;
  const TRIP_SCALE = 10;

  const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.035, 1800);
  const crashCam = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.08, 1600);
  let activeCam = camera;

  const carRig = new THREE.Group();
  carRig.position.set(0, CAR_CENTER_Y, 0);
  scene.add(carRig);

  camera.position.set(CAR_CAM_X, CAR_CAM_Y, CAR_CAM_Z);
  camera.rotation.order = 'YXZ';
  camera.rotation.x = -0.035;
  carRig.add(camera);

  scene.add(crashCam);

  /* ------------------------------------------------------------
     Sky, sunlight, morning haze
  ------------------------------------------------------------ */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1100, 40, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x3f78ad) },
        horizonColor: { value: new THREE.Color(0xf4c99d) },
        lowColor: { value: new THREE.Color(0xd6a277) },
        sunColor: { value: new THREE.Color(0xffd8a0) }
      },
      vertexShader: `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 topColor, horizonColor, lowColor, sunColor;
        void main(){
          float h = clamp(vDir.y, -1.0, 1.0);
          vec3 col = h > 0.0
            ? mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.52))
            : mix(horizonColor, lowColor, clamp(-h * 4.0, 0.0, 1.0));
          vec3 sunDir = normalize(vec3(-0.55, 0.18, -0.82));
          float sd = max(dot(vDir, sunDir), 0.0);
          col += sunColor * pow(sd, 13.0) * 0.25;
          col += vec3(1.0, 0.76, 0.48) * pow(sd, 420.0) * 2.2;
          gl_FragColor = vec4(col, 1.0);
        }`
    })
  );
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xffe0bf, 0x4a5437, 1.22);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffd9ae, 2.25);
  sun.position.set(-62, 82, -48);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -32;
  sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32;
  sun.shadow.camera.bottom = -32;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 230;
  sun.shadow.bias = -0.00035;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight(0xb9d6ff, 0.38);
  fill.position.set(40, 30, 40);
  scene.add(fill);

  /* ------------------------------------------------------------
     Canvas texture helpers
  ------------------------------------------------------------ */
  const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  function makeCanvasTexture(w, h, draw, repeatX = 1, repeatY = 1) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = maxAniso;
    return tex;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* ------------------------------------------------------------
     Ground + highway
  ------------------------------------------------------------ */
  const asphaltTex = makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#686663';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const g = 65 + Math.random() * 45;
      ctx.fillStyle = `rgba(${g},${g},${g - 2},${0.14 + Math.random() * 0.25})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    ctx.strokeStyle = 'rgba(36,34,32,.28)';
    for (let i = 0; i < 8; i++) {
      ctx.lineWidth = 0.6 + Math.random();
      ctx.beginPath();
      const x = Math.random() * w, y = Math.random() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + rand(-25, 25), y + rand(8, 42));
      ctx.stroke();
    }
  }, 9, 170);

  const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, color: 0xb6b1ab, roughness: 0.96, metalness: 0.01 });

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    new THREE.MeshStandardMaterial({ color: 0x839350, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.055, -620);
  ground.receiveShadow = true;
  scene.add(ground);

  // dry field bands, deliberately low-detail and warm
  const fieldMatA = new THREE.MeshStandardMaterial({ color: 0x95a253, roughness: 1 });
  const fieldMatB = new THREE.MeshStandardMaterial({ color: 0xa9a355, roughness: 1 });
  const fieldMatC = new THREE.MeshStandardMaterial({ color: 0x647f43, roughness: 1 });
  [[-48, 0, 820, 110], [52, 0, 780, 78], [-150, 0, 1200, 170], [150, 0, 1200, 150]].forEach(([x, y, len, wid], i) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(wid, len), i % 2 ? fieldMatB : fieldMatA);
    f.rotation.x = -Math.PI / 2;
    f.position.set(x, -0.042, -len / 2 + 80);
    f.receiveShadow = true;
    scene.add(f);
  });

  const road = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 1450), asphaltMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -640);
  road.receiveShadow = true;
  scene.add(road);

  const oppositeRoad = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 1450), asphaltMat);
  oppositeRoad.rotation.x = -Math.PI / 2;
  oppositeRoad.position.set(15.2, 0, -640);
  oppositeRoad.receiveShadow = true;
  scene.add(oppositeRoad);

  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x9a8c74, roughness: 1 });
  [-7.25, 7.25].forEach(x => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1450), shoulderMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, -0.012, -640);
    s.receiveShadow = true;
    scene.add(s);
  });

  const median = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1450), new THREE.MeshStandardMaterial({ color: 0x718347, roughness: 1 }));
  median.rotation.x = -Math.PI / 2;
  median.position.set(7.98, -0.008, -640);
  scene.add(median);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf4e9cc });
  [-5.28, 5.28].forEach(x => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.014, 1450), lineMat);
    l.position.set(x, 0.022, -640);
    scene.add(l);
  });

  const dashes = [];
  const dashGeo = new THREE.BoxGeometry(0.14, 0.018, 3.25);
  [-1.77, 1.77].forEach(x => {
    for (let i = 0; i < 40; i++) {
      const d = new THREE.Mesh(dashGeo, lineMat);
      d.position.set(x, 0.027, 22 - i * 9);
      scene.add(d);
      dashes.push(d);
    }
  });

  // median / guard rails: long simple beams read well at speed
  const railMat = new THREE.MeshStandardMaterial({ color: 0x929896, metalness: 0.6, roughness: 0.42 });
  [[-7.05, 0.62], [7.02, 0.62], [15.45, 0.62]].forEach(([x, y]) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 1450), railMat);
    rail.position.set(x, y, -640);
    rail.castShadow = true;
    scene.add(rail);
    const rail2 = rail.clone();
    rail2.position.y = y - 0.26;
    scene.add(rail2);
  });

  const oncomingLaneCenters = [11.75, 15.2, 18.65];
  const laneCenters = [-3.5, 0, 3.5];

  /* ------------------------------------------------------------
     Materials palette
  ------------------------------------------------------------ */
  const MAT = {
    paint: new THREE.MeshStandardMaterial({ color: 0xedf0f2, metalness: 0.34, roughness: 0.3 }),
    paintShade: new THREE.MeshStandardMaterial({ color: 0xd2d8dd, metalness: 0.28, roughness: 0.4 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x14181b, roughness: 0.72 }),
    trimSoft: new THREE.MeshStandardMaterial({ color: 0x2b2f31, roughness: 0.85 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xc1ced6, metalness: 0.82, roughness: 0.18 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x91b5c8, transparent: true, opacity: 0.22, roughness: 0.08, metalness: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    tire: new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.95 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xa8b1b7, metalness: 0.75, roughness: 0.3 }),
    dash: new THREE.MeshStandardMaterial({ color: 0x252321, roughness: 0.87 }),
    dashSoft: new THREE.MeshStandardMaterial({ color: 0x332e29, roughness: 0.9 }),
    beige: new THREE.MeshStandardMaterial({ color: 0x796956, roughness: 0.92 }),
    beigeLight: new THREE.MeshStandardMaterial({ color: 0x9a8264, roughness: 0.94 }),
    skin1: new THREE.MeshStandardMaterial({ color: 0x9a6040, roughness: 0.85 }),
    skin2: new THREE.MeshStandardMaterial({ color: 0x7c4a31, roughness: 0.85 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.92 }),
    shirtBlue: new THREE.MeshStandardMaterial({ color: 0x336c8a, roughness: 0.9 }),
    shirtOrange: new THREE.MeshStandardMaterial({ color: 0xbc5a2f, roughness: 0.9 }),
    shirtGreen: new THREE.MeshStandardMaterial({ color: 0x4e7f53, roughness: 0.9 }),
    shirtPurple: new THREE.MeshStandardMaterial({ color: 0x615388, roughness: 0.9 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x294a5e, roughness: 0.9 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x3a0806, emissive: 0xff2b1b, emissiveIntensity: 1.8, roughness: 0.5 }),
    emissiveWarm: new THREE.MeshStandardMaterial({ color: 0x4b2c0b, emissive: 0xffc16a, emissiveIntensity: 1.15, roughness: 0.5 }),
    emissiveWhite: new THREE.MeshStandardMaterial({ color: 0x3d3a33, emissive: 0xfff1cf, emissiveIntensity: 1.25, roughness: 0.4 })
  };

  /* ------------------------------------------------------------
     Meshes / scenery
  ------------------------------------------------------------ */
  function addBox(parent, w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0, cast = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = cast;
    m.receiveShadow = cast;
    parent.add(m);
    return m;
  }

  function addCylinder(parent, rt, rb, h, seg, material, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  const movers = [];
  function addMover(obj, loop = 900) {
    obj.userData.loop = loop;
    scene.add(obj);
    movers.push(obj);
    return obj;
  }

  // shared tree pieces
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.27, 2.25, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b432d, roughness: 1 });
  const leafGeos = [
    new THREE.IcosahedronGeometry(1.45, 0),
    new THREE.IcosahedronGeometry(1.75, 0),
    new THREE.IcosahedronGeometry(1.1, 0)
  ];
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: 0x4e7438, roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x647f38, roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x3d663e, roughness: 1, flatShading: true })
  ];

  function makeTree(scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.12 * scale;
    trunk.scale.set(scale, scale, scale);
    trunk.castShadow = true;
    g.add(trunk);
    const crown = new THREE.Mesh(pick(leafGeos), pick(leafMats));
    crown.position.set(rand(-0.2, 0.2), 2.7 * scale, rand(-0.2, 0.2));
    crown.scale.set(scale * rand(0.85, 1.2), scale * rand(0.8, 1.15), scale * rand(0.85, 1.2));
    crown.castShadow = true;
    g.add(crown);
    if (Math.random() > 0.45) {
      const c2 = crown.clone();
      c2.material = pick(leafMats);
      c2.position.set(rand(-0.8, 0.8), rand(2.25, 2.9) * scale, rand(-0.5, 0.5));
      c2.scale.multiplyScalar(rand(0.55, 0.8));
      g.add(c2);
    }
    return g;
  }

  for (let i = 0; i < 62; i++) {
    const left = Math.random() < 0.63;
    const x = left ? rand(-9.5, -31) : rand(24, 48);
    const z = rand(-880, 22);
    const tree = makeTree(rand(0.7, 1.35));
    tree.position.set(x, 0, z);
    addMover(tree, 920);
  }

  // little shrubs along the median
  const shrubGeo = new THREE.IcosahedronGeometry(0.5, 0);
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x4d6a39, roughness: 1, flatShading: true });
  for (let i = 0; i < 46; i++) {
    const s = new THREE.Mesh(shrubGeo, shrubMat);
    s.position.set(7.95 + rand(-0.45, 0.45), 0.24, rand(-900, 25));
    s.scale.set(rand(0.7, 1.4), rand(0.5, 0.9), rand(0.7, 1.4));
    s.castShadow = true;
    addMover(s, 940);
  }

  // roadside reflective posts
  const postMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d0, roughness: 0.8 });
  const reflectorMat = new THREE.MeshStandardMaterial({ color: 0xff7a22, emissive: 0xff5a12, emissiveIntensity: 0.7, roughness: 0.4 });
  for (let i = 0; i < 34; i++) {
    const z = 10 - i * 27;
    [-6.55, 7.08, 15.1, 22].forEach(x => {
      const g = new THREE.Group();
      addBox(g, 0.09, 0.72, 0.09, postMat, 0, 0.36, 0, 0, 0, 0, false);
      addBox(g, 0.13, 0.13, 0.04, reflectorMat, 0, 0.64, 0.055, 0, 0, 0, false);
      g.position.set(x, 0, z + rand(-1.5, 1.5));
      addMover(g, 925);
    });
  }

  // electric poles
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x60574c, roughness: 0.95 });
  for (let i = 0; i < 15; i++) {
    const g = new THREE.Group();
    addCylinder(g, 0.09, 0.14, 7.4, 6, poleMat, 0, 3.7, 0);
    addBox(g, 1.65, 0.07, 0.09, poleMat, 0, 6.85, 0, 0, 0, 0, false);
    addBox(g, 0.08, 0.32, 0.08, MAT.trim, -0.68, 6.7, 0, 0, 0, 0, false);
    addBox(g, 0.08, 0.32, 0.08, MAT.trim, 0.68, 6.7, 0, 0, 0, 0, false);
    g.position.set(-10.7, 0, 15 - i * 62);
    addMover(g, 960);
  }

  function makeSignTexture(title, sub, bg = '#14684c', fg = '#fff8e5', accent = '#ffcb57') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = bg;
      roundRect(ctx, 10, 10, w - 20, h - 20, 28);
      ctx.fill();
      ctx.strokeStyle = fg;
      ctx.lineWidth = 13;
      roundRect(ctx, 35, 35, w - 70, h - 70, 20);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(60, 82, w - 120, 7);
      ctx.textAlign = 'center';
      ctx.fillStyle = fg;
      ctx.font = '900 126px Arial Black, Arial, sans-serif';
      ctx.fillText(title, w / 2, 258);
      ctx.font = '700 48px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.83)';
      ctx.fillText(sub, w / 2, 345);
      ctx.font = '700 29px Arial, sans-serif';
      ctx.fillStyle = accent;
      ctx.fillText('U P    H I G H W A Y S', w / 2, 421);
    });
  }

  function makeRoadSign(title, sub, x, z, bg, fg, accent, loop = 920) {
    const g = new THREE.Group();
    const pole = addCylinder(g, 0.07, 0.09, 2.1, 6, MAT.chrome, 0, 1.05, 0);
    pole.castShadow = false;
    const board = addBox(g, 3.25, 1.62, 0.1, MAT.trim, 0, 2.55, 0, 0, 0, 0, true);
    const tex = makeSignTexture(title, sub, bg, fg, accent);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.48), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(0, 2.55, 0.055);
    g.add(face);
    g.position.set(x, 0, z);
    addMover(g, loop);
    return g;
  }

  makeRoadSign('MATHURA', '84 KM', -9.7, -86, '#126249', '#fff7e2', '#ffd25e');
  makeRoadSign('VRINDAVAN', '62 KM', -9.7, -292, '#126249', '#fff7e2', '#ffd25e');
  makeRoadSign('DHABA', 'NEXT 2 KM', -9.7, -498, '#7f351e', '#fff7e2', '#ffcf69');
  makeRoadSign('AGRA', '120 KM', -9.7, -705, '#126249', '#fff7e2', '#ffd25e');

  // a cheeky private billboard
  (() => {
    const g = new THREE.Group();
    addCylinder(g, 0.1, 0.12, 2.6, 6, MAT.trim, -1.35, 1.3, 0);
    addCylinder(g, 0.1, 0.12, 2.6, 6, MAT.trim, 1.35, 1.3, 0);
    addBox(g, 3.6, 1.7, 0.12, MAT.trim, 0, 2.9, 0);
    const tex = makeCanvasTexture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#ffd34f'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#161616';
      ctx.font = '900 92px Arial Black, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BHAI,', w / 2, 152);
      ctx.fillStyle = '#b7331f';
      ctx.font = '900 146px Arial Black, Arial, sans-serif';
      ctx.fillText('DHEERE', w / 2, 295);
      ctx.fillStyle = '#161616';
      ctx.font = '900 120px Arial Black, Arial, sans-serif';
      ctx.fillText('CHALA!', w / 2, 430);
      ctx.strokeStyle = '#161616'; ctx.lineWidth = 14;
      ctx.strokeRect(16, 16, w - 32, h - 32);
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 1.58), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(0, 2.9, 0.075);
    g.add(face);
    g.position.set(-11.2, 0, -155);
    addMover(g, 930);
  })();

  // overhead gantry
  (() => {
    const g = new THREE.Group();
    addCylinder(g, 0.13, 0.18, 6.7, 8, MAT.chrome, -6.55, 3.35, 0);
    addCylinder(g, 0.13, 0.18, 6.7, 8, MAT.chrome, 6.55, 3.35, 0);
    addBox(g, 13.4, 2.2, 0.15, MAT.trim, 0, 6.2, 0);
    const tex = makeCanvasTexture(1400, 300, (ctx, w, h) => {
      ctx.fillStyle = '#0d5a42'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#f5ebd5'; ctx.lineWidth = 12; ctx.strokeRect(16, 16, w - 32, h - 32);
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff6e5';
      ctx.font = '900 68px Arial Black, Arial, sans-serif';
      ctx.fillText('MATHURA 84', 350, 123);
      ctx.fillText('VRINDAVAN 62', 920, 123);
      ctx.fillStyle = '#ffd25e';
      ctx.font = '700 43px Arial, sans-serif';
      ctx.fillText('AGRA 120    ·    KEEP LEFT    ·    NO HORNS', 700, 218);
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.02), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(0, 6.2, 0.09);
    g.add(face);
    g.position.set(0, 0, -332);
    addMover(g, 980);
  })();

  // dhaba and a little temple in the haze
  (() => {
    const d = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color: 0xd8c7a6, roughness: 0.95 });
    const roof = new THREE.MeshStandardMaterial({ color: 0x7b4c3d, roughness: 0.95 });
    addBox(d, 8.2, 2.9, 5.4, wall, 0, 1.45, 0);
    addBox(d, 9.3, 0.3, 6.5, roof, 0, 3.0, 0);
    addBox(d, 2.0, 2.2, 0.12, MAT.trim, 0, 1.35, 2.74);
    addBox(d, 5.0, 1.0, 0.12, MAT.trim, 0, 2.65, 2.77);
    const tex = makeCanvasTexture(1024, 256, (ctx, w, h) => {
      ctx.fillStyle = '#c03923'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 10; ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#fff1cf'; ctx.textAlign = 'center';
      ctx.font = '900 75px Arial Black, Arial, sans-serif';
      ctx.fillText('SHER-E-PUNJAB DHABA', w / 2, 112);
      ctx.fillStyle = '#ffd36b'; ctx.font = '700 36px Arial, sans-serif';
      ctx.fillText('CHAI · PARATHA · FULL FAMILY PACK', w / 2, 181);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.65), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(0, 2.9, 2.79);
    d.add(sign);
    for (let i = 0; i < 5; i++) addBox(d, 0.22, 0.22, 0.22, MAT.emissiveWarm, -3.3 + i * 1.6, 3.1, 2.82, 0, 0, 0, false);
    d.position.set(-17, 0, -238);
    addMover(d, 1100);

    const t = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0xd5a76e, roughness: 0.92 });
    addBox(t, 5.2, 1.2, 5.2, stone, 0, 0.6, 0);
    addBox(t, 3.2, 2.8, 3.2, stone, 0, 2.4, 0);
    addCylinder(t, 0.1, 1.35, 4.5, 4, stone, 0, 5.5, 0, 0, Math.PI / 4, 0);
    addCylinder(t, 0.03, 0.05, 2.2, 5, MAT.chrome, 0, 8.6, 0);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ color: 0xff7b25, side: THREE.DoubleSide }));
    flag.position.set(0.62, 9.25, 0);
    t.add(flag);
    t.position.set(-44, 0, -610);
    addMover(t, 1240);
  })();

  // drifting morning clouds
  const cloudTex = makeCanvasTexture(256, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(128, 64, 5, 128, 64, 120);
    g.addColorStop(0, 'rgba(255,250,238,.75)');
    g.addColorStop(0.5, 'rgba(255,244,228,.32)');
    g.addColorStop(1, 'rgba(255,244,228,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.44, depthWrite: false, fog: false });
  for (let i = 0; i < 11; i++) {
    const s = new THREE.Sprite(cloudMat.clone());
    s.material.opacity = rand(0.16, 0.4);
    s.position.set(rand(-320, 340), rand(55, 130), rand(-880, -380));
    s.scale.set(rand(95, 210), rand(25, 55), 1);
    scene.add(s);
  }

  /* ------------------------------------------------------------
     Road hazards: potholes and speed breakers
  ------------------------------------------------------------ */
  const potholes = [];
  const potholeMat = new THREE.MeshStandardMaterial({ color: 0x252320, roughness: 1 });
  const potholeRimMat = new THREE.MeshBasicMaterial({ color: 0x777064, transparent: true, opacity: 0.34 });
  for (let i = 0; i < 15; i++) {
    const g = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1, 15), potholeMat);
    hole.rotation.x = -Math.PI / 2;
    hole.scale.set(rand(0.55, 1.05), rand(0.3, 0.7), 1);
    g.add(hole);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.13, 18), potholeRimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.scale.copy(hole.scale);
    rim.position.y = 0.006;
    g.add(rim);
    g.position.set(pick(laneCenters) + rand(-0.7, 0.7), 0.03, rand(-650, 10));
    scene.add(g);
    potholes.push({ mesh: g, x: g.position.x, z: g.position.z, hit: false });
  }

  const breakerTex = makeCanvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d7b43f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#25221c';
    for (let i = -2; i < 10; i++) {
      ctx.save();
      ctx.translate(i * 74, 0);
      ctx.rotate(-0.55);
      ctx.fillRect(0, -40, 28, 220);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, w - 4, h - 4);
  });
  const breakerMat = new THREE.MeshStandardMaterial({ map: breakerTex, roughness: 0.85 });
  const speedBreakers = [];
  [-185, -435, -685].forEach((z, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.13, 1.35), breakerMat);
    m.position.set(0, 0.045, z);
    m.receiveShadow = true;
    scene.add(m);
    speedBreakers.push({ mesh: m, z, hit: false, warned: false });
  });

  /* ------------------------------------------------------------
     Road obstacles: barricades, drums, blocks and a fallen thela
  ------------------------------------------------------------ */
  const obstacles = [];
  const obstacleOrange = new THREE.MeshStandardMaterial({ color: 0xe45b1b, roughness: 0.72 });
  const obstacleWhite = new THREE.MeshStandardMaterial({ color: 0xf1e2c6, roughness: 0.84 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x988e80, roughness: 0.98 });
  const barrelRed = new THREE.MeshStandardMaterial({ color: 0xb84226, roughness: 0.62, metalness: 0.16 });
  const barrelBlue = new THREE.MeshStandardMaterial({ color: 0x39657d, roughness: 0.62, metalness: 0.16 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x785335, roughness: 0.95 });
  const caneMat = new THREE.MeshStandardMaterial({ color: 0x708b3d, roughness: 0.88 });

  function buildBarrierObstacle() {
    const g = new THREE.Group();
    addBox(g, 2.25, 0.5, 0.11, obstacleOrange, 0, 0.94, 0);
    for (let i = 0; i < 4; i++) {
      addBox(g, 0.2, 0.51, 0.12, obstacleWhite, -0.82 + i * 0.55, 0.94, 0.012, 0, 0, 0.18, false);
    }
    addBox(g, 0.11, 0.94, 0.11, MAT.chrome, -1.03, 0.48, 0);
    addBox(g, 0.11, 0.94, 0.11, MAT.chrome, 1.03, 0.48, 0);
    addBox(g, 0.5, 0.075, 0.46, MAT.trim, -1.03, 0.05, 0);
    addBox(g, 0.5, 0.075, 0.46, MAT.trim, 1.03, 0.05, 0);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), MAT.emissiveWarm);
    lamp.position.set(0.88, 1.27, 0.02);
    g.add(lamp);
    return { group: g, type: 'barrier', w: 2.3, l: 0.9, damage: 25, slow: 0.55, label: 'Roadwork barrier' };
  }

  function buildDrumsObstacle() {
    const g = new THREE.Group();
    [[-0.42, 0.02, barrelRed], [0.38, -0.2, barrelBlue], [0.05, 0.55, barrelRed]].forEach(([x, z, mat]) => {
      addCylinder(g, 0.31, 0.31, 0.86, 12, mat, x, 0.43, z);
      addCylinder(g, 0.32, 0.32, 0.065, 12, obstacleWhite, x, 0.61, z);
      addCylinder(g, 0.32, 0.32, 0.055, 12, obstacleWhite, x, 0.31, z);
    });
    return { group: g, type: 'drums', w: 1.5, l: 1.1, damage: 19, slow: 0.65, label: 'Oil drums' };
  }

  function buildBlocksObstacle() {
    const g = new THREE.Group();
    [-0.36, 0.36].forEach(x => addBox(g, 0.7, 0.52, 0.78, concreteMat, x, 0.26, 0));
    addBox(g, 0.56, 0.46, 0.62, concreteMat, 0.03, 0.75, 0.03);
    addBox(g, 1.58, 0.075, 0.84, obstacleOrange, 0, 1.0, 0);
    [-0.48, 0.12, 0.62].forEach(x => addBox(g, 0.22, 0.08, 0.85, obstacleWhite, x, 1.0, 0.005, 0, 0, 0, false));
    return { group: g, type: 'blocks', w: 1.62, l: 0.9, damage: 22, slow: 0.52, label: 'Cement blocks' };
  }

  function buildCartObstacle() {
    const g = new THREE.Group();
    addBox(g, 1.9, 0.14, 0.98, woodMat, 0, 0.85, 0);
    addBox(g, 0.07, 0.44, 0.98, woodMat, -0.94, 1.05, 0);
    addBox(g, 0.07, 0.44, 0.98, woodMat, 0.94, 1.05, 0);
    const wheelGeo = new THREE.TorusGeometry(0.33, 0.06, 5, 12);
    [-0.74, 0.74].forEach(x => {
      const wheel = new THREE.Mesh(wheelGeo, MAT.trim);
      wheel.position.set(x, 0.35, 0.18);
      wheel.rotation.y = Math.PI / 2;
      wheel.castShadow = true;
      g.add(wheel);
    });
    [-0.56, 0.56].forEach(x => addCylinder(g, 0.035, 0.035, 1.15, 5, woodMat, x, 0.98, 1.0, Math.PI / 2, 0, 0));
    for (let i = 0; i < 5; i++) {
      addCylinder(g, 0.035, 0.04, 1.55, 5, caneMat, -0.55 + i * 0.27, 1.12 + (i % 2) * 0.05, -0.1, 1.42, 0.1, 0.08);
    }
    return { group: g, type: 'cart', w: 2.1, l: 1.35, damage: 21, slow: 0.58, label: 'Fallen sabzi thela' };
  }

  const obstacleBuilders = [buildBarrierObstacle, buildDrumsObstacle, buildBlocksObstacle, buildCartObstacle];

  function resetObstacle(o, initial = false) {
    o.x = pick(laneCenters) + rand(-0.35, 0.35);
    if (initial) {
      o.z = -165 - obstacles.indexOf(o) * 92 + rand(-22, 22);
    } else {
      let tries = 0;
      do {
        o.z = rand(-780, -145);
        tries++;
      } while (tries < 8 && obstacles.some(other => other !== o && Math.abs(other.z - o.z) < 42));
    }
    o.hit = false;
    o.warned = false;
    o.knock = 0;
    o.knockT = 1;
    o.group.position.set(o.x, 0, o.z);
    o.group.rotation.set(0, rand(-0.09, 0.09), 0);
    o.group.scale.set(1, 1, 1);
  }

  for (let i = 0; i < 7; i++) {
    const o = (i < obstacleBuilders.length ? obstacleBuilders[i] : pick(obstacleBuilders))();
    o.group.traverse(m => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    scene.add(o.group);
    obstacles.push(o);
    resetObstacle(o, true);
  }

  /* ------------------------------------------------------------
     Traffic: trucks, buses, cars, tempos
  ------------------------------------------------------------ */
  function simpleWheel(g, x, z, radius = 0.36, width = 0.26) {
    const spin = new THREE.Group();
    spin.position.set(x, radius, z);
    g.add(spin);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), MAT.tire);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spin.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.53, radius * 0.53, width + 0.012, 12), MAT.rim);
    rim.rotation.z = Math.PI / 2;
    spin.add(rim);
    return spin;
  }

  const truckRearTex = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e7b53a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    for (let i = 0; i < 20; i++) ctx.fillRect(0, i * 26, w, 2);
    ctx.strokeStyle = '#b23a22'; ctx.lineWidth = 22; ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b7301c';
    ctx.font = '900 122px Arial Black, Arial, sans-serif';
    ctx.fillText('HORN', w / 2, 160);
    ctx.fillStyle = '#1f3a2d';
    ctx.fillText('OK', w / 2, 278);
    ctx.fillStyle = '#b7301c';
    ctx.fillText('PLEASE', w / 2, 397);
    ctx.fillStyle = '#24211a';
    ctx.font = '700 29px Arial, sans-serif';
    ctx.fillText('USE DIPPER AT NIGHT  ·  KEEP DISTANCE', w / 2, 462);
  });
  const truckRearMat = new THREE.MeshBasicMaterial({ map: truckRearTex });

  function buildTruck(color) {
    const g = new THREE.Group();
    const cargoMat = new THREE.MeshStandardMaterial({ color, roughness: 0.68 });
    const cabMat = new THREE.MeshStandardMaterial({ color: pick([0xe6e4dd, 0xd35a31, 0x2d6e8d]), roughness: 0.55 });
    addBox(g, 2.34, 2.35, 5.55, cargoMat, 0, 2.0, 0.55);
    addBox(g, 2.3, 0.28, 7.3, MAT.trim, 0, 0.72, 0.1);
    addBox(g, 2.22, 1.78, 1.95, cabMat, 0, 1.22, -2.92);
    addBox(g, 2.08, 0.6, 0.08, MAT.glass, 0, 1.58, -3.91);
    addBox(g, 2.28, 0.22, 0.18, MAT.chrome, 0, 0.58, -3.96);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(2.12, 1.9), truckRearMat);
    rear.position.set(0, 2.08, 3.335);
    g.add(rear);
    addBox(g, 2.1, 0.18, 0.14, MAT.trim, 0, 0.57, 3.4);
    addBox(g, 0.34, 0.2, 0.08, MAT.emissiveRed, -0.83, 0.83, 3.42, 0, 0, 0, false);
    addBox(g, 0.34, 0.2, 0.08, MAT.emissiveRed, 0.83, 0.83, 3.42, 0, 0, 0, false);
    addBox(g, 0.28, 0.2, 0.08, MAT.emissiveWhite, -0.78, 0.86, -4.0, 0, 0, 0, false);
    addBox(g, 0.28, 0.2, 0.08, MAT.emissiveWhite, 0.78, 0.86, -4.0, 0, 0, 0, false);
    simpleWheel(g, -1.02, -2.85, 0.39, 0.27);
    simpleWheel(g, 1.02, -2.85, 0.39, 0.27);
    simpleWheel(g, -1.02, 1.6, 0.39, 0.27);
    simpleWheel(g, 1.02, 1.6, 0.39, 0.27);
    simpleWheel(g, -1.02, 2.55, 0.39, 0.27);
    simpleWheel(g, 1.02, 2.55, 0.39, 0.27);
    addBox(g, 0.7, 0.35, 0.14, MAT.trim, 0, 1.02, 3.4);
    return { group: g, type: 'truck', w: 2.34, l: 7.4, min: 36, max: 50, weight: 31 };
  }

  const busRearTex = makeCanvasTexture(512, 400, (ctx, w, h) => {
    ctx.fillStyle = '#8c2b21'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3d88c'; ctx.fillRect(14, 14, w - 28, 74);
    ctx.fillStyle = '#5e1a14'; ctx.textAlign = 'center';
    ctx.font = '900 45px Arial Black, Arial, sans-serif';
    ctx.fillText('UP ROADWAYS', w / 2, 66);
    ctx.fillStyle = '#f9e5b5';
    ctx.font = '700 33px Arial, sans-serif';
    ctx.fillText('DELHI  →  MATHURA', w / 2, 145);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(50, 177, w - 100, 106);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 4;
    ctx.strokeRect(50, 177, w - 100, 106);
    ctx.fillStyle = '#f7d786';
    ctx.font = '900 56px Arial Black, Arial, sans-serif';
    ctx.fillText('MATHURA', w / 2, 334);
  });
  const busRearMat = new THREE.MeshBasicMaterial({ map: busRearTex });

  function buildBus(color) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
    addBox(g, 2.46, 2.65, 8.5, bodyMat, 0, 1.72, 0.15);
    addBox(g, 2.5, 0.42, 8.55, MAT.trim, 0, 0.55, 0.15);
    addBox(g, 2.42, 0.48, 8.36, MAT.dashSoft, 0, 0.9, 0.15);
    // side glass bands
    addBox(g, 0.05, 0.78, 7.1, MAT.glass, -1.245, 1.82, 0.18);
    addBox(g, 0.05, 0.78, 7.1, MAT.glass, 1.245, 1.82, 0.18);
    addBox(g, 2.16, 0.24, 7.7, MAT.chrome, 0, 3.07, 0.15);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(2.18, 1.7), busRearMat);
    rear.position.set(0, 2.05, 4.42);
    g.add(rear);
    addBox(g, 0.34, 0.24, 0.09, MAT.emissiveRed, -0.9, 0.82, 4.45, 0, 0, 0, false);
    addBox(g, 0.34, 0.24, 0.09, MAT.emissiveRed, 0.9, 0.82, 4.45, 0, 0, 0, false);
    addBox(g, 0.3, 0.23, 0.08, MAT.emissiveWhite, -0.84, 0.9, -4.24, 0, 0, 0, false);
    addBox(g, 0.3, 0.23, 0.08, MAT.emissiveWhite, 0.84, 0.9, -4.24, 0, 0, 0, false);
    simpleWheel(g, -1.08, -2.8, 0.48, 0.28);
    simpleWheel(g, 1.08, -2.8, 0.48, 0.28);
    simpleWheel(g, -1.08, 2.8, 0.48, 0.28);
    simpleWheel(g, 1.08, 2.8, 0.48, 0.28);
    return { group: g, type: 'bus', w: 2.46, l: 8.9, min: 44, max: 58, weight: 14 };
  }

  const carRearTex = makeCanvasTexture(512, 220, (ctx, w, h) => {
    ctx.fillStyle = '#1e2b31'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 7; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = 'rgba(167,215,239,.34)'; ctx.fillRect(32, 26, w - 64, h - 68);
    ctx.fillStyle = '#f5d7a0'; ctx.font = '700 28px Arial, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('MATHURA', w - 28, h - 24);
  });
  const carRearMat = new THREE.MeshBasicMaterial({ map: carRearTex });

  function buildCar(color, sporty = false) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.32 });
    addBox(g, 1.78, 0.58, 4.05, bodyMat, 0, 0.68, 0);
    addBox(g, 1.82, 0.16, 3.3, bodyMat, 0, 0.99, 0.05);
    addBox(g, 1.58, 0.68, 2.15, bodyMat, 0, 1.2, 0.18);
    addBox(g, 1.48, 0.42, 1.62, MAT.glass, 0, 1.29, 0.2);
    addBox(g, 0.05, 0.42, 1.42, MAT.glass, -0.8, 1.28, 0.2);
    addBox(g, 0.05, 0.42, 1.42, MAT.glass, 0.8, 1.28, 0.2);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.48), carRearMat);
    rear.position.set(0, 1.24, 1.97);
    g.add(rear);
    addBox(g, 1.82, 0.22, 0.16, MAT.trim, 0, 0.55, 2.02);
    addBox(g, 0.4, 0.17, 0.07, MAT.emissiveRed, -0.58, 0.79, 2.04, 0, 0, 0, false);
    addBox(g, 0.4, 0.17, 0.07, MAT.emissiveRed, 0.58, 0.79, 2.04, 0, 0, 0, false);
    addBox(g, 0.34, 0.16, 0.07, MAT.emissiveWhite, -0.61, 0.8, -2.04, 0, 0, 0, false);
    addBox(g, 0.34, 0.16, 0.07, MAT.emissiveWhite, 0.61, 0.8, -2.04, 0, 0, 0, false);
    addBox(g, 0.92, 0.16, 0.08, MAT.trim, 0, 0.66, -2.04);
    simpleWheel(g, -0.82, -1.3, 0.31, 0.22);
    simpleWheel(g, 0.82, -1.3, 0.31, 0.22);
    simpleWheel(g, -0.82, 1.28, 0.31, 0.22);
    simpleWheel(g, 0.82, 1.28, 0.31, 0.22);
    if (sporty) addBox(g, 1.2, 0.1, 0.3, MAT.trim, 0, 1.36, 1.95);
    return { group: g, type: 'car', w: 1.82, l: 4.2, min: 52, max: 73, weight: 35 };
  }

  const tempoRearTex = makeCanvasTexture(512, 380, (ctx, w, h) => {
    ctx.fillStyle = '#375b74'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e5d6b8'; ctx.lineWidth = 12; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#f5e7cc'; ctx.textAlign = 'center';
    ctx.font = '900 62px Arial Black, Arial, sans-serif';
    ctx.fillText('SUPER', w / 2, 145);
    ctx.fillText('TEMPO', w / 2, 220);
    ctx.fillStyle = '#f6c94d'; ctx.font = '700 29px Arial, sans-serif';
    ctx.fillText('GOODS · UP 85 · SAFAR', w / 2, 292);
  });
  const tempoRearMat = new THREE.MeshBasicMaterial({ map: tempoRearTex });

  function buildTempo(color) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    addBox(g, 2.0, 0.32, 5.2, MAT.trim, 0, 0.66, 0);
    addBox(g, 2.02, 1.9, 3.55, bodyMat, 0, 1.62, 0.75);
    addBox(g, 1.98, 1.35, 1.6, bodyMat, 0, 1.18, -2.03);
    addBox(g, 1.74, 0.54, 0.08, MAT.glass, 0, 1.42, -2.86);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.5), tempoRearMat);
    rear.position.set(0, 1.64, 2.54);
    g.add(rear);
    addBox(g, 0.3, 0.2, 0.08, MAT.emissiveRed, -0.72, 0.77, 2.56, 0, 0, 0, false);
    addBox(g, 0.3, 0.2, 0.08, MAT.emissiveRed, 0.72, 0.77, 2.56, 0, 0, 0, false);
    simpleWheel(g, -0.88, -1.9, 0.34, 0.24);
    simpleWheel(g, 0.88, -1.9, 0.34, 0.24);
    simpleWheel(g, -0.88, 1.68, 0.34, 0.24);
    simpleWheel(g, 0.88, 1.68, 0.34, 0.24);
    return { group: g, type: 'tempo', w: 2.02, l: 5.6, min: 42, max: 57, weight: 20 };
  }

  const trafficTemplates = [];
  ['#b53824', '#2e6590', '#d59c2f', '#4d7451', '#845a8b'].forEach(c => trafficTemplates.push(buildTruck(c)));
  ['#b34c2d', '#336f89'].forEach(c => trafficTemplates.push(buildBus(c)));
  ['#e7e5df', '#b53b2d', '#3d668e', '#777c7f', '#c1a34a'].forEach(c => trafficTemplates.push(buildCar(c, c === '#b53b2d')));
  ['#385b71', '#9d4e33'].forEach(c => trafficTemplates.push(buildTempo(c)));

  function weightedTemplate() {
    let total = 0;
    trafficTemplates.forEach(t => total += t.weight);
    let n = Math.random() * total;
    for (const t of trafficTemplates) { n -= t.weight; if (n <= 0) return t; }
    return trafficTemplates[0];
  }

  const traffic = [];
  const oncoming = [];
  let trafficSpawnCooldown = 0;

  function spawnTraffic(z = null) {
    const t = weightedTemplate();
    const g = t.group.clone(true);
    const lane = (Math.random() * 3) | 0;
    const x = laneCenters[lane] + rand(-0.12, 0.12);
    const speed = rand(t.min, t.max);
    const zz = z === null ? rand(-290, -120) : z;
    g.position.set(x, 0, zz);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    scene.add(g);
    const v = { group: g, type: t.type, x, lane, z: zz, mps: speed / 3.6, w: t.w, l: t.l, scored: false, wake: false, bob: Math.random() * 10 };
    traffic.push(v);
    return v;
  }

  for (let i = 0; i < 4; i++) spawnTraffic(-70 - i * 72);

  function makeOncoming() {
    const t = weightedTemplate();
    const g = t.group.clone(true);
    const lane = (Math.random() * 3) | 0;
    const x = oncomingLaneCenters[lane] + rand(-0.15, 0.15);
    const z = rand(-780, -60);
    g.position.set(x, 0, z);
    g.rotation.y = Math.PI;
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
    oncoming.push({ group: g, x, z, mps: rand(42, 64) / 3.6 });
  }
  for (let i = 0; i < 7; i++) makeOncoming();

  /* ------------------------------------------------------------
     The Innova: exterior, interior, passengers
  ------------------------------------------------------------ */
  const carBody = new THREE.Group();
  carBody.position.y = -CAR_CENTER_Y;
  carRig.add(carBody);

  const carWheels = [];
  let steeringWheelSpin = null;

  // lower body / shell
  addBox(carBody, 1.72, 0.24, 4.28, MAT.trim, 0, 0.44, 0);
  // Hollow side shells keep the exterior solid without filling the cabin with
  // giant white slabs that the first-person camera would see.
  [-1, 1].forEach(side => {
    addBox(carBody, 0.14, 0.57, 4.5, MAT.paint, side * 0.87, 0.76, 0);
    addBox(carBody, 0.16, 0.16, 4.44, MAT.paintShade, side * 0.87, 1.035, 0);
  });
  addBox(carBody, 1.62, 0.57, 0.34, MAT.paint, 0, 0.76, -2.08);
  addBox(carBody, 1.62, 0.57, 0.34, MAT.paint, 0, 0.76, 2.08);
  addBox(carBody, 1.94, 0.075, 4.1, MAT.trim, 0, 0.53, 0);
  addBox(carBody, 1.78, 0.14, 1.23, MAT.paint, 0, 1.075, -1.64, 0.025, 0, 0);
  addBox(carBody, 1.84, 0.42, 0.53, MAT.paint, 0, 0.84, -2.18);
  addBox(carBody, 1.68, 0.12, 2.92, MAT.paint, 0, 1.915, 0.14);
  addBox(carBody, 0.075, 0.065, 2.65, MAT.trim, -0.765, 1.99, 0.14);
  addBox(carBody, 0.075, 0.065, 2.65, MAT.trim, 0.765, 1.99, 0.14);

  // side glass + pillars (the camera sits inside this shell)
  const sideGlassZ = [-0.93, 0.02, 0.98];
  sideGlassZ.forEach((z, i) => {
    const len = i === 0 ? 0.76 : i === 1 ? 0.92 : 0.83;
    addBox(carBody, 0.022, 0.59, len, MAT.glass, -0.928, 1.48, z, 0, 0, 0, false);
    addBox(carBody, 0.022, 0.59, len, MAT.glass, 0.928, 1.48, z, 0, 0, 0, false);
    addBox(carBody, 0.04, 0.055, len + 0.03, MAT.trim, -0.94, 1.17, z);
    addBox(carBody, 0.04, 0.055, len + 0.03, MAT.trim, 0.94, 1.17, z);
  });

  [-1, 1].forEach(side => {
    const x = side * 0.912;
    addBox(carBody, 0.075, 0.88, 0.09, MAT.paintShade, x, 1.46, -1.3, -0.24, 0, 0);
    addBox(carBody, 0.075, 0.76, 0.09, MAT.trim, x, 1.47, 0.49, 0, 0, 0);
    addBox(carBody, 0.075, 0.75, 0.09, MAT.trim, x, 1.47, 1.46, 0, 0, 0);
    addBox(carBody, 0.055, 0.045, 2.55, MAT.chrome, x + side * 0.006, 1.105, 0.17);
  });

  // windshield, frame and wipers
  addBox(carBody, 1.66, 0.055, 0.1, MAT.trim, 0, 1.89, -1.31);
  addBox(carBody, 1.72, 0.07, 0.16, MAT.trimSoft, 0, 1.075, -1.29);
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.58, 0.76), MAT.glass);
  windshield.position.set(0, 1.48, -1.315);
  windshield.rotation.x = -0.02;
  carBody.add(windshield);

  const windDirtTex = makeCanvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = `rgba(205,190,158,${rand(0.025, 0.11)})`;
      ctx.beginPath();
      ctx.arc(rand(0, w), rand(0, h), rand(1, 8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(215,205,180,.06)';
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = rand(2, 7);
      ctx.beginPath();
      ctx.moveTo(rand(0, w), 0);
      ctx.quadraticCurveTo(rand(0, w), h * 0.5, rand(0, w), h);
      ctx.stroke();
    }
  });
  const windDirt = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.72), new THREE.MeshBasicMaterial({ map: windDirtTex, transparent: true, opacity: 0.54, depthWrite: false }));
  windDirt.position.set(0, 1.49, -1.305);
  carBody.add(windDirt);

  addBox(carBody, 0.035, 0.035, 0.62, MAT.trim, -0.36, 1.1, -1.37, 0.16, 0.12, -0.12, false);
  addBox(carBody, 0.035, 0.035, 0.56, MAT.trim, 0.27, 1.1, -1.37, 0.16, 0.12, -0.12, false);

  // hood shoulders + mirrors + handles
  [-1, 1].forEach(side => {
    addBox(carBody, 0.11, 0.15, 0.28, MAT.paint, side * 0.96, 1.37, -1.03);
    addBox(carBody, 0.09, 0.1, 0.15, MAT.trim, side * 1.015, 1.36, -1.03);
    addBox(carBody, 0.22, 0.12, 0.055, MAT.glass, side * 1.02, 1.38, -0.96, 0, 0, 0, false);
    addBox(carBody, 0.035, 0.055, 0.24, MAT.chrome, side * 0.945, 0.97, 0.46);
    addBox(carBody, 0.035, 0.055, 0.22, MAT.chrome, side * 0.945, 0.97, 1.4);
  });

  // front and rear details
  addBox(carBody, 1.92, 0.23, 0.14, MAT.trim, 0, 0.62, -2.44);
  addBox(carBody, 1.48, 0.17, 0.07, MAT.chrome, 0, 0.92, -2.445);
  addBox(carBody, 0.4, 0.16, 0.05, MAT.emissiveWhite, -0.63, 0.93, -2.45, 0, 0, 0, false);
  addBox(carBody, 0.4, 0.16, 0.05, MAT.emissiveWhite, 0.63, 0.93, -2.45, 0, 0, 0, false);
  addBox(carBody, 1.92, 0.24, 0.14, MAT.trim, 0, 0.6, 2.44);
  addBox(carBody, 0.33, 0.25, 0.05, MAT.emissiveRed, -0.7, 0.89, 2.45, 0, 0, 0, false);
  addBox(carBody, 0.33, 0.25, 0.05, MAT.emissiveRed, 0.7, 0.89, 2.45, 0, 0, 0, false);
  addBox(carBody, 0.88, 0.16, 0.08, MAT.chrome, 0, 0.64, 2.46);
  addBox(carBody, 0.035, 0.035, 0.22, MAT.trim, 0.88, 1.9, 0.75);
  addBox(carBody, 0.035, 0.035, 0.22, MAT.trim, -0.88, 1.9, 0.75);
  addBox(carBody, 0.06, 0.05, 2.9, MAT.trim, -0.94, 1.89, 0.14);
  addBox(carBody, 0.06, 0.05, 2.9, MAT.trim, 0.94, 1.89, 0.14);

  // rear hatch glass + India-style number plate
  addBox(carBody, 1.46, 0.48, 0.03, MAT.glass, 0, 1.51, 2.25, 0, 0, 0, false);
  const plateTex = makeCanvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f1efe3'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#171717'; ctx.lineWidth = 8; ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = '#171717'; ctx.textAlign = 'center';
    ctx.font = '900 66px Arial Black, Arial, sans-serif';
    ctx.fillText('UP 85 BHAI 001', w / 2, 87);
    ctx.fillStyle = '#1a4c9a'; ctx.fillRect(7, 7, 68, 30);
    ctx.fillStyle = '#fff'; ctx.font = '700 18px Arial, sans-serif'; ctx.fillText('IND', 41, 29);
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.18), new THREE.MeshBasicMaterial({ map: plateTex }));
  plate.position.set(0, 0.83, 2.462);
  carBody.add(plate);

  // wheels
  function makeWheel(x, z, steerable = false) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.38, z);
    carBody.add(pivot);
    const steer = new THREE.Group();
    pivot.add(steer);
    const spin = new THREE.Group();
    steer.add(spin);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 18), MAT.tire);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spin.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.272, 12), MAT.rim);
    rim.rotation.z = Math.PI / 2;
    spin.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.28, 10), MAT.chrome);
    hub.rotation.z = Math.PI / 2;
    spin.add(hub);
    carWheels.push({ steer, spin, steerable });
  }
  makeWheel(-0.85, -1.44, true);
  makeWheel(0.85, -1.44, true);
  makeWheel(-0.85, 1.45);
  makeWheel(0.85, 1.45);

  // interior floor, headliner, dashboard
  addBox(carBody, 1.7, 0.09, 3.9, MAT.dashSoft, 0, 0.36, 0.2);
  addBox(carBody, 1.58, 0.035, 2.85, MAT.beigeLight, 0, 1.84, 0.23);
  addBox(carBody, 1.77, 0.16, 0.52, MAT.dash, 0, 1.06, -0.95, 0.06, 0, 0);
  addBox(carBody, 1.72, 0.33, 0.31, MAT.dashSoft, 0, 0.82, -0.95);
  addBox(carBody, 1.5, 0.11, 0.26, MAT.trim, 0, 1.13, -0.99, 0.06, 0, 0);
  addBox(carBody, 0.3, 0.42, 1.1, MAT.dash, 0.03, 0.64, -0.1);
  addBox(carBody, 0.34, 0.12, 0.7, MAT.dashSoft, 0.03, 0.86, 0.1);

  // air vents / chrome trims
  [-0.55, -0.1, 0.35].forEach((x, i) => {
    addBox(carBody, 0.18, 0.08, 0.035, MAT.chrome, x, 1.06 - i * 0.002, -0.735, 0.06, 0, 0, false);
    addBox(carBody, 0.14, 0.04, 0.04, MAT.trim, x, 1.06, -0.72, 0.06, 0, 0, false);
  });
  addBox(carBody, 0.34, 0.11, 0.05, MAT.chrome, 0.55, 1.02, -0.71, 0.06, 0, 0, false);

  // little dashboard Ganesh / idol
  const idol = new THREE.Group();
  const idolMat = new THREE.MeshStandardMaterial({ color: 0xe06a27, roughness: 0.5, metalness: 0.1 });
  const idolGold = new THREE.MeshStandardMaterial({ color: 0xd8a537, roughness: 0.42, metalness: 0.45 });
  addCylinder(idol, 0.07, 0.1, 0.11, 8, idolGold, 0, 0.06, 0);
  const idolHead = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), idolMat);
  idolHead.position.y = 0.17; idolHead.scale.set(1, 1.1, 0.9); idol.add(idolHead);
  addCylinder(idol, 0.015, 0.035, 0.12, 6, idolGold, 0, 0.2, -0.065, 1.1, 0, 0);
  addBox(idol, 0.23, 0.025, 0.16, idolGold, 0, 0.005, 0);
  idol.position.set(0.12, 1.14, -0.91);
  carBody.add(idol);

  // steering wheel + hands
  const wheelTilt = new THREE.Group();
  wheelTilt.position.set(0.55, 1.06, -0.62);
  wheelTilt.rotation.x = -0.28;
  carBody.add(wheelTilt);
  steeringWheelSpin = new THREE.Group();
  wheelTilt.add(steeringWheelSpin);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.022, 8, 28), MAT.trim);
  steeringWheelSpin.add(wheelRim);
  addBox(steeringWheelSpin, 0.33, 0.026, 0.016, MAT.trimSoft, 0, 0, 0, 0, 0, 0, false);
  addBox(steeringWheelSpin, 0.026, 0.17, 0.016, MAT.trimSoft, 0, -0.075, 0, 0, 0, 0, false);
  const hornPad = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.025, 14), MAT.trimSoft);
  hornPad.rotation.x = Math.PI / 2;
  hornPad.position.z = -0.012;
  steeringWheelSpin.add(hornPad);
  addBox(carBody, 0.06, 0.06, 0.25, MAT.dash, 0.55, 0.98, -0.72, 0.4, 0, 0);

  function limb(a, b, radius, material) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, len, 7), material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = false;
    carBody.add(mesh);
    return mesh;
  }
  limb(new THREE.Vector3(0.27, 0.46, 0.3), new THREE.Vector3(0.39, 0.76, 0.02), 0.058, MAT.sleeve);
  limb(new THREE.Vector3(0.38, 0.78, 0.02), new THREE.Vector3(0.4, 1.03, -0.58), 0.043, MAT.skin1);
  limb(new THREE.Vector3(0.83, 0.46, 0.3), new THREE.Vector3(0.72, 0.77, 0.02), 0.058, MAT.sleeve);
  limb(new THREE.Vector3(0.72, 0.79, 0.02), new THREE.Vector3(0.7, 1.03, -0.58), 0.043, MAT.skin1);
  const handGeo = new THREE.SphereGeometry(0.055, 9, 7);
  const hand1 = new THREE.Mesh(handGeo, MAT.skin1); hand1.position.set(0.4, 1.045, -0.585); carBody.add(hand1);
  const hand2 = new THREE.Mesh(handGeo, MAT.skin1); hand2.position.set(0.7, 1.045, -0.585); carBody.add(hand2);

  carBody.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  /* ------------------------------------------------------------
     Seats and the four friends
  ------------------------------------------------------------ */
  function makeSeat(x, z, rear = false) {
    addBox(carBody, 0.55, 0.16, 0.56, MAT.beige, x, 0.56, z);
    addBox(carBody, 0.56, 0.78, 0.16, MAT.beige, x, 1.01, z + 0.34, -0.12, 0, 0);
    addBox(carBody, 0.34, 0.24, 0.1, MAT.beigeLight, x, 1.57, z + 0.42, -0.12, 0, 0);
    addBox(carBody, 0.06, 0.52, 0.04, MAT.trim, x + 0.29, 1.0, z + 0.22, -0.12, 0, 0, false);
  }
  makeSeat(-0.47, 0.88);
  makeSeat(0.47, 0.88);
  addBox(carBody, 1.55, 0.17, 0.62, MAT.beige, 0, 0.56, 1.92);
  addBox(carBody, 1.58, 0.76, 0.17, MAT.beige, 0, 1.0, 2.27, -0.08, 0, 0);
  addBox(carBody, 0.9, 0.22, 0.1, MAT.beigeLight, 0, 1.55, 2.35, -0.08, 0, 0);

  const passengerObjects = [];

  function makePassenger(opts) {
    const { x, z, shirt, skin, sleeping = false, tilt = 0, mustache = false, phase = rand(0, 10) } = opts;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    carBody.add(g);

    // torso and shoulders
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.58, 8), shirt);
    torso.position.y = 1.1;
    torso.scale.z = 0.72;
    torso.castShadow = true;
    g.add(torso);
    addBox(g, 0.48, 0.16, 0.32, shirt, 0, 1.34, 0, 0, 0, 0, false);

    // seat belt
    const belt = addBox(g, 0.055, 0.56, 0.025, MAT.trimSoft, 0.03, 1.11, -0.135, 0, 0, 0.42, false);

    // arms resting down
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 6), skin);
    armL.position.set(-0.25, 1.07, -0.005);
    armL.rotation.z = -0.34;
    armL.scale.z = 0.82;
    g.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.25; armR.rotation.z = 0.34;
    g.add(armR);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.51, -0.015);
    headGroup.rotation.z = tilt;
    g.add(headGroup);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 11), skin);
    head.scale.set(0.98, 1.08, 0.92);
    head.castShadow = true;
    headGroup.add(head);

    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.164, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.57), MAT.hair);
    hairCap.position.y = 0.013;
    hairCap.scale.set(1.01, 1.08, 1.0);
    headGroup.add(hairCap);
    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), MAT.hair);
    hairBack.position.set(0, 0.025, 0.08);
    hairBack.scale.set(0.95, 1.0, 0.72);
    headGroup.add(hairBack);

    // face, looking towards -z (towards the windscreen)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x15110e });
    if (sleeping) {
      [-0.058, 0.058].forEach(ex => {
        addBox(headGroup, 0.045, 0.012, 0.012, eyeMat, ex, 0.022, -0.148, 0, 0, ex < 0 ? 0.1 : -0.1, false);
      });
    } else {
      [-0.058, 0.058].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 7, 6), eyeMat);
        eye.position.set(ex, 0.025, -0.148);
        headGroup.add(eye);
      });
    }
    addBox(headGroup, 0.062, 0.011, 0.012, eyeMat, 0, -0.066, -0.145, 0, 0, 0, false);
    if (mustache) addBox(headGroup, 0.1, 0.021, 0.014, MAT.hair, 0, -0.037, -0.152, 0, 0, 0, false);
    const earGeo = new THREE.SphereGeometry(0.028, 7, 6);
    [-1, 1].forEach(s => {
      const ear = new THREE.Mesh(earGeo, skin);
      ear.position.set(s * 0.154, 0.0, 0.0);
      headGroup.add(ear);
    });

    passengerObjects.push({ group: g, head: headGroup, baseTilt: tilt, phase, sleeping });
    return g;
  }

  makePassenger({ x: -0.47, z: 0.89, shirt: MAT.shirtOrange, skin: MAT.skin1, mustache: true, phase: 0.4 });
  makePassenger({ x: 0.47, z: 0.89, shirt: MAT.shirtBlue, skin: MAT.skin2, phase: 2.1 });
  makePassenger({ x: -0.43, z: 1.91, shirt: MAT.shirtGreen, skin: MAT.skin1, sleeping: true, tilt: 0.3, phase: 4.2 });
  makePassenger({ x: 0.43, z: 1.91, shirt: MAT.shirtPurple, skin: MAT.skin2, sleeping: true, tilt: -0.28, phase: 5.7 });

  // tiny sleeping Zs
  const zTex = makeCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,245,219,.74)';
    ctx.font = '900 74px Arial Black, Arial, sans-serif';
    ctx.fillText('z', 28, 94);
    ctx.font = '900 46px Arial Black, Arial, sans-serif';
    ctx.fillText('z', 108, 45);
    ctx.font = '900 32px Arial Black, Arial, sans-serif';
    ctx.fillText('Z', 178, 104);
  });
  const zSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, opacity: 0.8, depthWrite: false }));
  zSprite.position.set(0.75, 1.78, 1.92);
  zSprite.scale.set(0.42, 0.21, 1);
  carBody.add(zSprite);

  /* ------------------------------------------------------------
     Instrument cluster + map screen (little canvases inside the car)
  ------------------------------------------------------------ */
  const clusterCanvas = document.createElement('canvas');
  clusterCanvas.width = 512; clusterCanvas.height = 256;
  const clusterCtx = clusterCanvas.getContext('2d');
  const clusterTex = new THREE.CanvasTexture(clusterCanvas);
  clusterTex.colorSpace = THREE.SRGBColorSpace;
  clusterTex.anisotropy = maxAniso;
  const clusterPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: clusterTex, toneMapped: false }));
  clusterPlane.position.set(0.55, 1.175, -0.745);
  clusterPlane.rotation.x = 0.02;
  carBody.add(clusterPlane);

  function drawCluster(speed, rpm) {
    const ctx = clusterCtx, w = 512, h = 256;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1012'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,188,90,.06)'; ctx.fillRect(0, 0, w, h);
    const dial = (cx, cy, r, frac, label, value) => {
      ctx.strokeStyle = 'rgba(255,255,255,.17)'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
      ctx.strokeStyle = frac > 0.75 ? '#ff5b44' : '#ffbf5e'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * frac); ctx.stroke();
      ctx.strokeStyle = '#f7ead2'; ctx.lineWidth = 4;
      const a = Math.PI * 0.75 + Math.PI * 1.5 * frac;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12)); ctx.stroke();
      ctx.fillStyle = '#f5e8d0'; ctx.textAlign = 'center';
      ctx.font = '900 34px Arial, sans-serif'; ctx.fillText(value, cx, cy + 43);
      ctx.fillStyle = 'rgba(225,210,186,.65)'; ctx.font = '700 16px Arial, sans-serif'; ctx.fillText(label, cx, cy + 67);
    };
    dial(150, 110, 78, clamp(speed / 120, 0, 1), 'KM/H', String(Math.round(speed)));
    dial(362, 110, 78, clamp(rpm, 0, 1), 'RPM', String(Math.round(rpm * 8)));
    ctx.fillStyle = '#ffbd5d'; ctx.textAlign = 'center'; ctx.font = '700 15px Arial, sans-serif';
    ctx.fillText('SAHIL  ·  MATHURA', 256, 228);
  }
  let lastClusterDraw = 0;

  const mapTex = makeCanvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#12251f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#18362d';
    for (let x = 0; x < w; x += 64) ctx.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 64) ctx.fillRect(0, y, w, 1);
    ctx.strokeStyle = '#ffc35b'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(75, 290); ctx.bezierCurveTo(110, 225, 95, 160, 190, 130); ctx.bezierCurveTo(278, 100, 290, 72, 416, 52); ctx.stroke();
    ctx.fillStyle = '#71e0c5'; ctx.beginPath(); ctx.arc(75, 290, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6a4c'; ctx.beginPath(); ctx.arc(416, 52, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3dc'; ctx.textAlign = 'left'; ctx.font = '900 30px Arial, sans-serif'; ctx.fillText('MATHURA', 275, 45);
    ctx.fillStyle = '#b8c8b9'; ctx.font = '700 19px Arial, sans-serif'; ctx.fillText('84 km · NH-19', 277, 73);
    ctx.fillStyle = '#71e0c5'; ctx.fillText('YOU', 88, 278);
  });
  const mapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.175), new THREE.MeshBasicMaterial({ map: mapTex, toneMapped: false }));
  mapScreen.position.set(0.06, 1.105, -0.862);
  mapScreen.rotation.y = -0.13;
  carBody.add(mapScreen);

  /* ------------------------------------------------------------
     Rear-view mirror with a live render target
  ------------------------------------------------------------ */
  const mirrorRT = new THREE.WebGLRenderTarget(384, 160, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  mirrorRT.texture.colorSpace = THREE.SRGBColorSpace;
  const mirrorMat = new THREE.MeshBasicMaterial({ map: mirrorRT.texture, toneMapped: false });
  const mirrorGroup = new THREE.Group();
  mirrorGroup.position.set(-0.02, 1.775, -1.08);
  mirrorGroup.rotation.x = -0.14;
  carBody.add(mirrorGroup);
  addBox(mirrorGroup, 0.42, 0.15, 0.035, MAT.trim, 0, 0, 0, 0, 0, 0, false);
  const mirrorPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.365, 0.108), mirrorMat);
  mirrorPlane.position.set(0, 0, 0.022);
  mirrorGroup.add(mirrorPlane);
  addBox(mirrorGroup, 0.42, 0.012, 0.05, MAT.trimSoft, 0, -0.075, 0, 0, 0, 0, false);
  addBox(carBody, 0.025, 0.12, 0.025, MAT.trim, -0.02, 1.86, -1.065, 0, 0, 0, false);

  const mirrorCam = new THREE.PerspectiveCamera(52, 2.4, 0.04, 18);
  mirrorCam.position.set(-0.02, 1.68 - CAR_CENTER_Y, -0.98);
  mirrorCam.rotation.y = Math.PI;
  carRig.add(mirrorCam);

  // dome light - makes the rear seats readable in the mirror
  const dome = new THREE.PointLight(0xffd9a7, 0.52, 4.2);
  dome.position.set(0, 1.72, 0.7);
  carRig.add(dome);
  const domeBulb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.09), MAT.emissiveWarm);
  domeBulb.position.set(0, 1.82, 0.42);
  carBody.add(domeBulb);

  /* ------------------------------------------------------------
     Dust particles
  ------------------------------------------------------------ */
  const dustTex = makeCanvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
    g.addColorStop(0, 'rgba(235,213,178,.8)');
    g.addColorStop(0.45, 'rgba(214,190,151,.42)');
    g.addColorStop(1, 'rgba(206,180,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  const DUST_MAX = 260;
  const dustPositions = new Float32Array(DUST_MAX * 3);
  const dustVel = new Float32Array(DUST_MAX * 3);
  const dustLife = new Float32Array(DUST_MAX);
  for (let i = 0; i < DUST_MAX; i++) { dustPositions[i * 3 + 1] = -999; }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({ map: dustTex, color: 0xd8b98d, size: 0.68, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  scene.add(dustPoints);
  let dustHead = 0;
  let dustAge = 0;

  function burstDust(x, y, z, count = 30, power = 1) {
    for (let i = 0; i < count; i++) {
      const idx = dustHead++ % DUST_MAX;
      dustPositions[idx * 3] = x + rand(-0.8, 0.8);
      dustPositions[idx * 3 + 1] = y + rand(0, 0.55);
      dustPositions[idx * 3 + 2] = z + rand(-1.6, 1.6);
      const angle = rand(0, Math.PI * 2);
      const sp = rand(0.2, 1.7) * power;
      dustVel[idx * 3] = Math.cos(angle) * sp;
      dustVel[idx * 3 + 1] = rand(0.2, 1.3) * power;
      dustVel[idx * 3 + 2] = Math.sin(angle) * sp;
      dustLife[idx] = rand(0.7, 2.0);
    }
    dustAge = Math.max(dustAge, 0.4);
  }

  function updateDust(dt) {
    let any = false;
    for (let i = 0; i < DUST_MAX; i++) {
      if (dustLife[i] <= 0) continue;
      any = true;
      dustLife[i] -= dt;
      dustVel[i * 3 + 1] -= dt * 0.55;
      dustPositions[i * 3] += dustVel[i * 3] * dt;
      dustPositions[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
      dustPositions[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
      if (dustLife[i] <= 0) dustPositions[i * 3 + 1] = -999;
    }
    dustAge = Math.max(0, dustAge - dt);
    dustMat.opacity = any ? clamp(dustAge * 1.15, 0, 0.72) : 0;
    dustGeo.attributes.position.needsUpdate = true;
  }

  /* ------------------------------------------------------------
     Audio: a tiny procedural engine + horns + crashes
  ------------------------------------------------------------ */
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.ready = false;
      this.muted = false;
      this.engine = null;
      this.noiseBuffer = null;
    }
    init() {
      if (this.ready) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        const master = this.ctx.createGain();
        master.gain.value = 0.42;
        master.connect(this.ctx.destination);
        this.master = master;

        const noiseLen = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buf;

        const engGain = this.ctx.createGain();
        engGain.gain.value = 0;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 1.4;
        engGain.connect(lp);
        lp.connect(master);
        const osc1 = this.ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = 55;
        const osc2 = this.ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = 28;
        const g1 = this.ctx.createGain(); g1.gain.value = 0.55;
        const g2 = this.ctx.createGain(); g2.gain.value = 0.38;
        osc1.connect(g1); g1.connect(engGain);
        osc2.connect(g2); g2.connect(engGain);
        osc1.start(); osc2.start();

        const windSrc = this.ctx.createBufferSource();
        windSrc.buffer = buf; windSrc.loop = true;
        const windFilter = this.ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 900; windFilter.Q.value = 0.45;
        const windGain = this.ctx.createGain(); windGain.gain.value = 0;
        windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
        windSrc.start();

        this.engine = { gain: engGain, osc1, osc2, wind: windGain };
        this.ready = true;
      } catch (e) { this.ready = false; }
    }
    update(speed, throttle, brake, active) {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const eng = this.engine;
      const rpm = clamp(0.15 + speed / 120 * 0.85, 0.12, 1);
      const f = 40 + rpm * 82 + (throttle ? 7 : 0) + (brake ? 2 : 0);
      eng.osc1.frequency.setTargetAtTime(f, t, 0.08);
      eng.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.1);
      const gain = active ? 0.028 + rpm * 0.034 + (throttle ? 0.012 : 0) : 0;
      eng.gain.gain.setTargetAtTime(gain, t, 0.14);
      eng.wind.gain.setTargetAtTime(active ? Math.max(0, speed - 25) / 100 * 0.025 : 0, t, 0.15);
    }
    setMuted(m) {
      this.muted = m;
      if (this.ready) this.master.gain.setTargetAtTime(m ? 0 : 0.42, this.ctx.currentTime, 0.05);
    }
    horn() {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
      g.gain.setValueAtTime(0.13, t + 0.26);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
      g.connect(this.master);
      [440, 554].forEach(f => {
        const o = this.ctx.createOscillator();
        o.type = 'square'; o.frequency.value = f;
        o.connect(g); o.start(t); o.stop(t + 0.48);
      });
    }
    thud() {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(80, t);
      o.frequency.exponentialRampToValueAtTime(27, t + 0.35);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.5);
    }
    whoosh() {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1600, t + 0.4);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.55);
    }
    crash() {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(180, t + 1.1);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + 2.2);
      const o = this.ctx.createOscillator(); const og = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(22, t + 1.2);
      og.gain.setValueAtTime(0.38, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(og); og.connect(this.master); o.start(t); o.stop(t + 1.5);
      [0.55, 0.62, 0.71].forEach((delay, i) => {
        const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuffer;
        const hf = this.ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 1500 + i * 600;
        const hg = this.ctx.createGain(); hg.gain.setValueAtTime(0.0001, t + delay); hg.gain.exponentialRampToValueAtTime(0.13, t + delay + 0.01); hg.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.15);
        s.connect(hf); hf.connect(hg); hg.connect(this.master); s.start(t + delay); s.stop(t + delay + 0.2);
      });
    }
    chime(up = true) {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(up ? 520 : 380, t); o.frequency.exponentialRampToValueAtTime(up ? 780 : 240, t + 0.18);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.055, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.25);
    }
  }
  const audio = new SoundEngine();

  /* ------------------------------------------------------------
     Game state + UI glue
  ------------------------------------------------------------ */
  const game = {
    mode: 'menu', paused: false,
    speed: 42, carX: 0, steer: 0, stability: 100, grip: 100,
    distance: 0, topSpeed: 42, nearMisses: 0, smoothTime: 0,
    elapsed: 0, chaos: 0, time: 0,
    roll: 0, pitch: 0, yaw: 0, shake: 0, jolt: 0, wobble: 0, wind: 0,
    lookBack: 0, brakeHold: 0, gear: 4, rpm: 0.45,
    eventTimer: 8, quipTimer: 0, toastTimer: 0, flashTimer: 0,
    toppleT: 0, toppleDir: 1, impactReason: '', gameOverShown: false,
    best: loadBest(), gripActive: false, started: false,
    lastHitToast: 0, speedbreakerWarnCooldown: 0, nextMilestone: 10,
    lastObstacleWarn: -10, tipTimer: 0, lastTipWarn: -10,
    lastQuip: 0, countdownTimers: []
  };

  const keys = new Set();
  const touch = { left: false, right: false, accel: false, brake: false, grip: false };
  let quipTimerId = null;
  let toastTimerId = null;
  let flashTimerId = null;
  let countdownIds = [];

  function avatarEl(who) {
    const info = FRIENDS[who] || FRIENDS.ajeet;
    const el = document.createElement('div');
    el.className = 'avatar ' + info.cls;
    el.textContent = info.initial;
    return el;
  }

  function showQuip(who, text, duration = 4200) {
    const info = FRIENDS[who] || FRIENDS.ajeet;
    dom.quipAvatar.className = 'avatar ' + info.cls;
    dom.quipAvatar.textContent = info.initial;
    dom.quipName.textContent = info.name;
    dom.quipText.textContent = text;
    dom.quip.classList.add('show');
    clearTimeout(quipTimerId);
    quipTimerId = setTimeout(() => dom.quip.classList.remove('show'), duration);
  }

  function hideQuip() {
    clearTimeout(quipTimerId);
    dom.quip.classList.remove('show');
  }

  function toast(title, text, duration = 2600) {
    dom.toastTitle.textContent = title;
    dom.toastText.textContent = text;
    dom.toast.classList.add('show');
    clearTimeout(toastTimerId);
    toastTimerId = setTimeout(() => dom.toast.classList.remove('show'), duration);
  }

  function hideToast() {
    clearTimeout(toastTimerId);
    dom.toast.classList.remove('show');
  }

  function flashScreen(kind = '', duration = 150) {
    dom.flash.className = 'flash' + (kind ? ' ' + kind : '');
    void dom.flash.offsetWidth;
    dom.flash.classList.add('pop');
    clearTimeout(flashTimerId);
    flashTimerId = setTimeout(() => dom.flash.classList.remove('pop'), duration);
  }

  function updateBestLabels() {
    const b = game.best > 0 ? fmt(game.best, 1) + ' km' : '0.0 km';
    dom.menuBest.textContent = b.toUpperCase();
    dom.menuBest2.textContent = b;
    dom.bestValue.textContent = fmt(game.best, 1);
    dom.goBest.textContent = fmt(Math.max(game.best, game.distance), 1).toUpperCase() + ' KM';
  }

  function setHudVisible(show) {
    dom.hud.classList.toggle('is-hidden', !show);
    dom.hud.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (dom.touch) dom.touch.classList.toggle('is-hidden', !show || !isTouch);
  }

  const CRASH_QUOTES = [
    { who: ['ajeet'], text: 'Abhi to meri shadi bhi nhi hui!', translation: 'I haven\'t even gotten married yet!' },
    { who: ['shubham', 'abhishek'], text: 'Kya hua tha bhai, hum to so rhe the.', translation: 'What happened, bro? We were sleeping.' },
    { who: ['saurabh'], text: 'Maine bola tha Sahil... dheere chala.', translation: 'I told you, Sahil... drive slowly.' },
    { who: ['ajeet'], text: 'Ab auto se Mathura jaana padega.', translation: 'Now we\'ll have to take an auto to Mathura.' },
    { who: ['sahil'], text: 'Sorry yaar... ek second ke liye dhyaan hat gaya.', translation: 'Sorry, guys... I looked away for one second.' }
  ];

  function addDialogueCard(q, index) {
    const card = document.createElement('div');
    card.className = 'say';
    card.style.animationDelay = (0.35 + index * 0.72) + 's';
    const avWrap = document.createElement('div');
    avWrap.style.display = 'flex';
    avWrap.style.flexDirection = 'column';
    avWrap.style.gap = '2px';
    q.who.forEach(w => avWrap.appendChild(avatarEl(w)));
    const body = document.createElement('div');
    body.className = 'say-body';
    const name = q.who.map(w => FRIENDS[w].name).join(' & ');
    body.innerHTML = `<b>${name}</b><p>${q.text}</p><small>${q.translation}</small>`;
    card.append(avWrap, body);
    dom.dialogueStack.appendChild(card);
  }

  function renderCrashDialogues() {
    dom.dialogueStack.innerHTML = '';
    CRASH_QUOTES.forEach((q, i) => addDialogueCard(q, i));
  }

  function clearTransientUI() {
    hideQuip();
    hideToast();
    dom.warning.classList.remove('show');
    dom.lookbackHint.classList.remove('show');
    document.body.classList.remove('danger');
    dom.speedFx.style.opacity = 0;
    dom.flash.classList.remove('pop');
  }

  /* ------------------------------------------------------------
     Input
  ------------------------------------------------------------ */
  const interactiveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyH', 'KeyP', 'KeyM', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Enter'];
  window.addEventListener('keydown', (e) => {
    if (interactiveKeys.includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;

    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (game.mode === 'playing') togglePause();
    }
    if (e.code === 'KeyH' && game.mode === 'playing') audio.horn();
    if ((e.code === 'Enter' || e.code === 'KeyR') && game.mode === 'gameover') startRun();
    if (e.code === 'Enter' && game.mode === 'menu') startRun();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  function setTouchControl(control, down) {
    if (control in touch) touch[control] = down;
  }
  document.querySelectorAll('[data-control]').forEach(btn => {
    const c = btn.getAttribute('data-control');
    const down = (e) => { e.preventDefault(); setTouchControl(c, true); btn.classList.add('on'); };
    const up = (e) => { e.preventDefault(); setTouchControl(c, false); btn.classList.remove('on'); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });

  function readInput() {
    const left = keys.has('KeyA') || keys.has('ArrowLeft') || touch.left;
    const right = keys.has('KeyD') || keys.has('ArrowRight') || touch.right;
    const accel = keys.has('KeyW') || keys.has('ArrowUp') || touch.accel;
    const brake = keys.has('KeyS') || keys.has('ArrowDown') || touch.brake;
    const grip = keys.has('Space') || touch.grip;
    const look = keys.has('KeyC');
    return { steer: (right ? 1 : 0) - (left ? 1 : 0), accel, brake, grip, look };
  }

  function toggleMute() {
    audio.setMuted(!audio.muted);
    dom.soundBtn.classList.toggle('off', audio.muted);
    dom.soundBtn.textContent = audio.muted ? 'MUTED' : 'SOUND';
  }

  /* ------------------------------------------------------------
     World motion, traffic, hazards
  ------------------------------------------------------------ */
  function updateDashes(mps, dt) {
    for (let i = 0; i < dashes.length; i++) {
      const d = dashes[i];
      d.position.z += mps * dt;
      if (d.position.z > 28) d.position.z -= 360;
    }
  }

  function updateMovers(mps, dt) {
    for (let i = 0; i < movers.length; i++) {
      const m = movers[i];
      m.position.z += mps * dt;
      if (m.position.z > 38) m.position.z -= m.userData.loop || 900;
    }
  }

  function spawnTrafficIfNeeded(active) {
    const desired = active ? 3 + Math.floor(game.chaos * 3) : 3;
    trafficSpawnCooldown -= 1 / 60;
    if (traffic.length < desired && trafficSpawnCooldown <= 0) {
      spawnTraffic();
      trafficSpawnCooldown = active ? rand(1.0, 2.1) - game.chaos * 0.55 : rand(2.5, 4.0);
    }
  }

  function updateTraffic(dt, playerMps, canHit) {
    for (let i = traffic.length - 1; i >= 0; i--) {
      const v = traffic[i];
      v.z += (playerMps - v.mps) * dt;
      v.group.position.z = v.z;
      v.group.position.y = Math.sin(game.time * 5.5 + v.bob) * 0.012;
      if (v.z > 62 || v.z < -430) {
        scene.remove(v.group);
        traffic.splice(i, 1);
        continue;
      }
      if (!canHit) continue;

      const dx = game.carX - v.x;
      const carHalf = 0.92;
      const zOverlap = (v.z + v.l / 2 > -2.15) && (v.z - v.l / 2 < 2.25);
      const xOverlap = Math.abs(dx) < carHalf + v.w / 2;
      if (zOverlap && xOverlap) {
        startTopple(
          v.type === 'truck' ? 'Sahil ne truck ki dikki chhoom li.' :
          v.type === 'bus' ? 'Bus ke peeche Innova ki feeling hurt ho gayi.' :
          'Traffic tha, Sahil tha, aur brake loose tha.',
          dx > 0 ? -1 : 1
        );
        return;
      }

      // passing wake from a truck
      if (!v.wake && v.type === 'truck' && v.z > -15 && v.z < 6 && Math.abs(dx) < 3.1 && playerMps > 8) {
        v.wake = true;
        const dir = dx >= 0 ? 1 : -1;
        game.wind += dir * rand(1.1, 2.0);
        game.stability = clamp(game.stability - rand(1.2, 2.8), 0, 100);
        game.shake = Math.max(game.shake, 0.28);
        audio.whoosh();
      }

      // clean pass / near miss
      if (!v.scored && v.z > 2.25 && v.z < 9) {
        v.scored = true;
        const gap = Math.abs(dx) - (carHalf + v.w / 2);
        if (gap < 1.15) {
          game.nearMisses++;
          game.stability = clamp(game.stability + 2.2, 0, 100);
          if (game.time - game.lastHitToast > 2.5) {
            game.lastHitToast = game.time;
            toast('CLEAN PASS', 'Dil dhadka, par gaadi seedhi rahi. +respect', 1700);
            audio.whoosh();
            if (Math.random() > 0.45) showQuip('saurabh', pick([
              'Oye! Bach gaya. My heart stopped.',
              'Sahil, mirror mein dekh. Nahi, mat dekh.',
              'Nice pass. Ab agla truck bhi hai.'
            ]));
          }
        }
      }
    }
    spawnTrafficIfNeeded(canHit);
  }

  function updateOncoming(dt, playerMps) {
    for (let i = 0; i < oncoming.length; i++) {
      const v = oncoming[i];
      v.z += (playerMps + v.mps) * dt;
      v.group.position.z = v.z;
      if (v.z > 48) {
        const lane = (Math.random() * 3) | 0;
        v.x = oncomingLaneCenters[lane] + rand(-0.15, 0.15);
        v.z = rand(-720, -420);
        v.mps = rand(42, 64) / 3.6;
        v.group.position.set(v.x, 0, v.z);
      }
    }
  }

  function updateHazards(dt, mps, active) {
    for (let i = 0; i < potholes.length; i++) {
      const p = potholes[i];
      p.z += mps * dt;
      p.mesh.position.z = p.z;
      if (p.z > 28) {
        p.z -= 760;
        p.x = pick(laneCenters) + rand(-0.7, 0.7);
        p.mesh.position.x = p.x;
        p.hit = false;
      }
      if (active && !p.hit && p.z > -2.0 && p.z < 2.5 && Math.abs(game.carX - p.x) < 1.15) {
        p.hit = true;
        const dmg = rand(3.4, 6.6) + game.chaos * 2.4;
        damageStability(dmg, 'pothole');
        game.speed *= 0.955;
        game.shake = Math.max(game.shake, 0.58);
        game.jolt = 0.32;
        audio.thud();
        burstDust(game.carX + rand(-0.5, 0.5), 0.25, -1.4, 16, 0.55);
        if (game.time - game.lastHitToast > 2.4) {
          game.lastHitToast = game.time;
          toast('POTHOLE!', pick(['Suspension ne sorry bola.', 'Chai hilti, Sahil nahi.', 'Innova ka pehla yoga session.']), 1700);
        }
      }
    }

    for (let i = 0; i < speedBreakers.length; i++) {
      const b = speedBreakers[i];
      b.z += mps * dt;
      b.mesh.position.z = b.z;
      if (b.z > 36) {
        b.z -= 900;
        b.mesh.position.z = b.z;
        b.hit = false;
        b.warned = false;
      }
      if (active && !b.warned && b.z < -75 && b.z > -110) {
        b.warned = true;
        toast('SPEED BREAKER 100M', 'Brake maaro... gently. They are loose.', 2400);
      }
      if (active && !b.hit && b.z > -2.8 && b.z < 0.5) {
        b.hit = true;
        if (game.speed > 38) {
          const dmg = 11 + (game.speed - 38) * 0.2 + game.chaos * 3.4;
          damageStability(dmg, 'speedbreaker');
          game.speed *= 0.74;
          game.shake = Math.max(game.shake, 1.0);
          game.jolt = 0.5;
          audio.thud();
          audio.crash();
          burstDust(game.carX, 0.25, -1.8, 28, 0.9);
          flashScreen('warm', 160);
          toast('SPEED BREAKER!', 'Innova ne jump kiya. Sahil ne seat chhodi.', 2100);
        } else {
          damageStability(1.8, 'speedbreaker');
          game.speed *= 0.9;
          game.jolt = 0.16;
          audio.thud();
        }
      }
    }
  }

  const OBSTACLE_REASONS = {
    barrier: 'Barricade aaya, Sahil ne brake dhoonda. Brake mila nahi.',
    drums: 'Oil drums ne Innova ko salsa sikha diya.',
    blocks: 'Cement block. Suspension aur izzat, dono gaye.',
    cart: 'Sabzi thela ulat gaya. Aaj tamatar mehnga hoga.'
  };

  function updateObstacles(dt, mps, active) {
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      o.z += mps * dt;

      // knocked-aside slide, purely visual
      if (o.knockT < 1) {
        o.knockT = Math.min(1, o.knockT + dt * 2.2);
        const p = easeOutCubic(o.knockT);
        o.group.position.x = o.x + o.knock * p * 3.4;
        o.group.position.z = o.z + p * 0.6;
        o.group.rotation.z = -o.knock * p * 0.95;
        o.group.position.y = Math.sin(p * Math.PI) * 0.22;
      } else {
        o.group.position.x = o.hit ? o.x + o.knock * 3.4 : o.x;
        o.group.position.z = o.z;
        o.group.position.y = 0;
      }

      if (o.z > 32) {
        resetObstacle(o);
        continue;
      }

      // lane warning
      if (active && !o.warned && !o.hit && o.z < -58 && o.z > -96 && Math.abs(game.carX - o.x) < 2.9) {
        o.warned = true;
        if (game.time - game.lastObstacleWarn > 3.2) {
          game.lastObstacleWarn = game.time;
          toast('AAGE ' + o.label.toUpperCase(), 'Lane badlo, ya brake maaro. Slowly.', 2100);
          audio.whoosh();
        }
      }

      if (!active || o.hit) continue;

      const zOverlap = o.z > -3.0 && o.z < 2.1;
      const xOverlap = Math.abs(game.carX - o.x) < 0.92 + o.w / 2;
      if (zOverlap && xOverlap) {
        o.hit = true;
        o.knock = (game.carX >= o.x ? 1 : -1) || 1;
        o.knockT = 0;

        const hard = o.type === 'barrier' || o.type === 'blocks';
        const impactSpeed = game.speed;
        const dmg = o.damage * (0.78 + Math.min(0.72, impactSpeed / 118));
        damageStability(dmg, 'obstacle', OBSTACLE_REASONS[o.type] || 'Road pe kuch tha. Sahil ne dekha nahi.');
        if (game.mode !== 'playing') return;

        game.speed *= o.slow;
        game.shake = Math.max(game.shake, hard ? 1.25 : 0.95);
        game.jolt = 0.5;
        game.wobble += 0.5;
        game.wind += (game.carX >= o.x ? 1 : -1) * rand(0.8, 1.6);
        audio.crash();
        audio.thud();
        flashScreen('warm', 170);
        burstDust(o.x, 0.3, -1.2, 26, 0.9);

        toast(o.label.toUpperCase() + '!', pick([
          'Sahil ne seedha jaake uthaya. Brakes loose the.',
          'Ajeet: bhai, woh pehle se wahan tha.',
          'Innova ek second ke liye hawa mein thi.',
          'Saurabh ka phone haath se nikal gaya.'
        ]), 2100);

        if (Math.random() > 0.45) {
          showQuip(pick(['ajeet', 'saurabh', 'shubham']), pick([
            'Sahil! Aankhein khol ke chala!',
            'Bhai woh barricade tha, background music nahi.',
            'Main so raha tha, ab nahi hoon.',
            'Gaadi seedhi hai ya hum sab tilt ho gaye?'
          ]));
        }

        // A solid hit at speed can flip the Innova right away.
        const flipSpeed = hard ? 72 : 84;
        if (impactSpeed > flipSpeed && !game.gripActive && game.mode === 'playing') {
          startTopple(OBSTACLE_REASONS[o.type], o.knock);
          return;
        }
      }
    }
  }

  function updateWorld(dt, mps, active) {
    updateDashes(mps, dt);
    updateMovers(mps, dt);
    updateTraffic(dt, mps, active);
    updateOncoming(dt, mps);
    updateHazards(dt, mps, active);
    updateObstacles(dt, mps, active);
  }

  /* ------------------------------------------------------------
     Core driving model
  ------------------------------------------------------------ */
  function getGear(speed) {
    if (speed < 18) return 1;
    if (speed < 37) return 2;
    if (speed < 57) return 3;
    if (speed < 80) return 4;
    return 5;
  }

  function getRpm(speed, gear) {
    const bases = [0, 18, 37, 57, 80, 122];
    const lo = bases[gear - 1], hi = bases[gear];
    return clamp(0.12 + (speed - lo) / Math.max(8, hi - lo) * 0.82, 0.12, 1.0);
  }

  function damageStability(amount, source, customReason) {
    if (game.mode !== 'playing') return;
    if (game.gripActive) amount *= 0.34;
    game.stability = clamp(game.stability - amount, 0, 100);
    game.wobble = Math.min(1.5, game.wobble + amount * 0.016);
    game.shake = Math.max(game.shake, Math.min(1.2, amount * 0.075));
    if (game.stability <= 0) {
      let reason = 'Innova ne apna aakhri ghoont liya.';
      if (source === 'speedbreaker') reason = 'Speed breaker ne Innova ko break kar diya.';
      else if (source === 'pothole') reason = 'Pothole + loose brakes = jugaad fail.';
      else if (source === 'obstacle' && customReason) reason = customReason;
      else if (Math.abs(game.steer) > 0.55) reason = 'Overcorrection. Classic Sahil.';
      else if (game.speed > 92) reason = 'Bahut tez, bhai. Innova is not a plane.';
      else if (game.brakeHold > 0.2) reason = 'Loose brakes finally let go.';
      startTopple(reason);
    }
  }

  function triggerRandomEvent() {
    if (game.mode !== 'playing') return;
    const roll = Math.random();
    game.eventTimer = rand(5.5, 9.5) - game.chaos * 2.8;

    if (roll < 0.23) {
      // clutch slip
      game.speed = clamp(game.speed + rand(5, 11), 0, 124);
      damageStability(rand(4.0, 7.2) + game.chaos * 3.5, 'event');
      game.wobble += 0.36;
      game.shake = Math.max(game.shake, 0.45);
      toast('CLUTCH SLIP!', 'Engine ne bola "main bhi chalaunga".', 2100);
      showQuip('ajeet', pick([
        'Bhai clutch chhod de, warna hum udd jayenge.',
        'Sahil, yeh gaadi hai, rocket nahi.',
        'Main abhi bhi shaadi ke liye alive rehna chahta hoon.'
      ]));
      return;
    }
    if (roll < 0.4) {
      // truck horn
      audio.horn();
      game.shake = Math.max(game.shake, 0.34);
      game.wind += rand(-1.2, 1.2);
      damageStability(rand(1.8, 3.2), 'event');
      toast('TRUCK KA HORN!', 'Sahil ka dil 2 lane chhod ke nikal gaya.', 1800);
      return;
    }
    if (roll < 0.62) {
      // crosswind / window
      const dir = Math.random() > 0.5 ? 1 : -1;
      game.wind += dir * rand(1.6, 2.8);
      game.shake = Math.max(game.shake, 0.26);
      damageStability(rand(2.0, 4.0), 'event');
      toast('CROSSWIND', pick(['Truck ki hawa ne steering se baat ki.', 'Ajeet ne window kholi. Hawa full power.', 'Innova left-right dance kar rahi hai.']), 2000);
      showQuip('saurabh', pick([
        'Bhai steering ko pakad ke rakh!',
        'Yeh gaadi ka steering loose hai ya tu?',
        'Oye, mirror! Mirror dekh!'
      ]));
      return;
    }
    if (roll < 0.78) {
      // distraction / flash
      flashScreen('warm', 130);
      game.steer += rand(-0.18, 0.18);
      game.shake = Math.max(game.shake, 0.32);
      damageStability(rand(1.3, 2.8), 'event');
      toast('SAURABH KA SELFIE', 'Flash chala, dhyaan gaya.', 1900);
      return;
    }
    if (roll < 0.9) {
      // rough patch
      game.wobble += 0.55;
      damageStability(rand(4.2, 7.8), 'event');
      game.jolt = 0.36;
      game.shake = Math.max(game.shake, 0.55);
      audio.thud();
      burstDust(game.carX, 0.3, -1.6, 18, 0.55);
      toast('ROUGH PATCH', 'Innova ka suspension ro raha hai.', 1800);
      return;
    }
    // harmless passenger chaos
    showQuip(pick(['ajeet', 'saurabh', 'shubham']), pick([
      'Mathura kitna door hai?',
      'Sahil, dhaba aaye toh chai rukna.',
      'AC tez kar yaar, garmi lag rahi hai.',
      'Main so raha hoon. Pothole pe mat jagana.',
      'Bhai, gaadi ki RC kisne rakhi hai?'
    ]));
  }

  function maybePassengerChatter() {
    if (game.mode !== 'playing') return;
    if (game.time - game.lastQuip < 7) return;
    if (game.stability < 26) {
      game.lastQuip = game.time;
      showQuip(pick(['ajeet', 'saurabh', 'shubham']), pick([
        'Bhai, dheere chala! Brake... BRAKE!',
        'Sahil, yeh hilti kyun hai? Tu theek hai?',
        'Main last row se sab dekh raha hoon. Bhagwan bhi.',
        'Gaadi seedhi rakho, baaki baad mein.',
        'Abhi to meri shadi bhi nahi hui!'
      ]));
      return;
    }
    if (game.time - game.lastQuip > 18 && Math.random() < 0.016) {
      game.lastQuip = game.time;
      showQuip(pick(['ajeet', 'saurabh', 'shubham', 'abhishek']), pick([
        'Mathura 84 km. Sahil, bas dheere chala.',
        'Bhai, AC theek hai?',
        'Main so raha hoon. Mathura aaye toh jagana.',
        'Sahil, gaadi ka mirror adjust kar.',
        'Ajeet, tu shaadi ki baat phir se mat kar.',
        'Yeh Innova smooth hai ya sirf humein lagta hai?',
        'Saurabh, photo baad mein. Pehle road dekh.'
      ]));
    }
  }

  function updateGame(dt) {
    game.elapsed += dt;
    game.time += dt;
    const input = readInput();
    game.gripActive = input.grip && game.grip > 0.5;
    const prevSpeed = game.speed;

    // steering
    game.steer = damp(game.steer, input.steer, input.steer === 0 ? 3.2 : 4.8, dt);
    const speedNorm = clamp(game.speed / 108, 0, 1.15);
    const throttle = input.accel && !game.gripActive;
    const brake = input.brake && !game.gripActive;

    // gearbox
    const gear = getGear(game.speed);
    if (gear !== game.gear) {
      game.gear = gear;
      game.shake = Math.max(game.shake, 0.18);
      if (gear > 1) audio.thud();
    }
    game.rpm = getRpm(game.speed, game.gear);

    // engine / clutch
    if (throttle && game.speed < 122) {
      let acc = 9.5 * (1 - game.speed / 132);
      if (game.speed < 25) acc *= 0.82 + Math.sin(game.time * 29) * 0.06;
      game.speed += acc * dt;
      game.pitch = damp(game.pitch, -0.032, 5, dt);
    } else {
      game.pitch = damp(game.pitch, brake ? 0.04 : 0.006, 4, dt);
    }

    // deliberately loose brake: a beat of delay, then a nose-dive
    if (brake) {
      game.brakeHold = Math.min(0.5, game.brakeHold + dt);
      if (game.brakeHold > 0.11) {
        const bite = smooth(0.11, 0.42, game.brakeHold);
        game.speed -= 12.6 * bite * dt;
        game.roll += Math.sin(game.time * 22) * 0.0009 * speedNorm;
        game.stability = clamp(game.stability - 0.14 * dt, 0, 100);
      }
    } else {
      game.brakeHold = Math.max(0, game.brakeHold - dt * 3.2);
    }

    // grip button slows and settles the car
    if (game.gripActive) {
      game.speed -= 5.4 * dt;
      game.grip = clamp(game.grip - 31 * dt, 0, 100);
      game.roll = damp(game.roll, 0, 10, dt);
      game.wobble = Math.max(0, game.wobble - dt * 1.2);
    } else {
      game.grip = clamp(game.grip + 14 * dt, 0, 100);
    }

    // drag
    game.speed -= (0.32 + speedNorm * 0.72) * dt;
    game.speed = clamp(game.speed, 0, 122);
    const accelNow = (game.speed - prevSpeed) / Math.max(dt, 0.001);

    // lateral position with speed-sensitive steering authority
    const authority = 0.32 + 0.68 * clamp(game.speed / 62, 0, 1);
    game.carX += game.steer * 2.15 * authority * dt + game.wind * 0.24 * dt;
    game.wind = damp(game.wind, Math.sin(game.time * 0.34) * 0.24, 0.56, dt);

    if (Math.abs(game.carX) > 5.72) {
      game.carX = clamp(game.carX, -5.72, 5.72);
      if (game.speed > 38) {
        startTopple('Guardrail se dosti ho gayi. Guardrail impressed nahi hua.', Math.sign(game.carX));
        return;
      }
      game.speed *= 0.8;
      damageStability(2.8, 'edge');
      game.shake = Math.max(game.shake, 0.7);
      game.jolt = 0.3;
      if (game.time - game.lastHitToast > 2.4) {
        game.lastHitToast = game.time;
        toast('SHOULDER!', 'Left-right ka game highway pe nahi.', 1500);
      }
    }

    // visual body lean: steering + wind + brake jitter + recent impacts
    const rollTarget =
      game.steer * speedNorm * 0.122 +
      game.wind * 0.008 +
      (brake ? Math.sin(game.time * 21) * 0.021 * speedNorm : 0) +
      (throttle && game.speed < 30 ? Math.sin(game.time * 32) * 0.012 : 0) +
      Math.sin(game.time * 18) * game.wobble * 0.055;
    game.roll = damp(game.roll, rollTarget, game.gripActive ? 10 : 5.2, dt);
    game.wobble = Math.max(0, game.wobble - dt * 0.85);
    game.shake = Math.max(0, game.shake - dt * 1.8);
    game.jolt = Math.max(0, game.jolt - dt * 2.3);
    game.yaw = damp(game.yaw, -game.steer * speedNorm * 0.042, 4.2, dt);

    // Hard steering at speed makes the tall Innova lean over the edge.
    const hardSteer = Math.abs(game.steer) > 0.62 && game.speed > 56;
    const heavyRoll = Math.abs(game.roll) > 0.16 && game.speed > 72;
    if (!game.gripActive && (hardSteer || heavyRoll)) {
      game.tipTimer += dt * (1 + Math.max(0, game.speed - 56) * 0.009);
    } else {
      game.tipTimer = Math.max(0, game.tipTimer - dt * 1.9);
    }
    if (game.tipTimer > 0.7 && game.time - game.lastTipWarn > 4) {
      game.lastTipWarn = game.time;
      toast('GAADI PALATNE WALI HAI', 'Steering seedha karo. Abhi. Please.', 1600);
      audio.thud();
    }
    if (game.tipTimer > 1.9) {
      startTopple(
        'Sahil ne steering ko wrestling move diya. Innova ne surrender kar diya.',
        Math.sign(game.steer) || 1
      );
      return;
    }

    // stability drain / recovery
    let drain = 0;
    drain += Math.max(0, game.speed - 52) * 0.07;
    drain += Math.abs(game.steer) * speedNorm * 0.9;
    drain += throttle ? Math.max(0, game.speed - 20) * 0.013 : 0;
    drain += brake ? 0.3 : 0;
    drain += Math.abs(game.roll) * 2.1;
    drain += game.chaos * 0.3;
    drain += game.speed < 9 ? 0.22 : 0;
    if (accelNow > 7) drain += 0.8;
    let regen = 0.16;
    const calm = Math.abs(game.steer) < 0.16 && !brake && game.speed > 22 && game.speed < 78;
    if (calm) regen += 0.52;
    if (!throttle && game.speed > 14) regen += 0.3;
    if (game.gripActive) { regen += 4.5; drain *= 0.28; }
    game.stability = clamp(game.stability + (regen - drain) * dt, 0, 100);
    if (game.stability <= 0) {
      let reason = 'Innova ne bas kar di. Bahut ho gaya.';
      if (Math.abs(game.steer) > 0.55) reason = 'Overcorrection. Classic Sahil.';
      else if (game.speed > 94) reason = 'Bahut tez, bhai. Innova is not a plane.';
      else if (game.brakeHold > 0.18) reason = 'Loose brakes finally let go.';
      startTopple(reason);
      return;
    }

    if (calm && game.stability > 45) game.smoothTime += dt;
    if (game.speed > game.topSpeed) game.topSpeed = game.speed;
    game.distance += (game.speed / 3.6) * dt / 1000 * TRIP_SCALE;
    game.chaos = clamp(game.elapsed / 205 + game.distance / 125, 0, 1);

    // events and passengers
    game.eventTimer -= dt;
    if (game.eventTimer <= 0) triggerRandomEvent();
    maybePassengerChatter();

    // celebrate the little odometer milestones
    if (game.distance >= game.nextMilestone) {
      const reached = Math.floor(game.distance / 10) * 10;
      game.nextMilestone = reached + 10;
      const left = Math.max(0, 84 - reached);
      toast(`${reached} KM DONE`, left > 0 ? `Mathura ab ${left} km. Keep it upright.` : 'Mathura aa gaye. Somehow.', 2300);
      game.chaos = clamp(game.chaos + 0.025, 0, 1);
      audio.chime(true);
      if (reached === 10) showQuip('ajeet', '10 km! Bas 74 aur. Aur ek shaadi.');
    }

    // look back over the shoulder
    const lookTarget = input.look ? 1 : 0;
    game.lookBack = damp(game.lookBack, lookTarget, 6.8, dt);
    dom.lookbackHint.classList.toggle('show', game.lookBack > 0.48);

    // advance the world and check traffic
    updateWorld(dt, game.speed / 3.6, true);
  }

  /* ------------------------------------------------------------
     Toppling, crash camera and ending
  ------------------------------------------------------------ */
  function startTopple(reason, dir) {
    if (game.mode !== 'playing') return;
    game.mode = 'toppling';
    game.toppleT = 0;
    game.toppleDir = dir !== undefined ? (dir >= 0 ? 1 : -1) : (game.roll >= 0 ? 1 : -1);
    game.impactReason = reason;
    game.crashShown = false;
    game.speed = Math.max(game.speed, 18);
    setHudVisible(false);
    clearTransientUI();
    dom.dialogueStack.innerHTML = '';
    audio.crash();
    flashScreen('warm', 170);
    game.shake = 1.5;
    game.jolt = 0.8;
    game.wobble = 1.2;
    if (dom.touch) dom.touch.classList.add('is-hidden');
  }

  function finishRun() {
    game.best = Math.max(game.best, game.distance);
    saveBest(game.best);
    updateBestLabels();
    dom.goDistance.innerHTML = `${fmt(game.distance, 2)} <small>km</small>`;
    dom.goTopSpeed.innerHTML = `${Math.round(game.topSpeed)} <small>km/h</small>`;
    dom.goNearMisses.textContent = String(game.nearMisses);
    dom.goSmooth.innerHTML = `${Math.round(game.smoothTime)} <small>s</small>`;
    dom.goReason.innerHTML = `${game.impactReason} <b>Everyone is awake now.</b>`;
    renderCrashDialogues();
    dom.gameover.classList.remove('is-hidden');
    setTimeout(() => audio.update(0, false, false, false), 50);
  }

  function updateTopple(dt) {
    game.toppleT += dt;
    game.time += dt;
    const t = game.toppleT;
    const dir = game.toppleDir;
    const p = clamp(t / 1.25, 0, 1);
    const e = easeOutCubic(p);
    let angle = dir * 1.58 * e;
    if (t > 1.25) angle = dir * 1.58 + Math.sin((t - 1.25) * 10.5) * 0.052 * dir * Math.exp(-(t - 1.25) * 2.7);
    carRig.rotation.z = angle;
    carRig.rotation.x = Math.sin(p * Math.PI) * 0.12 + (t > 1.25 ? Math.sin((t - 1.25) * 5) * 0.015 : 0);
    carRig.rotation.y = Math.sin(p * Math.PI) * 0.07 * dir;
    carRig.position.y = CAR_CENTER_Y + Math.sin(p * Math.PI) * 0.12;
    carRig.position.x = game.carX + dir * Math.min(0.48, t * 0.28);
    carRig.position.z = 0;
    game.speed *= Math.exp(-dt * 1.55);
    game.shake = Math.max(0, game.shake - dt * 1.1);
    game.jolt = Math.max(0, game.jolt - dt * 2);

    updateWorld(dt, Math.max(0, game.speed / 3.6), false);
    updateDust(dt);

    // dust kicks up as the car goes over
    if (t > 0.2 && t < 3.2 && Math.random() < dt * 12) {
      burstDust(carRig.position.x + rand(-1.5, 1.5), 0.15, rand(-1.5, 1.5), 8, 0.75);
    }

    if (t > 1.15 && !game.crashShown) {
      game.crashShown = true;
      activeCam = crashCam;
      const cx = carRig.position.x;
      crashCam.position.set(cx - dir * 7.2, 3.8, 8.4);
      crashCam.lookAt(cx + 0.2, 1.05, 0);
      crashCam.fov = 49;
      crashCam.updateProjectionMatrix();
      flashScreen('warm', 190);
      burstDust(cx, 0.25, 0, 42, 1.2);
      finishRun();
    }

    if (game.crashShown) {
      const orbit = Math.sin(Math.min(1, (t - 1.15) / 3) * Math.PI * 0.5) * 0.9;
      const cx = carRig.position.x;
      crashCam.position.x = lerp(crashCam.position.x, cx - dir * (7.2 + orbit), dt * 2.2);
      crashCam.position.z = lerp(crashCam.position.z, 8.4 + orbit * 0.7, dt * 2.2);
      crashCam.position.y = 3.8 + Math.sin(t * 1.7) * 0.02 + game.shake * 0.04;
      crashCam.lookAt(cx + 0.2, 1.05, 0);
      crashCam.fov = damp(crashCam.fov, 51 + game.shake * 2.5, 3, dt);
      crashCam.updateProjectionMatrix();
    }

    if (game.toppleT > 4.2 && game.shake < 0.02) game.shake = 0;
  }

  /* ------------------------------------------------------------
     Camera + car animation
  ------------------------------------------------------------ */
  function updateCamera(dt) {
    if (game.mode === 'toppling' || game.mode === 'gameover') {
      // crashCam is driven by updateTopple
      return;
    }
    const t = game.time;
    const speedNorm = clamp(game.speed / 110, 0, 1.1);
    const sh = game.shake;
    const jolt = game.jolt;
    const idle = game.mode === 'menu' ? 1 : 1;
    const roadVibe = speedNorm * (0.4 + game.wobble * 0.5);
    const sx = Math.sin(t * 47) * sh * 0.028 + Math.sin(t * 31) * sh * 0.014 * idle + Math.sin(t * 19.3) * roadVibe * 0.0016;
    const sy = Math.sin(t * 38 + 1.2) * sh * 0.021 - jolt * 0.08 + Math.sin(t * 13) * 0.0015 + Math.sin(t * 24.7) * roadVibe * 0.0014;
    const lookBack = game.lookBack;
    const lb = smooth(0, 1, lookBack);
    camera.position.set(
      lerp(CAR_CAM_X, 0.08, lb) + sx * (1 - lb),
      lerp(CAR_CAM_Y, 0.55, lb) + sy,
      lerp(CAR_CAM_Z, -0.16, lb) + Math.sin(t * 19) * sh * 0.012
    );
    camera.rotation.set(
      lerp(-0.035, 0.005, lb) + Math.sin(t * 41) * sh * 0.028 + game.pitch * 0.22 - jolt * 0.05 + Math.sin(t * 22.1) * roadVibe * 0.0011,
      Math.PI * lookBack + Math.sin(t * 27) * sh * 0.02,
      Math.sin(t * 33) * sh * 0.04 + Math.sin(t * 15.7) * roadVibe * 0.0013
    );
    const targetFov = BASE_FOV + speedNorm * 5.8 + (lookBack > 0.4 ? 8 : 0) + (game.gripActive ? -2.5 : 0);
    camera.fov = damp(camera.fov, targetFov, 3.6, dt);
    camera.updateProjectionMatrix();
  }

  function updateCarVisuals(dt) {
    if (game.mode !== 'toppling' && game.mode !== 'gameover') {
      const speedNorm = clamp(game.speed / 110, 0, 1.1);
      const bob = Math.sin(game.time * 14) * (0.0025 + speedNorm * 0.006) + Math.sin(game.time * 31) * game.wobble * 0.012;
      carRig.position.set(game.carX, CAR_CENTER_Y + bob, 0);
      carRig.rotation.z = game.roll;
      carRig.rotation.x = game.pitch + Math.sin(game.time * 23) * game.wobble * 0.006;
      carRig.rotation.y = game.yaw;
    }

    if (steeringWheelSpin) steeringWheelSpin.rotation.z = damp(steeringWheelSpin.rotation.z, -game.steer * 0.82, 10, dt);

    const wheelRate = (game.speed / 3.6) * dt / 0.38;
    carWheels.forEach(w => {
      w.spin.rotation.x += wheelRate;
      if (w.steerable) w.steer.rotation.y = damp(w.steer.rotation.y, -game.steer * 0.3, 9, dt);
    });

    const t = game.time;
    passengerObjects.forEach(p => {
      p.group.rotation.z = -game.roll * 0.22 + Math.sin(t * 1.8 + p.phase) * 0.006;
      p.head.rotation.z = p.baseTilt + Math.sin(t * 1.55 + p.phase) * 0.025 + game.roll * 0.28;
      p.head.rotation.x = Math.sin(t * 1.2 + p.phase) * 0.02;
    });
    zSprite.position.y = 1.78 + Math.sin(t * 1.2) * 0.025;

    if (t - lastClusterDraw > 0.12) {
      lastClusterDraw = t;
      drawCluster(game.speed, game.rpm);
      clusterTex.needsUpdate = true;
    }
  }

  /* ------------------------------------------------------------
     HUD readout
  ------------------------------------------------------------ */
  const rpmChildren = Array.from(dom.rpmBars.children);

  function updateHUD() {
    const speed = Math.round(game.speed);
    setText(dom.speedValue, speed);
    setText(dom.gearValue, game.gear);
    const arc = clamp(game.speed / 122, 0, 1) * 316;
    dom.speedArc.setAttribute('stroke-dasharray', `${arc} 440`);
    dom.speedCluster.classList.toggle('fast', game.speed > 56);
    const lit = Math.round(game.rpm * 8);
    rpmChildren.forEach((el, i) => {
      el.classList.toggle('on', i < lit);
      el.classList.toggle('redline', i >= 6 && game.rpm > 0.72);
    });
    dom.stabilityFill.style.clipPath = `inset(0 ${100 - game.stability}% 0 0)`;
    let label = 'SAHI CHAL RAHI HAI';
    if (game.stability < 22) label = 'PALATNE WALI HAI';
    else if (game.stability < 42) label = 'BHAI, DHYAN SE';
    else if (game.stability < 64) label = 'THODA HIL RAHI HAI';
    setText(dom.stabilityLabel, label);
    dom.stabilityLabel.style.color = game.stability < 25 ? '#ff6a51' : game.stability < 48 ? '#ffc35a' : '#71e0c5';
    dom.gripFill.style.width = `${game.grip}%`;
    dom.gripLine.classList.toggle('active', game.gripActive);

    const remaining = Math.max(0, Math.ceil(84 - game.distance));
    setText(dom.destinationValue, remaining);
    dom.destinationBar.style.width = `${clamp(game.distance / 84 * 100, 0, 100)}%`;
    setText(dom.odoValue, `${fmt(game.distance, 2)} km`);
    setText(dom.bestValue, fmt(Math.max(game.best, game.distance), 1));

    const danger = game.stability < 23 && game.mode === 'playing';
    document.body.classList.toggle('danger', danger);
    dom.warning.classList.toggle('show', danger);
    dom.speedFx.style.opacity = game.mode === 'playing' ? clamp((game.speed - 82) / 50, 0, 0.5) : 0;
    dom.helpStrip.classList.toggle('fade', game.elapsed > 22);
  }

  function renderMirror() {
    if (game.mode === 'toppling' || game.mode === 'gameover') return;
    const vis = mirrorGroup.visible;
    mirrorGroup.visible = false;
    renderer.setRenderTarget(mirrorRT);
    renderer.render(scene, mirrorCam);
    renderer.setRenderTarget(null);
    mirrorGroup.visible = vis;
  }

  /* ------------------------------------------------------------
     Run setup, countdown and navigation
  ------------------------------------------------------------ */
  function cancelCountdown() {
    countdownIds.forEach(clearTimeout);
    countdownIds = [];
    dom.countdown.classList.remove('show');
    dom.countdownText.classList.remove('go');
    dom.countdownText.textContent = '3';
  }

  function clearDust() {
    dustLife.fill(0);
    for (let i = 0; i < DUST_MAX; i++) dustPositions[i * 3 + 1] = -999;
    dustGeo.attributes.position.needsUpdate = true;
    dustMat.opacity = 0;
    dustAge = 0;
  }

  function resetCarForRun() {
    carRig.position.set(0, CAR_CENTER_Y, 0);
    carRig.rotation.set(0, 0, 0);
    camera.position.set(CAR_CAM_X, CAR_CAM_Y, CAR_CAM_Z);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(-0.035, 0, 0);
    camera.fov = BASE_FOV;
    camera.updateProjectionMatrix();
    crashCam.position.set(7, 4, 8);
    activeCam = camera;
    game.carX = 0;
    game.steer = 0;
    game.roll = 0;
    game.pitch = 0;
    game.yaw = 0;
    game.shake = 0;
    game.jolt = 0;
    game.wobble = 0;
    game.wind = 0;
    game.lookBack = 0;
    game.brakeHold = 0;
    game.gripActive = false;
    game.toppleT = 0;
    game.crashShown = false;
    game.impactReason = '';
    carWheels.forEach(w => { w.spin.rotation.x = 0; w.steer.rotation.y = 0; });
    if (steeringWheelSpin) steeringWheelSpin.rotation.z = 0;
  }

  function resetRoad() {
    for (let i = traffic.length - 1; i >= 0; i--) {
      scene.remove(traffic[i].group);
    }
    traffic.length = 0;
    trafficSpawnCooldown = 0;
    for (let i = 0; i < 3; i++) spawnTraffic(-95 - i * 85);

    oncoming.forEach((v, i) => {
      const lane = (Math.random() * 3) | 0;
      v.x = oncomingLaneCenters[lane] + rand(-0.15, 0.15);
      v.z = -160 - i * 105 + rand(-35, 35);
      v.mps = rand(42, 64) / 3.6;
      v.group.position.set(v.x, 0, v.z);
    });

    potholes.forEach(p => {
      p.z = rand(-690, -120);
      p.x = pick(laneCenters) + rand(-0.7, 0.7);
      p.mesh.position.set(p.x, 0.03, p.z);
      p.hit = false;
    });

    [-185, -435, -685].forEach((z, i) => {
      const b = speedBreakers[i];
      b.z = z;
      b.mesh.position.z = z;
      b.hit = false;
      b.warned = false;
    });

    obstacles.forEach((o, i) => {
      resetObstacle(o, true);
      o.z = -150 - i * 88 + rand(-18, 18);
      o.group.position.set(o.x, 0, o.z);
    });
    clearDust();
  }

  function resetGameState() {
    game.mode = 'countdown';
    game.paused = false;
    game.speed = 0;
    game.topSpeed = 0;
    game.distance = 0;
    game.nearMisses = 0;
    game.smoothTime = 0;
    game.elapsed = 0;
    game.chaos = 0;
    game.time = 0;
    game.stability = 100;
    game.grip = 100;
    game.gear = 1;
    game.rpm = 0.12;
    game.eventTimer = rand(8, 12);
    game.quipTimer = 0;
    game.toastTimer = 0;
    game.flashTimer = 0;
    game.lastHitToast = -10;
    game.speedbreakerWarnCooldown = 0;
    game.lastObstacleWarn = -10;
    game.tipTimer = 0;
    game.lastTipWarn = -10;
    game.nextMilestone = 10;
    game.lastQuip = 0;
    game.started = true;
    game.gameOverShown = false;
  }

  function startRun() {
    if (game.mode === 'countdown') return;
    cancelCountdown();
    audio.init();
    keys.clear();
    Object.keys(touch).forEach(k => { touch[k] = false; });
    document.querySelectorAll('[data-control].on').forEach(el => el.classList.remove('on'));
    resetGameState();
    resetCarForRun();
    resetRoad();
    clearTransientUI();
    dom.dialogueStack.innerHTML = '';
    dom.menu.classList.add('is-hidden');
    dom.pause.classList.add('is-hidden');
    dom.gameover.classList.add('is-hidden');
    setHudVisible(true);
    updateBestLabels();
    updateHUD();
    drawCluster(0, 0.12);
    clusterTex.needsUpdate = true;

    dom.countdown.classList.add('show');
    dom.countdownText.classList.remove('go');
    dom.countdownText.textContent = '3';

    const steps = [
      { at: 0, text: '3', go: false },
      { at: 900, text: '2', go: false },
      { at: 1800, text: '1', go: false },
      { at: 2750, text: 'GO!', go: true }
    ];
    steps.forEach(step => {
      countdownIds.push(setTimeout(() => {
        dom.countdownText.textContent = step.text;
        dom.countdownText.classList.toggle('go', step.go);
        if (step.go) {
          game.mode = 'playing';
          game.speed = 2;
          audio.init();
          audio.chime(true);
          toast('MATHURA · 84 KM', 'Innova on. Bhagwan bharose. Dheere chala.', 2800);
          showQuip('ajeet', 'Sahil, bas dheere chala. Mathura door nahi hai.', 4600);
        }
      }, step.at));
    });
    countdownIds.push(setTimeout(() => {
      dom.countdown.classList.remove('show');
    }, 3450));
  }

  function returnToMenu() {
    cancelCountdown();
    game.mode = 'menu';
    game.paused = false;
    game.speed = 42;
    game.stability = 100;
    game.grip = 100;
    game.gear = 4;
    game.rpm = 0.45;
    game.elapsed = 0;
    game.lastQuip = 0;
    keys.clear();
    Object.keys(touch).forEach(k => { touch[k] = false; });
    resetCarForRun();
    resetRoad();
    clearTransientUI();
    dom.dialogueStack.innerHTML = '';
    dom.pause.classList.add('is-hidden');
    dom.gameover.classList.add('is-hidden');
    dom.menu.classList.remove('is-hidden');
    setHudVisible(false);
    updateBestLabels();
    document.body.classList.remove('danger');
    audio.update(0, false, false, false);
  }

  function togglePause(force) {
    if (game.mode !== 'playing') return;
    game.paused = force === undefined ? !game.paused : force;
    if (game.paused) {
      keys.clear();
      Object.keys(touch).forEach(k => { touch[k] = false; });
      document.querySelectorAll('[data-control].on').forEach(el => el.classList.remove('on'));
      dom.pause.classList.remove('is-hidden');
      audio.update(0, false, false, false);
    } else {
      audio.init();
      dom.pause.classList.add('is-hidden');
    }
  }

  /* ------------------------------------------------------------
     Button + lifecycle wiring
  ------------------------------------------------------------ */
  dom.startBtn.addEventListener('click', () => { audio.init(); startRun(); });
  dom.retryBtn.addEventListener('click', () => { audio.init(); startRun(); });
  dom.resumeBtn.addEventListener('click', () => togglePause(false));
  dom.restartBtn.addEventListener('click', () => { audio.init(); startRun(); });
  dom.menuBtn.addEventListener('click', returnToMenu);
  dom.goMenuBtn.addEventListener('click', returnToMenu);
  dom.pauseBtn.addEventListener('click', () => togglePause());
  dom.soundBtn.addEventListener('click', toggleMute);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.mode === 'playing' && !game.paused) togglePause(true);
  });

  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    crashCam.aspect = w / h;
    crashCam.updateProjectionMatrix();
    mirrorCam.aspect = 384 / 160;
    mirrorCam.updateProjectionMatrix();
  });

  /* ------------------------------------------------------------
     Main loop
  ------------------------------------------------------------ */
  const clock = new THREE.Clock();
  let mirrorAccum = 0;
  let menuAccum = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (game.paused) {
      renderer.render(scene, activeCam);
      return;
    }

    if (game.mode === 'menu') {
      game.time += dt;
      game.speed = 42;
      game.gear = 4;
      game.rpm = 0.45;
      menuAccum += dt;
      if (menuAccum > 0.016) {
        updateWorld(dt, game.speed / 3.6, false);
        menuAccum = 0;
      }
      updateCamera(dt);
      updateCarVisuals(dt);
      updateDust(dt);
    } else if (game.mode === 'countdown') {
      game.time += dt;
      updateCamera(dt);
      updateCarVisuals(dt);
      updateDust(dt);
      updateHUD();
    } else if (game.mode === 'playing') {
      updateGame(dt);
      if (game.mode === 'playing') {
        updateCamera(dt);
        updateCarVisuals(dt);
        updateDust(dt);
        updateHUD();
        const input = readInput();
        audio.update(game.speed, input.accel, input.brake, true);
      }
    } else if (game.mode === 'toppling') {
      updateTopple(dt);
      updateCarVisuals(dt);
      updateDust(dt);
      updateHUD();
      audio.update(0, false, false, false);
    }

    if (game.mode !== 'toppling') {
      mirrorAccum += dt;
      if (mirrorAccum > 0.065) {
        renderMirror();
        mirrorAccum = 0;
      }
    }

    if (game.mode !== 'gameover') renderer.render(scene, activeCam);
  }

  updateBestLabels();
  updateHUD();
  drawCluster(0, 0.12);
  clusterTex.needsUpdate = true;
  setHudVisible(false);
  resetCarForRun();
  renderer.render(scene, activeCam);

  function debugStep(seconds) {
    const frame = 1 / 60;
    let left = Math.max(0, seconds);
    while (left > 0.00001) {
      const dt = Math.min(frame, left);
      if (game.mode === 'playing') {
        updateGame(dt);
        if (game.mode === 'playing') {
          updateCamera(dt);
          updateCarVisuals(dt);
          updateDust(dt);
          updateHUD();
        }
      } else if (game.mode === 'toppling') {
        updateTopple(dt);
        updateCarVisuals(dt);
        updateDust(dt);
        updateHUD();
      } else if (game.mode === 'menu') {
        game.time += dt;
        game.speed = 42;
        updateWorld(dt, game.speed / 3.6, false);
        updateCamera(dt);
        updateCarVisuals(dt);
        updateDust(dt);
      }
      left -= dt;
    }
    renderer.render(scene, activeCam);
  }

  if (new URLSearchParams(location.search).has('debug')) {
    window.__bhai = { game, keys, touch, startRun, returnToMenu, startTopple, togglePause, resetGameState, resetRoad, obstacles, camera, carRig, scene, renderer, crashCam, mirrorCam, calibStep: debugStep, step: debugStep };
  }

  const debugParams = new URLSearchParams(location.search);
  if (debugParams.has('autostart')) setTimeout(startRun, 250);
  if (debugParams.has('drive')) setTimeout(() => keys.add('KeyW'), 3300);
  if (debugParams.has('topple')) setTimeout(() => startTopple('Test topple: the road won.'), 6200);

  animate();
})();
