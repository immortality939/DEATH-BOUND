/* ONLINE VERSION of minocentaur.js - upload this file to GitHub (online game only).
   The offline app keeps using minocentaur.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  MINOTAUR BOSSES (Temple Minotaur, Zenith Minotaur)  +  CENTAUR WARCHIEF (HEROIC third boss of Plaguewood)
//  New sprites (axe is part of the picture), no more axe / boulder throwing. Melee only.
//
//  MINOTAURS - every turn:
//    1) MOVE FIRST   - walks a few steps to a random side, or (random turns, MINO_JUMP_CHANCE) JUMPS to a completely different spot
//    2) ATTACK       - walks up to the nearest player and SLASHES him (damage to everybody in front of the axe)
//    3) every 3rd turn: instead of the slash it SMASHES THE GROUND with its axe -> a shockwave runs along the floor toward
//       the player; everybody standing on the ground in its path takes STRONG damage (jump over it)
//  CENTAUR WARCHIEF - every turn:
//    1) MOVE FIRST   - gallops a random distance to one side
//    2) ATTACK       - gallops to a random player and SLASHES him
//    3) every 3rd turn: hunts EVERY player standing on the ground one after the other, gallops to him and SMASHES him
//       with strong damage (players in the air are safe)
//  Sprite sheets (replaced): assets/adventure/boss_templemino_*.webp, boss_zenithmino_*.webp, boss_warchief_*.webp  (hold / act / death)
//    minotaur act sheet frames: 0-4 walk, 5-11 slash, 12-17 smash, 18-23 jump, 24 idle
//    centaur  act sheet frames: 0-6 run, 7-12 slash, 13-18 smash, 19 idle
//  Built on the boss3.js framework (same pattern as slimeboss.js): it wraps BOSS3.think / BOSS3.step, so ai.js / world.js / render.js are not touched.
// ============================================================================================================

// ---- TUNING ----
const MINO_JUMP_CHANCE = .4;                                   // chance per turn that the minotaur jumps to a new spot instead of walking
const MINO_SLASH_MUL = { templemino: 1, zenithmino: 1.8 };      // slash damage = boss weapon damage x this (Zenith's weapon number is lower because it used to throw two axes)
const MINO_WAVE_MUL = { templemino: 1.5, zenithmino: 2.6 };     // ground-smash shockwave damage (strong)
const MINO_SC = 3.3;                                           // on-screen size of the minotaurs
const MINO_WALK = 5.5, MINO_STEP_MIN = 110, MINO_STEP_MAX = 250, MINO_REACH_STOP = 150, MINO_HIT_FRONT = 250, MINO_HIT_BACK = 40;
const CEN_RUN = 15, CEN_STEP_MIN = 200, CEN_STEP_MAX = 420, CEN_REACH_STOP = 175, CEN_HIT_FRONT = 290, CEN_HIT_BACK = 60;
const CEN_SLASH_MUL = 1, CEN_SMASH_MUL = 2.2;                  // centaur: slash = weapon damage x 1, ground-player smash = x 2.2 (strong)

const MN = { WALK: 0, SLASH: 4, SMASH: 11, JUMP: 17, IDLE: 23 };   // minotaur act-sheet frame map (0-3 walk, 4-10 slash, 11-16 smash, 17-22 jump, 23-26 idle)
const CN = { RUN: 0, SLASH: 7, SMASH: 13, IDLE: 19 };               // centaur act-sheet frame map (0-6 run, 7-12 slash, 13-18 smash, 19-22 idle)
const MN_WALK_N = 4, MN_IDLE_N = 4, CN_IDLE_N = 4;
// ---- leap / follow tuning (player on a floating platform -> the minotaur JUMPS to him; minotaur on a platform and player below -> it walks (boss: RUNS) to the edge and jumps down) ----
const LEAP_DY = 55;                      // height difference (px) that makes the minotaur leap instead of walking
const BOSS_RUN_MUL = 2.2;                // boss run speed = MINO_WALK x this when it runs to the edge of its platform (no run sprite: walk frames played faster)
const MINI_SC = 1.15;                    // on-screen size of the small minotaurs (was .95)
const MC_ANCH = Array.from({ length: 9 }, () => ({ n: [238, 300], f: [238, 300] }));

(function () {
  // the swung axe is in the picture: the boss weapons carry a blank "held" picture so no second axe / boulder is drawn
  ['C05_Temple_Axe', 'C07_Zenith_Axe', 'C11_Warchief_Rock'].forEach(id => { const wd = WEAPONS.find(x => x.id === id); if (wd) wd.art = 'M0_Blank'; });

  ADV_MAPS.forEach(M => {
    const b = M.boss2;
    if (b && (b.bossId === 'boss_templemino' || b.bossId === 'boss_zenithmino')) { b.b3 = 'mino'; b.sc = MINO_SC; b.anchors = MC_ANCH; }
    if (M.boss3 && M.boss3.bossId === 'boss_warchief') M.boss3.anchors = MC_ANCH;
  });
  B3_BY_KIND.mino = { kind: 'mino', key: 'minotaur', name: 'Minotaur', wide: 1 };

  // hit shapes / body centre that match the new pictures
  const _bs = bodyShapes; bodyShapes = w => {
    const k = w.rob && w.rob.b3;
    if (k === 'mino' || k === 'centaur') {
      const sc = w.sc || 1, fy = w.y - (w.hop || 0) - (w.flyOff || 0), f = w.face || 1;
      if (k === 'mino') return [[w.x, fy - 28 * sc, 24 * sc, 29 * sc], [w.x + f * 8 * sc, fy - 48 * sc, 16 * sc, 14 * sc]];
      return [[w.x - f * 4 * sc, fy - 24 * sc, 34 * sc, 24 * sc], [w.x + f * 12 * sc, fy - 52 * sc, 16 * sc, 20 * sc]];
    }
    return _bs(w);
  };
  const _bc = bodyCenter; bodyCenter = w => {
    const k = w.rob && w.rob.b3, sc = w.sc || 1;
    if (k === 'mino') return [w.x, w.y - (w.hop || 0) - 28 * sc];
    if (k === 'centaur') return [w.x, w.y - (w.hop || 0) - 30 * sc];
    return _bc(w);
  };

  // ---- hook the boss3 framework ----
  const _think = BOSS3.think;
  BOSS3.think = function (w, ai) {
    const k = w.rob.b3; if (k !== 'mino' && k !== 'centaur') return _think.call(this, w, ai);
    if (!ai.b3hop) { ai.b3hop = true; ai.bmoved = true; return this.start(w, ai, 'mc_move'); }                                         // 1) move first
    if (!ai.b3done) { ai.b3done = true; return this.start(w, ai, ai.bspecial ? 'mc_special' : 'mc_slash'); }                          // 2) slash, or every 3rd turn the big smash
    return false;
  };
  // ---- small minotaurs (boss minions): new look + idle / walk / jump / slash animation + leap to players on other levels ----
  ['templemino', 'zenithmino'].forEach(k => { const c = CMINIONS[k]; if (c) { c.act = 'adventure/minion_' + k + '_act.webp'; c.sc = MINI_SC; } });
  const _fm = fireMelee; fireMelee = function (w, wd) { if (MC.isMinoAny(w)) w.slashT0 = G.frame; return _fm.apply(this, arguments); };
  const _ss = AI.swarmStep;
  AI.swarmStep = function (m) {
    if (!MC.isMinoAny(m) || m.ghost) return _ss.call(this, m);
    if (m.lp) { if (MC.leapStep(m, m.lp, false)) { m.lp = null; m.scanT = 0; m.mt = 0; m.jx = null; } return; }   // in the middle of a leap
    if (m.state !== 'ground' || m.frozen > 0) return _ss.call(this, m);
    const foes = aliveWorms().filter(e => e.team !== m.team); if (!foes.length) return _ss.call(this, m);
    foes.sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x)); const tg = foes[0], dir = tg.x >= m.x ? 1 : -1;
    const need = m.leapRound === G.round ? null : MC.leapNeeded(m, tg);
    if (need === 'up') { m.leapRound = G.round; if (MC.leapStart(m, m, tg, false) && m.lp) return; }
    else if (need === 'down') {   // walk to the edge of the platform, then jump down next to the player
      m.face = dir; m.et = (m.et | 0) + 1;
      if (Math.abs(tg.x - m.x) < 40 || !MC.groundAhead(m, dir) || m.et > 260 || (m.mstuck | 0) > 8) { m.leapRound = G.round; m.et = 0; if (MC.leapStart(m, m, tg, false) && m.lp) return; return _ss.call(this, m); }
      const x0 = m.x; walkWorm(m, dir); if (Math.abs(m.x - x0) < .01) m.mstuck = (m.mstuck | 0) + 1; else m.mstuck = 0; return;
    }
    return _ss.call(this, m);
  };
  // ---- drawing: idle loop for bosses + minotaurs, walk / jump / slash frames for the small minotaurs (act sheet frames are set only for the draw, then restored) ----
  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    const R = w.rob; if (!R || !R.act || w.state === 'dead' || w.state === 'drown' || !(R.b3 === 'mino' || R.b3 === 'centaur' || MC.isMinoAny(w))) return _dw(ctx, w, isActive, t);
    const keep = w.actF; let f = keep;
    if (f == null) {
      if (w.minion) {   // small minotaur
        const J = MN.JUMP, tt = G.frame - (w.slashT0 == null ? -999 : w.slashT0);
        if (w.state === 'air') { f = w.vy < -2 ? J + 2 : w.vy < 2 ? J + 3 : J + 4; w._air = G.frame; }
        else if (tt >= 0 && tt < 30) f = MN.SLASH + (tt < 4 ? 3 : tt < 10 ? 4 : tt < 20 ? 5 : 6);
        else if (!w.done && w.mt > 0 && w.mt <= 12 && G.swarm) f = MN.SLASH + (w.mt < 5 ? 0 : w.mt < 9 ? 1 : 2);
        else if (w._air != null && G.frame - w._air < 9) f = MN.JUMP + 5;
        else if (w.walking > 0 && !(w.frozen > 0)) f = MN.WALK + (Math.floor(G.frame / 5) % MN_WALK_N);
        else f = MC.idleF(w);
      } else if (w.state === 'ground' && !(w.frozen > 0)) f = MC.idleF(w);   // boss standing still: idle loop
    }
    w.actF = f; try { return _dw(ctx, w, isActive, t); } finally { w.actF = keep; }
  };
  const _step = BOSS3.step;
  BOSS3.step = function (w, ai) {
    const S = w.b3; if (!S || String(S.k).indexOf('mc_') !== 0) return _step.call(this, w, ai);
    S.t++; const fin = MC['s_' + S.k](w, S); if (!fin) return;
    w.b3 = null; w.actF = null; w.hop = 0; w.hover = false;
    if (S.k === 'mc_move') { ai.st = 'think'; ai.t = 10; } else this.endTurn(w, ai);
  };
})();

const MC = {
  // ---------- NEW: idle loop, leap up to a platform / run to the edge and jump down ----------
  isMinoAny(w) { return !!(w && w.rob && (w.rob.b3 === 'mino' || (w.minion && /^minion_(temple|zenith)mino$/.test(w.rob.id || '')))); },
  idleF(w) { const t = Math.floor(((G.frame | 0) + (w.idx | 0) * 7) / 8); return w.rob.b3 === 'centaur' ? CN.IDLE + t % CN_IDLE_N : MN.IDLE + t % MN_IDLE_N; },
  leapNeeded(w, tg) { if (!tg || tg.state !== 'ground') return null; const dy = tg.y - w.y; return dy < -LEAP_DY ? 'up' : dy > LEAP_DY ? 'down' : null; },
  groundAhead(w, dir) { const T = G.terrain, sc = w.sc || 1, x = w.x + dir * (11 * sc + 8); for (let k = 2; k <= 46; k += 4) if (T.solid(x, w.y + k)) return true; return false; },
  landSpot(w, tg, stop) {   // a free standing spot next to the target, on HIS level (his side first, then the other side, then closer and closer)
    const T = G.terrain, sc = w.sc || 1, side0 = w.x <= tg.x ? -1 : 1;
    for (const f of [1, .65, .35, 0]) for (const side of [side0, -side0]) {
      const x = clamp(tg.x + side * stop * f, 100, WORLD_W - 100), y = T.surfaceBelow(x, Math.max(0, tg.y - 90)); if (y < 0 || Math.abs(y - tg.y) > 42 || y > WATER_Y - 60) continue;
      if (blocked(x, y - 2, sc) || !onGround(x, y, sc) || !T.solid(x - 8 * sc, y + 2) || !T.solid(x + 8 * sc, y + 2)) continue; return { x, y: y - 1 };   // must stand fully on the floor (not hanging over an edge)
    }
    return null;
  },
  leapStart(w, S, tg, big) {   // true = leap started (S.lp holds it)
    const sp = this.landSpot(w, tg, big ? MINO_REACH_STOP : 46); if (!sp) return false;
    const dist = Math.abs(sp.x - w.x);
    S.lp = { sp, t: 0, x0: w.x, y0: w.y, hov0: !!w.hover, c: big ? 14 : 7, k: big ? 6 : 3, ft: Math.round(big ? clamp(38 + dist / 18, 38, 74) : clamp(26 + dist / 22, 26, 50)), ld: big ? 22 : 12, apex: big ? 170 : 62 };
    w.face = sp.x >= w.x ? 1 : -1; w.hover = true; if (big) { showBanner('⚠ ' + w.name + ' leaps to ' + tg.name + '!', '#c9a8ff'); Snd.play('boom', .5); } return true;
  },
  leapStep(w, L, big) {   // crouch -> take off -> flight (arc) -> landing. true = finished
    L.t++; const t = L.t, sp = L.sp, J = MN.JUMP, T0 = L.c + L.k, FT = L.ft;
    if (t <= L.c) { w.actF = J; return false; }
    if (t <= T0) { w.actF = J + 1; return false; }
    if (t <= T0 + FT) {
      const a = (t - T0) / FT, e = a * a * (3 - 2 * a), up = Math.max(0, L.y0 - sp.y);
      w.x = L.x0 + (sp.x - L.x0) * e; w.y = L.y0 + (sp.y - L.y0) * e; w.hop = Math.sin(Math.PI * a) * (L.apex + up * (big ? .4 : .3));
      w.actF = J + (a < .25 ? 2 : a < .6 ? 3 : 4); w.face = sp.x >= L.x0 ? 1 : -1; return false;
    }
    if (t === T0 + FT + 1) { w.x = sp.x; w.y = sp.y; w.hop = 0; w.hover = L.hov0; w.vx = w.vy = 0; w.state = 'ground'; shake(big ? 20 : 6); Snd.play('boom', big ? 1 : .45); debris(w.x, w.y - 4, big ? 16 : 7, 'dirt'); if (big) { ringFx(w.x, w.y - 4, '#ffcf8a'); addFx('explosion_small', w.x, w.y - 8, 1.4); } }
    const l = t - (T0 + FT); w.actF = l < L.ld * .55 ? J + 5 : J; w.hop = 0; if (l > L.ld) { w.actF = null; return true; } return false;
  },
  key(w) { return String(w.rob.id || '').replace('boss_', ''); },
  isMino(w) { return w.rob.b3 === 'mino'; },
  face(w, t) { if (t) w.face = t.x >= w.x ? 1 : -1; },
  foes(w) { return BOSS3.foes(w); },
  // one walking / galloping step toward tx: 'go' | 'done' | 'blocked'
  walk(w, S, tx, sp) {
    const d = tx - w.x; if (Math.abs(d) <= sp + .5) return 'done';
    const dir = d > 0 ? 1 : -1; w.face = dir; const x0 = w.x;
    if (!placeOnGround(w, w.x + dir * sp) || Math.abs(w.x - x0) < .05) { if (++S.stuck > 8) return 'blocked'; } else S.stuck = 0;
    return 'go';
  },
  // ---------------- 1) move first ----------------
  s_mc_move(w, S) {
    const t = S.t, mino = this.isMino(w), sc = w.sc || 1;
    if (t === 1) {
      S.stuck = 0; S.mode = 'walk'; S.pause = 0;
      if (mino && Math.random() < MINO_JUMP_CHANCE) { const sp = this.pickJump(w); if (sp) { S.mode = 'jump'; S.sp = sp; S.x0 = w.x; S.y0 = w.y; w.face = sp.x >= w.x ? 1 : -1; w.hover = true; showBanner('⚠ ' + w.name + ' leaps to a new spot!', '#c9a8ff'); Snd.play('boom', .5); } }
      if (S.mode === 'walk') {
        let dir = Math.random() < .5 ? -1 : 1; if (AI.edgeNear(w, dir)) dir = -dir; if (AI.edgeNear(w, dir)) return true;   // never walk toward a drop
        const d = mino ? rnd(MINO_STEP_MIN, MINO_STEP_MAX) : rnd(CEN_STEP_MIN, CEN_STEP_MAX); S.tx = clamp(w.x + dir * d, 150, WORLD_W - 150); w.face = dir;
      }
    }
    if (S.mode === 'jump') return this.jump(w, S);
    if (S.pause) { w.actF = this.idleF(w); return ++S.pause > 8; }
    const r = this.walk(w, S, S.tx, mino ? MINO_WALK : CEN_RUN * .8);
    if (mino) { w.actF = MN.WALK + (Math.floor(t / 5) % MN_WALK_N); if (t % 18 === 0) shake(2); }
    else { w.actF = CN.RUN + (Math.floor(t / 3) % 7); if (t % 4 === 0) { addFx('smoke', w.x - w.face * 60, w.y - 6, .9); } if (t % 12 === 0) shake(3); }
    if (r !== 'go' || t > 170) S.pause = 1;
    return false;
  },
  pickJump(w) {   // a landing spot far from here, on solid flat-ish floor, not on top of a player
    const T = G.terrain, sc = w.sc || 1, foes = this.foes(w);
    for (let i = 0; i < 40; i++) {
      const x = rnd(260, WORLD_W - 260); if (Math.abs(x - w.x) < 320) continue;
      const y = T.surfaceBelow(x, Math.max(0, w.y - 260)); if (y < 0 || y > WATER_Y - 70 || Math.abs(y - w.y) > 190) continue;
      if (blocked(x, y - 2, sc) || !onGround(x, y, sc)) continue;
      if (foes.some(p => Math.abs(p.x - x) < 130)) continue;
      return { x, y: y - 1 };
    }
    return null;
  },
  jump(w, S) {   // crouch 14, take off 6, flight 50, landing 22
    const t = S.t, sp = S.sp, FT = 50, J = MN.JUMP;
    if (t <= 14) { w.actF = J; return false; }
    if (t <= 20) { w.actF = J + 1; return false; }
    if (t <= 20 + FT) {
      const a = (t - 20) / FT, e = a * a * (3 - 2 * a), up = Math.max(0, S.y0 - sp.y);
      w.x = S.x0 + (sp.x - S.x0) * e; w.y = S.y0 + (sp.y - S.y0) * e; w.hop = Math.sin(Math.PI * a) * (170 + up * .4);
      w.actF = J + (a < .25 ? 2 : a < .6 ? 3 : 4); w.face = sp.x >= S.x0 ? 1 : -1; return false;
    }
    if (t === 21 + FT) { w.x = sp.x; w.y = sp.y; w.hop = 0; w.hover = false; shake(20); Snd.play('boom', 1); debris(w.x, w.y - 4, 16, 'dirt'); ringFx(w.x, w.y - 4, '#ffcf8a'); addFx('explosion_small', w.x, w.y - 8, 1.4); }
    const l = t - (20 + FT); w.actF = l < 12 ? J + 5 : J; w.hop = 0; return l > 22;
  },
  // ---------------- 2) walk up to a player and slash ----------------
  s_mc_slash(w, S) {
    const mino = this.isMino(w), t = S.t;
    if (t === 1) {
      const fs = this.foes(w); if (!fs.length) return true;
      S.tg = mino ? fs.slice().sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x))[0] : fs[rint(0, fs.length - 1)];
      S.stuck = 0; S.ph = 'go'; S.u = 0; this.face(w, S.tg);
      showBanner('⚠ ' + w.name + ' goes for ' + S.tg.name + '!', mino ? '#c9a8ff' : '#ffb347'); Snd.play(mino ? 'slash' : 'boom', .5);
    }
    const tg = S.tg;
    if (mino && S.ph === 'go' && !S.leaped && tg && tg.state === 'ground') {   // player on another level -> leap up to him / run to the edge and jump down
      const need = this.leapNeeded(w, tg);
      if (need === 'up') { S.leaped = true; if (this.leapStart(w, S, tg, true)) S.ph = 'leap'; }
      else if (need === 'down') { S.leaped = true; S.ph = 'edge'; S.stuck = 0; S.et = 0; showBanner('⚠ ' + w.name + ' charges to the edge…', '#c9a8ff'); }
    }
    if (S.ph === 'edge') {   // minotaur on a platform, player below: RUN to the edge, then jump down next to him
      if (!tg || tg.state === 'dead' || tg.state === 'drown') return true;
      const dir = tg.x >= w.x ? 1 : -1; w.face = dir; S.et++;
      const r = this.walk(w, S, tg.x, MINO_WALK * BOSS_RUN_MUL), cnt = Math.abs(tg.x - w.x) < 60 || !this.groundAhead(w, dir);
      w.actF = MN.WALK + (Math.floor(S.et / 2) % MN_WALK_N); if (S.et % 9 === 0) shake(3);
      if (cnt || r !== 'go' || S.et > 240) { if (this.leapStart(w, S, tg, true)) S.ph = 'leap'; else { S.ph = 'go'; S.t0 = t; } }
      return false;
    }
    if (S.ph === 'leap') { if (this.leapStep(w, S.lp, true)) { S.lp = null; S.ph = 'go'; S.t0 = t; this.face(w, tg); } return false; }
    if (S.ph === 'go') {
      if (!tg || tg.state === 'dead' || tg.state === 'drown') return true;
      const stop = mino ? MINO_REACH_STOP : CEN_REACH_STOP, sp = mino ? MINO_WALK * 1.3 : CEN_RUN;
      const goal = tg.x - Math.sign(tg.x - w.x || 1) * stop, close = Math.abs(tg.x - w.x) <= stop + 6;
      const r = close ? 'done' : this.walk(w, S, goal, sp);
      if (mino) { w.actF = MN.WALK + (Math.floor(t / 4) % MN_WALK_N); if (t % 14 === 0) shake(2); }
      else { w.actF = CN.RUN + (Math.floor(t / 2) % 7); if (t % 3 === 0) addFx('smoke', w.x - w.face * 60, w.y - 6, .9); if (t % 10 === 0) shake(4); }
      this.face(w, tg);
      if (r !== 'go' || t - (S.t0 || 0) > 300) { S.ph = 'slash'; S.u = 0; }
      return false;
    }
    S.u++; const u = S.u; this.face(w, S.tg && S.tg.state !== 'dead' ? S.tg : null);
    const F = mino ? MN.SLASH : CN.SLASH, imp = mino ? 25 : 16;
    if (mino) w.actF = F + (u < 10 ? 0 : u < 20 ? 1 : u < 25 ? 2 : u < 30 ? 3 : u < 36 ? 4 : u < 44 ? 5 : 6);
    else w.actF = F + (u < 8 ? 0 : u < 16 ? 1 : u < 20 ? 2 : u < 25 ? 3 : u < 31 ? 4 : 5);
    if (u === imp) {
      const dmg = BOSS3.dmg(w, mino ? (MINO_SLASH_MUL[this.key(w)] || 1) : CEN_SLASH_MUL), fr = mino ? MINO_HIT_FRONT : CEN_HIT_FRONT, bk = mino ? MINO_HIT_BACK : CEN_HIT_BACK;
      let n = 0; Snd.play(mino ? 'mp3_mino_attack' : 'mp3_cen_attack'); shake(10);
      for (const p of this.foes(w)) {
        const dx = (p.x - w.x) * w.face; if (dx < -bk || dx > fr || Math.abs(p.y - w.y) > 170) continue;
        n++; hurt(p, dmg); if (p.state !== 'dead') knockWorm(p, w.face * 4.5, -3.5);
        addFx(mino ? 'slash_cyan' : 'b3_slash', p.x - w.face * 10, p.y - 50, 1.2, { flip: w.face < 0 }); addFx('spark_hit', p.x, p.y - 40, 1.2);
      }
      if (!n) addPop(w.x + w.face * 120, w.y - 120, 'miss', '#cdd', 16);
    }
    return u > (mino ? 56 : 46);
  },
  // ---------------- 3) every 3rd turn ----------------
  s_mc_special(w, S) { return this.isMino(w) ? this.mino_smash(w, S) : this.cent_smash(w, S); },
  mino_smash(w, S) {   // smashes the ground: a shockwave runs toward the nearest player (strong damage to everyone on the ground in its path)
    const t = S.t, sc = w.sc || 1;
    if (t === 1) { this.face(w, nearestFoe(w)); showBanner('⚠ ' + w.name + ' raises his axe…  SHOCKWAVE! (jump over it)', '#ffb347'); Snd.play('boom', .6); }
    const F = MN.SMASH; w.actF = F + (t < 14 ? 0 : t < 26 ? 1 : t < 32 ? 2 : t < 38 ? 3 : t < 46 ? 4 : 5);
    if (t === 26) {
      shake(34); Snd.play('mp3_mino_smash'); const fx = w.x + w.face * 70 * sc / 2;
      addFx('explosion_big', fx, w.y - 6, 1.7 * sc / 2); debris(w.x, w.y - 4, 28, 'dirt'); debris(fx, w.y - 4, 18, 'dirt'); ringFx(fx, w.y - 4, '#ffcf8a'); ringFx(fx, w.y - 4, '#fff2cf', 8);
      G.terrain.carve(fx + w.face * 30, w.y + 6, 36);
      spawnWave(w, w.x, w.face, BOSS3.dmg(w, MINO_WAVE_MUL[this.key(w)] || 1.5));
      showBanner('SHOCKWAVE! (jump over it)', '#ffb347');
    }
    return t > 58;
  },
  cent_smash(w, S) {   // gallops to every player standing on the ground (one after the other) and smashes him
    const t = S.t, sc = w.sc || 1;
    if (t === 1) {
      S.list = this.foes(w).filter(p => p.state === 'ground').sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x)).slice(0, 4); S.i = 0; S.ph = 'go'; S.pt = 0; S.stuck = 0;
      showBanner('⚠ ' + w.name + ' hunts the players on the ground!  (stay in the air)', '#ffb347'); Snd.play('boom', .6);
      if (!S.list.length) { showBanner(w.name + ' finds nobody on the ground', '#ffb347'); return true; }
    }
    const p = S.list[S.i]; if (!p) return true; S.pt++;
    if (!p || p.state === 'dead' || p.state === 'drown') { S.i++; S.ph = 'go'; S.pt = 0; S.stuck = 0; return S.i >= S.list.length; }
    this.face(w, p);
    if (S.ph === 'go') {
      const close = Math.abs(p.x - w.x) <= CEN_REACH_STOP + 6; const r = close ? 'done' : this.walk(w, S, p.x - Math.sign(p.x - w.x || 1) * CEN_REACH_STOP, CEN_RUN * 1.1);
      w.actF = CN.RUN + (Math.floor(S.pt / 2) % 7); if (S.pt % 3 === 0) addFx('smoke', w.x - w.face * 60, w.y - 6, .9); if (S.pt % 10 === 0) shake(4);
      if (r !== 'go' || S.pt > 150) { S.ph = 'smash'; S.pt = 0; }
      return false;
    }
    const u = S.pt, F = CN.SMASH; w.actF = F + (u < 10 ? 0 : u < 20 ? 1 : u < 27 ? 2 : u < 33 ? 3 : u < 40 ? 4 : 5);
    if (u === 20) {
      shake(36); Snd.play('mp3_cen_smash'); const fx = w.x + w.face * 80 * sc / 2;
      addFx('explosion_big', fx, w.y - 6, 1.6 * sc / 2); addFx('b3_rock_hit', fx, w.y - 20, 2); debris(fx, w.y - 4, 26, 'dirt'); ringFx(fx, w.y - 4, '#ffcf8a'); ringFx(fx, w.y - 4, '#fff2cf', 8);
      const d = BOSS3.dmg(w, CEN_SMASH_MUL);
      for (const q of this.foes(w)) {   // the target, and anybody standing next to him
        if (q !== p && (Math.abs(q.x - p.x) > 140 || q.state !== 'ground')) continue; if (Math.abs(q.x - w.x) > CEN_HIT_FRONT + 40) continue;
        hurt(q, d); if (q.state !== 'dead') knockWorm(q, w.face * 2.5, -5.5); addFx('spark_hit', q.x, q.y - 40, 1.3); G.terrain.carve(q.x, q.y + 6, 34);
      }
      showBanner('SMASH!', '#ff8a4a');
    }
    if (u > 46) { S.i++; S.ph = 'go'; S.pt = 0; S.stuck = 0; return S.i >= S.list.length; }
    return false;
  },
};
