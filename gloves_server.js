/* ONLINE VERSION of gloves.js - upload this file to GitHub (online game only).
   The offline app keeps using gloves.js. Edit the two files separately on purpose. */
'use strict';
// ===== GLOVES: a new gear type (slot "Gloves", bottom-left of the Profile). 43 pairs: 12 Common, 12 Rare, 12 Epic, 7 Legendary. Sold in the Shop; also found on EVERY boss loot board (adventure.js Loot.glovePick). =====
// Pictures: assets/items/g_<name>.png (128x128, cut out of gloves.png).
// NO Defense / Armor / Health on gloves: only Damage and the 4 attributes Vitality, Dexterity, Luck, Agility. Upgrades (+10% of the base each level) work like on all gear.
// Stat rules (each glove has its OWN split, edit any number below as long as the rules stay true):
//   Common:    Damage 10-25,  each attribute 5-20,  the 4 attributes add up to exactly 50
//   Rare:      +25% -> Damage 12-31,  each attribute 6-25,  total 62
//   Epic:      +35% -> Damage 13-33,  each attribute 6-27,  total 67
//   Legendary: +50% -> Damage 15-37,  each attribute 7-30,  total 75
// (every number is rounded down, e.g. 50 x 1.25 = 62.5 -> 62.) Prices are set by profile.js (rarity bands x1.5, placed by how strong each pair is).
const GLOVE_ITEMS = [
  { id: 'g_wraps', img: 'assets/items/g_wraps.png', name: 'Brawler Wraps', type: 'glove', rar: 'common', stats: { dmg: 12, vit: 4, dex: 8, agi: 4, luk: 4 }, desc: 'Worn leather with the fingertips cut away.' },
  { id: 'g_ironcast', img: 'assets/items/g_ironcast.png', name: 'Ironcast Gloves', type: 'glove', rar: 'common', stats: { dmg: 17, vit: 3, dex: 6, agi: 4, luk: 7 }, desc: 'Black leather with a steel cuff.' },
  { id: 'g_fieldops', img: 'assets/items/g_fieldops.png', name: 'Field Ops Gloves', type: 'glove', rar: 'common', stats: { dmg: 15, vit: 6, dex: 6, agi: 4, luk: 4 }, desc: 'Olive combat gloves with a buckled strap.' },
  { id: 'g_dune', img: 'assets/items/g_dune.png', name: 'Dune Runner Gloves', type: 'glove', rar: 'common', stats: { dmg: 13, vit: 4, dex: 7, agi: 6, luk: 3 }, desc: 'Sand-coloured wraps for long walks.' },
  { id: 'g_steelcuff', img: 'assets/items/g_steelcuff.png', name: 'Steel Cuff Gloves', type: 'glove', rar: 'common', stats: { dmg: 18, vit: 5, dex: 5, agi: 5, luk: 5 }, desc: 'Gray plating over soft padding.' },
  { id: 'g_starlight', img: 'assets/items/g_starlight.png', name: 'Starlight Mitts', type: 'glove', rar: 'common', stats: { dmg: 20, vit: 4, dex: 4, agi: 4, luk: 8 }, desc: 'Blue gloves with a bright star.' },
  { id: 'g_rivet', img: 'assets/items/g_rivet.png', name: 'Riveted Mitts', type: 'glove', rar: 'common', stats: { dmg: 14, vit: 8, dex: 4, agi: 4, luk: 4 }, desc: 'Brown leather held together by brass rivets.' },
  { id: 'g_redspike', img: 'assets/items/g_redspike.png', name: 'Redspike Knuckles', type: 'glove', rar: 'common', stats: { dmg: 25, vit: 4, dex: 4, agi: 8, luk: 4 }, desc: 'Black gloves with red spikes on the knuckles.' },
  { id: 'g_chrome', img: 'assets/items/g_chrome.png', name: 'Chrome Plate Gloves', type: 'glove', rar: 'common', stats: { dmg: 19, vit: 7, dex: 4, agi: 4, luk: 5 }, desc: 'Polished silver plates on every finger.' },
  { id: 'g_camo', img: 'assets/items/g_camo.png', name: 'Jungle Camo Gloves', type: 'glove', rar: 'common', stats: { dmg: 14, vit: 3, dex: 4, agi: 7, luk: 6 }, desc: 'Green camouflage, quiet and light.' },
  { id: 'g_sigil', img: 'assets/items/g_sigil.png', name: 'Crimson Sigil Gloves', type: 'glove', rar: 'common', stats: { dmg: 23, vit: 6, dex: 3, agi: 7, luk: 4 }, desc: 'A red sigil glows on the back of the hand.' },
  { id: 'g_nightfist', img: 'assets/items/g_nightfist.png', name: 'Nightfist Gloves', type: 'glove', rar: 'common', stats: { dmg: 10, vit: 3, dex: 9, agi: 4, luk: 4 }, desc: 'Plain black armor for a heavy fist.' },
  { id: 'g_frostwing', img: 'assets/items/g_frostwing.png', name: 'Frostwing Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 20, vit: 7, dex: 14, agi: 6, luk: 13 }, desc: 'Gold and blue, with a frozen wing on the side.' },
  { id: 'g_azurecore', img: 'assets/items/g_azurecore.png', name: 'Azure Core Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 22, vit: 13, dex: 14, agi: 7, luk: 6 }, desc: 'Steel plates around a glowing blue core.' },
  { id: 'g_bloodthorn', img: 'assets/items/g_bloodthorn.png', name: 'Bloodthorn Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 31, vit: 7, dex: 15, agi: 12, luk: 6 }, desc: 'Red armor with sharp thorns.' },
  { id: 'g_gilded', img: 'assets/items/g_gilded.png', name: 'Gilded Guard Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 19, vit: 9, dex: 11, agi: 9, luk: 11 }, desc: 'Gold plates trimmed in royal blue.' },
  { id: 'g_sapphire', img: 'assets/items/g_sapphire.png', name: 'Sapphire Orb Gloves', type: 'glove', rar: 'rare', stats: { dmg: 23, vit: 6, dex: 8, agi: 7, luk: 19 }, desc: 'Blue gloves with a sapphire orb in the palm.' },
  { id: 'g_emberfist', img: 'assets/items/g_emberfist.png', name: 'Emberfist Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 29, vit: 18, dex: 7, agi: 7, luk: 8 }, desc: 'Orange and gold with a ruby set in the back.' },
  { id: 'g_violet', img: 'assets/items/g_violet.png', name: 'Violet Thorn Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 21, vit: 7, dex: 7, agi: 19, luk: 7 }, desc: 'Purple thorns around a glowing gem.' },
  { id: 'g_venom', img: 'assets/items/g_venom.png', name: 'Venomclaw Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 16, vit: 13, dex: 7, agi: 6, luk: 14 }, desc: 'Black steel with glowing green claws.' },
  { id: 'g_diamond', img: 'assets/items/g_diamond.png', name: 'Royal Diamond Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 18, vit: 6, dex: 8, agi: 13, luk: 13 }, desc: 'Blue and gold with a diamond crest.' },
  { id: 'g_crimsonplate', img: 'assets/items/g_crimsonplate.png', name: 'Crimson Plate Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 25, vit: 14, dex: 7, agi: 13, luk: 6 }, desc: 'Red and white plate armor.' },
  { id: 'g_amethyst', img: 'assets/items/g_amethyst.png', name: 'Amethyst Crown Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 27, vit: 7, dex: 19, agi: 7, luk: 7 }, desc: 'Purple and gold with a crowned gem.' },
  { id: 'g_shadowthorn', img: 'assets/items/g_shadowthorn.png', name: 'Shadowthorn Gauntlets', type: 'glove', rar: 'rare', stats: { dmg: 13, vit: 7, dex: 19, agi: 8, luk: 6 }, desc: 'Dark purple spikes with a violet glow.' },
  { id: 'g_voidpulse', img: 'assets/items/g_voidpulse.png', name: 'Voidpulse Claws', type: 'glove', rar: 'epic', stats: { dmg: 23, vit: 24, dex: 19, agi: 9, luk: 8 }, desc: 'A purple orb pulses inside the crystal claws.' },
  { id: 'g_sunking', img: 'assets/items/g_sunking.png', name: 'Sunking Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 25, vit: 7, dex: 21, agi: 23, luk: 9 }, desc: 'Golden wings around a blue gem.' },
  { id: 'g_magmaclaw', img: 'assets/items/g_magmaclaw.png', name: 'Magmaclaw Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 33, vit: 14, dex: 16, agi: 14, luk: 16 }, desc: 'Cracked black armor full of lava.' },
  { id: 'g_glacier', img: 'assets/items/g_glacier.png', name: 'Glacier Shard Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 20, vit: 9, dex: 10, agi: 11, luk: 30 }, desc: 'Blue ice shards grow out of steel.' },
  { id: 'g_bloodforge', img: 'assets/items/g_bloodforge.png', name: 'Bloodforge Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 29, vit: 27, dex: 9, agi: 12, luk: 12 }, desc: 'Forged in blood-red fire.' },
  { id: 'g_stormcore', img: 'assets/items/g_stormcore.png', name: 'Stormcore Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 22, vit: 10, dex: 9, agi: 32, luk: 9 }, desc: 'Black plating with a crackling blue core.' },
  { id: 'g_aurelian', img: 'assets/items/g_aurelian.png', name: 'Aurelian Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 27, vit: 20, dex: 10, agi: 10, luk: 20 }, desc: 'Gold and purple, fit for a general.' },
  { id: 'g_nightbloom', img: 'assets/items/g_nightbloom.png', name: 'Nightbloom Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 18, vit: 8, dex: 10, agi: 25, luk: 17 }, desc: 'Purple petals of dark crystal.' },
  { id: 'g_toxicfang', img: 'assets/items/g_toxicfang.png', name: 'Toxic Fang Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 15, vit: 23, dex: 9, agi: 20, luk: 8 }, desc: 'Poison-green fangs on black steel.' },
  { id: 'g_infernal', img: 'assets/items/g_infernal.png', name: 'Infernal Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 32, vit: 9, dex: 31, agi: 11, luk: 9 }, desc: 'Red flames burn along the fingers.' },
  { id: 'g_cobalt', img: 'assets/items/g_cobalt.png', name: 'Cobalt Crystal Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 19, vit: 9, dex: 30, agi: 10, luk: 11 }, desc: 'Bright blue crystals over blue steel.' },
  { id: 'g_goldenhorn', img: 'assets/items/g_goldenhorn.png', name: 'Golden Horn Gauntlets', type: 'glove', rar: 'epic', stats: { dmg: 24, vit: 9, dex: 21, agi: 10, luk: 20 }, desc: 'Gold horns around a blue gem.' },
  { id: 'g_solar', img: 'assets/items/g_solar.png', name: 'Solar Crown Gauntlets', type: 'glove', rar: 'legendary', stats: { dmg: 29, vit: 13, dex: 24, agi: 31, luk: 12 }, desc: 'Blazing gold wings around a royal blue gem.' },
  { id: 'g_demonlord', img: 'assets/items/g_demonlord.png', name: 'Demonlord Talons', type: 'glove', rar: 'legendary', stats: { dmg: 37, vit: 22, dex: 20, agi: 18, luk: 20 }, desc: 'Black talons with a red furnace glow.' },
  { id: 'g_seraph', img: 'assets/items/g_seraph.png', name: 'Seraph Wing Gauntlets', type: 'glove', rar: 'legendary', stats: { dmg: 25, vit: 13, dex: 13, agi: 14, luk: 40 }, desc: 'Gold and silver wings that never dim.' },
  { id: 'g_voidreaper', img: 'assets/items/g_voidreaper.png', name: 'Voidreaper Talons', type: 'glove', rar: 'legendary', stats: { dmg: 31, vit: 39, dex: 15, agi: 14, luk: 12 }, desc: 'Violet talons torn from the dark.' },
  { id: 'g_frostgod', img: 'assets/items/g_frostgod.png', name: 'Frostgod Gauntlets', type: 'glove', rar: 'legendary', stats: { dmg: 22, vit: 13, dex: 13, agi: 40, luk: 14 }, desc: 'Ice crystals on silver plate.' },
  { id: 'g_phoenix', img: 'assets/items/g_phoenix.png', name: 'Phoenix Fire Gauntlets', type: 'glove', rar: 'legendary', stats: { dmg: 35, vit: 28, dex: 12, agi: 10, luk: 30 }, desc: 'Flames that never stop burning.' },
  { id: 'g_astral', img: 'assets/items/g_astral.png', name: 'Astral Sovereign Gauntlets', type: 'glove', rar: 'legendary', stats: { dmg: 27, vit: 13, dex: 10, agi: 32, luk: 25 }, desc: 'Purple and gold around a shining orb.' },
];
