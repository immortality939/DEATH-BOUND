/* ONLINE VERSION of ui.js - upload this file to GitHub (online game only).
   The offline app keeps using ui.js. Edit the two files separately on purpose. */
'use strict';
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');

// ---------------- front-view character portraits (for the pick menu) ----------------
const FRONT = {
  '01_Inferno_Titan':   { b: '#4a1410', l: '#a2402f', v: '#ff8a2a', a: '#ff883f', f: 'spikes', fc: '#d9c2b8' },
  '02_Frost_Reaper':    { b: '#4f8fc4', l: '#e4f5ff', v: '#4fe8ff', a: '#3fa4ff', f: 'fins',   fc: '#f2fbff' },
  '03_Toxic_Crusher':   { b: '#17421a', l: '#43903a', v: '#c6ff3f', a: '#baff3f', f: 'antenna', fc: '#baff3f' },
  '04_Golden_Warlord':  { b: '#5e3f10', l: '#c0902c', v: '#fff6c8', a: '#ffcd3f', f: 'crown',  fc: '#ffd24a' },
  '05_Shadow_Ninja':    { b: '#241545', l: '#5d3c92', v: '#ff3fe8', a: '#bc3fff', f: 'mohawk', fc: '#c04bff' },
  '06_Thunder_Striker': { b: '#1b2a76', l: '#4a60c8', v: '#ffffff', a: '#ffdf3f', f: 'horns',  fc: '#ffdf3f' },
  '07_Steel_Juggernaut':{ b: '#434852', l: '#a3acb8', v: '#ff9d3f', a: '#ff9d3f', f: 'box',    fc: '#ff9d3f' },
  '08_Void_Phantom':    { b: '#1f0f42', l: '#5b36a4', v: '#3ffff3', a: '#3ffff3', f: 'fins',   fc: '#9b6cff' },
  '09_Blood_Berserker': { b: '#74101a', l: '#d2434d', v: '#ff4a4a', a: '#ececec', f: 'mohawk', fc: '#f2f2f2' },
  '10_Emerald_Guardian':{ b: '#0d6e4b', l: '#44dca0', v: '#c4ffe8', a: '#3fff97', f: 'antenna', fc: '#3fff97' },
};
// New front-view artwork (assets/robots/front/<id>.webp, 336x440) is shown in the Profile, the robot pick screen and the battle setup picks.
function frontSVG(id) {
  return `<svg viewBox="0 0 336 440" preserveAspectRatio="xMidYMax meet"><image href="assets/robots/front/${id}.webp" xlink:href="assets/robots/front/${id}.webp" x="0" y="0" width="336" height="440"/></svg>`;
}
function frontSVG_old(id) {
  const s = FRONT[id] || FRONT['01_Inferno_Titan'], P = pts => pts.map(p => p.join(',')).join(' ');
  let back = '', top = '';
  const ant = (box) => `<line x1="50" y1="19" x2="50" y2="8" stroke="#8a93a6" stroke-width="3"/>` + (box ? `<rect x="43" y="1" width="14" height="9" rx="2" fill="${s.fc}"/>` : `<circle cx="50" cy="7" r="4.5" fill="${s.fc}"/>`);
  if (s.f === 'spikes') {
    for (let a = -170; a <= -10; a += 22) { const r1 = (a - 7) * Math.PI / 180, r2 = (a + 7) * Math.PI / 180, rt = a * Math.PI / 180; back += `<polygon points="${P([[50 + 31 * Math.cos(r1), 52 + 31 * Math.sin(r1)], [50 + 47 * Math.cos(rt), 52 + 47 * Math.sin(rt)], [50 + 31 * Math.cos(r2), 52 + 31 * Math.sin(r2)]])}" fill="${s.fc}"/>`; }
    back += `<polygon points="${P([[14, 80], [8, 98], [22, 86]])}" fill="${s.a}"/><polygon points="${P([[86, 80], [92, 98], [78, 86]])}" fill="${s.a}"/>`;
  } else if (s.f === 'fins') {
    back += ant(false) + `<polygon points="${P([[0, 50], [24, 32], [26, 68]])}" fill="${s.fc}"/><polygon points="${P([[100, 50], [76, 32], [74, 68]])}" fill="${s.fc}"/>`;
  } else if (s.f === 'antenna') back += ant(false);
  else if (s.f === 'box') back += ant(true);
  else if (s.f === 'crown') { [[28, 12], [39, 6], [50, 3], [61, 6], [72, 12]].forEach(([x, y]) => back += `<polygon points="${P([[x - 6, 28], [x, y], [x + 6, 28]])}" fill="${s.fc}"/>`); }
  else if (s.f === 'mohawk') { [[39, 9], [45, 3], [51, 1], [57, 3], [63, 9]].forEach(([x, y]) => back += `<polygon points="${P([[x - 5, 24], [x, y], [x + 5, 24]])}" fill="${s.fc}"/>`); }
  else if (s.f === 'horns') back += `<polygon points="${P([[20, 40], [6, 4], [38, 22]])}" fill="${s.fc}"/><polygon points="${P([[80, 40], [94, 4], [62, 22]])}" fill="${s.fc}"/>` + ant(false);
  const legs = `<rect x="35" y="82" width="5" height="8" fill="#2b2f3a"/><rect x="60" y="82" width="5" height="8" fill="#2b2f3a"/><rect x="28" y="88" width="19" height="8" rx="3" fill="${s.a}"/><rect x="53" y="88" width="19" height="8" rx="3" fill="${s.a}"/>`;
  const hands = [14, 86].map(x => `<circle cx="${x}" cy="72" r="8" fill="#343946"/><circle cx="${x - 2}" cy="69.5" r="3" fill="#fff" opacity=".35"/>`).join('');
  const body = `<circle cx="50" cy="52" r="34" fill="${s.b}" stroke="rgba(0,0,0,.45)" stroke-width="2"/><circle cx="46" cy="47" r="27" fill="${s.l}" opacity=".5"/><ellipse cx="36" cy="33" rx="10" ry="6" transform="rotate(-30 36 33)" fill="#fff" opacity=".25"/>`;
  const visor = `<rect x="22" y="39" width="56" height="20" rx="10" fill="#080b14"/><rect x="25" y="42" width="50" height="14" rx="7" fill="${s.v}"/><rect x="30" y="44.5" width="26" height="3" rx="1.5" fill="#fff" opacity=".65"/><line x1="50" y1="42" x2="50" y2="56" stroke="#080b14" stroke-width="2" opacity=".35"/>`;
  const chest = `<path d="M28 68 Q50 80 72 68" stroke="${s.a}" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="50" cy="75" r="3" fill="${s.a}"/>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${back}${legs}${body}${chest}${visor}${hands}</svg>`;
}
const UI = {
  paused: false, setup: store.get('setup', { teams: [{ cpu: false, robot: 0 }, { cpu: true, robot: 1 }, { cpu: true, robot: 2 }, { cpu: true, robot: 3 }], nT: 2, per: 3, diff: 1, theme: 'auto', map: 'random' }),
  touchOn: false, hudT: 0, lastSig: '',
  show(name) { for (const id of ['loading', 'title', 'howto', 'setup', 'profile', 'shop', 'adventure', 'over', 'wmenu', 'pauseScr']) { const el = $(id); if (el) el.hidden = id !== name; } $('menufx').hidden = !(name === 'title' || name === 'howto' || name === 'setup' || name === 'profile' || name === 'shop' || name === 'adventure' || name === 'loading'); $('hud').hidden = !(name === 'game' || name === 'wmenu' || name === 'pauseScr' || name === 'over'); $('touch').hidden = !(this.touchOn && (name === 'game')); if (name === 'game') { $('wmenu').hidden = true; } $('hint').hidden = this.touchOn; },
  seg(el, vals, cur, cb) { el.innerHTML = ''; vals.forEach(([v, label]) => { const b = document.createElement('button'); b.textContent = label; if (v === cur) b.className = 'on'; b.onclick = () => { cb(v); this.seg(el, vals, v, cb); }; el.appendChild(b); }); },
  thumb(r) { return `background-image:url(assets/${r.sheet});background-size:400% 300%;background-position:0 100%`; },
  buildSetup() {
    const S = this.setup, save = () => store.set('setup', S);
    this.seg($('sTeams'), [[2, '2'], [3, '3'], [4, '4']], S.nT, v => { S.nT = v; save(); this.buildRows(); });
    this.seg($('sPer'), [[1, '1'], [2, '2'], [3, '3'], [4, '4']], S.per, v => { S.per = v; save(); });
    this.seg($('sDiff'), [[0, 'Easy'], [1, 'Normal'], [2, 'Hard']], S.diff, v => { S.diff = v; save(); });
    this.seg($('sTheme'), [['auto', 'Map'], ['random', 'Random'], ['day', 'Day'], ['sunset', 'Sunset'], ['night', 'Night']], S.theme, v => { S.theme = v; save(); });
    this.buildMaps();
    this.buildRows();
  },
  buildMaps() {
    const S = this.setup, box = $('mapGrid'), save = () => store.set('setup', S);
    if (S.map !== 'random' && !mapById(S.map)) S.map = 'random';
    box.innerHTML = '';
    const cards = [{ id: 'random', name: 'Random', desc: 'A surprise map every battle' }, ...MAPS];
    const sel = () => { [...box.children].forEach((c, i) => c.classList.toggle('on', cards[i].id === S.map)); $('mapDesc').textContent = (cards.find(c => c.id === S.map) || cards[0]).desc; };
    cards.forEach(m => {
      const c = document.createElement('div'); c.className = 'mapc'; c.dataset.id = m.id;
      c.innerHTML = (m.id === 'random' ? '<div class="mq">?</div>' : '<img alt="" draggable="false">') + `<span>${m.name}</span>`;
      c.onclick = () => { S.map = m.id; save(); sel(); }; box.appendChild(c);
    });
    sel();
    // previews are drawn one by one so the menu never freezes
    const imgs = [...box.querySelectorAll('.mapc')].filter(c => c.dataset.id !== 'random'); let i = 0;
    const next = () => { if (i >= imgs.length || !box.isConnected) return; const c = imgs[i++]; c.querySelector('img').src = mapPreview(mapById(c.dataset.id)); setTimeout(next, 0); };
    setTimeout(next, 20);
  },
  buildRows() {
    const S = this.setup, box = $('teamRows'); box.innerHTML = '';
    for (let i = 0; i < S.nT; i++) {
      const t = S.teams[i], row = document.createElement('div'); row.className = 'team'; row.style.setProperty('--tc', TEAM_COLORS[i]);
      row.innerHTML = `<div class="nm"><span class="dot" style="background:${TEAM_COLORS[i]}"></span>${TEAM_NAMES[i]}</div>`;
      const tog = document.createElement('div'); tog.className = 'seg'; tog.style.minWidth = '150px'; row.appendChild(tog);
      this.seg(tog, [[false, 'Human'], [true, 'CPU']], t.cpu, v => { t.cpu = v; store.set('setup', S); });
      const rn = document.createElement('span'); rn.className = 'rn'; rn.textContent = Assets.robots.robots[t.robot].name; row.querySelector('.nm').appendChild(rn);
      const picks = document.createElement('div'); picks.className = 'picks'; row.appendChild(picks);
      if (i === 0 && typeof Profile !== 'undefined') {   // your robot is the one you chose in New Game: it cannot be changed here
        const pd = Profile.data || Profile.load(), r0 = Assets.robots.robots[pd.char]; t.robot = pd.char; rn.textContent = r0.name + ' · your robot';
        const p0 = document.createElement('div'); p0.className = 'pick on'; p0.title = r0.name; p0.innerHTML = frontSVG(r0.id); picks.appendChild(p0); box.appendChild(row); continue;
      }
      Assets.robots.robots.forEach((r, k) => { const p = document.createElement('div'); p.className = 'pick' + (t.robot === k ? ' on' : ''); p.title = r.name; p.innerHTML = frontSVG(r.id); p.onclick = () => { t.robot = k; rn.textContent = r.name; store.set('setup', S); [...picks.children].forEach((c, j) => c.classList.toggle('on', j === k)); }; picks.appendChild(p); });
      box.appendChild(row);
    }
  },
  async start() {
    Snd.init(); this.show('loading'); $('loadtxt').textContent = 'Building the battlefield…';
    if (typeof Profile !== 'undefined') this.setup.teams[0].robot = (Profile.data || Profile.load()).char;   // your own robot
    const S = this.setup, used = new Set(S.teams.slice(0, S.nT).map(t => t.robot));
    await Promise.all([...used].map(k => loadImage(Assets.robots.robots[k].death)));
    const mp = S.map === 'random' ? MAPS[rint(0, MAPS.length - 1)] : (mapById(S.map) || MAPS[0]);
    const sky = S.theme === 'auto' ? mp.bg : S.theme === 'random' ? ['day', 'sunset', 'night'][rint(0, 2)] : S.theme;
    const themes = [sky];
    await Promise.all(themes.flatMap(t => ['sky', 'far', 'mid', 'near'].map(l => loadImage(Assets.bg[t][l]))));
    await Promise.all(Assets.robots.robots.map(r => loadImage(r.sheet)));
    if (mp.img) await loadImage(mp.img).catch(() => { });   // the map picture
    await new Promise(r => setTimeout(r, 30));
    newGame({ teams: S.teams.slice(0, S.nT), per: S.per, diff: S.diff, theme: sky, map: mp });
    this.show('game'); this.lastSig = '';
  },
  buildWeapons() {
    const g = $('wgrid'); g.innerHTML = ''; const t = curTeam(); if (!t) return;
    WEAPONS.forEach((wd, i) => {
      if (wd.sig && wd.sig !== t.robot.id && !(t.ammo[wd.id] > 0)) return;   // other robots' signature weapons are not shown
      if (wd.boss && wd.boss !== t.robot.id) return;   // boss weapons belong to their boss only
      if ((wd.shop || wd.sig) && !(t.ammo[wd.id] > 0)) return;   // shop weapons: only the one you wear; your signature weapon is hidden while a shop weapon is worn
      if (wd.heal) return;   // Divine Heal has its own button next to the weapon button
      if (G.adv && !(t.ammo[wd.id] > 0)) return;   // Adventure: only the weapon from your inventory is listed
      const am = t.ammo[wd.id], el = document.createElement('div'); el.className = 'wc' + (am <= 0 ? ' no' : '') + (t.sel === i ? ' sel' : '');
      el.innerHTML = `<img src="assets/${wpath(wd.id, (wd.sig || wd.shop) ? teamWTier(t) : 0)}" alt=""><b>${wd.name}</b><small>${wd.desc}</small><span class="am">${am === Infinity ? '∞' : 'x' + am}</span>`;
      el.onclick = () => { if (am > 0) { t.sel = i; Snd.play('beep'); this.closeWeapons(); this.lastSig = ''; } else Snd.play('dud'); };
      g.appendChild(el);
    });
  },
  canPick() { return G.mode === 'play' && G.phase === 'aim' && curTeam() && !curTeam().cpu; },
  openWeapons() { if (!this.canPick()) return; this.buildWeapons(); $('wmenu').hidden = false; },
  closeWeapons() { $('wmenu').hidden = true; },
  togglePause(v) { if (G.mode !== 'play') return; this.paused = v === undefined ? !this.paused : v; $('pauseScr').hidden = !this.paused; },
  showOver() {
    setTimeout(() => {
      if (typeof Adventure !== 'undefined' && Adventure.active) { Adventure.onOver(); return; }   // Adventure has its own result screen
      $('bAgain').textContent = 'Play again'; $('bMenu').textContent = 'Menu';
      const w = G.winner; $('overT').textContent = w ? w.name.toUpperCase() + ' TEAM WINS!' : 'DRAW!'; $('overT').style.color = w ? w.color : '#fff';
      let chipTxt = ''; if (typeof Wallet !== 'undefined' && G.teams.some(t => !t.cpu)) { const n = w && !w.cpu ? 60000000 : 15; Wallet.add(n); chipTxt = ` · +${n} chips`; if (typeof Stones !== 'undefined') { const sn = w && !w.cpu ? 3 : 1; Stones.add(sn); chipTxt += ` · +${sn} stone${sn > 1 ? 's' : ''}`; } if (typeof Profile !== 'undefined') chipTxt += Profile.xpText(Profile.addXp(w && !w.cpu ? 450 : 12)); }   // XP: a win gives more   // every match pays chips, a win pays more
      $('overS').textContent = (w ? `${w.robot.name}s take the arena · ${G.turnCount} turns` : 'Everybody got blown up') + chipTxt;
      $('over').hidden = false; $('hud').hidden = true; $('touch').hidden = true;
    }, 1600);
  },
  meterBuilt: false,
  meter() {
    const p = $('pwr'); if (!this.meterBuilt) { this.meterBuilt = true; let h = ''; for (let i = 0; i <= 30; i++) { const x = i * 5, lx = x / (POW_MAX * 100) * 100, big = i % 2 === 0; h += `<span class="tk${big ? ' big' : ''}" style="left:${lx}%"></span>`; if (x % 25 === 0) h += `<span class="tn" style="left:${lx}%">${x}</span>`; } p.insertAdjacentHTML('beforeend', h); this.mk = p.querySelector('.mk'); this.rd = p.querySelector('.rd'); this.fill = p.querySelector('.bar i'); this.last = p.querySelector('.last'); this.lm = p.querySelector('.lm'); this.lt = p.querySelector('.lt'); }
    const t = curTeam(), wd = t && WEAPONS[t.sel], show = G.mode === 'play' && G.phase === 'aim' && wd && (wd.charge || G.flyMode) && !t.cpu;
    p.classList.toggle('on', !!G.charging); p.classList.toggle('faint', !G.charging && !!show);
    const v = G.charging ? G.charge : 0; this.fill.style.width = (v / POW_MAX * 100) + '%'; this.mk.style.left = (v / POW_MAX * 100) + '%'; this.rd.textContent = Math.round(v * 100);
    // blurry red zone 0 -> where the last shot stopped, so the player knows if this shot will reach the same strength
    const aw = G.activeWorm, lpv = aw ? (G.flyMode ? aw.lastFlyPow : aw.lastPow) : 0, lp = t && !t.cpu && aw && lpv > 0 && wd && (wd.charge || G.flyMode) ? Math.round(lpv * 100) : 0, sh = (show || G.charging) && lp > 0;
    this.last.style.width = sh ? (lp / (POW_MAX * 100) * 100) + '%' : '0'; this.lm.style.display = this.lt.style.display = sh ? 'block' : 'none';
    if (sh) { this.lm.style.left = this.lt.style.left = (lp / (POW_MAX * 100) * 100) + '%'; this.lt.textContent = lp; }
  },
  hud() {
    const t = curTeam(), w = G.activeWorm; if (!t) return;
    const sig = G.teams.map(x => teamHP(x.idx)).join(',') + '|' + G.cur + '|' + t.sel + '|' + (t.ammo[WEAPONS[t.sel].id]) + '|' + (healWd() ? t.ammo[healWd().id] : 0) + '|' + (t.pots || []).map(p => p ? p.left : '-').join('.') + '|' + (G.potUsed | 0) + '|' + (t.cpu ? 1 : 0) + '|' + (G.flyMode ? 1 : 0);
    if (sig !== this.lastSig) {
      this.lastSig = sig; const box = $('teams'); box.innerHTML = '';
      G.teams.forEach(x => { const hp = teamHP(x.idx), mx = G.worms.reduce((a, m) => a + (m.team === x.idx ? m.maxHp : 0), 0) || 1, d = document.createElement('div'); d.className = 'tchip' + (x.idx === G.cur ? ' act' : '') + (hp <= 0 ? ' out' : ''); d.style.setProperty('--tc', x.color); d.innerHTML = `<span class="nmx">${x.name}${x.cpu ? ' · CPU' : ''}</span><span class="hpb"><i style="width:${hp / mx * 100}%"></i></span>`; box.appendChild(d); });
      const hw = healWd(), hb = $('hbtn'), hasHeal = !!(hw && !t.cpu && t.ammo[hw.id] > 0), healOn = hasHeal && WEAPONS[t.sel] === hw;
      hb.hidden = !hasHeal; hb.classList.toggle('on', healOn && !G.flyMode); $('wbtn').classList.toggle('on', hasHeal && !healOn && !G.flyMode);
      { const fb = $('fbtn'); fb.hidden = !(!t.cpu && !G.swarm && (!FLY_ADVENTURE_ONLY || G.adv) && !!(t.bonus && t.bonus.wing)); fb.classList.toggle('on', !!G.flyMode); }   // Fly button (right of Divine Heal): only shown when Wings are worn (no Wings = no Fly button)
      if (hasHeal) $('hammo').textContent = '+' + ((t.bonus && t.bonus.heal) || hw.proj.heal) + ' HP' + (t.ammo[hw.id] === Infinity ? '' : ' · ' + t.ammo[hw.id] + ' left');
      [0, 1].forEach(i => { const b = $('pb' + (i + 1)), p = t.pots && t.pots[i]; b.hidden = !!t.cpu; if (t.cpu) return; b.classList.toggle('empty', !p); b.classList.toggle('dis', !!p && (p.left <= 0 || (G.potUsed | 0) >= POTION_PER_TURN)); b.title = p ? p.name + ': heals ' + Math.round(p.pct * 100) + '% of max health' + (p.kind === 'team' ? ' (whole team)' : '') : ''; b.innerHTML = p ? `<img src="${p.img}" alt="" draggable="false"><b>x${p.left}</b><small>${p.name}</small>` : '<small>Item</small>'; });   // the two clickable item boxes (Heal / Team Heal)
      const wd = WEAPONS[mainSel(t)]; $('wimg').src = 'assets/' + wpath(wd.id, (wd.sig || wd.shop) ? teamWTier(t) : 0); $('wname').textContent = wd.name; const am = t.ammo[wd.id]; $('wammo').textContent = am === Infinity ? 'unlimited' : am + ' left';
    }
    { const pb = $('bPass'); if (pb) pb.style.visibility = (G.mode === 'play' && G.phase === 'aim' && !G.swarm && !UI.paused && curTeam() && !curTeam().cpu && !G.charging) ? 'visible' : 'hidden'; }   // PASS shows only on a human's aiming turn
    const sec = Math.max(0, Math.ceil(G.timer / 60)), tm = $('timer'); tm.textContent = G.phase === 'aim' || G.phase === 'retreat' ? sec : '--'; tm.className = G.phase === 'retreat' ? 'ret' : (G.phase === 'aim' && sec <= 5 ? 'warn' : '');
    const wf = $('windfill'), wv = G.wind; wf.style.left = wv < 0 ? (50 + wv * 50) + '%' : '50%'; wf.style.width = Math.abs(wv) * 50 + '%'; $('windtxt').textContent = (wv < 0 ? '◀ ' : '') + Math.round(Math.abs(wv) * 10) + (wv >= 0 ? ' ▶' : '');
    $('wbtn').style.opacity = this.canPick() ? 1 : .55;
    if (G.banner && G.banner.t === 1) { const b = $('banner'); b.textContent = G.banner.text; b.style.color = G.banner.color; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
  },
};

// ---------------- input ----------------
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
addEventListener('keydown', e => {
  if (G.mode !== 'play' && G.mode !== 'over') return; Snd.init();
  if (KEYMAP[e.code]) { In[KEYMAP[e.code]] = true; e.preventDefault(); }
  else if (e.code === 'Space') { if (!e.repeat && !In.fire) In.firePressed = true; In.fire = true; e.preventDefault(); }
  else if (e.code === 'Enter') { In.jump = true; e.preventDefault(); }
  else if (e.code === 'Backspace') { In.flip = true; e.preventDefault(); }
  else if (e.code === 'Tab' || e.code === 'KeyW') { e.preventDefault(); if (!$('wmenu').hidden) UI.closeWeapons(); else UI.openWeapons(); }
  else if (e.code === 'Escape') { if (!$('wmenu').hidden) UI.closeWeapons(); else UI.togglePause(); }
  else if (e.code === 'KeyF') { if (!e.repeat) $('fbtn').click(); }
  else if (e.code === 'KeyM') { Snd.setMute(!Snd.muted); $('bMute').style.opacity = Snd.muted ? .45 : 1; }
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') G.cam.mul = clamp(G.cam.mul * 1.15, .6, 2.2);
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') G.cam.mul = clamp(G.cam.mul / 1.15, .6, 2.2);
  In.fast = e.shiftKey;
});
addEventListener('keyup', e => { In.fast = e.shiftKey; if (KEYMAP[e.code]) In[KEYMAP[e.code]] = false; else if (e.code === 'Space') In.fire = false; });
addEventListener('blur', () => { In.left = In.right = In.up = In.down = In.fire = false; });
document.querySelectorAll('.tb').forEach(b => {
  const k = b.dataset.k, down = e => { e.preventDefault(); Snd.init(); b.classList.add('dn'); if (k === 'fire') { if (!In.fire) In.firePressed = true; In.fire = true; } else if (k === 'jump') In.jump = true; else if (k === 'flip') In.flip = true; else In[k] = true; }, up = e => { e.preventDefault(); b.classList.remove('dn'); if (k === 'fire') In.fire = false; else if (k !== 'jump' && k !== 'flip') In[k] = false; };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
});
function healWd() { return WEAPONS.find(w => w.heal); }
function mainSel(t) {   // the normal weapon of the team (what the weapon button shows), even while Divine Heal is selected
  const hw = healWd(), hi = WEAPONS.indexOf(hw); if (t.sel !== hi) return t.sel;
  if (t.prevSel != null && t.prevSel !== hi && WEAPONS[t.prevSel] && t.ammo[WEAPONS[t.prevSel].id] > 0) return t.prevSel;
  return Math.max(0, WEAPONS.findIndex(x => !x.heal && t.ammo[x.id] > 0));
}
$('wbtn').onclick = () => { const t = curTeam(), hw = healWd(); if (G.flyMode && !G.charging) { G.flyMode = false; Snd.play('beep'); UI.lastSig = ''; return; }   // tap while Fly is chosen = back to your weapon
   if (UI.canPick() && hw && t.sel === WEAPONS.indexOf(hw)) { t.sel = mainSel(t); Snd.play('beep'); UI.lastSig = ''; return; } UI.openWeapons(); };   // tap while Divine Heal is chosen = back to your weapon
$('fbtn').onclick = () => {   // Fly: unlimited, tap = select / unselect, then hold FIRE and release
  const t = curTeam(); if (!t || G.charging || !canFly()) return; Snd.play('beep');
  if (G.flyMode) G.flyMode = false; else { const hw = healWd(); if (hw && t.sel === WEAPONS.indexOf(hw)) t.sel = mainSel(t); G.flyMode = true; }
  UI.lastSig = '';
};
[0, 1].forEach(i => $('pb' + (i + 1)).onclick = () => { const t = curTeam(); if (!t || t.cpu || !UI.canPick() || G.charging) return; if (usePotion(t.idx, i)) UI.lastSig = ''; else if (!(t.pots && t.pots[i])) Snd.play('beep'); });   // tap an item box: Heal / Team Heal
$('hbtn').onclick = () => { const t = curTeam(), hw = healWd(); if (!UI.canPick() || !hw || !(t.ammo[hw.id] > 0) || G.charging) return; G.flyMode = false; UI.lastSig = ''; const hi = WEAPONS.indexOf(hw); if (t.sel !== hi) { t.prevSel = t.sel; t.sel = hi; Snd.play('beep'); UI.lastSig = ''; } }; $('bWClose').onclick = () => UI.closeWeapons();
$('bZoomIn').onclick = () => G.cam.mul = clamp(G.cam.mul * 1.2, .6, 2.2); $('bZoomOut').onclick = () => G.cam.mul = clamp(G.cam.mul / 1.2, .6, 2.2);
$('bMute').onclick = () => { Snd.init(); Snd.setMute(!Snd.muted); $('bMute').style.opacity = Snd.muted ? .45 : 1; };
$('bPause').onclick = () => UI.togglePause(true); $('bResume').onclick = () => UI.togglePause(false); $('bQuit').onclick = () => { UI.paused = false; G.mode = 'menu'; if (typeof Adventure !== 'undefined' && Adventure.active) Adventure.open(); else UI.show('title'); };
$('bPass').onclick = () => { if (G.mode === 'play' && G.phase === 'aim' && !G.swarm && !UI.paused && curTeam() && !curTeam().cpu) { Snd.play('beep'); G.charging = false; G.charge = 0; endTurnNow(); } };   // PASS: skip this turn without shooting
$('bPlay').onclick = () => { goLandscape(); Snd.init(); Snd.play('beep'); UI.buildSetup(); UI.show('setup'); };
$('bHow').onclick = () => UI.show('howto'); $('bHowBack').onclick = () => UI.show('title');
$('bSetBack').onclick = () => UI.show('title'); $('bStart').onclick = () => UI.start();
$('bAgain').onclick = () => { $('over').hidden = true; if (typeof Adventure !== 'undefined' && Adventure.active) Adventure.again(); else UI.start(); }; $('bMenu').onclick = () => { G.mode = 'menu'; $('over').hidden = true; if (typeof Adventure !== 'undefined' && Adventure.active) Adventure.menu(); else UI.show('title'); };
cv.addEventListener('wheel', e => { if (G.mode === 'play') { G.cam.mul = clamp(G.cam.mul * (e.deltaY < 0 ? 1.1 : .9), .6, 2.2); e.preventDefault(); } }, { passive: false });

// ---------------- main loop ----------------
function resize() { const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.max(320, Math.floor(innerWidth * dpr)); cv.height = Math.max(240, Math.floor(innerHeight * dpr)); }
addEventListener('resize', resize); resize();
let last = performance.now(), acc = 0, menuT = 0;
function loop(now) {
  const dt = Math.min(100, now - last); last = now; acc += dt;
  if (G.mode === 'play' || G.mode === 'over') {
    while (acc >= 16.667) { acc -= 16.667; if (!UI.paused) updateGame(); }
    if (G.terrain) renderGame(ctx, cv.width, cv.height);
    if (G.mode === 'play' && !UI.paused && ++UI.hudT % 3 === 0) UI.hud();
    UI.meter();
  } else {
    acc = 0; // menu scene is a static image + CSS sprites (#menufx); nothing is drawn per frame here
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------------- look around (drag / swipe) + teleport tap ----------------
(function () {
  const cv = $('cv');
  const toWorld = e => { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * (VIEW.W / r.width), py = (e.clientY - r.top) * (VIEW.H / r.height); return [(px - VIEW.W / 2) / VIEW.z + VIEW.cx, (py - VIEW.H / 2) / VIEW.z + VIEW.cy]; };
  const humanAim = () => G.mode === 'play' && G.phase === 'aim' && !UI.paused && G.activeWorm && curTeam() && !curTeam().cpu;
  const canLook = () => G.mode === 'play' && !UI.paused && !!G.activeWorm;   // swipe to look around ANY time, even on the CPU's turn
  const tele = () => humanAim() && curWeapon().type === 'teleport';
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    if (!canLook()) return; Snd.init();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  });
  cv.addEventListener('pointermove', e => {
    if (drag && drag.id === e.pointerId) {
      let dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) { drag.moved = true; dx = e.clientX - drag.sx; dy = e.clientY - drag.sy; }
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.moved) {
        const r = cv.getBoundingClientRect(), k = VIEW.W / r.width, c = G.cam;
        c.free = true; c.x = clamp(c.x - dx * k / VIEW.z, 0, WORLD_W); c.y = clamp(c.y - dy * k / VIEW.z, -250, WORLD_H); G.teleHover = null; return;
      }
    }
    if (!tele()) { G.teleHover = null; return; } const [x, y] = toWorld(e); G.teleHover = { x, y, spot: findTeleSpot(x, y) };
  });
  const end = e => {
    if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null;
    if (!d.moved && tele()) { const [x, y] = toWorld(e); G.teleHover = { x, y, spot: findTeleSpot(x, y) }; doTeleport(x, y); }   // a tap (not a swipe) teleports
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => { drag = null; });
  $('bCenter').onclick = () => { G.cam.free = false; };
})();

