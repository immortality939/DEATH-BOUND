/* ONLINE VERSION of zeus.js - upload this file to GitHub (online game only).
   The offline app keeps using zeus.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  MIGHTY ZEUS  (HEROIC third boss of the Marble map)  -  new look from your sprite sheet (the old sprite is gone)
//
//  The attack / special logic is the same as before (boss3.js), only the pictures and the poses changed:
//    NORMAL LIGHTNING  - his attack every turn: he reaches out and a lightning bolt strikes a player (and jumps on to players standing close)
//    THUNDER STRIKE    - his special every 3rd turn: both hands up, then he calls thunder down on every player
//    IDLE              - 4 frames, slow loop while he stands       WALK - 3 frames while he moves       DEATH - 6 frames
//  Sheet (adventure/boss_zeus_act.webp, 21 frames of 320x300, 4 per row):  idle 0-3 | lightning 4-7 | thunder 8-11 | death 12-17 | walk 18-20
//  Frames are cross-faded into each other every game tick, so the movement is smooth.
//  Built on the boss3.js framework (same pattern as scorpion.js): it wraps BOSS3.s_zbolt / BOSS3.p_thunder (poses only) and drawWorm.
// ============================================================================================================

const ZS_PX = .9;                 // world pixels per sprite pixel (at the boss size 3.0)
const ZS = { CW: 320, CH: 300, AX: 150, FY: 285, IDLE: 0, LIGHT: 4, THUNDER: 8, DEATH: 12, WALK: 18 };
// ---- FLOATING STORM (every 4th turn): he rises slowly into the air and 20 lightning bolts strike random spots on the ground ----
//  Sheet adventure/boss_zeus_fly.webp: 16 frames of 384x256, 4 per row (0 = calm ... 8-11 = full storm ... 15 = dying down). Same size as his other frames (232px crown to sole),
//  every frame has the same crown / belt / sole position, so he never shakes. AX / FY = the point under his body / his soles.
const ZF = { CW: 384, CH: 256, AX: 193, FY: 242, N: 16 };
const ZF_ACT = 'adventure/boss_zeus_fly.webp';
const ZF_EVERY = 4;               // every Nth boss turn he floats (his thunder special stays on every 3rd turn)
const ZF_STRIKES = 20;            // lightning strikes during the float
const ZF_GAP = [0.3, 1.0];        // random wait between two strikes, in seconds
const ZF_HOVER = 150;             // how high above the ground he floats
const ZF_DMG = .75;               // damage of ONE strike (x boss base damage; the thunder special is x1.2 on every player)
const ZF_RISE = 90, ZF_FALL = 80; // game frames (60 per second) to rise / to come down
const ZS_HAND = [74, -143];       // his hand while the bolt leaves it (sprite px from the feet: forward / up)
const ZS_ACT = 'adventure/boss_zeus_act.webp';
const ZS_TW = {"13-14":21,"14-15":22,"15-16":23,"16-17":24,"0-1":25,"1-2":26,"2-3":27,"0-4":28,"0-7":29,"0-8":30,"0-11":31,"4-5":32,"5-6":33,"6-7":34,"8-9":35,"9-10":36,"10-11":37,"11-12":38,"12-13":39,"18-19":40,"19-20":41,"0-20":42,"0-18":43};   // in-between frames (sheet rows 6+), key = 'lowFrame-highFrame'

(function () {
  const isZ = w => !!(w && w.rob && w.rob.b3 === 'zeus');
  const ease = a => { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); };
  const px = w => ZS_PX * (w.sc || 3) / 3;
  const wd = WEAPONS.find(x => x.id === 'C14_Zeus_Bolt'); if (wd) wd.art = 'M0_Blank';   // the bolt is drawn by boss3.js, no weapon picture

  // ---------- hit shapes / body centre ----------
  const _bs = bodyShapes; bodyShapes = w => {
    if (!isZ(w)) return _bs(w);
    const s = px(w), f = w.face || 1, fy = w.y - (w.hop || 0) - (w.flyOff || 0);
    return [[w.x, fy - 110 * s, 58 * s, 112 * s], [w.x + f * 8 * s, fy - 212 * s, 34 * s, 32 * s]];   // body + head
  };
  const _bc = bodyCenter; bodyCenter = w => isZ(w) ? [w.x, w.y - (w.hop || 0) - (w.flyOff || 0) - 115 * px(w)] : _bc(w);

  // ---------- poses: a frame number, or [frameA, frameB, u] = A cross-faded into B ----------
  const pp = (base, n, v) => { const m = (n - 1) * 2; v = ((v % m) + m) % m; if (v > n - 1) v = m - v; const i = Math.min(n - 2, Math.floor(v)); return [base + i, base + i + 1, ease(v - i)]; };   // ping-pong loop
  const to = (a, b, u) => [a, b, ease(u)];
  const idle = w => pp(ZS.IDLE, 4, (G.frame | 0) / 11 + (w.idx | 0) * 2);
  const walk = w => ZS.WALK + [0, 1, 2, 1][Math.floor(w.zPh || 0) % 4];   // new walk: clean frames, no cross-fade (a fade ghosts the legs)

  // ---------- drawing ----------
  const cv = document.createElement('canvas'); cv.width = ZS.CW; cv.height = ZS.CH; const cx = cv.getContext('2d');
  const put = (img, i, al) => { cx.globalAlpha = al; cx.drawImage(img, (i % 4) * ZS.CW, Math.floor(i / 4) * ZS.CH, ZS.CW, ZS.CH, 0, 0, ZS.CW, ZS.CH); };
  function pose(img, p) {
    cx.clearRect(0, 0, ZS.CW, ZS.CH); cx.globalCompositeOperation = 'source-over';
    if (Array.isArray(p)) {
      const m = ZS_TW[Math.min(p[0], p[1]) + '-' + Math.max(p[0], p[1])], u = p[2];
      if (m != null && u > .001 && u < .999) { if (u < .5) { put(img, p[0], 1); put(img, m, u * 2); } else { put(img, m, 1); put(img, p[1], u * 2 - 1); } }   // A -> in-between -> B (smoother than a straight cross-fade)
      else { put(img, p[0], 1); if (u > .001) put(img, p[1], u); }
    } else put(img, p | 0, 1);
    cx.globalAlpha = 1;
  }
  function tint(col, a, c = cx, W = ZS.CW, H = ZS.CH) { c.globalCompositeOperation = 'source-atop'; c.globalAlpha = a; c.fillStyle = col; c.fillRect(0, 0, W, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }

  // flying frames: f = a (fractional) frame number. The two neighbours are mixed with 'lighter' (exact premultiplied blend: the body stays solid, the lightning melts from one frame into the next, no ghost, no pop)
  const cvF = document.createElement('canvas'); cvF.width = ZF.CW; cvF.height = ZF.CH; const cxF = cvF.getContext('2d');
  function poseF(img, f) {
    f = Math.max(0, Math.min(ZF.N - 1, f)); const a = Math.floor(f), b = Math.min(ZF.N - 1, a + 1), u = ease(f - a);
    cxF.clearRect(0, 0, ZF.CW, ZF.CH); cxF.globalCompositeOperation = 'lighter';
    const put2 = (i, al) => { if (al <= .001) return; cxF.globalAlpha = al; cxF.drawImage(img, (i % 4) * ZF.CW, Math.floor(i / 4) * ZF.CH, ZF.CW, ZF.CH, 0, 0, ZF.CW, ZF.CH); };
    put2(a, 1 - u); put2(b, u); cxF.globalAlpha = 1; cxF.globalCompositeOperation = 'source-over';
  }

  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    if (!isZ(w)) return _dw(ctx, w, isActive, t);
    const img = getImg(ZS_ACT); if (!img) return _dw(ctx, w, isActive, t);
    const s = px(w), sc = w.sc || 1; let p, alpha = 1;
    if (w.state === 'dead') {
      const q = Math.min(1, (w.dt || 0) / 40) * 5, i = Math.min(4, Math.floor(q)); p = [ZS.DEATH + i, ZS.DEATH + i + 1, ease(q - i)];
      if (w.dt > 62) return; if (w.dt > 44) alpha = 1 - (w.dt - 44) / 18;
    } else {
      const moving = w.walking > 0 && w.state === 'ground';
      if (moving && w.actF == null) w.zPh = (w.zPh || 0) + .16;
      p = w.actF != null ? w.actF : (moving ? walk(w) : idle(w));
      if (w.state === 'drown') alpha = Math.max(0, 1 - w.dt / 40);
    }
    const imgF = w.zfF != null && w.state !== 'dead' ? getImg(ZF_ACT) : null, bl = imgF ? Math.max(0, Math.min(1, w.zfB == null ? 1 : w.zfB)) : 0;   // bl = how much of the floating sprite is shown (0 = standing sprite only)
    const flash = w.flash > 0 && (w.flash % 4) < 2;
    if (bl < 1) { pose(img, p); if (w.state !== 'dead') { if (w.frozen > 0) tint('#9fe4ff', .55); if (flash) tint('#ff4a2a', .6); else if (w.healT > 0) tint('#e8ffee', .55 * w.healT / 36); } }
    if (bl > 0) { poseF(imgF, w.zfF); if (w.frozen > 0) tint('#9fe4ff', .55, cxF, ZF.CW, ZF.CH); if (flash) tint('#ff4a2a', .6, cxF, ZF.CW, ZF.CH); else if (w.healT > 0) tint('#e8ffee', .55 * w.healT / 36, cxF, ZF.CW, ZF.CH); }
    ctx.save(); ctx.globalAlpha = alpha;
    if (w.state === 'ground' || w.state === 'dead') { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 60 * s, 8 * s, 0, 0, 6.283); ctx.fill(); }
    ctx.translate(w.x, w.y - (w.hop || 0) - (w.flyOff || 0)); ctx.scale((w.face || 1) * s, s);
    if (bl < 1) { ctx.globalAlpha = alpha * (1 - bl); ctx.drawImage(cv, -ZS.AX, -ZS.FY); }
    if (bl > 0) { ctx.globalAlpha = alpha * bl; ctx.drawImage(cvF, -ZF.AX, -ZF.FY); }
    ctx.restore();
    if (w.state === 'dead' || w.state === 'drown') return;
    const T = G.teams[w.team], y = w.y - (w.flyOff || 0) - 92 * sc, bw = 46 * Math.max(1, sc * .85);
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(w.name, w.x, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(w.name, w.x, y - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w.x - bw / 2 - 1, y - 8, bw + 2, 8); ctx.fillStyle = T.color; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 6);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 2);
    ctx.font = '700 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(w.hp, w.x, y + 6); ctx.fillText(w.hp, w.x, y + 6);
    if (isActive && (G.phase === 'aim' || G.phase === 'retreat')) { const b = Math.sin(t / 8) * 4; ctx.fillStyle = T.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y - 24 + b); ctx.lineTo(w.x - 9, y - 40 + b); ctx.lineTo(w.x + 9, y - 40 + b); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.restore();
  };

  // ---------- NORMAL LIGHTNING (his attack): same logic as boss3.js, new poses; the bolt now leaves his real hand ----------
  const _zb = BOSS3.s_zbolt;
  BOSS3.s_zbolt = function (w, S) {
    const t = S.t;
    const r = _zb.call(this, w, S);
    w.actF = t < 6 ? to(ZS.IDLE, ZS.LIGHT, t / 6) : t < 12 ? to(ZS.LIGHT, ZS.LIGHT + 1, (t - 6) / 6) : t < 18 ? to(ZS.LIGHT + 1, ZS.LIGHT + 2, (t - 12) / 6) : t < 22 ? to(ZS.LIGHT + 2, ZS.LIGHT + 3, (t - 18) / 4) : t < 46 ? ZS.LIGHT + 3 : to(ZS.LIGHT + 3, ZS.IDLE, (t - 46) / 16);
    return r;
  };

  // ---------- THUNDER STRIKE (special, every 3rd turn) ----------
  const _pt = BOSS3.p_thunder;
  BOSS3.p_thunder = function (w, t) {
    const r = _pt.call(this, w, t), n = Math.max(1, this.foes(w).length), end = 52 + 12 * n + 40;
    w.actF = t < 10 ? to(ZS.IDLE, ZS.THUNDER, t / 10) : t < 22 ? to(ZS.THUNDER, ZS.THUNDER + 1, (t - 10) / 12) : t < 44 ? ZS.THUNDER + 1 : t < 49 ? to(ZS.THUNDER + 1, ZS.THUNDER + 2, (t - 44) / 5) : t < 58 ? to(ZS.THUNDER + 2, ZS.THUNDER + 3, (t - 49) / 9) : t < end - 14 ? ZS.THUNDER + 3 : to(ZS.THUNDER + 3, ZS.IDLE, (t - (end - 14)) / 14);
    return r;
  };

  // ---------- FLOATING STORM (every 4th turn) ----------
  //  He rises slowly (the standing sprite melts into the floating one), hovers with a gentle bob while 20 lightning bolts strike random spots of the ground
  //  (each one: a ring warns on the ground, then the bolt falls and explodes), then comes down again and melts back to the standing sprite.
  //  On turn 12, 24 ... (3rd AND 4th turn) the float wins and the thunder special is skipped that turn.
  const _th = BOSS3.think;
  BOSS3.think = function (w, ai) {
    if (isZ(w) && ai.bmoved && !ai.b3done && (w.bt | 0) % ZF_EVERY === 0) { ai.b3done = true; return this.start(w, ai, 'zfloat'); }
    return _th.call(this, w, ai);
  };
  const ZF_PING = f => { const m = 18, v = ((f % m) + m) % m; return 6 + (v > 9 ? m - v : v); };   // storm loop: frames 6 -> 15 -> 6 ...
  BOSS3.s_zfloat = function (w, S) {
    const t = S.t, FLY_END = ZF_RISE + 24;
    if (t === 1) {
      const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1;
      S.n = 0; S.next = FLY_END; S.last = 0; w.flyGoal = null; w.flyOff = w.flyOff || 0; w.zfF = 0; w.zfB = 0;
      showBanner('⚡ ' + w.name + ' rises into the storm! (' + ZF_STRIKES + ' lightning strikes)', '#9fe4ff'); Snd.play('mp3_zeus_levitate'); ringFx(w.x, w.y - 60, '#9fe4ff'); ringFx(w.x, w.y - 60, '#ffffff', 8);
    }
    // --- rise ---
    if (t <= ZF_RISE) {
      const u = ease(t / ZF_RISE); w.flyOff = ZF_HOVER * u; w.zfB = Math.min(1, t / 20); w.zfF = 8 * u; return false;
    }
    // --- storm: strikes ---
    if (S.n < ZF_STRIKES || t < S.last + 50) {
      const tt = t - ZF_RISE, bob = Math.sin(tt / 24) * 6 * Math.min(1, tt / 30);
      w.flyOff = ZF_HOVER + bob; w.zfB = 1; w.zfF = ZF_PING(2 + tt / 5);   // starts at frame 8 = exactly where the rise ended
      if (S.n === 0 && tt === 1) shake(10);
      if (t % 14 === 0) { const ox = w.x + w.face * 50, oy = w.y - w.flyOff - 150; BOSS3.bolt(ox + rnd(-90, 90), oy - rnd(0, 60), ox + rnd(-120, 120), oy + rnd(40, 120), { life: 8, w: 4 }); }
      if (S.n < ZF_STRIKES && t >= S.next) {
        S.n++; S.next = t + Math.round(rnd(ZF_GAP[0], ZF_GAP[1]) * 60); S.last = t;
        let x = 0, y = -1; for (let i = 0; i < 30; i++) { x = rnd(120, WORLD_W - 120); y = G.terrain.surfaceBelow(x, 0); if (y >= 0 && y < WATER_Y - 30) break; y = -1; }
        if (y >= 0) {
          const d = BOSS3.dmg(w, ZF_DMG), gx = x, gy = y;
          ringFx(gx, gy - 4, '#9fe4ff'); Snd.play('freeze', .5);
          BOSS3.later(14, () => {
            (G.b3fx = G.b3fx || []).push({ k: 'thunder', x: gx, y: gy, age: 0, life: 22, seed: Math.random() * 99 }); Snd.play('mp3_zeus_thunder');
            BOSS3.later(7, () => { explode(gx, gy - 24, 78, d, { owner: w, fx: 'b3_thunder_boom', hs: 1.25, carve: 0, knock: 6 }); shake(9); G.b3flash = 5; });
          });
        }
        if (S.n === ZF_STRIKES) S.last = t + 30;   // the last bolt needs ~21 frames to land; wait a little longer
      }
      return false;
    }
    // --- come down ---
    if (S.lt == null) { S.lt = t; S.lf = w.zfF; }
    const u = Math.min(1, (t - S.lt) / ZF_FALL), e = ease(u);
    w.flyOff = ZF_HOVER * (1 - e); w.zfF = S.lf * (1 - e); w.zfB = u > .8 ? Math.max(0, 1 - (u - .8) / .2) : 1;
    if (u >= 1) { w.flyOff = 0; w.zfF = null; w.zfB = null; const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; return t > S.lt + ZF_FALL + 14; }
    return false;
  };

  const _as = BOSS3.assets; BOSS3.assets = function (st) { return _as.call(this, st).concat([loadImage(ZS_ACT).catch(() => { }), loadImage(ZF_ACT).catch(() => { })]); };
  console.log('zeus.js loaded - Mighty Zeus: new sprites, lightning attack, thunder strike special, floating storm (every 4th turn), idle / walk / death');
})();
