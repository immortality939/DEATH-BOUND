/* ONLINE VERSION of world.js - upload this file to GitHub (online game only).
   The offline app keeps using world.js. Edit the two files separately on purpose. */
'use strict';
const POW_FADE = .15;   // ruler 0..15: the shot fades down to NOTHING (at 0 the projectile just drops at your feet, like DDTanks); from 15 up it is the normal speed curve. Smaller = the fade is shorter
const powSpeed = (lo, hi, p) => lerp(lo, hi, p) * Math.min(1, Math.max(0, p) / POW_FADE);   // launch speed for ruler value p (0..1)
const POW_MAX = 1.5;   // the ruler goes 0 -> 150 (1.5 = 150). 100 is the old full power; 100..150 shoots even farther (speed keeps climbing in a straight line)
const CHARGE_STEP = 1 / 220;           // shoot-button power meter speed per frame (was 1/100). Smaller = slower
const AIM_STEP = 0.4, AIM_FAST = 0.8;  // up/down arrow aim speed in degrees per frame (was 1.1 / 2.2). Smaller = slower
const TEAM_COLORS = ['#ff5a4d', '#4da3ff', '#5be37a', '#ffd24a'];
const TEAM_NAMES = ['Red', 'Blue', 'Green', 'Gold'];
const G = {   // game state
  mode: 'menu', terrain: null, worms: [], teams: [], projs: [], fxs: [], parts: [], pops: [], beams: [], crates: [], mines: [],
  wind: 0, cur: 0, phase: 'none', timer: 0, frame: 0, charge: 0, charging: false, burst: null, volley: null, angT: 0, flameT: 0, firedThisTurn: false, settleT: 0,
  cam: { x: 0, y: 0, z: 1, shake: 0, mul: 1 }, banner: null, theme: 'day', winner: null, turnCount: 0, diff: 1, activeWorm: null, shotsLeft: 0,
};

// ---------------- helpers ----------------
function wdef(id) { return WEAPONS.find(w => w.id === id); }
function aliveWorms() { return G.worms.filter(w => w.state !== 'dead' && w.state !== 'drown'); }
// ARENA (online only): G.squad[teamIdx] = side number. Teams on the same side are allies (never targeted, win together). G.squad is null in every normal match.
function sameSide(a, b) { if (!a || !b) return false; if (a.team === b.team) return true; const S = G.squad; return !!(S && S[a.team] != null && S[a.team] === S[b.team]); }
function teamAlive(t) { return G.worms.some(w => w.team === t && w.state !== 'dead' && w.state !== 'drown'); }
function teamHP(t) { return G.worms.reduce((a, w) => a + (w.team === t && w.hp > 0 ? w.hp : 0), 0); }
function gripWorld(w) {
  const an = w.rob.anchors[w.fi].w || w.rob.anchors[w.fi].n, F = Assets.robots.feet, sc = w.sc || 1; let lx = an[0] - F[0], ly = an[1] - F[1];
  const idl = typeof bossIdleXf === 'function' ? bossIdleXf(w) : null;   // boss idle breathing (render.js): move the grip point with the body
  if (idl) { const px = lx * idl.sx, py = ly * idl.sy, c = Math.cos(idl.rot), s = Math.sin(idl.rot); lx = px * c - py * s; ly = px * s + py * c; }
  return [w.x + w.face * lx * RS * sc, w.y - (w.flyOff || 0) + ly * RS * sc];
}
function muzzleWorld(w, wd) {
  const [gx, gy] = gripWorld(w), m = Assets.wmeta[wd.id].muzzle, sc = w.sc || 1, hs = wd.hold || 1, lx = (m[0] - 170) * WS * hs * RS * sc, ly = (m[1] - 128) * WS * hs * RS * sc, a = w.aim * D2R;
  return [gx + w.face * (lx * Math.cos(a) + ly * Math.sin(a)), gy + (-lx * Math.sin(a) + ly * Math.cos(a))];
}
function aimDir(w) { const a = w.aim * D2R; return [w.face * Math.cos(a), -Math.sin(a)]; }
function bodyCenter(w) { return [w.x, w.y - (w.flyOff || 0) - 40 * (w.sc || 1)]; }   // flyOff = how high a flying dragon hovers above the ground
// Body shape = an ellipse. BOSSES (3x bigger) also get a head ellipse on top, so a shot on the very top of the head still hits them.
function bodyShapes(w) { const sc = w.sc || 1, fy = w.y - (w.flyOff || 0), s = [[w.x, fy - 40 * sc, 20 * sc, 38 * sc]]; if (isBoss(w)) s.push([w.x, fy - 66 * sc, 25 * sc, 23 * sc]); return s; }
function onBody(w, px, py, pad = 0) { for (const [cx, cy, rx, ry] of bodyShapes(w)) { const dx = (px - cx) / (rx + pad), dy = (py - cy) / (ry + pad); if (dx * dx + dy * dy <= 1) return true; } return false; }
function bodyGap(w, x, y) {   // distance from a point to the body shape (0 = inside it). Explosions use it so a hit ANYWHERE on a big boss (top of the head too) still damages it
  let best = 1e9; for (const [cx, cy, rx, ry] of bodyShapes(w)) { const dx = x - cx, dy = y - cy, k = Math.hypot(dx / rx, dy / ry); best = Math.min(best, k <= 1 ? 0 : Math.hypot(dx, dy) * (1 - 1 / k)); } return best;
}
function curWorm() { return G.activeWorm; }
function curTeam() { const w = G.activeWorm; return w ? G.teams[w.team] : null; }

// ---------------- fx ----------------
function addFx(name, x, y, scale = 1, opts = {}) { const d = Assets.fx[name]; if (!d) return; G.fxs.push(Object.assign({ name, x, y, scale, t: 0, d, rot: 0 }, opts)); }
function addPop(x, y, text, color = '#fff', size = 18) { G.pops.push({ x, y, text, color, size, t: 0 }); }
function debris(x, y, n, kind) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.283), s = rnd(1.5, 7);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, life: rint(35, 80), t: 0, size: rnd(2, 5), col: kind === 'metal' ? (Math.random() < .5 ? '#8a8f9c' : '#ff8a2a') : (Math.random() < .5 ? G.terrain.theme.dirt.map(v => v | 0) : G.terrain.theme.deep.map(v => v | 0)), spin: rnd(-.3, .3), rot: 0 });
  }
}
function shake(a) { G.cam.shake = Math.min(26, G.cam.shake + a); }

// ---------------- damage ----------------
function usePotion(ti, k) {   // Heal / Team Heal item box k (0 or 1) of team ti. Returns true when it was used (the turn goes on).
  const t = G.teams[ti], p = t && t.pots && t.pots[k], w = G.activeWorm;
  if (!p || p.left <= 0 || !w || w.team !== ti || (G.potUsed | 0) >= POTION_PER_TURN) return false;
  const list = p.kind === 'team' ? aliveWorms().filter(x => sameSide(x, w)) : [w]; let tot = 0;
  list.forEach(x => { const h = Math.max(0, Math.min((x.maxHp || 100) - x.hp, Math.round((x.maxHp || 100) * p.pct))); if (h > 0) { x.hp += h; x.healT = 36; tot += h; const s = x.sc || 1; addFx('heal_pulse', x.x, x.y - 57 * s, .95 * s); addPop(x.x, x.y - 95 * s, '+' + h + ' HP', '#8dff9e', 20); } });
  if (!tot) { addPop(w.x, w.y - 95 * (w.sc || 1), 'Full health', '#cfe8ff', 16); return false; }   // nothing to heal: the item is not used up
  p.left--; try { if (typeof Profile !== 'undefined') Profile.addStock(p.id, -1); } catch (e) { }   // gone for good: buy again in the Shop
  G.potUsed = (G.potUsed | 0) + 1; if (p.kind === 'team') { const s = (w.sc || 1) * 1.25; addFx('team_heal_wave', w.x, w.y - 72 * s, s); } shake(1); Snd.play('heal'); return true;
}
function teamBonus(t) { return (G.teams[t] && G.teams[t].bonus) || null; }
function hurt(w, dmg, opt = {}) {
  if (w.state === 'dead' || w.state === 'drown' || dmg <= 0) return;
  let crit = false;
  if (!opt.fall) {   // equipment: attacker's Damage raises damage to enemies, victim's Defense lowers all damage
    const at = G.activeWorm, ab = at ? teamBonus(at.team) : null   /* friendly fire gets the attacker's full bonuses too, so hitting your own team hurts as much as hitting an enemy */, vb = teamBonus(w.team);
    const sig = at && WEAPONS[G.teams[at.team].sel] && (WEAPONS[G.teams[at.team].sel].sig || WEAPONS[G.teams[at.team].sel].shop);   // signature or shop weapon
    if (ab && ab.pow) dmg *= 1 + ab.pow / 100;   // Adventure enemy / boss buff (% more damage)
    if (ab && sig) { if (ab.wmul) dmg *= ab.wmul; if (ab.xdmg) dmg += ab.xdmg; }   // your signature weapon: upgrade level (see upBonus), then flat Damage from your gear (see charStats in profile.js)
    if (ab && sig && G.adv && hasWeaponSkill(WEAPONS[G.teams[at.team].sel])) dmg *= ADV_SKILL_DMG;   // Adventure: a Shop weapon with a skill (multi-shot, scatter, freeze, homing) deals only 50% damage
    if (ab && ab.crt && Math.random() * 100 < ab.crt) { crit = true; dmg *= (ab.cdm || CRITDMG_BASE) / 100; }   // critical hit: chance = crt %, damage = cdm %
    if (vb) dmg *= 1 - defPct(vb) / 100;   // Defense points / 10 = % blocked (enemy armor is already %), max 60%
  }
  dmg = Math.round(dmg); if (dmg <= 0) dmg = 1;
  let pwr = false; if (typeof POW !== 'undefined') { const pd = POW.mod(w, dmg, opt); if (pd !== dmg) { dmg = pd; pwr = true; } }   // POW shot: +50% of the final damage (after crit / defense), see pow.js
  w.hp -= dmg; w.flash = 14; addPop(w.x, w.y - 82 * (w.sc || 1), '-' + dmg + (crit || pwr ? '!' : ''), pwr ? '#ff9a2a' : crit ? '#ffd24a' : '#ffefe0', crit || pwr ? 28 : 20); Snd.play('hit');
  if (typeof POW !== 'undefined') POW.onHit(w, dmg, opt);   // the player's POW meter fills faster the harder he is hit
  if (w.hp <= 0) { w.hp = 0; killWorm(w); }
}
function killWorm(w) { w.state = 'dead'; w.dt = 0; w.vx = w.vy = 0; w.exploded = false; }
// ---- limits so nothing leaves the map for good ----
const KNOCK_MAX = 13;       // fastest a blast can push a robot (up / sideways). 13 = about 280 px high, then it falls back down normally
function sideExt() { return (G.adv && G.terrain && G.terrain.eL) ? EDGE_EXT : 0; }   // Adventure: shots / beams may fly over the walkable ground beside the map, so their side limits move out by this much
const PROJ_CEILING = -5000; // a shot is only removed when it is this far above the map (gravity brings every shot back long before)
function knockWorm(w, kx, ky) { if (w.state === 'dead' || w.state === 'drown') return; const hv = 1 / ((w.sc || 1) * (w.sc || 1)); w.vx += kx * hv; w.vy += ky * hv;
  w.vx = clamp(w.vx, -KNOCK_MAX, KNOCK_MAX); w.vy = clamp(w.vy, -KNOCK_MAX, KNOCK_MAX);   // a huge blast can never fire a robot off the top of the map   // big robots (bosses) are heavy: blasts push them less
  w.state = 'air'; w.knocked = true; w.fallPeak = 0; }

