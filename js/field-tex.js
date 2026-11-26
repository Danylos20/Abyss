/* ==========================================================
   field-tex.js — painting the flowers, the trees and the cat
   that later live inside the dream.
   textures use their colour channels as masks:
     R = petals (tinted per zone), G = leaves/stems, B = light, A = shape
   ========================================================== */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  }
  const R = v => `rgb(${(v * 255) | 0},0,0)`;
  const G = v => `rgb(0,${(v * 255) | 0},0)`;
  const RB = (v, b) => `rgb(${(v * 255) | 0},0,${(b * 255) | 0})`;

  const CW = 256, CH = 512;

  function stem(c, x0, y0, x1, y1, bend, w, v) {
    c.strokeStyle = G(v);
    c.lineWidth = w;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
    c.stroke();
  }
  function leaf(c, x, y, len, w, ang, v) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.fillStyle = G(v);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.5, -w, len, 0);
    c.quadraticCurveTo(len * 0.5, w, 0, 0);
    c.fill();
    c.restore();
  }

  // ---- 0: cosmos, facing you ----
  function cosmos(c, r, x, y, size, squash, rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(1, squash);
    const n = 8;
    for (let i = 0; i < n; i++) {
      c.save();
      c.rotate(i / n * TAU + r() * 0.15);
      const len = size * (0.92 + r() * 0.12), w = size * 0.4;
      const g = c.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, R(0.42));
      g.addColorStop(0.5, R(0.82));
      g.addColorStop(1, R(1));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(len * 0.25, -w * 0.9, len * 0.9, -w * 0.75, len, -w * 0.35);
      c.lineTo(len * 0.94, -w * 0.08);
      c.lineTo(len * 1.0, w * 0.12);
      c.lineTo(len * 0.95, w * 0.3);
      c.bezierCurveTo(len * 0.9, w * 0.75, len * 0.25, w * 0.9, 0, 0);
      c.fill();
      c.strokeStyle = R(0.6);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(len * 0.15, 0);
      c.lineTo(len * 0.8, 0);
      c.stroke();
      c.restore();
    }
    c.fillStyle = R(0.1);
    c.beginPath();
    c.arc(0, 0, size * 0.22, 0, TAU);
    c.fill();
    for (let i = 0; i < 14; i++) {
      const a = r() * TAU, d = r() * size * 0.18;
      c.fillStyle = RB(0.35, 0.75);
      c.beginPath();
      c.arc(Math.cos(a) * d, Math.sin(a) * d, 1.6 + r() * 1.6, 0, TAU);
      c.fill();
    }
    c.restore();
  }

  function cellCosmos(c, r, side) {
    const topX = 128 + (r() - 0.5) * 30, topY = side ? 150 : 120;
    stem(c, 128, 510, topX, topY, 18, 4, 0.5);
    for (let i = 0; i < 5; i++) {
      const y = 480 - i * 60 - r() * 20;
      leaf(c, 128 + (y - 480) * 0.02, y, 30 + r() * 30, 3, (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.6) - Math.PI / 2, 0.42);
    }
    if (side) {
      stem(c, 128, 420, 70, 250, -10, 3, 0.45);
      cosmos(c, r, 70, 245, 34, 0.45, -0.4);
      cosmos(c, r, topX, topY, 70, 0.42, 0.25);
    } else {
      cosmos(c, r, topX, topY, 74, 0.86, r() * TAU);
    }
  }

  // ---- 2: a low carpet of little violet flowers ----
  function cellCarpet(c, r) {
    for (let i = 0; i < 18; i++) {
      const x = 30 + r() * 196, h = 80 + r() * 150;
      stem(c, 128 + (x - 128) * 0.3, 510, x, 510 - h, (r() - 0.5) * 20, 2.2, 0.45);
      leaf(c, x, 510 - h * 0.4, 18 + r() * 14, 5, -Math.PI / 2 + (r() - 0.5) * 2, 0.5);
    }
    for (let i = 0; i < 28; i++) {
      const x = 26 + r() * 204, y = 510 - 70 - r() * 170, s = 7 + r() * 8;
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * TAU + r() * 0.3;
        c.fillStyle = R(0.65 + r() * 0.35);
        c.beginPath();
        c.ellipse(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6, s * 0.55, s * 0.4, a, 0, TAU);
        c.fill();
      }
      c.fillStyle = RB(0.3, 0.8);
      c.beginPath();
      c.arc(x, y, s * 0.22, 0, TAU);
      c.fill();
    }
  }

  // ---- 3: a reed with its dark plume ----
  function cellReed(c, r) {
    const tx = 128 + (r() - 0.5) * 50;
    stem(c, 128, 512, tx, 70, 14, 3.2, 0.42);
    for (let i = 0; i < 4; i++) {
      const y = 470 - i * 70;
      c.strokeStyle = G(0.36);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(128, y);
      const dir = r() < 0.5 ? -1 : 1;
      c.quadraticCurveTo(128 + dir * 50, y - 80, 128 + dir * (70 + r() * 40), y - 20 + r() * 60);
      c.stroke();
    }
    // plume: a drooping feather of short strokes
    c.lineWidth = 1.4;
    for (let i = 0; i < 170; i++) {
      const t = r();
      const px = tx + t * 34 + Math.sin(t * 3) * 6, py = 70 + t * 140;
      const a = Math.PI * 0.62 + (r() - 0.5) * 1.1;
      const l = 10 + (1 - Math.abs(t - 0.4)) * 18 * r();
      c.strokeStyle = RB(0.3 + r() * 0.35, r() * 0.15);
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
      c.stroke();
    }
  }

  // ---- 4: a rose bush ----
  function rose(c, r, x, y, s) {
    c.save();
    c.translate(x, y);
    c.scale(1, 0.85);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + r() * 0.4;
      c.fillStyle = R(0.55 + r() * 0.2);
      c.beginPath();
      c.ellipse(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.45, s * 0.55, s * 0.42, a, 0, TAU);
      c.fill();
    }
    for (let i = 0; i < 9; i++) {
      const f = i / 8, rr = s * (0.62 - 0.52 * f), a0 = i * 2.4;
      c.strokeStyle = RB(0.55 + 0.45 * (1 - f), 0.25 * (1 - f));
      c.lineWidth = s * 0.09 * (1.2 - f * 0.5);
      c.beginPath();
      c.arc(0, 0, rr, a0, a0 + Math.PI * 1.2);
      c.stroke();
      c.strokeStyle = R(0.25);
      c.lineWidth = s * 0.025;
      c.beginPath();
      c.arc(0, 0, rr - s * 0.05, a0 + 0.2, a0 + Math.PI * 1.1);
      c.stroke();
    }
    c.restore();
  }
  function cellRose(c, r) {
    stem(c, 128, 512, 120, 150, 20, 5, 0.42);
    stem(c, 128, 400, 190, 260, 0, 3.5, 0.42);
    for (let i = 0; i < 9; i++) {
      const y = 480 - r() * 300, x = 128 + (r() - 0.5) * 70;
      leaf(c, x, y, 40 + r() * 20, 14, (r() < 0.5 ? Math.PI : 0) + (r() - 0.5) * 1.2, 0.34 + r() * 0.2);
    }
    rose(c, r, 120, 140, 62);
    rose(c, r, 190, 255, 34);
  }

  // ---- 5: a hydrangea mophead ----
  function cellHydrangea(c, r) {
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.6;
      leaf(c, 128, 470, 80 + r() * 40, 32, a, 0.32 + r() * 0.25);
    }
    stem(c, 128, 512, 128, 230, 0, 6, 0.4);
    const cx = 128, cy = 215, rad = 92;
    for (let i = 0; i < 190; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rad;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.88;
      const s = 7 + r() * 5, v = 0.55 + r() * 0.45 * (1 - d / rad * 0.4);
      for (let k = 0; k < 4; k++) {
        const b = k / 4 * TAU + a;
        c.fillStyle = R(v);
        c.beginPath();
        c.ellipse(x + Math.cos(b) * s * 0.5, y + Math.sin(b) * s * 0.5, s * 0.52, s * 0.36, b, 0, TAU);
        c.fill();
      }
      c.fillStyle = RB(v * 0.5, 0.5);
      c.beginPath();
      c.arc(x, y, 1.6, 0, TAU);
      c.fill();
    }
  }

  // ---- 6: yarrow, flat white umbels ----
  function cellYarrow(c, r) {
    stem(c, 128, 512, 128, 210, 6, 3.5, 0.44);
    const tops = [[128, 190, 52], [80, 250, 34], [178, 240, 38]];
    stem(c, 128, 330, 80, 250, -8, 2.5, 0.44);
    stem(c, 128, 310, 178, 240, 8, 2.5, 0.44);
    for (let i = 0; i < 7; i++) leaf(c, 128, 500 - i * 40, 30 + r() * 30, 6, (i % 2 ? Math.PI : 0) - 0.4 + r() * 0.8, 0.44);
    tops.forEach(([x, y, s]) => {
      for (let i = 0; i < 60; i++) {
        const a = r() * TAU, d = Math.sqrt(r()) * s;
        c.fillStyle = RB(0.85 + r() * 0.15, 0.45 + r() * 0.4);
        c.beginPath();
        c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.45 - (1 - d / s) * 8, 3 + r() * 2.5, 0, TAU);
        c.fill();
      }
    });
  }

  // ---- 7: a dark tuft of grass ----
  function cellTuft(c, r) {
    for (let i = 0; i < 34; i++) {
      const h = 160 + r() * 260, lean = (r() - 0.5) * 160;
      c.strokeStyle = G(0.28 + r() * 0.4);
      c.lineWidth = 2 + r() * 3;
      c.beginPath();
      c.moveTo(128 + (r() - 0.5) * 30, 512);
      c.quadraticCurveTo(128 + lean * 0.3, 512 - h * 0.6, 128 + lean, 512 - h);
      c.stroke();
    }
  }

  function makeFlowerAtlas() {
    const cv = document.createElement('canvas');
    cv.width = CW * 4;
    cv.height = CH * 2;
    const c = cv.getContext('2d');
    const cells = [
      r => cellCosmos(c, r, false),
      r => cellCosmos(c, r, true),
      r => cellCarpet(c, r),
      r => cellReed(c, r),
      r => cellRose(c, r),
      r => cellHydrangea(c, r),
      r => cellYarrow(c, r),
      r => cellTuft(c, r)
    ];
    cells.forEach((fn, i) => {
      c.save();
      c.translate((i % 4) * CW, ((i / 4) | 0) * CH);
      c.beginPath();
      c.rect(6, 6, CW - 12, CH - 8);
      c.clip();
      fn(rng(101 + i * 977));
      c.restore();
    });
    return cv;
  }

  // ---- the lone tree by the sea, bent by an old wind ----
  function makeTreeTexture() {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 1024;
    const c = cv.getContext('2d');
    const r = rng(77);
    c.lineCap = 'round';
    const leaves = [];
    function branch(x, y, ang, len, w, depth) {
      const bend = (r() - 0.5) * 0.6;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      const mx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * len * bend * 0.3;
      const my = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * len * bend * 0.3;
      c.strokeStyle = `rgb(${(40 + r() * 40) | 0},0,0)`;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(mx, my, x2, y2);
      c.stroke();
      if (depth <= 0 || w < 1.6) { leaves.push([x2, y2, w]); return; }
      const n = depth > 4 ? 2 : 2 + (r() < 0.45 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * (0.55 + r() * 0.35);
        branch(x2, y2, ang + spread - 0.12 + (r() - 0.5) * 0.35, len * (0.7 + r() * 0.18), w * 0.68, depth - 1);
      }
    }
    // twin trunks, twisting
    branch(600, 1020, -Math.PI / 2 - 0.32, 210, 46, 7);
    branch(640, 1020, -Math.PI / 2 + 0.12, 180, 34, 6);
    leaves.forEach(([x, y]) => {
      for (let i = 0; i < 9; i++) {
        c.fillStyle = `rgba(${(60 + r() * 70) | 0},0,0,${0.55 + r() * 0.45})`;
        c.beginPath();
        c.ellipse(x + (r() - 0.6) * 46, y + (r() - 0.5) * 22, 6 + r() * 16, 4 + r() * 8, r() * TAU, 0, TAU);
        c.fill();
      }
    });
    return cv;
  }

  // ---- a tall cedar of the blue forest ----
  function makeCedarTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 1024;
    const c = cv.getContext('2d');
    const r = rng(9);
    c.fillStyle = 'rgb(70,0,0)';
    c.beginPath();
    c.moveTo(118, 1024);
    c.lineTo(122, 120);
    c.lineTo(134, 120);
    c.lineTo(140, 1024);
    c.fill();
    // dead twigs low on the trunk
    c.strokeStyle = 'rgb(55,0,0)';
    c.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = 420 + r() * 480, dir = r() < 0.5 ? -1 : 1;
      c.beginPath();
      c.moveTo(128, y);
      c.lineTo(128 + dir * (14 + r() * 30), y - 10 - r() * 20);
      c.stroke();
    }
    // crown: layered clumps, wider in the middle of the crown
    for (let i = 0; i < 120; i++) {
      const t = r(), y = 40 + t * 420;
      const width = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 90 + 16;
      const x = 128 + (r() - 0.5) * 2 * width;
      c.fillStyle = `rgba(${(90 + r() * 90) | 0},0,0,${0.6 + r() * 0.4})`;
      c.beginPath();
      c.ellipse(x, y, 10 + r() * 22, 5 + r() * 9, (r() - 0.5) * 0.6, 0, TAU);
      c.fill();
    }
    return cv;
  }

  window.FieldTex = { makeFlowerAtlas, makeTreeTexture, makeCedarTexture };
})();
