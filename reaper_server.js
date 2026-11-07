/* ONLINE VERSION of reaper.js - upload this file to GitHub (online game only).
   The offline app keeps using reaper.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  DEATH REAPER  (HEROIC third boss of the Soul Rift map)  -  new look from your sprite sheets + a SECOND LIFE
//
//  EVERY TURN       he flies to a random player (MOVE-FLY sprite), hits him with the scythe (ATTACK sprite), then flies back to his own spot
//  EVERY 3RD TURN   he flies to a random player again and SCREAMS: a round shockwave blasts around him (strong damage to everyone in reach)
//  IDLE             floats and sways (4 frames)
//  WHEN HE DIES     the first death plays (5 frames) ... then he RISES AGAIN right where he died (your 8 rise frames),
//                   the big game text "TIME TO DIE" plays like a short cutscene, and the battle starts again - the Reaper now has
//                   much more HP and hits harder (RP_HP_MUL / RP_RAGE below).  Only his second death ends the stage.
//
//  Sheet (adventure/boss_deathreaper_act.webp, 33 frames of 400x280, 5 per row (sheet is 2000x1960, kept under 2048 for old phones)):
//     idle 0-3 | attack 4-9 | move fly 10-13 | death 14-18 | scream 19-24 | rise 25-32
//  All frames were aligned on the hood (same anchor in every cell), and every game tick two neighbouring frames are
//  cross-faded, so the animation never jumps.  Shockwave sprite: fx/rp_scream_wave.webp (10 frames of 256x256).
//  Built on the boss3.js framework (same pattern as zeus.js / scorpion.js): it wraps BOSS3.think / step / update / draw / dmg / assets,
//  drawWorm, bodyShapes and startTurn - no other file needs changes except the <script> line in index.html.
// ============================================================================================================

const RP = { CW: 400, CH: 280, HX: 266, BY: 258, IDLE: 0, ATK: 4, FLY: 10, DEATH: 14, SCREAM: 19, RISE: 25 };
const RP_PX = 1.1;            // world pixels per sprite pixel (at the boss size 3.0)
const RP_ACT = 'adventure/boss_deathreaper_act.webp';
const RP_WAVE = 'fx/rp_scream_wave.webp';
const RP_STAND = 118;         // how far from the player he stops
const RP_WAVE_R = 390;        // reach of the scream shockwave
const RP_HP_MUL = 1.8;        // second life: health x
const RP_RAGE = 1.45;         // second life: damage x
const RP_SCREAM_MUL = 1.45;   // scream = this x the normal special damage
const RP_LET = 'adventure/rp_letters.png';      // the letters T I M E O D as pictures (300x380 each, one row) - used for the "TIME TO DIE" cutscene
const RP_SUB = 'adventure/rp_sub.png';          // "THE DEATH REAPER RISES AGAIN" as a picture
const RP_VIG = 'adventure/rp_vignette.png';     // the dark violet screen edge of the cutscene as a picture
const RP_LW = { T: 168, I: 89, M: 238, E: 148, O: 178, D: 179 };   // visible width of each letter picture
const RP_CUT_END = 224;       // frames the "TIME TO DIE" cutscene lasts (~3.7 s)

(function () {
  const isR = w => !!(w && w.rob && w.rob.b3 === 'reaper');
  const ease = a => { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); };
  const px = w => RP_PX * (w.sc || 3) / 3;
  const baseY = w => w.y - (w.hop || 0) - (w.flyOff || 0);                // bottom of his cloak
  const wd = WEAPONS.find(x => x.id === 'C15_Reaper_Scythe' || x.id === 'C15_Death_Scythe'); if (wd) wd.art = 'M0_Blank';
  ADDITIVE.rp_scream_wave = 1;
  const WAVE_FX = { file: RP_WAVE, frames: 10, cols: 5, fw: 256, fh: 256, fps: 17, loop: false };
  Object.assign(DIVINE_FX, { rp_scream_wave: WAVE_FX }); if (Assets.fx) Assets.fx.rp_scream_wave = WAVE_FX;   // (also registered directly: this file loads after the effect list was read)

  // ---------- hit shapes / body centre ----------
  const _bs = bodyShapes; bodyShapes = w => {
    if (!isR(w)) return _bs(w);
    const s = px(w), fy = baseY(w);
    return [[w.x, fy - 100 * s, 66 * s, 98 * s], [w.x + (w.face || 1) * 12 * s, fy - 176 * s, 34 * s, 30 * s]];   // cloak + head
  };
  const _bc = bodyCenter; bodyCenter = w => isR(w) ? [w.x, baseY(w) - 105 * px(w)] : _bc(w);

  // ---------- poses: a frame number, or [frameA, frameB, u] = A cross-faded into B ----------
  const pp = (base, n, v) => { const m = (n - 1) * 2; v = ((v % m) + m) % m; if (v > n - 1) v = m - v; const i = Math.min(n - 2, Math.floor(v)); return [base + i, base + i + 1, ease(v - i)]; };   // ping-pong loop
  const to = (a, b, u) => [a, b, ease(u)];
  const dom = p => Array.isArray(p) ? (p[2] < .5 ? p[0] : p[1]) : p;                // the frame a pose looks most like
  const blend = (a, b, u) => to(dom(a), dom(b), u);                                  // cross-fade between two poses
  const idle = w => pp(RP.IDLE, 4, (G.frame | 0) / 10 + (w.idx | 0) * 2);
  const flyP = ph => pp(RP.FLY, 4, ph);

  // ---------- drawing ----------
  const cv = document.createElement('canvas'); cv.width = RP.CW; cv.height = RP.CH; const cx = cv.getContext('2d', { willReadFrequently: true });
  const put = (img, i, al) => { cx.globalAlpha = al; cx.drawImage(img, (i % 5) * RP.CW, Math.floor(i / 5) * RP.CH, RP.CW, RP.CH, 0, 0, RP.CW, RP.CH); };
  function pose(img, p) { cx.clearRect(0, 0, RP.CW, RP.CH); cx.globalCompositeOperation = 'source-over'; if (Array.isArray(p)) { put(img, p[0], 1); if (p[2] > .001) put(img, p[1], p[2]); } else put(img, p | 0, 1); cx.globalAlpha = 1; }
  function tint(col, a) { cx.globalCompositeOperation = 'source-atop'; cx.globalAlpha = a; cx.fillStyle = col; cx.fillRect(0, 0, RP.CW, RP.CH); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
  const risePose = t => { const q = Math.max(0, Math.min(7, (t - 18) / 12)), i = Math.min(6, Math.floor(q)); return [RP.RISE + i, RP.RISE + i + 1, ease(q - i)]; };   // the 8 rise frames, 12 ticks each

  const mkGlow = c0 => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 3.4, 64, 64, 64); g.addColorStop(0, c0); g.addColorStop(1, 'rgba(120,30,220,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c; };
  const GLOW1 = mkGlow('rgba(150,80,255,.16)'), GLOW2 = mkGlow('rgba(190,90,255,.30)');

  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    if (!isR(w)) return _dw(ctx, w, isActive, t);
    const img = getImg(RP_ACT); if (!img) return _dw(ctx, w, isActive, t);
    const s = px(w), sc = w.sc || 1; let p, alpha = 1;
    if (w.state === 'dead') {
      const R = G.rpc && G.rpc.b === w ? G.rpc : null;
      if (R && R.t >= 14) { p = risePose(R.t); alpha = Math.min(1, (R.t - 14) / 22); }              // he rises again, right where he fell
      else {
        const q = Math.min(1, (w.dt || 0) / 40) * 4, i = Math.min(3, Math.floor(q)); p = [RP.DEATH + i, RP.DEATH + i + 1, ease(q - i)];
        if (w.dt > 62 && !R) return; if (w.dt > 44) alpha = Math.max(0, 1 - (w.dt - 44) / 18);
        if (R && w.dt > 62) return;
      }
    } else {
      const moving = w.walking > 0 && w.state === 'ground';
      p = w.actF != null ? w.actF : idle(w);
      if (w.state === 'drown') alpha = Math.max(0, 1 - w.dt / 40);
    }
    const tf = w.state !== 'dead' && (w.frozen > 0 || (w.flash > 0 && (w.flash % 4) < 2) || w.healT > 0);   // tinted (frozen / hit flash / heal)? then the frame is mixed on a small canvas first
    if (tf) { pose(img, p); if (w.frozen > 0) tint('#9fe4ff', .55); if (w.flash > 0 && (w.flash % 4) < 2) tint('#ff4a2a', .6); else if (w.healT > 0) tint('#e8ffee', .55 * w.healT / 36); }
    ctx.save(); ctx.globalAlpha = alpha;
    if (w.state === 'ground' || w.state === 'dead') { ctx.fillStyle = 'rgba(0,0,0,.28)'; const fo = Math.min(1, (w.flyOff || 0) / 200); ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 62 * s * (1 - fo * .4), 8 * s * (1 - fo * .4), 0, 0, 6.283); ctx.fill(); }
    const by = baseY(w);
    if (w.state !== 'dead' && w.state !== 'drown') {   // a soft violet glow behind him (he is dark on a dark sky); stronger and pulsing in his second life
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .75 + .25 * Math.sin(G.frame / 9);
      ctx.drawImage(w.rpReborn ? GLOW2 : GLOW1, w.x - 190 * s, by - 105 * s - 190 * s, 380 * s, 380 * s); ctx.restore();   // (pre-drawn glow picture - no gradient is built per frame)
    }
    ctx.translate(w.x, by); ctx.scale((w.face || 1) * s, s);
    if (tf) ctx.drawImage(cv, -RP.HX, -RP.BY);
    else {   // normal case: both neighbouring frames straight from the sheet (cross-fade)
      const A = Array.isArray(p) ? p[0] : p | 0, B = Array.isArray(p) ? p[1] : A, u = Array.isArray(p) ? p[2] : 0, ga = ctx.globalAlpha;
      const dr = i => ctx.drawImage(img, (i % 5) * RP.CW, Math.floor(i / 5) * RP.CH, RP.CW, RP.CH, -RP.HX, -RP.BY, RP.CW, RP.CH);
      dr(A); if (u > .001) { ctx.globalAlpha = ga * u; dr(B); }
    }
    ctx.restore();
    if (w.state === 'dead' || w.state === 'drown') return;
    const T = G.teams[w.team], y = by - 205 * s, bw = 52 * Math.max(1, sc * .85);
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(w.name, w.x, y - 12); ctx.fillStyle = w.rpReborn ? '#e2b8ff' : '#fff'; ctx.fillText(w.name, w.x, y - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w.x - bw / 2 - 1, y - 8, bw + 2, 8); ctx.fillStyle = T.color; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 6);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 2);
    ctx.font = '700 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(w.hp, w.x, y + 6); ctx.fillText(w.hp, w.x, y + 6);
    if (isActive && (G.phase === 'aim' || G.phase === 'retreat')) { const b = Math.sin(t / 8) * 4; ctx.fillStyle = T.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y - 24 + b); ctx.lineTo(w.x - 9, y - 40 + b); ctx.lineTo(w.x + 9, y - 40 + b); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.restore();
  };

  // ---------- sounds ----------
  const _play = Snd.play;
  Snd.play = function (n, a) {
    if (n === 'rp_scream') {   // the scream: a falling howl + a low boom + a wide hiss
      if (!this.ctx || this.muted) return;
      this.tone('sawtooth', 1500, 240, 1.0, .26); this.tone('square', 980, 160, .9, .12, .03); this.tone('sawtooth', 2300, 600, .7, .1, .06);
      this.noise(.9, .42, 'bandpass', 3200, 500); this.tone('sine', 140, 36, .9, .6, .12); this.noise(.7, .5, 'lowpass', 1500, 80, .12); return;
    }
    if (n === 'rp_rise') {     // he rises: a deep swelling drone with wind
      if (!this.ctx || this.muted) return;
      this.tone('sine', 55, 110, 1.6, .4); this.tone('sawtooth', 80, 160, 1.4, .12, .1); this.noise(1.5, .3, 'bandpass', 400, 1800); this.tone('triangle', 220, 440, 1.2, .1, .3); return;
    }
    return _play.call(this, n, a);
  };

  // ---------- the "TIME TO DIE" cutscene (letter PICTURES drawn on the game canvas - no HTML, no CSS glow / blur, no per-frame gradients) ----------
  const CUT0 = 24, CUT_LEN = 192;   // starts at tick 24 of the rise, lasts 192 ticks (3.2 s)
  const TXT = 'TIME TO DIE', LETS = 'TIMEOD', GAP = 26, SPACE = 74;
  const clamp01 = a => Math.max(0, Math.min(1, a));
  const backOut = a => { const c = 1.9; a = clamp01(a) - 1; return 1 + (c + 1) * a * a * a + c * a * a; };   // overshoots a little, then settles = a "slam"
  function cutShow() { }
  function cutHide() { }
  function cutDraw(ctx, W, H) {
    const R = G.rpc; if (!R || R.t < CUT0) return;
    const u = R.t - CUT0, sheet = getImg(RP_LET); if (!sheet) return;
    const fadeIn = clamp01(u / 22), fadeOut = clamp01((CUT_LEN - u) / 22), pa = Math.min(fadeIn, fadeOut), e = ease(pa);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vig = getImg(RP_VIG); if (vig) { ctx.globalAlpha = pa; ctx.drawImage(vig, 0, 0, W, H); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#000'; const bh = H * .12 * e; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);   // letterbox bars
    let tot = 0; for (const ch of TXT) tot += ch === ' ' ? SPACE : RP_LW[ch] + GAP; tot -= GAP;
    const s = Math.min(W * .76 / tot, H * .29 / 380), ty = H * .26, out = clamp01((u - (CUT_LEN - 30)) / 24);
    let x = W / 2 - tot * s / 2, k = 0;
    for (const ch of TXT) {
      if (ch === ' ') { x += SPACE * s; continue; }
      const w = RP_LW[ch], cx = x + w * s / 2, i = LETS.indexOf(ch), a = clamp01((u - (12 + k * 3)) / 13);
      if (a > 0) {
        const al = ease(Math.min(1, a * 1.6)) * (1 - out), sc = (1 + (1 - backOut(a)) * 1.7) * (1 + .2 * out) * (1 + .012 * Math.sin(u / 9 + k)), cy = ty + 3 * s * Math.sin(u / 11 + k * .8);
        const dw = 300 * s * sc, dh = 380 * s * sc;
        ctx.globalAlpha = al; ctx.drawImage(sheet, i * 300, 0, 300, 380, cx - dw / 2, cy - dh / 2, dw, dh);
        if (a < 1) { ctx.globalAlpha = al * .28 * (1 - a); ctx.drawImage(sheet, i * 300, 0, 300, 380, cx - dw * .58, cy - dh * .58, dw * 1.16, dh * 1.16); }   // soft ghost while it slams in
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al * (.1 + .1 * Math.sin(u / 7 + k * .9)); ctx.drawImage(sheet, i * 300, 0, 300, 380, cx - dw / 2, cy - dh / 2, dw, dh); ctx.globalCompositeOperation = 'source-over';   // pulsing glow
      }
      x += (w + GAP) * s; k++;
    }
    const sub = getImg(RP_SUB), sa = clamp01((u - 72) / 22);
    if (sub && sa > 0) { const sw = Math.min(W * .74, 1509 * s * .8), sh = sw * 150 / 1509; ctx.globalAlpha = ease(sa) * (1 - out); ctx.drawImage(sub, W / 2 - sw / 2, ty + 100 * s + H * .035 + (1 - ease(sa)) * 14 - sh / 2, sw, sh); }
    ctx.restore();
  }
  const _rg = renderGame; renderGame = function (ctx, W, H) { _rg.call(this, ctx, W, H); if (G.rpc) cutDraw(ctx, W, H); };   // drawn on top of the whole picture, in screen pixels

  // ---------- the second life ----------
  const _st = startTurn;
  startTurn = function () {
    const b = G.bossW;
    if (G.adv && b && isR(b) && b.state === 'dead' && !b.rpReborn && !G.rpc && BOSS3.foes(b).length) { beginRebirth(b); return; }
    return _st.apply(this, arguments);
  };
  function beginRebirth(b) {
    G.rpc = { b, t: 0, x: b.x, y: b.y, f: b.flyOff || 0, max0: b.maxHp };
    b.rpCut = true; G.phase = 'rpcut'; G.activeWorm = b; G.cam.free = false; G.swarm = null; G.queue = (G.queue || []).filter(q => q !== b);
    G.projs = G.projs.filter(p => p.kind === 'mine');
  }
  function cutTick(R) {
    const b = R.b, t = ++R.t; G.phase = 'rpcut'; G.activeWorm = b; b.x = R.x; b.y = R.y; b.flyOff = R.f;
    const [cx0, cy0] = [R.x, R.y - R.f - 105 * px(b)], S = px(b);
    G.cam.free = true; G.cam.x += (cx0 - G.cam.x) * .08; G.cam.y += (cy0 - 40 - G.cam.y) * .08;   // the camera looks at his body for the whole cutscene
    if (t === 1) { Snd.play('boom', 1.2); shake(10); }
    if (t === 18) { Snd.play('rp_rise'); }
    if (t === 24) cutShow();
    if (t >= 20 && t < 100 && t % 10 === 0) { BOSS3.bolt(cx0 + rnd(-200, 200), cy0 - 520, cx0 + rnd(-30, 30), cy0 + rnd(-60, 60), { col: '#b06bff', w: 5, life: 10 }); if (t % 20 === 0) { shake(6); Snd.play('thunder', .6); } }
    if (t >= 20 && t < 100 && t % 14 === 0) addFx('b3_ghost_boom', cx0 + rnd(-90, 90) * S, cy0 + rnd(-100, 60) * S, .5);
    if (t === 40 || t === 70) { ringFx(cx0, cy0, '#b06bff', 0); shake(8); }
    if (t === 100) {   // the moment he is whole again
      shake(34); Snd.play('rp_scream', .8); ringFx(cx0, cy0, '#d9a8ff'); ringFx(cx0, cy0, '#ffffff', 8); G.rpFlash = 12;
      addFx('rp_scream_wave', cx0, cy0, 2.1, { alpha: .75 });
    }
    if (t >= RP_CUT_END) reviveNow(R);
  }
  function reviveNow(R) {
    const b = R.b; cutHide();
    b.state = 'ground'; b.dt = 0; b.exploded = false; b.maxHp = Math.round(R.max0 * RP_HP_MUL); b.hp = b.maxHp; b.rpReborn = true; b.rpCut = false; b.rpRage = RP_RAGE;
    b.x = R.x; b.y = R.y; b.flyOff = R.f; b.flyGoal = R.f; b.bobBase = R.f; b.vx = b.vy = 0; b.knocked = false; b.frozen = 0; b.flash = 0; b.b3 = null; b.actF = null; b.spT = 0; b.bt = 0; b.rpPost = 18;
    b.name = 'Death Reaper (Risen)';
    G.rpc = null; G.phase = 'none'; G.cam.free = false;
    addPop(b.x, b.y - R.f - 230, 'STRONGER!', '#d9a8ff', 28); showBanner('☠ The Death Reaper is back - much stronger!', '#d9a8ff');
    _st.call(null);   // the normal turn order goes on
  }

  // ---------- turn scripts ----------
  const foes = w => BOSS3.foes(w);
  const faceTo = (w, x) => { w.face = x >= w.x ? 1 : -1; };
  const RPX = {
    // flight to / from a spot: S.sx,S.sf -> tx,tf over S.dur ticks.  Returns true when he is there.
    fly(w, S, tx, tf, from) {
      const u = Math.min(1, S.u / S.dur), e = ease(u);
      if (S.u === 0) { S.sx = w.x; S.sf = w.flyOff || 0; S.ph0 = 0; }
      S.u++; w.x = S.sx + (tx - S.sx) * e; w.flyOff = S.sf + (tf - S.sf) * e; w.face = tx >= S.sx ? 1 : -1;
      S.fph = (S.fph || 0) + .21; const fp = flyP(S.fph);
      w.actF = S.u < 9 ? blend(from, fp, S.u / 8) : fp;
      if (S.u % 4 === 0) addFx('smoke', w.x - w.face * 50, baseY(w) - 80, .5);
      return S.u > S.dur;
    },
    pick(w, S) {
      const fs = foes(w); if (!fs.length) return false;
      S.tg = fs[rint(0, fs.length - 1)]; S.hx = w.x; S.hf = w.flyOff || 0; S.u = 0; S.side = (S.tg.x >= w.x) ? 1 : -1; w.flyGoal = null;
      S.dur = clamp(Math.hypot(S.tg.x - w.x, 60) / 15, 28, 62); S.ph = 'go'; return true;
    },
    target(w, S) { const tg = S.tg; return [tg.x - S.side * RP_STAND, Math.max(6, w.y - tg.y + 6)]; },
    back(w, S, fromPose) {   // fly home, settle into idle
      if (!S.bk) { S.bk = true; S.u = 0; S.dur = clamp(Math.abs(w.x - S.hx) / 15, 26, 60); S.bfrom = fromPose; }
      const done = this.fly(w, S, S.hx, S.hf, S.bfrom);
      if (S.u > S.dur - 9) w.actF = blend(flyP(S.fph), idle(w), (S.u - (S.dur - 9)) / 9);
      if (done) { w.x = S.hx; w.flyOff = S.hf; w.flyGoal = S.hf; w.bobBase = S.hf; const f = nearestFoe(w); if (f) faceTo(w, f.x); return true; }
      return false;
    },
    // ---- every turn: fly to a random player, scythe attack, fly back ----
    s_rp_attack(w, S) {
      const t = S.t;
      if (t === 1) { if (!this.pick(w, S)) return true; faceTo(w, S.tg.x); showBanner('⚠ ' + w.name + ' hunts ' + S.tg.name + '!', '#c58bff'); Snd.play('slash', .6); S.from = idle(w); }
      const tg = S.tg;
      if (S.ph === 'go') { const [tx, tf] = this.target(w, S); if (this.fly(w, S, tx, tf, S.from)) { S.ph = 'atk'; S.a = 0; S.fp = flyP(S.fph); } return false; }
      if (S.ph === 'atk') {
        const a = ++S.a; faceTo(w, tg.x); const A = RP.ATK;
        w.actF = a <= 8 ? blend(S.fp, A, a / 8) : a <= 16 ? to(A, A + 1, (a - 8) / 8) : a <= 24 ? to(A + 1, A + 2, (a - 16) / 8) : a <= 31 ? to(A + 2, A + 3, (a - 24) / 7) : a <= 36 ? to(A + 3, A + 4, (a - 31) / 5) : a <= 42 ? to(A + 4, A + 5, (a - 36) / 6) : a <= 50 ? A + 5 : to(A + 5, RP.FLY, (a - 50) / 8);
        if (a === 30) { Snd.play('slash', 1); }
        if (a === 33 && tg.state !== 'dead' && tg.state !== 'drown') {
          hurt(tg, BOSS3.dmg(w, 1.1)); if (tg.state !== 'dead') knockWorm(tg, w.face * 5, -3.6);
          addFx('b3_slash', tg.x - w.face * 10, tg.y - 50, 1.4, { flip: w.face < 0 }); addFx('spark_hit', tg.x, tg.y - 40, 1.2); shake(12); Snd.play('hit');
        }
        if (a > 58) { S.ph = 'back'; S.fp = RP.FLY; }
        return false;
      }
      return this.back(w, S, RP.FLY);
    },
    // ---- every 3rd turn: fly to a random player, SCREAM = round shockwave around him ----
    s_rp_scream(w, S) {
      const t = S.t;
      if (t === 1) { if (!this.pick(w, S)) return true; faceTo(w, S.tg.x); showBanner('⚠ ' + w.name + ' flies to ' + S.tg.name + ' and SCREAMS!', '#c58bff'); Snd.play('freeze', .6); S.from = idle(w); }
      const tg = S.tg;
      if (S.ph === 'go') { const [tx, tf] = this.target(w, S); if (this.fly(w, S, tx, tf, S.from)) { S.ph = 'sc'; S.a = 0; S.fp = flyP(S.fph); } return false; }
      if (S.ph === 'sc') {
        const a = ++S.a, C = RP.SCREAM; faceTo(w, tg.x);
        w.actF = a <= 8 ? blend(S.fp, C, a / 8) : a <= 18 ? to(C, C + 1, (a - 8) / 10) : a <= 28 ? to(C + 1, C + 2, (a - 18) / 10) : a <= 38 ? to(C + 2, C + 3, (a - 28) / 10) : a <= 46 ? to(C + 3, C + 4, (a - 38) / 8) : a <= 54 ? to(C + 4, C + 5, (a - 46) / 8) : a <= 74 ? C + 5 : to(C + 5, RP.FLY, (a - 74) / 10);
        if (a === 22) Snd.play('rp_rise', .6);
        if (a > 14 && a < 46 && a % 6 === 0) { const [ax, ay] = bodyCenter(w); addFx('b3_ghost_boom', ax + rnd(-60, 60), ay + rnd(-70, 40), .45); }
        if (a > 14 && a < 46) G.cam.shake = Math.max(G.cam.shake, 3 + (a - 14) * .12);
        if (a === 46) this.scream(w);
        if (a > 84) { S.ph = 'back'; S.fp = RP.FLY; }
        return false;
      }
      return this.back(w, S, RP.FLY);
    },
    scream(w) {   // the shockwave: a round blast around his body, strongest close to him, pushes everybody away
      const [x, y] = bodyCenter(w), d0 = BOSS3.dmg(w, SPECIAL_MUL * RP_SCREAM_MUL);
      shake(38); G.rpFlash = 12; Snd.play('rp_scream'); Snd.play('boom', 1.3);
      addFx('rp_scream_wave', x, y, 2 * RP_WAVE_R / 256 * 1.02, { alpha: .85 }); ringFx(x, y, '#c58bff'); ringFx(x, y, '#ffffff', 7); ringFx(x, y, '#8a3cff', 14);
      for (const p of foes(w)) {
        const [px_, py_] = bodyCenter(p), d = Math.hypot(px_ - x, py_ - y); if (d > RP_WAVE_R) continue;
        const k = d / RP_WAVE_R; BOSS3.later(Math.round(k * 16), () => {
          if (p.state === 'dead' || p.state === 'drown') return;
          hurt(p, Math.max(1, Math.round(d0 * (1 - .35 * k)))); if (p.state !== 'dead') knockWorm(p, (p.x >= x ? 1 : -1) * (3.4 - 1.5 * k), -(5.2 - 2 * k));
          addFx('spark_hit', px_, py_, 1.3); addFx('b3_ghost_boom', px_, py_, .9);
        });
      }
      BOSS3.later(24, () => showBanner('SCREAM!  (everyone in the circle is hurt)', '#c58bff'));
    },
  };
  window.RPX = RPX;

  // ---------- hook the boss3 framework ----------
  const _think = BOSS3.think;
  BOSS3.think = function (w, ai) {
    if (!isR(w)) return _think.call(this, w, ai);
    if (!ai.b3done) { ai.b3done = true; ai.bmoved = true; return this.start(w, ai, ai.bspecial ? 'rp_scream' : 'rp_attack'); }   // every turn: fly -> attack -> back,  every 3rd turn: fly -> scream -> back
    return false;
  };
  const _step = BOSS3.step;
  BOSS3.step = function (w, ai) {
    const S = w.b3; if (!S || String(S.k).indexOf('rp_') !== 0) return _step.call(this, w, ai);
    S.t++; const fin = RPX['s_' + S.k](w, S); if (!fin) return;
    if (S.hx != null) { w.x = S.hx; w.flyOff = S.hf; w.flyGoal = S.hf; w.bobBase = S.hf; }
    w.b3 = null; w.actF = null; w.hop = 0; this.endTurn(w, ai);
  };
  const _dmg = BOSS3.dmg; BOSS3.dmg = function (w, mul) { const r = _dmg.call(this, w, mul); return w && w.rpRage ? Math.round(r * w.rpRage) : r; };

  const _up = BOSS3.update;
  BOSS3.update = function () {
    _up.call(this);
    if (!G.adv) return;
    if ((G.frame | 0) < 2) { G.rpc = null; G.rpFlash = 0; cutHide(); }
    if (G.rpc) cutTick(G.rpc);
    if (G.rpFlash > 0) G.rpFlash--;
    for (const w of G.worms) {
      if (!isR(w) || w.state === 'dead') continue;
      if (w.rpPost > 0) { w.rpPost--; if (!w.b3 && !(w.spT > 0)) w.actF = w.rpPost > 0 ? to(RP.RISE + 7, RP.IDLE, 1 - w.rpPost / 18) : null; }
    }
  };
  const _dr = BOSS3.draw;
  BOSS3.draw = function (ctx) {
    _dr.call(this, ctx);
    if (G.rpFlash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = G.rpFlash / 16 * .24; ctx.fillStyle = '#c9a0ff'; ctx.fillRect(VIEW.cx - VIEW.W / VIEW.z, VIEW.cy - VIEW.H / VIEW.z, VIEW.W * 2 / VIEW.z, VIEW.H * 2 / VIEW.z); ctx.restore(); }
  };
  const _as = BOSS3.assets; BOSS3.assets = function (st) {
    if (Assets.fx) Assets.fx.rp_scream_wave = WAVE_FX; const pre = p => loadImage(p).then(im => (im && im.decode ? im.decode().catch(() => { }) : 0)).catch(() => { });   // load AND decode now, so nothing hitches the first time it is drawn
    return _as.call(this, st).concat([pre(RP_ACT), pre(RP_WAVE), pre(RP_LET), pre(RP_SUB), pre(RP_VIG), pre('fx/b3_ghost_boom.webp'), pre('fx/b3_slash.webp'), pre('fx/spark_hit.webp')]); };
  console.log('reaper.js loaded - Death Reaper: new sprites, fly + scythe attack, scream shockwave, rises again (TIME TO DIE)');
})();
