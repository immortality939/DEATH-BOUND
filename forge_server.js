/* ONLINE VERSION of forge.js - upload this file to GitHub (online game only).
   The offline app keeps using forge.js. Edit the two files separately on purpose. */
'use strict';
// ============================================================================================================
//  FORGE  (upgrade screen, opened with the Forge anvil button in Profile)  +  upgrade MATERIALS (stones, amulets, guardian scroll)
//
//  Drag (or double-tap) an equipment piece into the big centre slot, then fill the other slots:
//     STONES   (right, 3 slots)  ONE stone is enough to try. Drop (or double-tap) a stone and a small box asks HOW MANY to put in that slot (+ / - / type a number).
//                                Each FILLED SLOT adds its success chance once (6% per slot: 3 slots = 18%). The number is a STACK: every try uses only ONE stone
//                                from each filled slot (20 in a slot -> 19 left). More stones in the same slot do NOT raise the chance - fill another slot for that.
//     AMULET   (top left)    gives a % BOOST on top of the stones' total:  18% with a 10% amulet = 18 + 1.8 = 19.8%  (100% max). One amulet is used up per try.
//     GUARDIAN SCROLL (bottom left)  when an item at +ROLLBACK_FROM or higher FAILS it normally drops one level (+5 -> +4).
//                                    With the scroll in its slot the item keeps its level and the scroll is used up.
//  Stones are used up on every try. Amulets are used up on every try. The scroll is only used up when it really saves a level.
//
//  TUNING: ROLLBACK_FROM, AMULET_TYPES (pct / price), SUPPORT_TYPES (price). Success rates + stone costs stay in profile.js (UP_RATE, UP_COST, STONE_TYPES).
//  Art: assets/items/amulet_1..3.png, assets/items/support_1.png
// ============================================================================================================
const ROLLBACK_FROM = 5;   // an item that is +5 or higher loses ONE level when an upgrade fails (unless a Guardian Scroll protects it). Set to 99 to switch rollback off.
const AMULET_TYPES = [
  { n: 'Minor Amulet',   img: 'assets/items/amulet_1.png', pct: 10, price: 1200, col: '#4cff9a', rar: 'rare' },
  { n: 'Blessed Amulet', img: 'assets/items/amulet_2.png', pct: 25, price: 3500, col: '#4fc8ff', rar: 'epic' },
  { n: 'Divine Amulet',  img: 'assets/items/amulet_3.png', pct: 50, price: 9000, col: '#ffd24a', rar: 'legendary' },
];
const SUPPORT_TYPES = [
  { n: 'Guardian Scroll', img: 'assets/items/support_1.png', price: 4000, col: '#c05bff', rar: 'epic' },
];
const MAT_ITEMS = [
  ...STONE_TYPES.map((s, i) => ({ id: 'mat_stone' + (i + 1), kind: 'stone', t: i + 1, img: s.img, name: s.n, type: 'mat', rar: ['common', 'rare', 'epic', 'epic', 'legendary'][i], stats: {}, col: s.col, price: s.price, tag: 'Upgrade stone',
    line: 'Adds to the success chance', desc: 'Drag it (or double-tap it) to a Stone slot of the Forge, then choose how many with + and -. One stone is enough. Each filled slot adds its chance once and a try uses only ONE stone from it, so a stack just lasts longer. More stones in the same slot do not raise the chance: fill another slot. Better stones add more.' })),
  ...AMULET_TYPES.map((a, i) => ({ id: 'mat_amu' + (i + 1), kind: 'amulet', t: i + 1, img: a.img, name: a.n, type: 'mat', rar: a.rar, stats: {}, col: a.col, price: a.price, pct: a.pct, tag: 'Forge amulet',
    line: '+' + a.pct + '% boost', desc: 'Put it in the Amulet slot of the Forge. It boosts the total success chance of your stones by ' + a.pct + '%. One amulet is used up per try.' })),
  ...SUPPORT_TYPES.map((a, i) => ({ id: 'mat_sup' + (i + 1), kind: 'support', t: i + 1, img: a.img, name: a.n, type: 'mat', rar: a.rar, stats: {}, col: a.col, price: a.price, tag: 'Forge support',
    line: 'Stops the level loss', desc: 'Put it in the Support slot of the Forge. If an item at +' + ROLLBACK_FROM + ' or higher fails, it does NOT drop a level. The scroll is only used up when it really saves a level.' })),
];
const matOf = (kind, t) => MAT_ITEMS.find(m => m.kind === kind && m.t === t);
const Mats = {
  key(m) { return m.kind === 'stone' ? stoneKey(m.t) : m.kind === 'amulet' ? 'amu' + m.t : 'sup' + m.t; },
  get(m) { return m.kind === 'stone' ? Stones.get(m.t) : (store.get(this.key(m), 0) | 0); },
  add(m, n) { if (m.kind === 'stone') Stones.add(n, m.t); else store.set(this.key(m), Math.max(0, this.get(m) + (n | 0))); },
  spend(m, n) { if (this.get(m) < n) return false; this.add(m, -n); return true; },
};
MAT_ITEMS.forEach(m => { ITEM_PRICE[m.id] = m.price; });

const fmtK = n => n >= 100000 ? Math.round(n / 1000) + 'k' : n >= 10000 ? (n / 1000).toFixed(1) + 'k' : n.toLocaleString();

