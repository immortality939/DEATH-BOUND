/* ONLINE VERSION of core.js - upload this file to GitHub (online game only).
   The offline app keeps using core.js. Edit the two files separately on purpose. */
'use strict';
// ===== constants =====
let WORLD_W = 2800;   // default width; the Molten Quarry (golem.js) sets it to 3400 for its fights (every newGame resets it)
const WORLD_H = 1000; let WATER_Y = WORLD_H - 78;   // WATER_Y is set per game in newGame(): Adventure has NO water (see world.js), the other modes keep the sea
const RS = 0.19;              // robot sprite scale (512px source frame -> world px)
const WS = 0.75;              // weapon scale relative to robot
const G_ACC = 0.25;           // gravity px/frame^2 for projectiles
const TURN_TIME = 30, RETREAT_TIME = 0;   // RETREAT_TIME = seconds of walking time AFTER a shot. 0 = the turn ends the moment you have used it (no countdown)
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const D2R = Math.PI / 180;
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// ONLINE save: own key prefix (rwo_) so it never mixes with the offline save, and every value is signed.
// If a saved value is edited by hand (localStorage / devtools) the signature no longer matches, the value is thrown away and the default is used.
// NOTE: this stops casual editing only. Anything that must be 100% safe (coins, rewards, rankings) has to be checked by a real server.
const store = (() => {
  const P = 'rwo_', SALT = 'rw-online-9c41e7d2b8';
  const hash = s => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const sign = (k, s) => hash(SALT + '|' + k + '|' + s + '|' + s.length);
  let bad = 0;
  return {
    get tampered() { return bad; },
    get(k, d) { try { const r = localStorage.getItem(P + k); if (r == null) return d; const o = JSON.parse(r); if (!o || typeof o.v !== 'string' || o.s !== sign(k, o.v)) { bad++; try { localStorage.removeItem(P + k); } catch (e) { } return d; } return JSON.parse(o.v); } catch (e) { return d; } },
    set(k, v) { try { const s = JSON.stringify(v); if (s === undefined) return; localStorage.setItem(P + k, JSON.stringify({ v: s, s: sign(k, s) })); } catch (e) { } }
  };
})();

// ===== assets =====
const Assets = { img: {}, robots: null, fx: null, bg: null, wmeta: null };
function loadImage(path) {
  if (Assets.img[path]) return Assets.img[path].promise;
  const im = new Image(); const p = new Promise((res, rej) => { im.onload = () => res(im); im.onerror = () => rej(new Error('load ' + path)); });
  im.src = 'assets/' + path; Assets.img[path] = { im, promise: p }; return p;
}
const getImg = p => Assets.img[p] && Assets.img[p].im;
async function loadJSON(p) { if (window.GAME_DATA && GAME_DATA[p]) return GAME_DATA[p]; const r = await fetch('assets/' + p); return r.json(); }
async function loadCore(onProgress) {
  [Assets.robots, Assets.fx, Assets.bg, Assets.wmeta] = await Promise.all([loadJSON('robots.json'), loadJSON('fx.json'), loadJSON('bg.json'), loadJSON('weapons.json')]);
  Object.assign(Assets.wmeta, SIG_WMETA);   // muzzle points of the signature weapons
  Object.assign(Assets.fx, DIVINE_FX, POTION_FX, FLY_FX, SHURIKEN_FX, TITAN_FX, VOLT_FX, AXE_FX);   // Divine Heal effect sheets (weapons.js)
  const list = [];
  for (const k in Assets.fx) list.push(Assets.fx[k].file);
  for (const w of WEAPONS) { list.push(wpath(w.id)); if (w.sig || w.shop) for (let t = 1; t < 4; t++) list.push(wpath(w.id, t)); }
  for (const r of Assets.robots.robots) list.push(r.sheet);       // menu thumbnails use idle cell
  for (const r of Assets.robots.robots) list.push('robots/front/' + r.id + '.webp');   // front-view portraits (profile / robot select)
  let n = 0;
  await Promise.all(list.map(p => loadImage(p).then(() => { n++; onProgress && onProgress(n / list.length); })));
}

