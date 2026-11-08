/* ARENA (online client) - opened from the Arena building of the town (online_v2.js loads this file on first use).
   LOBBY  : chambers list (rooms made by other players), Team up / Search / Start, chat, your character, online players, Free / League filter.
   ROOM   : up to 4 slots (name, level, weapon), Free Fight / League Fight, My items + Item shop (Heal + Team Heal, max 2 each), Invite (friends / world), Start (room owner) or Ready (everybody else).
   SEARCH : Start looks for another room that also waits for the same team size (2 vs 2 ...), then VS screen, then a fight on a random map (normal maps + arena_maps_server.js).
   ONE robot per player in every fight (per: 1). Teammates are allies (setup.squads) and start next to each other (setup.plan).
   SERVER : calls are listed in SERVER_API.md (/api/arena/...). While the server does not answer them (404) the Arena runs in PRACTICE mode: rooms, players and opponents
            are simulated on the phone (opponents are played by the computer), so every screen can already be tested. Pictures: assets/online/arena/*.png (made for this screen). */
'use strict';
const ArenaUI = (() => {
  const A = n => 'assets/online/arena/' + n;   // the pictures are inside the app (assets/online/arena/)
  const U = n => 'url(' + A(n) + ')';
  const MAXP = 4, PAGE = 8;
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[rint(0, a.length - 1)];
  let C = null;                       // helpers given by online_v2.js
  let st = null;                      // screen state
  let stage = null, scaleEl = null, chatEl = null, pollT = 0, fitFn = null, overlay = null;

  // ---------------------------------------------------------------- css
  const css = `
#onl .arw{position:absolute;inset:0;overflow:hidden;background:#1b0f06 ${U('wood_dark.png')};}
#onl .arw::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 40%,rgba(0,0,0,.6));pointer-events:none}
#onl .ar{position:absolute;left:0;top:0;width:960px;height:500px;transform-origin:0 0;font-family:var(--body,sans-serif);font-weight:700;color:#fff4d6;z-index:1}
#onl .ar *{box-sizing:border-box}
#onl .ar .fr{position:absolute;border:var(--bw,14px) solid transparent;border-image-slice:42;border-image-width:var(--bw,14px);border-image-repeat:stretch;background-clip:padding-box;background-origin:padding-box}
#onl .ar .pn{border-image-source:${U('f_panel.png')};background-color:#7a4c26;background-image:${U('wood.png')}}
#onl .ar .dk{border-image-source:${U('f_list.png')};background:#0a0603;box-shadow:inset 0 0 18px #000}
#onl .ar .pl{border-image-source:${U('f_plate.png')};background-color:#a06c34;background-image:${U('wood_light.png')};--bw:12px}
#onl .ar .cd{border-image-source:${U('f_card.png')};background-color:#a86c34;background-image:${U('wood_light.png')};--bw:8px;cursor:pointer}
#onl .ar .cd:active{transform:translateY(2px)} #onl .ar .cd.hot{border-image-source:${U('f_card_hot.png')}}
#onl .ar .cd.full{border-image-source:${U('f_card_full.png')};filter:saturate(.35) brightness(.8);cursor:default}
#onl .ar .bt{border-image-source:${U('f_btn.png')};background-color:#8a5a2c;background-image:${U('wood.png')};--bw:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;font:400 17px var(--disp,sans-serif);color:#fff4d6;text-shadow:0 2px 0 #3a1f08;letter-spacing:.5px;user-select:none;-webkit-user-select:none}
#onl .ar .bt:active{transform:translateY(2px);filter:brightness(.9)} #onl .ar .bt:hover{filter:brightness(1.12)}
#onl .ar .bt.gold{border-image-source:${U('f_gold.png')};background-color:#e08a20;background-image:${U('wood_gold.png')};color:#fff;text-shadow:0 2px 0 #6a2f00}
#onl .ar .bt.off{filter:grayscale(.85) brightness(.7);cursor:default}
#onl .ar .big{flex-direction:column;gap:2px;--bw:12px;font-size:19px}
#onl .ar .big img{width:62px;height:62px;display:block;filter:drop-shadow(0 3px 2px rgba(0,0,0,.5));pointer-events:none}
#onl .ar .sl{border-image-source:${U('f_slot.png')};background-color:#7a4c26;background-image:${U('wood.png')};--bw:10px}
#onl .ar .h2{font:400 21px var(--disp,sans-serif);color:#ffd27a;text-shadow:0 2px 0 #3a1f08;letter-spacing:.5px}
#onl .ar .tt{font:400 26px var(--disp,sans-serif);color:#fff2c4;-webkit-text-stroke:5px #4a2208;paint-order:stroke fill;display:flex;align-items:center;justify-content:center;text-align:center;letter-spacing:1px}
#onl .ar .sm{font-size:13px;color:#e8cf9e;font-weight:600} #onl .ar .lv{color:#ffe27a}
#onl .ar .scroll{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#c58a45 #1a0f06}
#onl .ar .rcard{display:flex;align-items:center;gap:8px;padding:0 4px;height:100%}
#onl .ar .rcard .n{font:400 17px var(--disp,sans-serif);color:#fff;text-shadow:0 2px 0 #4a2208;line-height:1}
#onl .ar .rcard .c{margin-left:auto;font:400 21px var(--disp,sans-serif);color:#ffe27a;text-shadow:0 2px 0 #4a2208}
#onl .ar .tag{display:inline-block;font-size:11px;padding:0 6px;border-radius:9px;margin-right:5px;color:#102}
#onl .ar .tag.free{background:#7fe58a} #onl .ar .tag.league{background:#8ac3ff}
#onl .ar .prow{display:flex;align-items:center;gap:6px;padding:3px 6px;font-size:15px;border-bottom:1px solid rgba(255,230,170,.12);cursor:default}
#onl .ar .prow b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff}
#onl .ar .prow img{width:26px;height:26px;object-fit:contain}
#onl .ar .ddm{position:absolute;z-index:20;width:150px}
#onl .ar .ddm div{padding:8px 10px;cursor:pointer;font-size:16px} #onl .ar .ddm div:hover{background:rgba(255,200,100,.25)}
#onl .ar .name{font:400 17px var(--disp,sans-serif);color:#fff;text-shadow:0 2px 0 #3a1f08;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#onl .ar .ready{position:absolute;right:10px;bottom:6px;font:400 22px var(--disp,sans-serif);color:#7dff8a;-webkit-text-stroke:4px #123d17;paint-order:stroke fill;letter-spacing:1px;transform:rotate(-6deg)}
#onl .ar .mode{border:0;position:absolute;width:196px;height:108px;padding:6px 10px;cursor:pointer;border-radius:10px;font-size:13px;line-height:1.2;font-weight:600;color:#fff;background:rgba(0,0,0,.35)}
#onl .ar .mode b{display:block;font:400 17px var(--disp,sans-serif);margin-bottom:3px}
#onl .ar .modefr{position:absolute;inset:-7px;border:7px solid transparent;pointer-events:none}
#onl .ar .mode.free .modefr{border-image:${U('f_free.png')} 42 / 7px stretch} #onl .ar .mode.league .modefr{border-image:${U('f_league.png')} 42 / 7px stretch}
#onl .ar .mode.on{background:rgba(255,230,140,.2);box-shadow:0 0 16px 2px rgba(255,214,90,.75)} #onl .ar .mode.lock{filter:grayscale(.8) brightness(.7)}
#onl .ar .ibox{position:absolute;width:62px;height:62px;display:flex;align-items:flex-end;justify-content:flex-end;font:400 17px var(--disp,sans-serif);text-shadow:0 2px 0 #000;padding:2px 5px}
#onl .ar .ibox img{position:absolute;inset:6px;width:calc(100% - 12px);height:calc(100% - 12px);object-fit:contain}
#onl .ar .ibox span{position:relative}
#onl .ar .arow{display:flex;align-items:center;gap:8px;height:52px;padding:0 4px}
#onl .ar .arow img{width:40px;height:40px;object-fit:contain} #onl .ar .arow .t{flex:1;font-size:14px;line-height:1.05} #onl .ar .arow .t i{display:block;font-style:normal;color:#ffe27a;font-size:13px}
#onl .ar .mini{width:60px;height:34px;--bw:8px;font-size:14px}
#onl .ar .ics{position:absolute;display:flex;gap:6px;justify-content:space-between}
#onl .ar .ics img{height:52px;cursor:pointer;filter:drop-shadow(0 3px 3px rgba(0,0,0,.6));transition:transform .12s}
#onl .ar .ics img:active{transform:scale(.92)} #onl .ar .ics img:hover{transform:translateY(-3px)}
#onl .ar .chat{--cw:300px;left:10px;bottom:6px}
#onl .arov{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;background:rgba(6,3,0,.74)}
#onl .spin{width:54px;height:54px;border-radius:50%;border:7px solid rgba(255,214,120,.25);border-top-color:#ffd27a;animation:arspin 1s linear infinite} @keyframes arspin{to{transform:rotate(360deg)}}
@keyframes arin{from{opacity:0;transform:translateX(var(--fx,0)) scale(.9)}to{opacity:1;transform:none}}
@keyframes arvs{0%{opacity:0;transform:scale(2.4)}60%{opacity:1;transform:scale(.92)}100%{transform:scale(1)}}
`;

  // ---------------------------------------------------------------- data helpers
  const NAMES = ['Blaze', 'Kuro', 'Mika', 'Dante', 'Rhea', 'Orion', 'Zed', 'Nyx', 'Vex', 'Luna', 'Axel', 'Jinx', 'Tako', 'Rex', 'Sora', 'Hana', 'Bolt', 'Ember', 'Frost', 'Gale', 'Ivy', 'Jett', 'Kai', 'Lynx', 'Milo', 'Nova', 'Onyx', 'Pike', 'Quill', 'Rune', 'Sable', 'Tess', 'Ulf', 'Vera', 'Wren', 'Yuki', 'Zara', 'Drako', 'Mox', 'Ruka'];
  const LEAGUES = ['Iron Wolves', 'Crimson Gears', 'Storm Legion'];
  const robotsN = () => { try { return C.robots().length; } catch (e) { return 10; } };
  const myLevel = () => { try { return Profile.level(); } catch (e) { return 1; } };
  function weaponOf(rid) {   // the weapon a robot wears (name + picture)
    try {
      const it = itemById(Profile.eqOf(rid).weapon);
      if (it) return { name: it.name, img: it.img };
    } catch (e) { }
    return null;
  }
  function me() {
    const p = C.session().player; let w = null;
    try { Profile.data || Profile.load(); w = weaponOf(Profile.charId()); } catch (e) { }
    return { name: p.name, robot: p.robot | 0, level: myLevel(), weapon: w, league: p.league || null, power: p.power | 0, ready: false, me: true };
  }
  function botWeapon() {
    try { const l = SHOP_WEAPON_ITEMS; const it = pick(l); return { name: it.name, img: it.img }; } catch (e) { return { name: 'Cannon', img: null }; }
  }
  const used = new Set();
  function mkBot(near, league) {
    let nm; for (let i = 0; i < 30; i++) { nm = pick(NAMES) + (Math.random() < .5 ? rint(1, 99) : ''); if (!used.has(nm)) break; }
    used.add(nm);
    return { name: nm, robot: rint(0, robotsN() - 1), level: Math.max(1, near + rint(-4, 6)), weapon: botWeapon(), league: league || null, power: rint(80, 900), ready: false, bot: true };
  }

  // ---------------------------------------------------------------- network (real server or practice mode)
  const Sim = { rooms: [], online: [], my: null, nextNum: 20, search: null, joinAt: [], notes: 0 };
  function simRoom(host, mode, league) { return { id: 's' + Sim.nextNum, num: Sim.nextNum++, mode, league: league || null, state: 'idle', players: [host] }; }
  function simInit() {
    if (Sim.rooms.length) return;
    const lv = myLevel();
    for (let i = 0; i < 11; i++) {
      const lg = Math.random() < .35 ? pick(LEAGUES) : null, host = mkBot(lv, lg); host.host = true;
      const r = simRoom(host, lg ? 'league' : 'free', lg);
      const n = rint(0, 3); for (let k = 0; k < n; k++) { const b = mkBot(lv, lg); b.ready = true; r.players.push(b); }
      Sim.rooms.push(r);
    }
    Sim.online = Array.from({ length: 16 }, () => mkBot(lv, Math.random() < .3 ? pick(LEAGUES) : null));
  }
  function simChurn() {   // Search / refresh: some rooms close, new ones open
    Sim.rooms = Sim.rooms.filter(r => r === Sim.my || Math.random() > .25);
    const lv = myLevel(), add = rint(1, 3);
    for (let i = 0; i < add && Sim.rooms.length < 14; i++) { const lg = Math.random() < .3 ? pick(LEAGUES) : null, host = mkBot(lv, lg); host.host = true; const r = simRoom(host, lg ? 'league' : 'free', lg); if (Math.random() < .6) { const b = mkBot(lv, lg); b.ready = true; r.players.push(b); } Sim.rooms.push(r); }
    Sim.online = Sim.online.filter(() => Math.random() > .15); while (Sim.online.length < 14) Sim.online.push(mkBot(lv, Math.random() < .3 ? pick(LEAGUES) : null));
  }
  const clone = r => r && JSON.parse(JSON.stringify(r));
  const mark = r => { if (r && r.players) { const nm = C.session().player.name; r.players.forEach(p => { p.me = p.name === nm; }); } return r; };
  const Net = {
    sim: false, told: false,
    async call(path, body, simFn) {
      if (!this.sim) {
        try { const j = await C.api('/api/arena/' + path, body); if (j.room) mark(j.room); if (j.rooms) j.rooms.forEach(mark); return j; }
        catch (e) { if (e.status && e.status !== 404 && e.status !== 405 && e.status !== 501) throw e; this.sim = true; }
      }
      if (this.sim && !this.told) { this.told = true; C.toast('Practice mode: other players are simulated until the Arena server is ready.'); }
      simInit(); const j = await simFn(body || {}); if (j && j.room) mark(j.room); return j;
    },
    rooms(server) { return this.call('rooms', { server }, () => ({ rooms: Sim.rooms.filter(r => r.state !== 'playing').map(clone) })).then(j => j.rooms); },
    online(server) { return this.call('online', { server }, () => ({ players: Sim.online.map(clone) })).then(j => j.players); },
    create(server, mode) {
      return this.call('create', { server, mode }, () => {
        const m = me(); m.host = true; if (mode === 'league' && !m.league) throw new Error('You are not in a league.');
        const r = simRoom(m, mode, mode === 'league' ? m.league : null); Sim.rooms.unshift(r); Sim.my = r; return { room: clone(r) };
      }).then(j => j.room);
    },
    join(server, id) {
      return this.call('join', { server, room: id }, () => {
        const r = Sim.rooms.find(x => x.id === id); if (!r) throw new Error('That room was closed.');
        if (r.players.length >= MAXP) throw new Error('That room is full.'); if (r.state !== 'idle') throw new Error('That room is already searching.');
        const m = me(); if (r.mode === 'league' && (!m.league || m.league !== r.league)) throw new Error('League Fight: only players of ' + r.league + ' can join.');
        r.players.push(m); Sim.my = r; Sim.joinAt = []; r._goAt = 0; return { room: clone(r) };
      }).then(j => j.room);
    },
    leave(id) { return this.call('leave', { room: id }, () => { const r = Sim.my; if (r) { r.players = r.players.filter(p => !p.me); if (!r.players.some(p => p.host) && r.players.length) r.players[0].host = true; if (!r.players.length || r.players.every(p => p.bot) && r.players.length === 0) Sim.rooms = Sim.rooms.filter(x => x !== r); } Sim.my = null; Sim.search = null; return {}; }).catch(() => { }); },
    ready(id, v) { return this.call('ready', { room: id, ready: !!v }, () => { const r = Sim.my; const p = r && r.players.find(x => x.me); if (p) p.ready = !!v; if (r && v) r._goAt = Date.now() + 1500; return { room: clone(r) }; }); },
    mode(id, mode) { return this.call('mode', { room: id, mode }, () => { const r = Sim.my; if (r) { r.mode = mode; r.league = mode === 'league' ? (me().league) : null; } return { room: clone(r) }; }); },
    start(id) { return this.call('start', { room: id }, () => { const r = Sim.my; r.state = 'searching'; Sim.search = { t0: Date.now(), at: Date.now() + rint(2800, 6500) }; return { room: clone(r) }; }); },
    cancel(id) { return this.call('cancel', { room: id }, () => { if (Sim.my) Sim.my.state = 'idle'; Sim.search = null; return {}; }).catch(() => { }); },
    invite(id, name) { return this.call('invite', { room: id, to: name }, () => { const r = Sim.my; const b = Sim.online.find(p => p.name === name); if (r && b) Sim.joinAt.push({ at: Date.now() + rint(1200, 3200), p: b }); return {}; }); },
    poll(server, id) {   // -> { room, match }  (room = null: it was closed; match = { opp:[players] } when an opponent was found)
      return this.call('poll', { server, room: id }, () => {
        const r = Sim.my; if (!r) return { room: null };
        const now = Date.now();
        // simulated players: invited ones join, then every bot becomes ready
        for (const j of Sim.joinAt.slice()) if (now >= j.at) { Sim.joinAt.splice(Sim.joinAt.indexOf(j), 1); if (r.players.length < MAXP && !r.players.some(p => p.name === j.p.name) && (r.mode !== 'league' || j.p.league === r.league || Math.random() < .5)) { const b = clone(j.p); if (r.mode === 'league') b.league = r.league; b.ready = false; b._rt = now + rint(900, 2600); r.players.push(b); } }
        for (const p of r.players) if (p.bot && !p.ready && p._rt && now >= p._rt) p.ready = true;
        // we joined as a guest: the owner starts when everybody is ready
        const hostBot = r.players.find(p => p.host && p.bot);
        if (hostBot && r.state === 'idle' && r.players.every(p => p.host || p.ready) && r._goAt && now >= r._goAt && r.players.some(p => p.me && p.ready)) { r.state = 'searching'; Sim.search = { t0: now, at: now + rint(2800, 6000) }; }
        let match = null;
        if (r.state === 'searching' && Sim.search && now >= Sim.search.at) {
          const lv = myLevel(), n = r.players.length, lg = r.mode === 'league' ? pick(LEAGUES.filter(x => x !== r.league)) : null;
          const opp = Array.from({ length: n }, (_, i) => { const b = mkBot(lv, lg); b.host = i === 0; return b; });
          match = { opp }; r.state = 'idle'; Sim.search = null; r.players.forEach(p => { if (!p.host) p.ready = false; });
        }
        return { room: clone(r), match };
      });
    },
  };

  // ---------------------------------------------------------------- stage
  function newStage() {
    stopPoll(); if (overlay) { overlay.remove(); overlay = null; } clearInterval(searchT); searchEl = null; if (fitFn) removeEventListener('resize', fitFn);
    const arw = C.h('div', { class: 'arw' }); scaleEl = C.h('div', { class: 'ar' }); arw.append(scaleEl);
    stage = arw;
    const fit = () => { const w = window.innerWidth, hh = window.innerHeight, s = Math.min(w / 960, hh / 500); scaleEl.style.transform = 'translate(' + ((w - 960 * s) / 2) + 'px,' + ((hh - 500 * s) / 2) + 'px) scale(' + s + ')'; if (overlay && overlay.firstChild) overlay.firstChild.style.transform = scaleEl.style.transform; };
    fitFn = fit; fit(); addEventListener('resize', fit);
    C.set(arw); return scaleEl;
  }
  function el(cls, style, ...kids) { return C.h('div', { class: cls, style }, ...kids); }
  const px = (l, t, w, hh) => `position:absolute;left:${l}px;top:${t}px;width:${w}px;height:${hh}px;`;
  function robotFront(idx, style) { const r = C.robotOf(idx); const i = C.robotImg(r); if (style) i.setAttribute('style', style); return i; }
  function stopPoll() { clearInterval(pollT); pollT = 0; }
  function iconBar(l, t, w) {   // bag (= profile) / friends / quests / settings
    const mk = (id, name, fn) => C.h('img', { src: 'assets/online/i_' + id + '.webp', alt: name, title: name, onclick: () => { C.beep(); fn(); } });
    return el('ics', px(l, t, w, 52), mk('bag', 'Profile', openProfile), mk('friends', 'Friends', () => C.toast('Friends list: coming next.')), mk('scroll', 'Quests', () => C.toast('Quests: coming next.')), mk('gear', 'Settings', () => C.toast('Settings: coming next.')));
  }
  function openProfile() { stopPoll(); C.goGame(() => Profile.open(), () => { st.view === 'room' ? showRoom() : showLobby(); }); }
  function chatBoxEl() { if (!chatEl) chatEl = C.chatBox(C.session().player); return chatEl; }
  const btn = (cls, style, label, fn, icon) => C.h('div', { class: 'fr bt ' + cls, style, onclick: () => { C.beep(); fn(); } }, icon ? C.h('img', { src: A(icon), alt: '' }) : null, label);

  // ---------------------------------------------------------------- LOBBY
  async function refreshLobby(quiet) {
    try { st.rooms = await Net.rooms(st.server); st.onlineP = await Net.online(st.server); if (!quiet) C.toast(st.rooms.length + ' rooms found'); }
    catch (e) { C.toast(e.message); }
    if (st.view === 'lobby') showLobby();
  }
  function teamUp(mode) {
    Net.create(st.server, mode || (st.filter === 'league' ? 'league' : 'free')).then(r => { st.room = r; st.view = 'room'; showRoom(); }).catch(e => C.toast(e.message));
  }
  function joinRoom(r) {
    if (r.players.length >= MAXP) return C.toast('That room is full.');
    Net.join(st.server, r.id).then(j => { st.room = j; st.view = 'room'; showRoom(); }).catch(e => { C.toast(e.message); refreshLobby(true); });
  }
  function showLobby() {
    stopPoll(); st.view = 'lobby'; const p = me(), g = newStage();
    // header
    g.append(btn('', px(10, 8, 80, 36), 'Back', () => { stopPoll(); removeEventListener('resize', fitFn); C.goTown(); }));
    g.append(el('fr pl tt', px(380, 2, 200, 48), 'ARENA'));
    // chambers
    const shown = st.rooms.filter(r => st.filter === 'all' || r.mode === st.filter);
    const pages = Math.max(1, Math.ceil(shown.length / PAGE)); st.page = Math.min(st.page, pages - 1);
    g.append(el('fr pn', px(10, 54, 640, 280)));
    g.append(el('h2 h2', px(30, 62, 200, 26), 'Chambers'));
    const dd = btn('', px(520, 60, 112, 28), (st.filter === 'all' ? 'All' : st.filter === 'free' ? 'Free Fight' : 'League Fight'), () => ddMenu(), 'ic_arrow.png');
    dd.style.fontSize = '13px'; dd.querySelector('img').style.cssText = 'width:20px;height:20px;order:2'; g.append(dd);
    const gx = [24, 336];
    shown.slice(st.page * PAGE, st.page * PAGE + PAGE).forEach((r, i) => {
      const full = r.players.length >= MAXP, host = r.players.find(x => x.host) || r.players[0];
      const c = C.h('div', { class: 'fr cd' + (full ? ' full' : ''), style: px(gx[i % 2], 92 + Math.floor(i / 2) * 50, 300, 46), onclick: () => { C.beep(); if (full) C.toast('That room is full.'); else joinRoom(r); } },
        C.h('div', { class: 'rcard' }, C.h('div', null, C.h('div', { class: 'n' }, 'Sports Fight'), C.h('div', { class: 'sm' }, C.h('span', { class: 'tag ' + r.mode }, r.mode === 'league' ? 'League' : 'Free'), host ? host.name : '')), C.h('div', { class: 'c' }, r.players.length + '/' + MAXP)));
      g.append(c);
    });
    if (!shown.length) g.append(el('sm', px(24, 160, 612, 40) + 'text-align:center;font-size:17px', 'No rooms yet. Press Team up or Start to open one.'));
    g.append(btn('mini', px(430, 296, 62, 30), 'Prev', () => { if (st.page > 0) { st.page--; showLobby(); } }));
    g.append(el('sm', px(496, 300, 60, 22) + 'text-align:center;font-size:14px', (st.page + 1) + ' / ' + pages));
    g.append(btn('mini', px(556, 296, 62, 30), 'Next', () => { if (st.page < pages - 1) { st.page++; showLobby(); } }));
    // chat + the three big buttons
    g.append(chatBoxEl());
    g.append(btn('big', px(322, 344, 104, 144), 'Team up', () => teamUp(), 'ic_team.png'));
    g.append(btn('big', px(434, 344, 104, 144), 'Search', () => refreshLobby(), 'ic_search.png'));
    g.append(btn('big gold', px(546, 344, 104, 144), 'Start', quickStart, 'ic_start.png'));
    // right column: your character + online players
    g.append(el('fr pn', px(660, 54, 290, 174)));
    g.append(el('h2', px(676, 60, 250, 24), 'User Profile'));
    g.append(robotFront(p.robot, `position:absolute;left:672px;top:84px;width:118px;height:118px;object-fit:contain;filter:drop-shadow(0 4px 3px rgba(0,0,0,.6))`));
    g.append(el('', px(796, 90, 150, 110), '', C.h('div', { class: 'name', style: 'font-size:20px' }, p.name), C.h('div', { class: 'lv', style: 'font-size:17px' }, 'Lv ' + p.level), C.h('div', { class: 'sm' }, C.robotOf(p.robot).name), C.h('div', { class: 'sm' }, 'Power ' + p.power), C.h('div', { class: 'sm' }, p.league ? 'League: ' + p.league : 'No league'), C.h('div', { class: 'sm' }, 'Server ' + st.server)));
    g.append(el('fr dk', px(660, 232, 290, 206)));
    g.append(el('h2', px(676, 238, 250, 24) + 'font-size:17px', 'Online players (' + st.onlineP.length + ')'));
    const list = el('scroll', px(672, 264, 266, 166));
    for (const q of st.onlineP) list.append(C.h('div', { class: 'prow' }, C.robotImg(C.robotOf(q.robot)), C.h('b', null, q.name), C.h('span', { class: 'lv' }, 'Lv ' + q.level)));
    g.append(list);
    g.append(iconBar(660, 444, 290));
  }
  function ddMenu() {
    const old = scaleEl.querySelector('.ddm'); if (old) return old.remove();
    const m = el('fr bt ddm', 'left:496px;top:90px;width:136px;display:block;--bw:9px;font:600 16px var(--body)');
    for (const [k, t] of [['all', 'All rooms'], ['free', 'Free Fight'], ['league', 'League Fight']]) m.append(C.h('div', { onclick: e => { e.stopPropagation(); C.beep(); st.filter = k; st.page = 0; showLobby(); } }, t));
    scaleEl.append(m);
  }
  function quickStart() {   // Start in the lobby: opens a room and looks for an opponent right away (1 vs 1)
    Net.create(st.server, 'free').then(r => { st.room = r; st.view = 'room'; showRoom(); doStart(); }).catch(e => C.toast(e.message));
  }

  // ---------------------------------------------------------------- ROOM
  const POTS = () => { try { return POTION_ITEMS; } catch (e) { return []; } };
  const stockOf = it => { try { return Profile.stockOf(it.id); } catch (e) { return 0; } };
  function buyPotion(it) {
    try {
      if (stockOf(it) >= POTION_MAX) return C.toast('Max ' + POTION_MAX + ' ' + it.name + ' (you carry ' + POTION_MAX + ')');
      const price = itemPrice(it); if (!Wallet.spend(price)) return C.toast('Not enough chips (' + price.toLocaleString() + ' needed)');
      Profile.addStock(it.id, 1); C.toast('Bought ' + it.name); showRoom(true);
    } catch (e) { C.toast('The Shop is not ready.'); }
  }
  const isHost = () => st.room.players.some(p => p.me && p.host);
  function showRoom(keepPoll) {
    st.view = 'room'; if (!keepPoll) stopPoll(); const R = st.room, p = me(), host = isHost(), g = newStage();
    st.sig = JSON.stringify(R);
    g.append(el('fr pl tt', px(10, 4, 190, 46), 'Room ' + R.num));
    g.append(btn('', px(868, 8, 82, 36), 'Leave', leaveRoom));
    // 4 slots
    for (let i = 0; i < MAXP; i++) {
      const q = R.players[i], x = 10 + (i % 2) * 238, y = 54 + Math.floor(i / 2) * 142, s = el('fr sl', px(x, y, 230, 134));
      if (q) {
        s.append(robotFront(q.robot, 'position:absolute;left:2px;bottom:0;width:104px;height:104px;object-fit:contain;filter:drop-shadow(0 4px 3px rgba(0,0,0,.6))'));
        s.append(el('', 'position:absolute;left:104px;top:2px;right:2px;', '', C.h('div', { class: 'name' }, q.name), C.h('div', { class: 'lv', style: 'font-size:16px' }, 'Lv ' + q.level), q.league ? C.h('div', { class: 'sm' }, q.league) : null,
          C.h('div', { style: 'display:flex;align-items:center;gap:4px;margin-top:3px' }, q.weapon && q.weapon.img ? C.h('img', { src: q.weapon.img, style: 'width:30px;height:30px;object-fit:contain' }) : null, C.h('span', { class: 'sm', style: 'line-height:1.05' }, q.weapon ? q.weapon.name : 'No weapon'))));
        if (q.host) s.append(C.h('img', { src: A('ic_crown.png'), style: 'position:absolute;right:-2px;top:-8px;width:34px;height:34px;transform:rotate(14deg)' }));
        if (!q.host && q.ready) s.append(C.h('div', { class: 'ready' }, 'READY'));
      } else {
        s.append(C.h('img', { src: A('x_mark.png'), style: 'position:absolute;left:68px;top:36px;width:84px;height:84px;opacity:.9' }));
        if (i === R.players.length) s.append(el('h2', 'position:absolute;left:0;right:0;top:4px;text-align:center;font-size:20px;color:#e8cf9e', 'Waiting'));
      }
      g.append(s);
    }
    // fight type
    g.append(el('fr pn', px(488, 54, 230, 276)));
    g.append(el('h2', px(504, 60, 200, 24), 'Fight type'));
    const noLeague = !p.league;
    const mk = (id, title, text, y) => {
      const on = R.mode === id, lock = id === 'league' && noLeague;
      const b = C.h('div', { class: 'mode ' + id + (on ? ' on' : '') + (lock ? ' lock' : ''), style: `left:505px;top:${y}px;`, onclick: () => { C.beep(); setMode(id, lock); } },
        C.h('div', { class: 'modefr' }), C.h('b', null, title + (lock ? ' (locked)' : '')), text);
      return b;
    };
    g.append(mk('free', 'Free Fight', 'No limitations. Scenes are randomly selected. You play against players on similar level.', 90));
    g.append(mk('league', 'League Fight', 'Two or more players in one team. Players must be from one league against the other leagues.', 208));
    // items
    g.append(el('fr pn', px(726, 54, 224, 276)));
    g.append(el('h2', px(742, 60, 190, 24), 'My Items'));
    const pots = POTS();
    pots.forEach((it, i) => g.append(C.h('div', { class: 'fr sl ibox', style: `left:${742 + i * 70}px;top:88px;--bw:9px` }, C.h('img', { src: it.img, alt: it.name, title: it.name }), C.h('span', null, 'x' + stockOf(it)))));
    g.append(el('h2', px(742, 158, 190, 24), 'Item Shop'));
    pots.forEach((it, i) => {
      let price = 0; try { price = itemPrice(it); } catch (e) { }
      g.append(C.h('div', { class: 'arow', style: `position:absolute;left:740px;top:${186 + i * 56}px;width:196px` }, C.h('img', { src: it.img }), C.h('div', { class: 't' }, it.name, C.h('i', null, price.toLocaleString() + ' chips')), btn('mini', 'position:relative;flex:none', 'Buy', () => buyPotion(it))));
    });
    // bottom: chat, invite, start / ready, info
    g.append(chatBoxEl());
    g.append(btn('big', px(322, 344, 104, 144), 'Invite', openInvite, 'ic_invite.png'));
    const n = R.players.length, allReady = R.players.every(q => q.host || q.ready), meP = R.players.find(q => q.me);
    if (host) g.append(btn('big gold' + (allReady ? '' : ' off'), px(434, 344, 130, 144), 'Start', () => { if (!allReady) return C.toast('Wait until everybody is ready.'); doStart(); }, 'ic_start.png'));
    else g.append(btn('big gold', px(434, 344, 130, 144), meP && meP.ready ? 'Cancel' : 'Ready', toggleReady, 'ic_ready.png'));
    g.append(el('fr dk', px(572, 344, 378, 92)));
    g.append(el('', px(588, 352, 350, 76), '', C.h('div', { class: 'sm', style: 'font-size:15px' }, 'Chamber info'),
      C.h('div', { style: 'font-size:16px' }, (R.mode === 'league' ? 'League Fight' : 'Free Fight') + '  |  ' + n + ' vs ' + n),
      C.h('div', { class: 'sm', style: 'font-size:14px' }, 'Start searches another room that also waits for ' + n + ' vs ' + n + '.'),
      C.h('div', { class: 'sm', style: 'font-size:14px' }, 'Map: random   |   1 robot each')));
    g.append(iconBar(660, 444, 290));
    startPoll(); if (R.state === 'searching') showSearch();
  }
  function setMode(id, lock) {
    if (!isHost()) return C.toast('Only the room owner can change the fight type.');
    if (lock) return C.toast('League Fight needs a league. You are not in a league.');
    if (st.room.mode === id) return;
    Net.mode(st.room.id, id).then(j => { if (j.room) st.room = j.room; showRoom(true); }).catch(e => C.toast(e.message));
  }
  function toggleReady() {
    const q = st.room.players.find(x => x.me), v = !(q && q.ready);
    Net.ready(st.room.id, v).then(j => { if (j.room) st.room = j.room; showRoom(true); }).catch(e => C.toast(e.message));
  }
  function leaveRoom() { const id = st.room && st.room.id; st.room = null; stopPoll(); Net.leave(id); st.view = 'lobby'; refreshLobby(true); }
  function startPoll() {
    stopPoll();
    pollT = setInterval(async () => {
      if (!st || st.view !== 'room' || st.inMatch) return;
      let j; try { j = await Net.poll(st.server, st.room.id); } catch (e) { return; }
      if (!j.room) { stopPoll(); st.room = null; C.toast('The room was closed.'); st.view = 'lobby'; return refreshLobby(true); }
      if (j.match) { return found(j.match); }
      const sig = JSON.stringify(j.room); st.room = j.room;
      if (j.room.state === 'searching' && !searchEl) showSearch();
      if (sig !== st.sig && !overlay) showRoom(true);
    }, 1000);
  }

  // ---------------------------------------------------------------- invite popup
  function openInvite() {
    if (overlay) overlay.remove();
    let tab = 'world';
    const body = el('scroll', px(196, 146, 566, 270));
    const draw = () => {
      tabF.className = 'fr bt ' + (tab === 'friend' ? 'gold' : ''); tabW.className = 'fr bt ' + (tab === 'world' ? 'gold' : '');
      body.replaceChildren();
      const list = tab === 'world' ? st.onlineP.filter(q => !st.room.players.some(x => x.name === q.name)) : [];
      if (!list.length) body.append(el('sm', 'padding:30px;text-align:center;font-size:17px', tab === 'world' ? 'Nobody else is online.' : 'Your friend list is empty. (Friends: coming next.)'));
      for (const q of list) body.append(C.h('div', { class: 'prow', style: 'font-size:17px;height:44px' }, C.robotImg(C.robotOf(q.robot)), C.h('b', null, q.name), C.h('span', { class: 'lv' }, 'Lv ' + q.level), btn('mini', 'position:relative;flex:none;width:76px', 'Invite', () => { Net.invite(st.room.id, q.name).then(() => C.toast('Invitation sent to ' + q.name)).catch(e => C.toast(e.message)); })));
    };
    const tabF = btn('', px(200, 108, 160, 34), 'Friend list', () => { tab = 'friend'; draw(); });
    const tabW = btn('', px(366, 108, 160, 34), 'World', () => { tab = 'world'; draw(); });
    const box = C.h('div', { class: 'ar' }, el('fr pn', px(180, 70, 600, 360)), el('h2', px(200, 76, 300, 28), 'Invite'), tabF, tabW, body, btn('', px(690, 76, 78, 30), 'Close', () => { overlay.remove(); overlay = null; }));
    overlay = C.h('div', { class: 'arov' }, box); box.style.transform = scaleEl.style.transform; stage.append(overlay); draw();
  }

  // ---------------------------------------------------------------- search -> VS -> fight
  let searchEl = null, searchT = 0;
  function showSearch() {
    if (overlay) overlay.remove(); const t0 = Date.now(), host = isHost(), n = st.room.players.length;
    const tm = C.h('div', { class: 'tt', style: 'position:absolute;left:0;right:0;top:250px;height:40px;font-size:24px' }, '0:00');
    const cancel = host ? btn('', px(410, 320, 140, 40), 'Cancel', cancelSearch) : el('sm', 'position:absolute;left:0;right:0;top:330px;text-align:center;font-size:16px', 'Waiting for the room owner...');
    const box = C.h('div', { class: 'ar' }, el('fr pn', px(250, 130, 460, 260)), el('tt', px(250, 150, 460, 40), 'Searching for an opponent'), el('sm', px(250, 192, 460, 24) + 'text-align:center;font-size:16px', n + ' vs ' + n + ' - ' + (st.room.mode === 'league' ? 'League Fight' : 'Free Fight')), C.h('div', { class: 'spin', style: 'position:absolute;left:453px;top:218px;width:54px;height:54px' }), tm, cancel);
    box.style.transform = scaleEl.style.transform; overlay = C.h('div', { class: 'arov' }, box); stage.append(overlay); searchEl = overlay;
    clearInterval(searchT); searchT = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); tm.firstChild.nodeValue = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 500);
  }
  function hideSearch() { clearInterval(searchT); searchT = 0; if (searchEl) { if (overlay === searchEl) overlay = null; searchEl.remove(); searchEl = null; } }
  function doStart() {
    Net.start(st.room.id).then(j => { if (j.room) st.room = j.room; showSearch(); startPoll(); }).catch(e => C.toast(e.message));
  }
  function cancelSearch() { Net.cancel(st.room.id); hideSearch(); st.room.state = 'idle'; showRoom(true); }
  function found(match) {
    hideSearch(); stopPoll(); st.inMatch = true;
    const mine = st.room.players.slice().sort((a, b) => (b.host ? 1 : 0) - (a.host ? 1 : 0)).map(q => ({ ...q })), opp = match.opp;
    const card = (q, side, i) => C.h('div', { style: `display:flex;flex-direction:column;align-items:center;width:150px;animation:arin .45s ${i * .12}s both;--fx:${side ? 120 : -120}px` },
      robotFront(q.robot, 'width:130px;height:130px;object-fit:contain;filter:drop-shadow(0 6px 5px rgba(0,0,0,.65))' + (side ? ';transform:scaleX(-1)' : '')),
      C.h('div', { class: 'name', style: 'font-size:18px;max-width:150px' }, q.name), C.h('div', { class: 'lv', style: 'font-size:15px' }, 'Lv ' + q.level), q.weapon ? C.h('div', { class: 'sm' }, q.weapon.name) : null);
    const col = (arr, side) => C.h('div', { style: `position:absolute;${side ? 'right' : 'left'}:40px;top:70px;width:340px;display:flex;flex-wrap:wrap;gap:6px 10px;justify-content:center;align-content:center;height:360px` }, arr.map((q, i) => card(q, side, i)));
    const box = C.h('div', { class: 'ar' }, col(mine, 0), col(opp, 1), C.h('img', { src: A('vs.png'), style: 'position:absolute;left:340px;top:170px;width:280px;animation:arvs .6s .3s both' }),
      el('tt', px(0, 20, 480, 40) + 'justify-content:flex-start;padding-left:50px;font-size:22px', mine[0].name + (mine.length > 1 ? "'s team" : '')), el('tt', px(480, 20, 480, 40) + 'justify-content:flex-end;padding-right:50px;font-size:22px', opp[0].name + (opp.length > 1 ? "'s team" : '')));
    box.style.transform = scaleEl.style.transform; overlay = C.h('div', { class: 'arov', style: 'background:#1b0f06 ' + U('wood_dark.png') }, box); stage.append(overlay);
    setTimeout(() => launchFight(mine, opp), 3200);
  }
  function buildSetup(mine, opp) {
    const order = [], n = Math.max(mine.length, opp.length);
    for (let i = 0; i < n; i++) { if (mine[i]) order.push({ p: mine[i], side: 0 }); if (opp[i]) order.push({ p: opp[i], side: 1 }); }   // turn order: A1, B1, A2, B2 ...
    const left = Math.random() < .5 ? 0 : 1, plan = [];
    order.forEach((o, idx) => { plan.push({ team: idx, side: o.side }); });
    for (const side of [0, 1]) {   // each side stands together: A on one half of the map, B on the other
      const ids = plan.filter(q => q.side === side), baseX = (side === left) ? 760 : 2040, k = ids.length;
      ids.forEach((q, j) => { q.x = baseX + (j - (k - 1) / 2) * 150 + rint(-20, 20); q.name = order[q.team].p.name; });
    }
    return {
      teams: order.map(o => ({ cpu: !o.p.me, robot: o.p.robot })), nT: order.length, per: 1, diff: 1, theme: 'auto', map: 'random',
      squads: order.map(o => o.side), names: order.map(o => o.p.name), colors: order.map(o => o.side ? '#4da3ff' : '#ff5a4d'),
      plan: plan.map(q => ({ team: q.team, x: q.x, name: q.name })), first: 0,
    };
  }
  async function launchFight(mine, opp) {
    const setup = buildSetup(mine, opp); installOver(); st.inMatch = true; st.last = { mine, opp };
    if (overlay) { overlay.remove(); overlay = null; } removeEventListener('resize', fitFn);
    C.goGame(() => { UI.start(setup).catch(e => { st.inMatch = false; C.toast('Could not start the fight.'); C.showRoot(); showRoom(); }); }, () => { st.inMatch = false; st.view = 'room'; Net.poll(st.server, st.room && st.room.id).then(j => { if (j.room) st.room = j.room; showRoom(); }).catch(() => { st.room ? showRoom() : showLobby(); }); });
  }
  let overInstalled = false;
  function installOver() {
    if (overInstalled || typeof UI === 'undefined') return; overInstalled = true;
    const orig = UI.showOver.bind(UI);
    UI.showOver = function () { if (!(st && st.inMatch && G.squad)) return orig(); setTimeout(fightOver, 1600); };
  }
  function fightOver() {
    const w = G.winner, win = !!(w && G.squad[w.idx] === 0), draw = !w;
    let extra = '';
    try { const chips = win ? 300 : 40; Wallet.add(chips); extra = ' +' + chips + ' chips' + Profile.xpText(Profile.addXp(win ? 450 : 12)); } catch (e) { }
    $('hud').hidden = true; $('touch').hidden = true;
    const box = C.h('div', { style: 'position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(6,3,0,.7);font-family:var(--body,sans-serif)' },
      C.h('div', { style: 'text-align:center;padding:26px 44px;border:4px solid #d9a35c;border-radius:16px;background:#6b4222 ' + U('wood.png') + ';box-shadow:0 0 40px #000' },
        C.h('div', { style: `font:400 clamp(34px,9vh,64px) var(--disp,sans-serif);color:${draw ? '#fff' : win ? '#ffd34a' : '#ff7a6d'};-webkit-text-stroke:6px #3a1a06;paint-order:stroke fill` }, draw ? 'DRAW' : win ? 'VICTORY' : 'DEFEAT'),
        C.h('p', { style: 'color:#f4dfb2;font-size:18px;margin:10px 0 16px' }, 'Round ' + G.turnCount + (extra ? ' |' + extra : '')),
        C.h('button', { class: 'btn', onclick: () => { box.remove(); G.mode = 'menu'; UI.show('title'); } }, 'Back to room')));
    document.body.append(box);
  }

  // ---------------------------------------------------------------- open
  function open(ctx) {
    C = ctx;
    if (!document.getElementById('ar-css')) { const s = document.createElement('style'); s.id = 'ar-css'; s.textContent = css; document.head.append(s); }
    st = { view: 'lobby', server: (C.session().player.server) || 1, filter: 'all', page: 0, rooms: [], onlineP: [], room: null, inMatch: false };
    chatEl = null; installOver();
    showLobby(); refreshLobby(true);
  }
  return { open };
})();
