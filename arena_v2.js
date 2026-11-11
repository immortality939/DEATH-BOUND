/* ARENA (client) - downloaded from GitHub by online_v2.js when the player taps the Arena building, together with arena_maps.js.
   Screens: LOBBY (room list, online players, chat, Team Up / Search / Start)  ->  ROOM (4 slots, mode, items, Invite, Start / Ready)
            ->  SEARCHING  ->  VS.
   REAL PLAYERS: everything here comes from the Render server (/api/arena/*). The server owns the rooms, the online list, the chat and the matchmaking;
   this file only draws what the server says (online_v2.js polls the server every ~1.5 s and hands the answer to onData() below).
   Pictures: assets/online/ui/*.png (wood + light brown border, 9-slice) - these live in the app.
   RULES kept here: one character per player in every arena fight (not 3 like Adventure) - shown as ONE picture per slot.
   Matchmaking (server): two rooms with the same mode and the same number of players that are both searching become a match -> VS screen on every phone.
   THE FIGHT: after the VS screen the battle loads (arena_fight.js) and both phones play the same battle on the map of the match, turn by turn.
   When it ends both players come back here (room screen). */ 
'use strict';
const ARENA_UI = 'assets/online/ui/';

const ArenaUI = (() => {
  let C = null;                       // helpers from online_v2.js: { root, player, h, beep, toast, robots, robotImg, chatBox, back, launch, live, info }
  let el = null, K = 1, onResize = null, unsub = null;
  const me = () => C.player;
  const h = (...a) => C.h(...a);
  const MODES = {
    free:   { name: 'Free Fight',   lines: ['No limitations.', 'Scenes are randomly selected.', 'You play against players on similar level.'] },
    league: { name: 'League Fight', lines: ['Your team can only be members of the same league.', 'Your league fights against other leagues.', 'Scenes are randomly selected.'] },
  };
  const nrobots = () => C.robots().length;
  const S = { rooms: [], online: [], myRoom: null, invites: [], mode: 'free', view: null, sig: '', seenMatch: 0, invSeen: new Set(), banner: null, timers: [] };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); S.timers.push(t); return t; };
  const clearTimers = () => { S.timers.forEach(clearTimeout); S.timers = []; };
  const myMember = () => {   // me, as the other players see me
    const p = me(), i = C.info() || {};
    return { id: p.id, name: p.name, lv: i.lv || 1, robot: p.robot, weapon: i.weapon || { name: 'Standard cannon', img: '' }, me: true };
  };
  const amMember = m => m && m.id === me().id;
  const hostOf = r => r.members.find(m => m.host) || r.members[0];
  // ask the server something; the answer is the new state of everything (so the screen is current at once)
  async function act(path, body) {
    try { return await C.live.call(path, body); }
    catch (e) { C.toast(e && e.message ? e.message : 'Server error'); try { C.live.nudge(); } catch (x) { } return null; }
  }

  // ===================== look =====================
  const U = f => ARENA_UI + f;
  function css() {
    if (document.getElementById('arenaCss')) return;
    const s = document.createElement('style'); s.id = 'arenaCss'; s.textContent = `
#onl .ar{position:absolute;inset:0;background:#2a1a0c url(${U('bg_wood.jpg')});overflow:hidden;font-family:var(--body,sans-serif);color:#fff2da;user-select:none;-webkit-user-select:none}
#onl .ar .st{position:absolute;left:50%;top:50%;width:960px;height:540px;transform:translate(-50%,-50%) scale(var(--k,1));transform-origin:50% 50%}
#onl .ar .abs{position:absolute}
#onl .ar .pnl{background:url(${U('wood_tile.png')}) padding-box;border:16px solid transparent;border-image:url(${U('panel.png')}) 30 / 16px stretch;background-clip:padding-box;box-sizing:border-box}
#onl .ar .ins{background:#2a190b url(${U('bg_wood.jpg')}) padding-box;border:14px solid transparent;border-image:url(${U('panel_dark.png')}) 26 / 14px stretch;background-clip:padding-box;box-sizing:border-box}
#onl .ar .ttl{position:absolute;left:270px;top:2px;width:420px;height:96px;background:url(${U('banner.png')}) 0 0/100% 100%;display:flex;align-items:center;justify-content:center;font:400 44px/1 var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:2px #4a1f06;paint-order:stroke fill;text-shadow:0 3px 0 #4a1f06;letter-spacing:2px}
#onl .ar .ttl.sm{left:300px;width:330px;height:70px;font-size:34px}
#onl .ar .ab{position:absolute;display:flex;align-items:center;justify-content:center;cursor:pointer;background:url(${U('btn_wood.png')}) 0 0/100% 100%;font:400 19px/1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1.5px #5a2d08;paint-order:stroke fill;text-shadow:0 2px 0 #5a2d08;letter-spacing:.5px;-webkit-tap-highlight-color:transparent;transition:transform .1s,filter .1s}
#onl .ar .ab:hover{filter:brightness(1.12)}#onl .ar .ab:active{transform:scale(.96)}
#onl .ar .ab.go{background-image:url(${U('btn_start.png')});font-size:26px}
#onl .ar .ab.rd{background-image:url(${U('btn_ready.png')});font-size:26px}
#onl .ar .ab.off{background-image:url(${U('btn_off.png')});filter:grayscale(.3);cursor:default}
#onl .ar .ab.sm{font-size:15px}
#onl .ar .rc{position:absolute;width:338px;height:58px;display:flex;align-items:center;gap:8px;padding:0 6px 0 4px;background:url(${U('wood_light.png')}) padding-box;border:10px solid transparent;border-image:url(${U('slot.png')}) 24 / 10px stretch;background-clip:padding-box;cursor:pointer;box-sizing:border-box;transition:transform .1s,filter .1s}
#onl .ar .rc:hover{filter:brightness(1.1)}#onl .ar .rc:active{transform:scale(.98)}
#onl .ar .rc.full{filter:grayscale(.5) brightness(.8);cursor:default}
#onl .ar .rc img{width:34px;height:34px;object-fit:contain;background:rgba(40,20,6,.45);border-radius:8px}
#onl .ar .rc .t{flex:1;min-width:0}#onl .ar .rc b{display:block;font:400 17px/1.1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#onl .ar .rc small{display:block;font-size:12px;color:#ffe3b0}
#onl .ar .rc .n{font:400 26px/1 var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:1.5px #4a1f06;paint-order:stroke fill}
#onl .ar .rc .n.f{color:#ff9a8a}
#onl .ar .lst{position:absolute;overflow-y:auto;padding:8px 10px;scrollbar-width:thin;scrollbar-color:#b07d45 transparent}
#onl .ar .lst .it{display:flex;justify-content:space-between;gap:6px;padding:3px 2px;font-size:14px;border-bottom:1px solid rgba(255,220,160,.12);cursor:pointer}
#onl .ar .lst .it span:last-child{color:#ffd34a;white-space:nowrap}
#onl .ar .lst .it.me span:first-child{color:#8fe0a0}
#onl .ar .hd{font:400 15px/1 var(--disp,sans-serif);color:#ffd34a;text-shadow:0 2px 0 #3a1c06;letter-spacing:.5px}
#onl .ar .face{position:absolute;display:flex;flex-direction:column;align-items:center;text-align:center}
#onl .ar .face img{width:130px;height:130px;object-fit:contain;filter:drop-shadow(0 6px 5px rgba(0,0,0,.6))}
#onl .ar .face b{font:400 18px/1.1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill}
#onl .ar .face small{color:#ffd34a;font-weight:700;font-size:14px}
#onl .ar .dd{position:absolute;width:170px;height:38px;background:url(${U('dropdown.png')}) 0 0/100% 100%;display:flex;align-items:center;justify-content:center;gap:8px;font:400 15px/1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #5a2d08;paint-order:stroke fill;cursor:pointer;z-index:5}
#onl .ar .ddm{position:absolute;width:170px;z-index:6;padding:6px;background:url(${U('panel_dark.png')}) center/100% 100%;box-sizing:border-box}
#onl .ar .ddm div{padding:8px 10px;font:400 15px/1 var(--disp,sans-serif);cursor:pointer;border-radius:6px}#onl .ar .ddm div:hover{background:rgba(255,200,120,.2)}
#onl .ar .ibar2{position:absolute;display:flex;gap:6px;z-index:4}
#onl .ar .ibar2.g{flex-wrap:wrap;width:168px;gap:6px}#onl .ar .ibar2.g button{height:44px}
#onl .ar .rcg{position:absolute;display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;align-content:start;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#b07d45 transparent}
#onl .ar .rcg .rc{position:relative;width:auto;height:58px;flex:none}
#onl .ar .ibar2 button{border:0;background:none;padding:0;cursor:pointer;height:50px;transition:transform .1s,filter .1s}
#onl .ar .ibar2 button img{height:100%;display:block;filter:drop-shadow(0 3px 3px rgba(0,0,0,.55));pointer-events:none}
#onl .ar .ibar2 button:hover{transform:translateY(-3px) scale(1.07);filter:brightness(1.15)}
/* room */
#onl .ar .sl{position:absolute;width:212px;height:140px;background:url(${U('wood_light.png')}) padding-box;border:12px solid transparent;border-image:url(${U('slot.png')}) 24 / 12px stretch;background-clip:padding-box;box-sizing:border-box;padding:2px 2px 0;overflow:hidden}
#onl .ar .sl.closed{border:0;border-image:none;background:url(${U('slot_closed.png')}) 0 0/100% 100%;cursor:pointer}
#onl .ar .sl.mine{filter:drop-shadow(0 0 7px rgba(255,214,90,.9))}
#onl .ar .sl .pic{width:78px;height:78px;object-fit:contain;float:left;margin-right:6px;filter:drop-shadow(0 5px 4px rgba(0,0,0,.55))}
#onl .ar .sl .nm{font:400 17px/1.15 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#onl .ar .sl .lv{color:#ffd34a;font-weight:800;font-size:15px}
#onl .ar .sl .wp{position:absolute;left:4px;right:4px;bottom:4px;display:flex;align-items:center;gap:6px;font-size:13px;color:#ffe9c4;background:rgba(48,26,8,.55);border-radius:8px;padding:3px 6px;overflow:hidden;white-space:nowrap}
#onl .ar .sl .wp img{width:26px;height:26px;object-fit:contain}
#onl .ar .sl .host{position:absolute;right:4px;top:2px;font:400 12px/1 var(--disp,sans-serif);color:#ffd34a;text-shadow:0 2px 0 #3a1c06}
#onl .ar .sl .rdy{position:absolute;left:0;right:0;top:28px;text-align:center;font:400 34px/1 var(--disp,sans-serif);color:#7dff7a;text-shadow:0 3px 0 #0b3d0a,0 0 12px rgba(80,255,80,.7);transform:rotate(-8deg);pointer-events:none}
#onl .ar .sl .wait{display:flex;height:100%;align-items:center;justify-content:center;font:400 26px/1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1.5px #4a2208;paint-order:stroke fill;text-shadow:0 3px 0 #4a2208}
#onl .ar .mc{position:absolute;width:236px;box-sizing:border-box;padding:8px 10px;border-radius:12px;border:3px solid rgba(255,224,160,.35);background:rgba(36,18,4,.55);cursor:pointer;transition:transform .1s}
#onl .ar .mc.sel{border-color:#7dff7a;box-shadow:0 0 12px rgba(120,255,120,.55)}
#onl .ar .mc.sel2{border-color:#ffd34a;box-shadow:0 0 12px rgba(255,210,70,.55)}
#onl .ar .mc.dis{opacity:.5;cursor:default}
#onl .ar .mc h4{margin:0 0 4px;font:400 18px/1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill}
#onl .ar .mc p{margin:1px 0;font-size:12px;line-height:1.22;color:#ffe9c4}
#onl .ar .mc .no{color:#ff9a8a;font-weight:700}
#onl .ar .tile{position:absolute;width:98px;height:80px;border-radius:10px;background:rgba(36,18,4,.6);border:2px solid rgba(255,224,160,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-sizing:border-box;font-size:12px;color:#ffe9c4;text-align:center}
#onl .ar .tile img{width:40px;height:40px;object-fit:contain}
#onl .ar .tile b{color:#ffd34a;font-size:13px}
#onl .ar .buy{cursor:pointer}#onl .ar .buy:hover{filter:brightness(1.15)}
#onl .ar .pop2{position:absolute;left:-700px;right:-700px;top:-500px;bottom:-500px;z-index:20;background:rgba(10,5,0,.62);display:flex;align-items:center;justify-content:center}
#onl .ar .pop2 .pnl{width:400px;padding:6px 10px 10px;text-align:center}
#onl .ar .atabs{display:flex;gap:8px;justify-content:center;margin:2px 0 8px}
#onl .ar .atabs .atb{padding:7px 14px;border-radius:10px;font:400 15px/1 var(--disp,sans-serif);cursor:pointer;background:rgba(36,18,4,.55);border:2px solid rgba(255,224,160,.3)}#onl .ar .atabs .atb.on{border-color:#ffd34a;color:#ffd34a}
#onl .ar .iv{display:flex;align-items:center;gap:8px;padding:4px 6px;border-bottom:1px solid rgba(255,220,160,.12);text-align:left;font-size:14px}
#onl .ar .iv img{width:30px;height:30px;object-fit:contain}#onl .ar .iv .t{flex:1}#onl .ar .iv .t i{color:#ffd34a;font-style:normal;font-weight:700}
#onl .ar .cover{position:absolute;left:-700px;right:-700px;top:-500px;bottom:-500px;z-index:15;background:rgba(10,5,0,.78);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font:400 30px/1.1 var(--disp,sans-serif);color:#ffd34a;text-shadow:0 3px 0 #3a1c06;text-align:center}
#onl .ar .cover small{font:600 16px var(--body,sans-serif);color:#ffe9c4;text-shadow:none}
#onl .ar .spin{width:54px;height:54px;border-radius:50%;border:6px solid rgba(255,211,74,.25);border-top-color:#ffd34a;animation:arsp 1s linear infinite}@keyframes arsp{to{transform:rotate(360deg)}}
#onl .ar .vsrow{position:absolute;left:0;right:0;top:100px;display:flex;justify-content:center;align-items:center;gap:30px}
#onl .ar .vteam{display:flex;gap:10px}
#onl .ar .vc{width:120px;text-align:center}#onl .ar .vc img{width:112px;height:112px;object-fit:contain;filter:drop-shadow(0 6px 5px rgba(0,0,0,.6))}
#onl .ar .vc b{display:block;font:400 16px/1.1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#onl .ar .vc small{color:#ffd34a;font-weight:800}
#onl .ar .vs{font:400 90px/1 var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:4px #4a1f06;paint-order:stroke fill;text-shadow:0 6px 0 #4a1f06,0 0 24px rgba(255,160,40,.7)}
#onl .ar .invb{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:30;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:14px;background:rgba(36,18,4,.94);border:3px solid #ffd34a;box-shadow:0 6px 18px rgba(0,0,0,.6);font:600 15px var(--body,sans-serif);color:#fff2da;white-space:nowrap}
#onl .ar .invb .ab{position:static;width:80px;height:36px;flex:none}
#onl .ar .note{position:absolute;text-align:center;font:600 12.5px/1.3 var(--body,sans-serif);color:#ffe9c4}
`; document.head.append(s);
  }
  function fit() { const k = Math.min(innerWidth / 960, innerHeight / 540); el.style.setProperty('--k', k); K = k; }

  // ===================== small builders =====================
  const btn = (txt, x, y, w, hgt, fn, cls) => { const b = h('div', { class: 'ab ' + (cls || ''), style: `left:${x}px;top:${y}px;width:${w}px;height:${hgt}px` }, txt); if (!(cls || '').includes('off')) b.onclick = () => { C.beep(); fn(); }; else b.onclick = () => fn && fn(); return b; };
  const stage = (...kids) => { const st = h('div', { class: 'st' }, ...kids); return st; };
  const mount = (st, extra) => {   // draw a screen; keep what the player was typing in the chat box
    const old = el.querySelector('.chat input'), keep = old ? { v: old.value, f: document.activeElement === old, s: old.selectionStart } : null;
    el.replaceChildren(st, ...(extra || []));
    if (S.banner && !S.banner.dead) el.append(S.banner);
    if (keep) { const ni = el.querySelector('.chat input'); if (ni) { ni.value = keep.v; if (keep.f) { try { ni.focus(); ni.setSelectionRange(keep.s, keep.s); } catch (e) { } } } }
  };
  const rimg = r => C.robotImg(C.robots()[(r | 0) % nrobots()]);
  const chatBox = (x, y, w) => { const c = C.chatBox(); c.style.cssText = `--cw:${w}px;left:${x}px;bottom:auto;top:${y}px`; return c; };
  const iconBar = (x, y, ids, grid) => {
    const bar = h('div', { class: 'ibar2' + (grid ? ' g' : ''), style: `left:${x}px;top:${y}px` });
    for (const id of ids) {
      const b = h('button', { onclick: () => { C.beep(); iconAction(id); } }, h('img', { src: 'assets/online/i_' + id + '.webp', alt: id })); bar.append(b);
    }
    return bar;
  };
  function iconAction(id) {
    if (id === 'bag') {   // the bag is the Profile of YOUR ONLINE CHARACTER (online_v2.js switches the game to the online save)
      C.launch('profile', () => { C.reopenArena(); });
    } else if (id === 'friends') { if (C.friendsPop) C.friendsPop(); else invitePop(true); }
    else if (id === 'trophy' && C.hall) C.hall();
    else if (id === 'scroll' && C.openIcon) C.openIcon('scroll');   // same Quests screen as the scroll icon in the town
    else if (id === 'gear' && C.openIcon) C.openIcon('gear');   // Settings
    else if (id === 'mail' && C.openIcon) C.openIcon('mail');   // same Envelope as the town
    else C.toast({ scroll: 'Quests: coming next', gear: 'Settings: coming next', trophy: 'Rankings: coming next', mail: 'Mail: coming next' }[id] || 'Coming next');
  }

  // ===================== which screen? (decided by what the server says) =====================
  function onData(j) {
    S.online = j.online || []; S.rooms = j.rooms || []; S.myRoom = j.myRoom || null; S.invites = j.invites || [];
    if (!el || !el.isConnected || C.root.hidden) return;   // arena not on screen (for example the Bag is open): just keep the data
    route();
  }
  function route() {
    const r = S.myRoom; invites();
    if (!r) {
      if (S.view === 'room' || S.view === 'search') C.toast('You left the room.');
      if (S.view !== 'lobby') return lobby();
      return repaint();
    }
    if (r.state === 'searching') { if (S.view !== 'search') search(); return; }
    if (r.state === 'vs' && r.match && S.seenMatch !== r.match.id) { S.seenMatch = r.match.id; vs(r); return; }
    if (S.view === 'vs') return;                 // stay on the VS screen until the player taps Back
    if (S.view !== 'room') return room();
    repaint();
  }
  const sigOf = () => {
    const r = S.myRoom, mem = m => [m.id, m.lv, m.ready ? 1 : 0, m.host ? 1 : 0, m.robot, m.weapon && m.weapon.name].join(':');
    if (S.view === 'lobby') return JSON.stringify([S.mode, S.online.map(o => o.id + ':' + o.lv), S.rooms.filter(x => x.mode === S.mode).slice(0, 8).map(x => [x.id, x.state, x.slots, x.members.map(mem)])]);
    if (S.view === 'room' && r) return JSON.stringify([r.id, r.slots, r.mode, r.state, r.hostId, r.members.map(mem)]);
    return '';
  };
  function repaint() { const s = sigOf(); if (s && s !== S.sig) { if (S.view === 'lobby') lobby(); else if (S.view === 'room') room(); } }
  function invites() {   // a banner when another player invites me
    if (S.view !== 'lobby' && S.view !== 'room') return;
    for (const iv of S.invites) {
      const key = iv.from.id + ':' + iv.at; if (S.invSeen.has(key)) continue; S.invSeen.add(key);
      if (S.banner) S.banner.remove();
      const b = h('div', { class: 'invb' }, h('span', null, iv.from.name + ' invites you to Room ' + iv.room),
        h('div', { class: 'ab sm', onclick: async () => { C.beep(); b.dead = true; b.remove(); if (await act('join', { room: iv.room })) room(); } }, 'Join'),
        h('div', { class: 'ab sm off', onclick: () => { b.dead = true; b.remove(); } }, 'No'));
      S.banner = b; el.append(b); later(() => { b.dead = true; b.remove(); }, 20000);
    }
  }

  // ===================== LOBBY =====================
  function lobby() {
    S.view = 'lobby'; const p = myMember();
    const rooms = S.rooms.filter(r => r.mode === S.mode), others = S.online.filter(o => o.id !== p.id);
    const st = stage(
      h('div', { class: 'ttl' }, 'Arena'),
      btn('Back', 14, 12, 92, 40, async () => { close(); C.back(); }, 'sm'),
      // left: me + online players
      h('div', { class: 'abs pnl', style: 'left:10px;top:96px;width:232px;height:212px' }),
      h('div', { class: 'face', style: 'left:10px;top:100px;width:232px' }, rimg(p.robot), h('b', null, p.name), h('small', null, 'Lv ' + p.lv)),
      h('div', { class: 'abs pnl', style: 'left:246px;top:92px;width:700px;height:168px' }),
      h('div', { class: 'abs ins', style: 'left:10px;top:314px;width:232px;height:218px' }),
      h('div', { class: 'abs hd', style: 'left:26px;top:324px' }, 'ONLINE PLAYERS  (' + (others.length + 1) + ')'),
      (() => { const l = h('div', { class: 'lst', style: 'left:22px;top:344px;width:210px;height:182px' }); l.append(h('div', { class: 'it me' }, h('span', null, p.name), h('span', null, 'Lv ' + p.lv))); for (const o of others) l.append(h('div', { class: 'it', onclick: () => C.toast(o.name + '  |  Lv ' + o.lv) }, h('span', null, o.name), h('span', null, 'Lv ' + o.lv))); return l; })()
    );
    // room grid (2 columns x 4 rows)
    const shown = rooms.slice(0, 30), rgrid = h('div', { class: 'rcg', style: 'left:260px;top:108px;width:672px;height:134px' });
    shown.forEach((r, i) => {
      const host = hostOf(r), n = r.members.length, fighting = r.state !== 'room', full = n >= r.slots || fighting;
      const card = h('div', { class: 'rc' + (full ? ' full' : ''), },
        rimg(host.robot), h('div', { class: 't' }, h('b', null, host.name + "'s room"), h('small', null, 'Room ' + r.id + '  |  ' + MODES[r.mode].name + (fighting ? '  |  Fighting' : full ? '  |  Full' : '  |  Tap to join'))),
        h('div', { class: 'n' + (full ? ' f' : '') }, n + '/' + r.slots));
      card.onclick = () => { C.beep(); joinRoom(r); }; rgrid.append(card);
    });
    st.append(rgrid);
    if (!shown.length) st.append(h('div', { class: 'abs', style: 'left:258px;top:156px;width:680px;text-align:center;font:400 22px var(--disp,sans-serif);color:#ffe3b0' }, 'No ' + MODES[S.mode].name + ' rooms yet. Tap Team Up to create one.'));
    // mode dropdown
    const dd = h('div', { class: 'dd', style: 'left:770px;top:62px' }, MODES[S.mode].name, h('span', null, '▾'));
    dd.onclick = () => {
      C.beep(); const old = st.querySelector('.ddm'); if (old) return old.remove();
      const m = h('div', { class: 'ddm', style: 'left:770px;top:102px' }, ['free', 'league'].map(k => h('div', { onclick: () => { C.beep(); S.mode = k; lobby(); } }, MODES[k].name))); st.append(m);
    };
    st.append(dd);
    st.append(chatBox(246, 268, 520));   // big chat: fills the empty space under the (short) room list
    st.append(btn('TEAM UP', 778, 272, 168, 44, teamUp, 'sm'), btn('SEARCH', 778, 320, 168, 44, () => { C.live.nudge(); C.toast('Rooms updated'); }, 'sm'), btn('START', 778, 368, 168, 56, quickStart, 'go'));
    st.append(iconBar(778, 432, ['bag', 'friends', 'scroll', 'trophy', 'mail', 'gear'], true));
    mount(st); S.sig = sigOf();
  }
  async function teamUp() { if (await act('create', { slots: 2, mode: S.mode })) room(); }
  async function quickStart() { if (!(await act('create', { slots: 1, mode: S.mode }))) return; if (await act('start')) route(); else room(); }   // route(): the server may have matched us at once (then it is the VS screen, not the search)
  async function joinRoom(r) {
    if (r.state !== 'room') return C.toast('That room is already fighting.');
    if (r.members.length >= r.slots) return C.toast('That room is full.');
    if (r.mode === 'league') return C.toast(me().league ? 'League Fight: only members of the same league can join.' : 'League Fight: you need to be in a league.');
    if (await act('join', { room: r.id })) room();
  }

  // ===================== ROOM =====================
  function amHost() { const r = S.myRoom; return !!(r && r.hostId === me().id); }
  function room() {
    S.view = 'room'; const r = S.myRoom; if (!r) return lobby();
    const host = amHost(), mm = r.members, mine = mm.find(amMember), busyRoom = r.state !== 'room';
    const st = stage(h('div', { class: 'ttl sm' }, 'Room ' + r.id), btn('Leave', 14, 12, 92, 40, async () => { await act('leave'); lobby(); }, 'sm'));
    // 4 slots (2 x 2)
    for (let i = 0; i < 4; i++) {
      const x = 12 + (i % 2) * 220, y = 70 + Math.floor(i / 2) * 146, m = mm[i];
      let slot;
      if (m) {
        slot = h('div', { class: 'sl' + (amMember(m) ? ' mine' : ''), style: `left:${x}px;top:${y}px` },
          rimg(m.robot).cloneNode(), h('div', { class: 'nm' }, m.name), h('div', { class: 'lv' }, 'Lv ' + m.lv + (m.host ? '  \u2605 HOST' : '')),
          h('div', { class: 'wp' }, m.weapon && m.weapon.img ? h('img', { src: m.weapon.img, alt: '' }) : null, h('span', null, m.weapon ? m.weapon.name : '')),
          m.ready && !m.host ? h('div', { class: 'rdy' }, 'READY') : null);
        slot.querySelector('img').className = 'pic';
      } else if (i < r.slots) {
        slot = h('div', { class: 'sl', style: `left:${x}px;top:${y}px` }, h('div', { class: 'wait' }, 'Waiting'));
        if (host && i > 0 && !busyRoom) slot.style.cursor = 'pointer', slot.onclick = () => { C.beep(); act('config', { slots: Math.max(mm.length, i) }); };   // tap an open slot again to close it
      } else {
        slot = h('div', { class: 'sl closed', style: `left:${x}px;top:${y}px` });
        if (host && !busyRoom) slot.onclick = () => { C.beep(); act('config', { slots: i + 1 }); };   // the host taps a closed slot to open it
      }
      st.append(slot);
    }
    // mode
    const canLeague = !!me().league && mm.every(m => m.league === me().league);
    const fm = h('div', { class: 'mc ' + (r.mode === 'free' ? 'sel' : ''), style: 'left:462px;top:70px' }, h('h4', null, 'Free Fight'), MODES.free.lines.map(t => h('p', null, t)));
    const lm = h('div', { class: 'mc ' + (r.mode === 'league' ? 'sel2' : '') + (canLeague ? '' : ' dis'), style: 'left:462px;top:190px' }, h('h4', null, 'League Fight'), MODES.league.lines.map(t => h('p', null, t)), canLeague ? null : h('p', { class: 'no' }, me().league ? 'Everyone in the room must be from your league.' : 'You need to be in a league.'));
    if (host) {
      fm.onclick = () => { C.beep(); act('config', { mode: 'free' }); };
      lm.onclick = () => { if (!canLeague) return C.toast(me().league ? 'Everyone in the room must be from your league.' : 'League Fight needs a league. Join or create one first.'); C.beep(); act('config', { mode: 'league' }); };
    } else { fm.style.cursor = lm.style.cursor = 'default'; }
    st.append(fm, lm);
    st.append(h('div', { class: 'abs pnl', style: 'left:462px;top:352px;width:236px;height:44px;display:flex;align-items:center;justify-content:center;font:400 17px var(--disp,sans-serif);color:#ffd34a;border-width:12px;border-image-width:12px' }, 'Map: Random'));
    // right: slogan, my items, item shop
    st.append(h('div', { class: 'abs', style: 'left:716px;top:8px;width:236px;text-align:center;font:400 22px var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:1.5px #4a1f06;paint-order:stroke fill' }, 'Room ' + r.id),
      h('div', { class: 'abs', style: 'left:716px;top:38px;width:236px;text-align:center;font:600 12px var(--body,sans-serif);color:#ffe9c4' }, 'Team work, limitless fun!'));
    st.append(h('div', { class: 'abs pnl', style: 'left:712px;top:62px;width:240px;height:232px;border-width:12px;border-image-width:12px' }));
    st.append(h('div', { class: 'abs hd', style: 'left:730px;top:72px' }, 'MY ITEMS'), h('div', { class: 'abs hd', style: 'left:730px;top:172px' }, 'ITEM SHOP'));
    const pots = POTION_ITEMS;   // Heal + Team Heal only (from the game's own item list; these are the items of YOUR ONLINE character)
    pots.forEach((it, i) => {
      const own = Profile.stockOf(it.id);
      st.append(h('div', { class: 'tile', style: `left:${728 + i * 108}px;top:90px` }, h('img', { src: it.img, alt: '' }), h('span', null, it.name), h('b', null, 'x' + own + '/' + POTION_MAX)));
      const buy = h('div', { class: 'tile buy', style: `left:${728 + i * 108}px;top:192px;height:92px` }, h('img', { src: it.img, alt: '' }), h('span', null, it.name), h('b', null, itemPrice(it).toLocaleString() + ' chips'), h('span', { style: 'color:#7dff7a;font-weight:800' }, own >= POTION_MAX ? 'MAX' : 'BUY'));
      buy.onclick = () => {
        if (Profile.stockOf(it.id) >= POTION_MAX) { try { Snd.play('dud'); } catch (e) { } return C.toast('You already carry ' + POTION_MAX + ' ' + it.name + '.'); }
        if (!Wallet.spend(itemPrice(it))) { try { Snd.play('dud'); } catch (e) { } return C.toast('Not enough chips.'); }
        Profile.addStock(it.id, 1); try { Snd.play('win'); } catch (e) { } room();
      }; st.append(buy);
    });
    st.append(h('div', { class: 'abs', style: 'left:716px;top:298px;width:236px;text-align:center;font:700 13px var(--body,sans-serif);color:#ffd34a' }, 'Chips: ' + Wallet.get().toLocaleString()));
    // chat + buttons + icons
    st.append(chatBox(12, 366, 340));
    st.append(btn('INVITE', 716, 322, 112, 54, () => invitePop(false)));
    if (host) st.append(btn('START', 836, 316, 118, 62, async () => {
      if (busyRoom) return C.toast('Wait until the other players leave the VS screen.');
      if (mm.some(m => !m.host && !m.ready)) return C.toast('Everyone must press Ready first.');
      if (await act('start')) route();   // searching -> search screen, already matched -> VS screen
    }, busyRoom ? 'go off' : 'go'));
    else st.append(btn(mine && mine.ready ? 'CANCEL' : 'READY', 836, 316, 118, 62, () => { if (busyRoom) return C.toast('Wait until the other players leave the VS screen.'); act('ready', { ready: !(mine && mine.ready) }); }, mine && mine.ready ? '' : 'rd'));
    st.append(iconBar(716, 392, ['bag', 'friends', 'scroll', 'gear']));
    const hostName = hostOf(r).name;
    st.append(h('div', { class: 'note', style: 'left:372px;top:410px;width:330px' }, busyRoom ? 'The last fight of this room is still on the VS screen of some players.' : host ? (mm.length > 1 ? 'Waiting for your team to press READY. START finds a team of ' + mm.length + ' to fight.' : 'START finds a real opponent for your ' + mm.length + ' player' + (mm.length > 1 ? 's' : '') + '.') : 'Press READY. ' + hostName + ' starts the search.'));
    mount(st); S.sig = sigOf();
  }

  // ===================== INVITE (Friend list | World) =====================
  function invitePop(onlyFriends) {
    const stg = el.querySelector('.st'); let tab = onlyFriends ? 'friends' : 'world', pop = null;
    const draw = () => {
      if (pop) pop.remove();
      const r = S.myRoom, p = me(), list = tab === 'friends' ? ((C.friends && C.friends()) || []) : S.online.filter(o => o.id !== p.id);
      const rows = list.map(o => {
        const inRoom = r && r.members.some(m => m.id === o.id), live = S.online.some(x => x.id === o.id), can = live && r && r.state === 'room' && r.members.length < r.slots && !inRoom;
        const act2 = can ? h('div', { class: 'ab sm', style: 'position:static;width:74px;height:32px;flex:none', onclick: async () => { C.beep(); if (await act('invite', { to: o.id })) C.toast('Invitation sent to ' + o.name); pop.remove(); } }, 'Invite') : h('small', null, !live ? 'Offline' : !r ? 'Create a room first' : inRoom ? 'In your room' : 'Room full');
        return h('div', { class: 'iv' }, rimg(o.robot).cloneNode(), h('div', { class: 't' }, h('b', null, o.name), h('i', null, live ? '  Lv ' + (o.lv || 1) : '')), act2);
      });
      const lst = h('div', { style: 'height:240px;overflow-y:auto' }, rows.length ? rows : h('p', null, tab === 'friends' ? 'No friends yet. Tap a player in World (two-person icon in town) and press Add Friend.' : 'Nobody else is online on this server.'));
      const tabs = h('div', { class: 'atabs' }, h('div', { class: 'atb' + (tab === 'friends' ? ' on' : ''), onclick: () => { tab = 'friends'; draw(); } }, 'Friend List'), h('div', { class: 'atb' + (tab === 'world' ? ' on' : ''), onclick: () => { tab = 'world'; draw(); } }, 'World'), h('div', { class: 'atb', onclick: () => pop.remove() }, 'X'));
      pop = h('div', { class: 'pop2' }, h('div', { class: 'pnl' }, tabs, lst));
      pop.onclick = e => { if (e.target === pop) pop.remove(); }; stg.append(pop);
    };
    draw();
  }

  // ===================== SEARCHING -> VS =====================
  function search() {
    const r = S.myRoom; if (!r) return lobby(); if (r.state !== 'searching') return route(); S.view = 'search'; const n = r.members.length, host = amHost();
    const t0 = Date.now(); clearTimers();
    const cover = h('div', { class: 'cover' }, h('div', { class: 'spin' }), h('div', null, 'Searching for an opponent'), h('small', { id: 'arSec' }, n + ' vs ' + n + '  |  ' + MODES[r.mode].name + '  |  0s'),
      btn(host ? 'Cancel' : 'Leave room', 0, 0, 150, 46, async () => { if (host) { if (await act('cancel')) { clearTimers(); room(); } } else { await act('leave'); lobby(); } }, ''));
    cover.lastChild.style.position = 'static';
    el.append(cover);
    const tick = setInterval(() => { const s = document.getElementById('arSec'); if (!s || S.view !== 'search') return clearInterval(tick); s.textContent = n + ' vs ' + n + '  |  ' + MODES[r.mode].name + '  |  ' + Math.floor((Date.now() - t0) / 1000) + 's'; }, 500);
  }
  function vs(r) {
    S.view = 'vs'; clearTimers(); const m = r.match, p = me();
    const mineIdx = Math.max(0, m.teams.findIndex(t => t.some(x => x.id === p.id))), mine = m.teams[mineIdx], foe = m.teams[1 - mineIdx] || [];
    const map = (typeof ARENA_MAPS !== 'undefined' && ARENA_MAPS.length) ? ARENA_MAPS[m.mapSeed % ARENA_MAPS.length] : { name: 'Random map' };
    const card = x => h('div', { class: 'vc' }, rimg(x.robot).cloneNode(), h('b', null, x.name), h('small', null, 'Lv ' + x.lv));
    let ctl = null;
    const st = stage(h('div', { class: 'ttl sm' }, MODES[r.mode].name),
      h('div', { class: 'vsrow' }, h('div', { class: 'vteam' }, mine.map(card)), h('div', { class: 'vs' }, 'VS'), h('div', { class: 'vteam' }, foe.map(card))),
      h('div', { class: 'abs', style: 'left:0;right:0;top:300px;text-align:center;font:400 26px var(--disp,sans-serif);color:#ffd34a;text-shadow:0 3px 0 #3a1c06' }, 'Map: ' + map.name),
      h('div', { class: 'abs', style: 'left:180px;width:600px;top:352px;text-align:center;font:600 16px/1.35 var(--body,sans-serif);color:#ffe9c4' }, h('span', { class: 'spin', style: 'display:inline-block;width:18px;height:18px;border-width:3px;vertical-align:-3px;margin-right:8px' }), h('span', { id: 'arStat' }, 'Loading the battlefield...')),
      btn('Leave', 380, 430, 200, 58, () => { if (ctl && ctl.abort) ctl.abort(); }, 'sm'));
    mount(st);
    runFight(r, map, c => { ctl = c; });
  }
  async function runFight(r, map, onCtl) {
    const stat = t => { const e = document.getElementById('arStat'); if (e) e.textContent = t; };
    let res = null;
    try { res = await C.fight(r.match, { map, minShowMs: 3200, onStatus: stat, onControl: onCtl }); }
    catch (e) { C.toast('Could not start the fight' + (e && e.message ? ': ' + e.message : '.')); }
    try { if (res && (res.win === true || res.win === false || res.draw) && !res.forfeit && C.quest) C.quest('arena', { mode: r.mode === 'league' ? 'league' : 'free', win: res.win === true }); } catch (e) { }   // QUESTS: a finished fight (win or lose) counts; leaving the fight does not
    // the fight is over (or could not start): tell the server we left the VS / fight screen, then show the room again
    S.view = null; S.sig = '';
    if (!el || !el.isConnected) return;
    C.root.hidden = false;
    await act('back'); route();
    if (S.view === null) { if (S.myRoom) room(); else lobby(); }
  }

  // ===================== open / close =====================
  function open(ctx) {
    C = ctx; css(); clearTimers(); S.view = null; S.sig = '';
    el = h('div', { class: 'ar' }); C.root.replaceChildren(el); fit();
    onResize = () => fit(); addEventListener('resize', onResize);
    if (unsub) unsub(); unsub = C.live.subscribe(onData);
    S.online = (C.live.last && C.live.last.online) || S.online; S.myRoom = C.live.last ? C.live.last.myRoom : S.myRoom;
    route();
  }
  function close() { removeEventListener('resize', onResize); clearTimers(); if (unsub) { unsub(); unsub = null; } if (S.banner) { S.banner.dead = true; S.banner.remove(); } }
  return { open, close };
})();
