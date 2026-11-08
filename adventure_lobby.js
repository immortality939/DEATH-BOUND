'use strict';
const AV_UI = 'assets/online/ui/';

const AdvLobbyUI = (() => {
  let C = null;                       // helpers from online_v2.js (same ones the Arena gets) + reopenAdv
  let el = null, K = 1, onResize = null, unsub = null;
  const me = () => C.player;
  const h = (...a) => C.h(...a);
  const DIFFS = [{ n: 'NORMAL', c: '#5be37a' }, { n: 'HARD', c: '#ffb23c' }, { n: 'HEROIC', c: '#ff4a4a' }];
  const SLOTS = 4;
  const S = { rooms: [], online: [], my: null, invites: [], view: null, sig: '', banner: null };
  const nrobots = () => C.robots().length;
  const myMember = () => { const p = me(), i = C.info() || {}; return { id: p.id, name: p.name, lv: i.lv || 1, power: myPower(), robot: p.robot, weapon: i.weapon || { name: 'Standard cannon', img: '' } }; };
  const amMember = m => m && m.id === me().id;
  const hostOf = r => r.members.find(m => m.host) || r.members[0];
  const amHost = () => !!(S.my && S.my.hostId === me().id);
  async function act(path, body) {   // ask the server; the answer is the new state of everything
    try { return await C.live.call('adv/' + path, body); }
    catch (e) { C.toast(e && e.message ? e.message : 'Server error'); try { C.live.nudge(); } catch (x) { } return null; }
  }

  // ===================== the game's own adventure data (same maps, bosses, loot as offline) =====================
  const maps = () => (typeof ADV_MAPS !== 'undefined' ? ADV_MAPS : []);
  const mapOf = id => maps().find(m => m.id === id) || null;
  const withDiff = (d, fn) => { const o = Adventure.diff; Adventure.diff = d; try { return fn(); } finally { Adventure.diff = o; } };
  const stagesOf = (M, d) => { try { return Adventure.stagesOf(M, d); } catch (e) { return M.stages || []; } };
  const bossOf = (M, d) => stagesOf(M, d).filter(s => s.boss).pop() || null;
  const portraitOf = bs => { const k = bs && ((bs.sheet || '').match(/boss_(\w+?)_hold/) || [])[1]; return k ? 'assets/adventure/portrait/' + k + '.webp' : ''; };
  const myPower = () => { try { return Adventure.myPower() | 0; } catch (e) { return 0; } };
  const needOf = (M, d) => { try { return withDiff(d, () => Adventure.needPower(M)) | 0; } catch (e) { return 0; } };
  const bossLine = (M, d) => { const bs = bossOf(M, d); if (!bs) return ''; try { return withDiff(d, () => 'Boss: ' + bs.bossName + '  |  ' + eHp(bs).toLocaleString() + ' HP  |  ' + (bs.def || 0) + '% armor'); } catch (e) { return 'Boss: ' + (bs.bossName || ''); } };
  function lootCell(e) {   // one loot picture (same data as the offline Adventure reward row)
    let img = '', nm = '', col = '#aab4cc';
    try {
      if (e.stone) { const s = STONE_TYPES[e.stone - 1]; img = s.img; nm = s.n; col = s.col; }
      else if (e.scroll) { const m = matOf('support', 1); img = m.img; nm = m.name; col = m.col; }
      else if (e.chips) { img = 'assets/chip.png'; nm = 'Chips'; col = '#ffd24a'; }
      else { const it = e.it, r = RARITY[it.rar]; img = it.img || ''; nm = it.name; col = r.color; }
    } catch (x) { }
    const c = h('div', { class: 'lc', style: '--rc:' + col, title: nm }, img ? h('img', { src: img, alt: '', draggable: 'false' }) : null);
    c.onclick = () => C.toast(nm); return c;
  }
  const lootOf = (M, d) => { try { return withDiff(d, () => Adventure.dropList(M, true)); } catch (e) { return []; } };
  function banner(M, d, w, hh, extra) {   // map picture + boss portrait + stage count (used in the room and in the map picker)
    const bs = bossOf(M, d), pt = portraitOf(bs), n = stagesOf(M, d).length;
    const b = h('div', { class: 'mban', style: `width:${w}px;height:${hh}px;background-image:url(${M.thumb});border-color:${DIFFS[d].c}` },
      h('div', { class: 'mshade' }),
      pt ? h('img', { class: 'mboss', src: pt, alt: '', onerror: function () { this.style.display = 'none'; } }) : null,
      h('div', { class: 'mstage' }, n + ' STAGES'),
      bs ? h('div', { class: 'mbn' }, 'BOSS: ' + bs.bossName) : null, extra || null);
    return b;
  }

  // ===================== look (same wood style as the Arena) =====================
  const U = f => AV_UI + f;
  function css() {
    if (document.getElementById('advCss')) return;
    const s = document.createElement('style'); s.id = 'advCss'; s.textContent = `#onl .av{position:absolute;inset:0;background:#2a1a0c url(${U('bg_wood.jpg')});overflow:hidden;font-family:var(--body,sans-serif);color:#fff2da;user-select:none;-webkit-user-select:none}
#onl .av .st{position:absolute;left:50%;top:50%;width:960px;height:540px;transform:translate(-50%,-50%) scale(var(--k,1));transform-origin:50% 50%}
#onl .av .abs{position:absolute}
#onl .av .pnl{background:url(${U('wood_tile.png')}) padding-box;border:16px solid transparent;border-image:url(${U('panel.png')}) 30 / 16px stretch;background-clip:padding-box;box-sizing:border-box}
#onl .av .ins{background:#2a190b url(${U('bg_wood.jpg')}) padding-box;border:14px solid transparent;border-image:url(${U('panel_dark.png')}) 26 / 14px stretch;background-clip:padding-box;box-sizing:border-box}
#onl .av .ttl{position:absolute;left:270px;top:2px;width:420px;height:96px;background:url(${U('banner.png')}) 0 0/100% 100%;display:flex;align-items:center;justify-content:center;font:400 44px/1 var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:2px #4a1f06;paint-order:stroke fill;text-shadow:0 3px 0 #4a1f06;letter-spacing:2px}
#onl .av .ttl.sm{left:300px;width:330px;height:70px;font-size:34px}
#onl .av .ab{position:absolute;display:flex;align-items:center;justify-content:center;cursor:pointer;background:url(${U('btn_wood.png')}) 0 0/100% 100%;font:400 19px/1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1.5px #5a2d08;paint-order:stroke fill;text-shadow:0 2px 0 #5a2d08;letter-spacing:.5px;-webkit-tap-highlight-color:transparent;transition:transform .1s,filter .1s}
#onl .av .ab:hover{filter:brightness(1.12)}#onl .av .ab:active{transform:scale(.96)}
#onl .av .ab.go{background-image:url(${U('btn_start.png')});font-size:26px}
#onl .av .ab.rd{background-image:url(${U('btn_ready.png')});font-size:26px}
#onl .av .ab.off{background-image:url(${U('btn_off.png')});filter:grayscale(.3);cursor:default}
#onl .av .ab.sm{font-size:15px}
#onl .av .rc{position:absolute;width:338px;height:58px;display:flex;align-items:center;gap:8px;padding:0 6px 0 4px;background:url(${U('wood_light.png')}) padding-box;border:10px solid transparent;border-image:url(${U('slot.png')}) 24 / 10px stretch;background-clip:padding-box;cursor:pointer;box-sizing:border-box;transition:transform .1s,filter .1s}
#onl .av .rc:hover{filter:brightness(1.1)}#onl .av .rc:active{transform:scale(.98)}
#onl .av .rc.full{filter:grayscale(.5) brightness(.8);cursor:default}
#onl .av .rc img{width:34px;height:34px;object-fit:contain;background:rgba(40,20,6,.45);border-radius:8px}
#onl .av .rc .t{flex:1;min-width:0}#onl .av .rc b{display:block;font:400 17px/1.1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#onl .av .rc small{display:block;font-size:12px;color:#ffe3b0}
#onl .av .rc .n{font:400 26px/1 var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:1.5px #4a1f06;paint-order:stroke fill}
#onl .av .rc .n.f{color:#ff9a8a}
#onl .av .lst{position:absolute;overflow-y:auto;padding:8px 10px;scrollbar-width:thin;scrollbar-color:#b07d45 transparent}
#onl .av .lst .it{display:flex;justify-content:space-between;gap:6px;padding:3px 2px;font-size:14px;border-bottom:1px solid rgba(255,220,160,.12);cursor:pointer}
#onl .av .lst .it span:last-child{color:#ffd34a;white-space:nowrap}
#onl .av .lst .it.me span:first-child{color:#8fe0a0}
#onl .av .hd{font:400 15px/1 var(--disp,sans-serif);color:#ffd34a;text-shadow:0 2px 0 #3a1c06;letter-spacing:.5px}
#onl .av .face{position:absolute;display:flex;flex-direction:column;align-items:center;text-align:center}
#onl .av .face img{width:130px;height:130px;object-fit:contain;filter:drop-shadow(0 6px 5px rgba(0,0,0,.6))}
#onl .av .face b{font:400 18px/1.1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill}
#onl .av .face small{color:#ffd34a;font-weight:700;font-size:14px}
#onl .av .dd{position:absolute;width:170px;height:38px;background:url(${U('dropdown.png')}) 0 0/100% 100%;display:flex;align-items:center;justify-content:center;gap:8px;font:400 15px/1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #5a2d08;paint-order:stroke fill;cursor:pointer;z-index:5}
#onl .av .ddm{position:absolute;width:170px;z-index:6;padding:6px;background:url(${U('panel_dark.png')}) center/100% 100%;box-sizing:border-box}
#onl .av .ddm div{padding:8px 10px;font:400 15px/1 var(--disp,sans-serif);cursor:pointer;border-radius:6px}#onl .av .ddm div:hover{background:rgba(255,200,120,.2)}
#onl .av .ibar2{position:absolute;display:flex;gap:6px;z-index:4}
#onl .av .ibar2 button{border:0;background:none;padding:0;cursor:pointer;height:50px;transition:transform .1s,filter .1s}
#onl .av .ibar2 button img{height:100%;display:block;filter:drop-shadow(0 3px 3px rgba(0,0,0,.55));pointer-events:none}
#onl .av .ibar2 button:hover{transform:translateY(-3px) scale(1.07);filter:brightness(1.15)}
/* room */
#onl .av .sl{position:absolute;width:212px;height:140px;background:url(${U('wood_light.png')}) padding-box;border:12px solid transparent;border-image:url(${U('slot.png')}) 24 / 12px stretch;background-clip:padding-box;box-sizing:border-box;padding:2px 2px 0;overflow:hidden}
#onl .av .sl.closed{border:0;border-image:none;background:url(${U('slot_closed.png')}) 0 0/100% 100%;cursor:pointer}
#onl .av .sl.mine{filter:drop-shadow(0 0 7px rgba(255,214,90,.9))}
#onl .av .sl .pic{width:78px;height:78px;object-fit:contain;float:left;margin-right:6px;filter:drop-shadow(0 5px 4px rgba(0,0,0,.55))}
#onl .av .sl .nm{font:400 17px/1.15 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#onl .av .sl .lv{color:#ffd34a;font-weight:800;font-size:15px}
#onl .av .sl .wp{position:absolute;left:4px;right:4px;bottom:4px;display:flex;align-items:center;gap:6px;font-size:13px;color:#ffe9c4;background:rgba(48,26,8,.55);border-radius:8px;padding:3px 6px;overflow:hidden;white-space:nowrap}
#onl .av .sl .wp img{width:26px;height:26px;object-fit:contain}
#onl .av .sl .host{position:absolute;right:4px;top:2px;font:400 12px/1 var(--disp,sans-serif);color:#ffd34a;text-shadow:0 2px 0 #3a1c06}
#onl .av .sl .rdy{position:absolute;left:0;right:0;top:28px;text-align:center;font:400 34px/1 var(--disp,sans-serif);color:#7dff7a;text-shadow:0 3px 0 #0b3d0a,0 0 12px rgba(80,255,80,.7);transform:rotate(-8deg);pointer-events:none}
#onl .av .sl .wait{display:flex;height:100%;align-items:center;justify-content:center;font:400 26px/1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1.5px #4a2208;paint-order:stroke fill;text-shadow:0 3px 0 #4a2208}
#onl .av .mc{position:absolute;width:236px;box-sizing:border-box;padding:8px 10px;border-radius:12px;border:3px solid rgba(255,224,160,.35);background:rgba(36,18,4,.55);cursor:pointer;transition:transform .1s}
#onl .av .mc.sel{border-color:#7dff7a;box-shadow:0 0 12px rgba(120,255,120,.55)}
#onl .av .mc.sel2{border-color:#ffd34a;box-shadow:0 0 12px rgba(255,210,70,.55)}
#onl .av .mc.dis{opacity:.5;cursor:default}
#onl .av .mc h4{margin:0 0 4px;font:400 18px/1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill}
#onl .av .mc p{margin:1px 0;font-size:12px;line-height:1.22;color:#ffe9c4}
#onl .av .mc .no{color:#ff9a8a;font-weight:700}
#onl .av .tile{position:absolute;width:98px;height:80px;border-radius:10px;background:rgba(36,18,4,.6);border:2px solid rgba(255,224,160,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-sizing:border-box;font-size:12px;color:#ffe9c4;text-align:center}
#onl .av .tile img{width:40px;height:40px;object-fit:contain}
#onl .av .tile b{color:#ffd34a;font-size:13px}
#onl .av .buy{cursor:pointer}#onl .av .buy:hover{filter:brightness(1.15)}
#onl .av .pop2{position:absolute;left:-700px;right:-700px;top:-500px;bottom:-500px;z-index:20;background:rgba(10,5,0,.62);display:flex;align-items:center;justify-content:center}
#onl .av .pop2 .pnl{width:400px;padding:6px 10px 10px;text-align:center}
#onl .av .atabs{display:flex;gap:8px;justify-content:center;margin:2px 0 8px}
#onl .av .atabs .atb{padding:7px 14px;border-radius:10px;font:400 15px/1 var(--disp,sans-serif);cursor:pointer;background:rgba(36,18,4,.55);border:2px solid rgba(255,224,160,.3)}#onl .av .atabs .atb.on{border-color:#ffd34a;color:#ffd34a}
#onl .av .iv{display:flex;align-items:center;gap:8px;padding:4px 6px;border-bottom:1px solid rgba(255,220,160,.12);text-align:left;font-size:14px}
#onl .av .iv img{width:30px;height:30px;object-fit:contain}#onl .av .iv .t{flex:1}#onl .av .iv .t i{color:#ffd34a;font-style:normal;font-weight:700}
#onl .av .cover{position:absolute;left:-700px;right:-700px;top:-500px;bottom:-500px;z-index:15;background:rgba(10,5,0,.78);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font:400 30px/1.1 var(--disp,sans-serif);color:#ffd34a;text-shadow:0 3px 0 #3a1c06;text-align:center}
#onl .av .cover small{font:600 16px var(--body,sans-serif);color:#ffe9c4;text-shadow:none}
#onl .av .spin{width:54px;height:54px;border-radius:50%;border:6px solid rgba(255,211,74,.25);border-top-color:#ffd34a;animation:avsp 1s linear infinite}@keyframes avsp{to{transform:rotate(360deg)}}
#onl .av .vsrow{position:absolute;left:0;right:0;top:100px;display:flex;justify-content:center;align-items:center;gap:30px}
#onl .av .vteam{display:flex;gap:10px}
#onl .av .vc{width:120px;text-align:center}#onl .av .vc img{width:112px;height:112px;object-fit:contain;filter:drop-shadow(0 6px 5px rgba(0,0,0,.6))}
#onl .av .vc b{display:block;font:400 16px/1.1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#onl .av .vc small{color:#ffd34a;font-weight:800}
#onl .av .vs{font:400 90px/1 var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:4px #4a1f06;paint-order:stroke fill;text-shadow:0 6px 0 #4a1f06,0 0 24px rgba(255,160,40,.7)}
#onl .av .invb{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:30;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:14px;background:rgba(36,18,4,.94);border:3px solid #ffd34a;box-shadow:0 6px 18px rgba(0,0,0,.6);font:600 15px var(--body,sans-serif);color:#fff2da;white-space:nowrap}
#onl .av .invb .ab{position:static;width:80px;height:36px;flex:none}
#onl .av .note{position:absolute;text-align:center;font:600 12.5px/1.3 var(--body,sans-serif);color:#ffe9c4}
#onl .av .face .wpl{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px;font-size:13px;color:#ffe9c4;background:rgba(48,26,8,.55);border-radius:8px;padding:3px 10px;max-width:250px;overflow:hidden;white-space:nowrap}
#onl .av .face .wpl img{width:26px;height:26px;object-fit:contain}
#onl .av .rcg{position:absolute;display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;align-content:start;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#b07d45 transparent}
#onl .av .rcg .rc{position:relative;width:auto;height:58px;flex:none}
#onl .av .sl .rdy{top:48px;font-size:30px}
#onl .av .sl .pw{color:#9fe3ff;font-weight:800;font-size:14px}
#onl .av .sl .wait{font-size:24px}
#onl .av .mban{position:absolute;overflow:hidden;box-sizing:border-box;border:3px solid #d9a35c;border-radius:12px;background:#10141f center/cover no-repeat}
#onl .av .mban .mshade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,6,2,.72),rgba(10,6,2,.05) 70%)}
#onl .av .mban .mboss{position:absolute;right:2px;bottom:0;height:96%;max-width:60%;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.7))}
#onl .av .mban .mstage{position:absolute;left:10px;top:6px;font:400 24px/1 var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:2px #4a1f06;paint-order:stroke fill;text-shadow:0 3px 0 #4a1f06;font-style:italic}
#onl .av .mban .mbn{position:absolute;left:10px;bottom:6px;max-width:62%;font:400 13px/1.1 var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill}
#onl .av .lg{position:absolute;display:grid;grid-template-columns:repeat(5,1fr);gap:5px;align-content:start;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#b07d45 transparent}
#onl .av .lc{aspect-ratio:1;border-radius:8px;border:2px solid var(--rc,#aab4cc);background:rgba(36,18,4,.7);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:inset 0 0 8px rgba(0,0,0,.6)}
#onl .av .lc img{width:78%;height:78%;object-fit:contain}
#onl .av .nomap{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;font:400 22px/1.15 var(--disp,sans-serif);color:#ffd34a;padding:0 14px}
#onl .av .nomap small{font:600 13px var(--body,sans-serif);color:#ffe9c4}
#onl .av .mapbar{display:flex;align-items:center;justify-content:center;font:400 17px var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill;text-align:center;line-height:1.05}
#onl .av .pop2 .pnl.pk{width:520px;padding:4px 10px 10px;border-width:16px}
#onl .av .pkh{font:400 24px var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:1.5px #4a1f06;paint-order:stroke fill;margin-bottom:4px}
#onl .av .pkrow{display:flex;align-items:center;justify-content:center;gap:10px}
#onl .av .pkrow .mban{position:relative}
#onl .av .pkar{position:static;width:46px;height:56px;flex:none;font-size:22px}
#onl .av .pkdots{display:flex;gap:6px;justify-content:center;margin:6px 0 2px}
#onl .av .pkdots i{width:9px;height:9px;border-radius:50%;background:rgba(255,224,160,.3)}#onl .av .pkdots i.on{background:#ffd34a}
#onl .av .pkn{font:400 20px var(--disp,sans-serif);color:#fff;-webkit-text-stroke:1px #4a2208;paint-order:stroke fill}
#onl .av .pk p{margin:2px 0;font-size:12.5px;line-height:1.25;color:#ffe9c4}
#onl .av .pkboss{color:#ffd34a!important;font-weight:700}
#onl .av .pkds{display:flex;gap:8px;justify-content:center;margin:6px 0}
#onl .av .pkd{padding:7px 14px;border-radius:10px;font:400 14px/1 var(--disp,sans-serif);cursor:pointer;background:rgba(36,18,4,.55);border:2px solid var(--dc);color:var(--dc);opacity:.75}
#onl .av .pkd.on{opacity:1;background:var(--dc);color:#1a0d02}
#onl .av .pkl{position:static;grid-template-columns:repeat(14,1fr);gap:3px;margin:4px 0;overflow:hidden}
#onl .av .pkbt{display:flex;gap:12px;justify-content:center;margin-top:6px}
#onl .av .pkbt .ab{position:static;width:130px;height:46px;font-size:18px}#onl .av .pkbt .ab.go{font-size:20px}
`; document.head.append(s);
  }
  function fit() { const k = Math.min(innerWidth / 960, innerHeight / 540); el.style.setProperty('--k', k); K = k; }

  // ===================== small builders =====================
  const btn = (txt, x, y, w, hgt, fn, cls) => { const b = h('div', { class: 'ab ' + (cls || ''), style: `left:${x}px;top:${y}px;width:${w}px;height:${hgt}px` }, txt); if (!(cls || '').includes('off')) b.onclick = () => { C.beep(); fn(); }; else b.onclick = () => fn && fn(); return b; };
  const stage = (...kids) => h('div', { class: 'st' }, ...kids);
  const mount = (st, extra) => {   // draw a screen; keep what the player was typing in the chat box
    const old = el.querySelector('.chat input'), keep = old ? { v: old.value, f: document.activeElement === old, s: old.selectionStart } : null;
    el.replaceChildren(st, ...(extra || []));
    if (S.banner && !S.banner.dead) el.append(S.banner);
    if (keep) { const ni = el.querySelector('.chat input'); if (ni) { ni.value = keep.v; if (keep.f) { try { ni.focus(); ni.setSelectionRange(keep.s, keep.s); } catch (e) { } } } }
  };
  const rimg = r => C.robotImg(C.robots()[(r | 0) % nrobots()]);
  const chatBox = (x, y, w) => { const c = C.chatBox(); c.style.cssText = `--cw:${w}px;left:${x}px;bottom:auto;top:${y}px`; return c; };
  const iconBar = (x, y, ids) => {
    const bar = h('div', { class: 'ibar2', style: `left:${x}px;top:${y}px` });
    for (const id of ids) bar.append(h('button', { onclick: () => { C.beep(); iconAction(id); } }, h('img', { src: 'assets/online/i_' + id + '.webp', alt: id })));
    return bar;
  };
  function iconAction(id) {
    if (id === 'bag') C.launch('profile', () => { C.reopenAdv(); });   // the Bag = Profile of YOUR ONLINE character
    else if (id === 'friends') invitePop(true);
    else C.toast({ scroll: 'Quests: coming next', gear: 'Settings: coming next', trophy: 'Rankings: coming next', mail: 'Mail: coming next' }[id] || 'Coming next');
  }

  // ===================== which screen? (decided by what the server says) =====================
  function onData(j) {
    S.online = j.online || []; S.rooms = j.advRooms || []; S.my = j.myAdv || null; S.invites = j.advInvites || [];
    if (!el || !el.isConnected || C.root.hidden) return;   // not on screen (for example the Bag is open): just keep the data
    route();
  }
  function route() {
    const r = S.my; invites();
    if (!r) {
      if (S.view === 'room' || S.view === 'starting') C.toast('You left the room.');
      if (S.view !== 'lobby') return lobby();
      return repaint();
    }
    if (r.state === 'starting') { if (S.view !== 'starting') starting(); return; }
    if (r.state === 'running') { if (!run) beginRun(r); return; }   // the party goes into the map's stages
    if (S.view !== 'room') return room();
    repaint();
  }
  const sigOf = () => {
    const r = S.my, mem = m => [m.id, m.lv, m.power, m.ready ? 1 : 0, m.host ? 1 : 0, m.robot, m.weapon && m.weapon.name].join(':');
    if (S.view === 'lobby') return JSON.stringify([S.online.map(o => o.id + ':' + o.lv), S.rooms.slice(0, 30).map(x => [x.id, x.map, x.diff, x.state, x.members.map(mem)])]);
    if (S.view === 'room' && r) return JSON.stringify([r.id, r.map, r.diff, r.state, r.hostId, r.members.map(mem)]);
    return '';
  };
  function repaint() { const s = sigOf(); if (s && s !== S.sig) { if (S.view === 'lobby') lobby(); else if (S.view === 'room') room(); } }
  function invites() {   // a banner when another player invites me
    if (S.view !== 'lobby' && S.view !== 'room') return;
    S.seen = S.seen || new Set();
    for (const iv of S.invites) {
      const key = iv.from.id + ':' + iv.at; if (S.seen.has(key)) continue; S.seen.add(key);
      if (S.banner) S.banner.remove();
      const b = h('div', { class: 'invb' }, h('span', null, iv.from.name + ' invites you to Adventure Room ' + iv.room),
        h('div', { class: 'ab sm', onclick: async () => { C.beep(); b.dead = true; b.remove(); if (await act('join', { room: iv.room })) room(); } }, 'Join'),
        h('div', { class: 'ab sm off', onclick: () => { b.dead = true; b.remove(); } }, 'No'));
      S.banner = b; el.append(b); setTimeout(() => { b.dead = true; b.remove(); }, 20000);
    }
  }

  // ===================== LOBBY =====================
  function lobby() {
    S.view = 'lobby'; const p = myMember(), others = S.online.filter(o => o.id !== p.id);
    const st = stage(
      h('div', { class: 'ttl' }, 'Adventure'),
      btn('Back', 14, 12, 92, 40, () => { close(); C.back(); }, 'sm'),
      h('div', { class: 'abs pnl', style: 'left:10px;top:92px;width:644px;height:268px' }),
      // right: my character (picture, name, level, power, weapon)
      h('div', { class: 'abs pnl', style: 'left:664px;top:92px;width:288px;height:214px' }),
      h('div', { class: 'face', style: 'left:664px;top:98px;width:288px' }, rimg(p.robot), h('b', null, p.name),
        h('small', null, 'Lv ' + p.lv + '   |   Power ' + p.power.toLocaleString()),
        h('div', { class: 'wpl' }, p.weapon.img ? h('img', { src: p.weapon.img, alt: '' }) : null, h('span', null, p.weapon.name))),
      // below it: the empty black list = who is online
      h('div', { class: 'abs ins', style: 'left:664px;top:312px;width:288px;height:222px' }),
      h('div', { class: 'abs hd', style: 'left:680px;top:322px' }, 'ONLINE PLAYERS  (' + (others.length + 1) + ')'),
      (() => { const l = h('div', { class: 'lst', style: 'left:676px;top:342px;width:266px;height:186px' }); l.append(h('div', { class: 'it me' }, h('span', null, p.name), h('span', null, 'Lv ' + p.lv))); for (const o of others) l.append(h('div', { class: 'it', onclick: () => C.toast(o.name + '  |  Lv ' + o.lv) }, h('span', null, o.name), h('span', null, 'Lv ' + o.lv))); return l; })()
    );
    // room list: the maps the players created, with how many are inside (n/4)
    const grid = h('div', { class: 'rcg', style: 'left:24px;top:106px;width:618px;height:240px' });
    S.rooms.forEach(r => {
      const M = mapOf(r.map), host = hostOf(r), n = r.members.length, going = r.state !== 'room', full = n >= SLOTS || going;
      const d = r.diff | 0;
      const card = h('div', { class: 'rc' + (full ? ' full' : '') },
        M ? h('img', { src: M.thumb, alt: '', style: 'width:52px;height:34px;object-fit:cover' }) : h('img', { alt: '', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' }),
        h('div', { class: 't' }, h('b', null, M ? M.name : 'No map selected yet'),
          h('small', null, 'Room ' + r.id + '  |  ' + host.name + (M ? '  |  ' : ''), M ? h('i', { style: 'font-style:normal;color:' + DIFFS[d].c }, DIFFS[d].n) : null, going ? '  |  Playing' : n >= SLOTS ? '  |  Full' : '')),
        h('div', { class: 'n' + (full ? ' f' : '') }, n + '/' + SLOTS));
      card.onclick = () => { C.beep(); joinRoom(r); }; grid.append(card);
    });
    st.append(grid);
    if (!S.rooms.length) st.append(h('div', { class: 'abs', style: 'left:24px;top:200px;width:618px;text-align:center;font:400 22px var(--disp,sans-serif);color:#ffe3b0' }, 'No adventure rooms yet. Tap Start or Team Up to create one.'));
    st.append(chatBox(10, 368, 336));
    st.append(btn('TEAM UP', 356, 392, 96, 56, teamUp, 'sm'), btn('SEARCH', 458, 392, 96, 56, () => { C.live.nudge(); C.toast('Rooms updated'); }, 'sm'), btn('START', 560, 388, 96, 62, quickStart, 'go'));
    st.append(iconBar(356, 466, ['bag', 'friends', 'scroll', 'gear']));
    mount(st); S.sig = sigOf();
  }
  async function teamUp() { if (await act('create', {})) room(); }
  async function quickStart() { if (!(await act('create', {}))) return; room(); picker(); }   // Start = make the room and pick the map at once (nothing starts yet)
  async function joinRoom(r) {
    if (r.state !== 'room') return C.toast('That adventure already started.');
    if (r.members.length >= SLOTS) return C.toast('That room is full (4/4).');
    if (await act('join', { room: r.id })) room();
  }

  // ===================== ROOM =====================
  function room() {
    S.view = 'room'; const r = S.my; if (!r) return lobby();
    const host = amHost(), mm = r.members, mine = mm.find(amMember), M = mapOf(r.map), d = r.diff | 0;
    const st = stage(h('div', { class: 'ttl sm' }, 'Adventure'), btn('Leave', 14, 12, 92, 40, async () => { S.view = 'lobby'; await act('leave'); lobby(); }, 'sm'));
    // left: the 4 players (picture, name, level, power, weapon)
    for (let i = 0; i < SLOTS; i++) {
      const x = 12 + (i % 2) * 220, y = 70 + Math.floor(i / 2) * 146, m = mm[i]; let slot;
      if (m) {
        slot = h('div', { class: 'sl' + (amMember(m) ? ' mine' : ''), style: `left:${x}px;top:${y}px` },
          rimg(m.robot).cloneNode(), h('div', { class: 'nm' }, m.name), h('div', { class: 'lv' }, 'Lv ' + m.lv + (m.host ? '  ★ HOST' : '')), h('div', { class: 'pw' }, 'Power ' + (m.power || 0).toLocaleString()),
          h('div', { class: 'wp' }, m.weapon && m.weapon.img ? h('img', { src: m.weapon.img, alt: '' }) : null, h('span', null, m.weapon ? m.weapon.name : '')),
          m.ready && !m.host ? h('div', { class: 'rdy' }, 'READY') : null);
        slot.querySelector('img').className = 'pic';
      } else {
        slot = h('div', { class: 'sl', style: `left:${x}px;top:${y}px;cursor:pointer` }, h('div', { class: 'wait' }, 'Available'));
        slot.onclick = () => { C.beep(); invitePop(false); };
      }
      st.append(slot);
    }
    // middle: boss + map picture, items to loot, the chosen map
    if (M) {
      const mb = banner(M, d, 250, 124); mb.style.left = '458px'; mb.style.top = '64px'; st.append(mb);
      const lootBox = h('div', { class: 'abs ins', style: 'left:458px;top:194px;width:250px;height:146px;overflow:hidden' });
      st.append(lootBox, h('div', { class: 'abs hd', style: 'left:474px;top:202px' }, 'TAKE ITEMS'));
      const lg = h('div', { class: 'lg', style: 'left:468px;top:222px;width:230px;height:112px' }); for (const e of lootOf(M, d).slice(0, 40)) lg.append(lootCell(e)); st.append(lg);
      const need = needOf(M, d), mp = myPower();
      st.append(h('div', { class: 'note', style: 'left:458px;top:396px;width:250px;color:' + (mp >= need ? '#7dff7a' : mp >= need * .7 ? '#ffd34a' : '#ff9a8a') }, 'Power needed ' + need.toLocaleString() + '   |   Yours ' + mp.toLocaleString()));
    } else {
      st.append(h('div', { class: 'abs ins nomap', style: 'left:458px;top:64px;width:250px;height:276px' }, h('div', null, 'No adventure map yet'), h('small', null, host ? 'Tap the bar below to choose one.' : 'Waiting for the host to choose a map.')));
    }
    const bar = h('div', { class: 'abs pnl mapbar', style: 'left:458px;top:346px;width:250px;height:46px;border-width:12px;border-image-width:12px' },
      M ? h('span', null, M.name + '  ', h('i', { style: 'font-style:normal;color:' + DIFFS[d].c }, DIFFS[d].n)) : h('span', { style: 'color:#ffe3b0' }, 'Select adventure map'));
    if (host) { bar.style.cursor = 'pointer'; bar.onclick = () => { C.beep(); picker(); }; }
    st.append(bar);
    // right: room, my items, item shop (Heal + Team Heal only, max 2 each)
    st.append(h('div', { class: 'abs', style: 'left:716px;top:8px;width:236px;text-align:center;font:400 22px var(--disp,sans-serif);color:#ffd34a;-webkit-text-stroke:1.5px #4a1f06;paint-order:stroke fill' }, 'Room ' + r.id),
      h('div', { class: 'abs', style: 'left:716px;top:38px;width:236px;text-align:center;font:600 12px var(--body,sans-serif);color:#ffe9c4' }, 'Up to 4 heroes. Beat the boss together!'));
    st.append(h('div', { class: 'abs pnl', style: 'left:712px;top:62px;width:240px;height:232px;border-width:12px;border-image-width:12px' }));
    st.append(h('div', { class: 'abs hd', style: 'left:730px;top:72px' }, 'MY ITEMS'), h('div', { class: 'abs hd', style: 'left:730px;top:172px' }, 'ITEM SHOP'));
    POTION_ITEMS.forEach((it, i) => {
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
    st.append(chatBox(12, 368, 340));
    st.append(btn('INVITE', 716, 322, 112, 54, () => invitePop(false)));
    if (host) st.append(btn('START', 836, 316, 118, 62, async () => {
      if (!M) { C.toast('Select an adventure map first.'); return picker(); }
      if (mm.some(m => !m.host && !m.ready)) return C.toast('Everyone must press Ready first.');
      if (await act('start', { total: stagesOf(M, d).length })) route();
    }, 'go'));
    else st.append(btn(mine && mine.ready ? 'CANCEL' : 'READY', 836, 316, 118, 62, () => { if (!M) return C.toast('Wait for the host to choose a map.'); act('ready', { ready: !(mine && mine.ready) }); }, mine && mine.ready ? '' : 'rd'));
    st.append(iconBar(716, 392, ['bag', 'friends', 'scroll', 'gear']));
    mount(st); S.sig = sigOf();
  }

  // ===================== MAP PICKER (same maps + difficulties as the offline Adventure) =====================
  function picker() {
    const r = S.my; if (!r || !amHost()) return;
    const list = maps(); if (!list.length) return C.toast('No adventure maps found.');
    let i = Math.max(0, list.findIndex(m => m.id === r.map)), d = r.diff | 0, pop = null;
    const stg = el.querySelector('.st');
    const draw = () => {
      if (pop) pop.remove();
      const M = list[i], need = needOf(M, d), mp = myPower(), pc = mp >= need ? '#7dff7a' : mp >= need * .7 ? '#ffd34a' : '#ff9a8a';
      const arrow = (t, fn) => h('div', { class: 'ab pkar', onclick: () => { C.beep(); fn(); } }, t);
      const dbtn = DIFFS.map((D, k) => h('div', { class: 'pkd' + (k === d ? ' on' : ''), style: `--dc:${D.c}`, onclick: () => { C.beep(); d = k; draw(); } }, D.n));
      const loot = h('div', { class: 'lg pkl' }); for (const e of lootOf(M, d).slice(0, 14)) loot.append(lootCell(e));
      const dots = h('div', { class: 'pkdots' }, list.map((m, k) => h('i', { class: k === i ? 'on' : '' })));
      pop = h('div', { class: 'pop2' }, h('div', { class: 'pnl pk' },
        h('div', { class: 'pkh' }, 'Select adventure map'),
        h('div', { class: 'pkrow' }, arrow('◀', () => { i = (i + list.length - 1) % list.length; draw(); }), banner(M, d, 330, 130), arrow('▶', () => { i = (i + 1) % list.length; draw(); })),
        dots, h('div', { class: 'pkn' }, M.name), h('p', { class: 'pkdesc' }, M.desc || ''),
        h('p', { class: 'pkboss' }, bossLine(M, d)), h('p', { style: 'color:' + pc + ';font-weight:800' }, 'Power needed ' + need.toLocaleString() + '   |   Yours ' + mp.toLocaleString()),
        h('div', { class: 'pkds' }, dbtn), loot,
        h('div', { class: 'pkbt' },
          h('div', { class: 'ab go sm2', onclick: async () => { C.beep(); pop.remove(); await act('config', { map: M.id, diff: d }); room(); } }, 'SELECT'),
          h('div', { class: 'ab sm2', onclick: () => { C.beep(); pop.remove(); } }, 'Cancel'))));
      pop.onclick = e => { if (e.target === pop) pop.remove(); }; stg.append(pop);
    };
    draw();
  }

  // ===================== INVITE (Friend list | World) =====================
  function invitePop(onlyFriends) {
    const stg = el.querySelector('.st'); let tab = onlyFriends ? 'friends' : 'world', pop = null;
    const draw = () => {
      if (pop) pop.remove();
      const r = S.my, p = me(), list = tab === 'friends' ? [] : S.online.filter(o => o.id !== p.id);
      const rows = list.map(o => {
        const inRoom = r && r.members.some(m => m.id === o.id), can = r && r.state === 'room' && r.members.length < SLOTS && !inRoom;
        const a2 = can ? h('div', { class: 'ab sm', style: 'position:static;width:74px;height:32px;flex:none', onclick: async () => { C.beep(); if (await act('invite', { to: o.id })) C.toast('Invitation sent to ' + o.name); pop.remove(); } }, 'Invite') : h('small', null, !r ? 'Create a room first' : inRoom ? 'In your room' : 'Room full');
        return h('div', { class: 'iv' }, rimg(o.robot).cloneNode(), h('div', { class: 't' }, h('b', null, o.name), h('i', null, '  Lv ' + o.lv)), a2);
      });
      const lst = h('div', { style: 'height:240px;overflow-y:auto' }, rows.length ? rows : h('p', null, tab === 'friends' ? 'No friends yet. The friend list is coming soon.' : 'Nobody else is online on this server.'));
      const tabs = h('div', { class: 'atabs' }, h('div', { class: 'atb' + (tab === 'friends' ? ' on' : ''), onclick: () => { tab = 'friends'; draw(); } }, 'Friend List'), h('div', { class: 'atb' + (tab === 'world' ? ' on' : ''), onclick: () => { tab = 'world'; draw(); } }, 'World'), h('div', { class: 'atb', onclick: () => pop.remove() }, 'X'));
      pop = h('div', { class: 'pop2' }, h('div', { class: 'pnl' }, tabs, lst));
      pop.onclick = e => { if (e.target === pop) pop.remove(); }; stg.append(pop);
    };
    draw();
  }

  // ===================== START (the real battle comes next) =====================
  function starting() {
    const r = S.my; if (!r) return lobby(); S.view = 'starting'; const M = mapOf(r.map), d = r.diff | 0;
    const cover = h('div', { class: 'cover' }, h('div', { class: 'spin' }), h('div', null, 'Adventure is starting'),
      h('small', null, (M ? M.name + '  |  ' + DIFFS[d].n + '  |  ' : '') + r.members.length + ' player' + (r.members.length > 1 ? 's' : '')),
      h('small', null, 'Get ready: all players go into the map together in a moment.'),
      btn('Back to room', 0, 0, 190, 50, async () => { await act('back'); }, ''));
    cover.lastChild.style.position = 'static'; el.append(cover);
  }

  // ===================== THE RUN: the whole room plays the map's stages together =====================
  // Every phone runs the stage on its own copy of the game (same engine, same maps and bosses as the offline Adventure, with this online character's save).
  // The server keeps the party together: a stage ends for everybody when all players have cleared it and taken their loot cards,
  // then everybody starts the next stage at the same time. After the last stage the party is back in the room (choose another map, or leave).
  // Loot cards (1 flip per stage, 2 on the boss stage) and character XP are the game's own Adventure.onOver / Loot code, so they work exactly like offline.
  let run = null;       // { id, mi, diff, total, si, phase: 'fight' | 'loot' | 'over' | 'wait', st, cur (last room data), tick, unsub, hud, wait }
  let hooked = false;
  const ST = { fight: ['Fighting', '#ffb23c'], won: ['Cleared', '#5be37a'], dead: ['Down', '#ff5a4d'] };
  function runCss() {
    if (document.getElementById('coopcss')) return;
    const s = document.createElement('style'); s.id = 'coopcss'; s.textContent = `
#coophud{position:fixed;left:50%;top:calc(76px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:9;display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;max-width:94vw;pointer-events:none;font:700 12px var(--body,sans-serif);color:#fff}
#coophud span{background:rgba(12,18,34,.78);border:1px solid rgba(255,255,255,.2);border-radius:99px;padding:2px 9px;white-space:nowrap}
#coophud .cs{color:#ffd34a}
#coophud i,#coopwait i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;background:var(--c)}
#coopwait{position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;box-sizing:border-box;text-align:center;background:rgba(6,10,22,.86);color:#eef3ff;font-family:var(--body,sans-serif)}
#coopwait h2{margin:0;font:400 clamp(24px,5vw,40px) var(--disp,sans-serif);color:#5be37a}
#coopwait p{margin:0;font-size:16px;color:#cdd7ef}
#coopwait .mem{display:flex;flex-direction:column;gap:5px;min-width:min(80vw,280px);margin:6px 0}
#coopwait .mem div{display:flex;justify-content:space-between;gap:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:6px 12px;font-weight:700}
#coopwait .lv{padding:10px 22px;border-radius:10px;border:0;cursor:pointer;font:700 16px var(--body,sans-serif);color:#eef3ff;background:linear-gradient(#34456e,#233152)}`;
    document.head.append(s);
  }
  function hookAdventure() {   // wrap the game's own Adventure once; every wrapper does nothing unless an online run is going
    if (hooked) return; hooked = true;
    const A = Adventure, o = { open: A.open, back: A.back, onOver: A.onOver, again: A.again, menu: A.menu }, us = UI.show.bind(UI);
    A.open = function () {   // also what the pause menu's Quit calls
      if (!run) return o.open.apply(this, arguments);
      if (run.launching) { this.active = true; G.mode = 'menu'; $('over').hidden = true; return; }   // just enter game mode: the stage is started by the run itself
      leaveRun();
    };
    A.back = function () { if (!run) return o.back.apply(this, arguments); leaveRun(); };
    A.menu = function () { if (!run) return o.menu.apply(this, arguments); leaveRun(); };       // 'Leave room' on the defeat screen
    A.again = function () { if (!run) return o.again.apply(this, arguments); retryStage(); };     // 'Retry stage' on the defeat screen
    A.onOver = function () { return run ? runOver.call(this, o.onOver) : o.onOver.apply(this, arguments); };
    UI.show = function (name) { if (run && !run.ending && name === 'adventure') setTimeout(leaveRun, 0); return us(name); };   // (the map screen has no place in an online run)
  }
  function beginRun(r) {
    if (run || !r.run) return;
    const mi = maps().findIndex(m => m.id === r.map);
    if (mi < 0) { C.toast('This phone does not have that adventure map.'); act('leave').then(() => route()); return; }
    hookAdventure(); runCss();
    run = { id: r.run.id, mi, diff: r.diff | 0, total: r.run.total, si: r.run.stage, phase: 'fight', st: 'fight', cur: r, ending: false, launching: true, beating: false, again: false };
    run.hud = h('div', { id: 'coophud' }); document.body.append(run.hud);
    run.unsub = C.live.subscribe(onRunData);
    run.tick = setInterval(runBeat, 1500);
    try { C.launch('gate', () => C.reopenAdv()); } finally { run.launching = false; }   // hides the room, goes landscape; coming back to the title screen returns to the room
    connectCoop(r).then(() => { if (run) startStage(r.run.stage); }).catch(e => { console.error('coop connect', e); C.toast('Cannot start the shared map: ' + ((e && e.message) || 'check your internet') + '. (Is the server updated?)'); leaveRun(); });
  }
  // ONE shared stage for the whole room (coop_server.js): same map, same enemies, one robot per player. The host phone is the clock.
  async function connectCoop(r) {
    if (typeof Coop === 'undefined') await C.loadExtra('coop_server.js');
    if (typeof Coop === 'undefined') throw new Error('coop missing');
    const ss = C.session(), base = String(ONLINE_API).replace(/^http/, 'ws');
    await Coop.connect(base + '/ws?t=' + ss.token + '&sv=' + (ss.player.server | 0), ss.player.id, r.hostId,
      { toast: m => C.toast(m), onLost: () => { C.toast('Connection to the room was lost.'); leaveRun(); }, onAgain: (si, att) => { if (run) startStage(si, att); } });
    run.hostId = r.hostId;
  }
  function startStage(si, att) {
    if (!run) return;
    clearWait(); run.si = si; run.st = 'fight'; run.phase = 'fight';
    Adventure.diff = run.diff; try { $('over').hidden = true; } catch (e) { }
    drawRun(); runBeat();
    const members = ((run.cur && run.cur.members) || []).map(m => ({ id: m.id, name: m.name, robot: m.robot | 0 }));
    try { Coop.begin({ sk: run.id + ':' + si + ':' + (att | 0), mi: run.mi, si, diff: run.diff, members }); }
    catch (e) { console.error('coop begin', e); C.toast('Co-op could not start: ' + ((e && e.message) || e)); leaveRun(); }   // every phone builds the same stage (see coop_server.js)
  }
  function retryStage() {   // defeat screen -> Retry: the host restarts the stage for the whole room
    if (!run) return;
    try { $('over').hidden = true; } catch (e) { }
    run.st = 'fight'; run.phase = 'fight'; drawRun(); runBeat();
    Coop.retry();
  }
  function runOver(orig) {   // a stage ended (Adventure.onOver): the game's own code gives XP, chips and the loot cards
    const A = this, win = !!(G.winner && !G.winner.cpu);
    if (!win) {   // defeat: the normal result screen, with Retry stage / Leave room
      const out = orig.call(A);
      run.st = 'dead'; run.phase = 'over';
      try { $('bAgain').textContent = 'Retry stage'; $('bMenu').textContent = 'Leave room'; } catch (e) { }
      drawRun(); runBeat(); return out;
    }
    const lo = Loot.open;   // victory: the loot board (1 flip, boss stage 2 flips); when it closes we wait for the team instead of the result screen
    Loot.open = function (a, b, cb) { return lo.call(this, a, b, () => lootDone()); };
    try { orig.call(A); } finally { Loot.open = lo; }
    run.phase = 'loot'; drawRun();
  }
  function lootDone() {
    if (!run) return;
    run.phase = 'wait'; run.st = 'won';
    const t = (document.getElementById('overT') || {}).textContent || 'STAGE CLEAR!', sm = (document.getElementById('overS') || {}).textContent || '';
    run.wait = h('div', { id: 'coopwait' }, h('h2', null, t), h('p', null, sm), h('div', { class: 'mem' }), h('p', { class: 'wl' }, ''),
      h('button', { class: 'lv', onclick: () => { C.beep(); leaveRun(); } }, 'Leave room'));
    document.body.append(run.wait);
    drawRun(); runBeat(); evalRun();
  }
  function clearWait() { if (run && run.wait) { run.wait.remove(); run.wait = null; } }
  async function runBeat() {   // tell the server how this stage is going (also the heartbeat)
    if (!run || run.ending) return;
    if (run.beating) { run.again = true; return; }
    run.beating = true;
    try { await C.live.call('adv/report', { stage: run.si, st: run.st }); } catch (e) { }
    if (run) { run.beating = false; if (run.again) { run.again = false; runBeat(); } }
  }
  function onRunData(j) {
    if (!run) return; run.cur = j.myAdv || null;
    if (run.cur && run.hostId && run.cur.hostId !== run.hostId) { C.toast('The host left the room.'); return void leaveRun(); }   // the host phone is the clock of the fight
    if (run.cur) { const ids = new Set(run.cur.members.map(m => m.id)); const st = Coop.state; if (st) for (const m of st.members) if (!ids.has(m.id)) Coop.dropMember(m.id); }
    evalRun(); drawRun();
  }
  function evalRun() {
    if (!run || run.ending) return; const r = run.cur;
    if (!r) return endRun('left');                                              // the room is gone / I was dropped
    if (r.state === 'room' || !r.run || r.run.id !== run.id) return endRun('done');   // the party finished the last stage
    if (run.phase === 'wait' && r.run.stage > run.si) startStage(r.run.stage);  // everybody cleared it: next stage, all together
  }
  function drawRun() {
    if (!run) return; const r = run.cur, rm = r && r.run, me_ = C.player ? C.player.id : null;
    const rows = (r ? r.members : []).map(m => ({ name: m.name, id: m.id, st: (rm && rm.m && rm.m[m.id]) || 'fight' }));
    run.hud.style.display = run.phase === 'fight' ? 'flex' : 'none';
    run.hud.replaceChildren(h('span', { class: 'cs' }, 'Stage ' + (run.si + 1) + ' / ' + run.total), ...rows.map(m => h('span', { style: '--c:' + ST[m.st][1] }, h('i'), m.name + (m.id === me_ ? ' (you)' : ''))));
    if (run.wait) {
      const mem = run.wait.querySelector('.mem'), left = rows.filter(m => m.st !== 'won').length, last = run.si + 1 >= run.total;
      mem.replaceChildren(...rows.map(m => h('div', { style: '--c:' + ST[m.st][1] }, h('span', null, m.name + (m.id === me_ ? ' (you)' : '')), h('span', null, h('i'), ST[m.st][0]))));
      run.wait.querySelector('.wl').textContent = left > 0 ? 'Waiting for your teammates (' + (rows.length - left) + ' / ' + rows.length + ' ready)...' : (last ? 'Adventure complete!' : 'Next stage starts now...');
    }
  }
  async function leaveRun() {
    if (!run || run.ending) return;
    try { await C.live.call('adv/leave'); } catch (e) { }
    endRun('left');
  }
  function endRun(kind) {   // back to the room (or the lobby if I left)
    if (!run || run.ending) return; run.ending = true;
    clearInterval(run.tick); if (run.unsub) run.unsub(); clearWait(); run.hud.remove();
    try { Coop.close(); } catch (e) { }
    run = null;
    try { Loot.cb = null; clearInterval(Loot.timer); if (Loot.el) Loot.el.hidden = true; } catch (e) { }
    try { $('over').hidden = true; $('hud').hidden = true; $('touch').hidden = true; G.mode = 'menu'; Adventure.active = false; } catch (e) { }
    C.toast(kind === 'done' ? 'Adventure complete! Back to your room.' : 'You left the adventure.');
    UI.show('title');   // the online page now brings the player back to the room (or the Adventure lobby)
  }

  // ===================== open / close =====================
  function open(ctx) {
    C = ctx; css(); S.view = null; S.sig = '';
    el = h('div', { class: 'av' }); C.root.replaceChildren(el); fit();
    onResize = () => fit(); addEventListener('resize', onResize);
    if (unsub) unsub(); unsub = C.live.subscribe(onData);
    const l = C.live.last; if (l) { S.online = l.online || []; S.rooms = l.advRooms || []; S.my = l.myAdv || null; S.invites = l.advInvites || []; }
    route();
  }
  function close() { removeEventListener('resize', onResize); if (unsub) { unsub(); unsub = null; } if (S.banner) { S.banner.dead = true; S.banner.remove(); } }
  return { open, close };
})();
