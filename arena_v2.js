/* ARENA (client) - downloaded from GitHub by online_v2.js when the player taps the Arena building, together with arena_maps.js.
   Screens: LOBBY (room list, online players, chat, Team Up / Search / Start)  ->  ROOM (4 slots, mode, items, Invite, Start / Ready)
            ->  SEARCHING  ->  VS.
   Pictures: assets/online/ui/*.png (wood + light brown border, 9-slice) - these live in the app.
   DATA: until the Render server has the /api/arena/* calls (see ARENA_API.md) every room, online player and opponent here is SAMPLE data
   (ARENA_USE_SERVER = false). All of it goes through the small `Net` object near the top, so the screens do not change when the server is added.
   RULES kept here: one character per player in every arena fight (not 3 like Adventure) - shown as ONE picture per slot.
   The fight itself (player vs player, turn sync) is NOT built yet: the VS screen is where the battle will start. */
'use strict';
const ARENA_USE_SERVER = false;
const ARENA_UI = 'assets/online/ui/';

const ArenaUI = (() => {
  let C = null;                       // helpers from online_v2.js: { root, player, h, beep, toast, robots, robotImg, chatBox, back, launch }
  let el = null, K = 1, onResize = null;
  const me = () => C.player;
  const h = (...a) => C.h(...a);
  const MODES = {
    free:   { name: 'Free Fight',   lines: ['No limitations.', 'Scenes are randomly selected.', 'You play against players on similar level.'] },
    league: { name: 'League Fight', lines: ['Your team can only be members of the same league.', 'Your league fights against other leagues.', 'Scenes are randomly selected.'] },
  };

  // ===================== data layer (sample data now, server later) =====================
  const NAMES = ['Shadowfox', 'BlazeKing', 'Nova', 'IronWolf', 'Ghost07', 'Mika', 'RedFalcon', 'Zeno', 'Luna', 'Tanker', 'Vex', 'Orion', 'Kaiser', 'Pixel', 'Draco', 'Echo', 'Storm', 'Rogue', 'Ember', 'Titan'];
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const nrobots = () => C.robots().length;
  const sampleWeapon = ridx => weaponOf(C.robots()[ridx % nrobots()].id);
  const person = (name) => { const r = rnd(nrobots()); return { name: name || pick(NAMES) + (rnd(90) + 10), lv: 1 + rnd(40), robot: r, weapon: sampleWeapon(r), ready: false, league: null }; };
  function weaponOf(rid) {   // the weapon this robot wears: { name, img }
    try {
      Profile.load(); const w = (Profile.eqOf(rid).weapon && itemById(Profile.eqOf(rid).weapon)) || weaponItemFor(rid);
      return w ? { name: w.name, img: Profile.imgOf(w) } : { name: 'Standard cannon', img: '' };
    } catch (e) { return { name: 'Standard cannon', img: '' }; }
  }
  const myMember = () => {
    const p = me(), r = C.robots()[p.robot] || C.robots()[0]; let lv = 1; try { Profile.load(); lv = Profile.level(); } catch (e) { }
    return { name: p.name, lv, robot: p.robot, weapon: weaponOf(r.id), ready: false, league: p.league || null, me: true };
  };
  let roomSeq = 20 + rnd(30);
  const S = { rooms: [], online: [], myRoom: null, mode: 'free', timers: [] };   // S.myRoom = the room I am in (or null)
  const later = (fn, ms) => { const t = setTimeout(fn, ms); S.timers.push(t); return t; };
  const clearTimers = () => { S.timers.forEach(clearTimeout); S.timers = []; };

  const Net = {
    seed() {
      S.online = Array.from({ length: 14 }, () => person());
      S.rooms = Array.from({ length: 5 }, () => this.sampleRoom());
    },
    sampleRoom() {
      const slots = 1 + rnd(4), host = person(), members = [host]; host.host = true;
      for (let i = 1; i < slots && rnd(3); i++) members.push(person());
      return { id: ++roomSeq, mode: rnd(4) ? 'free' : 'league', slots, members, sample: true, league: null };
    },
    refresh() {   // the SEARCH button
      S.rooms = S.rooms.filter(r => r.members.length < r.slots || rnd(2)); while (S.rooms.length < 6) S.rooms.push(this.sampleRoom());
      if (S.rooms.length > 8) S.rooms.length = 8;
    },
    createRoom(slots, mode) {
      const m = myMember(); m.host = true; S.myRoom = { id: ++roomSeq, mode, slots, members: [m], mine: true, league: null }; S.rooms.unshift(S.myRoom); return S.myRoom;
    },
    join(room) { const m = myMember(); room.members.push(m); S.myRoom = room; return room; },
    leave() { const r = S.myRoom; if (!r) return; r.members = r.members.filter(m => !m.me); if (r.mine || !r.members.length) S.rooms = S.rooms.filter(x => x !== r); S.myRoom = null; clearTimers(); },
  };

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
`; document.head.append(s);
  }
  function fit() { const k = Math.min(innerWidth / 960, innerHeight / 540); el.style.setProperty('--k', k); K = k; }

  // ===================== small builders =====================
  const btn = (txt, x, y, w, hgt, fn, cls) => { const b = h('div', { class: 'ab ' + (cls || ''), style: `left:${x}px;top:${y}px;width:${w}px;height:${hgt}px` }, txt); if (!(cls || '').includes('off')) b.onclick = () => { C.beep(); fn(); }; else b.onclick = () => fn && fn(); return b; };
  const stage = (...kids) => { const st = h('div', { class: 'st' }, ...kids); return st; };
  const mount = (st, extra) => { clearTimeout(mount.t); el.replaceChildren(st, ...(extra || [])); };
  const rimg = r => C.robotImg(C.robots()[r % nrobots()]);
  const chatBox = (x, y, w) => { const c = C.chatBox(); c.style.cssText = `--cw:${w}px;left:${x}px;bottom:auto;top:${y}px`; return c; };
  const iconBar = (x, y, ids) => {
    const bar = h('div', { class: 'ibar2', style: `left:${x}px;top:${y}px` });
    for (const id of ids) {
      const b = h('button', { onclick: () => { C.beep(); iconAction(id); } }, h('img', { src: 'assets/online/i_' + id + '.webp', alt: id })); bar.append(b);
    }
    return bar;
  };
  function iconAction(id) {
    if (id === 'bag') {   // the bag is the Profile
      C.launch('profile', () => { C.reopenArena(); });
    } else if (id === 'friends') invitePop(true);
    else C.toast({ scroll: 'Quests: coming next', gear: 'Settings: coming next', trophy: 'Rankings: coming next', mail: 'Mail: coming next' }[id] || 'Coming next');
  }

  // ===================== LOBBY =====================
  function lobby() {
    S.view = 'lobby'; const p = myMember();
    const rooms = S.rooms.filter(r => r.mode === S.mode);
    const st = stage(
      h('div', { class: 'ttl' }, 'Arena'),
      btn('Back', 14, 12, 92, 40, () => { Net.leave(); close(); C.back(); }, 'sm'),
      // left: me + online players
      h('div', { class: 'abs pnl', style: 'left:10px;top:96px;width:232px;height:212px' }),
      h('div', { class: 'face', style: 'left:10px;top:100px;width:232px' }, rimg(p.robot), h('b', null, p.name), h('small', null, 'Lv ' + p.lv)),
      h('div', { class: 'abs pnl', style: 'left:246px;top:92px;width:700px;height:268px' }),
      h('div', { class: 'abs ins', style: 'left:10px;top:314px;width:232px;height:218px' }),
      h('div', { class: 'abs hd', style: 'left:26px;top:324px' }, 'ONLINE PLAYERS  (' + (S.online.length + 1) + ')'),
      (() => { const l = h('div', { class: 'lst', style: 'left:22px;top:344px;width:210px;height:182px' }); l.append(h('div', { class: 'it me' }, h('span', null, p.name), h('span', null, 'Lv ' + p.lv))); for (const o of S.online) l.append(h('div', { class: 'it', onclick: () => C.toast(o.name + '  |  Lv ' + o.lv) }, h('span', null, o.name), h('span', null, 'Lv ' + o.lv))); return l; })()
    );
    // room grid (2 columns x 4 rows)
    const shown = rooms.slice(0, 8);
    shown.forEach((r, i) => {
      const host = r.members[0], n = r.members.length, full = n >= r.slots;
      const card = h('div', { class: 'rc' + (full ? ' full' : ''), style: `left:${258 + (i % 2) * 340}px;top:${106 + Math.floor(i / 2) * 62}px` },
        rimg(host.robot), h('div', { class: 't' }, h('b', null, host.name + "'s room"), h('small', null, 'Room ' + r.id + '  |  ' + MODES[r.mode].name + (full ? '  |  Full' : '  |  Tap to join'))),
        h('div', { class: 'n' + (full ? ' f' : '') }, n + '/' + r.slots));
      card.onclick = () => { C.beep(); joinRoom(r); }; st.append(card);
    });
    if (!shown.length) st.append(h('div', { class: 'abs', style: 'left:258px;top:200px;width:680px;text-align:center;font:400 22px var(--disp,sans-serif);color:#ffe3b0' }, 'No ' + MODES[S.mode].name + ' rooms yet. Tap Team Up to create one.'));
    // mode dropdown
    const dd = h('div', { class: 'dd', style: 'left:770px;top:62px' }, MODES[S.mode].name, h('span', null, '▾'));
    dd.onclick = () => {
      C.beep(); const old = st.querySelector('.ddm'); if (old) return old.remove();
      const m = h('div', { class: 'ddm', style: 'left:770px;top:102px' }, ['free', 'league'].map(k => h('div', { onclick: () => { C.beep(); S.mode = k; lobby(); } }, MODES[k].name))); st.append(m);
    };
    st.append(dd);
    st.append(chatBox(246, 366, 336));
    st.append(btn('TEAM UP', 600, 384, 108, 56, teamUp, 'sm'), btn('SEARCH', 716, 384, 108, 56, () => { Net.refresh(); C.toast('Rooms updated'); lobby(); }, 'sm'), btn('START', 832, 380, 114, 62, quickStart, 'go'));
    st.append(iconBar(612, 460, ['bag', 'friends', 'scroll', 'trophy', 'mail', 'gear']));
    mount(st);
  }
  function teamUp() { Net.createRoom(2, S.mode); room(); }
  function quickStart() { Net.createRoom(1, S.mode); room(); later(() => search(), 150); }
  function joinRoom(r) {
    if (r.members.length >= r.slots) return C.toast('That room is full.');
    if (r.mode === 'league' && (!me().league || me().league !== r.members[0].league)) return C.toast(me().league ? 'League Fight: only members of the same league can join.' : 'League Fight: you need to be in a league.');
    Net.join(r); room();
    // sample host: starts the search a moment after you press Ready
  }

  // ===================== ROOM =====================
  function amHost() { const r = S.myRoom; return !!(r && r.members[0] && r.members[0].me); }
  function room() {
    S.view = 'room'; const r = S.myRoom; if (!r) return lobby();
    const host = amHost(), mm = r.members, mine = mm.find(m => m.me);
    const st = stage(h('div', { class: 'ttl sm' }, 'Room ' + r.id), btn('Leave', 14, 12, 92, 40, () => { Net.leave(); lobby(); }, 'sm'));
    // 4 slots (2 x 2)
    for (let i = 0; i < 4; i++) {
      const x = 12 + (i % 2) * 220, y = 70 + Math.floor(i / 2) * 146, m = mm[i];
      let slot;
      if (m) {
        slot = h('div', { class: 'sl' + (m.me ? ' mine' : ''), style: `left:${x}px;top:${y}px` },
          rimg(m.robot).cloneNode(), h('div', { class: 'nm' }, m.name), h('div', { class: 'lv' }, 'Lv ' + m.lv + (m.host ? '  \u2605 HOST' : '')),
          h('div', { class: 'wp' }, m.weapon.img ? h('img', { src: m.weapon.img, alt: '' }) : null, h('span', null, m.weapon.name)),
          m.ready && !m.host ? h('div', { class: 'rdy' }, 'READY') : null);
        slot.querySelector('img').className = 'pic';
      } else if (i < r.slots) {
        slot = h('div', { class: 'sl', style: `left:${x}px;top:${y}px` }, h('div', { class: 'wait' }, 'Waiting'));
        if (host && i > 0) slot.style.cursor = 'pointer', slot.onclick = () => { C.beep(); r.slots = Math.max(r.members.length, i); room(); };   // tap an open slot again to close it
      } else {
        slot = h('div', { class: 'sl closed', style: `left:${x}px;top:${y}px` });
        if (host) slot.onclick = () => { C.beep(); r.slots = i + 1; room(); };   // the host taps a closed slot to open it
      }
      st.append(slot);
    }
    // mode
    const canLeague = !!me().league && mm.every(m => m.league === me().league);
    const fm = h('div', { class: 'mc ' + (r.mode === 'free' ? 'sel' : ''), style: 'left:462px;top:70px' }, h('h4', null, 'Free Fight'), MODES.free.lines.map(t => h('p', null, t)));
    const lm = h('div', { class: 'mc ' + (r.mode === 'league' ? 'sel2' : '') + (canLeague ? '' : ' dis'), style: 'left:462px;top:190px' }, h('h4', null, 'League Fight'), MODES.league.lines.map(t => h('p', null, t)), canLeague ? null : h('p', { class: 'no' }, me().league ? 'Everyone in the room must be from your league.' : 'You need to be in a league.'));
    if (host) {
      fm.onclick = () => { C.beep(); r.mode = 'free'; room(); };
      lm.onclick = () => { if (!canLeague) return C.toast(me().league ? 'Everyone in the room must be from your league.' : 'League Fight needs a league. Join or create one first.'); C.beep(); r.mode = 'league'; room(); };
    } else { fm.style.cursor = lm.style.cursor = 'default'; }
    st.append(fm, lm);
    st.append(h('div', { class: 'abs pnl', style: 'left:462px;top:352px;width:236px;height:44px;display:flex;align-items:center;justify-content:center;font:400 17px var(--disp,sans-serif);color:#ffd34a;border-width:12px;border-image-width:12px' }, 'Map: Random'));
    // right: slogan, my items, item shop
    st.append(h('div', { class: 'abs', style: 'left:716px;top:8px;width:236px;text-align:center;font:400 22px var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:1.5px #4a1f06;paint-order:stroke fill' }, 'Room ' + r.id),
      h('div', { class: 'abs', style: 'left:716px;top:38px;width:236px;text-align:center;font:600 12px var(--body,sans-serif);color:#ffe9c4' }, 'Team work, limitless fun!'));
    st.append(h('div', { class: 'abs pnl', style: 'left:712px;top:62px;width:240px;height:232px;border-width:12px;border-image-width:12px' }));
    st.append(h('div', { class: 'abs hd', style: 'left:730px;top:72px' }, 'MY ITEMS'), h('div', { class: 'abs hd', style: 'left:730px;top:172px' }, 'ITEM SHOP'));
    const pots = POTION_ITEMS;   // Heal + Team Heal only (from the offline game's own item list)
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
    if (host) st.append(btn('START', 836, 316, 118, 62, () => { if (mm.some(m => !m.host && !m.ready)) return C.toast('Everyone must press Ready first.'); search(); }, 'go'));
    else st.append(btn(mine && mine.ready ? 'CANCEL' : 'READY', 836, 316, 118, 62, () => { mine.ready = !mine.ready; room(); if (mine.ready) later(() => { if (S.view === 'room' && S.myRoom === r) search(); }, 1600); }, mine && mine.ready ? '' : 'rd'));
    st.append(iconBar(716, 392, ['bag', 'friends', 'scroll', 'gear']));
    st.append(h('div', { class: 'abs', style: 'left:372px;top:410px;width:330px;font:600 12.5px/1.3 var(--body,sans-serif);color:#ffe9c4;text-align:center' }, host ? (mm.length > 1 ? 'Waiting for your team to press READY. START finds a team of ' + mm.length + ' to fight.' : 'START finds an opponent for your ' + mm.length + ' player' + (mm.length > 1 ? 's' : '') + '.') : 'Press READY. ' + mm[0].name + ' starts the search.'));
    mount(st);
  }

  // ===================== INVITE (Friend list | World) =====================
  function invitePop(onlyFriends) {
    const stg = el.querySelector('.st'); let tab = onlyFriends ? 'friends' : 'world', pop = null;
    const sendInvite = (o, r) => {
      C.toast('Invitation sent to ' + o.name); if (ARENA_USE_SERVER) return;
      later(() => {   // SAMPLE: the invited player joins, then presses Ready
        if (S.myRoom !== r || r.members.length >= r.slots) return;
        const m = Object.assign({}, o, { ready: false, host: false }); r.members.push(m);
        later(() => { m.ready = true; if (S.view === 'room') room(); }, 1500); if (S.view === 'room') room();
      }, 1200);
    };
    const draw = () => {
      if (pop) pop.remove();
      const r = S.myRoom, list = tab === 'friends' ? S.online.slice(0, 4) : S.online;
      const rows = list.map(o => {
        const can = r && r.members.length < r.slots && !r.members.some(m => m.name === o.name);
        const act = can ? h('div', { class: 'ab sm', style: 'position:static;width:74px;height:32px;flex:none', onclick: () => { C.beep(); sendInvite(o, r); pop.remove(); } }, 'Invite') : h('small', null, r ? 'Room full' : 'Create a room first');
        return h('div', { class: 'iv' }, rimg(o.robot).cloneNode(), h('div', { class: 't' }, h('b', null, o.name), h('i', null, '  Lv ' + o.lv)), act);
      });
      const lst = h('div', { style: 'height:240px;overflow-y:auto' }, rows.length ? rows : h('p', null, tab === 'friends' ? 'No friends yet.' : 'Nobody online.'));
      const tabs = h('div', { class: 'atabs' }, h('div', { class: 'atb' + (tab === 'friends' ? ' on' : ''), onclick: () => { tab = 'friends'; draw(); } }, 'Friend List'), h('div', { class: 'atb' + (tab === 'world' ? ' on' : ''), onclick: () => { tab = 'world'; draw(); } }, 'World'), h('div', { class: 'atb', onclick: () => pop.remove() }, 'X'));
      pop = h('div', { class: 'pop2' }, h('div', { class: 'pnl' }, tabs, lst));
      pop.onclick = e => { if (e.target === pop) pop.remove(); }; stg.append(pop);
    };
    draw();
  }

  // ===================== SEARCHING -> VS =====================
  function search() {
    const r = S.myRoom; if (!r) return; S.view = 'search'; const n = r.members.length;
    const t0 = Date.now(); let cancelled = false;
    const cover = h('div', { class: 'cover' }, h('div', { class: 'spin' }), h('div', null, 'Searching for an opponent'), h('small', { id: 'arSec' }, n + ' vs ' + n + '  |  ' + MODES[r.mode].name + '  |  0s'),
      btn('Cancel', 0, 0, 130, 46, () => { cancelled = true; clearTimers(); cover.remove(); S.view = 'room'; }, ''));
    cover.lastChild.style.position = 'static';
    el.append(cover);
    const tick = setInterval(() => { const s = document.getElementById('arSec'); if (!s) return clearInterval(tick); s.textContent = n + ' vs ' + n + '  |  ' + MODES[r.mode].name + '  |  ' + Math.floor((Date.now() - t0) / 1000) + 's'; }, 500);
    later(() => { clearInterval(tick); if (!cancelled && S.myRoom === r) vs(r); }, 3200);   // SAMPLE: the server will answer when another waiting team of the same size is found
  }
  function vs(r) {
    S.view = 'vs'; const n = r.members.length, foe = Array.from({ length: n }, () => person()), map = arenaRandomMap();
    const card = m => h('div', { class: 'vc' }, rimg(m.robot).cloneNode(), h('b', null, m.name), h('small', null, 'Lv ' + m.lv));
    const st = stage(h('div', { class: 'ttl sm' }, MODES[r.mode].name),
      h('div', { class: 'vsrow' }, h('div', { class: 'vteam' }, r.members.map(card)), h('div', { class: 'vs' }, 'VS'), h('div', { class: 'vteam' }, foe.map(card))),
      h('div', { class: 'abs', style: 'left:0;right:0;top:300px;text-align:center;font:400 26px var(--disp,sans-serif);color:#ffd34a;text-shadow:0 3px 0 #3a1c06' }, 'Map: ' + map.name),
      h('div', { class: 'abs', style: 'left:180px;width:600px;top:352px;text-align:center;font:600 15px/1.35 var(--body,sans-serif);color:#ffe9c4' }, 'The fight starts here. Player vs player battles come next: they need the server to keep both teams in sync.'),
      btn('Back to room', 380, 430, 200, 58, () => { room(); }, ''));
    mount(st);
  }

  // ===================== open / close =====================
  function open(ctx) {
    C = ctx; css(); clearTimers(); if (!S.rooms.length) Net.seed();
    el = h('div', { class: 'ar' }); C.root.replaceChildren(el); fit();
    onResize = () => fit(); addEventListener('resize', onResize);
    if (S.myRoom && S.view !== 'lobby') room(); else lobby();
  }
  function close() { removeEventListener('resize', onResize); clearTimers(); }
  return { open, close };
})();
