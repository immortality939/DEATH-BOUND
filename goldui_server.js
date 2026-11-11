/* ONLINE VERSION of goldui.js - upload this file to GitHub (online game only).
   The offline app keeps using goldui.js. Edit the two files separately on purpose. */
/* ===== GOLD UI: Shop + Profile (inventory) get the gold / navy tech-frame look (chamfered gold borders, navy panels, framed buttons) =====
   All the pictures are in assets/ui/ (frame_panel, frame_btn, frame_btn_dim, frame_btn_on, frame_slot, frame_slot_can, frame_slot_sel).
   You can redraw those PNGs any time and the look changes; no code change needed.
   To use the same look on other screens, add their ids next to #shop / #profile in the selectors below. */
(function () {
  const css = document.createElement('style'); css.textContent = `
:root{--gold:#ffc23a;--gold2:#ffe08a;--navy1:#26385f;--navy2:#141f3d;--navy3:#0a1022}
/* ---------- big panels (Shop, Profile, robot select) ---------- */
#shop .panel,#profile .panel{position:relative;border:0;border-radius:0;
  background:radial-gradient(ellipse at 50% 38%,#243a63 0%,#142140 52%,#0a1124 100%);
  clip-path:polygon(0 10.4px,10.4px 0,calc(100% - 10.4px) 0,100% 10.4px,100% calc(100% - 10.4px),calc(100% - 10.4px) 100%,10.4px 100%,0 calc(100% - 10.4px));
  box-shadow:none}
#shop .panel::after,#profile .panel::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;
  border:24px solid transparent;border-image:url(assets/ui/frame_panel.png) 90 / 24px stretch}
#shop .panel,#profile .panel{filter:none}
.pf-top h2{color:var(--gold2);letter-spacing:2px;text-shadow:0 0 12px rgba(255,170,40,.55),0 2px 0 rgba(0,0,0,.6)}

/* ---------- buttons ---------- */
#shop .btn,#profile .btn{color:#fff4d0;text-shadow:0 1px 2px rgba(0,0,0,.8);background:none;border:8px solid transparent;border-radius:0;box-shadow:none;
  border-image:url(assets/ui/frame_btn.png) 36 fill / 8px stretch;padding:4px 18px;transition:filter .12s}
#shop .btn.alt,#profile .btn.alt{color:#e9dcc2;border-image:url(assets/ui/frame_btn_dim.png) 36 fill / 8px stretch}
#shop .btn.sm,#profile .btn.sm,#profile .btn.alt.sm{padding:1px 12px;font-size:13px;border-width:7px;border-image-width:7px;box-shadow:none}
#shop .pf-top .btn,#profile .pf-top .btn{padding:2px 16px;font-size:14px}
#shop .btn:hover,#profile .btn:hover{filter:brightness(1.18)}
#shop .btn:active,#profile .btn:active{transform:translateY(2px);box-shadow:none}
#shop .btn[disabled],#profile .btn[disabled]{opacity:.45;filter:grayscale(.6);cursor:not-allowed}
/* upgrade / buy-style action buttons: gold fill, dark text */
#profile .pf-up .btn.up,#shop .btn:not(.alt):not(.sm){color:#2a1500;text-shadow:0 1px 0 rgba(255,240,170,.55);
  background:none;border-image:url(assets/ui/frame_btn_on.png) 36 fill / 8px stretch;box-shadow:none}
#profile .pf-up .btn.up{width:100%;border-width:8px}
#profile .pf-up .buy .btn{padding:1px 9px;font-size:12px;border-width:6px;border-image-width:6px}

/* ---------- tabs ---------- */
.pf-tab,.pf-itab{color:#e9dcc2;background:none;border:6px solid transparent;border-radius:0;
  border-image:url(assets/ui/frame_btn_dim.png) 36 fill / 6px stretch;padding:1px 9px}
#profile .pf-tab,#shop .pf-tab{padding:0 8px;font-size:11px}
.pf-itab{padding:2px 8px;font-size:13px}
.pf-tab.on,.pf-itab.on{color:#2a1500;border-color:transparent;background:none;text-shadow:0 1px 0 rgba(255,240,170,.5);
  border-image:url(assets/ui/frame_btn_on.png) 36 fill / 6px stretch}
.pf-tab:hover:not(.on),.pf-itab:hover:not(.on){filter:brightness(1.2)}

/* ---------- inventory cells, equipment slots, portrait, shop cells (frame is an overlay so layout does not change) ---------- */
.pf-cell,.pf-slot,.pf-port,.cs-card,.stb{position:relative}
.pf-cell,.pf-slot,.pf-port,.cs-card,.stb{border:2px solid transparent !important;border-radius:3px;
  background:linear-gradient(180deg,rgba(38,56,95,.75),rgba(10,16,34,.9)) !important;box-shadow:none}
.pf-cell::after,.pf-slot::after,.pf-port::after,.cs-card::after,.stb::after{content:"";position:absolute;inset:-2px;pointer-events:none;z-index:4;
  border:9px solid transparent;border-image:url(assets/ui/frame_slot.png) 42 / 9px stretch}
.pf-slot>small{color:#d9b46a;z-index:5}
.pf-slot.can::after{border-image-source:url(assets/ui/frame_slot_can.png)}
.pf-slot.can{background:linear-gradient(180deg,rgba(120,80,20,.55),rgba(24,18,12,.92)) !important}
.pf-slot.sel::after,.pf-cell.sel::after,.cs-card.on::after,.stb.on::after{border-image-source:url(assets/ui/frame_slot_sel.png)}
.pf-cell.sel,.pf-slot.sel,.cs-card.on{background:linear-gradient(180deg,rgba(140,98,24,.6),rgba(26,20,12,.92)) !important}
.pf-cell.sel,.pf-slot.sel{box-shadow:0 0 10px rgba(255,190,60,.5)}
.pf-cell.off{background:rgba(255,255,255,.02) !important}
.pf-cell.off::after{opacity:.35}
.pf-slot.drop{box-shadow:0 0 0 2px rgba(95,231,255,.35),0 0 14px rgba(95,231,255,.8)}
.pf-slot.drop::after{border-image-source:url(assets/ui/frame_slot_sel.png)}
.pf-port{background:radial-gradient(circle at 50% 45%,rgba(255,176,60,.22),rgba(14,22,44,.92) 72%) !important}
/* item tiles inside the cells keep their rarity colour, on a navy tile */
.pf-it{border-radius:5px;background:linear-gradient(180deg,#1c2b50,#0b1226)}
/* item tile + its badges (+12, count, level) must sit ABOVE the gold frame overlay, never behind it */
.pf-it{position:relative;z-index:6}
.pf-it .lv{z-index:7;background:#0b1226;border:1px solid var(--gold);color:#fff0a8;text-shadow:0 1px 2px #000;box-shadow:0 0 0 1px #0b1226,0 2px 4px rgba(0,0,0,.7);font-weight:800}
.pf-it em{z-index:7;background:linear-gradient(#ffd45a,#ff9a1a);color:#2a1500;box-shadow:0 0 0 1px #0b1226}
.pf-it .cnt,.pf-cell .cnt{z-index:7;background:#0b1226;border-color:var(--gold);color:var(--gold2);box-shadow:0 0 0 1px #0b1226}
/* equipment slots have their name at the top, so the +12 badge sits at the bottom-left of the slot instead of on top of the name */
#profile .pf-slot .pf-it .lv{top:auto;bottom:-4px;left:-3px}
#profile .pf-slot .pf-it{overflow:visible}
.pr{color:var(--gold2)}

/* ---------- shop cells: keep the price row fully visible (it was being covered by the item tile on short phone screens) ---------- */
#shop .pf-cell.sp{padding:3px 3px 2px;overflow:visible}
#shop .pf-cell.sp .pf-it{flex:1 1 0;min-height:0;overflow:hidden;padding:2px 2px 1px}
#shop .pf-cell.sp .pf-it i{display:block;font-size:9px;margin-top:0;line-height:1.1}
#shop .pf-cell.sp .pf-it b{font-size:11px;line-height:1.1}
#shop .pf-cell.sp .pf-it img{width:clamp(24px,8.5vh,42px);height:clamp(24px,8.5vh,42px);margin:0 auto}
#shop .pf-cell.sp .pr{position:relative;z-index:8;flex:0 0 auto;margin:0;padding:2px 0 3px;line-height:1.1;font-size:12px;border-top:1px solid rgba(255,194,58,.3)}
#shop .pf-cell.sp .pr img{width:14px;height:14px}

/* ---------- detail / upgrade / totals boxes ---------- */
.pf-det,.pf-up,.pf-tot{position:relative;border:0 !important;border-radius:0;
  background:linear-gradient(180deg,rgba(38,56,95,.7),rgba(10,16,34,.92));
  clip-path:polygon(0 7px,7px 0,calc(100% - 7px) 0,100% 7px,100% calc(100% - 7px),calc(100% - 7px) 100%,7px 100%,0 calc(100% - 7px))}
.pf-det::after,.pf-up::after,.pf-tot::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:4;
  border:16px solid transparent;border-image:url(assets/ui/frame_panel.png) 90 / 16px stretch}
.pf-det{padding:9px 12px !important}.pf-up{padding:8px 11px}.pf-tot{padding:7px 10px}
.pf-det h3{color:var(--gold2)}
.pf-up .pips i.on{background:linear-gradient(#ffe27a,#ff9a1a);box-shadow:0 0 5px rgba(255,170,40,.8)}
.pf-uh b{color:var(--gold2)}.pf-uh span{color:var(--gold)}
.pf-xpbar i{background:linear-gradient(90deg,#ff9a1a,#ffe27a)}
.pf-xpbar{border:1px solid rgba(255,194,58,.4)}
.pf-foot{border-top:1px solid rgba(255,194,58,.35)}
.chipbal{border-color:rgba(255,194,58,.8);background:linear-gradient(#1c2b50,#0b1226)}
/* seg / misc */
.cs-bar .btn{min-width:110px}

/* ---------- FORGE screen: forging-shop picture behind, gold frame (same frame_panel / frame_btn pictures as Shop + Profile) ---------- */
#forge{background:url(assets/forge/forge_bg.png) center/cover no-repeat #0a0a1e}
#forge .fg{position:relative;--s:clamp(28px,8.8vh,54px);padding:16px 24px 16px;border:0;border-radius:0;
  background:linear-gradient(180deg,rgba(16,20,48,.30),rgba(6,8,24,.40));box-shadow:none;
  clip-path:polygon(0 10.4px,10.4px 0,calc(100% - 10.4px) 0,100% 10.4px,100% calc(100% - 10.4px),calc(100% - 10.4px) 100%,10.4px 100%,0 calc(100% - 10.4px))}
#forge .fg::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;border:22px solid transparent;border-image:url(assets/ui/frame_panel.png) 90 / 22px stretch}
#forge .fg-top h2{color:var(--gold2);letter-spacing:2px;text-shadow:0 0 12px rgba(255,170,40,.55),0 2px 0 rgba(0,0,0,.6)}
#forge .fg-pan,#forge .fg-info{position:relative;border:0;border-radius:0;background:linear-gradient(180deg,rgba(30,46,82,.62),rgba(6,9,26,.78));
  clip-path:polygon(0 7px,7px 0,calc(100% - 7px) 0,100% 7px,100% calc(100% - 7px),calc(100% - 7px) 100%,7px 100%,0 calc(100% - 7px))}
#forge .fg-pan{padding:9px 12px 8px}#forge .fg-info{padding:7px 12px}
#forge .fg-pan::after,#forge .fg-info::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:4;border:12px solid transparent;border-image:url(assets/ui/frame_panel.png) 90 / 12px stretch}
#forge .fg-ph b,#forge .fg-pan b{color:var(--gold2)}
#forge .fg-top .btn{color:#fff4d0;text-shadow:0 1px 2px rgba(0,0,0,.8);background:none;border:8px solid transparent;border-radius:0;box-shadow:none;
  border-image:url(assets/ui/frame_btn.png) 36 fill / 8px stretch;padding:2px 16px;transition:filter .12s}
#forge .fg-top .btn:active{transform:translateY(2px);box-shadow:none}
#forge .fg-go{border:0;color:#2a1500;text-shadow:0 1px 0 rgba(255,240,170,.55);background:linear-gradient(#ffe27a,#ff9a1a);box-shadow:0 4px 0 #8a4a00,0 0 22px rgba(255,150,30,.45)}
#forge .fg-go[disabled]{color:#cdbf9a;background:linear-gradient(#5d5a6e,#3a3850);box-shadow:0 4px 0 #1e1d2c}
#forge .fg-slot,#forge .fg-cell{border-color:rgba(255,194,58,.55)}
#forge .fg-slot.big{border-color:#ffc23a;box-shadow:inset 0 0 22px rgba(255,170,40,.3),0 0 22px rgba(255,150,30,.45),0 0 0 3px rgba(8,8,26,.85)}
#forge .fg-cell.sel{box-shadow:0 0 0 2px #ffc23a,0 0 12px rgba(255,170,40,.85)}

/* ---------- SHOP + PROFILE: plain dark wood floor + dark wood borders (assets/online/ui/wood_dark_tile.png, frame_wood_dark.png); cells / slots / portrait = brown wood (wood_tile.png) ---------- */
#shop,#profile{background:url(assets/online/ui/wood_dark_tile.png) 0 0/256px 256px repeat #140c08}
#shop .panel.shop,#profile .panel.pf{border-radius:12px;clip-path:none;background:linear-gradient(rgba(10,6,4,.35),rgba(10,6,4,.5)),url(assets/online/ui/wood_dark_tile.png) 0 0/256px 256px repeat;
  box-shadow:0 8px 30px rgba(0,0,0,.65)}
#shop .panel.shop::after,#profile .panel.pf::after{border-image:url(assets/online/ui/frame_wood_dark.png) 30 / 22px stretch}
#shop .pf-det,#shop .pf-up,#shop .pf-tot,#profile .pf-det,#profile .pf-up,#profile .pf-tot{border-radius:8px;clip-path:none;background:linear-gradient(rgba(8,5,3,.55),rgba(8,5,3,.72)),url(assets/online/ui/wood_dark_tile.png) 0 0/256px 256px repeat}
#shop .pf-det::after,#shop .pf-up::after,#shop .pf-tot::after,#profile .pf-det::after,#profile .pf-up::after,#profile .pf-tot::after{border-image:url(assets/online/ui/frame_wood_dark.png) 30 / 12px stretch}
/* brown wood behind every item cell, equipment slot and the character (no more light blue) */
#shop .pf-cell,#shop .pf-slot,#profile .pf-cell,#profile .pf-slot,#profile .pf-port{
  background:linear-gradient(rgba(22,11,5,.10),rgba(22,11,5,.34)),url(assets/online/ui/wood_tile.png) 0 0/170px 170px repeat !important}
#profile .pf-port{background:radial-gradient(circle at 50% 42%,rgba(255,214,140,.28),rgba(22,11,5,.0) 70%),linear-gradient(rgba(22,11,5,.05),rgba(22,11,5,.30)),url(assets/online/ui/wood_tile.png) 0 0/170px 170px repeat !important}
#shop .pf-cell.sel,#profile .pf-cell.sel,#profile .pf-slot.sel{background:linear-gradient(rgba(255,196,70,.34),rgba(255,150,30,.14)),url(assets/online/ui/wood_tile.png) 0 0/170px 170px repeat !important}
#profile .pf-slot.can{background:linear-gradient(rgba(255,196,70,.26),rgba(255,150,30,.10)),url(assets/online/ui/wood_tile.png) 0 0/170px 170px repeat !important}
#shop .pf-cell.off,#profile .pf-cell.off{background:linear-gradient(rgba(10,5,2,.62),rgba(10,5,2,.62)),url(assets/online/ui/wood_tile.png) 0 0/170px 170px repeat !important}
#shop .pf-it,#profile .pf-it{background:rgba(24,12,6,.30)}
#shop .pf-it b,#profile .pf-it b{text-shadow:0 1px 2px #000,0 0 4px rgba(0,0,0,.7)}
#profile .pf-slot>small{color:#fff0c8;text-shadow:0 1px 2px #000}
#shop .pf-it .lv,#profile .pf-it .lv,#shop .pf-it .cnt,#profile .pf-it .cnt,#profile .pf-cell .cnt{background:#1b0f08}

/* ---------- PROFILE layout: stats one per line, inventory wide like the Shop, item details in a popup ---------- */
#profile .pf-main{grid-template-columns:auto minmax(0,1fr)}
#profile .pf-tabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
#profile .pf-tabs::-webkit-scrollbar{display:none}
#profile .pf-tab{flex:0 0 auto;white-space:nowrap}
#profile .pf-cells{grid-template-columns:repeat(auto-fill,minmax(clamp(92px,13vw,120px),1fr));grid-auto-rows:clamp(100px,29vh,124px);gap:8px;overflow-y:auto;overflow-x:hidden}
#profile .pf-cell .pf-it img{width:clamp(38px,11.5vh,56px);height:clamp(38px,11.5vh,56px)}
#profile .pf-cell .pf-it b{font-size:11px}
.pf-list{display:flex;flex-direction:column;margin:2px 0 6px}
.pf-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:3px 2px;border-bottom:1px solid rgba(255,214,140,.16);font-size:13px;color:#ead9b8}
.pf-row:last-child{border-bottom:0}
.pf-row b{color:#fff;font-weight:800;text-align:right}
.pf-row em{font-style:normal;font-size:10px;color:#b89c6e;margin-left:4px}
#profile .pf-tot small{color:#e0b860}
.pf-pop{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);padding:10px;box-sizing:border-box;animation:pfpop .15s ease-out both}
@keyframes pfpop{from{opacity:0}to{opacity:1}}
.pf-popc{position:relative;width:min(88%,470px);max-height:100%;overflow-y:auto;box-sizing:border-box;border-radius:10px;
  background:linear-gradient(rgba(8,5,3,.5),rgba(8,5,3,.7)),url(assets/online/ui/wood_dark_tile.png) 0 0/256px 256px repeat;border:14px solid transparent;border-image:url(assets/online/ui/frame_wood_dark.png) 30 / 14px stretch;box-shadow:0 10px 40px rgba(0,0,0,.8)}
.pf-popc .pf-det{background:none !important;margin:0;padding:4px 8px 6px;clip-path:none}
.pf-popc .pf-det::after{display:none}
.pf-popc .pf-det .big{width:76px !important;height:76px !important}
.pf-popc .pf-det h3{font-size:18px !important}
.pf-popc .pf-det .st{font-size:15px !important}
.pf-popc .pf-det .dim{font-size:13px !important}
.pf-x{position:absolute;top:-8px;right:-8px;z-index:3;width:30px;height:30px;border-radius:50%;border:2px solid #ffc23a;background:#2a160a;color:#ffe08a;font:800 14px/1 var(--body);cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.7)}
/* PROFILE: no navy frame art around slots / cells / character box - the dark wood fills right to a thin gold edge */
#profile .pf-cell::after,#profile .pf-slot::after,#profile .pf-port::after{inset:0;border:2px solid #c98f2e !important;border-image:none !important;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),inset 0 0 8px rgba(0,0,0,.55);opacity:1}
#profile .pf-cell,#profile .pf-slot,#profile .pf-port{border-radius:4px}
#profile .pf-slot.can::after{border-color:#ffc23a !important}
#profile .pf-slot.sel::after,#profile .pf-cell.sel::after{border-color:#ffe27a !important;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),0 0 8px rgba(255,200,70,.7)}
#profile .pf-slot.drop::after{border-color:#5fe7ff !important;box-shadow:0 0 10px rgba(95,231,255,.8)}
#profile .pf-cell.off::after{opacity:.4}
#profile .pf-it{background:none}
`; document.head.appendChild(css);
})();
console.log('goldui.js loaded - gold/navy frames for Shop + Profile');
