/* ONLINE VERSION of pow.js - upload this file to GitHub (online game only).
   The offline app keeps using pow.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  POW  (like DDTank)
//   - A POW meter (assets/pow/pow_btn_empty.png + pow_btn_full.png) sits above the FIRE button.
//   - Every turn the player uses (shot or Fly) it fills a little. Every time one of the player's robots is hit it fills faster, depending on the damage taken.
//   - When it is 100% the button pulses and glows. Tap it: the robot gets the POW icon on top of its head + a flaming aura (tap again to cancel).
//   - Then FIRE: the camera zooms in on the robot, the screen darkens, focus lines + "POW!" play, and the shot leaves with +50% damage (1000 -> 1500)
//     and a power aura around the projectile (assets/pow/pow_aura.png). The meter goes back to 0.
//   Also in this file:  Fly now ENDS the turn when the robot lands,  and the countdown after a shot is gone (RETREAT_TIME = 0 in core.js, number hidden here).
//   Works for the player's teams in Adventure and in normal matches. Enemies / bosses / CPU never use POW.
//   world.js hurt() calls POW.mod (the +50%) and POW.onHit (the meter filling).
// ============================================================================================================
const POW = (function () {
  'use strict';
  // ---------- TUNE HERE ----------
  const PW_FULL = 100;            // meter size
  const PW_PER_TURN = 10;         // % gained every time the player uses a turn (a shot, or a Fly)
  const PW_HIT_K = 1.6;           // % gained per 1% of the robot's max health lost (a hit for 10% of max health = +16%)
  const PW_HIT_MIN = 3, PW_HIT_MAX = 30;   // a hit always gives at least 3% and at most 30%
  const PW_DMG_MUL = 1.5;         // +50% damage on the POW shot (applied to the FINAL damage, after crit and defense)
  const PW_ADVENTURE_ONLY = false;   // true = POW only exists in Adventure
  const PW_CINE = 56;             // frames of the camera focus before the POW shot leaves (60 = 1 second)
  const PW_ZOOM = 1.6;            // how much the camera zooms in on the robot during that focus
  // -------------------------------
  const IMG = { aura: 'pow/pow_aura.png', icon: 'pow/pow_icon.png' };
  for (const k in IMG) { try { loadImage(IMG[k]).catch(() => { }); } catch (e) { } }
  // release burst sheet: 8 frames, 4 columns, 256x256 (registered like the other effect sheets, core.js preloads it)
  const BURST = { file: 'pow/pow_burst.png', frames: 8, cols: 4, fw: 256, fh: 256, fps: 22, loop: false };
  if (typeof DIVINE_FX !== 'undefined') DIVINE_FX.pow_burst = BURST;
  if (typeof Assets !== 'undefined' && Assets.fx) Assets.fx.pow_burst = BURST;
  if (typeof ADDITIVE !== 'undefined') ADDITIVE.pow_burst = 1;
  try { loadImage(BURST.file).catch(() => { }); } catch (e) { }

  const ease = u => u * u * (3 - 2 * u), eo = u => 1 - (1 - u) * (1 - u);
  const humanTeam = () => { const c = curTeam(); if (c && !c.cpu) return c; return (G.teams || []).find(t => !t.cpu) || null; };
  const on = () => G.mode === 'play' && (!PW_ADVENTURE_ONLY || G.adv);
  const val = t => Math.max(0, Math.min(PW_FULL, (t && t.pow) || 0));
  const isFull = t => val(t) >= PW_FULL;

  function gain(t, amt) {
    if (!t || t.cpu || !on()) return;
    const was = val(t); t.pow = Math.min(PW_FULL, was + amt);
    if (t.pow >= PW_FULL && was < PW_FULL) {
      const w = G.activeWorm && G.activeWorm.team === t.idx ? G.activeWorm : G.worms.find(x => x.team === t.idx && x.state !== 'dead' && x.state !== 'drown');
      if (w) addPop(w.x, w.y - 118 * (w.sc || 1), 'POW READY!', '#ffd24a', 24);
      Snd.play('powready');
    }
  }

  // ---------- damage hooks (called from world.js hurt) ----------
  function mod(w, dmg, opt) {
    if (!G.powShot || (opt && opt.fall)) return dmg;
    const at = G.activeWorm; if (!at || at.team !== G.powTeam || w.team === G.powTeam) return dmg;   // only the shooter's team deals the bonus, only to the other side
    const out = Math.max(1, Math.round(dmg * PW_DMG_MUL));
    if (w._powPop == null || G.frame - w._powPop > 30) { w._powPop = G.frame; addPop(w.x, w.y - 82 * (w.sc || 1) - 26, 'POW +' + Math.round((PW_DMG_MUL - 1) * 100) + '%', '#ff7a1a', 16); }
    return out;
  }
  function onHit(w, dmg, opt) {
    if (opt && opt.fall) return; const t = G.teams[w.team]; if (!t || t.cpu || !on() || dmg <= 0) return;
    gain(t, Math.max(PW_HIT_MIN, Math.min(PW_HIT_MAX, dmg / (w.maxHp || 100) * 100 * PW_HIT_K)));
  }

  // ---------- sounds ----------
  const _sp = Snd.play.bind(Snd);
  Snd.play = function (n, a) {
    if (n === 'powready') { if (!this.ctx || this.muted) return; [523, 784, 1047, 1568].forEach((f, i) => this.tone('triangle', f, f * 1.02, .22, .2, i * .07)); this.tone('sine', 262, 1047, .4, .12); return; }
    if (n === 'powon') { if (!this.ctx || this.muted) return; this.tone('sawtooth', 220, 880, .25, .16); this.tone('sine', 660, 1320, .3, .14, .05); return; }
    if (n === 'powcharge') { if (!this.ctx || this.muted) return; this.tone('sawtooth', 90, 700, .9, .2); this.tone('sine', 180, 1400, .9, .12); this.noise(.9, .16, 'bandpass', 400, 3200); return; }
    if (n === 'powgo') { if (!this.ctx || this.muted) return; this.noise(.5, .5, 'lowpass', 3000, 120); this.tone('sine', 140, 40, .5, .5); this.tone('square', 900, 200, .25, .18); return; }
    return _sp(n, a);
  };

  // ---------- HUD button ----------
  const css = document.createElement('style'); css.textContent = `
#powbtn{position:absolute;pointer-events:auto;touch-action:none;width:60px;height:60px;padding:0;border:0;background:none;cursor:pointer;
  right:calc(max(14px,env(safe-area-inset-right,0px)) + 16px);bottom:calc(138px + env(safe-area-inset-bottom,0px));-webkit-tap-highlight-color:transparent}
@media (orientation:landscape) and (max-height:520px){#powbtn{bottom:calc(122px + env(safe-area-inset-bottom,0px))}}
#powbtn[hidden]{display:none}
#powbtn .pw{position:absolute;inset:0;transform-origin:50% 55%}
#powbtn img{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;-webkit-user-drag:none}
#powbtn .f{clip-path:inset(calc(100% - var(--p,0%)) 0 0 0);transition:clip-path .35s ease-out}
#powbtn small{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);font:800 11px var(--body,system-ui);letter-spacing:1px;color:#ffe08a;text-shadow:0 1px 3px #000,0 0 6px #000;white-space:nowrap;pointer-events:none}
#powbtn.dis{opacity:.5}
#powbtn.bump .pw{animation:pwbump .35s ease-out}
@keyframes pwbump{0%{transform:scale(1)}40%{transform:scale(1.16)}100%{transform:scale(1)}}
#powbtn.rdy .pw{animation:pwpulse .55s ease-in-out infinite alternate}
@keyframes pwpulse{from{transform:scale(1);filter:drop-shadow(0 0 4px #ffb02e)}to{transform:scale(1.14);filter:drop-shadow(0 0 16px #ffd24a) brightness(1.15)}}
#powbtn.rdy::before,#powbtn.armed::before{content:"";position:absolute;inset:-9px;border-radius:50%;pointer-events:none;
  background:conic-gradient(from 0deg,rgba(255,210,70,0) 0deg,rgba(255,210,70,.95) 70deg,rgba(255,210,70,0) 140deg,rgba(255,120,30,0) 200deg,rgba(255,150,40,.8) 270deg,rgba(255,150,40,0) 340deg);
  -webkit-mask:radial-gradient(circle,transparent 58%,#000 60%,#000 70%,transparent 72%);mask:radial-gradient(circle,transparent 58%,#000 60%,#000 70%,transparent 72%);animation:pwspin .9s linear infinite}
@keyframes pwspin{to{transform:rotate(360deg)}}
#powbtn.armed .pw{animation:pwarm .3s ease-in-out infinite alternate}
@keyframes pwarm{from{transform:scale(1.06);filter:drop-shadow(0 0 10px #ff7a1a) brightness(1.1)}to{transform:scale(1.2);filter:drop-shadow(0 0 22px #ffd24a) brightness(1.3)}}
#powbtn.armed small{color:#fff;font-size:12px}
@media (prefers-reduced-motion:reduce){#powbtn .pw,#powbtn::before{animation:none!important}}
`; document.head.appendChild(css);
  const btn = document.createElement('button'); btn.id = 'powbtn'; btn.type = 'button'; btn.hidden = true; btn.setAttribute('aria-label', 'POW');
  btn.innerHTML = '<div class="pw"><img class="e" src="assets/pow/pow_btn_empty.png" alt="" draggable="false"><img class="f" src="assets/pow/pow_btn_full.png" alt="" draggable="false"></div><small>0%</small>';
  document.getElementById('hud').appendChild(btn);
  const lab = btn.querySelector('small'); let lastV = -1;

  const canArm = () => { const t = curTeam(); return on() && !!t && !t.cpu && !G.swarm && G.phase === 'aim' && !G.charging && !G.flyMode && !UI.paused && isFull(t) && G.activeWorm && G.activeWorm.state === 'ground' && G.activeWorm.frozen <= 0 && !G.powCine; };
  function click(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); } Snd.init();
    if (G.powCine) return;
    if (G.powArmed) { G.powArmed = false; Snd.play('beep'); return; }   // tap again = cancel
    if (canArm()) { G.powArmed = true; Snd.play('powon'); const w = G.activeWorm; addFx('pow_burst', w.x, w.y - 45 * (w.sc || 1), .55 * (w.sc || 1)); } else Snd.play('dud');
  }
  btn.addEventListener('pointerdown', e => { e.stopPropagation(); });
  btn.addEventListener('click', click);
  addEventListener('keydown', e => { if (e.code === 'KeyP' && !e.repeat && (G.mode === 'play')) click(); });

  function hud() {
    const t = on() ? humanTeam() : null; btn.hidden = !t;
    if (!t) return;
    const v = val(t), pct = Math.floor(v);
    if (G.flyMode && G.powArmed) G.powArmed = false;   // Fly selected: POW only works with a shot
    if (v > lastV && lastV >= 0) { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
    lastV = v;
    btn.style.setProperty('--p', pct + '%');
    const full = v >= PW_FULL, mine = curTeam() === t && !t.cpu, armed = !!G.powArmed && mine;
    btn.classList.toggle('rdy', full && !armed); btn.classList.toggle('armed', armed);
    btn.classList.toggle('dis', !mine || G.phase !== 'aim' && !G.powCine);
    lab.textContent = armed ? 'POW ON' : full ? 'READY!' : pct + '%';
  }

  // ---------- turn flow ----------
  let _sf, _lf, _st, _ug, _rg, _dw, _dp, _spn;
  // new turn: everything POW related is cleared (the meter itself stays)
  _st = startTurn; startTurn = function () { G.powArmed = false; G.powShot = false; G.powTeam = -1; G.powCine = null; G.flyEnd = false; return _st.apply(this, arguments); };

  // a shot: with POW armed + full meter it goes through the camera focus first
  _sf = startFire;
  startFire = function (power) {
    if (G.powCine) return;
    const w = G.activeWorm, t = curTeam();
    if (!w || !t || t.cpu || !canFire()) return _sf.apply(this, arguments);
    const wd = curWeapon();
    if (G.powArmed && isFull(t) && on() && !wd.heal && wd.type !== 'teleport' && ammoOf(t, wd) > 0) { beginCine(power, t, w); return; }
    const ph = G.phase; _sf.apply(this, arguments);
    if (ph === 'aim' && G.phase !== 'aim') gain(t, PW_PER_TURN);   // the shot really left: a little POW
  };
  function beginCine(power, t, w) {
    G.powCine = { t: 0, power, w, team: t.idx, mul0: G.cam.mul };
    G.phase = 'powcine'; G.charging = false; G.charge = 0; G.cam.free = false; G.angT = 0;
    Snd.play('powcharge');
  }
  function endCine(fired) { G.powCine = null; }
  function release() {
    const C = G.powCine, t = G.teams[C.team], w = C.w; G.powCine = null; G.phase = 'aim';
    G.powShot = true; G.powTeam = C.team;
    _sf.call(null, C.power);
    if (G.phase === 'aim') { G.powShot = false; G.powTeam = -1; G.cam.mul = C.mul0; return; }   // could not shoot after all: nothing is spent, the player can try again
    t.pow = 0; G.powArmed = false; G.powFlash = 1; G.powZoom = { from: G.cam.mul, to: C.mul0, t: 0 };
    let mx = w.x, my = w.y - 50 * (w.sc || 1); try { [mx, my] = muzzleWorld(w, curWeapon()); } catch (e) { }
    addFx('pow_burst', mx, my, 1.0 * (w.sc || 1)); Snd.play('powgo'); shake(9);
    addPop(w.x, w.y - 118 * (w.sc || 1), 'POW SHOT!', '#ff9a2a', 26);
  }

  // Fly: using it uses the turn. The robot flies, and the turn ends the moment it lands.
  _lf = launchFly;
  launchFly = function (w, power) {
    const t = curTeam(); _lf.apply(this, arguments);
    if (w.state === 'air') { gain(t, PW_PER_TURN); G.flyEnd = true; G.powArmed = false; G.phase = 'retreat'; G.timer = 60 * 20; }   // 'retreat' = no more aiming / shooting; 20 s safety only
  };

  // spawned projectiles of a POW shot get the aura
  _spn = spawnProj;
  spawnProj = function (o) { const p = _spn.apply(this, arguments); if (G.powShot && p.owner && p.owner.team === G.powTeam) p.pow = true; return p; };

  // per-frame: camera focus, fly end, zoom back
  _ug = updateGame;
  updateGame = function () {
    _ug.apply(this, arguments);
    if (G.mode !== 'play') return;
    const C = G.powCine;
    if (C) {
      const w = C.w;
      if (!w || w.state === 'dead' || w.state === 'drown') { G.powCine = null; G.phase = 'aim'; G.cam.mul = C.mul0; }
      else {
        C.t++; const c = G.cam; c.free = false;
        c.mul = C.mul0 + (Math.min(2.6, C.mul0 * PW_ZOOM) - C.mul0) * eo(Math.min(1, C.t / 24));
        c.x += (w.x - c.x) * .2; c.y += ((w.y - 56 * (w.sc || 1)) - c.y) * .2;
        c.shake = Math.max(c.shake, 1 + C.t / PW_CINE * 5);
        if (C.t >= PW_CINE) release();
      }
    }
    if (G.powZoom) { const Z = G.powZoom; Z.t++; G.cam.mul = Z.from + (Z.to - Z.from) * ease(Math.min(1, Z.t / 50)); if (Z.t >= 50) G.powZoom = null; }
    if (G.flyEnd) {
      const w = G.activeWorm;
      if (G.phase !== 'retreat') G.flyEnd = false;
      else if (!w || w.state !== 'air') { G.flyEnd = false; endTurnNow(); }   // landed (or died): the turn is over
    }
    if (G.powFlash > 0) G.powFlash = Math.max(0, G.powFlash - .06);
  };

  // no countdown number after a turn was used (also for CPU / bosses)
  const _uh = UI.hud;
  UI.hud = function () {
    const r = _uh.apply(this, arguments);
    if (G.phase === 'retreat' || G.phase === 'powcine') { const tm = document.getElementById('timer'); if (tm) { tm.textContent = '--'; tm.className = ''; } }
    hud(); return r;
  };

  // ---------- drawing ----------
  const auraImg = () => getImg(IMG.aura), iconImg = () => getImg(IMG.icon);
  function auraAt(ctx, x, y, size, t, a, rot) {   // one frame of the looping aura sheet, additive, centred on x,y (size = drawn width in px)
    const im = auraImg(); if (!im) return; const f = Math.floor(t * .35) % 8;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    ctx.drawImage(im, (f % 4) * 256, Math.floor(f / 4) * 256, 256, 256, -size / 2, -size / 2, size, size); ctx.restore();
  }
  // the armed robot: flaming aura + the POW icon on top of its head
  _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    _dw.apply(this, arguments);
    if (!(G.powArmed || G.powCine) || w !== G.activeWorm || w.state === 'dead' || w.state === 'drown') return;
    const sc = w.sc || 1, cx = w.x, cy = w.y - (w.flyOff || 0) - 44 * sc;
    if (!G.powCine) { auraAt(ctx, cx, cy, 215 * sc, t, .75, t * .03); auraAt(ctx, cx, cy, 160 * sc, t + 3, .55, -t * .045); }
    const ic = iconImg(); if (ic) { const bob = Math.sin(t / 7) * 4, pulse = 1 + Math.sin(t / 5) * .07, s = 46 * sc * pulse; ctx.save(); ctx.translate(w.x, w.y - 92 * sc - 70 * sc + bob); ctx.drawImage(ic, -s / 2, -s / 2, s, s); ctx.restore(); }
  };
  // the POW shot: power aura ring + glowing trail around the projectile
  _dp = drawProj;
  drawProj = function (ctx, p, t) {
    if (p.pow && !p.dead) {
      const tr = p._pt || (p._pt = []); if (!tr.length || Math.hypot(tr[tr.length - 1][0] - p.x, tr[tr.length - 1][1] - p.y) > 6) { tr.push([p.x, p.y]); if (tr.length > 16) tr.shift(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < tr.length; i++) { const u = (i + 1) / tr.length, r = 4 + u * 13; const g = ctx.createRadialGradient(tr[i][0], tr[i][1], 0, tr[i][0], tr[i][1], r); g.addColorStop(0, `rgba(255,${150 + u * 80 | 0},60,${.5 * u})`); g.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tr[i][0], tr[i][1], r, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
    _dp.apply(this, arguments);
    if (p.pow && !p.dead) { const k = Math.max(.8, Math.min(2.2, (p.p && p.p.ss) || 1)), s = 86 * Math.sqrt(k); auraAt(ctx, p.x, p.y, s, p.age + t, .95, p.age * .09); auraAt(ctx, p.x, p.y, s * .72, p.age + t + 4, .7, -p.age * .12); }
  };
  // focus screen: dark vignette, speed lines, big aura, POW! text, white flash on release
  _rg = renderGame;
  renderGame = function (ctx, W, H) {
    _rg.apply(this, arguments);
    const C = G.powCine;
    if (C && C.w) cineOverlay(ctx, W, H, C);
    if (G.powFlash > 0) { ctx.save(); ctx.globalAlpha = G.powFlash * .55; ctx.fillStyle = '#fff4cf'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  };
  function cineOverlay(ctx, W, H, C) {
    const u = Math.min(1, C.t / PW_CINE), w = C.w, sc = w.sc || 1;
    const sx = W / 2 + (w.x - VIEW.cx) * VIEW.z, sy = H / 2 + (w.y - (w.flyOff || 0) - 50 * sc - VIEW.cy) * VIEW.z;
    ctx.save();
    // vignette
    const vg = ctx.createRadialGradient(sx, sy, H * .12, sx, sy, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(10,0,20,0)'); vg.addColorStop(1, `rgba(10,0,20,${.78 * eo(Math.min(1, u * 2))})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // speed / focus lines (random every frame = a vibrating anime look)
    ctx.globalCompositeOperation = 'lighter'; const n = 46, r0 = H * .2, a0 = eo(Math.min(1, u * 2.5));
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * 6.283 + Math.random() * .12, len = H * (.35 + Math.random() * .6), rs = r0 + Math.random() * H * .08, wd = .014 + Math.random() * .022;
      const x1 = sx + Math.cos(ang) * rs, y1 = sy + Math.sin(ang) * rs, x2 = sx + Math.cos(ang) * (rs + len), y2 = sy + Math.sin(ang) * (rs + len);
      ctx.fillStyle = `rgba(255,${190 + Math.random() * 60 | 0},90,${a0 * (.28 + Math.random() * .3)})`;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 + Math.cos(ang + 1.57) * len * wd, y2 + Math.sin(ang + 1.57) * len * wd); ctx.lineTo(x2 - Math.cos(ang + 1.57) * len * wd, y2 - Math.sin(ang + 1.57) * len * wd); ctx.closePath(); ctx.fill();
    }
    // power aura growing around the robot
    const as = (150 + 120 * eo(u)) * sc * VIEW.z * 1.35, fr = G.frame;
    auraAt(ctx, sx, sy, as, fr, .9, fr * .05); auraAt(ctx, sx, sy, as * .7, fr + 3, .75, -fr * .07);
    const bu = Math.min(1, C.t / 20); if (bu < 1 && C.t > 0) { const im = getImg(BURST.file); if (im) { const f = Math.min(7, Math.floor(bu * 8)), s2 = as * 1.5; ctx.globalAlpha = .9; ctx.drawImage(im, (f % 4) * 256, Math.floor(f / 4) * 256, 256, 256, sx - s2 / 2, sy - s2 / 2, s2, s2); ctx.globalAlpha = 1; } }
    ctx.globalCompositeOperation = 'source-over';
    // POW! text: slams in with an overshoot, shakes, then holds
    if (C.t > 8) {
      const q = Math.min(1, (C.t - 8) / 12), sca = q < 1 ? (1 + (1 - q) * 1.6) : 1 + Math.sin(C.t * .6) * .03, fs = H * .17 * sca, shk = C.t < 22 ? 0 : (Math.random() - .5) * 5;
      ctx.translate(W / 2 + shk, H * .2 + shk); ctx.rotate(-.09); ctx.globalAlpha = Math.min(1, q * 1.6);
      ctx.font = `900 italic ${fs}px 'Russo One','Arial Black',Impact,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = fs * .16; ctx.strokeStyle = '#3a0a00'; ctx.strokeText('POW!', 0, 0);
      const g = ctx.createLinearGradient(0, -fs * .5, 0, fs * .5); g.addColorStop(0, '#fff6b0'); g.addColorStop(.5, '#ffb02e'); g.addColorStop(1, '#ff5a14');
      ctx.fillStyle = g; ctx.fillText('POW!', 0, 0);
    }
    ctx.restore();
    // white flash right before the shot leaves
    if (C.t > PW_CINE - 6) { ctx.save(); ctx.globalAlpha = (C.t - (PW_CINE - 6)) / 6 * .5; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }

  console.log('pow.js loaded - POW meter, Fly ends turn, no countdown after a shot');
  return { mod, onHit, gain, val, isFull };
})();
