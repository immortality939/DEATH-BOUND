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
   TUNE: COOP_HP_FULL in adventure_server.js. */
'use strict';
// Enemy and boss HP is FIXED in online Adventure: always COOP_HP_FULL (4 / 3 = the 4-player value, defined in adventure_server.js) x the table HP, whether 1, 2, 3 or 4 players are in the room.
const COOP_COLORS = ['#4da3ff', '#5be37a', '#ffd24a', '#d38bff'];
const COOP_STEP_MS = 1000 / 60;
const AWAY_TURN_SEC = 0;     // an AWAY player's turn (disconnected / lagging): his turn timer still runs but only this many seconds, then the turn passes, so the others never wait 30 s for him
const STALL_AWAY_MS = 1500;  // the player whose turn it is sent nothing for this long: the host takes his turn over (he is marked away)
const CTL_DELAY = 36;        // frames: away / back records are scheduled a little into the future, so no phone has already passed their frame (phones free-run a bit during enemy turns)
const COOP_GRACE = 36;   // frames at the start of every turn where the player cannot act yet (same on every phone): the phone that just finished its shot can keep going instead of waiting for the next player's phone

const Coop = (() => {
  const REAL_RANDOM = Math.random;
  let net = null;            // { ws, myId, hostId, closed, onclose }
  let S = null;              // the stage that is being played: see begin()
  const pend = {};           // messages that came for a stage this phone has not started yet: sk -> [d...]
  const attempts = {};       // host: how many times each stage was restarted
  const resyncs = {};        // how many times THIS phone rebuilt a stage (sk -> n): a phone that is out of sync / was offline rebuilds the stage from the log
  const cuJobs = {};         // host: catch-up streams that are being sent (player id -> job id)
  let cuSeq = 0;
  const loads = {};          // host: loadouts received per stage key: sk -> { playerId: load }
  let installed = false, orig = {};
  const hooks = { onAgain: null, onLost: null, onDesync: null, onResync: null, toast: null, onProg: null };
  const prog = (p, t) => { try { if (hooks.onProg) hooks.onProg(p, t); } catch (e) { } };   // loading progress (0..100) for the loading screen
  const toast = m => { try { (hooks.toast || (() => { }))(m); } catch (e) { } };

  // ---------------- network ----------------
  function connect(url, myId, hostId, h) {
    close();
    Object.assign(hooks, h || {});
    net = { myId, hostId, closed: false, ws: null, tries: 0, url, gapAt: 0 };
    return new Promise((res, rej) => {
      let opened = false;
      const open = () => {
        const ws = new WebSocket(url); net.ws = ws;
        ws.onopen = () => { opened = true; net.tries = 0; res(); if (net.gapAt) { const gap = performance.now() - net.gapAt; net.gapAt = 0; if (gap > 2500 && S && S.sim && !S.host) setTimeout(() => needResync('connection gap ' + Math.round(gap)), 300); } };   // back online after a long gap: messages were missed, rebuild the stage from the host's log
        setTimeout(() => { if (!opened && net && net.ws === ws) { try { ws.close(); } catch (e) { } rej(new Error('server did not answer (is it updated and awake?)')); } }, 70000);
        ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m && m.d) onMsg(m.from, m.d); };
        ws.onclose = () => { if (!net || net.closed || net.ws !== ws) return; if (!opened) { rej(new Error('no connection')); return; } if (!net.gapAt) net.gapAt = performance.now(); if (net.tries++ < 5) { toast('Connection lost... trying again'); setTimeout(() => { if (net && !net.closed) open(); }, 600); } else { toast('Connection lost'); if (hooks.onLost) hooks.onLost(); } };
        ws.onerror = () => { };
      };
      open();
    });
  }
  function close() {
    if (net) { net.closed = true; try { net.ws.close(); } catch (e) { } }
    net = null; endStage();
    for (const k in pend) delete pend[k]; for (const k in loads) delete loads[k]; for (const k in attempts) delete attempts[k]; for (const k in resyncs) delete resyncs[k]; for (const k in cuJobs) delete cuJobs[k];
  }
  function tx(to, d) { if (!net || !net.ws || net.ws.readyState !== 1) return; try { net.ws.send(JSON.stringify({ to, d })); } catch (e) { } }
  const amHost = () => !!net && net.myId === net.hostId;

  function onMsg(from, d) {
    if (from === 'srv' && d && d.k === 'pres') {   // the SERVER says (instantly, no waiting for the poll): a player went silent / the host changed
      try { if (d.host) setHost(d.host); if (S && S.init && Array.isArray(d.away)) for (const m of S.members) setAway(m.id, d.away.includes(m.id)); } catch (e) { }
      return;
    }
    if (!d || !d.k || !d.sk) return;
    if (d.k === 'load') { if (!amHost()) return; (loads[d.sk] = loads[d.sk] || {})[from] = d.load; if (S && S.sk === d.sk) { if (S.init) sendInit(from); else tryInit(); } return; }   // a phone that asks again after the stage was started (late, or came back after a disconnect) gets my 'init' again + everything that happened so far
    if (d.k === 'here') { if (!amHost()) return; if (S && S.sk === d.sk && S.sim) { const k = S.members.findIndex(m => m.id === from); if (k >= 0) S.here[k] = performance.now(); } return; }   // an away player says: I am back and caught up
    if (d.k === 'retry') { if (!amHost()) return; if (S && S.sk === d.sk) doAgain(); return; }
    if (d.k === 'again') { if (from === net.hostId && hooks.onAgain) hooks.onAgain(d.si, d.att); return; }
    if (d.k === 'init') { if (from !== net.hostId) return; }
    else if (d.k !== 'in' && d.k !== 'hb' && d.k !== 'cu') return;
    else if (d.k === 'cu' && from !== net.hostId) return;
    else if (S && !S.members.some(m => m.id === from)) return;
    if (!S || S.sk !== d.sk) { (pend[d.sk] = pend[d.sk] || []).push(d); if (pend[d.sk].length > 4000) pend[d.sk].shift(); return; }
    handle(d);
  }
  function handle(d) {
    if (!S) return;
    if (d.k === 'init') { if (!S.init) startSim(d); return; }
    if (d.k === 'in') {
      if (S.dedupe) { if (S.f > S.dedupeF + 900) S.dedupe = null; else if (S.dedupe.has(recKey(d))) return; }
      S.log.push(d);
      if (S.sim && !S.cuWait && d.f < S.f && isCtl(d) && !S.host) { needResync('late control record'); return; }   // a drop / away / back that belongs to a frame I already passed: I was ahead of everybody (lagging phone that caught up) -> rebuild from the log
      qInsert(d); if (d.f > S.limit && !isCtl(d)) S.limit = d.f; return;   // (a control record is scheduled ahead: it must not let the phones run past the frames the clock has not numbered yet)
    }
    if (d.k === 'cu') {   // catch-up stream from the host: everything that happened in this stage so far
      if (!S.cuWait) return;
      if (!S.cu || d.cid > S.cu.cid) S.cu = { cid: d.cid, n: d.n, f: d.f, parts: [], got: 0 };
      if (d.cid < S.cu.cid) return;
      if (!S.cu.parts[d.i]) { S.cu.parts[d.i] = d.recs || []; S.cu.got++; }
      if (S.cu.got >= S.cu.n) finishCu();
      return;
    }
    if (d.k === 'hb') { if (d.f > S.limit) S.limit = d.f; if (d.h != null) S.hashes[d.f] = d.h; return; }
  }

  const isCtl = r => r.drop != null || r.aw != null || r.bk != null;   // records that change WHO plays (drop = left for good, aw = away, bk = back): applied before the inputs of the same frame, the same on every phone
  function qInsert(d) { const q = S.q; let i = q.length; while (i > 0 && q[i - 1].f > d.f) i--; q.splice(i, 0, d); }
  const recKey = r => JSON.stringify([r.f, r.tm, r.s, r.ev, r.drop, r.aw, r.bk]);

  // ---------------- one stage ----------------
  // opts: { sk, mi, si, diff, members: [{id,name,robot}] }   members = the players in the room, host first
  function begin(opts) {
    if (!net) throw new Error('no connection');
    install(); endStage();
    { const cur = String(opts.sk).split(':'); for (const k of Object.keys(pend)) { const p = k.split(':'); if (p[0] !== cur[0] || (+p[1] < +cur[1]) || (+p[1] === +cur[1] && +p[2] < +cur[2])) delete pend[k]; } }   // messages of old stages / old runs are useless: drop them (they piled up on the phone)
    S = { sk: opts.sk, mi: opts.mi, si: opts.si, diff: opts.diff, members: opts.members.slice(), host: amHost(), init: null, sim: false, f: 0, limit: 0, q: [], simIn: {}, hashes: {}, myTeam: -1, rng: null, lastHb: 0, over: false, t0: performance.now(), turnF: 0, applying: false, stepping: false, lastSent: null, bad: false, pre: [], uiq: [], away: {}, awayReq: {}, srvAway: {}, holdTurn: {}, here: {}, log: [], cu: null, cuWait: false, catching: false };
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
  function sendInit(to) {   // host: (re)send the start of the stage; to a phone that comes late (S.f > 0) also the whole log so it can replay the fight and catch up
    const late = !!(S.sim && S.f > 0);
    tx(to, late ? Object.assign({}, S.init, { late: 1 }) : S.init);
    if (late) sendCatchUp(to);
  }
  function sendCatchUp(to) {
    const job = ++cuSeq; cuJobs[to] = job;
    const recs = S.log.slice(), f = S.f, CH = 200, n = Math.max(1, Math.ceil(recs.length / CH)); let i = 0;
    const next = () => { if (cuJobs[to] !== job || !S || S.dead) return; tx(to, { k: 'cu', sk: S.sk, cid: job, i, n, f, recs: recs.slice(i * CH, (i + 1) * CH) }); if (++i < n) setTimeout(next, 50); };   // paced: the server drops a phone that sends too many messages per second
    next();
  }
  function finishCu() {   // I got the whole log: merge it with what came live meanwhile, then replay the fight at high speed up to the present
    if (!S || !S.cu) return; const seen = new Set(), all = [];
    for (const r of [].concat(...S.cu.parts).concat(S.log)) { const k = recKey(r); if (seen.has(k)) continue; seen.add(k); all.push(r); }
    all.sort((a, b) => a.f - b.f);
    S.log = all.slice(); S.q = all; if (S.cu.f > S.limit) S.limit = S.cu.f;
    S.dedupe = seen; S.dedupeF = S.cu.f;   // records that come live a moment later but are already in the log must not be applied twice
    S.cu = null; S.cuWait = false; S.catching = true; clearTimeout(S.cuRt);
    toast('Catching up with the fight...'); prog(100, 'Catching up with the fight...');
  }
  function retryCu() {
    if (!S || S.dead || !S.cuWait) return;
    if (++S.cuTries > 6) { toast('Could not catch up with the fight'); if (hooks.onLost) hooks.onLost(); return; }
    tx('h', { k: 'load', sk: S.sk, load: S.mine }); S.cuRt = setTimeout(retryCu, 6000);
  }
  function needResync(why) {   // this phone no longer matches the others (it was offline, lagged, or missed messages): build the stage again and replay it from the host's log
    if (!S || S.dead || S.host || S.rsAsked) return false;
    const n = resyncs[S.sk] = (resyncs[S.sk] | 0) + 1; if (n > 3) return false;
    console.warn('COOP resync (' + n + '):', why); S.rsAsked = true;
    toast('Reconnecting to the fight...');
    if (hooks.onResync) hooks.onResync(); else if (hooks.onLost) hooks.onLost();
    return true;
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
    if (init.late) { S.cuWait = true; S.cuTries = 0; S.cuRt = setTimeout(retryCu, 6000); }   // I come into a fight that is already running: wait for the log, then catch up
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
    const scale = (typeof COOP_HP_FULL === 'number' && COOP_HP_FULL > 0) ? COOP_HP_FULL : 4 / 3;   // same HP for every room size
    const x0 = xs.length ? xs : [500, 620, 740];
    setup.teams = my.members.map(m => ({ cpu: false, robot: m.robot | 0 })).concat([setup.teams[1]]);
    setup.plan = my.members.map((m, k) => ({ team: k, x: k < x0.length ? x0[k] : x0[x0.length - 1] + 120 * (k - x0.length + 1), name: m.name }))
      .concat(enemies.map(p => Object.assign({}, p, { team: enemyIdx, hp: Math.max(1, Math.round(p.hp * scale)) })));
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
    if (r.drop != null) { S.gone = S.gone || {}; S.gone[r.drop] = 3; for (const w of G.worms) if (w.team === r.drop && w.state !== 'dead' && w.state !== 'drown') { w.hp = 0; killWorm(w); } return; }   // a player left: his robot goes down on the same frame everywhere
    if (r.aw != null) {   // a player is away (disconnected / lagging): his robot STAYS (he can come back), but nobody waits for him: his turn runs without input and with a short timer
      const k = r.aw; S.away[k] = 3; S.awayReq[k] = 0; delete S.simIn[k];
      const w = G.activeWorm; if (w && w.team === k && G.mode === 'play' && !G.swarm && G.phase === 'aim') { G.charging = false; G.charge = 0; if (AWAY_TURN_SEC > 0) G.timer = Math.min(G.timer, AWAY_TURN_SEC * 60); }   // the turn timer simply keeps running from where it was (AWAY_TURN_SEC > 0 would shorten it)
      return;
    }
    if (r.bk != null) { const k = r.bk; S.away[k] = 0; S.awayReq[k] = 0; return; }   // he is back: if it is his turn right now he takes it over with the time that is left on the timer
    if (S.away[r.tm] === 3) return;   // an input of a player who is away: ignored (same on every phone)
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
  const awayNow = k => !!(S.away[k] || S.awayReq[k] || S.srvAway[k] || S.holdTurn[k] === G.turnCount);   // this player cannot be the clock right now (away, being taken over, or just back and sitting out the running turn)
  function myTurn() { return !!(S && S.sim && !S.catching && S.myTeam >= 0 && G.mode === 'play' && G.activeWorm && G.activeWorm.team === S.myTeam && !G.swarm && !S.over && !awayNow(S.myTeam) && S.limit <= S.f + 2 && S.f >= S.turnF + COOP_GRACE); }   // (S.limit > S.f = others are ahead of me, e.g. my phone lagged: I am not the clock, I must catch up first and send nothing)
  function freeRun() {   // a phone may run on without the clock when nobody can send input: enemy turns and the first frames of a turn
    if (!S || G.mode !== 'play' || !G.activeWorm) return false;
    if (S.gone) for (const k in S.gone) if (S.gone[k] === 1 || S.gone[k] === 2) return false;   // only while a player's drop is still waiting to be applied (same frame on every phone). Once it is applied (3) the phones free-run again: before, ONE disconnect made every other phone depend on the network for every single frame = stutter on every hit
    for (const k in S.awayReq) if (S.awayReq[k] === 1 || S.awayReq[k] === 2) return false;   // the host is taking a player's turn over: wait for his frames (same frame everywhere)
    const t = G.teams[G.activeWorm.team]; if (G.swarm || (t && t.cpu)) return true;
    if (S.away[G.activeWorm.team] === 3) return true;   // an away player's turn: nobody can send input, every phone runs it by itself (short timer)
    return S.f < S.turnF + COOP_GRACE;
  }
  function submit(payload) {   // my buttons / actions -> the host (or straight to the stamp if I am the host)
    if (!S || !S.sim) return;
    stamp(S.myTeam, payload.s, payload.ev);
  }
  function stamp(tm, s, ev) {   // I am the clock: give my input the next frame number, apply it, tell everybody
    if (!G.activeWorm || G.activeWorm.team !== tm || G.mode !== 'play') return;
    const rec = { k: 'in', sk: S.sk, f: S.f, tm, s, ev };
    tx('*', rec); S.pre.push(rec); S.log.push(rec);
  }
  function clockId() {   // who numbers the frames right now: the player whose turn it is, otherwise the host
    const w = G.activeWorm;
    if (w && G.mode === 'play' && !G.swarm) { const t = G.teams[w.team]; if (t && !t.cpu && t.pid && !(S.gone && S.gone[w.team]) && !awayNow(w.team)) return t.pid; }
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

  function emitCtl(extra, delay) { const rec = Object.assign({ k: 'in', sk: S.sk, f: S.f + (delay | 0), tm: -1 }, extra); tx('*', rec); if (delay) qInsert(rec); else S.pre.push(rec); S.log.push(rec); }   // a control record (drop / away / back): applied on its frame (a few frames ahead for away / back) on every phone
  function hostCtl() {   // the host decides who is away and who is back (ONE decider, so every phone gets the same records)
    if (!S.host || S.f < S.limit) return;
    for (let k = 0; k < S.members.length; k++) {
      if (S.gone && S.gone[k]) continue;
      const want = !!(S.srvAway[k] || S.awayReq[k] === 1);
      if (want && S.away[k] !== 3 && S.awayReq[k] !== 2) { S.awayReq[k] = 2; emitCtl({ aw: k }, CTL_DELAY); }
      else if (!want && S.away[k] === 3 && S.here[k] && performance.now() - S.here[k] < 6000) { S.here[k] = 0; emitCtl({ bk: k }, CTL_DELAY); }
    }
  }
  function autoAway() {   // host: the player whose turn it is has sent nothing for STALL_AWAY_MS (closed the game, no signal, frozen phone): take his turn over, he is marked away
    const w = G.activeWorm; if (!w || G.swarm || G.mode !== 'play') return;
    const t = G.teams[w.team]; if (!t || t.cpu || !t.pid || t.pid === net.myId) return;
    const k = w.team; if (S.away[k] || S.awayReq[k] || (S.gone && S.gone[k])) return;
    S.awayReq[k] = 1; S.stall = performance.now();
    toast(((S.members[k] && S.members[k].name) || 'A player') + ' lost connection. The fight goes on.');
  }
  function endCatch() {
    S.catching = false;
    toast('Back in the fight!');
  }
  function hereBeat() {   // I was marked away and I am back and caught up: tell the host so he lets me play again
    if (S.myTeam < 0 || S.away[S.myTeam] !== 3 || S.catching || S.cuWait || S.f < S.limit - 60) return;
    const now = performance.now(); if (now - (S.hereAt || 0) < 1500) return; S.hereAt = now;
    if (S.host) { S.here[S.myTeam] = now; return; } tx('h', { k: 'here', sk: S.sk });
  }
  function step(orig_, iAmClock) {   // exactly one frame of the fight, the same on every phone
    const rnd0 = Math.random; Math.random = S.rng; S.stepping = true;
    const ph = { left: In.left, right: In.right, up: In.up, down: In.down, fire: In.fire, fast: In.fast, firePressed: In.firePressed, jump: In.jump, flip: In.flip };
    try {
      // 1. inputs that belong to this frame
      { const due = S.pre; S.pre = []; while (S.q.length && S.q[0].f <= S.f) due.push(S.q.shift());
        if (due.length > 1) { const c = [], n = []; for (const r of due) (isCtl(r) ? c : n).push(r); due.length = 0; due.push(...c, ...n); }   // drop / away / back first: the same order on every phone
        for (const r of due) applyRec(r); }
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
    if (S.f % 60 === 0) { const h = hash(); if (iAmClock) S.myHash = h; else { const hh = S.hashes[S.f]; if (hh != null) { delete S.hashes[S.f]; S.checks = (S.checks || 0) + 1; if (hh !== h && !S.bad) { if (needResync('out of sync at frame ' + S.f)) return; S.bad = true; console.warn('COOP out of sync at frame', S.f); toast('Out of sync with the host (leave and join again)'); if (hooks.onDesync) hooks.onDesync(S.f); } } } }
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
    if (S.cuWait) return;   // I am waiting for the log of a fight that is already running
    const me = !S.catching && clockId() === net.myId && S.limit <= S.f + 2;
    if (!S.catching) sampleLocal();
    hereBeat();
    if (me) {   // my turn (or an enemy turn and I am the host): I number the frames, nobody can run ahead of me
      S.stall = 0; step(orig_, true);
      if (clockId() !== net.myId) { S.limit = S.f; S.lastHb = 0; }   // the turn went to somebody else: I wait for him at this frame
      const now = performance.now();
      if (now - S.lastHb >= 40 || S.f % 60 === 0) { S.lastHb = now; tx('*', { k: 'hb', sk: S.sk, f: S.f, h: S.f % 60 === 0 ? S.myHash : undefined }); }
      if (S.gone) for (const k in S.gone) if (S.gone[k] === 1 && S.f >= S.limit) { S.gone[k] = 2; emitCtl({ drop: +k }); }
      hostCtl();
      return;
    }
    let n = 1, behind = S.limit - S.f, budget = 12; if (behind > 120) n = 12; else if (behind > 24) n = 4; else if (behind > 3) n = 2;
    if (S.catching) { n = 600; budget = 30; }   // replaying a fight I missed: as fast as the phone can
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      if (S.f >= S.limit && (S.catching || !freeRun())) break;   // catching up: never run past the present, even in free-run phases
      const c = !S.catching && clockId() === net.myId && S.limit <= S.f + 2; step(orig_, c); if (S.dead || G.mp !== S) return; if (G.mode !== 'play') break; if (c) break; if (performance.now() - t0 > budget) break;
    }
    if (S.catching && S.f >= S.limit - 4) endCatch();
    if (S.f >= S.limit && !freeRun()) {
      if (G.cam && G.cam.shake > 0.05) G.cam.shake *= 0.8;   // the shake only fades while the fight runs: fade it by hand while we wait
      const now = performance.now(); if (!S.stall) S.stall = now;
      else {
        const mineDead = !net.ws || net.ws.readyState > 1;
        if (now - S.stall > 1200 && !S.stallMsg) { S.stallMsg = true; toast('A player lost connection... his turn is skipped in a moment'); }
        if (S.host && now - S.stall > STALL_AWAY_MS) autoAway();   // the host takes the silent player's turn over (the server also marks him away after a few seconds); nobody else waits
        // We only give up if OUR connection is dead (or after a really long silence): a silent teammate never throws the others out
        if ((mineDead && now - S.stall > 6000 || now - S.stall > 120000) && !S.bad) { S.bad = true; toast('Connection lost'); if (hooks.onLost) hooks.onLost(); }
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
      const rv = st.apply(this, arguments);
      if (on() && G.mode === 'play' && G.activeWorm && !G.swarm && AWAY_TURN_SEC > 0 && S.away[G.activeWorm.team] === 3 && G.phase === 'aim') G.timer = Math.min(G.timer, AWAY_TURN_SEC * 60);   // an away player's turn: short timer
      return rv;
    };
    orig.doTeleport = window.doTeleport;
    window.doTeleport = function (x, y) { if (on() && !S.applying && !S.stepping) { emitUi({ u: 'tp', x: Math.round(x), y: Math.round(y) }); return; } return orig.doTeleport.apply(this, arguments); };
    // anything random that only makes noise must not use the shared random numbers
    for (const k of ['play', 'noise', 'tone']) { const f = Snd[k]; Snd[k] = function () { if (S && S.catching) return; const cur = Math.random; if (cur === REAL_RANDOM) return f.apply(this, arguments); Math.random = REAL_RANDOM; try { return f.apply(this, arguments); } finally { Math.random = cur; } }; }
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
  function setAway(id, on) {   // lobby: the server says this player is silent (on) or back (off)
    if (!S || !S.init || S.dead) return; const k = S.members.findIndex(m => m.id === id); if (k < 0) return;
    S.srvAway[k] = !!on;
  }
  function setHost(id) {   // the old host left: the server made somebody else host. He now numbers the frames during enemy turns.
    if (!net || net.hostId === id) return; net.hostId = id;
    if (!S) return; S.host = amHost();
    if (!S.init && S.mine) {   // the stage had not even started: send my gear to the new host
      if (S.host) { (loads[S.sk] = loads[S.sk] || {})[net.myId] = S.mine; clearTimeout(S.timer); S.timer = setTimeout(() => { if (S && !S.init) tryInit(true); }, 6000); tryInit(); }
      else tx('h', { k: 'load', sk: S.sk, load: S.mine });
    }
  }
  return { connect, close, begin, retry, endStage, dropMember, setAway, setHost, get active() { return on(); }, get host() { return amHost(); }, get wsOpen() { return !!(net && net.ws && net.ws.readyState === 1); }, get desync() { return !!(S && S.bad); }, get frame() { return S ? S.f : 0; }, get state() { return S; } };
})();