// ===== audio (all synthesised) =====
const Snd = {
  ctx: null, master: null, muted: store.get('mute', false),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.5; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate; this.nb = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.nb.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  setMute(m) { this.muted = m; store.set('mute', m); if (this.master) this.master.gain.value = m ? 0 : 0.5; },
  tone(type, f0, f1, dur, vol = .3, delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, vol = .3, ftype = 'lowpass', f0 = 1500, f1 = 200, delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.nb; s.loop = true; f.type = ftype; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  },
  play(n, a) {
    if (!this.ctx || this.muted) return;
    switch (n) {
      case 'boom': { const s = a || 1; this.noise(.5 + s * .4, .55, 'lowpass', 1800, 90); this.tone('sine', 120, 38, .45 + s * .2, .6); break; }
      case 'smallboom': this.noise(.3, .4, 'lowpass', 2200, 140); this.tone('sine', 150, 50, .25, .4); break;
      case 'shot': this.noise(.12, .3, 'highpass', 3000, 900); this.tone('square', 220, 70, .1, .12); break;
      case 'blaster': this.tone('sawtooth', 1400, 260, .16, .16); this.tone('square', 700, 180, .1, .08); break;
      case 'shotgun': this.noise(.25, .5, 'lowpass', 3500, 300); this.tone('sine', 110, 50, .18, .35); break;
      case 'rocket': this.noise(.5, .25, 'bandpass', 900, 300); this.tone('sawtooth', 180, 60, .35, .12); break;
      case 'plasma': this.tone('sine', 300, 1000, .22, .2); this.tone('triangle', 600, 200, .3, .15); break;
      case 'laser': this.tone('sawtooth', 1200, 200, .45, .2); this.noise(.4, .15, 'highpass', 4000, 1500); break;
      case 'rail': this.tone('square', 2400, 120, .35, .22); this.noise(.3, .4, 'highpass', 5000, 800); break;
      case 'flame': this.noise(.12, .22, 'bandpass', 700, 500); break;
      case 'freeze': this.tone('sine', 1800, 3000, .3, .15); this.tone('triangle', 2600, 1200, .35, .12, .05); break;
      case 'thunder': for (let i = 0; i < 4; i++) this.noise(.08, .3, 'highpass', 2500, 800, i * .05); this.tone('sawtooth', 900, 100, .3, .15); break;
      case 'slash': this.noise(.18, .25, 'bandpass', 3000, 800); this.tone('sawtooth', 900, 300, .15, .08); break;
      case 'axe': this.noise(.22, .35, 'bandpass', 1800, 400); this.tone('sine', 130, 60, .2, .3); break;
      case 'jump': this.tone('sine', 300, 700, .12, .2); break;
      case 'fly': this.noise(.35, .22, 'bandpass', 1200, 2600); this.tone('sine', 380, 900, .3, .14); this.tone('triangle', 700, 1400, .25, .08, .05); break;   // Fly launch
      case 'flyland': this.tone('sine', 520, 300, .12, .12); this.noise(.1, .15, 'lowpass', 1400, 300); break;   // Fly landing
      case 'wing': this.tone('sine', 500, 1000, .25, .15); this.tone('triangle', 800, 1500, .22, .1, .06); break;   // Divine Heal throw
      case 'heal': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('sine', f, f * 1.01, .32, .15, i * .07)); this.tone('triangle', 262, 524, .45, .1); break;   // Heal / Team Heal item
      case 'divine': [660, 880, 1100, 1320, 1760].forEach((f, i) => this.tone('sine', f, f * 1.02, .4, .16, i * .06)); this.tone('triangle', 330, 660, .5, .12); break;   // Divine Heal blast
      case 'hit': this.tone('square', 180, 60, .1, .25); this.noise(.08, .2, 'lowpass', 1200, 300); break;
      case 'splash': this.noise(.5, .35, 'bandpass', 1200, 500); break;
      case 'tick': this.tone('square', 1200, 1000, .03, .1); break;
      case 'pick': [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, .12, .2, i * .07)); break;
      case 'beep': this.tone('square', 880, 880, .08, .12); break;
      case 'turn': this.tone('triangle', 520, 780, .15, .18); this.tone('triangle', 780, 1040, .2, .15, .1); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('triangle', f, f, .25, .22, i * .12)); break;
      case 'dud': this.tone('square', 150, 90, .15, .15); break;
    }
  }
};

// ===== input state =====
const In = { left: false, right: false, up: false, down: false, fire: false, firePressed: false, fireReleased: false, jump: false, flip: false, weaponMenu: false };
