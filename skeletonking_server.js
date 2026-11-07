/* ONLINE VERSION of skeletonking.js - upload this file to GitHub (online game only).
   The offline app keeps using skeletonking.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  SKELETON KING  (replaces the old Stormbone Giant, the creature boss of Voltspire Citadel / "Bone Throne", HARD + HEROIC)
//  New look from your skeleton_king_action.png.  Same logic as the old boss, new animations:
//
//  EVERY TURN       he MOVES FIRST (RUN frames) to get a new angle, aims (cocked arm), then THROWS A BONE (ATTACK frames).
//                   The flying picture is your bone (assets/proj/C03_Storm_Skull_proj.png).  The bone leaves his hand on the release frame.
//  EVERY 3RD TURN   he RUNS to a random player, JUMPS next to him (JUMP frames) and SMASHES the ground (SMASH frames).
//                   A SMOKE sprite (assets/fx/sk_smash_smoke.webp) bursts at the ground, everybody standing on the ground near the
//                   fist takes a little more damage than the bone (KG_SMASH_MUL below).  Players in the air are safe.
//  IDLE             one single still frame (idle frame 1 of your sheet).     DEATH  six death frames, then he fades away.
//
//  Sheet (assets/adventure/boss_stormbone_act.webp, 33 frames of 320x210, 6 per row, 1920x1260):
//     idle 0-5 | attack 6-11 | smash 12-17 | jump 18-23 | death 24-29 | run 30-32
//  Every frame was scaled to the same size (the run frames of the picture were ~8% bigger) and pinned on the same anchor
//  (x = body centre, y = the floor under the boots, KG.AX / KG.AY), so nothing jumps when two frames follow each other.
//  Every game tick two neighbouring frames are cross-faded, so the 3 run frames and all other loops run smoothly.
//  SANDSTORM DUNES: the Tomb Colossus (stage 6 on HARD / HEROIC) is this same Skeleton King in sand colours, throwing 2 bones; the Tomb Imps are sand Bone Imps.
//  Built on the boss3.js framework (same pattern as reaper.js / minocentaur.js): it wraps BOSS3.think / step / update, drawWorm,
//  bodyShapes, bodyCenter, muzzleWorld, launchShot and drawProj.  Only index.html (one <script> line) needs to know about this file.
// ============================================================================================================

// ---- TUNING ----
const KG = { CW: 320, CH: 210, AX: 160, AY: 196, COLS: 6, IDLE: 0, ATK: 6, SMASH: 12, JUMP: 18, DEATH: 24, RUN: 30 };
const KG_PX = 1.4;            // world pixels per sprite pixel (at the boss size 3.0)
const KG_SHEET = 'adventure/boss_stormbone_act.webp';
const KG_SMOKE_FILE = 'fx/sk_smash_smoke.webp';
const KG_BONE_IMG = 'proj/C03_Storm_Skull_proj.png';
const KG_HAND = [80, 91];     // where the bone leaves his hand on the release frame (sprite px: forward, up from the floor)
const KG_THROW_DELAY = 8;     // ticks between "fire" and the bone leaving the hand (the arm swings forward first)
const KG_RUN = 12;            // run speed to the player (world px per tick) in the 3rd-turn charge
const KG_JUMP_FROM = 310;     // he starts the jump when he is this close to the player
const KG_LAND_GAP = 105;      // he lands this far from the player
const KG_SMASH_MUL = 1.3;     // smash damage = basic attack (bone) x this
const KG_HIT_R = 215;         // reach of the smash around the fist (players on the ground)
// ---- SANDSTORM DUNES: the Tomb Colossus (stage 6, HARD / HEROIC) is now this Skeleton King in sand colours, and the Tomb Imps are Bone Imps in sand colours ----
const KG_SAND = '#e8b868';    // sand colour multiplied over the bone (change this one colour to re-tint boss + small ones + map picture is the CSS line below)
const KG_SAND_SHEET = 'adventure/boss_tombking_act.webp';   // = boss_stormbone_act.webp, tinted (made in the game, no new file needed)
const KG_WIDS = { C03_Storm_Skull: 1, C06_Tomb_Skull: 1 };  // the boss weapons he throws with: Voltspire (Storm Skull) and Sandstorm Dunes (Tomb Skulls)

(function () {
  const isK = w => !!(w && w.rob && w.rob.b3 === 'skeleton');
  const ease = a => { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); };
  const px = w => KG_PX * (w.sc || 3) / 3;
  const baseY = w => w.y - (w.hop || 0) - (w.flyOff || 0);

  // ---------- the old Stormbone Giant becomes the Skeleton King ----------
  const ANCH = Array.from({ length: 9 }, () => ({ n: [238, 300], f: [238, 300] }));
  ADV_MAPS.forEach(M => { const b = M.boss2; if (b && b.bossId === 'boss_stormbone') { b.b3 = 'skeleton'; b.bossName = 'Skeleton King'; b.anchors = ANCH; } });
  if (typeof CBOSS !== 'undefined' && CBOSS.citadel) CBOSS.citadel.name = 'Skeleton King';

  // ---------- Sandstorm Dunes: Tomb Colossus -> Sand Skeleton King, Tomb Imp -> Sand Bone Imp ----------
  const SAND_NAME = 'Sand Skeleton King';
  ADV_MAPS.forEach(M => {
    const b = M.boss2; if (!b || b.bossId !== 'boss_tombking') return;
    b.b3 = 'skeleton'; b.bossName = SAND_NAME; b.anchors = ANCH; b.act = KG_SAND_SHEET;   // the tinted action sheet (loaded by the stage start like every boss sheet)
    b.sheet = 'adventure/boss_stormbone_hold.webp'; b.death = 'adventure/boss_stormbone_death.webp';   // also gives the Adventure map your Skeleton King picture (portrait/stormbone.webp)
  });
  if (typeof CBOSS !== 'undefined' && CBOSS.dunes) CBOSS.dunes.name = SAND_NAME;
  if (typeof CMINIONS !== 'undefined' && CMINIONS.tombking) {   // the small ones: Bone Imp (same size / anchors as the old Tomb Imp), sand colour
    const m = CMINIONS.tombking; m.name = 'Sand Bone Imp'; m.mw.name = 'Bone Smash'; m.mw.id = 'MC6_Tomb_Smash';
  }
  // Tomb Skulls become YOUR bone: two spinning bones (they lock on when you are close), thrown by the Skeleton King
  const tw = WEAPONS.find(x => x.id === 'C06_Tomb_Skull');
  if (tw) {
    tw.name = 'Sand Bone Throw'; tw.desc = 'Throws two spinning bones that lock on when you are close.';
    tw.proj.spr = 'cimg:' + KG_BONE_IMG; tw.proj.glow = null; tw.proj.ss = 1;
    if (tw.volley) tw.volley.recoil = 0;   // the delayed bone leaves his hand a moment after the volley fires: no push-back
  }
  // sand-coloured copies of your sheets, made in the game on first use: tombking file name -> [your file, colour]
  const ALIAS = {
    'adventure/boss_tombking_act.webp': ['adventure/boss_stormbone_act.webp', KG_SAND],
    'adventure/minion_tombking_hold.webp': ['adventure/minion_stormbone_hold.webp', KG_SAND],
    'adventure/minion_tombking_death.webp': ['adventure/minion_stormbone_death.webp', KG_SAND],
  };
  function tintCanvas(im, col) {   // multiply the colour over the picture, then put the transparent background back
    const w = im.naturalWidth || im.width || 1, h = im.naturalHeight || im.height || 1, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0); return c;
  }
  const _li = loadImage;
  loadImage = function (path) {
    const a = ALIAS[path];
    if (a && !Assets.img[path]) {
      const ph = document.createElement('canvas'); ph.width = ph.height = 1; const entry = { im: ph, promise: null };
      entry.promise = _li.call(this, a[0]).then(im => { entry.im = tintCanvas(im, a[1]); return entry.im; });
      Assets.img[path] = entry;
    }
    return _li.apply(this, arguments);
  };
  const css = document.createElement('style');   // Adventure map: the boss picture of the dunes in sand colours (not when the map is locked: that stays grey)
  css.textContent = '.adv-ban:not(.lk) img.ban-boss[alt="' + SAND_NAME + '"]{filter:sepia(.8) saturate(1.8) hue-rotate(-14deg) brightness(1.05) drop-shadow(0 8px 16px rgba(0,0,0,.65))}';
  document.head.appendChild(css);
  B3_BY_KIND.skeleton = { kind: 'skeleton', key: 'skeletonking', name: 'Skeleton King', wide: 1 };

  // ---------- the bone: your picture is the flying shot (spins), the 3 small bombs it breaks into are small bones ----------
  const wd = WEAPONS.find(x => x.id === 'C03_Storm_Skull');
  if (wd) {
    wd.art = 'M0_Blank'; wd.name = 'Bone Throw'; wd.desc = 'Throws a spinning bone that bursts into 3 small bone bombs.';
    const p = wd.proj; p.glow = null; p.ss = 1; p.hit = 'explosion_small'; p.hs = .85; p.spin = .2;
  }
  const SMOKE = { file: KG_SMOKE_FILE, frames: 10, cols: 5, fw: 256, fh: 128, fps: 11, loop: false };
  Object.assign(DIVINE_FX, { sk_smash_smoke: SMOKE }); if (Assets.fx) Assets.fx.sk_smash_smoke = SMOKE;
  loadImage(KG_SMOKE_FILE).catch(() => { });
  const smoke = (x, y, k) => addFx('sk_smash_smoke', x, y - 44 * k, k);   // the cloud's ground line sits 44px (x scale) under the middle of the picture

  const _dp = drawProj;
  drawProj = function (ctx, p, t) {
    if (p.bomblet && p.w && p.w.id === 'C03_Storm_Skull') {
      const im = getImg(KG_BONE_IMG);
      if (im) { ctx.save(); ctx.translate(p.x, p.y); if (p.rotSpin) p.rot = (p.rot || 0) + p.rotSpin; ctx.rotate(p.rot || 0); const s = .5; ctx.drawImage(im, -im.width / 2 * s, -im.height / 2 * s, im.width * s, im.height * s); ctx.restore(); return; }
    }
    return _dp.apply(this, arguments);
  };

  // ---------- hit shapes / body centre / where the bone leaves his hand ----------
  const _bs = bodyShapes; bodyShapes = w => {
    if (!isK(w)) return _bs(w);
    const s = px(w), fy = baseY(w), f = w.face || 1;
    return [[w.x, fy - 82 * s, 46 * s, 80 * s], [w.x + f * 14 * s, fy - 152 * s, 30 * s, 28 * s]];   // body + head
  };
  const _bc = bodyCenter; bodyCenter = w => isK(w) ? [w.x, baseY(w) - 88 * px(w)] : _bc(w);
  const _mz = muzzleWorld; muzzleWorld = function (w, wdef) {
    if (!isK(w) || !wdef || !KG_WIDS[wdef.id]) return _mz.apply(this, arguments);
    const s = px(w), f = w.face || 1, a = (w.aim || 0) * D2R;
    return [w.x + f * (KG_HAND[0] + Math.cos(a) * 8) * s, baseY(w) - (KG_HAND[1] + Math.sin(a) * 8) * s];
  };
  // the bone leaves the hand when the arm has swung forward: remember the throw time (drives the frames) and delay the real shot a little
  const _ls = launchShot; launchShot = function (w, wdef, power, jitter, extra) {
    if (!isK(w) || !wdef || !KG_WIDS[wdef.id]) return _ls.apply(this, arguments);
    w.kgThrow0 = G.frame; w.kgKey = null; Snd.play('slash', .7);   // kgKey = null: the arm re-cocks with a soft cross-fade (2nd bone of the dunes volley)
    (G.kgq = G.kgq || []).push({ t: KG_THROW_DELAY, fn: () => { if (w.state !== 'dead' && w.state !== 'drown') _ls.call(null, w, wdef, power, jitter, extra); } });
    return { x: w.x, y: w.y, vx: 0, vy: 0, p: wdef.proj, dead: true };
  };

  // ---------- poses: a frame number, or [frameA, frameB, u] = A cross-faded into B ----------
  const win = (u, lo, hi) => ease((u - lo) / (hi - lo));   // the cross-fade only happens in the middle part of a step: the frames stay sharp (no double head)
  const pp = (base, n, v, lo = 0, hi = 1) => { const m = (n - 1) * 2; v = ((v % m) + m) % m; if (v > n - 1) v = m - v; const i = Math.min(n - 2, Math.floor(v)); return [base + i, base + i + 1, win(v - i, lo, hi)]; };   // ping-pong loop
  const to = (a, b, u) => [a, b, win(u, .22, .78)];
  const dom = p => Array.isArray(p) ? (p[2] < .5 ? p[0] : p[1]) : p;
  const blend = (a, b, u) => to(dom(a), dom(b), u);
  const seq = (fr, du, t) => { let acc = 0; for (let i = 0; i < du.length; i++) { if (t < acc + du[i]) return to(fr[i], fr[i + 1], (t - acc) / du[i]); acc += du[i]; } return fr[fr.length - 1]; };   // fr[i] -> fr[i+1] takes du[i] ticks
  const idle = w => KG.IDLE;   // idle = ONE still frame (no shaking)
  const runP = (ph) => pp(KG.RUN, 3, ph, .12, .88);
  const throwPose = tt => tt < 6 ? to(KG.ATK + 1, KG.ATK + 2, tt / 6) : tt < 12 ? to(KG.ATK + 2, KG.ATK + 3, (tt - 6) / 6) : tt < 18 ? to(KG.ATK + 3, KG.ATK + 4, (tt - 12) / 6) : tt < 26 ? to(KG.ATK + 4, KG.ATK + 5, (tt - 18) / 8) : tt < 40 ? KG.ATK + 5 : null;

  // ---------- drawing ----------
  const cv = document.createElement('canvas'); cv.width = KG.CW; cv.height = KG.CH; const cx = cv.getContext('2d', { willReadFrequently: true });
  const put = (img, i, al) => { cx.globalAlpha = al; cx.drawImage(img, (i % KG.COLS) * KG.CW, Math.floor(i / KG.COLS) * KG.CH, KG.CW, KG.CH, 0, 0, KG.CW, KG.CH); };
  function mix(img, p) { cx.clearRect(0, 0, KG.CW, KG.CH); cx.globalCompositeOperation = 'source-over'; if (Array.isArray(p)) { put(img, p[0], 1); if (p[2] > .001) put(img, p[1], p[2]); } else put(img, p | 0, 1); cx.globalAlpha = 1; }
  function tint(col, a) { cx.globalCompositeOperation = 'source-atop'; cx.globalAlpha = a; cx.fillStyle = col; cx.fillRect(0, 0, KG.CW, KG.CH); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }

  // which pose does he show right now? (script poses win, then stomp / air / throw / aim / run / idle)
  function poseOf(w, isActive) {
    if (w.actF != null) return ['script', w.actF];
    if (w.frozen > 0) return ['frozen', KG.IDLE];
    if (typeof AI !== 'undefined' && AI.st === 'stomp' && G.activeWorm === w) {   // a player stands too close: the old stomp (hop + quake) now plays the jump + smash frames
      const t = w.stompT | 0, W = typeof STOMP_WIND === 'number' ? STOMP_WIND : 40;
      return ['stomp', t < W ? seq([KG.JUMP, KG.JUMP + 1, KG.JUMP + 3, KG.JUMP + 4], [8, 10, W - 18], t) : seq([KG.JUMP + 5, KG.SMASH + 5], [8], t - W)];
    }
    if (w.state === 'air') return ['air', w.vy < -2 ? KG.JUMP + 2 : w.vy < 2 ? KG.JUMP + 3 : KG.JUMP + 4];
    const tt = G.frame - (w.kgThrow0 == null ? -9999 : w.kgThrow0);
    if (tt >= 0 && tt < 40) { const tp = throwPose(tt); if (tp) return ['throw', tp]; }
    if (tt >= 40 && tt < 52) return ['throw', blend(KG.ATK + 5, idle(w), (tt - 40) / 12)];
    if (w.walking > 0 && w.state === 'ground') return ['run', runP((G.frame | 0) * .24 + (w.idx | 0))];   // walking to a new spot = run frames
    if (isActive && G.activeWorm === w && G.phase === 'aim' && typeof AI !== 'undefined' && (AI.st === 'aim' || AI.st === 'charge')) return ['aim', KG.ATK + 1];   // arm cocked while he aims
    return ['idle', idle(w)];
  }

  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    if (!isK(w)) return _dw(ctx, w, isActive, t);
    const img = getImg(w.rob.id === 'boss_tombking' ? KG_SAND_SHEET : KG_SHEET); if (!img) return _dw(ctx, w, isActive, t);
    const s = px(w), sc = w.sc || 1; let p, alpha = 1;
    if (w.state === 'dead') {
      const q = Math.min(1, (w.dt || 0) / 36) * 5, i = Math.min(4, Math.floor(q)); p = [KG.DEATH + i, KG.DEATH + i + 1, ease(q - i)];   // 6 death frames, last one stays
      if (w.dt > 100) alpha = Math.max(0, 1 - (w.dt - 100) / 30); if (w.dt > 130) return;
    } else {
      let [key, pose] = poseOf(w, isActive);
      if (key !== w.kgKey) { w.kgFrom = w.kgPose; w.kgTr = 0; w.kgKey = key; }   // a different kind of pose: cross-fade from the last picture so there is no pop
      if (w.kgFrom != null && w.kgTr < 7 && key !== 'script') { w.kgTr++; pose = blend(w.kgFrom, pose, w.kgTr / 7); }
      w.kgPose = pose; p = pose;
      if (w.state === 'drown') alpha = Math.max(0, 1 - w.dt / 40);
    }
    const tf = w.state !== 'dead' && (w.frozen > 0 || (w.flash > 0 && (w.flash % 4) < 2) || w.healT > 0);
    if (tf) { mix(img, p); if (w.frozen > 0) tint('#9fe4ff', .55); if (w.flash > 0 && (w.flash % 4) < 2) tint('#ff4a2a', .6); else if (w.healT > 0) tint('#e8ffee', .55 * w.healT / 36); }
    ctx.save(); ctx.globalAlpha = alpha;
    if (w.state === 'ground' || w.state === 'dead') { ctx.fillStyle = 'rgba(0,0,0,.28)'; const hf = Math.min(1, (w.hop || 0) / 160); ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 62 * s * (1 - hf * .45), 8 * s * (1 - hf * .45), 0, 0, 6.283); ctx.fill(); }
    const by = baseY(w);
    ctx.translate(w.x, by); ctx.scale((w.face || 1) * s, s);
    if (tf) ctx.drawImage(cv, -KG.AX, -KG.AY);
    else {   // normal case: both neighbouring frames straight from the sheet (cross-fade)
      const A = Array.isArray(p) ? p[0] : p | 0, B = Array.isArray(p) ? p[1] : A, u = Array.isArray(p) ? p[2] : 0, ga = ctx.globalAlpha;
      const dr = i => ctx.drawImage(img, (i % KG.COLS) * KG.CW, Math.floor(i / KG.COLS) * KG.CH, KG.CW, KG.CH, -KG.AX, -KG.AY, KG.CW, KG.CH);
      dr(A); if (u > .001) { ctx.globalAlpha = ga * u; dr(B); }
    }
    ctx.restore();
    if (w.state === 'dead' || w.state === 'drown') return;
    const T = G.teams[w.team], y = by - 188 * s, bw = 52 * Math.max(1, sc * .85);
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(w.name, w.x, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(w.name, w.x, y - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w.x - bw / 2 - 1, y - 8, bw + 2, 8); ctx.fillStyle = T.color; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 6);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 2);
    ctx.font = '700 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(w.hp, w.x, y + 6); ctx.fillText(w.hp, w.x, y + 6);
    if (isActive && (G.phase === 'aim' || G.phase === 'retreat')) { const b = Math.sin(t / 8) * 4; ctx.fillStyle = T.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y - 24 + b); ctx.lineTo(w.x - 9, y - 40 + b); ctx.lineTo(w.x + 9, y - 40 + b); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.restore();
  };

  // ---------- the 3rd-turn charge: run -> jump -> smash ----------
  const foes = w => BOSS3.foes(w);
  const faceTo = (w, x) => { w.face = x >= w.x ? 1 : -1; };
  const KGX = {
    landSpot(w, tg, stop) {   // a free standing spot next to the player, on his level (his near side first, then the other side, then closer)
      const T = G.terrain, sc = w.sc || 1, side0 = w.x <= tg.x ? -1 : 1;
      for (const f of [1, .7, .4, 0]) for (const side of [side0, -side0]) {
        const x = clamp(tg.x + side * stop * f, 100, WORLD_W - 100), y = T.surfaceBelow(x, Math.max(0, tg.y - 90)); if (y < 0 || Math.abs(y - tg.y) > 46 || y > WATER_Y - 60) continue;
        if (blocked(x, y - 2, sc) || !onGround(x, y, sc) || !T.solid(x - 8 * sc, y + 2) || !T.solid(x + 8 * sc, y + 2)) continue; return { x, y: y - 1 };
      }
      return null;
    },
    s_kg_special(w, S) {
      const t = S.t, s = px(w);
      if (t === 1) {
        const fs = foes(w); if (!fs.length) return true;
        S.tg = fs[rint(0, fs.length - 1)]; S.ph = 'run'; S.u = 0; S.rph = 0; S.stuck = 0; S.from = idle(w); faceTo(w, S.tg.x);
        showBanner('⚠ ' + w.name + ' charges at ' + S.tg.name + '!', '#ffb347'); Snd.play('boom', .5);
      }
      const tg = S.tg;
      if (S.ph === 'run') {
        if (!tg || tg.state === 'dead' || tg.state === 'drown') return true;
        S.u++; S.rph += .28; const dx = tg.x - w.x, dir = dx > 0 ? 1 : -1; w.face = dir;
        const r = runP(S.rph); w.actF = S.u < 8 ? blend(S.from, r, S.u / 8) : r;
        let go = Math.abs(dx) > KG_JUMP_FROM;
        if (go) { const x0 = w.x; if (!placeOnGround(w, w.x + dir * Math.min(KG_RUN, Math.abs(dx) - KG_JUMP_FROM + 1)) || Math.abs(w.x - x0) < .05) { if (++S.stuck > 8) go = false; } else S.stuck = 0; }
        if (S.u % 3 === 0) addFx('smoke', w.x - w.face * 46 * s, w.y - 6, .5);
        if (S.u % 12 === 0) shake(2);
        if (!go || S.u > 260) { S.ph = 'crouch'; S.u = 0; S.fromP = r; faceTo(w, tg.x); }
        return false;
      }
      if (S.ph === 'crouch') {   // sinks down, then pushes off
        const u = ++S.u; faceTo(w, tg.x);
        w.actF = u <= 7 ? blend(S.fromP, KG.JUMP, u / 7) : to(KG.JUMP, KG.JUMP + 1, (u - 7) / 6);
        if (u >= 13) {
          const sp = this.landSpot(w, tg, KG_LAND_GAP);
          S.sp = sp; S.x0 = w.x; S.y0 = w.y; S.ph = sp ? 'air' : 'smash'; S.u = 0;
          if (sp) { const dist = Math.abs(sp.x - w.x); S.ft = Math.round(clamp(34 + dist / 16, 34, 60)); S.apex = 150 + Math.max(0, S.y0 - sp.y) * .4; w.face = sp.x >= w.x ? 1 : -1; w.hover = true; showBanner('⚠ ' + w.name + ' leaps!', '#ffb347'); Snd.play('jump'); Snd.play('boom', .4); smoke(w.x, w.y, .8); }
        }
        return false;
      }
      if (S.ph === 'air') {
        const u = ++S.u, a = Math.min(1, u / S.ft), e = a * a * (3 - 2 * a), sp = S.sp;
        w.x = S.x0 + (sp.x - S.x0) * e; w.y = S.y0 + (sp.y - S.y0) * e; w.hop = Math.sin(Math.PI * a) * S.apex; w.vx = w.vy = 0;
        w.actF = a < .2 ? to(KG.JUMP + 1, KG.JUMP + 2, a / .2) : a < .55 ? to(KG.JUMP + 2, KG.JUMP + 3, (a - .2) / .35) : to(KG.JUMP + 3, KG.JUMP + 4, (a - .55) / .45);
        if (a >= 1) { w.x = sp.x; w.y = sp.y; w.hop = 0; w.hover = false; w.state = 'ground'; w.vx = w.vy = 0; S.ph = 'land'; S.u = 0; shake(14); Snd.play('boom', .8); debris(w.x, w.y - 4, 10, 'dirt'); smoke(w.x, w.y, 1.1); S.fromP = w.actF; }
        return false;
      }
      if (S.ph === 'land') {   // landing squash, then straight into the smash
        const u = ++S.u; faceTo(w, tg.x); w.actF = u <= 8 ? blend(S.fromP, KG.JUMP + 5, u / 8) : KG.JUMP + 5;
        if (u >= 12) { S.ph = 'smash'; S.u = 0; }
        return false;
      }
      // ---- smash ----
      const u = ++S.u; if (u === 1) { w.hover = false; w.hop = 0; if (tg && tg.state !== 'dead' && tg.state !== 'drown') faceTo(w, tg.x); S.fromP = KG.JUMP + 5; }
      const F = KG.SMASH, sp = seq([F, F + 1, F + 2, F + 3, F + 4, F + 5], [8, 7, 7, 8, 4], u);
      w.actF = u < 7 ? blend(S.fromP, sp, u / 7) : u > 58 ? blend(F + 5, idle(w), (u - 58) / 10) : sp;
      if (u === 24) Snd.play('slash', .5);
      if (u === 30) {   // the fist hits the floor
        const ix = w.x + w.face * 70 * s, dmg = BOSS3.dmg(w, KG_SMASH_MUL);
        shake(34); Snd.play('boom', 1.4); Snd.play('boom', 1); debris(ix, w.y - 4, 26, 'dirt'); debris(ix, w.y - 4, 10, 'metal');
        smoke(ix, w.y, 2.0); smoke(w.x - w.face * 50 * s, w.y, 1.3); addFx('explosion_small', ix, w.y - 10, 1.3);
        ringFx(ix, w.y - 4, '#d8c8a8'); ringFx(ix, w.y - 4, '#fff2cf', 8);
        const n = specialHit(w, dmg, false, KG_HIT_R, ix); G.terrain.carve(ix, w.y + 6, 42);
        showBanner('SMASH!' + (n ? '' : '  (everybody jumped or stayed away)'), '#ffb347');
      }
      return u > 68;
    },
  };
  window.KGX = KGX;

  // ---------- hook the boss3 framework ----------
  const _think = BOSS3.think;
  BOSS3.think = function (w, ai) {
    if (!isK(w)) return _think.call(this, w, ai);
    if (ai.bspecial && !ai.b3done) { ai.b3done = true; ai.bmoved = true; return this.start(w, ai, 'kg_special'); }   // every 3rd turn: run -> jump -> smash
    return false;   // every other turn: the normal boss turn (walk to a new spot first, aim, throw the bone)
  };
  const _step = BOSS3.step;
  BOSS3.step = function (w, ai) {
    const S = w.b3; if (!S || String(S.k).indexOf('kg_') !== 0) return _step.call(this, w, ai);
    S.t++; const fin = KGX['s_' + S.k](w, S); if (!fin) return;
    w.b3 = null; w.actF = null; w.hop = 0; w.hover = false; this.endTurn(w, ai);
  };
  const _up = BOSS3.update;
  BOSS3.update = function () {
    _up.call(this);
    if (!G.adv) return;
    if ((G.frame | 0) < 2) G.kgq = [];
    if (G.kgq && G.kgq.length) { for (const q of G.kgq) { if (--q.t <= 0) { q.dead = true; q.fn(); } } G.kgq = G.kgq.filter(q => !q.dead); }
    for (const w of G.worms) {   // the old floor-stomp (a player stands right next to him): smoke when the foot hits the ground
      if (!isK(w) || w.state === 'dead' || w.state === 'drown') continue;
      if (typeof AI !== 'undefined' && AI.st === 'stomp' && G.activeWorm === w && (w.stompT | 0) === (typeof STOMP_WIND === 'number' ? STOMP_WIND : 40)) { smoke(w.x + w.face * 40 * px(w), w.y, 1.8); smoke(w.x - w.face * 40 * px(w), w.y, 1.2); }
    }
  };
  console.log('skeletonking.js loaded - Skeleton King: idle / run / bone throw / run-jump-smash / death');
})();
