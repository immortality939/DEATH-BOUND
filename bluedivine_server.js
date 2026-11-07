/* ONLINE VERSION of bluedivine.js - upload this file to GitHub (online game only).
   The offline app keeps using bluedivine.js. Edit the two files separately on purpose. */
/* ===== RARE DIVINE HEAL (light blue) =====
   A second Divine Heal for the Shop, RARE, light-blue look. Stats are exactly 50% of the legendary one (Health 250 -> 125, Heal 105 -> 53 (52.5 rounded)).
   Upgrades use the same scale as the legendary one, so every upgrade bonus is 50% too (the bonus is a % of the base stats, and the base is half).
   Same Profile slot, same Heal button, same throws per match as the legendary Divine Heal.
   In battle the flying orb, its sparkle trail, the blast, the "healed" glow, the robot's hand-held picture and the pop-up texts are light blue (world.js / render.js check isAzureHeal; the blue sheets are made here from your own Divine Heal pictures when the game loads).
   Drops: one card on EVERY boss loot board (all maps, all difficulties). Also listed in the map's boss drop list.
   To rebalance: change RARE_HEAL_PRICE / the stats below. */
const RARE_HEAL_ID = 'heal_divine_rare', RARE_HEAL_PRICE = 2500;
HEAL_ITEMS.push({ id: RARE_HEAL_ID, img: 'assets/items/heal_divine_rare.png', name: 'Azure Divine Heal', type: 'heal', rar: 'rare', stats: { hp: 125, heal: 53 }, heal: true,
  desc: 'Light-blue angelic orb. Hold FIRE and release to throw it: everyone in its blast heals together (the Heal is split between them), no terrain damage. Half as strong as the legendary Divine Heal, with the same upgrades. Every upgrade adds +1 throw.' });
ITEM_PRICE[RARE_HEAL_ID] = RARE_HEAL_PRICE;

// ---------- light-blue picture for the robot's HANDS (assets/weapons/H01_Divine_Heal.png recoloured when the game runs: pink/purple -> light blue, same shading) ----------
function blueSheet(im) {
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height; if (!(w > 1 && h > 1)) return im;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  try {
    const id = x.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), df = mx - mn, s = mx ? df / mx : 0; if (s < .06) continue;
      let hu = df ? (mx === r ? ((g - b) / df + 6) % 6 : mx === g ? (b - r) / df + 2 : (r - g) / df + 4) * 60 : 0;
      const nh = (hu >= 235 || hu <= 30) ? 205 : 197 + (Math.max(150, Math.min(235, hu)) - 190) * .15, s2 = Math.min(1, s * .85), v2 = Math.min(1, mx * 1.02 + (s > .15 ? .03 : 0));
      const k = nh / 60, ii = Math.floor(k) % 6, f = k - Math.floor(k), p = v2 * (1 - s2), q = v2 * (1 - f * s2), t = v2 * (1 - (1 - f) * s2), o = [[v2, t, p], [q, v2, p], [p, v2, t], [p, q, v2], [t, p, v2], [v2, p, q]][ii];
      d[i] = o[0] * 255; d[i + 1] = o[1] * 255; d[i + 2] = o[2] * 255;
    }
    x.putImageData(id, 0, 0);
  } catch (e) {   // pixel reading blocked: tint with the 'color' blend instead
    x.clearRect(0, 0, w, h); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'color'; x.fillStyle = 'hsl(200,85%,64%)'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0);
  }
  return c;
}

// ---------- the robot holding / throwing it: light-blue weapon picture (render.js calls this when a Divine Heal is in the robot's hands) ----------
function azureHealImg(team, wi) {
  const tb = typeof teamBonus === 'function' ? teamBonus(team) : null; if (!(tb && tb.hid === RARE_HEAL_ID) || !wi) return wi;
  if (!wi._azure || wi._azureSrc !== wi.width) { wi._azure = blueSheet(wi); wi._azureSrc = wi.width; } return wi._azure;
}
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '#hbtn.azure.on{border-color:#8fd8ff;box-shadow:0 0 0 2px #8fd8ff,0 0 14px rgba(120,200,255,.55)}' }));
// Heal button picture in battle follows the worn Divine Heal
setInterval(() => {
  try { const im = document.getElementById('himg'); if (!im || typeof G === 'undefined' || !G.teams) return; const t = G.teams[G.cur], blue = !!(t && t.bonus && t.bonus.hid === RARE_HEAL_ID), want = blue ? 'assets/items/heal_divine_rare.png' : 'assets/items/heal_divine.png'; if (!im.src.endsWith(want)) im.src = want; const hb = document.getElementById('hbtn'); if (hb) hb.classList.toggle('azure', blue); } catch (e) { }
}, 400);

// ---------- BOSS LOOT: one rare Divine Heal card on every boss board (replaces one chips card, positions stay random) ----------
{
  const _roll = Loot.roll;
  Loot.roll = function (si, boss) {
    const out = _roll.call(this, si, boss); if (!boss) return out;
    const rare = itemById(RARE_HEAL_ID); if (!rare || out.some(c => c.it && c.it.id === RARE_HEAL_ID)) return out;
    const spots = []; out.forEach((c, i) => { if (c.chips) spots.push(i); }); const k = spots.length ? spots[Math.floor(Math.random() * spots.length)] : Math.floor(Math.random() * out.length);
    out[k] = { it: rare }; return out;
  };
  const _dl = Adventure.dropList;
  Adventure.dropList = function (M, boss) {
    const out = _dl.call(this, M, boss); if (boss) { const rare = itemById(RARE_HEAL_ID), i = out.findIndex(e => e.chips); if (rare) out.splice(i < 0 ? out.length : i, 0, { it: rare }); } return out;
  };
}
console.log('bluedivine.js loaded - rare light-blue Divine Heal');
