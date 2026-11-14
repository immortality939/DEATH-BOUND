/* ONLINE VERSION of boss3.js - upload this file to GitHub (online game only).
   The offline app keeps using boss3.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  HEROIC THIRD BOSSES  (Adventure mode, HEROIC difficulty only, last 5 maps)
//  After the robot boss AND the creature boss, HEROIC adds ONE more stage: a much stronger boss on its own flat arena.
//    dunes  -> SCORPION KING   (tail poison x3 · special: grabs every grounded player and smashes them)
//    marble -> MIGHTY ZEUS     (direct bouncing lightning · special: thunder from above on everyone)
//    bog    -> CENTAUR WARCHIEF(rock throw · every 2nd turn a fast charge · special: stomp shockwaves)
//    prism  -> LAVA HOUND      (flying, new spot every turn, lava balls · special: burns the whole floor)
//    void   -> DEATH REAPER    (flying, scythe slash on a random player · special: 2 exploding ghosts)
//  Art: assets/adventure/boss_<key>_hold|act|death.webp + portrait/<key>.webp, assets/proj/C11..C15, assets/fx/b3_*.webp, assets/bg/b3_*, assets/adventure/arena_*.png
//  Hooks: ai.js (BOSS3.think / BOSS3.step / swarmStep ghost), world.js (bossSpecialStep, update, newGame), render.js (BOSS3.draw), adventure.js (stage list), weapons.js (C11..C15)
// ============================================================================================================
const B3_ANCH = /*anchors of the hold-sheet frames (512-space), made by the sprite renderer*/{"warchief":[{"n":[376.8,167.2],"f":[437.9,148.1]},{"n":[376.8,163.8],"f":[437.9,144.7]},{"n":[376.8,167.2],"f":[437.9,148.1]},{"n":[376.8,170.7],"f":[437.9,151.6]},{"n":[376.8,167.3],"f":[437.9,148.2]},{"n":[376.8,163.8],"f":[437.9,144.7]},{"n":[376.8,167.2],"f":[437.9,148.1]},{"n":[376.8,170.7],"f":[437.9,151.6]},{"n":[376.8,163.8],"f":[437.9,144.7]}],"deathreaper":[{"n":[281.8,249.3],"f":[297.0,276.3]},{"n":[281.8,243.4],"f":[297.0,270.3]},{"n":[281.8,240.9],"f":[297.0,267.8]},{"n":[281.8,243.4],"f":[297.0,270.3]},{"n":[281.8,249.3],"f":[297.0,276.3]},{"n":[281.8,255.3],"f":[297.0,282.3]},{"n":[281.8,257.8],"f":[297.0,284.7]},{"n":[281.8,255.3],"f":[297.0,282.3]},{"n":[281.8,249.3],"f":[297.0,276.3]}],"scorpionking":[{"n":[274.9,253.3],"f":[274.9,253.3]},{"n":[275.2,250.8],"f":[275.2,250.8]},{"n":[274.9,250.0],"f":[274.9,250.0]},{"n":[274.2,251.3],"f":[274.2,251.3]},{"n":[273.5,253.9],"f":[273.5,253.9]},{"n":[273.2,256.3],"f":[273.2,256.3]},{"n":[273.5,257.1],"f":[273.5,257.1]},{"n":[274.2,255.9],"f":[274.2,255.9]},{"n":[274.9,253.3],"f":[274.9,253.3]}],"lavahound":[{"n":[398.8,262.6],"f":[398.8,262.6]},{"n":[398.8,256.4],"f":[398.8,256.4]},{"n":[398.8,253.9],"f":[398.8,253.9]},{"n":[398.8,256.4],"f":[398.8,256.4]},{"n":[398.8,262.6],"f":[398.8,262.6]},{"n":[398.8,268.8],"f":[398.8,268.8]},{"n":[398.8,271.3],"f":[398.8,271.3]},{"n":[398.8,268.8],"f":[398.8,268.8]},{"n":[398.8,262.6],"f":[398.8,262.6]}],"zeus":[{"n":[235.6,266.0],"f":[290.1,249.0]},{"n":[252.0,265.2],"f":[273.7,246.1]},{"n":[258.8,267.4],"f":[266.9,247.5]},{"n":[252.0,268.8],"f":[273.7,249.7]},{"n":[235.6,266.0],"f":[290.1,249.0]},{"n":[219.2,263.2],"f":[306.5,248.2]},{"n":[212.4,264.6],"f":[313.3,250.4]},{"n":[219.2,266.8],"f":[306.5,251.8]},{"n":[235.6,267.8],"f":[290.1,250.7]}],"ghost":[{"n":[268.8,320.0],"f":[294.9,311.9]},{"n":[268.8,315.5],"f":[294.9,307.4]},{"n":[268.8,313.7],"f":[294.9,305.6]},{"n":[268.8,315.5],"f":[294.9,307.4]},{"n":[268.8,320.0],"f":[294.9,311.9]},{"n":[268.8,324.5],"f":[294.9,316.4]},{"n":[268.8,326.4],"f":[294.9,318.2]},{"n":[268.8,324.5],"f":[294.9,316.4]},{"n":[268.8,320.0],"f":[294.9,311.9]}]};
const B3 = {
  dunes:  { key: 'scorpionking', name: 'Scorpion King',    stage: 'Scorpion Den',    kind: 'scorpion', spec: 'grab',    bg: 'b3_dunes',  img: 'adventure/arena_scorpion.png', arena: 'Scorpion Den',     glow: '#7dff4a', sc: 3.0, wide: 2.1 },
  marble: { key: 'zeus',         name: 'Mighty Zeus',      stage: 'Olympus Arena',   kind: 'zeus',     spec: 'thunder', bg: 'b3_marble', img: 'adventure/arena_zeus.png',     arena: 'Olympus Arena',    glow: '#8fe4ff', sc: 3.0, wide: 1.0 },
  bog:    { key: 'warchief',     name: 'Centaur Warchief', stage: "Warchief's Camp", kind: 'centaur',  spec: 'cwave',   bg: 'b3_bog',    img: 'adventure/arena_warchief.png', arena: "Warchief's Camp",  glow: '#ffb347', sc: 3.3, wide: 1.9 },
  prism:  { key: 'lavahound',    name: 'Lava Hound',       stage: 'Magma Geode',     kind: 'hound',    spec: 'burn',    bg: 'b3_prism',  img: 'adventure/arena_hound.png',    arena: 'Magma Geode',      glow: '#ff7a2a', sc: 3.0, wide: 1.8, fly: 130 },
  void:   { key: 'deathreaper',  name: 'Death Reaper',     stage: 'Soul Rift',       kind: 'reaper',   spec: 'ghosts',  bg: 'b3_void',   img: 'adventure/arena_reaper.png',   arena: 'Soul Rift',        glow: '#6dffa0', sc: 3.0, wide: 1.3, fly: 120 },
};
const B3_HP = 1.8, B3_DEF = 10, B3_POW = 14;   // vs the map's robot boss: health x, armor +, attack bonus + (percent)
const B3_GHOST_RANGE = 230, B3_GHOST_TOUCH = 58, B3_BOUNCE_R = 300, B3_CHARGE_SPEED = 22;
const B3_FLAT = 800;   // the arenas have a flat floor (no hills / pillars / platforms in the walkway); the edges slope down into the sea like the other arenas

