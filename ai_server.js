/* ONLINE VERSION of ai.js - upload this file to GitHub (online game only).
   The offline app keeps using ai.js. Edit the two files separately on purpose. */ 
'use strict';
const AI = {
  input: { left: false, right: false, up: false, down: false, fire: false, firePressed: false, jump: false, flip: false, fast: true },
  plan: null, st: 'think', t: 0, moved: 0, thinks: 0, lastX: 0, stuck: 0, bdir: 0,
  err: [[6, .16], [2.6, .07], [.8, .025]],
  reset() { const i = this.input; i.left = i.right = i.up = i.down = i.fire = i.firePressed = i.jump = i.flip = false; },
  begin(w) { this.reset(); this.plan = null; this.st = 'think'; this.t = 40 + rint(0, 40); this.thinks = 0; this.moved = 0; this.stuck = 0; this.lastX = w.x; this.bdir = 0; this.bmoved = false; w.bt = (w.bt | 0) + 1; w.spMul = 0; this.bdone = false; this.b3hop = false; this.b3done = false; this.bspecial = !!(isBoss(w) && w.rob.spec && w.bt % SPECIAL_EVERY === 0); },   // every 3rd boss turn = its special move
  // simulate a projectile shot and return where it ends
  sim(w, wd, rel, power) {
    const pr = wd.proj, save = w.aim; w.aim = rel; const [mx, my] = muzzleWorld(w, wd), d = aimDir(w); w.aim = save;
    const sp = Array.isArray(pr.speed) ? powSpeed(pr.speed[0], pr.speed[1], power) : pr.speed;
    let x = mx, y = my, vx = d[0] * sp, vy = d[1] * sp; const T = G.terrain, wa = pr.wind ? windAcc() * pr.wind : 0;
    for (let i = 0; i < 700; i++) {
      vx += wa; vy += pr.g || 0; const n = Math.max(1, Math.ceil(Math.hypot(vx, vy) / 3));
      for (let k = 0; k < n; k++) {
        x += vx / n; y += vy / n;
        if (T.solid(x, y)) return { x, y, hit: null };
        for (const t of G.worms) { if (t.state === 'dead' || t.state === 'drown') continue; if (t === w && i < 8) continue; if (onBody(t, x, y, 2)) return { x, y, hit: t }; }
        if (y > WATER_Y || x < -100 - sideExt() || x > WORLD_W + 100 + sideExt()) return { x, y, hit: null, out: true };
      }
      if (y < -1200) return null;
    }
    return null;
  },
  los(x1, y1, x2, y2) { const T = G.terrain, n = Math.ceil(dist(x1, y1, x2, y2) / 4); for (let i = 1; i < n; i++) if (T.solid(lerp(x1, x2, i / n), lerp(y1, y2, i / n))) return false; return true; },
  think(w) {
    const team = G.teams[w.team], enemies = aliveWorms().filter(e => e.team !== w.team);
    if (!enemies.length) return null;
    enemies.sort((a, b) => dist(w.x, w.y, a.x, a.y) * (1 + a.hp / 200) - dist(w.x, w.y, b.x, b.y) * (1 + b.hp / 200));
    const [er, ep] = this.err[G.diff]; let best = null;
    const targets = enemies.slice(0, 3);
    const faceBefore = w.face;
    for (const tg of targets) {
      const [tx, ty] = bodyCenter(tg), dx = tx - w.x, dd = dist(w.x, w.y, tx, ty); w.face = dx >= 0 ? 1 : -1;
      for (const wd of WEAPONS) {
        if (team.ammo[wd.id] <= 0) continue;
        let cand = null;
        if (wd.type === 'melee') { if (Math.abs(dx) < wd.range - 6 && Math.abs(ty - (w.y - 40)) < 42) cand = { wd, rel: 0, power: 1, score: -wd.dmg * 1.4 }; }
        else if (wd.type === 'place') {
          if (Math.abs(dx) < (wd.mine ? 150 : 110) && Math.abs(ty - w.y) < 80 && (!wd.mine || Math.random() < .5)) cand = { wd, rel: 0, power: 1, score: -wd.proj.dmg * .5 + 25, place: true };
        } else if (wd.type === 'beam' || wd.type === 'arc' || wd.type === 'flame') {
          const rng = wd.range || 150; if (wd.type === 'flame' && dd > 150) continue; if (dd > rng) continue;
          const [mx, my] = muzzleWorld(w, wd); if (wd.type !== 'arc' && wd.stop !== false && !this.los(mx, my, tx, ty)) continue;
          const ang = Math.atan2(-(ty - my), Math.abs(tx - mx)) / D2R; if (Math.abs(ang) > 80) continue;
          cand = { wd, rel: ang, power: 1, score: -(wd.dmg || (wd.dmgs ? wd.dmgs[0] : 30)) * 1.2 - (wd.type === 'flame' ? 40 : 0) };
        } else if (wd.proj && wd.proj.speed) {
          const charge = !!wd.charge, powers = charge ? [.3, .38, .46, .54, .62, .7, .78, .86, .94, .96] : [1]; let bestE = 1e9, ba = 0, bp = 1, hitT = false;
          for (let a = -50; a <= 80; a += 2.5) for (const pw of powers) {
            const r = this.sim(w, wd, a, pw); if (!r) continue; let e = dist(r.x, r.y, tx, ty); if (r.hit === tg) e = 0; else if (r.hit && r.hit.team === w.team) e = 1e8;
            const selfD = dist(r.x, r.y, w.x, w.y - 30); const blast = wd.proj.blast || 12; if (selfD < blast + 36 && wd.type !== 'burst') e += 400;
            if (e < bestE) { bestE = e; ba = a; bp = pw; hitT = r.hit === tg; }
          }
          const tol = (wd.proj.blast || 12) + (wd.type === 'timed' ? 4 : 10);
          if (bestE <= tol + 10) cand = { wd, rel: ba, power: bp, score: bestE * .4 - (wd.proj.dmg || 10) * (wd.type === 'burst' ? (wd.shots || 1) * .35 : 1) * (wd.pellets ? 2 : 1) - (hitT ? 12 : 0) + (wd.type === 'timed' ? 10 : 0) };
        }
        if (cand) { cand.tg = tg; cand.face = w.face; cand.score += Math.random() * 14; if (G.diff === 0) cand.score += Math.random() * 60; if (!best || cand.score < best.score) best = cand; }
      }
    }
    w.face = faceBefore;
    if (best) { best.rel += rnd(-er, er); best.power = clamp(best.power * (1 + rnd(-ep, ep)), .1, .96); }
    return best;
  },
  // ---- boss safety: is there a drop (cliff / pit / sea) within the boss's reach on this side? ----
  edgeNear(w, dir) {
    const T = G.terrain, sc = w.sc || 1;
    for (let d = 60 * sc / 2; d <= 110 * sc; d += 18) { const x = w.x + dir * d; if (x < 90 || x > WORLD_W - 90) return true; let ok = false; for (let dy = -50; dy <= 150; dy += 6) if (T.solid(x, w.y + dy)) { ok = true; break; } if (!ok) return true; }
    return false;
  },
  edgeFlee(w) { const l = this.edgeNear(w, -1), r = this.edgeNear(w, 1); return l && !r ? 1 : r && !l ? -1 : 0; },   // direction to walk away from the fall (0 = safe, or no safe side)
  // ---- boss minions (melee bots): ALL of them act at the same time in one shared turn (see swarmControl in world.js) ----
  // Each bot walks to the closest player and swings once. Obstacles are solved with exact physics (simWalk / simJump in world.js):
  //  - hole in the ground: walk to the very edge, then jump
  //  - wall / hill higher than a step: pick the take-off spot where the jump really clears the top (backing up for a run-up if needed)
  //  - nothing it can clear: it gives up at once instead of burning the whole timer
  scan(m, dir, foe) {   // look ahead along the path. Returns {free:true} or {jx: x to jump from} or {stuck:true}
    const sc = m.sc || 1, L = 70; let p = { x: m.x, y: m.y }, path = [p], o = -1;
    for (let k = 0; k < L; k++) { const q = simWalk(p, dir, sc); if (!q) { o = k; break; } p = q; path.push(q); }
    if (o < 0) return { free: true };
    const last = path[path.length - 1];
    if (foe && foe.y > m.y + 20 && this.safeDrop(last.x + dir * 3, last.y)) return { free: true };   // the player is lower: just step off a safe ledge
    const ok = q => { const r = simJump(q, dir, sc); return r && (r.x - last.x) * dir > 6 && r.y <= last.y + 24 && r.vy < 11 && !blocked(r.x, r.y, sc) ? r : null; };
    for (let k = path.length - 1; k >= 0; k -= (k === path.length - 1 ? 1 : 2)) if (ok(path[k])) return { jx: path[k].x };   // closest-to-the-obstacle spot that works (the edge, for a gap)
    let b = { x: m.x, y: m.y };   // no luck: back up for a run-up
    for (let k = 1; k <= 45; k++) { const q = simWalk(b, -dir, sc); if (!q) break; b = q; if (k % 3 === 0 && ok(b)) return { jx: b.x }; }
    return { stuck: true };
  },
  safeDrop(x, y) { if (x < 90 || x > WORLD_W - 90) return false; for (let d = 4; d <= 100; d += 4) if (G.terrain.solid(x, y + d)) return y + d < WATER_Y - 40; return false; },
  flyStep(m) {   // BABY DRAGONS: no melee. Every turn they fly to a NEW spot, hover, and spit 2 fireballs at the nearest player
    if (m.frozen > 0) { m.done = true; return; }
    const foes = aliveWorms().filter(e => e.team !== m.team); if (!foes.length) { m.done = true; return; }
    foes.sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x)); const tg = foes[0];
    if (m.fp == null) { const side = Math.random() < .5 ? -1 : 1; m.fx = clamp(tg.x + side * rnd(230, 430), 90, WORLD_W - 90); m.fp = 1; m.ft = 0; m.flyGoal = rnd(115, 190); }
    if (m.fp === 1) {   // glide to the new hover spot
      const dx = m.fx - m.x; m.ft++;
      if (Math.abs(dx) > 3 && m.ft < 420) { m.x += Math.sign(dx) * Math.min(2.8, Math.abs(dx)); m.face = dx > 0 ? 1 : -1; const sy = G.terrain.surfaceBelow(m.x, Math.max(0, m.y - 260)); if (sy >= 0 && sy < WATER_Y - 40) m.y += clamp(sy - m.y, -2, 2); }
      else { m.fp = 2; m.ft = 0; }
    } else if (m.fp === 2) {   // hold still, aim
      m.face = tg.x >= m.x ? 1 : -1; if (++m.ft > 26 && Math.abs((m.flyOff || 0) - m.flyGoal) < 8) { m.fp = 3; m.ft = 0; m.shots = 0; }
    } else if (m.fp === 3) {   // spit fireballs
      m.face = tg.x >= m.x ? 1 : -1; if (m.ft % 16 === 0 && m.shots < 2) { flyShot(m, tg, m.shots ? 4 : 0); m.shots++; }
      if (++m.ft > 40) m.done = true;
    }
  },
  swarmStep(m) {
    if (m.ghost) return BOSS3.ghostStep(m);   // Death Reaper's ghosts: float to a player and explode (boss3.js)
    if (m.hover) return this.flyStep(m);
    if (m.state !== 'ground') return;   // in the air: wait to land
    if (m.frozen > 0) { m.done = true; return; }
    const foes = aliveWorms().filter(e => e.team !== m.team); if (!foes.length) { m.done = true; return; }
    foes.sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x)); const tg = foes[0], wd = m.mw, dir = tg.x >= m.x ? 1 : -1, sc = m.sc || 1;
    const [cx, cy] = bodyCenter(tg), dx = (cx - m.x) * dir, dy = cy - (m.y - 40);
    if (dx < wd.range + 8 && dx > -14 && Math.abs(dy) < 46) {   // in reach: swing once, then it is finished
      m.face = dir; if (++m.mt > 12) { fireMelee(m, wd); m.done = true; } return;
    }
    if (++m.mwalk > 600 || m.fail > 3 || m.jumps > 6) { m.done = true; return; }
    if (m.jx != null) {   // walking to the exact take-off spot
      if (Math.abs(m.x - m.jx) < .73) { m.face = dir; jumpWorm(m, false); m.jx = null; m.jumps++; m.scanT = 0; return; }
      const mv = m.jx > m.x ? 1 : -1; const x0 = m.x; walkWorm(m, mv); if (Math.abs(m.x - x0) < .01) { if (++m.mstuck > 8) { m.jx = null; m.fail++; m.mstuck = 0; m.scanT = 0; } } else m.mstuck = 0;
      return;
    }
    if (--m.scanT <= 0) { m.scanT = 6; m.scanR = this.scan(m, dir, tg); }
    const r = m.scanR;
    if (r.free) { const x0 = m.x; walkWorm(m, dir); if (Math.abs(m.x - x0) < .01) { if (++m.mstuck > 6) { m.mstuck = 0; m.scanT = 0; m.fail++; } } else m.mstuck = 0; return; }
    if (r.jx != null) { m.jx = r.jx; m.scanR = null; m.mstuck = 0; return; }
    m.done = true;   // cannot get past: stop here
  },
  // ---- boss minion (melee bot): walk to the closest player and swing its weapon ----
  minion(w) {
    const I = this.input; I.firePressed = false; I.up = I.down = false;
    if (G.phase !== 'aim') { I.left = I.right = false; return; }   // after the swing it just stands there until the turn ends
    if (w.state !== 'ground') { I.left = I.right = false; return; }
    const foes = aliveWorms().filter(e => e.team !== w.team); if (!foes.length) { I.left = I.right = false; return; }
    foes.sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x)); const tg = foes[0], wd = w.mw, dir = tg.x >= w.x ? 1 : -1;
    w.face = dir; const [cx, cy] = bodyCenter(tg), dx = (cx - w.x) * dir, dy = cy - (w.y - 40);
    if (dx < wd.range + 8 && dx > -14 && Math.abs(dy) < 46) {   // in reach: swing
      I.left = I.right = false; w.mt = (w.mt | 0) + 1; if (w.mt > 12) { I.firePressed = true; w.mt = 0; } return;
    }
    w.mwalk = (w.mwalk | 0) + 1; if (w.mwalk > 260) { I.left = I.right = false; w.mwalk = 0; endTurnNow(); return; }   // walked far enough this turn
    const ahead = w.x + dir * 24; let ok = false; for (let k = 0; k < 90; k += 4) if (G.terrain.solid(ahead, w.y + k)) { ok = true; break; }
    if (!ok) {   // a hole / gap ahead: if there is ground on the other side within jumping reach, JUMP across it, otherwise stop
      let land = false; for (let d = 30; d <= 110 && !land; d += 8) for (let k = -30; k < 90; k += 6) if (G.terrain.solid(w.x + dir * d, w.y + k) && !G.terrain.solid(w.x + dir * d, w.y + k - 70)) { land = true; break; }
      if (land) { I.left = dir < 0; I.right = dir > 0; I.jump = true; return; }
      I.left = I.right = false; w.mwalk = 0; endTurnNow(); return;
    }
    I.left = dir < 0; I.right = dir > 0;
    if (Math.abs(w.x - (w.lx == null ? w.x - 9 : w.lx)) < .2) w.mstuck = (w.mstuck | 0) + 1; else w.mstuck = 0; w.lx = w.x;
    if (w.mstuck > 10) { I.jump = true; w.mstuck = 0; }   // blocked by a ledge or crater edge: hop
  },
  update(w) {
    if (w.minion) { this.minion(w); return; }
    const I = this.input; I.firePressed = false; if (G.phase === 'retreat') { this.retreat(w); return; }
    if (G.phase !== 'aim') { this.reset(); return; }
    if (w.state !== 'ground') { I.left = I.right = false; return; }
    if (this.st === 'think') {
      this.reset(); if (this.t-- > 0) return;
      if (w.rob.b3 && BOSS3.think(w, this)) return;   // HEROIC third bosses: their own turn scripts (hop / slash / charge / lightning), see boss3.js
      if (isBoss(w)) { const fl = this.edgeFlee(w); if (fl) { this.st = 'flee'; this.dir = fl; this.t = 150; this.stuck = 0; this.lastX = w.x; showBanner('⚠ ' + w.name + ' backs away from the edge', '#ffb347'); return; } }   // boss near a fall: step away from it first
      if (isBoss(w) && bossStompTargets(w).length && !(this.bspecial && !this.bdone) && !(w.flyOff > 20)) { this.st = 'stomp'; this.t = 0; w.stompT = 0; showBanner('⚠ ' + w.name + ' raises a foot…', '#ff4a4a'); return; }   // boss: a player is too close, stomp instead of shooting
      if (isBoss(w) && !this.bmoved) {   // EVERY boss turn (robot bosses and creature bosses): walk a few steps left or right FIRST, then aim and shoot from the new spot
        this.bmoved = true; const pick = Math.random() < .5 ? -1 : 1; let d = pick;
        if (this.edgeNear(w, d)) d = -d;   // never walk toward a drop
        if (!this.edgeNear(w, d)) { this.st = 'move'; this.moved = 0; this.dir = d; this.bdir = d; this.t = 50 + rint(0, 45); this.stuck = 0; this.lastX = w.x; return; }
      }
      if (this.bspecial && !this.bdone) {   // SPECIAL TURN (after the walk): smash / roar / jump on the spot, or take off (dragon)
        this.bdone = true; const sp = w.rob.spec;
        if (sp === 'fly') { w.flyGoal = 150; w.spMul = SPECIAL_MUL; this.st = 'flyup'; this.t = 0; showBanner('⚠ ' + w.name + ' takes to the air!', '#ff7a3a'); return; }
        this.st = 'special'; w.spT = 0; w.actF = 0; showBanner('⚠ ' + w.name + (sp === 'roar' ? ' takes a deep breath…' : sp === 'jump' ? ' crouches to jump…' : ' raises both hands…'), '#ff4a4a'); return;
      }
      this.thinks++;
      this.plan = this.think(w);
      if (this.plan) { this.st = 'aim'; w.face = this.plan.face; const t = curTeam(); t.sel = WEAPONS.indexOf(this.plan.wd); this.t = 0; }
      else if (G.timer < 420 || this.thinks > 5) { // desperate shot with whatever is available
        const e = aliveWorms().filter(x => x.team !== w.team)[0], fb = WEAPONS.find(x => curTeam().ammo[x.id] > 0) || WEAPONS[0]; if (e) { this.plan = { wd: fb, rel: 20, power: 1, face: e.x > w.x ? 1 : -1 }; this.st = 'aim'; w.face = this.plan.face; curTeam().sel = WEAPONS.indexOf(fb); }   // desperate shot with the weapon this team really owns (never a locked one)
      } else { this.st = 'move'; this.moved = 0; this.t = 70 + rint(0, 40); const e = aliveWorms().filter(x => x.team !== w.team).sort((a, b) => dist(w.x, w.y, a.x, a.y) - dist(w.x, w.y, b.x, b.y))[0]; this.dir = e && e.x < w.x ? -1 : 1;
        if (isBoss(w)) { if (!this.bdir) this.bdir = this.dir; else if (this.thinks % 2 === 0) this.bdir = -this.bdir; this.dir = this.bdir; this.t = 30 + rint(0, 25); }   // boss: short steps in either direction, re-aiming after each one (never just backing off)
      }
    } else if (this.st === 'flee') {
      if (this.t-- <= 0 || !this.edgeNear(w, -this.dir) && !this.edgeNear(w, this.dir) || this.edgeNear(w, this.dir)) { this.reset(); this.st = 'think'; this.t = 25; return; }
      I.left = this.dir < 0; I.right = this.dir > 0; if (Math.abs(w.x - this.lastX) < .2) this.stuck++; else this.stuck = 0; this.lastX = w.x; if (this.stuck > 14) { I.jump = true; this.stuck = 0; }
    } else if (this.st === 'move') {
      if (isBoss(w) && this.edgeNear(w, this.dir)) { this.bdir = -this.dir; this.reset(); this.st = 'think'; this.t = 10; return; }   // never step toward a drop
      if (this.t-- <= 0) { this.reset(); this.st = 'think'; this.t = 20; return; }
      // don't walk off a cliff
      const ahead = w.x + this.dir * 34; let ok = false; for (let dy = 0; dy < 70; dy += 4) if (G.terrain.solid(ahead, w.y + dy)) { ok = true; break; }
      if (!ok || this.stuck > 25) { if (this.stuck > 25 && ok) { I.jump = true; this.stuck = 0; } else { if (isBoss(w)) this.bdir = -this.dir; this.reset(); this.st = 'think'; this.t = 10; return; } }
      I.left = this.dir < 0; I.right = this.dir > 0;
      if (Math.abs(w.x - this.lastX) < .2) this.stuck++; else this.stuck = 0; this.lastX = w.x;
    } else if (this.st === 'aim') {
      const p = this.plan; I.left = I.right = false; w.face = p.face; const diff = p.rel - w.aim;
      I.up = diff > 1.2; I.down = diff < -1.2; I.fast = true;
      if (Math.abs(diff) <= 1.2) {
        I.up = I.down = false; this.t++; if (this.t < 18) return;
        const wd = p.wd; curTeam().sel = WEAPONS.indexOf(wd); w.aim = p.rel;
        if (wd.charge) { this.st = 'charge'; this.cf = 0; I.fire = true; I.firePressed = true; } else { I.firePressed = true; this.st = 'fired'; }
      }
    } else if (this.st === 'charge') {
      I.fire = true; this.cf++; if (this.cf > 4 && (G.charge >= this.plan.power || !G.charging)) { I.fire = false; this.st = 'fired'; }
    } else if (this.st === 'fired') { I.fire = false; }
    else if (this.st === 'stomp') { this.reset(); if (bossStompStep(w)) this.st = 'fired'; }
    else if (this.st === 'special') { this.reset(); if (bossSpecialStep(w)) this.st = 'fired'; }
    else if (this.st === 'b3') { this.reset(); BOSS3.step(w, this); }
    else if (this.st === 'flyup') { this.reset(); if (w.flyOff >= 146 || ++this.t > 110) { this.st = 'think'; this.t = 25; } }
  },
  retreat(w) {
    const I = this.input; I.firePressed = false; I.up = I.down = false; this.reset();
    if (isBoss(w)) { const fl = this.edgeFlee(w); if (fl && w.state === 'ground') { I.left = fl < 0; I.right = fl > 0; } return; }   // bosses never back away from players, but they do step away from an edge
    if (!this.plan || w.state !== 'ground') return;
    const wd = this.plan.wd;
    if (wd.type === 'place' || (wd.proj && wd.proj.blast > 60) || wd.type === 'timed') {
      const away = this.plan.tg && this.plan.tg.x > w.x ? -1 : 1; const ahead = w.x + away * 34; let ok = false; for (let dy = 0; dy < 70; dy += 4) if (G.terrain.solid(ahead, w.y + dy)) { ok = true; break; }
      if (ok && G.timer > 20) { I.left = away < 0; I.right = away > 0; if (Math.abs(w.x - this.lastX) < .2 && this.stuck++ > 15) { I.jump = true; this.stuck = 0; } this.lastX = w.x; }
    }
  }
};
