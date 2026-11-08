/* ARENA FIGHT (client) - downloaded from GitHub by online_v2.js (startFight) when the VS screen of a match is shown.
   It plays the real battle of the game (the same engine as Play: world.js / weapons.js / pow.js ...) between the REAL players of the match, on the match's arena map.

   HOW THE TWO PHONES STAY TOGETHER (lockstep)
   - Both phones build the SAME battle: same map, same random seed (match.mapSeed), same robots + gear (every player sends his loadout, the server hands all loadouts to everybody at once).
   - While the engine runs a step, Math.random is replaced by one seeded generator (the same on every phone), so the battle plays out identically.
   - Only the player whose turn it is controls the battle. His keys (walk / aim / fire / jump), weapon choice, potion, POW, teleport and PASS are sent to the server
     tagged with the frame number ("events") plus "thr" = up to which frame his input is complete. The other phones feed those events into their own copy at exactly
     the same frame, and simply wait (shown as "Waiting for ...") if the data is late.
   - At every turn change the player whose turn just ended sends a small snapshot (positions, health, wind). The next player waits for it (max 1.5 s) and corrects himself
     if anything differs, so a tiny difference between two phones can never grow.
   - The end of the battle is decided by the engine itself on both phones (last team standing); the result is reported to the server.
   Server calls: only POST /api/arena/fight (see server.js: loading barrier, event relay, "over", "gone").
   Nothing of the offline game files is changed: the hooks below replace a few game functions while the fight runs and put them back when it ends. */
