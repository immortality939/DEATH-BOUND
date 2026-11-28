/* ONLINE VERSION of lavahound.js - upload this file to GitHub (online game only).
   The offline app keeps using lavahound.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  LAVA HOUND  (HEROIC third boss, Magma Geode)  -  NEW sprites + muzzle flame / smoke
//  The old Lava Hound sheets are gone. He is drawn from ONE picture now: assets/adventure/lava_hound.webp (your lava_hound.png).
//  Rows in the atlas (every cell is the same size, every picture is anchored on his BELLY and scaled to the same body size, so
//  nothing slides, grows, shrinks or shakes when the picture changes):
//    row 0  FLY            6 pictures  wings go up and down (ping-pong: 0-1-2-3-4-5-4-3-2-1-0, no jump at the loop point)
//    row 1  ATTACK         4 pictures  mouth opens, he spits the lava balls  (every normal turn)
//    row 2  FIRE TO FLOOR  5 pictures  rears back, roars, burns the whole floor (his special turn)
//    row 3  DEATH          6 pictures  drops out of the air and flattens on the ground
//  Smooth: pictures are blended with their neighbour all the time (a fractional picture number = two pictures mixed), and every change
//  of animation (fly <-> attack <-> floor fire) cross-fades.
//  Turn logic is NOT changed (boss3.js): new spot every turn -> lava balls from the mouth / every special turn the floor burns.
//  NEW: when a lava ball leaves his mouth a MUZZLE FLAME (assets/fx/lh_muzzle_flame.webp, aimed along the shot), MUZZLE SMOKE
//       (assets/fx/lh_muzzle_smoke.webp) and a few embers come out of the mouth. The floor-fire roar breathes a big flame jet to the floor.
//  Tune (below):  LH_UNIT size on screen | LH_FLAP_T / LH_FLAP_FAST ticks per wing picture (idle / while gliding) | LH_XFADE blend time
//                 between two animations | LH_DEATH_T ticks per death picture | LH_FLAME_S / LH_SMOKE_S size of the muzzle effects
// ============================================================================================================
const LH_ATLAS = 'adventure/lava_hound.webp', LH_FLAME = 'fx/lh_muzzle_flame.webp', LH_SMOKE = 'fx/lh_muzzle_smoke.webp';
const LH_CW = 352, LH_CH = 258, LH_AX = 146, LH_AY = 175;          // atlas cell size + belly anchor inside a cell
const LH_N = [6, 4, 5, 6];                                           // pictures per row
const LH_MOUTH = [   // mouth [x, y] of every picture, in cell pixels from the belly anchor (the lava balls / flame leave from here)
  [[125,-56],[131,-46],[134,-43],[128,-44],[132,-42],[133,-42]],
  [[126,-42],[121,-47],[126,-43],[121,-38]],
  [[144,-46],[157,-59],[164,-52],[151,-61],[152,-60]],
  [[145,-39],[157,-24],[136,-21],[125,1],[113,15],[117,23]]];
const LH_BOT = [49,47,38,38,38,38];                             // death pictures: bottom edge below the belly anchor
const LH_UNIT = .82, LH_FLAP_T = 5, LH_FLAP_FAST = 3, LH_XFADE = 7, LH_DEATH_T = 7;
const LH_FLAME_S = .62, LH_SMOKE_S = .62;
// ---- FLAME ROCK STORM (every 4th turn): he flies high above the middle of the players, powers up in flames, then flaming rocks fall slanted to the right ----
const LR_FLAME = 'adventure/lava_hound_flame.webp', LR_ROCK = 'fx/lh_flame_rock.webp', LR_HIT = 'fx/lh_rock_hit.webp';
const LR_CW = 416, LR_CH = 300, LR_AX = 178, LR_AY = 195;   // flame-hound cell (16 pictures, 4 per row) + belly anchor: same body size / same anchor as the normal atlas
const LR_RW = 288, LR_RH = 336, LR_RX = 144, LR_RY = 222, LR_RN = 10;   // flame-rock cell (rock centre fixed at RX,RY) + number of pictures used (ping-pong loop)
const LR_HW = 384, LR_HH = 256, LR_HGX = 192, LR_HGY = 230;  // rock-hit cell (16 pictures, 4 per row) + ground contact point inside the cell
const LR_EVERY = 4;               // every Nth boss turn he does the rock storm
const LR_ROCKS = 40;              // flaming rocks in the storm
const LR_SPREAD = 1.0;            // 1.0 = exactly like Zeus's float storm / the Death Reaper's aura (0 = all on his spot, 2.0 = twice as wide)
const LR_LAUNCH_H = 490;          // same launch height the Zeus storm uses to turn the Reaper's launch speeds into a landing distance
const LR_GAP = [0.2, 0.6];        // random wait between two rocks, in seconds
const LR_HOVER = 330;             // how high above the ground he floats while he powers up
const LR_DMG = .75;               // damage of ONE rock (x boss base damage), same as one Zeus strike
const LR_FALL = 46;               // frames a rock needs to fall
const LR_SLANT = .22;             // how far a rock moves to the RIGHT for every pixel it falls (0 = straight down)
const LR_DROP = 820;              // rocks start this far above where they land
const LR_RS = .62, LR_HS = .75;   // size on screen of a rock / of the ground burst (1 = picture size)
const LR_UP = 80, LR_DOWN = 60;   // frames to power up / to power down

(function () {
  const isLH = w => !!(w && w.rob && w.rob.id === 'boss_lavahound');
  const U = LH_UNIT;
  const ease = k => k * k * (3 - 2 * k), cl01 = k => k < 0 ? 0 : k > 1 ? 1 : k;
  const snd = (n, v) => { try { Snd.play(n, v); } catch (e) { } };

  // ---- load the new pictures; every OLD lava hound sheet path points at the new atlas, so the old art can never be drawn ----
  loadImage(LH_ATLAS).catch(() => { }); loadImage(LH_FLAME).catch(() => { }); loadImage(LH_SMOKE).catch(() => { });
  loadImage(LR_FLAME).catch(() => { }); loadImage(LR_ROCK).catch(() => { }); loadImage(LR_HIT).catch(() => { });
  ['hold', 'death', 'act'].forEach(n => { Assets.img['adventure/boss_lavahound_' + n + '.webp'] = Assets.img[LH_ATLAS]; });

  // ---- where his belly is (the picture is anchored here; same point the game uses for his hit-body, 40*scale above his feet line) ----
  const anchor = w => ({ x: w.x, y: w.y - (w.hop || 0) - (w.flyOff || 0) - 40 * (w.sc || 1) });
  const mouthAt = (row, f) => {   // mouth position (relative to the belly anchor) of a fractional picture number
    const n = LH_N[row], i = Math.max(0, Math.min(n - 1, Math.floor(f))), j = Math.min(n - 1, i + 1), k = cl01(f - i), a = LH_MOUTH[row][i], b = LH_MOUTH[row][j];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };

  // ---- lava balls leave from his mouth (same spot the picture shows, no matter if he is aiming or already spitting) ----
  const _mw = muzzleWorld; muzzleWorld = function (w, wd) {
    if (!isLH(w)) return _mw(w, wd);
    const m = mouthAt(1, 2), a = anchor(w);
    return [a.x + (w.face || 1) * m[0] * U, a.y + m[1] * U];
  };

  // ---- per-tick clocks: start of a spit burst ----
  const _uw = updateWorm; updateWorm = function (w) {
    const r = _uw.apply(this, arguments);
    if (isLH(w) && w.state !== 'dead') {
      const bt = w.breathT || 0, pb = w._lhpb || 0;
      if (bt > pb && pb <= 2) w.lhS = 0; else if (w.lhS != null) w.lhS++;
      if (bt <= 0) w.lhS = null;
      w._lhpb = bt;
    }
    return r;
  };

  // =================================================================================================
  //  MUZZLE EFFECTS  (flame sprite + smoke sprite + embers)
  // =================================================================================================
  const FX = () => (G.lhfx = G.lhfx || []);
  function lhMuzzle(w, big, dirDown) {
    if (!w || w.state === 'dead') return;
    const [mx, my] = muzzleWorld(w, null), f = w.face || 1;
    let ang;
    if (dirDown) ang = Math.atan2(.9, f);                       // floor-fire: the jet goes forward and down to the floor
    else { const d = aimDir(w); ang = Math.atan2(d[1], d[0]); }
    const L = FX(), k = big ? 1.7 : 1;
    L.push({ k: 'flame', x: mx, y: my, ang, age: 0, life: big ? 22 : 16, s: LH_FLAME_S * k, f });
    L.push({ k: 'glow', x: mx, y: my, age: 0, life: big ? 14 : 9, s: (big ? 120 : 70) * U });
    for (let i = 0; i < (big ? 4 : 2); i++) {   // smoke puffs drift on, rise and grow
      const sp = rnd(.6, 1.7) * (big ? 1.4 : 1), a2 = ang + rnd(-.45, .45);
      L.push({ k: 'smoke', x: mx + Math.cos(ang) * rnd(0, 24), y: my + Math.sin(ang) * rnd(0, 24), vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp - rnd(.3, .9), age: -i * 3, life: rnd(38, 56), s: LH_SMOKE_S * rnd(.7, 1.15) * k, rot: rnd(0, 6.28), vr: rnd(-.03, .03) });
    }
    for (let i = 0; i < (big ? 14 : 7); i++) {   // embers
      const a2 = ang + rnd(-.5, .5), sp = rnd(2.5, 7.5) * (big ? 1.2 : 1);
      L.push({ k: 'ember', x: mx, y: my, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, age: 0, life: rnd(16, 34), r: rnd(1.4, 3.2) });
    }
  }
  // every lava ball that leaves the mouth (volley / single shot / burst) = one muzzle flash
  const _ls = launchShot; launchShot = function (w) {
    const r = _ls.apply(this, arguments);
    if (isLH(w)) lhMuzzle(w, false, false);
    return r;
  };

  function lhFxUpdate() {
    if ((G.frame | 0) < 2) G.lhfx = [];
    const L = G.lhfx; if (!L || !L.length) return;
    for (const e of L) {
      e.age++;
      if (e.k === 'smoke' && e.age > 0) { e.x += e.vx; e.y += e.vy; e.vx *= .965; e.vy = e.vy * .97 - .012; e.rot += e.vr; }
      else if (e.k === 'ember') { e.x += e.vx; e.y += e.vy; e.vx *= .96; e.vy = e.vy * .96 + .22; }
    }
    G.lhfx = L.filter(e => e.age < e.life);
  }
  function lhFxDraw(ctx) {
    const L = G.lhfx; if (!L || !L.length) return;
    const fl = getImg(LH_FLAME), sm = getImg(LH_SMOKE);
    // smoke first (normal blending, behind the fire)
    if (sm && sm.complete && sm.naturalWidth) for (const e of L) {
      if (e.k !== 'smoke' || e.age < 0) continue;
      const p = e.age / e.life, fi = Math.min(7, Math.floor(p * 8)), a = Math.min(1, e.age / 5) * (1 - p * .35), s = e.s * (1 + p * .9);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.drawImage(sm, (fi % 4) * 192, Math.floor(fi / 4) * 192, 192, 192, -96 * s, -96 * s, 192 * s, 192 * s); ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const e of L) {
      if (e.k === 'flame' && fl && fl.complete && fl.naturalWidth) {
        const fi = Math.min(7, Math.floor(e.age / e.life * 8)), s = e.s;
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang); if (Math.cos(e.ang) < 0) ctx.scale(1, -1); ctx.globalAlpha = 1;
        ctx.drawImage(fl, (fi % 4) * 256, Math.floor(fi / 4) * 192, 256, 192, -28 * s, -96 * s, 256 * s, 192 * s); ctx.restore();
      } else if (e.k === 'glow') {
        const p = e.age / e.life, r = e.s * (.6 + .6 * p), g = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, r);
        g.addColorStop(0, 'rgba(255,240,170,' + (.85 * (1 - p)) + ')'); g.addColorStop(.45, 'rgba(255,140,40,' + (.45 * (1 - p)) + ')'); g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 6.283); ctx.fill();
      } else if (e.k === 'ember') {
        const p = e.age / e.life; ctx.globalAlpha = 1 - p; ctx.fillStyle = p < .4 ? '#fff0a0' : '#ff8a2a'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1 - p * .5), 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
  }
  const _up = BOSS3.update; BOSS3.update = function () { _up.call(this); if (G.adv) lhFxUpdate(); };
  const _dr = BOSS3.draw; BOSS3.draw = function (ctx) { _dr.call(this, ctx); lhFxDraw(ctx); };

  // floor-fire special: big flame jet from the mouth to the floor at the climax of the roar (boss3.js burns the floor at the same tick)
  const BURN_PEAK = 40;
  const _ub = BOSS3.update; BOSS3.update = function () {
    _ub.call(this);
    if (!G.adv) return;
    for (const w of G.worms) {
      if (!isLH(w) || w.state === 'dead' || w.state === 'drown') continue;
      if (w.spT > 0 && w.rob.spec === 'burn') {
        if (w.spT === BURN_PEAK - 2) { lhMuzzle(w, true, true); if (!Snd.file('lh_flame')) snd('flame', .9); }
        else if (w.spT > BURN_PEAK && w.spT < BURN_PEAK + 32 && w.spT % 5 === 0) lhMuzzle(w, false, true);
      }
    }
  };

  // =================================================================================================
  //  PICTURES
  // =================================================================================================
  const tri = (t, n, T) => { const p = 2 * (n - 1), x = (t / T) % p; return x <= n - 1 ? x : p - x; };   // 0..n-1..0 (wings up / down / back)
  function pose(w) {
    const g = G.frame | 0, off = (w.idx | 0) * 13, bt = w.breathT || 0;
    if (w.spT > 0 && w.rob.spec === 'burn') {   // special: rears back, roars (fire to the floor at the peak), closes his mouth again
      const t = w.spT;
      return { row: 2, f: t < BURN_PEAK ? 4 * ease(cl01(t / BURN_PEAK)) : t < BURN_PEAK + 30 ? 4 : 4 * (1 - ease(cl01((t - BURN_PEAK - 30) / 28))) };
    }
    if (bt > 0 && w.lhS != null) {   // spitting: the mouth opens, stays open while the burst flies, then closes smoothly
      const s = w.lhS;
      return { row: 1, f: bt > 18 ? 1.4 + Math.min(1.6, s / 9) : 3 * bt / 18 };
    }
    if (G.activeWorm === w && typeof AI !== 'undefined' && !(w.frozen > 0) && ((AI.st === 'aim' && AI.t > 0) || AI.st === 'charge')) {   // wind-up while he takes aim
      return { row: 1, f: 1.4 * (AI.st === 'charge' ? 1 : Math.min(1, AI.t / 18)) };
    }
    const gl = !!(w.b3 && w.b3.k === 'hop');   // gliding to a new spot = faster wing beat
    return { row: 0, f: tri(g + off, LH_N[0], gl ? LH_FLAP_FAST : LH_FLAP_T) };
  }
  const tc = document.createElement('canvas'); tc.width = LH_CW; tc.height = LH_CH; const tx = tc.getContext('2d');
  function one(ctx, img, row, i, alpha, tint) {
    const sx = i * LH_CW, sy = row * LH_CH;
    if (tint) {
      tx.clearRect(0, 0, LH_CW, LH_CH); tx.globalCompositeOperation = 'source-over'; tx.globalAlpha = 1; tx.drawImage(img, sx, sy, LH_CW, LH_CH, 0, 0, LH_CW, LH_CH);
      tx.globalCompositeOperation = 'source-atop'; tx.globalAlpha = tint[1]; tx.fillStyle = tint[0]; tx.fillRect(0, 0, LH_CW, LH_CH);
      ctx.globalAlpha = alpha; ctx.drawImage(tc, 0, 0, LH_CW, LH_CH, -LH_AX, -LH_AY, LH_CW, LH_CH);
    } else { ctx.globalAlpha = alpha; ctx.drawImage(img, sx, sy, LH_CW, LH_CH, -LH_AX, -LH_AY, LH_CW, LH_CH); }
  }
  function blit(ctx, img, row, f, alpha, tint) {   // fractional picture number = the two neighbouring pictures are blended -> smooth motion
    const n = LH_N[row]; let i = Math.floor(f); if (i < 0) i = 0; let fr = f - i, j = i + 1;
    if (i >= n - 1) { i = n - 1; fr = 0; } j = Math.min(n - 1, j);
    one(ctx, img, row, i, alpha, tint);
    if (fr > .03 && j !== i) one(ctx, img, row, j, alpha * fr, tint);
    ctx.globalAlpha = 1;
  }

  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    if (!isLH(w)) return _dw(ctx, w, isActive, t);
    const img = getImg(LH_ATLAS); if (!img || !img.complete || !img.naturalWidth) { loadImage(LH_ATLAS).catch(() => { }); return; }
    const now = G.frame | 0, sc = w.sc || 1, fo = w.flyOff || 0, f = w.face || 1, a0 = anchor(w);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (w.state === 'dead') {   // death: drops out of the air, flattens on the ground, lies there for a moment and fades away
      const df = Math.min(LH_N[3] - 1, w.dt / LH_DEATH_T), al = w.dt > 130 ? Math.max(0, 1 - (w.dt - 130) / 30) : 1; if (al <= 0) return;
      const fo2 = Math.max(0, fo - w.dt * 7), hb = 40 * sc - LH_BOT[0] * U, gk = ease(cl01((df - 1) / 2));
      const i = Math.min(LH_N[3] - 1, Math.floor(df)), j = Math.min(LH_N[3] - 1, i + 1), L = LH_BOT[i] + (LH_BOT[j] - LH_BOT[i]) * cl01(df - i);
      const ay = w.y - fo2 - hb * (1 - gk) - L * U;   // alive-height at the first picture, standing on the floor at the flat ones
      ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = 'rgba(0,0,0,' + (.28 * al) + ')'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 86, 9, 0, 0, 6.283); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(w.x, ay); ctx.scale(f * U, U); blit(ctx, img, 3, df, al); ctx.restore(); return;
    }
    // ---- cross-fade when he switches to ANOTHER animation (fly <-> attack <-> floor fire) so nothing snaps ----
    const p = pose(w); let st = w._lq;
    if (!st || now < st.lg || now - st.lg > 8) st = w._lq = { row: p.row, prev: null, t0: -99, lg: now, last: p };
    if (p.row !== st.row) { st.prev = st.last; st.row = p.row; st.t0 = now; }
    st.lg = now; st.last = p;
    const xf = Math.min(1, (now - st.t0 + 1) / LH_XFADE);
    ctx.save();
    if (w.state === 'drown') ctx.globalAlpha = Math.max(0, 1 - w.dt / 40);
    { const k = Math.max(.45, 1 - fo / 260); ctx.fillStyle = 'rgba(0,0,0,' + (.28 * k) + ')'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 86 * k, 9 * k, 0, 0, 6.283); ctx.fill(); }   // ground shadow shrinks while he is high
    ctx.save(); ctx.translate(a0.x, a0.y); ctx.scale(f * U, U);
    const tint = w.frozen > 0 ? ['#9fe4ff', .55] : (w.flash > 0 && (w.flash % 4) < 2) ? ['#ff4a2a', .6] : w.healT > 0 ? ['#e8ffee', .55 * w.healT / 36] : null;
    if (!(w.lhB >= 1)) { if (xf < 1 && st.prev) { blit(ctx, img, st.prev.row, st.prev.f, 1, tint); blit(ctx, img, p.row, p.f, xf, tint); } else blit(ctx, img, p.row, p.f, 1, tint); }
    if (w.lhB > 0 && w.lhP != null) { const fi = getImg(LR_FLAME); if (fi && fi.complete && fi.naturalWidth) blitF(ctx, fi, w.lhP, Math.min(1, w.lhB), tint); else loadImage(LR_FLAME).catch(() => { }); }   // powered up: flaming Lava Hound
    ctx.restore(); ctx.restore();
    if (w.state === 'drown') return;
    // ---- name / health bar / turn arrow (same as every other boss, above his wing) ----
    const T = G.teams[w.team], y = a0.y - 178 * U, bw = 46 * Math.max(1, sc * .85);
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(w.name, w.x, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(w.name, w.x, y - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w.x - bw / 2 - 1, y - 8, bw + 2, 8); ctx.fillStyle = T.color; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 6);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 2);
    ctx.font = '700 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(w.hp, w.x, y + 6); ctx.fillText(w.hp, w.x, y + 6);
    if (isActive && (G.phase === 'aim' || G.phase === 'retreat')) { const bb = Math.sin(t / 8) * 4; ctx.fillStyle = T.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y - 24 + bb); ctx.lineTo(w.x - 9, y - 40 + bb); ctx.lineTo(w.x + 9, y - 40 + bb); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.restore();
  };

  // =================================================================================================
  //  FLAME ROCK STORM  (every 4th turn)
  //  1) he glides to the MIDDLE of the players and rises high above them   2) he powers up (flaming Lava Hound pictures, 16 steps)
  //  3) 40 flaming rocks fall from the sky, slanted to the right, spread like Zeus's storm, each one damages the players where it lands   4) he calms down and comes back down
  // =================================================================================================
  const LR_OFF = () => {   // distance of a rock from his spot: same random launch angle / speed / gravity as the Death Reaper's aura ball (and Zeus's float storm) x LR_SPREAD
    const ang = rnd(-.62, .62) + (Math.random() < .5 ? 0 : rnd(-.25, .25)), sp = rnd(12.5, 19.5), g = .36;
    const vx = Math.sin(ang) * sp * .62 + rnd(-1.2, 1.2), vy = -Math.cos(ang) * sp, T = (-vy + Math.sqrt(vy * vy + 2 * g * LR_LAUNCH_H)) / g;
    return (vx * T + rnd(-26, 26) * 1.1) * LR_SPREAD;
  };
  const _thLR = BOSS3.think;
  BOSS3.think = function (w, ai) {
    if (isLH(w) && ai.bmoved && !ai.b3done && !ai.bspecial && (w.bt | 0) % LR_EVERY === 0) {   // (turns 12, 24 ...: the floor-fire special always wins, it is never skipped)
      ai.b3done = true; return this.start(w, ai, 'lhrain'); }
    return _thLR.call(this, w, ai);
  };
  BOSS3.s_lhrain = function (w, S) {
    const t = S.t, c = B3_BY_KIND[w.rob.b3] || {}, home = c.fly || 120;
    if (t === 1) {
      const xs = this.foes(w).map(p => p.x);
      S.tx = clamp(xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : w.x, 200, WORLD_W - 200); S.ph = 0; S.n = 0; S.next = 0; S.last = 0;
      w.lhP = 0; w.lhB = 0; w.flyGoal = LR_HOVER; w.bobBase = LR_HOVER;
      showBanner('🔥 ' + w.name + ' flies above you and powers up!', '#ff9a3a');
    }
    const ft = nearestFoe(w);
    if (S.ph === 0) {   // glide to the middle of the players and rise
      const dx = S.tx - w.x, dir = dx >= 0 ? 1 : -1, sp = 8; w.face = dir;
      if (Math.abs(dx) > sp) { if (!placeOnGround(w, w.x + dir * sp)) w.x += dir * sp; }
      w.flyGoal = LR_HOVER;
      if ((Math.abs(dx) <= sp + 1 && (w.flyOff || 0) >= LR_HOVER - 6) || t > 260) { S.ph = 1; S.t1 = t; if (ft) w.face = ft.x >= w.x ? 1 : -1;
        G.lhUpOn = true; if (!Snd.file('lh_up', .85)) snd('flame', .8); }   // power-up flame sound (long file: it is faded out when he powers down, see lrUpdate)
      return false;
    }
    const bob = Math.sin(t / 22) * 6; w.flyGoal = LR_HOVER + bob;
    if (ft) w.face = ft.x >= w.x ? 1 : -1;
    if (S.ph === 1) {   // power up: the flames grow picture by picture
      const u = Math.min(1, (t - S.t1) / LR_UP); w.lhP = 15 * u; w.lhB = Math.min(1, (t - S.t1) / 14);
      if ((t - S.t1) === 24) { shake(8); ringFx(w.x, w.y - (w.flyOff || 0) - 40, '#ff9a3a'); }
      if (u >= 1) { S.ph = 2; S.t2 = t; shake(14); snd('boom', .8); ringFx(w.x, w.y - (w.flyOff || 0) - 40, '#fff0a0', 6); }
      return false;
    }
    if (S.ph === 2) {   // rain: the flames burn at full power while the rocks fall
      w.lhB = 1; const m = 8, v = (((t - S.t2) / 5) % m + m) % m; w.lhP = 11 + (v > 4 ? m - v : v);   // pictures 11 -> 15 -> 11 ...
      if (S.n < LR_ROCKS && t >= S.next) {
        S.n++; S.next = t + Math.round(rnd(LR_GAP[0], LR_GAP[1]) * 60); S.last = t;
        let x = 0, y = -1; for (let i = 0; i < 30; i++) { x = w.x + LR_OFF(); if (x < 120 || x > WORLD_W - 120) continue; y = G.terrain.surfaceBelow(x, 0); if (y >= 0 && y < WATER_Y - 30) break; y = -1; }
        if (y < 0) { x = clamp(w.x, 120, WORLD_W - 120); y = G.terrain.surfaceBelow(x, 0); if (!(y >= 0 && y < WATER_Y - 30)) y = -1; }
        if (y >= 0) { (G.lhrock = G.lhrock || []).push({ gx: x, gy: y, age: 0, life: LR_FALL, d: this.dmg(w, LR_DMG), w, fr: rint(0, LR_RN - 1) }); ringFx(x, y - 4, '#ff8a3a'); Snd.file('lh_rock_fall', .6); }
      }
      if (S.n >= LR_ROCKS && t > S.last + LR_FALL + 24) { S.ph = 3; S.t3 = t; }
      return false;
    }
    // power down: the flames die out, he comes back down to his normal height
    if (G.lhUpOn && t === S.t3 + 1) { G.lhUpOn = false; Snd.stopFile('lh_up', .9); }
    const u = Math.min(1, (t - S.t3) / LR_DOWN); w.lhP = 15 * (1 - u); w.lhB = u < .7 ? 1 : 1 - (u - .7) / .3; w.flyGoal = u < .5 ? LR_HOVER + bob : home; w.bobBase = home;
    if (u >= 1 && (Math.abs((w.flyOff || 0) - home) < 6 || t > S.t3 + 220)) { w.lhP = null; w.lhB = 0; w.flyGoal = home; w.bobBase = home; if (ft) w.face = ft.x >= w.x ? 1 : -1; return true; }
    return false;
  };

  function lrUpdate() {
    if (G.lhUpOn && ((G.frame | 0) < 2 || !G.worms.some(w => isLH(w) && w.state !== 'dead' && w.state !== 'drown' && w.lhP != null) || !G.adv)) { G.lhUpOn = false; Snd.stopFile('lh_up', .7); }   // power-up sound ends when the flames die out
    if ((G.frame | 0) < 2) G.lhrock = [];
    const L = G.lhrock; if (!L || !L.length) return;
    for (const r of L) {
      r.age++;
      if (r.age === r.life) {   // lands: damage to every player near the spot (same falloff as any explosion), ground burst, shake
        explode(r.gx, r.gy - 14, 72, r.d, { owner: r.w, fx: null, carve: 0, knock: 6 }); shake(9); if (!Snd.file('lh_rock_hit', .8)) snd('boom', .55);
        (G.lhfx = G.lhfx || []).push({ k: 'rhit', x: r.gx, y: r.gy, age: 0, life: 26 });
      }
    }
    G.lhrock = L.filter(r => r.age <= r.life);
  }
  function lrDraw(ctx) {
    const L = G.lhrock, H = G.lhfx; const rk = getImg(LR_ROCK), ht = getImg(LR_HIT);
    if (L && L.length && rk && rk.complete && rk.naturalWidth) {
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      for (const r of L) {
        if (r.age >= r.life) continue;
        const p = r.age / r.life, e = Math.pow(p, 1.5), y0 = r.gy - LR_DROP, x0 = r.gx - LR_SLANT * LR_DROP;
        const x = x0 + (r.gx - x0) * e, y = y0 + (r.gy - 14 - y0) * e, fr = Math.floor(r.age / 2 + r.fr), m = 2 * (LR_RN - 1), v = ((fr % m) + m) % m, i = v > LR_RN - 1 ? m - v : v;
        ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.atan(LR_SLANT)); ctx.scale(LR_RS, LR_RS); ctx.globalAlpha = Math.min(1, r.age / 5);   // flames trail up-left, the rock falls down-right
        ctx.drawImage(rk, (i % 4) * LR_RW, Math.floor(i / 4) * LR_RH, LR_RW, LR_RH, -LR_RX, -LR_RY, LR_RW, LR_RH); ctx.restore();
      }
      ctx.restore();
    }
    if (H && H.length && ht && ht.complete && ht.naturalWidth) {
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      for (const e of H) {
        if (e.k !== 'rhit') continue;
        const fi = Math.min(15, Math.floor(e.age / e.life * 16)); ctx.save(); ctx.translate(e.x, e.y + 4); ctx.scale(LR_HS, LR_HS);
        ctx.drawImage(ht, (fi % 4) * LR_HW, Math.floor(fi / 4) * LR_HH, LR_HW, LR_HH, -LR_HGX, -LR_HGY, LR_HW, LR_HH); ctx.restore();
      }
      ctx.restore();
    }
  }
  const _upLR = BOSS3.update; BOSS3.update = function () { _upLR.call(this); if (G.adv) lrUpdate(); };
  const _drLR = BOSS3.draw; BOSS3.draw = function (ctx) { _drLR.call(this, ctx); lrDraw(ctx); };

  // flame-hound pictures (power-up): same blending as the normal ones
  const tfc = document.createElement('canvas'); tfc.width = LR_CW; tfc.height = LR_CH; const tfx = tfc.getContext('2d');
  function oneF(ctx, img, i, alpha, tint) {
    const sx = (i % 4) * LR_CW, sy = Math.floor(i / 4) * LR_CH;
    if (tint) {
      tfx.clearRect(0, 0, LR_CW, LR_CH); tfx.globalCompositeOperation = 'source-over'; tfx.globalAlpha = 1; tfx.drawImage(img, sx, sy, LR_CW, LR_CH, 0, 0, LR_CW, LR_CH);
      tfx.globalCompositeOperation = 'source-atop'; tfx.globalAlpha = tint[1]; tfx.fillStyle = tint[0]; tfx.fillRect(0, 0, LR_CW, LR_CH);
      ctx.globalAlpha = alpha; ctx.drawImage(tfc, 0, 0, LR_CW, LR_CH, -LR_AX, -LR_AY, LR_CW, LR_CH);
    } else { ctx.globalAlpha = alpha; ctx.drawImage(img, sx, sy, LR_CW, LR_CH, -LR_AX, -LR_AY, LR_CW, LR_CH); }
  }
  function blitF(ctx, img, f, alpha, tint) {
    f = Math.max(0, Math.min(15, f)); const i = Math.floor(f), fr = f - i, j = Math.min(15, i + 1);
    oneF(ctx, img, i, alpha, tint); if (fr > .03 && j !== i) oneF(ctx, img, j, alpha * fr, tint); ctx.globalAlpha = 1;
  }
  console.log('lavahound.js loaded - new Lava Hound sprites + muzzle flame/smoke active');
})();
