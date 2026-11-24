// ============================================================================================================
//  PLATFIX - boss stage enemies that can stand on the floating platforms (werewolf + small wolves, minotaur)
//  must COME DOWN FIRST when a player stands lower than they do, and only then use their skill.
//  Before this, the werewolf "strike forward" (berserker dash) and the minotaur "shockwave" were started from the
//  platform: the dash ran along the platform in the air and never reached the players below.
//
//  How it works: it wraps the turn scripts. At the start of the script, if the enemy stands on a floating platform
//  (above the flat floor of the arena) and some player is lower than it, it first runs to the edge of the platform,
//  jumps down next to that player (the same run + leap the claw attack already used), then the normal script starts
//  from the ground exactly as if the turn had just begun.
//  Ranged skills (golem rock throw, slime splash that hits everyone on the ground) are not touched.
// ============================================================================================================
(function () {
  const LOW_DY = 55;   // a player lower than this many px counts as "below"
  const PF = window.PF = {
    onPlat(w) { const T = G.terrain; if (!T || !T.floor || w.state !== 'ground' || w.hover) return false; const x = Math.max(0, Math.min(T.W - 1, Math.round(w.x))); return w.y < T.floor[x] - 45; },
    lowTarget(w, foes) { const c = foes.filter(f => f.state !== 'dead' && f.state !== 'drown' && f.y > w.y + LOW_DY); if (!c.length) return null; c.sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x)); return c[0]; },
    // one tick of the "come down first" routine. true = finished (on the ground, script can start)
    step(ad, w, S) {
      const P = S.pf, tg = P.tg;
      if (!tg || tg.state === 'dead' || tg.state === 'drown') { ad.end(w, S); return true; }
      if (P.ph === 'edge') {
        const dir = tg.x >= w.x ? 1 : -1; w.face = dir; P.et++;
        const r = ad.run(w, S, tg.x, dir), edge = !ad.groundAhead(w, dir);
        if (edge || r !== 'go' || P.et > 260) P.ph = 'stop';
        return false;
      }
      if (P.ph === 'stop') {
        if (!ad.stop(w, S)) return false;
        let ok = ad.leapStart(w, S, tg);
        if (!ok) { const T = G.terrain, fy = T.floor[Math.max(0, Math.min(T.W - 1, Math.round(w.x)))]; ok = ad.leapStart(w, S, { x: w.x, y: fy - 1, state: 'ground', name: '', hp: 1 }); }   // nobody's level reachable: just drop to the floor below the edge
        if (!ok) { ad.end(w, S); return true; }
        P.ph = 'leap'; return false;
      }
      if (P.ph === 'leap') { if (ad.leapStep(w, S)) { S.lp = null; ad.end(w, S); return true; } return false; }
      return true;
    },
  };
  function wrap(obj, name, ad, cond) {
    const orig = obj[name]; if (typeof orig !== 'function') return;
    obj[name] = function (w, S) {
      if (S.pf === undefined) {   // first tick of this script
        S.pf = null;
        if (cond(w) && PF.onPlat(w)) { const tg = PF.lowTarget(w, BOSS3.foes(w)); if (tg) { S.pf = { ph: 'edge', tg, et: 0 }; S.stuck = 0; } }
      }
      if (S.pf) {
        if (!PF.step(ad, w, S)) return false;
        S.pf = null; S.t = 1;   // on the ground now: the real script starts as if the turn had just begun
      }
      return orig.call(this, w, S);
    };
  }
  // ---------- werewolf (boss + small wolves): the strike forward always; the move too ----------
  if (typeof WWX !== 'undefined') {
    const sz = w => (w.sc || 3) / 3;
    const ww = {
      run: (w, S, tx) => WWX.run(w, S, tx, WW_RUN * sz(w), 40 * sz(w)),
      stop: (w, S) => WWX.stop(w, S),
      groundAhead: (w, dir) => WWX.groundAhead(w, dir),
      leapStart: (w, S, tg) => WWX.leapStart(w, S, tg),
      leapStep: (w, S) => WWX.leapStep(w, S.lp),
      end: (w, S) => { S.v = null; S.rt = 0; S.st = null; S.noBlend = false; S.stuck = 0; w.hover = false; w.hop = 0; w.actF = null; w.wwPh = 0; },
    };
    wrap(WWX, 's_ww_strike', ww, () => true);
    wrap(WWX, 's_ww_move', ww, () => true);
  }
  // ---------- minotaur / centaur boss: the big smash (shockwave / gallop) ----------
  if (typeof MC !== 'undefined') {
    const mc = {
      run: (w, S, tx, dir) => { const r = MC.walk(w, S, tx, MC.isMino(w) ? MINO_WALK * BOSS_RUN_MUL : CEN_RUN); S.et = (S.et | 0) + 1; if (MC.isMino(w)) { w.actF = MN.WALK + (Math.floor(S.et / 2) % MN_WALK_N); if (S.et % 9 === 0) shake(3); } else w.actF = CN.RUN + (Math.floor(S.et / 2) % 7); return r; },
      stop: () => true,
      groundAhead: (w, dir) => MC.groundAhead(w, dir),
      leapStart: (w, S, tg) => MC.leapStart(w, S, tg, true),
      leapStep: (w, S) => MC.leapStep(w, S.lp, true),
      end: (w, S) => { S.stuck = 0; S.et = 0; w.hover = false; w.hop = 0; w.actF = null; },
    };
    wrap(MC, 's_mc_special', mc, () => true);
    wrap(MC, 's_mc_move', mc, () => true);
  }
  console.log('platfix.js loaded - platform enemies come down first before their skills');
})();
