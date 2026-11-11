/* AUCTION HOUSE + ENVELOPE (client). Downloaded from GitHub the first time you tap the Auction House or the envelope icon (same as arena_v2.js).
   AUCTION: every player of the server can post ANY item for chips; everybody on that server sees it under the Chips tab and can buy it.
            Coins tab = coming soon. The item leaves your Bag when you post it. You can take it off sale again (it comes back to your envelope).
   ENVELOPE: nothing goes straight into the Bag any more. Bought items (Shop + Auction), the chips of a sale and returned items wait here.
             Tap one -> picture + description + Claim button -> Claim puts it in your Bag (or the chips in your wallet).
   Server calls (server.js): /api/auction/list|post|buy|cancel   /api/mail/list|claim|shop     Tables: supabase_auction.sql
   ctx (from online_v2.js): { h, beep, toast, api(path, body), expired(), parent(), badge(n), player() } */
'use strict';
const AuctionUI = (() => {
  let ctx = null, h = null;
  const fmt = n => (n | 0).toLocaleString();
  const chips = () => { try { return Wallet.get(); } catch (e) { return 0; } };
  const IT = id => { try { return itemById(id) || null; } catch (e) { return null; } };
  const kindOf = it => it.type === 'mat' ? 'mat' : it.potion ? 'potion' : 'gear';
  const GROUPS = [['all', 'All'], ['weapon', 'Weapons'], ['armor', 'Armor'], ['acc', 'Accessories'], ['use', 'Items']];
  const groupOf = it => it.type === 'weapon' ? 'weapon' : ['helmet', 'armor', 'shoes'].includes(it.type) ? 'armor' : (it.type === 'mat' || it.potion) ? 'use' : 'acc';
  const RK = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const chipImg = () => h('img', { class: 'lgchip', src: 'assets/chip.png', alt: '', draggable: 'false' });
  const noKeys = el => { el.onkeydown = el.onkeyup = el.onkeypress = e => e.stopPropagation(); return el; };   // the game listens to keys: typing a price must not move the robot

  // ---------- the Bag (what the player owns, and how to add / remove it) ----------
  function bagItems() {
    const D = Profile.data || Profile.load(), out = [];
    for (const id of D.owned) { const it = IT(id); if (!it) continue; if (it.sig && Profile.copies(id) <= 1) continue; out.push({ it, n: 1, kind: 'gear' }); }   // your robot's own signature weapon can never leave
    for (const it of POTION_ITEMS) { const n = Profile.stockOf(it.id); if (n > 0) out.push({ it, n, kind: 'potion' }); }
    for (const it of MAT_ITEMS) { const n = Mats.get(it); if (n > 0) out.push({ it, n, kind: 'mat' }); }
    return out.sort((a, b) => (RK[a.it.rar] ?? 9) - (RK[b.it.rar] ?? 9) || a.it.name.localeCompare(b.it.name));
  }
  function removeFromBag(it, qty) {   // true = removed
    const k = kindOf(it);
    if (k === 'mat') return Mats.spend(it, qty);
    if (k === 'potion') { if (Profile.stockOf(it.id) < qty) return false; Profile.addStock(it.id, -qty); return true; }
    const D = Profile.data || Profile.load(); if (!D.owned.includes(it.id)) return false;
    if (it.sig && Profile.copies(it.id) <= 1) return false;
    { // this copy leaves the Bag (and the robot wearing it), its upgrade level is lost
      D.owned = D.owned.filter(x => x !== it.id); if (D.up) delete D.up[it.id];
      for (const rid in D.eq) for (const key in D.eq[rid]) if (D.eq[rid][key] === it.id) delete D.eq[rid][key];
    }
    Profile.ensureWeapon(); Profile.save(); return true;
  }
  function whyCannotAdd(it, qty) {   // '' = it fits in the Bag
    if (kindOf(it) === 'potion' && Profile.stockOf(it.id) + qty > POTION_MAX) return 'You already carry ' + POTION_MAX + ' ' + it.name + '. Use one first, then claim.';
    return '';
  }
  function addToBag(it, qty, lvl) {   // lvl = the upgrade the item had when it was posted (+8 stays +8)
    const k = kindOf(it);
    if (k === 'mat') Mats.add(it, qty); else if (k === 'potion') Profile.addStock(it.id, qty);
    else {
      const D = Profile.data || Profile.load();
      for (let i = 0; i < qty; i++) { Profile.addCopy(it.id); const nid = D.owned[D.owned.length - 1]; if ((lvl | 0) > 0 && !it.noUp) { D.up = D.up || {}; D.up[nid] = Math.min(UP_MAX, lvl | 0); } }
      Profile.save();
    }
  }

  // ---------- pictures ----------
  function statHtml(it, lvl) {
    try {
      if (it.type === 'necklace') return '<span class="pos">+' + ((it.stats && it.stats.nhp) || 0) + '% of total Health</span>';
      if (it.potion || it.type === 'mat') return '';
      return Profile.statText(statsAt(it, lvl | 0));
    } catch (e) { return ''; }
  }
  function detail(it, qty, kids, lvl) {   // picture + name + rarity + stats + description (the same look as the League Shop); lvl = upgrade level shown as +N
    const st = h('div', { class: 'st' }); st.innerHTML = statHtml(it, lvl);
    return h('div', { class: 'idet', style: '--rc:' + RARITY[it.rar].color },
      it.img ? h('img', { src: it.img, alt: '', draggable: 'false' }) : null,
      h('div', { class: 'in' }, it.name + ((lvl | 0) > 0 ? ' +' + (lvl | 0) : '') + (qty > 1 ? ' ×' + fmt(qty) : '')),
      h('small', null, (it.potion || it.type === 'mat' ? 'Item' : RARITY[it.rar].name + ' ' + it.type)),
      st, h('p', null, it.desc || ''), kids || null);
  }
  function cell(it, qty, bottom, onclick, lvl) {
    return h('div', { class: 'cslot has tap lgn', style: '--rc:' + RARITY[it.rar].color, onclick },
      it.img ? h('img', { src: it.img, alt: '', draggable: 'false' }) : null, h('b', null, it.name), qty > 1 ? h('u', null, '×' + fmt(qty)) : (lvl | 0) > 0 ? h('u', null, '+' + (lvl | 0)) : null, bottom);
  }
  const money = n => h('span', { class: 'cost' }, fmt(n) + ' chips');
  const css = `
#onl .au-tabs{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:2px 0}
#onl .au-tabs .wbtn{padding:5px 10px;font-size:13px}#onl .au-tabs .wbtn.on{background:linear-gradient(#5ec7ff,#1f6fa8);border-color:#d7f1ff}
#onl .au-list{height:min(210px,40vh);overflow-y:auto;margin-top:4px}
#onl .au-list .lgshop{padding:2px}
#onl .au-empty{margin:26px 10px;color:#cdb98f;font-size:14px}
#onl .au-bot{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px}
#onl .au-in{width:130px;box-sizing:border-box;font:700 18px var(--body,sans-serif);text-align:center;padding:6px;border-radius:9px;border:2px solid #e0a53a;background:#1b0f04;color:#fff2da;user-select:text;-webkit-user-select:text}
#onl .au-step{display:flex;gap:8px;align-items:center;justify-content:center}#onl .au-step b{min-width:56px;color:#ffd34a;font-size:17px}
#onl .au-warn{color:#ffb98a!important;font-weight:700}
#onl .au-mrow{border-bottom:1px solid rgba(255,220,160,.12)}
#onl .au-mrow .wiv{border-bottom:0}#onl .au-mrow .wiv.sel{border-radius:8px 8px 0 0}
#onl .au-mdet{padding:6px 4px 10px;background:rgba(255,211,74,.08);border-radius:0 0 8px 8px}
#onl .au-mdet .note{color:#cdb98f;font:700 12px var(--body,sans-serif)}
#onl .au-new{color:#ff6a5a;font-weight:700}
#onl .au-mlist{width:100%;max-width:none;aspect-ratio:auto;filter:none;height:min(300px,56vh);overflow-y:auto;box-sizing:border-box}
#onl .au-mlist .wiv{font-size:16px;gap:12px;padding:8px 10px}
#onl .au-mlist .wiv img,#onl .au-mlist .wiv .lg{width:40px;height:40px}
#onl .au-mlist .wiv b{min-width:0;line-height:1.25}
#onl .au-mlist .wiv b small{font-size:13px}
#onl .au-mlist .wiv i{flex:none;font-size:17px;white-space:nowrap}
#onl .au-mhint{margin:4px;font-size:14px;color:#e6d3a8}
@media (orientation:landscape) and (max-height:520px){#onl .au-mlist{height:calc(100vh - 118px)}#onl .au-mhint{font-size:13px;margin:2px}}
#onl .au-c{max-height:94vh;overflow-y:auto;box-sizing:border-box}
#onl .au-c .idet{gap:3px}
#onl .au-c .idet img{width:52px;height:52px;padding:3px}
#onl .au-c .idet img.lgchip{width:18px;height:18px;padding:0;border:0;background:none;border-radius:0}
#onl .au-c .idet .in{font-size:16px}
#onl .au-c .idet .st{flex-direction:row;flex-wrap:wrap;justify-content:center;gap:0 10px;font-size:11px}
#onl .au-c .idet p{font-size:11px}
#onl .au-acts{position:sticky;bottom:-6px;z-index:2;display:flex;gap:8px;justify-content:center;padding:6px 0 2px;background:linear-gradient(rgba(122,74,31,0),#7a4a1f 35%)}
`;
  function ensureCss() { if (!document.getElementById('auCss')) document.head.append(h('style', { id: 'auCss' }, css)); }
  const wood = (ctxEl, inner, w) => { const p = h('div', { class: 'pop wood', style: 'z-index:60', onclick: e => { if (e.target === p) p.remove(); } }, h('div', { class: 'wpnl lgw au-c', style: 'width:min(' + (w || 420) + 'px,96vw)' }, inner)); ctxEl.append(p); return p; };
  const fail = e => { if (e && e.status === 401) { ctx.expired(); return; } ctx.toast((e && e.message) || 'Something went wrong.'); };

  // =============================== AUCTION HOUSE ===============================
  function open(c) {
    ctx = c; h = c.h; ensureCss();
    const t = ctx.parent(); if (!t) return;
    let data = null, err = '', busy = false, tab = 'chips', view = 'buy', grp = 'all', box = null, tm = null, mailN = 0;
    const list = h('div', { class: 'au-list' }), stats = h('div', { class: 'lgstats' }), tabs = h('div', { class: 'au-tabs' }), sub = h('div', { class: 'au-tabs' }), bot = h('div', { class: 'au-bot' });
    const close = () => { clearInterval(tm); if (box) box.remove(); };
    const load = async () => {
      try { data = await ctx.api('auction/list'); err = ''; } catch (e) { if (e.status === 401) return ctx.expired(); err = e.message || 'Could not load the Auction House.'; }
      try { const m = await ctx.api('mail/list'); mailN = (m.mail || []).length; ctx.badge(mailN); } catch (e) { }
      if (box && box.isConnected) draw();
    };
    const mine = () => ((data && data.listings) || []).filter(l => l.mine);
    function draw() {
      const sc = list.scrollTop;
      stats.replaceChildren(h('div', { class: 'lgs gold' }, h('span', null, 'My Chips'), h('b', null, fmt(chips()))), h('div', { class: 'lgs' }, h('span', null, 'On sale'), h('b', null, mine().length + '/' + ((data && data.max) || 30))));
      tabs.replaceChildren(h('div', { class: 'wbtn' + (tab === 'chips' ? ' on' : ''), onclick: () => { ctx.beep(); tab = 'chips'; draw(); } }, 'Chips'),
        h('div', { class: 'wbtn off', onclick: () => { ctx.beep(); ctx.toast('Coins are coming soon.'); } }, 'Coins (soon)'));
      sub.replaceChildren(h('div', { class: 'wbtn' + (view === 'buy' ? ' on' : ''), onclick: () => { ctx.beep(); view = 'buy'; draw(); } }, 'Buy'),
        h('div', { class: 'wbtn' + (view === 'mine' ? ' on' : ''), onclick: () => { ctx.beep(); view = 'mine'; draw(); } }, 'My Items'),
        ...(view === 'buy' ? GROUPS.map(([g, n]) => h('div', { class: 'wbtn' + (grp === g ? ' on' : ''), style: 'padding:5px 7px;font-size:12px', onclick: () => { ctx.beep(); grp = g; draw(); } }, n)) : []));
      let rows = ((data && data.listings) || []).filter(l => l.cur === 'chips');
      rows = view === 'mine' ? rows.filter(l => l.mine) : rows.filter(l => (grp === 'all' || (IT(l.item) && groupOf(IT(l.item)) === grp)));
      const cells = rows.map(l => { const it = IT(l.item); if (!it) return null; return cell(it, l.qty, money(l.price), () => { ctx.beep(); listingPop(l, it); }, l.lvl); }).filter(Boolean);
      list.replaceChildren(err ? h('p', { class: 'au-empty' }, err) : !data ? h('p', { class: 'au-empty' }, 'Loading...') :
        cells.length ? h('div', { class: 'lgshop' }, cells) : h('p', { class: 'au-empty' }, view === 'mine' ? 'You have nothing on sale. Tap "Post Item".' : 'Nothing is for sale here yet. Be the first: post an item!'));
      list.scrollTop = sc;
      bot.replaceChildren(h('div', { class: 'wbtn', onclick: () => { ctx.beep(); postPop(); } }, 'Post Item'),
        h('div', { class: 'wbtn', onclick: () => { ctx.beep(); MailUI.open(ctx); } }, mailN ? 'Envelope (' + mailN + ')' : 'Envelope'),
        h('div', { class: 'wbtn', onclick: () => { ctx.beep(); load(); } }, 'Refresh'));
    }
    // --- a listing: picture, description, price, Buy (or Cancel when it is yours) ---
    function listingPop(l, it) {
      let p = null;
      const buyBtn = l.mine ? h('div', { class: 'wbtn red', onclick: async () => {
        ctx.beep(); if (busy) return; busy = true;
        try { await ctx.api('auction/cancel', { id: l.id }); ctx.toast('Taken off sale. It is waiting in your envelope.'); p.remove(); } catch (e) { fail(e); }
        busy = false; load();
      } }, 'Cancel sale') : chips() < l.price ? h('div', { class: 'wbtn off' }, 'Need ' + fmt(l.price - chips()) + ' more chips') : h('div', { class: 'wbtn', onclick: async () => {
        ctx.beep(); if (busy) return; if (chips() < l.price) return ctx.toast('Not enough chips.'); busy = true;
        try { await ctx.api('auction/buy', { id: l.id }); Wallet.spend(l.price); try { ctx.quest && ctx.quest('auction_spend', { amount: l.price }); } catch (e) { } ctx.toast(it.name + ' bought! Open the envelope to claim it.'); p.remove(); } catch (e) { fail(e); }
        busy = false; load();
      } }, 'Buy for ' + fmt(l.price));
      p = wood(t, detail(it, l.qty, [
        h('p', null, 'Seller: ' + (l.mine ? 'you' : l.seller)),
        h('div', { class: 'lgc' }, 'Price: ', chipImg(), h('b', null, fmt(l.price) + ' chips'), '  (you have ' + fmt(chips()) + ')'),
        h('div', { class: 'au-acts' }, buyBtn, h('div', { class: 'wbtn', onclick: () => { ctx.beep(); p.remove(); } }, 'Close'))], l.lvl), 400);
    }
    // --- post: pick an item from the Bag, set the quantity (stacks) and the price ---
    function postPop() {
      const bag = bagItems(); let p = null, pick = null, qty = 1, price = '';
      const body = h('div', { class: 'idet' });
      p = wood(t, body, 440);
      const render = () => {
        if (!pick) {
          return body.replaceChildren(h('div', { class: 'in' }, 'Post an item'), h('small', null, 'Tap an item from your Bag'),
            bag.length ? h('div', { class: 'au-list', style: 'width:100%;height:min(220px,42vh)' }, h('div', { class: 'lgshop' }, bag.map(o => cell(o.it, o.n, null, () => { ctx.beep(); pick = o; qty = 1; price = String(itemPrice(o.it) || 100); render(); }, o.kind === 'gear' ? Profile.lvl(o.it.id) : 0)))) : h('p', { class: 'au-empty' }, 'Your Bag is empty.'),
            h('p', null, 'Only your robot\'s own signature weapon cannot be sold.'), h('div', { class: 'wbtn', onclick: () => { ctx.beep(); p.remove(); } }, 'Close'));
        }
        const it = pick.it, k = pick.kind, upLv = k === 'gear' ? Profile.lvl(it.id) : 0, wornLast = k === 'gear' && pick.n <= 1;
        const inp = noKeys(h('input', { class: 'au-in', type: 'text', inputmode: 'numeric', maxlength: '7', value: price, placeholder: 'chips' }));
        inp.oninput = () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 7); price = inp.value; };
        const step = k === 'mat' ? h('div', { class: 'au-step' }, h('div', { class: 'wbtn', onclick: () => { ctx.beep(); qty = Math.max(1, qty - 1); render(); } }, '-'), h('b', null, '×' + fmt(qty)),
          h('div', { class: 'wbtn', onclick: () => { ctx.beep(); qty = Math.min(pick.n, qty + 1); render(); } }, '+'), h('div', { class: 'wbtn', onclick: () => { ctx.beep(); qty = pick.n; render(); } }, 'All')) : null;
        body.style.cssText = '--rc:' + RARITY[it.rar].color;
        body.replaceChildren(...detail(it, k === 'mat' ? qty : 1, [
          step, h('div', { class: 'lgc' }, 'You own ×' + fmt(pick.n) + (itemPrice(it) ? '  ·  Shop price ' + fmt(itemPrice(it)) : '')),
          h('div', { class: 'lgc' }, k === 'mat' && qty > 1 ? 'Price for all ×' + fmt(qty) + ':' : 'Price:', chipImg(), inp),
          upLv > 0 ? h('p', { class: 'au-warn' }, 'Its upgrade +' + upLv + ' goes with it: the buyer gets it as +' + upLv + '.') : null,
          wornLast ? h('p', null, 'It is your last copy: robots wearing it will take it off.') : null,
          h('div', { class: 'au-acts' }, h('div', { class: 'wbtn', onclick: async () => {
            ctx.beep(); if (busy) return; const pr = price | 0; if (pr < 1) return ctx.toast('Type a price in chips.');
            const n = k === 'mat' ? qty : 1; if (!removable(it, n)) return ctx.toast('You do not have it any more.');
            const lv = k === 'gear' ? Profile.lvl(it.id) : 0;   // read the upgrade BEFORE the item leaves the Bag
            busy = true;
            try { await ctx.api('auction/post', { item: baseId(it.id), qty: n, price: pr, cur: 'chips', lvl: lv }); removeFromBag(it, n); try { ctx.quest && ctx.quest('auction_post'); } catch (e) { } ctx.toast(it.name + ' is on sale for ' + fmt(pr) + ' chips.'); p.remove(); view = 'mine'; }
            catch (e) { fail(e); }
            busy = false; load();
          } }, 'Post for sale'), h('div', { class: 'wbtn red', onclick: () => { ctx.beep(); pick = null; render(); } }, 'Back'))], upLv).childNodes);
      };
      render();
    }
    const removable = (it, n) => { const k = kindOf(it); if (k === 'mat') return Mats.get(it) >= n; if (k === 'potion') return Profile.stockOf(it.id) >= n; return Profile.copies(it.id) > (it.sig ? 1 : 0); };

    const title = h('div', { class: 'lgtitle' }, h('span', null, 'Auction House'), h('div', { class: 'lgx wbtn', onclick: () => { ctx.beep(); close(); } }, 'X'));
    box = h('div', { class: 'pop wood', onclick: e => { if (e.target === box) close(); } }, h('div', { class: 'wpnl lgw au-c', style: 'width:min(560px,98vw)' }, title, stats, tabs, sub, list, bot));
    t.append(box); draw(); load();
    tm = setInterval(() => { if (!box || !box.isConnected) return clearInterval(tm); const a = document.activeElement; if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return; if (!busy) load(); }, 6000);
  }
  return { open, init(c) { ctx = c; h = c.h; }, helpers: { IT, kindOf, whyCannotAdd, addToBag, detail, fmt, noKeys, wood, fail, chipImg, ensureCss } };
})();