// ---------------- landscape (tries to lock it; the CSS overlay covers browsers that refuse) ----------------
function goLandscape() {
  if (!UI.touchOn) return;
  try {
    const el = document.documentElement, p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
    Promise.resolve(p).catch(() => { }).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); });
  } catch (e) { }
}

// ---------------- boot ----------------
(async function boot() {
  const t0 = performance.now(), sp = $('splash'), spb = sp.querySelector('i'); const SPLASH_MS = 3000;
  const endSplash = async () => { const r = SPLASH_MS - (performance.now() - t0); if (r > 0) await new Promise(f => setTimeout(f, r)); sp.classList.add('out'); setTimeout(() => sp.remove(), 700); };
  UI.touchOn = (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window); UI.show('loading');
  try {
    await loadCore(p => { $('loadbar').firstElementChild.style.width = (p * 100) + '%'; spb.style.width = (p * 90) + '%'; });
    await Promise.all(['sky', 'far', 'mid', 'near'].map(l => loadImage(Assets.bg.sunset[l])));
    UI.show('title'); $('bMute').style.opacity = Snd.muted ? .45 : 1; spb.style.width = '100%'; await endSplash();
  } catch (e) { sp.classList.add('out'); $('loadtxt').textContent = 'Could not load game files: ' + e.message; }
})();

