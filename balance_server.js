/* ONLINE VERSION of balance.js - add to GitHub next to golem_server.js (online game only). */
'use strict';
// ===== ADVENTURE BALANCE PATCH =====
// Fixes the power ladder of every Adventure map on NORMAL / HARD / HEROIC. Loaded AFTER golem_server.js, it wraps Adventure.stagesOf and hands out stage lists with corrected numbers,
// so Power needed, the map screen and the real fights all use the same values. Nothing else in the game was changed.
// Rules used: inside a map every boss is stronger than the one before it; every boss is stronger than the same boss slot (and the last boss stronger than the last boss) of the map before it;
// stage enemies never hit weaker than the designer ramp of the stage before. Numbers only go UP where something was too weak (nothing strong was nerfed).
// BAL[map][difficulty 0 NORMAL / 1 HARD / 2 HEROIC][stage index] = [hp (table value, before the x3 / difficulty multipliers), armor % (null = unchanged), attack bonus % (table value)]
// MINION_GROW: the small creature minions of boss stages get this much more health per map (map 1 = x1), so late-map minions are not paper.
const BAL = {
  canyon: { 0: {0:[80,null,5], 1:[85,null,0], 2:[115,null,0], 3:[115,null,23], 4:[600,15,25]},
      1: {0:[80,null,4], 1:[85,null,0], 2:[115,null,0], 3:[115,null,23], 4:[600,15,25], 5:[780,19,31], 6:[1080,23,80]},
      2: {0:[80,null,4], 1:[85,null,0], 2:[115,null,0], 3:[115,null,23], 4:[600,15,25], 5:[780,19,31], 6:[1080,23,80]} },
  glacier: { 0: {0:[100,null,13], 1:[100,null,5], 2:[120,null,14], 3:[135,null,20], 4:[900,20,30]},
      1: {0:[100,null,12], 1:[100,null,4], 2:[120,null,15], 3:[135,null,20], 4:[900,20,30], 5:[1170,24,36]},
      2: {0:[100,null,13], 1:[100,null,4], 2:[120,null,14], 3:[135,null,20], 4:[900,20,30], 5:[1170,24,36]} },
  citadel: { 0: {0:[130,null,0], 1:[140,null,15], 2:[130,null,16], 3:[150,null,20], 4:[1300,25,40]},
      1: {0:[130,null,0], 1:[140,null,15], 2:[130,null,15], 3:[150,null,20], 4:[1300,25,40], 5:[1690,29,46]},
      2: {0:[130,null,0], 1:[140,null,15], 2:[130,null,15], 3:[150,null,20], 4:[1300,25,40], 5:[1690,29,46]} },
  ember: { 0: {0:[156,null,27], 1:[166,null,41], 2:[176,null,46], 3:[186,null,39], 4:[1700,26,45]},
      1: {0:[156,null,27], 1:[166,null,42], 2:[176,null,46], 3:[186,null,39], 4:[1700,26,45], 5:[2210,30,51]},
      2: {0:[156,null,27], 1:[166,null,42], 2:[176,null,46], 3:[186,null,40], 4:[1700,26,45], 5:[3400,38,61]} },
  ruins: { 0: {0:[168,null,31], 1:[178,null,30], 2:[188,null,50], 3:[198,null,38], 4:[2100,29,49]},
      1: {0:[168,null,31], 1:[178,null,30], 2:[188,null,50], 3:[198,null,38], 4:[2100,29,49], 5:[2730,33,82]},
      2: {0:[168,null,32], 1:[178,null,30], 2:[188,null,50], 3:[198,null,38], 4:[2100,29,49], 5:[3570,39,55]} },
  dunes: { 0: {0:[180,null,30], 1:[190,null,34], 2:[200,null,44], 3:[210,null,42], 4:[2500,32,53]},
      1: {0:[180,null,30], 1:[190,null,34], 2:[200,null,44], 3:[210,null,42], 4:[2500,32,53], 5:[3250,36,68]},
      2: {0:[180,null,30], 1:[190,null,34], 2:[200,null,44], 3:[210,null,42], 4:[2500,32,53], 5:[3749,40,67], 6:[4500,42,67]} },
  marble: { 0: {0:[192,null,34], 1:[202,null,44], 2:[212,null,59], 3:[222,null,64], 4:[2900,35,57]},
      1: {0:[192,null,34], 1:[202,null,44], 2:[212,null,60], 3:[222,null,64], 4:[2900,35,57], 5:[3770,39,63]},
      2: {0:[192,null,34], 1:[202,null,44], 2:[212,null,60], 3:[222,null,64], 4:[2900,35,57], 5:[3936,41,63], 6:[5220,45,144]} },
  bog: { 0: {0:[204,null,55], 1:[214,null,48], 2:[224,null,46], 3:[234,null,68], 4:[3400,38,61]},
      1: {0:[204,null,55], 1:[214,null,48], 2:[224,null,46], 3:[234,null,68], 4:[3400,38,61], 5:[4420,42,164]},
      2: {0:[204,null,55], 1:[214,null,48], 2:[224,null,46], 3:[234,null,69], 4:[3400,38,61], 5:[4420,42,164], 6:[6120,48,85]} },
  prism: { 0: {0:[216,null,59], 1:[226,null,46], 2:[236,null,50], 3:[246,null,61], 4:[3900,41,65]},
      1: {0:[216,null,60], 1:[226,null,46], 2:[236,null,50], 3:[246,null,60], 4:[3900,41,65], 5:[5070,45,71], 6:[7020,51,79]},
      2: {0:[216,null,60], 1:[226,null,46], 2:[236,null,50], 3:[246,null,61], 4:[3900,41,65], 5:[5070,45,71], 6:[7020,51,208]} },
  void: { 0: {0:[228,null,52], 1:[238,null,50], 2:[248,null,61], 3:[258,null,77], 4:[4600,44,69]},
      1: {0:[228,null,53], 1:[238,null,50], 2:[248,null,60], 3:[258,null,78], 4:[4600,44,69], 5:[7371,52,75]},
      2: {0:[228,null,52], 1:[238,null,50], 2:[248,null,61], 3:[258,null,77], 4:[4600,44,69], 5:[5980,48,75], 6:[8280,54,139]} },
  quarry: { 0: {0:[268,null,62], 1:[278,null,73], 2:[288,null,77], 3:[298,null,95], 4:[6700,47,78]},
      1: {0:[268,null,62], 1:[278,null,73], 2:[288,null,77], 3:[298,null,96], 4:[12730,53,84]},
      2: {0:[268,null,62], 1:[278,null,73], 2:[288,null,77], 3:[298,null,95], 4:[16750,55,83]} },
};
const MINION_GROW = 0.4;
(function () {
  if (typeof Adventure === 'undefined' || typeof ADV_MAPS === 'undefined') return;
  const _so = Adventure.stagesOf, CACHE = {};
  Adventure.stagesOf = function (M, d) {
    const L = _so.apply(this, arguments); if (!M || !BAL[M.id]) return L;
    d = (d == null ? this.diff : d) | 0; const B = BAL[M.id][d]; if (!B) return L;
    const key = M.id + '_' + d, mi = Math.max(0, ADV_MAPS.indexOf(M));
    const c = CACHE[key]; if (c && c.src.length === L.length && c.src.every((s, i) => s.name === L[i].name)) return c.out;
    const out = L.map((st, i) => {
      const b = B[i]; if (!b) return st;
      const o = Object.assign({}, st, { hp: b[0], pow: b[2] }); if (b[1] != null) o.def = b[1];
      if (o.minionKind && o.minionKind.hpMul) o.minionKind = Object.assign({}, o.minionKind, { hpMul: +(o.minionKind.hpMul * (1 + MINION_GROW * mi)).toFixed(2) });
      return o;
    });
    CACHE[key] = { src: L, out }; return out;
  };
})();
