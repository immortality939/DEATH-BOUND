/* DAILY REWARDS (the arrow-down button on the very right side of the online town). One file, loaded with the other online scripts (see index_server.html).
   Tap the arrow  ->  a tall panel opens with 3 things:  Daily Reward (calendar)  |  Gold Chest  |  Stone Chest.

   DAILY REWARD  - tap it and the 30-day calendar slides in from the right. One reward per real day, in order (Day 1, Day 2 ...). Claimed days show claimed.png.
                   Days 10, 20 and 30 are ADS days (ads.png). After day 30 the calendar starts again from day 1.
   GOLD CHEST    - chips.   6 rewards a day: 5 min -> 200 | 15 min -> 300 | 30 min -> 500, then the chest gets the ADS badge: 5 min -> 300 | 15 min -> 500 | 30 min -> 700
   STONE CHEST   - stones.  6 rewards a day: 5 min -> Lv1 | 15 min -> Lv2 | 30 min -> Lv3 (1 each), then ADS: 5 min -> Lv1 x2 | 15 min -> Lv2 x2 | 30 min -> Lv3 x3
   When the countdown ends the chest animates (closed <-> open). Tap it, the open chest shows the reward, press Claim.
   Everything is refreshed every day at midnight UTC+8 (same day as the Quests). After the 6th reward the chest is done until tomorrow.

   Rewards are sent to the ENVELOPE (Mail icon) exactly like quest rewards (same server route /api/quest/claim, ids start with "dl_"), so the server needs NO change:
   it only lets each id be claimed once per day. The progress (calendar day, chest step + timer) is saved with the character (store key 'daily', also in the cloud save).

   TO CHANGE THE REWARDS: edit CAL (30 days), GOLD and STONE below. Nothing else.
   ADS: there is no ad system in the game yet. showAd() calls window.DB_SHOW_AD(done) (or the same function on the parent window) if you add one later; until then the ads rewards are given without an ad. */
