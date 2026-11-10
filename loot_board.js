/* ===== SHARED LOOT BOARD (Adventure + Arena) =====
   ONE board of face-down cards for everybody in the party / both fighters. Everybody sees every flip LIVE: when a player flips a card,
   it turns over on all phones with his name on it, so you know what he got. Each player flips 1 card (boss stage: 2). A card can only be flipped once.
   The server (POST /api/adv/board and /api/arena/board) only keeps a seed (every phone builds the same cards from it) and who flipped which card.
   Rewards are given to the player who flipped, on his own phone, with the game's own code (same as the offline loot board).
   SharedLoot.open({ call(op, extra) -> Promise<json>, boss, mi, si, df, fallback() }) -> Promise (resolves when the player presses Continue) */
const SharedLoot = (() => {
  const LOOT_TIME = 30, POLL_MS = 500;
  function rollShared(seed, boss, mi, si, df) {   // the same cards on every phone: the game's own Loot.roll, run on the shared seed and with "nothing owned" so the odds are equal for everybody
    const A = Adventure, P = Profile.data || Profile.load(), keep = { mi: A.mi, si: A.si, diff: A.diff, owned: P.owned, rnd: Math.random };
    let s = seed >>> 0;
    const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try { A.mi = mi; A.si = si; A.diff = df; P.owned = []; Math.random = rnd; return Loot.roll(si + mi * 2, boss); }
    finally { Math.random = keep.rnd; P.owned = keep.owned; A.mi = keep.mi; A.si = keep.si; A.diff = keep.diff; }
  }
  function open(o) {
    return new Promise(resolve => {
      let board = null, items = null, stopped = false, busy = false, timer = null, sent = 0;
      const pend = new Set();   // cards I touched that the server has not confirmed yet (they are already turned over on my screen)
      const applied = new Set(), got = [], t0 = performance.now();
      const finish = () => { stopped = true; clearInterval(timer); if (el) el.hidden = true; resolve(); };
      let el = null;
      const fallback = () => { stopped = true; clearInterval(timer); if (o.fallback) { try { o.fallback(resolve); } catch (e) { resolve(); } } else resolve(); };
      const q = async (op, extra) => { try { return await o.call(op, extra || {}); } catch (e) { return null; } };

      function build(j) {
        items = rollShared(j.seed, o.boss, o.mi, o.si, o.df);
        Profile.data || Profile.load();
        el = document.getElementById('loot');
        if (!el) { el = document.createElement('div'); el.id = 'loot'; el.className = 'scr'; $('app').appendChild(el); }
        const cols = o.boss ? 10 : 3;
        el.innerHTML = `<div class="panel lootp"><h2>${o.boss ? 'Boss loot' : 'Stage loot'} ${Wallet.badge()}${Stones.badge()}</h2><p id="lootMsg"></p><div class="loot-bar"><i id="lootBar"></i></div>
          <div class="loot-grid${o.boss ? ' big' : ''}" style="--cols:${cols}">${items.map((it, i) => Loot.cardHTML(it, i)).join('')}</div>
          <div id="lootGot"></div><div class="row"><button class="btn" id="bLootGo" hidden>Continue</button></div></div>`;
        el.hidden = false; try { $('over').hidden = true; } catch (e) { }
        el.querySelectorAll('.lc').forEach(c => c.onclick = () => flip(+c.dataset.i));
        $('bLootGo').onclick = finish;
        if (!document.getElementById('lootShareCss')) { const st = document.createElement('style'); st.id = 'lootShareCss'; st.textContent = '.lc .in{transition:transform .22s}.lc.pend .bk{opacity:.92}.lc.oth .fr,.lc.oth .bk{box-shadow:0 0 0 3px #4da3ff}.lc.oth .bk em{color:#8fc4ff;font-weight:700}.lc.mine .bk{box-shadow:0 0 0 3px #ffd24a}'; document.head.appendChild(st); }
      }
      function msg(j) {
        const m = document.getElementById('lootMsg'); if (!m || !j) return;
        const left = j.per - j.mine;
        m.textContent = j.done ? 'Here is what was hiding on the board:' : left > 0 ? (j.per > 1 ? 'Flip ' + left + ' card' + (left > 1 ? 's' : '') : 'Flip a card') + '! Everybody sees what you get.' : 'Waiting for the other players to flip...';
      }
      function reward(e, card) {   // the same rewards as the offline loot board, for MY flip only
        const D = Profile.data, em = card.querySelector('em');
        if (e.stone) { Stones.add(e.n, e.stone); got.push({ stone: e.stone, n: e.n }); em.textContent = 'You: Added!'; Snd.play(e.stone >= 4 ? 'win' : 'pick'); }
        else if (e.scroll) { Mats.add(matOf('support', 1), e.n); got.push({ scroll: 1, n: e.n }); em.textContent = 'You: Added!'; Snd.play('win'); }
        else if (e.chips) { Wallet.add(e.chips); got.push({ chips: e.chips }); em.textContent = 'You: Added!'; Snd.play(e.chips >= 100 ? 'win' : 'pick'); }
        else { const it = e.it, dup = D.owned.includes(it.id), refund = dup ? Math.round(itemPrice(it) / 10) : 0; if (!dup) D.owned.push(it.id); if (refund) Wallet.add(refund); Profile.save(); got.push({ it, dup, refund }); em.textContent = dup ? 'You: Owned +' + refund : 'You: NEW!'; Snd.play(it.rar === 'legendary' || it.rar === 'epic' ? 'win' : 'pick'); }
      }
      function render(j) {
        if (!j || stopped) return;
        board = j;
        j.picks.forEach((p, i) => {
          if (!p) return; const card = el.querySelector('.lc[data-i="' + i + '"]'); if (!card) return;
          const mine = p.id === o.me;
          if (mine) {
            card.classList.remove('pend', 'oth'); card.classList.add('up', 'mine');
            if (!applied.has(i)) { applied.add(i); reward(items[i], card); }
          } else if (!card.classList.contains('oth')) {   // somebody else has it (also: he was faster than my touch)
            card.classList.remove('pend', 'mine'); card.classList.add('up', 'oth'); card.querySelector('em').textContent = p.name; Snd.play('pick');
          }
        });
        msg(j);
        const b = document.getElementById('lootBar'); if (b) { const left = Math.max(0, LOOT_TIME - (performance.now() - t0) / 1000); b.style.width = (left / LOOT_TIME * 100) + '%'; b.classList.toggle('low', left < 8); }
        if (Math.max(j.mine, applied.size) + pend.size < j.per && performance.now() - t0 > LOOT_TIME * 1000) {   // out of time: the board flips a random free card for me
          const free = j.picks.map((p, i) => p ? -1 : i).filter(i => i >= 0); if (free.length) flip(free[Math.floor(Math.random() * free.length)]);
        }
        if (j.done) {
          stopped = true; clearInterval(timer);
          Loot.el = el; Loot.got = got; Loot.picksLeft = 0; Loot.picked = []; Loot.items = items;
          setTimeout(() => Loot.revealAll(), 500);   // every card turns over; the Continue button comes after
        }
      }
      async function flip(i) {   // the card turns over the moment it is touched; the server only confirms (rewards are given when it does)
        if (stopped || !board || board.done || board.picks[i] || pend.has(i)) return;
        if (Math.max(board.mine, applied.size) + pend.size >= board.per) return;
        const card = el.querySelector('.lc[data-i="' + i + '"]'); if (!card || card.classList.contains('up')) return;
        pend.add(i); card.classList.add('up', 'mine', 'pend'); try { Snd.play('pick'); } catch (e) { }
        const j = await q('pick', { i }); pend.delete(i);
        if (stopped) return;
        if (j && j.picks) render(j);
        if (!applied.has(i) && !card.classList.contains('oth') && !(j && j.picks && j.picks[i])) card.classList.remove('up', 'mine', 'pend');   // the server did not give me this card (no answer / taken): turn it back
      }
      (async () => {
        let j = null; for (let k = 0; k < 3 && !(j && j.seed); k++) { j = await q('open', { n: o.boss ? 30 : 9, per: o.boss ? 2 : 1 }); if (!(j && j.seed)) await new Promise(r => setTimeout(r, 600)); }
        if (!(j && j.seed)) return fallback();   // the server has no board for us: use the normal single-player board
        try { build(j); } catch (e) { return fallback(); }
        render(j);
        timer = setInterval(async () => { if (stopped || busy) return; busy = true; const r = await q('poll'); busy = false; if (stopped) return; if (r && r.picks) render(r); else if (r && r.gone && !stopped) { /* room closed: show what is there */ } }, POLL_MS);
      })();
    });
  }
  return { open };
})();
