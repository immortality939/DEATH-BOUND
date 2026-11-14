// ============================================================================================================
//  sfx_files.js  -  plays the real sound-effect files (assets/sound effect/*.mp3 / *.ogg) for the bosses and weapons.
//  Load it right AFTER core.js. Everything that has no file keeps its old synthesised sound (fallback), so a missing /
//  not-yet-loaded file can never make the game silent or crash.
//  Use:  Snd.play('mp3_<key>')   -> plays the file, or the old sound if the file is not ready
//        Snd.file('<key>')       -> plays the file only, returns true if it played
//        Snd.has('<key>')        -> true when the file is loaded and ready
//  To add a new sound: put the file in assets/sound effect/ and add one line to FILES (and FALL if it replaces an old sound).
// ============================================================================================================
(function () {
  const DIR = 'assets/sound effect/';
  // the sounds live only in the APK (offline game's assets/sound effect/); the online code reads them from there, like the images
  const BASES = [''];
  const FILES = {
    kk_roar: 'kingkong roar.ogg',             kk_smash: 'king kong smash ground.mp3',
    gm_smash: 'golem smash ground.mp3',        gm_land: 'golem jump land hit impact.mp3',
    mino_attack: 'minotaur attack axe.mp3',    mino_smash: 'minotaur axe smash ground.mp3',
    cen_attack: 'centaur basic attack.mp3',    cen_smash: 'centaur smash ground.mp3',
    sk_smash: 'skeleton king smash ground.mp3',
    slime_jump: 'slime jump.mp3',
    orc_roar: 'orc roar.ogg',                  orc_axe: 'orc axe hit ground.mp3',       orc_spear: 'orc spear shoot.mp3',
    zeus_attack: 'zeus basic attack lightning.mp3', zeus_thunder: 'zeus thunder strike.mp3', zeus_levitate: 'zeus while levitate.mp3',
    shuriken_shoot: 'shuriken shoot.mp3',      shuriken_hit: 'shuriken hit impact.mp3',
    tempest_shoot: 'tempest arc shoot.mp3',    tempest_hit: 'tempest arc hit.mp3',
    titan_fire: 'titan cannon fire.mp3'
  };
  // the old sound each file replaces (played only while the file is not ready). 'name' or ['name', arg]; no arg = the caller's arg
  const FALL = {
    kk_roar: ['kk_roar', ['boom', 1.2]], kk_smash: [['boom', 1.4], ['boom', 1]],
    gm_smash: ['gm_stomp', ['boom', 1.3]], gm_land: ['gm_stomp', ['boom', 1.4], ['boom', 1]],
    mino_attack: [['slash', 1]], mino_smash: [['boom', 1.4], ['boom', 1]],
    cen_attack: [['slash', 1]], cen_smash: [['boom', 1.5], ['boom', 1]],
    sk_smash: [['boom', 1.4], ['boom', 1]],
    slime_jump: ['boom'],
    orc_roar: [['boom', 1.5]], orc_axe: ['axe'], orc_spear: ['rocket'],
    zeus_attack: [], zeus_thunder: [['freeze', 1]], zeus_levitate: [['freeze', .8]],
    shuriken_shoot: ['plasma'], shuriken_hit: [], tempest_shoot: ['plasma'], tempest_hit: [], titan_fire: ['shotgun']
  };
  const GAIN = {};          // optional per-file loudness (default below); e.g. GAIN.kk_roar = 2
  const DEF_GAIN = 1.6;     // the game's master volume is 0.5, so 1.6 here = about 0.8 overall
  const ST = {};            // key -> { buf, el, ready }

  function viaElement(st, f) {   // last resort: a normal <audio> element (works everywhere, but starts a little later)
    try { const a = new Audio(); a.preload = 'auto'; a.addEventListener('canplaythrough', () => { st.el = a; st.ready = true; }, { once: true }); a.src = encodeURI(DIR + f); a.load(); } catch (e) { }
  }
  function getBytes(url) {   // XMLHttpRequest first: it reads files inside the APK (file:// / android_asset) where fetch() is often blocked
    return new Promise((res, rej) => {
      try {
        const x = new XMLHttpRequest(); x.open('GET', url, true); x.responseType = 'arraybuffer';
        x.onload = () => { if ((x.status === 200 || x.status === 0) && x.response && x.response.byteLength > 100) res(x.response); else rej(0); };
        x.onerror = () => rej(0); x.send();
      } catch (e) { rej(0); }
    }).catch(() => typeof fetch === 'function' ? fetch(url).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }) : Promise.reject(0));
  }
  function load(key) {
    const f = FILES[key]; if (!f || ST[key]) return; const st = ST[key] = { buf: null, el: null, ready: false };
    const ctx = Snd.ctx;
    const tryBase = i => {
      if (!ctx || i >= BASES.length) return viaElement(st, f);
      getBytes(BASES[i] + encodeURI(DIR + f))
        .then(ab => new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }))
        .then(buf => {
          let pk = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let k = 0; k < d.length; k += 8) { const v = d[k] < 0 ? -d[k] : d[k]; if (v > pk) pk = v; } }
          st.peak = pk; st.buf = buf; st.ready = true;   // peak is used below so a very loud file can never clip
        })
        .catch(() => tryBase(i + 1));
    };
    tryBase(0);
  }
  let loaded = false;
  const _init = Snd.init;
  Snd.init = function () { _init.apply(this, arguments); if (!loaded && this.ctx) { loaded = true; Object.keys(FILES).forEach(load); } };

  Snd.has = function (key) { const st = ST[key]; return !!(st && st.ready); };
  Snd.file = function (key, vol) {
    const st = ST[key]; if (!st || !st.ready) return false;
    if (this.muted) return true;   // muted: nothing should play, and the old sound must not play either
    try {
      if (st.buf && this.ctx) { const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = st.buf; let gn = GAIN[key] || DEF_GAIN; if (st.peak && st.peak * gn * .5 > .95) gn = .95 / (st.peak * .5);   // keep loud files under full scale
      g.gain.value = gn * (vol == null ? 1 : vol); s.connect(g); g.connect(this.master); s.start(); }
      else if (st.el) { const c = st.el.cloneNode(); c.volume = Math.min(1, .8 * (vol == null ? 1 : vol)); const p = c.play(); if (p && p.catch) p.catch(() => { }); }
      else return false;
    } catch (e) { return false; }
    return true;
  };

  const _play = Snd.play;
  Snd.play = function (n, a) {
    if (typeof n === 'string' && n.charCodeAt(0) === 109 && n.slice(0, 4) === 'mp3_') {   // 'mp3_<key>'
      const key = n.slice(4);
      if (this.file(key)) return;
      if (!this.ctx || this.muted) return;
      (FALL[key] || []).forEach(e => { const nm = Array.isArray(e) ? e[0] : e, ar = Array.isArray(e) && e.length > 1 ? e[1] : a; this.play(nm, ar); });
      return;
    }
    return _play.call(this, n, a);
  };
  console.log('sfx_files.js loaded - ' + Object.keys(FILES).length + ' sound files');
})();
