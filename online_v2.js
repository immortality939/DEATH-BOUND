/* ONLINE MODE (client) - lives on GitHub only. The app downloads it when the player taps Online (see online_loader.js in the app) and runs it inside the app page,
   so the images come from the phone and none of this code is stored in the app.
   Flow: Online button -> guest login -> Server 1..5 -> choose one of the 10 robots -> name your character -> TOWN
   TOWN = island picture with 6 buildings (Adventure, Arena, League, Hall of Fame, Shop, Armory) + chat box + icon bar.
   The server (Render + Supabase) owns the account and the character; this file only shows screens and asks the server.
   Server calls used (see SERVER_API.md for the exact JSON and the SQL):
     /api/guest  /api/login  /api/me           (already existed)
     /api/servers   /api/enter   /api/character                                                                    (character + servers)
     /api/arena/*  (poll, chat, create, join, leave, config, ready, start, cancel, back, invite, pm)                   (real players: rooms, chat, private messages, matchmaking)
     /api/friends/*  (list, request, accept, decline, remove)                                                           (friend list; needs supabase_friends.sql)
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
#onl .pop.wood{background:rgba(10,5,0,.62)}
#onl .wpnl{width:min(440px,86vw);background:url(assets/online/ui/wood_tile.png) padding-box;border:16px solid transparent;border-image:url(assets/online/ui/panel.png) 30 / 16px stretch;background-clip:padding-box;box-sizing:border-box;padding:6px 10px 10px;text-align:center;color:#fff2da;font-family:var(--body,sans-serif)}
#onl .watabs{display:flex;gap:8px;justify-content:center;margin:2px 0 8px}
#onl .watb{padding:7px 14px;border-radius:10px;font:400 15px/1 var(--disp,sans-serif);cursor:pointer;background:rgba(36,18,4,.55);border:2px solid rgba(255,224,160,.3)}#onl .watb.on{border-color:#ffd34a;color:#ffd34a}
#onl .wlst{height:min(240px,48vh);overflow-y:auto}#onl .wlst p{margin:14px 0;font-size:14px}
#onl .wiv{display:flex;align-items:center;gap:8px;padding:4px 6px;border-bottom:1px solid rgba(255,220,160,.12);text-align:left;font-size:14px}
#onl .wiv img{width:30px;height:30px;object-fit:contain;flex:none}#onl .wiv b{flex:1}#onl .wiv i{color:#ffd34a;font-style:normal;font-weight:700}
#onl .wiv{cursor:pointer}#onl .wiv.sel{background:rgba(255,211,74,.16);border-radius:8px 8px 0 0}
#onl .wact{display:flex;gap:8px;justify-content:flex-end;align-items:center;padding:6px;background:rgba(255,211,74,.1);border-bottom:1px solid rgba(255,220,160,.12);border-radius:0 0 8px 8px}
#onl .wact small{color:#cdb98f;font-size:13px;margin-right:auto}
#onl .wbtn{padding:6px 12px;border-radius:9px;font:400 14px/1 var(--disp,sans-serif);cursor:pointer;color:#fff;background:linear-gradient(#e0a53a,#9a5a14);border:2px solid #ffe3a0;text-shadow:0 1px 0 #4a1f06}
#onl .wbtn.red{background:linear-gradient(#d9503f,#8c2418);border-color:#ffb3a8}#onl .wbtn.off{background:#555;border-color:#888;color:#ccc;cursor:default;text-shadow:none}
#olNotif{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:2147483000;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;max-width:94vw}
#olNotif .nb{pointer-events:auto;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:14px;background:rgba(36,18,4,.95);border:3px solid #ffd34a;box-shadow:0 6px 18px rgba(0,0,0,.6);font:600 15px var(--body,sans-serif);color:#fff2da}
#olNotif .nb button{flex:none;min-width:72px;height:34px;padding:0 12px;border-radius:9px;cursor:pointer;color:#fff;font:400 15px var(--disp,sans-serif);background:linear-gradient(#e0a53a,#9a5a14);border:2px solid #ffe3a0;text-shadow:0 1px 0 #4a1f06}
#olNotif .nb button.off{background:linear-gradient(#6b6b6b,#3a3a3a);border-color:#aaa}
/* chat box (bottom left) + icon bar (bottom right) */
#onl .chat{--cw:clamp(250px,37vw,500px);position:absolute;left:max(6px,env(safe-area-inset-left,0px));bottom:max(6px,env(safe-area-inset-bottom,0px));width:var(--cw);aspect-ratio:697/350;background:url(assets/online/chat.webp) 0 0/100% 100% no-repeat;z-index:10;font-size:calc(var(--cw)/40)}
#onl .chat .t{position:absolute;top:4%;height:14%;cursor:pointer}
#onl .chat .ti{position:absolute;top:3.4%;height:16%;pointer-events:none;-webkit-user-drag:none}
#onl .chat .pdot{position:absolute;left:65.5%;top:1.5%;width:3.4%;aspect-ratio:1;border-radius:50%;background:#ff3b30;border:.15em solid #fff;display:none;pointer-events:none}
#onl .chat .log .pm{cursor:pointer}#onl .chat .log .pm b{color:#7fd0ff}
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
  const chatLog = [], chatDraws = [], pmLog = [];
  let pmSince = 0, chatTab = 'all', pmPeer = null, pmUnread = false, friendList = [];   // chat tab: 'all' | 'league' | 'private'; pmPeer = who your Private messages go to
  const redrawChats = () => { for (let i = chatDraws.length - 1; i >= 0; i--) { if (!chatDraws[i].ok()) chatDraws.splice(i, 1); else chatDraws[i].draw(); } };
  const Live = (() => {
    let on = false, srv = 0, since = 0, last = null, timer = null, inflight = false;
    const subs = new Set();
    const apply = j => {
      last = j; if (j.seq < since) since = 0; else since = j.seq;
      if (j.chat && j.chat.length) { for (const m of j.chat) chatLog.push({ who: m.who, text: m.text }); while (chatLog.length > 80) chatLog.shift(); redrawChats(); }
      if (j.pmSeq != null && j.pmSeq < pmSince) pmSince = 0;   // the server was restarted
      if (j.pm && j.pm.length) {   // private messages (sent to me, or sent by me: the server echoes both)
        const myId = session && session.player && session.player.id; let got = false;
        for (const m of j.pm) { if (m.id <= pmSince) continue; pmSince = m.id; got = true; const mine = m.from.id === myId;
          pmLog.push({ mine, peer: mine ? m.to : m.from, text: m.text });
          if (!mine) { if (!pmPeer) pmPeer = m.from; if (chatTab !== 'private') { pmUnread = true; toastMsg('PM from ' + m.from.name + ': ' + String(m.text).slice(0, 40)); } } }
        while (pmLog.length > 80) pmLog.shift(); if (got) redrawChats();
      }
      if (j.notes && j.notes.length) { for (const n of j.notes) toastMsg(n); refreshFriends(); }
      try { globalAlerts(j); } catch (e) { }
      subs.forEach(f => { try { f(j); } catch (e) { } });
    };
    const call = async (path, body) => {
      const j = await api((/^adv\//.test(path) ? '/api/' : '/api/arena/') + path, Object.assign({ server: srv, since, pmSince }, myInfo(), body || {}), session.token); apply(j); return j;
    };
    const tick = async () => {
      if (!on) return; if (!inflight) { inflight = true; try { await call('poll'); } catch (e) { if (e.status === 401) { stop(); return expired(); } } inflight = false; }
      if (on) timer = setTimeout(tick, root && root.hidden ? 2500 : 1500);   // slower while the Bag / Shop is open, but still fast enough to get invitations
    };
    const start = server => { stop(); on = true; srv = server; since = 0; last = null; chatLog.length = 0; pmLog.length = 0; pmSince = 0; pmPeer = null; pmUnread = false; chatTab = 'all'; friendList = []; timer = setTimeout(tick, 0); };
    const stop = () => { on = false; clearTimeout(timer); inflight = false; subs.clear(); Notif.clear(); };
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
  // ---------- friends: calls + list ----------
  const fapi = (p, b) => api('/api/friends/' + p, Object.assign({ server: session.player.server || curServer }, myInfo(), b || {}), session.token);
  async function refreshFriends() {
    try { const j = await fapi('list'); friendList = j.friends || []; } catch (e) { if (e.status === 401) expired(); }
    return friendList;
  }

  // ---------- banners that show ON ANY SCREEN (invitations + friend requests): they live on the page body, not inside the arena / adventure screens ----------
  const Notif = (() => {
    const seen = new Set(); let box = null;
    const el = () => { if (!box || !box.isConnected) { box = h('div', { id: 'olNotif' }); document.body.append(box); } return box; };
    const show = (key, text, acts) => {
      if (seen.has(key)) return; seen.add(key); if (seen.size > 300) seen.delete(seen.values().next().value);
      const b = h('div', { class: 'nb' }, h('span', null, text), acts.map(a => h('button', { class: a.off ? 'off' : null, onclick: () => { beep(); b.remove(); if (a.fn) a.fn(); } }, a.t)));
      el().append(b); setTimeout(() => b.remove(), 22000);
    };
    return { show, clear: () => { if (box) box.replaceChildren(); } };
  })();
  function globalAlerts(j) {   // called for every answer of the live poll, wherever the player is (town, Bag, Shop, Armory, other lobby)
    if (!session || !root) return;
    const fighting = (j.myRoom && (j.myRoom.state === 'vs' || j.myRoom.state === 'searching')) || (j.myAdv && (j.myAdv.state === 'starting' || j.myAdv.state === 'running'));
    if (fighting) return;   // not in the middle of a fight / run: it shows after (the invitation lives 60 s)
    const onScreen = c => !root.hidden && !!root.querySelector('.' + c);   // the Arena / Adventure screens show their own banner
    for (const iv of j.fReq || []) Notif.show('f:' + iv.from.id + ':' + iv.at, iv.from.name + ' wants to be your friend', [{ t: 'Accept', fn: () => friendAct('accept', iv.from.id) }, { t: 'No', off: 1, fn: () => friendAct('decline', iv.from.id, true) }]);
    if (!onScreen('ar')) for (const iv of j.invites || []) Notif.show('a:' + iv.from.id + ':' + iv.at, iv.from.name + ' invites you to Arena Room ' + iv.room, [{ t: 'Join', fn: () => joinInvite('arena', iv.room) }, { t: 'No', off: 1 }]);
    if (!onScreen('av')) for (const iv of j.advInvites || []) Notif.show('v:' + iv.from.id + ':' + iv.at, iv.from.name + ' invites you to Adventure Room ' + iv.room, [{ t: 'Join', fn: () => joinInvite('adv', iv.room) }, { t: 'No', off: 1 }]);
  }
  async function friendAct(op, from, quiet) {
    try { await fapi(op, { from }); if (op === 'accept') { refreshFriends(); Live.nudge(); } }
    catch (e) { if (e.status === 401) return expired(); if (!quiet) toastMsg(e.message || 'Could not do that.'); }
  }
  async function joinInvite(kind, room) {   // accept an invitation from any screen: join the room on the server, then open the Arena / Adventure room
    try { await Live.call(kind === 'arena' ? 'join' : 'adv/join', { room }); }
    catch (e) { if (e.status === 401) return expired(); return toastMsg(e.message || 'Could not join that room.'); }
    try { if (typeof ArenaUI !== 'undefined' && ArenaUI.close) ArenaUI.close(); } catch (e) { }
    try { if (typeof AdvLobbyUI !== 'undefined' && AdvLobbyUI.close) AdvLobbyUI.close(); } catch (e) { }
    const go = kind === 'arena' ? openArena : openAdventure;
    if (fromTown) { retFn = go; try { UI.show('title'); } catch (e) { backToTown(); } }   // the Bag / Shop / Armory is open: leave it first, it brings us back to `go`
    else { root.hidden = false; go(); }
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
    activateChar(); Live.start(curServer); refreshFriends(); town();
  }

  // ---------- 5. TOWN ----------
  // x / by = centre and ground line of the building on the 1672x941 land picture, w = its width on that picture
  const BUILDINGS = [
    { id: 'hall',      name: 'Hall of Fame', img: 'b_hall',      x: 450,  by: 350, w: 280, text: 'See the top leagues and the strongest players by power.' },
    { id: 'gate',      name: 'Adventure',    img: 'b_adventure', x: 836,  by: 315, w: 255 },
    { id: 'armory',    name: 'Armory',       img: 'b_armory',    x: 1290, by: 360, w: 250 },
    { id: 'arena',     name: 'Arena',        img: 'b_arena',     x: 836,  by: 610, w: 305, text: 'Fights against other players: 1 vs 1 up to 4 vs 4.', plank: true },   // Arena in the middle of the town
    { id: 'auction',   name: 'Auction House', img: 'b_auction',  x: 245,  by: 545, w: 300, text: 'Buy and sell items with other players. Coming soon.' },
    { id: 'league',    name: 'League',       img: 'b_league',    x: 836,  by: 860, w: 255, text: 'Join a league, or create your own. League vs league fights.', plaque: [50.5, 35.8] },
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

  // ---- chat box (design = assets/online/chat.webp). Tabs: All | League | Private. The tab pictures are small PNGs drawn on top of the chat picture (inside this file, so the app needs no new images) ----
  const CHAT_TABS = {
    all_off: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH0AAAA4CAMAAADnywfIAAABIFBMVEWXbk/SoWdqVk9iVjSgoawjFRHetZdnYGL03pxOMBvw6s8nGxUzJxxcSTdRQjpvSB2QcF9LNil5eYWfZxq4hDlgKyJuWEaglXJLNSfLkDrxynd9gY6lWQz///ItWlpBPUq1kli+ws0xMWMfWh9qHGpdXaHAfld//3+ZMzOqVaqwr8L/v7/MzH/GxqonKjFGSVYJBAM1OURTWGL8/PwuMjtNU10ZFxg9QkwxIxSsh2RoSCskFArauZUAAABrNTVxZE+pkHA+PT2mp7AxJhe2uMbq0a2Rg20cGyBrUTyHholUVVR/f3+udDAjCQHs7Ox/fwCkaTVSOChoZ3HaxqxYRTMsFguvhlPExcluV0XEiGZpOhvkzK/EhFhENTCNWjSRZjF9YNPpAAAAYHRSTlP59w8P/N35+/X2+RGmYonzFZT7+PgIVg5l+vb7AwMG/Pj7BQUFBPkCBQP7BAoJ+/z7+/v/+/z8/Pr59/n5AwQ2+AX7tvv39vv6/gMC+O7/Avb4+/f3zvj9+vjy9/my+fnB07uLAAAHD0lEQVR42sWYh2KiShSGhyaIurGlby+3X1oAC+mmqJHEkMSSZOP7v8U9ZyiC0Rizm72/BVBmvjllDjBkJ64LeL99exBqN9R4bwG1qc4O2tBT+yDfPjs7w08gyiNjMLwuLt4uw377ot3eze/ucsBFff52sLjYdpul4jiWff85k+GgO+C3I/xZjI7a3d35/d1qPr/3E8QmDtj8av5gmeXAIzEPkDG7Dex3/+6trRWy2Wwj2/gpygYq5HIsu8pmwP72OAJkbDiX2XnHrmUF7XUkCI3c3j/vM3+0g4QI6WA3BPoLsrWqeHJCTqgI6OTlIpHofjPt3DRy+b93OZqPNAMCOmT1cj6XFWzxSpbl47juUMeL6+4KFbaVZElilqpClls9YMH7/ozw6e1djs2v3WjX27J8x+z3qGq12v4+vOGLfr9c0Pwjw0igpius5f98z43pmG8wLQpO9USWU71OF93UrFM1QYPBoPkCDcYSocdOt9SBAew7YD77BZIfX2TnDPzOcrmClt6Wpd6o2+k001XH0WyQ5mrOC2VHX6h0fUTKHeRvp7UGl//KcmAwh3SYh7mGlr6SmdGoM7p1XiXlXadOmHKpvCEtaQ0oQbQQAf0ATG9o1Sv546jTWfLZp0pcpvISmb5gqyg2duos9YC/IY3c7J6PJzvt5Z18AeHMiIyqeJZtGi3+8JCHz49o3J4/LKrKKfJHDFNC6wt5rk09/zazmtMcSWY6vaYLZyiWCOxP/f5RJP7oB4Uj8FTwgJsG8yUmLeTyEHiwHS4CN9o+wDt1gNtqscX35T7veZ4oGj8u0RBFz9g86gPfdGwt3SuvS4wj5FaXwfNfl/cK2kCWOuURwsHnn4BtqD8uy4odePzRX3xRtx3AQ+b3nMYejTu7cpM+lrodkga4B4Z/alkV1TJ+nnAYuugVeb5oQvqNyp0NqUl9T3b2Ci6RyqX7JbS8yPd5S3+abcV24K1WUGqwif09hlvYoaqCXz2IfRWN/+g2ViDrvq0ILmFK6yOoL6rXOmp9+GAZMNgn8D4ISJZlqHZyWtvqJN5Cuoqn6karpUIJa/ZKDER+ZY8jqwV3iWHWy7euZnqbR7z6wQ8abTUVroQkHUCnk1XlNEm3AgXR30TjHVJeZ0ZOAejcTXpbYtYfHEdRITKqHqTMTLebYxLYid8gGJGCWzi0jNl0SxRVGG+TAd8vgfFk56YmwWy7dRzB4A89XY3TI/utSAa42gyBBuDsLVBL01q4deiQrLCdlYRDPD0DIw81f6NXfYP0lFRaL7muJhT5zWimxaHxboxKwNviMUvBdvs8Rrfj9PGQx3PPEDHyS/clpuO8WQE6YbrMA8x1vdUS1Wn0eEcYdY/St2Cv8gI6Gl8Hbz84BaQ/3HcYqDSK1yoajwqGlagZqoU5zvt0D2M9hW49WYIMQ7e1QQquZ24hR20HOgSzWPTm1y8dkD58q4/zawpdfR695H4P6Q+UPr++WuBuMaBvQfZD7VqMrlJ6k+mC7T79vkvpoveM4g1Tqo+0vo+0F6ZbVpLeHBKkK94z6GguzThkyX51W5QO/mrSuFN6fUjuKV2cT7d9iqxdIkt9CV0Fej3V7fp0Id0L6PPDDjmnyT5M9qf8Y3olPLkS2wuuDPQXJUbPCJfD35BuIr3yNB1yTg3yDWHn9mJ0ei0M6bfu9zckc3M5vL8nQIeLkD6dXok5/tCfa/68s56gVx5Jh1eF0q+3E/SHgB7wYyP1jyLHU9Y53AVg0m8dTqGHV4oK9JVg6373FXDgTLquT9Jx0JHjra2EnNl0faoCetzzwwRdj0epolKX+RpX2VDeNLrfVJ+B1yfozBDjrhjW+JSYtyrRr0oQbZnvg/iw2k7S5ylOPxjT1TnN7KDKBvcXLf9CN0k3n0vXFqKbQZWVgzsb07+tSNxdzKWbpo45nyKh7Wlm+JtPN+eN2TwHiRqt7zAUOOiD7SCgi7idQzd1fLCbpKPtAtBBT9Jt+lgNI6VhCI6Sm4g+2Vf4UKk8ovcCuhI0SQwjaKbHbifRfzOelO3w/CnSH9EzSCdAP7UqZvTYO1VKcO9u07OSeDv8L3b6NLpC6SLStfQbshyjx56641DFbxRugq058bA+5VF/SlcRfXSrCWC7ENLVly0SPGMRYeIXW1NT5AHoBbzGMcMa0nXlF4najvTvSE9RuvLL6Wbat733f9Bd85LS74evTBfgpUQfiPsdgeUCxSSa02RqtQHQzVeD4+yLHVRxvpM6TE+iXQ7qzXpQqiZ16ivaWUjYyrYFeGZVW4OBYit4+y16cOOuaVUF1xKB/itkz/idVAM51VeQE+tWUaro+MT/BJawr7al7VdQajsFugoWyq/uju/oevtVTATWwWv4hQvis/TUf7N1clI7iR1Gi+X70Xp7jdRfTdfXlwldJ0RP+Q/SsX+Gu9uSOwAAAABJRU5ErkJggg==',
    all_on: 'data:image/png;base64,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',
    league_off: 'data:image/png;base64,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',
    league_on: 'data:image/png;base64,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',
    private_off: 'data:image/png;base64,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',
    private_on: 'data:image/png;base64,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'
  };
  const TAB_POS = { all: [5.88, 17.93], league: [24.53, 20.8], private: [45.77, 21.52] };   // [left %, width %] on the 697x350 chat picture
  function chatBox(p) {
    const log = h('div', { class: 'log' });
    const inp = h('input', { maxlength: '120', placeholder: 'Type message...', autocomplete: 'off', spellcheck: 'false' });
    const imgs = {}, dot = h('div', { class: 'pdot' });
    for (const k in TAB_POS) imgs[k] = h('img', { class: 'ti', style: 'left:' + TAB_POS[k][0] + '%;width:' + TAB_POS[k][1] + '%', alt: '', draggable: 'false' });
    const peerLine = () => h('div', null, h('i', null, pmPeer ? 'Private chat with ' + pmPeer.name + '.  Tap a name to answer someone else.' : 'Private messages. Open the Friends icon, tap a player and press PM.'));
    const draw = () => {
      for (const k in imgs) imgs[k].src = CHAT_TABS[k + (chatTab === k ? '_on' : '_off')];
      dot.style.display = pmUnread && chatTab !== 'private' ? 'block' : 'none';
      inp.placeholder = chatTab === 'private' ? (pmPeer ? 'PM to ' + pmPeer.name + '...' : 'Choose a player first...') : 'Type message...';
      let rows;
      if (chatTab === 'private') rows = [peerLine(), ...pmLog.map(m => h('div', { class: 'pm', onclick: () => { pmPeer = m.peer; draw(); inp.focus(); } }, m.mine ? [h('b', null, 'To ' + m.peer.name + ': '), m.text] : [h('b', null, m.peer.name + ': '), m.text]))];
      else if (chatTab === 'league') rows = [h('div', null, h('i', null, 'League chat opens when you join a league.'))];
      else rows = chatLog.map(m => h('div', null, m.sys ? h('i', null, m.text) : [h('b', null, m.who + ': '), m.text]));
      log.replaceChildren(...rows); log.scrollTop = log.scrollHeight;
    };
    chatDraws.push({ ok: () => log.isConnected, draw });
    if (!chatLog.length) chatLog.push({ sys: 1, text: 'Welcome to Server ' + (p.server || curServer) + ', ' + p.name + '!' });
    const send = async () => {
      const t = inp.value.trim(); if (!t) return;
      if (chatTab === 'league') return toastMsg('League chat opens when you join a league.');
      if (chatTab === 'private') {
        if (!pmPeer) return toastMsg('Open Friends, tap a player and press PM.');
        inp.value = '';
        try { await Live.call('pm', { to: pmPeer.id, text: t }); Live.nudge(); }
        catch (e) { if (e.status === 401) return expired(); toastMsg(e.status === 429 ? 'Slow down a little.' : e.status === 404 ? pmPeer.name + ' is not online.' : 'Message not sent.'); }
        return;
      }
      inp.value = '';
      if (!Live.running) { chatLog.push({ who: p.name, text: t }); return draw(); }
      try { await Live.call('chat', { text: t }); } catch (e) { if (e.status === 401) return expired(); toastMsg(e.status === 429 ? 'Slow down a little.' : 'Message not sent.'); }
    };
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') send(); };
    inp.onkeyup = inp.onkeypress = e => e.stopPropagation();
    const tab = k => () => { beep(); chatTab = k; if (k === 'private') pmUnread = false; redrawChats(); };
    const hit = (k, l, w) => h('div', { class: 't', style: 'left:' + l + '%;width:' + w + '%', onclick: tab(k) });
    const box = h('div', { class: 'chat' }, imgs.all, imgs.league, imgs.private, dot,
      hit('all', 6.4, 17.6), hit('league', 24.8, 20.6), hit('private', 46, 21),
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
  function friendsPop() {   // Friend List | World (same wood panel as the Arena and the Adventure room). Tap a player: World = Add Friend + PM, Friend List = PM + Remove
    const t = root.firstChild; if (!t) return; let tab = friendList.length ? 'friends' : 'world', box = null, sel = null; const sent = new Set();
    const startPm = o => { pmPeer = { id: o.id, name: o.name }; chatTab = 'private'; pmUnread = false; box.remove(); redrawChats(); const i = root.querySelector('.chat input'); if (i) i.focus(); };
    const abtn = (txt, fn, cls) => h('div', { class: 'wbtn' + (cls ? ' ' + cls : ''), onclick: e => { e.stopPropagation(); if (cls === 'off') return; beep(); fn(); } }, txt);
    const draw = () => {
      let sc = 0; if (box) { const old = box.querySelector('.wlst'); if (old) sc = old.scrollTop; box.remove(); }
      const me_ = session.player, live = ((Live.last && Live.last.online) || []).filter(o => o.id !== me_.id), fs = new Set(friendList.map(f => f.id));
      const list = tab === 'friends' ? friendList.map(f => { const lv = live.find(o => o.id === f.id); return lv ? Object.assign({}, f, lv, { online: true }) : Object.assign({}, f, { online: false }); }) : live.map(o => Object.assign({}, o, { online: true }));
      const rows = list.map(o => {
        const open = sel === o.id;
        const row = h('div', { class: 'wiv' + (open ? ' sel' : ''), onclick: () => { beep(); sel = open ? null : o.id; draw(); } },
          h('img', { src: 'assets/robots/front/' + robotOf(o.robot).id + '.webp', alt: '' }), h('b', null, (tab === 'world' && fs.has(o.id) ? '\u2605 ' : '') + o.name), h('i', null, o.online ? 'Lv ' + o.lv : 'Offline'));
        if (!open) return row;
        const acts = [];
        if (tab === 'world') acts.push(fs.has(o.id) ? h('small', null, 'Already your friend') : sent.has(o.id) ? abtn('Request sent', null, 'off') : abtn('Add Friend', async () => {
          try { const j = await fapi('request', { to: o.id }); if (j.friends) { refreshFriends().then(() => box.isConnected && draw()); toastMsg('You and ' + o.name + ' are now friends.'); } else { sent.add(o.id); toastMsg('Friend request sent to ' + o.name); } draw(); }
          catch (e) { if (e.status === 401) return expired(); toastMsg(e.message || 'Could not send the request.'); } }));
        if (o.online) acts.push(abtn('PM', () => startPm(o))); else acts.push(h('small', null, 'Offline: no private message'));
        if (tab === 'friends') acts.push(abtn('Remove', async () => {
          try { await fapi('remove', { id: o.id }); friendList = friendList.filter(f => f.id !== o.id); sel = null; toastMsg(o.name + ' was removed from your friends.'); draw(); }
          catch (e) { if (e.status === 401) return expired(); toastMsg(e.message || 'Could not remove.'); } }, 'red'));
        return h('div', null, row, h('div', { class: 'wact' }, acts));
      });
      const lst = h('div', { class: 'wlst' }, rows.length ? rows : h('p', null, tab === 'friends' ? 'No friends yet. Open World, tap a player and press Add Friend.' : 'Nobody else is online on this server.'));
      const tabs = h('div', { class: 'watabs' }, h('div', { class: 'watb' + (tab === 'friends' ? ' on' : ''), onclick: () => { beep(); tab = 'friends'; sel = null; draw(); } }, 'Friend List (' + friendList.length + ')'),
        h('div', { class: 'watb' + (tab === 'world' ? ' on' : ''), onclick: () => { beep(); tab = 'world'; sel = null; draw(); } }, 'World (' + live.length + ')'), h('div', { class: 'watb', onclick: () => { beep(); box.remove(); } }, 'X'));
      box = h('div', { class: 'pop wood', onclick: e => { if (e.target === box) box.remove(); } }, h('div', { class: 'wpnl' }, tabs, lst));
      t.append(box); lst.scrollTop = sc;
    };
    draw();
    const tm = setInterval(async () => { if (!box || !box.isConnected) return clearInterval(tm); await refreshFriends(); if (box && box.isConnected) draw(); }, 3000);   // online / offline + new players stay fresh while the panel is open
    refreshFriends().then(() => { if (box && box.isConnected) draw(); });
  }
  function iconPop(ic) {
    if (ic.id === 'bag') { try { return launch('profile'); } catch (e) { fromTown = false; root.hidden = false; toastMsg('Could not open the Bag.'); return; } }   // the Bag = Profile of YOUR online character, same as in the Arena and the Adventure
    if (ic.id === 'friends') return friendsPop();
    pop(ic.name, '');
  }

  // ---- Arena: its code (arena_v2.js + arena_maps.js) is downloaded from GitHub the first time you tap the building ----
  const extraDone = {};
  function loadExtra(file) {
    if (extraDone[file]) return extraDone[file];
    const base = (typeof ONLINE_CODE_URL === 'string' ? ONLINE_CODE_URL : '').replace(/[^/]*$/, '');
    return extraDone[file] = fetch(base + file + '?t=' + Date.now(), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(file + ' ' + r.status); return r.text(); })
      .then(code => { const s = document.createElement('script'); s.textContent = code + '\n//# sourceURL=' + file; document.head.appendChild(s); }).catch(e => { delete extraDone[file]; throw e; });
  }
  function arenaCtx() {
    return { root, get player() { return session.player; }, h, beep, toast: toastMsg, robots, robotImg, chatBox: () => chatBox(session.player), back: town, launch: (kind, ret) => { retFn = ret; launch(kind); }, reopenArena: openArena, live: Live, info: myInfo, fight: startFight, friends: () => friendList };
  }
  async function startFight(match, cb) {   // ARENA FIGHT: the real battle between the players of a match (arena_fight.js, downloaded from GitHub like the arena itself)
    if (typeof MAP_RUNS === 'undefined' || !MAP_RUNS.colosseum) await loadExtra('arena_maps_runs.js');
    if (typeof ArenaFight === 'undefined') await loadExtra('arena_fight.js');
    if (typeof ArenaFight === 'undefined') throw new Error('arena_fight.js did not load');
    const fc = { get player() { return session.player; }, toast: toastMsg, expired,
      post: (path, body) => api('/api/arena/' + path, Object.assign({ server: session.player.server || curServer }, body || {}), session.token), loadExtra,
      hideOnline: () => { root.hidden = true; }, showOnline: () => { root.hidden = false; },
      wsUrl: () => String(ONLINE_API).replace(/^http/, 'ws') + '/ws?t=' + session.token + '&sv=' + ((session.player && session.player.server) || curServer) };   // the fight sends its inputs over a WebSocket (fast); the normal HTTP calls stay as a safety net
    return ArenaFight.run(fc, match, cb);
  }
  function advCtx() { const c = arenaCtx(); c.reopenAdv = openAdventure; c.loadExtra = loadExtra; c.session = () => session; return c; }   // (not Object.assign: it would freeze the live `player` getter)
  async function openAdventure() {   // ADVENTURE LOBBY (adventure_lobby.js, downloaded from GitHub the first time, like the Arena)
    refreshFriends(); try {
      if (typeof AdvLobbyUI === 'undefined') { toastMsg('Loading Adventure...'); await loadExtra('adventure_lobby.js'); }
      if (typeof AdvLobbyUI === 'undefined') throw new Error('adventure did not start');
      installReturn(); root.hidden = false; AdvLobbyUI.open(advCtx());
    } catch (e) { toastMsg('Cannot load Adventure. Check your internet.'); }
  }
  async function openArena() {
    refreshFriends(); try {
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
