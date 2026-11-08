/* ONLINE MODE (client) - lives on GitHub only. The app downloads it when the player taps Online (see online_loader.js in the app) and runs it inside the app page,
   so the images come from the phone and none of this code is stored in the app.
   Flow: Online button -> guest login -> Server 1..5 -> choose one of the 10 robots -> name your character -> TOWN
   TOWN = island picture with 6 buildings (Adventure, Arena, League, Hall of Fame, Shop, Armory) + chat box + icon bar.
   The server (Render + Supabase) owns the account and the character; this file only shows screens and asks the server.
   Server calls used (see SERVER_API.md for the exact JSON and the SQL):
     /api/guest  /api/login  /api/me           (already existed)
     /api/servers   /api/enter   /api/character                                                                    (character + servers)
     /api/arena/*  (poll, chat, create, join, leave, config, ready, start, cancel, back, invite)                       (real players: rooms, chat, matchmaking)
   ONLINE SAVE: while you are online the game uses a SEPARATE save (profile, chips, stones, adventure...) for the character you created,
   so the Bag / Shop / Armory / Adventure show YOUR ONLINE CHARACTER, never the offline one. Leaving online puts the offline save back. */
'use strict';
const ONLINE_API = 'https://death-bound-server.onrender.com';   // <- address of your Render web service (no slash at the end)
const ONLINE_SERVERS = 5;                                        // Server 1 .. Server 5
const ONLINE_SERVER_CAPACITY = 200;                              // players per server; the list shows Smooth / Busy / Full from this

