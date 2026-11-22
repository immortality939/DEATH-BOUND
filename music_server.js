'use strict';
/* ============================================================================================================
   BACKGROUND MUSIC   (ONLINE game (runs inside the Online frame; upload to GitHub))
   Your mp3 files live in the APK, folder:  assets/musicbackground/   (exact names, spaces included - copy them in as they are):
     lobby sound track | adventure slection | inside arena selection | map 1..10 adventure | map 1..10 arena
     boss orc stage | boss slime king stage | boss demon dragon stage | boss skeleton king stage | boss kingkong stage | boss minotaur stage
     boss scorpion king stage | boss zeus boss stage | boss cenatur warchief stage | boss lava hound stage | boss werewolf boss stage
     boss death reaper stage | boss golem boss stage
   A file that is not in the folder is simply skipped (silence), it never breaks the game.
   Music follows the sound mute button too, and has its own ON/OFF + volume (saved on the phone).
   Online rules: lobby track in the town (after server + character), Arena room = inside arena selection (also while searching), silent on the VS/loading screen, map N arena in the fight; Adventure room = adventure slection, map N adventure / boss track in the stages.
   ============================================================================================================ */
const Music = (() => {
  const DIR = 'assets/musicbackground/';
  const FILE = {
    lobby: 'lobby sound track', advsel: 'adventure slection', arenasel: 'inside arena selection',
    orc: 'boss orc stage', slime: 'boss slime king stage', dragon: 'boss demon dragon stage', skeleton: 'boss skeleton king stage', kong: 'boss kingkong stage',
    mino: 'boss minotaur stage', scorpion: 'boss scorpion king stage', zeus: 'boss zeus boss stage', centaur: 'boss cenatur warchief stage',
    hound: 'boss lava hound stage', werewolf: 'boss werewolf boss stage', reaper: 'boss death reaper stage', golem: 'boss golem boss stage'
  };
  for (let i = 1; i <= 10; i++) { FILE['adv' + i] = 'map ' + i + ' adventure'; FILE['arena' + i] = 'map ' + i + ' arena'; }

  // which boss track each boss uses (Adventure stage field bossId)
  const BOSS = {
    boss_gutrot: 'orc', boss_slimeking: 'slime', boss_slimeking_bog: 'slime', boss_slimeking_crystal: 'slime',
    boss_frostwyrm: 'dragon', boss_cinderdrake: 'dragon', boss_voiddrake: 'dragon', boss_stormbone: 'skeleton', boss_tombking: 'skeleton',
    boss_kingkong: 'kong', boss_templemino: 'mino', boss_zenithmino: 'mino', boss_scorpionking: 'scorpion', boss_zeus: 'zeus',
    boss_warchief: 'centaur', boss_lavahound: 'hound', boss_werewolf: 'werewolf', boss_deathreaper: 'reaper', boss_golem: 'golem'
  };
  // the 10 arena maps, in this order = "map 1 arena" ... "map 10 arena"  (change the order here if you want a different match-up)
  const ARENA_IDS = ['colosseum', 'frozen', 'jungle', 'lavarift', 'dunes', 'graveyard', 'citadel', 'canyon', 'sakura', 'spire'];

  const st = (k, d) => { try { return store.get(k, d); } catch (e) { return d; } };
  const sv = (k, v) => { try { store.set(k, v); } catch (e) { } };
  let on = st('musicOn', true) !== false, vol = Math.max(0, Math.min(100, +st('musicVol', 60) || 0));
  let el = null, key = null, gest = false, dir = null; const outs = [];
  const target = () => (on && !(typeof Snd !== 'undefined' && Snd && Snd.muted)) ? vol / 100 : 0;

  function tryPlay(a) { try { const p = a.play(); if (p && p.catch) p.catch(() => { a._blocked = true; }); } catch (e) { a._blocked = true; } }
  function play(k) {
    if (k && !FILE[k]) k = null;
    if (k === key) return;
    const old = el; el = null; key = k;
    if (old) outs.push(old);
    if (!k) return;
    const a = new Audio(); a.preload = 'auto'; a.loop = true; a.volume = 0; a._k = k;
    a.onerror = () => { a._bad = true; };   // file not copied into the APK yet: just stay silent
    a.src = DIR + encodeURI(FILE[k] + '.mp3'); el = a; tryPlay(a);
  }
  function tick() {
    if (dir) { try { const t = dir(); if (t !== undefined) play(t); } catch (e) { } }
    const hid = typeof document !== 'undefined' && document.hidden;
    if (el) {
      if (hid) { if (!el.paused) el.pause(); }
      else {
        if (el.paused && !el._bad && (!el._blocked || gest)) { el._blocked = false; tryPlay(el); }
        const tv = target(), d = tv - el.volume; el.volume = Math.max(0, Math.min(1, Math.abs(d) < .02 ? tv : el.volume + d * .35));
      }
    }
    for (let i = outs.length - 1; i >= 0; i--) {   // the old track fades out, then it is released
      const a = outs[i]; a.volume = Math.max(0, a.volume * .55 - .01);
      if (a.volume <= .015 || hid) { try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) { } outs.splice(i, 1); }
    }
  }
  setInterval(tick, 120);
  const unlock = () => { gest = true; if (el && el.paused && !el._bad) { el._blocked = false; tryPlay(el); } };
  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(ev => { try { document.addEventListener(ev, unlock, { passive: true }); } catch (e) { } });

  const vis = id => { const e = document.getElementById(id); return !!e && !e.hidden; };
  const bossKey = (M, s) => {   // boss track of a boss stage; a boss without its own mp3 (the robot bosses) uses the track of the map's HEROIC last boss
    let k = BOSS[s && s.bossId];
    if (!k) { try { const L = Adventure.stagesOf(M, 2); k = BOSS[L[L.length - 1].bossId]; } catch (e) { } }
    return k || null;
  };
  const advKey = n => 'adv' + Math.max(1, Math.min(10, n));
  const arenaKey = map => {   // map picture of a fight -> "map N arena"
    let i = map ? ARENA_IDS.indexOf(map.id) : -1;
    if (i < 0 && map && typeof MAPS !== 'undefined') { const j = MAPS.findIndex(m => m.id === map.id); if (j >= 0) i = j % 10; }
    return 'arena' + ((i < 0 ? 0 : i) + 1);
  };
  const gameKey = () => {   // the track of the battle that is running now
    if (G.adv && typeof Adventure !== 'undefined' && Adventure.active) {
      const M = ADV_MAPS[Adventure.mi], s = M && Adventure.stagesOf(M)[Adventure.si];
      if (s && s.boss) return bossKey(M, s) || advKey(Adventure.mi + 1);
      return advKey(Adventure.mi + 1);
    }
    return arenaKey(G.map);
  };

  // volume levels for the little music buttons / settings
  const api = {
    play, vis, gameKey, bossKey, arenaKey, advKey,
    get on() { return on; }, get vol() { return vol; }, get key() { return key; },
    setOn(v) { on = !!v; sv('musicOn', on); }, setVol(v) { vol = Math.max(0, Math.min(100, v | 0)); sv('musicVol', vol); },
    setDirector(f) { dir = f; },
    level() { return !on || vol === 0 ? 'Off' : vol <= 40 ? 'Low' : 'High'; },
    cycle() { const l = this.level(); if (l === 'High') { on = true; vol = 30; } else if (l === 'Low') { on = false; } else { on = true; vol = 70; } sv('musicOn', on); sv('musicVol', vol); return this.level(); }
  };
  return api;
})();