'use strict';
const Daily = (() => {
  const DAY_OFFSET_H = 8;   // same as quests_server.js / server.js (qDay): the day changes at midnight of UTC+8
  const dayKey = () => new Date(Date.now() + DAY_OFFSET_H * 36e5).toISOString().slice(0, 10);
  const msLeft = () => { const n = Date.now() + DAY_OFFSET_H * 36e5; return (Math.floor(n / 864e5) + 1) * 864e5 - n; };
  const IMG = 'assets/online/daily/', MIN = 60000;

  // ---------- THE REWARDS (edit here) ----------
  // chips: { chips: N }   item by id: { id, qty }   a shop item picked by type + rarity: { pick: 'weapon' | 'glove' | 'wings', rar }   ads: true  (the slot shows ads.png)
  const CAL = [null,
    { chips: 100 }, { pick: 'weapon', rar: 'common' }, { id: 'mat_stone1' }, { id: 'mat_amu1' },                                     // 1-4
    { chips: 200 }, { pick: 'weapon', rar: 'rare' }, { id: 'mat_stone2' }, { id: 'mat_amu2' },                                       // 5-8
    { chips: 300 }, { pick: 'wings', rar: 'common', ads: true },                                                                     // 9, 10 (ADS)
    { pick: 'glove', rar: 'common' }, { id: 'mat_stone3' }, { id: 'mat_sup1' }, { chips: 400 },                                      // 11-14
    { pick: 'glove', rar: 'rare' }, { id: 'mat_stone4' }, { id: 'mat_amu1' }, { chips: 500 },                                        // 15-18
    { pick: 'weapon', rar: 'epic' }, { id: 'mat_amu3', ads: true },                                                                  // 19, 20 (ADS)
    { id: 'mat_stone5' }, { id: 'mat_amu2' }, { chips: 300 }, { pick: 'glove', rar: 'epic' },                                        // 21-24
    { id: 'mat_stone2' }, { id: 'mat_sup1' }, { chips: 500 }, { pick: 'weapon', rar: 'rare' },                                       // 25-28
    { id: 'mat_stone3' }, { id: 'heal_divine_rare', ads: true },                                                                     // 29, 30 (ADS)
  ];
  // chests: 6 steps a day. wait = minutes until the reward is ready (it counts from the moment the previous reward was claimed; the first one from the start of the day)
  const GOLD = [{ m: 5, chips: 200 }, { m: 15, chips: 300 }, { m: 30, chips: 500 }, { m: 5, chips: 300, ad: 1 }, { m: 15, chips: 500, ad: 1 }, { m: 30, chips: 700, ad: 1 }];
  const STONE = [{ m: 5, id: 'mat_stone1', qty: 1 }, { m: 15, id: 'mat_stone2', qty: 1 }, { m: 30, id: 'mat_stone3', qty: 1 },
    { m: 5, id: 'mat_stone1', qty: 2, ad: 1 }, { m: 15, id: 'mat_stone2', qty: 2, ad: 1 }, { m: 30, id: 'mat_stone3', qty: 3, ad: 1 }];
  const CHESTS = { g: { name: 'Gold Chest', list: GOLD, img: 'chest_gold' }, s: { name: 'Stone Chest', list: STONE, img: 'chest_stone' } };

  // ---------- state (saved with the character) ----------
  let C = null, tm = 0, panel = null, calBox = null, chestPop = null, btnEl = null, busy = false, lastSig = '';
  const fresh = () => ({ day: dayKey(), cal: { c: 0, last: '' }, g: { st: 0, at: Date.now() + GOLD[0].m * MIN }, s: { st: 0, at: Date.now() + STONE[0].m * MIN } });
  function load() {
    let s = null; try { s = store.get('daily', null); } catch (e) { }
    if (!s || typeof s !== 'object' || !s.cal || !s.g || !s.s) { s = fresh(); save(s); return s; }
    if (s.day !== dayKey()) {   // a new day: the chests start again, the calendar waits for today's claim
      const c = s.cal; if (c.c >= 30) { c.c = 0; }
      s = { day: dayKey(), cal: c, g: { st: 0, at: Date.now() + GOLD[0].m * MIN }, s: { st: 0, at: Date.now() + STONE[0].m * MIN } }; save(s);
    }
    return s;
  }
  const save = s => { try { store.set('daily', s); } catch (e) { } };
  const calReady = s => s.cal.last !== s.day && s.cal.c < 30;
  const chestReady = (s, k) => s[k].st < CHESTS[k].list.length && Date.now() >= s[k].at;
  const anyReady = s => calReady(s) || chestReady(s, 'g') || chestReady(s, 's');

  // ---------- reward resolving ----------
  const strHash = t => { let x = 2166136261; for (let i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  const itemOf = id => { try { return itemById(id) || null; } catch (e) { return null; } };
  function pool(kind, rar) {   // the same kind of list the Quests use: only items that exist in the game and are sold (price > 0)
    const src = kind === 'weapon' ? (typeof SHOP_WEAPON_ITEMS !== 'undefined' ? SHOP_WEAPON_ITEMS : []) : kind === 'glove' ? (typeof GLOVE_ITEMS !== 'undefined' ? GLOVE_ITEMS : []) : (typeof WING_ITEMS !== 'undefined' ? WING_ITEMS : []);
    return src.filter(it => it && it.rar === rar && !it.mythic && (() => { try { return itemPrice(it) > 0; } catch (e) { return true; } })()).sort((a, b) => a.id < b.id ? -1 : 1);
  }
  const memo = {};
  function rewardOfDay(d) {   // { chips, items:[{ it, id, qty }], ads }
    if (memo[d]) return memo[d]; const r = CAL[d] || {}; let out = { chips: 0, items: [], ads: !!r.ads };
    if (r.chips) out.chips = r.chips;
    else if (r.id) { const it = itemOf(r.id); if (it) out.items.push({ it, id: it.id, qty: r.qty || 1 }); }
    else if (r.pick) { const L = pool(r.pick, r.rar); if (L.length) { const it = L[strHash('daily' + d) % L.length]; out.items.push({ it, id: it.id, qty: 1 }); } }
    if (!out.chips && !out.items.length) out.chips = 300;   // the item is missing in this build: never give an empty reward
    return memo[d] = out;
  }
  function rewardOfStep(k, i) {
    const r = CHESTS[k].list[i]; if (k === 'g') return { chips: r.chips, items: [], ads: !!r.ad };
    const it = itemOf(r.id); return { chips: it ? 0 : 300, items: it ? [{ it, id: it.id, qty: r.qty }] : [], ads: !!r.ad };
  }
  const fmt = n => (n | 0).toLocaleString();
  const clock = ms => { const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
  const rewardText = rw => [rw.chips ? fmt(rw.chips) + ' Chips' : '', ...rw.items.map(x => x.it.name + (x.qty > 1 ? ' x' + x.qty : ''))].filter(Boolean).join(' + ');

  // ---------- ads hook ----------
  function showAd(done) {
    try { const f = (typeof window.DB_SHOW_AD === 'function' && window.DB_SHOW_AD) || (window.parent && window.parent !== window && typeof window.parent.DB_SHOW_AD === 'function' && window.parent.DB_SHOW_AD); if (f) return f(ok => done(ok !== false)); } catch (e) { }
    done(true);
  }

  // ---------- claim (sends the reward to the envelope) ----------
  async function send(qid, title, rw) {
    await C.api('quest/claim', { qid, daily: 1, day: load().day, title, chips: rw.chips | 0, items: rw.items.map(x => ({ item: x.id, qty: x.qty })) });
  }
  async function claim(qid, title, rw, onOk) {
    if (busy) return; busy = true;
    const go = async () => {
      try { await send(qid, title, rw); onOk(); C.toast('Reward sent to your envelope! Open the Mail icon and tap Claim.'); try { C.nudge(); } catch (e) { } }
      catch (e) {
        if (e && e.status === 401) { busy = false; return C.expired(); }
        if (e && e.status === 409 && /already claimed/i.test(e.message || '')) { onOk(); } else C.toast((e && e.message) || 'Could not claim. Try again.');
      }
      busy = false; refresh(true);
    };
    if (rw.ads) showAd(ok => { if (ok) go(); else { busy = false; C.toast('Watch the ad to get the reward.'); } }); else go();
  }
  function claimCal() {
    const s = load(); if (!calReady(s)) return; const d = s.cal.c + 1, rw = rewardOfDay(d);
    claim('dl_cal', 'Daily Reward Day ' + d, rw, () => { const t = load(); t.cal.c = d; t.cal.last = t.day; save(t); });
  }
  function claimChest(k) {
    const s = load(); if (!chestReady(s, k)) return; const i = s[k].st, r = CHESTS[k].list, rw = rewardOfStep(k, i);
    claim('dl_' + k + (i + 1), CHESTS[k].name + ' ' + (i + 1) + '/6', rw, () => {
      const t = load(); if (t[k].st !== i) return; t[k].st = i + 1; t[k].at = Date.now() + (r[i + 1] ? r[i + 1].m * MIN : 0); save(t);
      if (chestPop) { chestPop.remove(); chestPop = null; }
    });
  }

  // ---------- look ----------
  const CSS = `
#onl .dl-btn{position:absolute;right:max(6px,env(safe-area-inset-right,0px));top:50%;margin-top:calc(clamp(44px,13vh,70px) / -2);height:clamp(44px,13vh,70px);z-index:35;border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s,filter .12s}
#onl .dl-btn img{height:100%;display:block;filter:drop-shadow(0 3px 3px rgba(0,0,0,.55));pointer-events:none}
#onl .dl-btn:active{transform:scale(1.07);filter:brightness(1.15)}
#onl .dl-btn.open img{transform:rotate(180deg)}
#onl .dl-dot{position:absolute;top:-3px;right:-3px;width:16px;height:16px;border-radius:50%;background:#e8402f;border:2px solid #fff2da;box-sizing:border-box;pointer-events:none;display:none;animation:dlpulse 1s infinite}
@keyframes dlpulse{50%{transform:scale(1.25)}}
#onl .dl-back{position:absolute;inset:0;z-index:25}
#onl .dl-panel{--ph:calc(100vh - 16px);position:absolute;top:8px;right:calc(max(6px,env(safe-area-inset-right,0px)) + clamp(44px,13vh,70px) * 1.48 + 8px);height:var(--ph);width:calc(var(--ph) * .379);z-index:30;background:url(${IMG}panel_tall.png) 0 0/100% 100% no-repeat;animation:dlin .22s ease-out;filter:drop-shadow(0 6px 10px rgba(0,0,0,.55))}
@keyframes dlin{from{transform:translateX(40px);opacity:0}}
#onl .dl-in{position:absolute;left:21%;right:21%;top:14%;bottom:7%;display:flex;flex-direction:column;justify-content:space-around;align-items:center}
#onl .dl-it{position:relative;width:100%;cursor:pointer;text-align:center;-webkit-tap-highlight-color:transparent}
#onl .dl-it>img.m{width:100%;display:block;filter:drop-shadow(0 3px 3px rgba(0,0,0,.45));pointer-events:none}
#onl .dl-it:active>img.m{transform:scale(1.05)}
#onl .dl-it .tx{display:block;margin-top:2px;font:400 clamp(10px,3vh,15px)/1.1 var(--disp,sans-serif);color:#fff;text-shadow:0 1px 0 #4a1f06,0 0 4px #4a1f06,1px 1px 0 #4a1f06,-1px -1px 0 #4a1f06}
#onl .dl-it .tx.rd{color:#7dff7d}
#onl .dl-it .dot{position:absolute;top:-4px;right:-4px;width:15px;height:15px;border-radius:50%;background:#e8402f;border:2px solid #fff2da;box-sizing:border-box;display:none;animation:dlpulse 1s infinite}
#onl .dl-it .ad{position:absolute;right:-12%;bottom:12%;width:50%;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6))}
#onl .dl-it.done>img.m{filter:grayscale(1) brightness(.7)}
#onl .dl-it .cc{position:relative}
#onl .dl-it .cc img{width:100%;display:block;pointer-events:none}
#onl .dl-it .cc img.op{position:absolute;left:50%;bottom:0;width:var(--ow,96%);transform:translateX(-50%);opacity:0}
#onl .dl-it.go .cc img.cl{animation:dlcl 1.1s infinite}
#onl .dl-it.go .cc img.op{animation:dlop 1.1s infinite}
#onl .dl-it.go .cc{animation:dlhop 1.1s infinite}
@keyframes dlcl{0%,45%{opacity:1}55%,100%{opacity:0}}
@keyframes dlop{0%,45%{opacity:0}55%,100%{opacity:1}}
@keyframes dlhop{0%,45%,100%{transform:translateY(0)}25%{transform:translateY(-4%)}75%{transform:translateY(-4%)}}
#onl .dl-it.done .cc{filter:grayscale(1) brightness(.7)}
#onl .dl-cal{position:absolute;top:50%;right:calc(max(6px,env(safe-area-inset-right,0px)) + clamp(44px,13vh,70px) * 1.48 + 8px + (100vh - 16px) * .379 + 6px);transform:translateY(-50%);width:min(calc(100vw - (100vh - 16px) * .379 - clamp(44px,13vh,70px) * 1.48 - 30px),calc((100vh - 16px) * 1.76));aspect-ratio:604/323;z-index:30;background:url(${IMG}panel_cal.png) 0 0/100% 100% no-repeat;animation:dlcalin .28s ease-out;filter:drop-shadow(0 6px 10px rgba(0,0,0,.55));font-size:calc(min(100vw - (100vh - 16px) * .379 - 120px,(100vh - 16px) * 1.76) / 40)}
@keyframes dlcalin{from{transform:translate(60px,-50%);opacity:0}}
#onl .dl-cal .gr{position:absolute;left:5.2%;right:5.2%;top:8%;bottom:25%;overflow-y:auto;display:grid;grid-template-columns:repeat(5,1fr);gap:.5em .4em;align-content:start;scrollbar-width:none}
#onl .dl-cal .gr::-webkit-scrollbar{display:none}
#onl .dl-sl{position:relative;aspect-ratio:210/128;background-size:100% 100%;background-repeat:no-repeat;cursor:pointer}
#onl .dl-sl .ic{position:absolute;left:12%;right:12%;top:37%;bottom:16%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
#onl .dl-sl .ic img{max-width:100%;max-height:64%;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}
#onl .dl-sl .ic b{font:400 .95em/1 var(--disp,sans-serif);color:#6a3407;margin-top:.1em;white-space:nowrap}
#onl .dl-sl .ad{position:absolute;right:-3%;bottom:-6%;width:38%;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6))}
#onl .dl-sl .ok{position:absolute;left:24%;top:34%;width:52%;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
#onl .dl-sl.got .ic{opacity:.45}
#onl .dl-sl.now{filter:drop-shadow(0 0 5px #fff36a) drop-shadow(0 0 9px #ffb400);z-index:2}
#onl .dl-sl.now.can{animation:dlglow 1s infinite}
@keyframes dlglow{50%{filter:drop-shadow(0 0 8px #fff) drop-shadow(0 0 14px #ffd000)}}
#onl .dl-cal .ft{position:absolute;left:5.2%;right:5.2%;bottom:5.5%;height:17%;display:flex;align-items:center;justify-content:center;gap:1em;font:400 1.55em/1.05 var(--disp,sans-serif);color:#6a3407;text-align:center}
#onl .dl-cal .ft img.cb{height:100%;cursor:pointer;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}
#onl .dl-cal .ft img.cb.off{filter:grayscale(1) brightness(.75);cursor:default}
#onl .dl-cal .ft small{font-size:.78em;color:#7a4a14}
#onl .dl-cal .xx{position:absolute;right:1.2%;top:-3%;width:7%;aspect-ratio:1;border-radius:50%;background:linear-gradient(#e0583f,#9a1f12);border:.2em solid #ffe3a0;color:#fff;font:400 1.6em/1.35 var(--disp,sans-serif);text-align:center;cursor:pointer}
#onl .dl-pp{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(4,6,14,.6)}
#onl .dl-pb{position:relative;height:min(92vh,360px);aspect-ratio:604/323;background:url(${IMG}panel_cal.png) 0 0/100% 100% no-repeat;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6% 10%;box-sizing:border-box;text-align:center;font-size:min(3.2vh,15px);color:#6a3407;font-family:var(--disp,sans-serif)}
#onl .dl-pb h3{margin:0;font:400 1.5em/1 var(--disp,sans-serif);color:#6a3407}
#onl .dl-pb .cc{position:relative;height:42%;aspect-ratio:1.2;margin:.2em 0}
#onl .dl-pb .cc img{position:absolute;left:50%;bottom:0;height:100%;transform:translateX(-50%);filter:drop-shadow(0 3px 3px rgba(0,0,0,.45))}
#onl .dl-pb .cc img.ad{left:auto;right:-30%;transform:none;height:55%;bottom:0}
#onl .dl-pb .rw{display:flex;gap:.6em;align-items:center;justify-content:center;font-size:1.25em;line-height:1.1}
#onl .dl-pb .rw img{height:1.9em;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}
#onl .dl-pb .st{font-size:1.05em;margin:.15em 0;color:#7a4a14}
#onl .dl-pb img.cb{height:2.9em;cursor:pointer;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}
#onl .dl-pb img.cb.off{filter:grayscale(1) brightness(.75);cursor:default}
`;
  const cssOnce = () => { if (!document.getElementById('dlCss')) { const s = document.createElement('style'); s.id = 'dlCss'; s.textContent = CSS; document.head.append(s); } };
  const el = (tag, attrs, ...kids) => C.h(tag, attrs, ...kids);
  const rwIcons = rw => { const o = []; if (rw.chips) o.push(el('img', { src: 'assets/chip.png', alt: '' })); for (const x of rw.items) if (x.it.img) o.push(el('img', { src: x.it.img, alt: '' })); return o; };

  // ---------- the arrow button ----------
  function button() {
    cssOnce(); closeAll(); const dot = el('i', { class: 'dl-dot' });
    btnEl = el('button', { class: 'dl-btn', 'aria-label': 'Daily rewards', onclick: () => { C.beep(); panel && panel.isConnected ? closeAll() : openPanel(); } }, el('img', { src: IMG + 'btn_arrow.png', alt: 'Daily rewards' }), dot);
    btnEl._dot = dot; refresh(true); return btnEl;
  }
  function closeAll() {
    if (chestPop) { chestPop.remove(); chestPop = null; } if (calBox) { calBox.remove(); calBox = null; }
    if (panel) { panel.remove(); panel = null; } if (backEl) { backEl.remove(); backEl = null; } if (btnEl) btnEl.classList.remove('open');
  }
  let backEl = null;

  // ---------- the tall panel ----------
  function openPanel() {
    const t = C.parent(); if (!t) return; cssOnce(); closeAll(); load();
    backEl = el('div', { class: 'dl-back', onclick: () => { closeAll(); } });
    panel = el('div', { class: 'dl-panel' }, el('div', { class: 'dl-in' }));
    t.append(backEl, panel); if (btnEl) btnEl.classList.add('open');
    drawPanel();
  }
  function chestItem(k, s) {
    const C_ = CHESTS[k], st = s[k].st, done = st >= C_.list.length, go = !done && Date.now() >= s[k].at, ads = !done && C_.list[st].ad;
    const it = el('div', { class: 'dl-it' + (go ? ' go' : '') + (done ? ' done' : ''), 'data-k': k, onclick: () => { C.beep(); openChest(k); } },
      el('div', { class: 'cc', style: '--ow:' + (k === 'g' ? '95.7%' : '97.4%') }, el('img', { class: 'cl', src: IMG + C_.img + '_closed.png', alt: '' }), el('img', { class: 'op', src: IMG + C_.img + '_open.png', alt: '' })),
      ads ? el('img', { class: 'ad', src: IMG + 'ads.png', alt: 'ADS' }) : null,
      el('span', { class: 'tx' + (go ? ' rd' : '') }, done ? 'Tomorrow' : go ? 'Ready!' : clock(s[k].at - Date.now())), el('i', { class: 'dot', style: go ? 'display:block' : '' }));
    return it;   // the closed picture defines the size, the open one is laid on top of it (it only shows while the chest is ready)
  }
  function drawPanel() {
    if (!panel) return; const s = load(), box = panel.firstChild;
    const cal = el('div', { class: 'dl-it', onclick: () => { C.beep(); openCal(); } }, el('img', { class: 'm', src: IMG + 'daily_reward.png', alt: 'Daily Reward' }),
      el('span', { class: 'tx' + (calReady(s) ? ' rd' : '') }, calReady(s) ? 'Claim!' : 'Day ' + Math.min(30, s.cal.c)), el('i', { class: 'dot', style: calReady(s) ? 'display:block' : '' }));
    box.replaceChildren(cal, chestItem('g', s), chestItem('s', s)); lastSig = sig(s);
  }
  const sig = s => [s.day, s.cal.c, s.cal.last, s.g.st, chestReady(s, 'g') ? 1 : 0, s.s.st, chestReady(s, 's') ? 1 : 0].join('|');
  function tickPanel(s) {   // every second: only the timers (so a tap is never lost by a redraw)
    if (!panel) return; if (sig(s) !== lastSig) return drawPanel();
    for (const k of ['g', 's']) { const n = panel.querySelector('[data-k="' + k + '"] .tx'); if (n && s[k].st < CHESTS[k].list.length && Date.now() < s[k].at) n.textContent = clock(s[k].at - Date.now()); }
  }

  // ---------- chest popup (open chest + reward + Claim) ----------
  function openChest(k) {
    const t = C.parent(); if (!t) return; if (chestPop) chestPop.remove();
    const C_ = CHESTS[k]; chestPop = el('div', { class: 'dl-pp', onclick: e => { if (e.target === chestPop) { chestPop.remove(); chestPop = null; } } });
    t.append(chestPop); drawChest(k);
  }
  function drawChest(k) {
    if (!chestPop) return; const s = load(), C_ = CHESTS[k], st = s[k].st, done = st >= C_.list.length;
    const go = !done && Date.now() >= s[k].at, rw = done ? null : rewardOfStep(k, st), left = done ? 0 : s[k].at - Date.now();
    const body = el('div', { class: 'dl-pb' }, el('div', { class: 'xx dl-x', style: 'position:absolute;right:2%;top:-2%;width:2em;height:2em;border-radius:50%;background:linear-gradient(#e0583f,#9a1f12);border:.15em solid #ffe3a0;color:#fff;font:400 1.2em/1.7 var(--disp,sans-serif);cursor:pointer', onclick: () => { C.beep(); chestPop.remove(); chestPop = null; } }, 'X'),
      el('h3', null, C_.name + (done ? '' : '  ' + (st + 1) + '/' + C_.list.length)),
      el('div', { class: 'cc' }, el('img', { src: IMG + C_.img + (go ? '_open' : '_closed') + '.png', alt: '' }), rw && rw.ads ? el('img', { class: 'ad', src: IMG + 'ads.png', alt: 'ADS' }) : null),
      done ? el('div', { class: 'rw' }, 'All 6 rewards claimed. Come back tomorrow!') : el('div', { class: 'rw' }, ...rwIcons(rw), rewardText(rw)),
      done ? null : el('div', { class: 'st' }, go ? (rw.ads ? 'Watch the ad to claim' : 'Ready to claim!') : 'Ready in ' + clock(left)),
      done ? null : el('img', { class: 'cb' + (go ? '' : ' off'), src: IMG + 'claim_btn.png', alt: 'Claim', onclick: () => { if (!go) return C.toast('Not ready yet: ' + clock(s[k].at - Date.now())); C.beep(); claimChest(k); } }));
    chestPop.replaceChildren(body); chestPop._k = k;
  }

  // ---------- the calendar (slides in from the right) ----------
  function openCal() {
    const t = C.parent(); if (!t) return; if (calBox) { calBox.remove(); calBox = null; return; } cssOnce();
    calBox = el('div', { class: 'dl-cal' }); t.append(calBox); drawCal(true);
  }
  function drawCal(first) {
    if (!calBox) return; const s = load(), gr = el('div', { class: 'gr' }), keep = calBox.querySelector('.gr'), sc = keep ? keep.scrollTop : 0, next = s.cal.c + 1;
    for (let d = 1; d <= 30; d++) {
      const rw = rewardOfDay(d), got = d <= s.cal.c, now = d === next && calReady(s) , cur = d === next;
      const ic = el('div', { class: 'ic' }, ...rwIcons(rw), el('b', null, rw.chips ? fmt(rw.chips) : rw.items[0].qty > 1 ? 'x' + rw.items[0].qty : ''));
      gr.append(el('div', { class: 'dl-sl' + (got ? ' got' : '') + (cur && !got ? ' now' + (now ? ' can' : '') : ''), style: 'background-image:url(' + IMG + 'slot_' + String(d).padStart(2, '0') + '.png)', onclick: () => { C.beep(); C.toast('Day ' + d + ': ' + rewardText(rw) + (got ? '  (claimed)' : '')); } },
        ic, rw.ads ? el('img', { class: 'ad', src: IMG + 'ads.png', alt: 'ADS' }) : null, got ? el('img', { class: 'ok', src: IMG + 'claimed.png', alt: '' }) : null));
    }
    const can = calReady(s), r = can ? rewardOfDay(next) : null;
    const ft = el('div', { class: 'ft' }, can ? el('img', { class: 'cb', src: IMG + 'claim_btn.png', alt: 'Claim', onclick: () => { C.beep(); claimCal(); } }) : el('img', { class: 'cb off', src: IMG + 'claim_btn.png', alt: 'Claim' }),
      el('div', null, can ? ['Day ' + next + (r.ads ? ' (ADS)' : ''), el('br'), el('small', null, rewardText(r))] : s.cal.c >= 30 ? ['All 30 days claimed!', el('br'), el('small', null, 'New calendar in ' + clock(msLeft()))] : ['Claimed today', el('br'), el('small', null, 'Next reward in ' + clock(msLeft()))]));
    calBox.replaceChildren(gr, ft, el('div', { class: 'xx', onclick: () => { C.beep(); calBox.remove(); calBox = null; } }, 'X'));
    const g = calBox.querySelector('.gr'); if (first) { const n = g.children[Math.min(29, s.cal.c)]; if (n) g.scrollTop = Math.max(0, n.offsetTop - g.clientHeight / 3); } else g.scrollTop = sc;
  }

  // ---------- refresh (every second while online) ----------
  function refresh(force) {
    if (!C) return; const s = load();
    if (btnEl && btnEl.isConnected) { btnEl._dot.style.display = anyReady(s) ? 'block' : 'none'; }
    tickPanel(s);
    if (calBox) { if (!calBox.isConnected) calBox = null; else if (force || !calBox._s || calBox._s !== s.day + s.cal.c + s.cal.last) { calBox._s = s.day + s.cal.c + s.cal.last; drawCal(false); } else { const f = calBox.querySelector('.ft small'); if (f && !calReady(s)) f.textContent = (s.cal.c >= 30 ? 'New calendar in ' : 'Next reward in ') + clock(msLeft()); } }
    if (chestPop) { if (!chestPop.isConnected) chestPop = null; else { const k = chestPop._k, st = s[k].st, go = chestReady(s, k); if (force || chestPop._st !== st + ':' + go || !go) { chestPop._st = st + ':' + go; drawChest(k); } } }
  }
  function start(ctx) { C = ctx; clearInterval(tm); load(); tm = setInterval(() => { try { refresh(false); } catch (e) { } }, 1000); }
  function stop() { clearInterval(tm); tm = 0; closeAll(); C = null; btnEl = null; }
  return { start, stop, button, close: closeAll };
})();
console.log('daily_server.js loaded - daily rewards (calendar + gold chest + stone chest)');
