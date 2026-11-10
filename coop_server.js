/* ONLINE CO-OP (client) - lives on GitHub only, next to online_v2.js / adventure_lobby.js (downloaded the first time a room starts).
   WHAT THIS DOES
   Everybody in an Adventure room now plays the SAME stage: same map, same enemies, every player has ONE robot, you all see each other,
   take turns, and shoot the same enemies. (Before, every phone started its own copy of the stage with its own 3 robots.)

   HOW (so you can fix / tune it later)
   - Every phone runs the game's own engine (world.js / ai.js / the boss files). Nothing in those files is changed.
   - The engine is deterministic: same start (seed, robots, gear) + same button presses on the same frame = same fight on every phone.
   - THE PLAYER WHOSE TURN IT IS is the clock (no delay for him): his phone numbers the frames of his turn, stamps every press of his with its frame
     number and sends it to everybody; every other phone applies it on that same frame, a few frames behind him (about 0.2 s).
     During enemy turns the HOST phone is the clock. At a turn change the old clock waits a moment for the new one to arrive at the same frame.
     The server (server.js /ws) only carries the messages.
   - Every ~1 s the host sends a short fingerprint of the fight. If a phone sees a different one it shows "Out of sync" (and logs to the console).
   Messages (all inside { to, d } / { from, d } of server.js):
     load  guest -> host  : my robot + my gear for this stage
     init  host  -> all   : seed + the list of players (robot, name, gear). Everybody builds the stage from it.
     in    clock -> all   : my buttons / actions, stamped with a frame number
     hb    clock -> all   : "I am at frame F" (+ fingerprint)
     retry guest -> host / again host -> all : restart the stage after a defeat
   TUNE: COOP_ENEMY_HP_PER_PLAYER below. */
'use strict';
const COOP_ENEMY_HP_PER_PLAYER = 1 / 3;   // offline you bring 3 robots, online each player brings 1. Enemy HP is scaled by (players x this), so 3 players = same as offline. Set to 0 to keep the offline HP.
const COOP_COLORS = ['#4da3ff', '#5be37a', '#ffd24a', '#d38bff'];
const COOP_STEP_MS = 1000 / 60;
const COOP_GRACE = 36;   // frames at the start of every turn where the player cannot act yet (same on every phone): the phone that just finished its shot can keep going instead of waiting for the next player's phone

