/* ==========================================================
   ascii.js — roses and a small black kitten, made of letters
   every frame is painted on a hidden canvas, then read back
   and re-written cell by cell as glyphs.
   ========================================================== */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  }
  const hash = (a, b, c) => {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------------------------------------------------------------------
  // a panel: source canvas → cells → glyph atlas
  // ---------------------------------------------------------------------
  class AsciiPanel {
    constructor(canvas, o) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = o;
      this.src = document.createElement('canvas');
      this.sctx = this.src.getContext('2d', { willReadFrequently: true });
      this.glyphs = [...o.glyphs];
      this.gi = {};
      this.glyphs.forEach((g, i) => { this.gi[g] = i; });
      this.pointer = { x: -1e4, y: -1e4 };
      this.resize();
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.W = Math.max(1, r.width);
      this.H = Math.max(1, r.height);
      this.cols = Math.max(1, Math.floor(this.W / this.o.cw));
      this.rows = Math.max(1, Math.floor(this.H / this.o.ch));
      this.c.width = Math.round(this.W * dpr);
      this.c.height = Math.round(this.H * dpr);
      this.src.width = this.cols * this.o.sx;
      this.src.height = this.rows * this.o.sy;
      this.prev = new Int32Array(this.cols * this.rows).fill(-2);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.c.width, this.c.height);
      if (this.dpr !== dpr || !this.atlas) this.buildAtlas(dpr);
      this.ox = (this.W - this.cols * this.o.cw) / 2;
      this.oy = (this.H - this.rows * this.o.ch) / 2;
      if (this.o.onResize) this.o.onResize(this);
    }
    buildAtlas(dpr) {
      this.dpr = dpr;
      const tw = Math.ceil(this.o.cw * dpr), th = Math.ceil(this.o.ch * dpr);
      const a = document.createElement('canvas');
      a.width = tw * this.glyphs.length;
      a.height = th * this.o.colors.length;
      const x = a.getContext('2d');
      x.font = `${this.o.weight || 400} ${(this.o.fontPx || this.o.ch) * dpr}px "Courier New", Courier, monospace`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      this.o.colors.forEach((col, ci) => {
        x.fillStyle = col;
        this.glyphs.forEach((g, gi) => x.fillText(g, gi * tw + tw / 2, ci * th + th / 2 + dpr * 0.5));
      });
      this.atlas = a;
      this.tw = tw;
      this.th = th;
    }
    render(t, extra) {
      const { sx, sy, cw, ch } = this.o;
      const s = this.sctx, W = this.W, H = this.H;
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.globalCompositeOperation = 'source-over';
      s.fillStyle = '#000';
      s.fillRect(0, 0, this.src.width, this.src.height);
      s.setTransform(this.src.width / W, 0, 0, this.src.height / H, 0, 0);
      this.o.draw(s, W, H, t, this, extra);
      const data = s.getImageData(0, 0, this.src.width, this.src.height).data;
      const sw = this.src.width, cols = this.cols, rows = this.rows;
      const ctx = this.ctx, dpr = this.dpr, tw = this.tw, th = this.th;
      const key = this.o.key || 0;
      const n = sx * sy;
      const cell = { r: 0, g: 0, b: 0, L: 0, gx: 0, gy: 0, col: 0, row: 0, near: 0 };
      const px = this.pointer.x, py = this.pointer.y, pr = this.o.pointerRadius || 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let R = 0, G = 0, B = 0, kl = 0, kr = 0, kt = 0, kb = 0;
          const x0 = col * sx, y0 = row * sy;
          for (let yy = 0; yy < sy; yy++) {
            let p = ((y0 + yy) * sw + x0) * 4;
            for (let xx = 0; xx < sx; xx++, p += 4) {
              const r = data[p], g = data[p + 1], b = data[p + 2];
              R += r; G += g; B += b;
              const k = key === 1 ? r : (r * 0.35 + g * 0.4 + b * 0.25);
              if (xx === 0) kl += k;
              if (xx === sx - 1) kr += k;
              if (yy === 0) kt += k;
              if (yy === sy - 1) kb += k;
            }
          }
          cell.r = R / (n * 255);
          cell.g = G / (n * 255);
          cell.b = B / (n * 255);
          cell.L = cell.r * 0.35 + cell.g * 0.4 + cell.b * 0.25;
          cell.gx = (kr - kl) / (sy * 255);
          cell.gy = (kb - kt) / (sx * 255);
          cell.col = col;
          cell.row = row;
          if (pr) {
            const dx = this.ox + (col + 0.5) * cw - px, dy = this.oy + (row + 0.5) * ch - py;
            const d2 = dx * dx + dy * dy;
            cell.near = d2 < pr * pr ? 1 - Math.sqrt(d2) / pr : 0;
          }
          const code = this.o.classify(cell, t, this, extra);
          const i = row * cols + col;
          if (code !== this.prev[i]) {
            const X = (this.ox + col * cw) * dpr, Y = (this.oy + row * ch) * dpr;
            ctx.clearRect(Math.floor(X), Math.floor(Y), Math.ceil(cw * dpr) + 1, Math.ceil(ch * dpr) + 1);
            if (code >= 0) {
              const gi = code >> 8, ci = code & 255;
              ctx.drawImage(this.atlas, gi * tw, ci * th, tw, th, X, Y, tw, th);
            }
            this.prev[i] = code;
          }
        }
      }
    }
    text() {
      let s = '';
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const c = this.prev[row * this.cols + col];
          s += c >= 0 ? this.glyphs[c >> 8] : ' ';
        }
        s += '\n';
      }
      return s;
    }
    edgeGlyph(gx, gy) {
      const ax = Math.abs(gx), ay = Math.abs(gy);
      if (ax > ay * 2.2) return this.gi['|'];
      if (ay > ax * 2.2) return gy > 0 ? this.gi['_'] : this.gi['-'];
      return (gx > 0) === (gy > 0) ? this.gi['/'] : this.gi['\\'];
    }
  }

  // ---------------------------------------------------------------------
  // palettes
  // ---------------------------------------------------------------------
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (c1, c2, t) => `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
  const ROSE_HUES = [
    [[20, 12, 58], [120, 70, 235], [214, 196, 255]],   // violet
    [[34, 10, 52], [196, 70, 230], [255, 200, 246]],   // orchid / pink
    [[12, 14, 60], [86, 84, 230], [184, 190, 255]]     // blue-violet
  ];
  const LEVELS = 9;
  const ROSE_COLORS = [];
  ROSE_HUES.forEach(([d, m, l]) => {
    for (let k = 0; k < LEVELS; k++) {
      const t = (k + 1) / LEVELS;
      ROSE_COLORS.push(t < 0.62 ? mix(d, m, t / 0.62) : mix(m, l, (t - 0.62) / 0.38));
    }
  });
  const GLITCH = '†‡✝▲▼◊¤∆*';
  const RAMP = '.,:;~=+*oa#%@';
  const ROSE_GLYPHS = RAMP + '|/\\_-' + GLITCH;

  // ---------------------------------------------------------------------
  // a rose, drawn the long way: back petals, then a spiral of cupped petals
  // ---------------------------------------------------------------------
  const BASE = [[150, 92, 255], [228, 104, 255], [104, 112, 255]];
  function col(h, v, a = 1) {
    const b = BASE[h];
    const k = Math.min(1, v * 1.25), w = Math.max(0, v - 0.72) * 2.2;
    return `rgba(${Math.min(255, b[0] * k + 255 * w) | 0},${Math.min(255, b[1] * k + 255 * w) | 0},${Math.min(255, b[2] * k + 255 * w) | 0},${a})`;
  }

  function drawRose(ctx, R, h, spin, open, seed) {
    const r = rng(seed);
    // outer petals
    const n = 6 + ((r() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + r() * 0.5 + spin * 0.3;
      const len = R * (0.92 + r() * 0.16) * open, w = R * (0.58 + r() * 0.14);
      ctx.save();
      ctx.rotate(a);
      const g = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, len);
      g.addColorStop(0, col(h, 0.1));
      g.addColorStop(0.55, col(h, 0.36));
      g.addColorStop(0.88, col(h, 0.78));
      g.addColorStop(1, col(h, 0.42));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.3, -w * 0.95, len * 0.98, -w * 0.75, len, 0);
      ctx.bezierCurveTo(len * 0.98, w * 0.75, len * 0.3, w * 0.95, 0, 0);
      ctx.fill();
      ctx.strokeStyle = col(h, 0.95, 0.9);
      ctx.lineWidth = R * 0.045;
      ctx.beginPath();
      ctx.moveTo(len * 0.7, -w * 0.58);
      ctx.quadraticCurveTo(len * 1.03, 0, len * 0.72, w * 0.56);
      ctx.stroke();
      ctx.restore();
    }
    // cupped inner petals — a spiral of crescents
    const m = 12;
    for (let i = 0; i < m; i++) {
      const f = i / (m - 1);
      const rr = R * (0.7 - 0.6 * f) * (0.85 + 0.15 * open);
      const a0 = i * 2.39996 + spin;
      const span = Math.PI * (1.05 + 0.35 * r());
      const mid = a0 + span / 2;
      const off = R * 0.05 * f;
      const ox = Math.cos(a0 + 1.2) * off, oy = Math.sin(a0 + 1.2) * off;
      const ix = ox - Math.cos(mid) * rr * 0.2, iy = oy - Math.sin(mid) * rr * 0.2;
      const g = ctx.createRadialGradient(ox, oy, rr * 0.55, ox, oy, rr);
      g.addColorStop(0, col(h, 0.08));
      g.addColorStop(0.7, col(h, 0.42 + 0.2 * (1 - f)));
      g.addColorStop(1, col(h, 0.98 - 0.25 * f));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ox, oy, rr, a0, a0 + span);
      ctx.arc(ix, iy, rr * 0.84, a0 + span, a0, true);
      ctx.closePath();
      ctx.fill();
      // the shadow where one petal tucks under the next
      ctx.strokeStyle = col(h, 0.02);
      ctx.lineWidth = Math.max(1, R * 0.035);
      ctx.beginPath();
      ctx.arc(ix, iy, rr * 0.84, a0 + span * 0.08, a0 + span * 0.92);
      ctx.stroke();
    }
    // the heart of the rose: a dark swirl, the way old ascii roses curl like "@"
    ctx.strokeStyle = col(h, 0.03);
    ctx.lineWidth = Math.max(1, R * 0.05);
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const a = spin * 1.3 + k / 60 * TAU * 1.6, rr = R * (0.02 + 0.2 * k / 60);
      if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.stroke();
    ctx.fillStyle = col(h, 0.04);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.05, 0, TAU);
    ctx.fill();
  }

  function drawLeaf(ctx, len, w) {
    const g = ctx.createLinearGradient(0, -w, 0, w);
    g.addColorStop(0, col(2, 0.34));
    g.addColorStop(1, col(2, 0.12));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -w, len, 0);
    ctx.quadraticCurveTo(len * 0.45, w, 0, 0);
    ctx.fill();
    ctx.strokeStyle = col(2, 0.55, 0.8);
    ctx.lineWidth = Math.max(0.8, w * 0.12);
    ctx.beginPath();
    ctx.moveTo(len * 0.05, 0);
    ctx.lineTo(len * 0.9, 0);
    ctx.stroke();
  }

  function layoutRoses(W, H, seed) {
    const r = rng(seed);
    const items = [];
    const n = Math.max(4, Math.round(H / (W * 0.6)));
    for (let i = 0; i < n * 3; i++) {
      items.push({ k: 'leaf', x: W * r() * 0.85, y: r() * H, len: W * (0.13 + r() * 0.14), w: W * (0.04 + r() * 0.04), a: r() * TAU, ph: r() * TAU });
    }
    for (let i = 0; i < n * 2; i++) {
      const x0 = W * (0.05 + r() * 0.6), y0 = r() * H;
      items.push({ k: 'stem', x: x0, y: y0, dx: (r() - 0.3) * W * 0.5, dy: (0.4 + r() * 0.5) * W, ph: r() * TAU });
    }
    for (let i = 0; i < n; i++) {
      items.push({ k: 'bud', x: W * (0.1 + r() * 0.75), y: r() * H, R: W * (0.05 + r() * 0.06), h: (r() * 3) | 0, rot: r() * TAU, ph: r() * TAU, seed: (r() * 1e9) | 0 });
    }
    const nr = Math.max(3, Math.round(H / (W * 0.72)));
    for (let i = 0; i < nr; i++) {
      const y = (i + 0.5 + (r() - 0.5) * 0.5) * H / nr;
      items.push({ k: 'rose', x: W * (0.0 + r() * 0.42), y, R: W * (0.25 + r() * 0.17), h: r() < 0.5 ? 0 : (r() < 0.55 ? 1 : 2), rot: r() * TAU, ph: r() * TAU, seed: (r() * 1e9) | 0 });
    }
    const petals = [];
    for (let i = 0; i < 6; i++) petals.push({ x: r() * W, s: 0.4 + r() * 0.8, ph: r() * 100, sz: W * (0.025 + r() * 0.02), h: (r() * 2) | 0 });
    return { items, petals };
  }

  function makeRosePanel(canvas, seed, mirror) {
    let lay = null;
    const panel = new AsciiPanel(canvas, {
      cw: 7, ch: 11, sx: 3, sy: 5, fontPx: 11.5, weight: 700,
      glyphs: ROSE_GLYPHS,
      colors: ROSE_COLORS,
      pointerRadius: 70,
      onResize: p => { lay = layoutRoses(p.W, p.H, seed); },
      draw(ctx, W, H, t, p, boost) {
        if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
        for (const it of lay.items) {
          const sway = Math.sin(t * 0.35 + it.ph);
          ctx.save();
          ctx.translate(it.x + sway * 2, it.y + Math.cos(t * 0.27 + it.ph) * 2);
          if (it.k === 'leaf') {
            ctx.rotate(it.a + sway * 0.06);
            drawLeaf(ctx, it.len, it.w);
          } else if (it.k === 'stem') {
            ctx.strokeStyle = col(2, 0.26);
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(it.dx * 0.2 + sway * 6, it.dy * 0.5, it.dx, it.dy);
            ctx.stroke();
          } else {
            const breath = 1 + Math.sin(t * 0.5 + it.ph) * 0.025 + boost * 0.05;
            ctx.scale(breath, breath);
            ctx.rotate(it.rot + sway * 0.05);
            drawRose(ctx, it.R, it.h, t * 0.04 + it.ph, it.k === 'bud' ? 0.55 : 1, it.seed);
          }
          ctx.restore();
        }
        // a few petals falling forever
        for (const pt of lay.petals) {
          const y = ((t * 14 * pt.s + pt.ph * 37) % (H + 80)) - 40;
          const x = pt.x + Math.sin(t * 0.6 * pt.s + pt.ph) * 26;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(t * 0.8 * pt.s + pt.ph);
          ctx.fillStyle = col(pt.h, 0.9, 0.9);
          ctx.beginPath();
          ctx.ellipse(0, 0, pt.sz, pt.sz * 0.55, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      },
      classify(c, t, p, boost) {
        let L = Math.min(1, c.L * (1.15 + boost * 0.5));
        if (c.near > 0 && hash(c.col, c.row, (t * 9) | 0) < c.near * 0.85) {
          const g = p.gi[GLITCH[(hash(c.row, c.col, (t * 13) | 0) * GLITCH.length) | 0]];
          return (g << 8) | (9 + 6 + ((c.near * 3) | 0));
        }
        if (L < 0.055) return -1;
        const tint = (c.r - c.b * 0.62);
        const h = tint > 0.06 ? 1 : (tint < -0.08 ? 2 : 0);
        const lv = Math.min(LEVELS - 1, (Math.pow(L, 0.82) * LEVELS) | 0);
        const e = Math.hypot(c.gx, c.gy);
        let gi;
        if (e > 0.34 && L > 0.1 && L < 0.72) gi = p.edgeGlyph(c.gx, c.gy);
        else gi = Math.min(RAMP.length - 1, (Math.pow(L, 0.9) * RAMP.length) | 0);
        if (hash(c.col, c.row, (t * 0.7) | 0) < 0.003) gi = p.gi[GLITCH[(hash(c.col, c.row, 3) * GLITCH.length) | 0]];
        return (gi << 8) | (h * LEVELS + lv);
      }
    });
    return panel;
  }

  // ---------------------------------------------------------------------
  // the kitten — a silhouette in three channels:
  //   red = body, green = eyes, blue = whiskers
  // ---------------------------------------------------------------------
  const kitten = { wag: 1, look: 0, flash: 0, blink: 0, nextBlink: 2.5, twitch: 0, nextTwitch: 4 };

  function drawCat(ctx, W, H, t, o = {}) {
    const k = Math.min(W / 230, H / 200);
    const body = o.body || '#ff0000', eye = o.eye || '#00ff00';
    const wh = o.whisker === undefined ? '#0000ff' : o.whisker;
    const wag = o.wag != null ? o.wag : 1;
    ctx.save();
    ctx.translate((W - 230 * k) / 2, H - 200 * k);
    ctx.scale(k, k);
    const sw = Math.sin(t * 1.7 * wag) * 0.75 + Math.sin(t * 0.63) * 0.25;

    ctx.fillStyle = body;
    ctx.strokeStyle = body;
    // tail
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(132, 184);
    const ex = 190 + sw * 24, ey = 108 + Math.abs(sw) * 10;
    ctx.bezierCurveTo(178, 198, 206 + sw * 8, 160, ex, ey);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.quadraticCurveTo(ex - 4 - sw * 6, ey - 16, ex - 14 - sw * 10, ey - 12);
    ctx.stroke();
    // body, chest, legs
    ctx.beginPath(); ctx.ellipse(100, 154, 50, 40, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(100, 120, 30, 38, 0, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(82, 118, 15, 74, 7) : ctx.rect(82, 118, 15, 74);
    ctx.roundRect ? ctx.roundRect(103, 118, 15, 74, 7) : ctx.rect(103, 118, 15, 74);
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(88, 191, 10, 5.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(112, 191, 10, 5.5, 0, 0, TAU); ctx.fill();
    // head
    const hx = 100 + (o.look || 0) * 3;
    ctx.beginPath(); ctx.ellipse(hx, 74, 36, 30, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx, 86, 40, 19, 0, 0, TAU); ctx.fill();
    // ears
    const tw = o.twitch || 0;
    ctx.beginPath(); ctx.moveTo(hx - 33, 68); ctx.lineTo(hx - 28, 22); ctx.lineTo(hx - 4, 47); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 4, 47); ctx.lineTo(hx + 28 + tw * 5, 23 - tw * 3); ctx.lineTo(hx + 33, 68); ctx.closePath(); ctx.fill();

    // eyes
    const open = 1 - (o.blink || 0);
    const er = o.eyeSize || 1;
    if (open > 0.08) {
      ctx.fillStyle = eye;
      ctx.beginPath(); ctx.ellipse(hx - 13, 76, 7.4 * er, 5.8 * er * open, 0.18, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hx + 13, 76, 7.4 * er, 5.8 * er * open, -0.18, 0, TAU); ctx.fill();
      if (o.pupil) {
        ctx.fillStyle = o.pupil;
        ctx.beginPath(); ctx.ellipse(hx - 13 + (o.look || 0) * 1.5, 76, 1.6, 4.8 * open, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + 13 + (o.look || 0) * 1.5, 76, 1.6, 4.8 * open, 0, 0, TAU); ctx.fill();
      }
    }
    // whiskers
    if (wh) {
      ctx.strokeStyle = wh;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx - 22, 88); ctx.lineTo(hx - 58, 82);
      ctx.moveTo(hx - 22, 92); ctx.lineTo(hx - 56, 97);
      ctx.moveTo(hx + 22, 88); ctx.lineTo(hx + 58, 82);
      ctx.moveTo(hx + 22, 92); ctx.lineTo(hx + 56, 97);
      ctx.stroke();
    }
    ctx.restore();
  }

  const KIT_COLORS = [
    '#23173b', '#31224f', '#3f2d66',          // 0-2 fur
    '#b89cff', '#e6d6ff',                     // 3-4 moonlit rim
    '#fdf0ff', '#ffb3f0',                     // 5-6 eyes (calm, startled)
    '#8f7ac0',                                // 7 whiskers
    '#3a2860', '#5b3f8f', '#e9a4ff'           // 8-10 grass, flowers
  ];
  const KIT_GLYPHS = '#%&8@$|/\\_-o0O~,\'`"v.*';

  function makeKitten(canvas) {
    return new AsciiPanel(canvas, {
      cw: 5, ch: 8.4, sx: 4, sy: 6, fontPx: 9, weight: 700, key: 1,
      glyphs: KIT_GLYPHS,
      colors: KIT_COLORS,
      draw(ctx, W, H, t) {
        ctx.globalCompositeOperation = 'lighter';
        drawCat(ctx, W, H - 6, t, { wag: kitten.wag, look: kitten.look, blink: kitten.blink, twitch: kitten.twitch, eyeSize: 1.25 });
      },
      classify(c, t, p) {
        const gi = p.gi;
        if (c.g > 0.22) {
          const g = c.g > 0.55 ? gi['@'] : gi['o'];
          return (g << 8) | (kitten.flash > 0 ? 6 : 5);
        }
        if (c.r > 0.9) {
          const fur = '#%&8@$';
          const g = gi[fur[(hash(c.col, c.row, (t * 1.5) | 0) * fur.length) | 0]];
          const shade = c.row < p.rows * 0.42 ? 2 : (c.row < p.rows * 0.7 ? 1 : 0);
          return (g << 8) | shade;
        }
        if (c.r > 0.1) {
          const g = Math.hypot(c.gx, c.gy) > 0.08 ? p.edgeGlyph(c.gx, c.gy) : gi['#'];
          return (g << 8) | (c.row < p.rows * 0.45 ? 4 : 3);
        }
        if (c.b > 0.12) return (gi[c.gx * c.gy > 0.002 ? '/' : (c.gx * c.gy < -0.002 ? '\\' : '-')] << 8) | 7;
        if (c.row >= p.rows - 2) {
          const h = hash(c.col, c.row, 11);
          const sway = Math.sin(t * 1.3 + c.col * 0.5) > 0;
          if (h < 0.08) return (gi['*'] << 8) | 10;
          if (h < 0.62) {
            const grass = sway ? ',\'`"v' : '`\',v"';
            return (gi[grass[(h * 50) % 5 | 0]] << 8) | (c.row === p.rows - 1 ? 9 : 8);
          }
        }
        return -1;
      }
    });
  }

  // ---------------------------------------------------------------------
  // the loop
  // ---------------------------------------------------------------------
  let left, right, kit, running = false, lastRose = 0, lastKit = 0;
  const t0 = performance.now();

  function loop(now) {
    if (!running) return;
    const t = (now - t0) / 1000;
    const boost = window.Player ? Math.min(1, window.Player.bass() * 1.2) : 0;
    if (now - lastRose > 70) {
      lastRose = now;
      left.render(t, boost);
      right.render(t + 31.7, boost);
    }
    if (now - lastKit > 50) {
      lastKit = now;
      // blinking, ear twitches, a calm tail that hurries when you come close
      const dt = 0.05;
      kitten.nextBlink -= dt;
      if (kitten.nextBlink <= 0) { kitten.blink = 1; kitten.nextBlink = 2.5 + Math.random() * 5; }
      kitten.blink = Math.max(0, kitten.blink - dt * 6);
      kitten.nextTwitch -= dt;
      if (kitten.nextTwitch <= 0) { kitten.twitch = 1; kitten.nextTwitch = 3 + Math.random() * 7; }
      kitten.twitch = Math.max(0, kitten.twitch - dt * 5);
      kitten.flash = Math.max(0, kitten.flash - dt);
      kitten.wag += ((kitten.hover ? 2.4 : 1) - kitten.wag) * 0.1;
      kit.render(t);
    }
    requestAnimationFrame(loop);
  }

  function init() {
    left = makeRosePanel(document.getElementById('roses-left'), 1337, false);
    right = makeRosePanel(document.getElementById('roses-right'), 4242, true);
    const kc = document.getElementById('kitten');
    kit = makeKitten(kc);

    const onMove = e => {
      for (const p of [left, right]) {
        const r = p.c.getBoundingClientRect();
        p.pointer.x = e.clientX - r.left;
        p.pointer.y = e.clientY - r.top;
      }
      const r = kc.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      kitten.look = Math.max(-1, Math.min(1, (e.clientX - cx) / 400));
    };
    addEventListener('pointermove', onMove, { passive: true });
    kc.addEventListener('pointerenter', () => { kitten.hover = true; });
    kc.addEventListener('pointerleave', () => { kitten.hover = false; });
    kc.addEventListener('click', () => {
      kitten.flash = 1.4;
      const w = document.createElement('span');
      w.className = 'mrrp';
      w.textContent = ['mrrp', '...', 'stay', '✝'][(Math.random() * 4) | 0];
      kc.parentElement.appendChild(w);
      setTimeout(() => w.remove(), 2600);
    });

    let rt = 0;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { left.resize(); right.resize(); kit.resize(); }, 120);
    });
    // fonts change nothing here (monospace), so start right away
    document.querySelectorAll('.roses').forEach(c => c.classList.add('on'));
    start();
  }

  function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
  function stop() { running = false; }

  window.Ascii = { init, start, stop, drawCat, panels: () => ({ left, right, kit }) };
})();