// ---------------- menu embers (CSS-animated sprites, created once) ----------------
(function () {
  const st = document.querySelector('#menufx .stage'); if (!st) return;
  for (let i = 0; i < 14; i++) {
    const e = document.createElement('i'); e.className = 'em';
    e.style.left = (4 + Math.random() * 92) + '%'; e.style.setProperty('--dx', (Math.random() * 8 - 4) + 'vw');
    e.style.animationDuration = (5 + Math.random() * 5) + 's'; e.style.animationDelay = (-Math.random() * 10) + 's';
    st.appendChild(e);
  }
})();

// ---------------- menu scene: Inferno Titan (Titan Cannon) vs Magma Golem ----------------
// One loop = 9 s: the Titan raises his cannon and fires -> the ball hits the Golem (explosion, flinch) -> the Golem winds up (act-sheet frames 9, 10, 11)
// and throws a rock -> it hits the Titan (explosion, knock-back). Everything is in "stage px" of a 1920x1080 stage; only transforms / background-position change.
(function () {
  const st = document.querySelector('#menufx .stage'); if (!st) return;
  const E = id => document.getElementById(id), T = E('msT'), C = E('msC'), G = E('msG'), B = E('msB'), R = E('msR'), Z = E('msZ'), X = [E('msX1'), E('msX2')];
  const bds = T.querySelectorAll('.bd, .fs');
  const LOOP = 9, PX = 1;
  // layout (stage px): Titan frame 326.4, Golem frame 598.4, ground line y = 930
  const TX = 120, TY = 649.5, GX = 1261, GY = 369, TW = 326.4, GW = 598.4;
  const PIV = [TX + 204.7, TY + 207.4], MUZ = 125.3;                  // cannon pivot (his hand) and the muzzle distance from it
  const GOLEM_CHEST = [1565, 660], GOLEM_HAND = [1404, 661], TITAN_BODY = [262, 790];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp = (a, b, u) => a + (b - a) * u;
  let s = 1, last = 0, vis = true;
  const put = (el, x, y, sx, sy, rot) => { el.style.transform = 'translate(' + (x * s).toFixed(1) + 'px,' + (y * s).toFixed(1) + 'px) rotate(' + (rot || 0).toFixed(3) + 'rad) scale(' + (sx == null ? 1 : sx) + ',' + (sy == null ? 1 : sy) + ')'; };
  const sheet = (el, f, cols, rows) => { const c = f % cols, r = Math.floor(f / cols); el.style.backgroundPosition = (cols > 1 ? c * 100 / (cols - 1) : 0) + '% ' + (rows > 1 ? r * 100 / (rows - 1) : 0) + '%'; };
  const fly = (p0, p1, u, h) => [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u) - 4 * h * u * (1 - u)];   // straight line + parabola bulge = a lobbed shot
  const boom = (el, x, y, t0, t, size) => {                                                       // explosion_big sheet: 14 frames (7x2) at 22 fps
    const f = Math.floor((t - t0) * 22);
    if (t < t0 || f > 13) { el.style.opacity = 0; return; }
    el.style.opacity = f > 10 ? .6 : 1; sheet(el, f, 7, 2); const k = size / 380; put(el, x - 190 * k, y - 190 * k, k, k, 0);
  };
  const AIM0 = 16, AIM1 = 40, FIRE = 1.3, BALL_T = 1.2, HIT1 = FIRE + BALL_T, WIND = 3.6, THROW = 4.4, ROCK_T = 1.2, HIT2 = THROW + ROCK_T;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const m = $('menufx'); if (m.hidden) return;
    if (now - last < 30) return; last = now;                                                      // ~33 fps is plenty for a menu
    s = st.offsetWidth / 1920; const t = (now / 1000) % LOOP;
    // ---- Titan: raise cannon -> fire (recoil) -> relax; knock-back + red flash when the rock lands ----
    let aim = AIM0 + (AIM1 - AIM0) * sm(seg(t, .2, 1.1)); aim = lerp(aim, AIM0, sm(seg(t, HIT1 + .3, HIT1 + 1.4)));
    const rc = t >= FIRE && t < FIRE + .35 ? Math.sin(seg(t, FIRE, FIRE + .35) * Math.PI) : 0;    // recoil 0..1..0
    const hit2 = seg(t, HIT2, HIT2 + .7), kb = t >= HIT2 && t < HIT2 + .7 ? Math.sin(hit2 * Math.PI) : 0;
    const br = 1 + Math.sin(now / 520) * .012;                                                    // breathing
    put(T, TX - 34 * kb - 12 * rc, TY, 1, br, 0);
    C.style.transform = 'rotate(' + (-aim).toFixed(2) + 'deg) translateX(' + (-9 * rc * s).toFixed(1) + 'px)';
    const flashT = t >= HIT2 && t < HIT2 + .3 && ((t * 24) | 0) % 2 === 0;
    T.style.filter = flashT ? 'brightness(1.7) sepia(1) saturate(4) hue-rotate(-30deg)' : '';
    // ---- Golem: idle breathing -> wind-up frames 9, 10 -> throw frame 11 -> back; flinch + red flash when the ball lands ----
    let gf = 0;
    if (t >= WIND && t < WIND + .4) gf = 9; else if (t >= WIND + .4 && t < THROW) gf = 10; else if (t >= THROW && t < THROW + .55) gf = 11;
    sheet(G, gf, 7, 4);
    const gh = t >= HIT1 && t < HIT1 + .6 ? Math.sin(seg(t, HIT1, HIT1 + .6) * Math.PI) : 0, gb = 1 + Math.sin(now / 640 + 1) * .01;
    put(G, GX + 22 * gh, GY, -1, gb, 0);
    G.style.filter = (t >= HIT1 && t < HIT1 + .3 && ((t * 24) | 0) % 2 === 0) ? 'brightness(1.8) sepia(1) saturate(4) hue-rotate(-30deg)' : '';
    // ---- Titan Cannon ball ----
    if (t >= FIRE && t < HIT1) {
      const a = AIM1 * Math.PI / 180, p0 = [PIV[0] + Math.cos(a) * MUZ, PIV[1] - Math.sin(a) * MUZ], u = seg(t, FIRE, HIT1), p = fly(p0, GOLEM_CHEST, u, 170);
      put(B, p[0] - 35, p[1] - 35, 1, 1, u * 14); B.style.opacity = 1;
    } else B.style.opacity = 0;
    // muzzle flash
    if (t >= FIRE && t < FIRE + .22) { const a = AIM1 * Math.PI / 180, k = 1 - seg(t, FIRE, FIRE + .22) * .5; Z.style.opacity = 1 - seg(t, FIRE, FIRE + .22); put(Z, PIV[0] + Math.cos(a) * (MUZ + 20) - 85 * k, PIV[1] - Math.sin(a) * (MUZ + 20) - 85 * k, k, k, 0); } else Z.style.opacity = 0;
    // ---- Golem rock ----
    if (t >= THROW && t < HIT2) {
      const u = seg(t, THROW, HIT2), p = fly(GOLEM_HAND, TITAN_BODY, u, 190);
      put(R, p[0] - 48, p[1] - 54, 1, 1, -u * 11); R.style.opacity = 1;
    } else R.style.opacity = 0;
    // ---- explosions ----
    boom(X[0], GOLEM_CHEST[0], GOLEM_CHEST[1], HIT1, t, 380);
    boom(X[1], TITAN_BODY[0] + 10, TITAN_BODY[1] - 10, HIT2, t, 330);
  }
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches) requestAnimationFrame(frame);
  else { put(T, TX, TY, 1, 1, 0); C.style.transform = 'rotate(-24deg)'; put(G, GX, GY, -1, 1, 0); }
})();
