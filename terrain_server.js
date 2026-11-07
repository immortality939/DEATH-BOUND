/* ONLINE VERSION of terrain.js - upload this file to GitHub (online game only).
   The offline app keeps using terrain.js. Edit the two files separately on purpose. */
'use strict';
const THEMES = {
  day:    { name: 'Day',    grass: [[110, 214, 70], [52, 148, 50]], dirt: [152, 102, 64], deep: [96, 60, 42], pebble: [198, 170, 130], edge: [54, 32, 24] },
  sunset: { name: 'Sunset', grass: [[196, 204, 78], [120, 142, 52]], dirt: [156, 88, 74], deep: [92, 46, 58], pebble: [210, 150, 120], edge: [48, 24, 36] },
  night:  { name: 'Night',  grass: [[70, 190, 140], [30, 112, 96]], dirt: [80, 74, 120], deep: [42, 40, 76], pebble: [150, 150, 200], edge: [20, 18, 40] },
};
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), u), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), u), v); }

const EDGE_EXT = 360;   // Adventure: how far the real ground reaches beyond the left / right edge of the map (the picture reaches 400)
class Terrain {
  // map = an entry of MAPS (maps.js). Its PNG is already painted: opaque pixel = ground. Without a picture the old random terrain is used.
  constructor(themeKey, seed, map) {
    this.W = WORLD_W; this.H = WORLD_H; this.theme = THEMES[themeKey] || THEMES.day; this.seed = seed || 1; this.map = map || null;
    this.mask = new Uint8Array(this.W * this.H);
    this.canvas = document.createElement('canvas'); this.canvas.width = this.W; this.canvas.height = this.H; this.ctx = this.canvas.getContext('2d');
    const im = map && map.img ? getImg(map.img) : null;
    if (im && im.complete && im.naturalWidth && typeof MAP_RUNS !== 'undefined' && MAP_RUNS[map.id]) this.fromImage(im, map.id); else { this.generate(); this.paint(); }
  }
  fromImage(im, id) {   // picture = what you see; MAP_RUNS = what is solid (same shape, exact)
    const W = this.W, H = this.H, c = this.ctx, m = this.mask, cols = MAP_RUNS[id]; c.clearRect(0, 0, W, H); c.drawImage(im, 0, 0, W, H);
    if (/^adv_/.test(id)) this.makeUnder(im);   // Adventure: no water -> solid ground below and beside the map so it never looks like it floats
    for (let x = 0; x < W; x++) { const r = cols[x]; for (let k = 0; k < r.length; k += 2) for (let y = r[k]; y < r[k + 1]; y++) m[y * W + x] = 1; }
    if (this.under) {   // ADVENTURE: the ground drawn beside the map is mirrored from the map edge, so make it REAL: copy the edge columns (static, same as the picture)
      const E = EDGE_EXT, H2 = this.H; this.eL = new Uint8Array(E * H2); this.eR = new Uint8Array(E * H2);
      for (let c2 = 0; c2 < E; c2++) for (let y = 0; y < H2; y++) { this.eL[c2 * H2 + y] = m[y * W + c2]; this.eR[c2 * H2 + y] = m[y * W + (W - 1 - c2)]; }
    }
  }
  // ADVENTURE (no water): the picture is mirrored under the bottom edge and beside the left / right edges (static, never digs away),
  // so wherever the camera looks past the map there is more of the same ground instead of empty sky.
  makeUnder(im) {
    const W = this.W, H = this.H, PX = 400, PY = 300, u = document.createElement('canvas'); u.width = W + PX * 2; u.height = H + PY; const g = u.getContext('2d');
    const put = (tx, ty, sx, sy) => { g.save(); g.translate(tx, ty); g.scale(sx, sy); g.drawImage(im, 0, 0, W, H); g.restore(); };
    put(PX, 2 * H, 1, -1);            // below the map
    put(PX, 0, -1, 1);                // left of the map
    put(PX + 2 * W, 0, -1, 1);        // right of the map
    put(PX, 2 * H, -1, -1);           // below-left
    put(PX + 2 * W, 2 * H, -1, -1);   // below-right
    this.under = u; this.underX = PX;
  }
  // ADVENTURE: beside the map the picture shows mirrored ground (makeUnder). It is REAL ground now: robots can walk onto it (EDGE_EXT px each side) and never fall.
  // Past that far edge (where the picture ends) there is a solid wall. Other modes keep the open sea edge.
  solid(x, y) {
    x = x | 0; y = y | 0;
    if (x < 0 || x >= this.W) { if (!this.eL) return false; const c = x < 0 ? -x - 1 : x - this.W; if (c >= EDGE_EXT) return true; if (y < 0) return false; if (y >= this.H) return true; return (x < 0 ? this.eL : this.eR)[c * this.H + y] === 1; }
    if (y < 0) return false; if (y >= this.H) return true; return this.mask[y * this.W + x] === 1; }
  generate() {
    const W = this.W, H = this.H, R = mulberry(this.seed * 7919 + 13), m = this.mask;
    const p1 = R() * 6.28, p2 = R() * 6.28, p3 = R() * 6.28, base = H * 0.56;
    const hts = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      let h = base + 78 * Math.sin(x / 330 + p1) + 48 * Math.sin(x / 141 + p2) + 22 * Math.sin(x / 63 + p3) + (vnoise(x / 40, 3, this.seed) - .5) * 26;
      const edge = Math.min(x, W - 1 - x); if (edge < 260) h += Math.pow((260 - edge) / 260, 1.6) * 330;  // map edges dip into the sea
      hts[x] = h;
    }
    // a few flat plateaus so robots have places to stand
    for (let k = 0; k < 7; k++) { const cx = 300 + R() * (W - 600), w = 70 + R() * 70, lvl = hts[cx | 0]; for (let x = Math.max(0, cx - w); x < Math.min(W, cx + w); x++) { const t = Math.abs(x - cx) / w; hts[x] = lerp(lvl, hts[x], t * t); } }
    for (let x = 0; x < W; x++) { const h = Math.floor(hts[x]); for (let y = Math.max(0, h); y < H; y++) m[y * W + x] = 1; }
    // floating islands
    const isl = 5 + Math.floor(R() * 3);
    for (let k = 0; k < isl; k++) {
      const cx = 380 + R() * (W - 760), cy = 190 + R() * 230, rx = 80 + R() * 130, ry = 20 + R() * 28;
      for (let y = Math.floor(cy - ry); y < cy + ry * 1.9; y++) for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue; const dx = (x - cx) / rx, dy = y < cy ? (y - cy) / (ry * .5) : (y - cy) / (ry * 1.9);
        if (dx * dx + dy * dy < 1 - (vnoise(x / 18, y / 18, this.seed + 5) - .5) * .35) m[y * W + x] = 1;
      }
    }
    // caves / tunnels
    for (let k = 0; k < 9; k++) {
      const cx = 280 + R() * (W - 560), top = hts[cx | 0], cy = top + 70 + R() * 190, rx = 36 + R() * 70, ry = 18 + R() * 32;
      for (let y = Math.floor(cy - ry); y < cy + ry; y++) for (let x = Math.floor(cx - rx); x < cx + rx; x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (x >= 0 && x < W && y >= 0 && y < H && dx * dx + dy * dy < 1) m[y * W + x] = 0; }
    }
    // remove tiny specks
    for (let i = 0; i < 2; i++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const j = y * W + x; if (m[j] && !m[j - 1] && !m[j + 1] && !m[j - W] && !m[j + W]) m[j] = 0; }
    this.heights = hts;
  }
  paint() {
    const W = this.W, H = this.H, m = this.mask, T = this.theme, img = this.ctx.createImageData(W, H), d = img.data, s = this.seed;
    for (let x = 0; x < W; x++) {
      let run = 0;
      for (let y = 0; y < H; y++) {
        const i = y * W + x; if (!m[i]) { run = 0; continue; } run++;
        const o = i * 4; let r, g, b;
        if (run <= 11) {              // grass layer
          const t = Math.min(1, run / 10), n = vnoise(x / 6, y / 6, s) * .22;
          r = lerp(T.grass[0][0], T.grass[1][0], t) * (1 - n); g = lerp(T.grass[0][1], T.grass[1][1], t) * (1 - n); b = lerp(T.grass[0][2], T.grass[1][2], t) * (1 - n);
          if (run === 1) { r *= 1.12; g *= 1.12; b *= 1.12; }
          if (run >= 10) { r = lerp(r, T.edge[0], .55); g = lerp(g, T.edge[1], .55); b = lerp(b, T.edge[2], .55); }
        } else {
          const depth = Math.min(1, (y - this.heights[x]) / 420), n = vnoise(x / 9, y / 9, s + 3) * .3 + vnoise(x / 3, y / 3, s + 9) * .16, band = Math.sin((y + vnoise(x / 60, y / 30, s) * 30) / 11) * .04;
          r = lerp(T.dirt[0], T.deep[0], clamp(depth, 0, 1)) * (.86 + n + band); g = lerp(T.dirt[1], T.deep[1], clamp(depth, 0, 1)) * (.86 + n + band); b = lerp(T.dirt[2], T.deep[2], clamp(depth, 0, 1)) * (.86 + n + band);
          const pb = hash2(x >> 2, y >> 2, s + 21); if (pb < .035) { r = lerp(r, T.pebble[0], .65); g = lerp(g, T.pebble[1], .65); b = lerp(b, T.pebble[2], .65); }
        }
        // outline where it borders air
        const edge = (x > 0 && !m[i - 1]) || (x < W - 1 && !m[i + 1]) || (y < H - 1 && !m[i + W]);
        if (edge) { r = lerp(r, T.edge[0], .6); g = lerp(g, T.edge[1], .6); b = lerp(b, T.edge[2], .6); }
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    this.ctx.putImageData(img, 0, 0);
  }
  carve(cx, cy, r, scorch = true) {
    const W = this.W, H = this.H, m = this.mask, r2 = r * r, fl = this.floor;   // fl = boss stage: the floor (this.floor[x] = its top row) can never be dug
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    let any = false;
    for (let y = y0; y <= y1; y++) { const dy = y - cy; for (let x = x0; x <= x1; x++) { const dx = x - cx; if (dx * dx + dy * dy <= r2) { if (fl && y >= fl[x]) continue; const i = y * W + x; if (m[i]) { m[i] = 0; any = true; } } } }
    if (this.eL && (cx - r < 0 || cx + r >= W)) { if (this.carveSide(cx, cy, r, scorch)) any = true; }   // Adventure: the ground beside the map can be dug too
    if (!any) return;
    const c = this.ctx;
    if (scorch) { c.save(); c.globalCompositeOperation = 'source-atop'; const g = c.createRadialGradient(cx, cy, r * .86, cx, cy, r + 9); g.addColorStop(0, 'rgba(20,10,8,.85)'); g.addColorStop(.55, 'rgba(36,20,14,.45)'); g.addColorStop(1, 'rgba(36,20,14,0)'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r + 9, 0, 6.2832); c.fill(); c.restore(); }
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(cx, cy, r, 0, 6.2832); c.fill(); c.restore();
    if (fl && this.bak) for (let x = x0; x <= x1; x++) { const f = fl[x]; if (f <= y1) c.drawImage(this.bak, x, f, 1, y1 - f + 1, x, f, 1, y1 - f + 1); }   // paint the undiggable floor back
  }
  // ADVENTURE: dig the real ground beside the map (eL / eR) and erase it from the picture (this.under) too. Only above the map's bottom edge (the ground below stays solid).
  carveSide(cx, cy, r, scorch) {
    const W = this.W, H = this.H, E = EDGE_EXT, r2 = r * r; let any = false;
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    for (const left of [true, false]) {
      const arr = left ? this.eL : this.eR;
      const xa = Math.floor(cx - r), xb = Math.ceil(cx + r);
      for (let x = xa; x <= xb; x++) {
        if (left ? x >= 0 : x < W) continue;
        const c = left ? -x - 1 : x - W; if (c < 0 || c >= E) continue;
        const dx = x - cx;
        for (let y = y0; y <= y1; y++) { const dy = y - cy; if (dx * dx + dy * dy <= r2) { const i = c * H + y; if (arr[i]) { arr[i] = 0; any = true; } } }
      }
    }
    if (any && this.under) {
      const g = this.under.getContext('2d'), ux = this.underX;
      g.save(); g.beginPath(); g.rect(0, 0, this.under.width, H); g.clip();
      if (scorch) { g.globalCompositeOperation = 'source-atop'; const gr = g.createRadialGradient(cx + ux, cy, r * .86, cx + ux, cy, r + 9); gr.addColorStop(0, 'rgba(20,10,8,.85)'); gr.addColorStop(.55, 'rgba(36,20,14,.45)'); gr.addColorStop(1, 'rgba(36,20,14,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx + ux, cy, r + 9, 0, 6.2832); g.fill(); }
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx + ux, cy, r, 0, 6.2832); g.fill();
      g.restore();
    }
    return any;
  }
  carveLine(x1, y1, x2, y2, r) { const L = dist(x1, y1, x2, y2), n = Math.max(1, Math.ceil(L / Math.max(2, r * .8))); for (let i = 0; i <= n; i++) this.carve(lerp(x1, x2, i / n), lerp(y1, y2, i / n), r, false); }
  // y of first solid pixel at/below y0 in column x (or -1)
  surfaceBelow(x, y0) { for (let y = Math.max(0, y0 | 0); y < this.H; y++) if (this.solid(x, y)) return y; return -1; }
}
