/* ==========================================================
   cat-real.js — the black cat waiting at the end of the dream.
   painted once in layers (body, head, ears: fur, moonlit rims),
   then every frame: eyes, whiskers, breathing, the tail.
   ========================================================== */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const S = 512;          // texture size
  const G = 476;          // where the paws touch the ground
  const LX = -0.55, LY = -0.83;                 // moonlight from the upper left
  const RIM = [178, 154, 238], RIM2 = [226, 168, 246];
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  }
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const tmp = mk(), tctx = tmp.getContext('2d');

  function addEllipse(p, e) {
    const [cx, cy, rx, ry, rot] = e;
    p.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot));
    p.ellipse(cx, cy, rx, ry, rot, 0, TAU);
  }
  function ellipseSamples(e, step) {
    const [cx, cy, rx, ry, rot] = e;
    const per = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    const n = Math.max(16, Math.round(per / step));
    const c = Math.cos(rot), s = Math.sin(rot), out = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      const lx = rx * Math.cos(a), ly = ry * Math.sin(a);
      const nx0 = Math.cos(a) / rx, ny0 = Math.sin(a) / ry;
      const nx = nx0 * c - ny0 * s, ny = nx0 * s + ny0 * c, l = Math.hypot(nx, ny);
      out.push([cx + lx * c - ly * s, cy + lx * s + ly * c, nx / l, ny / l]);
    }
    return out;
  }
  // points along quadratic segments, normals pointing away from (cx, cy)
  function quadSamples(segs, step, cx, cy) {
    const out = [];
    segs.forEach(([p0, p1, p2]) => {
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const n = Math.max(6, Math.round(len / step));
      for (let i = 0; i < n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
        const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
        const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
        const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
        let nx = dy, ny = -dx;
        const l = Math.hypot(nx, ny) || 1;
        nx /= l; ny /= l;
        if (nx * (x - cx) + ny * (y - cy) < 0) { nx = -nx; ny = -ny; }
        out.push([x, y, nx, ny]);
      }
    });
    return out;
  }

  // a thin band of light along the edges that face the moon
  function rim(dst, path, dx, dy, color, blur, alpha) {
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.globalCompositeOperation = 'source-over';
    tctx.clearRect(0, 0, S, S);
    tctx.fillStyle = color;
    tctx.fill(path);
    tctx.globalCompositeOperation = 'destination-out';
    tctx.translate(dx, dy);
    tctx.fill(path);
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.globalCompositeOperation = 'source-over';
    dst.save();
    dst.clip(path);
    dst.globalAlpha = alpha;
    dst.filter = `blur(${blur}px)`;
    dst.drawImage(tmp, 0, 0);
    dst.restore();
  }

  function furFill(ctx, path, box, from, to) {
    ctx.save();
    ctx.clip(path);
    const g = ctx.createLinearGradient(box[0], box[1], box[2], box[3]);
    g.addColorStop(0, from);
    g.addColorStop(0.55, '#0d0a13');
    g.addColorStop(1, to);
    ctx.fillStyle = g;
    ctx.fillRect(box[0] - 20, box[1] - 20, box[2] - box[0] + 40, box[3] - box[1] + 40);
    ctx.restore();
  }

  function furTexture(ctx, path, box, r, count, flow) {
    ctx.save();
    ctx.clip(path);
    ctx.lineCap = 'round';
    const w = box[2] - box[0], h = box[3] - box[1];
    for (let i = 0; i < count; i++) {
      const x = box[0] + r() * w, y = box[1] + r() * h;
      const a = flow(x, y) + (r() - 0.5) * 0.45, len = 4 + r() * 9;
      const lit = Math.max(0, 1 - ((x - box[0]) / w * 0.75 + (y - box[1]) / h * 0.85));
      if (r() < 0.55) ctx.strokeStyle = `rgba(${RIM[0]},${RIM[1]},${RIM[2]},${(0.02 + 0.1 * lit * r()).toFixed(3)})`;
      else ctx.strokeStyle = `rgba(0,0,0,${(0.18 + r() * 0.3).toFixed(3)})`;
      ctx.lineWidth = 0.6 + r() * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (r() - 0.5) * 2, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // hairs breaking the silhouette, lit where they face the moon
  function edgeFur(ctx, samples, union, r, o) {
    ctx.lineCap = 'round';
    for (const [x, y, nx, ny] of samples) {
      if (union && tctx.isPointInPath(union, x + nx * 3, y + ny * 3)) continue;
      const lit = Math.max(0, nx * LX + ny * LY), lit2 = Math.max(0, nx * 0.85 - ny * 0.2) * 0.45;
      const L = Math.min(1, lit * 1.3) * o.rim, L2 = lit2 * o.rim;
      const cr = 14 + (RIM[0] - 14) * L + (RIM2[0] - 14) * L2;
      const cg = 11 + (RIM[1] - 11) * L + (RIM2[1] - 11) * L2;
      const cb = 20 + (RIM[2] - 20) * L + (RIM2[2] - 20) * L2;
      const lenMul = o.lenFn ? o.lenFn(x, y, nx, ny) : 1;
      for (let k = 0; k < o.density; k++) {
        const len = (o.len[0] + r() * (o.len[1] - o.len[0])) * lenMul;
        const ang = Math.atan2(ny, nx) + (r() - 0.5) * 0.85;
        const bx = x - nx * 2.5 + (r() - 0.5) * 2, by = y - ny * 2.5 + (r() - 0.5) * 2;
        const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len + len * (o.droop || 0.25);
        ctx.strokeStyle = `rgba(${Math.min(255, cr) | 0},${Math.min(255, cg) | 0},${Math.min(255, cb) | 0},${(0.45 + r() * 0.5).toFixed(2)})`;
        ctx.lineWidth = o.width * (0.55 + r() * 0.8);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo((bx + ex) / 2 + (r() - 0.5) * 2.5, (by + ey) / 2 + (r() - 0.5) * 2.5, ex, ey);
        ctx.stroke();
      }
    }
  }

  // ---------------------------------------------------------------------
  const BODY_E = [
    [200, 414, 62, 62, -0.25],   // left haunch
    [314, 416, 62, 60, 0.25],    // right haunch
    [256, 350, 72, 114, 0],      // torso
    [256, 284, 70, 56, 0],       // chest ruff
    [256, 250, 62, 48, 0],       // neck
    [240, 470, 21, 10, -0.05],   // paws
    [276, 470, 21, 10, 0.05]
  ];
  const LEGS = [[226, 318, 30, 152], [260, 318, 30, 152]];
  const HEAD_E = [[256, 186, 86, 72, 0], [256, 214, 96, 50, 0]];

  function buildBody(r) {
    const c = mk(), x = c.getContext('2d');
    // a soft shadow in the grass
    x.save();
    x.translate(262, G + 8);
    x.scale(1, 0.13);
    const sg = x.createRadialGradient(0, 0, 10, 0, 0, 175);
    sg.addColorStop(0, 'rgba(0,0,0,0.65)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sg;
    x.beginPath(); x.arc(0, 0, 175, 0, TAU); x.fill();
    x.restore();

    const body = new Path2D();
    BODY_E.forEach(e => addEllipse(body, e));
    LEGS.forEach(([lx, ly, w, h]) => body.roundRect(lx, ly, w, h, 15));
    const box = [118, 196, 396, 484];
    furFill(x, body, box, '#1b1626', '#050307');
    furTexture(x, body, box, r, 4600, px => Math.PI / 2 + (px - 256) * 0.006);

    // fluffy chest: the ruff lies over the chest like a bib
    const ruff = ellipseSamples(BODY_E[3], 2.2).filter(s => s[3] > 0.15);
    edgeFur(x, ruff, null, r, { len: [6, 14], width: 1, density: 2, rim: 0.35, droop: 0.6 });
    // form: soft sheen where the fur turns toward the sky, soft dark where it turns away
    x.save();
    x.clip(body);
    x.filter = 'blur(14px)';
    [[212, 286, 34, 22, 0.1], [186, 372, 34, 18, 0.09], [330, 376, 30, 16, 0.05], [256, 300, 26, 18, 0.05], [240, 350, 10, 40, 0.05]].forEach(([hx, hy, rx, ry, a]) => {
      x.fillStyle = `rgba(${RIM},${a})`;
      x.beginPath(); x.ellipse(hx, hy, rx, ry, 0, 0, TAU); x.fill();
    });
    x.fillStyle = 'rgba(0,0,0,0.55)';
    x.beginPath(); x.ellipse(256, 430, 70, 40, 0, 0, TAU); x.fill();
    // the front legs, the shadow between them, the haunches folded behind
    x.filter = 'blur(2.5px)';
    x.strokeStyle = 'rgba(0,0,0,0.55)';
    x.lineWidth = 5;
    x.beginPath(); x.moveTo(257, 340); x.quadraticCurveTo(259, 410, 258, 476); x.stroke();
    x.lineWidth = 3;
    x.strokeStyle = 'rgba(0,0,0,0.38)';
    LEGS.forEach(([lx, ly, w, h], i) => {
      const ox = i ? lx + w : lx;
      x.beginPath(); x.moveTo(ox, ly + 70); x.quadraticCurveTo(ox + (i ? 2 : -2), ly + 120, ox, ly + h - 6); x.stroke();
    });
    x.strokeStyle = `rgba(${RIM},0.13)`;
    x.lineWidth = 2;
    x.beginPath(); x.moveTo(230, 360); x.quadraticCurveTo(228, 420, 231, 462); x.stroke();
    x.filter = 'blur(0.8px)';
    [[240, 470], [276, 470]].forEach(([px, py]) => {
      x.strokeStyle = 'rgba(0,0,0,0.5)';
      x.lineWidth = 1.3;
      for (let k = -1; k <= 1; k += 2) {
        x.beginPath(); x.moveTo(px + k * 6, py - 5); x.quadraticCurveTo(px + k * 7, py + 2, px + k * 6, py + 8); x.stroke();
      }
      for (let k = -1; k <= 1; k++) {
        x.fillStyle = `rgba(${RIM},0.08)`;
        x.beginPath(); x.ellipse(px + k * 12, py - 4, 5, 3, 0, 0, TAU); x.fill();
      }
    });
    x.filter = 'none';
    x.restore();

    rim(x, body, 7, 9, rgb(RIM), 2.5, 0.85);
    rim(x, body, -6, 5, rgb(RIM2), 3, 0.18);
    const samples = [];
    BODY_E.forEach(e => samples.push(...ellipseSamples(e, 2.4)));
    LEGS.forEach(([lx, ly, w, h]) => {
      for (let y = ly; y < ly + h; y += 2.4) { samples.push([lx, y, -1, 0]); samples.push([lx + w, y, 1, 0]); }
    });
    edgeFur(x, samples, body, r, { len: [4, 10], width: 1.1, density: 2, rim: 1 });
    return c;
  }

  function buildHead(r) {
    const c = mk(), x = c.getContext('2d');
    const head = new Path2D();
    HEAD_E.forEach(e => addEllipse(head, e));
    const box = [160, 112, 352, 266];
    furFill(x, head, box, '#1d1829', '#07050a');
    furTexture(x, head, box, r, 3000, (px, py) => Math.atan2(py - 226, px - 256));

    x.save();
    x.clip(head);
    // eye sockets and brows
    [[222, 182, 0.12], [290, 182, -0.12]].forEach(([ex, ey, tilt], i) => {
      x.save();
      x.translate(ex, ey);
      x.rotate(tilt);
      const g = x.createRadialGradient(0, 0, 10, 0, 0, 34);
      g.addColorStop(0, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.beginPath(); x.ellipse(0, 0, 34, 26, 0, 0, TAU); x.fill();
      x.strokeStyle = `rgba(${RIM},${i ? 0.1 : 0.2})`;
      x.lineWidth = 2.2;
      x.filter = 'blur(1.2px)';
      x.beginPath(); x.ellipse(0, -3, 25, 20, 0, Math.PI * 1.12, Math.PI * 1.88); x.stroke();
      x.filter = 'none';
      x.restore();
    });
    // the bridge of the nose catches a little light
    x.filter = 'blur(4px)';
    x.strokeStyle = `rgba(${RIM},0.1)`;
    x.lineWidth = 12;
    x.beginPath(); x.moveTo(254, 160); x.lineTo(254, 214); x.stroke();
    x.filter = 'none';
    // whisker pads
    [[240, 236], [272, 236]].forEach(([px, py]) => {
      const g = x.createRadialGradient(px, py - 3, 2, px, py, 20);
      g.addColorStop(0, `rgba(${RIM},0.09)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.beginPath(); x.ellipse(px, py, 20, 14, 0, 0, TAU); x.fill();
      for (let k = 0; k < 9; k++) {
        x.fillStyle = 'rgba(0,0,0,0.6)';
        x.beginPath(); x.arc(px - 9 + (k % 3) * 9 + (k > 2 ? 2 : 0), py - 5 + ((k / 3) | 0) * 5, 0.9, 0, TAU); x.fill();
      }
    });
    // nose and mouth
    const nose = new Path2D();
    nose.moveTo(245, 220);
    nose.quadraticCurveTo(256, 215, 267, 220);
    nose.quadraticCurveTo(266, 225, 259, 231);
    nose.quadraticCurveTo(256, 234, 253, 231);
    nose.quadraticCurveTo(246, 225, 245, 220);
    x.fillStyle = '#161119';
    x.fill(nose);
    x.fillStyle = `rgba(${RIM},0.32)`;
    x.beginPath(); x.ellipse(253, 220, 5, 2, -0.2, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.85)';
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(256, 233); x.lineTo(256, 240);
    x.quadraticCurveTo(250, 246, 243, 243);
    x.moveTo(256, 240);
    x.quadraticCurveTo(262, 246, 269, 243);
    x.stroke();
    x.strokeStyle = `rgba(${RIM},0.1)`;
    x.beginPath(); x.moveTo(246, 247); x.quadraticCurveTo(256, 252, 266, 247); x.stroke();
    x.restore();

    rim(x, head, 6, 8, rgb(RIM), 2.2, 0.92);
    rim(x, head, -6, 4, rgb(RIM2), 2.5, 0.3);
    const samples = [];
    HEAD_E.forEach(e => samples.push(...ellipseSamples(e, 2)));
    edgeFur(x, samples, head, r, {
      len: [3, 7], width: 1, density: 2, rim: 1,
      lenFn: (px, py, nx, ny) => (ny > 0.1 && Math.abs(nx) > 0.45 ? 2 : 1)   // cheek fluff
    });
    return c;
  }

  function buildEar(r, left) {
    const c = mk(), x = c.getContext('2d');
    const m = v => (left ? v : 512 - v);
    const O = [m(174), 162], T = [m(172), 68], I = [m(238), 126];
    const Co = [m(158), 112], Ci = [m(206), 84];
    const ear = new Path2D();
    ear.moveTo(O[0], O[1]);
    ear.quadraticCurveTo(Co[0], Co[1], T[0], T[1]);
    ear.quadraticCurveTo(Ci[0], Ci[1], I[0], I[1]);
    ear.closePath();
    furFill(x, ear, [Math.min(m(150), m(240)), 60, Math.max(m(150), m(240)), 170], '#1d1829', '#08060b');
    // the inside of the ear, a little paler, with long pale tufts
    const inner = new Path2D();
    inner.moveTo(m(188), 150);
    inner.quadraticCurveTo(m(176), 114, m(181), 88);
    inner.quadraticCurveTo(m(205), 100, m(227), 129);
    inner.closePath();
    const g = x.createLinearGradient(m(204), 140, m(184), 92);
    g.addColorStop(0, '#120d18');
    g.addColorStop(0.5, '#2b2237');
    g.addColorStop(1, '#16111d');
    x.fillStyle = g;
    x.fill(inner);
    x.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const bx = m(196 + r() * 26), by = 124 + r() * 16;
      const a = (left ? -2.05 : -1.09) + (r() - 0.5) * 0.5, len = 14 + r() * 22;
      x.strokeStyle = `rgba(214,200,248,${(0.18 + r() * 0.4).toFixed(2)})`;
      x.lineWidth = 0.6 + r() * 0.6;
      x.beginPath();
      x.moveTo(bx, by);
      x.quadraticCurveTo(bx + Math.cos(a) * len * 0.5 + (r() - 0.5) * 4, by + Math.sin(a) * len * 0.5, bx + Math.cos(a) * len, by + Math.sin(a) * len);
      x.stroke();
    }
    rim(x, ear, left ? 5 : 4, 7, rgb(RIM), 1.8, left ? 0.95 : 0.7);
    rim(x, ear, -5, 4, rgb(RIM2), 2, 0.3);
    const samples = quadSamples([[O, Co, T], [T, Ci, I]], 2, m(204), 130);
    edgeFur(x, samples, null, r, { len: [2, 5], width: 0.9, density: 2, rim: 1, droop: 0.05 });
    return c;
  }

  // ---------------------------------------------------------------------
  function drawEye(c, cx, cy, tilt, open, pupilW, look, r) {
    const w = 37, h = 26;
    c.save();
    c.translate(cx, cy);
    c.rotate(tilt);
    const hh = h * Math.max(open, 0.001);
    const p = new Path2D();
    p.moveTo(-w / 2, 0);
    p.bezierCurveTo(-w * 0.25, -hh * 0.95, w * 0.3, -hh * 1.05, w / 2, -hh * 0.1);
    p.bezierCurveTo(w * 0.25, hh * 0.85, -w * 0.3, hh * 0.9, -w / 2, 0);
    if (open > 0.08) {
      c.save();
      c.clip(p);
      const lx = look * 3;
      const g = c.createRadialGradient(lx, 3, 1, lx, 0, w * 0.56);
      g.addColorStop(0, '#fcf8c8');
      g.addColorStop(0.3, '#dfe266');
      g.addColorStop(0.72, '#9aa838');
      g.addColorStop(1, '#36380f');
      c.fillStyle = g;
      c.fillRect(-w, -h, w * 2, h * 2);
      c.lineWidth = 0.7;
      for (let i = 0; i < 46; i++) {
        const a = i / 46 * TAU + r[i % r.length] * 0.2;
        c.strokeStyle = i % 2 ? 'rgba(255,255,215,0.22)' : 'rgba(40,60,8,0.28)';
        c.beginPath();
        c.moveTo(lx + Math.cos(a) * pupilW * 0.6, Math.sin(a) * pupilW * 0.9);
        c.lineTo(lx + Math.cos(a) * w * 0.5, Math.sin(a) * w * 0.5);
        c.stroke();
      }
      c.fillStyle = '#030204';
      c.beginPath(); c.ellipse(lx, 0, pupilW / 2, h * 0.46, 0, 0, TAU); c.fill();
      const sh = c.createLinearGradient(0, -hh, 0, hh * 0.2);
      sh.addColorStop(0, 'rgba(0,0,0,0.75)');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sh;
      c.fillRect(-w, -h, w * 2, h);
      c.fillStyle = 'rgba(255,255,255,0.95)';
      c.beginPath(); c.ellipse(lx - 5, -5, 3.4, 2.8, -0.4, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.beginPath(); c.ellipse(lx + 6, 6, 1.6, 1.2, 0, 0, TAU); c.fill();
      c.restore();
      c.strokeStyle = '#010102';
      c.lineWidth = 2.4;
      c.stroke(p);
    } else {
      c.strokeStyle = '#010102';
      c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(0, 7, w / 2, -2); c.stroke();
      c.strokeStyle = `rgba(${RIM},0.25)`;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(-w / 2 + 4, 3); c.quadraticCurveTo(0, 9, w / 2 - 4, 1); c.stroke();
    }
    c.restore();
    if (open > 0.3) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const gl = c.createRadialGradient(cx, cy, 4, cx, cy, 36);
      gl.addColorStop(0, `rgba(200,240,110,${(0.22 * open).toFixed(3)})`);
      gl.addColorStop(1, 'rgba(200,240,110,0)');
      c.fillStyle = gl;
      c.beginPath(); c.arc(cx, cy, 36, 0, TAU); c.fill();
      c.restore();
    }
  }

  function whiskers(c, t, twitch) {
    c.lineCap = 'round';
    const draw = (rx, ry, ang, len, curl) => {
      const ex = rx + Math.cos(ang) * len, ey = ry + Math.sin(ang) * len + curl;
      const g = c.createLinearGradient(rx, ry, ex, ey);
      g.addColorStop(0, 'rgba(236,228,255,0.62)');
      g.addColorStop(1, 'rgba(236,228,255,0.06)');
      c.strokeStyle = g;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(rx, ry);
      c.quadraticCurveTo(rx + Math.cos(ang) * len * 0.55, ry + Math.sin(ang) * len * 0.55 - curl * 0.15, ex, ey);
      c.stroke();
    };
    const tw = Math.sin(t * 9) * twitch * 0.05;
    for (let k = 0; k < 5; k++) {
      const a = (k - 2) * 0.12 + tw, len = 104 + (2 - Math.abs(k - 2)) * 9;
      draw(238 - k * 1.5, 232 + k * 3, Math.PI - 0.06 + a, len, 10 + k * 5);
      draw(274 + k * 1.5, 232 + k * 3, 0.06 - a, len, 10 + k * 5);
    }
    draw(214, 158, Math.PI + 0.75, 38, -4);
    draw(220, 154, Math.PI + 0.95, 32, -2);
    draw(298, 158, -0.75, 38, -4);
    draw(292, 154, -0.95, 32, -2);
  }

  function catmull(pts, n) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function tail(c, t, rr) {
    const lift = 0.5 + 0.5 * Math.sin(t * 0.8);
    const sw = Math.sin(t * 1.7) * 0.6 + Math.sin(t * 0.5) * 0.4;
    const ph = t % 7.3;
    const flick = Math.exp(-Math.pow(ph - 0.35, 2) * 28);
    const pts = [
      [366, 462], [398, 478], [374, 491], [300, 494], [228, 492], [180, 485],
      [156 - sw * 4, 470 - lift * 10 - flick * 6],
      [148 + sw * 9, 452 - lift * 20 - flick * 16]
    ];
    const sp = catmull(pts, 8);
    const n = sp.length;
    const rad = i => { const u = i / n; return 12.5 - 4.5 * u + Math.sin(u * Math.PI) * 1.2; };
    const frame = i => {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      let nx = dy / l, ny = -dx / l;
      if (ny > 0) { nx = -nx; ny = -ny; }       // nx, ny: the side that faces up
      return [dx / l, dy / l, nx, ny];
    };
    // the tail itself, a soft dark tube
    const g = c.createLinearGradient(140, 440, 400, 500);
    g.addColorStop(0, '#141019');
    g.addColorStop(1, '#09070d');
    c.fillStyle = g;
    for (let i = 0; i < n; i++) { c.beginPath(); c.arc(sp[i][0], sp[i][1], rad(i), 0, TAU); c.fill(); }
    // one continuous line of moonlight along its back
    c.save();
    c.filter = 'blur(1.2px)';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = `rgba(${RIM},0.42)`;
    c.lineWidth = 2.4;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const [, , nx, ny] = frame(i), r = rad(i) - 2.2;
      const px = sp[i][0] + nx * r, py = sp[i][1] + ny * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();
    c.restore();
    // hair, growing toward the tip, fluffier at the end
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const [tx, ty, nx, ny] = frame(i), r = rad(i);
      const lit = Math.max(0, nx * LX + ny * LY);
      const tipFluff = i > n - 10 ? 1.8 : 1;
      for (let k = 0; k < 5; k++) {
        const j = rr[(i * 5 + k) % rr.length], j2 = rr[(i * 7 + k * 3 + 11) % rr.length];
        const side = k % 2 ? 1 : -1;
        const sx = sp[i][0] + nx * side * (r - 1.5), sy = sp[i][1] + ny * side * (r - 1.5);
        const a = Math.atan2(ny * side, nx * side) * 0.6 + Math.atan2(ty, tx) * 0.4 + (j - 0.5) * 0.9;
        const len = (2 + j2 * 6) * tipFluff;
        const L = side > 0 ? 0.15 + lit * 0.6 : 0.03;
        c.strokeStyle = `rgba(${(14 + (RIM[0] - 14) * L) | 0},${(11 + (RIM[1] - 11) * L) | 0},${(20 + (RIM[2] - 20) * L) | 0},${(0.35 + j * 0.45).toFixed(2)})`;
        c.lineWidth = 0.6 + j2 * 0.6;
        c.beginPath();
        c.moveTo(sx, sy);
        c.quadraticCurveTo(sx + Math.cos(a) * len * 0.5 + (j2 - 0.5) * 2, sy + Math.sin(a) * len * 0.5, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
        c.stroke();
      }
    }
  }

  // ---------------------------------------------------------------------
  function create() {
    const r = rng(31337);
    const bodyL = buildBody(r), headL = buildHead(r), earL = buildEar(r, true), earR = buildEar(r, false);
    const rr = Array.from({ length: 97 }, r);
    const canvas = mk(), c = canvas.getContext('2d');
    const st = { blink: 0, nextBlink: 2.5, slow: -1, curious: 0, nextCurious: 6, twL: 0, twR: 0, nextTw: 3, last: 0 };

    function update(t, dt, look, arrived) {
      // little lives of a cat
      st.nextBlink -= dt;
      if (st.nextBlink <= 0 && st.slow < 0) { st.blink = 1; st.nextBlink = 3 + Math.random() * 4; }
      st.blink = Math.max(0, st.blink - dt * 7);
      if (arrived && st.slow < 0 && t - st.last > 9) { st.slow = 0; st.last = t; }
      let open = 1 - st.blink;
      if (st.slow >= 0) {
        st.slow += dt;
        const s = st.slow;
        open = s < 0.8 ? 1 - s / 0.8 : s < 1.4 ? 0 : s < 2.4 ? (s - 1.4) : 1;
        open = Math.max(0, Math.min(1, open));
        open = open * open * (3 - 2 * open);
        if (s > 2.5) st.slow = -1;
      }
      st.nextCurious -= dt;
      if (st.nextCurious <= 0) { st.curious = 1; st.nextCurious = 7 + Math.random() * 8; }
      st.curious = Math.max(0, st.curious - dt * 0.4);
      st.nextTw -= dt;
      if (st.nextTw <= 0) { if (Math.random() < 0.5) st.twL = 1; else st.twR = 1; st.nextTw = 2 + Math.random() * 5; }
      st.twL = Math.max(0, st.twL - dt * 5);
      st.twR = Math.max(0, st.twR - dt * 5);

      const curiousTilt = Math.sin(Math.min(1, st.curious) * Math.PI) * 0.16;
      const tilt = Math.sin(t * 0.4) * 0.035 + curiousTilt + look * 0.04;
      const breath = Math.sin(t * 1.7) * 0.007;
      const pupil = 11 + st.curious * 5;

      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, S, S);
      c.save();
      c.translate(256, G);
      c.scale(1 + breath * 0.4, 1 + breath);
      c.translate(-256, -G);
      c.drawImage(bodyL, 0, 0);
      c.restore();

      c.save();
      c.translate(256 + look * 3, 250 - breath * 120);
      c.rotate(tilt);
      c.translate(-256, -250);
      c.save(); c.translate(206, 140); c.rotate(-st.twL * 0.22); c.translate(-206, -140); c.drawImage(earL, 0, 0); c.restore();
      c.save(); c.translate(306, 140); c.rotate(st.twR * 0.28); c.translate(-306, -140); c.drawImage(earR, 0, 0); c.restore();
      c.drawImage(headL, 0, 0);
      drawEye(c, 222, 182, 0.12, open, pupil, look, rr);
      drawEye(c, 290, 182, -0.12, open, pupil, look, rr);
      whiskers(c, t, st.twL + st.twR);
      c.restore();

      tail(c, t, rr);
    }
    update(0, 0, 0, false);
    return { canvas, update };
  }

  window.RealCat = { create };
})();