function explode(x, y, R, dmg, o = {}) {
  const T = G.terrain;
  if (o.carve !== 0) T.carve(x, y, R * (o.carveMul || .9));
  if (o.fx !== null) addFx(o.fx || 'explosion_small', x, y, (o.hs || 1) * (R / 50) * (o.fxMul || 1) * 1.0);
  debris(x, y, Math.floor(R / 3.2), 'dirt'); if (R > 30) debris(x, y, Math.floor(R / 8), 'metal');
  shake(R / 7); if (!o.silent) Snd.play(R > 45 ? 'boom' : 'smallboom', R / 60);
  const kn = o.knock != null ? o.knock : 3 + R * .09;
  for (const w of G.worms) {
    if (w.state === 'dead' || w.state === 'drown') continue;
    if (o.owner && bossAlly(o.owner, w)) continue;   // boss stage: the boss and its minions never hurt (or push / freeze) each other
    const [cx, cy] = bodyCenter(w), d = dist(x, y, cx, cy), dd = Math.min(Math.max(0, d - 22 * (w.sc || 1)), bodyGap(w, x, y));   // the old circle OR the real body shape, whichever is closer
    if (dd >= R) continue;
    const f = 1 - dd / R;
    if (dmg > 0) hurt(w, Math.max(1, dmg * f));
    if (o.freeze) { w.frozen = Math.max(w.frozen, 1); addPop(w.x, w.y - 100, 'FROZEN', '#bfeaff', 16); }
    let nx = cx - x, ny = cy - y - 6; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    if (!o.noKnock && !(o.owner && o.owner.minion)) knockWorm(w, nx * kn * f * 1.1, ny * kn * f * 1.1 - .8 * f);
  }
  for (const p of G.projs) { // chain-react mines and dynamite
    if ((p.mine || p.w.id.startsWith('16')) && !p.dead && p.fuse > 6 && dist(x, y, p.x, p.y) < R + 10) { p.fuse = 6 + rint(0, 6); p.armed = true; }
  }
  for (const c of G.crates) if (!c.dead && dist(x, y, c.x, c.y - 20) < R + 12) { c.dead = true; addFx('explosion_small', c.x, c.y - 18, .6); }
}

// ---------------- worm physics ----------------
const BODY_Y = [-5, -15, -27, -39, -51, -63];
function blocked(x, y, sc = 1) { const T = G.terrain, hw = 11 * sc; for (let i = 0; i < BODY_Y.length; i++) { const yy = y + BODY_Y[i] * sc; if (T.solid(x - hw, yy) || T.solid(x + hw, yy)) return true; } return T.solid(x, y - 70 * sc); }
function onGround(x, y, sc = 1) { const T = G.terrain, hw = 9 * sc; return T.solid(x - hw, y + 1) || T.solid(x + hw, y + 1) || T.solid(x, y + 1); }
function landWorm(w, impact) {
  if (w.jet) { w.jet = false; w.state = 'ground'; w.vx = w.vy = 0; w.knocked = false; w.bounces = 0; addFx('smoke', w.x, w.y - 8, .45); Snd.play('flyland'); return true; }   // Fly: soft landing, no fall damage
  if (impact > 9.5 && w.state === 'air') { const dmg = Math.floor((impact - 9.5) * 3.4); if (dmg > 0) { hurt(w, dmg, { fall: true }); } shake(impact * .5); addFx('smoke', w.x, w.y - 8, .5); }
  if (w.knocked && impact > 4.2 && w.bounces < 3) { w.vy = -impact * .3; w.vx *= .72; w.bounces++; return false; }
  w.state = 'ground'; w.vx = 0; w.vy = 0; w.knocked = false; w.bounces = 0; return true;
}
function walkWorm(w, dir) {
  if (w.state !== 'ground' || w.frozen > 0 || w.hp <= 0) return;
  w.face = dir; const wb = teamBonus(w.team), sp = 1.45, nx = w.x + dir * sp;
  const sc = w.sc || 1; for (let up = 0; up <= 12 * sc; up++) if (!blocked(nx, w.y - up, sc)) { w.x = nx; w.y -= up; break; }
  if (!onGround(w.x, w.y, sc)) { let ok = false; for (let dn = 1; dn <= 7 * sc; dn++) if (onGround(w.x, w.y + dn, sc)) { w.y += dn; ok = true; break; } if (!ok) { w.state = 'air'; w.vx = dir * .8; w.vy = 0; w.knocked = false; } }
  w.walkAcc += sp; if (w.walkAcc > 7) { w.walkAcc = 0; w.wf = (w.wf + 1) % 8; }
  w.walking = 3;
}
// ---- Fly: tap the Fly button, hold FIRE, release = launch along the aim arrow (UNLIMITED, does not end the turn) ----
function canFly() { return G.mode === 'play' && G.phase === 'aim' && !G.swarm && (!FLY_ADVENTURE_ONLY || G.adv) && curTeam() && !curTeam().cpu && !!(curTeam().bonus && curTeam().bonus.wing) /* Fly needs a Wings item worn in the Profile Wings slot */ && G.activeWorm && G.activeWorm.state === 'ground' && G.activeWorm.frozen <= 0; }
function chargeTick() {   // ruler ping-pong: 0 -> 150 -> 0 -> 150 ... (never jumps back to 0)
  if (!G.chgDir) G.chgDir = 1; G.charge += CHARGE_STEP * G.chgDir;
  if (G.charge >= POW_MAX) { G.charge = POW_MAX; G.chgDir = -1; } else if (G.charge <= 0) { G.charge = 0; G.chgDir = 1; }
}
function launchFly(w, power) {
  const d = aimDir(w), sp = powSpeed(FLY_SPEED[0], FLY_SPEED[1], power);
  w.lastFlyPow = clamp(power, 0, POW_MAX); w.state = 'air'; w.knocked = false; w.bounces = 0; w.jet = true; w.jetT = 0; w.airT = 0;
  w.vx = d[0] * sp; w.vy = Math.min(d[1] * sp, -1.5); w.y -= 3;   // always lifts off a little, even when aiming flat or down
  G.charging = false; G.charge = 0; G.flyMode = false; G.cam.free = false; G.angT = 0;   // back to your normal weapon after the flight
  Snd.play('fly'); addFx('smoke', w.x, w.y, .5); shake(1.5);
}
function flyControl(C) {
  if (!canFly()) { G.charging = false; return; }
  if (C.firePressed && !G.charging) { G.charging = true; G.charge = 0; G.chgDir = 1; }
  if (G.charging) { if (C.fire) { chargeTick(); } else launchFly(G.activeWorm, Math.max(0, G.charge)); }
}
function jumpWorm(w, back) { if (w.state !== 'ground' || w.frozen > 0) return; w.state = 'air'; w.knocked = false; w.vy = back ? -8.4 : -6.2; w.vx = back ? -w.face * 1.5 : w.face * 2.6; w.y -= 2; Snd.play('jump'); }
// ---- anti-stuck safety net: a robot wedged in rock / hung in the air gets moved to the nearest free ground ----
function rescueWorm(w) {
  w.stuckT = 0; w.airT = 0;
  for (let k = 0; k <= 420; k += 12) for (const dx of [0, 24, -24, 48, -48, 80, -80, 120, -120, 180, -180]) {
    const s = findTeleSpot(w.x + dx, Math.max(-250, w.y - k), w.sc || 1, 1400);
    /* a robot far above the map starts the search at the top edge and drops to the ground below */
    if (s) { addFx('teleport', w.x, w.y - 30, 1); w.x = s[0]; w.y = s[1]; w.vx = w.vy = 0; w.state = 'ground'; w.knocked = false; w.bounces = 0; addFx('teleport', w.x, w.y - 30, 1); return true; }
  }
  addPop(w.x, w.y - 80, 'Lost!', '#ffb0a0', 18); w.hp = 0; killWorm(w); return false;
}
function updateWorm(w) {
  const sc = w.sc || 1;
  if (w.jet && w.state !== 'air') w.jet = false;   // Fly ends the moment the robot is not in the air any more (died, drowned, rescued)
  if (w.flash > 0) w.flash--; if (w.healT > 0) w.healT--; if (w.walking > 0) w.walking--;
  if (w.flyGoal != null) w.flyOff = (w.flyOff || 0) + clamp(w.flyGoal - (w.flyOff || 0), -3.2, 3.2);   // flying dragons rise / land smoothly
  if (w.breathT > 0) w.breathT--; if (w.lunge > 0) w.lunge--;
  if (w.hover && w.state !== 'dead' && w.state !== 'drown') { w.vx = w.vy = 0; w.state = 'ground'; w.knocked = false; return; }   // baby dragons fly: no gravity, they cannot fall or drown
  if (w.state === 'dead') {
    w.dt++;
    if (w.dt === 11 && !w.exploded) { w.exploded = true; explode(w.x, w.y - 40 * sc, 42 * sc, 20, { fx: null, silent: false, knock: 5, noKnock: isSlimeMinion(w), owner: w }); Snd.play('boom', .8); }   // owner: a dying minion's blast doesn't hurt the boss side
    return;
  }
  if (w.state === 'drown') { w.dt++; w.y += .9; return; }
  if (blocked(w.x, w.y, sc)) { if ((w.stuckT = (w.stuckT | 0) + 1) > 24) { rescueWorm(w); return; } } else w.stuckT = 0;   // embedded in terrain
  if (w.state === 'air') { if ((w.airT = (w.airT | 0) + 1) > 480) { rescueWorm(w); return; } } else w.airT = 0;      // hanging in the air for 8s
  if (w.state === 'ground') { if (!onGround(w.x, w.y, sc)) { w.state = 'air'; w.vy = 0; w.knocked = false; w.fallPeak = 0; } }
  if (w.state === 'air') {
    w.vy = Math.min(w.vy + (w.jet ? FLY_G : .3), 17);
    if (w.jet && (w.jetT = (w.jetT | 0) + 1) % 3 === 0) addFx('fly_trail', w.x - w.face * 9 * sc + rnd(-7, 7), w.y - 34 * sc + rnd(-14, 14), rnd(.55, .95));   // sparkle trail while flying
    const n = Math.ceil(Math.max(Math.abs(w.vx), Math.abs(w.vy))); const sx = w.vx / n, sy = w.vy / n;
    for (let i = 0; i < n; i++) {
      if (sx) { if (blocked(w.x + sx, w.y, sc)) { let stepped = false; for (let up = 1; up <= 4 && !stepped; up++) if (!blocked(w.x + sx, w.y - up, sc)) { w.x += sx; w.y -= up; stepped = true; } if (!stepped) { w.vx *= -.35; } } else w.x += sx; }
      if (sy > 0) { if (onGround(w.x, w.y + sy, sc) && w.y + sy >= w.y) { w.y += sy; if (onGround(w.x, w.y, sc)) { let yy = w.y; while (onGround(w.x, yy - 1, sc) && yy > w.y - 6) yy--; w.y = yy; if (landWorm(w, w.vy)) break; else { w.y -= 2; break; } } } else w.y += sy; }
      else if (sy < 0) { if (blocked(w.x, w.y + sy, sc)) { w.vy = 0; break; } w.y += sy; }
    }
    if (w.vy < 0 || !w.knocked) { /* free flight */ }
  }
  // sea & world bounds
  const XB = (G.adv && G.terrain && G.terrain.eL) ? EDGE_EXT + 30 : 30;   // Adventure: the real ground drawn beside the map is walkable, so the death line is past its far end (the solid wall)
  if ((w.y > WATER_Y + 16 || w.x < -XB || w.x > WORLD_W + XB) && w.state !== 'drown') {
    w.state = 'drown'; w.dt = 0; w.hp = 0;
    if (G.adv) { Snd.play('boom', .5); addFx('explosion_small', clamp(w.x, 0, WORLD_W), clamp(w.y, 0, WORLD_H - 20), 1.2); addPop(clamp(w.x, 40, WORLD_W - 40), clamp(w.y, 60, WORLD_H - 60) - 40, 'Fell off the map!', '#ffd0a0', 18); }   // Adventure: no sea
    else { Snd.play('splash'); addFx('splash', clamp(w.x, 0, WORLD_W), WATER_Y - 30, 1.2); addPop(w.x, WATER_Y - 40, 'Drowned!', '#bfe6ff', 18); }
  }
}

