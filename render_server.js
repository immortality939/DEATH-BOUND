/* ONLINE VERSION of render.js - upload this file to GitHub (online game only).
   The offline app keeps using render.js. Edit the two files separately on purpose. */
'use strict';
const PROJ_ANCHOR = { proj_bolt_cyan: [77, 16], proj_bolt_orange: [77, 16], proj_bullet: [38, 6], proj_plasma: [32, 32], proj_fire: [35, 32], proj_ice: [56, 16], proj_rocket: [128, 32], proj_missile: [128, 32], proj_bomblet: [32, 32], proj_meteor: [128, 40], proj_banana_small: [32, 32], proj_meteorlet: [32, 32] };
const ADDITIVE = { fly_trail: 1, heal_pulse: 1, team_heal_wave: 1, divine_trail: 1, divine_burst: 1, divine_heal_on: 1, divine_trail_b: 1, divine_burst_b: 1, divine_heal_on_b: 1, teleport: 1, energy_hit: 1, plasma_hit: 1, spark_hit: 1, slash_cyan: 1, slash_orange: 1, heal: 1, proj_fire: 1, proj_plasma: 1, proj_bolt_cyan: 1, proj_bolt_orange: 1, proj_bullet: 1 };
Object.assign(ADDITIVE, { axe_trail_t0: 1, axe_trail_t1: 1, axe_trail_t2: 1, axe_trail_t3: 1 });   // Doom Axe trails glow
Object.assign(ADDITIVE, { volt_hit_t0: 1, volt_hit_t1: 1, volt_hit_t2: 1, volt_hit_t3: 1 });   // Tempest Arc hit effects glow
const BG_FILL = { day: [[84, 112, 144], [66, 98, 119], [42, 77, 70]], sunset: [[91, 49, 84], [70, 35, 70], [42, 21, 49]], night: [[24, 28, 63], [17, 20, 48], [10, 11, 29]] };
const tintCv = document.createElement('canvas'); tintCv.width = tintCv.height = 192; const tintCtx = tintCv.getContext('2d');
let VIEW = { z: 1, cx: 0, cy: 0, W: 0, H: 0 };

