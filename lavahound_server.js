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

(function () {
  const isLH = w => !!(w && w.rob && w.rob.id === 'boss_lavahound');
  const U = LH_UNIT;
  const ease = k => k * k * (3 - 2 * k), cl01 = k => k < 0 ? 0 : k > 1 ? 1 : k;
  const snd = (n, v) => { try { Snd.play(n, v); } catch (e) { } };

  // ---- load the new pictures; every OLD lava hound sheet path points at the new atlas, so the old art can never be drawn ----
  loadImage(LH_ATLAS).catch(() => { }); loadImage(LH_FLAME).catch(() => { }); loadImage(LH_SMOKE).catch(() => { });
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
        if (w.spT === BURN_PEAK - 2) { lhMuzzle(w, true, true); snd('flame', .9); }
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
    if (xf < 1 && st.prev) { blit(ctx, img, st.prev.row, st.prev.f, 1, tint); blit(ctx, img, p.row, p.f, xf, tint); } else blit(ctx, img, p.row, p.f, 1, tint);
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
  console.log('lavahound.js loaded - new Lava Hound sprites + muzzle flame/smoke active');
})();
