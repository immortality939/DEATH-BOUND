/* QUESTS (the scroll icon in the online town). One file, loaded with the other online scripts (see index_server.html).
   Six categories. In each one the quests come in order: finish one, claim it, the next one shows up.
     Deathbound Level Up  - reach level 2, 5, 10 ... 50 (never refreshes)
     Play Arena           - first fight (once), then free-fight quests that refresh every day
     Play Adventure       - first stage + first boss (once), then daily stage / boss / HARD / HEROIC quests
     Become Unstoppable   - upgrade quests, stone rewards only, never refresh
     League Mastery       - join or create a league (once), then daily league quests
     Wealthy              - spend chips in the Shop (once), then daily Shop + Auction spending quests
   A finished quest turns the scroll icon red. Tap the quest -> Claim -> the reward is sent to the ENVELOPE (Mail icon) -> open the envelope and tap Claim there to put it in the Bag.
   The reward of a quest is fixed (the same two items every time you look at it), so the player can tap an item and see its stats BEFORE finishing the quest.
   Progress is saved with the character (store key 'quests', also in the cloud save).
   Other files tell this one what happened with Quests.event(name, data) - see "event" below for the list.
   To add a quest: add one line to QUESTS. To change when the day refreshes: DAY_OFFSET_H here AND in server.js (qDay). */