// ---- arena shapes (same numbers the arena PNGs were painted with) ----
(function () {
  const top = x => x < 260 ? 800 + Math.pow((260 - x) / 260, 1.7) * 150 : x > 2540 ? 800 + Math.pow((x - 2540) / 260, 1.7) * 150 : 800;
  const runs = Array.from({ length: 2800 }, (_, x) => [Math.round(top(x)), 1000]);
  ADV_MAPS.forEach(M => {
    const c = B3[M.id], f = M.stages.find(s => s.boss); if (!c || !f) return;
    const mp = { id: 'adv_' + M.id + '_b3', name: c.arena, bg: c.bg, img: c.img }; M.maps.arena3 = mp; MAP_RUNS[mp.id] = runs;
    M.boss3 = { name: c.stage, map: 'arena3', boss: true, boss2: true, boss3: true, b3: c.kind, noMinions: true, spec: c.spec, act: 'adventure/boss_' + c.key + '_act.webp', n: 1,
      hp: Math.round(f.hp * B3_HP), sc: c.sc, diff: 2, def: (f.def || 0) + B3_DEF, pow: (f.pow || 0) + B3_POW, px: f.px, ex: [1975],
      bossName: c.name, bossId: 'boss_' + c.key, sheet: 'adventure/boss_' + c.key + '_hold.webp', death: 'adventure/boss_' + c.key + '_death.webp', anchors: B3_ANCH[c.key] };
    BOSS_GLOW[c.key] = c.glow;
  });
  // background themes for the 5 new arenas
  const bgs = typeof GAME_DATA !== 'undefined' ? GAME_DATA['bg.json'] : null;
  for (const k in B3) { const t = B3[k].bg; if (bgs) bgs[t] = { sky: 'bg/' + t + '_sky.webp', far: 'bg/' + t + '_far.webp', mid: 'bg/' + t + '_mid.webp', near: 'bg/' + t + '_near.webp' }; }
  Object.assign(BG_FILL, { b3_dunes: [[150, 80, 70], [120, 60, 55], [80, 40, 38]], b3_marble: [[150, 168, 205], [120, 140, 185], [90, 108, 150]], b3_bog: [[34, 60, 52], [24, 44, 38], [16, 30, 24]], b3_prism: [[70, 28, 62], [48, 20, 46], [30, 12, 28]], b3_void: [[44, 30, 70], [30, 20, 52], [18, 12, 34]] });
  const W3 = { b3_dunes: 'sunset', b3_marble: 'day', b3_bog: 'night', b3_prism: 'sunset', b3_void: 'night' }, _dw = drawWater; drawWater = (ctx, t, th) => _dw(ctx, t, W3[th] || th);   // water colours for the new themes
  const _bs = bodyShapes; bodyShapes = w => { const s = _bs(w); const k = w.rob && w.rob.b3 && B3_BY_KIND[w.rob.b3]; if (k && k.wide > 1) { s[0][2] *= k.wide; if (s[1]) s[1][2] *= Math.min(1.5, k.wide); } return s; };   // wide creatures are easier to hit
})();
const B3_BY_KIND = {}; for (const k in B3) B3_BY_KIND[B3[k].kind] = B3[k];