const Forge = {
  item: null, st: [{ t: 0, n: 0 }, { t: 0, n: 0 }, { t: 0, n: 0 }], pick: null, amu: 0, sup: 0, sel: null, res: null, flash: '', last: { g: '', t: 0 }, drag: null,
  open(itemId) {
    Profile.data || Profile.load(); if (itemId) { const it = itemById(itemId); if (it && it.type !== 'mat' && !it.potion && !it.noUp && Profile.data.owned.includes(itemId)) this.item = itemId; }
    this.res = null; this.flash = ''; this.sel = null; this.render(); UI.show('forge');
  },
  back() { Profile.mode = 'main'; Profile.sel = this.item && itemById(this.item) ? this.item : null; Profile.msg = null; Profile.render(); UI.show('profile'); },
  // ---- numbers ----
  calc() {
    const it = this.item && itemById(this.item); if (!it || !Profile.data.owned.includes(it.id)) return null;
    const L = Profile.lvl(it.id), maxed = L >= UP_MAX, used = this.st.filter(x => x.t && x.n > 0), need = {};
    used.forEach(x => need[x.t] = (need[x.t] || 0) + 1);   // a try uses ONE stone from each filled slot
    const ok = used.length > 0 && Object.keys(need).every(t => Stones.get(+t) >= need[t]);
    const base = maxed ? 0 : Math.round(used.reduce((a, x) => a + upRate(L, x.t), 0) * 10) / 10,   // one chance per filled slot, however many stones are in it
       am = this.amu ? AMULET_TYPES[this.amu - 1].pct : 0;
    const total = maxed || !used.length ? 0 : Math.min(100, Math.round(base * (1 + am / 100) * 10) / 10);   // amulet = % OF the stones' total
    const risk = !maxed && L >= ROLLBACK_FROM;
    return { it, L, maxed, used, need, ok, base, am, total, risk, prot: risk && this.sup > 0 };
  },
  // ---- placing things ----
  kindOf(slot) { return slot.startsWith('st') ? 'stone' : slot === 'amu' ? 'amulet' : 'support'; },
  fits(slot, id) { const m = itemById(id); if (!m) return false; if (slot === 'item') return m.type !== 'mat' && !m.potion && !m.noUp; return m.type === 'mat' && m.kind === this.kindOf(slot); },
  // stones of type t you can still put into slot k (what you own minus what the other slots already hold)
  avail(k, t) { return Stones.get(t) - this.st.reduce((a, x, i) => a + (i !== k && x.t === t ? x.n : 0), 0); },
  // most stones you can put in slot k = what you own minus what the other slots already hold (the number only sets how many are used up, not the chance)
  maxFor(k, t) { return Math.max(1, this.avail(k, t)); },
  ask(k, t, n) {   // open the "how many?" box for stone slot k
    if (this.avail(k, t) <= 0) { Snd.play('dud'); const m = matOf('stone', t); this.res = { ok: false, t: `You have no more ${m.name}s.` }; this.render(); return; }
    this.pick = { k, t, n: Math.max(1, n || 1), edit: !!n }; this.res = null; this.flash = ''; Snd.play('pick'); this.render();
  },
  put(slot, id) {
    const m = itemById(id);
    if (slot === 'item') this.item = id;
    else if (slot.startsWith('st')) { const k = +slot[2]; this.ask(k, m.t, this.st[k].t === m.t ? this.st[k].n : 0); return; }
    else if (slot === 'amu') this.amu = m.t; else this.sup = m.t;
    this.res = null; this.flash = ''; Snd.play('pick');
  },
  auto(id) {
    const m = itemById(id); if (!m) return; if (m.type !== 'mat') return this.put('item', id);
    if (m.kind === 'stone') { const k = this.st.findIndex(x => !x.t); return this.put('st' + (k < 0 ? 2 : k), id); }   // next empty slot (so the same stone can fill several slots)
    this.put(m.kind === 'amulet' ? 'amu' : 'sup', id);
  },
  clear(slot) { if (slot === 'item') this.item = null; else if (slot.startsWith('st')) this.st[+slot[2]] = { t: 0, n: 0 }; else if (slot === 'amu') this.amu = 0; else this.sup = 0; this.res = null; this.flash = ''; Snd.play('beep'); },
  // ---- the "how many stones?" box ----
  pickTotal() { const p = this.pick, keep = this.st[p.k]; this.st[p.k] = { t: p.t, n: p.n }; const c = this.calc(); this.st[p.k] = keep; return c; },
  drawPick(root) {
    const old = root.querySelector('#fgPick'); if (old) old.remove(); const p = this.pick; if (!p) return;
    const m = matOf('stone', p.t), mx = this.maxFor(p.k, p.t); p.n = Math.max(1, Math.min(mx, p.n));
    const box = document.createElement('div'); box.id = 'fgPick'; box.className = 'fg-pk';
    box.innerHTML = `<div class="fg-pkc"><div class="fg-pkh"><img src="${m.img}" alt="" draggable="false"><div><b style="color:${m.col}">${m.name}</b><small>You have ×${Stones.get(p.t).toLocaleString()}</small></div></div>
      <div class="fg-pkq"><button class="pm" data-d="-1">−</button><input type="number" inputmode="numeric" min="1" max="${mx}" value="${p.n}"><button class="pm" data-d="1">+</button></div>
      <div class="fg-pkr"><button data-q="1">Min</button><button data-q="max">Max</button></div>
      <div class="fg-pkp"></div>
      <div class="fg-pkb"><button class="no">Cancel</button>${p.edit ? '<button class="rm">Remove</button>' : ''}<button class="ok">OK</button></div></div>`;
    root.appendChild(box);
    const inp = box.querySelector('input'), pv = box.querySelector('.fg-pkp');
    const upd = () => { p.n = Math.max(1, Math.min(mx, p.n | 0)); inp.value = p.n; const c = this.pickTotal(); pv.innerHTML = (c && !c.maxed ? `Success chance: <b>${c.total}%</b><br>` : '') + '<span class="dim">Each try uses only 1 stone from this slot. More stones here do NOT raise the chance: fill another slot.</span>'; };
    upd();
    inp.oninput = () => { p.n = parseInt(inp.value, 10) || 1; upd(); };
    box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { p.n = b.dataset.q === 'max' ? mx : 1; upd(); });
    box.querySelectorAll('.pm').forEach(b => {   // tap = 1, hold = keeps going (faster after a moment)
      let tm = null, iv = null; const d = +b.dataset.d, stop = () => { clearTimeout(tm); clearInterval(iv); }, step = (k) => { p.n += d * k; upd(); };
      b.onpointerdown = e => { e.preventDefault(); step(1); let n = 0; tm = setTimeout(() => { iv = setInterval(() => { n++; step(n > 12 ? 10 : 1); }, 70); }, 380); };
      b.onpointerup = b.onpointerleave = b.onpointercancel = stop;
    });
    box.querySelector('.no').onclick = () => { this.pick = null; this.render(); };
    if (p.edit) box.querySelector('.rm').onclick = () => { this.st[p.k] = { t: 0, n: 0 }; this.pick = null; Snd.play('beep'); this.render(); };
    box.querySelector('.ok').onclick = () => { this.st[p.k] = { t: p.t, n: p.n }; this.pick = null; this.res = null; Snd.play('pick'); this.render(); };
    box.addEventListener('pointerdown', e => { if (e.target === box) { this.pick = null; this.render(); } });
  },
  // ---- the upgrade try ----
  go() {
    const c = this.calc(); if (!c || c.maxed || !c.ok) { Snd.play('dud'); return; }
    Object.keys(c.need).forEach(t => Stones.spend(c.need[t], +t));   // ONE stone per filled slot is used up, however many are in the slot
    this.st = this.st.map(x => x.t && x.n > 1 ? { t: x.t, n: x.n - 1 } : { t: 0, n: 0 });   // the rest of the stack stays in the slot; a slot that ran out becomes empty
    const am = this.amu ? matOf('amulet', this.amu) : null; if (am) { Mats.spend(am, 1); this.amu = 0; }   // the amulet is used up too, its slot empties
    const D = Profile.data, id = c.it.id, L = c.L;
    if (Math.random() * 100 < c.total) {
      D.up[id] = L + 1; this.flash = 'ok'; Snd.play('win'); this.res = { ok: true, t: `SUCCESS!  ${c.it.name} is now +${L + 1}.` };
    } else {
      this.flash = 'bad'; Snd.play('dud');
      if (c.risk) {
        const sp = this.sup ? matOf('support', this.sup) : null;
        if (sp && Mats.get(sp) > 0) { Mats.spend(sp, 1); if (Mats.get(sp) <= 0) this.sup = 0; this.res = { ok: false, t: `Failed, but the ${sp.name} saved it.  ${c.it.name} stays at +${L}.` }; }
        else { D.up[id] = L - 1; this.res = { ok: false, t: `Failed!  ${c.it.name} dropped to +${L - 1}.` }; }
      } else this.res = { ok: false, t: `Failed.  ${c.it.name} stays at +${L}.` };
    }
    Profile.save(); this.render(); this.showResult(this.flash === 'ok');
  },
  // ---- result popup: SUCCESS / FAIL picture with an entrance (tap to close, closes itself) ----
  showResult(ok) {
    const old = document.getElementById('fgResult'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'fgResult'; el.className = ok ? 'ok' : 'bad';
    let fx = '';
    if (ok) { fx = '<i class="rays"></i><i class="ring"></i>'; for (let i = 0; i < 18; i++) { const a = Math.random() * 6.283, d = 140 + Math.random() * 190; fx += '<b class="sp" style="--dx:' + (Math.cos(a) * d).toFixed(0) + 'px;--dy:' + (Math.sin(a) * d * .7).toFixed(0) + 'px;--dl:' + (Math.random() * .45).toFixed(2) + 's;--sz:' + (6 + Math.random() * 9).toFixed(0) + 'px"></b>'; } }
    else fx = '<i class="crack"></i>';
    el.innerHTML = fx + '<img src="assets/forge/result_' + (ok ? 'success' : 'fail') + '.png" alt="' + (ok ? 'Success' : 'Fail') + '" draggable="false">';
    const close = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 380); };
    el.addEventListener('pointerdown', close); $('app').appendChild(el); setTimeout(close, ok ? 2300 : 1900);
  },
  // ---- drawing ----
  slotHTML(slot, label, inner, cls = '') { return `<div class="fg-slot s-${slot}${inner ? ' full' : ''} ${cls}" data-slot="${slot}"><small>${label}</small>${inner || '<span class="pl"></span>'}</div>`; },
  cell(g, it, extra, lvl, used) { return `<div class="fg-cell${this.sel === g ? ' sel' : ''}${used ? ' used' : ''}" data-g="${g}" style="--rc:${(RARITY[it.rar] || RARITY.common).color}"><img src="${Profile.imgOf(it)}" alt="" draggable="false">${lvl ? `<u class="lv">+${lvl}</u>` : ''}${extra || ''}</div>`; },
  render() {
    const root = $('forge'); if (!root) return; const D = Profile.data || Profile.load();
    const keep = {}; root.querySelectorAll('[data-sc]').forEach(e => keep[e.dataset.sc] = e.scrollTop);
    if (this.item && !(D.owned.includes(this.item) && itemById(this.item))) this.item = null;
    if (this.amu && Mats.get(matOf('amulet', this.amu)) <= 0) this.amu = 0;
    if (this.sup && Mats.get(matOf('support', this.sup)) <= 0) this.sup = 0;
    { const left = {}; this.st = this.st.map(x => { if (!x.t) return { t: 0, n: 0 }; if (left[x.t] == null) left[x.t] = Stones.get(x.t); const n = Math.min(x.n, left[x.t]); left[x.t] -= n; return n > 0 ? { t: x.t, n } : { t: 0, n: 0 }; }); }   // slots can only hold stones you still own
    const c = this.calc(), rob = Assets.robots.robots[D.char], worn = new Set(Object.values(D.eq).flatMap(o => Object.values(o)));
    // centre slot
    const itemIn = c ? `<img src="${Profile.imgOf(c.it)}" alt="" draggable="false">${c.L ? `<u class="lv">+${c.L}</u>` : ''}` : '';
    const amM = this.amu ? matOf('amulet', this.amu) : null, spM = this.sup ? matOf('support', this.sup) : null;
    const stIn = this.st.map(x => { const m = x.t ? matOf('stone', x.t) : null; return m ? `<img src="${m.img}" alt="" draggable="false"><s class="cnt">×${fmtK(x.n)}</s>` : ''; });
    const amIn = amM ? `<img src="${amM.img}" alt="" draggable="false"><s class="cnt">+${amM.pct}%</s>` : '';
    const spIn = spM ? `<img src="${spM.img}" alt="" draggable="false"><s class="cnt">×${fmtK(Mats.get(spM))}</s>` : '';
    // numbers
    let stats = '<div class="fg-hint">Drag an item into the middle slot, or double-tap it.</div>', go = false, nx = '', risk = '';
    if (c) {
      go = !c.maxed && c.ok;
      const col = c.total >= 60 ? '#5be37a' : c.total >= 30 ? '#ffd24a' : '#ff7a6a';
      stats = c.maxed ? '<div class="fg-max">MAX LEVEL +12</div>' : `<div class="fg-nums"><span><small>Stones</small><b>${c.base}%</b></span><i>+</i><span><small>Amulet</small><b>${c.am ? '+' + c.am + '%' : '0%'}</b></span><i>=</i><span class="tot" style="--c:${col}"><small>Success</small><b>${c.total}%</b></span></div><div class="fg-bar"><i style="width:${c.total}%;background:${col}"></i></div>`;
      if (!c.maxed) {
        const now = statsAt(c.it, c.L), nxt = statsAt(c.it, c.L + 1), ch = Object.keys(nxt).filter(s => s !== 'def' && nxt[s] !== now[s]).slice(0, 3).map(s => `<span>${fmtN(now[s])}<em>→</em><b>${fmtN(nxt[s])}</b> ${STAT_LABEL[s][0]}</span>`).join('');
        nx = `<div class="fg-nx"><b>+${c.L} → +${c.L + 1}</b>${ch}</div>`;
        risk = !c.risk ? '<div class="fg-risk ok">Safe: a failed try never lowers this item.</div>' : c.prot ? '<div class="fg-risk ok">Protected: the Guardian Scroll stops the level loss.</div>' : `<div class="fg-risk bad">Risk: a failed try drops it to +${c.L - 1}. Add a Guardian Scroll.</div>`;
      }
    }
    // inventories
    const eqList = D.owned.map(itemById).filter(it => it && !it.potion && !it.noUp), RK = { legendary: 0, epic: 1, rare: 2, common: 3 };
    eqList.sort((a, b) => (a.type === 'weapon' ? -1 : 0) - (b.type === 'weapon' ? -1 : 0) || RK[a.rar] - RK[b.rar]);
    const eqCells = eqList.map(it => this.cell('equip:' + it.id, it, worn.has(it.id) ? '<em>E</em>' : '', Profile.lvl(it.id), it.id === this.item)).join('');
    const mats = MAT_ITEMS.filter(m => Mats.get(m) > 0);
    const mtCells = mats.map(m => this.cell('mat:' + m.id, m, `<s class="cnt">×${fmtK(Mats.get(m))}</s>`, 0, (m.kind === 'stone' && this.st.reduce((a, x) => a + (x.t === m.t ? x.n : 0), 0) >= Mats.get(m)) || (m.kind === 'amulet' && m.t === this.amu) || (m.kind === 'support' && m.t === this.sup))).join('');
    // info strip
    let info = '<span class="dim">Tap to read, double-tap to place, or drag.</span>';
    const si = this.sel && itemById(this.sel.split(':')[1]); if (si) info = si.type === 'mat' ? `<b style="color:${si.col}">${si.name}</b> <span>${si.line}. ${si.desc}</span>` : `<b>${si.name}${Profile.lvl(si.id) ? ' +' + Profile.lvl(si.id) : ''}</b> <span>${(RARITY[si.rar] || {}).name || ''} ${si.type}</span>`;
    root.innerHTML = `<div class="fg">
      <div class="fg-top"><h2><img src="assets/forge_anvil.png" alt="" draggable="false" style="width:28px;height:28px;object-fit:contain"> Forge</h2>
        <span class="fg-hintTop">Upgrade your gear</span><button class="btn alt sm" id="fgBack">Back</button></div>
      <div class="fg-body">
        <div class="fg-left" data-sc="left">
          <div class="fg-stage">
            <div class="fg-col">${this.slotHTML('amu', 'Amulet', amIn)}${this.slotHTML('sup', 'Guardian', spIn)}</div>
            <div class="fg-mid"><svg class="fg-ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="rgba(120,200,255,.35)" stroke-width="2" stroke-dasharray="3 7"/><circle cx="100" cy="100" r="80" fill="none" stroke="rgba(154,123,255,.45)" stroke-width="2"/><path d="M100 14l8 16h-16zM100 186l8-16h-16zM14 100l16 8v-16zM186 100l-16 8v-16z" fill="rgba(255,210,74,.7)"/></svg>${this.slotHTML('item', 'Item', itemIn, 'big ' + (this.flash ? 'fx-' + this.flash : ''))}</div>
            <div class="fg-col sc">${[0, 1, 2].map(k => this.slotHTML('st' + k, 'Stone', stIn[k], 's-stone')).join('')}</div>
          </div>
          ${c ? `<div class="fg-name">${c.it.name}${c.L ? ' <u>+' + c.L + '</u>' : ''}</div>` : ''}
          ${stats}${nx}${risk}
          ${this.res ? `<div class="fg-res ${this.res.ok ? 'ok' : 'bad'}">${this.res.t}</div>` : (c && !c.maxed && !c.used.length ? '<div class="fg-res">Drop a stone in a Stone slot and choose how many. Fill more slots for more chance.</div>' : '')}
          <button class="fg-go" id="fgGo"${go ? '' : ' disabled'}>Fortify</button>
        </div>
        <div class="fg-right">
          <div class="fg-pan"><div class="fg-ph"><b>Equipment</b><span>${eqList.length}</span></div><div class="fg-grid" data-sc="eq">${eqCells || '<p class="dim">No equipment yet.</p>'}</div></div>
          <div class="fg-pan"><div class="fg-ph"><b>Items</b><span>${mats.length}</span></div><div class="fg-grid" data-sc="mt">${mtCells || '<p class="dim">No stones or scrolls. Buy them in the Shop.</p>'}</div></div>
          <div class="fg-info">${info}</div>
          <div class="fg-foot">${Wallet.badge()}</div>
        </div>
      </div></div>`;
    root.querySelectorAll('[data-sc]').forEach(e => { if (keep[e.dataset.sc] != null) e.scrollTop = keep[e.dataset.sc]; });
    $('fgBack').onclick = () => this.back(); $('fgGo').onclick = () => this.go(); this.drawPick(root);
  },
  // ---- touch / mouse: tap, double-tap and drag (one set of listeners on the screen) ----
  init() {
    const root = $('forge'); let st = null;
    const cleanup = () => { if (st && st.ghost) st.ghost.remove(); root.removeAttribute('data-drag'); st = null; };
    root.addEventListener('pointerdown', e => {
      const slot = e.target.closest('[data-slot]'), cell = e.target.closest('[data-g]');
      if (cell) st = { kind: 'cell', g: cell.dataset.g, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
      else if (slot && slot.classList.contains('full')) st = { kind: 'slot', slot: slot.dataset.slot, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
      else return;
    });
    window.addEventListener('pointermove', e => {
      if (!st || e.pointerId !== st.id) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && Math.hypot(dx, dy) > 9) {
        st.moved = true; const src = st.kind === 'cell' ? st.g.split(':')[1] : (st.slot === 'item' ? this.item : st.slot.startsWith('st') ? matOf('stone', this.st[+st.slot[2]].t).id : st.slot === 'amu' ? matOf('amulet', this.amu).id : matOf('support', this.sup).id);
        st.src = src; const it = itemById(src); if (!it) { cleanup(); return; }
        st.ghost = document.createElement('img'); st.ghost.src = Profile.imgOf(it); st.ghost.className = 'fg-ghost'; document.body.appendChild(st.ghost);
        root.setAttribute('data-drag', it.type === 'mat' ? it.kind : 'equip');
      }
      if (st.moved && st.ghost) { st.ghost.style.left = e.clientX + 'px'; st.ghost.style.top = e.clientY + 'px'; }
    });
    window.addEventListener('pointerup', e => {
      if (!st || e.pointerId !== st.id) return; const s = st; cleanup();
      if (s.moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY), tgt = el && el.closest && el.closest('[data-slot]');
        if (tgt && s.kind === 'slot' && s.slot.startsWith('st') && tgt.dataset.slot.startsWith('st') && tgt.dataset.slot !== s.slot) { const o = this.st[+s.slot[2]]; this.st[+s.slot[2]] = { t: 0, n: 0 }; this.ask(+tgt.dataset.slot[2], o.t, o.n); }   // move a stack to another slot
        else if (tgt && this.fits(tgt.dataset.slot, s.src)) { this.put(tgt.dataset.slot, s.src); if (!s.src.startsWith('mat_stone')) this.render(); }
        else if (s.kind === 'slot' && !(tgt)) { this.clear(s.slot); this.render(); }   // dragged out of its slot = take it back
        else if (tgt) { Snd.play('dud'); this.res = { ok: false, t: 'That does not fit in this slot.' }; this.render(); }
        return;
      }
      if (s.kind === 'slot') { if (s.slot.startsWith('st')) { const x = this.st[+s.slot[2]]; this.ask(+s.slot[2], x.t, x.n); } else { this.clear(s.slot); this.render(); } return; }   // tap a filled stone slot = change how many; other slots = take it back
      const now = performance.now(), id = s.g.split(':')[1];
      if (this.last.g === s.g && now - this.last.t < 380) { this.last = { g: '', t: 0 }; this.auto(id); this.sel = s.g; this.render(); }   // double-tap = place it
      else { this.last = { g: s.g, t: now }; this.sel = s.g; this.render(); }
    });
    window.addEventListener('pointercancel', () => cleanup());
  },
};

