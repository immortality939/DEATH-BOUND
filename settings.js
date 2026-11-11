/* SETTINGS (the gear icon: town, Arena, Adventure). Downloaded from GitHub the first time it is opened, like auction.js.
   Light-wood panel made with the pictures in assets/online/ui (panel.png border, wood_light.png background, banner.png title, btn_wood.png buttons).
   Every option is saved on this phone (store key 'oprefs') and applied at once. online_game.js applies the saved values every time you enter online (see applyPrefs there).
     Sound effects ON/OFF  - same switch as the offline game (Snd.setMute)
     Volume 0-100          - master volume of all game sounds
     Vibration ON/OFF      - turns navigator.vibrate on/off while you are online
     Chat box (town)       - show or hide the chat box in the town
     Keep screen on        - the phone does not dim while you play (if the phone allows it)
     Account               - My code / Switch server / Exit (only in the town)
   To add an option: add a default in PREF_DEF (online_game.js), one row() below, and (if it needs code) a line in applyPrefs. */
'use strict';
const SettingsUI = (() => {
  const css = `
#onl .wpnl.sx-p{width:min(720px,97vw);max-height:95vh;overflow-y:auto;box-sizing:border-box;background:url(assets/online/ui/wood_light.png) padding-box;background-size:256px 256px;padding:2px 10px 8px}
#onl .sx-p .lgtitle{margin:2px 0 6px}
#onl .sx-g{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}
#onl .sx-card{background:rgba(74,38,10,.30);border:2px solid rgba(255,232,176,.38);border-radius:13px;padding:6px 12px 8px;text-align:left;box-shadow:inset 0 2px 8px rgba(60,28,4,.35),0 2px 0 rgba(255,236,190,.25)}
#onl .sx-h{display:flex;align-items:center;gap:8px;font:400 17px var(--disp,sans-serif);letter-spacing:1px;color:#fff0c0;text-shadow:0 2px 0 #4a1f06,0 0 8px rgba(70,30,0,.6);padding:2px 0 4px}
#onl .sx-h i{font-style:normal;font-size:18px}
#onl .sx-r{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid rgba(255,232,176,.22);min-height:34px}
#onl .sx-h + .sx-r{border-top:0}
#onl .sx-l{flex:1 1 0;min-width:0;font:700 17px/1.15 var(--body,sans-serif);color:#fff6dc;text-shadow:0 1px 0 #3d1b05,0 0 6px rgba(60,26,0,.55)}
#onl .sx-l small{display:block;margin-top:2px;font:600 12px/1.25 var(--body,sans-serif);color:#f6e2b0;text-shadow:0 1px 0 #3d1b05}
#onl .sx-sw{flex:none;position:relative;width:58px;height:30px;border-radius:16px;border:2px solid #4a1f06;padding:0;cursor:pointer;background:linear-gradient(#4a2c12,#6d4520);box-shadow:inset 0 3px 6px rgba(0,0,0,.55),0 1px 0 rgba(255,236,190,.45);transition:background .15s}
#onl .sx-sw::after{content:'';position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7df,#d9b676);border:2px solid #7a4a1f;box-shadow:0 2px 3px rgba(0,0,0,.5);transition:left .15s}
#onl .sx-sw.on{background:linear-gradient(#ffd34a,#e0a53a)}
#onl .sx-sw.on::after{left:30px}
#onl .sx-sw span{position:absolute;top:50%;transform:translateY(-50%);font:400 10px var(--disp,sans-serif);letter-spacing:.5px;color:#f1d9a4;left:28px}
#onl .sx-sw.on span{left:7px;color:#5a2a05}
#onl .sx-vol{flex:1 1 62%;min-width:0;display:flex;align-items:center;gap:9px}
#onl .sx-vol b{flex:none;min-width:44px;text-align:right;font:400 16px var(--disp,sans-serif);color:#ffe9a8;text-shadow:0 2px 0 #4a1f06}
#onl .sx-rng{flex:1;min-width:0;height:28px;margin:0;background:none;-webkit-appearance:none;appearance:none;cursor:pointer;touch-action:none;--p:50%}
#onl .sx-rng::-webkit-slider-runnable-track{height:12px;border-radius:7px;border:2px solid #4a1f06;background:linear-gradient(90deg,#ffd34a 0,#e0a53a var(--p),#4f2e12 var(--p),#6d4520 100%);box-shadow:inset 0 2px 4px rgba(0,0,0,.5)}
#onl .sx-rng::-moz-range-track{height:8px;border-radius:7px;border:2px solid #4a1f06;background:linear-gradient(90deg,#ffd34a 0,#e0a53a var(--p),#4f2e12 var(--p),#6d4520 100%)}
#onl .sx-rng::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7df,#d9b676);border:3px solid #7a4a1f;box-shadow:0 2px 4px rgba(0,0,0,.55)}
#onl .sx-rng::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7df,#d9b676);border:3px solid #7a4a1f}
#onl .sx-b{flex:1 1 0;min-width:0;border:12px solid transparent;border-image:url(assets/online/ui/btn_wood.png) 22 fill / 12px stretch;background:none;padding:0 2px;font:400 15px/1.1 var(--disp,sans-serif);color:#fff;text-shadow:0 2px 0 #4a1f06;cursor:pointer;white-space:nowrap}
#onl .sx-b:active{transform:translateY(2px);filter:brightness(.92)}
#onl .sx-b.red{filter:hue-rotate(-28deg) saturate(1.3)}
#onl .sx-b.sm{flex:none;border-width:9px;font-size:13px;padding:0 6px}
#onl .sx-btns{display:flex;gap:4px;padding:4px 0 0}
#onl .sx-me{display:flex;align-items:center;gap:10px;padding:2px 0 6px}
#onl .sx-me img{width:44px;height:44px;object-fit:contain;border:2px solid #e0a53a;border-radius:11px;background:rgba(40,18,2,.45);padding:2px;box-sizing:content-box}
#onl .sx-note{margin:2px 0 0;font:600 12px/1.3 var(--body,sans-serif);color:#f6e2b0;text-shadow:0 1px 0 #3d1b05}
#onl .sx-foot{margin:7px 0 0;font:600 12px var(--body,sans-serif);letter-spacing:1px;color:#f6e2b0;text-shadow:0 1px 0 #3d1b05;text-align:center}
@media (max-width:600px){#onl .sx-g{grid-template-columns:1fr}}
@media (orientation:landscape) and (max-height:520px){
  #onl .wpnl.sx-p{padding:0 8px 4px}#onl .sx-g{gap:7px}#onl .sx-card{padding:3px 10px 5px;border-radius:11px}
  #onl .sx-h{font-size:15px;padding:1px 0 2px}#onl .sx-r{padding:4px 0;min-height:30px}#onl .sx-l{font-size:15px}#onl .sx-l small{font-size:11px}
  #onl .sx-me img{width:36px;height:36px}#onl .sx-foot{margin-top:4px}#onl .sx-b{font-size:13px}
}`;
  const ensureCss = h => { if (!document.getElementById('sxCss')) document.head.append(h('style', { id: 'sxCss' }, css)); };

  function open(ctx) {
    const h = ctx.h, t = ctx.parent(); if (!t) return; ensureCss(h);
    const old = t.querySelector('.sx-pop'); if (old) old.remove();
    let box = null;
    const close = () => { if (box) box.remove(); box = null; };
    const P = () => ctx.prefs.get();

    // ---- little builders ----
    const sw = (key, onChange) => {
      const b = h('button', { class: 'sx-sw', role: 'switch', type: 'button' }, h('span', null, ''));
      const paint = () => { const on = !!P()[key]; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); b.firstChild.textContent = on ? 'ON' : 'OFF'; };
      b.onclick = () => { const v = !P()[key]; ctx.prefs.set(key, v); paint(); if (onChange) onChange(v); ctx.beep(); };
      paint(); return b;
    };
    const row = (label, sub, ctl) => h('div', { class: 'sx-r' }, h('div', { class: 'sx-l' }, label, sub ? h('small', null, sub) : null), ctl);
    const card = (ico, title, ...rows) => h('div', { class: 'sx-card' }, h('div', { class: 'sx-h' }, h('i', null, ico), title), ...rows);
    const btn = (txt, fn, cls) => h('button', { class: 'sx-b ' + (cls || ''), type: 'button', onclick: () => { ctx.beep(); fn(); } }, txt);

    // ---- sound ----
    const sfx = h('button', { class: 'sx-sw', role: 'switch', type: 'button' }, h('span', null, ''));
    const paintSfx = () => { const on = !Snd.muted; sfx.classList.toggle('on', on); sfx.setAttribute('aria-checked', on); sfx.firstChild.textContent = on ? 'ON' : 'OFF'; };
    sfx.onclick = () => { try { Snd.init(); } catch (e) { } Snd.setMute(!Snd.muted); paintSfx(); if (!Snd.muted) Snd.play('beep'); };
    paintSfx();
    const rng = h('input', { class: 'sx-rng', type: 'range', min: '0', max: '100', step: '5', 'aria-label': 'Volume' });
    const pct = h('b', null, '');
    const showVol = v => { rng.style.setProperty('--p', v + '%'); pct.textContent = v + '%'; };
    rng.value = String(P().vol); showVol(P().vol);
    rng.oninput = () => { const v = +rng.value; showVol(v); ctx.prefs.set('vol', v); };
    rng.onchange = () => { try { Snd.init(); if (!Snd.muted) Snd.play('pick'); } catch (e) { } };
    const vol = h('div', { class: 'sx-vol' }, rng, pct);

    // ---- account (town only: these screens replace the town) ----
    const acc = ctx.inTown
      ? [h('div', { class: 'sx-btns' }, btn('My Code', () => { close(); ctx.actions.code(); }), btn('Servers', () => { close(); ctx.actions.servers(); })),
         h('div', { class: 'sx-btns' }, btn('Exit Game', () => { close(); ctx.actions.exit(); }, 'red'))]
      : [h('p', { class: 'sx-note' }, 'My Code, Servers and Exit are in the town. Go back to the town to use them.')];
    const me = ctx.me ? h('div', { class: 'sx-me' }, ctx.me.img ? h('img', { src: ctx.me.img, alt: '' }) : null,
      h('div', { class: 'sx-l' }, ctx.me.name || 'Player', h('small', null, ctx.me.line || ''))) : null;

    const left = [
      card('🔊', 'Sound',
        row('Sound effects', 'Shots, explosions and menu sounds.', sfx),
        row('Volume', null, vol),
        row('Test sound', null, btn('Play', () => { try { Snd.init(); if (Snd.muted) { Snd.setMute(false); paintSfx(); } Snd.play('win'); } catch (e) { } }, 'sm'))),
      card('📳', 'Feel', row('Vibration', 'Phone vibrates in the game.', sw('vib', v => { if (v) { try { navigator.vibrate && navigator.vibrate(30); } catch (e) { } } })))
    ];
    const right = [
      card('🖥️', 'Display',
        row('Chat box', 'Show the chat box in the town.', sw('chat')),
        row('Keep screen on', 'The screen does not go dark while you play.', sw('awake', v => { if (v && !('wakeLock' in navigator)) ctx.toast('This phone does not support it.'); }))),
      card('👤', 'Account', ...(me ? [me] : []), ...acc)
    ];

    const title = h('div', { class: 'lgtitle' }, h('span', null, 'Settings'), h('div', { class: 'lgx wbtn', onclick: () => { ctx.beep(); close(); } }, 'X'));
    box = h('div', { class: 'pop wood sx-pop', style: 'z-index:66', onclick: e => { if (e.target === box) close(); } },
      h('div', { class: 'wpnl lgw sx-p' }, title,
        h('div', { class: 'sx-g' }, h('div', { style: 'display:grid;gap:10px' }, ...left), h('div', { style: 'display:grid;gap:10px' }, ...right)),
        h('p', { class: 'sx-foot' }, 'DEATH BOUND ONLINE' + (ctx.me && ctx.me.server ? '  ·  SERVER ' + ctx.me.server : ''))));
    t.append(box);
  }
  return { open };
})();
