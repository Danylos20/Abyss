/* ==========================================================
   player.js — the turntable, the tracklist, the needle, the sound
   ========================================================== */
(function () {
  'use strict';

  // ---- the record -------------------------------------------------------
  // titles are the 10 songs of "Abyss" (side a: I–V, side b: VI–X).
  // the audio itself is NOT bundled: put your own files into /music
  // (01.mp3 … 10.mp3, or "01 - Prism.mp3", or "Prism.mp3"), or drop them on the page.
  const TRACKS = [
    'Prism', 'Embrace', 'Clouds', 'Shadows', 'Skeleton',
    'Dark Beach', 'Translucid', 'Lilacs', 'Pulse', 'Abyss'
  ].map((title, i) => ({ title, i, url: null, duration: 0, probing: true }));
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const pad2 = n => String(n).padStart(2, '0');

  // optional manifest: <script src="music/playlist.js"> may define window.ABYSS_FILES
  const manifest = Array.isArray(window.ABYSS_FILES) ? window.ABYSS_FILES : null;

  // ---- geometry of the deck (svg units) ---------------------------------
  const C = { x: 262, y: 250 };      // platter centre
  const P = { x: 560, y: 82 };       // tonearm pivot
  const N0 = { x: -13, y: 292 };     // needle tip in arm-local coords
  const R_OUT = 197, R_IN = 82;      // playable band
  const PHI_REST = -4;

  function needleAt(phi) {
    const a = phi * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return { x: P.x + N0.x * c - N0.y * s, y: P.y + N0.x * s + N0.y * c };
  }
  function phiForRadius(r) {
    let lo = -10, hi = 58;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2, n = needleAt(mid);
      if (Math.hypot(n.x - C.x, n.y - C.y) > r) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  // position on the whole side (0 = first groove of track I, 1 = run-out)
  const phiForSide = f => phiForRadius(R_OUT - (R_OUT - R_IN) * Math.min(1, Math.max(0, f)));

  // ---- build the svg ----------------------------------------------------
  const deckEl = document.getElementById('deck');

  function grooves() {
    let s = '';
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let r = 74; r <= 203; r += 1.55) {
      const o = (0.018 + rnd() * 0.05).toFixed(3);
      s += `<circle r="${r.toFixed(2)}" fill="none" stroke="#e8dcff" stroke-opacity="${o}" stroke-width="0.6"/>`;
    }
    // gaps between the songs: smooth, glossy bands
    for (let k = 0; k <= TRACKS.length; k++) {
      const r = R_OUT - (R_OUT - R_IN) * (k / TRACKS.length);
      s += `<circle r="${r.toFixed(2)}" fill="none" stroke="#0a070e" stroke-width="2.4"/>`;
      s += `<circle r="${(r + 1.3).toFixed(2)}" fill="none" stroke="#cdb8f2" stroke-opacity=".13" stroke-width=".7"/>`;
    }
    // a few specks of dust so the eye can see it turn
    for (let k = 0; k < 26; k++) {
      const a = rnd() * Math.PI * 2, r = 80 + rnd() * 120;
      s += `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="${(0.4 + rnd() * 0.9).toFixed(2)}" fill="#efe4ff" fill-opacity="${(0.15 + rnd() * 0.35).toFixed(2)}"/>`;
    }
    return s;
  }

  function wedge(r, a1, a2) {
    const p = a => `${(Math.cos(a * Math.PI / 180) * r).toFixed(1)},${(Math.sin(a * Math.PI / 180) * r).toFixed(1)}`;
    return `M0,0 L${p(a1)} A${r},${r} 0 0,1 ${p(a2)} Z`;
  }

  const restPost = needleAt(PHI_REST);
  const cradle = (() => { // where the arm tube rests
    const a = PHI_REST * Math.PI / 180;
    return { x: P.x - 205 * Math.sin(a), y: P.y + 205 * Math.cos(a) };
  })();

  deckEl.innerHTML = `
<svg viewBox="0 0 640 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="a turntable with the record Abyss">
  <defs>
    <linearGradient id="gPlinth" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1d1130"/><stop offset=".5" stop-color="#0d0717"/><stop offset="1" stop-color="#07040c"/>
    </linearGradient>
    <linearGradient id="gEdge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9c4ff" stop-opacity=".38"/><stop offset="1" stop-color="#d9c4ff" stop-opacity=".05"/>
    </linearGradient>
    <radialGradient id="gPlatter" cx=".5" cy=".5" r=".5">
      <stop offset=".9" stop-color="#140f1b"/><stop offset=".965" stop-color="#5d4f78"/><stop offset=".985" stop-color="#b9a9d8"/><stop offset="1" stop-color="#2a2136"/>
    </radialGradient>
    <radialGradient id="gVinyl" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#17111d"/><stop offset=".65" stop-color="#0b0810"/><stop offset="1" stop-color="#040306"/>
    </radialGradient>
    <radialGradient id="gLabel" cx=".42" cy=".36" r=".75">
      <stop offset="0" stop-color="#8a58e6"/><stop offset=".55" stop-color="#4b2196"/><stop offset="1" stop-color="#220d48"/>
    </radialGradient>
    <radialGradient id="gSheen" cx=".5" cy=".5" r=".5">
      <stop offset=".34" stop-color="#ffffff" stop-opacity="0"/><stop offset=".72" stop-color="#eadbff" stop-opacity=".22"/><stop offset=".98" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gChrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4c4360"/><stop offset=".42" stop-color="#f1eafc"/><stop offset=".62" stop-color="#ad9fc6"/><stop offset="1" stop-color="#3a3348"/>
    </linearGradient>
    <radialGradient id="gKnob" cx=".4" cy=".35" r=".7">
      <stop offset="0" stop-color="#a99bc2"/><stop offset=".5" stop-color="#3b3250"/><stop offset="1" stop-color="#14101c"/>
    </radialGradient>
    <filter id="fBlur6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="fBlur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="fArmShadow" x="-30%" y="-10%" width="160%" height="130%"><feGaussianBlur stdDeviation="3"/></filter>
    <path id="pTop" d="M -53,0 a53,53 0 1,1 106,0 a53,53 0 1,1 -106,0"/>
    <path id="pBot" d="M -61,0 a61,61 0 0,0 122,0"/>
  </defs>

  <!-- plinth -->
  <rect x="10" y="10" width="620" height="480" rx="24" fill="url(#gPlinth)" stroke="url(#gEdge)" stroke-width="1.2"/>
  <rect x="22" y="22" width="596" height="456" rx="16" fill="none" stroke="#c9b3ff" stroke-opacity=".06"/>
  <path d="M40,24 C 200,60 420,30 610,70" stroke="#e2d2ff" stroke-opacity=".05" stroke-width="18" fill="none" filter="url(#fBlur6)"/>

  <!-- platter -->
  <circle cx="${C.x}" cy="${C.y + 6}" r="218" fill="#000" fill-opacity=".55" filter="url(#fBlur6)"/>
  <circle cx="${C.x}" cy="${C.y}" r="214" fill="url(#gPlatter)"/>
  <g id="strobe" transform="translate(${C.x} ${C.y})"></g>

  <!-- the record -->
  <g transform="translate(${C.x} ${C.y})">
    <g id="rec">
      <circle r="207" fill="url(#gVinyl)"/>
      <circle r="206" fill="none" stroke="#2c2338" stroke-width="1.5"/>
      ${grooves()}
      <circle r="73" fill="#0a070e"/>
      <circle r="70" fill="url(#gLabel)"/>
      <circle r="67" fill="none" stroke="#f3e6ff" stroke-opacity=".28" stroke-width=".6"/>
      <circle r="44" fill="none" stroke="#f3e6ff" stroke-opacity=".16" stroke-width=".5"/>
      <text font-family="Grenze Gotisch, serif" font-size="12.5" letter-spacing="2.4" fill="#f5eaff" fill-opacity=".85">
        <textPath href="#pTop" startOffset="25%" text-anchor="middle">PASTEL ✝ GHOST</textPath>
      </text>
      <text font-family="Grenze Gotisch, serif" font-size="8.5" letter-spacing="2" fill="#efe0ff" fill-opacity=".6">
        <textPath href="#pBot" startOffset="50%" text-anchor="middle">side a ✝ 33⅓ ✝ side b</textPath>
      </text>
      <text x="0" y="-11" text-anchor="middle" font-family="Grenze Gotisch, serif" font-size="24" font-weight="500" fill="#fbf4ff">Abyss</text>
      <path d="M-22,-2 L22,-2" stroke="#f3e6ff" stroke-opacity=".3" stroke-width=".5"/>
      <g transform="translate(0 21)" fill="none" stroke="#f6e9ff" stroke-opacity=".55" stroke-width=".7">
        <path d="M0,0 c3,-1 4,-5 0,-6 c-5,-1 -8,4 -5,8 c4,5 12,2 12,-5 c0,-8 -10,-12 -16,-6 c-6,6 -3,16 6,16 c7,0 12,-5 12,-10"/>
      </g>
      <circle r="3.6" fill="#030205"/>
      <circle r="3.6" fill="none" stroke="#bfb2d6" stroke-opacity=".6" stroke-width=".6"/>
      <circle class="record-hit" r="206" fill="transparent"/>
    </g>
    <path d="${wedge(206, 292, 318)}" fill="url(#gSheen)" filter="url(#fBlur2)" pointer-events="none"/>
    <path d="${wedge(206, 112, 138)}" fill="url(#gSheen)" filter="url(#fBlur2)" pointer-events="none" opacity=".75"/>
    <circle r="5" fill="url(#gChrome)" pointer-events="none"/>
  </g>

  <!-- arm rest & pivot base -->
  <g pointer-events="none">
    <rect x="${(cradle.x - 9).toFixed(1)}" y="${(cradle.y - 6).toFixed(1)}" width="18" height="12" rx="3" fill="#191221" stroke="#bfb0db" stroke-opacity=".3"/>
    <path d="M${(cradle.x - 7).toFixed(1)},${(cradle.y - 4).toFixed(1)} q7,7 14,0" stroke="#e8dcff" stroke-opacity=".35" fill="none"/>
    <circle cx="${P.x}" cy="${P.y}" r="31" fill="#120c19" stroke="#cdbcf0" stroke-opacity=".18"/>
    <circle cx="${P.x}" cy="${P.y}" r="22" fill="url(#gKnob)"/>
    <rect x="${P.x + 30}" y="${P.y + 50}" width="10" height="46" rx="4" fill="#120c19" stroke="#cdbcf0" stroke-opacity=".2"/>
    <rect x="${P.x + 32}" y="${P.y + 56}" width="6" height="14" rx="2" fill="url(#gChrome)"/>
  </g>

  <!-- tonearm -->
  <g id="armShadow" opacity=".55" pointer-events="none">
    <g id="armShadowRot">
      <g transform="translate(${P.x} ${P.y})" filter="url(#fArmShadow)" fill="#000" stroke="#000">
        <path d="M0,0 L0,250" stroke-width="7" fill="none"/>
        <g transform="translate(0 250) rotate(18)"><rect x="-9" y="0" width="18" height="46" rx="3"/></g>
      </g>
    </g>
  </g>
  <g id="arm" class="arm-group">
    <g transform="translate(${P.x} ${P.y})">
      <rect x="-14" y="-66" width="28" height="40" rx="6" fill="url(#gChrome)"/>
      <rect x="-14" y="-52" width="28" height="3" fill="#000" fill-opacity=".35"/>
      <path d="M0,-28 L0,0" stroke="url(#gChrome)" stroke-width="6"/>
      <path d="M0,0 L0,252" stroke="url(#gChrome)" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M-1.2,4 L-1.2,250" stroke="#ffffff" stroke-opacity=".55" stroke-width="1"/>
      <circle r="11" fill="url(#gKnob)" stroke="#e5d8ff" stroke-opacity=".35"/>
      <circle r="3" fill="#e9defa"/>
      <g transform="translate(0 250) rotate(18)">
        <rect x="-8" y="0" width="16" height="46" rx="3" fill="#1c1526" stroke="url(#gChrome)" stroke-width="1.4"/>
        <path d="M8,10 l12,-3" stroke="url(#gChrome)" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="-7" y="22" width="14" height="17" rx="2" fill="#4b2a86"/>
        <path d="M0,39 L0,44" stroke="#efe6ff" stroke-width="1.2"/>
        <circle class="needle-spark" cx="0" cy="44" r="5" fill="#f1c9ff" filter="url(#fBlur2)"/>
      </g>
      <!-- generous invisible hit area -->
      <path class="arm-hit" d="M0,-60 L0,250" stroke="transparent" stroke-width="26"/>
      <g transform="translate(0 250) rotate(18)"><rect class="arm-hit" x="-26" y="-10" width="52" height="66" rx="14" fill="transparent"/></g>
    </g>
  </g>

  <!-- small controls -->
  <g>
    <circle cx="62" cy="438" r="19" fill="#0f0a15" stroke="#cdbcf0" stroke-opacity=".18"/>
    <circle cx="62" cy="438" r="13" fill="url(#gKnob)"/>
    <path d="M62,427 L62,433" stroke="#efe4ff" stroke-opacity=".6" stroke-width="1.5"/>
    <circle id="led" cx="96" cy="438" r="3.6" fill="#3a2a4a"/>
    <text x="124" y="443" font-family="Grenze Gotisch, serif" font-size="14" fill="#e7d9ff" fill-opacity=".55" id="spd33">33</text>
    <text x="152" y="443" font-family="Grenze Gotisch, serif" font-size="14" fill="#e7d9ff" fill-opacity=".2">45</text>
    <text x="604" y="462" text-anchor="end" font-family="Grenze Gotisch, serif" font-size="13" letter-spacing="2" fill="#e7d9ff" fill-opacity=".28">ethereal ✝ 33⅓</text>
    <path d="M604,330 L604,412" stroke="#000" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/>
    <rect x="598" y="364" width="12" height="9" rx="2" fill="url(#gChrome)"/>
  </g>
</svg>`;

  const svg = deckEl.querySelector('svg');
  const recEl = svg.querySelector('#rec');
  const armEl = svg.querySelector('#arm');
  const armShadow = svg.querySelector('#armShadowRot');
  const ledEl = svg.querySelector('#led');
  const strobeEl = svg.querySelector('#strobe');

  // ---- dom bits ----------------------------------------------------------
  const $ = id => document.getElementById(id);
  const listEl = $('tracks'), tCur = $('tCur'), tDur = $('tDur');
  const barEl = $('bar'), barFill = $('barFill'), barKnob = $('barKnob');
  const nowEl = $('now'), hintEl = $('hint'), glowEl = $('deckGlow');
  const loaderNote = $('loaderNote'), fileInput = $('fileInput');

  TRACKS.forEach((t, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="num">${ROMAN[i]}.</span><span class="t">${t.title}</span><span class="dur">··</span>`;
    if (i === 5) li.classList.add('side-b');
    li.addEventListener('click', () => playFrom(i, 0));
    listEl.appendChild(li);
    t.li = li;
    t.durEl = li.querySelector('.dur');
  });

  const fmt = s => {
    if (!isFinite(s) || s < 0) return '--:--';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + pad2(s % 60);
  };

  // ---- finding the music ------------------------------------------------
  function candidates(t) {
    const n = pad2(t.i + 1);
    if (manifest && manifest[t.i]) return ['music/' + manifest[t.i]];
    return [`music/${n}.mp3`, `music/${n} - ${t.title}.mp3`, `music/${t.title}.mp3`, `music/${n}.m4a`];
  }

  function probe(url) {
    return new Promise(res => {
      const a = new Audio();
      a.preload = 'metadata';
      const done = ok => { a.onloadedmetadata = a.onerror = null; res(ok ? a.duration : -1); a.removeAttribute('src'); };
      a.onloadedmetadata = () => done(true);
      a.onerror = () => done(false);
      a.src = encodeURI(url);
    });
  }

  async function findTrack(t, prefer = -1) {
    const list = candidates(t);
    if (prefer > 0 && prefer < list.length) list.unshift(list.splice(prefer, 1)[0]);
    let hit = -1;
    for (let k = 0; k < list.length; k++) {
      const d = await probe(list[k]);
      if (d >= 0) { t.url = encodeURI(list[k]); t.duration = d; hit = candidates(t).indexOf(list[k]); break; }
    }
    t.probing = false;
    refreshList();
    return hit;
  }

  function refreshList() {
    let any = false, pending = false;
    TRACKS.forEach(t => {
      if (t.url) any = true;
      if (t.probing) pending = true;
      t.durEl.textContent = t.url ? fmt(t.duration) : (t.probing ? '··' : '—');
      t.li.classList.toggle('missing', !t.url && !t.probing);
    });
    if (!pending) loaderNote.hidden = any;
  }

  // learn how the files are named from the first song, then look for the rest the same way
  (async () => {
    const pattern = await findTrack(TRACKS[0]);
    if (pattern < 0 && !manifest) {
      TRACKS.forEach(t => { t.probing = false; });
      refreshList();
      return;
    }
    await Promise.all(TRACKS.slice(1).map(t => findTrack(t, pattern)));
  })();

  // drag & drop / file picker: match files to songs
  const norm = s => s.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9а-яё]+/g, ' ').trim();
  function assignFiles(fileList) {
    const files = [...fileList].filter(f => f.type.startsWith('audio') || /\.(mp3|m4a|ogg|wav|flac|opus|aac|webm)$/i.test(f.name));
    if (!files.length) return;
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const left = new Set(files), got = new Map();
    // 1) leading track number
    files.forEach(f => {
      const m = /^\s*(\d{1,2})[\s._-]/.exec(f.name);
      const k = m ? parseInt(m[1], 10) - 1 : -1;
      if (k >= 0 && k < TRACKS.length && !got.has(k)) { got.set(k, f); left.delete(f); }
    });
    // 2) title inside the name (long titles first, "abyss" last since it is also the album name)
    [...TRACKS].sort((a, b) => (a.title === 'Abyss') - (b.title === 'Abyss') || b.title.length - a.title.length)
      .forEach(t => {
        if (got.has(t.i)) return;
        const key = norm(t.title);
        let best = null;
        left.forEach(f => {
          const n = norm(f.name).replace(/pastel ghost/g, '');
          const stripped = t.title === 'Abyss' ? n : n.replace(/\babyss\b/g, '');
          if (!best && stripped.includes(key)) best = f;
        });
        if (best) { got.set(t.i, best); left.delete(best); }
      });
    // 3) whatever is left, in order
    TRACKS.forEach(t => { if (!got.has(t.i) && left.size) { const f = left.values().next().value; got.set(t.i, f); left.delete(f); } });

    got.forEach((f, k) => {
      const t = TRACKS[k];
      if (t.blob) URL.revokeObjectURL(t.url);
      t.url = URL.createObjectURL(f);
      t.blob = true;
      t.probing = true;
      probe(t.url).then(d => { t.duration = d > 0 ? d : 0; t.probing = false; refreshList(); });
    });
    refreshList();
    whisper(`${got.size} song${got.size === 1 ? '' : 's'} pressed into the record`);
    if (mode === 'ghost' && TRACKS[current].url) playFrom(current, 0);
  }

  fileInput.addEventListener('change', () => assignFiles(fileInput.files));
  let dragDepth = 0;
  addEventListener('dragenter', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { dragDepth++; document.body.classList.add('drop-hover'); } });
  addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('drop-hover'); });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('drop-hover');
    if (e.dataTransfer && e.dataTransfer.files.length) assignFiles(e.dataTransfer.files);
  });

  // ---- audio ------------------------------------------------------------
  const audio = new Audio();
  audio.preload = 'auto';
  let actx = null, master = null, analyser = null, elemRouted = false;
  let crackleGain = null, ghost = null;
  const canAnalyseElement = /^https?:$/.test(location.protocol);

  function ensureCtx() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return actx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 1;
    analyser = actx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.7;
    master.connect(analyser);
    analyser.connect(actx.destination);
    // vinyl crackle, always looping, faded in while the needle is down
    const len = actx.sampleRate * 4, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    let pop = 0;
    for (let i = 0; i < len; i++) {
      if (Math.random() < 0.00055) pop = (Math.random() * 0.8 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
      d[i] = (Math.random() * 2 - 1) * 0.012 + pop;
      pop *= 0.82;
    }
    const src = actx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = actx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 700;
    crackleGain = actx.createGain();
    crackleGain.gain.value = 0;
    src.connect(hp).connect(crackleGain).connect(master);
    src.start();
    return actx;
  }

  function routeElement() {
    if (elemRouted || !canAnalyseElement || !actx) return;
    try {
      const node = actx.createMediaElementSource(audio);
      node.connect(master);
      elemRouted = true;
    } catch (e) { /* plays directly, no analysis */ }
  }

  function thump() {
    if (!actx) return;
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.3);
    if (crackleGain) {
      crackleGain.gain.cancelScheduledValues(t);
      crackleGain.gain.setValueAtTime(0.4, t);
      crackleGain.gain.exponentialRampToValueAtTime(0.11, t + 0.6);
    }
  }

  // ---- ghost signal: a slow witch-house lullaby, used when a song has no file
  function makeGhost(ctx) {
    const out = ctx.createGain();
    out.gain.value = 0;
    const bus = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.6;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 0.05; lfoG.gain.value = 500;
    lfo.connect(lfoG).connect(lp.frequency); lfo.start();
    const verb = ctx.createConvolver();
    const il = ctx.sampleRate * 5, ib = ctx.createBuffer(2, il, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ib.getChannelData(ch);
      for (let i = 0; i < il; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / il, 2.6);
    }
    verb.buffer = ib;
    const wet = ctx.createGain(); wet.gain.value = 0.75;
    const dry = ctx.createGain(); dry.gain.value = 0.55;
    bus.connect(lp);
    lp.connect(dry).connect(out);
    lp.connect(verb).connect(wet).connect(out);
    out.connect(master);

    const BEAT = 60 / 68;
    const CH = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 50, 55, 58], [45, 49, 52, 57]]; // Dm Bb Gm A
    const MEL = [74, 77, 79, 81, 84, 86, 72, 69];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const noiseBuf = (() => { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 3.2); }
    shaper.curve = curve;
    const drumBus = ctx.createGain(); drumBus.gain.value = 0.55;
    shaper.connect(drumBus).connect(out);
    drumBus.connect(verb);

    let running = false, next = 0, step = 0, timer = null, started = 0;

    function pad(t, notes) {
      notes.forEach((m, k) => {
        [-7, 6].forEach(det => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = k === 0 ? 'triangle' : 'sawtooth';
          o.frequency.value = mtof(m - (k === 0 ? 12 : 0));
          o.detune.value = det;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(k === 0 ? 0.07 : 0.028, t + 2.6);
          g.gain.setValueAtTime(k === 0 ? 0.07 : 0.028, t + BEAT * 8 - 0.5);
          g.gain.linearRampToValueAtTime(0.0001, t + BEAT * 8 + 2.2);
          o.connect(g).connect(bus);
          o.start(t); o.stop(t + BEAT * 8 + 2.4);
        });
      });
    }
    function kick(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(36, t + 0.32);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g).connect(shaper);
      o.start(t); o.stop(t + 0.75);
    }
    function snare(t) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      s.connect(f).connect(g).connect(shaper);
      s.start(t); s.stop(t + 0.35);
    }
    function hat(t, v) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7500;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      s.connect(f).connect(g).connect(drumBus);
      s.start(t, Math.random() * 0.5); s.stop(t + 0.08);
    }
    function bell(t) {
      const m = MEL[(Math.random() * MEL.length) | 0];
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = mtof(m);
      o2.type = 'sine'; o2.frequency.value = mtof(m) * 2.01;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(g); o2.connect(g); g.connect(verb); g.connect(out);
      o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + 2.5);
    }

    function schedule() {
      while (next < ctx.currentTime + 1.2) {
        const bar = Math.floor(step / 16), s16 = step % 16, t = next;
        if (step % 32 === 0) pad(t, CH[(bar / 2) % CH.length | 0]);
        if (bar >= 2) {
          if (s16 === 0 || s16 === 11) kick(t);
          if (s16 === 8) snare(t);
          if (s16 % 2 === 0) hat(t, s16 % 4 === 2 ? 0.05 : 0.025);
          if (s16 === 14 && Math.random() < 0.35) hat(t, 0.04);
        }
        if (Math.random() < 0.07) bell(t);
        next += BEAT / 4;
        step++;
      }
    }

    return {
      start() {
        if (running) return;
        running = true;
        started = ctx.currentTime;
        next = ctx.currentTime + 0.15;
        step = 0;
        out.gain.cancelScheduledValues(ctx.currentTime);
        out.gain.setValueAtTime(0.0001, ctx.currentTime);
        out.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 1.5);
        schedule();
        timer = setInterval(schedule, 200);
      },
      stop() {
        if (!running) return;
        running = false;
        clearInterval(timer);
        out.gain.cancelScheduledValues(ctx.currentTime);
        out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
        out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      },
      elapsed() { return running ? ctx.currentTime - started : 0; },
      get running() { return running; }
    };
  }

  // ---- state machine of the needle --------------------------------------
  let current = 0;
  let needleDown = false;      // stylus resting in the groove
  let mode = null;             // 'file' | 'ghost' | null
  let busy = 0;                // sequence token
  let armPhi = PHI_REST, armTarget = PHI_REST, armLift = 0, liftTarget = 0;
  let spin = 0, spinSpeed = 0, motor = false;
  let resumeAt = 0;            // seconds into current track to resume from
  const listeners = new Set();
  const emit = () => listeners.forEach(f => { try { f(state()); } catch (e) { } });

  const wait = ms => new Promise(r => setTimeout(r, ms));
  function trackFrac() {
    const t = TRACKS[current];
    if (mode === 'file' && audio.duration > 0) return audio.currentTime / audio.duration;
    if (mode === 'ghost') return Math.min(0.92, (ghost ? ghost.elapsed() : 0) / 300);
    return t.duration ? resumeAt / t.duration : 0;
  }
  const sideFrac = () => (current + trackFrac()) / TRACKS.length;

  function setActive() {
    TRACKS.forEach(t => t.li.classList.toggle('active', t.i === current && needleDown));
  }

  function whisper(text, lit) {
    nowEl.textContent = text;
    nowEl.classList.toggle('lit', !!lit);
  }

  async function dropNeedle() {
    const token = ++busy;
    ensureCtx();
    motor = true;
    hintEl.classList.add('hide');
    liftTarget = 1;
    await wait(260);
    if (token !== busy) return;
    armTarget = phiForSide(sideFrac());
    await wait(900);
    if (token !== busy) return;
    liftTarget = 0;
    await wait(320);
    if (token !== busy) return;
    needleDown = true;
    thump();
    await startAudio();
    setActive();
    emit();
  }

  async function startAudio() {
    const t = TRACKS[current];
    if (ghost) ghost.stop();
    if (t.url) {
      routeElement();
      if (audio.getAttribute('data-src') !== t.url) {
        audio.src = t.url;
        audio.setAttribute('data-src', t.url);
      }
      mode = 'file';
      try {
        if (resumeAt > 0) {
          if (audio.readyState < 1) await new Promise(r => audio.addEventListener('loadedmetadata', r, { once: true }));
          audio.currentTime = Math.min(resumeAt, (audio.duration || resumeAt + 1) - 0.5);
        }
        await audio.play();
        whisper(`${ROMAN[current]}. ${t.title}`, true);
        return;
      } catch (e) {
        if (!needleDown) return;
      }
    }
    // no file → the ghost signal
    mode = 'ghost';
    if (!ghost && actx) ghost = makeGhost(actx);
    if (ghost) ghost.start();
    whisper(`ghost signal ✝ ${t.title} is not on this record`, true);
  }

  async function liftNeedle(keepPosition = true) {
    const token = ++busy;
    if (keepPosition && mode === 'file') resumeAt = audio.currentTime || 0;
    liftTarget = 1;
    needleDown = false;
    audio.pause();
    if (ghost) ghost.stop();
    if (crackleGain && actx) {
      crackleGain.gain.cancelScheduledValues(actx.currentTime);
      crackleGain.gain.setTargetAtTime(0, actx.currentTime, 0.08);
    }
    mode = null;
    setActive();
    emit();
    await wait(300);
    if (token !== busy) return;
    armTarget = PHI_REST;
    await wait(1000);
    if (token !== busy) return;
    liftTarget = 0;
    motor = false;
    whisper(`resting on ${ROMAN[current]}. ${TRACKS[current].title}`);
  }

  async function playFrom(i, fracInTrack) {
    const token = ++busy;
    const wasDown = needleDown;
    needleDown = false;
    audio.pause();
    if (ghost) ghost.stop();
    current = i;
    const t = TRACKS[i];
    resumeAt = (t.duration || 0) * (fracInTrack || 0);
    mode = null;
    setActive();
    ensureCtx();
    motor = true;
    hintEl.classList.add('hide');
    liftTarget = 1;
    await wait(wasDown ? 220 : 260);
    if (token !== busy) return;
    armTarget = phiForSide((i + (fracInTrack || 0)) / TRACKS.length);
    await wait(850);
    if (token !== busy) return;
    liftTarget = 0;
    await wait(300);
    if (token !== busy) return;
    needleDown = true;
    thump();
    await startAudio();
    setActive();
    emit();
  }

  function toggle() {
    if (needleDown) liftNeedle(true);
    else dropNeedle();
  }

  audio.addEventListener('ended', () => {
    resumeAt = 0;
    if (current < TRACKS.length - 1) playFrom(current + 1, 0);
    else { current = 0; liftNeedle(false); }
  });
  audio.addEventListener('error', () => {
    if (needleDown && mode === 'file') {
      TRACKS[current].url = null;
      refreshList();
      startAudio();
    }
  });

  // ---- pointer on the deck ---------------------------------------------
  const svgPoint = e => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  svg.addEventListener('click', e => {
    if (e.target.classList.contains('arm-hit')) { toggle(); return; }
    if (e.target.classList.contains('record-hit')) {
      const p = svgPoint(e), r = Math.hypot(p.x - C.x, p.y - C.y);
      if (r < R_IN - 2 || r > R_OUT + 4) return;
      const f = Math.min(0.999, Math.max(0, (R_OUT - r) / (R_OUT - R_IN))) * TRACKS.length;
      const k = Math.floor(f);
      playFrom(k, TRACKS[k].duration ? f - k : 0);
    }
  });
  svg.addEventListener('pointerover', e => { if (e.target.classList.contains('arm-hit')) armEl.classList.add('hover'); });
  svg.addEventListener('pointerout', e => { if (e.target.classList.contains('arm-hit')) armEl.classList.remove('hover'); });

  // ---- the timeline -----------------------------------------------------
  let scrubbing = false, scrubFrac = 0;
  function barFrac(e) {
    const r = barEl.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  }
  barEl.addEventListener('pointerdown', e => {
    scrubbing = true;
    scrubFrac = barFrac(e);
    barEl.setPointerCapture(e.pointerId);
  });
  barEl.addEventListener('pointermove', e => { if (scrubbing) scrubFrac = barFrac(e); });
  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    const t = TRACKS[current];
    if (mode === 'file' && audio.duration) audio.currentTime = scrubFrac * audio.duration;
    else if (!needleDown && t.url) playFrom(current, scrubFrac);
  };
  barEl.addEventListener('pointerup', endScrub);
  barEl.addEventListener('pointercancel', endScrub);

  // ---- level for the visuals ------------------------------------------
  const fft = new Uint8Array(512);
  let level = 0, bass = 0;
  function measure(time) {
    let l = 0, b = 0;
    const analysable = needleDown && (mode === 'ghost' || (mode === 'file' && elemRouted));
    if (analysable && analyser) {
      analyser.getByteFrequencyData(fft);
      for (let i = 2; i < 12; i++) b += fft[i];
      for (let i = 2; i < 160; i++) l += fft[i];
      b = b / (10 * 255);
      l = l / (158 * 255);
    } else if (needleDown) {
      // a gentle heartbeat when the browser keeps the audio to itself (file://)
      const beat = (time / 1000) * (68 / 60);
      b = 0.35 + 0.35 * Math.pow(Math.max(0, Math.sin(beat * Math.PI)), 8);
      l = 0.3 + 0.08 * Math.sin(time / 900);
    }
    level += (l - level) * 0.15;
    bass += (b - bass) * 0.25;
  }

  // ---- animation --------------------------------------------------------
  let last = performance.now();
  let altarVisible = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    measure(now);

    // platter: 33⅓ rpm = 200°/s, eased up and down like a real motor
    const targetSpeed = motor ? 200 : 0;
    spinSpeed += (targetSpeed - spinSpeed) * (1 - Math.exp(-dt * (motor ? 1.6 : 0.55)));
    spin = (spin + spinSpeed * dt) % 360;

    // the arm follows the groove while playing
    if (needleDown) armTarget = phiForSide(sideFrac());
    armPhi += (armTarget - armPhi) * (1 - Math.exp(-dt * (needleDown ? 8 : 3.2)));
    armLift += (liftTarget - armLift) * (1 - Math.exp(-dt * 12));

    if (altarVisible) {
      recEl.setAttribute('transform', `rotate(${spin.toFixed(2)})`);
      const s = 1 + armLift * 0.018;
      armEl.setAttribute('transform', `rotate(${armPhi.toFixed(3)} ${P.x} ${P.y}) translate(${P.x} ${P.y}) scale(${s}) translate(${-P.x} ${-P.y})`);
      armShadow.setAttribute('transform', `translate(${(5 + armLift * 9).toFixed(2)} ${(7 + armLift * 12).toFixed(2)}) rotate(${armPhi.toFixed(3)} ${P.x} ${P.y})`);
      svg.parentElement.classList.toggle('playing', needleDown);
      deckEl.classList.toggle('playing', needleDown);
      ledEl.setAttribute('fill', motor ? '#f0b2ff' : '#3a2a4a');
      ledEl.setAttribute('filter', motor ? 'url(#fBlur2)' : '');
      glowEl.style.opacity = (0.45 + (needleDown ? 0.25 + bass * 0.6 : 0)).toFixed(3);
      glowEl.style.transform = `scale(${(1 + bass * 0.05).toFixed(4)})`;

      // timeline
      const t = TRACKS[current];
      let cur = 0, dur = t.duration || NaN;
      if (mode === 'file') { cur = audio.currentTime; dur = audio.duration || dur; }
      else if (mode === 'ghost') { cur = ghost ? ghost.elapsed() : 0; dur = NaN; }
      else cur = resumeAt;
      const f = scrubbing ? scrubFrac : (dur > 0 ? cur / dur : 0);
      tCur.textContent = fmt(scrubbing && dur > 0 ? scrubFrac * dur : cur);
      tDur.textContent = mode === 'ghost' ? '∞' : fmt(dur);
      const pct = (Math.min(1, Math.max(0, f)) * 100).toFixed(3) + '%';
      barFill.style.width = pct;
      barKnob.style.left = pct;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // keyboard: space lifts / drops the needle on the altar
  addEventListener('keydown', e => {
    if (!altarVisible || e.code !== 'Space' || e.target.closest('button, input')) return;
    e.preventDefault();
    toggle();
  });

  // ---- public -----------------------------------------------------------
  function state() {
    return { playing: needleDown, mode, index: current, title: TRACKS[current].title, roman: ROMAN[current] };
  }
  window.Player = {
    state,
    toggle,
    level: () => level,
    bass: () => bass,
    audioContext: () => ensureCtx(),
    output: () => master,
    onChange: f => listeners.add(f),
    setAltarVisible: v => { altarVisible = v; },
    tracks: TRACKS
  };
})();