'use strict';
const ArenaFight = (() => {
  const $ = id => document.getElementById(id);
  const IN_KEYS = ['left', 'right', 'up', 'down', 'fire', 'fast'];
  const STATE_CODE = { ground: 0, air: 1, dead: 2, drown: 3 };
  const BUF = 18;                 // frames of input the watcher keeps in hand before it (re)starts after a wait (smooth play on slow phones)
  const POLL_MS = 140, POLL_FAST_MS = 70;
  const SNAP_WAIT_MS = 1500, STALL_GIVEUP_MS = 45000, LOST_MS = 30000;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let F = null;                   // the running fight (null = none)
  let H = null;                   // the game functions we replaced (to put them back)
  let _rand = null;               // the real Math.random

  // ---------- who controls what ----------
  const ownerOf = w => (w && F && F.members[w.team]) ? F.members[w.team][w.idx] : null;
  const myTurn = () => !!F && !!G.activeWorm && ownerOf(G.activeWorm) === F.me;
  const inputPhase = () => G.phase === 'aim' || G.phase === 'retreat';
  const sigNow = () => { const t = curTeam(); return t ? [t.sel | 0, t.prevSel == null ? -1 : t.prevSel | 0, G.flyMode ? 1 : 0, G.powArmed ? 1 : 0] : [0, -1, 0, 0]; };
  const sigSet = s => { const t = curTeam(); if (!t) return; t.sel = s[0]; t.prevSel = s[1] < 0 ? undefined : s[1]; G.flyMode = !!s[2]; G.powArmed = !!s[3]; };
  const sigEq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  const seeded = fn => { const r = Math.random; Math.random = F.rng; try { return fn(); } finally { Math.random = r; } };
  const push = ev => { ev.n = ++F.n; F.out.push(ev); };

  // ---------- the engine step ----------
  function stepOnline() {
    const f = F, ug = H && H.ug;
    if (!f || !f.live || f.ended || G.mode !== 'play') return ug.apply(this, arguments);
    trySnaps();
    const w = G.activeWorm, owner = ownerOf(w), inp = inputPhase(), mine = owner === f.me;
    // the new player waits for the snapshot of the player whose turn just ended
    if (f.snapWait && mine) {
      const sn = f.snaps.find(x => x.d[0] === f.snapWait.tc && x.f === G.frame);
      if (sn) { applySnap(sn); f.snaps.splice(f.snaps.indexOf(sn), 1); f.snapWait = null; }
      else if (Date.now() < f.snapWait.until) { markStall(null, 'sync'); return; }
      else f.snapWait = null;
    }
    let steer = null;
    if (w && inp && owner && !mine && !f.gone.has(owner)) {          // somebody else steers this turn
      const R = f.rem[owner]; steer = owner;
      if (R.wait) { if (R.thr - G.frame < BUF) { markStall(owner); return; } R.wait = false; }
      if (G.frame >= R.thr) { R.wait = true; markStall(owner); return; }
      if (!sigEq(sigNow(), f.post)) sigSet(f.post);                   // anything this phone changed on his behalf (keyboard P ...) is undone
      while (R.q.length && R.q[0].f <= G.frame) applyEv(R, R.q.shift());
      f.post = sigNow();
      for (let i = 0; i < IN_KEYS.length; i++) In[IN_KEYS[i]] = !!(R.bits & (1 << i));
      In.firePressed = !!(R.pulse & 1); if (R.pulse & 2) R.pj = true; if (R.pulse & 4) R.pfl = true; R.pulse = 0;
      In.jump = !!R.pj; In.flip = !!R.pfl; In.weaponMenu = false;
    } else if (w && inp && owner && mine) {                           // my turn: my keys become events
      steer = owner; sample();
    } else if (w && inp && owner && f.gone.has(owner)) {              // his phone is gone: nobody steers, the turn timer runs out
      for (const k of IN_KEYS) In[k] = false; In.firePressed = In.jump = In.flip = false;
    }
    f.stallSince = 0;
    { const self = this, args = arguments; seeded(() => ug.apply(self, args)); }   // the engine runs on the shared random numbers
    f.thr = G.frame;
    if (steer === f.me) { f.pj = !!In.jump; f.pfl = !!In.flip; } else if (steer && f.rem[steer]) { f.rem[steer].pj = !!In.jump; f.rem[steer].pfl = !!In.flip; }
    f.post = sigNow();
    if (G.turnCount !== f.tc) {                                       // a new turn started inside this step
      const ended = f.tcOwner; f.tc = G.turnCount; f.tcOwner = ownerOf(G.activeWorm); newTurn(ended);
    }
  }
  function sample() {                                                 // my keys -> events (only when something changed)
    const f = F; let bits = 0; for (let i = 0; i < IN_KEYS.length; i++) if (In[IN_KEYS[i]]) bits |= 1 << i;
    if (bits !== f.bits) { push({ k: 's', f: G.frame, v: bits }); f.bits = bits; }
    let pl = 0; if (In.firePressed) pl |= 1; if (In.jump && !f.pj) pl |= 2; if (In.flip && !f.pfl) pl |= 4;
    if (pl) push({ k: 'p', f: G.frame, v: pl });
    const sg = sigNow(); if (!sigEq(sg, f.post)) { push({ k: 'w', f: G.frame, a: sg[0], b: sg[1], c: sg[2], d2: sg[3] }); f.post = sg; }
  }
  function applyEv(R, ev) {                                           // one event of the player who steers, at its frame
    switch (ev.k) {
      case 's': R.bits = ev.v | 0; break;
      case 'p': R.pulse |= ev.v | 0; break;
      case 'w': sigSet([ev.a | 0, ev.b | 0, ev.c | 0, ev.d2 | 0]); break;
      case 'u': {   // potion: the stock of the potions is HIS, not mine
        const ap = Profile.addStock; F.replay = true; Profile.addStock = () => { };
        try { seeded(() => H.up(ev.a | 0, ev.b | 0)); } catch (e) { } finally { Profile.addStock = ap; F.replay = false; }
        break;
      }
      case 't': F.replay = true; try { seeded(() => H.dt(ev.x, ev.y)); } catch (e) { } finally { F.replay = false; } break;
      case 'x': G.charging = false; G.charge = 0; endTurnNow(); break;
    }
  }
  function newTurn(ended) {
    const f = F;
    f.bits = 0; f.pj = f.pfl = false; In.jump = In.flip = In.firePressed = false;
    for (const id in f.rem) { const R = f.rem[id]; R.bits = 0; R.pulse = 0; R.pj = R.pfl = false; }
    f.post = sigNow();
    if (ended === f.me) pushSnap();
    f.snapWait = (G.activeWorm && ownerOf(G.activeWorm) === f.me && ended && ended !== f.me && !f.gone.has(ended)) ? { tc: G.turnCount, until: Date.now() + SNAP_WAIT_MS } : null;
  }

  // ---------- snapshots (tiny resync at every turn change) ----------
  function pushSnap() {
    const d = [G.turnCount, Math.round(G.wind * 1000)];
    for (const w of G.worms) d.push(Math.round(w.x * 8), Math.round(w.y * 8), Math.max(0, Math.round(w.hp)), STATE_CODE[w.state] != null ? STATE_CODE[w.state] : 4);
    push({ k: 'sn', f: G.frame, d });
  }
  function applySnap(sn) {   // only a REAL difference is corrected (the snapshot is rounded, so tiny differences are normal and left alone)
    const d = sn.d; let fixed = 0;
    if (Math.abs(G.wind - d[1] / 1000) > 0.003) { G.wind = d[1] / 1000; fixed++; }
    G.worms.forEach((w, i) => {
      const o = 2 + i * 4; if (o + 3 >= d.length) return;
      const code = STATE_CODE[w.state] != null ? STATE_CODE[w.state] : 4;
      if (code < 2 && d[o + 3] < 2) {
        if (Math.abs(w.x - d[o] / 8) > 0.5 || Math.abs(w.y - d[o + 1] / 8) > 0.5) { w.x = d[o] / 8; w.y = d[o + 1] / 8; fixed++; }
        if (Math.abs(w.hp - d[o + 2]) > 1) { w.hp = d[o + 2]; fixed++; }
      }
    });
    if (fixed) { try { console.warn('[arena fight] resynced ' + fixed + ' value(s) at turn ' + d[0]); } catch (e) { } }
  }
  function trySnaps() {                                               // watchers (and anybody not waiting) apply a snapshot when they are at exactly its frame
    const f = F; if (!f.snaps.length) return;
    for (let i = f.snaps.length - 1; i >= 0; i--) {
      const sn = f.snaps[i];
      if (sn.d[0] < G.turnCount || (sn.d[0] === G.turnCount && sn.f < G.frame)) f.snaps.splice(i, 1);
      else if (sn.d[0] === G.turnCount && sn.f === G.frame && !(f.snapWait && f.snapWait.tc === sn.d[0])) { applySnap(sn); f.snaps.splice(i, 1); }
    }
  }
  function markStall(owner, why) {
    const f = F; if (!f.stallSince) f.stallSince = Date.now(); f.stallOwner = owner; f.stallWhy = why || null;
    if (why !== 'sync' && Date.now() - f.stallSince > STALL_GIVEUP_MS && owner) { f.gone.add(owner); f.stallSince = 0; }   // his phone is silent: skip him
  }

  // ---------- network ----------
  async function pump() {
    const f = F;
    while (f && !f.stop) {
      const t0 = Date.now(); let sent = 0;
      const body = { match: f.id, since: f.seen, live: f.loads ? 1 : 0 };
      if (f.ready && !f.loads) body.ready = f.loadout;
      if (f.live) {   // keeps sending after the end of the battle too, so the other phone gets the last inputs
        const batch = f.out.slice(0, 40); sent = batch.length; if (sent) body.out = batch;
        body.thr = f.out.length > sent ? Math.min(f.thr, f.out[sent].f) : f.thr;
      }
      if (f.report) body.done = f.report;
      try {
        const j = await f.C.post('fight', body);
        if (f.stop) break;
        if (sent) f.out.splice(0, sent);
        handle(j);
      } catch (e) {
        if (f.stop) break;
        if (e && e.status === 401) { try { f.C.expired(); } catch (x) { } return finish({ lost: true }); }
        if (e && e.status === 404) return finish({ gone: true, msg: 'That fight is over.' });
        f.fails = (f.fails | 0) + 1;
      }
      if (f.live && !f.ended && Date.now() - f.lastData > LOST_MS) return finish({ lost: true, msg: 'Connection lost.' });
      await sleep(Math.max(25, (f.stallSince ? POLL_FAST_MS : POLL_MS) - (Date.now() - t0)));
    }
  }
  function handle(j) {
    const f = F; if (!f) return;
    f.lastData = Date.now();
    if (Array.isArray(j.gone)) f.gone = new Set(j.gone.filter(id => id !== f.me));
    if (j.go && j.loads && !f.loads) { f.loads = j.loads; if (f.goRes) f.goRes(); }
    for (const ev of (j.events || [])) { if (ev.k === 'sn') { if (Array.isArray(ev.d)) f.snaps.push(ev); } else { const R = f.rem[ev.from]; if (R) R.q.push(ev); } }
    if (typeof j.upto === 'number' && j.upto > f.seen) f.seen = j.upto;
    if (j.thr) for (const id in j.thr) { const R = f.rem[id]; if (R && j.thr[id] > R.thr) R.thr = j.thr[id]; }
    if (j.over && !f.over) { f.over = j.over; if (!f.ended) endByServer(j.over); }
    if (f.live && !f.ended) {   // all the other team's players are gone = they left
      const foes = f.members.flatMap((t, i) => i === f.myTeam ? [] : t);
      if (foes.length && foes.every(id => f.gone.has(id))) { f.report = f.report || { w: f.myTeam }; showResult({ win: true, why: 'The other team left the fight.' }); }
    }
  }

  // ---------- start ----------
  function run(C, match, cb) {
    if (F) { try { finish({ aborted: true }); } catch (e) { } }
    const me = C.player.id, members = match.teams.map(t => t.map(x => x.id)), teamOf = {};
    members.forEach((t, i) => t.forEach(id => { teamOf[id] = i; }));
    if (teamOf[me] == null) return Promise.reject(new Error('You are not in this match.'));
    const f = F = { C, cb: cb || {}, match, id: match.id, me, myTeam: teamOf[me], members, teamOf, names: {}, rem: {}, out: [], seen: 0, n: 0, thr: 0, snaps: [], gone: new Set(), post: [0, -1, 0, 0], bits: 0, pj: false, pfl: false,
      live: false, ended: false, stop: false, finished: false, lastData: Date.now(), stallSince: 0, tc: 0, tcOwner: null, snapWait: null, loads: null, ready: false, loadout: null, report: null, over: null, replay: false, t0: Date.now() };
    match.teams.forEach(t => t.forEach(x => { f.names[x.id] = x.name; }));
    for (const id of members.flat()) if (id !== me) f.rem[id] = { q: [], thr: -1, bits: 0, pulse: 0, pj: false, pfl: false, wait: false };
    f.goP = new Promise(res => { f.goRes = res; });
    f.resultP = new Promise(res => { f.resolve = res; });
    const stat = t => { try { f.cb.onStatus && f.cb.onStatus(t); } catch (e) { } };
    if (f.cb.onControl) f.cb.onControl({ abort: () => { if (!f.live) { f.report = { forfeit: 1 }; flushNow(); finish({ aborted: true }); } else askLeave(); } });
    pump();
    (async () => {
      try {
        const mp = f.map = ARENA_MAPS[match.mapSeed % ARENA_MAPS.length];
        if (typeof MAP_RUNS === 'undefined' || !MAP_RUNS[mp.id]) throw new Error('map data missing (' + mp.id + ')');
        stat('Loading the battlefield...');
        const R = Assets.robots.robots, used = new Set(match.teams.flat().map(x => Math.max(0, Math.min(x.robot | 0, R.length - 1))));
        await Promise.all([...used].map(k => loadImage(R[k].death)));
        await Promise.all(['sky', 'far', 'mid', 'near'].map(l => loadImage(Assets.bg[mp.bg][l])));
        await Promise.all(R.map(r => loadImage(r.sheet)));
        await loadImage(mp.img);
        const im = getImg(mp.img); if (!im || !im.complete || !im.naturalWidth) throw new Error('map picture missing (' + mp.img + ')');
        if (f.finished) return;
        const ridx = Math.max(0, Math.min(C.player.robot | 0, R.length - 1));
        f.loadout = { robot: ridx, lv: (() => { try { return Profile.level(); } catch (e) { return 1; } })(), bonus: profileBonuses(ridx) };
        f.ready = true; stat('Waiting for the other player...');
        await f.goP; if (f.finished) return;
        const wait = (f.cb.minShowMs || 0) - (Date.now() - f.t0); if (wait > 0) await sleep(wait);   // let the VS screen be seen
        if (f.finished) return;
        stat('Fight!'); begin();
      } catch (e) {
        try { console.error('[arena fight]', e); } catch (x) { }
        try { C.toast('Cannot start the fight: ' + (e && e.message ? e.message : e)); } catch (x) { }
        f.report = { forfeit: 1 }; flushNow(); finish({ error: true });
      }
    })();
    return f.resultP;
  }
  function flushNow() { const f = F; if (!f) return; try { f.C.post('fight', { match: f.id, since: f.seen, live: f.loads ? 1 : 0, done: f.report }).catch(() => { }); } catch (e) { } }

  function begin() {
    const f = F, m = f.match, loads = f.loads, TN = (typeof TEAM_NAMES !== 'undefined') ? TEAM_NAMES : ['Red', 'Blue', 'Green', 'Gold'];
    const teams = f.members.map(ids => ({ cpu: false, robot: loads[ids[0]].robot }));
    const bonuses = f.members.map(ids => loads[ids[0]].bonus || {});       // a team shares the gear (and potions) of its first player
    const names = f.members.map((ids, i) => ids.length === 1 ? loads[ids[0]].name : TN[i]);
    f.rng = mulberry(((m.mapSeed | 0) * 2654435761 + 977) | 0);
    hook();
    seeded(() => newGame({ teams, per: f.members[0].length, diff: 1, theme: f.map.bg, map: f.map, names, bonuses, first: 0 }));
    G.worms.forEach(w => { const id = ownerOf(w); if (id && f.names[id]) w.name = f.names[id]; });
    try { const t = curTeam(); if (t && G.activeWorm) showBanner(t.name + ' \u00b7 ' + G.activeWorm.name, t.color); } catch (e) { }
    In.left = In.right = In.up = In.down = In.fire = In.firePressed = In.jump = In.flip = false;
    UI.paused = false; try { Snd.init(); } catch (e) { }
    UI.show('game'); UI.lastSig = ''; f.C.hideOnline();
    f.tc = G.turnCount; f.tcOwner = ownerOf(G.activeWorm); f.post = sigNow(); f.lastData = Date.now();
    f.msgTimer = setInterval(updateMsg, 250);
    f.live = true;
  }

  // ---------- hooks (put back in unhook) ----------
  function hook() {
    _rand = Math.random;
    H = { ug: updateGame, up: usePotion, dt: doTeleport, sp: Snd.play, cp: UI.canPick, tp: UI.togglePause, so: UI.showOver, bPass: $('bPass').onclick, bQuit: $('bQuit').onclick, wbtn: $('wbtn').onclick, fbtn: $('fbtn').onclick };
    updateGame = stepOnline;
    Snd.play = function (n, a) { const r = Math.random; if (F && r === F.rng) { Math.random = _rand; try { return H.sp.call(this, n, a); } finally { Math.random = r; } } return H.sp.call(this, n, a); };   // sounds must not eat the shared random numbers
    usePotion = function (ti, k) {
      if (!F || !F.live || F.ended || F.replay) return H.up.apply(this, arguments);
      if (!myTurn() || ti !== G.activeWorm.team) return false;
      const ok = seeded(() => H.up.call(this, ti, k)); if (ok) push({ k: 'u', f: G.frame, a: ti, b: k }); return ok;
    };
    doTeleport = function (x, y) {
      if (!F || !F.live || F.ended || F.replay) return H.dt.apply(this, arguments);
      if (!myTurn()) return false;
      x = Math.round(x); y = Math.round(y);
      const ok = seeded(() => H.dt.call(this, x, y)); if (ok) push({ k: 't', f: G.frame, x, y }); return ok;
    };
    UI.canPick = function () { return H.cp.call(this) && myTurn(); };
    UI.togglePause = function (v) { const p = $('pauseScr'); if (!p) return; const on = v === undefined ? p.hidden : !!v; p.hidden = !on; UI.paused = false; };   // the battle never freezes for one player
    UI.showOver = function () { if (!F) return H.so.apply(this, arguments); F.ended = true; F.simOver = true; F.overTimer = setTimeout(() => { const w = G.winner; showResult(w ? { win: w.idx === F.myTeam, draw: false } : { win: false, draw: true }); }, 1600); };
    $('bPass').onclick = () => { if (F && !F.ended && G.mode === 'play' && G.phase === 'aim' && !G.swarm && myTurn()) { Snd.play('beep'); G.charging = false; G.charge = 0; endTurnNow(); push({ k: 'x', f: G.frame }); } };
    $('bQuit').onclick = () => askLeave();
    $('wbtn').onclick = e => { if (myTurn()) return H.wbtn.call($('wbtn'), e); };
    $('fbtn').onclick = e => { if (myTurn()) return H.fbtn.call($('fbtn'), e); };
    const pb = $('powbtn'); if (pb) { H.pow = e => { if (!myTurn()) { e.stopImmediatePropagation(); e.preventDefault(); } }; pb.addEventListener('click', H.pow, true); }
  }
  function unhook() {
    if (!H) return;
    try {
      updateGame = H.ug; usePotion = H.up; doTeleport = H.dt; Snd.play = H.sp; UI.canPick = H.cp; UI.togglePause = H.tp; UI.showOver = H.so;
      $('bPass').onclick = H.bPass; $('bQuit').onclick = H.bQuit; $('wbtn').onclick = H.wbtn; $('fbtn').onclick = H.fbtn;
      const pb = $('powbtn'); if (pb && H.pow) pb.removeEventListener('click', H.pow, true);
    } catch (e) { }
    if (_rand) Math.random = _rand;
    H = null;
  }

  // ---------- messages / results ----------
  function overlay(id, html) {
    const old = $(id); if (old) old.remove();
    const d = document.createElement('div'); d.id = id;
    d.style.cssText = 'position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(6,8,18,.72);font-family:var(--body,sans-serif);color:#fff;text-align:center';
    d.innerHTML = '<div style="background:rgba(14,20,38,.96);border:2px solid #ffc15a;border-radius:16px;padding:20px 26px;max-width:min(92vw,420px)">' + html + '</div>';
    document.body.appendChild(d); return d;
  }
  const bigBtn = (txt, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = txt; b.style.margin = '6px'; b.onclick = () => { try { Snd.play('beep'); } catch (e) { } fn(); }; return b; };
  function updateMsg() {
    const f = F; if (!f) return; let el = $('arFightMsg');
    const show = f.live && !f.ended && f.stallSince && Date.now() - f.stallSince > 700;
    if (!show) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'arFightMsg'; el.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:45;background:rgba(10,14,28,.88);border:2px solid #ffc15a;border-radius:99px;padding:6px 18px;font:700 15px var(--body,sans-serif);color:#ffe3b0;pointer-events:none;white-space:nowrap'; document.body.appendChild(el); }
    el.textContent = f.stallWhy === 'sync' ? 'Syncing...' : 'Waiting for ' + ((f.stallOwner && f.names[f.stallOwner]) || 'the other player') + '...';
  }
  function showResult(r) {
    const f = F; if (!f || f.resultShown) return; f.resultShown = true; f.ended = true;
    if (!f.report) f.report = r.forfeit ? { forfeit: 1 } : { w: r.draw ? -1 : (r.win ? f.myTeam : (f.members.length === 2 ? 1 - f.myTeam : -1)) };
    flushNow();
    const msg = r.draw ? 'DRAW!' : r.win ? 'VICTORY!' : 'DEFEAT';
    const col = r.draw ? '#fff' : r.win ? '#7dff7a' : '#ff7a6d';
    const o = overlay('arFightEnd', '<h2 style="margin:0 0 8px;font:400 34px var(--disp,sans-serif);color:' + col + '">' + msg + '</h2><p style="margin:6px 0 12px;color:#c9d4ee">' + (r.why || (G.turnCount ? 'The battle lasted ' + G.turnCount + ' turns.' : '')) + '</p>');
    o.firstChild.append(bigBtn('Back to Arena', () => finish({ win: !!r.win, draw: !!r.draw })));
    const m = $('arFightMsg'); if (m) m.remove();
  }
  function endByServer(over) {
    const f = F; if (!f) return;
    if (!f.live) { try { f.C.toast(over.reason === 'timeout' ? 'The other player could not load the fight.' : over.reason === 'forfeit' && over.by !== f.me ? 'The other player left.' : 'The fight was cancelled.'); } catch (e) { } return finish({ cancelled: true }); }
    if (f.simOver) return;   // the engine already knows who won
    const win = over.winner === f.myTeam, draw = over.winner < 0;
    showResult({ win, draw, why: over.reason === 'forfeit' && over.by !== f.me ? 'The other player left the fight.' : '' });
  }
  function askLeave() {
    const f = F; if (!f || !f.live || f.ended || $('arFightAsk')) return;
    const o = overlay('arFightAsk', '<h2 style="margin:0 0 8px;font:400 26px var(--disp,sans-serif);color:#ffc15a">Leave the fight?</h2><p style="margin:6px 0 12px;color:#c9d4ee">You lose this fight if you leave.</p>');
    o.firstChild.append(bigBtn('Leave', () => { o.remove(); showResult({ win: false, forfeit: true, why: 'You left the fight.' }); }), bigBtn('Stay', () => { o.remove(); }));
    const p = $('pauseScr'); if (p) p.hidden = true;
  }

  function finish(res) {
    const f = F; if (!f || f.finished) return; f.finished = true; f.stop = true;
    clearInterval(f.msgTimer); clearTimeout(f.overTimer);
    unhook();
    for (const id of ['arFightMsg', 'arFightEnd', 'arFightAsk']) { const e = $(id); if (e) e.remove(); }
    try { if (f.live) { G.mode = 'menu'; G.projs = []; } for (const id of ['over', 'wmenu', 'pauseScr']) { const e = $(id); if (e) e.hidden = true; } UI.paused = false; UI.show('title'); } catch (e) { }
    try { f.C.showOnline(); } catch (e) { }
    if (f.goRes) f.goRes();
    F = null; f.resolve(res || {});
  }

  return { run };
})();
