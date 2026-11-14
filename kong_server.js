/* ONLINE VERSION of kong.js - upload this file to GitHub (online game only).
   The offline app keeps using kong.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  KING KONG  (Ember Forge, HEROIC last boss - replaces the Cinder Drake on HEROIC; the Drake stays on HARD)
//
//  EVERY TURN, first:  MOVE - he goes to a random spot, either RUNNING (run sprite) or JUMPING (jump sprite).
//  Then, depending on the turn (the 3 turns repeat):
//    turn 1  RUNS to a random player, JUMPS onto him and SMASHES the ground (everybody close to the fist takes damage, NO knockback)
//    turn 2  same, but he SMASHES THE GROUND TWICE (two hits)
//    turn 3  RUNS to a random player, JUMPS onto him and ROARS: a shockwave ring (sprite fx/kk_roar_wave.webp) hurts everybody in
//            range and pushes them a LITTLE
//  If the player is NOT on the ground level (he stands on floating ground, or hovers in the air) Kong jumps up there / to him.
//  If Kong is on a floating platform and the player is below, he runs to the edge and jumps down.
//
//  Sheet  adventure/boss_kingkong_act.webp  (40 frames, 256x256, 8 per row, 2048x1280). Every frame has the SAME scale, the same cell size,
//  is turned to face RIGHT and is anchored on his body (x) and feet (y = KK.FY), so nothing jumps or changes size when the frame changes.
//     idle 0-5 | run 6-9 | jump 10-17 | smash 18-25 | roar 26-31 | death 32-39
//  Neighbouring frames are always cross-faded (no hard cuts), the run cycle follows the distance he really runs (no foot sliding).
//  Arena: "Skull Island Ruins" (assets/adventure/arena_kong.png + assets/bg/b3_kong_*.webp), with 3 floating stone platforms.
//  Built on the boss3.js framework (same pattern as werewolf.js): wraps BOSS3.think / step / assets, drawWorm, bodyShapes, Snd.play.
//  Tuning numbers are all at the top of this file.
// ============================================================================================================

// ---- TUNING ----
const KK_SC = 2.2;                 // collision size (he must fit under the floating platforms); the picture size is KK_PX
const KK_PX = 1.4;                 // world px per sprite px (boss size)
const KK_HP = 2.0;                 // health x the map's robot boss
const KK_DEF = 12, KK_POW = 16;    // armor + / attack bonus + (percent) vs the robot boss
const KK_RUN = 15;                 // run speed (px per tick)
const KK_STRIDE = 300;             // world px for ONE full run cycle (4 frames). Bigger = slower legs for the same speed
const KK_STEP_MIN = 260, KK_STEP_MAX = 520;   // the "move first" run distance
const KK_JUMP_CHANCE = .5;         // chance per turn that the first move is a JUMP to a new spot instead of a run
const KK_JUMP_FROM = 470;          // he starts the attack jump when this close (px) to the player on flat ground
const KK_LEAP_DY = 55;             // height difference (px) that makes him jump up / run to the edge and jump down
const KK_FRONT = 95;               // where the fist hits, px in front of his body
const KK_SMASH_R = 300;            // reach of a ground smash (px from the fist, every player inside is hit)
const KK_SMASH_MUL = 1.0;          // single smash damage = boss weapon damage x this
const KK_DBL_MUL = .9;             // damage of each of the two smashes
const KK_ROAR_R = 430;             // reach of the roar shockwave
const KK_ROAR_MUL = 1.5;           // roar damage = boss weapon damage x this
const KK_LAND = 95;                // how far from the player he lands (px)
// ---- 30% HP: chest pound + CLAN KONG ----
const KK_POUND_HP = .40;           // at or below this share of his max health (40%) he pounds his chest and calls his clan (once per fight)
const KK_CLAN_HP = .5;             // clan Kong health = this x the boss's max health (50% less)
const KK_CLAN_DMG = .5;            // clan Kong damage = this x the boss's damage (50% less)
const KK_CLAN_DIST = 300;          // the clan Kong lands this far (px) beside him
const KK_CLAN_DROP = 1000;         // he falls from this height (px) above the ground

const KK = { CW: 256, CH: 256, AX: 128, FY: 248, COLS: 8, IDLE: 0, RUN: 6, JUMP: 10, SMASH: 18, ROAR: 26, DEATH: 32, POUND: 100 };   // frame numbers >= POUND are chest-pound frames (sheet boss_kingkong_pound.png, 12 frames, 4 per row, same 256x256 cell / anchor)
const KK_ACT = 'adventure/boss_kingkong_act.webp', KK_WAVE = 'fx/kk_roar_wave.webp';
const KK_ACT_BR = 'adventure/boss_kingkong_brown_act.png', KK_POUND = 'adventure/boss_kingkong_pound.png';   // brown clan Kong sheet (same 40 frames) + chest-pound sheet
// timelines (tick -> frame; frames are cross-faded between the keys)
const KK_T_SMASH = [[0, KK.JUMP + 5], [3, KK.SMASH + 4], [10, KK.SMASH + 4], [16, KK.SMASH + 5], [26, KK.SMASH + 5], [34, KK.SMASH + 6], [44, KK.SMASH + 6], [52, KK.SMASH + 7], [62, KK.IDLE]];
const KK_T_DOUBLE = [[0, KK.JUMP + 5], [3, KK.SMASH + 4], [10, KK.SMASH + 4], [16, KK.SMASH + 5], [24, KK.SMASH + 6], [30, KK.SMASH + 7], [40, KK.SMASH + 2], [50, KK.SMASH + 3], [62, KK.SMASH + 3], [65, KK.SMASH + 4], [74, KK.SMASH + 4], [82, KK.SMASH + 5], [92, KK.SMASH + 6], [102, KK.SMASH + 7], [112, KK.IDLE]];
// chest pound: idle -> ready stance -> 12 pound frames (fist to chest, head back, roar) x ~10 ticks each, cross-faded -> back to idle. 150 ticks
const KK_T_POUND = (() => { const P = KK.POUND, K = [[0, KK.IDLE], [14, P]]; for (let i = 1; i < 12; i++) K.push([14 + i * 10, P + i]); K.push([134, P + 11], [148, KK.IDLE]); return K; })();
const KK_T_ROAR = [[0, KK.JUMP + 5], [4, KK.JUMP + 6], [10, KK.JUMP + 6], [18, KK.JUMP + 7], [26, KK.ROAR], [34, KK.ROAR + 1], [42, KK.ROAR + 2], [48, KK.ROAR + 3], [68, KK.ROAR + 3], [76, KK.ROAR + 4], [86, KK.ROAR + 5], [98, KK.IDLE]];

(function () {
  const isK = w => !!(w && w.rob && w.rob.b3 === 'kong');
  const ease = a => { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); };
  const px = w => KK_PX * (w.sc || KK_SC) / KK_SC;                        // world px per sprite px
  const sz = w => px(w) / KK_PX;                                         // 1.0 = boss
  const face = (w, t) => { if (t) w.face = t.x >= w.x ? 1 : -1; };
  const foes = w => BOSS3.foes(w);
  const dmgK = (w, mul) => w.kkClan ? Math.max(1, Math.round(BOSS3.dmg(w.kkBoss || G.bossW, mul) * KK_CLAN_DMG)) : BOSS3.dmg(w, mul);   // clan Kong: the boss's damage x KK_CLAN_DMG
  const dom = p => Array.isArray(p) ? (p[2] < .5 ? p[0] : p[1]) : p;     // the frame a pose looks most like
  const sh = u => ease((u - .3) / .4);                                    // short cross-fade: the frame is held, then blended quickly (no long double-image of very different poses)
  const keys = (K, t) => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) if (t < K[i + 1][0]) { const a = K[i], b = K[i + 1]; return a[1] === b[1] ? a[1] : [a[1], b[1], sh((t - a[0]) / (b[0] - a[0]))]; } return K[K.length - 1][1]; };

  // the boss weapon is part of the damage numbers only (nothing is drawn / shot)
  SIG_WMETA['C18_Kong_Smash'] = { muzzle: [170, 128], bbox: [0, 0, 1, 1] };
  if (!WEAPONS.find(x => x.id === 'C18_Kong_Smash')) WEAPONS.push(CBOSS_W('C18_Kong_Smash', 'boss_kingkong', 'Kong Smash', 'Runs, leaps on a player and smashes the ground (twice on every 2nd turn). Every 3rd turn: a roar shockwave.', { dmg: 58, blast: 40, knock: 4, ss: 1, hit: 'explosion_small', hs: 1.0, snd: 'boom' }));
  const wd = WEAPONS.find(x => x.id === 'C18_Kong_Smash'); if (wd) wd.art = 'M0_Blank';

  // ---------- Ember Forge: HEROIC last boss = King Kong (replaces the Cinder Drake on HEROIC only) ----------
  const PLAT = [[780, 1160, 470, 56], [1240, 1620, 330, 60], [1700, 2080, 470, 56]];   // floating stone platforms: x0, x1, top y, thickness (same numbers the arena picture was painted with)
  const gtop = x => x < 260 ? 800 + Math.pow((260 - x) / 260, 1.7) * 150 : x > 2540 ? 800 + Math.pow((x - 2540) / 260, 1.7) * 150 : 800;
  const pbot = (x, p) => { const u = (x - p[0]) / (p[1] - p[0]); return p[2] + 14 + (p[3] - 14) * Math.sqrt(Math.max(0, 1 - (2 * u - 1) * (2 * u - 1))); };
  const E = ADV_MAPS.find(m => m.id === 'ember'), F = E && E.stages.find(s => s.boss);
  if (E && F) {
    const mp = { id: 'adv_ember_kong', name: 'Skull Island Ruins', bg: 'b3_kong', img: 'adventure/arena_kong.png' };
    E.maps.arena3k = mp;
    MAP_RUNS[mp.id] = Array.from({ length: WORLD_W }, (_, x) => { const r = []; for (const p of PLAT) if (x >= p[0] && x < p[1]) r.push(p[2], Math.round(pbot(x + .5, p))); r.push(Math.round(gtop(x + .5)), WORLD_H); return r; });
    E.boss3 = { name: 'Skull Island Ruins', map: 'arena3k', boss: true, boss2: true, boss3: true, replaces2: true, b3: 'kong', noMinions: true, spec: 'burn', act: KK_ACT, n: 1,
      hp: Math.round(F.hp * KK_HP), sc: KK_SC, diff: 2, def: (F.def || 0) + KK_DEF, pow: (F.pow || 0) + KK_POW, px: F.px, ex: [2350],
      bossName: 'King Kong', bossId: 'boss_kingkong', sheet: 'adventure/boss_kingkong_hold.webp', death: 'adventure/boss_kingkong_death.webp', anchors: Array.from({ length: 9 }, () => ({ n: [238, 300], f: [238, 300] })) };
    BOSS_GLOW.kingkong = '#ffb347';
  }
  B3_BY_KIND.kong = { kind: 'kong', key: 'kingkong', name: 'King Kong', wide: 1 };
  // background theme of the new arena
  const bgs = typeof GAME_DATA !== 'undefined' ? GAME_DATA['bg.json'] : null;
  if (bgs) bgs.b3_kong = { sky: 'bg/b3_kong_sky.webp', far: 'bg/b3_kong_far.webp', mid: 'bg/b3_kong_mid.webp', near: 'bg/b3_kong_near.webp' };
  BG_FILL.b3_kong = [[58, 40, 78], [26, 52, 58], [12, 26, 28]];
  const _dwt = drawWater; drawWater = (ctx, t, th) => _dwt(ctx, t, th === 'b3_kong' ? 'sunset' : th);

  // ---------- roar shockwave sprite ----------
  ADDITIVE.kk_roar_wave = 1;
  const WAVE_FX = { file: KK_WAVE, frames: 10, cols: 5, fw: 256, fh: 256, fps: 17, loop: false };
  Object.assign(DIVINE_FX, { kk_roar_wave: WAVE_FX }); if (Assets.fx) Assets.fx.kk_roar_wave = WAVE_FX;

  // ---------- hit shapes / body centre ----------
  const _bs = bodyShapes; bodyShapes = w => {
    if (!isK(w)) return _bs(w);
    const s = px(w), f = w.face || 1, fy = w.y - (w.hop || 0) - (w.flyOff || 0);
    return [[w.x, fy - 88 * s, 62 * s, 84 * s], [w.x + f * 48 * s, fy - 128 * s, 34 * s, 30 * s]];
  };
  const _bc = bodyCenter; bodyCenter = w => isK(w) ? [w.x, w.y - (w.hop || 0) - (w.flyOff || 0) - 90 * px(w)] : _bc(w);

  // ---------- drawing ----------
  const cv = document.createElement('canvas'); cv.width = KK.CW; cv.height = KK.CH; const cx = cv.getContext('2d');
  const putFrame = (ctx, img, i, al) => {
    ctx.globalAlpha = al;
    if (i >= KK.POUND) { const pi = getImg(KK_POUND), j = i - KK.POUND; if (pi) ctx.drawImage(pi, (j % 4) * KK.CW, Math.floor(j / 4) * KK.CH, KK.CW, KK.CH, 0, 0, KK.CW, KK.CH); else ctx.drawImage(img, 0, 0, KK.CW, KK.CH, 0, 0, KK.CW, KK.CH); return; }
    ctx.drawImage(img, (i % KK.COLS) * KK.CW, Math.floor(i / KK.COLS) * KK.CH, KK.CW, KK.CH, 0, 0, KK.CW, KK.CH);
  };
  function kkPose(ctx, img, pose) {   // a pose = a frame number, or [frameA, frameB, u] = A cross-faded into B (no see-through dip)
    ctx.clearRect(0, 0, KK.CW, KK.CH); ctx.globalCompositeOperation = 'source-over';
    if (Array.isArray(pose)) { const u = Math.max(0, Math.min(1, pose[2])); if (u < .001) putFrame(ctx, img, pose[0], 1); else if (u > .999) putFrame(ctx, img, pose[1], 1); else { putFrame(ctx, img, pose[0], u < .55 ? 1 : (1 - u) / .45); putFrame(ctx, img, pose[1], u); } }
    else putFrame(ctx, img, pose | 0, 1);
    ctx.globalAlpha = 1;
  }
  function kkTint(ctx, col, a) { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, KK.CW, KK.CH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const IDLE_SEQ = [0, 4, 5, 4];   // the upright idle frames, played as a slow ping-pong (0.5 s per pose, cross-faded)
  const idlePose = w => { const v = ((((G.frame | 0) / 30 + (w.idx | 0) * 1.7) % 4) + 4) % 4, i = Math.floor(v); return [IDLE_SEQ[i], IDLE_SEQ[(i + 1) % 4], ease(v - i)]; };
  const runPose = w => { const v = (((w.kkPh || 0) % 1) + 1) % 1 * 4, i = Math.floor(v) % 4; return [KK.RUN + i, KK.RUN + (i + 1) % 4, v - Math.floor(v)]; };

  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    if (!isK(w)) return _dw(ctx, w, isActive, t);
    const img = getImg(w.rob.act); if (!img) return _dw(ctx, w, isActive, t);
    const s = px(w); let pose, alpha = 1;
    if (w.state === 'dead') {   // death: 8 frames, then he lies there and fades
      const p = Math.min(1, (w.dt || 0) / 64) * 7, i = Math.min(6, Math.floor(p));
      pose = [KK.DEATH + i, KK.DEATH + i + 1, ease(p - i)]; if (w.dt > 150) return; if (w.dt > 110) alpha = 1 - (w.dt - 110) / 40;
    } else {
      pose = w.actF != null ? w.actF : idlePose(w);
      if (w.state === 'drown') alpha = Math.max(0, 1 - w.dt / 40);
      else if (w.state === 'air' && w.actF == null) pose = w.vy < 0 ? [KK.JUMP + 2, KK.JUMP + 3, .5] : [KK.JUMP + 4, KK.JUMP + 5, .5];   // knocked into the air
    }
    kkPose(cx, img, pose);
    if (w.state !== 'dead') { if (w.frozen > 0) kkTint(cx, '#9fe4ff', .55); if (w.flash > 0 && (w.flash % 4) < 2) kkTint(cx, '#ff4a2a', .6); else if (w.healT > 0) kkTint(cx, '#e8ffee', .55 * w.healT / 36); }
    ctx.save(); ctx.globalAlpha = alpha;
    if (w.state === 'ground' || w.state === 'dead') { const hh = Math.max(0, (w.hop || 0) / 200); ctx.fillStyle = 'rgba(0,0,0,' + (.3 * (1 - Math.min(.7, hh))) + ')'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 95 * s * (1 - Math.min(.4, hh)), 9 * s, 0, 0, 6.283); ctx.fill(); }   // ground shadow
    ctx.translate(w.x, w.y - (w.hop || 0) - (w.flyOff || 0)); ctx.scale((w.face || 1) * s, s);
    ctx.drawImage(cv, -KK.AX, -KK.FY);
    ctx.restore();
    if (w.state === 'dead' || w.state === 'drown') return;
    const T = G.teams[w.team], y = w.y - (w.hop || 0) - 215 * s, bw = 46 * Math.max(1, (w.sc || 1) * .85);   // labels (same as every other worm)
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(w.name, w.x, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(w.name, w.x, y - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w.x - bw / 2 - 1, y - 8, bw + 2, 8); ctx.fillStyle = T.color; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 6);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 2);
    ctx.font = '700 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(w.hp, w.x, y + 6); ctx.fillText(w.hp, w.x, y + 6);
    if (isActive && (G.phase === 'aim' || G.phase === 'retreat')) { const b = Math.sin(t / 8) * 4; ctx.fillStyle = T.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y - 24 + b); ctx.lineTo(w.x - 9, y - 40 + b); ctx.lineTo(w.x + 9, y - 40 + b); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.restore();
  };

  // ---------- sounds ----------
  const _play = Snd.play;
  Snd.play = function (n, a) {
    if (n === 'kk_roar') {   // a deep gorilla roar: low growl + rough noise + a chest boom
      if (!this.ctx || this.muted) return;
      this.tone('sawtooth', 190, 80, 1.3, .3); this.tone('sawtooth', 140, 60, 1.2, .22, .06); this.tone('square', 95, 45, 1.1, .12, .1);
      this.noise(1.3, .4, 'bandpass', 1100, 220); this.tone('sine', 70, 28, 1.0, .6, .05); this.noise(.8, .4, 'lowpass', 900, 70, .1); return;
    }
    return _play.call(this, n, a);
  };

  // ---------- movement helpers ----------
  const stride = w => KK_STRIDE * sz(w);
  const bob = w => Math.abs(Math.sin(Math.PI * 2 * (w.kkPh || 0))) * 6 * px(w);   // two small bounces per run cycle
  const KKX = {
    // one run tick toward tx: 'go' | 'done' | 'blocked'. Speeds up at the start and slows down towards tx (S.v = current speed).
    run(w, S, tx, spMax, goalPad) {
      const d = tx - w.x, ad = Math.abs(d); if (S.v == null) { S.v = spMax * .3; S.rt = 0; if (S.stuck == null) S.stuck = 0; }
      const cap = Math.max(spMax * .4, Math.min(spMax, ad * .06 + 2)); S.v += (cap - S.v) * .16;
      if (ad <= (goalPad || 4) + .5) return 'done';
      const dir = d > 0 ? 1 : -1; w.face = dir; const x0 = w.x, step = Math.min(S.v, ad);
      if (!placeOnGround(w, w.x + dir * step) || Math.abs(w.x - x0) < .05) { if (++S.stuck > 8) return 'blocked'; } else S.stuck = 0;
      w.kkPh = (w.kkPh || 0) + Math.abs(w.x - x0) / stride(w);   // the legs follow the ground
      S.rt++; w.actF = S.rt < 9 ? [S.from != null ? S.from : KK.IDLE, KK.RUN, ease(S.rt / 9)] : runPose(w); w.hop = bob(w);
      if (S.rt % 6 === 0 && S.v > spMax * .5) addFx('smoke', w.x - w.face * 50 * sz(w), w.y - 4, .7);
      if (S.rt % 12 === 0) shake(2.5);
      return 'go';
    },
    // slow down and settle into the idle pose. true when finished
    stop(w, S) {
      if (!S.rt && !S.st) return true;
      const st = S.st || (S.st = { t: 0, v: Math.max(S.v || 5, 3), from: KK.RUN });
      st.t++;
      if (st.t <= 10) { st.v *= .8; const x0 = w.x; placeOnGround(w, w.x + w.face * st.v); w.kkPh = (w.kkPh || 0) + Math.abs(w.x - x0) / stride(w); w.actF = runPose(w); w.hop = bob(w) * .5; st.from = dom(w.actF); return false; }
      const k = (st.t - 10) / 8; w.hop = 0; w.actF = [st.from, KK.IDLE, ease(k)];
      if (k >= 1) { S.st = null; S.v = null; S.rt = 0; w.kkPh = 0; w.actF = null; return true; }
      return false;
    },
    groundAhead(w, dir) { const T = G.terrain, sc = w.sc || 1, x = w.x + dir * (11 * sc + 8); for (let k = 2; k <= 46; k += 4) if (T.solid(x, w.y + k)) return true; return false; },
    // a free standing spot next to the target, on HIS level (his side first, then the other side, then closer and closer)
    landSpot(w, tg, stop) {
      const T = G.terrain, sc = w.sc || 1, side0 = w.x <= tg.x ? -1 : 1;
      for (const f of [1, .65, .35, 0]) for (const side of [side0, -side0]) {
        const x = clamp(tg.x + side * stop * f, 100, WORLD_W - 100), y = T.surfaceBelow(x, Math.max(0, tg.y - 90)); if (y < 0 || Math.abs(y - tg.y) > 42 || y > WATER_Y - 60) continue;
        if (blocked(x, y - 2, sc) || !onGround(x, y, sc) || !T.solid(x - 8 * sc, y + 2) || !T.solid(x + 8 * sc, y + 2)) continue; return { x, y: y - 1 };
      }
      return null;
    },
    // the level the target is on: his own y when he stands, the floor below him when he is in the air (jet / knocked up)
    level(tg) { if (tg.state === 'ground') return tg.y; const sy = G.terrain.surfaceBelow(tg.x, Math.max(0, tg.y - 20)); return sy >= 0 && sy < WATER_Y - 40 ? sy : null; },
    pickJump(w) {   // a random spot to land on: the ground or any floating platform, far from here, not next to a player
      const T = G.terrain, sc = w.sc || 1, fs = foes(w);
      for (let i = 0; i < 60; i++) {
        const x = rnd(300, WORLD_W - 300); if (Math.abs(x - w.x) < 380) continue;
        const y = T.surfaceBelow(x, 0); if (y < 0 || y > WATER_Y - 60) continue;
        if (blocked(x, y - 2, sc) || !onGround(x, y, sc) || !T.solid(x - 8 * sc, y + 2) || !T.solid(x + 8 * sc, y + 2)) continue;
        if (fs.some(p => Math.abs(p.x - x) < 150 && Math.abs(p.y - y) < 150)) continue;
        return { x, y: y - 1 };
      }
      return null;
    },
    leapStart(w, S, sp, banner, tgName) {
      const s = sz(w), dist = Math.abs(sp.x - w.x), from = w.actF != null ? dom(w.actF) : KK.IDLE;
      S.lp = { sp, t: 0, x0: w.x, y0: w.y, hov0: !!w.hover, c: 12, k: 5, ft: Math.round(clamp(34 + dist / 15, 34, 72)), apex: 190 * s, from };
      w.face = sp.x >= w.x ? 1 : -1; w.hover = true; w.hop = 0; w.actF = null; if (banner) { showBanner('⚠ ' + w.name + ' leaps to ' + tgName + '!', '#ffb347'); Snd.play('slash', .7); } return true;
    },
    leapStep(w, L) {   // crouch -> take off -> flight (arc, arms go up) -> touchdown. true = he has just landed
      L.t++; const t = L.t, sp = L.sp, J = KK.JUMP, T0 = L.c + L.k, FT = L.ft, s = sz(w);
      if (t <= L.c) { w.actF = [L.from, J, sh(t / L.c)]; w.hop = 0; return false; }
      if (t <= T0) { w.actF = [J, J + 1, sh((t - L.c) / L.k)]; return false; }
      if (t <= T0 + FT) {
        const a = (t - T0) / FT, e = a * a * (3 - 2 * a), up = Math.max(0, L.y0 - sp.y);
        w.x = L.x0 + (sp.x - L.x0) * e; w.y = L.y0 + (sp.y - L.y0) * e; w.hop = Math.sin(Math.PI * a) * (L.apex + up * .35); w.face = sp.x >= L.x0 ? 1 : -1;
        w.actF = a < .2 ? [J + 1, J + 2, sh(a / .2)] : a < .42 ? [J + 2, J + 3, sh((a - .2) / .22)] : a < .7 ? [J + 3, J + 4, sh((a - .42) / .28)] : [J + 4, J + 5, sh((a - .7) / .3)];
        if (t % 4 === 0) addFx('smoke', w.x - w.face * 40 * s, w.y - w.hop + 20, .5); return false;
      }
      w.x = sp.x; w.y = sp.y; w.hop = 0; w.hover = L.hov0; w.vx = w.vy = 0; w.state = 'ground'; return true;
    },
    // ---------- the shared "run to a player, jump onto him" part of every attack. 'go' | 'landed' | 'noleap' | 'abort' ----------
    hunt(w, S) {
      const tg = S.tg, t = S.t, s = sz(w);
      if (!tg || tg.state === 'dead' || tg.state === 'drown') { if (S.ph === 'leap') w.hover = false; return 'abort'; }
      if (S.ph === 'run') {
        const ty = this.level(tg), dy = ty == null ? 0 : ty - w.y, need = dy < -KK_LEAP_DY ? 'up' : dy > KK_LEAP_DY ? 'down' : null, dir = tg.x >= w.x ? 1 : -1, dist = Math.abs(tg.x - w.x);
        const from = need === 'up' ? 380 * s : need === 'down' ? 70 * s : KK_JUMP_FROM * s, edge = need === 'down' && !this.groundAhead(w, dir);
        const r = dist <= from || edge ? 'done' : this.run(w, S, tg.x, KK_RUN * s, from); face(w, tg);
        if (r === 'go' && t - S.t0 < 340) return 'go';
        const sp = ty == null ? null : this.landSpot(w, { x: tg.x, y: ty }, KK_LAND * s);
        if (!sp) { S.ph = 'stopnl'; return 'go'; }
        S.v = null; S.rt = 0; w.kkPh = 0; S.ph = 'leap'; this.leapStart(w, S, sp, true, tg.name); return 'go';   // the run flows straight into the crouch
      }
      if (S.ph === 'stopnl') return this.stop(w, S) ? 'noleap' : 'go';
      if (S.ph === 'leap') { if (this.leapStep(w, S.lp)) { S.lp = null; face(w, tg); return 'landed'; } return 'go'; }
      return 'go';
    },
    // ---------- a ground smash: damage to everybody near the fist, NO knockback ----------
    impact(w, mul, ring) {
      const s = sz(w), ix = w.x + w.face * KK_FRONT * s, iy = w.y, d0 = dmgK(w, mul); let n = 0;
      shake(34); Snd.play('mp3_kk_smash'); addFx('explosion_small', ix, iy - 10, 1.5); debris(ix, iy - 4, 24, 'dirt'); debris(w.x, iy - 4, 10, 'dirt'); ringFx(ix, iy - 4, '#ffcf8a'); ringFx(ix, iy - 4, '#fff2cf', 8);
      for (const p of foes(w)) {
        const [pcx, pcy] = bodyCenter(p), d = Math.hypot(pcx - ix, pcy - (iy - 30)); if (d > KK_SMASH_R * s) continue;
        n++; hurt(p, Math.max(1, Math.round(d0 * (1 - .4 * d / (KK_SMASH_R * s))))); addFx('spark_hit', pcx, pcy, 1.2);
      }
      if (!n) addPop(ix, iy - 120, 'miss', '#cdd', 16);
      showBanner(ring || 'SMASH!', '#ff9a4a');
    },
    // ---------- the roar: a round shockwave around his head, damage + a LITTLE knockback ----------
    roar(w) {
      const [x] = [w.x + w.face * 52 * px(w)], y = w.y - (w.hop || 0) - 125 * px(w), d0 = dmgK(w, KK_ROAR_MUL), R = KK_ROAR_R * sz(w), [bx, by] = bodyCenter(w);
      shake(38); Snd.play('mp3_kk_roar');
      addFx('kk_roar_wave', x, y, 2 * R / 256 * 1.02, { alpha: .6 }); ringFx(x, y, '#ffcf8a'); ringFx(x, y, '#ffffff', 7);
      for (const p of foes(w)) {
        const [pcx, pcy] = bodyCenter(p), d = Math.hypot(pcx - x, pcy - y); if (d > R) continue;
        const k = d / R; BOSS3.later(Math.round(k * 14), () => {
          if (p.state === 'dead' || p.state === 'drown') return;
          hurt(p, Math.max(1, Math.round(d0 * (1 - .35 * k)))); if (p.state !== 'dead') knockWorm(p, (p.x >= x ? 1 : -1) * (1.8 - .8 * k), -(2.6 - 1.0 * k));
          addFx('spark_hit', pcx, pcy, 1.2);
        });
      }
      BOSS3.later(22, () => showBanner('ROAR!  (everyone in the ring is hurt)', '#ffb347'));
    },
    // ---------------- 30% HP: pounds his chest (12 frames) and calls ONE brown clan Kong that falls from the sky beside him ----------------
    thump(w) { const [bx, by] = bodyCenter(w); shake(14); Snd.play('boom', .8); ringFx(bx + w.face * 20, by, '#ffcf8a'); addFx('smoke', w.x - w.face * 40 * sz(w), w.y - 6, .6); debris(w.x, w.y - 4, 6, 'dirt'); },
    callClan(boss) {
      if (boss.kkClanOut) return; boss.kkClanOut = true;
      const s = sz(boss), tg = nearestFoe(boss), pseudo = { x: tg ? tg.x : boss.x + 1, sc: boss.sc }; let sp = null;
      for (const d of [1, 1.3, 1.6]) { sp = this.landSpot(pseudo, { x: boss.x, y: boss.y }, KK_CLAN_DIST * s * d); if (sp && Math.abs(sp.x - boss.x) > 110 * s) break; sp = null; }
      if (!sp) sp = { x: clamp(boss.x + (boss.x < WORLD_W / 2 ? 1 : -1) * KK_CLAN_DIST * s, 120, WORLD_W - 120), y: boss.y };
      const hp = Math.max(1, Math.round((boss.maxHp || boss.hp) * KK_CLAN_HP)); G.minionSeq = (G.minionSeq | 0) + 1;
      const rob = Object.assign({}, boss.rob, { id: 'minion_kong', name: 'Clan Kong', act: KK_ACT_BR });
      const mw = { id: 'C18_Kong_Smash', art: 'M0_Blank', name: 'Kong Smash', desc: 'Smash / roar', ammo: Infinity, type: 'melee', range: 0, dmg: Math.round(bossBaseDmg(boss) * KK_CLAN_DMG), knock: 0, fx: 'spark_hit', snd: 'slash', carve: 0, minion: true };
      const m = { team: boss.team, idx: 50 + G.minionSeq, sc: boss.sc, name: 'Clan Kong', minion: true, kkClan: true, kkBoss: boss, hover: false, mw, rob, x: sp.x, y: sp.y, vx: 0, vy: 0, hp, maxHp: hp, face: tg ? (tg.x >= sp.x ? 1 : -1) : boss.face, aim: 0, state: 'ground', knocked: false, bounces: 0, wf: 0, fi: 8, walkAcc: 0, walking: 0, flash: 0, frozen: 0, dt: 0, fallPeak: 0,
        hop: KK_CLAN_DROP * s, kkDrop: { v: 5 }, actF: [KK.JUMP + 3, KK.JUMP + 5, 0] };
      G.worms.push(m); G.queue.push(m); showBanner('⚠ A CLAN KONG answers the call!', '#c58a4a'); Snd.play('slash', .8);
    },
    s_kk_pound(w, S) {
      const u = S.t; w.hop = 0; w.actF = keys(KK_T_POUND, u);
      if (u === 1) { const n = nearestFoe(w); if (n) face(w, n); showBanner('⚠ ' + w.name + ' pounds his chest - he calls his CLAN!', '#ffb347'); }
      if (u === 30 || u === 90) Snd.play('mp3_kk_roar');
      if (u === 32 || u === 62 || u === 92 || u === 122) this.thump(w);
      if (u === 66) this.callClan(w);
      if (u > 150) { w.actF = null; return true; } return false;
    },
    pickTarget(w, S, msg) {
      const fs = foes(w); if (!fs.length) return false; S.tg = fs[rint(0, fs.length - 1)]; S.ph = 'run'; S.stuck = 0; S.t0 = S.t; S.u = 0; S.v = null; S.rt = 0; w.kkPh = 0; face(w, S.tg);
      showBanner('⚠ ' + w.name + ' hunts ' + S.tg.name + '!  ' + msg, '#ffb347'); Snd.play('slash', .6); return true;
    },
    // ---------------- 1) move first: run OR jump to a random spot ----------------
    s_kk_move(w, S) {
      const t = S.t, s = sz(w);
      if (t === 1) {
        S.stuck = 0; S.v = null; S.rt = 0; w.kkPh = 0; S.mode = null;
        if (Math.random() < KK_JUMP_CHANCE) { const sp = this.pickJump(w); if (sp) { S.mode = 'jump'; this.leapStart(w, S, sp, false); } }
        if (!S.mode) { let dir = Math.random() < .5 ? -1 : 1; if (AI.edgeNear(w, dir)) dir = -dir; if (AI.edgeNear(w, dir)) return true; S.mode = 'run'; S.ph = 'run'; S.tx = clamp(w.x + dir * rnd(KK_STEP_MIN, KK_STEP_MAX), 300, WORLD_W - 300); w.face = dir; }
      }
      if (S.mode === 'jump') {
        if (S.ph !== 'land') { if (this.leapStep(w, S.lp)) { S.ph = 'land'; S.u = 0; shake(18); Snd.play('boom', .8); debris(w.x, w.y - 4, 12, 'dirt'); addFx('smoke', w.x, w.y - 10, 1.1); } return false; }
        S.u++; w.hop = 0; w.actF = keys([[0, KK.JUMP + 5], [4, KK.JUMP + 6], [10, KK.JUMP + 6], [20, KK.JUMP + 7], [32, KK.IDLE]], S.u); if (S.u > 32) { w.actF = null; return true; } return false;
      }
      if (S.ph === 'run') { const r = this.run(w, S, S.tx, KK_RUN * s, 20 * s); if (r !== 'go' || t > 220) S.ph = 'stop'; return false; }
      return this.stop(w, S);
    },
    // ---------------- 2) turn 1: run, jump onto a player, ONE smash ----------------
    s_kk_smash(w, S) {
      if (S.t === 1 && !this.pickTarget(w, S, 'SMASH!')) return true;
      if (S.ph !== 'act') { const r = this.hunt(w, S); if (r === 'abort') return true; if (r === 'landed' || r === 'noleap') { S.ph = 'act'; S.u = 0; } return false; }
      const u = ++S.u; w.hop = 0; w.actF = keys(KK_T_SMASH, u); if (u === 1) { face(w, S.tg && S.tg.state !== 'dead' ? S.tg : null); this.impact(w, KK_SMASH_MUL); }
      if (u > 62) { w.actF = null; return true; } return false;
    },
    // ---------------- 3) turn 2: run, jump onto a player, TWO smashes ----------------
    s_kk_double(w, S) {
      if (S.t === 1 && !this.pickTarget(w, S, 'DOUBLE SMASH!')) return true;
      if (S.ph !== 'act') { const r = this.hunt(w, S); if (r === 'abort') return true; if (r === 'landed' || r === 'noleap') { S.ph = 'act'; S.u = 0; } return false; }
      const u = ++S.u; w.hop = 0; w.actF = keys(KK_T_DOUBLE, u);
      if (u === 1) { face(w, S.tg && S.tg.state !== 'dead' ? S.tg : null); this.impact(w, KK_DBL_MUL, 'SMASH!  (1 of 2)'); }
      if (u === 36) { const n = nearestFoe(w); if (n) face(w, n); }
      if (u === 65) this.impact(w, KK_DBL_MUL, 'SMASH!  (2 of 2)');
      if (u > 112) { w.actF = null; return true; } return false;
    },
    // ---------------- 4) turn 3: run, jump onto a player, ROAR ----------------
    s_kk_roar(w, S) {
      if (S.t === 1 && !this.pickTarget(w, S, 'He is going to ROAR!')) return true;
      if (S.ph !== 'act') { const r = this.hunt(w, S); if (r === 'abort') return true; if (r === 'landed' || r === 'noleap') { S.ph = 'act'; S.u = 0; } return false; }
      const u = ++S.u; w.hop = 0; w.actF = keys(KK_T_ROAR, u);
      if (u === 1) { face(w, S.tg && S.tg.state !== 'dead' ? S.tg : null); shake(20); Snd.play('boom', .9); debris(w.x, w.y - 4, 14, 'dirt'); addFx('smoke', w.x, w.y - 10, 1.2); }
      if (u === 46) this.roar(w);
      if (u > 46 && u < 70 && u % 8 === 0) shake(8);
      if (u > 98) { w.actF = null; return true; } return false;
    },
  };
  window.KKX = KKX;

  // ---------- hook the boss3 framework ----------
  const _think = BOSS3.think;
  BOSS3.think = function (w, ai) {
    if (!isK(w)) return _think.call(this, w, ai);
    if (!w.kkCalled && w.maxHp && w.hp > 0 && w.hp <= w.maxHp * KK_POUND_HP) { w.kkCalled = true; return this.start(w, ai, 'kk_pound'); }   // 0) 30% health or below: pound the chest, call the clan (once), then the normal turn goes on
    if (!ai.b3hop) { ai.b3hop = true; ai.bmoved = true; w.kkPh = 0; return this.start(w, ai, 'kk_move'); }                                        // 1) move first (run or jump)
    if (!ai.b3done) { ai.b3done = true; const m = (w.bt | 0) % 3; return this.start(w, ai, m === 1 ? 'kk_smash' : m === 2 ? 'kk_double' : 'kk_roar'); }   // 2) turn 1 smash, turn 2 double smash, turn 3 roar
    return false;
  };
  const _step = BOSS3.step;
  BOSS3.step = function (w, ai) {
    const S = w.b3; if (!S || String(S.k).indexOf('kk_') !== 0) return _step.call(this, w, ai);
    S.t++; let fin; try { fin = KKX['s_' + S.k](w, S); } catch (e) { console.error('kong script error', e); fin = true; }
    if (!fin) return;
    w.b3 = null; w.actF = null; w.hop = 0; w.hover = false; w.kkPh = 0;
    if (S.k === 'kk_move' || S.k === 'kk_pound') { ai.st = 'think'; ai.t = 10; } else this.endTurn(w, ai);
  };
  const _as = BOSS3.assets; BOSS3.assets = function (st) {
    if (Assets.fx) Assets.fx.kk_roar_wave = WAVE_FX; const pre = p => loadImage(p).then(im => (im && im.decode ? im.decode().catch(() => { }) : 0)).catch(() => { });
    return _as.call(this, st).concat([pre(KK_ACT), pre(KK_ACT_BR), pre(KK_POUND), pre(KK_WAVE), pre('fx/spark_hit.webp'), pre('fx/smoke.webp'), pre('fx/explosion_small.webp')]);
  };
  // ---------- clan Kong: falls from the sky when called, then acts in the shared minion turn with the same moves (move -> smash / double smash / roar), no chest pound ----------
  const _up = BOSS3.update;
  BOSS3.update = function () {
    _up.call(this);
    if (!G.adv) return;
    for (const m of G.worms) {
      const D = m.kkDrop; if (!D || m.state === 'dead' || m.state === 'drown') continue;
      const s = sz(m), H = KK_CLAN_DROP * s;
      if (!D.land) {   // falling: arms go up, then he braces for the landing
        D.v += .8; m.hop -= D.v; m.actF = [KK.JUMP + 3, KK.JUMP + 5, ease(1 - m.hop / H)];
        if (m.hop <= 0) { m.hop = 0; D.land = 1; D.u = 0; shake(30); Snd.play('boom', 1.3); Snd.play('boom', 1); debris(m.x, m.y - 4, 22, 'dirt'); addFx('smoke', m.x, m.y - 10, 1.4); addFx('explosion_small', m.x, m.y - 10, 1.2); ringFx(m.x, m.y - 4, '#ffcf8a'); ringFx(m.x, m.y - 4, '#fff2cf', 8); showBanner('CLAN KONG lands!', '#c58a4a'); }
      } else {         // crouch on landing, then stand up
        D.u++; m.actF = keys([[0, KK.JUMP + 5], [4, KK.JUMP + 6], [10, KK.JUMP + 6], [20, KK.JUMP + 7], [32, KK.IDLE]], D.u);
        if (D.u > 32) { m.actF = null; m.kkDrop = null; }
      }
    }
  };
  const _ss = AI.swarmStep;
  AI.swarmStep = function (m) {
    if (!m.kkClan) return _ss.call(this, m);
    if (m.state === 'dead' || m.state === 'drown') { m.done = true; return; }
    if (m.kkDrop) { G.timer = Math.max(G.timer, 120); return; }   // still falling in: wait
    if (m.state !== 'ground' && !m.hover) return;
    if (m.kkSw !== G.swarm) {   // a new minion turn: turn 1 smash, turn 2 double smash, turn 3 roar (then it repeats), always moving first
      m.kkSw = G.swarm; m.kkTurn = (m.kkTurn | 0) + 1; const k = m.kkTurn % 3; m.kkQ = ['move', k === 1 ? 'smash' : k === 2 ? 'double' : 'roar']; m.kkS = null; m.hover = false; m.hop = 0; m.flyOff = 0; m.actF = null; m.kkPh = 0; m.lp = null;
    }
    if (!m.kkQ || !m.kkQ.length) { m.done = true; return; }
    if (!m.kkS) m.kkS = { k: 'kk_' + m.kkQ[0], t: 0 };
    G.timer = Math.max(G.timer, 120);   // the whole run + jump + smash takes longer than the normal 12 s minion turn: keep the turn alive while he is busy
    const S = m.kkS; S.t++; let fin; try { fin = KKX['s_' + S.k](m, S); } catch (e) { console.error('clan kong script error', e); fin = true; }
    if (fin) { m.kkQ.shift(); m.kkS = null; m.kkPh = 0; if (!m.kkQ.length) { m.kkQ = null; m.actF = null; m.hop = 0; m.hover = false; m.done = true; } }
  };
  console.log('kong.js loaded - King Kong (Ember Forge HEROIC, replaces the Cinder Drake there)');
})();