(function () {
  const sc = document.createElement('div'); sc.id = 'forge'; sc.className = 'scr'; sc.hidden = true; $('app').appendChild(sc);
  const _show = UI.show.bind(UI); UI.show = function (name) { _show(name); const f = $('forge'); if (f) f.hidden = name !== 'forge'; };
  Forge.init();
  const css = document.createElement('style'); css.textContent = `
#forge{padding:6px 8px;gap:0;background:radial-gradient(ellipse at 50% 20%,rgba(40,30,110,.5),rgba(5,6,20,.9))}
#forge .fg{--s:clamp(30px,9.6vh,58px);width:min(99vw,1020px);height:min(calc(100vh - 10px),560px);max-height:calc(100dvh - 10px);display:flex;flex-direction:column;box-sizing:border-box;padding:7px 12px 9px;border-radius:16px;border:1px solid rgba(150,130,255,.45);
  background:linear-gradient(180deg,rgba(24,20,66,.96),rgba(10,10,34,.97));box-shadow:0 0 0 3px rgba(8,8,26,.8),0 0 30px rgba(110,90,255,.25),inset 0 0 40px rgba(80,120,255,.08);overflow:hidden}
.fg-top{display:flex;align-items:center;gap:10px;margin-bottom:5px;flex:0 0 auto}.fg-top h2{margin:0;font-size:19px;display:flex;align-items:center;gap:7px;color:#cfd8ff;text-shadow:0 0 12px rgba(120,160,255,.7)}
.fg-hintTop{color:var(--dim);font-size:12px;letter-spacing:2px;text-transform:uppercase}.fg-top .btn{margin-left:auto;padding:4px 14px;font-size:14px;box-shadow:0 3px 0 #121a30}
.fg-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(250px,.9fr) minmax(0,1.1fr);gap:12px}
.fg-left{min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;display:flex;flex-direction:column;align-items:center;gap:3px;padding:2px 2px 4px}
.fg-stage{display:flex;align-items:center;justify-content:center;gap:calc(var(--s)*.2);margin-top:2px}.fg-col{display:flex;flex-direction:column;gap:calc(var(--s)*.2)}
.fg-mid{position:relative;display:flex;align-items:center;justify-content:center;width:calc(var(--s)*2.3);height:calc(var(--s)*2.3)}
.fg-ring{position:absolute;inset:0;width:100%;height:100%;animation:fgspin 40s linear infinite;pointer-events:none}@keyframes fgspin{to{transform:rotate(360deg)}}
.fg-slot{position:relative;width:var(--s);height:var(--s);box-sizing:border-box;border-radius:13px;border:2px solid rgba(150,140,255,.55);background:radial-gradient(circle at 50% 30%,rgba(110,100,255,.28),rgba(8,8,34,.92));
  box-shadow:inset 0 0 14px rgba(95,231,255,.14),0 0 0 3px rgba(8,8,26,.85);display:flex;align-items:center;justify-content:center;touch-action:none}
.fg-slot::after{content:"";position:absolute;top:-5px;left:50%;width:8px;height:8px;margin-left:-4px;transform:rotate(45deg);background:#ffd24a;box-shadow:0 0 8px #ffd24a;border-radius:2px}
.fg-col.sc{gap:calc(var(--s)*.12)}.fg-slot.s-stone{width:calc(var(--s)*.8);height:calc(var(--s)*.8);border-radius:11px}.fg-slot.s-stone>small{font-size:7px}
.fg-slot.big{width:calc(var(--s)*1.55);height:calc(var(--s)*1.55);border-color:rgba(95,231,255,.8);box-shadow:inset 0 0 22px rgba(95,231,255,.28),0 0 22px rgba(95,231,255,.35),0 0 0 3px rgba(8,8,26,.85)}
.fg-slot>small{position:absolute;bottom:3px;left:0;right:0;text-align:center;font:700 8px var(--body);letter-spacing:1px;color:#a9b6ff;text-transform:uppercase;white-space:nowrap}.fg-slot.full>small{display:none}
.fg-slot.full{border-color:rgba(255,210,74,.85)}.fg-slot img{width:78%;height:78%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}
.fg-slot .pl{width:40%;height:40%;margin-bottom:9px;border-radius:50%;border:2px dashed rgba(170,180,255,.35);box-sizing:border-box}
.fg-slot .lv,.fg-cell .lv{position:absolute;top:-6px;left:-5px;background:#2d6fd0;color:#fff;border:1px solid #9fdcff;border-radius:8px;padding:0 5px;font:800 11px/15px var(--body);text-decoration:none}
.fg-slot .cnt,.fg-cell .cnt{position:absolute;right:-4px;bottom:-5px;background:rgba(10,12,40,.95);border:1px solid rgba(150,170,255,.7);color:#cfe6ff;border-radius:8px;padding:0 5px;font:800 10px/14px var(--body);text-decoration:none;white-space:nowrap}
.fg-slot .cnt.bad{color:#ff8f7a;border-color:#ff6a5a}
[data-drag=equip] .s-item,[data-drag=stone] .s-stone,[data-drag=amulet] .s-amu,[data-drag=support] .s-sup{border-color:#5fe7ff;box-shadow:0 0 0 3px rgba(95,231,255,.35),0 0 18px rgba(95,231,255,.8)}
.fx-ok{animation:fgok .9s}@keyframes fgok{0%{box-shadow:0 0 0 0 rgba(120,255,160,.9)}60%{box-shadow:0 0 0 22px rgba(120,255,160,0);transform:scale(1.08)}100%{transform:none}}
.fx-bad{animation:fgbad .55s}@keyframes fgbad{0%,100%{transform:none}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.fg-name{font:400 14px var(--disp);color:#e8eeff;text-align:center}.fg-name u{color:#9fdcff;text-decoration:none;font-family:var(--body);font-weight:800}
.fg-nums{display:flex;align-items:center;justify-content:center;gap:7px}.fg-nums i{font:700 16px var(--body);color:#7f8bd0;font-style:normal}
.fg-nums span{display:flex;flex-direction:column;align-items:center;min-width:56px;padding:2px 8px;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid rgba(150,160,255,.25)}
.fg-nums small{font:700 9px var(--body);letter-spacing:1.4px;color:#9eacc9;text-transform:uppercase}.fg-nums b{font:800 16px var(--body);color:#fff}
.fg-nums .tot{border-color:var(--c);box-shadow:0 0 12px color-mix(in srgb,var(--c) 40%,transparent)}.fg-nums .tot b{color:var(--c);font-size:19px}
.fg-bar{width:min(100%,260px);height:5px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden}.fg-bar i{display:block;height:100%;border-radius:5px;transition:width .25s}
.fg-nx{display:flex;flex-wrap:wrap;gap:1px 10px;justify-content:center;font-size:11px;line-height:1.15;color:#8dff9e;font-weight:700}.fg-nx b{color:#bfe6ff}.fg-nx em{font-style:normal;color:#7f8bd0;margin:0 3px}
.fg-risk{font-size:12px;font-weight:700;text-align:center}.fg-risk.ok{color:#8dff9e}.fg-risk.bad{color:#ffab8f}.fg-max{font:400 17px var(--disp);color:#ffd24a;letter-spacing:2px}.fg-hint{color:var(--dim);font-size:12px;text-align:center;padding:4px 10px}
.fg-go{width:min(100%,260px);border:0;border-radius:11px;padding:5px 10px;cursor:pointer;font:400 18px var(--disp);letter-spacing:3px;text-transform:uppercase;color:#07122e;background:linear-gradient(#7ff0ff,#7b6bff);box-shadow:0 4px 0 #2a2f8f,0 0 22px rgba(120,160,255,.55);flex:0 0 auto}
.fg-go:active{transform:translateY(3px);box-shadow:0 1px 0 #2a2f8f}.fg-go[disabled]{opacity:.4;filter:grayscale(.6);cursor:not-allowed;box-shadow:0 4px 0 #2a2f8f}
.fg-res{font-weight:800;font-size:13px;text-align:center;color:#9eacc9}.fg-res.ok{color:#8dff9e;font-size:14px}.fg-res.bad{color:#ffab8f}
.fg-right{min-height:0;display:flex;flex-direction:column;gap:6px}
.fg-pan{flex:1 1 0;min-height:0;display:flex;flex-direction:column;border-radius:11px;border:1px solid rgba(150,160,255,.28);background:rgba(4,5,24,.55);padding:4px 6px 5px}.fg-pan:first-child{flex:1.35 1 0}
.fg-ph{display:flex;justify-content:space-between;align-items:center;font:400 12px var(--disp);color:#cfd8ff;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}.fg-ph span{font:700 11px var(--body);color:#8f9bd8}
.fg-grid{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;display:grid;grid-template-columns:repeat(auto-fill,minmax(calc(var(--s)*.84),1fr));grid-auto-rows:calc(var(--s)*.84);gap:6px;align-content:start;padding:6px 4px 3px}
.fg-grid .dim{grid-column:1/-1;margin:6px 4px;font-size:12px}
.fg-cell{position:relative;border-radius:10px;border:2px solid var(--rc);background:rgba(14,14,50,.85);display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:pan-y;box-sizing:border-box}
.fg-cell img{width:78%;height:78%;object-fit:contain;pointer-events:none}.fg-cell.sel{box-shadow:0 0 0 2px #5fe7ff,0 0 12px rgba(95,231,255,.8);background:rgba(60,70,180,.35)}.fg-cell.used{opacity:.35}
.fg-cell em{position:absolute;top:-6px;right:-5px;background:var(--accent);color:#1a0f00;border-radius:50%;width:15px;height:15px;font:800 10px/15px var(--body);font-style:normal;text-align:center}
.fg-info{flex:0 0 auto;min-height:26px;font-size:11px;line-height:1.15;color:#cfd8ff;padding:3px 6px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(150,160,255,.2);max-height:34px;overflow:auto;scrollbar-width:thin}.fg-info b{margin-right:4px}.fg-info span{color:#aab4d8}
.fg-foot{flex:0 0 auto;display:flex;justify-content:flex-end}.fg-foot .chipbal{font-size:15px;padding:1px 10px 1px 3px}.fg-foot .chipbal img{width:22px;height:22px}
.fg-ghost{position:fixed;width:52px;height:52px;margin:-26px 0 0 -26px;pointer-events:none;z-index:9999;filter:drop-shadow(0 6px 10px rgba(0,0,0,.7));opacity:.95}
.fg-pk{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(3,4,18,.72)}
.fg-pkc{width:min(92vw,330px);box-sizing:border-box;padding:10px 14px 12px;border-radius:14px;border:1px solid rgba(150,130,255,.6);background:linear-gradient(180deg,#1b1760,#0d0d2e);box-shadow:0 0 30px rgba(110,90,255,.45);display:flex;flex-direction:column;gap:7px;align-items:center}
.fg-pkh{display:flex;align-items:center;gap:10px;align-self:stretch}.fg-pkh img{width:44px;height:44px;object-fit:contain}.fg-pkh b{display:block;font:400 16px var(--disp)}.fg-pkh small{color:#9eacc9;font-size:12px}
.fg-pkq{display:flex;align-items:center;gap:10px}.fg-pkq input{width:104px;height:42px;box-sizing:border-box;text-align:center;font:800 22px var(--body);color:#fff;background:rgba(255,255,255,.08);border:2px solid rgba(150,170,255,.55);border-radius:10px;-moz-appearance:textfield}
.fg-pkq input::-webkit-outer-spin-button,.fg-pkq input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.fg-pkq .pm{width:46px;height:42px;border:0;border-radius:10px;font:800 28px/1 var(--body);color:#07122e;background:linear-gradient(#7ff0ff,#7b6bff);box-shadow:0 3px 0 #2a2f8f;cursor:pointer;touch-action:none;-webkit-user-select:none;user-select:none}.fg-pkq .pm:active{transform:translateY(2px);box-shadow:0 1px 0 #2a2f8f}
.fg-pkr{display:flex;gap:8px}.fg-pkr button{border:1px solid rgba(150,170,255,.5);background:rgba(255,255,255,.07);color:#cfd8ff;border-radius:8px;padding:4px 12px;font:700 13px var(--body);cursor:pointer}
.fg-pkp{font-size:14px;color:#cfd8ff;text-align:center;min-height:20px}.fg-pkp .dim{font-size:11px;color:#9eacc9;font-weight:600}.fg-pkp b{color:#8dff9e;font-size:17px}
.fg-pkb{display:flex;gap:8px;align-self:stretch}.fg-pkb button{flex:1;border:0;border-radius:10px;padding:8px 6px;font:800 15px var(--body);letter-spacing:1px;text-transform:uppercase;cursor:pointer;color:#cfd8ff;background:#2a3358}.fg-pkb .ok{color:#07122e;background:linear-gradient(#7ff0ff,#7b6bff)}.fg-pkb .rm{color:#ffab8f}
/* ---- upgrade result popup (SUCCESS / FAIL pictures in assets/forge/) ---- */
#fgResult{position:absolute;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.35),rgba(0,0,0,.72));animation:fgBg .25s ease-out both;cursor:pointer}
#fgResult.out{animation:fgOut .38s ease-in forwards}
#fgResult img{position:relative;z-index:3;width:min(52vw,calc(30vh*3),480px);height:auto;pointer-events:none;-webkit-user-drag:none}
#fgResult.ok img{animation:fgIn .85s cubic-bezier(.2,1.4,.4,1) both,fgGlow 1.2s ease-in-out .85s infinite alternate}
#fgResult.bad img{animation:fgSlam .55s cubic-bezier(.5,0,.8,.4) both,fgShake .5s linear .55s both;filter:drop-shadow(0 0 22px rgba(255,40,20,.7))}
#fgResult .rays{position:absolute;z-index:1;left:50%;top:50%;width:200vmax;height:200vmax;margin:-100vmax 0 0 -100vmax;background:repeating-conic-gradient(from 0deg,rgba(255,215,90,.34) 0 6deg,rgba(255,215,90,0) 6deg 18deg);-webkit-mask-image:radial-gradient(circle,#000 0,transparent 22%);mask-image:radial-gradient(circle,#000 0,transparent 22%);animation:fgSpin 9s linear infinite,fgRayIn .7s ease-out both}
#fgResult .ring{position:absolute;z-index:2;left:50%;top:50%;width:40vmin;height:40vmin;margin:-20vmin 0 0 -20vmin;border-radius:50%;border:4px solid #ffe27a;box-shadow:0 0 30px #ffb703,inset 0 0 30px #ffb703;opacity:0;animation:fgRing .9s ease-out .1s both}
#fgResult .sp{position:absolute;z-index:4;left:50%;top:50%;width:var(--sz);height:var(--sz);margin:calc(var(--sz)/-2) 0 0 calc(var(--sz)/-2);background:radial-gradient(circle,#fff 0,#ffe27a 40%,rgba(255,180,0,0) 72%);border-radius:50%;opacity:0;animation:fgSp 1.1s ease-out var(--dl) both}
#fgResult .crack{position:absolute;z-index:2;left:50%;top:50%;width:70vmin;height:70vmin;margin:-35vmin 0 0 -35vmin;border-radius:50%;background:radial-gradient(circle,rgba(255,50,20,.55) 0,rgba(255,50,20,0) 62%);opacity:0;animation:fgFlash .7s ease-out .5s both}
@keyframes fgBg{from{opacity:0}to{opacity:1}}
@keyframes fgOut{to{opacity:0}}
@keyframes fgIn{0%{transform:scale(.1) rotate(-8deg);opacity:0}55%{transform:scale(1.18) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes fgGlow{from{filter:drop-shadow(0 0 10px rgba(255,200,40,.6))}to{filter:drop-shadow(0 0 32px rgba(255,220,90,1))}}
@keyframes fgSlam{0%{transform:translateY(-70vh) scale(1.7);opacity:0}70%{opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes fgShake{0%,100%{transform:translate(0,0)}15%{transform:translate(-14px,6px) rotate(-1.5deg)}35%{transform:translate(12px,-5px) rotate(1.2deg)}55%{transform:translate(-8px,4px)}75%{transform:translate(5px,-2px)}}
@keyframes fgSpin{to{transform:rotate(360deg)}}
@keyframes fgRayIn{from{opacity:0}to{opacity:1}}
@keyframes fgRing{0%{transform:scale(.2);opacity:.95}100%{transform:scale(2.3);opacity:0}}
@keyframes fgSp{0%{transform:translate(0,0) scale(.3);opacity:0}25%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:0}}
@keyframes fgFlash{0%{opacity:0}30%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){#fgResult *,#fgResult img{animation-duration:.01s!important;animation-iteration-count:1!important}}
@media (max-width:620px){.fg-body{grid-template-columns:1fr}#forge .fg{height:auto;max-height:none}#forge{overflow:auto}}
`; document.head.appendChild(css);
})();
console.log('forge.js loaded - Forge (3 stone slots with a quantity box) + amulets + guardian scroll');