'use strict';
const Quests = (() => {
  const DAY_OFFSET_H = 8;   // the day changes at midnight of UTC+8 (Philippines). Keep the same number in server.js (qDay)
  const dayKey = () => new Date(Date.now() + DAY_OFFSET_H * 36e5).toISOString().slice(0, 10);
  const msLeft = () => { const n = Date.now() + DAY_OFFSET_H * 36e5; return (Math.floor(n / 864e5) + 1) * 864e5 - n; };

  const CATS = [
    { id: 'level', name: 'Deathbound Level Up', ico: '⭐', daily: false },
    { id: 'arena', name: 'Play Arena', ico: '⚔️', daily: true },
    { id: 'adv', name: 'Play Adventure', ico: '🗺️', daily: true },
    { id: 'unstop', name: 'Become Unstoppable', ico: '🔥', daily: false },
    { id: 'league', name: 'League Mastery', ico: '🛡️', daily: true },
    { id: 'rich', name: 'Wealthy', ico: '💰', daily: true },
  ];

  // reward spec:  chips: N,  items: [ { id, qty } (fixed)  |  { rar, type?, st?, mix?, qty? } (picked ONCE per quest, the same every time) ]
  //   { rar:'rare' } = any Shop gear of that rarity (ring, helmet, armor, shoes, weapon, glove, necklace, wings)   type:'glove' = only that kind
  //   st:true = an upgrade stone of that rarity      mix:true = gear or stone
  // q.daily = comes back every day (progress and claim reset at the day change); otherwise it is done once and for all.
  // q.c = what is counted (see event()), q.n = how many. q.lvl = character level, q.st = "is in a league".
  const Q = [];
  const q = (cat, id, t, d, c, n, r, daily) => Q.push({ cat, id, t, d, c, n, r, daily: !!daily });

  // ---- Deathbound Level Up ----
  [[2, 'common', 300], [5, 'common', 600], [10, 'rare', 1200], [20, 'rare', 2500], [30, 'epic', 4500], [40, 'epic', 7000], [50, 'legendary', 12000]].forEach(([n, rar, chips]) => {
    Q.push({ cat: 'level', id: 'lv' + n, t: 'Reach level ' + n, d: 'Grow your robot to level ' + n + ' with Adventure and Arena fights.', lvl: true, n, daily: false, r: { chips, items: [{ rar }, { rar, mix: true }] } });
  });

  // ---- Play Arena ----
  q('arena', 'ar_first', 'First Blood', 'Play your first fight in the Arena. Win or lose, the reward is yours.', 'arena_total', 1, { chips: 150 });
  q('arena', 'ar_f2', 'Warm Up', 'Play 2 Free Fights in the Arena today.', 'arena_free', 2, { chips: 150 }, 1);
  q('arena', 'ar_f5', 'Regular Fighter', 'Play 5 Free Fights today.', 'arena_free', 5, { chips: 300 }, 1);
  q('arena', 'ar_f8', 'Arena Veteran', 'Play 8 Free Fights today.', 'arena_free', 8, { chips: 500 }, 1);
  q('arena', 'ar_f10', 'Arena Addict', 'Play 10 Free Fights today.', 'arena_free', 10, { chips: 800 }, 1);
  q('arena', 'ar_w1', 'Taste of Victory', 'Win 1 Arena fight today.', 'arena_win', 1, { chips: 250 }, 1);
  q('arena', 'ar_w3', 'Rising Champion', 'Win 3 Arena fights today.', 'arena_win', 3, { chips: 500 }, 1);
  q('arena', 'ar_w5', 'Arena Master', 'Win 5 Arena fights today.', 'arena_win', 5, { chips: 900 }, 1);

  // ---- Play Adventure ----
  q('adv', 'ad_first', 'Into the Wild', 'Play your first Adventure stage.', 'adv_play', 1, { items: [{ rar: 'common', type: 'glove' }] });
  q('adv', 'ad_boss1', 'Rustjaw Colossus', 'Defeat the first boss, Rustjaw Colossus (Scrapheap Canyon).', 'boss_canyon', 1, { chips: 200, items: [{ id: 'mat_stone1', qty: 1 }] });
  q('adv', 'ad_d1', 'Stage Runner', 'Clear 2 Adventure stages today.', 'adv_clear', 2, { chips: 120 }, 1);
  q('adv', 'ad_d2', 'Stage Crusher', 'Clear 4 Adventure stages today.', 'adv_clear', 4, { chips: 250 }, 1);
  q('adv', 'ad_rust', 'Rustjaw Again', 'Defeat Rustjaw Colossus today.', 'boss_canyon', 1, { items: [{ id: 'mat_stone1', qty: 1 }] }, 1);
  q('adv', 'ad_d3', 'Boss Hunter', 'Defeat any boss today.', 'adv_boss', 1, { chips: 200, items: [{ id: 'mat_stone1', qty: 1 }] }, 1);
  q('adv', 'ad_cryo', 'Cold Blooded', 'Defeat Cryo Sovereign (Frostfang Glacier) today.', 'boss_glacier', 1, { chips: 250, items: [{ id: 'mat_stone1', qty: 2 }] }, 1);
  q('adv', 'ad_d4', 'Adventure Addict', 'Clear 6 Adventure stages today.', 'adv_clear', 6, { chips: 400 }, 1);
  q('adv', 'ad_h1', 'Feeling Brave', 'Clear 1 stage on HARD today.', 'adv_hard_clear', 1, { chips: 300, items: [{ id: 'mat_stone1', qty: 2 }] }, 1);
  q('adv', 'ad_volt', 'Storm Breaker', 'Defeat Volt Overlord (Voltspire Citadel) today.', 'boss_citadel', 1, { chips: 350, items: [{ id: 'mat_stone2', qty: 1 }] }, 1);
  q('adv', 'ad_d6', 'Double Trouble', 'Defeat 2 bosses today.', 'adv_boss', 2, { chips: 300, items: [{ id: 'mat_stone2', qty: 1 }] }, 1);
  q('adv', 'ad_ember', 'Forge Fighter', 'Defeat Magma Behemoth (Ember Forge) today.', 'boss_ember', 1, { chips: 400, items: [{ id: 'mat_stone2', qty: 2 }] }, 1);
  q('adv', 'ad_h3', 'Hard Mode Hero', 'Clear 3 stages on HARD today.', 'adv_hard_clear', 3, { items: [{ rar: 'rare' }] }, 1);
  q('adv', 'ad_ruins', 'Overgrown', 'Defeat Verdant Colossus (Overgrown Ruins) today.', 'boss_ruins', 1, { chips: 500, items: [{ id: 'mat_stone2', qty: 2 }] }, 1);
  q('adv', 'ad_d9', 'Marathon', 'Clear 10 Adventure stages today.', 'adv_clear', 10, { chips: 700 }, 1);
  q('adv', 'ad_hb', 'Hard Boss', 'Defeat a boss on HARD today.', 'adv_hard_boss', 1, { chips: 500, items: [{ rar: 'rare', mix: true }] }, 1);
  q('adv', 'ad_d12', 'Boss Slayer', 'Defeat 4 bosses today.', 'adv_boss', 4, { chips: 800, items: [{ id: 'mat_stone2', qty: 2 }] }, 1);
  q('adv', 'ad_he1', 'Heroic Deed', 'Clear 1 stage on HEROIC today.', 'adv_heroic_clear', 1, { items: [{ rar: 'epic' }] }, 1);
  q('adv', 'ad_heb', 'Heroic Boss', 'Defeat a boss on HEROIC today.', 'adv_heroic_boss', 1, { chips: 1500, items: [{ rar: 'epic' }, { rar: 'epic', st: true }] }, 1);

  // ---- Become Unstoppable (stones only, max 4 of a kind, never refreshes) ----
  q('unstop', 'up_1', 'Open the Armory', 'Open the Armory and upgrade any item once (Bag > Forge).', 'up_ok', 1, { items: [{ id: 'mat_stone1', qty: 2 }] });
  q('unstop', 'up_2', 'Getting Stronger', 'Upgrade any item to +2.', 'up_any', 2, { items: [{ id: 'mat_stone1', qty: 2 }] });
  q('unstop', 'up_3', 'Sharpened', 'Upgrade a weapon to +3.', 'up_w', 3, { items: [{ id: 'mat_stone1', qty: 3 }] });
  q('unstop', 'up_4', 'Armored Up', 'Upgrade a helmet, ring, armor, shoes or glove to +3.', 'up_g', 3, { items: [{ id: 'mat_stone1', qty: 3 }] });
  q('unstop', 'up_5', 'Forge Regular', 'Upgrade items successfully 10 times.', 'up_ok', 10, { items: [{ id: 'mat_stone1', qty: 4 }] });
  q('unstop', 'up_6', 'Fortified Weapon', 'Upgrade a weapon to +5.', 'up_w', 5, { items: [{ id: 'mat_stone2', qty: 2 }] });
  q('unstop', 'up_7', 'Fortified Gear', 'Upgrade a helmet, ring, armor, shoes or glove to +5.', 'up_g', 5, { items: [{ id: 'mat_stone2', qty: 2 }] });
  q('unstop', 'up_8', 'Beyond +5', 'Upgrade any item to +6.', 'up_any', 6, { items: [{ id: 'mat_stone2', qty: 3 }] });
  q('unstop', 'up_9', 'Deadly Weapon', 'Upgrade a weapon to +7.', 'up_w', 7, { items: [{ id: 'mat_stone2', qty: 4 }] });
  q('unstop', 'up_10', 'Master Smith', 'Upgrade items successfully 30 times.', 'up_ok', 30, { items: [{ id: 'mat_stone2', qty: 4 }] });
  q('unstop', 'up_11', 'Heavy Metal', 'Upgrade any item to +8.', 'up_any', 8, { items: [{ id: 'mat_stone3', qty: 2 }] });
  q('unstop', 'up_12', 'Legendary Blade', 'Upgrade a weapon to +9.', 'up_w', 9, { items: [{ id: 'mat_stone3', qty: 3 }] });
  q('unstop', 'up_13', 'Almost Perfect', 'Upgrade any item to +10.', 'up_any', 10, { items: [{ id: 'mat_stone3', qty: 4 }] });
  q('unstop', 'up_14', 'UNSTOPPABLE', 'Upgrade any item to the maximum, +12.', 'up_any', 12, { items: [{ id: 'mat_stone4', qty: 2 }] });

  // ---- League Mastery ----
  Q.push({ cat: 'league', id: 'lg_first', t: 'Join the Fight', d: 'Create a league or join one in the League House.', st: true, c: 'league_in', n: 1, daily: false, r: { chips: 500, items: [{ id: 'mat_stone1', qty: 2 }] } });
  q('league', 'lg_a1', 'League Duty', 'Play 1 League Fight in the Arena today.', 'arena_league', 1, { chips: 200 }, 1);
  q('league', 'lg_c1', 'Pay Your Dues', 'Earn league contribution today (win a fight as a league member).', 'league_contrib', 1, { chips: 300 }, 1);
  q('league', 'lg_w1', 'For the League', 'Win 1 Arena fight as a league member today.', 'lg_win', 1, { chips: 250 }, 1);
  q('league', 'lg_a3', 'League Warrior', 'Play 3 League Fights today.', 'arena_league', 3, { chips: 450 }, 1);
  q('league', 'lg_c3', 'Dedicated Member', 'Earn league contribution 3 times today.', 'league_contrib', 3, { items: [{ rar: 'common' }, { rar: 'common', st: true }] }, 1);
  q('league', 'lg_w3', 'League Hero', 'Win 3 Arena fights as a league member today.', 'lg_win', 3, { chips: 400, items: [{ rar: 'rare' }] }, 1);
  q('league', 'lg_sh', 'League Shopper', 'Buy something in the League Shop today.', 'league_shop', 1, { items: [{ rar: 'rare', mix: true }] }, 1);
  q('league', 'lg_a5', 'League Legend', 'Play 5 League Fights today.', 'arena_league', 5, { chips: 700, items: [{ rar: 'rare' }] }, 1);

  // ---- Wealthy ----
  q('rich', 'wl_first', 'Big Spender', 'Open the Shop and spend some chips (any amount).', 'shop_buys', 1, { chips: 250 });
  q('rich', 'wl_s1', 'Window Shopper', 'Spend 500 chips today (Shop + Auction).', 'spent', 500, { chips: 200 }, 1);
  q('rich', 'wl_p1', 'Put It on Sale', 'Post an item in the Auction House today.', 'auc_post', 1, { chips: 250 }, 1);
  q('rich', 'wl_a1', 'Bargain Hunter', 'Buy 1 item in the Auction House today.', 'auc_buys', 1, { chips: 300 }, 1);
  q('rich', 'wl_s2', 'Shopping Spree', 'Spend 1,500 chips today.', 'spent', 1500, { chips: 400 }, 1);
  q('rich', 'wl_s3', 'Big Basket', 'Spend 3,000 chips today.', 'spent', 3000, { items: [{ rar: 'common' }] }, 1);
  q('rich', 'wl_a3', 'Auction Regular', 'Buy 3 items in the Auction House today.', 'auc_buys', 3, { chips: 600 }, 1);
  q('rich', 'wl_s4', 'High Roller', 'Spend 6,000 chips today.', 'spent', 6000, { items: [{ rar: 'rare' }] }, 1);
  q('rich', 'wl_as', 'Auction Tycoon', 'Spend 2,000 chips in the Auction House today.', 'auc_spend', 2000, { items: [{ rar: 'rare', mix: true }] }, 1);
  q('rich', 'wl_s5', 'Moneybags', 'Spend 12,000 chips today.', 'spent', 12000, { items: [{ rar: 'epic' }] }, 1);
  q('rich', 'wl_s6', 'Tycoon', 'Spend 25,000 chips today.', 'spent', 25000, { items: [{ rar: 'epic' }, { rar: 'legendary', st: true }] }, 1);

  let C = null, active = false, patched = false, tm = 0, announced = new Set(), uiClose = null, lastCat = null;

  // ---------- save (per character, also in the cloud save) ----------
  const blank = () => ({ v: 1, day: dayKey(), tot: {}, d: {}, done: {}, dd: {} });
  function load() {
    let s = null; try { s = store.get('quests', null); } catch (e) { }
    if (!s || typeof s !== 'object') s = blank();
    for (const k of ['tot', 'd', 'done', 'dd']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
    if (s.day !== dayKey()) { s.day = dayKey(); s.d = {}; s.dd = {}; try { store.set('quests', s); } catch (e) { } }   // a new day: the daily quests start again
    return s;
  }
  const save = s => { try { store.set('quests', s); } catch (e) { } };
  const bump = (name, n) => { const s = load(); s.tot[name] = (s.tot[name] | 0) + n; s.d[name] = (s.d[name] | 0) + n; save(s); };
  const raise = (name, v) => { const s = load(); s.tot[name] = Math.max(s.tot[name] | 0, v | 0); s.d[name] = Math.max(s.d[name] | 0, v | 0); save(s); };

  const valueOf = (qq, s) => qq.lvl ? (() => { try { return Profile.level(); } catch (e) { return 1; } })() : qq.st ? (C && C.inLeague && C.inLeague() ? 1 : 0) : ((qq.daily ? s.d : s.tot)[qq.c] | 0);
  const isDone = (qq, s) => valueOf(qq, s) >= qq.n;
  const isClaimed = (qq, s) => !!(qq.daily ? s.dd : s.done)[qq.id];
  const ofCat = id => Q.filter(x => x.cat === id);
  const ready = (cat, s) => ofCat(cat).filter(x => !isClaimed(x, s) && isDone(x, s));
  function pending() { const s = load(); return CATS.reduce((a, c) => a + ready(c.id, s).length, 0); }

  // ---------- rewards ----------
  const RARS = ['legendary', 'epic', 'rare', 'common'], STONE_QTY = { common: 3, rare: 2, epic: 2, legendary: 1 };
  const strHash = t => { let x = 2166136261; for (let i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  const itemOf = id => { try { return itemById(id) || null; } catch (e) { return null; } };
  function gearPool(rar) {
    const out = [], seen = new Set();
    const lists = [typeof ITEMS !== 'undefined' ? ITEMS : [], typeof SHOP_GEAR_ITEMS !== 'undefined' ? SHOP_GEAR_ITEMS : [], typeof SHOP_WEAPON_ITEMS !== 'undefined' ? SHOP_WEAPON_ITEMS : [], typeof NECK_ITEMS !== 'undefined' ? NECK_ITEMS : [], typeof GLOVE_ITEMS !== 'undefined' ? GLOVE_ITEMS : [], typeof WING_ITEMS !== 'undefined' ? WING_ITEMS : []];
    for (const L of lists) {
      for (const it of L) { if (!it || it.rar !== rar || it.type === 'mat' || it.potion || it.heal || it.sig || seen.has(it.id)) continue; let p = 0; try { p = itemPrice(it); } catch (e) { } if (p > 0) { seen.add(it.id); out.push(it); } }
    }
    return out.sort((a, b) => a.id < b.id ? -1 : 1);
  }
  function stonePool(rar) { let L = []; try { L = MAT_ITEMS.filter(m => m.kind === 'stone' && m.rar === rar); } catch (e) { } return L.slice().sort((a, b) => a.id < b.id ? -1 : 1); }
  const memo = {};
  function rewardOf(qq) {   // { chips, items: [ { it, id, qty } ] }  (the same every time for a quest)
    const r = qq.r || {}, key = qq.id; if (memo[key]) return memo[key];
    const rng = mulberry(strHash(qq.id)), used = new Set(), items = [];
    for (const sp of r.items || []) {
      if (sp.id) { const it = itemOf(sp.id); if (it) items.push({ it, id: it.id, qty: sp.qty || 1 }); continue; }
      let pick = null, isStone = false;
      for (let k = Math.max(0, RARS.indexOf(sp.rar)); k < RARS.length && !pick; k++) {   // no item of that rarity in the shop? use the next lower one
        const rar = RARS[k], g = sp.st ? [] : gearPool(rar).filter(x => (!sp.type || x.type === sp.type) && !used.has(x.id)), s = (sp.st || sp.mix) ? stonePool(rar).filter(x => !used.has(x.id)) : [];
        const all = sp.st ? s : sp.mix ? g.concat(s) : g;
        if (all.length) { pick = all[Math.floor(rng() * all.length)]; isStone = pick.type === 'mat'; }
      }
      if (pick) { used.add(pick.id); items.push({ it: pick, id: pick.id, qty: sp.qty || (isStone ? STONE_QTY[pick.rar] || 1 : 1) }); }
    }
    return memo[key] = { chips: r.chips | 0, items };
  }
  const fmt = n => (n | 0).toLocaleString();
  const chipsImg = () => 'assets/chip.png';

  // ---------- events from the game ----------
  //  'arena'  { mode:'free'|'league', win }    a finished Arena fight
  //  'adv'    { win, boss, diff, map }         an Adventure stage ended (diff 0 normal, 1 hard, 2 heroic; map = map id like 'canyon')
  //  'up'     { ok, lvl, type }                one Forge upgrade try (lvl = the level after it)
  //  'shop_spend' { amount }   'auction_spend' { amount }   'auction_post'   'league_contrib'   'league_shop'
  function event(name, d) {
    if (!active) return; d = d || {};
    try {
      if (name === 'arena') {
        bump('arena_total', 1); bump(d.mode === 'league' ? 'arena_league' : 'arena_free', 1);
        if (d.win) { bump('arena_win', 1); if (C && C.inLeague && C.inLeague()) bump('lg_win', 1); }
      } else if (name === 'adv') {
        bump('adv_play', 1);
        if (d.win) {
          bump('adv_clear', 1); if (d.boss) { bump('adv_boss', 1); if (d.map) bump('boss_' + d.map, 1); }
          if (d.diff === 1) { bump('adv_hard_clear', 1); if (d.boss) bump('adv_hard_boss', 1); }
          if (d.diff >= 2) { bump('adv_heroic_clear', 1); if (d.boss) bump('adv_heroic_boss', 1); }
        }
      } else if (name === 'up') {
        if (d.ok) { bump('up_ok', 1); raise('up_any', d.lvl); raise(d.type === 'weapon' ? 'up_w' : 'up_g', d.lvl); }
      } else if (name === 'shop_spend') { bump('shop_buys', 1); bump('spent', d.amount | 0); }
      else if (name === 'auction_spend') { bump('auc_buys', 1); bump('auc_spend', d.amount | 0); bump('spent', d.amount | 0); }
      else if (name === 'auction_post') bump('auc_post', 1);
      else if (name === 'league_contrib') bump('league_contrib', 1);
      else if (name === 'league_shop') bump('league_shop', 1);
    } catch (e) { }
    tick();
  }

  // red number on the scroll icon + a toast the first time a quest is finished
  function readyKeys() { const s = load(), out = []; for (const c of CATS) for (const x of ready(c.id, s)) out.push(x.id + '|' + (x.daily ? s.day : 'once')); return out; }
  function paint() {
    const n = pending();
    document.querySelectorAll('.ibar button[aria-label="Quests"],.lgib button[aria-label="Quests"]').forEach(b => {
      let i = b.querySelector('.qbadge');
      if (!n) { if (i) i.remove(); return; }
      if (!i) { i = document.createElement('i'); i.className = 'mbadge qbadge'; b.append(i); }
      i.textContent = n > 9 ? '9+' : String(n);
    });
  }
  function tick(first) {
    if (!active) return;
    try {
      const keys = readyKeys(); let fresh = null;
      for (const k of keys) if (!announced.has(k)) { announced.add(k); if (!first && !fresh) fresh = Q.find(x => x.id === k.split('|')[0]); }
      if (fresh && C) C.toast('Quest complete: ' + fresh.t + '! Tap the scroll to claim it.');
      paint();
    } catch (e) { }
  }

  // ---------- hooks into the game's own code (online only) ----------
  function patch() {
    if (patched) return; patched = true;
    try {
      if (typeof Adventure !== 'undefined' && Adventure.onOver) {
        const o = Adventure.onOver;
        Adventure.onOver = function () {
          let st = null, map = '', diff = 0;
          try { const M = ADV_MAPS[this.mi]; st = this.stagesOf(M)[this.si]; map = M.id; diff = this.diff | 0; } catch (e) { }
          const r = o.apply(this, arguments);
          try { event('adv', { win: !!this.win, boss: !!(st && st.boss), map, diff }); } catch (e) { }
          return r;
        };
      }
    } catch (e) { }
    try {
      if (typeof Forge !== 'undefined' && Forge.go) {
        const o = Forge.go;
        Forge.go = function () {
          let id = null, it = null; const res0 = Forge.res;
          try { id = Forge.item; it = id ? itemById(id) : null; } catch (e) { }
          const r = o.apply(this, arguments);
          try { if (id && Forge.res && Forge.res !== res0) event('up', { ok: !!Forge.res.ok, lvl: Profile.lvl(id), type: it && it.type }); } catch (e) { }
          return r;
        };
      }
    } catch (e) { }
  }
  function start(ctx) {
    C = ctx; active = true; patch(); announced = new Set(); tick(true);
    clearInterval(tm); tm = setInterval(() => tick(), 2500);
  }
  function stop() { active = false; clearInterval(tm); tm = 0; if (uiClose) { try { uiClose(); } catch (e) { } } uiClose = null; }

  // ---------- claim ----------
  let busy = false;
  async function claim(qq, done) {
    if (busy || !C) return; const s = load(); if (!isDone(qq, s) || isClaimed(qq, s)) return;
    const rw = rewardOf(qq); busy = true;
    try {
      await C.api('quest/claim', { qid: qq.id, daily: qq.daily ? 1 : 0, day: s.day, title: qq.t, chips: rw.chips, items: rw.items.map(x => ({ item: x.id, qty: x.qty })) });
      const s2 = load(); (qq.daily ? s2.dd : s2.done)[qq.id] = 1; save(s2);
      C.toast('Reward sent to your envelope! Open the Mail icon and tap Claim.'); try { C.nudge(); } catch (e) { }
      busy = false; tick(); done && done(true);
    } catch (e) {
      busy = false;
      if (e && e.status === 401) return C.expired();
      if (e && e.status === 409 && /already claimed/i.test(e.message || '')) { const s2 = load(); (qq.daily ? s2.dd : s2.done)[qq.id] = 1; save(s2); done && done(true); }
      C.toast((e && e.message) || 'Could not claim. Try again.');
    }
  }

  // ---------- screens ----------
  const CSS = `
#onl .qs-w{width:min(620px,97vw)}
#onl .qs-body{display:flex;gap:8px;height:min(290px,58vh);margin-top:4px}
#onl .qs-cats{flex:none;width:clamp(118px,27%,168px);display:flex;flex-direction:column;gap:4px;overflow-y:auto}
#onl .qs-cat{position:relative;display:flex;align-items:center;gap:6px;padding:6px 7px;border-radius:9px;border:2px solid rgba(255,224,160,.25);background:rgba(20,10,2,.5);cursor:pointer;text-align:left;font:700 12px/1.15 var(--body,sans-serif);color:#f3e4c4}
#onl .qs-cat.on{border-color:#ffd34a;background:rgba(255,211,74,.2);color:#fff}
#onl .qs-cat span{font-size:17px;flex:none}#onl .qs-cat small{display:block;color:#cdb98f;font:600 10px var(--body,sans-serif)}
#onl .qs-cat .mbadge{top:-5px;right:-4px}
#onl .qs-list{flex:1;min-width:0;overflow-y:auto;padding-right:2px}
#onl .qs-head{display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin:0 0 4px;color:#ffd34a;font:400 15px var(--disp,sans-serif)}
#onl .qs-head small{font:700 11px var(--body,sans-serif);color:#cdb98f}
#onl .qs-card{position:relative;margin:0 0 6px;padding:6px 8px;border-radius:10px;border:2px solid rgba(255,224,160,.3);background:rgba(20,10,2,.55);cursor:pointer;text-align:left}
#onl .qs-card.rdy{border-color:#7dffa0;background:rgba(60,160,80,.22);box-shadow:0 0 10px rgba(125,255,160,.35)}
#onl .qs-card.lock{opacity:.5;cursor:default}
#onl .qs-card b{display:block;font:400 14px var(--disp,sans-serif);color:#fff2da}
#onl .qs-card p{margin:2px 0 4px;color:#e9dcc0;font:600 11px/1.3 var(--body,sans-serif)}
#onl .qs-bar{position:relative;height:12px;border-radius:7px;background:rgba(0,0,0,.55);border:1px solid rgba(255,224,160,.35);overflow:hidden}
#onl .qs-bar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(#ffd34a,#e0801a)}
#onl .qs-bar span{position:absolute;inset:0;text-align:center;font:700 10px/12px var(--body,sans-serif);color:#fff;text-shadow:0 1px 1px #000}
#onl .qs-rw{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:5px}
#onl .qs-rw .rc{display:flex;align-items:center;gap:3px;padding:1px 6px 1px 2px;border-radius:7px;background:rgba(0,0,0,.4);border:1px solid rgba(255,224,160,.3);font:700 11px var(--body,sans-serif);color:#ffd34a}
#onl .qs-rw img{width:22px;height:22px;object-fit:contain}
#onl .qs-tag{position:absolute;top:5px;right:7px;padding:2px 7px;border-radius:7px;font:700 11px var(--body,sans-serif);background:#1f9d55;border:1px solid #bfffd6;color:#fff}
#onl .qs-done{margin:6px 2px;color:#cdb98f;font:700 12px var(--body,sans-serif);text-align:center}
#onl .qs-det{display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center;padding:2px 2px 4px}
#onl .qs-det .qs-bar{width:min(300px,90%)}
#onl .qs-cells{display:flex;gap:7px;justify-content:center;flex-wrap:wrap}
#onl .qs-cells .cslot{width:84px;height:100px}
#onl .qs-cells .cslot u{text-decoration:none;position:absolute;top:2px;right:3px;font:700 11px var(--body,sans-serif);color:#fff;background:#b8360f;border-radius:5px;padding:0 4px}
#onl .qs-cells .cslot img{width:46px;height:46px;object-fit:contain}
#onl .qs-hint{margin:0;color:#cdb98f;font:600 11px var(--body,sans-serif)}
`;
  const cssOnce = () => { if (!document.getElementById('qsCss')) { const s = document.createElement('style'); s.id = 'qsCss'; s.textContent = CSS; document.head.append(s); } };

  function statHtml(it) {
    try {
      if (it.type === 'necklace') return '<span class="pos">+' + ((it.stats && it.stats.nhp) || 0) + '% of total Health</span>';
      if (it.potion || it.type === 'mat') return it.line ? '<span class="pos">' + it.line + '</span>' : '';
      return Profile.statText(statsAt(it, 0));
    } catch (e) { return ''; }
  }
  function open() {
    if (!C) return; const t = C.parent(); if (!t) return; cssOnce();
    const h = C.h; let box = null, cat = lastCat, pop = null, itemPop = null;
    if (!cat) { const s0 = load(); cat = (CATS.find(c => ready(c.id, s0).length) || CATS[0]).id; }
    const left = h('div', { class: 'qs-cats' }), right = h('div', { class: 'qs-list' });
    const close = () => { clearInterval(iv); if (box) box.remove(); box = null; uiClose = null; };
    uiClose = close;
    const bar = (v, n) => h('div', { class: 'qs-bar' }, h('i', { style: 'width:' + Math.min(100, Math.round(Math.min(v, n) / n * 100)) + '%' }), h('span', null, fmt(Math.min(v, n)) + ' / ' + fmt(n)));
    function rewardRow(qq) {
      const rw = rewardOf(qq), kids = [];
      if (rw.chips) kids.push(h('div', { class: 'rc' }, h('img', { src: chipsImg(), alt: '' }), fmt(rw.chips)));
      for (const x of rw.items) kids.push(h('div', { class: 'rc' }, x.it.img ? h('img', { src: x.it.img, alt: '' }) : null, x.it.name + (x.qty > 1 ? ' ×' + x.qty : '')));
      return h('div', { class: 'qs-rw' }, kids);
    }
    function showItem(x) {
      if (itemPop) itemPop.remove(); const it = x.it, st = h('div', { class: 'st' }); st.innerHTML = statHtml(it);
      const rc = (RARITY[it.rar] || RARITY.common).color;
      const body = h('div', { class: 'idet', style: '--rc:' + rc }, it.img ? h('img', { src: it.img, alt: '', draggable: 'false' }) : null,
        h('div', { class: 'in' }, it.name + (x.qty > 1 ? ' ×' + fmt(x.qty) : '')), h('small', null, it.type === 'mat' ? 'Upgrade stone' : (RARITY[it.rar] || RARITY.common).name + ' ' + it.type), st, h('p', null, it.desc || ''),
        h('div', { class: 'wbtn', style: 'margin-top:4px', onclick: () => { C.beep(); itemPop.remove(); itemPop = null; } }, 'Close'));
      itemPop = h('div', { class: 'pop wood', style: 'z-index:80', onclick: e => { if (e.target === itemPop) { itemPop.remove(); itemPop = null; } } }, h('div', { class: 'wpnl lgw', style: 'width:min(300px,92vw)' }, body));
      t.append(itemPop);
    }
    function showQuest(qq) {
      if (pop) pop.remove(); const s = load(), v = valueOf(qq, s), done = v >= qq.n, got = isClaimed(qq, s), rw = rewardOf(qq), cells = [];
      if (rw.chips) cells.push(h('div', { class: 'cslot has lgn', style: '--rc:#ffd34a' }, h('img', { src: chipsImg(), alt: '' }), h('b', null, 'Chips'), h('u', null, fmt(rw.chips))));
      for (const x of rw.items) cells.push(h('div', { class: 'cslot has tap lgn', style: '--rc:' + (RARITY[x.it.rar] || RARITY.common).color, onclick: () => { C.beep(); showItem(x); } }, x.it.img ? h('img', { src: x.it.img, alt: '' }) : null, h('b', null, x.it.name), x.qty > 1 ? h('u', null, '×' + x.qty) : null));
      const shut = () => { if (pop) pop.remove(); pop = null; };
      const act = got ? h('div', { class: 'wbtn off' }, 'Claimed') : done ? h('div', { class: 'wbtn', onclick: () => { C.beep(); claim(qq, ok => { shut(); if (box) draw(); }); } }, 'Claim') : h('div', { class: 'wbtn off' }, 'Not finished yet');
      const body = h('div', { class: 'qs-det' }, h('div', { class: 'lgtitle' }, h('span', null, qq.t), h('div', { class: 'lgx wbtn', onclick: () => { C.beep(); shut(); } }, 'X')),
        h('p', { class: 'qs-hint' }, qq.d), bar(v, qq.n), h('div', { class: 'qs-hint' }, 'Reward' + (qq.daily ? '  ·  comes back every day' : '')), h('div', { class: 'qs-cells' }, cells),
        h('p', { class: 'qs-hint' }, 'Tap an item to see its stats. The reward goes to your envelope when you claim.'), h('div', { style: 'display:flex;gap:8px' }, act, h('div', { class: 'wbtn red', onclick: () => { C.beep(); shut(); } }, 'Close')));
      pop = h('div', { class: 'pop wood', style: 'z-index:70', onclick: e => { if (e.target === pop) shut(); } }, h('div', { class: 'wpnl lgw', style: 'width:min(420px,96vw)' }, body));
      t.append(pop);
    }
    function draw() {
      if (!box) return; const s = load(); const sc = right.scrollTop;
      left.replaceChildren(...CATS.map(c => {
        const all = ofCat(c.id), n = all.filter(x => isClaimed(x, s)).length, rd = ready(c.id, s).length;
        const b = h('div', { class: 'qs-cat' + (c.id === cat ? ' on' : ''), onclick: () => { C.beep(); cat = lastCat = c.id; draw(); right.scrollTop = 0; } }, h('span', null, c.ico), h('div', null, c.name, h('small', null, n + ' / ' + all.length + ' done' + (c.daily ? ' · daily' : ''))));
        if (rd) b.append(h('i', { class: 'mbadge' }, String(rd)));
        return b;
      }));
      const c = CATS.find(x => x.id === cat), all = ofCat(cat), open_ = all.filter(x => !isClaimed(x, s)), first = open_.find(x => !isDone(x, s));
      const show = open_.filter(x => isDone(x, s) || x === first), nextUp = open_.filter(x => !show.includes(x)).slice(0, 2), nDone = all.length - open_.length;
      const kids = [h('div', { class: 'qs-head' }, c.name, h('small', null, c.daily ? 'Daily quests refresh in ' + (() => { const m = msLeft(), hh = Math.floor(m / 36e5), mm = Math.floor(m % 36e5 / 6e4); return hh + 'h ' + mm + 'm'; })() : 'These quests never refresh'))];
      for (const x of show) {
        const v = valueOf(x, s), dn = v >= x.n;
        kids.push(h('div', { class: 'qs-card' + (dn ? ' rdy' : ''), onclick: () => { C.beep(); showQuest(x); } }, h('b', null, x.t), dn ? h('div', { class: 'qs-tag' }, 'Claim!') : null, h('p', null, x.d), bar(v, x.n), rewardRow(x)));
      }
      for (const x of nextUp) kids.push(h('div', { class: 'qs-card lock' }, h('b', null, x.t), h('p', null, 'Finish the quest above to unlock this one.')));
      if (!open_.length) kids.push(h('div', { class: 'qs-done' }, c.daily ? 'All done for today! New quests come in ' + (() => { const m = msLeft(); return Math.floor(m / 36e5) + 'h ' + Math.floor(m % 36e5 / 6e4) + 'm'; })() + '.' : 'You finished every quest here. Great job!'));
      else if (nDone) kids.push(h('div', { class: 'qs-done' }, '✓ ' + nDone + ' finished' + (c.daily ? ' (some of them reset every day)' : '')));
      right.replaceChildren(...kids); right.scrollTop = sc;
    }
    const title = h('div', { class: 'lgtitle' }, h('span', null, 'Quests'), h('div', { class: 'lgx wbtn', onclick: () => { C.beep(); close(); } }, 'X'));
    box = h('div', { class: 'pop wood', style: 'z-index:62', onclick: e => { if (e.target === box) close(); } }, h('div', { class: 'wpnl lgw qs-w' }, title, h('div', { class: 'qs-body' }, left, right),
      h('p', { class: 'qs-hint', style: 'text-align:center;margin:4px 0 0' }, 'Finish a quest, tap it, press Claim. The reward waits in your envelope (Mail icon).')));
    t.append(box); draw();
    const iv = setInterval(() => { if (!box || !box.isConnected) return clearInterval(iv); if (!busy && !pop && !itemPop) draw(); }, 3000);
  }

  return { start, stop, open, event, pending, paint };
})();
