/* ONLINE boot (replaces the small inline script of index.html, so the page can run with a strict Content-Security-Policy).
   The Online button opens the online mode (online_server.js). */
(() => { const b = document.getElementById('bOnline'); if (!b) return; const t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t);
  b.onclick = () => { try { Snd.init(); Snd.play('beep'); } catch (e) { } OnlineUI.open(); }; })();
