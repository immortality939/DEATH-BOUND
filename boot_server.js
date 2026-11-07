/* ONLINE boot (replaces the small inline script of index.html, so the page can run with a strict Content-Security-Policy).
   This page is opened by the Online button of the app, so it skips its own title menu and goes straight to the guest login.
   The Online button of this page (if you ever see it) opens the same thing. */
(() => {
  const b = document.getElementById('bOnline'); if (!b) return;
  const t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t);
  const go = () => { try { Snd.init(); Snd.play('beep'); } catch (e) { } OnlineUI.open(); };
  b.onclick = go;
  let tries = 0, opened = false;   // wait until the game has finished loading (the title screen appears), then open the online screens once
  const iv = setInterval(() => {
    const ti = document.getElementById('title');
    if (++tries > 600) return clearInterval(iv);
    if (ti && !ti.hidden && !opened) { opened = true; clearInterval(iv); go(); }
  }, 100);
})();
