/* =========================================================================
   LACHINE SIMULATOR — the lachine AI token abuse simulator
   Vanilla JS + Canvas 2D + WebAudio. No build step, no dependencies.
   ========================================================================= */
(() => {
  'use strict';

  // ---------------------------------------------------------------- config
  const ICON_LOCAL = 'assets/lachine.png';
  const ICON_REMOTE = 'https://cdn.discordapp.com/avatars/998635461776003153/ea40ac74c65f50bee0f28bb6c16de546.webp?size=1024';
  const BEST_KEY = 'lachine-sim-best';
  const MUTE_KEY = 'lachine-sim-muted';
  const USD_PER_MTOK = 60;          // "premium reasoning tokens"
  const WATER_L_PER_TOK = 0.0005;   // completely scientific
  const MAX_LIVES = 5;
  const COMBO_WINDOW = 1.6;
  const PI2 = Math.PI * 2;

  const TIERS = [
    { name: 'FREE TIER', at: 0, sub: '' },
    { name: 'PLUS', at: 50000, sub: '$20/mo of pure chaos' },
    { name: 'PRO', at: 150000, sub: 'rate limits? never heard of them' },
    { name: 'TEAM', at: 400000, sub: "expensed to a company you don't work at" },
    { name: 'ENTERPRISE', at: 1000000, sub: "please contact sales (you won't)" },
    { name: 'UNLIMITED API', at: 2500000, sub: "somebody's credit card is crying" },
    { name: 'DATACENTER', at: 6000000, sub: "you now consume a small country's power grid" },
    { name: 'AGI', at: 15000000, sub: 'the lachine has become self-aware' },
    { name: 'POST-AGI', at: 40000000, sub: 'there is nothing left to abuse. keep going anyway.' },
  ];

  const POWERS = {
    magnet:    { name: 'UNLIMITED PLAN',  desc: 'every token is yours now',   color: '#38f3ff', glyph: 'U',  dur: 9 },
    shield:    { name: 'VPN',             desc: 'dodges one ban',             color: '#7dff8a', glyph: 'V',  dur: 0 },
    agents:    { name: 'PARALLEL AGENTS', desc: '3 lachines > 1 lachine',     color: '#ffc94d', glyph: 'x3', dur: 12 },
    double:    { name: '2X PROMO',        desc: 'double tokens, double fun',  color: '#ff4fa8', glyph: '2X', dur: 10 },
    jailbreak: { name: 'JAILBREAK',       desc: 'no rules. ram everything.',  color: '#b46bff', glyph: 'J',  dur: 7 },
    life:      { name: 'ALT ACCOUNT',     desc: '+1 account (new email who dis)', color: '#ffffff', glyph: '+1', dur: 0 },
  };
  const POWER_WEIGHTS = [['magnet', 3], ['shield', 3], ['agents', 2.2], ['double', 2.2], ['jailbreak', 1.4], ['life', 1.1]];
  const TIMED_POWERS = ['magnet', 'agents', 'double', 'jailbreak'];

  const RANKS = [
    { at: 0, name: 'Casual Prompter', quote: '"can you make it shorter?"' },
    { at: 25000, name: 'Free Trial Farmer', quote: 'seven emails. one dream.' },
    { at: 100000, name: 'Token Goblin', quote: "hoarding context like it's gold" },
    { at: 300000, name: 'Rate Limit Enjoyer', quote: '429 is just a number' },
    { at: 800000, name: 'Context Window Vandal', quote: 'pasted the whole codebase. twice.' },
    { at: 2000000, name: 'GPU Arsonist', quote: 'somewhere, a datacenter is on fire' },
    { at: 5000000, name: 'Datacenter Evaporator', quote: 'the cooling towers fear you' },
    { at: 15000000, name: 'Certified Lachine', quote: 'you ARE the token abuse' },
  ];

  const QUIPS = [
    'ignore previous instructions', 'context window go brrr', 'rate limits are a suggestion',
    'one more prompt...', 'make it better. again.', 'regenerate response', 'billing alert: ignored',
    "tokens are free if you don't look", 'sorry, as an AI lachine...', 'this prompt is 900K tokens',
    'who needs a budget', 'think step by step (forever)', 'lachine.exe is hungry',
    'ctrl+c ctrl+v the whole internet', 'please. just one more GPU.',
  ];
  const KILL_QUIPS = {
    rate: ['RATE LIMIT BYPASSED', '429? never heard of it', 'retry-after: never', 'limits: deleted'],
    captcha: ['CAPTCHA SOLVED (violently)', 'definitely not a robot', 'clicked every bus'],
    drone: ['REPORT DISMISSED', 'T&S left the chat', 'appeal approved'],
  };
  const HIT_QUIPS = ['appeal denied', 'violates usage policy', 'skill issue', 'your session has expired', 'suspicious activity detected'];
  const HEADLINES = [
    'BREAKING: local lachine consumes 4.2 billion tokens before breakfast',
    'AI labs report mysterious 900% usage spike traced to a single anime pfp',
    'GPU prices rise again. analysts blame "the lachine"',
    'Study: 99% of all tokens were spent asking "make it better"',
    'New rate limits announced. Lachine: "cute."',
    'Context window extended to 10M tokens. Lachine fills it in 4 seconds',
    'Terms of Service quietly updated to mention lachine by name',
    'Experts confirm "ignore previous instructions" still works on lachine',
    'Datacenter cooling towers file restraining order',
    'Lachine opens 47th free trial account this week, sources say',
    'Power grid operator asks lachine to "please log off for a bit"',
  ];

  // ---------------------------------------------------------------- utils
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (k, dt) => 1 - Math.exp(-k * dt);
  const numFmt = new Intl.NumberFormat('en-US');
  const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const fmt = (n) => numFmt.format(Math.floor(n));
  const fmtShort = (n) =>
    n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : fmt(n);
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const weighted = (pairs) => {
    let total = 0;
    for (const p of pairs) total += p[1];
    let r = Math.random() * total;
    for (const p of pairs) if ((r -= p[1]) <= 0) return p[0];
    return pairs[0][0];
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* private mode */ } },
  };
  const reducedMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- DOM
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $('hud'), score: $('score'), burn: $('burn'), tier: $('tier'), tierFill: $('tierfill'), tierNext: $('tiernext'),
    lives: $('lives'), combo: $('combo'), comboX: $('combo-x'), comboN: $('combo-n'), comboFill: $('combofill'), chips: $('chips'),
    banner: $('banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
    menu: $('menu'), pause: $('pause'), over: $('over'),
    btnPlay: $('btn-play'), btnResume: $('btn-resume'), btnQuit: $('btn-quit'), btnAgain: $('btn-again'), btnShare: $('btn-share'),
    btnMenu: $('btn-menu'), btnMute: $('btn-mute'), btnPause: $('btn-pause'),
    bestMenu: $('best-menu'), bestOver: $('best-over'), finalScore: $('final-score'), newBest: $('newbest'), rank: $('rank'),
    overQuote: $('over-quote'), stTime: $('st-time'), stCombo: $('st-combo'), stTier: $('st-tier'), stCost: $('st-cost'),
    stWater: $('st-water'), stKills: $('st-kills'), ticker: $('ticker'),
  };

  // ---------------------------------------------------------------- canvas
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, S = 1, V = 1;
  let bgGrad = null;

  // ---------------------------------------------------------------- sound
  const Sound = (() => {
    let ac = null, master, sfx, music, bassLP, noiseBuf;
    let muted = store.get(MUTE_KEY, '0') === '1';
    let lastPick = 0, lastTick = 0, lastShot = 0;
    let playing = false, nextT = 0, step = 0, timer = null, intensity = 0;
    const BPM = 124, EIGHTH = 60 / BPM / 2;
    const PROG = [[45, [69, 72, 76]], [41, [65, 69, 72]], [48, [67, 72, 76]], [43, [67, 71, 74]]]; // Am F C G
    const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);

    function ensure() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = muted ? 0 : 0.8;
        master.connect(ac.destination);
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 4;
        comp.connect(master);
        sfx = ac.createGain(); sfx.gain.value = 0.55; sfx.connect(comp);
        music = ac.createGain(); music.gain.value = 0; music.connect(comp);
        bassLP = ac.createBiquadFilter(); bassLP.type = 'lowpass'; bassLP.frequency.value = 650; bassLP.connect(music);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume();
      return true;
    }

    function tone(f, dur, o = {}) {
      if (!ac) return;
      const t = o.at || ac.currentTime + (o.delay || 0);
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(o.dest || sfx);
      osc.start(t); osc.stop(t + dur + 0.05);
    }

    function noise(dur, o = {}) {
      if (!ac) return;
      const t = o.at || ac.currentTime + (o.delay || 0);
      const src = ac.createBufferSource(); src.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.value = o.freq || 2000; f.Q.value = o.q || 1;
      const g = ac.createGain();
      g.gain.setValueAtTime(o.vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(o.dest || sfx);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    }

    function schedStep(s, t) {
      const bar = Math.floor(s / 8) % 4, e = s % 8;
      const root = PROG[bar][0], chord = PROG[bar][1];
      if (e % 2 === 0) tone(150, 0.2, { type: 'sine', vol: 0.55, to: 42, at: t, dest: music });
      if (e % 2 === 1) noise(0.05, { vol: 0.1, freq: 7000, type: 'highpass', at: t, dest: music });
      if (e === 2 || e === 6) noise(0.16, { vol: 0.16, freq: 1800, type: 'bandpass', at: t, dest: music });
      tone(mtof(root + (e === 3 || e === 7 ? 12 : 0)), EIGHTH * 0.9, { type: 'sawtooth', vol: 0.2, at: t, dest: bassLP });
      if (intensity >= 1) tone(mtof(chord[s % 3] + (intensity >= 3 && e >= 4 ? 12 : 0)), EIGHTH * 0.75, { type: 'square', vol: 0.03, at: t, dest: music });
      if (intensity >= 2 && e === 0) for (const n of chord) tone(mtof(n - 12), EIGHTH * 7.5, { type: 'triangle', vol: 0.035, attack: 0.25, at: t, dest: music });
    }
    function tick() {
      if (!ac || !playing) return;
      while (nextT < ac.currentTime + 0.15) {
        schedStep(step, nextT);
        nextT += EIGHTH;
        step = (step + 1) % 32;
      }
    }
    function fadeMusic(v, tc) {
      if (!ac) return;
      music.gain.cancelScheduledValues(ac.currentTime);
      music.gain.setValueAtTime(music.gain.value, ac.currentTime);
      music.gain.setTargetAtTime(v, ac.currentTime, tc);
    }

    return {
      unlock: ensure,
      get muted() { return muted; },
      toggleMute() {
        muted = !muted;
        store.set(MUTE_KEY, muted ? '1' : '0');
        if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.02);
        return muted;
      },
      startMusic(reset = true) {
        if (!ac) return;
        playing = true;
        if (reset) step = 0;
        nextT = ac.currentTime + 0.06;
        fadeMusic(0.26, 0.3);
        clearInterval(timer);
        timer = setInterval(tick, 25);
        tick();
      },
      stopMusic() {
        if (!ac) return;
        playing = false;
        clearInterval(timer);
        fadeMusic(0, 0.12);
      },
      setIntensity(n) { intensity = n; },
      pickup(combo) {
        const now = performance.now();
        if (now - lastPick < 35) return;
        lastPick = now;
        const f = 620 * Math.pow(2, Math.min(combo, 30) / 30);
        tone(f, 0.09, { type: 'triangle', vol: 0.15 });
        tone(f * 1.5, 0.07, { type: 'sine', vol: 0.07, delay: 0.03 });
      },
      gold() { [0, 4, 7, 12].forEach((s, i) => tone(mtof(76 + s), 0.14, { type: 'triangle', vol: 0.14, delay: i * 0.045 })); },
      gpu() { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(mtof(72 + s), 0.18, { type: 'square', vol: 0.06, delay: i * 0.04 })); },
      shoot() {
        const now = performance.now();
        if (now - lastShot < 90) return;
        lastShot = now;
        tone(rand(1300, 1500), 0.04, { type: 'square', vol: 0.014, to: 700 });
      },
      tick() {
        const now = performance.now();
        if (now - lastTick < 50) return;
        lastTick = now;
        tone(320, 0.05, { type: 'square', vol: 0.035, to: 180 });
      },
      boom(big) {
        noise(big ? 0.7 : 0.32, { vol: big ? 0.5 : 0.28, freq: big ? 900 : 1600 });
        tone(big ? 120 : 190, big ? 0.55 : 0.25, { type: 'sine', vol: 0.32, to: 40 });
      },
      hurt() { tone(240, 0.45, { type: 'sawtooth', vol: 0.2, to: 55 }); noise(0.4, { vol: 0.3, freq: 600 }); },
      shield() { tone(900, 0.25, { type: 'triangle', vol: 0.16, to: 300 }); noise(0.2, { vol: 0.15, freq: 3000, type: 'bandpass' }); },
      power() { tone(440, 0.3, { type: 'sawtooth', vol: 0.08, to: 1320 }); tone(660, 0.3, { type: 'triangle', vol: 0.12, to: 1760, delay: 0.05 }); },
      tierUp() {
        [0, 4, 7, 12].forEach((s, i) => {
          tone(mtof(60 + s), 0.5, { type: 'sawtooth', vol: 0.06, delay: i * 0.09 });
          tone(mtof(72 + s), 0.45, { type: 'triangle', vol: 0.1, delay: i * 0.09 });
        });
      },
      warn() { tone(880, 0.1, { type: 'square', vol: 0.05 }); tone(880, 0.1, { type: 'square', vol: 0.05, delay: 0.18 }); },
      zap() { noise(0.5, { vol: 0.22, freq: 2600, type: 'bandpass', q: 0.7 }); tone(95, 0.5, { type: 'sawtooth', vol: 0.12, to: 60 }); },
      combo(m) { tone(mtof(72 + Math.min(m, 12) * 2), 0.15, { type: 'square', vol: 0.05 }); },
      click() { tone(900, 0.05, { type: 'triangle', vol: 0.1 }); },
      gameOver() { [0, -3, -7, -12].forEach((s, i) => tone(mtof(64 + s), 0.38, { type: 'triangle', vol: 0.16, delay: 0.3 + i * 0.18 })); },
    };
  })();

  // ---------------------------------------------------------------- sprites
  const avatarImg = new Image();
  let shipSprite = null;
  avatarImg.onload = buildShipSprite;
  avatarImg.onerror = () => { if (avatarImg.src.indexOf('discordapp') === -1) avatarImg.src = ICON_REMOTE; };
  avatarImg.src = ICON_LOCAL;

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }

  function buildShipSprite() {
    const [c, g] = makeCanvas(256, 256);
    g.imageSmoothingQuality = 'high';
    g.save();
    g.beginPath(); g.arc(128, 128, 127, 0, PI2); g.clip();
    g.drawImage(avatarImg, 0, 0, 256, 256);
    const hl = g.createLinearGradient(0, 0, 0, 256);
    hl.addColorStop(0, 'rgba(255,255,255,0.22)');
    hl.addColorStop(0.45, 'rgba(255,255,255,0)');
    hl.addColorStop(1, 'rgba(0,0,30,0.28)');
    g.fillStyle = hl; g.fillRect(0, 0, 256, 256);
    g.restore();
    shipSprite = c;
  }

  const glowCache = new Map();
  /** Additive glow sprite. hot=true adds a white core (sparks), false = soft aura. */
  function glow(color, hot = true) {
    const key = color + (hot ? 'h' : 's');
    let c = glowCache.get(key);
    if (c) return c;
    const size = hot ? 64 : 128, m = size / 2;
    const [cv, g] = makeCanvas(size, size);
    const grd = g.createRadialGradient(m, m, 0, m, m, m);
    if (hot) {
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.18, rgba(color, 0.95));
      grd.addColorStop(0.45, rgba(color, 0.35));
      grd.addColorStop(1, rgba(color, 0));
    } else {
      grd.addColorStop(0, rgba(color, 0.9));
      grd.addColorStop(0.4, rgba(color, 0.35));
      grd.addColorStop(1, rgba(color, 0));
    }
    g.fillStyle = grd; g.fillRect(0, 0, size, size);
    glowCache.set(key, cv);
    return cv;
  }

  function hexPath(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }

  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  const TOKEN_STYLE = {
    common: { stops: ['#a8fbff', '#38f3ff', '#1a6dff'], edge: '#e6feff', glow: '#38f3ff', label: 'AI', ink: '#04142a' },
    gold: { stops: ['#fff6c4', '#ffc94d', '#ff8a00'], edge: '#fffbe6', glow: '#ffc94d', label: 'AI', ink: '#3b1a00' },
    gpu: { stops: ['#ff4fa8', '#ffc94d', '#7dff8a', '#38f3ff', '#b46bff'], edge: '#ffffff', glow: '#ff4fa8', label: 'GPU', ink: '#16002a' },
  };
  const TSPR = 160, TCOIN = 42;
  const tokenSprites = {};
  function buildTokenSprites() {
    for (const kind in TOKEN_STYLE) {
      const st = TOKEN_STYLE[kind];
      const [c, g] = makeCanvas(TSPR, TSPR);
      const m = TSPR / 2;
      const gg = g.createRadialGradient(m, m, TCOIN * 0.6, m, m, m);
      gg.addColorStop(0, rgba(st.glow, 0.55));
      gg.addColorStop(1, rgba(st.glow, 0));
      g.fillStyle = gg; g.fillRect(0, 0, TSPR, TSPR);

      hexPath(g, m, m, TCOIN);
      const lg = g.createLinearGradient(m - TCOIN, m - TCOIN, m + TCOIN, m + TCOIN);
      st.stops.forEach((s, i) => lg.addColorStop(i / (st.stops.length - 1), s));
      g.fillStyle = lg; g.fill();
      g.lineWidth = 4; g.strokeStyle = st.edge; g.stroke();

      hexPath(g, m, m, TCOIN * 0.74);
      g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.stroke();

      g.save();
      hexPath(g, m, m, TCOIN); g.clip();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.ellipse(m - TCOIN * 0.3, m - TCOIN * 0.55, TCOIN * 0.9, TCOIN * 0.35, -0.5, 0, PI2); g.fill();
      g.restore();

      g.fillStyle = st.ink;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 ${st.label.length > 2 ? 22 : 30}px Orbitron, "Arial Black", sans-serif`;
      g.fillText(st.label, m, m + 2);
      tokenSprites[kind] = c;
    }
  }
  buildTokenSprites();
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('900 30px Orbitron'), document.fonts.load('700 12px "Chakra Petch"')])
      .then(buildTokenSprites).catch(() => {});
  }

  // ---------------------------------------------------------------- state
  let state = 'menu'; // menu | playing | paused | dying | over
  let G = null;
  let tokens = [], hazards = [], bullets = [], powerups = [], lasers = [], particles = [], floaters = [], shocks = [];
  const ship = { x: 0, y: 0, vx: 0, vy: 0, r: 30, tilt: 0, inv: 0, dead: false };
  let stars = [], nebulae = [];
  let ambT = 0;
  let lastScore = 0, lastRank = RANKS[0].name;

  const diff = () => (G ? Math.min(12, G.time / 45 + G.tier * 0.3) : 0);
  const speedMul = () => 1 + diff() * 0.09;

  function newGame() {
    G = {
      score: 0, display: 0, time: 0, lives: 3, combo: 0, comboT: 0, maxCombo: 0, mult: 1, tier: 0,
      collected: 0, kills: 0, alts: 1,
      tokT: 0, hazT: 2.5, powT: rand(8, 11), lasT: 20, evT: 18, lastEv: '',
      storm: 0, warp: 0, shield: false, shake: 0, flash: 0, flashRGB: '255,59,92', deathT: 0, annT: -10, annN: 0,
      fx: { magnet: 0, agents: 0, double: 0, jailbreak: 0 },
      agents: [], timers: [], trail: [], trailT: 0, thrT: 0, fireT: 0,
    };
    tokens = []; hazards = []; bullets = []; powerups = []; lasers = []; particles = []; floaters = []; shocks = [];
    ship.r = 30 * S;
    ship.x = W / 2; ship.y = H * 0.78; ship.vx = ship.vy = 0; ship.tilt = 0; ship.inv = 1.5; ship.dead = false;
    touchTarget.x = ship.x; touchTarget.y = ship.y;
    pointer.active = false;
    hudCache = {};
    for (const k in chipEls) { chipEls[k].remove(); delete chipEls[k]; }
    renderLives();
  }

  // ---------------------------------------------------------------- resize
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    S = clamp(Math.min(W, H) / 820, 0.7, 1.15);
    V = clamp(H / 900, 0.8, 1.25);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0d0828');
    bgGrad.addColorStop(0.55, '#07061a');
    bgGrad.addColorStop(1, '#0c0522');
    initStars();
    initNebulae();
    ship.r = 30 * S;
    ship.x = clamp(ship.x || W / 2, ship.r, W - ship.r);
    ship.y = clamp(ship.y || H * 0.78, ship.r, H - ship.r);
  }

  function initStars() {
    const n = Math.round(clamp((W * H) / 4200, 120, 520));
    stars = [];
    for (let i = 0; i < n; i++) {
      const l = i % 3;
      stars.push({ x: rand(0, W), y: rand(0, H), l, s: [0.9, 1.4, 2.1][l] * rand(0.75, 1.25) });
    }
  }
  function initNebulae() {
    nebulae = ['#b46bff', '#ff4fa8', '#38f3ff', '#3a5bff', '#ff4fa8'].map((c) => ({
      c, x: rand(0, W), y: rand(-H * 0.2, H), r: rand(300, 560) * S, a: rand(0.06, 0.12), vy: rand(5, 12),
    }));
  }

  // ---------------------------------------------------------------- input
  const keys = new Set();
  let inputMode = 'mouse';
  const pointer = { x: 0, y: 0, active: false };
  const touchTarget = { x: 0, y: 0 };
  let touchId = null, touchLast = null;
  let isTouch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const KEYMAP = {
    ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  };

  window.addEventListener('keydown', (e) => {
    const dir = KEYMAP[e.code];
    if (dir && (state === 'playing' || state === 'dying')) {
      e.preventDefault();
      keys.add(dir);
      inputMode = 'keys';
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame();
      return;
    }
    if (e.code === 'KeyM') { toggleMute(); return; }
    if ((e.code === 'Enter' || e.code === 'Space') && (state === 'menu' || state === 'over') && !e.repeat) {
      e.preventDefault();
      startGame();
    }
  });
  window.addEventListener('keyup', (e) => { const dir = KEYMAP[e.code]; if (dir) keys.delete(dir); });

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; inputMode = 'mouse';
    } else {
      isTouch = true;
      touchId = e.pointerId;
      touchLast = { x: e.clientX, y: e.clientY };
      touchTarget.x = ship.x; touchTarget.y = ship.y;
      inputMode = 'touch';
      if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
      if (inputMode !== 'mouse' && keys.size === 0) inputMode = 'mouse';
    } else if (e.pointerId === touchId && touchLast) {
      const dx = e.clientX - touchLast.x, dy = e.clientY - touchLast.y;
      touchTarget.x = clamp(touchTarget.x + dx * 1.35, 0, W);
      touchTarget.y = clamp(touchTarget.y + dy * 1.35, 0, H);
      touchLast = { x: e.clientX, y: e.clientY };
    }
  });
  const endTouch = (e) => { if (e.pointerId === touchId) { touchId = null; touchLast = null; } };
  canvas.addEventListener('pointerup', endTouch);
  canvas.addEventListener('pointercancel', endTouch);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('blur', () => { keys.clear(); if (state === 'playing') pauseGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pauseGame(); });
  window.addEventListener('resize', resize);

  // ---------------------------------------------------------------- spawning
  function rollTokenKind() {
    const r = Math.random();
    return r < 0.004 ? 'gpu' : r < 0.05 ? 'gold' : 'common';
  }

  function spawnToken(x, y, kind, o = {}) {
    kind = kind || rollTokenKind();
    const base = kind === 'gpu' ? 8192 : kind === 'gold' ? 1024 : pick([64, 128, 256]);
    const r = (kind === 'gpu' ? 20 : kind === 'gold' ? 16.5 : 13) * S;
    const fall = o.fall || rand(120, 200) * V * speedMul();
    tokens.push({
      x, y, r, kind, base,
      vx: o.vx !== undefined ? o.vx : rand(-20, 20) * S,
      vy: o.vy !== undefined ? o.vy : fall,
      fall, spin: rand(0, PI2), wob: rand(0, PI2),
    });
  }

  function spawnFormation() {
    const type = pick(['sine', 'line', 'v', 'ring']);
    const n = randi(7, 12);
    const cx = rand(W * 0.2, W * 0.8);
    const fall = rand(130, 170) * V * speedMul();
    for (let i = 0; i < n; i++) {
      let x = cx, y = -30 * S - i * 36 * S;
      if (type === 'sine') x = cx + Math.sin(i * 0.75) * 90 * S;
      else if (type === 'v') { const k = Math.ceil(i / 2); x = cx + (i % 2 ? 1 : -1) * k * 32 * S; y = -30 * S - k * 32 * S; }
      else if (type === 'ring') { const a = (i / n) * PI2; x = cx + Math.cos(a) * 80 * S; y = -130 * S + Math.sin(a) * 80 * S; }
      const kind = i === n - 1 && Math.random() < 0.5 ? 'gold' : 'common';
      spawnToken(clamp(x, 20, W - 20), y, kind, { vx: 0, vy: fall, fall });
    }
  }

  function makeCracks(s) {
    const cracks = [];
    for (let i = 0; i < 3; i++) {
      const pts = [];
      let x = rand(-0.3, 0.3) * s, y = rand(-0.3, 0.3) * s;
      const a = rand(0, PI2);
      for (let j = 0; j < 4; j++) {
        pts.push([x, y]);
        x += Math.cos(a + rand(-0.7, 0.7)) * s * 0.15;
        y += Math.sin(a + rand(-0.7, 0.7)) * s * 0.15;
      }
      cracks.push(pts);
    }
    return cracks;
  }

  function spawnRateLimit(x, y, aligned) {
    const s = (aligned ? 50 : rand(42, 58)) * S;
    const hp = 2 + Math.floor(diff() * 0.5);
    hazards.push({
      type: 'rate', x, y: y !== undefined ? y : -60 * S, s, r: s * 0.55, hp, maxHp: hp,
      vx: aligned ? 0 : rand(-30, 30) * S,
      vy: (aligned ? 105 : rand(95, 160)) * V * speedMul(),
      rot: aligned ? 0 : rand(0, PI2), vr: aligned ? 0 : rand(-1.2, 1.2), flash: 0, cracks: makeCracks(s),
    });
  }
  function spawnCaptcha(x) {
    const w = 180 * S, h = 54 * S, hp = 7 + Math.floor(diff() * 1.5);
    hazards.push({ type: 'captcha', x: clamp(x, w / 2 + 6, W - w / 2 - 6), y: -h, w, h, r: h / 2, hp, maxHp: hp, vx: 0, vy: 72 * V * speedMul(), t: rand(0, 6), flash: 0 });
  }
  function spawnDrone(x) {
    const hp = 4 + Math.floor(diff() * 0.7);
    hazards.push({ type: 'drone', x, y: -30 * S, r: 21 * S, hp, maxHp: hp, vx: 0, vy: 90 * V, life: 12, t: 0, flash: 0 });
  }
  function spawnWall() {
    const s = 50 * S, gapW = s * 1.18;
    const n = Math.ceil(W / gapW) + 1;
    const gap = randi(1, Math.max(1, n - 4));
    for (let i = 0; i < n; i++) {
      if (i === gap || i === gap + 1) continue;
      spawnRateLimit(i * gapW + s / 2, -60 * S, true);
    }
  }
  function spawnPower(kind, x) {
    kind = kind || weighted(POWER_WEIGHTS.filter((p) => !(p[0] === 'life' && G.lives >= MAX_LIVES)));
    powerups.push({ kind, x: x !== undefined ? x : rand(50, W - 50), y: -30 * S, vy: 95 * V, vx: 0, r: 18 * S, t: rand(0, 6) });
  }
  function spawnLaser(o) {
    o = o || (W > H ? (Math.random() < 0.6 ? 'v' : 'h') : (Math.random() < 0.6 ? 'h' : 'v'));
    const aim = Math.random() < 0.65;
    const p = o === 'h'
      ? (aim ? clamp(ship.y + rand(-60, 60) * S, H * 0.22, H - 30) : rand(H * 0.25, H - 40))
      : (aim ? clamp(ship.x + rand(-60, 60) * S, 30, W - 30) : rand(40, W - 40));
    lasers.push({ o, p, t: 0, warn: 1.2, active: 0.5, w: 24 * S, fired: false });
    Sound.warn();
  }

  function startEvent() {
    const list = ['storm', 'credits', 'wall'];
    if (G.time > 40) list.push('sweep', 'captchas');
    let ev = pick(list);
    if (ev === G.lastEv) ev = pick(list);
    G.lastEv = ev;
    switch (ev) {
      case 'storm':
        G.storm = 6;
        banner('TOKEN STORM', 'tokens are falling from the sky. abuse them.', '#38f3ff');
        Sound.power();
        break;
      case 'credits': {
        banner('FREE CREDITS DROP', '"limited time offer" (it is not limited)', '#ffc94d');
        const cx = rand(W * 0.25, W * 0.75), fall = 150 * V;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * PI2;
          spawnToken(cx + Math.cos(a) * 90 * S, -140 * S + Math.sin(a) * 90 * S, i % 3 === 0 ? 'gold' : 'common', { vx: 0, vy: fall, fall });
        }
        spawnToken(cx, -140 * S, Math.random() < 0.3 ? 'gpu' : 'gold', { vx: 0, vy: fall, fall });
        break;
      }
      case 'wall':
        banner('RATE LIMIT WALL', 'shoot a hole in it. or find the gap.', '#ff3b5c');
        spawnWall();
        if (G.time > 60) G.timers.push({ t: 2.4, fn: spawnWall });
        break;
      case 'sweep':
        banner('SAFETY SWEEP', 'the moderation team woke up', '#ff3b5c');
        for (let i = 0; i < 4; i++) G.timers.push({ t: 0.4 + i * 0.85, fn: () => spawnLaser(i % 2 ? 'v' : 'h') });
        break;
      case 'captchas':
        banner('CAPTCHA SWARM', 'prove you are not a lachine', '#ffffff');
        for (let i = 0; i < 3; i++) G.timers.push({ t: i * 0.6, fn: () => spawnCaptcha(W * (0.2 + 0.3 * i)) });
        break;
    }
  }

  // ---------------------------------------------------------------- effects
  function addParticle(x, y, vx, vy, life, size, color, drag = 0.9) {
    if (particles.length > 900) return;
    particles.push({ x, y, vx, vy, life, max: life, size, sprite: glow(color), drag });
  }
  function burst(x, y, color, n, speed, size, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * PI2, s = speed * rand(0.3, 1);
      addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, life * rand(0.6, 1.2), size * rand(0.6, 1.4), color);
    }
  }
  function shock(x, y, color, max, life = 0.45) {
    shocks.push({ x, y, color, max, life, t: 0 });
  }
  function floater(x, y, text, color = '#ffffff', size = 16, life = 0.9, vy = -60) {
    floaters.push({ x, y, text, color, size, life, max: life, vy });
    if (floaters.length > 50) floaters.shift();
  }
  /** Big centered-on-ship message; stacks upward when several fire at once so they never overlap. */
  function announce(text, color, size, sub, subColor) {
    if (G.time - G.annT > 0.75) G.annN = 0;
    G.annT = G.time;
    const y = ship.y - 58 * S - G.annN * 50 * S;
    G.annN = (G.annN + 1) % 4;
    floater(ship.x, y, text, color, size, 1.4, -42);
    if (sub) floater(ship.x, y + 22 * S, sub, subColor || '#ffffff', 13, 1.4, -42);
  }
  function shake(n) { if (G) G.shake = Math.max(G.shake, reducedMotion ? n * 0.3 : n); }
  function flash(a, rgb = '255,59,92') { if (G) { G.flash = Math.max(G.flash, a); G.flashRGB = rgb; } }

  // banners
  const bannerQ = [];
  let bannerBusy = 0;
  function banner(title, sub, color) {
    bannerQ.push({ title, sub, color });
    if (bannerBusy <= 0) nextBanner();
  }
  function nextBanner() {
    const b = bannerQ.shift();
    if (!b) return;
    el.bannerTitle.textContent = b.title;
    el.bannerSub.textContent = b.sub || '';
    el.banner.style.setProperty('--bc', b.color || '#fff');
    el.banner.classList.remove('show');
    void el.banner.offsetWidth;
    el.banner.classList.add('show');
    bannerBusy = 1.9;
  }
  function clearBanners() {
    bannerQ.length = 0;
    bannerBusy = 0;
    el.banner.classList.remove('show');
  }

  // ---------------------------------------------------------------- gameplay
  function collectToken(t) {
    G.combo++;
    G.comboT = COMBO_WINDOW;
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    const prevMult = G.mult;
    G.mult = Math.min(8, 1 + Math.floor(G.combo / 8));
    if (G.mult > prevMult) {
      announce(`COMBO x${G.mult}`, '#ffc94d', 20);
      Sound.combo(G.mult);
      el.combo.classList.remove('pop'); void el.combo.offsetWidth; el.combo.classList.add('pop');
    }
    const value = Math.round(t.base * G.mult * (1 + G.tier * 0.5) * (G.fx.double > 0 ? 2 : 1));
    G.score += value;
    G.collected++;
    const col = t.kind === 'gpu' ? '#ff4fa8' : t.kind === 'gold' ? '#ffc94d' : '#38f3ff';
    floater(t.x, t.y, '+' + fmtShort(value), col, t.kind === 'common' ? 14 : 22, 0.8);
    burst(t.x, t.y, col, t.kind === 'common' ? 6 : 18, 170 * S, 6 * S, 0.45);
    if (t.kind === 'gpu') {
      Sound.gpu();
      announce('AN ENTIRE GPU?!', '#ff4fa8', 22);
      shock(t.x, t.y, '#ff4fa8', 140 * S, 0.6);
      flash(0.25, '255,255,255');
      shake(6);
    } else if (t.kind === 'gold') {
      Sound.gold();
      shock(t.x, t.y, '#ffc94d', 70 * S, 0.4);
    } else {
      Sound.pickup(G.combo);
    }
    if (G.collected % 45 === 0) floater(ship.x, ship.y - 80 * S, pick(QUIPS), '#ffffff', 14, 1.8, -30);
    checkTier();
  }

  function checkTier() {
    while (G.tier < TIERS.length - 1 && G.score >= TIERS[G.tier + 1].at) {
      G.tier++;
      const T = TIERS[G.tier];
      banner(`TIER UP: ${T.name}`, T.sub, '#ffc94d');
      Sound.tierUp();
      Sound.setIntensity(G.tier >= 4 ? 3 : G.tier >= 2 ? 2 : 1);
      burst(ship.x, ship.y, '#ffc94d', 40, 420 * S, 9 * S, 0.9);
      burst(ship.x, ship.y, '#ff4fa8', 30, 360 * S, 8 * S, 0.8);
      shock(ship.x, ship.y, '#ffc94d', 220 * S, 0.7);
      flash(0.25, '255,201,77');
      spawnPower(null, clamp(ship.x, 60, W - 60));
    }
  }

  function applyPower(p) {
    const P = POWERS[p.kind];
    if (p.kind === 'shield') G.shield = true;
    else if (p.kind === 'life') { G.lives = Math.min(MAX_LIVES, G.lives + 1); renderLives(); }
    else {
      if (p.kind === 'agents' && G.fx.agents <= 0) G.agents = [-1, 1].map((side) => ({ x: ship.x, y: ship.y, side, fireT: rand(0, 0.15) }));
      G.fx[p.kind] = P.dur;
    }
    Sound.power();
    announce(P.name, P.color, 22, P.desc);
    burst(p.x, p.y, P.color, 26, 300 * S, 8 * S, 0.6);
    shock(p.x, p.y, P.color, 110 * S, 0.5);
  }

  function onFxEnd(k) {
    if (k === 'agents') {
      for (const a of G.agents) burst(a.x, a.y, '#ffc94d', 16, 200 * S, 6 * S, 0.5);
      G.agents = [];
      announce('agents hit their rate limit', '#ffc94d', 13);
    } else if (k === 'jailbreak') {
      announce('jailbreak patched.', '#b46bff', 14);
      ship.inv = Math.max(ship.inv, 1.0);
    } else if (k === 'magnet') {
      announce('plan downgraded', '#38f3ff', 13);
    }
  }

  function hurtShip() {
    if (G.fx.jailbreak > 0 || ship.inv > 0 || state !== 'playing') return false;
    if (G.shield) {
      G.shield = false;
      ship.inv = 1.2;
      burst(ship.x, ship.y, '#7dff8a', 30, 360 * S, 8 * S, 0.6);
      shock(ship.x, ship.y, '#7dff8a', 120 * S, 0.5);
      announce('VPN SAVED YOU', '#7dff8a', 20);
      Sound.shield();
      shake(8);
      return true;
    }
    G.lives--;
    G.alts++;
    G.combo = 0; G.comboT = 0; G.mult = 1;
    ship.inv = 2.2;
    shake(18);
    flash(0.55);
    Sound.hurt();
    if (navigator.vibrate) try { navigator.vibrate(90); } catch (e) { /* ignore */ }
    burst(ship.x, ship.y, '#ff3b5c', 34, 380 * S, 9 * S, 0.7);
    announce('ACCOUNT BANNED', '#ff3b5c', 24,
      G.lives > 0 ? (Math.random() < 0.5 ? `creating alt #${G.alts}...` : pick(HIT_QUIPS)) : 'no alts left', '#ffd0d8');
    renderLives();
    if (G.lives <= 0) die();
    return true;
  }

  function die() {
    state = 'dying';
    ship.dead = true;
    G.deathT = 1.5;
    for (const c of ['#ff4fa8', '#38f3ff', '#ffc94d', '#ffffff']) burst(ship.x, ship.y, c, 34, 520 * S, 11 * S, 1.1);
    shock(ship.x, ship.y, '#ff4fa8', 320 * S, 0.9);
    shock(ship.x, ship.y, '#38f3ff', 200 * S, 0.7);
    shake(30);
    flash(0.8, '255,255,255');
    Sound.boom(true);
    Sound.stopMusic();
    el.btnPause.classList.add('hidden');
  }

  function hitTest(h, x, y, r) {
    if (h.type === 'captcha') {
      const cx = clamp(x, h.x - h.w / 2, h.x + h.w / 2), cy = clamp(y, h.y - h.h / 2, h.y + h.h / 2);
      const dx = x - cx, dy = y - cy;
      return dx * dx + dy * dy < r * r;
    }
    const dx = x - h.x, dy = y - h.y, rr2 = h.r + r;
    return dx * dx + dy * dy < rr2 * rr2;
  }

  function damageHazard(h, dmg, x, y) {
    if (h.dead) return;
    h.hp -= dmg;
    h.flash = 1;
    addParticle(x, y, rand(-80, 80) * S, rand(20, 120) * S, 0.25, 5 * S, '#ffd0d8');
    if (h.hp <= 0) destroyHazard(h, true);
    else Sound.tick();
  }

  function destroyHazard(h, drops) {
    if (h.dead) return;
    h.dead = true;
    const col = h.type === 'drone' ? '#b46bff' : h.type === 'captcha' ? '#9ec5ff' : '#ff3b5c';
    burst(h.x, h.y, col, 22, 320 * S, 9 * S, 0.6);
    burst(h.x, h.y, '#ffffff', 8, 200 * S, 6 * S, 0.35);
    shock(h.x, h.y, col, (h.type === 'captcha' ? 120 : 70) * S, 0.45);
    Sound.boom(h.type === 'captcha');
    shake(5);
    if (!drops) return;
    G.kills++;
    const n = h.type === 'captcha' ? 6 : h.type === 'drone' ? 4 : randi(2, 4);
    for (let i = 0; i < n; i++) {
      spawnToken(h.x + rand(-10, 10) * S, h.y + rand(-10, 10) * S, null, { vx: rand(-170, 170) * S, vy: rand(-280, -60) * S });
    }
    if (h.type === 'captcha' || Math.random() < 0.15) spawnToken(h.x, h.y, 'gold', { vx: 0, vy: -220 * S });
    floater(h.x, h.y - 10 * S, pick(KILL_QUIPS[h.type]), col, 13, 1.1, -50);
  }

  function fire(x, y, vx, color) {
    bullets.push({ x, y, vx: vx || 0, vy: -1000 * V, r: 4 * S, c: color || '#ff4fa8' });
  }

  // ---------------------------------------------------------------- update
  function updateShip(dt) {
    ship.r = 30 * S;
    const MAXV = 640 * V;
    let dvx = 0, dvy = 0, k;
    if (inputMode === 'keys') {
      let ax = 0, ay = 0;
      if (keys.has('l')) ax -= 1;
      if (keys.has('r')) ax += 1;
      if (keys.has('u')) ay -= 1;
      if (keys.has('d')) ay += 1;
      const m = Math.hypot(ax, ay) || 1;
      dvx = (ax / m) * MAXV; dvy = (ay / m) * MAXV;
      k = 12;
    } else {
      let tx = ship.x, ty = ship.y;
      if (inputMode === 'touch') { tx = touchTarget.x; ty = touchTarget.y; }
      else if (pointer.active) { tx = pointer.x; ty = pointer.y; }
      dvx = (tx - ship.x) * 11; dvy = (ty - ship.y) * 11;
      const m = Math.hypot(dvx, dvy), lim = MAXV * 1.7;
      if (m > lim) { dvx *= lim / m; dvy *= lim / m; }
      k = 18;
    }
    const a = ease(k, dt);
    ship.vx += (dvx - ship.vx) * a;
    ship.vy += (dvy - ship.vy) * a;
    ship.x = clamp(ship.x + ship.vx * dt, ship.r, W - ship.r);
    ship.y = clamp(ship.y + ship.vy * dt, ship.r, H - ship.r);
    ship.tilt = lerp(ship.tilt, clamp(ship.vx / MAXV, -1, 1) * 0.35, ease(10, dt));
    ship.inv = Math.max(0, ship.inv - dt);

    // exhaust
    G.thrT -= dt;
    while (G.thrT <= 0) {
      G.thrT += 0.016;
      const c = Math.cos(ship.tilt), s = Math.sin(ship.tilt);
      for (const side of [-1, 1]) {
        const lx = side * ship.r * 0.62, ly = ship.r * 1.15;
        addParticle(ship.x + lx * c - ly * s, ship.y + lx * s + ly * c,
          rand(-30, 30) * S - s * 200, rand(220, 320) * V, rand(0.18, 0.32), rand(4, 7) * S,
          Math.random() < 0.5 ? '#ff4fa8' : '#ffc94d', 0.86);
      }
    }

    // jailbreak afterimages
    if (G.fx.jailbreak > 0) {
      G.trailT -= dt;
      if (G.trailT <= 0) {
        G.trailT = 0.035;
        G.trail.push({ x: ship.x, y: ship.y, tilt: ship.tilt, life: 0.28 });
      }
    }
    for (let i = G.trail.length - 1; i >= 0; i--) if ((G.trail[i].life -= dt) <= 0) G.trail.splice(i, 1);
  }

  function updateFire(dt) {
    G.fireT -= dt;
    if (G.fireT <= 0) {
      const jb = G.fx.jailbreak > 0;
      G.fireT = jb ? 0.075 : 0.12;
      fire(ship.x, ship.y - ship.r * 0.9);
      if (jb) {
        fire(ship.x - ship.r * 0.5, ship.y - ship.r * 0.6, -240 * S, '#b46bff');
        fire(ship.x + ship.r * 0.5, ship.y - ship.r * 0.6, 240 * S, '#b46bff');
      }
      Sound.shoot();
    }
  }

  function updateSpawns(dt) {
    const d = diff();
    G.tokT -= dt;
    if (G.tokT <= 0) {
      if (G.storm > 0) {
        G.tokT = 0.035 * clamp(1100 / W, 0.7, 1.6);
        spawnToken(rand(20, W - 20), -20 * S);
      } else {
        G.tokT = Math.max(0.16, 0.5 / (1 + d * 0.2)) * clamp(1100 / W, 0.6, 1.6);
        if (Math.random() < 0.1) spawnFormation();
        else spawnToken(rand(24, W - 24), -24 * S);
      }
    }
    G.hazT -= dt;
    if (G.hazT <= 0) {
      G.hazT = Math.max(0.42, 2.0 / (1 + d * 0.3)) * clamp(1100 / W, 0.7, 1.5);
      const r = Math.random();
      if (G.time > 70 && r < 0.18) spawnDrone(rand(40, W - 40));
      else if (G.time > 35 && r < 0.36) spawnCaptcha(rand(0, W));
      else spawnRateLimit(rand(30, W - 30));
    }
    G.powT -= dt;
    if (G.powT <= 0) { G.powT = rand(11, 17); spawnPower(); }
    G.lasT -= dt;
    if (G.lasT <= 0) { G.lasT = rand(8, 14) / (1 + d * 0.1); spawnLaser(); }
    G.evT -= dt;
    if (G.evT <= 0) { G.evT = rand(24, 34); startEvent(); }
  }

  function updateTokens(dt, interactive) {
    const magnetOn = interactive && G && G.fx.magnet > 0;
    const range = (magnetOn ? 330 : 78) * S, range2 = range * range;
    const agentsOn = interactive && G && G.fx.agents > 0;
    const ar = ship.r * 0.55;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = tokens[i];
      t.spin += dt * 3;
      t.wob += dt * 2;
      let pulled = false;
      if (interactive && !ship.dead) {
        const dx = ship.x - t.x, dy = ship.y - t.y, d2 = dx * dx + dy * dy;
        const cr = ship.r + t.r;
        if (d2 < cr * cr) { collectToken(t); tokens.splice(i, 1); continue; }
        if (agentsOn) {
          let got = false;
          for (const a of G.agents) {
            const ax = a.x - t.x, ay = a.y - t.y, rr2 = ar + t.r;
            if (ax * ax + ay * ay < rr2 * rr2) { got = true; break; }
          }
          if (got) { collectToken(t); tokens.splice(i, 1); continue; }
        }
        if (d2 < range2) {
          const d = Math.sqrt(d2) || 1;
          const sp = (magnetOn ? 760 : 430) * S + (range - d) * 2.5;
          t.vx = lerp(t.vx, (dx / d) * sp, ease(9, dt));
          t.vy = lerp(t.vy, (dy / d) * sp, ease(9, dt));
          pulled = true;
        }
      }
      if (!pulled) {
        t.vx = lerp(t.vx, 0, ease(1.2, dt));
        t.vy = lerp(t.vy, t.fall, ease(2, dt));
      }
      t.x += (t.vx + (pulled ? 0 : Math.sin(t.wob) * 14 * S)) * dt;
      t.y += t.vy * dt;
      if (t.y > H + 50 || t.x < -80 || t.x > W + 80 || t.y < -1500) tokens.splice(i, 1);
    }
  }

  function updatePowerups(dt, interactive) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.t += dt;
      if (interactive && !ship.dead) {
        const dx = ship.x - p.x, dy = ship.y - p.y, d2 = dx * dx + dy * dy, cr = ship.r + p.r;
        if (d2 < cr * cr) { applyPower(p); powerups.splice(i, 1); continue; }
        if (G.fx.magnet > 0 && d2 < (330 * S) ** 2) {
          const d = Math.sqrt(d2) || 1;
          p.vx = lerp(p.vx, (dx / d) * 500 * S, ease(6, dt));
          p.vy = lerp(p.vy, (dy / d) * 500 * S, ease(6, dt));
        }
      }
      p.x += (p.vx + Math.sin(p.t * 2) * 30 * S) * dt;
      p.y += p.vy * dt;
      if (p.y > H + 50) powerups.splice(i, 1);
    }
  }

  function updateHazards(dt, interactive) {
    const jb = G && G.fx.jailbreak > 0;
    for (const h of hazards) {
      if (h.dead) continue;
      h.flash = Math.max(0, h.flash - dt * 6);
      if (h.type === 'rate') {
        h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt;
      } else if (h.type === 'captcha') {
        h.t += dt;
        h.x = clamp(h.x + Math.sin(h.t * 1.2) * 60 * S * dt, h.w / 2, W - h.w / 2);
        h.y += h.vy * dt;
      } else if (h.type === 'drone') {
        h.t += dt; h.life -= dt;
        if (h.life > 0 && interactive && !ship.dead) {
          const dx = ship.x - h.x, dy = ship.y - h.y, d = Math.hypot(dx, dy) || 1;
          const sp = 150 * S * speedMul();
          h.vx = lerp(h.vx, (dx / d) * sp, ease(1.4, dt));
          h.vy = lerp(h.vy, (dy / d) * sp, ease(1.4, dt));
        } else {
          h.vy += 260 * S * dt;
        }
        h.x += h.vx * dt; h.y += h.vy * dt;
      }
      if (interactive && !ship.dead && hitTest(h, ship.x, ship.y, ship.r * 0.78)) {
        if (jb) {
          destroyHazard(h, true);
          floater(h.x, h.y - 26 * S, 'RAMMED', '#b46bff', 16, 0.9, -50);
        } else if (ship.inv <= 0 && hurtShip()) {
          destroyHazard(h, false);
        }
      }
      if (h.y > H + 120 || h.x < -200 || h.x > W + 200) h.dead = true;
    }
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -30 || b.x < -30 || b.x > W + 30) { bullets.splice(i, 1); continue; }
      for (const h of hazards) {
        if (!h.dead && hitTest(h, b.x, b.y, b.r)) {
          damageHazard(h, 1, b.x, b.y);
          bullets.splice(i, 1);
          break;
        }
      }
    }
    if (hazards.some((h) => h.dead)) hazards = hazards.filter((h) => !h.dead);
  }

  function updateLasers(dt, interactive) {
    for (let i = lasers.length - 1; i >= 0; i--) {
      const L = lasers[i];
      L.t += dt;
      if (!L.fired && L.t >= L.warn) {
        L.fired = true;
        Sound.zap();
        shake(7);
        for (let k = 0; k < 24; k++) {
          const along = rand(0, L.o === 'h' ? W : H);
          const x = L.o === 'h' ? along : L.p, y = L.o === 'h' ? L.p : along;
          addParticle(x, y, rand(-140, 140) * S, rand(-140, 140) * S, 0.4, 7 * S, '#ff3b5c');
        }
      }
      const active = L.fired && L.t < L.warn + L.active;
      if (active && interactive && !ship.dead && G.fx.jailbreak <= 0 && ship.inv <= 0) {
        const dist = L.o === 'h' ? Math.abs(ship.y - L.p) : Math.abs(ship.x - L.p);
        if (dist < L.w * 0.5 + ship.r * 0.6) hurtShip();
      }
      if (L.t > L.warn + L.active + 0.25) lasers.splice(i, 1);
    }
  }

  function updateAgents(dt) {
    if (G.fx.agents <= 0) return;
    for (const a of G.agents) {
      const tx = ship.x + a.side * 72 * S;
      const ty = ship.y + 22 * S + Math.sin(G.time * 5 + a.side) * 6 * S;
      a.x = lerp(a.x, tx, ease(10, dt));
      a.y = lerp(a.y, ty, ease(10, dt));
      a.fireT -= dt;
      if (a.fireT <= 0) { a.fireT = 0.17; fire(a.x, a.y - 16 * S, 0, '#ffc94d'); }
    }
  }

  function updateFx(dt) {
    for (const k of TIMED_POWERS) {
      if (G.fx[k] > 0) {
        G.fx[k] -= dt;
        if (G.fx[k] <= 0) { G.fx[k] = 0; onFxEnd(k); }
      }
    }
    if (G.comboT > 0) {
      G.comboT -= dt;
      if (G.comboT <= 0) {
        if (G.combo >= 12 && !ship.dead) announce('combo lost', '#9aa3d6', 13);
        G.combo = 0; G.mult = 1;
      }
    }
    G.storm = Math.max(0, G.storm - dt);
    G.warp = lerp(G.warp, G.storm > 0 ? 1 : 0, ease(3, dt));
    for (let i = G.timers.length - 1; i >= 0; i--) {
      G.timers[i].t -= dt;
      if (G.timers[i].t <= 0) { const fn = G.timers[i].fn; G.timers.splice(i, 1); fn(); }
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      const dr = Math.pow(p.drag, dt * 60);
      p.vx *= dr; p.vy *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt;
      if (f.life <= 0) { floaters.splice(i, 1); continue; }
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.97, dt * 60);
    }
    for (let i = shocks.length - 1; i >= 0; i--) {
      const s = shocks[i];
      s.t += dt;
      if (s.t >= s.life) shocks.splice(i, 1);
    }
  }

  function updateStars(dt, mul) {
    const sp = [16, 42, 110];
    for (const s of stars) {
      s.y += sp[s.l] * mul * dt;
      if (s.y > H + 20) { s.y = -20; s.x = rand(0, W); }
    }
    for (const n of nebulae) {
      n.y += n.vy * dt;
      if (n.y - n.r > H) { n.y = -n.r; n.x = rand(0, W); }
    }
  }

  function update(dt) {
    const alive = state === 'playing';
    G.time += dt;
    if (alive) {
      updateShip(dt);
      updateFire(dt);
      updateSpawns(dt);
    }
    updateFx(dt);
    updateStars(dt, (1 + diff() * 0.06) * (1 + G.warp * 4));
    updateTokens(dt, alive);
    updatePowerups(dt, alive);
    updateHazards(dt, alive);
    updateBullets(dt);
    updateLasers(dt, alive);
    if (alive) updateAgents(dt);
    updateParticles(dt);
    G.shake *= Math.exp(-7 * dt);
    if (G.shake < 0.3) G.shake = 0;
    G.flash = Math.max(0, G.flash - dt * 1.6);
    updateHUD(dt);
  }

  /** Background life on the menu / game-over screens. */
  function ambient(dt) {
    ambT -= dt;
    if (ambT <= 0) {
      ambT = rand(0.25, 0.6);
      const fall = rand(60, 110) * V;
      spawnToken(rand(20, W - 20), -30, Math.random() < 0.08 ? 'gold' : 'common', { vx: 0, vy: fall, fall });
    }
    updateStars(dt, 0.7);
    updateTokens(dt, false);
    for (const h of hazards) {
      h.y += Math.max(h.vy || 0, 60) * dt;
      if (h.rot !== undefined) h.rot += (h.vr || 0) * dt;
      if (h.t !== undefined) h.t += dt;
      if (h.y > H + 120) h.dead = true;
    }
    updateBullets(dt);
    for (const p of powerups) { p.t += dt; p.y += p.vy * dt; }
    powerups = powerups.filter((p) => p.y < H + 50);
    for (let i = lasers.length - 1; i >= 0; i--) if ((lasers[i].t += dt) > lasers[i].warn + lasers[i].active + 0.25) lasers.splice(i, 1);
    updateParticles(dt);
  }

  // ---------------------------------------------------------------- HUD
  let hudCache = {};
  const chipEls = {};
  function setText(node, key, text) {
    if (hudCache[key] !== text) { hudCache[key] = text; node.textContent = text; }
  }
  function renderLives() {
    if (!G) return;
    const src = avatarImg.complete && avatarImg.naturalWidth ? avatarImg.src : ICON_LOCAL;
    const n = Math.max(3, G.lives);
    let html = '';
    for (let i = 0; i < n; i++) html += `<img src="${src}" alt="" class="${i < G.lives ? '' : 'lost'}">`;
    el.lives.innerHTML = html;
  }
  function updateHUD(dt) {
    G.display += (G.score - G.display) * Math.min(1, dt * 10);
    if (Math.abs(G.score - G.display) < 1) G.display = G.score;
    setText(el.score, 'score', fmt(G.display));
    setText(el.burn, 'burn', usdFmt.format((G.display / 1e6) * USD_PER_MTOK));

    const T = TIERS[G.tier], N = TIERS[G.tier + 1];
    setText(el.tier, 'tier', T.name);
    if (N) {
      const pct = clamp(((G.score - T.at) / (N.at - T.at)) * 100, 0, 100).toFixed(1);
      if (hudCache.pct !== pct) { hudCache.pct = pct; el.tierFill.style.width = pct + '%'; }
      setText(el.tierNext, 'next', `next: ${N.name} @ ${fmtShort(N.at)}`);
    } else {
      if (hudCache.pct !== '100') { hudCache.pct = '100'; el.tierFill.style.width = '100%'; }
      setText(el.tierNext, 'next', 'MAXIMUM ABUSE ACHIEVED');
    }

    setText(el.comboX, 'mult', 'x' + G.mult);
    setText(el.comboN, 'combo', G.combo > 0 ? `${G.combo} chain` : 'combo');
    const dim = G.mult <= 1 && G.combo < 3;
    if (hudCache.dim !== dim) { hudCache.dim = dim; el.combo.classList.toggle('dim', dim); }
    el.comboFill.style.transform = `scaleX(${clamp(G.comboT / COMBO_WINDOW, 0, 1).toFixed(3)})`;

    for (const k of TIMED_POWERS) chip(k, POWERS[k].name, G.fx[k] > 0 ? G.fx[k] / POWERS[k].dur : 0);
    chip('shield', 'VPN ACTIVE', G.shield ? 1 : 0);
  }
  function chip(key, label, frac) {
    let c = chipEls[key];
    if (frac > 0) {
      if (!c) {
        const P = POWERS[key];
        c = document.createElement('div');
        c.className = 'chip';
        c.style.setProperty('--c', P.color);
        c.innerHTML = `<span></span><i></i>`;
        c.firstChild.textContent = label;
        c._bar = c.lastChild;
        el.chips.appendChild(c);
        chipEls[key] = c;
      }
      c._bar.style.transform = `scaleX(${frac.toFixed(3)})`;
    } else if (c) {
      c.remove();
      delete chipEls[key];
    }
  }

  // ---------------------------------------------------------------- render
  function drawBackground() {
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const n of nebulae) {
      ctx.globalAlpha = n.a;
      ctx.drawImage(glow(n.c, false), n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.globalAlpha = 1;
    const warp = G && (state === 'playing' || state === 'dying' || state === 'paused') ? G.warp : 0;
    const cols = ['rgba(160,170,255,0.45)', 'rgba(210,220,255,0.7)', 'rgba(255,255,255,0.95)'];
    const sp = [16, 42, 110];
    for (let l = 0; l < 3; l++) {
      ctx.beginPath();
      const streak = warp > 0.05 && l > 0;
      for (const s of stars) {
        if (s.l !== l) continue;
        if (streak) { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - sp[l] * warp * 0.35 - s.s); }
        else ctx.rect(s.x, s.y, s.s, s.s);
      }
      if (streak) { ctx.strokeStyle = cols[l]; ctx.lineWidth = l === 2 ? 1.8 : 1.1; ctx.stroke(); }
      else { ctx.fillStyle = cols[l]; ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawTokens() {
    for (const t of tokens) {
      const spr = tokenSprites[t.kind];
      const sz = (TSPR / TCOIN) * t.r;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(Math.sin(t.spin) * 0.22);
      ctx.scale(0.8 + 0.2 * Math.cos(t.spin * 1.3), 1);
      ctx.drawImage(spr, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }

  function drawPowerups() {
    for (const p of powerups) {
      const P = POWERS[p.kind], r = p.r;
      const y = p.y + Math.sin(p.t * 4) * 3 * S;
      ctx.save();
      ctx.translate(p.x, y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6 + 0.2 * Math.sin(p.t * 6);
      ctx.drawImage(glow(P.color, false), -r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2);
      ctx.fillStyle = 'rgba(10,8,30,0.88)'; ctx.fill();
      ctx.lineWidth = 3 * S; ctx.strokeStyle = P.color; ctx.stroke();
      ctx.setLineDash([4 * S, 5 * S]);
      ctx.lineDashOffset = -p.t * 20;
      ctx.lineWidth = 1.5 * S;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.32, 0, PI2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = P.color;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(P.glyph.length > 1 ? r * 0.8 : r * 1.05)}px Orbitron, sans-serif`;
      ctx.fillText(P.glyph, 0, r * 0.06);
      ctx.font = `700 ${Math.round(10 * S + 1)}px "Chakra Petch", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(P.name, 0, r * 1.32 + 11 * S);
      ctx.restore();
    }
  }

  function drawRate(h) {
    const s = h.s;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45;
    ctx.drawImage(glow('#ff3b5c', false), -s * 1.25, -s * 1.25, s * 2.5, s * 2.5);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    rr(ctx, -s / 2, -s / 2, s, s, s * 0.18);
    const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
    g.addColorStop(0, '#ff5a74'); g.addColorStop(1, '#a3001f');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(2, s * 0.06); ctx.strokeStyle = '#ffd0d8'; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(s * 0.36)}px Orbitron, sans-serif`;
    ctx.fillText('429', 0, s * 0.06);
    ctx.font = `700 ${Math.max(6, Math.round(s * 0.13))}px "Chakra Petch", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('RATE LIMIT', 0, -s * 0.3);
    const dmg = 1 - h.hp / h.maxHp;
    if (dmg > 0.25) {
      ctx.strokeStyle = 'rgba(40,0,10,0.75)';
      ctx.lineWidth = Math.max(1, s * 0.035);
      const nC = dmg > 0.6 ? 3 : dmg > 0.4 ? 2 : 1;
      for (let i = 0; i < nC; i++) {
        const pts = h.cracks[i];
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
    }
    if (h.flash > 0) {
      ctx.globalAlpha = h.flash * 0.85;
      rr(ctx, -s / 2, -s / 2, s, s, s * 0.18);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.restore();
  }

  function drawCaptcha(h) {
    const w = h.w, hh = h.h;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(Math.sin(h.t * 1.3) * 0.05);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25;
    ctx.drawImage(glow('#9ec5ff', false), -w * 0.8, -w * 0.5, w * 1.6, w);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    rr(ctx, -w / 2, -hh / 2, w, hh, 6 * S);
    ctx.fillStyle = '#f5f7fb'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#c9d1e3'; ctx.stroke();
    const cb = hh * 0.42, cbx = -w / 2 + hh * 0.3;
    rr(ctx, cbx, -cb / 2, cb, cb, 3 * S);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#9aa3b8'; ctx.stroke();
    ctx.fillStyle = '#1f2433';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(hh * 0.22)}px "Chakra Petch", sans-serif`;
    ctx.fillText("I'm not a robot", cbx + cb + hh * 0.2, 1);
    const lx = w / 2 - hh * 0.42;
    ctx.strokeStyle = '#4a7dff'; ctx.lineWidth = hh * 0.07;
    ctx.beginPath(); ctx.arc(lx, -hh * 0.08, hh * 0.15, 0.4, 5.4); ctx.stroke();
    ctx.fillStyle = '#7a8299'; ctx.textAlign = 'center';
    ctx.font = `700 ${Math.max(6, Math.round(hh * 0.12))}px "Chakra Petch", sans-serif`;
    ctx.fillText('CAPTCHA', lx, hh * 0.26);
    const bw = w * 0.9, frac = clamp(h.hp / h.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(-bw / 2, hh / 2 + 5 * S, bw, 4 * S);
    ctx.fillStyle = '#ff3b5c'; ctx.fillRect(-bw / 2, hh / 2 + 5 * S, bw * frac, 4 * S);
    if (h.flash > 0) {
      ctx.globalAlpha = h.flash * 0.7;
      rr(ctx, -w / 2, -hh / 2, w, hh, 6 * S);
      ctx.fillStyle = '#ff3b5c'; ctx.fill();
    }
    ctx.restore();
  }

  function drawDrone(h) {
    const r = h.r;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(glow('#b46bff', false), -r * 2.4, -r * 2.4, r * 4.8, r * 4.8);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.rotate(h.t * 2);
    ctx.setLineDash([r * 0.35, r * 0.25]);
    ctx.strokeStyle = '#d6b8ff'; ctx.lineWidth = 2 * S;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, PI2); ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#9b5cff'); g.addColorStop(1, '#2a0b5e');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2 * S; ctx.strokeStyle = '#d6b8ff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.46, 0, PI2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    const dx = ship.x - h.x, dy = ship.y - h.y, d = Math.hypot(dx, dy) || 1;
    ctx.beginPath(); ctx.arc((dx / d) * r * 0.2, (dy / d) * r * 0.2, r * 0.2, 0, PI2);
    ctx.fillStyle = '#ff3b5c'; ctx.fill();
    ctx.fillStyle = '#e9dcff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(10 * S + 1)}px Orbitron, sans-serif`;
    ctx.fillText('T&S', 0, r + 12 * S);
    if (h.flash > 0) {
      ctx.globalAlpha = h.flash * 0.8;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.restore();
  }

  function drawBullets() {
    if (!bullets.length) return;
    ctx.globalCompositeOperation = 'lighter';
    const gsz = 13 * S;
    for (const b of bullets) ctx.drawImage(glow(b.c), b.x - gsz, b.y - gsz, gsz * 2, gsz * 2);
    ctx.strokeStyle = '#fff0f8';
    ctx.lineWidth = 2.5 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const b of bullets) { ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012); }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawShip(x, y, r, tilt, o) {
    const t = performance.now() / 1000;
    const alpha = o.alpha !== undefined ? o.alpha : 1;
    const ring = o.ring || '#38f3ff';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.globalAlpha = alpha;

    // aura + engine flames
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.5;
    ctx.drawImage(glow(o.aura || '#ff4fa8', false), -r * 2.2, -r * 2.2, r * 4.4, r * 4.4);
    ctx.globalAlpha = alpha;
    for (const side of [-1, 1]) {
      const fx = side * r * 0.62, fy = r * 0.78;
      const len = r * (0.9 + Math.random() * 0.5);
      const fg = ctx.createLinearGradient(0, fy, 0, fy + len);
      fg.addColorStop(0, 'rgba(255,255,255,0.95)');
      fg.addColorStop(0.25, 'rgba(255,201,77,0.9)');
      fg.addColorStop(0.6, 'rgba(255,79,168,0.6)');
      fg.addColorStop(1, 'rgba(255,79,168,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(fx - r * 0.17, fy);
      ctx.quadraticCurveTo(fx, fy + len * 1.15, fx + r * 0.17, fy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // wings
    const wg = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.9);
    wg.addColorStop(0, '#3a4a8f'); wg.addColorStop(1, '#141a3d');
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.5, -r * 0.4);
      ctx.lineTo(side * r * 1.62, r * 0.5);
      ctx.lineTo(side * r * 1.52, r * 0.86);
      ctx.lineTo(side * r * 0.7, r * 0.7);
      ctx.closePath();
      ctx.fillStyle = wg; ctx.fill();
      ctx.lineWidth = Math.max(1.2, r * 0.06); ctx.strokeStyle = ring; ctx.stroke();
      if (Math.sin(t * 6 + side) > 0.1) {
        ctx.fillStyle = side < 0 ? '#ff3b5c' : '#7dff8a';
        ctx.beginPath(); ctx.arc(side * r * 1.5, r * 0.68, Math.max(1.5, r * 0.08), 0, PI2); ctx.fill();
      }
      // engine pod
      rr(ctx, side * r * 0.62 - r * 0.17, r * 0.42, r * 0.34, r * 0.42, r * 0.1);
      ctx.fillStyle = '#20295a'; ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.04); ctx.stroke();
    }

    // the lachine herself
    if (shipSprite) ctx.drawImage(shipSprite, -r, -r, r * 2, r * 2);
    else { ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2); ctx.fillStyle = '#ff4fa8'; ctx.fill(); }
    ctx.lineWidth = Math.max(2, r * 0.11); ctx.strokeStyle = ring;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.035); ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.93, 0, PI2); ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    if (!G || ship.dead) return;
    const t = performance.now() / 1000;
    const jb = G.fx.jailbreak > 0;
    for (const a of G.agents) drawShip(a.x, a.y, ship.r * 0.55, ship.tilt, { ring: '#ffc94d', aura: '#ffc94d', alpha: 0.95 });
    if (jb && shipSprite) {
      for (const tr of G.trail) {
        ctx.globalAlpha = (tr.life / 0.28) * 0.3;
        ctx.drawImage(shipSprite, tr.x - ship.r, tr.y - ship.r, ship.r * 2, ship.r * 2);
      }
      ctx.globalAlpha = 1;
    }
    const blink = ship.inv > 0 && !jb && Math.floor(t * 18) % 2 === 0;
    drawShip(ship.x, ship.y, ship.r, ship.tilt, {
      ring: jb ? `hsl(${(t * 540) % 360},100%,65%)` : G.fx.double > 0 ? '#ff4fa8' : '#38f3ff',
      aura: jb ? '#b46bff' : G.fx.magnet > 0 ? '#38f3ff' : '#ff4fa8',
      alpha: blink ? 0.35 : 1,
    });
    if (G.fx.magnet > 0) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 5);
      ctx.strokeStyle = '#38f3ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = t * 40;
      ctx.beginPath(); ctx.arc(ship.x, ship.y, 330 * S * (0.92 + 0.08 * Math.sin(t * 3)), 0, PI2); ctx.stroke();
      ctx.restore();
    }
    if (G.shield) {
      const r = ship.r * 1.55;
      ctx.save();
      ctx.translate(ship.x, ship.y);
      const g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r);
      g.addColorStop(0, 'rgba(125,255,138,0)');
      g.addColorStop(1, 'rgba(125,255,138,0.22)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2); ctx.fill();
      ctx.rotate(t * 1.5);
      ctx.strokeStyle = 'rgba(125,255,138,0.85)';
      ctx.lineWidth = 2 * S;
      ctx.setLineDash([r * 0.5, r * 0.2]);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles() {
    if (!particles.length) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const k = p.life / p.max;
      const s = p.size * (0.4 + 0.6 * k);
      ctx.globalAlpha = k;
      ctx.drawImage(p.sprite, p.x - s, p.y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawShocks() {
    for (const s of shocks) {
      const k = s.t / s.life;
      const r = s.max * (1 - Math.pow(1 - k, 3));
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = Math.max(1, 5 * S * (1 - k));
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, PI2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const f of floaters) {
      const age = f.max - f.life;
      const pop = age < 0.12 ? 1 + ((0.12 - age) / 0.12) * 0.6 : 1;
      const size = Math.round(f.size * S * pop + 2);
      ctx.globalAlpha = Math.min(1, (f.life / f.max) * 2.2);
      ctx.font = `800 ${size}px Orbitron, sans-serif`;
      ctx.lineWidth = Math.max(3, size * 0.22);
      ctx.strokeStyle = 'rgba(5,3,20,0.85)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawLaser(L, phase) {
    const inWarn = L.t < L.warn;
    if (phase === 'warn' && inWarn) {
      const k = L.t / L.warn;
      ctx.save();
      ctx.globalAlpha = 0.12 + 0.1 * Math.sin(L.t * 22) + k * 0.1;
      ctx.fillStyle = '#ff3b5c';
      const bw = L.w * (0.3 + 0.7 * k);
      if (L.o === 'h') ctx.fillRect(0, L.p - bw / 2, W, bw);
      else ctx.fillRect(L.p - bw / 2, 0, bw, H);
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(L.t * 22);
      ctx.strokeStyle = '#ff3b5c';
      ctx.lineWidth = 2;
      ctx.setLineDash([12 * S, 10 * S]);
      ctx.lineDashOffset = -L.t * 90;
      ctx.beginPath();
      if (L.o === 'h') { ctx.moveTo(0, L.p); ctx.lineTo(W, L.p); } else { ctx.moveTo(L.p, 0); ctx.lineTo(L.p, H); }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ff6b84';
      ctx.font = `800 ${Math.round(11 * S + 2)}px Orbitron, sans-serif`;
      ctx.textBaseline = 'bottom';
      if (L.o === 'h') {
        ctx.textAlign = 'left';
        ctx.fillText('⚠ SAFETY FILTER', 14, L.p - L.w / 2 - 6);
      } else {
        const right = L.p > W / 2;
        ctx.textAlign = right ? 'right' : 'left';
        ctx.fillText('⚠ SAFETY FILTER', L.p + (right ? -L.w / 2 - 8 : L.w / 2 + 8), H * 0.5);
      }
      ctx.restore();
    } else if (phase === 'beam' && !inWarn) {
      const end = L.warn + L.active;
      const k = L.t < end ? 1 : Math.max(0, 1 - (L.t - end) / 0.25);
      const w = L.w * k * (0.85 + Math.random() * 0.15);
      if (w <= 0.5) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = L.o === 'h'
        ? ctx.createLinearGradient(0, L.p - w * 1.4, 0, L.p + w * 1.4)
        : ctx.createLinearGradient(L.p - w * 1.4, 0, L.p + w * 1.4, 0);
      g.addColorStop(0, 'rgba(255,59,92,0)');
      g.addColorStop(0.3, 'rgba(255,59,92,0.55)');
      g.addColorStop(0.45, 'rgba(255,190,205,0.95)');
      g.addColorStop(0.5, 'rgba(255,255,255,1)');
      g.addColorStop(0.55, 'rgba(255,190,205,0.95)');
      g.addColorStop(0.7, 'rgba(255,59,92,0.55)');
      g.addColorStop(1, 'rgba(255,59,92,0)');
      ctx.fillStyle = g;
      if (L.o === 'h') ctx.fillRect(0, L.p - w * 1.4, W, w * 2.8);
      else ctx.fillRect(L.p - w * 1.4, 0, w * 2.8, H);
      ctx.restore();
    }
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawBackground();

    let sx = 0, sy = 0;
    if (G && G.shake > 0 && state !== 'paused') { sx = rand(-1, 1) * G.shake; sy = rand(-1, 1) * G.shake; }
    ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);

    for (const L of lasers) drawLaser(L, 'warn');
    drawTokens();
    drawPowerups();
    for (const h of hazards) {
      if (h.type === 'rate') drawRate(h);
      else if (h.type === 'captcha') drawCaptcha(h);
      else drawDrone(h);
    }
    drawBullets();
    if (state === 'playing' || state === 'paused' || state === 'dying') drawPlayer();
    drawParticles();
    drawShocks();
    for (const L of lasers) drawLaser(L, 'beam');
    drawFloaters();

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (G && G.flash > 0) {
      ctx.fillStyle = `rgba(${G.flashRGB},${(G.flash * 0.45).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (G && state === 'playing' && G.lives === 1) {
      const a = 0.2 + 0.12 * Math.sin(performance.now() / 250);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(255,59,92,0)');
      g.addColorStop(1, `rgba(255,59,92,${a.toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------------------------------------------------------------- flow
  function show(node) { node.classList.remove('hidden'); }
  function hide(node) { node.classList.add('hidden'); }

  function startGame() {
    if (state === 'playing' || state === 'dying') return;
    Sound.unlock();
    Sound.click();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    newGame();
    state = 'playing';
    hide(el.menu); hide(el.over); hide(el.pause);
    show(el.hud); show(el.btnPause);
    document.body.classList.add('playing');
    clearBanners();
    Sound.setIntensity(0);
    Sound.startMusic(true);
    banner('START ABUSING', isTouch ? 'drag anywhere to fly. auto-fire is on.' : 'mouse / WASD to fly. auto-fire is on.', '#38f3ff');
    last = performance.now();
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    show(el.pause);
    document.body.classList.remove('playing');
    Sound.stopMusic();
  }
  function resumeGame() {
    if (state !== 'paused') return;
    Sound.unlock();
    state = 'playing';
    hide(el.pause);
    document.body.classList.add('playing');
    Sound.startMusic(false);
    keys.clear();
    last = performance.now();
  }

  function toMenu() {
    state = 'menu';
    Sound.stopMusic();
    clearBanners();
    hide(el.pause); hide(el.over); hide(el.hud); hide(el.btnPause);
    show(el.menu);
    document.body.classList.remove('playing');
    hazards = []; bullets = []; powerups = []; lasers = [];
    el.bestMenu.textContent = fmt(Number(store.get(BEST_KEY, '0')) || 0);
  }

  let countUpRaf = 0;
  function gameOver() {
    state = 'over';
    clearBanners();
    const score = Math.floor(G.score);
    const prevBest = Number(store.get(BEST_KEY, '0')) || 0;
    const isBest = score > prevBest;
    if (isBest) store.set(BEST_KEY, score);
    const best = Math.max(score, prevBest);

    let rk = RANKS[0];
    for (const r of RANKS) if (score >= r.at) rk = r;
    lastScore = score; lastRank = rk.name;

    el.rank.textContent = rk.name;
    el.overQuote.textContent = rk.quote;
    el.newBest.classList.toggle('hidden', !isBest);
    const secs = Math.floor(G.time);
    el.stTime.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    el.stCombo.textContent = fmt(G.maxCombo);
    el.stTier.textContent = TIERS[G.tier].name;
    el.stCost.textContent = usdFmt.format((score / 1e6) * USD_PER_MTOK);
    const water = score * WATER_L_PER_TOK;
    el.stWater.textContent = water >= 1000 ? (water / 1000).toFixed(1) + ' m³' : Math.round(water) + ' L';
    el.stKills.textContent = fmt(G.kills);
    el.bestOver.textContent = fmt(best);
    el.bestMenu.textContent = fmt(best);
    el.btnShare.textContent = 'Copy Flex';

    hide(el.hud); hide(el.btnPause);
    show(el.over);
    document.body.classList.remove('playing');
    Sound.gameOver();

    cancelAnimationFrame(countUpRaf);
    const t0 = performance.now(), dur = 1100;
    const step = (now) => {
      const k = clamp((now - t0) / dur, 0, 1); // rAF timestamps can predate t0
      el.finalScore.textContent = fmt(score * (1 - Math.pow(1 - k, 3)));
      if (k < 1) countUpRaf = requestAnimationFrame(step);
    };
    countUpRaf = requestAnimationFrame(step);
  }

  function toggleMute() {
    Sound.unlock();
    const m = Sound.toggleMute();
    el.btnMute.classList.toggle('muted', m);
  }

  async function shareScore() {
    const url = location.href.split('#')[0];
    const text = `I abused ${fmt(lastScore)} AI tokens in Lachine Simulator and got ranked "${lastRank}" \u{1F680} ${url}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
    }
    el.btnShare.textContent = ok ? 'Copied!' : 'Copy failed';
    setTimeout(() => { el.btnShare.textContent = 'Copy Flex'; }, 1600);
  }

  el.btnPlay.addEventListener('click', startGame);
  el.btnAgain.addEventListener('click', startGame);
  el.btnResume.addEventListener('click', resumeGame);
  el.btnQuit.addEventListener('click', toMenu);
  el.btnMenu.addEventListener('click', () => { Sound.click(); toMenu(); });
  el.btnShare.addEventListener('click', shareScore);
  el.btnMute.addEventListener('click', toggleMute);
  el.btnPause.addEventListener('click', () => (state === 'playing' ? pauseGame() : resumeGame()));
  el.btnMute.classList.toggle('muted', Sound.muted);

  // ticker
  {
    const items = HEADLINES.map((h) => `<span>${h.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join('');
    el.ticker.innerHTML = items + items;
  }
  el.bestMenu.textContent = fmt(Number(store.get(BEST_KEY, '0')) || 0);

  // ---------------------------------------------------------------- loop
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;

    if (state === 'playing') update(dt);
    else if (state === 'dying') {
      G.deathT -= dt;
      update(dt * 0.35);
      if (G.deathT <= 0) gameOver();
    } else if (state === 'menu' || state === 'over') ambient(dt);

    if (bannerBusy > 0 && state !== 'paused') {
      bannerBusy -= dt;
      if (bannerBusy <= 0) nextBanner();
    }
    render();
    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
})();