// ---- online (this code runs inside the Online frame): which track plays now ----
let armed = false;   // becomes true when the player reaches the town (after server + character are chosen)
Music.setDirector(() => {
  const root = document.getElementById('onl'), rv = !!root && !root.hidden;
  if (Music.vis('loading')) return null;                                 // a stage / fight is loading: silence
  if (Music.vis('loot')) return null;                                    // flip-card selection after a cleared stage: silence
  if (rv && root.querySelector('.ar')) return root.querySelector('.vsrow') ? null : 'arenasel';   // Arena room + "searching for an opponent" keep playing; the VS screen (opponent found, loading) is silent
  if (rv && root.querySelector('.av')) return 'advsel';                  // Adventure room (also after every cleared stage)
  if (rv && root.querySelector('.stage')) { armed = true; return 'lobby'; }   // the town
  if (rv) { armed = false; return null; }                                // welcome / server list / character select: no music yet
  if (G.mode === 'play') return Music.gameKey();                         // battle: Adventure map / boss track, Arena map track
  if (G.mode === 'over') return undefined;                               // result: keep what is playing until the room comes back
  return armed ? 'lobby' : null;                                         // Profile / Shop / Armory / Adventure map list opened from the town
});
console.log('music_server.js loaded - background music (assets/musicbackground/)');