// ---------------- projectiles ----------------
function spawnProj(o) {
  const p = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, age: 0, dead: false, rest: false, bounces: 0, owner: null, hitList: [] }, o); G.projs.push(p); return p;
}
function windAcc() { return G.wind * .018; }
function launchShot(w, wd, power, jitter = 0, extra = {}) {
  const pr = wd.proj, [mx, my] = muzzleWorld(w, wd), d = aimDir(w);
  const a = Math.atan2(d[1], d[0]) + rnd(-jitter, jitter) * D2R;
  let sp = Array.isArray(pr.speed) ? powSpeed(pr.speed[0], pr.speed[1], power) : pr.speed;
  w.breathT = 45;
  const pj = spawnProj(Object.assign({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: wd, p: pr, owner: w, kind: wd.type === 'timed' ? 'timed' : 'shot', fuse: pr.fuse || 0, life: pr.life || 900 }, extra));
  if (w.spMul) pj.p = Object.assign({}, pr, { dmg: Math.round(pr.dmg * w.spMul) });   // boss special turn (dragon in the air): +20% damage
  return pj;
}
function detonate(p) {
  const pr = p.p; p.dead = true;
  if (pr.divine) { divineBurst(p); return; }   // Divine Heal: heals, no damage, no crater
  if (p.bomblet) { explode(p.x, p.y, pr.bomblet.blast, pr.bomblet.dmg, { fx: 'explosion_small', hs: .7, knock: 5, silent: false, owner: p.owner }); return; }
  const hitFx = (pr.hitT && pr.hitT[p.owner ? teamWTier(G.teams[p.owner.team]) : 0]) || pr.hit;   // some weapons have their own hit effect per upgrade look
  explode(p.x, p.y, pr.blast, pr.dmg, { fx: hitFx, hs: pr.hs, knock: pr.knock, carve: pr.carve, freeze: pr.freeze, owner: p.owner, noKnock: pr.noKnock });
  if (pr.freeze) { Snd.play('freeze'); }
  /* miniImpact: bomblets fly as shots and explode the moment they touch ground or an enemy */ if (p.w.cluster) { const cs = pr.clusterSpd || [3, 8], mf = pr.miniFuse || [40, 90]; for (let i = 0; i < p.w.cluster; i++) { const a = -Math.PI / 2 + (p.w.cluster > 1 ? lerp(-(pr.clusterSpread || 1.25), (pr.clusterSpread || 1.25), i / (p.w.cluster - 1)) : 0) + rnd(-.2, .2), s = rnd(cs[0], cs[1]); spawnProj({ x: p.x, y: p.y - 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, w: p.w, p: pr, owner: p.owner, kind: pr.miniImpact ? 'shot' : 'timed', bomblet: true, fuse: rint(mf[0], mf[1]), life: 400, bounceK: .5, ...(pr.miniImpact ? { rotSpin: rnd(-.3, .3) } : {}) }); } }
}
// ---- Divine Heal: sparkle trail while flying, and the healing blast ----
const isAzureHeal = p => { const o = p && p.owner, tb = o ? teamBonus(o.team) : null; return !!(tb && tb.hid === 'heal_divine_rare'); };   // Azure Divine Heal (rare, light blue) worn by the thrower
const divFx = (n, p) => isAzureHeal(p) && Assets.fx[n + '_b'] ? n + '_b' : n;   // effect sheet name: the light-blue copy for the Azure Divine Heal
function divineTrail(p) {
  (p.tr = p.tr || []).push([p.x, p.y]); if (p.tr.length > 16) p.tr.shift();
  if (p.age % 2 === 0) addFx(divFx('divine_trail', p), p.x + rnd(-8, 8), p.y + rnd(-5, 12), rnd(.4, .75));   // divFx: light-blue sheet when the thrower wears the Azure (rare) Divine Heal
}
function divineBurst(p) {   // everyone inside the blast (the thrower too) shares the heal: total / number of robots, capped at each robot's max health
  const pr = p.p, own = p.owner, R = pr.healR || DIVINE_RADIUS, tb = own ? teamBonus(own.team) : null, total = tb && tb.heal ? tb.heal : pr.heal;
  const az = isAzureHeal(p), pc = az ? '#cdeeff' : '#ffd0f5', hc = az ? '#9fdcff' : '#8dff9e';   // pop colours (Azure = light blue)
  addFx(divFx('divine_burst', p), p.x, p.y, R / 112); shake(2); Snd.play('divine');
  const hit = aliveWorms().filter(w => { const [cx, cy] = bodyCenter(w); return dist(p.x, p.y, cx, cy) - 22 * (w.sc || 1) < R && (DIVINE_HEALS_ENEMIES || !own || sameSide(w,own)); });
  if (!hit.length) { addPop(p.x, p.y - 30, 'No one in range', pc, 16); return; }
  const share = total / hit.length;
  if (hit.length > 1) addPop(p.x, p.y - R * .55, 'Heal ' + Math.round(total) + ' ÷ ' + hit.length, pc, 20);
  for (const w of hit) {
    const h = Math.max(0, Math.min((w.maxHp || 100) - w.hp, Math.round(share))); w.hp += h; w.healT = 36; w.healBlue = az;
    addFx(divFx('divine_heal_on', p), w.x, w.y - 40 * (w.sc || 1), .72 * (w.sc || 1));
    addPop(w.x, w.y - 92 * (w.sc || 1), h > 0 ? '+' + h + ' HP' : 'FULL', hc, 22);
  }
}
function projNormal(x, y) { const T = G.terrain; let nx = 0, ny = 0; for (let r = 1; r <= 3; r++) for (let a = 0; a < 8; a++) { const ax = Math.cos(a * .785) * r * 2, ay = Math.sin(a * .785) * r * 2; if (!T.solid(x + ax, y + ay)) { nx += ax; ny += ay; } } const L = Math.hypot(nx, ny); return L < .01 ? [0, -1] : [nx / L, ny / L]; }
function updateProj(p) {
  p.age++; const pr = p.p;
  if (p.kind === 'flame') { updateFlame(p); return; }
  if (p.kind === 'mine') { updateMine(p); return; }
  if (p.age > p.life) { p.dead = true; if (p.kind !== 'timed') addFx('smoke', p.x, p.y, .4); return; }
  if (p.kind === 'shot') {
    if (!p.bomblet && (pr.wind !== undefined || pr.wind === undefined)) p.vx += windAcc() * (pr.wind === undefined ? 0 : pr.wind);
    p.vy += pr.g || 0;
    if (pr.homing && p.age > 18) {   // flies a normal arc; only locks on once an enemy is within homeRange, then keeps steering
      let best = null, bd = p.locked ? 1e9 : (pr.homeRange || 170); for (const w of aliveWorms()) { if (w === p.owner || sameSide(w,p.owner)) continue; const [cx, cy] = bodyCenter(w), d = dist(p.x, p.y, cx, cy); if (d < bd) { bd = d; best = [cx, cy]; } }
      if (best) { p.locked = true; const want = Math.atan2(best[1] - p.y, best[0] - p.x), cur = Math.atan2(p.vy, p.vx); let df = want - cur; while (df > Math.PI) df -= 6.283; while (df < -Math.PI) df += 6.283; const na = cur + clamp(df, -.12, .12), sp = Math.max(8, Math.min(12, Math.hypot(p.vx, p.vy) + .2)); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
    }
    if (pr.meteor && p.age > 10) {   // air-burst when directly above an enemy
      for (const w of G.worms) { if (w.state === 'dead' || w.state === 'drown' || sameSide(w,p.owner)) continue; if (Math.abs(p.x - w.x) < 26 && p.y < w.y - 62 && w.y - p.y < 560) { meteorBurst(p); return; } }
    }
    if (pr.divine) divineTrail(p);   // Divine Heal: comet trail + sparkles
    if (pr.trailFx && p.age % 2 === 0) { const tf = pr.trailFx[p.owner ? teamWTier(G.teams[p.owner.team]) : 0]; addFx(tf, p.x, p.y, .62, { rot: Math.atan2(p.vy, p.vx) }); }   // Doom Axe: sprite trail per upgrade look
    if (pr.trail && p.age % 2 === 0) addFx('smoke', p.x - p.vx * 1.2, p.y - p.vy * 1.2, .22 + Math.random() * .1, { alpha: .6 });
    const sp = Math.hypot(p.vx, p.vy), n = Math.max(1, Math.ceil(sp / 3));
    for (let i = 0; i < n; i++) {
      p.x += p.vx / n; p.y += p.vy / n;
      if (G.terrain.solid(p.x, p.y) && !(p.bomblet && p.age < 4)) { detonate(p); return; }   // a fresh bomblet gets 4 frames to leave the crater
      for (const w of G.worms) { if (w.state === 'dead' || w.state === 'drown') continue; if (w === p.owner && p.age < 10) continue; if (bossAlly(p.owner, w)) continue; if (onBody(w, p.x, p.y, 2)) { detonate(p); return; } }   // boss-side rockets pass through their own team
      if (p.y > WATER_Y + 4) { addFx('splash', p.x, WATER_Y - 30, .8); Snd.play('splash'); p.dead = true; return; }
      { const se = sideExt(); if (p.x < -200 - se || p.x > WORLD_W + 200 + se || p.y > WORLD_H + 100 || p.y < PROJ_CEILING) { p.dead = true; return; } }   // PROJ_CEILING: a full-power shot may climb far above the screen, it always falls back down
    }
  } else if (p.kind === 'timed') {
    p.fuse--; if (p.fuse <= 0) { detonate(p); return; }
    if (p.fuse % 30 === 0 && p.fuse < 120 && !p.bomblet) Snd.play('tick');
    if (p.rest) { if (!G.terrain.solid(p.x, p.y + 3)) p.rest = false; else { p.vx *= .9; return; } }
    p.vy += pr.g; const bK = p.bounceK != null ? p.bounceK : pr.bounce;
    const sp = Math.hypot(p.vx, p.vy), n = Math.max(1, Math.ceil(sp / 2.5));
    for (let i = 0; i < n; i++) {
      const nx = p.x + p.vx / n, ny = p.y + p.vy / n;
      if (G.terrain.solid(nx, ny)) {
        const [bx, by] = projNormal(p.x, p.y), dot = p.vx * bx + p.vy * by;
        p.vx = (p.vx - (1 + bK) * dot * bx) * .86; p.vy = (p.vy - (1 + bK) * dot * by) * .86; p.bounces++;
        if (Math.hypot(p.vx, p.vy) < 1.2 && by < -.3) { p.rest = true; p.vx = p.vy = 0; }
        p.spin = (p.spin || 0) * .5; break;
      }
      p.x = nx; p.y = ny;
    }
    p.rot = (p.rot || 0) + (p.spin = (p.spin !== undefined ? p.spin : p.vx * .05));
    p.spin = p.vx * .06;
    if (p.y > WATER_Y + 4) { addFx('splash', p.x, WATER_Y - 30, .8); Snd.play('splash'); p.dead = true; }
    { const se = sideExt(); if (p.x < -200 - se || p.x > WORLD_W + 200 + se) p.dead = true; }
  }
}
function meteorBurst(p) {
  const m = p.p.meteor; p.dead = true; addFx('explosion_small', p.x, p.y, .95); addFx('spark_hit', p.x, p.y, 1.6); shake(5); Snd.play('smallboom'); Snd.play('thunder');
  for (let i = 0; i < m.count; i++) {
    spawnProj({ x: p.x, y: p.y, vx: lerp(-m.spread, m.spread, i / (m.count - 1)) + rnd(-.5, .5), vy: rnd(-3, -.2), w: p.w, p: { spr: 'proj_meteorlet', ss: .55, g: .24, dmg: m.dmg, blast: m.blast, hit: 'explosion_small', hs: 1, knock: 6, snd: '' }, owner: p.owner, kind: 'shot', life: 700, age: 12, rotSpin: rnd(-.3, .3) });
  }
}
function updateFlame(p) {
  p.vy += -.012; p.vx *= .985; p.vy *= .985;
  const n = 2; for (let i = 0; i < n; i++) {
    p.x += p.vx / n; p.y += p.vy / n;
    if (G.terrain.solid(p.x, p.y)) { p.dead = true; return; }
    for (const w of G.worms) { if (w.state === 'dead' || w.state === 'drown' || p.hitList.includes(w)) continue; if (w === p.owner && p.age < 12) continue; if (onBody(w, p.x, p.y, 6)) { p.hitList.push(w); hurt(w, G_DMG(p)); knockWorm(w, p.vx * .25, -.7); } }
  }
  if (p.age > p.life) p.dead = true;
}
function G_DMG(p) { return p.p.dmg * (1.6 - p.age / p.life); }
function updateMine(p) {
  if (p.fuse > 0 && p.armed) { p.fuse--; if (p.fuse % 10 === 0) Snd.play('beep'); if (p.fuse <= 0) { detonate(p); return; } }
  p.vy += p.p.g; if (!G.terrain.solid(p.x, p.y + 1)) { p.rest = false; p.y += p.vy; if (G.terrain.solid(p.x, p.y + 1)) { p.vy = 0; p.rest = true; } if (p.y > WATER_Y + 4) { addFx('splash', p.x, WATER_Y - 30, .8); p.dead = true; } } else { p.vy = 0; p.rest = true; }
  if (p.age > 90 && !p.armed) { for (const w of aliveWorms()) { if (Math.abs(w.x - p.x) < 34 && Math.abs((w.y - 30) - p.y) < 60) { p.armed = true; p.fuse = 42; Snd.play('beep'); addPop(p.x, p.y - 30, '!', '#ff5a3a', 22); break; } } }
}
function placeItem(w, wd) {
  const pr = wd.proj, d = [w.face, 0], x = w.x + d[0] * 16, y = w.y - 8;
  if (wd.mine) spawnProj({ x, y, vx: 0, vy: 0, w: wd, p: pr, owner: w, kind: 'mine', fuse: 0, armed: false, life: 1e9, rest: true });
  else spawnProj({ x, y, vx: w.face * 1.6, vy: -2, w: wd, p: pr, owner: w, kind: 'timed', fuse: pr.fuse, life: 1e9 });
}

// ---------------- teleport ----------------
function findTeleSpot(wx, wy, sc = 1, maxDrop = 800) {
  if (wx < 40 || wx > WORLD_W - 40 || wy < -300 || wy > WATER_Y) return null; let x = Math.round(wx), y = Math.round(wy), n = 0;
  while (blocked(x, y, sc) && n < 150) { y--; n++; } if (blocked(x, y, sc)) return null;
  let d = 0; while (!onGround(x, y, sc) && d < maxDrop) { y++; d++; if (y > WATER_Y - 12) return null; }
  if (!onGround(x, y, sc) || y > WATER_Y - 16) return null; return [x, y];
}
function doTeleport(wx, wy) {
  const w = G.activeWorm, t = curTeam(), wd = curWeapon(); if (!canFire() || wd.type !== 'teleport' || t.ammo[wd.id] <= 0) return false;
  const s = findTeleSpot(wx, wy); if (!s) { addPop(wx, wy, "Can't land there", '#ff9a8a', 16); Snd.play('dud'); return false; }
  t.ammo[wd.id]--; G.firedThisTurn = true; addFx('teleport', w.x, w.y - 30, 1.3); w.x = s[0]; w.y = s[1]; w.vx = w.vy = 0; w.state = 'ground'; w.knocked = false;
  addFx('teleport', w.x, w.y - 30, 1.3); Snd.play('plasma'); Snd.play('pick'); G.cam.x = w.x; G.cam.y = w.y - 60; G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; G.teleHover = null; return true;
}

// ---------------- beams, arcs, melee ----------------
function addBeam(x1, y1, x2, y2, o) { G.beams.push(Object.assign({ x1, y1, x2, y2, t: 0, life: 16, w: 4, c1: '#fff', c2: '#6cf', kind: 'beam' }, o)); }
function fireBeam(w, wd) {
  const [mx, my] = muzzleWorld(w, wd), d = aimDir(w), T = G.terrain; let x = mx, y = my, hit = new Set(), ex = mx, ey = my;
  const step = 2, maxN = Math.floor(wd.range / step);
  for (let i = 0; i < maxN; i++) {
    x += d[0] * step; y += d[1] * step; ex = x; ey = y;
    { const se = sideExt(); if (x < -50 - se || x > WORLD_W + 50 + se || y < -600 || y > WORLD_H) break; }
    let stop = false;
    for (const t of G.worms) { if (t === w || hit.has(t) || t.state === 'dead' || t.state === 'drown') continue; if (onBody(t, x, y, wd.width * .4)) { hit.add(t); hurt(t, wd.dmg); knockWorm(t, d[0] * wd.knock, d[1] * wd.knock - 1.5); addFx(wd.hit, x, y, wd.hs * .6); if (wd.stop) stop = true; } }
    if (T.solid(x, y)) { if (wd.stop) { stop = true; } else if (wd.carve) T.carve(x, y, wd.carve, false); }
    else if (!wd.stop && i % 3 === 0 && wd.id.startsWith('07')) { /* laser air */ }
    if (stop) break;
  }
  if (wd.stop) { T.carve(ex, ey, wd.carve); addFx(wd.hit, ex, ey, wd.hs); debris(ex, ey, 6, 'dirt'); }
  else { addFx(wd.hit, ex, ey, wd.hs); if (wd.id.startsWith('07')) { T.carve(ex, ey, wd.carve + 6); shake(3); } }
  addBeam(mx, my, ex, ey, { w: wd.width, c1: wd.c1, c2: wd.c2, life: wd.id.startsWith('08') ? 24 : 16 });
  shake(wd.id.startsWith('07') ? 5 : 3); Snd.play(wd.snd);
  // recoil
  if (w.state === 'ground') { w.vx = 0; }
}
function fireArc(w, wd) {
  const [mx, my] = muzzleWorld(w, wd), d = aimDir(w), base = Math.atan2(d[1], d[0]);
  const cand = []; for (const t of aliveWorms()) { if (t === w) continue; const [cx, cy] = bodyCenter(t), dd = dist(mx, my, cx, cy); if (dd > wd.range) continue; let df = Math.atan2(cy - my, cx - mx) - base; while (df > Math.PI) df -= 6.283; while (df < -Math.PI) df += 6.283; if (Math.abs(df) < wd.cone * D2R) cand.push([dd, t]); }
  cand.sort((a, b) => a[0] - b[0]); const chain = []; let from = [mx, my];
  if (cand.length) { chain.push(cand[0][1]); for (let k = 1; k < 3; k++) { let best = null, bd = 190; const [fx, fy] = bodyCenter(chain[k - 1]); for (const t of aliveWorms()) { if (t === w || chain.includes(t)) continue; const [cx, cy] = bodyCenter(t), dd = dist(fx, fy, cx, cy); if (dd < bd) { bd = dd; best = t; } } if (!best) break; chain.push(best); } }
  Snd.play('thunder'); shake(3);
  if (!chain.length) { const ex = mx + d[0] * 230, ey = my + d[1] * 230; addBeam(mx, my, ex, ey, { kind: 'bolt', life: 14, w: 3, c1: '#ffffff', c2: '#6fe0ff' }); addFx('energy_hit', ex, ey, .5); return; }
  chain.forEach((t, i) => { const [cx, cy] = bodyCenter(t); addBeam(from[0], from[1], cx, cy, { kind: 'bolt', life: 16 + i * 2, w: 3, c1: '#ffffff', c2: '#6fe0ff' }); hurt(t, wd.dmgs[i]); knockWorm(t, (cx - from[0]) * .012, -2); addFx('energy_hit', cx, cy, .7); from = [cx, cy]; });
}
function isSlimeMinion(w) { return !!(w && w.minion); }   // boss stage: EVERY small minion (skeleton, slime, minotaur, orc, dragon) pushes nobody around
function fireMelee(w, wd) {
  if (wd.lunge) w.lunge = 14;   // creature minions lunge forward as they smash
  const [gx, gy] = gripWorld(w), hits = []; let cxm = gx + w.face * 30, cym = gy - 6;
  for (const t of aliveWorms()) { if (t === w || bossAlly(w, t)) continue; const [cx, cy] = bodyCenter(t), dx = (cx - w.x) * w.face, dy = cy - (w.y - 40); if (dx > -14 && dx < wd.range + 20 && Math.abs(dy) < 52) hits.push(t); }
  addFx(wd.fx, gx + w.face * 34, gy - 10, 1.05, { flip: w.face < 0 }); Snd.play(wd.snd);
  const T = G.terrain; if (wd.carve) { const tx = w.x + w.face * (wd.range * .8), ty = w.y - 30; if (T.solid(tx, ty) || T.solid(w.x + w.face * 40, w.y - 10)) { T.carve(tx, ty + 6, wd.carve); debris(tx, ty, 8, 'dirt'); shake(4); } }
  const noKn = isSlimeMinion(w);   // boss stage: the small slimes push nobody around
  for (const t of hits) { hurt(t, wd.dmg); if (wd.knock && !noKn) knockWorm(t, w.face * wd.knock, -wd.knock * .55); addFx('spark_hit', t.x, t.y - 40, 1.1); shake(4); }
  if (!hits.length) addPop(gx + w.face * 30, gy - 30, 'miss', '#cdd', 14);
}

// ---------------- firing control ----------------
function curWeapon() { if (G.activeWorm && G.activeWorm.mw) return G.activeWorm.mw; const t = curTeam(); return t ? WEAPONS[t.sel] : WEAPONS[0]; }   // boss minions carry their own melee weapon (w.mw)
function ammoOf(team, wd) { return team.ammo[wd.id]; }
function canFire() { return G.phase === 'aim' && G.activeWorm && G.activeWorm.state === 'ground' && G.activeWorm.frozen <= 0; }
function startFire(power) {
  const w = G.activeWorm, t = curTeam(), wd = curWeapon(); if (!canFire()) return;
  if (wd.type === 'teleport') { if (t.ammo[wd.id] > 0 && !curTeam().cpu) addPop(w.x, w.y - 110, 'Tap the map to teleport', '#e6b8ff', 16); return; }
  if (ammoOf(t, wd) <= 0) { Snd.play('dud'); return; }
  if (wd.ammo !== Infinity) t.ammo[wd.id]--;
  if (wd.charge && !t.cpu) w.lastPow = clamp(power, 0, POW_MAX);   // remembered so the meter can show where the last shot stopped
  G.firedThisTurn = true; G.shootT = 0; G.phase = 'shooting'; G.charging = false; G.charge = 0; G.cam.free = false;
  switch (wd.type) {
    case 'burst': G.burst = { wd, left: wd.shots, gap: 0 }; break;
    case 'shot': case 'timed': {
      if (wd.volley) { G.volley = { wd, left: wd.volley.count, gap: 0, power }; break; }
      const pr = wd.proj; const sp = launchShot(w, wd, power); Snd.play(pr.snd); if (wd.type === 'shot' && pr.hit) { } G.burst = null; G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; break;
    }
    case 'place': placeItem(w, wd); Snd.play('jump'); G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; break;
    case 'beam': fireBeam(w, wd); G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; break;
    case 'arc': fireArc(w, wd); G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; break;
    case 'melee': fireMelee(w, wd); G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; break;
    case 'flame': G.flameT = 70; G.burst = null; Snd.play('flame'); break;
  }
}
function updateShooting() {
  const w = G.activeWorm, wd = curWeapon();
  if (G.volley) {   // cannon / missile tech: one projectile at a time, each with recoil
    const v = G.volley, vo = v.wd.volley; if (v.gap > 0) v.gap--; else if (v.left > 0) {
      const d = aimDir(w);
      const jit = vo.spread || 0, pw = clamp(v.power + (jit ? rnd(-.04, .04) : 0), 0, POW_MAX);
      const sh = launchShot(w, v.wd, pw, jit); if (vo.lift) sh.vy -= rnd(0, vo.lift);
      const [mx, my] = muzzleWorld(w, v.wd); addFx('explosion_small', mx, my, vo.recoil > 2 ? .55 : .3); addFx('smoke', mx, my, .5, { alpha: .6 }); Snd.play(v.wd.proj.snd); shake(vo.recoil > 2 ? 6 : 2.5);
      if (w.state !== 'dead' && w.state !== 'drown') { knockWorm(w, clamp(w.vx - d[0] * vo.recoil, -4.5, 4.5) - w.vx, -Math.abs(vo.recoil) * .25); }
      v.left--; v.gap = vo.gap;
    }
    if (v.left <= 0) { G.volley = null; G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; }
    return;
  }
  if (G.burst) {
    const b = G.burst; if (b.gap > 0) b.gap--; else if (b.left > 0) {
      const n = wd.pellets || 1; for (let i = 0; i < n; i++) launchShot(w, wd, 1, wd.spread);
      const [mx, my] = muzzleWorld(w, wd); addFx('spark_hit', mx, my, .5); Snd.play(wd.proj.snd); shake(1.2);
      b.left--; b.gap = wd.gap;
    }
    if (b.left <= 0 && b.gap <= 0) { G.burst = null; G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; }
  } else if (G.flameT > 0) {
    G.flameT--; const [mx, my] = muzzleWorld(w, wd), d = aimDir(w), a = Math.atan2(d[1], d[0]) + rnd(-.11, .11), sp = rnd(6, 8);
    spawnProj({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: wd, p: wd.proj, owner: w, kind: 'flame', life: 30, scale: rnd(.7, 1.05) });
    if (G.flameT % 8 === 0) Snd.play('flame');
    if (G.flameT <= 0) { G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; }
  }
}

// ---------------- crates ----------------
function dropCrate() {
  if (G.adv) return;   // Adventure: no supply drops (no health crates falling from the sky)
  const T = G.terrain; for (let k = 0; k < 25; k++) {
    const x = rint(260, WORLD_W - 260), s = T.surfaceBelow(x, 0); if (s < 0 || s > WATER_Y - 40) continue;
    G.crates.push({ x, y: -60, vy: 0, type: (G.adv || Math.random() < .42) ? 'health' : 'ammo', dead: false, landed: false, t: 0 }); addPop(x, 40, 'Supply drop!', '#ffe08a', 20); return;
  }
}
function updateCrate(c) {
  c.t++; if (!c.landed) { c.vy = Math.min(c.vy + .05, 1.9); c.y += c.vy; if (G.terrain.solid(c.x, c.y + 2) || c.y > WATER_Y) { if (c.y > WATER_Y) { c.dead = true; addFx('splash', c.x, WATER_Y - 30, .8); } c.landed = true; } }
  else if (!G.terrain.solid(c.x, c.y + 2)) c.landed = false;
  if (!c.landed && c.y < 0) return;
  for (const w of aliveWorms()) if (Math.abs(w.x - c.x) < 30 && Math.abs((w.y - 30) - (c.y - 18)) < 50) { collectCrate(c, w); break; }
}
function collectCrate(c, w) {
  c.dead = true; const t = G.teams[w.team]; Snd.play('pick'); addFx('heal', w.x, w.y - 40, 1);
  if (c.type === 'health') { const h = Math.min(w.maxHp || 100, w.hp + 35) - w.hp; w.hp += h; addPop(w.x, w.y - 90, '+' + h + ' HP', '#8dff9e', 20); }
  else { const pool = WEAPONS.filter(x => x.ammo !== Infinity && !x.heal); const pick = pool[rint(0, pool.length - 1)]; const n = pick.ammo > 4 ? 3 : pick.ammo > 2 ? 2 : 1; t.ammo[pick.id] += n; addPop(w.x, w.y - 90, '+' + n + ' ' + pick.name, '#ffd27a', 18); }
}

// ---------------- game setup ----------------
function newGame(setup) {
  const seed = (Math.random() * 1e9) | 0; G.theme = setup.theme === 'random' ? ['day', 'sunset', 'night'][rint(0, 2)] : setup.theme;
  G.map = setup.map || null; G.terrain = new Terrain(G.theme, seed, G.map); if (setup.clearPath) clearPath(G.terrain);   // boss stages: flatten every hill / pillar / pit so walking bots can reach the players
  G.worms = []; G.projs = []; G.fxs = []; G.parts = []; G.pops = []; G.beams = []; G.crates = []; G.teams = []; G.round = 0; G.minionRound = 0; G.bossW = null; G.swarm = null;
  G.squad = setup.squads || null; G.adv = !!setup.adv; WATER_Y = G.adv ? WORLD_H + 90 : WORLD_H - 78; G.queue = []; G.diff = setup.diff; G.winner = null; G.turnCount = 0; G.frame = 0; G.flyMode = false; G.charge = 0; G.charging = false; G.burst = null; G.volley = null; G.flameT = 0;
  const T = G.terrain, nT = setup.teams.length, per = setup.per;
  setup.teams.forEach((tm, i) => {
    const ammo = {}, robId = (tm.robotObj || Assets.robots.robots[tm.robot]).id; WEAPONS.forEach(w => ammo[w.id] = w.sig ? (w.sig === robId ? Infinity : 0) : w.boss ? (w.boss === robId ? Infinity : 0) : (setup.adv ? 0 : w.ammo));   // signature weapons: only your own robot has it (unlimited). Boss weapons: only that boss. ADVENTURE (setup.adv): every other weapon is locked, so you use only your inventory weapon and every enemy only its own
    let bonus = null; try { if (!tm.cpu && typeof profileBonuses === 'function') bonus = profileBonuses(tm.robot); } catch (e) { }   // gear from the Profile screen (human teams only)
    if (setup.bonuses && setup.bonuses[i]) bonus = setup.bonuses[i];   // Adventure: enemy / boss buffs
    const shopW = bonus && bonus.wid ? (WEAPONS.find(w => w.shop === bonus.wid) || WEAPONS.find(w => w.sig && w.sig !== robId && 'w_' + w.id.slice(3).toLowerCase() === bonus.wid)) : null;   // also another robot's signature weapon that you bought / won   // a Shop / loot weapon worn in the Profile weapon slot replaces your signature weapon
    WEAPONS.forEach(w => { if (w.shop) ammo[w.id] = shopW === w ? Infinity : 0; }); if (shopW) { WEAPONS.forEach(w => { if (w.sig === robId) ammo[w.id] = 0; }); ammo[shopW.id] = Infinity; }
    { const hw = WEAPONS.find(w => w.heal); if (hw) ammo[hw.id] = bonus && bonus.hid && !tm.cpu ? (bonus.hammo || HEAL_AMMO) : 0; }   // Divine Heal: only if worn in the Profile Heal slot
    G.teams.push({ idx: i, name: (setup.names && setup.names[i]) || TEAM_NAMES[i], color: (setup.colors && setup.colors[i]) || TEAM_COLORS[i], cpu: tm.cpu, robot: tm.robotObj || Assets.robots.robots[tm.robot], ammo, sel: shopW ? WEAPONS.indexOf(shopW) : Math.max(0, WEAPONS.findIndex(w => w.sig === robId || w.boss === robId)), next: 0, bonus, pots: [0, 1].map(i => bonus && bonus.pots && bonus.pots[i] && !tm.cpu ? Object.assign({}, bonus.pots[i], { left: bonus.pots[i].uses }) : null) });   // start with your own signature (or boss) weapon selected
  });
  const plan = setup.plan || null;   // Adventure: exact spawn list [{ team, x, sc, hp, name }]; normal matches leave it null
  const total = plan ? plan.length : nT * per, xs = []; for (let k = 0; k < total; k++) xs.push(plan ? plan[k].x : lerp(330, WORLD_W - 330, (k + .5) / total) + rnd(-50, 50));
  // interleave teams across the map
  const order = []; for (let k = 0; k < total; k++) order.push(plan ? plan[k].team : k % nT); if (!plan) for (let i = order.length - 1; i > 0; i--) { const j = rint(0, i); [order[i], order[j]] = [order[j], order[i]]; }
  const cnt = new Array(nT).fill(0);
  xs.forEach((x, k) => {
    const t = order[k]; let sx = x, sy = T.surfaceBelow(sx, 0), tries = 0;
    while ((sy < 0 || sy > WATER_Y - 50) && tries++ < 30) { sx += rnd(-90, 90); sy = T.surfaceBelow(clamp(sx, 40, WORLD_W - 40), 0); }
    if (sy < 0) { sy = 400; }
    const pk = plan ? plan[k] : null, sc = pk && pk.sc || 1, baseHp = pk && pk.hp != null ? pk.hp : 100, bhp = (G.teams[t].bonus && G.teams[t].bonus.hp) | 0;
    carveSpawn(sx, sy, sc);
    const rob = G.teams[t].robot; cnt[t]++;
    G.worms.push({ team: t, idx: cnt[t] - 1, sc, name: (pk && pk.name) || rob.name.split(' ')[0] + ' ' + cnt[t], rob, x: sx, y: sy - 2, vx: 0, vy: 0, hp: baseHp + bhp, maxHp: baseHp + bhp, face: sx < WORLD_W / 2 ? 1 : -1, aim: 15, state: 'air', knocked: false, bounces: 0, wf: 0, fi: 8, walkAcc: 0, walking: 0, flash: 0, frozen: 0, dt: 0, fallPeak: 0 });
  });
  G.bossW = G.worms.find(isBoss) || null; G.minionRobots = setup.minionRobots || []; G.noMinions = !!setup.noMinions; G.minionKind = setup.minionKind || null; G.rings = []; G.waves = []; G.b3fx = []; G.b3q = [];
  G.cur = (setup.first != null ? setup.first : rint(0, nT - 1)) - 1; G.cam.shake = 0; G.cam.mul = 1; G.mode = 'play'; G.phase = 'none';
  const w0 = G.worms[0]; G.cam.x = w0.x; G.cam.y = w0.y - 100;
  startTurn();
}
function carveSpawn(x, y, sc = 1) { /* make sure spawn has room above */ const hw = Math.ceil(14 * sc), hh = Math.ceil(72 * sc); for (let yy = Math.floor(y - hh); yy < y - 2; yy++) for (let xx = Math.floor(x - hw); xx <= x + hw; xx++) { const i = yy * WORLD_W + (xx | 0); if (yy >= 0 && xx >= 0 && xx < WORLD_W && G.terrain.mask[i]) { G.terrain.mask[i] = 0; } } G.terrain.ctx.clearRect(x - hw, y - hh, hw * 2 + 1, hh - 2); }

// ---------------- turn flow ----------------
function nextAliveTeam(from) { const n = G.teams.length; for (let i = 1; i <= n; i++) { const t = (from + i) % n; if (teamAlive(t)) return t; } return -1; }
function startTurn() {
  G.winner = null;
  const alive = G.teams.filter(t => teamAlive(t.idx)); if (alive.length <= 1 || (G.squad && new Set(alive.map(t => G.squad[t.idx])).size <= 1)) { endGame(alive[0]); return; }
  let w, t;
  if (G.adv) {   // ADVENTURE turn order: every robot of every team shoots once per round, highest Agility first (a frozen robot loses its slot, then the next one in the order goes)
    const live = x => x.state !== 'dead' && x.state !== 'drown'; G.queue = (G.queue || []).filter(live);
    if (!G.queue.length) { G.round = (G.round | 0) + 1; G.queue = G.worms.filter(live).sort((a, b) => ((G.teams[b.team].bonus && G.teams[b.team].bonus.agi) || 0) - ((G.teams[a.team].bonus && G.teams[a.team].bonus.agi) || 0) || a.team - b.team || a.idx - b.idx); }
    w = G.queue.shift(); t = G.teams[w.team]; G.cur = w.team; t.next++;
  } else {
    G.cur = nextAliveTeam(G.cur); t = G.teams[G.cur]; const mine = G.worms.filter(w => w.team === t.idx && w.state !== 'dead' && w.state !== 'drown');
    w = mine[t.next % mine.length]; t.next++;
  }
  if (G.adv && !G.noMinions && G.bossW && G.round === 1 && G.minionRound !== 1 && G.bossW.state !== 'dead' && G.bossW.state !== 'drown') { G.minionRound = 1; summonMinions(G.bossW); }   // FIRST round: the boss already has its 3 melee bots from the very first turn
  else if (G.adv && !G.noMinions && isBoss(w) && G.round > 0 && G.round % MINION_EVERY === 0 && G.minionRound !== G.round) { G.minionRound = G.round; summonMinions(w); }   // then every 2nd round the boss calls 3 more melee bots
  G.swarm = null;
  if (G.adv && G.bossW && G.bossW !== w && G.bossW.flyGoal) { G.bossW.flyGoal = 0; G.bossW.spMul = 0; }   // a dragon boss that flew up for its special lands again
  if (G.adv && w.minion) {   // BOSS MINIONS ALL MOVE TOGETHER: every melee bot still waiting in this round joins ONE shared turn instead of going one by one
    const mates = G.queue.filter(x => x.minion); G.queue = G.queue.filter(x => !x.minion); G.swarm = [w, ...mates];
    for (const m of G.swarm) { m.done = false; m.fp = null; m.mt = 0; m.mwalk = 0; m.jx = null; m.scanT = 0; m.scanR = null; m.jumps = 0; m.fail = 0; m.lx = null; m.mstuck = 0; if (m.frozen > 0) { m.frozen--; m.done = true; addPop(m.x, m.y - 100, 'FROZEN', '#bfeaff', 16); } }
  }
  { const ct = G.teams[w.team]; if (ct && WEAPONS[ct.sel] && WEAPONS[ct.sel].heal) { const pv = ct.prevSel; ct.sel = (pv != null && WEAPONS[pv] && !WEAPONS[pv].heal && ct.ammo[WEAPONS[pv].id] > 0) ? pv : Math.max(0, WEAPONS.findIndex(x => !x.heal && ct.ammo[x.id] > 0)); } }   // every new turn starts with your normal weapon, not the Divine Heal
  G.cam.free = false; G.activeWorm = w; G.turnCount++; G.firedThisTurn = false; G.potUsed = 0; G.flyMode = false; G.charge = 0; G.charging = false; G.burst = null; G.volley = null; G.flameT = 0;
  G.wind = clamp(G.wind + rnd(-.55, .55), -1, 1); if (G.turnCount <= 1) G.wind = rnd(-.6, .6);
  if (!G.swarm && w.frozen > 0) { w.frozen--; showBanner(w.name + ' is frozen!', t.color); G.phase = 'retreat'; G.timer = 90; G.firedThisTurn = true; Snd.play('freeze'); return; }
  if (!t.cpu && WEAPONS[t.sel] && t.ammo[WEAPONS[t.sel].id] <= 0) t.sel = Math.max(0, WEAPONS.findIndex(x => t.ammo[x.id] > 0));
  if (G.turnCount > 2 && G.turnCount % 3 === 0 && Math.random() < .85) dropCrate();
  G.phase = 'aim'; G.timer = (G.swarm ? SWARM_TIME : TURN_TIME) * 60; Snd.play('turn');
  const bn = t.bonus, gear = bn ? [bn.hp ? '+' + bn.hp + ' HP' : '', bn.def ? bn.def + ' DEF' : '', bn.armor ? bn.armor + '% ARMOR' : '', bn.xdmg ? '+' + bn.xdmg + ' DMG' : '', bn.pow ? '+' + bn.pow + '% ATK' : '', bn.crt ? bn.crt + '% CRIT' : ''].filter(Boolean).join(' ') : '';
  showBanner(G.swarm ? t.name + ' · ' + G.swarm.length + ' melee bots charge together' + (gear ? '  [' + gear + ']' : '') : t.name + ' · ' + w.name + (t.cpu ? ' (CPU)' : '') + (gear ? '  [' + gear + ']' : ''), t.color);
  if (t.cpu && !G.swarm) AI.begin(w);
}
function endTurnNow() { if (G.phase === 'aim' || G.phase === 'retreat') { G.phase = 'settle'; G.settleT = 0; } }
function showBanner(text, color) { G.banner = { text, color, t: 0 }; }
function endGame(team) { G.mode = 'over'; G.winner = team || null; G.phase = 'none'; if (team) Snd.play('win'); store.set('wins', (store.get('wins', 0) + (team && !team.cpu ? 1 : 0))); if (typeof UI !== 'undefined') UI.showOver(); }

function settled() {
  for (const p of G.projs) if (!p.dead && p.kind !== 'mine' && !(p.rest && p.kind === 'timed' && false)) return false;
  for (const w of G.worms) { if (w.state === 'air') return false; if (w.state === 'dead' && w.dt < 48) return false; if (w.state === 'drown' && w.dt < 40) return false; }
  if (G.burst || G.flameT > 0 || G.volley) return false;
  if (G.waves && G.waves.length) return false;   // minotaur shockwave still travelling
  for (const c of G.crates) if (!c.dead && !c.landed && c.y > 0) { /* crates can still fall */ }
  return true;
}

// ---------------- boss specials: EVERY 3RD BOSS TURN (creature bosses only) ----------------
// minotaur: smashes the ground with its axe = a shockwave runs to the player.  skeleton: earthquake (hurts EVERY player on the ground).  slime: leaps TOWARD the nearest player and slams where it lands.  orc: roar (hurts every player on the map, even in the air).
// dragon: takes off, breathes fire from the air (handled in ai.js: +20% damage on that turn) and lands again on the next turn.
// Damage = the boss weapon's damage x SPECIAL_MUL (the normal attack bonuses / defense still apply).  Animation = assets/adventure/boss_<key>_act.webp (12 frames).
const SPECIAL_EVERY = 3, SPECIAL_MUL = 1.2, ACT_T = 6, QUAKE_R = 640, ROAR_R = 780;   // every N-th boss turn / damage x / game frames per animation frame / earthquake reach (ground only) / roar reach (old value, the roar now reaches EVERYONE)
const JUMP_RANGE = 560, JUMP_HIT_R = 190, JUMP_AIR_T = 46;   // slime: farthest it can jump toward a player / radius of the landing slam / frames spent in the air
const WAVE_SPEED = 9, WAVE_MAX = 1500, WAVE_HIT_R = 46;   // minotaur shockwave: px per frame / how far it runs / how wide it hurts
function bossBaseDmg(w) { const bw = bossWeaponOf(w.rob.id); return bw ? bw.proj.dmg : 40; }
function ringFx(x, y, col, delay = 0) { (G.rings = G.rings || []).push({ x, y, age: -delay, col }); }
// hit every enemy that matches: air = also players in the air; R = reach (Infinity = everyone on the map); cx = centre of the blast
function specialHit(w, dmg, air, R, cx, anyY) {
  R = R == null ? (air ? ROAR_R : QUAKE_R) : R; cx = cx == null ? w.x : cx;
  const hit = G.worms.filter(t => !bossAlly(w, t) && !sameSide(t,w) && t.state !== 'dead' && t.state !== 'drown' && (air || t.state === 'ground') && Math.abs(t.x - cx) < R && (air || anyY || Math.abs(t.y - w.y) < 220));
  for (const p of hit) { const dir = p.x >= cx ? 1 : -1; hurt(p, dmg); if (p.state !== 'dead') knockWorm(p, dir * (air ? 3.4 : 2.6), air ? -3 : -5); addFx('spark_hit', p.x, p.y - 40, 1.1); }
  return hit.length;
}
function nearestFoe(w) { return G.worms.filter(t => !bossAlly(w, t) && !sameSide(t,w) && t.state !== 'dead' && t.state !== 'drown').sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x))[0] || null; }
// put the boss at x, riding the ground (steps up / down a little); false = no ground there
function placeOnGround(w, nx) {
  const sc = w.sc || 1; nx = clamp(nx, 80, WORLD_W - 80);
  for (let up = 0; up <= 40 * sc; up += 2) { if (blocked(nx, w.y - up, sc)) continue; for (let dn = 0; dn <= 90 * sc; dn += 1) if (onGround(nx, w.y - up + dn, sc)) { if (w.y - up + dn > WATER_Y - 40) return false; w.x = nx; w.y = w.y - up + dn; return true; } return false; }
  return false;
}
// minotaur shockwave: runs along the ground from the axe, hurts every player it passes (once each). Players in the air jump over it.
function spawnWave(w, x, dir, dmg) { (G.waves = G.waves || []).push({ x, y: w.y, dir, dmg, dist: 0, hit: [], owner: w, age: 0 }); }
function updateWaves() {
  if (!G.waves || !G.waves.length) return;
  for (const wv of G.waves) {
    wv.age++; const T = G.terrain, step = WAVE_SPEED;
    wv.x += wv.dir * step; wv.dist += step;
    const sy = T.surfaceBelow(wv.x, Math.max(0, wv.y - 70)); if (sy >= 0 && Math.abs(sy - wv.y) < 90) wv.y = sy;   // hug the floor
    if (wv.age % 3 === 0) { debris(wv.x, wv.y - 4, 2, 'dirt'); }
    if (wv.age % 12 === 0) shake(3);
    for (const t of G.worms) {
      if (wv.hit.includes(t) || t.state === 'dead' || t.state === 'drown' || bossAlly(wv.owner, t) || sameSide(t,wv.owner)) continue;
      if (Math.abs(t.x - wv.x) < WAVE_HIT_R + 10 * (t.sc || 1) && t.y > wv.y - 70 && t.y < wv.y + 90 && t.state === 'ground') {
        wv.hit.push(t); hurt(t, wv.dmg); if (t.state !== 'dead') knockWorm(t, wv.dir * 2.4, -5); addFx('spark_hit', t.x, t.y - 40, 1.2); addFx('explosion_small', t.x, t.y - 10, .8); Snd.play('boom', .7); shake(10);
      }
    }
    if (wv.x < 20 || wv.x > WORLD_W - 20 || wv.dist > WAVE_MAX) wv.dead = true;
  }
  G.waves = G.waves.filter(wv => !wv.dead);
}
function bossSpecialStep(w) {   // called every frame by the AI while the special plays; returns true when finished
  if (BOSS3.SPECS[w.rob.spec]) return BOSS3.special(w);   // HEROIC third bosses (boss3.js)
  const sp = w.rob.spec, sc = w.sc || 1; w.spT = (w.spT || 0) + 1; const t = w.spT, dmg = Math.round(bossBaseDmg(w) * SPECIAL_MUL);
  const mino = sp === 'smash' && /mino/i.test(w.rob.id || '');   // minotaurs send a shockwave across the floor; skeletons keep the plain earthquake
  const JA = 3 * ACT_T, JL = JA + JUMP_AIR_T;   // slime jump: crouch until JA, flight until JL, then the landing frames
  if (sp === 'jump') w.actF = t < JA ? Math.floor(t / ACT_T) : t < JL ? 3 + Math.min(3, Math.floor((t - JA) / JUMP_AIR_T * 4)) : Math.min(11, 7 + Math.floor((t - JL) / ACT_T));
  else w.actF = Math.min(11, Math.floor(t / ACT_T));
  if (t === 1 && (sp === 'smash' || sp === 'jump')) { const f = nearestFoe(w); if (f) w.face = f.x >= w.x ? 1 : -1; }   // turn to the nearest player
  const slam = () => {
    shake(34); Snd.play('boom', 1.4); Snd.play('boom', 1); const fx = w.x + w.face * 60 * sc;
    addFx('explosion_big', fx, w.y - 6, 1.7 * sc / 2); debris(w.x, w.y - 4, 28, 'dirt'); ringFx(fx, w.y - 4, '#ffcf8a'); ringFx(fx, w.y - 4, '#fff2cf', 8);
    if (mino) {   // the axe cracks the floor and a shockwave runs toward the player
      debris(fx, w.y - 4, 18, 'dirt'); G.terrain.carve(fx + w.face * 30, w.y + 6, 40); spawnWave(w, w.x, w.face, dmg);   // starts under the boss, so players standing right in front of it are hit too G.firedThisTurn = true;
      showBanner('SHOCKWAVE! (jump over it)', '#ffb347'); return;
    }
    const n = specialHit(w, dmg, false, Infinity, w.x, true); G.terrain.carve(fx + w.face * 70, w.y + 6, 44); G.firedThisTurn = true;   // skeleton: the whole floor shakes, every player standing on the ground is hurt (any distance, any height)
    showBanner('EARTHQUAKE! (only players in the air are safe)', '#ffb347');
  };
  let end = 12 * ACT_T + 12;
  if (sp === 'smash') { if (t === 5 * ACT_T) slam(); }
  else if (sp === 'jump') {
    end = JL + 5 * ACT_T + 12;
    if (t === JA) {   // take off toward the nearest player (as far as JUMP_RANGE allows) and land on the safest ground on the way
      const f = nearestFoe(w); w.jx0 = w.x; w.jy0 = w.y; let tx = f ? f.x : w.x + w.face * JUMP_RANGE; tx = w.x + clamp(tx - w.x, -JUMP_RANGE, JUMP_RANGE); if (f) w.face = tx >= w.x ? 1 : -1;
      const save = { x: w.x, y: w.y }; let ok = false;   // shorten the jump until there is floor to land on
      for (let k = 0; k <= 10 && !ok; k++) { const cx = w.x + (tx - w.x) * (1 - k / 10); w.x = save.x; w.y = save.y; if (placeOnGround(w, cx)) { ok = true; w.jx1 = w.x; w.jy1 = w.y; } }
      w.x = save.x; w.y = save.y; if (!ok) { w.jx1 = w.x; w.jy1 = w.y; }
      showBanner('⚠ ' + w.name + ' leaps!', '#ff4a4a'); Snd.play('boom', .5);
    }
    if (t >= JA && t <= JL) {   // flight: arc over the ground between take-off and landing
      const a = Math.min(1, (t - JA) / JUMP_AIR_T), e = a * a * (3 - 2 * a);
      w.hop = Math.sin(Math.PI * a) * 110 * sc; if (w.jx1 != null) { const nx = w.jx0 + (w.jx1 - w.jx0) * e; if (!placeOnGround(w, nx)) { /* no floor under this step: stay put */ } }
    }
    if (t === JL) {   // LANDING SLAM: only players close to where the slime lands are hurt
      w.hop = 0; shake(34); Snd.play('boom', 1.4); Snd.play('boom', 1);
      addFx('explosion_big', w.x, w.y - 6, 1.7 * sc / 2); debris(w.x, w.y - 4, 30, 'dirt'); ringFx(w.x, w.y - 4, '#ffcf8a'); ringFx(w.x, w.y - 4, '#fff2cf', 8);
      const n = specialHit(w, dmg, false, JUMP_HIT_R, w.x); G.terrain.carve(w.x, w.y + 6, 44); G.firedThisTurn = true;
      showBanner('SLAM!' + (n ? '' : ' (stay away from the slime)'), '#ffb347');
    }
  }
  else if (sp === 'roar') {
    if (t === 3 * ACT_T) { shake(30); Snd.play('boom', 1.5); ringFx(w.x + w.face * 40 * sc, w.y - 60 * sc, '#ffe08a'); ringFx(w.x + w.face * 40 * sc, w.y - 60 * sc, '#ffffff', 10); ringFx(w.x + w.face * 40 * sc, w.y - 60 * sc, '#ffe08a', 20); const n = specialHit(w, dmg, true, Infinity); showBanner('ROAAAR!', '#ffb347'); G.firedThisTurn = true; }   // Infinity = hurts every player on the map, however far
    else if (t > 3 * ACT_T && t < 9 * ACT_T && t % 6 === 0) shake(7);
  }
  if (t >= end) { w.actF = null; w.hop = 0; w.spT = 0; G.phase = 'retreat'; G.timer = 50; return true; }
  return false;
}
// a baby dragon spits a fireball at a player (aimed straight at the body)
function flyShot(m, tg, spread = 0) {
  const pr = m.mw.proj, [gx, gy] = gripWorld(m), [cx, cy] = bodyCenter(tg), a = Math.atan2(cy - gy, cx - gx) + rnd(-spread, spread) * D2R, sp = pr.speed || 8.5;
  m.breathT = 40; m.aim = Math.max(-80, Math.min(80, -a / D2R * m.face)); Snd.play(pr.snd || 'rocket', .6);
  return spawnProj({ x: gx + m.face * 6, y: gy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: m.mw, p: pr, owner: m, kind: 'shot', fuse: 0, life: 700 });
}