const Coop = (() => {
  const REAL_RANDOM = Math.random;
  let net = null;            // { ws, myId, hostId, closed, onclose }
  let S = null;              // the stage that is being played: see begin()
  const pend = {};           // messages that came for a stage this phone has not started yet: sk -> [d...]
  const attempts = {};       // host: how many times each stage was restarted
  const loads = {};          // host: loadouts received per stage key: sk -> { playerId: load }
  let installed = false, orig = {};
  const hooks = { onAgain: null, onLost: null, onDesync: null, toast: null, onProg: null };
  const prog = (p, t) => { try { if (hooks.onProg) hooks.onProg(p, t); } catch (e) { } };   // loading progress (0..100) for the loading screen
  const toast = m => { try { (hooks.toast || (() => { }))(m); } catch (e) { } };

  // ---------------- network ----------------
  function connect(url, myId, hostId, h) {
    close();
    Object.assign(hooks, h || {});
    net = { myId, hostId, closed: false, ws: null, tries: 0, url };
    return new Promise((res, rej) => {
      let opened = false;
      const open = () => {
        const ws = new WebSocket(url); net.ws = ws;
        ws.onopen = () => { opened = true; net.tries = 0; res(); };
        setTimeout(() => { if (!opened && net && net.ws === ws) { try { ws.close(); } catch (e) { } rej(new Error('server did not answer (is it updated and awake?)')); } }, 70000);
        ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m && m.d) onMsg(m.from, m.d); };
        ws.onclose = () => { if (!net || net.closed || net.ws !== ws) return; if (!opened) { rej(new Error('no connection')); return; } if (net.tries++ < 5) { toast('Connection lost... trying again'); setTimeout(() => { if (net && !net.closed) open(); }, 1500); } else { toast('Connection lost'); if (hooks.onLost) hooks.onLost(); } };
        ws.onerror = () => { };
      };
      open();
    });
  }
  function close() {
    if (net) { net.closed = true; try { net.ws.close(); } catch (e) { } }
    net = null; endStage();
    for (const k in pend) delete pend[k]; for (const k in loads) delete loads[k]; for (const k in attempts) delete attempts[k];
  }
  function tx(to, d) { if (!net || !net.ws || net.ws.readyState !== 1) return; try { net.ws.send(JSON.stringify({ to, d })); } catch (e) { } }
  const amHost = () => !!net && net.myId === net.hostId;

  function onMsg(from, d) {
    if (!d || !d.k || !d.sk) return;
    if (d.k === 'load') { if (!amHost()) return; (loads[d.sk] = loads[d.sk] || {})[from] = d.load; if (S && S.sk === d.sk) { if (S.init) tx(from, S.init); else tryInit(); } return; }   // a phone that asks again after the stage was started missed my 'init': send it again
    if (d.k === 'retry') { if (!amHost()) return; if (S && S.sk === d.sk) doAgain(); return; }
    if (d.k === 'again') { if (from === net.hostId && hooks.onAgain) hooks.onAgain(d.si, d.att); return; }
    if (d.k === 'init') { if (from !== net.hostId) return; }
    else if (d.k !== 'in' && d.k !== 'hb') return;
    else if (S && !S.members.some(m => m.id === from)) return;
    if (!S || S.sk !== d.sk) { (pend[d.sk] = pend[d.sk] || []).push(d); if (pend[d.sk].length > 4000) pend[d.sk].shift(); return; }
    handle(d);
  }
  function handle(d) {
    if (!S) return;
    if (d.k === 'init') { if (!S.init) startSim(d); return; }
    if (d.k === 'in') { S.q.push(d); if (d.f > S.limit) S.limit = d.f; return; }
    if (d.k === 'hb') { if (d.f > S.limit) S.limit = d.f; if (d.h != null) S.hashes[d.f] = d.h; return; }
  }

  // ---------------- one stage ----------------
  // opts: { sk, mi, si, diff, members: [{id,name,robot}] }   members = the players in the room, host first
  function begin(opts) {
    if (!net) throw new Error('no connection');
    install(); endStage();
    { const cur = String(opts.sk).split(':'); for (const k of Object.keys(pend)) { const p = k.split(':'); if (p[0] !== cur[0] || (+p[1] < +cur[1]) || (+p[1] === +cur[1] && +p[2] < +cur[2])) delete pend[k]; } }   // messages of old stages / old runs are useless: drop them (they piled up on the phone)
    S = { sk: opts.sk, mi: opts.mi, si: opts.si, diff: opts.diff, members: opts.members.slice(), host: amHost(), init: null, sim: false, f: 0, limit: 0, q: [], simIn: {}, hashes: {}, myTeam: -1, rng: null, lastHb: 0, over: false, t0: performance.now(), turnF: 0, applying: false, stepping: false, lastSent: null, bad: false, pre: [], uiq: [] };
    const mine = { robot: opts.members.find(m => m.id === net.myId).robot, bonus: JSON.parse(JSON.stringify(profileBonuses(opts.members.find(m => m.id === net.myId).robot))) };
    S.mine = mine;
    toast(S.host ? 'Waiting for the other players...' : 'Waiting for the host to start...');
    prog(40, S.host ? 'Waiting for the other players...' : 'Gear sent. Waiting for the host...');
    if (S.host) { (loads[S.sk] = loads[S.sk] || {})[net.myId] = mine; S.timer = setTimeout(() => { if (S && !S.init) tryInit(true); }, 120000); tryInit(); }
    else {
      const sk0 = S.sk, mySt = S, sendLoad = () => { if (!S || S !== mySt || S.init || S.dead || S.sk !== sk0) return; tx('h', { k: 'load', sk: sk0, load: mine }); S.rt = setTimeout(sendLoad, 2500); };   // keep asking until the host's 'init' arrives (a single message can get lost while somebody is still connecting)
      sendLoad();
      S.timer = setTimeout(() => { if (S && !S.init) { toast('The host did not start the stage'); if (hooks.onLost) hooks.onLost(); } }, 130000);
    }
    const q = pend[S.sk]; if (q) { delete pend[S.sk]; for (const d of q) handle(d); }
  }
  function endStage() { if (S) { clearTimeout(S.timer); clearTimeout(S.rt); S.dead = true; } S = null; }

  function tryInit(force) {   // host: everybody's gear is here -> choose the seed and tell everybody
    if (!S || !S.host || S.init) return;
    const L = loads[S.sk] || {}, have = S.members.filter(m => L[m.id]);
    if (have.length < S.members.length && !force) { prog(40 + Math.round(24 * have.length / Math.max(1, S.members.length)), 'Waiting for players (' + have.length + ' / ' + S.members.length + ')...'); return; }
    const mem = have.map(m => ({ id: m.id, name: m.name, robot: m.robot, bonus: L[m.id].bonus }));
    const d = { k: 'init', sk: S.sk, seed: (REAL_RANDOM() * 2 ** 31) | 0, mem };
    tx('*', d); startSim(d);
  }
  function doAgain() {   // host: restart the stage (everybody), after a defeat
    if (!S || !S.host) return;
    const att = (attempts[S.si] = (attempts[S.si] || 0) + 1);
    const d = { k: 'again', sk: S.sk, si: S.si, att }; tx('*', d); if (hooks.onAgain) hooks.onAgain(S.si, att);
  }
  function retry() { if (!S) return; if (S.host) doAgain(); else tx('h', { k: 'retry', sk: S.sk }); }

  async function startSim(init) {
    if (!S || S.init) return; clearTimeout(S.timer); clearTimeout(S.rt);
    toast('Building the shared map...'); prog(68, 'Building the shared map...');
    S.init = init; S.members = init.mem; S.myTeam = init.mem.findIndex(m => m.id === net.myId); S.rng = mulberry(init.seed);
    if (S.myTeam < 0) { toast('The stage started without you (loading took too long)'); if (hooks.onLost) hooks.onLost(); return; }
    const my = S, o = { newGame: window.newGame, pr: Adventure.playerRobot };
    const wrap = function (setup) { window.newGame = o.newGame; return coopNewGame(setup, my, o.newGame); };   // Adventure.start calls newGame once: we reshape what it asks for
    window.newGame = wrap;
    Adventure.playerRobot = function () { return my.members[0].robot | 0; };   // enemy looks depend on "your" robot: every phone must use the same one
    Adventure.diff = my.diff;
    let fail = null;
    for (let a = 0; a < 3; a++) {   // loadfix_server.js swallows start errors (the screen just stays on "Loading stage"): so we CHECK that the shared map was really built, and try again if not
      if (S !== my || my.dead) return;
      try {
        window.newGame = wrap; Adventure.playerRobot = function () { return my.members[0].robot | 0; }; Adventure.diff = my.diff;
        await Adventure.start(my.mi, my.si);
        if (S !== my || my.dead) return;
        if (my.sim && G.mp === my) { fail = null; break; }
        throw new Error('the stage did not build');
      } catch (e) { fail = e; console.error('coop start (try ' + (a + 1) + ')', e); if (a < 2) { prog(68, 'Loading again (' + (a + 2) + ' / 3)...'); await new Promise(r => setTimeout(r, 700)); } }
    }
    Adventure.playerRobot = o.pr; if (window.newGame === wrap) window.newGame = o.newGame;
    if (fail) { toast('Co-op could not start: ' + ((fail && fail.message) || fail)); if (hooks.onLost) hooks.onLost(); return; }
    prog(100, 'Ready!');
  }
  function coopNewGame(setup, my, realNew) {
    const n = my.members.length, enemyIdx = n;
    const xs = setup.plan.filter(p => p.team === 0).map(p => p.x), enemies = setup.plan.filter(p => p.team === 1);
    const scale = Math.max(0.2, n * COOP_ENEMY_HP_PER_PLAYER) || 1;
    const x0 = xs.length ? xs : [500, 620, 740];
    setup.teams = my.members.map(m => ({ cpu: false, robot: m.robot | 0 })).concat([setup.teams[1]]);
    setup.plan = my.members.map((m, k) => ({ team: k, x: k < x0.length ? x0[k] : x0[x0.length - 1] + 120 * (k - x0.length + 1), name: m.name }))
      .concat(enemies.map(p => Object.assign({}, p, { team: enemyIdx, hp: COOP_ENEMY_HP_PER_PLAYER > 0 ? Math.max(1, Math.round(p.hp * scale)) : p.hp })));
    setup.names = my.members.map(m => m.name).concat([setup.names[1]]);
    setup.colors = my.members.map((m, k) => COOP_COLORS[k % COOP_COLORS.length]).concat([setup.colors[1]]);
    setup.bonuses = my.members.map(m => m.bonus || null).concat([setup.bonuses[1]]);
    setup.per = 1; setup.first = 0;
    const rnd0 = Math.random; Math.random = my.rng;
    try { realNew(setup); } finally { Math.random = rnd0; }
    G.teams.forEach((t, k) => { if (k < n) { t.pid = my.members[k].id; t.coop = true; } });
    G.mp = my; my.f = 0; my.sim = true; my.lastHb = performance.now();
    try { UI.paused = false; $('pauseScr').hidden = true; } catch (e) { }
  }

  // ---------------- the clock ----------------
  function hash() {
    let h = 0x811c9dc5; const mix = v => { h = Math.imul(h ^ (v | 0), 16777619); };
    mix(G.frame); mix(G.turnCount); mix(G.cur); mix(G.timer); mix(Math.round(G.wind * 1000)); mix(G.projs.length); mix(G.worms.length);
    for (const w of G.worms) { mix(Math.round(w.x * 8)); mix(Math.round(w.y * 8)); mix(w.hp); mix(w.state.charCodeAt(0)); }
    return h >>> 0;
  }
  const ZERO = { l: 0, r: 0, u: 0, d: 0, fi: 0, fa: 0 };
  function applyRec(r) {   // one stamped input: the buttons + one-shot actions of the player whose turn it is
    if (r.drop != null) { for (const w of G.worms) if (w.team === r.drop && w.state !== 'dead' && w.state !== 'drown') { w.hp = 0; killWorm(w); } return; }   // a player left: his robot goes down on the same frame everywhere
    const s = r.s || ZERO;
    S.simIn[r.tm] = { l: s.l, r: s.r, u: s.u, d: s.d, fi: s.fi, fa: s.fa, fp: (r.ev || []).includes('fp'), j: (r.ev || []).includes('j'), fl: (r.ev || []).includes('fl') };
    for (const e of r.ev || []) if (typeof e === 'object') { try { applyUi(r.tm, e); } catch (x) { console.warn('coop ui', x); } }
  }
  function applyUi(tm, e) {   // a button action (weapon, potion, fly, pass, POW, teleport), run by EVERY phone on the same frame
    const w = G.activeWorm; if (G.mode !== 'play' || !w || w.team !== tm || G.swarm) return;
    const t = G.teams[tm], hw = healWd();
    S.applying = true;
    try {
      switch (e.u) {
        case 'sel': { const wd = WEAPONS[e.i | 0]; if (wd && t.ammo[wd.id] > 0 && G.phase === 'aim') t.sel = e.i | 0; break; }
        case 'wb': {
          if (G.flyMode && !G.charging) { G.flyMode = false; break; }
          if (UI.canPick() && hw && t.sel === WEAPONS.indexOf(hw)) t.sel = mainSel(t); break;
        }
        case 'fly': { if (G.charging || !canFly()) break; if (G.flyMode) G.flyMode = false; else { if (hw && t.sel === WEAPONS.indexOf(hw)) t.sel = mainSel(t); G.flyMode = true; } break; }
        case 'heal': { if (!UI.canPick() || !hw || !(t.ammo[hw.id] > 0) || G.charging) break; G.flyMode = false; const hi = WEAPONS.indexOf(hw); if (t.sel !== hi) { t.prevSel = t.sel; t.sel = hi; } break; }
        case 'pot': { if (!UI.canPick() || G.charging) break; usePotion(tm, e.i | 0); break; }
        case 'pass': { if (G.phase === 'aim') { G.charging = false; G.charge = 0; endTurnNow(); } break; }
        case 'pow': { const b = document.getElementById('powbtn'); if (b) b.click(); break; }
        case 'tp': { if (G.phase === 'aim' && curWeapon().type === 'teleport') orig.doTeleport(+e.x, +e.y); break; }
      }
    } finally { S.applying = false; }
    UI.lastSig = '';
  }
  function myTurn() { return !!(S && S.sim && S.myTeam >= 0 && G.mode === 'play' && G.activeWorm && G.activeWorm.team === S.myTeam && !G.swarm && !S.over && S.f >= S.turnF + COOP_GRACE); }
  function freeRun() {   // a phone may run on without the clock when nobody can send input: enemy turns and the first frames of a turn
    if (!S || (S.gone && Object.keys(S.gone).length) || G.mode !== 'play' || !G.activeWorm) return false;
    const t = G.teams[G.activeWorm.team]; if (G.swarm || (t && t.cpu)) return true;
    return S.f < S.turnF + COOP_GRACE;
  }
  function submit(payload) {   // my buttons / actions -> the host (or straight to the stamp if I am the host)
    if (!S || !S.sim) return;
    stamp(S.myTeam, payload.s, payload.ev);
  }
  function stamp(tm, s, ev) {   // I am the clock: give my input the next frame number, apply it, tell everybody
    if (!G.activeWorm || G.activeWorm.team !== tm || G.mode !== 'play') return;
    const rec = { k: 'in', sk: S.sk, f: S.f, tm, s, ev };
    tx('*', rec); S.pre.push(rec);
  }
  function clockId() {   // who numbers the frames right now: the player whose turn it is, otherwise the host
    const w = G.activeWorm;
    if (w && G.mode === 'play' && !G.swarm) { const t = G.teams[w.team]; if (t && !t.cpu && t.pid && !(S.gone && S.gone[w.team])) return t.pid; }
    return net.hostId;
  }
  function sampleLocal() {   // read my real fingers (the game's own In), turn them into an input message
    const cur = { l: +In.left, r: +In.right, u: +In.up, d: +In.down, fi: +In.fire, fa: +!!In.fast }, ev = [];
    if (In.firePressed) ev.push('fp'); if (In.jump) ev.push('j'); if (In.flip) ev.push('fl');
    In.firePressed = In.jump = In.flip = false;   // the real action happens when the stamped input comes back
    const last = S.lastSent || ZERO, same = cur.l === last.l && cur.r === last.r && cur.u === last.u && cur.d === last.d && cur.fi === last.fi && cur.fa === last.fa;
    if (!myTurn()) { if (!same) S.lastSent = ZERO; S.uiq.length = 0; return; }
    if (same && !ev.length && !S.uiq.length) return;
    S.lastSent = cur; for (const u of S.uiq) ev.push(u); S.uiq.length = 0;
    submit({ s: cur, ev });
  }
  function emitUi(u) { if (!S || !S.sim) return false; if (!myTurn()) { try { Snd.play('dud'); } catch (e) { } return true; } S.uiq.push(u); return true; }

  function step(orig_, iAmClock) {   // exactly one frame of the fight, the same on every phone
    const rnd0 = Math.random; Math.random = S.rng; S.stepping = true;
    const ph = { left: In.left, right: In.right, up: In.up, down: In.down, fire: In.fire, fast: In.fast, firePressed: In.firePressed, jump: In.jump, flip: In.flip };
    try {
      // 1. inputs that belong to this frame
      { const pre = S.pre; S.pre = []; for (const r of pre) applyRec(r); }
      while (S.q.length && S.q[0].f <= S.f) applyRec(S.q.shift());
      // 2. my buttons are replaced by the stamped ones of whoever's turn it is
      const aw = G.activeWorm, si = (aw && S.simIn[aw.team]) || null;
      In.left = !!(si && si.l); In.right = !!(si && si.r); In.up = !!(si && si.u); In.down = !!(si && si.d); In.fire = !!(si && si.fi); In.fast = !!(si && si.fa);
      In.firePressed = !!(si && si.fp); In.jump = !!(si && si.j); In.flip = !!(si && si.fl);
      if (si) { si.fp = si.j = si.fl = false; }
      orig_.call(null);
    } finally {
      In.left = ph.left; In.right = ph.right; In.up = ph.up; In.down = ph.down; In.fire = ph.fire; In.fast = ph.fast; In.firePressed = false; In.jump = false; In.flip = false;
      Math.random = rnd0; S.stepping = false;
    }
    S.f++;
    if (S.f % 60 === 0) { const h = hash(); if (iAmClock) S.myHash = h; else { const hh = S.hashes[S.f]; if (hh != null) { delete S.hashes[S.f]; S.checks = (S.checks || 0) + 1; if (hh !== h && !S.bad) { S.bad = true; console.warn('COOP out of sync at frame', S.f); toast('Out of sync with the host (leave and join again)'); if (hooks.onDesync) hooks.onDesync(S.f); } } } }
    if (G.mode !== 'play') {
      S.over = true;
      if (iAmClock) {   // the stage ended on THIS frame: tell everybody the final frame number right now (the normal 40 ms heartbeat stops here, so the other phones waited for frames that never came and showed "Connection lost"). Sent 3 times so one lost message cannot freeze anybody.
        const sk = S.sk, f = S.f, send = () => tx('*', { k: 'hb', sk, f });
        send(); setTimeout(send, 200); setTimeout(send, 700);
      }
    }
  }

  function coopUpdate(orig_) {   // replaces the game's updateGame while a co-op stage is on
    if (!S || !S.sim || S.dead || G.mp !== S) return orig_.call(null);
    if (G.mode !== 'play') { if (S.over) return orig_.call(null); return; }
    const me = clockId() === net.myId;
    sampleLocal();
    if (me) {   // my turn (or an enemy turn and I am the host): I number the frames, nobody can run ahead of me
      S.stall = 0; step(orig_, true);
      if (clockId() !== net.myId) { S.limit = S.f; S.lastHb = 0; }   // the turn went to somebody else: I wait for him at this frame
      const now = performance.now();
      if (now - S.lastHb >= 40 || S.f % 60 === 0) { S.lastHb = now; tx('*', { k: 'hb', sk: S.sk, f: S.f, h: S.f % 60 === 0 ? S.myHash : undefined }); }
      if (S.gone) for (const k in S.gone) if (S.gone[k] === 1 && S.f >= S.limit) { S.gone[k] = 2; const rec = { k: 'in', sk: S.sk, f: S.f, tm: -1, drop: +k }; tx('*', rec); S.pre.push(rec); }
      return;
    }
    let n = 1, behind = S.limit - S.f; if (behind > 120) n = 12; else if (behind > 24) n = 4; else if (behind > 3) n = 2;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      if (S.f >= S.limit && !freeRun()) break;
      const c = clockId() === net.myId; step(orig_, c); if (G.mode !== 'play') break; if (c) break; if (performance.now() - t0 > 12) break;
    }
    if (S.f >= S.limit && !freeRun()) {
      if (G.cam && G.cam.shake > 0.05) G.cam.shake *= 0.8;   // the shake only fades while the fight runs: fade it by hand while we wait
      const now = performance.now(); if (!S.stall) S.stall = now;
      else {
        const mineDead = !net.ws || net.ws.readyState > 1;
        if (now - S.stall > 3000 && !S.stallMsg) { S.stallMsg = true; toast('A player lost connection... waiting a moment'); }
        // the server removes a silent player after a few seconds and then his robot goes down: the others just carry on. We only give up if OUR connection is dead (or after a very long silence).
        if ((mineDead && now - S.stall > 6000 || now - S.stall > 60000) && !S.bad) { S.bad = true; toast('Connection lost'); if (hooks.onLost) hooks.onLost(); }
      }
    } else { S.stall = 0; S.stallMsg = false; }
  }

  // ---------------- hooks into the game (installed once, they do nothing unless a co-op stage is on) ----------------
  function on() { return !!(S && S.sim && !S.dead && G.mp === S); }
  function install() {
    if (installed) return; installed = true;
    const ug = window.updateGame; window.updateGame = function () { return S ? coopUpdate(ug) : ug.apply(this, arguments); };
    const st = window.startTurn;
    window.startTurn = function () {
      if (on()) {
        S.simIn = {}; S.turnF = S.f;   // a new turn: nobody is holding anything
        if (G.mode === 'play') {
          const hum = G.teams.filter(t => !t.cpu && teamAlive(t.idx)), en = G.teams.filter(t => t.cpu && teamAlive(t.idx));
          if (!en.length) { endGame(hum[0] || null); return; }
          if (!hum.length) { endGame(en[0]); return; }
        }
      }
      return st.apply(this, arguments);
    };
    orig.doTeleport = window.doTeleport;
    window.doTeleport = function (x, y) { if (on() && !S.applying && !S.stepping) { emitUi({ u: 'tp', x: Math.round(x), y: Math.round(y) }); return; } return orig.doTeleport.apply(this, arguments); };
    // anything random that only makes noise must not use the shared random numbers
    for (const k of ['play', 'noise', 'tone']) { const f = Snd[k]; Snd[k] = function () { const cur = Math.random; if (cur === REAL_RANDOM) return f.apply(this, arguments); Math.random = REAL_RANDOM; try { return f.apply(this, arguments); } finally { Math.random = cur; } }; }
    // potions are used up on the phone of the player who drinks them, not on every phone
    if (typeof Profile !== 'undefined' && Profile.addStock) { const as = Profile.addStock; Profile.addStock = function () { if (on() && S.stepping && G.activeWorm && G.activeWorm.team !== S.myTeam) return; return as.apply(this, arguments); }; }
    // no pause that stops only one phone: the pause screen is only a menu (Quit still works)
    const tp = UI.togglePause; UI.togglePause = function (v) { if (!on()) return tp.apply(this, arguments); if (G.mode !== 'play') return; const el = $('pauseScr'); el.hidden = v === undefined ? !el.hidden : !v; };
    const ow = UI.openWeapons; UI.openWeapons = function () { if (on() && !myTurn()) { try { Snd.play('dud'); } catch (e) { } return; } return ow.apply(this, arguments); };
    UI.buildWeapons = function () {   // same list as the game's, but a tap sends the choice to everybody
      const g = $('wgrid'); g.innerHTML = ''; const t = curTeam(); if (!t) return;
      WEAPONS.forEach((wd, i) => {
        if (wd.sig && wd.sig !== t.robot.id && !(t.ammo[wd.id] > 0)) return;
        if (wd.boss && wd.boss !== t.robot.id) return;
        if ((wd.shop || wd.sig) && !(t.ammo[wd.id] > 0)) return;
        if (wd.heal) return;
        if (G.adv && !(t.ammo[wd.id] > 0)) return;
        const am = t.ammo[wd.id], el = document.createElement('div'); el.className = 'wc' + (am <= 0 ? ' no' : '') + (t.sel === i ? ' sel' : '');
        el.innerHTML = `<img src="assets/${wpath(wd.id, (wd.sig || wd.shop) ? teamWTier(t) : 0)}" alt=""><b>${wd.name}</b><small>${wd.desc}</small><span class="am">${am === Infinity ? '∞' : 'x' + am}</span>`;
        el.onclick = () => { if (am > 0) { if (on()) emitUi({ u: 'sel', i }); else t.sel = i; Snd.play('beep'); this.closeWeapons(); this.lastSig = ''; } else Snd.play('dud'); };
        g.appendChild(el);
      });
    };
    const wrapBtn = (id, fn) => { const b = document.getElementById(id); if (!b) return; const o = b.onclick; b.onclick = function (e) { if (!on()) return o && o.call(this, e); fn.call(this, e); }; };
    wrapBtn('wbtn', function () { const t = curTeam(), hw = healWd(); if (G.flyMode && !G.charging) { emitUi({ u: 'wb' }); return; } if (UI.canPick() && hw && t.sel === WEAPONS.indexOf(hw)) { emitUi({ u: 'wb' }); return; } UI.openWeapons(); });
    wrapBtn('fbtn', function () { if (!canFly()) return; emitUi({ u: 'fly' }); });
    wrapBtn('hbtn', function () { emitUi({ u: 'heal' }); });
    wrapBtn('pb1', function () { emitUi({ u: 'pot', i: 0 }); });
    wrapBtn('pb2', function () { emitUi({ u: 'pot', i: 1 }); });
    wrapBtn('bPass', function () { emitUi({ u: 'pass' }); });
    const pb = document.getElementById('powbtn');   // POW button / P key: the game's own click handler only runs when the stamped action arrives
    if (pb) pb.addEventListener('click', e => { if (on() && !S.applying) { e.stopImmediatePropagation(); e.preventDefault(); emitUi({ u: 'pow' }); } }, true);
    addEventListener('keydown', e => { if (e.code === 'KeyP' && on() && !S.applying) { e.stopImmediatePropagation(); e.preventDefault(); emitUi({ u: 'pow' }); } }, true);
  }

  // ---------------- for the lobby ----------------
  function dropMember(id) {   // a player left the room: whoever numbers the frames takes his robot out, on the same frame everywhere
    if (S && !S.init && S.members.some(m => m.id === id)) { S.members = S.members.filter(m => m.id !== id); if (S.host) tryInit(); return; }   // he left while the stage was still loading: nobody waits for him any more
    if (!on() || S.over) return; const k = S.members.findIndex(m => m.id === id); if (k < 0) return; S.gone = S.gone || {}; if (!S.gone[k]) S.gone[k] = 1;
  }
  function setHost(id) {   // the old host left: the server made somebody else host. He now numbers the frames during enemy turns.
    if (!net || net.hostId === id) return; net.hostId = id;
    if (!S) return; S.host = amHost();
    if (!S.init && S.mine) {   // the stage had not even started: send my gear to the new host
      if (S.host) { (loads[S.sk] = loads[S.sk] || {})[net.myId] = S.mine; clearTimeout(S.timer); S.timer = setTimeout(() => { if (S && !S.init) tryInit(true); }, 6000); tryInit(); }
      else tx('h', { k: 'load', sk: S.sk, load: S.mine });
    }
  }
  return { connect, close, begin, retry, endStage, dropMember, setHost, get active() { return on(); }, get host() { return amHost(); }, get desync() { return !!(S && S.bad); }, get frame() { return S ? S.f : 0; }, get state() { return S; } };
})();