function drawBackground(ctx, W, H, theme, camX, camY, z) {
  const bg = Assets.bg[theme], sky = getImg(bg.sky);
  if (sky) ctx.drawImage(sky, 0, 0, W, H); else { ctx.fillStyle = '#4a90d9'; ctx.fillRect(0, 0, W, H); }
  const pf = [.06, .12, .22], names = ['far', 'mid', 'near'], fills = BG_FILL[theme];
  for (let i = 0; i < 3; i++) {
    const im = getImg(bg[names[i]]); if (!im) continue;
    const s = H * (.62 + i * .04) / 520, tw = im.width * s, th = im.height * s;
    const off = -((camX * z * pf[i]) % tw + tw) % tw, yTop = H * (.34 + i * .06) + (WORLD_H * .5 - camY) * z * pf[i] * .6;
    for (let x = off - tw; x < W; x += tw) ctx.drawImage(im, x, yTop, tw + 1, th);
    const yb = yTop + th - 1; if (yb < H) { const f = fills[i]; ctx.fillStyle = `rgb(${f[0]},${f[1]},${f[2]})`; ctx.fillRect(0, yb, W, H - yb + 2); }
  }
}
function drawWater(ctx, t, theme) {
  if (G.adv) return;   // Adventure has no water: it is pure ground (see Terrain.makeUnder)
  const x0 = VIEW.cx - VIEW.W / 2 / VIEW.z - 20, x1 = VIEW.cx + VIEW.W / 2 / VIEW.z + 20, yb = VIEW.cy + VIEW.H / 2 / VIEW.z + 40;
  if (yb < WATER_Y - 20) return;
  const cols = theme === 'night' ? ['rgba(30,70,150,.62)', 'rgba(60,110,200,.35)', 'rgba(170,200,255,.5)'] : theme === 'sunset' ? ['rgba(150,60,120,.6)', 'rgba(240,120,130,.35)', 'rgba(255,220,200,.55)'] : ['rgba(30,120,200,.6)', 'rgba(90,180,240,.35)', 'rgba(230,248,255,.6)'];
  for (let L = 0; L < 2; L++) {
    ctx.beginPath(); ctx.moveTo(x0, yb);
    for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, WATER_Y + L * 9 + Math.sin(x / 55 + t / (28 - L * 8)) * (5 - L) + Math.sin(x / 23 - t / 17) * 2);
    ctx.lineTo(x1, yb); ctx.closePath(); ctx.fillStyle = cols[L]; ctx.fill();
  }
  ctx.beginPath(); for (let x = x0; x <= x1; x += 12) { const y = WATER_Y + Math.sin(x / 55 + t / 28) * 5 + Math.sin(x / 23 - t / 17) * 2; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.strokeStyle = cols[2]; ctx.lineWidth = 2; ctx.stroke();
}
function drawSpriteSheet(ctx, reg, frame, ax, ay, scale) {
  const d = Assets.fx[reg]; if (!d) return; const im = getImg(d.file); if (!im) return; const f = frame % d.frames;
  ctx.drawImage(im, (f % d.cols) * d.fw, Math.floor(f / d.cols) * d.fh, d.fw, d.fh, -ax * scale, -ay * scale, d.fw * scale, d.fh * scale);
}
// ---- BOSS IDLE ANIMATION: every boss (robot bosses, creature bosses, HEROIC third bosses) breathes + sways while standing still. Pivot = the feet, so the body
//      squashes / stretches and leans a little; the weapon, fists and freeze / hit tint all live inside the same transform, so they follow. gripWorld() (world.js) uses the same numbers
//      so shots still leave from the muzzle. Not used while walking, jumping, flying / hovering, frozen, lunging or playing a special-move (act) frame. Tune the 3 numbers below. ----
const BOSS_IDLE_BREATH = .022, BOSS_IDLE_SQUEEZE = .010, BOSS_IDLE_SWAY = .012;   // breath height change, breath width change (opposite), sway angle in radians
function bossIdleXf(w) {
  return null;   // breathing idle (grow / shrink squash + sway) REMOVED on request: bosses keep their normal size while standing
  if (!isBoss(w) || w.state !== 'ground' || w.walking > 0 || w.frozen > 0 || w.hover || w.actF != null || (w.flyOff || 0) > 2 || w.hop > 0 || w.lunge > 0) return null;
  const t = (G.frame || 0) + (w.idx || 0) * 37, b = Math.sin(t / 16), s = Math.sin(t / 27 + 1.1);
  return { sx: 1 - BOSS_IDLE_SQUEEZE * b, sy: 1 + BOSS_IDLE_BREATH * b, rot: BOSS_IDLE_SWAY * s };
}
function drawWorm(ctx, w, isActive, t) {
  const R = w.rob, sheet = getImg(R.sheet), FR = Assets.robots.frame, F = Assets.robots.feet, DF = Assets.robots.deathFrame;
  const sc = w.sc || 1, RSs = RS * sc;   // Adventure bosses are drawn bigger
  if (w.state === 'dead') {
    const dimg = getImg(R.death); if (!dimg) return; const f = Math.floor(w.dt / 3.6); if (f > 11) return;
    ctx.save(); ctx.translate(w.x, w.y - (w.flyOff || 0)); ctx.scale(w.face * RSs, RSs); ctx.drawImage(dimg, (f % 4) * DF, Math.floor(f / 4) * DF, DF, DF, -F[0], -F[1], 512, 512); ctx.restore(); return;
  }
  const moving = w.walking > 0 && w.state === 'ground'; w.fi = moving ? w.wf : 8;
  ctx.save();
  if (w.state === 'drown') { ctx.globalAlpha = Math.max(0, 1 - w.dt / 40); }
  // ground shadow
  if (w.state === 'ground') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 22 * sc, 5 * sc, 0, 0, 6.283); ctx.fill(); }
  const wearB = G.teams && G.teams[w.team] && G.teams[w.team].bonus, wearW = wearB && wearB.wing && typeof itemById === 'function' ? itemById(wearB.wing) : null, wearReg = wearW ? 'wings_' + wearW.look : null;   // WINGS gear: worn wings stay on the robot's back all the time
  const flying = isActive && w.state === 'air' && w.jet || isActive && G.flyMode && w.state === 'ground' && w.frozen <= 0;
  if (flying || (wearReg && w.state !== 'drown')) {   // FLY: flapping wings behind the robot (folded-out + slow flap while Fly is selected), jet flame under the feet while flying
    const jet = isActive && w.jet && w.state === 'air', fr = Math.floor(G.frame * (jet ? .4 : flying && G.charging ? .3 : flying ? .12 : .06));
    ctx.save(); ctx.translate(w.x, w.y - (w.flyOff || 0) - 46 * sc); ctx.scale(w.face, 1); ctx.translate(-7 * sc, jet ? 0 : -2 * sc); drawSpriteSheet(ctx, wearReg || 'fly_wings', fr, 120, 110, (jet ? .95 : .8) * sc); ctx.restore();
    if (jet) { ctx.save(); ctx.translate(w.x, w.y + 2 * sc); ctx.rotate(Math.atan2(w.vx, -w.vy) * .6); ctx.globalCompositeOperation = 'lighter'; drawSpriteSheet(ctx, 'fly_flame', fr, 48, 8, .6 * sc); ctx.restore(); }
  }
  const fo = w.flyOff || 0, lg = w.lunge > 0 ? Math.sin(Math.PI * (1 - w.lunge / 14)) * 16 * sc : 0;   // fo = flying height, lg = forward lunge of a smashing minion
  ctx.translate(w.x + w.face * lg, w.y - (w.hop || 0) - fo); ctx.scale(w.face * RSs, RSs);   // w.hop = boss jump before a stomp
  const idl = bossIdleXf(w); if (idl) { ctx.rotate(idl.rot); ctx.scale(idl.sx, idl.sy); }   // boss idle breathing (see bossIdleXf)
  let img = sheet, sx = (w.fi % 4) * FR, sy = Math.floor(w.fi / 4) * FR; const an = R.anchors[w.fi], actImg = R.act ? getImg(R.act) : null;
  if (actImg) {   // creature action sheet: special-move frames (smash / roar / jump) and the flying dragons' flap + breath frames
    let af = null; if (w.actF != null) af = w.actF; else if (fo > 2 || w.hover) af = (w.breathT > 0 ? 6 : 0) + (Math.floor(G.frame / 5) % 6);
    if (af != null) { img = actImg; sx = (af % 4) * FR; sy = Math.floor(af / 4) * FR; }
  }
  const body = () => ctx.drawImage(img, sx, sy, FR, FR, -F[0], -F[1], 512, 512);
  body();
  // weapon (active robot only)
  if (isActive && (G.phase === 'aim' || G.phase === 'shooting' || G.phase === 'retreat') && w.frozen <= 0) {
    let wd = w.mw || curWeapon(), wi = getImg(wpath(wd.art || wd.id, (wd.sig || wd.shop) ? teamWTier(curTeam()) : 0));
    if (wi && wd.heal && typeof azureHealImg === 'function') wi = azureHealImg(w.team, wi);   // Azure Divine Heal in the robot's hands = light-blue picture
    if (wi) {
      const wp = an.w || an.n; ctx.save(); ctx.translate(wp[0] - F[0], wp[1] - F[1]); ctx.rotate(-w.aim * D2R);   // an.w = per-robot weapon pivot (robots.json), so every bot's weapon sits right in its own hands; fists (an.n / an.f) stay on the hands ctx.scale(WS * (wd.hold || 1), WS * (wd.hold || 1));
      const recoil = (G.phase === 'shooting' && G.burst) ? -((G.frame % 4) < 2 ? 5 : 0) : 0; ctx.translate(recoil, 0);
      ctx.drawImage(wi, -170, -128, 512, 256); ctx.restore();
      // fists back on top of the weapon so it looks gripped
      for (const hp of [an.f, an.n]) { ctx.save(); ctx.beginPath(); ctx.arc(hp[0] - F[0], hp[1] - F[1], 23, 0, 6.283); ctx.clip(); body(); ctx.restore(); }
    }
  }
  // tint overlays
  const tint = (col, a) => { tintCtx.clearRect(0, 0, 192, 192); tintCtx.globalCompositeOperation = 'source-over'; tintCtx.drawImage(img, sx, sy, FR, FR, 0, 0, FR, FR); tintCtx.globalCompositeOperation = 'source-atop'; tintCtx.globalAlpha = a; tintCtx.fillStyle = col; tintCtx.fillRect(0, 0, 192, 192); tintCtx.globalAlpha = 1; ctx.drawImage(tintCv, 0, 0, FR, FR, -F[0], -F[1], 512, 512); };
  if (w.frozen > 0) tint('#9fe4ff', .55);
  if (w.flash > 0 && (w.flash % 4) < 2) tint('#ff4a2a', .6);
  else if (w.healT > 0) tint(w.healBlue ? '#cfeaff' : '#e8ffee', .55 * w.healT / 36);   // Divine Heal glow
  ctx.restore();
  if (w.state === 'drown') return;
  // labels
  const T = G.teams[w.team], y = w.y - 92 * sc, bw = 46 * Math.max(1, sc * .85);
  ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(w.name, w.x, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(w.name, w.x, y - 12);
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w.x - bw / 2 - 1, y - 8, bw + 2, 8); ctx.fillStyle = T.color; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 6);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 2);
  ctx.font = '700 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(w.hp, w.x, y + 6); ctx.fillText(w.hp, w.x, y + 6);
  if (isActive && (G.phase === 'aim' || G.phase === 'retreat')) { const b = Math.sin(t / 8) * 4; ctx.fillStyle = T.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y - 24 + b); ctx.lineTo(w.x - 9, y - 40 + b); ctx.lineTo(w.x + 9, y - 40 + b); ctx.closePath(); ctx.stroke(); ctx.fill(); }
  ctx.restore();
}

