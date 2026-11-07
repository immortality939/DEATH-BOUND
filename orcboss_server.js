/* ONLINE VERSION of orcboss.js - upload this file to GitHub (online game only).
   The offline app keeps using orcboss.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  ORC BOSS (Gutrot the Wild Orc, Orc Pit)  +  ORC WHELPS (his small orcs)  -  new sprites from orc_action.png
//  Boss: breathing idle loop, run frames while he walks, "throwing spear" frames when he aims / throws (the flying spear is the
//        picture assets/proj/C01_Gutrot_Spear_proj.png), roar frames for his every-3rd-turn ROAR, new death.
//  Whelps: same sprite (red-brown skin), idle / run / swing frames.
//  Act sheet frames:  0-4 run | 5-8 throw (5 = spear cocked while aiming, 6 = wind-up, 7 = release, 8 = follow-through) | 9-12 roar | 13-16 idle (loop)
//  Same pattern as minocentaur.js: the act frame is chosen only while drawing, nothing else in the game is touched.
// ============================================================================================================
const OR = { RUN: 0, THROW: 5, ROAR: 9, IDLE: 13 };
const OR_GRIP = [400, 187];     // where the spear leaves his hand (512px sprite space; x is mirrored with his facing)
const OR_WHELP_SC = 1.0;        // on-screen size of the small orcs

(function () {
  // the spear is part of the picture now: no second held spear is drawn, the shot starts at his throwing hand
  const wd = WEAPONS.find(x => x.id === 'C01_Gutrot_Spear'); if (wd) wd.art = 'M0_Blank';
  if (typeof SIG_WMETA !== 'undefined' && SIG_WMETA['C01_Gutrot_Spear']) SIG_WMETA['C01_Gutrot_Spear'] = Object.assign({}, SIG_WMETA['C01_Gutrot_Spear'], { muzzle: [170, 128] });
  const GR = () => Array.from({ length: 12 }, () => ({ n: OR_GRIP.slice(), f: OR_GRIP.slice() }));
  ADV_MAPS.forEach(M => { const b = M.boss2; if (b && b.bossId === 'boss_gutrot') b.anchors = GR(); });
  if (typeof CMINIONS !== 'undefined' && CMINIONS.gutrot) { const c = CMINIONS.gutrot; c.act = 'adventure/minion_gutrot_act.webp'; c.sc = OR_WHELP_SC; c.anchors = GR(); }

  const isBossO = w => !!(w && w.rob && w.rob.id === 'boss_gutrot'), isWhelp = w => !!(w && w.minion && w.rob && w.rob.id === 'minion_gutrot');
  const IDLE_SEQ = [0, 1, 2, 3, 2, 1];   // ping-pong so the breathing loops smoothly
const idleF = w => OR.IDLE;   // ONE fixed idle picture: the 4 idle sprite frames sit 1-2px apart, which is x2.7 on screen = visible shaking when they switch. The life comes from the smooth sway below.

  // hit shapes / body centre that match the new picture
  const _bs = bodyShapes; bodyShapes = w => {
    if (!isBossO(w)) return _bs(w);
    const sc = w.sc || 1, fy = w.y - (w.hop || 0) - (w.flyOff || 0), f = w.face || 1;
    return [[w.x, fy - 30 * sc, 17 * sc, 27 * sc], [w.x + f * 4 * sc, fy - 54 * sc, 13 * sc, 12 * sc]];
  };
  const _bc = bodyCenter; bodyCenter = w => isBossO(w) ? [w.x, w.y - (w.hop || 0) - (w.flyOff || 0) - 30 * (w.sc || 1)] : _bc(w);

  // remember when the spear was thrown / the whelp swung (drives the throw / swing frames)
  const _ls = launchShot; launchShot = function (w) { if (isBossO(w)) w.throwT0 = G.frame; return _ls.apply(this, arguments); };
  const _fm = fireMelee; fireMelee = function (w) { if (isWhelp(w)) w.oSwing = G.frame; return _fm.apply(this, arguments); };

  // Gutrot's idle: NO growing / shrinking (breathing removed on request). The 4 idle sprite frames only differ by ~2px, so he looked frozen -
  // instead he gets a slow weight-shift (a small lean left / right around his feet, size never changes) and the frames loop a bit faster.
  const _bi = bossIdleXf; bossIdleXf = function (w) {
    if (isBossO(w) && w._orcIdle && w.state === 'ground' && !(w.frozen > 0)) { const t = (G.frame || 0) + (w.idx || 0) * 37; return { sx: 1, sy: 1, rot: .024 * Math.sin(t / 26) }; }   // one slow sine = smooth, no shaking
    if (isWhelp(w) && w._orcIdle && w.state === 'ground' && !(w.frozen > 0)) { const t = (G.frame || 0) + (w.idx || 0) * 53; return { sx: 1, sy: 1, rot: .02 * Math.sin(t / 24) }; }
    return _bi(w);
  };
  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    const R = w.rob, boss = isBossO(w), whelp = isWhelp(w);
    if (!(boss || whelp) || !R.act || w.state === 'dead' || w.state === 'drown') return _dw(ctx, w, isActive, t);
    const keep = w.actF; let f = keep; w._orcIdle = false;
    if (boss) {
      const tt = G.frame - (w.throwT0 == null ? -9999 : w.throwT0);
      if (keep != null) { const s = w.spT | 0; f = OR.ROAR + (s < 12 ? 0 : s < 24 ? 1 : s < 40 ? 2 : 3); }          // special move = ROAR (mouth opens when the shock hits)
      else if (w.state === 'air') f = OR.RUN + 2;
      else if (tt >= 0 && tt < 26) f = OR.THROW + (tt < 10 ? 2 : 3);                                                  // the throw: release, follow-through
      else if (w.walking > 0 && !(w.frozen > 0)) f = OR.RUN + (Math.floor(G.frame / 4) % 5);                          // walking = running frames
      else if (isActive && G.activeWorm === w && (G.phase === 'aim' || G.phase === 'shooting') && !(w.frozen > 0)) f = OR.THROW;   // spear cocked while aiming / charging
      else { f = idleF(w); w._orcIdle = true; }                                                                        // breathing idle
    } else {
      const tt = G.frame - (w.oSwing == null ? -9999 : w.oSwing);
      if (w.state === 'air') f = OR.RUN + 2;
      else if (tt >= 0 && tt < 24) f = OR.THROW + (tt < 8 ? 2 : 3);
      else if (w.walking > 0 && !(w.frozen > 0)) f = OR.RUN + (Math.floor(G.frame / 4) % 5);
      else { f = idleF(w); w._orcIdle = true; }
    }
    w.actF = f; try { return _dw(ctx, w, isActive, t); } finally { w.actF = keep; }
  };
  console.log('orcboss.js loaded - Gutrot animations active');
})();