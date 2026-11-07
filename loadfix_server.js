/* ONLINE VERSION of loadfix.js - upload this file to GitHub (online game only).
   The offline app keeps using loadfix.js. Edit the two files separately on purpose. */
/* ===== LOAD FIX: a stage can no longer get stuck on "Loading stage…" =====
   Before: if ONE picture of a stage was missing / blocked / never answered, the whole stage start failed silently and the loading screen stayed forever
   (this is what happened on Void Rift HEROIC, Soul Rift boss).
   Now: (1) a missing or slow picture (20 s) is replaced by a blank 1x1 picture, is listed in window.__missingImgs and in the console, and the stage still starts;
        (2) if anything else throws while a stage starts, the loading screen shows the error text and a tap takes you back to the Adventure map. */
function loadImage(path) {
  if (Assets.img[path]) return Assets.img[path].promise;
  const im = new Image(), entry = { im, promise: null };
  entry.promise = new Promise(res => {
    let done = false, t = 0;
    const fin = ok => {
      if (done) return; done = true; clearTimeout(t);
      if (ok) return res(im);
      (window.__missingImgs = window.__missingImgs || []).push(path); console.warn('Robo Warlings: picture missing or too slow: assets/' + path);
      const cv = document.createElement('canvas'); cv.width = cv.height = 1; entry.im = cv; res(cv);
    };
    t = setTimeout(() => fin(false), 20000);
    im.onload = () => fin(true); im.onerror = () => fin(false);
  });
  im.src = 'assets/' + path; Assets.img[path] = entry; return entry.promise;
}
window.addEventListener('load', () => {
  if (typeof Adventure === 'undefined' || Adventure.__lf) return; Adventure.__lf = true;
  const _s = Adventure.start;
  Adventure.start = async function (mi, si) {
    try { return await _s.call(this, mi, si); }
    catch (e) {
      console.error(e); this.active = false;
      const tx = document.getElementById('loadtxt'), sc = document.getElementById('loading');
      if (tx) tx.textContent = 'Could not start this stage: ' + (e && e.message || e) + (window.__missingImgs && window.__missingImgs.length ? ' · missing: ' + window.__missingImgs.slice(-4).join(', ') : '') + '  (tap to go back)';
      if (sc) { const back = () => { sc.removeEventListener('click', back); try { UI.show('adventure'); } catch (x) { UI.show('title'); } }; sc.addEventListener('click', back); }
    }
  };
});
console.log('loadfix.js loaded - stages never hang on a missing picture');