// ---------------- boss stomp ----------------
// When a player gets very close, the boss stamps its foot: earthquake, huge damage to every nearby player and craters in the floor.
// Damage = STOMP_PCT of the player's MAX health (so it is almost a one-hit kill on every map, whatever your gear), never less than STOMP_DMG. Defense / armor do not reduce it.
const STOMP_R = 230, STOMP_DMG = 100, STOMP_PCT = .9, STOMP_WIND = 40;
function isBoss(w) { return !!(w && w.rob && String(w.rob.id).indexOf('boss_') === 0); }
function bossAlly(a, b) { return !!(G.adv && G.bossW && a && b && sameSide(a,b) && a.team === G.bossW.team); }   // boss stage: both robots belong to the boss's team (boss + its melee minions) -> no friendly fire
function bossStompTargets(w) { return G.worms.filter(t => !sameSide(t,w) && t.state !== 'dead' && t.state !== 'drown' && Math.abs(t.x - w.x) < STOMP_R && Math.abs(t.y - w.y) < 140); }
function bossStompStep(w) {   // called every frame while the boss stomps; returns true when finished
  w.stompT = (w.stompT || 0) + 1; const t = w.stompT, T = G.terrain, sc = w.sc || 1;
  if (t < STOMP_WIND) { w.hop = Math.sin(Math.PI * Math.min(1, t / (STOMP_WIND * .8))) * 34 * sc; if (t % 8 === 0) shake(2); return false; }
  if (t === STOMP_WIND) {
    w.hop = 0; shake(30); Snd.play('boom', 1.4); Snd.play('boom', 1);
    const hit = bossStompTargets(w), fx = w.x + (hit.length ? (hit[0].x > w.x ? 1 : -1) : w.face) * 30 * sc;
    addFx('explosion_big', w.x + w.face * 40 * sc, w.y - 6, 1.6 * sc / 2); debris(w.x, w.y - 4, 26, 'dirt'); debris(w.x, w.y - 4, 8, 'metal');
    const hole = (x, y, r) => { T.carve(x, y, r); addFx('explosion_small', x, y, r / 40); debris(x, y, Math.floor(r / 2.5), 'dirt'); };
    for (const p of hit) {   // damage + crater under every player caught in the quake
      const dir = p.x >= w.x ? 1 : -1; hurt(p, Math.max(STOMP_DMG, Math.round((p.maxHp || 100) * STOMP_PCT)), { fall: true }); knockWorm(p, dir * 3.2, -5.5); hole(p.x, p.y + 8, 48);
    }
    const dirF = hit.length ? (hit[0].x > w.x ? 1 : -1) : w.face; hole(w.x + dirF * 125 * (sc / 2.1), w.y + 6, 56);   // plus a hole in front of the boss
    if (hit.length > 1 || !hit.length) hole(w.x - dirF * 150 * (sc / 2.1), w.y + 6, 44);
    showBanner('EARTHQUAKE!', '#ffb347'); G.firedThisTurn = true; return false;
  }
  if (t < STOMP_WIND + 30) return false;
  w.hop = 0; G.phase = 'retreat'; G.timer = 50; return true;
}

