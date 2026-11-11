/* ONLINE LAUNCHER - lives on GitHub only. The app (online_loader.js, unchanged) downloads THIS file when the player taps Online and then calls OnlineUI.open().
   What it does: it opens the online game in its own full-screen frame and fills that frame ONLY with files from GitHub:
   index_server.html (the screens) + every script listed in it (core_server.js, profile_server.js, weapons_server.js, the boss files, ... , online_game.js).
   So items, armor, health, enemies, bots, maps and damage are the online copies from your repo - the offline files inside the app are not used online.
   The pictures still come from the app (the frame uses the app's own assets folder). The online save uses its own signed keys (rwo_), never the offline save.
   To change the online game: edit the files in your repo (the script list is the one in index_server.html). Nothing here or in the app has to change. */
'use strict';
window.OnlineUI = (() => {
  const BASE = (typeof ONLINE_CODE_URL === 'string' ? ONLINE_CODE_URL : '').replace(/[^/]*$/, '');
  let pkg = null, frame = null;
  const say = m => { try { olToast(m); } catch (e) { } };

  async function get(url) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 30000);
    try { return await fetch(url, { cache: 'no-cache', signal: ctl.signal }); } finally { clearTimeout(t); }
  }
  async function text(path) {
    let r = await get(BASE + path);
    if (r.status === 404 && /^assets\/[^\/]+$/.test(path)) r = await get(BASE + 'assets/online/' + path.slice(7));   // data_server.js may sit in assets/online/
    if (!r.ok) throw new Error(path + ' ' + r.status);
    return r.text();
  }
  function load() {   // downloaded once per app run (the code is kept in memory, never on the phone's disk)
    if (pkg) return pkg;
    return pkg = (async () => {
      const doc = new DOMParser().parseFromString(await text('index_server.html'), 'text/html');
      const srcs = [];
      doc.querySelectorAll('script').forEach(s => { const src = s.getAttribute('src'); if (src) srcs.push(src.split('?')[0]); s.remove(); });
      doc.querySelectorAll('meta[http-equiv]').forEach(m => m.remove());   // its strict policy would block the code we inject below
      const b = doc.createElement('base'); b.href = document.baseURI; doc.head.insertBefore(b, doc.head.firstChild);   // pictures: from the app's own assets folder
      const codes = await Promise.all(srcs.map(text));
      return { html: '<!doctype html>' + doc.documentElement.outerHTML, srcs, codes };
    })().catch(e => { pkg = null; throw e; });
  }
  function remove() { if (frame) { try { frame.remove(); } catch (e) { } frame = null; } }

  async function mount(p) {
    const f = document.createElement('iframe');
    f.setAttribute('allow', 'autoplay; fullscreen');
    f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:#0b1020';
    f.srcdoc = p.html; frame = f;
    const ready = new Promise(res => f.addEventListener('load', res, { once: true }));
    document.body.appendChild(f); await ready;
    const w = f.contentWindow, d = f.contentDocument;
    w.ONLINE_CODE_URL = typeof ONLINE_CODE_URL === 'string' ? ONLINE_CODE_URL : '';   // the arena / adventure / auction files are downloaded next to this one
    p.srcs.forEach((name, i) => { const s = d.createElement('script'); s.textContent = p.codes[i] + '\n//# sourceURL=' + name; d.head.appendChild(s); });
    if (w.eval('typeof OnlineUI') !== 'object') throw new Error('the online code did not start');
    w.dispatchEvent(new w.Event('load'));   // the files were added after the frame finished loading: give them the load event they wait for
  }

  window.addEventListener('message', e => {   // online_game.js sends this when the player leaves online mode
    if (frame && e.source === frame.contentWindow && e.data && e.data.deathboundOnline === 'close') remove();
  });

  async function open() {
    if (frame) return;
    say('Connecting...');
    try { await mount(await load()); }
    catch (e) { remove(); say(e && e.name === 'AbortError' ? 'Online is slow to answer. Try again.' : 'Cannot load online mode: ' + String((e && e.message) || e).slice(0, 70)); }
  }
  return { open, close: remove };
})();
