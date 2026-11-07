/* ONLINE MODE (client) - only used by the online page (index_server.html). The offline game never loads this file.
   Flow: Online button -> guest account (long recovery code) -> choose one of the 10 robots -> town (arena, league, hall of fame, adventure, shop, workshop).
   The server (Render) owns the account; this file only shows screens and asks the server. Set ONLINE_API after the Render server is live. */
'use strict';
const ONLINE_API = 'https://death-bound-server.onrender.com';   // <- address of your Render web service (no slash at the end)

const OnlineUI = (() => {
  // ---------- tiny helpers ----------
  const h = (tag, attrs, ...kids) => { const e = document.createElement(tag); for (const k in (attrs || {})) { if (k === 'class') e.className = attrs[k]; else if (k.startsWith('on')) e[k] = attrs[k]; else if (attrs[k] != null) e.setAttribute(k, attrs[k]); } for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c)); return e; };
  let root = null, view = null, session = null;   // session = { token, player }

  const css = `
#onl{position:fixed;inset:0;z-index:50;background:#0b1020;color:#eef3ff;font-family:var(--body,sans-serif);display:flex;align-items:center;justify-content:center;overflow:hidden}
#onl[hidden]{display:none}
#onl .center{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;box-sizing:border-box;width:100%;height:100%;overflow:auto;background:radial-gradient(ellipse at 50% 30%,#18264a,#080c18)}
#onl .box{background:rgba(12,18,34,.92);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:18px 20px;max-width:min(94vw,520px);width:100%;box-sizing:border-box;text-align:center}
#onl h2{font-family:var(--disp,sans-serif);font-weight:400;font-size:24px;margin:0 0 8px;color:#ffc15a}
#onl p{margin:6px 0;color:#c9d4ee;font-size:16px;line-height:1.35}
#onl .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:10px}
#onl .code{font:700 clamp(15px,4.4vw,24px) 'Courier New',monospace;letter-spacing:1px;background:#050813;border:2px dashed #ffc15a;border-radius:10px;padding:12px 8px;margin:10px 0;color:#fff;user-select:all;-webkit-user-select:all;word-break:break-all}
#onl input.in{width:100%;box-sizing:border-box;font:700 18px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:12px;border-radius:10px;border:2px solid #34456e;background:#050813;color:#fff;text-align:center}
#onl .err{color:#ff7a6d;min-height:20px;font-weight:700}
#onl .warn{color:#ffd27a;font-weight:700}
#onl .robots{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;width:min(96vw,900px)}
#onl .rb{background:rgba(22,31,56,.92);border:2px solid rgba(255,255,255,.14);border-radius:12px;padding:6px 4px;cursor:pointer;text-align:center;color:#fff}
#onl .rb img{width:100%;aspect-ratio:1;object-fit:contain;display:block}
#onl .rb b{display:block;font-size:clamp(11px,1.7vw,16px);letter-spacing:.5px}
#onl .rb.sel{border-color:#ffc15a;background:rgba(80,56,14,.9);box-shadow:0 0 18px rgba(255,193,90,.5)}
#onl .stage{position:relative;width:min(100vw,calc(100vh*16/9));aspect-ratio:16/9;background:#000 center/100% 100% no-repeat;flex:none}
#onl .hs{position:absolute;border-radius:16px;cursor:pointer;background:rgba(255,230,140,0);transition:background .15s,box-shadow .15s;-webkit-tap-highlight-color:transparent}
#onl .hs:hover,#onl .hs:active{background:rgba(255,230,140,.18);box-shadow:0 0 0 3px rgba(255,230,140,.55)}
#onl .lb{position:absolute;transform:translate(-50%,-50%);font:400 clamp(11px,2.5vw,30px) var(--disp,sans-serif);color:#fff3c8;text-shadow:-2px -2px 0 #5a2a00,2px -2px 0 #5a2a00,-2px 2px 0 #5a2a00,2px 2px 0 #5a2a00,0 3px 6px rgba(0,0,0,.6);white-space:nowrap;cursor:pointer;letter-spacing:.5px;-webkit-tap-highlight-color:transparent}
#onl .top{position:absolute;left:0;right:0;top:0;display:flex;gap:8px;align-items:center;padding:6px 8px;background:linear-gradient(rgba(6,10,22,.85),rgba(6,10,22,0));z-index:2}
#onl .me{display:flex;align-items:center;gap:8px;background:rgba(12,18,34,.85);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:3px 12px 3px 4px}
#onl .me img{width:clamp(30px,6vh,48px);height:clamp(30px,6vh,48px);object-fit:contain;border-radius:8px;background:#1a2440}
#onl .me b{display:block;font-size:clamp(12px,2.4vh,17px);line-height:1.05}
#onl .me small{color:#ffc15a;font-size:clamp(10px,2vh,14px)}
#onl .sp{flex:1}
#onl .btn.sm{font-size:clamp(11px,2.3vh,15px);padding:6px 12px}
#onl .pop{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;background:rgba(4,6,14,.6)}
`;

  function ensure() {
    if (root) return;
    document.head.append(h('style', null, css));
    root = h('div', { id: 'onl', hidden: '' }); document.body.append(root);
  }
  const set = (...kids) => { root.replaceChildren(...kids); };
  const toastMsg = m => { const t = document.getElementById('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toastMsg.k); toastMsg.k = setTimeout(() => t.classList.remove('on'), 2200); };
  const beep = () => { try { Snd.init(); Snd.play('beep'); } catch (e) { } };
  const btn = (txt, fn, cls) => h('button', { class: 'btn' + (cls ? ' ' + cls : ''), onclick: () => { beep(); fn(); } }, txt);

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

  // ---------- screens ----------
  function welcome(err) {
    const inp = h('input', { class: 'in', placeholder: 'RW-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX', maxlength: '40', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
    const er = h('div', { class: 'err' }, err || '');
    set(h('div', { class: 'center' },
      h('div', { class: 'box' }, h('h2', null, 'Play online'), h('p', null, 'No sign-up. You get a guest account and a long recovery code.'),
        h('div', { class: 'row' }, btn('Play as guest', createGuest), btn('Back', close, 'alt'))),
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
    try { const j = await api('/api/login', { code }); session = { token: j.token, player: j.player }; store.set('otoken', j.token); store.set('ocode', String(code).trim().toUpperCase()); next(); }
    catch (e) { welcome(e.message); }
  }
  function showCode(code, first) {
    const cp = () => { try { navigator.clipboard.writeText(code).then(() => toastMsg('Code copied'), () => toastMsg('Press and hold the code to copy it')); } catch (e) { toastMsg('Press and hold the code to copy it'); } };
    set(h('div', { class: 'center' }, h('div', { class: 'box' },
      h('h2', null, first ? 'Your recovery code' : 'My recovery code'),
      h('p', { class: 'warn' }, 'Save this code now (screenshot or write it down).'),
      h('div', { class: 'code' }, code),
      h('p', null, 'It is the ONLY way to get your account back on a new phone or after reinstalling. Never share it: anyone with the code can play as you.'),
      h('div', { class: 'row' }, btn('Copy code', cp, 'alt'), btn(first ? 'I saved it - continue' : 'Close', first ? next : town)))));
  }
  function chooseRobot() {
    const R = Assets.robots.robots; let pick = session.player.robot >= 0 ? session.player.robot : 0;
    const cells = R.map((r, i) => h('div', { class: 'rb' + (i === pick ? ' sel' : ''), onclick: () => { beep(); pick = i; cells.forEach((c, j) => c.classList.toggle('sel', j === i)); } }, h('img', { src: 'assets/robots/front/' + r.id + '.webp', alt: '' }), h('b', null, r.name)));
    const er = h('div', { class: 'err' });
    set(h('div', { class: 'center' }, h('h2', { style: 'margin:0' }, 'Choose your robot'), h('div', { class: 'robots' }, cells), er,
      h('div', { class: 'row' }, btn('Choose', async () => {
        try { const j = await api('/api/robot', { robot: pick }, session.token); session.player = j.player; town(); } catch (e) { if (e.status === 401) return expired(); er.textContent = e.message; }
      }), session.player.robot >= 0 ? btn('Cancel', town, 'alt') : btn('Back', close, 'alt'))));
  }
  const BUILDINGS = [   // coordinates are on the 1600x900 town picture: label point + clickable rectangle
    { id: 'hall', name: 'Hall of Fame', lx: 390, ly: 205, x: 315, y: 235, w: 155, h: 330, text: 'See the top leagues and the strongest players by power.' },
    { id: 'league', name: 'League House', lx: 150, ly: 405, x: 20, y: 440, w: 265, h: 235, text: 'Join a league, or create your own. League vs league fights.' },
    { id: 'arena', name: 'Arena', lx: 800, ly: 262, x: 580, y: 300, w: 440, h: 325, text: 'Sports fights in rooms: 1 vs 1, 2 vs 2, 3 vs 3 up to 4 vs 4.' },
    { id: 'gate', name: 'Adventure Gate', lx: 1380, ly: 282, x: 1230, y: 300, w: 300, h: 225, text: 'Go on Adventure together with up to 4 players.' },
    { id: 'shop', name: 'Shop', lx: 1235, ly: 545, x: 1115, y: 565, w: 240, h: 200, text: 'Buy weapons and items for your robot.' },
    { id: 'work', name: 'Workshop', lx: 470, ly: 805, x: 365, y: 595, w: 210, h: 180, text: 'Forge and upgrade your gear.' },
  ];
  function town() {
    view = 'town';
    const p = session.player, r = Assets.robots.robots[p.robot] || Assets.robots.robots[0];
    const stage = h('div', { class: 'stage', style: "background-image:url('assets/online/town.png')" });
    for (const b of BUILDINGS) {
      const go = () => { beep(); building(b); };
      stage.append(h('div', { class: 'hs', style: `left:${b.x / 16}%;top:${b.y / 9}%;width:${b.w / 16}%;height:${b.h / 9}%`, onclick: go }));
      stage.append(h('div', { class: 'lb', style: `left:${b.lx / 16}%;top:${b.ly / 9}%`, onclick: go }, b.name));
    }
    stage.append(h('div', { class: 'top' },
      h('div', { class: 'me' }, h('img', { src: 'assets/robots/front/' + r.id + '.webp', alt: '' }), h('div', null, h('b', null, p.name), h('small', null, r.name + '  |  Power ' + p.power))),
      h('div', { class: 'sp' }),
      btn('My code', () => showCode(store.get('ocode', 'Not saved on this phone - use your written copy'), false), 'alt sm'),
      btn('Robot', chooseRobot, 'alt sm'),
      btn('Exit', close, 'alt sm')));
    set(stage);
  }
  function building(b) {
    const pop = h('div', { class: 'pop', onclick: e => { if (e.target === pop) pop.remove(); } }, h('div', { class: 'box' }, h('h2', null, b.name), h('p', null, b.text), h('p', { class: 'warn' }, 'Coming next.'), h('div', { class: 'row' }, btn('OK', () => pop.remove()))));
    root.firstChild.append(pop);
  }
  function expired() { session = null; store.set('otoken', ''); welcome('Your session ended. Log in with your code.'); }
  function next() { session.player.robot >= 0 ? town() : chooseRobot(); }
  function close() { root.hidden = true; view = null; }

  async function open() {
    ensure(); root.hidden = false; try { goLandscape(); } catch (e) { }
    const tok = store.get('otoken', '');
    if (tok) {   // returning player on this phone
      busy('Connecting...');
      try { const j = await api('/api/me', {}, tok); session = { token: tok, player: j.player }; return next(); }
      catch (e) { if (e.status !== 401) return welcome(e.message); }
    }
    welcome();
  }
  return { open, close };
})();
