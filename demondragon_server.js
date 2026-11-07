/* ONLINE VERSION of demondragon.js - upload this file to GitHub (online game only).
   The offline app keeps using demondragon.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  DEMONIC DRAGON BOSSES  (Frostmaw Wyrm, Cinder Drake, Void Dragon)  -  v2: NEW sprites + ROAR special
//  All three dragon bosses use ONE picture: assets/adventure/demon_dragon.png  (every frame is cut out, sized to the same head size and
//  anchored on the body, so nothing slides or jumps when the pose changes).
//  Animations in the atlas:  idle (10, loops) | walk (10, loops) | attack = ground fire (6) | fly (6) | flybr = fire breath in the air (5)
//                            roar (6) | death (14)          (the left-facing frames of your big sheet were removed - the game just mirrors him)
//
//  TURN LOGIC
//    normal turn        : WALKS a few steps -> takes aim (attack wind-up) -> spits fireballs from the mouth (ATTACK frames)
//    EVERY 2nd TURN     : takes off (fly frames) -> flies to a RANDOM player -> hovers beside him and ROARS (roar frames):
//                         every player inside DD_ROAR_R of his body is hurt + pushed back (the red circle on the ground shows the range)
//                         -> then he spits his fireballs from the air (FIRE BREATH frames, +20% damage) -> lands when the next turn starts.
//  Tune:  DD_UNIT size on screen | DD_ROAR_R roar range | DD_ROAR_MUL roar damage | DD_HOVER fly height | DD_STAND distance he stops from the player
//         DD_IDLE_T / DD_WALK_T / DD_FLAP_T = game ticks per picture | DD_XFADE = blend time between two animations
// ============================================================================================================
const DD_ATLAS = 'adventure/demon_dragon.png';
const DD_META = {"Q": 1.25, "anims": {"idle": {"f": [[0, 0, 255, 198, -153.6, -197], [257, 0, 255, 196, -153.2, -195], [514, 0, 250, 194, -150.0, -193], [766, 0, 251, 194, -150.5, -193], [1019, 0, 252, 194, -150.9, -193], [1273, 0, 252, 195, -150.6, -194], [1527, 0, 256, 196, -153.7, -195], [1785, 0, 256, 198, -153.3, -197], [2043, 0, 256, 199, -153.6, -198], [0, 201, 258, 199, -154.7, -198]]}, "walk": {"f": [[260, 201, 252, 195, -153.7, -194], [514, 201, 250, 194, -152.4, -193], [766, 201, 269, 199, -163.0, -198], [1037, 201, 290, 198, -175.3, -197], [1329, 201, 306, 199, -187.9, -198], [1637, 201, 305, 201, -193.0, -200], [1944, 201, 290, 200, -191.2, -199], [0, 404, 284, 202, -184.3, -201], [286, 404, 260, 205, -161.8, -204], [548, 404, 251, 201, -152.7, -200]]}, "attack": {"f": [[801, 404, 208, 201, -125.9, -200], [1011, 404, 217, 198, -138.1, -197], [1230, 404, 211, 201, -109.5, -200], [1443, 404, 245, 202, -131.0, -201], [1690, 404, 259, 204, -132.7, -203], [1951, 404, 245, 208, -134.5, -207]], "muzzle": [[50.5, -107.2], [54.3, -104.8], [67.6, -113.6], [67.2, -104.0], [67.4, -104.8], [67.6, -105.6]]}, "fly": {"f": [[0, 614, 251, 223, -155.5, -238.8], [253, 614, 246, 201, -151.6, -229.9], [501, 614, 237, 208, -142.8, -231.4], [740, 614, 265, 237, -169.7, -262.2], [1007, 614, 266, 213, -169.6, -244.8], [1275, 614, 250, 216, -155.6, -254.1]]}, "flybr": {"f": [[1527, 614, 301, 207, -200.3, -238.1], [1830, 614, 287, 216, -183.6, -230.1], [0, 853, 289, 190, -183.8, -212.7], [291, 853, 262, 180, -156.5, -198.4], [555, 853, 191, 168, -89.9, -188.2]], "muzzle": [[70.2, -100.9], [73.9, -100.9], [74.6, -101.4], [74.8, -101.1], [70.5, -101.0]]}, "roar": {"f": [[748, 853, 244, 182, -146.4, -211.1], [994, 853, 253, 226, -153.0, -244.0], [1249, 853, 247, 229, -147.0, -269.8], [1498, 853, 251, 230, -149.0, -261.6], [1751, 853, 257, 232, -149.8, -275.5], [2010, 853, 232, 225, -135.7, -273.5]]}, "death": {"f": [[0, 1087, 255, 192, -154.4, -191], [257, 1087, 262, 186, -162.6, -185], [521, 1087, 268, 178, -165.5, -177], [791, 1087, 298, 164, -187.7, -163], [1091, 1087, 344, 166, -208.6, -165], [1437, 1087, 414, 172, -242.5, -171], [1853, 1087, 446, 108, -248.7, -107], [0, 1281, 441, 90, -232.8, -89], [443, 1281, 449, 91, -227.8, -90], [894, 1281, 458, 90, -229.0, -89], [1354, 1281, 456, 91, -228.0, -90], [1812, 1281, 446, 85, -223.0, -84], [0, 1374, 448, 86, -224.0, -85], [450, 1374, 448, 85, -224.0, -84]]}}};
const DD_UNIT = 1.1;                       // world pixels per "idle picture pixel" (idle dragon = about 175 px tall)
const DD_SCALE = DD_UNIT / DD_META.Q;      // world pixels per atlas pixel
const DD_IDLE_T = 6, DD_WALK_T = 4, DD_FLAP_T = 5, DD_DEATH_T = 4.5, DD_XFADE = 6;
const DD_ROAR_EVERY = 2;                   // roar turn = every 2nd boss turn
const DD_ROAR_R = 330;                     // ROAR RANGE (world px, measured from the dragon's body to the middle of each player)
const DD_ROAR_MUL = 1.6;                   // roar damage = his fireball damage x this (x1.0 at the dragon ... x0.6 at the edge of the range)
const DD_HOVER = 150;                      // height he flies at
const DD_STAND = 120;                      // he stops this far (sideways) from the player he flies to
const DD_KEYS = ['frostwyrm', 'cinderdrake', 'voiddrake'];

(function () {
  const isDD = w => !!(w && w.rob && /^boss_(frostwyrm|cinderdrake|voiddrake)$/.test(w.rob.id));
  const A = DD_META.anims, WRAP = { idle: 1, walk: 1 };
  const FIRE_ATK = 4, FIRE_AIR = 2;   // picture whose mouth position the fireballs leave from (attack / fire breath)
  const snd = (n, v) => { try { Snd.play(n, v); } catch (e) { } };

  // ---- the old per-dragon sheets are not used any more: every old picture path points at the one new atlas ----
  loadImage(DD_ATLAS).catch(() => { });
  DD_KEYS.forEach(k => ['hold', 'death', 'act'].forEach(n => { Assets.img['adventure/boss_' + k + '_' + n + '.webp'] = Assets.img[DD_ATLAS]; }));

  // ---- fireball: your fireball.png for all three dragons ----
  ['C02_Frost_Breath', 'C04_Inferno_Breath', 'C10_Void_Breath'].forEach(id => {
    const wd = WEAPONS.find(x => x.id === id); if (!wd) return; const p = wd.proj;
    p.spr = 'cimg:proj/C17_Demon_Fireball_proj.png'; p.ss = .52; p.spin = .1; p.glow = '#ff7a1a'; p.add = true; p.trail = true; p.hit = 'explosion_small'; p.hs = 1; delete p.freeze;
    wd.desc = wd.desc.replace(/icy|void|flames?|Frost|Void/g, 'demon fire');
  });

  // ---- hit shapes / body centre (idle-picture px relative to his feet, mirrored with his facing) ----
  const U = DD_UNIT;
  const SH = [[5, -62, 60, 52], [68, -98, 34, 30], [-62, -40, 45, 30], [-10, -108, 50, 28]];   // body, head, tail base, wings
  const bob = w => (w.flyOff || 0) > 2 ? Math.sin((G.frame | 0) / 11 + (w.idx | 0)) * 4 : 0;
  const base = w => ({ x: w.x, y: w.y - (w.hop || 0) - (w.flyOff || 0) - bob(w) });
  const _bs = bodyShapes; bodyShapes = w => {
    if (!isDD(w)) return _bs(w);
    const b = base(w), f = w.face || 1; return SH.map(s => [b.x + f * s[0] * U, b.y + s[1] * U, s[2] * U, s[3] * U]);
  };
  const _bc = bodyCenter; bodyCenter = w => { if (!isDD(w)) return _bc(w); const b = base(w); return [b.x + (w.face || 1) * 5 * U, b.y - 62 * U]; };

  // ---- fireballs leave from his mouth ----
  const _mw = muzzleWorld; muzzleWorld = function (w, wd) {
    if (!isDD(w)) return _mw(w, wd);
    const air = (w.flyOff || 0) > 2, m = A[air ? 'flybr' : 'attack'].muzzle[air ? FIRE_AIR : FIRE_ATK], b = base(w);
    return [b.x + (w.face || 1) * m[0] * U, b.y + m[1] * U];
  };

  // ---- per-tick clocks (walking, last shot) + landing ----
  const _uw = updateWorm; updateWorm = function (w) {
    const r = _uw.apply(this, arguments);
    if (isDD(w) && w.state !== 'dead') {
      if (w.walking > 0 && w.state === 'ground') w.dW = (w.dW | 0) + 1;
      const bt = w.breathT || 0, pb = w._pbt || 0;
      if (bt > pb && pb <= 2) w.dS = 0; else if (w.dS != null) w.dS++;   // a new burst of fireballs starts
      if (bt <= 0) w.dS = null;
      w._pbt = bt;
      if (w.ddHover && !w.ddsp && !(w.flyGoal > 0) && (w.flyOff || 0) < .6) { w.ddHover = false; w.hover = false; w.flyOff = 0; w.vx = w.vy = 0; }   // landed: normal physics again
    }
    return r;
  };

  // =================================================================================================
  //  EVERY 2nd TURN:  fly to a random player -> ROAR (range damage) -> fire from the air -> lands next turn
  // =================================================================================================
  const foesOf = w => aliveWorms().filter(e => e.team !== w.team && !bossAlly(w, e));
  const alive = p => p && p.state !== 'dead' && p.state !== 'drown';
  const ease = k => k * k * (3 - 2 * k);

  function ddCleanup(w) { w.ddsp = null; w.ddRoarF = null; w.ddFx = null; }
  function ddRoarHit(w) {   // the roar: round blast around his body, strongest close to him, pushes everybody away
    const [cx, cy] = bodyCenter(w), d0 = BOSS3.dmg(w, DD_ROAR_MUL);
    shake(30); snd('boom', 1.2); snd('rp_scream', .9);
    for (const p of foesOf(w)) {
      const [px, py] = bodyCenter(p), d = Math.hypot(px - cx, py - cy); if (d > DD_ROAR_R) continue;
      const k = d / DD_ROAR_R;
      hurt(p, Math.max(1, Math.round(d0 * (1 - .4 * k))));
      if (p.state !== 'dead' && p.state !== 'drown') knockWorm(p, (px >= cx ? 1 : -1) * (3.2 - 1.4 * k), -(5 - 2 * k));
      addFx('spark_hit', px, py, 1.3); addFx('explosion_small', px, py, .9);
    }
    showBanner('ROAR!  (everyone inside the red circle is hurt)', '#ff7a3a');
  }
  function ddStart(w) {
    const fs = foesOf(w); if (!fs.length || w.frozen > 0) return false;
    w.ddsp = { t: 0, ph: 'up', tg: fs[rint(0, fs.length - 1)], r: 0 };
    w.hover = true; w.ddHover = true; w.flyGoal = DD_HOVER; w.spMul = SPECIAL_MUL;   // hover = no gravity while he is scripted
    showBanner('⚠ ' + w.name + ' takes to the air!', '#ff7a3a'); snd('boom', .5);
    return true;
  }
  function ddStep(w) {   // called every tick while the special plays; true = finished
    const S = w.ddsp; if (!S) return true;
    if (w.state === 'dead' || w.state === 'drown') { ddCleanup(w); return true; }
    S.t++;
    if (!alive(S.tg)) { const fs = foesOf(w); if (!fs.length) { ddCleanup(w); return true; } S.tg = fs[rint(0, fs.length - 1)]; }
    const tg = S.tg; w.face = tg.x >= w.x ? 1 : -1;
    if (S.ph === 'up') {   // rises
      if ((w.flyOff || 0) >= DD_HOVER - 8 || S.t > 90) { S.ph = 'go'; S.t0 = S.t; S.side = tg.x >= w.x ? 1 : -1; S.fails = 0; showBanner('⚠ ' + w.name + ' flies to ' + (tg.name || 'a player') + '!', '#ff7a3a'); }
    } else if (S.ph === 'go') {   // glides to a spot beside the player, riding the ground height under him
      const tx = clamp(tg.x - S.side * DD_STAND, 100, WORLD_W - 100), dx = tx - w.x, dist = Math.abs(dx);
      if (dist <= 6 || S.fails > 8 || S.t - S.t0 > 260) { S.ph = 'roar'; S.r = 0; w.face = tg.x >= w.x ? 1 : -1; snd('freeze', .5); }
      else { const sp = Math.min(9, Math.max(2.5, dist * .12)); if (placeOnGround(w, w.x + Math.sign(dx) * Math.min(sp, dist))) S.fails = 0; else S.fails++; }
    } else if (S.ph === 'roar') {
      const r = ++S.r;
      // roar picture 0 -> 4 (mouth opens), the blast lands on picture 4, then it closes again
      w.ddRoarF = r <= 46 ? 4 * ease(r / 46) : r <= 70 ? 4 + .6 * ((r - 46) / 24) : 4.6 + .4 * Math.min(1, (r - 70) / 12);
      if (r > 8 && r < 48) { G.cam.shake = Math.max(G.cam.shake, 2 + (r - 8) * .08); w.ddFx = { k: (r - 8) / 40, mode: 'tele' }; }   // the circle grows = the range
      if (r === 48) { ddRoarHit(w); }
      if (r >= 48) w.ddFx = { k: Math.min(1, (r - 48) / 24), mode: 'wave' };
      if (r > 96) { ddCleanup(w); return true; }
    }
    return false;
  }

  // ---- hook the AI: the special turn is every 2nd boss turn and starts right away (no walking first: the flight is his movement) ----
  const _ab = AI.begin; AI.begin = function (w) {
    const r = _ab.apply(this, arguments);
    if (isDD(w)) { ddCleanup(w); this.ddPending = (w.bt | 0) % DD_ROAR_EVERY === 0; this.bspecial = this.ddPending; this.bdone = true; }   // bdone = the old "take off" special never runs
    return r;
  };
  const _au = AI.update; AI.update = function (w) {
    if (!isDD(w) || w.minion || G.phase !== 'aim') return _au.apply(this, arguments);
    if (this.st === 'ddsp') { this.reset(); if (ddStep(w)) { this.st = 'think'; this.t = 25; } return; }   // script running
    if (this.ddPending && this.st === 'think' && this.t <= 0 && w.state === 'ground') {
      this.ddPending = false; this.bmoved = true; this.reset();
      if (ddStart(w)) { this.st = 'ddsp'; return; }
    }
    return _au.apply(this, arguments);
  };

  // =================================================================================================
  //  PICTURES
  // =================================================================================================
  const tri = (t, n, T) => { const p = 2 * (n - 1), x = (t / T) % p; return x <= n - 1 ? x : p - x; };   // 0..n-1..0 (flapping)
  function pose(w) {
    const fo = w.flyOff || 0, air = fo > 2, bt = w.breathT || 0, g = G.frame | 0, off = (w.idx | 0) * 13;
    if (w.ddRoarF != null) return { row: 'roar', f: w.ddRoarF };
    if (bt > 0 && w.dS != null) {   // spitting: mouth opens, holds while the burst flies, then closes smoothly
      const s = w.dS;
      if (air) return { row: 'flybr', f: bt > 18 ? 2 + Math.min(2, s / 8) : 4 * bt / 18 };
      return { row: 'attack', f: bt > 18 ? 3 + Math.min(2, s / 8) : 5 * bt / 18 };
    }
    if (G.activeWorm === w && typeof AI !== 'undefined' && !(w.frozen > 0) && ((AI.st === 'aim' && AI.t > 0) || AI.st === 'charge')) {   // wind-up while he takes aim
      const k = AI.st === 'charge' ? 1 : Math.min(1, AI.t / 18);
      return air ? { row: 'flybr', f: 2 * k } : { row: 'attack', f: 3 * k };
    }
    if (air) return { row: 'fly', f: tri(g + off, A.fly.f.length, DD_FLAP_T) };
    if (w.walking > 0 && w.state === 'ground') return { row: 'walk', f: ((w.dW | 0) / DD_WALK_T) % A.walk.f.length };
    return { row: 'idle', f: ((g + off) / DD_IDLE_T) % A.idle.f.length };
  }
  const tc = document.createElement('canvas'); tc.width = 520; tc.height = 300; const tx = tc.getContext('2d');
  function one(ctx, img, row, i, alpha, tint) {
    const fr = A[row].f[i], sx = fr[0], sy = fr[1], sw = fr[2], sh = fr[3], ox = fr[4], oy = fr[5];
    if (tint) {
      tx.clearRect(0, 0, tc.width, tc.height); tx.globalCompositeOperation = 'source-over'; tx.globalAlpha = 1; tx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      tx.globalCompositeOperation = 'source-atop'; tx.globalAlpha = tint[1]; tx.fillStyle = tint[0]; tx.fillRect(0, 0, sw, sh);
      ctx.globalAlpha = alpha; ctx.drawImage(tc, 0, 0, sw, sh, ox, oy, sw, sh);
    } else { ctx.globalAlpha = alpha; ctx.drawImage(img, sx, sy, sw, sh, ox, oy, sw, sh); }
  }
  function blit(ctx, img, row, f, alpha, tint) {   // fractional picture number = the two neighbouring pictures are blended -> smooth motion
    const n = A[row].f.length; let i = Math.floor(f); if (i < 0) i = 0; let fr = f - i, j = i + 1;
    if (WRAP[row]) { i %= n; j %= n; } else { if (i >= n - 1) { i = n - 1; fr = 0; } j = Math.min(n - 1, j); }
    one(ctx, img, row, i, alpha, tint);
    if (fr > .03 && j !== i) one(ctx, img, row, j, alpha * fr, tint);
    ctx.globalAlpha = 1;
  }
  function drawRange(ctx, w, b) {   // the red circle = roar range (grows while he winds up, then a quick shockwave)
    const F = w.ddFx; if (!F) return; const cx = b.x + (w.face || 1) * 5 * U, cy = b.y - 62 * U;
    ctx.save(); ctx.translate(cx, cy);
    if (F.mode === 'tele') {
      const r = DD_ROAR_R * ease(Math.min(1, F.k)), t = G.frame | 0;
      ctx.fillStyle = 'rgba(255,60,20,' + (.06 + .08 * F.k) + ')'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,40,' + (.55 + .3 * Math.sin(t / 3)) + ')'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * .8; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
    } else {
      const r = DD_ROAR_R * (.25 + .75 * ease(F.k)), a = 1 - F.k;
      ctx.strokeStyle = 'rgba(255,200,120,' + (.85 * a) + ')'; ctx.lineWidth = 10 * a + 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,80,30,' + (.6 * a) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r * .92, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(255,90,40,' + (.12 * a) + ')'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    if (!isDD(w)) return _dw(ctx, w, isActive, t);
    const img = getImg(DD_ATLAS); if (!img || !img.complete || !img.naturalWidth) { loadImage(DD_ATLAS).catch(() => { }); return; }
    const now = G.frame | 0, sc = w.sc || 1, fo = w.flyOff || 0, f = w.face || 1;
    if (w.state === 'dead') {   // death: he falls, lies there for a moment and fades away
      const n = A.death.f.length, df = Math.min(n - 1, w.dt / DD_DEATH_T), a = w.dt > 120 ? Math.max(0, 1 - (w.dt - 120) / 30) : 1; if (a <= 0) return;
      const fo2 = Math.max(0, fo - w.dt * 7);   // a flying dragon drops to the ground
      ctx.save(); ctx.translate(w.x, w.y - fo2); ctx.scale(f * DD_SCALE, DD_SCALE); blit(ctx, img, 'death', df, a); ctx.restore(); return;
    }
    // ---- cross-fade when he switches to ANOTHER animation (idle <-> walk <-> attack <-> fly ...) so nothing snaps ----
    const p = pose(w); let st = w._dq;
    if (!st || now < st.lg || now - st.lg > 8) st = w._dq = { row: p.row, prev: null, t0: -99, lg: now, last: p };
    if (p.row !== st.row) { st.prev = st.last; st.row = p.row; st.t0 = now; }
    st.lg = now; st.last = p;
    const xf = Math.min(1, (now - st.t0 + 1) / DD_XFADE), b = base(w);
    ctx.save();
    if (w.state === 'drown') ctx.globalAlpha = Math.max(0, 1 - w.dt / 40);
    if (w.state === 'ground' || fo + (w.hop || 0) > 0) {   // ground shadow: stays on the floor and shrinks while he is in the air
      const k = Math.max(.45, 1 - fo / 260); ctx.fillStyle = 'rgba(0,0,0,' + (.28 * k) + ')'; ctx.beginPath(); ctx.ellipse(w.x + f * 6, w.y + 1, 82 * k, 9 * k, 0, 0, 6.283); ctx.fill();
    }
    drawRange(ctx, w, b);
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(f * DD_SCALE, DD_SCALE);
    const tint = w.frozen > 0 ? ['#9fe4ff', .55] : (w.flash > 0 && (w.flash % 4) < 2) ? ['#ff4a2a', .6] : w.healT > 0 ? ['#e8ffee', .55 * w.healT / 36] : null;
    if (xf < 1 && st.prev) { blit(ctx, img, st.prev.row, st.prev.f, 1, tint); blit(ctx, img, p.row, p.f, xf, tint); } else blit(ctx, img, p.row, p.f, 1, tint);
    ctx.restore(); ctx.restore();
    if (w.state === 'drown') return;
    // ---- name / health bar / turn arrow (same as every other boss, a bit above his head) ----
    const T = G.teams[w.team], y = b.y - (fo > 2 || w.hover ? 250 : 190) * U, bw = 46 * Math.max(1, sc * .85);
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(w.name, w.x, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(w.name, w.x, y - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w.x - bw / 2 - 1, y - 8, bw + 2, 8); ctx.fillStyle = T.color; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 6);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 2);
    ctx.font = '700 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(w.hp, w.x, y + 6); ctx.fillText(w.hp, w.x, y + 6);
    if (isActive && (G.phase === 'aim' || G.phase === 'retreat')) { const bb = Math.sin(t / 8) * 4; ctx.fillStyle = T.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y - 24 + bb); ctx.lineTo(w.x - 9, y - 40 + bb); ctx.lineTo(w.x + 9, y - 40 + bb); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.restore();
  };
  console.log('demondragon.js v2 loaded - demonic dragon bosses active (roar every ' + DD_ROAR_EVERY + 'nd turn)');
})();
