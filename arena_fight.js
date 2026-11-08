/* ARENA FIGHT (client) - downloaded from GitHub by arena_v2.js when the VS screen ends. It starts the real battle on the arena map.
   HOW THE TWO PHONES STAY TOGETHER (no separate game server needed):
   - Both phones build the SAME battle: same map, same spawn points, same turn order, same random numbers (seeded per turn).
   - The player whose turn it is sends only his BUTTONS (walk / aim / power / weapon / pass) as tiny changes through the Render server (/api/arena/fight).
     The other phone plays those buttons back frame by frame, so it sees the same walking, aiming and shot.
   - At the start of every turn the player who just finished sends a small snapshot (robot positions, HP, wind). The other phone adopts it, so small
     differences between the phones can never add up.
   - Nobody can fire out of turn: a phone only accepts buttons from the owner of the robot whose turn it is.
   Needs: arena_maps.js + arena_maps_runs.js (map ground) and the 10 pictures in the app (assets/arena_maps/). Opponent leaves / loses connection = you win. */
'use strict';
const ArenaFight = (() => {
  const POLL_MS = 220;          // how often the phone talks to the server during a fight
  const LEAD = 8;               // frames of the opponent's buttons we wait for before we start playing them (smooth walking)
  const STALL_QUIT_MS = 20000;  // opponent silent for this long during his turn = he left
  const SNAP_WAIT_MS = 4000;    // how long we wait for the snapshot at a turn change
  const REAL_RANDOM = Math.random;
  const MASK = { left: 1, right: 2, up: 4, down: 8, fire: 16, firePressed: 32, jump: 64, flip: 128, fast: 256 };
  const maskOf = I => { let m = 0; for (const k in MASK) if (I[k]) m |= MASK[k]; return m; };
  const applyMask = (I, m) => { for (const k in MASK) I[k] = !!(m & MASK[k]); };
  const $e = id => document.getElementById(id);
  let A = null, patched = false;
  let _update, _startTurn, _endGame, _dropCrate, _showOver, _aiBegin, _aiUpdate, _toggle;

  // ============================================================ start
  async function start(C, match, map) {
    if (A) stop();
    const me = C.player.id;
    const myTeam = match.teams.findIndex(t => t.some(x => x.id === me));
    if (myTeam < 0) throw new Error('You are not in this match.');
    if (typeof MAP_RUNS === 'undefined' || !MAP_RUNS[map.id]) await C.load('arena_maps_runs.js');
    if (typeof MAP_RUNS === 'undefined' || !MAP_RUNS[map.id]) throw new Error('Map ground missing.');
    const members = []; match.teams.forEach((t, ti) => t.forEach(m => members.push(Object.assign({}, m, { team: ti }))));
    const S = A = {
      C, match, map, me, myTeam, members, live: true, seed: (match.mapSeed * 7919 + match.id * 104729) >>> 0, rng: null,
      since: 0, outq: [], busy: false, fails: 0, timer: 0, lastSend: Date.now(), inbox: {}, snaps: {}, quit: new Set(),
      out: { ch: [], sl: [], ps: null, done: false }, lastMask: 0, lastSel: -1, sendIn: false, upTo: -1, tcOut: 0,
      starve: true, stallSince: 0, waitTc: 0, waitSince: 0, assigned: false, overSent: false, ended: false,
    };
    S.rng = mulberry(S.seed);
    // the game screens
    C.launch('fight', () => { try { C.live.call('back').catch(() => { }); } catch (e) { } stop(); try { C.reopenArena(); } catch (e) { } });
    Snd.init(); UI.show('loading'); $e('loadtxt').textContent = 'Building the battlefield…';
    try {
      const used = [...new Set(members.map(m => m.robot))];
      if (used.some(k => !Assets.robots.robots[k])) throw new Error('Unknown robot.');
      await Promise.all(used.map(k => loadImage(Assets.robots.robots[k].death)));
      await Promise.all(used.map(k => loadImage(Assets.robots.robots[k].sheet)));
      await Promise.all(['sky', 'far', 'mid', 'near'].map(l => loadImage(Assets.bg[map.bg][l])));
      await loadImage(map.img);
      const im = getImg(map.img); if (!im || !im.complete || !im.naturalWidth) throw new Error('map picture');
    } catch (e) { return fail('The arena map picture is missing in the app. Update the app and try again.'); }
    install();
    // equal rules for everybody: no gear bonuses, no crates, no POW (so both phones play exactly the same battle)
    const spawns = (map.spawns && map.spawns.length ? map.spawns : [500, 400, 600, 300]).slice();
    const plan = []; match.teams.forEach((t, ti) => t.forEach((m, k) => {
      let sx = spawns[k]; if (sx == null) sx = spawns[0] + 75 * k;
      plan.push({ team: ti, x: ti === 0 ? sx : 2799 - sx, sc: 1, hp: 100, name: String(m.name || 'Player').slice(0, 14) });
    }));
    const setup = { teams: match.teams.map(t => ({ cpu: false, robot: t[0].robot })), per: Math.max(...match.teams.map(t => t.length)), diff: 1, theme: map.bg, map, plan, first: 0, names: match.teams.map(t => String(t[0].name || 'Team').slice(0, 14) + (t.length > 1 ? ' + team' : '')) };
    const pb = window.profileBonuses; window.profileBonuses = () => null;
    try { Math.random = S.rng; newGame(setup); } finally { Math.random = REAL_RANDOM; window.profileBonuses = pb; }
    G.teams.forEach(t => { try { Object.defineProperty(t, 'pow', { get() { return 0; }, set() { }, configurable: true }); } catch (e) { } });
    UI.show('game'); UI.lastSig = '';
    S.timer = setInterval(pump, POLL_MS);
  }
  function fail(msg) { try { A && A.C.toast(msg); } catch (e) { } G.mode = 'menu'; UI.show('title'); }

  // ============================================================ patches of the game (only act while an arena fight is running)
  function install() {
    if (patched) return; patched = true;
    _update = updateGame; updateGame = frame;
    _startTurn = startTurn; startTurn = turn;
    _endGame = endGame; endGame = ended;
    _dropCrate = dropCrate; dropCrate = function () { if (A && A.live) return; return _dropCrate.apply(this, arguments); };
    _aiBegin = AI.begin; AI.begin = function (w) { if (A && A.live) { this.reset(); return; } return _aiBegin.apply(this, arguments); };
    _aiUpdate = AI.update; AI.update = function (w) { if (A && A.live) return; return _aiUpdate.apply(this, arguments); };
    _showOver = UI.showOver; UI.showOver = showOver;
    _toggle = UI.togglePause.bind(UI);
    UI.togglePause = function (v) { if (!(A && A.live)) return _toggle(v); if (G.mode !== 'play') return; $e('pauseScr').hidden = !v; };   // no real pause in a live fight
    const bp = $e('bPass'), op = bp.onclick;
    bp.onclick = function () { if (A && A.live && G.mode === 'play' && G.phase === 'aim' && !G.swarm && curTeam() && !curTeam().cpu) A.out.ps = G.tf | 0; return op.apply(this, arguments); };
    const bq = $e('bQuit'), oq = bq.onclick;
    bq.onclick = function () { if (A && A.live && G.mode === 'play') { A.outq.push({ k: 'quit' }); pumpNow(); } return oq.apply(this, arguments); };
  }
  function owner(w) { return w ? w.owner : null; }
  function assign(S) {
    if (S.assigned) return; S.assigned = true;
    G.worms.forEach((w, i) => { const m = S.members[i]; if (!m) return; w.owner = m.id; w.rob = Assets.robots.robots[m.robot] || w.rob; });
  }

  // one simulation frame
  function frame() {
    const S = A;
    if (!S || !S.live || G.mode !== 'play') return _update.apply(this, arguments);
    const now = Date.now();
    if (S.waitTc && S.waitTc === G.turnCount) {   // turn change: wait (a moment) for the snapshot of the player who just finished
      const sn = S.snaps[G.turnCount];
      if (sn) { applySnap(sn); S.waitTc = 0; }
      else if (now - S.waitSince < SNAP_WAIT_MS) return;
      else S.waitTc = 0;
    }
    const w = G.activeWorm, t = w && G.teams[w.team], tc = G.turnCount, inAim = G.phase === 'aim' || G.phase === 'retreat';
    const remote = !!w && owner(w) !== S.me && !G.swarm;
    if (w && inAim && remote) {
      const ib = S.inbox[tc], have = ib ? (ib.done ? Infinity : ib.up) : -1;
      if (S.starve) { if (have - G.tf >= LEAD || (ib && ib.done)) S.starve = false; } else if (have < G.tf) S.starve = true;
      if (S.starve) { if (!S.stallSince) S.stallSince = now; if (now - S.stallSince > STALL_QUIT_MS) { S.stallSince = 0; playerQuit(owner(w)); } return; }
      S.stallSince = 0;
      while (ib.ptr < ib.ch.length && ib.ch[ib.ptr][0] <= G.tf) ib.cur = ib.ch[ib.ptr++][1];
      while (ib.sp < ib.sl.length && ib.sl[ib.sp][0] <= G.tf) { const s = ib.sl[ib.sp++][1]; if (WEAPONS[s]) t.sel = s; }
      applyMask(AI.input, ib.done && G.tf > ib.up ? 0 : ib.cur);
      if (ib.ps != null && !ib.psDone && G.tf >= ib.ps) { ib.psDone = true; G.charging = false; G.charge = 0; endTurnNow(); }
    } else if (w && inAim && !remote) {   // my turn: record my buttons
      const o = S.out, m = maskOf(In);
      if (m !== S.lastMask) { o.ch.push([G.tf, m]); S.lastMask = m; }
      if (t.sel !== S.lastSel) { o.sl.push([G.tf, t.sel]); S.lastSel = t.sel; }
      S.upTo = G.tf; S.sendIn = true;
    } else if (w && !remote && S.sendIn) { S.out.done = true; flushIn(); }
    else if (w && remote) AI.reset();
    try { Math.random = S.rng; _update.apply(this, arguments); } finally { Math.random = REAL_RANDOM; }
    G.tf = (G.tf | 0) + 1;
  }

  // start of a turn
  function turn() {
    const S = A;
    if (!S || !S.live) return _startTurn.apply(this, arguments);
    assign(S);
    const prevW = G.activeWorm, prev = prevW ? owner(prevW) : null;
    flushIn(true);
    S.rng = mulberry((S.seed ^ Math.imul((G.turnCount | 0) + 1, 2654435761)) >>> 0); Math.random = S.rng;
    try { _startTurn.apply(this, arguments); } finally { /* the caller (frame) puts the real Math.random back */ }
    G.tf = 0;
    if (G.mode === 'over') return;
    const w = G.activeWorm, t = G.teams[w.team], tc = G.turnCount;
    t.cpu = owner(w) !== S.me;   // "cpu" simply means: this robot is played by somebody else
    if (t.cpu && G.banner) G.banner.text = String(G.banner.text).replace(' (CPU)', '');
    S.tcOut = tc; S.out = { ch: [], sl: [], ps: null, done: false }; S.lastMask = 0; S.lastSel = t.sel; S.sendIn = false; S.upTo = -1; S.starve = true; S.stallSince = 0;
    if (prev != null) { if (prev === S.me) sendSnap(tc); else { S.waitTc = tc; S.waitSince = Date.now(); } }
  }

  function flushIn(force) {
    const S = A; if (!S) return; const o = S.out;
    if (!S.sendIn && !o.done) return;
    if (force) o.done = true;   // the turn is over: tell the other phone these are the last buttons
    S.outq.push({ k: 'in', tc: S.tcOut, ch: o.ch, sl: o.sl, ps: o.ps == null ? undefined : o.ps, up: S.upTo, done: o.done ? 1 : 0 });
    o.ch = []; o.sl = []; o.ps = null;
    if (o.done) { S.sendIn = false; o.done = false; }
  }
  function sendSnap(tc) {
    const S = A; S.outq.push({ k: 'snap', tc, wd: G.wind, w: G.worms.map(w => [Math.round(w.x * 10) / 10, Math.round(w.y * 10) / 10, Math.round(w.hp * 10) / 10, w.state === 'dead' || w.state === 'drown' ? w.state : 'ok', w.face]) });
    pumpNow();
  }
  function applySnap(sn) {
    G.worms.forEach((w, i) => {
      const a = sn.w && sn.w[i]; if (!a) return;
      const dead = w.state === 'dead' || w.state === 'drown';
      if (a[3] === 'dead' || a[3] === 'drown') { if (!dead) { w.hp = 0; w.state = a[3]; w.dt = 99; w.vx = w.vy = 0; } return; }
      if (dead) return;
      w.x = a[0]; w.y = a[1]; w.hp = a[2]; w.face = a[4]; w.vx = w.vy = 0; w.fallPeak = w.y;
      w.state = (typeof onGround === 'function' && onGround(w.x, w.y, w.sc || 1)) ? 'ground' : 'air';
    });
    if (typeof sn.wd === 'number') G.wind = sn.wd;
  }
  function ended(team) {
    _endGame.apply(this, arguments);
    const S = A; if (S && S.live && !S.overSent) { S.overSent = true; S.outq.push({ k: 'over', win: team ? team.idx : -1 }); pumpNow(); }
  }
  function playerQuit(id) {
    const S = A; if (!S || S.quit.has(id) || id === S.me) return; S.quit.add(id);
    const m = S.members.find(x => x.id === id), name = m ? m.name : 'Opponent';
    try { S.C.toast(name + ' left the fight.'); } catch (e) { }
    G.worms.forEach(w => { if (owner(w) === id && w.state !== 'dead' && w.state !== 'drown') { w.hp = 0; killWorm(w); } });
    if (G.mode === 'play' && G.phase !== 'settle') { G.burst = null; G.volley = null; G.flameT = 0; G.phase = 'settle'; G.settleT = 0; }
  }
  function showOver() {
    const S = A; if (!S || !S.live) return _showOver.apply(this, arguments);
    setTimeout(() => {
      if (!A || !A.live) return;
      const w = G.winner, win = w && w.idx === S.myTeam, draw = !w;
      $e('overT').textContent = draw ? 'DRAW!' : win ? 'VICTORY!' : 'DEFEAT'; $e('overT').style.color = draw ? '#fff' : win ? '#ffd34a' : '#ff6a5a';
      $e('overS').textContent = S.map.name + ' · ' + G.turnCount + ' turns';
      $e('bAgain').hidden = true; $e('bMenu').textContent = 'Back to Arena';
      $e('over').hidden = false; $e('hud').hidden = true; $e('touch').hidden = true;
    }, 1600);
  }

  // ============================================================ talking to the server
  function pumpNow() { if (A && A.live) setTimeout(pump, 0); }
  async function pump() {
    const S = A; if (!S || !S.live || S.busy) return;
    if (S.sendIn) flushIn();
    if (!S.outq.length && Date.now() - S.lastSend > 4000) S.outq.push({ k: 'hb' });
    const ev = S.outq.splice(0, 30); S.busy = true;
    try {
      const j = await S.C.fight({ match: S.match.id, since: S.since, ev });
      if (!A || A !== S || !S.live) return;
      S.fails = 0; if (ev.length) S.lastSend = Date.now();
      if (j.gone) return abort('The match was closed by the server.');
      if (typeof j.seq === 'number') S.since = Math.max(S.since, j.seq);
      ingest(S, j.events || []);
    } catch (e) {
      S.outq = ev.concat(S.outq);
      if (e && e.status === 401) return abort('Please log in again.');
      if (++S.fails * POLL_MS > 25000) abort('Connection lost.');
    } finally { S.busy = false; }
  }
  function abort(msg) { try { A.C.toast(msg); } catch (e) { } if (G.mode === 'play') { G.mode = 'menu'; } UI.paused = false; UI.show('title'); }
  function ingest(S, list) {
    for (const x of list) {
      const e = x.ev || {}, from = x.from; if (from === S.me) continue;
      if (e.k === 'in') {
        const ib = S.inbox[e.tc] || (S.inbox[e.tc] = { from, ch: [], sl: [], ps: null, up: -1, done: false, ptr: 0, sp: 0, cur: 0, psDone: false });
        if (ib.from !== from) continue;
        for (const c of e.ch || []) ib.ch.push([c[0] | 0, c[1] | 0]);
        for (const c of e.sl || []) ib.sl.push([c[0] | 0, c[1] | 0]);
        if (e.ps != null) ib.ps = e.ps | 0; if (typeof e.up === 'number' && e.up > ib.up) ib.up = e.up; if (e.done) ib.done = true;
      } else if (e.k === 'snap') { S.snaps[e.tc] = e; }
      else if (e.k === 'over') { if (G.mode === 'play' && !S.ended) { S.ended = true; _endGame.call(null, e.win >= 0 ? G.teams[e.win] : null); } }
      else if (e.k === 'quit') { playerQuit(from); }
    }
  }

  // ============================================================ leave
  function stop() {
    const S = A; if (!S) return; S.live = false; clearInterval(S.timer); Math.random = REAL_RANDOM; A = null;
    try { $e('bAgain').hidden = false; $e('bMenu').textContent = 'Menu'; $e('pauseScr').hidden = true; UI.paused = false; } catch (e) { }
    try { if (G.mode === 'play') G.mode = 'menu'; } catch (e) { }
  }
  return { start, stop, get active() { return !!(A && A.live); } };
})();
