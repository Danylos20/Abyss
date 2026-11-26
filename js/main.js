/* ==========================================================
   main.js — dust, grain, little glitches, and the way in and out
   of the dream
   ========================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const altar = $('altar'), veil = $('veil');

  // ---- film grain -------------------------------------------------------
  (function grain() {
    const c = document.createElement('canvas');
    c.width = c.height = 220;
    const x = c.getContext('2d');
    const img = x.createImageData(220, 220);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v; img.data[i + 1] = v * 0.92; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    $('grain').style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  // ---- dust rising through the dark ----------------------------------
  const dust = $('dust'), dctx = dust.getContext('2d');
  let motes = [], dustOn = true, dW = 0, dH = 0;
  function sizeDust() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    dW = altar.clientWidth;
    dH = altar.clientHeight;
    dust.width = dW * dpr;
    dust.height = dH * dpr;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(110, dW * dH / 14000));
    motes = Array.from({ length: n }, () => ({
      x: Math.random() * dW, y: Math.random() * dH,
      r: 0.4 + Math.random() * 1.5, v: 4 + Math.random() * 14,
      ph: Math.random() * 100, hue: Math.random()
    }));
  }
  let lastD = performance.now();
  function drawDust(now) {
    requestAnimationFrame(drawDust);
    if (!dustOn) return;
    const dt = Math.min(0.05, (now - lastD) / 1000);
    lastD = now;
    const b = window.Player ? window.Player.bass() : 0;
    dctx.clearRect(0, 0, dW, dH);
    for (const m of motes) {
      m.y -= m.v * dt * (1 + b * 1.5);
      m.x += Math.sin(now / 1700 + m.ph) * 0.15;
      if (m.y < -6) { m.y = dH + 6; m.x = Math.random() * dW; }
      const tw = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(now / 900 + m.ph)), 2);
      dctx.fillStyle = m.hue < 0.5 ? `rgba(214,170,255,${tw * 0.7})` : `rgba(255,170,235,${tw * 0.55})`;
      dctx.beginPath();
      dctx.arc(m.x, m.y, m.r * (1 + b * 0.6), 0, Math.PI * 2);
      dctx.fill();
    }
  }

  // ---- the deck leans toward your hand --------------------------------
  const stage = document.querySelector('.stage');
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('pointermove', e => {
    tx = (e.clientX / innerWidth - 0.5);
    ty = (e.clientY / innerHeight - 0.5);
  }, { passive: true });
  function lean() {
    requestAnimationFrame(lean);
    if (!dustOn) return;
    cx += (tx - cx) * 0.04;
    cy += (ty - cy) * 0.04;
    stage.style.transform = `perspective(1400px) rotateY(${(cx * 3).toFixed(3)}deg) rotateX(${(-cy * 2.5).toFixed(3)}deg)`;
  }

  // ---- once in a while the room flickers ------------------------------
  function glitchLater() {
    setTimeout(() => {
      if (dustOn && !document.hidden) {
        document.body.classList.add('glitch');
        setTimeout(() => document.body.classList.remove('glitch'), 260);
      }
      glitchLater();
    }, 18000 + Math.random() * 26000);
  }

  // ---- a clock that never moves past 3:33 --------------------------------
  const clock = $('clock');
  clock.addEventListener('mouseenter', () => { clock.textContent = '03:33'; });
  clock.addEventListener('mouseleave', () => { clock.textContent = '33⅓'; });

  // ---- into the dream and back -------------------------------------------
  let moving = false;
  async function drift() {
    if (moving) return;
    moving = true;
    veil.classList.remove('dark');
    veil.classList.add('on');
    await wait(1500);
    dustOn = false;
    window.Ascii.stop();
    window.Player.setAltarVisible(false);
    altar.classList.add('gone');
    document.body.classList.add('dreaming');
    window.Field.enter();
    await wait(250);
    veil.classList.remove('on');
    moving = false;
  }
  async function wake() {
    if (moving || !window.Field.active) return;
    moving = true;
    veil.classList.add('dark');
    veil.classList.add('on');
    await wait(1500);
    window.Field.leave();
    altar.classList.remove('gone');
    document.body.classList.remove('dreaming');
    window.scrollTo(0, 0);
    window.Player.setAltarVisible(true);
    window.Ascii.start();
    dustOn = true;
    await wait(200);
    veil.classList.remove('on');
    await wait(1600);
    veil.classList.remove('dark');
    moving = false;
  }

  $('drift').addEventListener('click', drift);
  $('wake').addEventListener('click', wake);
  $('wake2').addEventListener('click', wake);
  addEventListener('keydown', e => { if (e.key === 'Escape') wake(); });

  // ---- begin ---------------------------------------------------------
  function begin() {
    window.Ascii.init();
    sizeDust();
    requestAnimationFrame(drawDust);
    requestAnimationFrame(lean);
    glitchLater();
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(sizeDust, 150); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin);
  else begin();
})();