// ---------------- boss minions: 3 melee bots in round 1, then every 2 rounds ----------------
const MINION_EVERY = 2, MINION_COUNT = 3, MINION_MAX = 6, MINION_HP = 45, MINION_SC = .85;   // rounds between summons / bots per summon / most bots alive at once / base HP (x enemy multipliers) / size
function summonMinions(boss) {
  const alive = G.worms.filter(w => w.minion && w.state !== 'dead' && w.state !== 'drown').length, n = Math.min(MINION_COUNT, MINION_MAX - alive); if (n <= 0) return;
  const T = G.terrain, tm = boss.team, hp = Math.max(1, Math.round(MINION_HP * (typeof ENEMY_MULT !== 'undefined' ? ENEMY_MULT : 1) * (typeof advDM === 'function' ? advDM() : 1) * (typeof BOSS_HP_MULT !== 'undefined' ? BOSS_HP_MULT : 1)));   // boss-stage mini bots have half health (BOSS_HP_MULT in adventure.js)
  G.minionSeq = G.minionSeq | 0; let made = 0;
  for (let k = 0; k < n; k++) {
    const side = k % 2 ? 1 : -1, ox = side * (150 + Math.floor(k / 2) * 70 + k * 18);   // spread around the boss
    let sx = clamp(boss.x + ox, 80, WORLD_W - 80), sy = T.surfaceBelow(sx, Math.max(0, boss.y - 90)); if (sy < 0 || sy > WATER_Y - 40) { sx = clamp(boss.x - ox, 80, WORLD_W - 80); sy = T.surfaceBelow(sx, Math.max(0, boss.y - 90)); } if (sy < 0 || sy > WATER_Y - 40) continue;
    carveSpawn(sx, sy, MINION_SC);
    const K = G.minionKind, rl = G.minionRobots.length ? G.minionRobots : [0], rob = K ? K.rob : Assets.robots.robots[rl[G.minionSeq % rl.length]], mw = K ? K.mw : MINION_WEAPONS[G.minionSeq % MINION_WEAPONS.length]; G.minionSeq++;
    const hpK = K ? Math.round(hp * (K.hpMul || 1)) : hp;
    const m = { team: tm, idx: 50 + G.minionSeq, sc: K ? K.sc : MINION_SC, name: K ? K.name : 'Minion', minion: true, hover: !!(K && K.fly), mw, rob, x: sx, y: sy - 2, vx: 0, vy: 0, hp: hpK, maxHp: hpK, face: sx < boss.x ? 1 : -1, aim: 0, state: 'air', knocked: false, bounces: 0, wf: 0, fi: 8, walkAcc: 0, walking: 0, flash: 0, frozen: 0, dt: 0, fallPeak: 0 };
    G.worms.push(m); G.queue.push(m); made++; addFx('teleport', sx, sy - 30, 1.1);
  }
  if (made) { showBanner('⚠ ' + boss.name + ' summons ' + made + (G.minionKind ? ' ' + G.minionKind.name + 's!' : ' melee bots!'), '#ff4a4a'); Snd.play('boom', .6); shake(8); }
}
// ---- the shared minion turn ----
const SWARM_TIME = 12;   // seconds at most for the whole group (they end the turn sooner as soon as every bot has swung or given up)
function swarmControl() {
  const live = G.swarm.filter(m => m.state !== 'dead' && m.state !== 'drown');
  if (!live.length) { G.swarm = null; G.phase = 'settle'; G.settleT = 0; return; }
  const foes = aliveWorms().filter(e => !sameSide(e,live[0])), f0 = foes[0];
  G.activeWorm = f0 ? live.slice().sort((a, b) => Math.abs(a.x - f0.x) - Math.abs(b.x - f0.x))[0] : live[0];   // camera follows the bot closest to you
  if (G.phase !== 'aim') return;
  for (const m of live) { if (!m.done) AI.swarmStep(m); }
  if (live.every(m => m.done && m.state === 'ground')) { G.phase = 'retreat'; G.timer = 40; }   // everyone has acted: short pause for the swing effects, then the turn ends
}
// ---- exact movement prediction for bots (same physics as walkWorm / jumpWorm / updateWorm, but on a scratch position) ----
function simWalk(p, d, sc) {   // one walk step; null = blocked by a wall or a drop
  const nx = p.x + d * 1.45; if (nx < 70 || nx > WORLD_W - 70) return null;
  let up = 0, ok = false; for (; up <= 12 * sc; up++) if (!blocked(nx, p.y - up, sc)) { ok = true; break; } if (!ok) return null;
  let y = p.y - up; if (!onGround(nx, y, sc)) { let g = false; for (let dn = 1; dn <= 7 * sc; dn++) if (onGround(nx, y + dn, sc)) { y += dn; g = true; break; } if (!g) return null; }
  return { x: nx, y };
}
function simJump(p, d, sc) {   // exact flight of a forward jump: returns the landing spot {x, y, vy} or null (hit water / bounced off a wall / never landed)
  let x = p.x, y = p.y - 2, vx = d * 2.6, vy = -6.2;
  for (let f = 0; f < 160; f++) {
    vy = Math.min(vy + .3, 17); const n = Math.ceil(Math.max(Math.abs(vx), Math.abs(vy))), sx = vx / n, sy = vy / n;
    for (let i = 0; i < n; i++) {
      if (sx) { if (blocked(x + sx, y, sc)) { let st = false; for (let up = 1; up <= 4 && !st; up++) if (!blocked(x + sx, y - up, sc)) { x += sx; y -= up; st = true; } if (!st) vx *= -.35; } else x += sx; }
      if (sy > 0) { if (onGround(x, y + sy, sc)) { y += sy; if (onGround(x, y, sc)) { let yy = y; while (onGround(x, yy - 1, sc) && yy > y - 6) yy--; return { x, y: yy, vy }; } } else y += sy; }
      else if (sy < 0) { if (blocked(x, y + sy, sc)) { vy = 0; break; } y += sy; }
    }
    if (y > WATER_Y || x < 40 || x > WORLD_W - 40) return null;
  }
  return null;
}
// when the boss falls its minions fall with it (no explosion), so the stage ends at once
function bossMinionsCheck() {
  const b = G.bossW; if (!b || (b.state !== 'dead' && b.state !== 'drown')) return;
  for (const m of G.worms) if (m.minion && m.state !== 'dead' && m.state !== 'drown') { m.hp = 0; killWorm(m); m.exploded = true; }
}
// ---------------- boss stage: clear the path ----------------
// Flattens hills, pillars and floating blocks in the walkway and fills pits, so melee bots can walk from the boss to your robots.
// The ground line is the typical (lower) ground height around each spot, smoothed so it never gets steeper than a robot can climb.
function clearPath(T, X0 = 300, X1 = 2250, HEAD = 120) {
  const W = T.W, H = T.H, m = T.mask, c = T.ctx, surf = new Int16Array(W), base = new Float32Array(W);
  for (let x = 0; x < W; x++) { let y = 0, s = H; while (y < H - 70) { if (m[y * W + x]) { let k = 0; while (k < 70 && m[(y + k) * W + x]) k++; if (k >= 70) { s = y; break; } y += k; } else y++; } surf[x] = s; }   // top of the first thick (>=70px) ground in each column
  for (let x = X0; x <= X1; x++) { const v = []; for (let q = Math.max(X0, x - 350); q <= Math.min(X1, x + 350); q += 10) v.push(surf[q]); v.sort((a, b) => a - b); base[x] = v[Math.floor(.75 * (v.length - 1))]; }
  for (let x = X0 + 1; x <= X1; x++) base[x] = clamp(base[x], base[x - 1] - 3, base[x - 1] + 3);
  for (let x = X1 - 1; x >= X0; x--) base[x] = clamp(base[x], base[x + 1] - 3, base[x + 1] + 3);
  for (let x = X0; x <= X1; x++) {
    const s = surf[x], b = Math.round(base[x]);
    const top = Math.min(s, b - HEAD); if (top < b) { let any = false; for (let y = Math.max(0, top); y < b; y++) { const i = y * W + x; if (m[i]) { m[i] = 0; any = true; } } if (any) c.clearRect(x, Math.max(0, top), 1, b - Math.max(0, top)); }   // hill / pillar / ceiling above the walkway
    if (s > b + 2) {   // pit: fill it with the look of the nearest normal ground
      let xr = -1; for (let d = 1; d < 500 && xr < 0; d++) for (const q of [x - d, x + d]) if (q >= X0 && q <= X1 && Math.abs(surf[q] - base[q]) <= 3 && Math.abs(base[q] - b) <= 6) { xr = q; break; }
      const hh = Math.min(H, s) - (b - 4); if (xr >= 0 && hh > 0) { try { c.putImageData(c.getImageData(xr, b - 4, 1, hh), x, b - 4); } catch (e) { } }
      for (let y = b; y < Math.min(s, H); y++) m[y * W + x] = 1;
    }
  }
  // the floor of the walkway can no longer be destroyed (Terrain.carve skips it), so no crater can ever block the bots
  const fl = new Int16Array(W).fill(32767); for (let x = X0; x <= X1; x++) fl[x] = Math.round(base[x]);
  const bak = document.createElement('canvas'); bak.width = W; bak.height = H; bak.getContext('2d').drawImage(c.canvas, 0, 0); T.bak = bak; T.floor = fl;
}

