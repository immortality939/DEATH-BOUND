/* ONLINE VERSION of golem.js - upload this file to GitHub (online game only).
   The offline app keeps using golem.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  MAGMA GOLEM  (the new last Adventure map "Molten Quarry" - the map is WIDER (3400 px) than the other maps, the golem is its boss on NORMAL, HARD and HEROIC)
//
//  EVERY TURN, first:  MOVE - the golem walks a few steps left or right on his own (to find his throwing angle).
//  Then, depending on the turn:
//    turn 1, 2, 5, 7, 10, 11 ...  THROW ROCK     winds up (throw sprites), a big lava rock grows in his fist, the arm swings over and he throws it at a random
//                                                player. The rock turns very slowly, leaves a rock-chip trail, and when it hits the ground or a player: rock-hit
//                                                sprite + brown smoke + a small crater. Everybody close to the blast is hurt, the closer the more (no knockback).
//    every 3rd turn               SMASH GROUND   walks up to a random player, raises both fists and smashes the ground (area damage by distance, no knockback),
//                                                then walks back to the spot he started from.
//    every 4th turn               STOMP          faces the nearest player and stomps: a rock shockwave runs over the FLOOR toward the player (not very fast).
//                                                Everybody the wave touches takes strong damage. Players standing on a floating platform / flying are safe.
//                                                (turn 12, 24 ... are both a 3rd and a 4th turn: the stomp wins)
//  Sheet  adventure/boss_golem_act.webp  (28 frames, 352x352, 7 per row).  EVERY frame has the same scale, the same cell and is anchored on his feet (y) and
//  body (x) so nothing jumps or changes size when the picture changes.   idle 0-3 | walk 4-7 | throw 8-11 | smash 12-15 | stomp 16-19 | death 20-27
//  Neighbouring frames are always cross-faded (smooth), the walk cycle follows the distance he really walks (no foot sliding).
//  Built on the boss3.js framework (same pattern as kong.js): wraps BOSS3.think / step / assets / update, drawWorm, bodyShapes, detonate, newGame.
//  Tuning numbers are all at the top of this file.
// ============================================================================================================

// ---- TUNING ----
const GM_W = 3400;                  // width of the Molten Quarry maps (the other maps are 2800)
const GM_SC = 3.0;                  // collision size (he must fit under the floating platforms); the picture size is GM_PX
const GM_PX = 1.5;                  // world px per sprite px (boss size). Idle = 388 px tall = 35% taller than King Kong (288 px)
const GM_WALK = 4.2;                // "move first" walking speed (px per tick)
const GM_RUN = 9;                 // walking speed when he goes to a player (smash) and back
const GM_STRIDE = 450;              // world px for ONE full walk cycle (4 frames). Bigger = slower legs for the same speed
const GM_STEP_MIN = 240, GM_STEP_MAX = 470;   // the "move first" distance
const GM_ROCK_DMG = 96;             // boss weapon damage (rock throw); smash and stomp are multiples of it
const GM_ROCK_BLAST = 115;          // rock blast radius: damage = full at the centre, 0 at the edge
const GM_ROCK_SS = .27;             // rock picture size (the rock is about as big as a player robot)
const GM_ROCK_SPIN = .028;          // rock rotation per tick (very slow)
const GM_G = .12;                   // rock gravity
const GM_AIM_ERR = 55;              // aim error (px) - he is good, but not perfect
const GM_SMASH_R = 380;             // reach of a ground smash (px from the fists, every player inside is hit)
const GM_SMASH_MUL = 1.5;           // smash damage = boss weapon damage x this (at the fists, down to 35% at the edge)
const GM_SMASH_STAND = 100;         // he stops this close (px) to the player before he smashes
const GM_WAVE_SPEED = 6;            // stomp shockwave speed (px per tick) - slower than the minotaur wave (9)
const GM_WAVE_MAX = 3300;          // how far the shockwave runs (the whole wide map)
const GM_WAVE_R = 62;               // how wide it hurts (px each side of the crest)
const GM_WAVE_MUL = 2.2;            // shockwave damage = boss weapon damage x this (strong)
const GM_JUMP_IMG = 'adventure/boss_golem_jump.png';   // 10 frames, 5 per row, SAME 352x352 cell / scale / feet line as the act sheet (poses 100-109 in the code)
const GM_JUMP_MUL = 1.7;            // jump landing damage = boss weapon damage x this (by distance from the landing spot, no knockback)
const GM_JUMP_UP_MUL = 2.6;         // ... x this instead when he lands UP on a floating platform (stronger)
const GM_JUMP_R = 330;              // landing blast reach (px) - damage falls to 35% at the edge
const GM_JUMP_APEX = 250;           // jump height above the straight line (px, boss size)
const GM_LAND = 150;                // he lands this far (px, boss size) from the player
const GM_LEAP_DY = 55;              // height difference (px) that means the player stands on another floor (jump up / down)
const GM_SHAKE_SMASH = 40;          // camera shake when the fists hit the ground (smash)
const GM_SHAKE_STEP = 7, GM_SHAKE_TAKEOFF = 18, GM_SHAKE_LAND = 46;   // camera shake: foot on the ground / take-off / landing
const GM_WAVE_FX = .75;             // size of the rock burst sprites along the wave

// Molten Quarry solid ground (same numbers the PNGs were painted with)
const GM_ARENA_PLAT = [[800, 1220, 330, 56], [1380, 2020, 210, 60], [2180, 2600, 330, 56], [2640, 2880, 170, 44]];   // floating platforms: x0, x1, top y, thickness
const GM_QUARRY_PLAT = [[1000, 1350, 500, 52], [1700, 2150, 420, 56], [2250, 2520, 520, 48]];

const GM = { CW: 352, CH: 352, AX: 176, FY: 338, COLS: 7, IDLE: 0, WALK: 4, THROW: 8, SMASH: 12, STOMP: 16, DEATH: 20 };
const GM_ACT = 'adventure/boss_golem_act.webp', GM_JUMP = GM_JUMP_IMG, GM_ROCK = 'proj/C19_Golem_Rock_proj.png';
const GM_HAND = { 9: [100, 135], 10: [100, 80], 11: [268, 172] };   // fist position (sprite px in the 352 cell) in the throw frames 9 / 10 / 11
// timelines (tick -> frame; frames are cross-faded between the keys)
const GM_T_THROW = [[0, 0], [12, 8], [26, 8], [38, 9], [52, 10], [68, 10], [78, 11], [100, 11], [118, 0]];
const GM_T_SMASH = [[0, 0], [10, 12], [20, 12], [34, 13], [48, 14], [60, 14], [66, 15], [84, 15], [104, 0]];
const GM_JF = [338, 300, 256, 271, 260, 338, 338, 338, 338, 338];   // jump poses: cell y of the body bottom (feet). Flight poses are higher in the cell, the code lifts the sprite by the difference
const GM_T_LAND = [[0, 105], [8, 105], [16, 106], [26, 107], [38, 108], [50, 109], [64, 109], [82, 0]];   // after touch-down: dust burst -> settle -> idle
const GM_T_LAND2 = [[0, 105], [6, 106], [14, 107], [22, 108], [30, 109], [40, 0]];   // short touch-down recovery before a jump-smash
const GM_T_STOMP = [[0, 0], [12, 16], [26, 17], [44, 18], [58, 18], [66, 19], [90, 19], [112, 0]];

(function () {
  const isG = w => !!(w && w.rob && w.rob.b3 === 'golem');
  const ease = a => { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); };
  const px = w => GM_PX * (w.sc || GM_SC) / GM_SC;                        // world px per sprite px
  const face = (w, t) => { if (t) w.face = t.x >= w.x ? 1 : -1; };
  const foes = w => BOSS3.foes(w);
  const dmgG = (w, mul) => BOSS3.dmg(w, mul);
  const lerpA = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const dom = p => Array.isArray(p) ? (p[2] < .5 ? p[0] : p[1]) : p;     // the frame a pose looks most like
  const keys = (K, t, hold) => {                                          // timeline -> pose. hold = share of each step the frame stays still before it blends on
    hold = hold == null ? .25 : hold; if (t <= K[0][0]) return K[0][1];
    for (let i = 0; i < K.length - 1; i++) if (t < K[i + 1][0]) { const a = K[i], b = K[i + 1]; return a[1] === b[1] ? a[1] : [a[1], b[1], ease(((t - a[0]) / (b[0] - a[0]) - hold) / (1 - hold))]; }
    return K[K.length - 1][1];
  };
  const groundOf = w => w.y;

  // ---------- the boss weapon: the thrown rock ----------
  SIG_WMETA['C19_Golem_Rock'] = { muzzle: [170, 128], bbox: [0, 0, 1, 1] };
  if (!WEAPONS.find(x => x.id === 'C19_Golem_Rock')) WEAPONS.push(CBOSS_W('C19_Golem_Rock', 'boss_golem', 'Lava Boulder', 'A huge lava rock thrown by the golem. Damage by distance, no knockback. Every 3rd turn he smashes the ground, every 4th turn he stomps a shockwave.', { dmg: GM_ROCK_DMG, blast: GM_ROCK_BLAST, knock: 0, ss: GM_ROCK_SS, spin: GM_ROCK_SPIN, g: GM_G, hit: null, hs: 1, snd: 'rocket' }));
  const wd = WEAPONS.find(x => x.id === 'C19_Golem_Rock');
  if (wd) { wd.art = 'M0_Blank'; Object.assign(wd.proj, { wind: 0, knock: 0, noKnock: true, carve: 0, golem: true, hit: null, spin: GM_ROCK_SPIN, g: GM_G, life: 1400 }); }

  // ---------- new Adventure map (the new last one) ----------
  const gtop = x => x < 300 ? 800 + Math.pow((300 - x) / 300, 1.7) * 150 : x > 3100 ? 800 + Math.pow((x - 3100) / 300, 1.7) * 150 : 800;
  const qtop = x => 790 + 34 * Math.sin(x / 310) + 20 * Math.sin(x / 97 + 1) + (x < 300 ? Math.pow((300 - x) / 300, 1.7) * 150 : x > 3100 ? Math.pow((x - 3100) / 300, 1.7) * 150 : 0);
  const pbot = (x, p) => { const u = (x - p[0]) / (p[1] - p[0]); return p[2] + 14 + (p[3] - 14) * Math.sqrt(Math.max(0, 1 - (2 * u - 1) * (2 * u - 1))); };
  const runs = (top, plats) => Array.from({ length: GM_W }, (_, x) => { const r = []; for (const p of plats) if (x >= p[0] && x < p[1]) r.push(Math.floor(p[2]), Math.round(pbot(x + .5, p))); r.push(Math.round(top(x + .5)), WORLD_H); return r; });
  MAP_RUNS['adv_quarry'] = runs(qtop, GM_QUARRY_PLAT);
  MAP_RUNS['adv_quarry_arena'] = runs(gtop, GM_ARENA_PLAT);
  const ANCH = Array.from({ length: 9 }, () => ({ n: [238, 300], f: [238, 300] }));
  ADV_MAPS.push({
    id: 'quarry', name: 'Molten Quarry', thumb: 'assets/adventure/thumb_golem.png',
    desc: 'A huge, wide basalt quarry split by lava cracks and floating rock. Cross it and face the Magma Golem: he throws lava boulders, smashes the ground and stomps shockwaves across the floor.',
    maps: {
      main:  { id: 'adv_quarry', name: 'Molten Quarry', bg: 'b3_golem', img: 'adventure/golem_quarry.png', w: GM_W },
      arena: { id: 'adv_quarry_arena', name: 'Golem Forge', bg: 'b3_golem', img: 'adventure/arena_golem.png', w: GM_W },
    },
    stages: [   // continues the climb of the Void Rift (hp 228-258, attack +46-58%)
      { name: 'Slag Gate',       map: 'main', n: 3, hp: 268, diff: 2, robot: 5, pow: 62, px: [600, 720, 840], ex: [2640, 2740, 2840] },
      { name: 'Basalt Steps',    map: 'main', n: 3, hp: 278, diff: 2, robot: 2, pow: 66, px: [600, 720, 840], ex: [2640, 2740, 2840] },
      { name: 'Cinder Foundry',  map: 'main', n: 4, hp: 288, diff: 2, robot: 9, pow: 70, px: [600, 720, 840], ex: [2600, 2700, 2800, 2900] },
      { name: 'Obsidian Gate',   map: 'main', n: 4, hp: 298, diff: 2, robot: 4, pow: 74, px: [600, 720, 840], ex: [2600, 2700, 2800, 2900] },
      { name: 'Golem Forge', map: 'arena', boss: true, boss2: true, boss3: true, b3: 'golem', noMinions: true, n: 1, hp: 6700, sc: GM_SC, diff: 2, def: 47, pow: 78,
        px: [450, 580, 710], ex: [2950], bossName: 'Magma Golem', bossId: 'boss_golem', sheet: 'adventure/boss_golem_hold.webp', death: 'adventure/boss_golem_hold.webp', act: GM_ACT, anchors: ANCH },
    ],
  });
  // HARD / HEROIC: the golem stays the last boss of the map but gets stronger, so the climb of the earlier maps continues (HP, armor, attack on top of the HARD x1.6 / HEROIC x2.5 multipliers)
  const GM_DIFF = [null, { hp: 1.9, def: 4, pow: 6 }, { hp: 2.5, def: 4, pow: 5 }], GM_CACHE = {};
  const _so = Adventure.stagesOf;
  Adventure.stagesOf = function (M, d) {
    const L = _so.call(this, M, d); if (!M || M.id !== 'quarry') return L;
    d = d == null ? this.diff : d; const k = GM_DIFF[d | 0]; if (!k) return L;
    if (!GM_CACHE[d]) { const last = L[L.length - 1]; GM_CACHE[d] = L.slice(0, -1).concat([Object.assign({}, last, { hp: Math.round(last.hp * k.hp), def: (last.def || 0) + k.def, pow: (last.pow || 0) + k.pow })]); }
    return GM_CACHE[d];
  };
  BOSS_GLOW.golem = '#ff8a2a';
  B3_BY_KIND.golem = { kind: 'golem', key: 'golem', name: 'Magma Golem', wide: 1 };
  const bgs = typeof GAME_DATA !== 'undefined' ? GAME_DATA['bg.json'] : null;
  if (bgs) bgs.b3_golem = { sky: 'bg/b3_golem_sky.webp', far: 'bg/b3_golem_far.webp', mid: 'bg/b3_golem_mid.webp', near: 'bg/b3_golem_near.webp' };
  BG_FILL.b3_golem = [[96, 34, 40], [58, 24, 30], [28, 14, 18]];
  const _dwt = drawWater; drawWater = (ctx, t, th) => _dwt(ctx, t, th === 'b3_golem' ? 'sunset' : th);

  // ---------- the map width: this map is wider than the others ----------
  const _ng = newGame;
  newGame = function (setup) {
    WORLD_W = (setup && setup.map && setup.map.w) || 2800;   // every other map is 2800 wide
    const r = _ng.apply(this, arguments); G.gmWaves = []; return r;
  };

  // ---------- effect sheets ----------
  const FX = {
    golem_hit:   { file: 'fx/golem_hit.webp',   frames: 12, cols: 4, fw: 296, fh: 248, fps: 22, loop: false },
    golem_shock: { file: 'fx/golem_shock.webp', frames: 16, cols: 4, fw: 296, fh: 200, fps: 22, loop: false },
    golem_smoke: { file: 'fx/golem_smoke.webp', frames: 12, cols: 6, fw: 128, fh: 128, fps: 14, loop: false },
    golem_trail: { file: 'fx/golem_trail.webp', frames: 8,  cols: 4, fw: 96,  fh: 96,  fps: 20, loop: false },
  };
  Object.assign(DIVINE_FX, FX); if (Assets.fx) Object.assign(Assets.fx, FX);

  // ---------- hit shapes / body centre ----------
  const _bs = bodyShapes; bodyShapes = w => {
    if (!isG(w)) return _bs(w);
    const s = px(w), f = w.face || 1, fy = w.y - (w.flyOff || 0) - (w.gmH || 0);
    return [[w.x, fy - 100 * s, 78 * s, 100 * s], [w.x + f * 40 * s, fy - 200 * s, 44 * s, 38 * s]];
  };
  const _bc = bodyCenter; bodyCenter = w => isG(w) ? [w.x, w.y - (w.flyOff || 0) - (w.gmH || 0) - 105 * px(w)] : _bc(w);

  // ---------- drawing ----------
  const cv = document.createElement('canvas'); cv.width = GM.CW; cv.height = GM.CH; const cx = cv.getContext('2d');
  let jimg = null;   // the jump sheet (poses 100-109: 5 per row)
  const putFrame = (ctx, img, i, al) => {
    ctx.globalAlpha = al;
    if (i >= 100) { if (jimg) { const j = i - 100; ctx.drawImage(jimg, (j % 5) * GM.CW, Math.floor(j / 5) * GM.CH, GM.CW, GM.CH, 0, 0, GM.CW, GM.CH); } return; }
    ctx.drawImage(img, (i % GM.COLS) * GM.CW, Math.floor(i / GM.COLS) * GM.CH, GM.CW, GM.CH, 0, 0, GM.CW, GM.CH);
  };
  const footOf = i => i >= 100 ? GM_JF[(i - 100) | 0] : GM.FY;
  const poseFoot = pose => Array.isArray(pose) ? footOf(pose[0]) + (footOf(pose[1]) - footOf(pose[0])) * Math.max(0, Math.min(1, pose[2])) : footOf(pose | 0);
  function gmPose(ctx, img, pose) {   // a pose = a frame number, or [frameA, frameB, u] = A cross-faded into B (no see-through dip)
    ctx.clearRect(0, 0, GM.CW, GM.CH); ctx.globalCompositeOperation = 'source-over';
    if (Array.isArray(pose)) { const u = Math.max(0, Math.min(1, pose[2])); if (u < .001) putFrame(ctx, img, pose[0], 1); else if (u > .999) putFrame(ctx, img, pose[1], 1); else { putFrame(ctx, img, pose[0], u < .55 ? 1 : (1 - u) / .45); putFrame(ctx, img, pose[1], u); } }
    else putFrame(ctx, img, pose | 0, 1);
    ctx.globalAlpha = 1;
  }
  function gmTint(ctx, col, a) { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, GM.CW, GM.CH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const IDLE_SEQ = [0, 1, 2, 3, 2, 1];   // the 4 idle pictures as a slow ping-pong (cross-faded)
  const idlePose = w => { const n = IDLE_SEQ.length, v = ((((G.frame | 0) / 16 + (w.idx | 0) * 1.7) % n) + n) % n, i = Math.floor(v); return [IDLE_SEQ[i], IDLE_SEQ[(i + 1) % n], ease(v - i)]; };
  const walkPose = w => { const v = (((w.gmPh || 0) % 1) + 1) % 1 * 4, i = Math.floor(v) % 4; return [GM.WALK + i, GM.WALK + (i + 1) % 4, ease(v - Math.floor(v))]; };
  const handWorld = (w, fr) => { const h = GM_HAND[fr], s = px(w); return [w.x + (w.face || 1) * (h[0] - GM.AX) * s, w.y - (GM.FY - h[1]) * s]; };

  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    if (!isG(w)) return _dw(ctx, w, isActive, t);
    const img = getImg(w.rob.act); if (!img) return _dw(ctx, w, isActive, t);
    const s = px(w); let pose, alpha = 1;
    if (w.state === 'dead') {   // death: 8 frames, then the pile lies there and fades
      const p = Math.min(1, (w.dt || 0) / 90) * 7, i = Math.min(6, Math.floor(p));
      pose = [GM.DEATH + i, GM.DEATH + i + 1, ease(p - i)]; if (w.dt > 190) return; if (w.dt > 150) alpha = 1 - (w.dt - 150) / 40;
    } else {
      pose = w.actF != null ? w.actF : idlePose(w);
      if (w.state === 'drown') alpha = Math.max(0, 1 - w.dt / 40);
    }
    jimg = getImg(GM_JUMP); gmPose(cx, img, pose);
    if (w.state !== 'dead') { if (w.frozen > 0) gmTint(cx, '#9fe4ff', .55); if (w.flash > 0 && (w.flash % 4) < 2) gmTint(cx, '#ff4a2a', .6); else if (w.healT > 0) gmTint(cx, '#e8ffee', .55 * w.healT / 36); }
    ctx.save(); ctx.globalAlpha = alpha;
    const lift = w.gmH || 0;
    if (w.state === 'ground' || w.state === 'dead') { const hh = Math.min(.6, lift / (400 * s)); ctx.fillStyle = 'rgba(0,0,0,' + (.32 * (1 - hh)) + ')'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 95 * s * (1 - hh * .5), 9 * s, 0, 0, 6.283); ctx.fill(); }   // ground shadow (smaller in the air)
    ctx.translate(w.x, w.y - (w.flyOff || 0) - lift); ctx.scale((w.face || 1) * s, s);
    ctx.drawImage(cv, -GM.AX, -poseFoot(pose));
    ctx.restore();
    // the rock in his fist (throw wind-up)
    const H = w.gmHeld, ri = getImg(GM_ROCK);
    if (H && ri && w.state !== 'dead') { ctx.save(); ctx.translate(H.x, H.y); ctx.rotate(H.rot || 0); const k = GM_ROCK_SS * Math.max(.05, H.k); ctx.drawImage(ri, -ri.width * k / 2, -ri.height * k / 2, ri.width * k, ri.height * k); ctx.restore(); }
    if (w.state === 'dead' || w.state === 'drown') return;
    const T = G.teams[w.team], y = w.y - (w.gmH || 0) - 335 * s, bw = 46 * Math.max(1, (w.sc || 1) * .85);   // labels (same as every other worm)
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
    if (n === 'gm_stomp') {   // a deep rock-on-rock stomp: low thud + grinding noise
      if (!this.ctx || this.muted) return;
      this.tone('sine', 90, 30, .9, .8); this.tone('sawtooth', 70, 35, .8, .3, .02); this.noise(.8, .5, 'lowpass', 700, 80); this.noise(.5, .3, 'bandpass', 1400, 300, .05); return;
    }
    if (n === 'gm_step') { if (!this.ctx || this.muted) return; this.tone('sine', 80, 40, .35, .35); this.noise(.25, .2, 'lowpass', 500, 90); return; }
    return _play.call(this, n, a);
  };

  // ---------- effects ----------
  const puffs = (x, y, n, sc) => { for (let i = 0; i < n; i++) addFx('golem_smoke', x + rnd(-45, 45) * (sc || 1), y - rnd(0, 26) * (sc || 1), rnd(.8, 1.4) * (sc || 1), { alpha: .85 }); };
  const rockFxAt = (x, y, s) => { const f = FX.golem_hit; addFx('golem_hit', x, y - f.fh * s / 2 + 8 * s, s); };   // the sprite's floor is the bottom of the cell
  const shockFxAt = (x, y, s) => { const f = FX.golem_shock; addFx('golem_shock', x, y - f.fh * s / 2 + 6 * s, s); };

  // ---------- ballistics: where does the rock land for (angle, speed)? same maths as updateProj ----------
  function simRock(x0, y0, vx, vy, owner) {
    let x = x0, y = y0; const T = G.terrain;
    for (let age = 0; age < 700; age++) {
      vy += GM_G; const n = Math.max(1, Math.ceil(Math.hypot(vx, vy) / 3));
      for (let i = 0; i < n; i++) {
        x += vx / n; y += vy / n;
        if (T.solid(x, y)) return [x, y];
        if (age > 8) for (const w of G.worms) { if (w.state === 'dead' || w.state === 'drown' || bossAlly(owner, w)) continue; if (onBody(w, x, y, 2)) return [x, y]; }
        if (y > WATER_Y + 4 || x < -100 - sideExt() || x > WORLD_W + 100 + sideExt()) return [x, Math.min(y, WATER_Y)];
      }
    }
    return [x, y];
  }
  function solveThrow(w, from, tx, ty) {   // -> [vx, vy] that lands closest to (tx, ty); the angle is picked at random among the good ones
    const dir = tx >= from[0] ? 1 : -1, good = []; let best = null;
    for (let v = 8; v <= 22; v += .5) for (let a = 12; a <= 80; a += 2) {
      const r = a * Math.PI / 180, vx = Math.cos(r) * v * dir, vy = -Math.sin(r) * v, e = simRock(from[0], from[1], vx, vy, w), d = Math.hypot(e[0] - tx, e[1] - ty);
      if (!best || d < best.d) best = { d, vx, vy }; if (d < 28) good.push({ d, vx, vy });
    }
    if (good.length) { const p = good[rint(0, good.length - 1)]; return [p.vx, p.vy]; }
    return best ? [best.vx, best.vy] : [dir * 12, -9];
  }

  // ---------- movement helpers ----------
  const stride = w => GM_STRIDE * px(w) / GM_PX;
  const GMX = {
    // one walk tick toward tx: 'go' | 'done' | 'blocked'. Speeds up at the start and slows down towards tx (S.v = current speed).
    walk(w, S, tx, spMax, goalPad) {
      const d = tx - w.x, ad = Math.abs(d); if (S.v == null) { S.v = spMax * .3; S.rt = 0; S.stuck = 0; S.from = w.actF != null ? dom(w.actF) : GM.IDLE; }
      const cap = Math.max(spMax * .35, Math.min(spMax, ad * .05 + 1.6)); S.v += (cap - S.v) * .12;
      if (ad <= (goalPad || 4) + .5) return 'done';
      const dir = d > 0 ? 1 : -1; w.face = dir; const x0 = w.x, step = Math.min(S.v, ad);
      if (!this.groundAhead(w, dir) || !placeOnGround(w, w.x + dir * step) || Math.abs(w.x - x0) < .05) { if (++S.stuck > 8) return 'blocked'; } else S.stuck = 0;
      const ph0 = w.gmPh || 0; w.gmPh = ph0 + Math.abs(w.x - x0) / stride(w);
      if (Math.floor(w.gmPh * 2) !== Math.floor(ph0 * 2)) { shake(GM_SHAKE_STEP); Snd.play('gm_step'); puffs(w.x - w.face * 40 * px(w), w.y - 2, 1, .55); }   // a foot lands
      S.rt++; w.actF = S.rt < 10 ? [S.from, walkPose(w)[0], ease(S.rt / 10)] : walkPose(w);
      return 'go';
    },
    // slow down and settle into the idle pose. true when finished
    stop(w, S) {
      if (!S.rt && !S.st) return true;
      const st = S.st || (S.st = { t: 0, v: Math.max(S.v || 3, 2), from: GM.WALK });
      st.t++;
      if (st.t <= 8) { st.v *= .75; const x0 = w.x; placeOnGround(w, w.x + w.face * st.v); w.gmPh = (w.gmPh || 0) + Math.abs(w.x - x0) / stride(w); w.actF = walkPose(w); st.from = dom(w.actF); return false; }
      const k = (st.t - 8) / 12; w.actF = [st.from, GM.IDLE, ease(k)];
      if (k >= 1) { S.st = null; S.v = null; S.rt = 0; w.actF = null; return true; }
      return false;
    },
    groundAhead(w, dir) { const T = G.terrain, sc = w.sc || 1, x = w.x + dir * (11 * sc + 8); for (let k = 2; k <= 46; k += 4) if (T.solid(x, w.y + k)) return true; return false; },
    // ---------- JUMP: crouch -> take-off -> flight arc -> touch-down (poses 100-109 of the jump sheet) ----------
    // the floor the target stands on: his own y when he stands, the floor below him when he is in the air
    level(tg) { if (tg.state === 'ground') return tg.y; const sy = G.terrain.surfaceBelow(tg.x, Math.max(0, tg.y - 20)); return sy >= 0 && sy < WATER_Y - 40 ? sy : null; },
    landSpot(w, tg, stop) {   // a free spot next to the target (same floor) where he can land
      const T = G.terrain, sc = w.sc || 1, side0 = w.x <= tg.x ? -1 : 1;
      for (const f of [1, .65, .35, 0]) for (const side of [side0, -side0]) {
        const x = clamp(tg.x + side * stop * f, 100, WORLD_W - 100), y = T.surfaceBelow(x, Math.max(0, tg.y - 90)); if (y < 0 || Math.abs(y - tg.y) > 42 || y > WATER_Y - 60) continue;
        if (blocked(x, y - 2, sc) || !onGround(x, y, sc) || !T.solid(x - 8 * sc, y + 2) || !T.solid(x + 8 * sc, y + 2)) continue; return { x, y: y - 1 };
      }
      return null;
    },
    leapStart(w, sp, up) {
      const s = px(w), dist = Math.abs(sp.x - w.x), from = w.actF != null ? dom(w.actF) : GM.IDLE;
      w.face = sp.x >= w.x ? 1 : -1; w.hover = true; w.gmH = 0;
      return { sp, t: 0, x0: w.x, y0: w.y, c: 14, k: 8, ft: Math.round(clamp(46 + dist / 14, 46, 84)), apex: GM_JUMP_APEX * s / GM_PX, h1: 38 * s, from, up };
    },
    leapStep(w, L) {   // true = he has just touched down
      L.t++; const t = L.t, sp = L.sp, s = px(w), T0 = L.c + L.k, FT = L.ft, sh = u => ease((u - .3) / .4);
      if (t <= L.c) { w.actF = [L.from, 100, sh(t / L.c)]; w.gmH = 0; return false; }                                   // crouch
      if (t <= T0) {                                                                                                  // push off the ground
        const a = (t - L.c) / L.k; w.actF = [100, 101, sh(a)]; w.gmH = L.h1 * ease(a);
        if (t === L.c + 1) { shake(GM_SHAKE_TAKEOFF); Snd.play('gm_stomp'); Snd.play('boom', .8); puffs(w.x, w.y - 2, 4, 1.2); debris(w.x, w.y - 4, 14, 'dirt'); ringFx(w.x, w.y - 4, '#ffb36b'); }
        return false;
      }
      if (t <= T0 + FT) {                                                                                             // flight
        const a = (t - T0) / FT, e = a * a * (3 - 2 * a), up = Math.max(0, L.y0 - sp.y);
        w.x = L.x0 + (sp.x - L.x0) * e; w.y = L.y0 + (sp.y - L.y0) * e; w.face = sp.x >= L.x0 ? 1 : -1;
        w.gmH = L.h1 * (1 - e) + Math.sin(Math.PI * a) * (L.apex + up * .35);
        w.actF = a < .22 ? [101, 102, sh(a / .22)] : a < .5 ? [102, 103, sh((a - .22) / .28)] : a < .78 ? [103, 104, sh((a - .5) / .28)] : [104, 105, sh((a - .78) / .22)];
        if (t % 4 === 0) addFx('golem_trail', w.x - w.face * 50 * s, w.y - w.gmH + rnd(-30, 30), rnd(.9, 1.3));
        return false;
      }
      w.x = sp.x; w.y = sp.y; w.gmH = 0; w.hover = false; w.vx = w.vy = 0; w.state = 'ground'; w.actF = 105; return true;
    },
    // touch-down: camera shake + blast around him, damage by distance, NO knockback. 'up' = he landed UP on a floating platform = stronger
    land(w, up) {
      const s = px(w), ix = w.x, iy = w.y, R = GM_JUMP_R * s / GM_PX, d0 = dmgG(w, up ? GM_JUMP_UP_MUL : GM_JUMP_MUL); let n = 0;
      shake(GM_SHAKE_LAND); Snd.play('mp3_gm_land');
      rockFxAt(ix, iy + 4, 1.5); shockFxAt(ix - 70 * s, iy, .9); shockFxAt(ix + 70 * s, iy, .9); puffs(ix, iy - 4, 7, 1.5); debris(ix, iy - 4, 30, 'dirt'); ringFx(ix, iy - 4, '#ffb36b'); ringFx(ix, iy - 4, '#fff2cf', 8);
      for (const p of foes(w)) {
        const [pcx, pcy] = bodyCenter(p), d = Math.hypot(pcx - ix, pcy - (iy - 30)); if (d > R) continue;
        n++; hurt(p, Math.max(1, Math.round(d0 * (1 - .65 * d / R)))); addFx('spark_hit', pcx, pcy, 1.3); puffs(pcx, pcy + 20, 1, .6);
      }
      if (!n) addPop(ix, iy - 140, 'miss', '#cdd', 16);
      showBanner(up ? 'CRUSHING LANDING!' : 'JUMP SMASH!', '#ff9a4a');
      setTimeout(() => shake(24), 330);   // the dust burst (pose 106/107) rumbles once more
    },
    // ---------- 5) every 2nd turn (and every 3rd turn when nobody stands on his floor): jump to a random player, land next to him ----------
    s_gm_jump(w, S) {
      const s = px(w);
      if (S.t === 1) {
        const fs = foes(w); if (!fs.length) return true; S.tg = fs[rint(0, fs.length - 1)]; const ty = this.level(S.tg);
        const sp = ty == null ? null : this.landSpot(w, { x: S.tg.x, y: ty }, GM_LAND * s / GM_PX);
        if (!sp) return true;   // no free spot to land on
        const up = ty < w.y - GM_LEAP_DY, down = ty > w.y + GM_LEAP_DY; S.up = up; S.ph = 'leap'; S.lp = this.leapStart(w, sp, up);
        showBanner('⚠ ' + w.name + (up ? ' leaps UP onto ' : down ? ' jumps down to ' : ' leaps to ') + S.tg.name + '!', '#ff9a4a'); Snd.play('slash', .7);
      }
      if (S.ph === 'leap') { if (this.leapStep(w, S.lp)) { this.land(w, S.up); S.ph = 'after'; S.u = 0; S.lp = null; } return false; }
      if (S.ph === 'after') {
        const u = ++S.u; w.actF = keys(GM_T_LAND, u); if (u > 82) { w.actF = null; const n = nearestFoe(w); if (n) face(w, n); return true; } return false;
      }
      return true;
    },
    // the lowest floor under him (the ground level). null when he already stands on it
    groundLevel(w) {
      const T = G.terrain; let y = T.surfaceBelow(w.x, Math.max(0, w.y - 2)); if (y < 0) return null;
      for (let n = 0; n < 6; n++) {   // go down through every thin floating floor until the solid ground (a solid run that reaches the bottom of the map)
        let e = y; while (e < T.H && T.solid(w.x, e)) e++;
        if (e >= T.H) break;
        const nx = T.surfaceBelow(w.x, e); if (nx < 0 || nx > WATER_Y - 60) break; y = nx;
      }
      return y > w.y + 100 ? y : null;
    },
    reachable(w, t) { return t.state === 'ground' && Math.abs(t.y - w.y) < 90; },   // standing on the same floor as the golem
    // ---------- 1) move first: walk a few steps left or right ----------
    s_gm_move(w, S) {
      const t = S.t;
      if (t === 1) {
        S.stuck = 0; S.v = null; S.rt = 0; w.gmPh = 0; let dir = Math.random() < .5 ? -1 : 1; if (AI.edgeNear(w, dir)) dir = -dir; if (AI.edgeNear(w, dir)) return true;
        const dd = rnd(GM_STEP_MIN, GM_STEP_MAX); S.tx = clamp(w.x + dir * dd, 300, WORLD_W - 300); if (Math.abs(S.tx - w.x) < 120) { dir = -dir; S.tx = clamp(w.x + dir * dd, 300, WORLD_W - 300); } w.face = dir; S.ph = 'walk';   // near a map end: walk the other way
      }
      if (S.ph === 'walk') { const r = this.walk(w, S, S.tx, GM_WALK, 16); if (r !== 'go' || t > 260) S.ph = 'stop'; return false; }
      return this.stop(w, S);
    },
    // ---------- 2) throw a rock at a random player ----------
    s_gm_throw(w, S) {
      const s = px(w);
      if (S.t === 1) {
        const fs = foes(w); if (!fs.length) return true; S.tg = fs[rint(0, fs.length - 1)]; S.u = 0; face(w, S.tg);
        showBanner('⚠ ' + w.name + ' lifts a lava boulder - he aims at ' + S.tg.name + '!', '#ff9a4a'); Snd.play('slash', .6);
        S.rel = handWorld(w, 11); const [bx, by] = bodyCenter(S.tg);   // release point = his fist in the throw picture; aim a little off so he can miss
        S.sol = solveThrow(w, S.rel, bx + rnd(-GM_AIM_ERR, GM_AIM_ERR), by + rnd(-GM_AIM_ERR * .4, GM_AIM_ERR * .4));
      }
      if (S.tg && S.tg.state !== 'dead' && S.tg.state !== 'drown' && !S.fired) face(w, S.tg);
      const u = ++S.u; w.actF = keys(GM_T_THROW, u);
      // the rock grows in his raised fist, swings over his head and leaves the hand
      const h9 = handWorld(w, 9), h10 = handWorld(w, 10), h11 = S.rel || handWorld(w, 11);
      if (!S.fired) {
        if (u >= 26 && u < 52) { const k = (u - 26) / 26; w.gmHeld = { x: lerpA(h9, h10, ease(k))[0], y: lerpA(h9, h10, ease(k))[1], k: ease(Math.min(1, k * 1.6)), rot: u * .02 }; }
        else if (u >= 52 && u < 68) w.gmHeld = { x: h10[0], y: h10[1] + Math.sin(u * .5) * 2, k: 1, rot: u * .02 };
        else if (u >= 68 && u < 79) { const k = ease((u - 68) / 11), p = lerpA(h10, h11, k); w.gmHeld = { x: p[0], y: p[1] - Math.sin(Math.PI * k) * 70 * s, k: 1, rot: u * .02 }; }
        if (u === 40) Snd.play('gm_step', .6);
        if (u === 79) {   // let go
          S.fired = true; w.gmHeld = null; const wp = WEAPONS.find(x => x.id === 'C19_Golem_Rock'), pr = wp.proj, [vx, vy] = S.sol;
          const pj = spawnProj({ x: h11[0], y: h11[1], vx, vy, w: wp, p: pr, owner: w, kind: 'shot', fuse: 0, life: pr.life || 1400 }); pj.rot = 0;
          shake(10); Snd.play('boom', .7); Snd.play('slash', .8); puffs(h11[0], h11[1] + 20, 2, .7); addFx('spark_hit', h11[0], h11[1], 1.1);
        }
      }
      if (u > 118) {   // wait until the rock has landed
        w.actF = null; S.w = (S.w | 0) + 1;
        if (G.projs.some(p => !p.dead && p.p && p.p.golem) && S.w < 900) return false;
        return S.w > 24;
      }
      return false;
    },
    // the rock hits the ground or a player
    rockHit(x, y) {
      const T = G.terrain, onGroundHit = T.solid(x, y) || T.solid(x, y + 6);
      let gy = y; if (!onGroundHit) { const sy = T.surfaceBelow(x, Math.max(0, y - 40)); if (sy >= 0 && sy - y < 220) gy = sy; }   // the rock hit a player in the air-space: play the effect on the floor under him, at his feet
      rockFxAt(x, gy + 6, 1.0); puffs(x, gy + 4, 4, 1.1); shake(20); Snd.play('boom', 1.2); debris(x, gy, 16, 'dirt'); ringFx(x, gy, '#ffb36b');
      if (onGroundHit) T.carve(x, y, 26);   // a small crater (no big hole - the floating floors stay)
    },
    // ---------- 3) every 3rd turn: walk to a random player, smash the ground, walk back ----------
    s_gm_smash(w, S) {
      const s = px(w);
      if (S.t === 1) {
        const fs = foes(w); if (!fs.length) return true;
        S.tg = fs[rint(0, fs.length - 1)]; S.home = w.x; S.ph = 'go'; S.v = null; S.rt = 0; S.stuck = 0; S.t0 = S.t; w.gmPh = 0; face(w, S.tg);
        if (!this.reachable(w, S.tg)) {   // the target stands on a floating floor (or he does): JUMP onto it, strong landing, then smash
          const ty = this.level(S.tg), sp = ty == null ? null : this.landSpot(w, { x: S.tg.x, y: ty }, GM_LAND * s / GM_PX);
          if (sp) { S.up = ty < w.y - GM_LEAP_DY; S.ph = 'leap'; S.lp = this.leapStart(w, sp, S.up); S.jumped = true; showBanner('⚠ ' + w.name + (S.up ? ' leaps UP onto ' : ' jumps down to ') + S.tg.name + ' to SMASH!', '#ff9a4a'); Snd.play('slash', .7); return false; }
        }
        showBanner('⚠ ' + w.name + ' stomps over to ' + S.tg.name + ' to SMASH!', '#ff9a4a'); Snd.play('slash', .6);
      }
      if (S.ph === 'leap') { if (this.leapStep(w, S.lp)) { this.land(w, S.up); S.ph = 'after'; S.u = 0; S.lp = null; } return false; }
      if (S.ph === 'after') {   // recover from the landing, then smash the player
        const u = ++S.u; w.actF = keys(GM_T_LAND2, u); if (u > 40) { w.actF = null; face(w, S.tg && S.tg.state !== 'dead' ? S.tg : nearestFoe(w)); S.ph = 'act'; S.u = 0; } return false;
      }
      if (S.ph === 'go') {
        const tg = S.tg; if (!tg || tg.state === 'dead' || tg.state === 'drown') { S.ph = 'stop1'; return false; }
        const r = this.walk(w, S, tg.x, GM_RUN * s / GM_PX, GM_SMASH_STAND * s); face(w, tg);
        if (r !== 'go' || S.t - S.t0 > 420) S.ph = 'stop1'; return false;
      }
      if (S.ph === 'stop1') { if (this.stop(w, S)) { S.ph = 'act'; S.u = 0; face(w, S.tg && S.tg.state !== 'dead' ? S.tg : nearestFoe(w)); } return false; }
      if (S.ph === 'act') {
        const u = ++S.u; w.actF = keys(GM_T_SMASH, u);
        if (u === 48) shake(8);   // fists come down: small rumble before the hit
        if (u === 66) this.smash(w);
        if (u > 104) { w.actF = null; if (S.jumped) { const n = nearestFoe(w); if (n) face(w, n); return true; } S.ph = 'back'; S.v = null; S.rt = 0; S.stuck = 0; w.gmPh = 0; S.t0 = S.t; } return false;   // after a jump-smash he stays where he landed
      }
      if (S.ph === 'back') {   // walk back to his spot
        const r = this.walk(w, S, S.home, GM_RUN * s / GM_PX, 14); if (r !== 'go' || S.t - S.t0 > 420) S.ph = 'stop2'; return false;
      }
      if (S.ph === 'stop2') { if (this.stop(w, S)) { const n = nearestFoe(w); if (n) face(w, n); return true; } return false; }
      return true;
    },
    smash(w) {   // damage to everybody near the fists, by distance, NO knockback
      const s = px(w), ix = w.x + (w.face || 1) * 95 * s, iy = w.y, d0 = dmgG(w, GM_SMASH_MUL); let n = 0;
      shake(GM_SHAKE_SMASH); setTimeout(() => shake(26), 120); setTimeout(() => shake(14), 380); Snd.play('mp3_gm_smash'); rockFxAt(ix, iy + 4, 1.25); puffs(ix, iy - 4, 6, 1.4); debris(ix, iy - 4, 26, 'dirt'); ringFx(ix, iy - 4, '#ffb36b'); ringFx(ix, iy - 4, '#fff2cf', 8);
      for (const p of foes(w)) {
        const [pcx, pcy] = bodyCenter(p), d = Math.hypot(pcx - ix, pcy - (iy - 30)); if (d > GM_SMASH_R * s / GM_PX) continue;
        n++; hurt(p, Math.max(1, Math.round(d0 * (1 - .65 * d / (GM_SMASH_R * s / GM_PX))))); addFx('spark_hit', pcx, pcy, 1.2); puffs(pcx, pcy + 20, 1, .6);
      }
      if (!n) addPop(ix, iy - 140, 'miss', '#cdd', 16);
      showBanner('SMASH!', '#ff9a4a');
    },
    // ---------- 4) every 4th turn: stomp, a rock shockwave runs over the floor ----------
    s_gm_stomp(w, S) {
      const s = px(w);
      if (S.t === 1) {
        if (!nearestFoe(w)) return true; S.side = Math.random() < .5 ? -1 : 1; S.ph = 'go'; S.v = null; S.rt = 0; S.stuck = 0; S.t0 = S.t; w.gmPh = 0; w.face = S.side;
        const gy = this.groundLevel(w), sp = gy == null ? null : this.landSpot(w, { x: w.x, y: gy }, GM_LAND * 2 * s / GM_PX);
        if (sp) { S.ph = 'leap'; S.lp = this.leapStart(w, sp, false); showBanner('⚠ ' + w.name + ' jumps down to the ground...', '#ff7a3a'); Snd.play('slash', .7); }   // he stands on a floating floor: down to the ground first
        else { showBanner('⚠ ' + w.name + ' marches to the ' + (S.side < 0 ? 'LEFT' : 'RIGHT') + ' corner...', '#ff7a3a'); Snd.play('slash', .5); }
      }
      if (S.ph === 'leap') { if (this.leapStep(w, S.lp)) { this.land(w, false); S.ph = 'after'; S.u = 0; S.lp = null; } return false; }
      if (S.ph === 'after') {   // recover from the landing, then march to the corner
        const u = ++S.u; w.actF = keys(GM_T_LAND2, u);
        if (u > 40) { w.actF = null; S.ph = 'go'; S.v = null; S.rt = 0; S.stuck = 0; S.t0 = S.t; w.gmPh = 0; w.face = S.side; showBanner('⚠ ' + w.name + ' marches to the ' + (S.side < 0 ? 'LEFT' : 'RIGHT') + ' corner...', '#ff7a3a'); } return false;
      }
      if (S.ph === 'go') {   // walk until the floor ends (the corner), or the map ends
        const r = this.walk(w, S, S.side < 0 ? 40 : WORLD_W - 40, GM_RUN * s / GM_PX, 4); if (r !== 'go' || S.t - S.t0 > 700) S.ph = 'stop'; return false;
      }
      if (S.ph === 'stop') { if (this.stop(w, S)) { S.ph = 'act'; S.u = 0; w.face = -S.side; showBanner('⚠ ' + w.name + ' raises his foot... SHOCKWAVE! (jump / fly over it)', '#ff7a3a'); } return false; }   // faces away from the corner = toward the players
      const u = ++S.u; w.actF = keys(GM_T_STOMP, u);
      if (u === 48) shake(8);
      if (u === 66) {
        const dir = w.face || 1; shake(GM_SHAKE_SMASH + 6); setTimeout(() => shake(26), 120); setTimeout(() => shake(14), 380); Snd.play('mp3_gm_smash'); ringFx(w.x + dir * 90 * s, w.y - 4, '#ffb36b'); ringFx(w.x + dir * 90 * s, w.y - 4, '#fff2cf', 8);
        puffs(w.x + dir * 90 * s, w.y - 2, 5, 1.3); debris(w.x + dir * 90 * s, w.y - 4, 22, 'dirt');
        (G.gmWaves = G.gmWaves || []).push({ x: w.x + dir * 100 * s, y: w.y, dir, dist: 0, age: 0, hit: [], owner: w, dmg: dmgG(w, GM_WAVE_MUL), fxAt: 0 });
      }
      if (u > 112) {   // wait for the shockwave to run out
        w.actF = null; S.w = (S.w | 0) + 1; if ((G.gmWaves || []).length && S.w < 700) return false; return S.w > 18;
      }
      return false;
    },
  };
  window.GMX = GMX;

  // ---------- the shockwave and the rock trail: every frame ----------
  function updateWaves2() {
    const L = G.gmWaves; if (!L || !L.length) return; const T = G.terrain, s = GM_WAVE_FX;
    for (const wv of L) {
      wv.age++; wv.x += wv.dir * GM_WAVE_SPEED; wv.dist += GM_WAVE_SPEED;
      const sy = T.surfaceBelow(wv.x, Math.max(0, wv.y - 70)); if (sy >= 0 && Math.abs(sy - wv.y) < 90) wv.y = sy;   // hugs the floor (floating platforms are NOT in its way)
      if (wv.dist >= wv.fxAt) { wv.fxAt = wv.dist + 40; shockFxAt(wv.x, wv.y, s); }
      if (wv.age % 5 === 0) debris(wv.x, wv.y - 4, 2, 'dirt'); if (wv.age % 14 === 0) { shake(5); puffs(wv.x, wv.y - 4, 1, .8); }
      for (const t of G.worms) {
        if (wv.hit.includes(t) || t.state === 'dead' || t.state === 'drown' || bossAlly(wv.owner, t) || t.team === wv.owner.team) continue;
        if (Math.abs(t.x - wv.x) < GM_WAVE_R + 10 * (t.sc || 1) && t.y > wv.y - 70 && t.y < wv.y + 90 && t.state === 'ground') {   // players in the air or on a floating floor jump over it
          wv.hit.push(t); hurt(t, wv.dmg); addFx('spark_hit', t.x, t.y - 40, 1.3); rockFxAt(t.x, t.y, .8); puffs(t.x, t.y, 2, .8); Snd.play('boom', .9); shake(14);   // NO knockback
        }
      }
      if (wv.x < 20 || wv.x > WORLD_W - 20 || wv.dist > GM_WAVE_MAX || !wv.owner || wv.owner.state === 'dead') wv.dead = true;
    }
    G.gmWaves = L.filter(wv => !wv.dead);
  }
  function rockTrails() {
    for (const p of G.projs) {
      if (p.dead || !p.p || !p.p.golem) continue;
      if (p.age % 2 === 0) addFx('golem_trail', p.x - p.vx * 1.1 + rnd(-6, 6), p.y - p.vy * 1.1 + rnd(-6, 6), rnd(.8, 1.15));
      if (p.age % 5 === 0) addFx('golem_smoke', p.x - p.vx * 1.6, p.y - p.vy * 1.6, rnd(.35, .55), { alpha: .7 });
    }
  }

  // ---------- camera: follow the stomp shockwave while it runs (the golem's turn is in the 'aim' phase, where fx are not followed) ----------
  const _uc = updateCamera;
  updateCamera = function () {
    const L = G.gmWaves, c = G.cam;
    if (L && L.length && !c.free && !G.projs.some(p => !p.dead && p.kind !== 'mine')) { const wv = L[L.length - 1]; c.x += (wv.x - c.x) * .09; c.y += ((wv.y - 140) - c.y) * .09; return; }
    return _uc.apply(this, arguments);
  };

  // ---------- rock hit: sprite + brown smoke + small crater ----------
  const _det = detonate;
  detonate = function (p) { const g = !!(p && p.p && p.p.golem), x = p.x, y = p.y; _det.apply(this, arguments); if (g) GMX.rockHit(x, y); };

  // ---------- hook the boss3 framework ----------
  const _think = BOSS3.think;
  BOSS3.think = function (w, ai) {
    if (!isG(w)) return _think.call(this, w, ai);
    if (!ai.b3hop) { ai.b3hop = true; ai.bmoved = true; w.gmPh = 0; return this.start(w, ai, 'gm_move'); }                                   // 1) move first (left or right)
    if (!ai.b3done) { ai.b3done = true; const bt = w.bt | 0; const k = bt % 4 === 0 ? 'gm_stomp' : bt % 3 === 0 ? 'gm_smash' : bt % 2 === 0 ? 'gm_jump' : 'gm_throw';   // 2) every 4th turn corner STOMP | every 3rd SMASH (jumps onto platform targets) | every 2nd JUMP | else throw rock
      return this.start(w, ai, k); }
    return false;
  };
  const _step = BOSS3.step;
  BOSS3.step = function (w, ai) {
    const S = w.b3; if (!S || String(S.k).indexOf('gm_') !== 0) return _step.call(this, w, ai);
    S.t++; let fin; try { fin = GMX['s_' + S.k](w, S); } catch (e) { console.error('golem script error', e); fin = true; }
    if (!fin) return;
    w.b3 = null; w.actF = null; w.gmHeld = null; w.gmPh = 0; w.gmH = 0; w.hover = false;
    if (S.k === 'gm_move') { ai.st = 'think'; ai.t = 10; } else this.endTurn(w, ai);
  };
  const _as = BOSS3.assets; BOSS3.assets = function (st) {
    if (Assets.fx) Object.assign(Assets.fx, FX); const pre = p => loadImage(p).then(im => (im && im.decode ? im.decode().catch(() => { }) : 0)).catch(() => { });
    return _as.call(this, st).concat([pre(GM_ACT), pre(GM_JUMP), pre(GM_ROCK), pre(FX.golem_hit.file), pre(FX.golem_shock.file), pre(FX.golem_smoke.file), pre(FX.golem_trail.file), pre('fx/spark_hit.webp'), pre('fx/explosion_small.webp')]);
  };
  const _up = BOSS3.update;
  BOSS3.update = function () { _up.call(this); if (!G.adv) return; updateWaves2(); rockTrails(); };
  console.log('golem.js loaded - Magma Golem (new last Adventure map, Molten Quarry, ' + GM_W + ' px wide)');
})();
