/* ONLINE VERSION of smooth.js - upload this file to GitHub (online game only).
   The offline app keeps using smooth.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  SMOOTH ANIMATION  (orc Gutrot + whelps, Centaur Warchief, all minotaurs)
//  The act sheets now hold extra "in-between" frames (rows added at the bottom of each sheet, generated from the two neighbouring poses).
//  Whenever the game switches from act frame A to act frame B, this plays the in-between picture for 1-3 ticks first, so the motion
//  glides instead of jumping. Nothing else in the game is touched: it wraps drawWorm closest to the base drawing code
//  (this file is loaded right after render.js, the orc / minotaur / centaur files wrap it from the outside).
//  Tune: SM_MAXHOLD = longest time (ticks) an in-between is shown, set it to 0 to turn the smoothing off.
// ============================================================================================================
const SM_MAXHOLD = 3;
const SM_TW = {"adventure/boss_gutrot_act.webp":{"0-1":17,"1-2":18,"2-3":19,"3-4":20,"0-4":21,"5-6":22,"6-7":23,"7-8":24,"5-7":25,"9-10":26,"10-11":27,"11-12":28,"13-14":29,"14-15":30,"15-16":31,"0-13":32,"5-13":33,"8-13":34,"9-13":35,"12-13":36,"2-13":37},"adventure/minion_gutrot_act.webp":{"0-1":17,"1-2":18,"2-3":19,"3-4":20,"0-4":21,"5-6":22,"6-7":23,"7-8":24,"5-7":25,"9-10":26,"10-11":27,"11-12":28,"13-14":29,"14-15":30,"15-16":31,"0-13":32,"5-13":33,"8-13":34,"9-13":35,"12-13":36,"2-13":37},"adventure/boss_warchief_act.webp":{"0-1":23,"1-2":24,"2-3":25,"3-4":26,"4-5":27,"5-6":28,"0-6":29,"7-8":30,"8-9":31,"9-10":32,"10-11":33,"11-12":34,"13-14":35,"14-15":36,"15-16":37,"16-17":38,"17-18":39,"19-20":40,"20-21":41,"21-22":42,"19-22":43,"0-19":44,"7-19":45,"12-19":46,"13-19":47,"18-19":48},"adventure/boss_templemino_act.webp":{"0-1":27,"1-2":28,"2-3":29,"0-3":30,"4-5":31,"5-6":32,"6-7":33,"7-8":34,"8-9":35,"9-10":36,"11-12":37,"12-13":38,"13-14":39,"14-15":40,"15-16":41,"17-18":42,"18-19":43,"19-20":44,"20-21":45,"21-22":46,"17-22":47,"23-24":48,"24-25":49,"25-26":50,"23-26":51,"0-23":52,"4-23":53,"10-23":54,"11-23":55,"16-23":56,"17-23":57,"22-23":58,"0-4":59,"0-11":60},"adventure/minion_templemino_act.webp":{"0-1":27,"1-2":28,"2-3":29,"0-3":30,"4-5":31,"5-6":32,"6-7":33,"7-8":34,"8-9":35,"9-10":36,"11-12":37,"12-13":38,"13-14":39,"14-15":40,"15-16":41,"17-18":42,"18-19":43,"19-20":44,"20-21":45,"21-22":46,"17-22":47,"23-24":48,"24-25":49,"25-26":50,"23-26":51,"0-23":52,"4-23":53,"10-23":54,"11-23":55,"16-23":56,"17-23":57,"22-23":58,"0-4":59,"0-11":60},"adventure/boss_zenithmino_act.webp":{"0-1":27,"1-2":28,"2-3":29,"0-3":30,"4-5":31,"5-6":32,"6-7":33,"7-8":34,"8-9":35,"9-10":36,"11-12":37,"12-13":38,"13-14":39,"14-15":40,"15-16":41,"17-18":42,"18-19":43,"19-20":44,"20-21":45,"21-22":46,"17-22":47,"23-24":48,"24-25":49,"25-26":50,"23-26":51,"0-23":52,"4-23":53,"10-23":54,"11-23":55,"16-23":56,"17-23":57,"22-23":58,"0-4":59,"0-11":60},"adventure/minion_zenithmino_act.webp":{"0-1":27,"1-2":28,"2-3":29,"0-3":30,"4-5":31,"5-6":32,"6-7":33,"7-8":34,"8-9":35,"9-10":36,"11-12":37,"12-13":38,"13-14":39,"14-15":40,"15-16":41,"17-18":42,"18-19":43,"19-20":44,"20-21":45,"21-22":46,"17-22":47,"23-24":48,"24-25":49,"25-26":50,"23-26":51,"0-23":52,"4-23":53,"10-23":54,"11-23":55,"16-23":56,"17-23":57,"22-23":58,"0-4":59,"0-11":60}};
(function () {
  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    const R = w.rob, tab = R && R.act && SM_TW[R.act], f = w.actF;
    if (!SM_MAXHOLD || !tab || typeof f !== 'number' || w.state === 'dead' || w.state === 'drown') return _dw(ctx, w, isActive, t);
    const now = G.frame | 0; let st = w._sm;
    if (!st || now < st.lg || now - st.lg > 8) st = w._sm = { cur: f, t0: now, mid: null, mt0: 0, md: 0, lg: now };
    if (f !== st.cur) {
      const m = tab[Math.min(st.cur, f) + '-' + Math.max(st.cur, f)];
      if (m != null) { st.mid = m; st.mt0 = now; st.md = Math.max(1, Math.min(SM_MAXHOLD, Math.round((now - st.t0) / 2))); } else st.mid = null;
      st.cur = f; st.t0 = now;
    }
    st.lg = now;
    const show = (st.mid != null && now - st.mt0 < st.md) ? st.mid : f;
    if (show === f) return _dw(ctx, w, isActive, t);
    w.actF = show; try { return _dw(ctx, w, isActive, t); } finally { w.actF = f; }
  };
  console.log('smooth.js loaded - in-between frames active');
})();