const OnlineUI = (() => {
  // ---------- tiny helpers ----------
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const k in (attrs || {})) { const v = attrs[k]; if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else if (v != null) e.setAttribute(k, v); }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  };
  let root = null, view = null, session = null;   // session = { token, player }  (player.server / player.name / player.robot = the character you are playing)
  let curServer = 0, pickedRobot = 0;

  const css = `
#onl{position:fixed;inset:0;z-index:50;background:#0b1020;color:#eef3ff;font-family:var(--body,sans-serif);display:flex;align-items:center;justify-content:center;overflow:hidden}
#onl[hidden]{display:none}
#onl .center{display:flex;flex-direction:column;align-items:center;justify-content:safe center;gap:14px;padding:16px;box-sizing:border-box;width:100%;height:100%;overflow:auto;background:radial-gradient(ellipse at 50% 30%,#18264a,#080c18)}
#onl .box{background:rgba(12,18,34,.92);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:18px 20px;max-width:min(94vw,520px);width:100%;box-sizing:border-box;text-align:center}
#onl h2{font-family:var(--disp,sans-serif);font-weight:400;font-size:24px;margin:0 0 8px;color:#ffc15a}
#onl p{margin:6px 0;color:#c9d4ee;font-size:16px;line-height:1.35}
#onl .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:10px}
#onl .code{font:700 clamp(15px,4.4vw,24px) 'Courier New',monospace;letter-spacing:1px;background:#050813;border:2px dashed #ffc15a;border-radius:10px;padding:12px 8px;margin:10px 0;color:#fff;user-select:all;-webkit-user-select:all;word-break:break-all}
#onl input.in{width:100%;box-sizing:border-box;font:700 18px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:12px;border-radius:10px;border:2px solid #34456e;background:#050813;color:#fff;text-align:center;user-select:text;-webkit-user-select:text}
#onl input.in.nm{font:700 22px var(--body,sans-serif);text-transform:none;letter-spacing:.5px}
#onl .err{color:#ff7a6d;min-height:20px;font-weight:700}
#onl .warn{color:#ffd27a;font-weight:700}
#onl .sub{margin:0;color:#9eacc9;font-size:15px}
/* server list */
#onl .servers{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;width:min(96vw,760px)}
#onl .sv{background:rgba(22,31,56,.92);border:2px solid rgba(255,255,255,.16);border-radius:14px;padding:12px 8px;cursor:pointer;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:92px;justify-content:center}
#onl .sv:hover,#onl .sv:active{border-color:#ffc15a;background:rgba(80,56,14,.9);box-shadow:0 0 18px rgba(255,193,90,.45)}
#onl .sv b{font:400 clamp(18px,3.4vh,26px) var(--disp,sans-serif);color:#ffd27a}
#onl .sv small{color:#9eacc9;font-size:13px}
#onl .sv .st{font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px}
#onl .sv .st i{width:10px;height:10px;border-radius:50%;display:inline-block}
#onl .sv.full{opacity:.65}
#onl .sv .on{color:#dfe7ff;font-size:clamp(14px,2.6vh,18px)}
#onl .sv .on b{display:inline;font:700 1em var(--body,sans-serif);color:#fff}
#onl .sv .mine{display:flex;align-items:center;gap:6px;color:#fff;font-size:14px;max-width:100%}
#onl .sv .mine img{width:30px;height:30px;object-fit:contain}
#onl .sv .mine span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* robot picker */
#onl .robots{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;width:min(96vw,900px)}
#onl .rb{background:rgba(22,31,56,.92);border:2px solid rgba(255,255,255,.14);border-radius:12px;padding:6px 4px;cursor:pointer;text-align:center;color:#fff}
#onl .rb img{width:100%;aspect-ratio:1;object-fit:contain;display:block}
#onl .rb b{display:block;font-size:clamp(11px,1.7vw,16px);letter-spacing:.5px}
#onl .rb.sel{border-color:#ffc15a;background:rgba(80,56,14,.9);box-shadow:0 0 18px rgba(255,193,90,.5)}
#onl .big{width:min(40vw,34vh,220px);aspect-ratio:1;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(0,0,0,.6))}
/* town */
#onl .town{position:relative;width:100%;height:100%;overflow:hidden;background:radial-gradient(ellipse at 50% 42%,#2aa3f0,#1568c6 58%,#0a3a86)}
#onl .stage{--sw:max(100vw,177.78vh);position:absolute;left:50%;top:50%;width:var(--sw);aspect-ratio:16/9;transform:translate(-50%,-50%);background:url(assets/online/town.webp) 0 0/100% 100% no-repeat}
#onl .bd{position:absolute;transform:translateX(-50%);cursor:pointer;-webkit-tap-highlight-color:transparent}
#onl .bd img{width:100%;display:block;filter:drop-shadow(0 .7vw .7vw rgba(0,0,0,.35));transition:transform .15s,filter .15s;transform-origin:50% 90%;-webkit-user-drag:none;pointer-events:none}
#onl .bd:hover img,#onl .bd:active img{transform:scale(1.06);filter:drop-shadow(0 .7vw .7vw rgba(0,0,0,.35)) brightness(1.15)}
#onl .sign{position:absolute;left:50%;transform:translate(-50%,-50%);font:400 calc(var(--sw)*.0165)/1 var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:calc(var(--sw)*.0025) #4a1f06;paint-order:stroke fill;text-shadow:0 .1em 0 #4a1f06;white-space:nowrap;pointer-events:none;letter-spacing:.5px}
#onl .sign.plank{padding:.35em .9em .4em;background:linear-gradient(#8a4a1c,#5c2a0c);border:calc(var(--sw)*.0025) solid #e0a53a;border-radius:.5em;box-shadow:0 .2em .4em rgba(0,0,0,.45)}
#onl .hero{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none;z-index:30}
#onl .hero img{width:calc(var(--sw)*.095);filter:drop-shadow(0 .5vw .4vw rgba(0,0,0,.5))}
#onl .hero span{font:700 calc(var(--sw)*.0095) var(--body,sans-serif);background:rgba(12,18,34,.82);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:.1em .8em .15em;margin-bottom:.2em;white-space:nowrap}
#onl .top{position:absolute;left:0;right:0;top:0;display:flex;gap:8px;align-items:center;padding:6px 8px;background:linear-gradient(rgba(6,10,22,.85),rgba(6,10,22,0));z-index:5}
#onl .me{display:flex;align-items:center;gap:8px;background:rgba(12,18,34,.85);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:3px 12px 3px 4px}
#onl .me img{width:clamp(30px,6vh,48px);height:clamp(30px,6vh,48px);object-fit:contain;border-radius:8px;background:#1a2440}
#onl .me b{display:block;font-size:clamp(12px,2.4vh,17px);line-height:1.05}
#onl .me small{color:#ffc15a;font-size:clamp(10px,2vh,14px)}
#onl .sp{flex:1}
#onl .btn.sm{font-size:clamp(11px,2.3vh,15px);padding:6px 12px}
#onl .pop{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(4,6,14,.6)}
/* chat box (bottom left) + icon bar (bottom right) */
#onl .chat{--cw:clamp(250px,37vw,500px);position:absolute;left:max(6px,env(safe-area-inset-left,0px));bottom:max(6px,env(safe-area-inset-bottom,0px));width:var(--cw);aspect-ratio:697/350;background:url(assets/online/chat.webp) 0 0/100% 100% no-repeat;z-index:10;font-size:calc(var(--cw)/40)}
#onl .chat .t{position:absolute;top:4%;height:14%;cursor:pointer}
#onl .chat .log{position:absolute;left:13.3%;right:9%;top:21%;bottom:18.5%;overflow-y:auto;line-height:1.28;color:#e6ecff;text-shadow:0 1px 2px #000;user-select:text;-webkit-user-select:text;scrollbar-width:none;word-break:break-word}
#onl .chat .log::-webkit-scrollbar{display:none}
#onl .chat .log div{margin:0 0 .15em}
#onl .chat .log b{color:#ffc15a}
#onl .chat .log i{color:#8fe0a0;font-style:normal}
#onl .chat .up,#onl .chat .dn{position:absolute;left:91.6%;width:4.6%;height:8.5%;cursor:pointer}
#onl .chat .up{top:22.5%}#onl .chat .dn{top:72%}
#onl .chat input{position:absolute;left:13.5%;width:56%;top:85%;height:11%;background:#17171d;border-radius:.4em;border:0;outline:0;color:#fff;font:600 1em var(--body,sans-serif);padding:0 .4em;user-select:text;-webkit-user-select:text}
#onl .chat input::placeholder{color:#8c95a8}
#onl .chat .em{position:absolute;left:72%;top:84.5%;width:6.4%;height:12%;cursor:pointer}
#onl .chat .send{position:absolute;left:80.6%;top:84.5%;width:16.2%;height:12.5%;cursor:pointer;border-radius:.6em}
#onl .chat .send:active{background:rgba(255,255,255,.25)}
#onl .ibar{position:absolute;right:max(8px,env(safe-area-inset-right,0px));bottom:max(8px,env(safe-area-inset-bottom,0px));display:flex;gap:clamp(4px,.8vw,10px);align-items:flex-end;z-index:10}
#onl .ibar button{border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;height:clamp(40px,12vh,74px);transition:transform .12s,filter .12s}
#onl .ibar button img{height:100%;display:block;filter:drop-shadow(0 3px 3px rgba(0,0,0,.55));pointer-events:none}
#onl .ibar button:hover,#onl .ibar button:active{transform:translateY(-3px) scale(1.07);filter:brightness(1.15)}
@media (orientation:landscape) and (max-height:520px){#onl .box{padding:12px 14px}#onl h2{font-size:20px}#onl .center{gap:8px;padding:8px}}
`;

  function ensure() {
    if (root) return;
    document.head.append(h('style', null, css));
    root = h('div', { id: 'onl', hidden: '' }); document.body.append(root);
    if (!document.getElementById('toast')) document.body.append(h('div', { id: 'toast' }));
  }
  const set = (...kids) => { root.replaceChildren(...kids); };
  const toastMsg = m => { const t = document.getElementById('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toastMsg.k); toastMsg.k = setTimeout(() => t.classList.remove('on'), 2200); };
  const beep = () => { try { Snd.init(); Snd.play('beep'); } catch (e) { } };
  const btn = (txt, fn, cls) => h('button', { class: 'btn' + (cls ? ' ' + cls : ''), onclick: () => { beep(); fn(); } }, txt);
  const robots = () => Assets.robots.robots;
  const robotOf = i => robots()[i] || robots()[0];
  const robotImg = (r, cls) => h('img', { src: 'assets/robots/front/' + r.id + '.webp', alt: '', class: cls || null });

  // ---------- separate ONLINE save (keys are prefixed while you are online) ----------
  const GAME_KEYS = ['profile', 'chips', 'stones', 'amu', 'adv', 'wins', 'sup1', 'setup'];
  let ns = null, setupBackup = null, storePatched = false;
  function patchStore() {
    if (storePatched) return; storePatched = true;
    const g = store.get.bind(store), st = store.set.bind(store);
    store.get = (k, d) => g(ns && GAME_KEYS.includes(k) ? ns + k : k, d);
    store.set = (k, v) => st(ns && GAME_KEYS.includes(k) ? ns + k : k, v);
    const R = Profile.render;   // the Bag shows the NAME you gave your online character
    Profile.render = function () {
      const r = R.apply(this, arguments);
      if (ns && session) try { const e = document.querySelector('.pf-name'); if (e && e.firstChild && e.firstChild.nodeType === 3) e.firstChild.nodeValue = session.player.name; } catch (e) { }
      return r;
    };
  }
  function activateChar() {
    try {
      patchStore(); if (!ns) setupBackup = JSON.stringify(UI.setup);
      ns = 'on_' + String(session.player.id || 'x').replace(/[^a-z0-9]/gi, '').slice(0, 10) + '_s' + (session.player.server || curServer) + '_';
      Profile.data = null; Profile.load();
      const idx = Math.max(0, Math.min(session.player.robot | 0, robots().length - 1));
      if (Profile.data.char !== idx || !Profile.data.picked) { Profile.data.char = idx; Profile.data.picked = true; Profile.ensureWeapon(); Profile.save(); }
      UI.setup = store.get('setup', null) || JSON.parse(setupBackup); UI.setup.teams[0].robot = idx; store.set('setup', UI.setup);
    } catch (e) { }
  }
  function deactivateChar() {   // back to the OFFLINE save
    if (!ns) return; ns = null;
    try { Profile.data = null; Profile.load(); if (setupBackup) UI.setup = JSON.parse(setupBackup); } catch (e) { } setupBackup = null;
  }
  function myInfo() {   // level + weapon, shown to other players
    try {
      if (!Profile.data) Profile.load(); const r = robotOf(session.player.robot), eq = Profile.eqOf(r.id);
      const w = (eq.weapon && itemById(eq.weapon)) || weaponItemFor(r.id);
      let power; try { power = Adventure.myPower(); } catch (e2) { }
      return { lv: Profile.level(), power, weapon: w ? { name: w.name, img: Profile.imgOf(w) } : undefined };
    } catch (e) { return {}; }
  }

  // ---------- LIVE: one poll every ~1.5 s while you are in the town / arena (heartbeat + online list + rooms + chat) ----------
  const chatLog = [], chatDraws = [];
  const Live = (() => {
    let on = false, srv = 0, since = 0, last = null, timer = null, inflight = false;
    const subs = new Set();
    const apply = j => {
      last = j; if (j.seq < since) since = 0; else since = j.seq;
      if (j.chat && j.chat.length) { for (const m of j.chat) chatLog.push({ who: m.who, text: m.text }); while (chatLog.length > 80) chatLog.shift(); for (let i = chatDraws.length - 1; i >= 0; i--) { if (!chatDraws[i].ok()) chatDraws.splice(i, 1); else chatDraws[i].draw(); } }
      subs.forEach(f => { try { f(j); } catch (e) { } });
    };
    const call = async (path, body) => {
      const j = await api((/^adv\//.test(path) ? '/api/' : '/api/arena/') + path, Object.assign({ server: srv, since }, myInfo(), body || {}), session.token); apply(j); return j;
    };
    const tick = async () => {
      if (!on) return; if (!inflight) { inflight = true; try { await call('poll'); } catch (e) { if (e.status === 401) { stop(); return expired(); } } inflight = false; }
      if (on) timer = setTimeout(tick, root && root.hidden ? 4000 : 1500);
    };
    const start = server => { stop(); on = true; srv = server; since = 0; last = null; chatLog.length = 0; timer = setTimeout(tick, 0); };
    const stop = () => { on = false; clearTimeout(timer); inflight = false; subs.clear(); };
    return { start, stop, call, subscribe: f => { subs.add(f); if (last) f(last); return () => subs.delete(f); }, get last() { return last; }, get running() { return on; }, nudge: () => { if (on) { clearTimeout(timer); timer = setTimeout(tick, 0); } } };
  })();

  // ---------- server calls ----------
  async function api(path, body, token) {
    if (/YOUR-SERVER/.test(ONLINE_API)) throw new Error('The online server address is not set yet.');
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 75000);   // a free Render server can need ~1 minute to wake up
    try {
      const r = await fetch(ONLINE_API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body || {}), signal: ctl.signal });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(j.error || 'Server error'); e.status = r.status; throw e; }
      return j;
    } catch (e) { if (e.name === 'AbortError') throw new Error('The server did not answer. Try again.'); if (e instanceof TypeError) throw new Error('Cannot reach the online server. Check your internet and try again.'); throw e; }
    finally { clearTimeout(t); }
  }
  const busy = msg => set(h('div', { class: 'center' }, h('div', { class: 'box' }, h('h2', null, 'Please wait'), h('p', null, msg))));

  // ---------- 1. guest login ----------
  function welcome(err) {
    const inp = h('input', { class: 'in', placeholder: 'RW-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX', maxlength: '40', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
    const er = h('div', { class: 'err' }, err || '');
    set(h('div', { class: 'center' },
      h('div', { class: 'box' }, h('h2', null, 'Play online'), h('p', null, 'No sign-up. You get a guest account and a long recovery code.'), h('p', { class: 'sub' }, 'Online v2'),
        h('div', { class: 'row' }, btn('Play as guest', createGuest), btn('Back', leave, 'alt'))),
      h('div', { class: 'box' }, h('h2', { style: 'font-size:19px' }, 'I already have a code'), inp, er,
        h('div', { class: 'row' }, btn('Log in with code', () => login(inp.value), 'alt')))));
  }
  async function createGuest() {
    busy('Creating your guest account... (the first time the server may need up to a minute to wake up)');
    try { const j = await api('/api/guest'); session = { token: j.token, player: j.player }; store.set('otoken', j.token); store.set('ocode', j.code); showCode(j.code, true); }
    catch (e) { welcome(e.message); }
  }
  async function login(code) {
    if (!String(code).trim()) return welcome('Type your recovery code first.');
    busy('Logging in...');
    try { const j = await api('/api/login', { code }); session = { token: j.token, player: j.player }; store.set('otoken', j.token); store.set('ocode', String(code).trim().toUpperCase()); serverList(); }
    catch (e) { welcome(e.message); }
  }
  function showCode(code, first) {
    const back = view;   // where "Close" returns to
    const cp = () => { try { navigator.clipboard.writeText(code).then(() => toastMsg('Code copied'), () => toastMsg('Press and hold the code to copy it')); } catch (e) { toastMsg('Press and hold the code to copy it'); } };
    set(h('div', { class: 'center' }, h('div', { class: 'box' },
      h('h2', null, first ? 'Your recovery code' : 'My recovery code'),
      h('p', { class: 'warn' }, 'Save this code now (screenshot or write it down).'),
      h('div', { class: 'code' }, code),
      h('p', null, 'It is the ONLY way to get your account back on a new phone or after reinstalling. Never share it: anyone with the code can play as you.'),
      h('div', { class: 'row' }, btn('Copy code', cp, 'alt'), btn(first ? 'I saved it - continue' : 'Close', first ? serverList : (back === 'town' ? town : serverList))))));
  }

  // ---------- 2. Server 1 .. 5 ----------
  // The server answers {servers:[{id,players,mine:{name,robot}|null}]}. If the server does not have /api/servers yet, 5 plain servers are shown.
  const localChars = () => store.get('ochars', {});
  async function serverList(err) {
    view = 'servers'; Live.stop(); deactivateChar(); busy('Loading servers...');
    let list = null;
    try { const j = await api('/api/servers', {}, session.token); list = j.servers; }
    catch (e) { if (e.status === 401) return expired(); }
    if (!Array.isArray(list)) { const lc = localChars(); list = Array.from({ length: ONLINE_SERVERS }, (_, i) => ({ id: i + 1, players: null, mine: lc[i + 1] || null })); }
    const stat = s => { if (s.players == null) return null; const r = s.players / ONLINE_SERVER_CAPACITY; return r < .5 ? ['Smooth', '#4ade80'] : r < .85 ? ['Busy', '#fbbf24'] : ['Full', '#f87171']; };
    const cells = list.map(s => { const st = stat(s), full = st && st[0] === 'Full';
      return h('div', { class: 'sv' + (full ? ' full' : ''), onclick: () => { beep(); if (full && !s.mine) return toastMsg('Server ' + s.id + ' is full. Choose another server.'); pickServer(s); } },
        h('b', null, 'Server ' + s.id),
        h('div', { class: 'on' }, 'Online: ', h('b', null, s.players != null ? s.players : '--')),
        st ? h('div', { class: 'st', style: 'color:' + st[1] }, h('i', { style: 'background:' + st[1] }), st[0]) : null);
    });
    set(h('div', { class: 'center' }, h('h2', { style: 'margin:0' }, 'Choose a server'), h('p', { class: 'sub' }, 'Each server has its own players. A new server means a new character.  (v2)'),
      h('div', { class: 'servers' }, cells), h('div', { class: 'err' }, err || ''),
      h('div', { class: 'row' }, btn('My code', () => showCode(store.get('ocode', 'Not saved on this phone - use your written copy'), false), 'alt'), btn('Back', leave, 'alt'))));
  }
  async function pickServer(s) {
    curServer = s.id;
    if (s.mine) {   // you already made a character on this server: go straight in
      busy('Entering Server ' + s.id + '...');
      try { const j = await api('/api/enter', { server: s.id }, session.token); return play(j.player); }
      catch (e) { if (e.status === 401) return expired(); if (e.status === 404) { return play(Object.assign({}, session.player, { server: s.id, name: s.mine.name, robot: s.mine.robot, power: (session.player && session.player.power) || 0 })); } return serverList(e.message); }
    }
    pickedRobot = 0; chooseRobot();
  }

  // ---------- 3. choose one of the 10 robots, 4. name your character ----------
  function chooseRobot() {
    view = 'robot'; const R = robots();
    const cells = R.map((r, i) => h('div', { class: 'rb' + (i === pickedRobot ? ' sel' : ''), onclick: () => { beep(); pickedRobot = i; cells.forEach((c, j) => c.classList.toggle('sel', j === i)); } }, robotImg(r), h('b', null, r.name)));
    set(h('div', { class: 'center' }, h('h2', { style: 'margin:0' }, 'Server ' + curServer + ' - choose your robot'), h('div', { class: 'robots' }, cells),
      h('div', { class: 'row' }, btn('Next', nameStep), btn('Back', serverList, 'alt'))));
  }
  const NAME_OK = /^[\p{L}\p{N} _-]{3,14}$/u;
  function nameStep(err, keep) {
    view = 'name'; const r = robotOf(pickedRobot);
    const inp = h('input', { class: 'in nm', maxlength: '14', autocomplete: 'off', spellcheck: 'false', placeholder: 'Your name', value: typeof keep === 'string' ? keep : r.name });
    const er = h('div', { class: 'err' }, typeof err === 'string' ? err : '');
    const go = async () => {
      const name = inp.value.replace(/\s+/g, ' ').trim();
      if (!NAME_OK.test(name)) { er.textContent = 'Name must be 3 to 14 letters or numbers.'; return; }
      busy('Creating your character...');
      try {
        let j;
        try { j = await api('/api/character', { server: curServer, robot: pickedRobot, name }, session.token); }
        catch (e) {
          if (e.status !== 404) throw e;   // the server has no /api/character yet: keep the character on this phone so the screens can be tested
          const lc = localChars(); lc[curServer] = { name, robot: pickedRobot }; store.set('ochars', lc);
          j = { player: Object.assign({}, session.player, { server: curServer, name, robot: pickedRobot }) };
        }
        play(j.player);
      } catch (e) { if (e.status === 401) return expired(); nameStep(e.message, name); }
    };
    inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    set(h('div', { class: 'center' }, h('div', { class: 'box' },
      h('h2', null, 'Name your character'), robotImg(r, 'big'), h('p', { class: 'sub' }, r.name + '  |  Server ' + curServer),
      h('p', null, 'Other players will see this name.'), inp, er,
      h('div', { class: 'row' }, btn('Enter world', go), btn('Back', chooseRobot, 'alt')))));
    setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) { } }, 50);
  }

  // the character is chosen: switch to its own save, start the live connection, show the town
  function play(player) {
    session.player = Object.assign({}, session.player, player, { id: player.id || (session.player && session.player.id) });
    curServer = session.player.server || curServer; session.player.server = curServer;
    activateChar(); Live.start(curServer); town();
  }

  // ---------- 5. TOWN ----------
  // x / by = centre and ground line of the building on the 1672x941 land picture, w = its width on that picture
  const BUILDINGS = [
    { id: 'hall',      name: 'Hall of Fame', img: 'b_hall',      x: 450,  by: 350, w: 280, text: 'See the top leagues and the strongest players by power.' },
    { id: 'gate',      name: 'Adventure',    img: 'b_adventure', x: 836,  by: 315, w: 255 },
    { id: 'armory',    name: 'Armory',       img: 'b_armory',    x: 1290, by: 360, w: 250 },
    { id: 'arena',     name: 'Arena',        img: 'b_arena',     x: 215,  by: 560, w: 305, text: 'Fights against other players: 1 vs 1 up to 4 vs 4.', plank: true },
    { id: 'league',    name: 'League',       img: 'b_league',    x: 836,  by: 800, w: 255, text: 'Join a league, or create your own. League vs league fights.', plaque: [50.5, 35.8] },
    { id: 'shop',      name: 'Shop',         img: 'b_shop',      x: 1385, by: 665, w: 240 },
  ];
  const ICONS = [
    { id: 'bag', name: 'Bag' }, { id: 'scroll', name: 'Quests' }, { id: 'trophy', name: 'Rankings' },
    { id: 'friends', name: 'Friends' }, { id: 'mail', name: 'Mail' }, { id: 'gear', name: 'Settings' },
  ];
  function town() {
    view = 'town';
    const p = session.player, r = robotOf(p.robot);
    const stage = h('div', { class: 'stage' });
    for (const b of BUILDINGS.slice().sort((a, c) => a.by - c.by)) {
      const hw = b.w / 1672 * 100;
      const el = h('div', { class: 'bd', style: `left:${b.x / 16.72}%;bottom:${(941 - b.by) / 9.41}%;width:${hw}%`, onclick: () => { beep(); building(b); } }, h('img', { src: 'assets/online/' + b.img + '.webp', alt: b.name }));
      if (b.plaque) el.append(h('div', { class: 'sign', style: `left:${b.plaque[0]}%;top:${b.plaque[1]}%` }, b.name));
      if (b.plank) el.append(h('div', { class: 'sign plank', style: 'top:88%' }, b.name));
      stage.append(el);
    }
    const top = h('div', { class: 'top' },
      h('div', { class: 'me' }, robotImg(r), h('div', null, h('b', null, p.name), h('small', null, 'Server ' + (p.server || curServer) + '  |  ' + r.name + '  |  Power ' + (p.power || 0)))),
      h('div', { class: 'sp' }),
      btn('My code', () => showCode(store.get('ocode', 'Not saved on this phone - use your written copy'), false), 'alt sm'),
      btn('Servers', serverList, 'alt sm'),
      btn('Exit', leave, 'alt sm'));
    const bar = h('div', { class: 'ibar' }, ICONS.map(ic => h('button', { 'aria-label': ic.name, onclick: () => { beep(); iconPop(ic); } }, h('img', { src: 'assets/online/i_' + ic.id + '.webp', alt: ic.name }))));
    set(h('div', { class: 'town' }, stage, top, chatBox(p), bar));
  }

  // ---- chat box (design = assets/online/chat.webp, tabs All + Guild). Messages stay on this phone until the chat server exists ----
  function chatBox(p) {
    const log = h('div', { class: 'log' });
    const draw = () => { log.replaceChildren(...chatLog.map(m => h('div', null, m.sys ? h('i', null, m.text) : [h('b', null, m.who + ': '), m.text]))); log.scrollTop = log.scrollHeight; };
    chatDraws.push({ ok: () => log.isConnected, draw });
    if (!chatLog.length) chatLog.push({ sys: 1, text: 'Welcome to Server ' + (p.server || curServer) + ', ' + p.name + '!' });
    const inp = h('input', { maxlength: '120', placeholder: 'Type message...', autocomplete: 'off', spellcheck: 'false' });
    const send = async () => {
      const t = inp.value.trim(); if (!t) return; inp.value = '';
      if (!Live.running) { chatLog.push({ who: p.name, text: t }); return draw(); }
      try { await Live.call('chat', { text: t }); } catch (e) { if (e.status === 401) return expired(); toastMsg(e.status === 429 ? 'Slow down a little.' : 'Message not sent.'); }
    };
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') send(); };
    inp.onkeyup = inp.onkeypress = e => e.stopPropagation();
    const box = h('div', { class: 'chat' },
      h('div', { class: 't', style: 'left:6.4%;width:17.6%', onclick: () => { beep(); } }),
      h('div', { class: 't', style: 'left:24.8%;width:20.6%', onclick: () => { beep(); chatLog.push({ sys: 1, text: 'Guild chat opens when you join a league.' }); draw(); } }),
      log, h('div', { class: 'up', onclick: () => { log.scrollTop -= 40; } }), h('div', { class: 'dn', onclick: () => { log.scrollTop += 40; } }),
      inp, h('div', { class: 'em', onclick: () => { inp.value += '\u{1F642}'; inp.focus(); } }), h('div', { class: 'send', onclick: () => { beep(); send(); } }));
    draw(); return box;
  }

  // ---- small popup used for buildings / icons that are not connected yet ----
  function pop(title, text, extra) {
    const town_ = root.firstChild; if (!town_) return;
    const p = h('div', { class: 'pop', onclick: e => { if (e.target === p) p.remove(); } }, h('div', { class: 'box' }, h('h2', null, title), text ? h('p', null, text) : null, extra || null, h('p', { class: 'warn' }, 'Coming next.'), h('div', { class: 'row' }, btn('OK', () => p.remove()))));
    town_.append(p);
  }
  function iconPop(ic) { pop(ic.name, ''); }

  // ---- Arena: its code (arena_v2.js + arena_maps.js) is downloaded from GitHub the first time you tap the building ----
  const extraDone = {};
  function loadExtra(file) {
    if (extraDone[file]) return extraDone[file];
    const base = (typeof ONLINE_CODE_URL === 'string' ? ONLINE_CODE_URL : '').replace(/[^/]*$/, '');
    return extraDone[file] = fetch(base + file + '?t=' + Date.now(), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(file + ' ' + r.status); return r.text(); })
      .then(code => { const s = document.createElement('script'); s.textContent = code + '\n//# sourceURL=' + file; document.head.appendChild(s); }).catch(e => { delete extraDone[file]; throw e; });
  }
  function arenaCtx() {
    return { root, get player() { return session.player; }, h, beep, toast: toastMsg, robots, robotImg, chatBox: () => chatBox(session.player), back: town, launch: (kind, ret) => { retFn = ret; launch(kind); }, reopenArena: openArena, live: Live, info: myInfo, fight: startFight };
  }
  async function startFight(match, cb) {   // ARENA FIGHT: the real battle between the players of a match (arena_fight.js, downloaded from GitHub like the arena itself)
    if (typeof MAP_RUNS === 'undefined' || !MAP_RUNS.colosseum) await loadExtra('arena_maps_runs.js');
    if (typeof ArenaFight === 'undefined') await loadExtra('arena_fight.js');
    if (typeof ArenaFight === 'undefined') throw new Error('arena_fight.js did not load');
    const fc = { get player() { return session.player; }, toast: toastMsg, expired,
      post: (path, body) => api('/api/arena/' + path, Object.assign({ server: session.player.server || curServer }, body || {}), session.token),
      hideOnline: () => { root.hidden = true; }, showOnline: () => { root.hidden = false; } };
    return ArenaFight.run(fc, match, cb);
  }
  function advCtx() { const c = arenaCtx(); c.reopenAdv = openAdventure; c.loadExtra = loadExtra; c.session = () => session; return c; }   // (not Object.assign: it would freeze the live `player` getter)
  async function openAdventure() {   // ADVENTURE LOBBY (adventure_lobby.js, downloaded from GitHub the first time, like the Arena)
    try {
      if (typeof AdvLobbyUI === 'undefined') { toastMsg('Loading Adventure...'); await loadExtra('adventure_lobby.js'); }
      if (typeof AdvLobbyUI === 'undefined') throw new Error('adventure did not start');
      installReturn(); root.hidden = false; AdvLobbyUI.open(advCtx());
    } catch (e) { toastMsg('Cannot load Adventure. Check your internet.'); }
  }
  async function openArena() {
    try {
      if (typeof ArenaUI === 'undefined') { toastMsg('Loading Arena...'); await loadExtra('arena_maps.js'); await loadExtra('arena_v2.js'); }
      if (typeof ArenaUI === 'undefined') throw new Error('arena did not start');
      installReturn(); root.hidden = false; ArenaUI.open(arenaCtx());
    } catch (e) { toastMsg('Cannot load the Arena. Check your internet.'); }
  }

  // ---- Adventure / Shop / Armory open the game's own screens (same as the offline game) ----
  let fromTown = false, retFn = null;   // retFn = where to come back to (the arena sets it; empty = the town)
  function backToTown() { fromTown = false; const f = retFn; retFn = null; if (session) { root.hidden = false; if (f) f(); else town(); } else open(); }
  function installReturn() {   // when the game goes back to its title screen, come back to the town instead
    if (installReturn.done || typeof UI === 'undefined') return; installReturn.done = true;
    const orig = UI.show.bind(UI);
    UI.show = function (name) { const r = orig(name); if (name === 'title' && fromTown) setTimeout(backToTown, 0); return r; };
  }
  // While you are online, Profile / Shop / Armory / Adventure use YOUR ONLINE character (the robot you picked on this server).
  // Your offline character is saved first and put back when you leave online mode.
  function syncRobot() { if (!ns) activateChar(); }   // safety: Profile / Shop / Armory / Adventure always run on the ONLINE save
  function restoreOfflineChar() {
    try {
      const b = store.get('offchar_backup', -1); if (b < 0) return;
      Profile.load(); Profile.data.char = Math.max(0, Math.min(b | 0, Assets.robots.robots.length - 1)); Profile.ensureWeapon(); Profile.save();
      UI.setup.teams[0].robot = Profile.data.char; store.set('setup', UI.setup); store.set('offchar_backup', -1);
    } catch (e) { }
  }
  function launch(kind) {
    installReturn(); syncRobot(); fromTown = true; root.hidden = true; view = null;
    try { goLandscape(); } catch (e) { } beep();
    if (kind === 'gate') Adventure.open(); else if (kind === 'armory') Forge.open(null); else if (kind === 'shop') Shop.open(); else if (kind === 'profile') Profile.open();
  }
  function building(b) {
    if (b.id === 'arena') return openArena();
    if (b.id === 'gate') return openAdventure();
    if (b.id === 'gate' || b.id === 'armory' || b.id === 'shop') { try { return launch(b.id); } catch (e) { fromTown = false; root.hidden = false; toastMsg('Could not open ' + b.name + '.'); return; } }
    pop(b.name, b.text);
  }
  function expired() { Live.stop(); deactivateChar(); session = null; store.set('otoken', ''); welcome('Your session ended. Log in with your code.'); }
  function close() { root.hidden = true; view = null; Live.stop(); deactivateChar(); restoreOfflineChar(); }
  function leave() { close(); }   // this code runs inside the app's own page, so closing shows the app's menu again

  async function open() {
    ensure(); root.hidden = false; try { goLandscape(); } catch (e) { }
    const tok = store.get('otoken', '');
    if (tok) {   // returning player on this phone
      busy('Connecting...');
      try { const j = await api('/api/me', {}, tok); session = { token: tok, player: j.player }; return serverList(); }
      catch (e) { if (e.status !== 401) return welcome(e.message); }
    }
    welcome();
  }
  return { open, close };
})();
