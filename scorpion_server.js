/* ONLINE VERSION of scorpion.js - upload this file to GitHub (online game only).
   The offline app keeps using scorpion.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  SCORPION KING  (HEROIC third boss of the Dunes map)  -  new look from your sprite sheet (no more old 3D design)
//
//  Every turn:
//    1) MOVE FIRST   - walks a few steps to a random side
//    2) PINCER       - walks up to the nearest player, opens the pincer, GRABS him, lifts him and SMASHES him into the ground (damage)
//    every 3rd turn (instead of the pincer):
//       TAIL VENOM   - lashes the tail 3 times; every lash spits one venom glob at EVERY player  =>  3 venoms to each player, each one hurts
//  Animations (your sheet, 19 frames, 480x384 each, 4 per row):  idle 0-3 | tail 4-7 | pincer 8-11 | walk 12-14 | death 15-18
//  Frames are cross-faded into each other every game tick, so the movement is smooth (no 10 fps "flip book" look).
//  Built on the boss3.js framework (same pattern as minocentaur.js / slimeboss.js): it wraps BOSS3.think / BOSS3.step / BOSS3.update / BOSS3.draw
//  and drawWorm, so ai.js / world.js / render.js are not touched.
//  Art:  assets/adventure/boss_scorpionking_act.webp (your sheet)  +  _hold / _death / portrait/scorpionking.webp (made from it)  +  assets/proj/scorpion_venom_spit.png (your venom)
// ============================================================================================================

// ---- TUNING ----
const SK_PINCER_MUL = 1.8;            // pincer smash damage  = boss weapon damage x this
const SK_VENOM_MUL = .7;              // damage of ONE venom   = boss weapon damage x this  (3 venoms per player every 3rd turn)
const SK_WALK = 6, SK_RUN = 9;        // walking speed (move first) / speed when it goes for a player
const SK_STEP_MIN = 130, SK_STEP_MAX = 300;
const SK_PX = 1.04;                   // world pixels per sprite pixel (at the boss size 3.0)
const SK_REACH = 150;                 // the scorpion stops this far (x) from the player it wants to grab
const SK_VENOM_SC = .85;              // size of the venom picture

// ---- sheet layout / key points (sprite pixels; the feet point is the anchor) ----
const SK = { CW: 480, CH: 384, AX: 200, FY: 340, IDLE: 0, TAIL: 4, PINCER: 8, WALK: 12, DEATH: 15 };
const SK_TIP = [68, -154];            // tail stinger while it lashes (frame 6): x forward / y up from the feet
const SK_CLAW = [175, -48];           // where the pincer holds a grabbed player
const SK_ACT = 'adventure/boss_scorpionking_act.webp', SK_VENOM_IMG = 'proj/scorpion_venom_spit.png';

(function () {
  const isSK = w => !!(w && w.rob && w.rob.b3 === 'scorpion');
  const ease = a => { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); };
  const sc3 = w => (w.sc || 3) / 3;
  const px = w => SK_PX * sc3(w);                        // world px per sprite px

  // the boss weapon is part of the picture: nothing extra is drawn
  const wd = WEAPONS.find(x => x.id === 'C12_Scorpion_Venom'); if (wd) wd.art = 'M0_Blank';

  // ---------- hit shapes / body centre that match the new picture ----------
  const _bs = bodyShapes; bodyShapes = w => {
    if (!isSK(w)) return _bs(w);
    const s = px(w), f = w.face || 1, fy = w.y - (w.hop || 0) - (w.flyOff || 0);
    return [[w.x + f * 24 * s, fy - 58 * s, 125 * s, 52 * s], [w.x - f * 55 * s, fy - 118 * s, 48 * s, 78 * s]];   // body + the tail curled over the back
  };
  const _bc = bodyCenter; bodyCenter = w => isSK(w) ? [w.x + (w.face || 1) * 20 * px(w), w.y - (w.hop || 0) - 62 * px(w)] : _bc(w);

  // ---------- poses: a pose is a frame number, or [frameA, frameB, u] = A cross-faded into B ----------
  const cyc = (base, n, v) => { v = ((v % n) + n) % n; return v; };
  const pp = (base, n, v) => { const m = (n - 1) * 2; v = ((v % m) + m) % m; if (v > n - 1) v = m - v; const i = Math.min(n - 2, Math.floor(v)); return [base + i, base + i + 1, ease(v - i)]; };   // ping-pong loop over n frames (eased cross-fade: less ghosting)
  const SKP = {
    idle(w) { return pp(SK.IDLE, 4, (G.frame | 0) / 9 + (w.idx | 0) * 2); },
    walk(w) { return pp(SK.WALK, 3, w.skPh || 0); },
    to(a, b, u) { return [a, b, ease(u)]; },
  };

  // ---------- drawing ----------
  const cv = document.createElement('canvas'); cv.width = SK.CW; cv.height = SK.CH; const cx = cv.getContext('2d');
  const putFrame = (ctx, img, i, al) => { ctx.globalAlpha = al; ctx.drawImage(img, (i % 4) * SK.CW, Math.floor(i / 4) * SK.CH, SK.CW, SK.CH, 0, 0, SK.CW, SK.CH); };
  function skPose(ctx, img, pose, alpha) {
    ctx.clearRect(0, 0, SK.CW, SK.CH); ctx.globalCompositeOperation = 'source-over';
    if (Array.isArray(pose)) { putFrame(ctx, img, pose[0], 1); if (pose[2] > .001) putFrame(ctx, img, pose[1], pose[2]); } else putFrame(ctx, img, pose | 0, 1);
    ctx.globalAlpha = 1;
  }
  function skTint(ctx, col, a) { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, SK.CW, SK.CH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }

  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    if (!isSK(w)) return _dw(ctx, w, isActive, t);
    const img = getImg(SK_ACT); if (!img) return _dw(ctx, w, isActive, t);
    const s = px(w), sc = w.sc || 1;
    let pose, alpha = 1;
    if (w.state === 'dead') {   // death: the 4 death frames cross-faded over the death animation
      const p = Math.min(1, (w.dt || 0) / 40) * 3, i = Math.min(2, Math.floor(p));
      pose = [SK.DEATH + i, SK.DEATH + i + 1, p - i]; if (w.dt > 60) return; if (w.dt > 42) alpha = 1 - (w.dt - 42) / 18;
    } else {
      if (w.walking > 0 && w.state === 'ground' && w.actF == null) w.skPh = (w.skPh || 0) + .2;
      pose = w.actF != null ? w.actF : (w.walking > 0 && w.state === 'ground' ? SKP.walk(w) : SKP.idle(w));
      if (w.state === 'drown') alpha = Math.max(0, 1 - w.dt / 40);
    }
    skPose(cx, img, pose);
    if (w.state !== 'dead') { if (w.frozen > 0) skTint(cx, '#9fe4ff', .55); if (w.flash > 0 && (w.flash % 4) < 2) skTint(cx, '#ff4a2a', .6); else if (w.healT > 0) skTint(cx, '#e8ffee', .55 * w.healT / 36); }
    ctx.save(); ctx.globalAlpha = alpha;
    if (w.state === 'ground' || w.state === 'dead') { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 150 * s, 9 * s, 0, 0, 6.283); ctx.fill(); }   // ground shadow
    ctx.translate(w.x, w.y - (w.hop || 0) - (w.flyOff || 0)); ctx.scale((w.face || 1) * s, s);
    ctx.drawImage(cv, -SK.AX, -SK.FY);
    ctx.restore();
    if (w.state === 'dead' || w.state === 'drown') return;
    // labels (same as every other worm)
    const T = G.teams[w.team], y = w.y - 92 * sc, bw = 46 * Math.max(1, sc * .85);
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(w.name, w.x, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(w.name, w.x, y - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w.x - bw / 2 - 1, y - 8, bw + 2, 8); ctx.fillStyle = T.color; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 6);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 2);
    ctx.font = '700 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(w.hp, w.x, y + 6); ctx.fillText(w.hp, w.x, y + 6);
    if (isActive && (G.phase === 'aim' || G.phase === 'retreat')) { const b = Math.sin(t / 8) * 4; ctx.fillStyle = T.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y - 24 + b); ctx.lineTo(w.x - 9, y - 40 + b); ctx.lineTo(w.x + 9, y - 40 + b); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.restore();
  };

  // ---------- the scripted turns ----------
  const face = (w, t) => { if (t) w.face = t.x >= w.x ? 1 : -1; };
  const foes = w => BOSS3.foes(w);
  const nearest = w => foes(w).sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x))[0];
  const walk = (w, S, tx, sp) => {   // one step toward tx: 'go' | 'done' | 'blocked'; also advances the walk cycle
    const d = tx - w.x; if (Math.abs(d) <= sp + .5) return 'done';
    const dir = d > 0 ? 1 : -1; w.face = dir; const x0 = w.x;
    if (!placeOnGround(w, w.x + dir * sp) || Math.abs(w.x - x0) < .05) { if (++S.stuck > 8) return 'blocked'; } else S.stuck = 0;
    w.skPh = (w.skPh || 0) + sp / 30; return 'go';
  };
  const tip = w => { const s = px(w); return [w.x + (w.face || 1) * SK_TIP[0] * s, w.y - (w.hop || 0) - (-SK_TIP[1]) * s]; };

  const SKX = {
    // ---- 1) move first ----
    s_sk_move(w, S) {
      const t = S.t;
      if (t === 1) { S.stuck = 0; S.pause = 0; let dir = Math.random() < .5 ? -1 : 1; if (AI.edgeNear(w, dir)) dir = -dir; if (AI.edgeNear(w, dir)) return true; S.tx = clamp(w.x + dir * rnd(SK_STEP_MIN, SK_STEP_MAX), 150, WORLD_W - 150); w.face = dir; }
      if (S.pause) { S.pause++; const a = Math.min(1, S.pause / 8); w.actF = null; return S.pause > 10; }
      const r = walk(w, S, S.tx, SK_WALK); w.actF = SKP.walk(w); if (t % 16 === 0) shake(2);
      if (r !== 'go' || t > 200) S.pause = 1;
      return false;
    },
    // ---- 2) walk to the nearest player, grab him with the pincer and smash him into the ground ----
    s_sk_pincer(w, S) {
      const t = S.t;
      if (t === 1) { const tg = nearest(w); if (!tg) return true; S.tg = tg; S.ph = 'go'; S.stuck = 0; S.u = 0; S.t0 = 1; face(w, tg); showBanner('⚠ ' + w.name + ' goes for ' + tg.name + '!', '#ff6a4a'); Snd.play('slash', .5); }
      const tg = S.tg, s = px(w);
      const finish = () => { if (tg && tg.flyOff) tg.flyOff = 0; return true; };
      if (!tg || tg.state === 'dead' || tg.state === 'drown') return finish();
      if (S.ph === 'go') {
        const stop = SK_REACH * sc3(w), goal = tg.x - Math.sign(tg.x - w.x || 1) * stop, close = Math.abs(tg.x - w.x) <= stop + 6;
        const r = close ? 'done' : walk(w, S, goal, SK_RUN); face(w, tg); w.actF = SKP.walk(w); if (t % 12 === 0) shake(3);
        if (r !== 'go' || t - S.t0 > 320) { S.ph = 'ready'; S.u = 0; S.fromWalk = w.actF; }
        return false;
      }
      S.u++; const u = S.u; face(w, tg); const AX = w.x + w.face * SK_CLAW[0] * s;
      if (S.ph === 'ready') {   // the pincer comes up and opens
        w.actF = [Array.isArray(S.fromWalk) ? S.fromWalk[0] : S.fromWalk, SK.PINCER, ease(u / 8)]; if (u < 8) return false;
        w.actF = SKP.to(SK.PINCER, SK.PINCER + 1, (u - 8) / 12); if (u >= 20) { S.ph = 'snap'; S.u = 0; if (tg.state === 'ground' && Math.abs(tg.x - w.x) < (SK_CLAW[0] + 70) * s) S.grab = true; else S.grab = false; Snd.play('slash', 1); }
        return false;
      }
      if (S.ph === 'snap') {   // the pincer snaps shut
        w.actF = SKP.to(SK.PINCER + 1, SK.PINCER + 2, u / 6);
        if (S.grab) { tg.vx = 0; tg.vy = 0; tg.x += (AX - tg.x) * .35; }
        if (u === 6) { addFx('spark_hit', tg.x, tg.y - 40, 1.2); shake(8); if (!S.grab) { S.ph = 'miss'; S.u = 0; } }
        if (u >= 8 && S.grab) { S.ph = 'lift'; S.u = 0; }
        return false;
      }
      if (S.ph === 'miss') {   // nobody in reach (flying player): the pincer swings anyway, everybody in front of it is hit
        w.actF = SKP.to(SK.PINCER + 2, SK.PINCER + 3, u / 14);
        if (u === 4) { const dmg = BOSS3.dmg(w, SK_PINCER_MUL * .6); Snd.play('slash', 1); shake(10); let n = 0; for (const p of foes(w)) { const dx = (p.x - w.x) * w.face; if (dx < -40 || dx > 330 * sc3(w) || Math.abs(p.y - w.y) > 190) continue; n++; hurt(p, dmg); if (p.state !== 'dead') knockWorm(p, w.face * 4.5, -3.5); addFx('b3_slash', p.x - w.face * 10, p.y - 50, 1.2, { flip: w.face < 0 }); } if (!n) addPop(w.x + w.face * 150, w.y - 120, 'miss', '#cdd', 16); }
        if (u > 14) w.actF = [SK.PINCER + 3, SK.IDLE, ease((u - 14) / 12)];
        return u > 26 ? finish() : false;
      }
      if (S.ph === 'lift') {   // lifts the player up in the pincer
        const a = ease(u / 26); w.actF = SKP.to(SK.PINCER + 2, SK.PINCER, a);
        tg.vx = 0; tg.vy = 0; tg.x = AX; tg.flyOff = 120 * a;
        if (u >= 34) { S.ph = 'smash'; S.u = 0; }
        return false;
      }
      if (S.ph === 'smash') {   // ... and slams him into the ground
        const a = ease(u / 8); w.actF = SKP.to(SK.PINCER, SK.PINCER + 2, a); tg.vx = 0; tg.vy = 0; tg.x = AX; tg.flyOff = 120 * (1 - ease(u / 8));
        if (u === 8) {
          tg.flyOff = 0; shake(36); Snd.play('boom', 1.5); Snd.play('boom', 1); hurt(tg, BOSS3.dmg(w, SK_PINCER_MUL)); if (tg.state !== 'dead') knockWorm(tg, w.face * 1.5, -3);
          addFx('explosion_big', tg.x, tg.y - 8, 1.5); addFx('b3_poison_hit', tg.x, tg.y - 30, 1.4); debris(tg.x, tg.y - 4, 24, 'dirt'); ringFx(tg.x, tg.y - 4, '#ffcf8a'); G.terrain.carve(tg.x, tg.y + 6, 40); showBanner('SMASH!', '#ff6a4a');
        }
        if (u > 8) w.actF = u < 22 ? SKP.to(SK.PINCER + 2, SK.PINCER + 3, (u - 8) / 14) : [SK.PINCER + 3, SK.IDLE, ease((u - 22) / 10)];
        return u > 32 ? finish() : false;
      }
      return true;
    },
    // ---- 3) every 3rd turn: tail lashes 3 times, each lash spits a venom at every player ----
    s_sk_venom(w, S) {
      const t = S.t;
      if (t === 1) { const n = nearest(w); if (!n) return true; face(w, n); S.round = 0; showBanner('☠ ' + w.name + ' spits venom at everyone!', '#7dff4a'); Snd.play('freeze', .6); }
      const R = 24, RISE = 16;   // one lash = 24 ticks, the tail rises first (16 ticks)
      if (t <= RISE) { w.actF = t < 8 ? SKP.to(SK.IDLE, SK.TAIL, t / 8) : SKP.to(SK.TAIL, SK.TAIL + 1, (t - 8) / 8); return false; }
      const u = (t - RISE - 1) % R, round = Math.floor((t - RISE - 1) / R);
      if (round >= 3) {   // tail comes back down
        const e = t - RISE - 3 * R; w.actF = SKP.to(SK.TAIL + 3, SK.IDLE, e / 14); return e > 16;
      }
      if (u < 7) w.actF = SKP.to(SK.TAIL + 1, SK.TAIL + 2, u / 7);                    // wind-up -> whip
      else if (u < 13) w.actF = SKP.to(SK.TAIL + 2, SK.TAIL + 3, (u - 7) / 6);          // whip -> follow-through
      else w.actF = SKP.to(SK.TAIL + 3, SK.TAIL + 1, (u - 13) / 11);                    // back up for the next lash
      if (u === 7) {   // the venom leaves the stinger: one glob to EVERY player
        const [ox, oy] = tip(w), list = foes(w); Snd.play('freeze', .8); shake(5);
        list.forEach((p, i) => SKX.venom(w, ox, oy, p, i * 5, round));
        addFx('b3_poison_hit', ox, oy, .5);
      }
      return false;
    },
    // ---- venom globs (my own little projectile list: lobbed arc from the stinger, homing on the player, hurts on arrival) ----
    venom(w, x, y, tg, delay, round) {
      const [cxx, cyy] = bodyCenter(tg), dist = Math.hypot(cxx - x, cyy - y);
      (G.skv = G.skv || []).push({ x0: x, y0: y, x, y, tg, t: -delay, dur: clamp(dist / 13, 24, 54), arc: 50 + dist * .14, dmg: BOSS3.dmg(w, SK_VENOM_MUL), owner: w, vx: 1, vy: 0, round });
    },
  };
  window.SKX = SKX;

  // ---------- hook the boss3 framework ----------
  const _think = BOSS3.think;
  BOSS3.think = function (w, ai) {
    if (w.rob.b3 !== 'scorpion') return _think.call(this, w, ai);
    if (!ai.b3hop) { ai.b3hop = true; ai.bmoved = true; return this.start(w, ai, 'sk_move'); }                                       // 1) move first
    if (!ai.b3done) { ai.b3done = true; return this.start(w, ai, ai.bspecial ? 'sk_venom' : 'sk_pincer'); }                           // 2) pincer grab + smash, every 3rd turn the venom
    return false;
  };
  const _step = BOSS3.step;
  BOSS3.step = function (w, ai) {
    const S = w.b3; if (!S || String(S.k).indexOf('sk_') !== 0) return _step.call(this, w, ai);
    S.t++; const fin = SKX['s_' + S.k](w, S); if (!fin) return;
    w.b3 = null; w.actF = null; w.hop = 0;
    if (S.k === 'sk_move') { ai.st = 'think'; ai.t = 10; } else { if (S.tg && S.tg.flyOff) S.tg.flyOff = 0; this.endTurn(w, ai); }
  };
  const _as = BOSS3.assets; BOSS3.assets = function (st) { return _as.call(this, st).concat([loadImage(SK_VENOM_IMG).catch(() => { }), loadImage(SK_ACT).catch(() => { })]); };

  // venom update + draw
  const _up = BOSS3.update;
  BOSS3.update = function () {
    _up.call(this);
    if ((G.frame | 0) < 2) G.skv = [];   // new game: no venoms left over from the last one
    const L = G.skv; if (!L || !L.length) return;
    for (const v of L) {
      v.t++; if (v.t < 0) continue;
      const tgt = v.tg, alive = tgt && tgt.state !== 'dead' && tgt.state !== 'drown', [tx, ty] = alive ? bodyCenter(tgt) : [v.tx != null ? v.tx : v.x, v.ty != null ? v.ty : v.y];
      if (alive) { v.tx = tx; v.ty = ty; }
      const a = Math.min(1, v.t / v.dur), px0 = v.x, py0 = v.y;
      v.x = v.x0 + (tx - v.x0) * a; v.y = v.y0 + (ty - v.y0) * a - Math.sin(Math.PI * a) * v.arc;
      v.vx = v.x - px0 || v.vx; v.vy = v.y - py0;
      if (v.t % 3 === 0) addFx('b3_poison_hit', v.x, v.y, .18);
      if (a >= 1) {
        v.dead = true; addFx('b3_poison_hit', tx, ty, 1.1); Snd.play('smallboom', .6);
        if (alive) { hurt(tgt, v.dmg); if (tgt.state !== 'dead') knockWorm(tgt, (tgt.x >= v.owner.x ? 1 : -1) * 1.2, -1.6); }
      }
    }
    G.skv = L.filter(v => !v.dead);
  };
  const _dr = BOSS3.draw;
  BOSS3.draw = function (ctx) {
    _dr.call(this, ctx);
    const L = G.skv; if (!L || !L.length) return; const im = getImg(SK_VENOM_IMG);
    for (const v of L) {
      if (v.t < 0) continue;
      ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(Math.atan2(v.vy, v.vx || 1) + (v.vx < 0 ? Math.PI : 0)); if (v.vx < 0) ctx.scale(1, -1); ctx.scale(SK_VENOM_SC, SK_VENOM_SC);
      if (im) ctx.drawImage(im, -92, -72, 121, 143);
      else { ctx.fillStyle = '#9dff3a'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
  };
  console.log('scorpion.js loaded - Scorpion King: new sprites, pincer grab + smash, venom volley every 3rd turn');
})();