// ---- EPIC LOOK of upgraded signature shots: +10 / +11 / +12 get a glassy 3D energy bubble, spinning gyro rings (front + back halves for depth),
//      orbiting sparks and a comet trail. +12 adds golden rays, a white-hot core and shockwave pulses. ----
const EPIC_GOLD = '#ffe27a';
function epicDot(ctx, x, y, r, c, al) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = al; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
function epicTrail(ctx, L, p, tier, S) {   // soft glowing afterimages behind the shot (drawn before the scale, in world units)
  const h = p._h || (p._h = []); h.push(p.x, p.y); const max = (5 + tier * 4) * 2; while (h.length > max) h.splice(0, 2);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const n = h.length / 2;
  for (let i = 0; i < n - 1; i++) { const u = (i + 1) / n; epicDot(ctx, h[2 * i] - p.x, h[2 * i + 1] - p.y, (6 + tier * 3.5) * S * u, tier === 3 ? (i % 2 ? EPIC_GOLD : '#fff') : (tier === 2 ? L.c1 : L.c2), .38 * u); }
  ctx.restore();
}
function epicRings(ctx, L, a, tier, R, front) {   // tilted rings: far half is dim and drawn behind the shot, near half is bright and drawn in front
  for (let i = 0; i < tier; i++) {
    const rot = a * (.05 + .02 * i) * (i % 2 ? -1 : 1) + i * 1.05, tilt = .26 + .24 * Math.abs(Math.sin(a * .04 + i * 1.3)), rr = R * (1.2 + i * .2);
    const col = tier === 3 ? (i === 0 ? '#ffffff' : i === 1 ? EPIC_GOLD : L.c1) : (i === 0 ? L.c1 : L.c2);
    ctx.save(); ctx.rotate(rot); ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) { ctx.lineWidth = k ? (front ? 2.2 : 1.4) : 6; ctx.strokeStyle = k ? col : L.c2; ctx.globalAlpha = k ? (front ? .95 : .35) : (front ? .22 : .1); ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * tilt, 0, front ? 0 : Math.PI, front ? Math.PI : 6.283); ctx.stroke(); }
    ctx.restore();
  }
}
function epicSparks(ctx, L, a, tier, R, front) {   // little suns circling the shot; the ones passing behind are smaller and dimmer
  const n = 2 + tier * 2;
  for (let i = 0; i < n; i++) {
    const q = a * (.09 + .012 * (i % 3)) + i * 6.283 / n, z = Math.sin(q); if ((z >= 0) !== front) continue;
    const e = R * (1.45 + .12 * (i % 2)), s = (2.4 + tier * .6) * (1 + .45 * z);
    epicDot(ctx, Math.cos(q) * e, z * e * .5, s * 3.2, i % 2 ? L.c1 : (tier === 3 ? EPIC_GOLD : L.c2), (front ? .8 : .4)); epicDot(ctx, Math.cos(q) * e, z * e * .5, s, '#ffffff', front ? .95 : .45);
  }
}
function epicBack(ctx, L, a, tier) {   // everything that sits BEHIND the shot
  const R = 15 + tier * 4, pulse = 1 + Math.sin(a * .18) * .07;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 2.1 * pulse); g.addColorStop(0, tier === 3 ? '#ffffff' : L.c1); g.addColorStop(.35, L.c2); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = .26 + tier * .1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2.1 * pulse, 0, 6.283); ctx.fill();
  if (tier === 3) { ctx.globalAlpha = .5; ctx.fillStyle = EPIC_GOLD; ctx.save(); ctx.rotate(a * .04); for (let i = 0; i < 10; i++) { ctx.rotate(.6283); ctx.beginPath(); ctx.moveTo(R * .7, -2.6); ctx.lineTo(R * 2.3 + Math.sin(a * .3 + i * 1.7) * 5, 0); ctx.lineTo(R * .7, 2.6); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  epicRings(ctx, L, a, tier, R, false); epicSparks(ctx, L, a, tier, R, false);
  ctx.restore();
}
function epicFront(ctx, L, a, tier) {   // everything IN FRONT of the shot: glass bubble, shine, near halves of rings, near sparks
  const R = 15 + tier * 4;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, R * .45, 0, 0, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.72, 'rgba(0,0,0,0)'); g.addColorStop(.92, L.c2); g.addColorStop(1, tier === 3 ? '#ffffff' : L.c1);   // fresnel rim = glass sphere
  ctx.globalAlpha = .55 + tier * .1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  if (tier === 3) epicDot(ctx, 0, 0, R * .55, '#ffffff', .75);   // white-hot core
  ctx.globalAlpha = .8; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-R * .36, -R * .42, R * .3, R * .14, -.7, 0, 6.283); ctx.fill();   // main shine
  ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(R * .4, R * .45, R * .07, 0, 6.283); ctx.fill();   // small glint
  if (tier >= 2) { const u = (a % 36) / 36; ctx.globalAlpha = (1 - u) * .7; ctx.strokeStyle = tier === 3 ? EPIC_GOLD : L.c1; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * (1 + u * 1.1), 0, 6.283); ctx.stroke(); }   // shockwave pulse
  epicRings(ctx, L, a, tier, R, true); epicSparks(ctx, L, a, tier, R, true);
  ctx.restore();
}
// ---- signature weapon projectiles: every robot's lobbed shot has its own look (drawn in code, no sprite sheet) ----
// Titan Cannon ball: tier 0 = black ball, 1 = same but bigger, 2 = black with spikes, 3 = gold with spikes (same size as tier 1). Tiers 1-3 share one size.
function drawTitanBall(ctx, tier, a, ss, ang, vx) {
  const path = 'proj/titan_ball_t' + Math.min(3, tier | 0) + '.png', im = getImg(path), k = ss * (tier ? 22 / 24 : 1) / 3;   // image is drawn at 1/3 of its pixels (made 3x sharp); +10 to +12 share one size
  if (!im) { loadImage(path).catch(() => { }); ctx.fillStyle = '#323946'; ctx.beginPath(); ctx.arc(0, 0, 8 * ss, 0, 6.283); ctx.fill(); return; }
  if (tier >= 3) { const R = 24 * ss, g = ctx.createRadialGradient(0, 0, 1, 0, 0, R); g.addColorStop(0, 'rgba(255,200,60,.5)'); g.addColorStop(1, 'rgba(255,160,0,0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill(); ctx.restore(); }
  ctx.rotate(a * .16 * (vx < 0 ? -1 : 1));   // spins while it flies (turns the way it is travelling)
  ctx.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k);
}
// Shuriken shot: the shot is the weapon's own picture (assets/proj/shuriken_t0..t3.png), spinning fast, with motion-blur ghosts and a glow that grows with the upgrade look
function drawShuriken(ctx, tier, a, ss, vx) {
  tier = Math.min(3, tier | 0); const path = 'proj/shuriken_t' + tier + '.png', im = getImg(path), k = ss * [1, 1.1, 1.18, 1.3][tier] / 3, dir = vx < 0 ? -1 : 1;
  if (!im) { loadImage(path).catch(() => { }); ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.arc(0, 0, 10 * ss, 0, 6.283); ctx.fill(); return; }
  if (tier) { const R = (22 + tier * 5) * ss, c = ['', '255,60,60', '255,200,60', '255,150,30'][tier], g = ctx.createRadialGradient(0, 0, 1, 0, 0, R); g.addColorStop(0, 'rgba(' + c + ',.5)'); g.addColorStop(1, 'rgba(' + c + ',0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill(); ctx.restore(); }
  const spin = a * .62 * dir, w = im.width * k, h = im.height * k;
  for (let i = 2; i >= 0; i--) { ctx.save(); ctx.rotate(spin - i * .55 * dir); ctx.globalAlpha = i ? .22 / i : 1; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }   // 2 faded ghosts behind = fast spin blur
}
// Tempest Arc shot: a short crackling lightning bolt, NOT a ball. assets/proj/volt_bolt_t0..t3.png = 4 jagged variants side by side; the shot flickers between them
// (and flips) while it flies, and points the way it travels. Each upgrade look has its own colour / size.
const VOLT_CELL = [[168, 64], [192, 72], [216, 84], [240, 96]];
function drawVoltBolt(ctx, tier, a, ss, ang) {
  tier = Math.min(3, tier | 0); const path = 'proj/volt_bolt_t' + tier + '.png', im = getImg(path), [cw, ch] = VOLT_CELL[tier], k = ss / 3;
  ctx.rotate(ang);
  if (!im) {   // picture not loaded yet: a small jagged line in the same colours
    loadImage(path).catch(() => { }); const c = ['#9fd0ff', '#ffc04a', '#6ff0ff', '#b8ffff'][tier]; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-12, -6); ctx.lineTo(-2, 5); ctx.lineTo(10, -5); ctx.lineTo(24, 0); ctx.stroke(); return;
  }
  const f = Math.floor(a / 3) % 4, flip = (Math.floor(a / 6) % 2) ? -1 : 1, w = cw * k, h = ch * k;
  ctx.scale(1, flip);
  ctx.drawImage(im, f * cw, 0, cw, ch, -w / 2, -h / 2, w, h);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55; ctx.drawImage(im, f * cw, 0, cw, ch, -w / 2, -h / 2, w, h); ctx.restore();   // second pass = brighter, glowing
}
// Doom Axe shot: the axe's own picture (assets/proj/doom_axe_t0..t3.png), spinning slowly (DOOM_AXE_SPIN), glow grows with the look
function drawDoomAxe(ctx, tier, a, ss, vx) {
  tier = Math.min(3, tier | 0); const path = 'proj/doom_axe_t' + tier + '.png', im = getImg(path), k = ss * [1, 1.06, 1.12, 1.2][tier] / 3, dir = vx < 0 ? -1 : 1;
  if (!im) { loadImage(path).catch(() => { }); ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.arc(0, 0, 14 * ss, 0, 6.283); ctx.fill(); return; }
  if (tier) { const R = (32 + tier * 6) * ss, c = ['', '255,200,60', '255,60,60', '255,150,30'][tier], g = ctx.createRadialGradient(0, 0, 1, 0, 0, R); g.addColorStop(0, 'rgba(' + c + ',.45)'); g.addColorStop(1, 'rgba(' + c + ',0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill(); ctx.restore(); }
  const w = im.width * k, h = im.height * k; ctx.rotate(a * DOOM_AXE_SPIN * dir); ctx.drawImage(im, -w / 2, -h * .4, w, h);   // spins around the axe head
}
function drawSigShot(ctx, L, p, t, ss) {
  const k = L.k, a = p.age || 0, ang = Math.atan2(p.vy, p.vx);
  const glow = (r, c, al) => { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); ctx.restore(); };
  const ball = (r, hi) => { const g = ctx.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r); g.addColorStop(0, L.c1); g.addColorStop(hi || .55, L.c2); g.addColorStop(1, '#10131c'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); };
  if (k === 'volt') { drawVoltBolt(ctx, p.owner ? teamWTier(G.teams[p.owner.team]) : 0, a, ss, ang); return; }   // Tempest Arc: crackling lightning bolt, 4 looks
  if (k === 'daxe') { drawDoomAxe(ctx, p.owner ? teamWTier(G.teams[p.owner.team]) : 0, a, ss, p.vx); return; }   // Doom Axe: its own picture, 4 looks
  if (k === 'shur') { drawShuriken(ctx, p.owner ? teamWTier(G.teams[p.owner.team]) : 0, a, ss, p.vx); return; }   // Shuriken: its own picture, 4 looks
  if (k === 'cball') { drawTitanBall(ctx, p.owner ? teamWTier(G.teams[p.owner.team]) : 0, a, ss, ang, p.vx); return; }   // Titan Cannon: its own 4 looks (black / bigger / spiked / gold spiked)
  const tier = p.owner ? teamWTier(G.teams[p.owner.team]) : 0, TS = ss * (1 + .14 * tier + .06 * Math.max(0, tier - 1));   // higher upgrade = bigger, brighter shot
  if (tier) epicTrail(ctx, L, p, tier, TS);
  ctx.scale(TS, TS);
  if (tier) epicBack(ctx, L, a, tier);
  if (k === 'orb') { glow(26 + Math.sin(a * .4) * 3, L.c2, .55); ball(9.5 + Math.sin(a * .5) * .8, .7); }
  else if (k === 'ball') { glow(18, L.c2, .25); ball(9, .6); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-3, -3.5, 3, 1.8, -.6, 0, 6.283); ctx.fill(); }
  else if (k === 'blob') { glow(22, L.c2, .4); const w = Math.sin(a * .45) * 1.6; ctx.fillStyle = L.c2; ctx.strokeStyle = '#1f4d0c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 10 + w, 9 - w, ang, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = L.c1; ctx.beginPath(); ctx.arc(-3, -3, 3.2, 0, 6.283); ctx.fill(); ctx.fillStyle = L.c2; ctx.beginPath(); ctx.arc(11, 5, 2.4, 0, 6.283); ctx.fill(); }
  else if (k === 'star') { glow(18, L.c2, .35); ctx.rotate(a * .45); ctx.fillStyle = L.c2; ctx.strokeStyle = '#1b0f30'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 4 : 13, q = i * .7854; ctx.lineTo(Math.cos(q) * r, Math.sin(q) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = L.c1; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 6.283); ctx.fill(); }
  else if (k === 'bolt') { glow(28, L.c2, .6); ball(8, .6); ctx.strokeStyle = L.c1; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const q = (a * .3 + i * 1.57) + Math.sin(a * .9 + i) * .5; ctx.beginPath(); ctx.moveTo(Math.cos(q) * 8, Math.sin(q) * 8); ctx.lineTo(Math.cos(q + .25) * 14, Math.sin(q + .25) * 14); ctx.lineTo(Math.cos(q - .1) * 19, Math.sin(q - .1) * 19); ctx.stroke(); } }
  else if (k === 'shell') { ctx.rotate(ang); ctx.fillStyle = L.c2; ctx.strokeStyle = '#10131c'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-12, -5); ctx.lineTo(4, -6); ctx.quadraticCurveTo(15, -4, 16, 0); ctx.quadraticCurveTo(15, 4, 4, 6); ctx.lineTo(-12, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = L.c1; ctx.fillRect(-4, -6, 3, 12); ctx.fillStyle = '#ff9d3f'; ctx.fillRect(-12, -5, 4, 10); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-10, -4, 22, 2); }
  else if (k === 'spike') { glow(20, L.c2, .35); ctx.rotate(a * .2); ctx.fillStyle = '#f2f2f2'; ctx.strokeStyle = '#10131c'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { const q = i * .7854; ctx.save(); ctx.rotate(q); ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(15, 0); ctx.lineTo(6, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); } ball(8, .6); }
  else if (k === 'gem') { glow(24, L.c2, .5); ctx.rotate(a * .08); ctx.fillStyle = L.c2; ctx.strokeStyle = '#10131c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(9, -4); ctx.lineTo(7, 9); ctx.lineTo(0, 13); ctx.lineTo(-7, 9); ctx.lineTo(-9, -4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = L.c1; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(9, -4); ctx.lineTo(0, 0); ctx.lineTo(-9, -4); ctx.closePath(); ctx.fill(); ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -4); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); }
  else ball(9);
  if (tier) epicFront(ctx, L, a, tier);
}
function drawDivineShot(ctx, p) {   // ctx is already translated to the orb; flapping wings + glowing comet trail
  const az = isAzureHeal(p), c1 = az ? '120,200,255' : '255,120,235', c2 = az ? '190,240,255' : '120,230,255', c3 = az ? '225,245,255' : '255,225,255';   // Azure Divine Heal = light-blue trail
  const tr = p.tr || []; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 1; i < tr.length; i++) { const a = tr[i - 1], b = tr[i], u = i / tr.length; ctx.strokeStyle = i % 2 ? `rgba(${c1},${.55 * u})` : `rgba(${c2},${.55 * u})`; ctx.lineWidth = 2 + 11 * u; ctx.beginPath(); ctx.moveTo(a[0] - p.x, a[1] - p.y); ctx.lineTo(b[0] - p.x, b[1] - p.y); ctx.stroke(); }
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 36); g.addColorStop(0, `rgba(${c3},.6)`); g.addColorStop(1, `rgba(${c1},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 36, 0, 6.283); ctx.fill(); ctx.restore();
  ctx.rotate(clamp(p.vx * .04, -.3, .3)); drawSpriteSheet(ctx, divFx('divine_fly', p), Math.floor(p.age * .5), 96, 126, p.p.ss || .3); ctx.restore();
}
function drawProj(ctx, p, t) {
  const pr = p.p; ctx.save(); ctx.translate(p.x, p.y);
  if (p.kind === 'flame') {
    const u = p.age / p.life; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(1.1 - u, 0, 1); const s = (.55 + u * .9) * (p.scale || 1);
    drawSpriteSheet(ctx, 'proj_fire', Math.floor(p.age * .5), 35, 32, s); ctx.restore(); return;
  }
  const spr = pr.spr || '';
  if (spr.startsWith('w:') || p.bomblet) {
    if (p.bomblet) { ctx.rotate(p.rot || 0); drawSpriteSheet(ctx, pr.miniSpr || 'proj_bomblet', 0, 32, 32, pr.miniSs || (pr.miniSpr ? .8 : .5)); }
    else { const wi = getImg('weapons/' + spr.slice(2) + '.webp'); const ss = pr.ss || 1; if (p.kind === 'timed') ctx.rotate(p.rot || 0); if (wi) ctx.drawImage(wi, -85 * ss, -64 * ss, 256 * ss, 128 * ss);
      if (p.kind === 'mine') { ctx.rotate(0); const on = p.armed ? (Math.floor(t / 4) % 2) : (Math.floor(t / 20) % 2); ctx.fillStyle = on ? '#ff3b2a' : '#5a1510'; ctx.beginPath(); ctx.arc(0, -9 * ss, 2.2, 0, 6.283); ctx.fill(); if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,40,.35)'; ctx.beginPath(); ctx.arc(0, -9 * ss, 8, 0, 6.283); ctx.fill(); } } }
    ctx.restore();
    if (p.kind === 'timed' && p.w.id.startsWith('16')) { ctx.save(); ctx.textAlign = 'center'; ctx.font = '800 15px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; const n = Math.ceil(p.fuse / 60); ctx.strokeText(n, p.x, p.y - 34); ctx.fillStyle = '#ffe08a'; ctx.fillText(n, p.x, p.y - 34); ctx.restore(); }
    return;
  }
  if (spr === 'cannonball') {   // iron cannonball (drawn in code, no sprite sheet)
    const s = pr.ss || 1; ctx.scale(s, s); const g = ctx.createRadialGradient(-2.5, -2.5, 1, 0, 0, 8); g.addColorStop(0, '#8a93a3'); g.addColorStop(.45, '#323946'); g.addColorStop(1, '#0d1016');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#05070a'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); return;
  }
  if (spr === 'grenade_shell') {   // launched 40mm grenade (drawn in code, no sprite sheet)
    const s = (pr.ss || 1) * 1.15; ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.scale(s, s);
    ctx.fillStyle = '#b8892f'; ctx.fillRect(-13, -5, 6, 10);            // brass base
    ctx.fillStyle = '#4d6b34'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(6, -6); ctx.quadraticCurveTo(17, -5, 18, 0); ctx.quadraticCurveTo(17, 5, 6, 6); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();  // olive body + rounded nose
    ctx.fillStyle = '#c9d08a'; ctx.fillRect(-3, -6, 3, 12);              // band
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-8, -5, 22, 2); // highlight
    ctx.strokeStyle = '#1b2a12'; ctx.lineWidth = 1.2; ctx.strokeRect(-13, -5, 6, 10);
    ctx.restore(); return;
  }
  if (spr.startsWith('cimg:')) {   // creature boss shot: 3D PNG that spins (axe, skull) or follows the flight path (spear, fire), optional glow halo
    const path = spr.slice(5), im = getImg(path), s = pr.ss || 1;
    if (!im) { loadImage(path).catch(() => { }); ctx.restore(); return; }
    if (pr.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55; const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, 34 * s); gr.addColorStop(0, pr.glow); gr.addColorStop(1, pr.glow + '00'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 34 * s, 0, 6.283); ctx.fill(); ctx.restore(); }
    if (pr.spin) { p.rot = (p.rot || 0) + pr.spin * (p.vx < 0 ? -1 : 1); ctx.rotate(p.rot); } else ctx.rotate(Math.atan2(p.vy, p.vx));
    if (pr.add) ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(im, -im.width / 2 * s, -im.height / 2 * s, im.width * s, im.height * s);
    ctx.restore(); return;
  }
  if (spr.startsWith('img:')) {   // boss rocket: 3D PNG art (assets/proj/B??_*_rocket.png), nose points along the flight path, flame behind it
    const path = spr.slice(4), im = getImg(path), s = pr.ss || .6; ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fr = (16 + Math.sin(p.age * .9) * 4) * s, fg = ctx.createRadialGradient(-50 * s, 0, 1, -50 * s, 0, fr * 2.4);
    fg.addColorStop(0, 'rgba(255,236,170,.95)'); fg.addColorStop(.4, 'rgba(255,140,40,.55)'); fg.addColorStop(1, 'rgba(255,60,10,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(-50 * s, 0, fr * 2.4, 0, 6.283); ctx.fill(); ctx.restore();
    if (im) ctx.drawImage(im, -64 * s, -32 * s, 128 * s, 64 * s); else loadImage(path).catch(() => { });
    ctx.restore(); return;
  }
  if (spr === 'divine') { drawDivineShot(ctx, p); return; }   // Divine Heal: winged orb
  if (spr === 'sig') { drawSigShot(ctx, pr.look, p, t, pr.ss || 1); ctx.restore(); return; }   // signature weapon shots (drawn in code)
  if (p.rotSpin) p.rot = (p.rot || 0) + p.rotSpin;
  const a = p.rotSpin ? p.rot : (pr.rot || spr.startsWith('proj_bolt') || spr.startsWith('proj_bullet') || spr.startsWith('proj_ice') || spr.startsWith('proj_missile') || spr.startsWith('proj_rocket')) ? Math.atan2(p.vy, p.vx) : 0; ctx.rotate(a);
  const an = PROJ_ANCHOR[spr] || [32, 32], d = Assets.fx[spr]; if (ADDITIVE[spr]) ctx.globalCompositeOperation = 'lighter';
  drawSpriteSheet(ctx, spr, Math.floor(p.age * (d ? d.fps : 16) / 60), an[0], an[1], pr.ss || 1);
  ctx.restore();
}
function drawFx(ctx, f) {
  const d = f.d, im = getImg(d.file); if (!im) return; const fr = Math.min(d.frames - 1, Math.floor(f.t * d.fps / 60));
  ctx.save(); ctx.translate(f.x, f.y); if (f.rot) ctx.rotate(f.rot); if (f.flip) ctx.scale(-1, 1); if (ADDITIVE[f.name]) ctx.globalCompositeOperation = 'lighter'; if (f.alpha) ctx.globalAlpha = f.alpha * (1 - fr / d.frames);
  const s = f.scale; ctx.drawImage(im, (fr % d.cols) * d.fw, Math.floor(fr / d.cols) * d.fh, d.fw, d.fh, -d.fw * s / 2, -d.fh * s / 2, d.fw * s, d.fh * s); ctx.restore();
}
function drawBeam(ctx, b) {
  const u = b.t / b.life, a = 1 - u; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let pts = [[b.x1, b.y1], [b.x2, b.y2]];
  if (b.kind === 'bolt') { const L = dist(b.x1, b.y1, b.x2, b.y2), n = Math.max(2, Math.ceil(L / 14)), nx = -(b.y2 - b.y1) / (L || 1), ny = (b.x2 - b.x1) / (L || 1), r = mulberry(b.t * 977 + Math.floor(b.x1) + Math.floor(b.y2)); pts = []; for (let i = 0; i <= n; i++) { const o = (i === 0 || i === n) ? 0 : (r() - .5) * 26; pts.push([lerp(b.x1, b.x2, i / n) + nx * o, lerp(b.y1, b.y2, i / n) + ny * o]); } }
  const path = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };
  ctx.globalAlpha = a * .45; ctx.strokeStyle = b.c2; ctx.lineWidth = b.w * 3.2 * (1 - u * .4) + 4; path(); ctx.stroke();
  ctx.globalAlpha = a * .85; ctx.strokeStyle = b.c2; ctx.lineWidth = b.w * 1.6 * (1 - u * .5) + 1.5; path(); ctx.stroke();
  ctx.globalAlpha = a; ctx.strokeStyle = b.c1; ctx.lineWidth = Math.max(1.5, b.w * .6 * (1 - u)); path(); ctx.stroke(); ctx.restore();
}
function drawCrate(ctx, c, t) {
  const im = getImg('proj/crate_' + c.type + '.webp') || null; const spr = Assets.fx['crate_' + c.type]; ctx.save(); ctx.translate(c.x, c.y);
  if (!c.landed) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-12, -38); ctx.lineTo(-30, -72); ctx.moveTo(12, -38); ctx.lineTo(30, -72); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -80, 38, 24, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = c.type === 'health' ? '#5be37a' : '#ffb347'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.ellipse(i * 14, -80, 12, 22, 0, Math.PI, 0); ctx.fill(); } }
  if (spr) { const imm = getImg(spr.file) || (Assets.img[spr.file] ? null : null); if (imm) ctx.drawImage(imm, -30, -62, 60, 67.5); }
  ctx.restore();
}
function renderGame(ctx, W, H) {
  const t = G.frame, c = G.cam, z = (H / 600) * c.mul * (W < 700 ? .85 : 1);
  const EM = G.terrain && G.terrain.under ? EDGE_EXT - 20 : 120;   // Adventure: the camera can follow a robot onto the ground beside the map
  let cx = clamp(c.x, W / 2 / z - EM, WORLD_W - W / 2 / z + EM), cy = clamp(c.y, H / 2 / z - 380, WORLD_H - H / 2 / z + 90);
  if (W / z > WORLD_W + 240) cx = WORLD_W / 2; const sk = c.shake; const shx = (Math.random() - .5) * sk, shy = (Math.random() - .5) * sk;
  VIEW = { z, cx, cy, W, H };
  drawBackground(ctx, W, H, G.theme, cx, cy, z);
  ctx.save(); ctx.translate(W / 2 - cx * z + shx, H / 2 - cy * z + shy); ctx.scale(z, z);
  if (G.terrain.under) ctx.drawImage(G.terrain.under, -G.terrain.underX, 0);   // Adventure: ground under / beside the map
  ctx.drawImage(G.terrain.canvas, 0, 0);
  for (const cr of G.crates) drawCrate(ctx, cr, t);
  for (const p of G.projs) if (p.kind === 'mine' || p.kind === 'timed') drawProj(ctx, p, t);
  for (const w of G.worms) drawWorm(ctx, w, w === G.activeWorm || !!(G.swarm && w.minion && G.swarm.includes(w) && !w.done), t);
  for (const p of G.projs) if (p.kind !== 'mine' && p.kind !== 'timed') drawProj(ctx, p, t);
  for (const b of G.beams) drawBeam(ctx, b);
  for (const f of G.fxs) drawFx(ctx, f);
  if (G.rings && G.rings.length) {   // shockwave rings of the boss specials (earthquake / roar)
    for (const rg of G.rings) { rg.age++; if (rg.age <= 0) continue; const a = 1 - rg.age / 26; if (a <= 0) continue; ctx.save(); ctx.globalAlpha = a * .85; ctx.strokeStyle = rg.col; ctx.lineWidth = 10 * a + 2; ctx.beginPath(); ctx.ellipse(rg.x, rg.y, rg.age * 26, rg.age * 7 + 6, 0, 0, 6.283); ctx.stroke(); ctx.restore(); }
    G.rings = G.rings.filter(rg => rg.age < 26);
  }
  if (G.waves && G.waves.length) {   // minotaur shockwave: a glowing crest with a trail of rock spikes rising out of the floor
    for (const wv of G.waves) {
      ctx.save(); ctx.translate(wv.x, wv.y); ctx.scale(wv.dir, 1);
      for (let i = 11; i >= 0; i--) {   // spikes behind the crest, older = lower and fainter
        const bx = -i * 17, h = (86 - i * 6.4) * (.78 + .22 * Math.sin(G.frame / 2 + i * 1.7)), a = 1 - i / 12;
        ctx.globalAlpha = a * .9; const g = ctx.createLinearGradient(0, 0, 0, -h); g.addColorStop(0, '#6b4a2a'); g.addColorStop(.6, '#c99a5b'); g.addColorStop(1, '#ffe2a8');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - 15, 2); ctx.lineTo(bx - 3 + (i % 2) * 4, -h); ctx.lineTo(bx + 15, 2); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = .9; const gl = ctx.createRadialGradient(8, -34, 4, 8, -34, 70); gl.addColorStop(0, 'rgba(255,240,200,.95)'); gl.addColorStop(.5, 'rgba(255,176,70,.55)'); gl.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(8, -34, 46, 70, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(26, -50, 4, -92); ctx.stroke();
      ctx.restore();
    }
  }
  if (typeof BOSS3 !== 'undefined') BOSS3.draw(ctx);   // lightning / thunder / floor flames of the HEROIC third bosses
  for (const p of G.parts) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, (p.life - p.t) / 15); ctx.fillStyle = Array.isArray(p.col) ? `rgb(${p.col[0]},${p.col[1]},${p.col[2]})` : p.col; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); }
  // teleport target preview (world space, inside the camera transform)
  if (G.teleHover && G.mode === 'play' && G.phase === 'aim' && curWeapon().type === 'teleport') {
    const h = G.teleHover, w = G.activeWorm; ctx.save(); ctx.globalAlpha = .5 + Math.sin(t / 6) * .15;
    if (h.spot) { const ox = w.x, oy = w.y; w.x = h.spot[0]; w.y = h.spot[1]; drawWorm(ctx, w, false, t); w.x = ox; w.y = oy; }
    ctx.globalAlpha = 1; ctx.strokeStyle = h.spot ? '#d9a5ff' : '#ff7a6a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(h.x, h.y, 16, 0, 6.283); ctx.stroke();
    if (h.spot) { ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.spot[0], h.spot[1]); ctx.stroke(); }
    ctx.restore();
  }
  // aiming reticle and power trail
  const w = G.activeWorm;
  if (w && G.mode === 'play' && G.phase === 'aim' && w.state === 'ground' && w.frozen <= 0 && !curTeam().cpu) {
    const wd = curWeapon(), [mx, my] = muzzleWorld(w, wd), d = aimDir(w), col = curTeam().color;
    const rx = mx + d[0] * 110, ry = my + d[1] * 110; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(rx, ry, 9, 0, 6.283); ctx.moveTo(rx - 14, ry); ctx.lineTo(rx - 5, ry); ctx.moveTo(rx + 5, ry); ctx.lineTo(rx + 14, ry); ctx.moveTo(rx, ry - 14); ctx.lineTo(rx, ry - 5); ctx.moveTo(rx, ry + 5); ctx.lineTo(rx, ry + 14); ctx.stroke(); ctx.restore();
    if (G.charging) { const n = 14; for (let i = 1; i <= n; i++) { const u = i / n; if (u > G.charge) break; const dd = 26 + u * 90; ctx.fillStyle = `hsl(${120 - u * 120},95%,58%)`; ctx.beginPath(); ctx.arc(mx + d[0] * dd, my + d[1] * dd, 2.5 + u * 3.2, 0, 6.283); ctx.fill(); } }
  }
  // aim arrow: always points along the current aim angle, with the degrees at its tip
  if (w && G.mode === 'play' && G.phase === 'aim' && w.state === 'ground' && w.frozen <= 0 && !curTeam().cpu) {
    const [mx, my] = muzzleWorld(w, curWeapon()), d = aimDir(w), deg = Math.round(w.aim), L = 95, ex = mx + d[0] * L, ey = my + d[1] * L, ang = Math.atan2(d[1], d[0]), txt = (deg > 0 ? '+' : '') + deg + '°';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (G.angT > 0) { ctx.globalAlpha = Math.min(1, G.angT / 20) * .6; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(w.x, my); ctx.lineTo(w.x + w.face * 120, my); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(mx + d[0] * 26, my + d[1] * 26); ctx.lineTo(ex, ey); ctx.stroke();
    const head = (c, s) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(ex + Math.cos(ang) * (14 + s), ey + Math.sin(ang) * (14 + s)); ctx.lineTo(ex + Math.cos(ang + 2.5) * (14 + s), ey + Math.sin(ang + 2.5) * (14 + s)); ctx.lineTo(ex + Math.cos(ang - 2.5) * (14 + s), ey + Math.sin(ang - 2.5) * (14 + s)); ctx.closePath(); ctx.fill(); };
    head('rgba(0,0,0,.65)', 3); ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(mx + d[0] * 26, my + d[1] * 26); ctx.lineTo(ex, ey); ctx.stroke(); head('#ffe08a', 0);
    const tx = ex + d[0] * 34, ty = ey + d[1] * 26 + 6; ctx.font = '800 20px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(txt, tx, ty); ctx.fillStyle = '#fff'; ctx.fillText(txt, tx, ty); ctx.restore();
  }
  for (const p of G.pops) { const u = p.t / 70; ctx.save(); ctx.globalAlpha = 1 - u * u; ctx.textAlign = 'center'; ctx.font = `800 ${p.size}px system-ui,sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(p.text, p.x, p.y - u * 42); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y - u * 42); ctx.restore(); }
  drawWater(ctx, t, G.theme);
  ctx.restore();
}
function renderMenuBG(ctx, W, H, t) {   // unique animated menu scene: neon space outpost
  ctx.save(); const hz = H * .66, TAU = 6.2832;
  let s = 1234; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // sky
  let g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#04051a'); g.addColorStop(.5, '#10103e'); g.addColorStop(.82, '#4b1a70'); g.addColorStop(1, '#ff4f9a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 2);
  // twinkling stars
  for (let i = 0; i < 150; i++) {
    const x = R() * W, y = R() * hz * .88, r = R() * 1.5 + .4, tw = .5 + .5 * Math.sin(t * .05 + i * 1.7);
    ctx.globalAlpha = (.25 + .75 * tw) * (1 - y / hz * .65); ctx.fillStyle = i % 7 === 0 ? '#9fe8ff' : '#ffffff'; ctx.fillRect(x, y, r, r);
  }
  ctx.globalAlpha = 1;
  // aurora ribbons
  ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  const cols = ['#27ffb0', '#35b8ff', '#c46bff'];
  for (let k = 0; k < 3; k++) {
    const base = H * (.2 + k * .07), amp = H * (.035 + k * .01), f = .004 + k * .0016, sp = .012 + k * .006;
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 18) { const y = base + Math.sin(x * f + t * sp + k * 2) * amp + Math.sin(x * f * 2.3 - t * sp * 1.4) * amp * .4; x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = cols[k]; ctx.globalAlpha = pass ? .22 : .07; ctx.lineWidth = pass ? H * .012 : H * .06; ctx.stroke();
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // shooting star
  const sk = (t % 460) / 460;
  if (sk < .1) { const u = sk / .1, x = W * (.15 + u * .35), y = H * (.06 + u * .22); const tg = ctx.createLinearGradient(x - 90, y - 45, x, y); tg.addColorStop(0, 'rgba(255,255,255,0)'); tg.addColorStop(1, 'rgba(255,255,255,' + (1 - u) + ')'); ctx.strokeStyle = tg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 90, y - 45); ctx.lineTo(x, y); ctx.stroke(); }
  // ringed planet
  const px = W * .8, py = H * .3, pr = H * .14;
  let pg = ctx.createRadialGradient(px, py, pr * .8, px, py, pr * 2.6); pg.addColorStop(0, 'rgba(90,200,255,.35)'); pg.addColorStop(1, 'rgba(90,200,255,0)'); ctx.fillStyle = pg; ctx.fillRect(px - pr * 3, py - pr * 3, pr * 6, pr * 6);
  const ring = (a0, a1, w) => { ctx.save(); ctx.translate(px, py); ctx.rotate(-.38); ctx.scale(1, .26); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, pr * 1.85, a0, a1); ctx.stroke(); ctx.restore(); };
  ctx.strokeStyle = 'rgba(255,190,120,.55)'; ring(Math.PI, TAU, pr * .22);
  let bg = ctx.createRadialGradient(px - pr * .4, py - pr * .45, pr * .1, px, py, pr); bg.addColorStop(0, '#8fe9ff'); bg.addColorStop(.5, '#3b49c8'); bg.addColorStop(1, '#0c0b3a');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.1)';
  for (let b = -3; b <= 3; b++) ctx.fillRect(px - pr, py + b * pr * .26 + Math.sin(t * .01 + b) * 3, pr * 2, pr * .09);
  ctx.fillStyle = 'rgba(0,0,20,.45)'; ctx.beginPath(); ctx.arc(px + pr * .5, py + pr * .35, pr * 1.05, 0, TAU); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,200,130,.85)'; ring(0, Math.PI, pr * .22);
  // little moon orbiting the planet
  const ma = t * .008, mx = px + Math.cos(ma) * pr * 2.6, my = py + Math.sin(ma) * pr * .75 - pr * .2;
  ctx.fillStyle = '#d9dcff'; ctx.beginPath(); ctx.arc(mx, my, pr * .13, 0, TAU); ctx.fill();
  // horizon glow
  let hg = ctx.createLinearGradient(0, hz - H * .12, 0, hz + 4); hg.addColorStop(0, 'rgba(255,79,154,0)'); hg.addColorStop(1, 'rgba(255,120,190,.55)'); ctx.fillStyle = hg; ctx.fillRect(0, hz - H * .12, W, H * .12 + 4);
  // crystal spires (two parallax layers)
  const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  for (let L = 0; L < 2; L++) {
    const step = W / (L ? 9 : 12), N = Math.ceil(W / step) + 3, off = (t * (L ? .45 : .2)) % (step * N);
    ctx.fillStyle = L ? '#0a0722' : '#1b1056'; ctx.strokeStyle = L ? 'rgba(80,240,255,.55)' : 'rgba(200,110,255,.35)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < N; i++) {
      let x = i * step - off; while (x < -step * 2) x += step * N; if (x > W + step) continue;
      const h = H * (L ? .1 : .075) * (.5 + hash(i + L * 50) * 1.3), w = step * (.35 + hash(i + 9) * .3);
      ctx.beginPath(); ctx.moveTo(x - w, hz + 3); ctx.lineTo(x - w * .35, hz - h * .7); ctx.lineTo(x + w * .05, hz - h); ctx.lineTo(x + w * .45, hz - h * .62); ctx.lineTo(x + w, hz + 3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - w * .35, hz - h * .7); ctx.lineTo(x + w * .05, hz - h); ctx.lineTo(x + w * .45, hz - h * .62); ctx.stroke();
    }
  }
  // ground + neon perspective grid
  let gg = ctx.createLinearGradient(0, hz, 0, H); gg.addColorStop(0, '#1a0838'); gg.addColorStop(1, '#05030f'); ctx.fillStyle = gg; ctx.fillRect(0, hz, W, H - hz);
  ctx.lineWidth = 1.5; const vx = W / 2, GN = 12, fl = (t * .012) % 1;
  for (let j = 0; j < GN; j++) { const k = (j + fl) / GN, y = hz + (H - hz) * k * k; ctx.strokeStyle = 'rgba(255,70,200,' + (.15 + .55 * k) + ')'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let i = -14; i <= 14; i++) { ctx.strokeStyle = 'rgba(60,220,255,' + (.18 + .3 * (1 - Math.abs(i) / 15)) + ')'; ctx.beginPath(); ctx.moveTo(vx + i * W * .02, hz); ctx.lineTo(vx + i * W * .2, H); ctx.stroke(); }
  // vignette
  let vg = ctx.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, H * 1.1); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