// =============================== ENVELOPE (mail) ===============================
const MailUI = (() => {
  function open(ctx) {
    AuctionUI.init(ctx); const h = ctx.h, H = AuctionUI.helpers, t = ctx.parent(); if (!t) return; H.ensureCss();
    let mail = null, err = '', sel = null, busy = false, box = null, tm = null;
    const close = () => { clearInterval(tm); if (box) box.remove(); };
    const list = h('div', { class: 'wlst au-mlist' });   // NOT 'big': the generic .big picture rule squeezed this list into a narrow strip
    const load = async () => {
      try { const j = await ctx.api('mail/list'); mail = j.mail || []; err = ''; ctx.badge(mail.length); } catch (e) { if (e.status === 401) return ctx.expired(); err = e.message || 'Could not open the envelope.'; }
      if (sel && mail && !mail.some(m => m.id === sel)) sel = null;
      if (box && box.isConnected) draw();
    };
    async function claim(m) {
      if (busy) return; const it = m.item ? H.IT(m.item) : null;
      if (m.kind === 'item') { if (!it) return ctx.toast('Unknown item. Update the game first.'); const why = H.whyCannotAdd(it, m.qty); if (why) return ctx.toast(why); }
      busy = true;
      try {
        const j = await ctx.api('mail/claim', { id: m.id }), mm = j.mail;   // the server deleted the envelope first: it can never be claimed twice
        if (mm.kind === 'item') { H.addToBag(it, mm.qty, mm.lvl); ctx.toast(it.name + (mm.lvl > 0 ? ' +' + mm.lvl : '') + (mm.qty > 1 ? ' ×' + H.fmt(mm.qty) : '') + ' is in your Bag!'); }
        else { Wallet.add(mm.chips); ctx.toast('+' + H.fmt(mm.chips) + ' chips!'); }
        sel = null;
      } catch (e) { H.fail(e); }
      busy = false; load();
    }
    function row(m) {
      const it = m.item ? H.IT(m.item) : null, open_ = sel === m.id;
      const pic = m.kind === 'chips' ? h('img', { src: 'assets/chip.png', alt: '' }) : it && it.img ? h('img', { src: it.img, alt: '' }) : h('div', { class: 'lg' }, '?');
      const r = h('div', { class: 'wiv' + (open_ ? ' sel' : ''), onclick: () => { ctx.beep(); sel = open_ ? null : m.id; draw(); } }, pic,
        h('b', null, m.title, h('small', null, (it ? it.name + (m.lvl > 0 ? ' +' + m.lvl : '') + (m.qty > 1 ? ' ×' + H.fmt(m.qty) : '') : m.kind === 'chips' ? 'Chips' : 'Unknown item') + (m.note ? ' · ' + m.note : ''))),
        h('i', null, m.kind === 'chips' ? '+' + H.fmt(m.chips) : '×' + H.fmt(m.qty)));
      if (!open_) return h('div', { class: 'au-mrow' }, r);
      const claimBtn = h('div', { class: 'wbtn', onclick: () => { ctx.beep(); claim(m); } }, m.kind === 'chips' ? 'Claim ' + H.fmt(m.chips) + ' chips' : 'Claim');
      const det = m.kind === 'chips'
        ? h('div', { class: 'idet' }, h('img', { src: 'assets/chip.png', alt: '', draggable: 'false' }), h('div', { class: 'in' }, H.fmt(m.chips) + ' chips'), h('p', null, (m.title && /^Quest/.test(m.title) ? '' : (it ? it.name + (m.qty > 1 ? ' ×' + H.fmt(m.qty) : '') : 'Your item') + ' was sold. ') + (m.note || '')), h('div', { class: 'au-acts' }, claimBtn))
        : it ? H.detail(it, m.qty, [h('p', { class: 'note' }, m.note || ''), h('div', { class: 'au-acts' }, claimBtn)], m.lvl) : h('div', { class: 'idet' }, h('p', null, 'This item is not in this version of the game yet.'));
      return h('div', { class: 'au-mrow' }, r, h('div', { class: 'au-mdet' }, det));
    }
    function draw() {
      const sc = list.scrollTop;
      list.replaceChildren(...(err ? [h('p', null, err)] : !mail ? [h('p', null, 'Loading...')] : mail.length ? mail.map(row) : [h('p', null, 'Your envelope is empty. Bought items wait here.')]));
      list.scrollTop = sc;
    }
    const title = h('div', { class: 'lgtitle' }, h('span', null, 'Envelope'), h('div', { class: 'lgx wbtn', onclick: () => { ctx.beep(); close(); } }, 'X'));
    box = h('div', { class: 'pop wood', style: 'z-index:65', onclick: e => { if (e.target === box) close(); } }, h('div', { class: 'wpnl lgw au-c', style: 'width:min(640px,96vw)' }, title,
      h('p', { class: 'au-mhint' }, 'Bought items, sale money and returned items. Tap one, then Claim.'), list));
    t.append(box); draw(); load();
    tm = setInterval(() => { if (!box || !box.isConnected) return clearInterval(tm); if (!busy) load(); }, 8000);
  }
  return { open };
})();
