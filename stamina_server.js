// ---- STAMINA: thin green bar under the JUMP button (touch screens) ----
// Walking drains it slowly, JUMP / FLIP cost a chunk, it refills while you stand still and is full again at the start of every turn.
// Only human players use stamina (bots / CPU are untouched). Set STAM_GATE = false to show the bar without blocking moves.
(function () {
  const STAM_MAX = 100, STAM_WALK = 0.12, STAM_JUMP = 12, STAM_FLIP = 18, STAM_REGEN = 0.35, STAM_GATE = true;
  const human = w => { try { const t = w && G.teams[w.team]; return !!(t && !t.cpu); } catch (e) { return false; } };
  const st = w => { if (w.stam == null) w.stam = STAM_MAX; return w.stam; };

  // --- wrap movement ---
  const _walk = window.walkWorm, _jump = window.jumpWorm;
  if (typeof _walk === 'function') window.walkWorm = function (w, dir) {
    if (human(w)) { if (STAM_GATE && st(w) <= 0) return; w.stam = Math.max(0, st(w) - STAM_WALK); w.stamIdle = 0; }
    return _walk.apply(this, arguments);
  };
  if (typeof _jump === 'function') window.jumpWorm = function (w, back) {
    if (human(w)) {
      const c = back ? STAM_FLIP : STAM_JUMP;
      if (w.state === 'ground' && !(w.frozen > 0)) { if (STAM_GATE && st(w) < c) return; w.stam = Math.max(0, st(w) - c); w.stamIdle = 0; }
    }
    return _jump.apply(this, arguments);
  };
  // new turn = full stamina
  const _start = window.startTurn;
  if (typeof _start === 'function') window.startTurn = function () { const r = _start.apply(this, arguments); try { if (G.activeWorm) G.activeWorm.stam = STAM_MAX; } catch (e) {} return r; };

  // --- the bar: sits right under the JUMP button, the button itself is not moved ---
  const css = document.createElement('style');
  css.textContent = '#stamBar{position:absolute;pointer-events:none;width:50px;height:6px;border-radius:4px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.45);overflow:hidden;box-sizing:border-box}' +
    '#stamBar i{display:block;height:100%;width:100%;background:repeating-linear-gradient(135deg,#3dff4f 0 4px,#0fa81f 4px 8px);transition:width .08s linear}' +
    '#stamBar.low i{background:repeating-linear-gradient(135deg,#ffb347 0 4px,#c46a00 4px 8px)}' +
    '#stamBar.out i{background:#ff4a3d}';
  document.head.appendChild(css);
  let bar = null, fill = null;
  function build() {
    const t = document.getElementById('touch'); if (!t) return false;
    bar = document.createElement('div'); bar.id = 'stamBar'; bar.innerHTML = '<i></i>';
    // same right offset as JUMP; bottom 31px = just under the button (button bottom is 40px, so nothing moves)
    bar.style.right = 'calc(max(14px,env(safe-area-inset-right,0px)) + 104px)';
    bar.style.bottom = 'calc(31px + env(safe-area-inset-bottom,0px))';
    t.appendChild(bar); fill = bar.firstChild; return true;
  }
  function tick() {
    try {
      if (!bar && !build()) { requestAnimationFrame(tick); return; }
      const w = G && G.activeWorm;
      if (w && human(w)) {
        const v = st(w);
        if (w.walking > 0 || w.state !== 'ground') w.stamIdle = 0; else w.stamIdle = (w.stamIdle | 0) + 1;
        if (w.stamIdle > 20 && w.stam < STAM_MAX) w.stam = Math.min(STAM_MAX, w.stam + STAM_REGEN);
        const p = Math.max(0, Math.min(100, v / STAM_MAX * 100));
        fill.style.width = p + '%'; bar.classList.toggle('low', p < 30 && p > 0); bar.classList.toggle('out', p <= 0);
      }
    } catch (e) {}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