// ---- effect sheets (hit sparks etc.) ----
Object.assign(DIVINE_FX, {
  b3_poison_hit: { file: 'fx/b3_poison_hit.webp', frames: 10, cols: 5, fw: 128, fh: 128, fps: 22, loop: false },
  b3_lava_hit: { file: 'fx/b3_lava_hit.webp', frames: 10, cols: 5, fw: 128, fh: 128, fps: 22, loop: false },
  b3_rock_hit: { file: 'fx/b3_rock_hit.webp', frames: 10, cols: 5, fw: 128, fh: 128, fps: 22, loop: false },
  b3_bolt_hit: { file: 'fx/b3_bolt_hit.webp', frames: 10, cols: 5, fw: 128, fh: 128, fps: 26, loop: false },
  b3_ghost_boom: { file: 'fx/b3_ghost_boom.webp', frames: 12, cols: 6, fw: 192, fh: 192, fps: 22, loop: false },
  b3_thunder_boom: { file: 'fx/b3_thunder_boom.webp', frames: 12, cols: 6, fw: 256, fh: 256, fps: 24, loop: false },
  b3_slash: { file: 'fx/b3_slash.webp', frames: 8, cols: 4, fw: 192, fh: 192, fps: 24, loop: false },
  b3_flame: { file: 'fx/b3_flame.webp', frames: 8, cols: 4, fw: 128, fh: 128, fps: 14, loop: true },
});
const B3_GHOST_W = { id: 'MC11_Ghost_Boom', art: 'M0_Blank', name: 'Soul Blast', desc: 'Drifts to you and explodes', ammo: Infinity, type: 'melee', range: 0, dmg: 40, knock: 0, fx: 'b3_ghost_boom', snd: 'boom', carve: 0, minion: true, fly: true };
SIG_WMETA['MC11_Ghost_Boom'] = { muzzle: [170, 128], bbox: [0, 0, 1, 1] };

