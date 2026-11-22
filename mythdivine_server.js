/* ONLINE VERSION of mythdivine.js - upload this file to GitHub (online game only). The offline app keeps using mythdivine.js.
   ===== MYTHICAL DIVINE HEAL (green) =====
   New Heal item for the COIN SHOP, row "Mythical items" (mythical background card). FREE for now (like every Coin Shop item): tap it, then press Take.
   Stats: Health 350, Heal 270. Same Profile slot (Angelic Arm), same Heal button, same throws per match and same upgrades as the other Divine Heals.
   Pictures (all new, made from mythical_divine_heal.png):
     assets/items/heal_divine_myth.png        icon (Profile / Heal button)
     assets/cards/heal_divine_myth.png        Coin Shop card on the mythical background
     assets/fx/divine_fly_myth.png            flying orb, 8 frames 192x192 (4 columns)
     assets/fx/divine_trail_myth.png          sparkle trail, 8 frames 64x64 (4 columns)
     assets/fx/divine_burst_myth.png          heal blast, 16 frames 256x256 (4 columns)
     assets/fx/divine_heal_on_myth.png        "healed" effect on the robot, 12 frames 192x192 (4 columns)
   world.js / render.js check isMythHeal to pick the green sheets; the robot's hand-held picture is recoloured green below.
   To rebalance: change the stats below. */
const MYTH_HEAL_ID = 'heal_divine_myth';
MYTH_ITEMS.push({ id: MYTH_HEAL_ID, img: 'assets/items/heal_divine_myth.png', name: 'Mythical Divine Heal', type: 'heal', rar: 'mythical', stats: { hp: 350, heal: 270 }, heal: true, myth: true,
  desc: 'Emerald winged orb. Hold FIRE and release to throw it: everyone in its blast heals together (the Heal is split between them), no terrain damage. The strongest Divine Heal. Every upgrade adds +1 throw and raises Health and a lot more Heal.' });

// effect sheets (loaded with the other Divine Heal sheets when the game starts)
Object.assign(DIVINE_FX, {
  divine_fly_m: { file: 'fx/divine_fly_myth.png', frames: 8, cols: 4, fw: 192, fh: 192, fps: 30, loop: true },
  divine_trail_m: { file: 'fx/divine_trail_myth.png', frames: 8, cols: 4, fw: 64, fh: 64, fps: 16, loop: false },
  divine_burst_m: { file: 'fx/divine_burst_myth.png', frames: 16, cols: 4, fw: 256, fh: 256, fps: 24, loop: false },
  divine_heal_on_m: { file: 'fx/divine_heal_on_myth.png', frames: 12, cols: 4, fw: 192, fh: 192, fps: 18, loop: false },
});

// ---------- green picture for the robot's HANDS (assets/weapons/H01_Divine_Heal.png recoloured when the game runs: pink/purple/blue -> green, same shading) ----------
function greenSheet(im) {
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height; if (!(w > 1 && h > 1)) return im;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  try {
    const id = x.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), df = mx - mn, s = mx ? df / mx : 0; if (s < .06) continue;
      const hu = df ? (mx === r ? ((g - b) / df + 6) % 6 : mx === g ? (b - r) / df + 2 : (r - g) / df + 4) * 60 : 0;
      const nh = (hu >= 235 || hu <= 30) ? 125 : 95 + (Math.max(150, Math.min(235, hu)) - 150) * .35, s2 = Math.min(1, s * 1.05), v2 = Math.min(1, mx * 1.02);
      const k = nh / 60, ii = Math.floor(k) % 6, f = k - Math.floor(k), p = v2 * (1 - s2), q = v2 * (1 - f * s2), t = v2 * (1 - (1 - f) * s2), o = [[v2, t, p], [q, v2, p], [p, v2, t], [p, q, v2], [t, p, v2], [v2, p, q]][ii];
      d[i] = o[0] * 255; d[i + 1] = o[1] * 255; d[i + 2] = o[2] * 255;
    }
    x.putImageData(id, 0, 0);
  } catch (e) {   // pixel reading blocked: tint with the 'color' blend instead
    x.clearRect(0, 0, w, h); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'color'; x.fillStyle = 'hsl(120,90%,50%)'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0);
  }
  return c;
}
// the robot holding / throwing it: green weapon picture (render.js calls this when a Divine Heal is in the robot's hands)
function mythHealImg(team, wi) {
  const tb = typeof teamBonus === 'function' ? teamBonus(team) : null; if (!(tb && tb.hid === MYTH_HEAL_ID) || !wi) return wi;
  if (!wi._myth || wi._mythSrc !== wi.width) { wi._myth = greenSheet(wi); wi._mythSrc = wi.width; } return wi._myth;
}
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '#hbtn.myth.on{border-color:#7dff8a;box-shadow:0 0 0 2px #7dff8a,0 0 14px rgba(90,255,110,.6)}' }));
setInterval(() => {   // Heal button glows green while the Mythical Divine Heal is worn (its picture is set in bluedivine.js)
  try { if (typeof G === 'undefined' || !G.teams) return; const t = G.teams[G.cur], hb = document.getElementById('hbtn'); if (hb) hb.classList.toggle('myth', !!(t && t.bonus && t.bonus.hid === MYTH_HEAL_ID)); } catch (e) { }
}, 400);
console.log('mythdivine.js loaded - Mythical Divine Heal (Coin Shop, mythical items)');
