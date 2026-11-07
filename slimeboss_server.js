/* ONLINE VERSION of slimeboss.js - upload this file to GitHub (online game only).
   The offline app keeps using slimeboss.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  JELLY COLOSSUS  -  the slime FINAL BOSS of the first Adventure map (Scrapheap Canyon), HARD + HEROIC only
//  Stage order on HARD / HEROIC:  4 normal stages -> Rustjaw Colossus -> Gutrot (orc) -> NEW: JELLY COLOSSUS (the last stage)
//
//  Every boss turn:
//    0) a player is already NEAR at the start of its turn -> it SPLASHES right away (no move, no smash)
//    1) MOVE   - it changes position first: it runs along the floor, or jumps to a different HEIGHT (floating platforms of the arena).
//    2) ATTACK - a player is NEAR it  -> SPLASH (a big water burst around the slime, hurts everybody close, also players in the air)
//                nobody is near       -> JUMP SMASH (it leaps high, falls and smashes the ground: EVERY player standing on the
//                                        ground / on a platform is hurt, however far away. Players in the air are safe.)
//  Art:  assets/adventure/boss_slimeking_hold|act|death.webp  (+ portrait/slimeking.webp)  made from your two slime sprite sheets.
//        act sheet = 46 frames in a 4-column grid of 192px cells:
//          0-14 jump-smash sequence (prepare, jump start, up1, up2, peak, fall1, fall2, impact, smash1, smash2, recover1, recover2, rise1, rise2, idle)
//          15-21 splash attack   22-30 jump   31-38 move / run   39-45 idle loop
//        hold sheet: 0-7 move, 8 idle.   death sheet: the death / split animation.
//  Built on the boss3.js framework: this file wraps BOSS3.think / BOSS3.step / BOSS3.update, so ai.js / world.js / render.js are not touched.
//
//  PLAGUEWOOD (bog) + PRISM CAVES (prism)  -  the old Bog / Crystal Slime Kings AND their small baby slimes are GONE. Both maps now use YOUR Slime King (this file, table SLIME_KINGS):
//    - same moves as the Jelly Colossus (move to a new spot -> splash if a player is near, else jump smash), only the colour changes: bog = green, prism = violet
//    - the stats are the old ones of that map (HP x1.3 of the map's robot boss, armor +4, attack +6 %, base damage of the old cannon: Bog 58 / Crystal 90), see weapons.js C08 / C09
//    - the small slimes (summoned every 2nd round, HP x2.4, old damage 17 / 18) are small copies of the Slime King and do the SAME moves (all of them together, in the shared minion turn)
// ============================================================================================================

// ---- TUNING (change these to rebalance the fight) ----
const SLIME_HP = 1.8;          // health x the map's robot boss (Rustjaw)
const SLIME_DEF = 8, SLIME_POW = 10;   // extra armor / attack bonus (percent) on top of the robot boss
const SLIME_SC = 3.2;          // size of the slime on screen
const SLIME_DMG = 34;          // base damage (weapon C16 below). Smash = x SLIME_SMASH_MUL, splash = x SLIME_SPLASH_MUL
const SLIME_SMASH_MUL = .6, SLIME_SPLASH_MUL = 1.0;
const SLIME_NEAR = 300;        // a player closer than this (px) after the slime moved = SPLASH attack instead of the jump smash
const SLIME_SPLASH_R = 310;    // reach of the splash burst
const SLIME_RUN_SPEED = 6.5;   // px per frame while it runs along the floor
const SLIME_MIN_DIFF = 1;      // 1 = HARD and HEROIC (0 would add it to NORMAL too)

// ---- the weapon only exists to carry the base damage / name shown on the map screen (the slime never fires a rocket) ----
SIG_WMETA['C16_Slime_Smash'] = { muzzle: [170, 128], bbox: [0, 0, 1, 1] };
WEAPONS.push(CBOSS_W('C16_Slime_Smash', 'boss_slimeking', 'Jelly Smash', 'Leaps high and smashes the ground (hurts every player on the ground), splashes anyone who comes close.',
  { dmg: SLIME_DMG, blast: 60, knock: 6, ss: 1, hit: 'splash', hs: 1.2, snd: 'boom' }));
// NO slime king (blue / green / violet) holds a weapon: the held picture is blank, so only the slime is drawn
['C16_Slime_Smash', 'C08_Bog_Cannon', 'C09_Crystal_Cannon'].forEach(id => { const wd = WEAPONS.find(x => x.id === id); if (wd) wd.art = 'M0_Blank'; });

// ---- boss sprite frame map (act sheet) ----
const SL = { SM: 0, SP: 15, JP: 22, MV: 31, ID: 39 };
const SLIME_ANCH = Array.from({ length: 9 }, () => ({ n: [238, 300], f: [238, 300] }));

// ---- the Slime Kings of the Plaguewood (bog) and Prism Caves (prism) maps: your Slime King in a new colour, with the old stats of the map ----
// boss = name on the map screen / stage, mini = name of the small slimes, glow = colour of the map-screen glow and of the banners, ring = light colour of the shock rings
// mw = attack of the small slimes (only the damage is used: splash = x1, smash = x.6 like the boss; the old numbers 17 / 18), hpMul = their health x the normal minion health (old 2.4)
const SLIME_KINGS = {
  bog:   { key: 'slimeking_bog',     boss: 'Bog Slime King',     stage: 'Slime Throne',   mini: 'Baby Slime King',         glow: '#7dff3a', ring: '#c8ff9f', hpMul: 2.4,
           mw: { id: 'MC8_Goo_Splash', art: 'M0_Blank', name: 'Goo Smash', desc: 'Leaps and smashes the ground, splashes anyone close', ammo: Infinity, type: 'melee', range: 58, dmg: 17, knock: 4, fx: 'plasma_hit', snd: 'slash', carve: 0, minion: true, lunge: true } },
  prism: { key: 'slimeking_crystal', boss: 'Crystal Slime King', stage: 'Crystal Hollow', mini: 'Baby Crystal Slime King', glow: '#c08cff', ring: '#e6d0ff', hpMul: 2.4,
           mw: { id: 'MC9_Crystal_Splash', art: 'M0_Blank', name: 'Crystal Smash', desc: 'Leaps and smashes the ground, splashes anyone close', ammo: Infinity, type: 'melee', range: 58, dmg: 18, knock: 4, fx: 'energy_hit', snd: 'slash', carve: 0, minion: true, lunge: true } },
};
const SLIME_MINI_SC = 1.0;   // size of the small slimes (the king is SLIME_SC = 3.2)
const isSlM = w => !!(w && w.minion && w.rob && String(w.rob.id || '').indexOf('minion_slimeking') === 0);   // a small slime king
const isSl = w => !!(w && w.rob && (w.rob.b3 === 'slime' || isSlM(w)));                                      // any slime king (boss or small)
const slK = w => (w && w.minion) ? Math.max(.2, (w.sc || 1) / SLIME_SC) : 1;                                // size factor: 1 for the king, ~0.3 for the small ones
const slKind = w => { for (const k in SLIME_KINGS) if (w && w.rob && String(w.rob.id || '').indexOf(SLIME_KINGS[k].key) >= 0) return SLIME_KINGS[k]; return null; };
const slCol = w => { const k = slKind(w); return k ? k.glow : '#5cc8ff'; };       // banner / ring colour
const slRing = w => { const k = slKind(w); return k ? k.ring : '#9fe4ff'; };

(function () {
  const M = ADV_MAPS[0];   // first map = Scrapheap Canyon
  const f = M.stages.find(s => s.boss);
  M.slimeBoss = {
    name: 'Slime Pit', map: M.maps.arena ? 'arena' : f.map, boss: true, boss2: true, b3: 'slime', noMinions: true, n: 1,
    hp: Math.round(f.hp * SLIME_HP), sc: SLIME_SC, diff: 2, def: (f.def || 0) + SLIME_DEF, pow: (f.pow || 0) + SLIME_POW, px: f.px, ex: [1975],
    bossName: 'Jelly Colossus', bossId: 'boss_slimeking', sheet: 'adventure/boss_slimeking_hold.webp', death: 'adventure/boss_slimeking_death.webp',
    act: 'adventure/boss_slimeking_act.webp', anchors: SLIME_ANCH,
  };
  BOSS_GLOW.slimeking = '#3fb4ff';
  B3_BY_KIND.slime = { kind: 'slime', key: 'slimeking', name: 'Jelly Colossus', wide: 1 };

  // PLAGUEWOOD + PRISM CAVES: the creature boss of HARD / HEROIC is now the Slime King (green / violet) with the OLD stats of that map, and it calls small slime kings
  ADV_MAPS.forEach(Mx => {
    const k = SLIME_KINGS[Mx.id], fb = Mx.stages.find(s => s.boss); if (!k || !fb) return;
    const base = 'adventure/boss_' + k.key;
    Mx.boss2 = {
      name: k.stage, map: Mx.maps.arena ? 'arena' : fb.map, boss: true, boss2: true, b3: 'slime', noMinions: false, minion: k.key, n: 1,
      hp: Math.round(fb.hp * 1.3), sc: SLIME_SC, diff: 2, def: (fb.def || 0) + 4, pow: (fb.pow || 0) + 6, px: fb.px, ex: fb.ex,   // old Bog / Crystal Slime King numbers of this map
      bossName: k.boss, bossId: 'boss_' + k.key, sheet: base + '_hold.webp', death: base + '_death.webp', act: base + '_act.webp', anchors: SLIME_ANCH,
    };
    Mx.boss2.minionKind = { name: k.mini, hpMul: k.hpMul, sc: SLIME_MINI_SC, fly: false, sheet: base + '_hold.webp', death: base + '_death.webp', act: base + '_act.webp', anchors: SLIME_ANCH, mw: k.mw };
    BOSS_GLOW[k.key] = k.glow;
  });

  // HARD / HEROIC: the slime is the very last stage of the first map
  const _so = Adventure.stagesOf;
  Adventure.stagesOf = function (Mp, d) {
    const L = _so.call(this, Mp, d); d = d == null ? this.diff : d;
    return (d >= SLIME_MIN_DIFF && Mp.slimeBoss && Mp.boss2) ? L.concat([Mp.slimeBoss]) : L;
  };

  // hit shape / body centre of the slime (it is a wide, low blob)
  const _bs = bodyShapes; bodyShapes = w => {
    if (isSl(w)) { const sc = w.sc || 1, fy = w.y - (w.hop || 0) - (w.flyOff || 0); return [[w.x, fy - 24 * sc, 27 * sc, 23 * sc]]; }
    return _bs(w);
  };
  const _bc = bodyCenter; bodyCenter = w => isSl(w) ? [w.x, w.y - (w.hop || 0) - (w.flyOff || 0) - 22 * (w.sc || 1)] : _bc(w);

  // the slime never walks away on its own after its turn (AI.retreat would make a boss step away from platform edges)
  const _ret = AI.retreat; AI.retreat = function (w) {
    if (isSl(w)) { this.reset(); return; }
    return _ret.call(this, w);
  };

  // the small slime kings: in the shared minion turn they do the SAME moves as the king (see SLM below)
  const _sw = AI.swarmStep; AI.swarmStep = function (m) { if (isSlM(m)) return SLM.step(m); return _sw.call(this, m); };

  // ---- hook the boss3 framework ----
  const _think = BOSS3.think;
  BOSS3.think = function (w, ai) {
    if (w.rob.b3 !== 'slime') return _think.call(this, w, ai);
    if (!ai.b3hop) {
      ai.b3hop = true; ai.bmoved = true;
      if (SLIME.near(w)) { ai.b3done = true; return this.start(w, ai, 'sl_splash'); }                                // a player came close: splash right away
      return this.start(w, ai, 'sl_move');                                                                          // 1) change position
    }
    if (!ai.b3done) { ai.b3done = true; return this.start(w, ai, SLIME.near(w) ? 'sl_splash' : 'sl_smash'); }        // 2) splash (player near) or jump smash
    return false;
  };
  const _step = BOSS3.step;
  BOSS3.step = function (w, ai) {
    const S = w.b3; if (!S || String(S.k).indexOf('sl_') !== 0) return _step.call(this, w, ai);
    S.t++; const fin = SLIME['s_' + S.k](w, S); if (!fin) return;
    w.b3 = null; w.actF = null; w.hop = 0;
    if (S.k === 'sl_move') { ai.st = 'think'; ai.t = 14; } else this.endTurn(w, ai);
  };
  const _upd = BOSS3.update;
  BOSS3.update = function () {
    _upd.call(this);
    if (!G.adv) return;
    for (const w of G.worms) {
      if (!isSl(w) || w.state === 'dead' || w.state === 'drown') continue;
      if (!w.slInit) { w.slInit = true; w.hover = true; }   // hover = no physics: the slime is moved by its scripts (platform jumps)
      if (w.b3 || w.slS || w.spT > 0) continue;
      w.hop = 0; w.actF = SL.ID + (Math.floor((G.frame + (w.idx | 0) * 7) / 6) % 7);   // idle loop
      for (let n = 0; n < 6 && !onGround(w.x, w.y, w.sc || 1) && w.y < WATER_Y - 20; n++) w.y += 1;   // its platform was blown away: it drops down
    }
  };
})();

// ---- small helpers: the small slimes use the same scripts with smaller effects / lower jumps / their own damage ----
const SH = (w, n) => shake(w.minion ? Math.max(1, Math.round(n * .3)) : n);
const SV = (w, v) => w.minion ? v * .45 : v;
const SB = (w, txt, col) => { if (!w.minion) showBanner(txt, col); };   // one banner for the king, none for every small slime
const SFX = (w, name, x, y, s) => addFx(name, x, y, s * (w.minion ? Math.max(.4, slK(w) * 1.5) : 1));
const SDB = (w, x, y, n, kind) => debris(x, y, w.minion ? Math.max(3, Math.ceil(n * .3)) : n, kind);

// ---- the small slime kings in the shared minion turn: (move to a new spot) -> splash if a player is near, otherwise jump smash ----
const SLM = {
  step(m) {
    if (m.state === 'dead' || m.state === 'drown' || m.frozen > 0) { m.done = true; return; }
    if (m.slTurn !== G.turnCount) { m.slTurn = G.turnCount; m.slS = null; m.hop = 0; m.actF = null; m.slTarget = null; }   // a new minion turn starts from scratch
    if (!m.slInit) { m.slInit = true; m.hover = true; }
    if (!m.slS) m.slS = SLIME.near(m) ? { k: 'sl_splash', t: 0 } : { k: 'sl_move', t: 0 };   // a player is already close: splash right away
    const S = m.slS; S.t++;
    if (!SLIME['s_' + S.k](m, S)) return;
    if (S.k === 'sl_move') { m.slTarget = null; m.slS = { k: SLIME.near(m) ? 'sl_splash' : 'sl_smash', t: 0 }; return; }
    m.slS = null; m.actF = null; m.hop = 0; m.done = true;
  },
};

const SLIME = {
  dmg(w, mul) { return w.minion ? Math.max(1, Math.round(((w.mw && w.mw.dmg) || 17) * mul)) : BOSS3.dmg(w, mul); },
  near(w) { const k = slK(w), fs = BOSS3.foes(w); return fs.some(p => Math.abs(p.x - w.x) < SLIME_NEAR * k && Math.abs(p.y - w.y) < Math.max(130, 260 * k)); },
  // every flat spot the slime can stand on: the floor and the floating platforms
  spots() {
    const T = G.terrain, out = [];
    const surfNear = (x, y0) => { for (let y = y0 - 40; y < y0 + 40; y++) if (T.solid(x, y) && !T.solid(x, y - 1)) return y; return 9999; };
    for (let x = 200; x <= WORLD_W - 200; x += 20) {
      let prev = T.solid(x, 60);
      for (let y = 61; y < WATER_Y - 30; y += 2) {
        const s = T.solid(x, y);
        if (s && !prev) {
          let clear = true; for (let k = 8; k <= 170; k += 16) if (T.solid(x, y - k)) { clear = false; break; }
          let thick = 0; while (thick < 90 && T.solid(x, y + thick)) thick++;
          const flat = Math.abs(surfNear(x - 36, y) - y) < 12 && Math.abs(surfNear(x + 36, y) - y) < 12;
          const plat = thick < 70;
          if (clear && flat && (plat || (x > 330 && x < 2250))) out.push({ x, y: y - 1, plat });
        }
        prev = s;
      }
    }
    return out;
  },
  pick(w) {
    const all = this.spots(); if (!all.length) return null;
    const foes = BOSS3.foes(w), D = w.minion ? 150 : 330;
    let c = all.filter(s => Math.abs(s.x - w.x) > D || Math.abs(s.y - w.y) > 60);   // always a DIFFERENT position
    if (!c.length) c = all;
    const far = c.filter(s => foes.every(p => Math.abs(p.x - s.x) > 70)); if (far.length) c = far;   // do not land right on top of a player
    const mates = G.worms.filter(o => o !== w && isSl(o) && o.state !== 'dead' && o.state !== 'drown');   // do not share a spot with the king / another small slime
    const free = c.filter(s => mates.every(o => { const q = o.slTarget || o; return Math.abs(q.x - s.x) > 90 || Math.abs(q.y - s.y) > 50; })); if (free.length) c = free;
    const pl = c.filter(s => s.plat), fl = c.filter(s => !s.plat);
    const pool = (pl.length && (!fl.length || Math.random() < .55)) ? pl : (fl.length ? fl : c);
    return pool[rint(0, pool.length - 1)];
  },
  runnable(w, sp) {   // continuous floor between here and the target at the same height?
    const T = G.terrain, dir = sp.x >= w.x ? 1 : -1;
    for (let x = w.x; (sp.x - x) * dir > 0; x += dir * 24) { const y = T.surfaceBelow(x, Math.max(0, sp.y - 50)); if (y < 0 || Math.abs(y - sp.y) > 22) return false; }
    return true;
  },
  faceFoe(w) { const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; },
  // ---------------- 1) change position ----------------
  s_sl_move(w, S) {
    const t = S.t, k = slK(w), hk = w.minion ? .6 : 1;
    if (t === 1) {
      const sp = this.pick(w); if (!sp) return true;
      S.sp = sp; S.x0 = w.x; S.y0 = w.y; w.face = sp.x >= w.x ? 1 : -1; w.slTarget = sp;
      S.mode = (Math.abs(sp.y - w.y) < 26 && this.runnable(w, sp)) ? 'run' : 'jump';
      SB(w, '⚠ ' + w.name + (S.mode === 'run' ? ' slides to a new spot…' : ' leaps to a new spot…'), slCol(w));
    }
    const sp = S.sp, spd = SLIME_RUN_SPEED * (w.minion ? .8 : 1);
    if (S.mode === 'run') {
      w.actF = SL.MV + (Math.floor(t / 3) % 8);
      const dir = sp.x >= w.x ? 1 : -1;
      if (Math.abs(sp.x - w.x) > spd) { w.face = dir; if (!placeOnGround(w, w.x + dir * spd)) S.stop = true; }
      else S.stop = true;
      if (S.stop || t > 240) { S.e = (S.e | 0) + 1; w.actF = SL.ID; return S.e > 8; }
      if (t % 14 === 0) { SFX(w, 'splash', w.x - dir * 60 * k, w.y - 4, .5); SH(w, 2); }
      return false;
    }
    // jump (different height / gap): crouch 16, fly 54, land 18
    const FT = 54;
    if (t <= 16) { w.actF = SL.JP + (t < 8 ? 0 : 1); return false; }
    if (t <= 16 + FT) {
      const a = (t - 16) / FT, up = Math.max(0, S.y0 - sp.y), H = (150 + up * .35) * hk;
      w.x = S.x0 + (sp.x - S.x0) * a; w.y = S.y0 + (sp.y - S.y0) * a; w.hop = Math.sin(Math.PI * a) * H;
      w.actF = SL.JP + (a < .2 ? 2 : a < .45 ? 3 : a < .7 ? 4 : 5); w.face = sp.x >= S.x0 ? 1 : -1;
      return false;
    }
    if (t === 17 + FT) {   // landing
      w.x = sp.x; w.y = sp.y; w.hop = 0; SH(w, 14); Snd.play('boom', SV(w, .8)); SFX(w, 'splash', w.x, w.y - 6, 1.6); SDB(w, w.x, w.y - 4, 12, 'dirt'); ringFx(w.x, w.y - 4, slRing(w));
    }
    const l = t - (16 + FT); w.actF = SL.JP + (l < 7 ? 6 : l < 13 ? 7 : 8);
    return l > 18;
  },
  // ---------------- 2a) jump smash: every player on the ground is hurt, however far ----------------
  s_sl_smash(w, S) {
    const t = S.t, ease = a => a * a * (3 - 2 * a), hk = w.minion ? .55 : 1;
    if (t === 1) { this.faceFoe(w); SB(w, '⚠ ' + w.name + ' smashes the ground! (jump to dodge)', slCol(w)); Snd.play('boom', SV(w, .5)); }
    const F = SL.SM;
    if (t < 15) { w.actF = F; w.hop = 0; return false; }                                                           // prepare
    if (t < 23) { w.actF = F + 1; w.hop = ease((t - 15) / 8) * 14 * hk; return false; }                            // jump start
    if (t < 31) { w.actF = F + 2; w.hop = (14 + ease((t - 23) / 8) * 150) * hk; return false; }                    // up 1
    if (t < 39) { w.actF = F + 3; w.hop = (164 + ease((t - 31) / 8) * 100) * hk; return false; }                   // up 2
    if (t < 51) { w.actF = F + 4; w.hop = (264 + Math.sin((t - 39) / 12 * Math.PI) * 10) * hk; return false; }     // peak
    if (t < 61) {                                                                                                   // fall (fast)
      const a = (t - 51) / 10; w.actF = F + (a < .5 ? 5 : 6); w.hop = 264 * hk * (1 - a * a); return false;
    }
    if (t === 61) {                                                                                                 // IMPACT
      w.hop = 0; w.actF = F + 7; SH(w, 40); Snd.play('boom', SV(w, 1.5)); if (!w.minion) Snd.play('boom', 1);
      SFX(w, 'splash', w.x, w.y - 8, 2.6); SDB(w, w.x, w.y - 4, 30, 'dirt'); if (!w.minion) debris(w.x, w.y - 4, 10, 'metal');
      ringFx(w.x, w.y - 4, slRing(w)); if (!w.minion) { ringFx(w.x, w.y - 4, '#ffffff', 8); ringFx(w.x, w.y - 4, slCol(w), 16); }
      const d = this.dmg(w, SLIME_SMASH_MUL), hit = BOSS3.foes(w).filter(p => p.state === 'ground');   // on the ground / on a platform = hurt, any distance
      for (const p of hit) {
        const delay = Math.min(26, Math.round(Math.abs(p.x - w.x) / 55));   // the shockwave takes a moment to reach far players
        BOSS3.later(delay, () => {
          if (p.state === 'dead' || p.state === 'drown') return;
          hurt(p, d); if (p.state !== 'dead' && !w.minion) knockWorm(p, (p.x >= w.x ? 1 : -1) * 2.2, -4.5);   // the small slimes push nobody
          addFx('splash', p.x, p.y - 8, 1.3); ringFx(p.x, p.y - 4, slRing(w)); SH(w, 8); Snd.play('hit', SV(w, .8));
        });
      }
      SB(w, 'SMASH!' + (hit.length ? '' : '  (everybody dodged in the air)'), slCol(w)); G.firedThisTurn = true;
    }
    const l = t - 61;
    w.actF = F + (l < 6 ? 7 : l < 14 ? 8 : l < 28 ? 9 : l < 38 ? 10 : l < 48 ? 11 : l < 58 ? 12 : l < 68 ? 13 : 14);
    if (l === 8 || l === 20) SH(w, 10);
    return l > 76;
  },
  // ---------------- 2b) splash: a player came close ----------------
  s_sl_splash(w, S) {
    const t = S.t, F = SL.SP, k = slK(w);
    if (t === 1) { this.faceFoe(w); SB(w, '⚠ ' + w.name + ' splashes! (stay away)', slCol(w)); Snd.play('slash', SV(w, .7)); }
    if (t < 9) { w.actF = F; return false; }
    if (t < 17) { w.actF = F + 1; return false; }
    if (t === 17) {
      w.actF = F + 2; SH(w, 30); Snd.play('boom', SV(w, 1.2)); SFX(w, 'splash', w.x, w.y - 8, 2.6); SDB(w, w.x, w.y - 4, 22, 'dirt');
      ringFx(w.x, w.y - 30 * k, slRing(w)); if (!w.minion) ringFx(w.x, w.y - 30, '#ffffff', 8);
      const d = this.dmg(w, SLIME_SPLASH_MUL), cy = w.y - 50 * (w.sc || 1) * .5, R = SLIME_SPLASH_R * k;
      const hit = BOSS3.foes(w).filter(p => Math.abs(p.x - w.x) < R && Math.abs((p.y - 30) - cy) < Math.max(150, 300 * k));
      for (const p of hit) { hurt(p, d); if (p.state !== 'dead' && !w.minion) knockWorm(p, (p.x >= w.x ? 1 : -1) * 4.5, -6); addFx('splash', p.x, p.y - 20, 1.4); }
      SB(w, 'SPLASH!' + (hit.length ? '' : '  (missed)'), slCol(w)); G.firedThisTurn = true;
    }
    w.actF = F + (t < 17 ? 1 : t < 24 ? 2 : t < 32 ? 3 : t < 40 ? 4 : t < 48 ? 5 : 6);
    return t > 58;
  },
};
