/* ONLINE boot (replaces the small inline script of index.html, so the page can run with a strict Content-Security-Policy).
   Online button hook: this is where the online lobby will open once you tell me how it should look. */
(() => { const b = document.getElementById('bOnline'); if (!b) return; const t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); let k;
  b.onclick = () => { try { Snd.init(); Snd.play('beep'); } catch (e) { } t.textContent = 'Online lobby: coming soon!'; t.classList.add('on'); clearTimeout(k); k = setTimeout(() => t.classList.remove('on'), 2200); }; })();