const BOSS3 = {
  SPECS: { cwave: 1, grab: 1, burn: 1, thunder: 1, ghosts: 1 },
  ghostRob() { return { id: 'minion_reaperghost', name: 'Soul Wisp', sheet: 'adventure/boss_ghost_hold.webp', death: 'adventure/boss_ghost_death.webp', act: 'adventure/boss_ghost_act.webp', anchors: B3_ANCH.ghost }; },
  assets(st) { const l = ['adventure/boss_ghost_hold.webp', 'adventure/boss_ghost_death.webp', 'adventure/boss_ghost_act.webp', 'fx/b3_flame.webp', 'proj/C11_Warchief_Rock_proj.png', 'proj/C12_Scorpion_Venom_proj.png', 'proj/C13_Lava_Hound_Lava_proj.png'];
    return l.map(p => loadImage(p).catch(() => { })); },
  // ---------------- helpers ----------------
  foes(w) { return aliveWorms().filter(t => t.team !== w.team && !bossAlly(w, t)); },
  endTurn(w, ai) { w.actF = null; w.hop = 0; w.b3 = null; G.firedThisTurn = true; G.phase = 'retreat'; G.timer = 50; if (ai) ai.st = 'fired'; },
  dmg(w, mul = 1) { return Math.round(bossBaseDmg(w) * mul); },
  later(frames, fn) { (G.b3q = G.b3q || []).push({ t: frames, fn }); },
  bolt(x1, y1, x2, y2, o = {}) { (G.b3fx = G.b3fx || []).push(Object.assign({ k: 'bolt', x1, y1, x2, y2, age: 0, life: 14, seed: Math.random() * 999, col: '#9fe4ff', w: 7 }, o)); },
  // ---------------- AI hooks ----------------
  think(w, ai) {   // called by the AI at the start of every think step of a b3 boss; true = a script took over
    const k = w.rob.b3, bt = w.bt | 0;
    if (k === 'reaper' || k === 'hound') {
      if (!ai.b3hop) { ai.b3hop = true; ai.bmoved = true; return this.start(w, ai, 'hop'); }
      if (k === 'reaper' && !ai.bspecial && !ai.b3done) { ai.b3done = true; return this.start(w, ai, 'slash'); }
      return false;
    }
    if (k === 'centaur') { if (ai.bmoved && bt % 2 === 0 && !ai.b3done) { ai.b3done = true; return this.start(w, ai, 'charge'); } return false; }
    if (k === 'zeus') { if (ai.bmoved && !ai.bspecial && !ai.b3done) { ai.b3done = true; return this.start(w, ai, 'zbolt'); } return false; }
    return false;
  },
  start(w, ai, kind) { w.b3 = { k: kind, t: 0 }; ai.st = 'b3'; return true; },
  step(w, ai) {
    const S = w.b3; if (!S) { ai.st = 'think'; ai.t = 10; return; }
    S.t++; const fin = this['s_' + S.k](w, S);
    if (!fin) return;
    w.b3 = null; w.actF = null;
    if (S.k === 'hop') { ai.st = 'think'; ai.t = 12; }
    else if (S.k === 'charge' && ai.bspecial) { ai.st = 'think'; ai.t = 20; }
    else this.endTurn(w, ai);
  },
  // ---------------- turn scripts ----------------
  s_hop(w, S) {   // flying bosses: glide to a new random spot (different from the last one) and hover there at a random height
    const c = B3_BY_KIND[w.rob.b3];
    if (S.t === 1) { let x; for (let i = 0; i < 20; i++) { x = rnd(520, 2300); if (Math.abs(x - w.x) > 380) break; } S.tx = x; w.flyGoal = (c.fly || 120) + rnd(-20, 70); w.bobBase = w.flyGoal; }
    const dir = S.tx >= w.x ? 1 : -1; w.face = dir; const sp = 8;
    if (Math.abs(S.tx - w.x) > sp) { if (!placeOnGround(w, w.x + dir * sp)) w.x += dir * sp; }
    if (Math.abs(S.tx - w.x) <= sp + 1 || S.t > 150) { const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; return S.t > 12; }
    return false;
  },
  s_slash(w, S) {   // reaper: dash to a random player, slash, fly back to the spot it started from
    const T = G.b3slashTarget;
    if (S.t === 1) { const fs = this.foes(w); if (!fs.length) return true; S.tg = fs[rint(0, fs.length - 1)]; S.hx = w.x; S.hf = w.flyOff || 0; w.flyGoal = null; w.face = S.tg.x >= w.x ? 1 : -1; showBanner('⚠ ' + w.name + ' hunts ' + S.tg.name + '!', '#6dffa0'); Snd.play('slash', .6); }
    const tg = S.tg; if (!tg || tg.state === 'dead' || tg.state === 'drown') { w.flyGoal = S.hf; return S.t > 20; }
    if (S.t < 24) { w.actF = 7; w.flyOff = S.hf + Math.sin(S.t / 24 * Math.PI) * 14; w.face = tg.x >= w.x ? 1 : -1; return false; }   // wind-up
    const tx = tg.x - w.face * 62, tf = Math.max(8, w.y - (tg.y - 38));
    if (S.t < 42) { const a = (S.t - 24) / 18, e = a * a * (3 - 2 * a); if (S.t === 24) { S.sx = w.x; S.sf = w.flyOff || 0; } w.x = S.sx + (tx - S.sx) * e; w.flyOff = S.sf + (tf - S.sf) * e; w.actF = 8; return false; }   // dash
    if (S.t < 62) {   // swing
      w.actF = S.t < 48 ? 9 : S.t < 55 ? 10 : 11; w.face = tg.x >= w.x ? 1 : -1;
      if (S.t === 50) { hurt(tg, this.dmg(w, 1)); if (tg.state !== 'dead') knockWorm(tg, w.face * 4.5, -3.5); addFx('b3_slash', tg.x - w.face * 10, tg.y - 50, 1.3, { flip: w.face < 0 }); addFx('spark_hit', tg.x, tg.y - 40, 1.2); shake(10); Snd.play('slash', 1); }
      return false;
    }
    if (S.t < 92) { const a = (S.t - 62) / 30, e = a * a * (3 - 2 * a); if (S.t === 62) { S.sx = w.x; S.sf = w.flyOff || 0; } w.x = S.sx + (S.hx - S.sx) * e; w.flyOff = S.sf + (S.hf - S.sf) * e; w.actF = 11; return false; }   // back to its spot
    w.flyOff = S.hf; w.flyGoal = S.hf; w.bobBase = S.hf; const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; return S.t > 98;
  },
  s_charge(w, S) {   // centaur: gallops very fast to the other side of the map; every player it runs through is hit (jump over it!)
    if (S.t === 1) { S.dir = w.x > WORLD_W / 2 ? -1 : 1; S.tx = S.dir > 0 ? 2380 : 420; w.face = S.dir; S.hit = []; showBanner('⚠ ' + w.name + ' CHARGES! (jump over him)', '#ffb347'); Snd.play('boom', .6); }
    if (S.t < 26) { w.actF = 0; if (S.t % 8 === 0) { shake(3); debris(w.x, w.y - 4, 4, 'dirt'); } return false; }   // paws the ground
    w.actF = 7 + (Math.floor(S.t / 2) % 5);
    if (!S.done) {
      if (!placeOnGround(w, w.x + S.dir * B3_CHARGE_SPEED)) S.done = true;
      if ((S.tx - w.x) * S.dir <= 0) S.done = true;
      if (S.t % 3 === 0) { addFx('smoke', w.x - S.dir * 50, w.y - 8, 1.1); debris(w.x - S.dir * 30, w.y - 4, 3, 'dirt'); } if (S.t % 10 === 0) shake(5);
      for (const t of this.foes(w)) {
        if (S.hit.includes(t) || t.state !== 'ground') continue;
        if (Math.abs(t.x - w.x) < 84 && Math.abs(t.y - w.y) < 150) { S.hit.push(t); hurt(t, this.dmg(w, 1)); if (t.state !== 'dead') knockWorm(t, S.dir * 5.5, -6); addFx('b3_rock_hit', t.x, t.y - 30, 1.2); Snd.play('boom', .8); shake(14); }
      }
      return false;
    }
    S.e = (S.e | 0) + 1; w.actF = 0; if (S.e === 1) { debris(w.x, w.y - 4, 12, 'dirt'); addFx('smoke', w.x, w.y - 10, 1.6); } const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1;
    return S.e > 22;
  },
  s_zbolt(w, S) {   // zeus: a lightning bolt straight into one player; it jumps on to every other player that stands close
    if (S.t === 1) { const fs = this.foes(w); if (!fs.length) return true; S.tg = fs[rint(0, fs.length - 1)]; w.face = S.tg.x >= w.x ? 1 : -1; showBanner('⚡ ' + w.name + ' strikes ' + S.tg.name + '! (spread out)', '#9fe4ff'); if (!Snd.has('zeus_attack')) Snd.play('freeze', .6); }
    const t = S.t; w.actF = t < 10 ? 7 : t < 20 ? 8 : t < 40 ? 9 : t < 52 ? 10 : 11;
    if (t === 20) {
      Snd.play('mp3_zeus_attack');
      const ox = w.x + w.face * 72, oy = w.y - 150; let cur = S.tg, from = [ox, oy], d = this.dmg(w, 1); const hit = [];
      let gen = 0;
      while (cur && gen < 4) {
        const [cx, cy] = bodyCenter(cur), g = gen, p0 = from, v = cur, dd = d; hit.push(cur);
        this.later(g * 9, () => { this.bolt(p0[0], p0[1], cx, cy, { life: 16 + 4 }); if (v.state !== 'dead' && v.state !== 'drown') { hurt(v, dd); if (v.state !== 'dead') knockWorm(v, (v.x >= w.x ? 1 : -1) * 1.6, -2.2); } addFx('b3_bolt_hit', cx, cy, 1.15); if (!Snd.has('zeus_attack')) Snd.play('freeze', .9); shake(g ? 5 : 11); });
        from = [cx, cy]; d = Math.round(d * .75); gen++;
        cur = this.foes(w).filter(t => !hit.includes(t) && Math.hypot(t.x - cur.x, t.y - cur.y) < B3_BOUNCE_R).sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y))[0] || null;
      }
      if (hit.length > 1) this.later(20, () => showBanner('⚡ The lightning jumps between players!', '#9fe4ff'));
    }
    return t > 62;
  },
  // ---------------- special moves (called from bossSpecialStep, once per frame) ----------------
  special(w) {
    w.spT = (w.spT || 0) + 1; const t = w.spT, sp = w.rob.spec; const done = this['p_' + sp](w, t);
    if (done) { w.actF = null; w.hop = 0; w.spT = 0; w.b3 = null; G.firedThisTurn = true; G.phase = 'retreat'; G.timer = 50; return true; }
    return false;
  },
  p_cwave(w, t) {   // centaur: rears up, stamps both front hooves -> two shockwaves race across the floor in both directions
    if (t === 1) { const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; showBanner('⚠ ' + w.name + ' rears up!  SHOCKWAVE! (jump over it)', '#ffb347'); }
    w.actF = t < 30 ? Math.min(4, Math.floor(t / 7)) : t < 40 ? 5 : 6;
    if (t === 30) {
      shake(34); Snd.play('boom', 1.4); Snd.play('boom', 1); const fx = w.x + w.face * 60; addFx('b3_rock_hit', fx, w.y - 10, 2.2); addFx('explosion_big', fx, w.y - 6, 1.2); debris(w.x, w.y - 4, 30, 'dirt'); ringFx(fx, w.y - 4, '#ffcf8a'); ringFx(fx, w.y - 4, '#fff2cf', 8);
      const d = this.dmg(w, SPECIAL_MUL); spawnWave(w, w.x, 1, d); spawnWave(w, w.x, -1, d);
    }
    return t >= 76;
  },
  p_burn(w, t) {   // lava hound: howls and sets the whole floor on fire; every player still on the ground is burned
    if (t === 1) { const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; showBanner('⚠ ' + w.name + ' howls…  THE FLOOR BURNS! (only players in the air are safe)', '#ff7a2a'); Snd.play('boom', .6); }
    w.actF = t < 20 ? 6 : t < 45 ? 7 : t < 70 ? 8 : 9; w.breathT = 0;
    if (t === 40) {
      shake(30); Snd.play('boom', 1.4); ringFx(w.x, w.y - 10, '#ff9a3a'); ringFx(w.x, w.y - 10, '#fff0a0', 10);
      const fl = (G.b3fx = G.b3fx || []); for (let x = 90; x < WORLD_W - 60; x += 64) { const y = G.terrain.surfaceBelow(x, 0); if (y < 0 || y > WATER_Y - 30) continue; fl.push({ k: 'flame', x, y: y + 6, age: -Math.abs(x - w.x) / 26, life: 130, ph: Math.random() * 8 }); }
      const n = specialHit(w, this.dmg(w, SPECIAL_MUL * 1.15), false, Infinity, w.x, true); for (const p of this.foes(w)) if (p.state === 'ground') { addFx('b3_lava_hit', p.x, p.y - 30, 1.3); }
    }
    return t >= 100;
  },
  p_thunder(w, t) {   // zeus: raises both lightning-wrapped hands, smashes the ground; thunder falls on EVERY player and explodes
    if (t === 1) { const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; showBanner('⚠ ' + w.name + ' calls the thunder!', '#9fe4ff'); Snd.play('freeze', .8); }
    w.actF = t < 28 ? Math.min(3, Math.floor(t / 7)) : t < 44 ? 3 : t < 52 ? 4 : t < 66 ? 5 : 6;
    if (t > 8 && t < 44 && t % 5 === 0) { const ox = w.x + w.face * 60, oy = w.y - 330; this.bolt(ox + rnd(-80, 80), oy - rnd(0, 140), ox + rnd(-60, 60), oy + rnd(40, 160), { life: 8, w: 4 }); }
    if (t === 48) {
      shake(30); Snd.play('boom', 1.5); ringFx(w.x + w.face * 50, w.y - 4, '#9fe4ff'); ringFx(w.x + w.face * 50, w.y - 4, '#ffffff', 8);
      const fs = this.foes(w), d = this.dmg(w, SPECIAL_MUL);
      fs.forEach((p, i) => this.later(i * 12, () => {
        if (p.state === 'dead' || p.state === 'drown') return; const [cx, cy] = bodyCenter(p);
        (G.b3fx = G.b3fx || []).push({ k: 'thunder', x: cx, y: p.y, age: 0, life: 22, seed: Math.random() * 99 }); Snd.play('mp3_zeus_thunder');
        this.later(7, () => { explode(cx, p.y - 24, 78, d, { owner: w, fx: 'b3_thunder_boom', hs: 1.25, carve: 0, knock: 6 }); shake(14); G.b3flash = 8; });
      }));
      showBanner('THUNDER! (it strikes everyone)', '#9fe4ff');
    }
    return t >= 52 + 12 * Math.max(1, this.foes(w).length) + 40;
  },
  p_ghosts(w, t) {   // reaper: raises the scythe and calls 2 small ghosts that float toward the players and blow up on touch
    if (t === 1) { const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; showBanner('⚠ ' + w.name + ' calls the ghosts!', '#6dffa0'); Snd.play('freeze', .6); }
    w.actF = 6; if (t === 30) { this.spawnGhosts(w, 2); shake(8); ringFx(w.x, w.y - (w.flyOff || 0) - 60, '#6dffa0'); }
    if (t > 8 && t < 40 && t % 6 === 0) addFx('b3_ghost_boom', w.x + w.face * 40, w.y - (w.flyOff || 0) - 110, .45);
    return t >= 70;
  },
  p_grab(w, t) {   // scorpion king: runs to every player still on the ground, grabs him with a pincer, lifts and smashes him down, then walks back
    const S = w.b3 = w.b3 || { q: null };
    if (t === 1) { S.hx = w.x; S.list = this.foes(w).filter(p => p.state === 'ground').sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x)).slice(0, 3); S.i = 0; S.ph = 'go'; S.pt = 0; showBanner('⚠ ' + w.name + ' hunts the players on the ground!', '#ff6a4a'); Snd.play('boom', .5); }
    S.pt++; const p = S.list[S.i];
    if (S.ph !== 'back' && (!p || p.state === 'dead' || p.state === 'drown')) { if (p && S.ph !== 'go') { p.flyOff = 0; } S.i++; S.ph = S.i < S.list.length ? 'go' : 'back'; S.pt = 0; if (S.ph === 'back') w.actF = 9; return false; }
    if (S.ph === 'go') {
      const dir = p.x >= w.x ? 1 : -1; w.face = dir; w.actF = 9 + (Math.floor(S.pt / 3) % 3);
      if (Math.abs(p.x - w.x) > 112) { if (!placeOnGround(w, w.x + dir * 20)) { S.ph = 'grab'; S.pt = 0; } } else { S.ph = 'grab'; S.pt = 0; }
      if (S.pt > 140) { S.ph = 'grab'; S.pt = 0; }
    } else if (S.ph === 'grab') {
      w.face = p.x >= w.x ? 1 : -1; w.actF = S.pt < 8 ? 1 : 2; p.vx = 0; if (S.pt === 10) { Snd.play('slash', 1); addFx('spark_hit', p.x, p.y - 40, 1.2); }
      if (S.pt >= 18) { S.ph = 'lift'; S.pt = 0; }
    } else if (S.ph === 'lift') {
      w.actF = S.pt < 10 ? 3 : 4; const a = Math.min(1, S.pt / 22); p.x = w.x + w.face * 104; p.vx = 0; p.vy = 0; p.flyOff = 112 * a * a * (3 - 2 * a);
      if (S.pt >= 34) { S.ph = 'smash'; S.pt = 0; }
    } else if (S.ph === 'smash') {
      w.actF = S.pt < 6 ? 4 : S.pt < 22 ? 5 : 6; p.vx = 0; p.vy = 0;
      if (S.pt < 6) p.flyOff = 112 * (1 - S.pt / 6);
      if (S.pt === 6) {
        p.flyOff = 0; shake(36); Snd.play('boom', 1.5); Snd.play('boom', 1); hurt(p, this.dmg(w, SPECIAL_MUL * 1.6)); if (p.state !== 'dead') knockWorm(p, w.face * 1.5, -3);
        addFx('explosion_big', p.x, p.y - 8, 1.5); addFx('b3_poison_hit', p.x, p.y - 30, 1.4); debris(p.x, p.y - 4, 24, 'dirt'); ringFx(p.x, p.y - 4, '#ffcf8a'); G.terrain.carve(p.x, p.y + 6, 40); G.firedThisTurn = true;
        showBanner('SMASH!', '#ff6a4a');
      }
      if (S.pt >= 32) { S.i++; S.ph = S.i < S.list.length ? 'go' : 'back'; S.pt = 0; }
    } else if (S.ph === 'back') {   // walk back to the starting spot
      const dir = S.hx >= w.x ? 1 : -1; w.face = dir; w.actF = 9 + (Math.floor(S.pt / 3) % 3);
      if (Math.abs(S.hx - w.x) > 20 && S.pt < 160) { if (!placeOnGround(w, w.x + dir * 20)) S.pt = 999; } else { w.actF = null; const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; return true; }
    }
    return false;
  },
  // ---------------- reaper ghosts ----------------
  spawnGhosts(boss, n) {
    const T = G.terrain, hp = Math.max(1, Math.round(MINION_HP * 1.4 * (typeof ENEMY_MULT !== 'undefined' ? ENEMY_MULT : 1) * (typeof advDM === 'function' ? advDM() : 1) * (typeof BOSS_HP_MULT !== 'undefined' ? BOSS_HP_MULT : 1))); G.minionSeq = G.minionSeq | 0; let made = 0;
    for (let k = 0; k < n; k++) {
      const side = k % 2 ? 1 : -1; let sx = clamp(boss.x + side * (120 + k * 30), 100, WORLD_W - 100), sy = T.surfaceBelow(sx, Math.max(0, boss.y - 90)); if (sy < 0 || sy > WATER_Y - 40) { sx = clamp(boss.x - side * 140, 100, WORLD_W - 100); sy = T.surfaceBelow(sx, Math.max(0, boss.y - 90)); } if (sy < 0 || sy > WATER_Y - 40) continue;
      G.minionSeq++;
      const m = { team: boss.team, idx: 60 + G.minionSeq, sc: .95, name: 'Soul Wisp', minion: true, ghost: true, hover: true, mw: B3_GHOST_W, rob: this.ghostRob(), x: sx, y: sy - 2, vx: 0, vy: 0, hp, maxHp: hp, face: sx < boss.x ? 1 : -1, aim: 0, state: 'air', knocked: false, bounces: 0, wf: 0, fi: 8, walkAcc: 0, walking: 0, flash: 0, frozen: 0, dt: 0, fallPeak: 0, flyGoal: 80, flyOff: (boss.flyOff || 0) };
      G.worms.push(m); G.queue.push(m); made++; addFx('teleport', sx, sy - 60, 1.1);
    }
    if (made) { showBanner('⚠ ' + boss.name + ' releases ' + made + ' ghosts! (keep away from them)', '#6dffa0'); Snd.play('boom', .5); }
  },
  ghostStep(m) {   // one frame of the shared minion turn for a ghost: float toward the nearest player (limited range), explode on touch
    if (m.state !== 'ground') return;
    if (m.frozen > 0) { m.done = true; return; }
    const foes = aliveWorms().filter(e => e.team !== m.team); if (!foes.length) { m.done = true; return; }
    const [mx, my] = bodyCenter(m); foes.sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my)); const tg = foes[0], [cx, cy] = bodyCenter(tg);
    const dx = cx - mx, dy = cy - my, d = Math.hypot(dx, dy) || 1; m.face = dx >= 0 ? 1 : -1;
    if (d < B3_GHOST_TOUCH) { this.ghostBoom(m); return; }
    const sp = 4.2; m.x = clamp(m.x + dx / d * sp, 60, WORLD_W - 60); m.gmove = (m.gmove || 0) + sp;
    const sy = G.terrain.surfaceBelow(m.x, Math.max(0, m.y - 120)); if (sy >= 0 && sy < WATER_Y - 30) m.y = sy;
    m.flyGoal = clamp(m.y - (cy + 18), 18, 240);
    if (m.gmove >= B3_GHOST_RANGE) { m.done = true; m.gmove = 0; }
  },
  ghostBoom(m) {
    const [cx, cy] = bodyCenter(m); m.done = true; m.gmove = 0;
    explode(cx, cy, 86, this.dmg(G.bossW || m, .85), { owner: m, fx: 'b3_ghost_boom', hs: 1.1, carve: 0, knock: 5 });
    hurt(m, m.hp + 99, { fall: true }); showBanner('The ghost explodes!', '#9fd4ff');
  },
  // ---------------- per-frame update / draw ----------------
  update() {
    if (!G.adv) return;
    G.b3q = G.b3q || []; for (const q of G.b3q) { if (--q.t <= 0) { q.dead = true; q.fn(); } } G.b3q = G.b3q.filter(q => !q.dead);
    if (G.b3flash > 0) G.b3flash--;
    for (const w of G.worms) {
      if (!w.rob || !w.rob.b3) continue; const k = w.rob.b3, c = B3_BY_KIND[k]; if (w.state === 'dead' || w.state === 'drown') continue;
      if (!w.b3init) { w.b3init = true; if (c.fly) { w.hover = true; w.flyGoal = c.fly; w.bobBase = c.fly; } }
      const busy = !!w.b3 || (w.spT > 0);
      if (c.fly && !busy && w.flyGoal != null) w.flyGoal = Math.max(40, (w.bobBase || c.fly) + Math.sin(G.frame / 28) * 9);
      if (G.phase === 'shooting' && G.activeWorm === w) {   // shooting animations: scorpion tail lash / hound spits lava
        w.b3st = (w.b3st | 0) + 1;
        if (k === 'scorpion') w.actF = w.b3st < 14 ? 7 : w.b3st < 70 ? 8 : null;
        if (k === 'hound') w.breathT = 40;
      } else { if (w.b3st) { w.b3st = 0; if (k === 'scorpion' && !w.b3 && !(w.spT > 0)) w.actF = null; } }
    }
    if (G.b3fx) { for (const f of G.b3fx) f.age++; G.b3fx = G.b3fx.filter(f => f.age < f.life); }
  },
  draw(ctx) {   // lightning bolts, thunder columns, floor flames (world space)
    const L = G.b3fx; if (!L || !L.length) return;
    const bolt = (x1, y1, x2, y2, seed, w, col, a) => {
      const n = Math.max(4, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 34)); let r = seed; const rn = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 - .5; }; const pts = [];
      for (let i = 0; i <= n; i++) { const t = i / n, j = (i === 0 || i === n) ? 0 : 1; pts.push([x1 + (x2 - x1) * t + rn() * 46 * j, y1 + (y2 - y1) * t + rn() * 30 * j]); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const [lw, c, al] of [[w * 3.2, col, .28 * a], [w * 1.6, col, .6 * a], [w * .7, '#ffffff', a]]) { ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
      ctx.restore();
    };
    for (const f of L) {
      if (f.age < 0) continue; const a = 1 - f.age / f.life;
      if (f.k === 'bolt') bolt(f.x1, f.y1, f.x2, f.y2, f.seed + Math.floor(f.age / 2) * 7, f.w, f.col, Math.min(1, a * 1.6));
      else if (f.k === 'thunder') { const a2 = Math.min(1, a * 1.8); bolt(f.x + rnd(-6, 6), f.y - 900, f.x, f.y, f.seed + f.age * 3, 12, '#9fe4ff', a2); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a2 * .5; const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, 90); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 90, 0, 6.283); ctx.fill(); ctx.restore(); }
      else if (f.k === 'flame') {
        const im = getImg('fx/b3_flame.webp'); if (!im) continue; const fi = (Math.floor(G.frame / 4) + (f.ph | 0)) % 8, al = Math.min(1, f.age / 12, a * 3), s = 1.25 + .2 * Math.sin(f.ph + G.frame / 9);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, al); ctx.drawImage(im, (fi % 4) * 128, Math.floor(fi / 4) * 128, 128, 128, f.x - 64 * s, f.y - 120 * s, 128 * s, 128 * s); ctx.restore();
      }
    }
    if (G.b3flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = G.b3flash / 8 * .25; ctx.fillStyle = '#bfe6ff'; ctx.fillRect(VIEW.cx - VIEW.W / VIEW.z, VIEW.cy - VIEW.H / VIEW.z, VIEW.W * 2 / VIEW.z, VIEW.H * 2 / VIEW.z); ctx.restore(); }
  },
};