// ---------------- main update ----------------
function updateGame() {
  G.frame++;
  const w = G.activeWorm;
  // control
  if (G.mode === 'play' && w) {
    const C = curTeam().cpu ? AI.input : In;
    if (G.swarm) swarmControl();
    else if ((G.phase === 'aim' || G.phase === 'retreat') && w.state === 'ground' && w.frozen <= 0) {
      if (C.left) walkWorm(w, -1); else if (C.right) walkWorm(w, 1);
      if (C.jump) { jumpWorm(w, false); C.jump = false; } if (C.flip) { jumpWorm(w, true); C.flip = false; }
    }
    if ((G.phase === 'aim') && w.state !== 'dead' && !G.swarm) {
      if (C.up || C.down) G.angT = 70; else if (G.angT > 0) G.angT--;
      if (C.up) w.aim = clamp(w.aim + (C.fast ? AIM_FAST : AIM_STEP), -88, 88); if (C.down) w.aim = clamp(w.aim - (C.fast ? AIM_FAST : AIM_STEP), -88, 88);
      const wd = curWeapon();
      if (G.flyMode) flyControl(C);   // Fly button selected: FIRE launches the robot instead of a shot
      else if (wd.charge) {
        if (C.firePressed && canFire() && curTeam().ammo[wd.id] > 0) { G.charging = true; G.charge = 0; G.chgDir = 1; }
        if (G.charging) { if (C.fire) { chargeTick(); } else { startFire(Math.max(0, G.charge)); } }
        else if (C.firePressed) { startFire(1); }
      } else if (C.firePressed) startFire(1);
    }
    C.firePressed = false;
    if (G.phase === 'aim') { G.timer--; if (G.timer <= 0) { G.charging = false; endTurnNow(); } if (G.timer % 60 === 0 && G.timer <= 300 && G.timer > 0) Snd.play('tick'); }
    else if (G.phase === 'retreat') { G.timer--; if (G.timer <= 0) endTurnNow(); }
    else if (G.phase === 'shooting') { updateShooting(); if (++G.shootT > 1500) { G.burst = null; G.volley = null; G.flameT = 0; G.phase = 'retreat'; G.timer = RETREAT_TIME * 60; } }
    else if (G.phase === 'settle') { G.settleT++; if (G.settleT > 50 && settled()) { startTurn(); } else if (G.settleT > 420) { for (const wm of G.worms) if (wm.state === 'air') rescueWorm(wm); G.projs = G.projs.filter(p => p.kind === 'mine'); G.burst = null; G.volley = null; G.flameT = 0; if (G.settleT > 480) startTurn(); } }
    if (!G.swarm && (w.state === 'dead' || w.state === 'drown')) { if (G.phase === 'aim' || G.phase === 'retreat' || G.phase === 'shooting') { G.burst = null; G.volley = null; G.flameT = 0; G.phase = 'settle'; G.settleT = 0; } }
    // aim weapon rotates only when grounded; sprite frame
    if (curTeam().cpu && !G.swarm) AI.update(w);
  }
  if (G.adv) bossMinionsCheck();
  for (const wm of G.worms) updateWorm(wm);
  for (const p of G.projs) updateProj(p); G.projs = G.projs.filter(p => !p.dead);
  for (const c of G.crates) updateCrate(c); G.crates = G.crates.filter(c => !c.dead);
  for (const f of G.fxs) f.t++; G.fxs = G.fxs.filter(f => f.t * f.d.fps / 60 < f.d.frames);
  updateWaves(); BOSS3.update();
  for (const b of G.beams) b.t++; G.beams = G.beams.filter(b => b.t < b.life);
  for (const p of G.pops) p.t++; G.pops = G.pops.filter(p => p.t < 70);
  for (const p of G.parts) { p.t++; p.vy += .25; p.x += p.vx; p.y += p.vy; p.rot += p.spin; if (G.terrain.solid(p.x, p.y)) { p.vy *= -.35; p.vx *= .6; p.y -= 2; } } G.parts = G.parts.filter(p => p.t < p.life);
  if (G.banner) { G.banner.t++; if (G.banner.t > 130) G.banner = null; }
  // wind-blown gentle shake decay
  G.cam.shake *= .88;
  updateCamera();
}
function updateCamera() {
  const c = G.cam, w = G.activeWorm; let tx = c.x, ty = c.y, follow = false;
  if (c.free) return;   // player is looking around (swiped): don't pull the camera back
  const live = G.projs.filter(p => p.kind !== 'mine' && !p.dead && (p.kind !== 'timed' || !p.rest));
  if (live.length) { const p = live[live.length - 1]; tx = p.x; ty = p.y; follow = true; }
  else if (w && w.jet) { tx = w.x; ty = w.y - 60; follow = true; }   // Fly: the camera follows the flying robot
  else if (G.fxs.length && G.phase !== 'aim') { const f = G.fxs[G.fxs.length - 1]; tx = f.x; ty = f.y; follow = true; }
  else if (w) { tx = w.x; ty = w.y - 60; }
  const k = follow ? .09 : .06; c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
}
