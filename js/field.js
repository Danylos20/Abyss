/* ==========================================================
   field.js — the dream: a violet field you walk through by scrolling
   ========================================================== */
(function () {
  'use strict';
  const { M, program, texture, target, msTarget, free, vao } = window.FieldGL;
  const SH = window.FieldShaders;

  const D = 600;               // metres of dream
  const CAT_S = 602.2;         // where the cat waits, a few steps past the end of the walk
  const CAT_H = 0.62;          // sprite height in metres (about half a metre of cat)
  const PATCH = [72, 112];     // wrapping patch of grass around you

  const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

  // flower atlas order: cosmos, cosmos (side), carpet, reed, rose, hydrangea, yarrow, tuft
  const SIZES = [0.95, 0.85, 0.75, 2.3, 0.95, 1.05, 0.85, 0.7];
  const ZONES = [
    { name: 'the cosmos field', s: 0, top: '#150f3f', mid: '#4b2a7e', hor: '#c45a9c', glow: '#ff7fb6', fog: '#5a3482', fogD: 0.0105,
      stars: 0.55, clouds: 0.15, mount: 1, moon: 0, light: 1, gBase: '#0f0819', gTip: '#3a2858', gH: 0.85, gD: 0.9,
      fw: [0.42, 0.2, 0.08, 0, 0, 0, 0, 0.1], ft: ['#ec5fc6', '#a855f7', '#ff9fd8'], fol: '#21163a', glowF: 0,
      fly: 0.15, flyC: '#ffc8f0', wind: 1, rim: '#ff7fb6', sea: '#3a2a6a' },
    { name: 'the reeds', s: 120, top: '#2c1f63', mid: '#5d3f9e', hor: '#9a74cf', glow: '#c79bff', fog: '#6a4ca8', fogD: 0.0135,
      stars: 0, clouds: 0.85, mount: 0.35, moon: 0, light: 0.9, gBase: '#0c0716', gTip: '#30245a', gH: 1.7, gD: 1,
      fw: [0, 0, 0.05, 0.5, 0, 0, 0, 0.25], ft: ['#2a1b47', '#3b2763', '#4a3480'], fol: '#1c1433', glowF: 0,
      fly: 0, flyC: '#e9d5ff', wind: 1.6, rim: '#b48cff', sea: '#3a2a6a' },
    { name: 'the shore', s: 240, top: '#6a55b4', mid: '#937cd2', hor: '#b7a4e4', glow: '#8e70cc', fog: '#9a84d0', fogD: 0.0125,
      stars: 0, clouds: 0.35, mount: 0, moon: 0, light: 1, gBase: '#1a1230', gTip: '#40316b', gH: 0.7, gD: 0.8,
      fw: [0, 0, 0.62, 0.12, 0, 0, 0, 0.1], ft: ['#9b30ff', '#b84dff', '#7e22ce'], fol: '#2b2150', glowF: 0.06,
      fly: 0, flyC: '#ffffff', wind: 1.3, rim: '#e9d5ff', sea: '#2a2160' },
    { name: 'the rose garden', s: 345, top: '#06041a', mid: '#140c3a', hor: '#2e1c5c', glow: '#7a3fd0', fog: '#1b1238', fogD: 0.026,
      stars: 1, clouds: 0.1, mount: 0, moon: 1, light: 0.85, gBase: '#07050f', gTip: '#1d1536', gH: 0.6, gD: 0.75,
      fw: [0, 0, 0.05, 0, 0.55, 0.06, 0, 0.14], ft: ['#c77dff', '#ff8ae2', '#8f7cff'], fol: '#140e2a', glowF: 0.55,
      fly: 1, flyC: '#ffb8f2', wind: 0.6, rim: '#9a6bff', sea: '#1b1238' },
    { name: 'the blue forest', s: 455, top: '#22307a', mid: '#3d4fa6', hor: '#8c93db', glow: '#c4c8ff', fog: '#5e68b8', fogD: 0.034,
      stars: 0, clouds: 0, mount: 0, moon: 0, light: 1, gBase: '#0b1224', gTip: '#1f4a5a', gH: 0.75, gD: 0.85,
      fw: [0, 0, 0.05, 0, 0, 0.55, 0, 0.2], ft: ['#b3a4ff', '#8fb0ff', '#d4c6ff'], fol: '#1a3d4f', glowF: 0.12,
      fly: 0.45, flyC: '#cfe0ff', wind: 0.5, rim: '#9fb4ff', sea: '#2a3478' },
    { name: 'the clearing', s: 555, top: '#3f2e8c', mid: '#6a54b8', hor: '#a08ade', glow: '#b48fe8', fog: '#7e69c6', fogD: 0.02,
      stars: 0.2, clouds: 0.25, mount: 0.2, moon: 0.3, light: 1, gBase: '#140d26', gTip: '#3a2c66', gH: 0.5, gD: 0.85,
      fw: [0, 0, 0.2, 0, 0, 0, 0.5, 0.12], ft: ['#f3e8ff', '#e0ccff', '#c9b3ff'], fol: '#251b44', glowF: 0.1,
      fly: 0.5, flyC: '#f6e6ff', wind: 0.8, rim: '#e9d5ff', sea: '#4b37a0' }
  ];
  const ZS = new Float32Array([-1e4, ...ZONES.slice(1).map(z => z.s), 1e5]);

  const WORDS = [
    [8, -1.7, 1.9, 'you drifted off again.'],
    [24, 1.8, 2.1, 'the flowers\nremember your name.'],
    [44, -2.0, 2.4, 'it is always dusk here.'],
    [66, 1.7, 1.9, 'nobody planted them.\nthey grew where\nyou fell asleep.'],
    [92, -1.8, 2.2, 'someone is humming\nbehind the hills.'],
    [112, 2.0, 2.0, 'do not look for the way back.', 1],
    [140, -1.6, 2.5, 'the reeds whisper\nin reverse.'],
    [166, 1.8, 2.1, 'you have been walking\nfor a very long time.'],
    [196, -1.9, 2.4, 'the sky is the colour\nof a song you forgot.'],
    [222, 1.6, 2.1, 'keep going.\nthe music is ahead.'],
    [256, 2.0, 1.9, 'the sea breathes\nslower than you.'],
    [288, -1.6, 2.5, 'this tree was here\nbefore the world.'],
    [318, 1.8, 2.0, 'the tide brings back\nvoices you lost.'],
    [352, -1.7, 2.0, 'roses glow\nonly for the dreaming.'],
    [378, 1.7, 2.2, 'they bloom in the dark.\nlike you.'],
    [410, -1.6, 2.0, 'can you hear the needle\nstill turning?'],
    [436, 1.9, 2.4, 'altitude: violet', 1],
    [468, -1.7, 2.3, 'the forest is\nholding its breath.'],
    [496, 1.6, 2.1, 'the mist knows\nwhere you are going.'],
    [526, -1.8, 2.0, 'something small\nis waiting for you.'],
    [552, 1.5, 1.8, 'almost.', 1],
    [590, -1.0, 1.45, 'oh.\nthere you are.']
  ];

  const pathX = s => 4 * Math.sin(s * 0.013) + 2 * Math.sin(s * 0.037 + 1);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const zoneW = (i, s) => smooth(ZS[i] - 14, ZS[i] + 14, s) - smooth(ZS[i + 1] - 14, ZS[i + 1] + 14, s);
  function rng(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }

  // ---------------------------------------------------------------------
  let gl, canvas, P = {}, V = {}, T = {}, RT = {}, samples = 0;
  let W = 1, H = 1, rw = 1, rh = 1, dpr = 1;
  let counts = { grass: 0, flower: 0, cedar: 0, fly: 0 };
  let quality = 1, frameAcc = 0, frameN = 0, qualityLocked = false;
  let running = false, raf = 0, t0 = 0, last = 0, enteredAt = 0, fade = 1;
  let catSprite = null, catAcc = 1;
  const cam = { s: 0, vel: 0, yaw: 0, pitch: 0, ty: 0, tp: 0 };
  let scrollEl, wordsEl, hudZone, hudTime, hudSong, endingEl, introEl;
  let words = [];
  let wind = null;

  function init() {
    canvas = document.getElementById('field');
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    try {
      samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0);
      for (const k in SH) P[k] = program(gl, SH[k][0], SH[k][1], k);
      buildGeometry();
      T.atlas = texture(gl, window.FieldTex.makeFlowerAtlas(), true);
      T.tree = texture(gl, window.FieldTex.makeTreeTexture(), true);
      T.cedar = texture(gl, window.FieldTex.makeCedarTexture(), true);
      catSprite = window.RealCat.create();
      T.cat = texture(gl, catSprite.canvas, true);
    } catch (e) {
      console.error(e);
      return false;
    }
    scrollEl = document.getElementById('dreamScroll');
    wordsEl = document.getElementById('words');
    hudZone = document.getElementById('hudZone');
    hudTime = document.getElementById('hudTime');
    hudSong = document.getElementById('hudSong');
    endingEl = document.getElementById('ending');
    introEl = document.getElementById('intro');
    words = WORDS.map(([s, xo, y, text, small]) => {
      const el = document.createElement('div');
      el.className = 'word' + (small ? ' small' : '');
      el.textContent = text;
      wordsEl.appendChild(el);
      return { s, x: pathX(s) + xo, y, z: -s, el, shown: false };
    });
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    scrollEl.addEventListener('pointermove', e => {
      cam.ty = ((e.clientX / W) - 0.5) * 0.5;
      cam.tp = -((e.clientY / H) - 0.5) * 0.22;
    }, { passive: true });
    addEventListener('resize', () => { if (running) resize(); });
    return true;
  }

  function buildGeometry() {
    const r = rng(20250101);
    const spreadX = () => { const u = r() * 2 - 1; return Math.sign(u) * Math.pow(Math.abs(u), 1.35) * PATCH[0] / 2; };

    // grass blades
    const blade = [];
    for (let k = 0; k < 4; k++) { const h = k / 4; blade.push(-1, h, 1, h); }
    blade.push(0, 1);
    const NG = 90000;
    const gi = new Float32Array(NG * 4);
    for (let i = 0; i < NG; i++) gi.set([spreadX(), -r() * PATCH[1], r(), r()], i * 4);
    V.grass = vao(gl, [
      { data: new Float32Array(blade), attrs: [{ loc: 0, size: 2 }] },
      { data: gi, attrs: [{ loc: 1, size: 4 }], divisor: 1 }
    ]);
    counts.grass = NG;

    // flowers
    const quad = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    const NF = 15000;
    const fi = new Float32Array(NF * 4), fr = new Float32Array(NF);
    for (let i = 0; i < NF; i++) { fi.set([spreadX(), -r() * PATCH[1], r(), r()], i * 4); fr[i] = r(); }
    V.flower = vao(gl, [
      { data: quad, attrs: [{ loc: 0, size: 2 }] },
      { data: fi, attrs: [{ loc: 1, size: 4 }], divisor: 1 },
      { data: fr, attrs: [{ loc: 2, size: 1 }], divisor: 1 }
    ]);
    counts.flower = NF;

    // cedars of the blue forest (+ a few dark sentinels in the rose garden)
    const ced = [];
    for (let i = 0; i < 190; i++) {
      const s = 448 + r() * 130;
      const side = r() < 0.5 ? -1 : 1;
      const off = 2.6 + Math.pow(r(), 0.8) * 30 + (s > 556 ? 9 : 0);
      ced.push(pathX(s) + side * off, 0, -s, 16 + r() * 14, 0.25, r() * 100);
    }
    for (let i = 0; i < 9; i++) {
      const s = 350 + r() * 95, side = r() < 0.5 ? -1 : 1;
      ced.push(pathX(s) + side * (7 + r() * 18), 0, -s, 12 + r() * 8, 0.25, r() * 100);
    }
    counts.cedar = ced.length / 6;
    const cedI = new Float32Array(counts.cedar * 4), cedJ = new Float32Array(counts.cedar * 2);
    for (let i = 0; i < counts.cedar; i++) {
      cedI.set(ced.slice(i * 6, i * 6 + 4), i * 4);
      cedJ.set(ced.slice(i * 6 + 4, i * 6 + 6), i * 2);
    }
    V.cedar = vao(gl, [
      { data: quad, attrs: [{ loc: 0, size: 2 }] },
      { data: cedI, attrs: [{ loc: 1, size: 4 }], divisor: 1 },
      { data: cedJ, attrs: [{ loc: 2, size: 2 }], divisor: 1 }
    ]);

    // the lone tree by the sea
    V.tree = vao(gl, [
      { data: quad, attrs: [{ loc: 0, size: 2 }] },
      { data: new Float32Array([pathX(292) + 10.5, -0.1, -292, 14]), attrs: [{ loc: 1, size: 4 }], divisor: 1 },
      { data: new Float32Array([1, 0.2]), attrs: [{ loc: 2, size: 2 }], divisor: 1 }
    ]);
    // the cat
    V.cat = vao(gl, [
      { data: quad, attrs: [{ loc: 0, size: 2 }] },
      { data: new Float32Array([pathX(CAT_S) + 0.25, -0.01, -CAT_S, CAT_H]), attrs: [{ loc: 1, size: 4 }], divisor: 1 },
      { data: new Float32Array([1, 0.1]), attrs: [{ loc: 2, size: 2 }], divisor: 1 }
    ]);

    // fireflies & motes
    const NFly = 900, fl = new Float32Array(NFly * 4);
    for (let i = 0; i < NFly; i++) fl.set([(r() - 0.5) * 46, r() * 4.5, -r() * 70, r()], i * 4);
    V.fly = vao(gl, [{ data: fl, attrs: [{ loc: 0, size: 4 }] }]);
    counts.fly = NFly;

    V.full = vao(gl, [{ data: new Float32Array([-1, -1, 3, -1, -1, 3]), attrs: [{ loc: 0, size: 2 }] }]);
    V.quad = vao(gl, [{ data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), attrs: [{ loc: 0, size: 2 }] }]);

    // static uniform tables
    T.u = {
      gBase: new Float32Array(ZONES.flatMap(z => hex(z.gBase))),
      gTip: new Float32Array(ZONES.flatMap(z => hex(z.gTip))),
      gP: new Float32Array(ZONES.flatMap(z => [z.gH, z.gD])),
      fw: new Float32Array(ZONES.flatMap(z => z.fw)),
      ft: new Float32Array(ZONES.flatMap(z => z.ft.flatMap(hex))),
      fol: new Float32Array(ZONES.flatMap(z => hex(z.fol))),
      glow: new Float32Array(ZONES.map(z => z.glowF)),
      size: new Float32Array(SIZES)
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const cap = (quality >= 1 ? 1.7e6 : quality >= 0.7 ? 1.1e6 : 0.7e6);
    const sc = Math.min(1, Math.sqrt(cap / (canvas.width * canvas.height)));
    rw = Math.max(64, Math.round(canvas.width * sc));
    rh = Math.max(64, Math.round(canvas.height * sc));
    for (const k in RT) free(gl, RT[k]);
    RT.scene = msTarget(gl, rw, rh, samples);
    const w4 = Math.max(8, rw >> 2), h4 = Math.max(8, rh >> 2), w8 = Math.max(4, rw >> 3), h8 = Math.max(4, rh >> 3);
    RT.a4 = target(gl, w4, h4); RT.b4 = target(gl, w4, h4);
    RT.a8 = target(gl, w8, h8); RT.b8 = target(gl, w8, h8);
  }

  function onScroll() {
    const max = scrollEl.scrollHeight - scrollEl.clientHeight;
    cam.target = max > 0 ? (scrollEl.scrollTop / max) * D : 0;
    if (cam.s > 2) introEl.classList.add('out');
  }

  // ---------------------------------------------------------------------
  // blended look of the place you stand in
  function look(s) {
    const o = { top: [0, 0, 0], mid: [0, 0, 0], hor: [0, 0, 0], glow: [0, 0, 0], fog: [0, 0, 0], flyC: [0, 0, 0], rim: [0, 0, 0], sea: [0, 0, 0],
      fogD: 0, stars: 0, clouds: 0, mount: 0, moon: 0, light: 0, fly: 0, wind: 0, name: '', best: -1 };
    ZONES.forEach((z, i) => {
      const k = zoneW(i, s);
      if (k <= 0) return;
      ['top', 'mid', 'hor', 'glow', 'fog', 'flyC', 'rim', 'sea'].forEach(key => { const c = hex(z[key]); for (let j = 0; j < 3; j++) o[key][j] += c[j] * k; });
      ['fogD', 'stars', 'clouds', 'mount', 'moon', 'light', 'fly', 'wind'].forEach(key => { o[key] += z[key] * k; });
      if (k > o.best) { o.best = k; o.name = z.name; }
    });
    return o;
  }

  function setWorld(pr, t, camPos, windAmt) {
    const u = pr.u;
    if (u.uZs) gl.uniform1fv(u.uZs, ZS);
    if (u.uCam) gl.uniform3fv(u.uCam, camPos);
    if (u.uPatch) gl.uniform2fv(u.uPatch, PATCH);
    if (u.uTime) gl.uniform1f(u.uTime, t);
    if (u.uWind) gl.uniform1f(u.uWind, windAmt);
  }
  function setFog(pr, L) {
    if (pr.u.uFog) gl.uniform3fv(pr.u.uFog, L.fog);
    if (pr.u.uFogD) gl.uniform1f(pr.u.uFogD, L.fogD);
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;

    // adaptive quality during the first seconds
    if (!qualityLocked) {
      frameAcc += dt; frameN++;
      if (frameN === 90) {
        const avg = frameAcc / frameN;
        if (avg > 0.03 && quality > 0.5) { quality = quality >= 1 ? 0.7 : 0.5; resize(); frameAcc = 0; frameN = 0; }
        else qualityLocked = true;
      }
    }

    // walk
    const prev = cam.s;
    cam.s += (cam.target - cam.s) * (1 - Math.exp(-dt * 2.2));
    cam.vel += ((cam.s - prev) / Math.max(dt, 1e-3) - cam.vel) * 0.1;
    cam.yaw += (cam.ty - cam.yaw) * (1 - Math.exp(-dt * 2.5));
    cam.pitch += (cam.tp - cam.pitch) * (1 - Math.exp(-dt * 2.5));
    fade = Math.max(0, fade - dt / 2.8);

    const s = cam.s;
    const L = look(s);
    const end = smooth(568, 600, s);
    const eyeY = 1.45 - 0.7 * end + Math.sin(s * 1.9) * 0.03 * (1 - end) + Math.sin(t * 0.6) * 0.02;
    const ex = pathX(s), ez = -s;
    let dx = pathX(s + 8) - ex, dz = -8;
    const dl = Math.hypot(dx, dz); dx /= dl; dz /= dl;
    const yaw = cam.yaw + Math.sin(t * 0.13) * 0.05;
    const fx = dx * Math.cos(yaw) - dz * Math.sin(yaw), fz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const pitch = cam.pitch - 0.05 - 0.04 * end + Math.sin(t * 0.21) * 0.012;
    const F = [fx * Math.cos(pitch), Math.sin(pitch), fz * Math.cos(pitch)];
    const eye = [ex, eyeY, ez];
    const view = M.lookAt(eye, [ex + F[0], eyeY + F[1], ez + F[2]], [0, 1, 0]);
    const fov = 62 * Math.PI / 180;
    const aspect = W / H;
    const proj = M.perspective(fov, aspect, 0.05, 420);
    const VP = M.mul(proj, view);
    let Rt = [-F[2], 0, F[0]];                         // right = forward × up
    const rl = Math.hypot(Rt[0], Rt[2]); Rt = [Rt[0] / rl, 0, Rt[2] / rl];
    const Up = [Rt[1] * F[2] - Rt[2] * F[1], Rt[2] * F[0] - Rt[0] * F[2], Rt[0] * F[1] - Rt[1] * F[0]];
    const windAmt = L.wind * (1 + Math.min(1.5, Math.abs(cam.vel) * 0.06));

    // ---------------- scene ----------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.scene.drawFb);
    gl.viewport(0, 0, rw, rh);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clearColor(L.fog[0], L.fog[1], L.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // sky
    let pr = P.sky;
    gl.useProgram(pr.p);
    gl.uniform3fv(pr.u.uCF, F);
    gl.uniform3fv(pr.u.uCR, Rt);
    gl.uniform3fv(pr.u.uCU, Up);
    gl.uniform2f(pr.u.uTan, Math.tan(fov / 2) * aspect, Math.tan(fov / 2));
    gl.uniform3fv(pr.u.uTop, L.top);
    gl.uniform3fv(pr.u.uMid, L.mid);
    gl.uniform3fv(pr.u.uHor, L.hor);
    gl.uniform3fv(pr.u.uGlowC, L.glow);
    gl.uniform3fv(pr.u.uFog, L.fog);
    gl.uniform1f(pr.u.uStars, L.stars);
    gl.uniform1f(pr.u.uClouds, L.clouds);
    gl.uniform1f(pr.u.uMount, L.mount);
    gl.uniform1f(pr.u.uMoon, L.moon);
    gl.uniform1f(pr.u.uTime, t);
    gl.bindVertexArray(V.full);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // ground
    pr = P.ground;
    gl.useProgram(pr.p);
    setWorld(pr, t, eye, windAmt);
    setFog(pr, L);
    gl.uniformMatrix4fv(pr.u.uVP, false, VP);
    gl.uniform3fv(pr.u.uGBase, T.u.gBase);
    gl.uniform3fv(pr.u.uSand, [0.42, 0.36, 0.6]);
    gl.bindVertexArray(V.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // sea
    if (s > 150 && s < 420) {
      pr = P.sea;
      gl.useProgram(pr.p);
      setWorld(pr, t, eye, windAmt);
      setFog(pr, L);
      gl.uniformMatrix4fv(pr.u.uVP, false, VP);
      gl.uniform3fv(pr.u.uSea, L.sea);
      gl.bindVertexArray(V.quad);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // grass
    pr = P.grass;
    gl.useProgram(pr.p);
    setWorld(pr, t, eye, windAmt);
    setFog(pr, L);
    gl.uniformMatrix4fv(pr.u.uVP, false, VP);
    gl.uniform3fv(pr.u.uGBase, T.u.gBase);
    gl.uniform3fv(pr.u.uGTip, T.u.gTip);
    gl.uniform2fv(pr.u.uGP, T.u.gP);
    gl.uniform3fv(pr.u.uRim, L.rim);
    gl.bindVertexArray(V.grass);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 9, Math.floor(counts.grass * quality));

    if (samples) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);

    // trees
    pr = P.sprite;
    gl.useProgram(pr.p);
    setWorld(pr, t, eye, windAmt);
    setFog(pr, L);
    gl.uniformMatrix4fv(pr.u.uVP, false, VP);
    gl.uniform3fv(pr.u.uCamR, Rt);
    gl.uniform1i(pr.u.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(pr.u.uMode, 0);
    // trees are always there; distance alone decides how much of them the mist gives back
    gl.uniform3fv(pr.u.uDark, [0.03, 0.04, 0.09]);
    gl.uniform3fv(pr.u.uLite, [0.16, 0.2, 0.36]);
    gl.uniform1f(pr.u.uFogMul, 0.85);
    gl.uniform1f(pr.u.uFadeFar, 185);
    gl.bindTexture(gl.TEXTURE_2D, T.cedar);
    gl.bindVertexArray(V.cedar);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, counts.cedar);
    gl.uniform3fv(pr.u.uDark, [0.07, 0.04, 0.12]);
    gl.uniform3fv(pr.u.uLite, [0.2, 0.13, 0.3]);
    gl.uniform1f(pr.u.uFogMul, 0.7);
    gl.uniform1f(pr.u.uFadeFar, 175);
    gl.bindTexture(gl.TEXTURE_2D, T.tree);
    gl.bindVertexArray(V.tree);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1);

    // flowers
    pr = P.flower;
    gl.useProgram(pr.p);
    setWorld(pr, t, eye, windAmt);
    setFog(pr, L);
    gl.uniformMatrix4fv(pr.u.uVP, false, VP);
    gl.uniform3fv(pr.u.uCamR, Rt);
    gl.uniform4fv(pr.u.uFW, T.u.fw);
    gl.uniform3fv(pr.u.uFT, T.u.ft);
    gl.uniform3fv(pr.u.uFol, T.u.fol);
    gl.uniform1fv(pr.u.uGlow, T.u.glow);
    gl.uniform1fv(pr.u.uSize, T.u.size);
    gl.uniform1f(pr.u.uLight, L.light);
    gl.uniform1i(pr.u.uTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, T.atlas);
    gl.bindVertexArray(V.flower);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.floor(counts.flower * quality));

    // the cat
    if (s > 500) {
      gl.bindTexture(gl.TEXTURE_2D, T.cat);
      catAcc += dt;
      if (catAcc > 1 / 30) {          // the cat lives at 30 frames a second
        catSprite.update(t, catAcc, Math.max(-1, Math.min(1, -cam.yaw * 3)), s > 594);
        catAcc = 0;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, catSprite.canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
      }
      pr = P.sprite;
      gl.useProgram(pr.p);
      gl.uniform1i(pr.u.uMode, 1);
      gl.uniform1f(pr.u.uFadeFar, 1e5);
      gl.bindVertexArray(V.cat);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1);
    }
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);

    // fireflies
    pr = P.fly;
    gl.useProgram(pr.p);
    setWorld(pr, t, eye, windAmt);
    gl.uniformMatrix4fv(pr.u.uVP, false, VP);
    gl.uniform1f(pr.u.uAmt, Math.max(0.12, L.fly));
    gl.uniform1f(pr.u.uPx, rh / 900);
    gl.uniform3fv(pr.u.uFlyC, L.flyC);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    gl.bindVertexArray(V.fly);
    gl.drawArrays(gl.POINTS, 0, counts.fly);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    if (RT.scene.resolve) RT.scene.resolve();

    // ---------------- post ----------------
    gl.bindVertexArray(V.full);
    const pass = (prog, dst, src, setup) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
      gl.viewport(0, 0, dst ? dst.w : canvas.width, dst ? dst.h : canvas.height);
      gl.useProgram(prog.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src);
      gl.uniform1i(prog.u.uTex, 0);
      if (setup) setup(prog.u);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    pass(P.bright, RT.a4, RT.scene.tex, u => { gl.uniform2f(u.uTexel, 1 / rw, 1 / rh); gl.uniform1f(u.uTh, 0.3); });
    pass(P.blur, RT.b4, RT.a4.tex, u => gl.uniform2f(u.uDir, 1 / RT.a4.w, 0));
    pass(P.blur, RT.a4, RT.b4.tex, u => gl.uniform2f(u.uDir, 0, 1 / RT.a4.h));
    pass(P.bright, RT.a8, RT.a4.tex, u => { gl.uniform2f(u.uTexel, 1 / RT.a4.w, 1 / RT.a4.h); gl.uniform1f(u.uTh, -1); });
    for (let k = 0; k < 2; k++) {
      pass(P.blur, RT.b8, RT.a8.tex, u => gl.uniform2f(u.uDir, (1 + k) / RT.a8.w, 0));
      pass(P.blur, RT.a8, RT.b8.tex, u => gl.uniform2f(u.uDir, 0, (1 + k) / RT.a8.h));
    }
    pr = P.composite;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(pr.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.scene.tex); gl.uniform1i(pr.u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, RT.a4.tex); gl.uniform1i(pr.u.uB1, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, RT.a8.tex); gl.uniform1i(pr.u.uB2, 2);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform2f(pr.u.uRes, canvas.width, canvas.height);
    gl.uniform1f(pr.u.uTime, t);
    gl.uniform1f(pr.u.uGrain, 0.07);
    const lvl = window.Player ? window.Player.bass() : 0;
    gl.uniform1f(pr.u.uBloom, 0.9 + lvl * 0.5);
    gl.uniform1f(pr.u.uFade, fade);
    gl.uniform3fv(pr.u.uFadeC, [0.93, 0.88, 1.0]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ---------------- words & hud ----------------
    for (const w of words) {
      const ahead = w.s - s;
      if (ahead < -3 || ahead > 48) {
        if (w.shown) { w.el.style.opacity = 0; w.shown = false; }
        continue;
      }
      const p = M.project(VP, w.x, w.y, w.z);
      if (p.w < 0.3) { w.el.style.opacity = 0; w.shown = false; continue; }
      const sx = (p.x * 0.5 + 0.5) * W, sy = (0.5 - p.y * 0.5) * H;
      const dist = p.w;
      const sc = Math.min(2.2, Math.max(0.3, 6.5 / dist));
      const op = smooth(44, 24, dist) * smooth(1.6, 5, dist);
      const blur = Math.max(0, (dist - 13) / 7);
      w.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${sc.toFixed(3)}) translate(-50%, -100%)`;
      w.el.style.opacity = op.toFixed(3);
      w.el.style.filter = blur > 0.25 ? `blur(${blur.toFixed(1)}px)` : 'none';
      w.shown = true;
    }
    hudZone.textContent = `${L.name} · ${s.toFixed(1).padStart(5, '0')} m`;
    const el = Math.floor((now - enteredAt) / 1000);
    hudTime.textContent = `here for ${String(Math.floor(el / 3600)).padStart(2, '0')}:${String(Math.floor(el / 60) % 60).padStart(2, '0')}:${String(el % 60).padStart(2, '0')}`;
    if (window.Player) {
      const st = window.Player.state();
      hudSong.textContent = st.playing ? (st.mode === 'ghost' ? '♪ ghost signal' : `♪ ${st.roman}. ${st.title}`) : '';
    }
    endingEl.classList.toggle('on', s > D - 7);

    // wind follows your pace
    if (wind) {
      const ac = wind.ctx;
      wind.gain.gain.setTargetAtTime(0.018 + Math.min(0.07, Math.abs(cam.vel) * 0.006) * L.wind, ac.currentTime, 0.3);
      wind.bp.frequency.setTargetAtTime(380 + Math.abs(cam.vel) * 25 + Math.sin(t * 0.3) * 120, ac.currentTime, 0.4);
    }
  }

  function startWind() {
    if (!window.Player) return;
    const ac = window.Player.audioContext();
    if (!ac) return;
    const len = ac.sampleRate * 3, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) { b = b * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = b * 6; }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 0.5;
    const gain = ac.createGain();
    gain.gain.value = 0;
    src.connect(bp).connect(gain).connect(ac.destination);
    src.start();
    wind = { ctx: ac, src, bp, gain };
  }
  function stopWind() {
    if (!wind) return;
    const w = wind;
    wind = null;
    w.gain.gain.setTargetAtTime(0, w.ctx.currentTime, 0.3);
    setTimeout(() => { try { w.src.stop(); } catch (e) { } }, 1500);
  }

  function intro() {
    const st = window.Player ? window.Player.state() : { playing: false };
    const lines = [
      ['drift', 'big'],
      ['you are falling asleep'],
      [st.playing ? 'the record keeps turning' : 'the record is quiet here'],
      ['scroll to wander']
    ];
    introEl.classList.remove('out');
    introEl.innerHTML = '';
    lines.forEach(([text, cls], i) => {
      const p = document.createElement('p');
      p.textContent = text;
      if (cls) p.className = cls;
      introEl.appendChild(p);
      setTimeout(() => p.classList.add('show'), 700 + i * 900);
    });
    setTimeout(() => introEl.classList.add('out'), 9000);
  }

  function enter() {
    const dream = document.getElementById('dream');
    dream.classList.add('on');
    dream.setAttribute('aria-hidden', 'false');
    if (!gl && !init()) {
      document.getElementById('glNote').hidden = false;
      return;
    }
    resize();
    scrollEl.scrollTop = 0;
    cam.s = cam.target = 0;
    cam.vel = 0;
    fade = 1;
    words.forEach(w => { w.el.style.opacity = 0; w.shown = false; });
    endingEl.classList.remove('on');
    running = true;
    t0 = last = enteredAt = performance.now();
    raf = requestAnimationFrame(frame);
    scrollEl.focus({ preventScroll: true });
    startWind();
    intro();
  }

  function leave() {
    running = false;
    cancelAnimationFrame(raf);
    stopWind();
    const dream = document.getElementById('dream');
    dream.classList.remove('on');
    dream.setAttribute('aria-hidden', 'true');
  }

  window.Field = { enter, leave, get active() { return running; } };
})();
