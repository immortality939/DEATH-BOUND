/* ONLINE VERSION of profile.js - upload this file to GitHub (online game only).
   The offline app keeps using profile.js. Edit the two files separately on purpose. */
'use strict';
// ===== PROFILE + INVENTORY =====
// Your ONE character (chosen in New Game), its signature weapon, and gear: 1 weapon, 1 helmet, 2 rings, 1 armor, 1 pair of shoes.
// Every item can be UPGRADED with stones up to +12: each success adds +10% of the item's base stats, and success gets rarer each level.
// Items with an `img` show their picture (assets/items/<id>.png, 128x128); items without one show as a text tile.
// Bonuses are only DISPLAYED for now. profileBonuses(robotIndex) returns the totals when we hook them into battles.

const SLOTS = [   // key, label, item type it accepts
  { key: 'weapon', label: 'Weapon', type: 'weapon' },
  { key: 'helmet', label: 'Helmet', type: 'helmet' },
  { key: 'ring1',  label: 'Ring 1', type: 'ring' },
  { key: 'ring2',  label: 'Ring 2', type: 'ring' },
  { key: 'armor',  label: 'Armor',  type: 'armor' },
  { key: 'shoes',  label: 'Shoes',  type: 'shoes' },
  { key: 'heal',   label: 'Angelic Arm', type: 'heal' },   // Divine Heal (Shop): thrown in battle to heal
  { key: 'wings',  label: 'Wings', type: 'wings' },
  { key: 'neck',   label: 'Necklace', type: 'necklace' },
  { key: 'glove',  label: 'Gloves', type: 'glove' },   // Gloves (gloves.js, Shop + boss loot): Damage + Vitality / Dexterity / Luck / Agility, no Defense   // Necklace (Shop + boss loot): adds a % of your TOTAL health, cannot be upgraded   // Wings (Shop + boss loot from Sandstorm Dunes on): worn on the robot's back, upgradable
];
const STAT_LABEL = { dmg: ['Damage', ''], hp: ['Health', ''], def: ['Defense', ''], vit: ['Vitality', ''], agi: ['Agility', ''], dex: ['Dexterity', ''], luk: ['Luck', ''], crt: ['Crit Chance', '%'], cdm: ['Crit Damage', '%'], heal: ['Heal', ''], nhp: ['of total Health', '%'] };
const RARITY = { common: { name: 'Common', color: '#aab4cc' }, rare: { name: 'Rare', color: '#4fd8ff' }, epic: { name: 'Epic', color: '#c77bff' }, legendary: { name: 'Legendary', color: '#ffc83a' }, item: { name: 'Item', color: '#7dffc4' } };   // 'item' = Heal / Team Heal (no rarity is shown for them)
// stats: dmg = Damage (flat damage added to every hit of your signature weapon; on the weapon itself it is the weapon's own damage), hp = extra health, def = damage taken reduced %, crt / cdm = crit chance / crit damage %
//        vit / agi / dex / luk = attributes (see CHARACTER LEVEL below). There is no speed stat and no Attack % any more: old spd is now agi, old pow is now dmg.
const ITEMS = [
  { id: 'h_rust', img: 'assets/items/h_rust.png',   name: 'Steel Great Helm',   type: 'helmet', rar: 'common', stats: { hp: 8 },                 desc: 'Plain steel and a few air holes.' },
  { id: 'h_visor', img: 'assets/items/h_visor.png',  name: 'Crimson Horn Helm',    type: 'helmet', rar: 'rare',   stats: { def: 2 },        desc: 'Red-lit horns on black steel.' },
  { id: 'h_crown', img: 'assets/items/h_crown.png',  name: 'Warlord Crown',  type: 'helmet', rar: 'epic',   stats: { hp: 15 },        desc: 'Worn by the champions of the arena.' },
  { id: 'r_copper', img: 'assets/items/copper_ring.png', name: 'Copper Ring',    type: 'ring',   rar: 'common', stats: { },                desc: 'A simple band humming with charge.' },
  { id: 'r_ruby', img: 'assets/items/r_ruby.png',   name: 'Ruby Ring',      type: 'ring',   rar: 'rare',   stats: { },                desc: 'Glows hot when you aim.' },
  { id: 'r_sapph', img: 'assets/items/r_sapph.png',  name: 'Sapphire Ring',  type: 'ring',   rar: 'rare',   stats: { def: 4 },                desc: 'Cool to the touch. Bends incoming blasts.' },
  { id: 'r_life', img: 'assets/items/r_life.png',   name: 'Life Ring',      type: 'ring',   rar: 'rare',   stats: { hp: 12 },                desc: 'Keeps your core running a little longer.' },
  { id: 'r_void', img: 'assets/items/r_void.png',   name: 'Void Band',      type: 'ring',   rar: 'epic',   stats: { agi: 4 },        desc: 'Forged from a crack in the sky.' },
  { id: 'a_scrap', img: 'assets/items/a_scrap.png',  name: 'Scrap Plate',    type: 'armor',  rar: 'common', stats: { def: 5 },                desc: 'Bolted together from battlefield junk.' },
  { id: 'a_steel', img: 'assets/items/a_steel.png',  name: 'Steel Armor',    type: 'armor',  rar: 'rare',   stats: { def: 10, hp: 10 },       desc: 'Solid plating. Heavy but reliable.' },
  { id: 'a_plasma', img: 'assets/items/a_plasma.png', name: 'Royal Blue Plate',    type: 'armor',  rar: 'epic',   stats: { def: 14, hp: 20, agi: -3 }, desc: 'Blue and gold ceremonial plate.' },
  { id: 's_rusty',  name: 'Rusty Boots',    type: 'shoes',  rar: 'common', stats: { agi: 4 },                desc: 'Squeaky, but faster than bare feet.' },
  { id: 's_jet', img: 'assets/items/s_jet.png',    name: 'Golden Wing Boots',      type: 'shoes',  rar: 'rare',   stats: { agi: 8 },                desc: 'Small wings on gold and blue boots.' },
  { id: 's_mag', img: 'assets/items/s_mag.png',    name: 'Magnet Boots',   type: 'shoes',  rar: 'epic',   stats: { agi: 6, def: 3 },        desc: 'Grips the ground, even on steep rock.' },
  // ---- 80 more items: 20 new helmets, rings, armors and shoes ----
  { id: 'h_bucket', img: 'assets/items/h_bucket.png', name: 'Crimson Stripe Helm', type: 'helmet', rar: 'common', stats: { hp: 6 }, desc: 'Black steel with one red slash.' },
  { id: 'h_miner', img: 'assets/items/h_miner.png', name: 'Miner Hardhat', type: 'helmet', rar: 'common', stats: { hp: 5, def: 1 }, desc: 'Lamp on, head down, keep digging.' },
  { id: 'h_cap', img: 'assets/items/h_cap.png', name: 'Camo Goggle Helm', type: 'helmet', rar: 'common', stats: { agi: 3 }, desc: 'Net camo and goggles, ready for the field.' },
  { id: 'h_goggle', img: 'assets/items/h_goggle.png', name: 'Green Goggle Helm', type: 'helmet', rar: 'common', stats: { }, desc: 'Army-green dome with sharp-sight lenses.' },
  { id: 'h_tank', img: 'assets/items/h_tank.png', name: 'Shadow Pilot Helm', type: 'helmet', rar: 'common', stats: { def: 3, hp: 3 }, desc: 'Dark mask and tinted goggles.' },
  { id: 'h_horned', img: 'assets/items/h_horned.png', name: 'Viking Horns', type: 'helmet', rar: 'rare', stats: { hp: 12 }, desc: 'Charge first, ask questions never.' },
  { id: 'h_spike', img: 'assets/items/h_spike.png', name: 'Blackhorn Helm', type: 'helmet', rar: 'rare', stats: { }, desc: 'Black steel with glowing red cracks.' },
  { id: 'h_kabuto', img: 'assets/items/h_kabuto.png', name: 'Kabuto', type: 'helmet', rar: 'rare', stats: { def: 5 }, desc: 'Crescent crest of a battlefield duelist.' },
  { id: 'h_cyclops', img: 'assets/items/h_cyclops.png', name: 'Cyber Helm', type: 'helmet', rar: 'rare', stats: { }, desc: 'White plating and a bright blue visor.' },
  { id: 'h_antenna', img: 'assets/items/h_antenna.png', name: 'Red Horn Robo Helm', type: 'helmet', rar: 'rare', stats: { agi: 5, def: 3 }, desc: 'White plating with bright red horns.' },
  { id: 'h_ice', img: 'assets/items/h_ice.png', name: 'Shadow Hood', type: 'helmet', rar: 'rare', stats: { def: 7, hp: 5 }, desc: 'A dark hood and one cold blue glow.' },
  { id: 'h_knight', img: 'assets/items/h_knight.png', name: 'Golden Crown Helm', type: 'helmet', rar: 'rare', stats: { def: 9 }, desc: 'Gold wings around a blue gem.' },
  { id: 'h_flame', img: 'assets/items/h_flame.png', name: 'Inferno Crest', type: 'helmet', rar: 'epic', stats: { hp: 10 }, desc: 'The crest burns brighter with every hit.' },
  { id: 'h_wing', img: 'assets/items/h_wing.png', name: 'Valkyrie Helm', type: 'helmet', rar: 'epic', stats: { agi: 8, def: 5 }, desc: 'Winged helm for fast fighters.' },
  { id: 'h_skull', img: 'assets/items/h_skull.png', name: 'Venom Horn Helm', type: 'helmet', rar: 'epic', stats: { def: 3 }, desc: 'Green glow on black steel.' },
  { id: 'h_storm', img: 'assets/items/h_storm.png', name: 'Glacier Crest Helm', type: 'helmet', rar: 'epic', stats: { agi: 6 }, desc: 'Ice crystal spikes with a cold glow.' },
  { id: 'h_toxic', img: 'assets/items/h_toxic.png', name: 'Steam Visor Helm', type: 'helmet', rar: 'epic', stats: { def: 8, hp: 15 }, desc: 'Twin lenses and an orange face plate.' },
  { id: 'h_void', img: 'assets/items/h_void.png', name: 'Void Crown Helm', type: 'helmet', rar: 'epic', stats: { agi: 6 }, desc: 'Spikes of violet light.' },
  { id: 'h_halo', img: 'assets/items/h_halo.png', name: 'Seraph Halo', type: 'helmet', rar: 'legendary', stats: { hp: 25, def: 10, agi: 5 }, desc: 'A holy glow that turns blows aside.' },
  { id: 'h_dragon', img: 'assets/items/h_dragon.png', name: 'Dragon Lord Helm', type: 'helmet', rar: 'legendary', stats: { hp: 20, def: 6 }, desc: 'Forged in dragonfire. Rules the arena.' },
  { id: 'r_iron', img: 'assets/items/r_iron.png', name: 'Iron Band', type: 'ring', rar: 'common', stats: { def: 2 }, desc: 'Plain, heavy, dependable.' },
  { id: 'r_bronze', img: 'assets/items/r_bronze.png', name: 'Gold Star Signet', type: 'ring', rar: 'common', stats: { hp: 2 }, desc: 'A star stamped in gold.' },
  { id: 'r_twig', img: 'assets/items/r_twig.png', name: 'Moss Gem Ring', type: 'ring', rar: 'common', stats: { agi: 2, hp: 3 }, desc: 'A green gem in mossy stone.' },
  { id: 'r_bolt', img: 'assets/items/r_bolt.png', name: 'Dark Star Band', type: 'ring', rar: 'common', stats: { agi: 3 }, desc: 'A silver star on black stone.' },
  { id: 'r_pearl', img: 'assets/items/r_pearl.png', name: 'Blue Orb Band', type: 'ring', rar: 'common', stats: { def: 3 }, desc: 'A blue orb held in steel.' },
  { id: 'r_emerald', img: 'assets/items/r_emerald.png', name: 'Emerald Ring', type: 'ring', rar: 'rare', stats: { hp: 15 }, desc: 'Green light that mends your core.' },
  { id: 'r_topaz', img: 'assets/items/r_topaz.png', name: 'Winged Sapphire Ring', type: 'ring', rar: 'rare', stats: { agi: 6 }, desc: 'Silver wings hold a blue gem in gold.' },
  { id: 'r_amethyst', img: 'assets/items/r_amethyst.png', name: 'Amethyst Ring', type: 'ring', rar: 'rare', stats: { def: 2 }, desc: 'Balanced, calm and quietly deadly.' },
  { id: 'r_fang', img: 'assets/items/r_fang.png', name: 'Crimson Thorn Ring', type: 'ring', rar: 'rare', stats: { }, desc: 'Red cracks on spiked black stone.' },
  { id: 'r_eye', img: 'assets/items/r_eye.png', name: 'Violet Orb Ring', type: 'ring', rar: 'rare', stats: { agi: 3, def: 2 }, desc: 'A violet orb in dark steel.' },
  { id: 'r_frost', img: 'assets/items/r_frost.png', name: 'Frost Ring', type: 'ring', rar: 'rare', stats: { def: 5, hp: 5 }, desc: 'Cold enough to cool a laser.' },
  { id: 'r_cog', img: 'assets/items/r_cog.png', name: 'Silver Wing Orb Ring', type: 'ring', rar: 'rare', stats: { agi: 5, def: 3 }, desc: 'A blue orb between silver wings.' },
  { id: 'r_flame', img: 'assets/items/r_flame.png', name: 'Flame Ring', type: 'ring', rar: 'epic', stats: { }, desc: 'Burns hotter the closer you get.' },
  { id: 'r_thunder', img: 'assets/items/r_thunder.png', name: 'Frostscale Ring', type: 'ring', rar: 'epic', stats: { agi: 6 }, desc: 'Blue scales wrapped around the finger.' },
  { id: 'r_heart', img: 'assets/items/r_heart.png', name: 'Heartstone Ring', type: 'ring', rar: 'epic', stats: { hp: 25 }, desc: 'Beats in time with your core.' },
  { id: 'r_moon', img: 'assets/items/r_moon.png', name: 'Lunar Ring', type: 'ring', rar: 'epic', stats: { def: 8, agi: 4 }, desc: 'Bends light, and blasts, around you.' },
  { id: 'r_skull', img: 'assets/items/r_skull.png', name: 'Violet Flame Ring', type: 'ring', rar: 'epic', stats: { hp: 10 }, desc: 'An orb burning with violet fire.' },
  { id: 'r_star', img: 'assets/items/r_star.png', name: 'Golden Wing Ring', type: 'ring', rar: 'epic', stats: { def: 6, hp: 8 }, desc: 'Gold and silver wings around a blue gem.' },
  { id: 'r_twin', img: 'assets/items/r_twin.png', name: 'Hellfire Ring', type: 'ring', rar: 'legendary', stats: { agi: 8 }, desc: 'A horned ring, burning red.' },
  { id: 'r_crown', img: 'assets/items/r_crown.png', name: 'Dark Sovereign Ring', type: 'ring', rar: 'legendary', stats: { def: 9, hp: 15 }, desc: 'A violet orb crowned in black flame.' },
  { id: 'a_cloth', img: 'assets/items/a_cloth.png', name: 'Padded Vest', type: 'armor', rar: 'common', stats: { def: 3, hp: 3 }, desc: 'Stitched cloth. Better than nothing.' },
  { id: 'a_leather', img: 'assets/items/a_leather.png', name: 'Leather Jerkin', type: 'armor', rar: 'common', stats: { def: 4, agi: 2 }, desc: 'Light, flexible, a bit smelly.' },
  { id: 'a_chain', img: 'assets/items/a_chain.png', name: 'Dark Iron Plate', type: 'armor', rar: 'common', stats: { def: 5, hp: 5 }, desc: 'Black plates riveted at the shoulders.' },
  { id: 'a_barrel', img: 'assets/items/a_barrel.png', name: 'Silver Chest Plate', type: 'armor', rar: 'common', stats: { def: 6, hp: 5, agi: -2 }, desc: 'Dark steel with a bright silver chest.' },
  { id: 'a_tin', img: 'assets/items/a_tin.png', name: 'Star Cuirass', type: 'armor', rar: 'common', stats: { def: 6 }, desc: 'A star stamped on solid steel.' },
  { id: 'a_hunter', img: 'assets/items/a_hunter.png', name: 'Hunter Coat', type: 'armor', rar: 'rare', stats: { def: 7, agi: 3 }, desc: 'Pockets full of tricks.' },
  { id: 'a_knight', img: 'assets/items/a_knight.png', name: 'Knight Plate', type: 'armor', rar: 'rare', stats: { def: 11, hp: 8 }, desc: 'A golden cross on solid steel.' },
  { id: 'a_spike', img: 'assets/items/a_spike.png', name: 'Spiked Mail', type: 'armor', rar: 'rare', stats: { def: 8 }, desc: 'Hit it and it hits back.' },
  { id: 'a_ninja', img: 'assets/items/a_ninja.png', name: 'Violet Gem Plate', type: 'armor', rar: 'rare', stats: { def: 5, agi: 7 }, desc: 'Dark plate with violet gems.' },
  { id: 'a_reactor', img: 'assets/items/a_reactor.png', name: 'Reactor Core', type: 'armor', rar: 'rare', stats: { hp: 25, def: 5 }, desc: 'A glowing core hums in the chest.' },
  { id: 'a_ice', img: 'assets/items/a_ice.png', name: 'Glacier Plate', type: 'armor', rar: 'rare', stats: { def: 10, hp: 10, agi: -2 }, desc: 'Frozen solid, and so are your enemies.' },
  { id: 'a_copper', img: 'assets/items/a_copper.png', name: 'Violet Coat', type: 'armor', rar: 'rare', stats: { def: 6 }, desc: 'Purple coat with a gold belt.' },
  { id: 'a_flame', img: 'assets/items/a_flame.png', name: 'Magma Plate', type: 'armor', rar: 'epic', stats: { def: 12, hp: 10 }, desc: 'Cracked black rock, lava underneath.' },
  { id: 'a_aegis', img: 'assets/items/a_aegis.png', name: 'Aegis Cuirass', type: 'armor', rar: 'epic', stats: { def: 14, hp: 15 }, desc: 'A golden shield worn on the chest.' },
  { id: 'a_shadow', img: 'assets/items/a_shadow.png', name: 'Void Mantle', type: 'armor', rar: 'epic', stats: { def: 10, agi: 8 }, desc: 'A cloak stitched from night itself.' },
  { id: 'a_golem', img: 'assets/items/a_golem.png', name: 'Black Gold Robe', type: 'armor', rar: 'epic', stats: { def: 16, hp: 25, agi: -5 }, desc: 'Black plate with gold edges.' },
  { id: 'a_bio', img: 'assets/items/a_bio.png', name: 'Skull Plate', type: 'armor', rar: 'epic', stats: { hp: 35, def: 8 }, desc: 'A red skull on black armor.' },
  { id: 'a_storm', img: 'assets/items/a_storm.png', name: 'Radiant Plate', type: 'armor', rar: 'epic', stats: { def: 11, agi: 6 }, desc: 'White and gold with a blue gem.' },
  { id: 'a_dragon', img: 'assets/items/a_dragon.png', name: 'Dragon Scale Armor', type: 'armor', rar: 'legendary', stats: { def: 18, hp: 30 }, desc: 'Every scale from a different dragon.' },
  { id: 'a_titan', img: 'assets/items/a_titan.png', name: 'Crimson King Plate', type: 'armor', rar: 'legendary', stats: { def: 20, hp: 40, agi: -3 }, desc: 'Red and gold with a fur mantle.' },
  { id: 's_sandal', img: 'assets/items/s_sandal.png', name: 'Red Strap Boots', type: 'shoes', rar: 'common', stats: { agi: 3 }, desc: 'Black boots with a red mark.' },
  { id: 's_sneak', img: 'assets/items/s_sneak.png', name: 'Sneakers', type: 'shoes', rar: 'common', stats: { agi: 5 }, desc: 'Quick on the soft stuff.' },
  { id: 's_work', img: 'assets/items/s_work.png', name: 'Work Boots', type: 'shoes', rar: 'common', stats: { def: 2, hp: 4 }, desc: 'Steel toe, soft heart.' },
  { id: 's_cloth', img: 'assets/items/s_cloth.png', name: 'Fur Boots', type: 'shoes', rar: 'common', stats: { agi: 4, hp: 2 }, desc: 'Warm fur trim over tough leather.' },
  { id: 's_rubber', img: 'assets/items/s_rubber.png', name: 'Green Buckle Boots', type: 'shoes', rar: 'common', stats: { def: 3, agi: 2 }, desc: 'Olive boots with two buckle straps.' },
  { id: 's_spring', img: 'assets/items/s_spring.png', name: 'Venom Boots', type: 'shoes', rar: 'rare', stats: { agi: 7 }, desc: 'Green light along the seams.' },
  { id: 's_roller', img: 'assets/items/s_roller.png', name: 'Red Wing Boots', type: 'shoes', rar: 'rare', stats: { agi: 9 }, desc: 'White boots with red stripes and wings.' },
  { id: 's_spike', img: 'assets/items/s_spike.png', name: 'Spiked Cleats', type: 'shoes', rar: 'rare', stats: { agi: 5 }, desc: 'Grip hard, stomp harder.' },
  { id: 's_iron', img: 'assets/items/s_iron.png', name: 'Violet Greaves', type: 'shoes', rar: 'rare', stats: { def: 7, hp: 6 }, desc: 'Dark violet plates with sharp edges.' },
  { id: 's_iceskate', img: 'assets/items/s_iceskate.png', name: 'Ice Skates', type: 'shoes', rar: 'rare', stats: { agi: 8, def: 2 }, desc: 'Glide on any surface.' },
  { id: 's_tread', img: 'assets/items/s_tread.png', name: 'Royal Wing Boots', type: 'shoes', rar: 'rare', stats: { def: 6, agi: 3 }, desc: 'Purple and gold, winged at the heel.' },
  { id: 's_wing', img: 'assets/items/s_wing.png', name: 'Winged Boots', type: 'shoes', rar: 'epic', stats: { agi: 10 }, desc: 'Light as a feather, quick as a bolt.' },
  { id: 's_rocket', img: 'assets/items/s_rocket.png', name: 'Crimson Spike Boots', type: 'shoes', rar: 'epic', stats: { agi: 10 }, desc: 'Red-lit spikes on black steel.' },
  { id: 's_hover', img: 'assets/items/s_hover.png', name: 'Cyber Boots', type: 'shoes', rar: 'epic', stats: { agi: 9, def: 4 }, desc: 'Grey plating with a glowing blue core.' },
  { id: 's_claw', img: 'assets/items/s_claw.png', name: 'Toxic Spike Boots', type: 'shoes', rar: 'epic', stats: { agi: 5 }, desc: 'Green glow and sharp edges.' },
  { id: 's_shadow', img: 'assets/items/s_shadow.png', name: 'Shadow Steps', type: 'shoes', rar: 'epic', stats: { agi: 9, def: 5 }, desc: 'Leave no footprints.' },
  { id: 's_gold', img: 'assets/items/s_gold.png', name: 'Golden Greaves', type: 'shoes', rar: 'epic', stats: { def: 9, hp: 15, agi: 2 }, desc: 'Gleaming and incredibly tough.' },
  { id: 's_storm', img: 'assets/items/s_storm.png', name: 'Storm Striders', type: 'shoes', rar: 'epic', stats: { agi: 8 }, desc: 'Each step cracks like thunder.' },
  { id: 's_phase', img: 'assets/items/s_phase.png', name: 'Crystal Walkers', type: 'shoes', rar: 'legendary', stats: { agi: 14, def: 6, hp: 10 }, desc: 'Frozen crystal, light as air.' },
  { id: 's_titan', img: 'assets/items/s_titan.png', name: 'Titan Stompers', type: 'shoes', rar: 'legendary', stats: { def: 12, hp: 30, agi: 3 }, desc: 'The ground shakes when you walk.' },
];
// ---- signature weapons as inventory items: you always own your own robot's one for free, and every robot's signature weapon can also be BOUGHT in the Shop or WON from Adventure loot and worn by any robot ----
const WEAPON_ITEMS = WEAPONS.filter(w => w.sig).map(w => { const k = 'w_' + w.id.slice(3).toLowerCase(); return { id: k, img: 'assets/items/' + k + '.png', name: w.name, type: 'weapon', rar: 'common', stats: { dmg: w.proj.dmg }, desc: w.desc.replace(' Unlimited.', '') + ' Lobbed shot, unlimited ammo. Looks change at +10, +11 and +12.', sig: w.sig }; });
// ---- the 20 Shop weapons as inventory items (bought in the Shop, 2 also drop on every Boss loot board; you can wear one instead of your signature weapon) ----
const SHOP_WEAPON_ITEMS = WEAPONS.filter(w => w.shop).map(w => ({ id: w.shop, img: 'assets/items/' + w.shop + '.png', name: w.name, type: 'weapon', rar: w.rar, stats: { dmg: w.proj.dmg }, desc: w.desc + ' Lobbed shot, unlimited ammo. Looks change at +10, +11 and +12.' + (hasWeaponSkill(w) ? ' In Adventure its damage is halved (it has a skill).' : ''), shop: true }));
// ---- 80 extra Shop gear pieces (20 helmets, 20 armors, 20 rings, 20 shoes). Sold in the Shop only: they never drop from Adventure loot. ----
const SHOP_GEAR_ITEMS = [
  { id: 'h_ironpot', img: 'assets/items/h_ironpot.png', name: "Crusader Helm", type: 'helmet', rar: 'common', stats: { hp: 4, def: 2 }, desc: "A golden cross down the visor.", shop: true },
  { id: 'h_scrapcrest', img: 'assets/items/h_scrapcrest.png', name: "Spartan Helm", type: 'helmet', rar: 'common', stats: { hp: 40, def: 20, agi: 20 }, desc: "Red crest and a golden face guard.", shop: true },
  { id: 'h_ragcowl', img: 'assets/items/h_ragcowl.png', name: "Ronin Straw Hat", type: 'helmet', rar: 'common', stats: { hp: 4, def: 2 }, desc: "Wide straw hat and a grey face wrap.", shop: true },
  { id: 'h_boneguard', img: 'assets/items/h_boneguard.png', name: "Bone Guard", type: 'helmet', rar: 'common', stats: { hp: 4, def: 3 }, desc: "Rattles when you run. Intimidating.", shop: true },
  { id: 'h_oneeyed', img: 'assets/items/h_oneeyed.png', name: "Robo Visor Helm", type: 'helmet', rar: 'common', stats: { hp: 4, def: 2 }, desc: "White plating with a glowing blue visor.", shop: true },
  { id: 'h_bluesteel', img: 'assets/items/h_bluesteel.png', name: "Bluewing Helm", type: 'helmet', rar: 'rare', stats: { hp: 8, def: 3 }, desc: "Blue and gold with silver wings.", shop: true },
  { id: 'h_silverwing', img: 'assets/items/h_silverwing.png', name: "Silverwing Helm", type: 'helmet', rar: 'rare', stats: { hp: 8, def: 3, agi: 3 }, desc: "Winged and polished to a mirror shine.", shop: true },
  { id: 'h_thornguard', img: 'assets/items/h_thornguard.png', name: "Emerald Thorn Helm", type: 'helmet', rar: 'rare', stats: { hp: 8, def: 3 }, desc: "Green glow along every spike.", shop: true },
  { id: 'h_scoutvisor', img: 'assets/items/h_scoutvisor.png', name: "Pharaoh Helm", type: 'helmet', rar: 'rare', stats: { hp: 8, def: 5 }, desc: "Gold and blue stripes of a desert king.", shop: true },
  { id: 'h_gravedigger', img: 'assets/items/h_gravedigger.png', name: "Amethyst Horn Helm", type: 'helmet', rar: 'rare', stats: { hp: 8, def: 3 }, desc: "Purple steel with curled horns.", shop: true },
  { id: 'h_violetfang', img: 'assets/items/h_violetfang.png', name: "Violet Fang Helm", type: 'helmet', rar: 'epic', stats: { hp: 14, def: 5 }, desc: "Violet steel with a vicious bite.", shop: true },
  { id: 'h_phoenixcrest', img: 'assets/items/h_phoenixcrest.png', name: "Phoenix Crest", type: 'helmet', rar: 'epic', stats: { hp: 14, def: 5, agi: 5 }, desc: "Burns bright, never burns out.", shop: true },
  { id: 'h_emberking', img: 'assets/items/h_emberking.png', name: "Ember King Crown", type: 'helmet', rar: 'epic', stats: { hp: 14, def: 5 }, desc: "Crown of a molten warlord.", shop: true },
  { id: 'h_bloodgaze', img: 'assets/items/h_bloodgaze.png', name: "Bloodgaze Helm", type: 'helmet', rar: 'epic', stats: { hp: 14, def: 9 }, desc: "Its red stare unnerves rivals.", shop: true },
  { id: 'h_voidshroud', img: 'assets/items/h_voidshroud.png', name: "Azure Horn Helm", type: 'helmet', rar: 'epic', stats: { hp: 14, def: 5 }, desc: "Icy blue horns and a cold shine.", shop: true },
  { id: 'h_archangel', img: 'assets/items/h_archangel.png', name: "Archangel Helm", type: 'helmet', rar: 'legendary', stats: { hp: 24, def: 9 }, desc: "Blessed plating that glows with a holy light.", shop: true },
  { id: 'h_sunemperor', img: 'assets/items/h_sunemperor.png', name: "Sun Emperor Crown", type: 'helmet', rar: 'legendary', stats: { hp: 24, def: 9, agi: 9 }, desc: "Rays of a dying star, worn as a crown.", shop: true },
  { id: 'h_wyrmlord', img: 'assets/items/h_wyrmlord.png', name: "Wyrmlord Horned Helm", type: 'helmet', rar: 'legendary', stats: { hp: 24, def: 9 }, desc: "Horns taken from a wyrm lord.", shop: true },
  { id: 'h_cosmicvisor', img: 'assets/items/h_cosmicvisor.png', name: "Cosmic Visor", type: 'helmet', rar: 'legendary', stats: { hp: 24, def: 15 }, desc: "The whole sky reflected in one visor.", shop: true },
  { id: 'h_deathbringer', img: 'assets/items/h_deathbringer.png', name: "Nightmare Crown", type: 'helmet', rar: 'legendary', stats: { hp: 24, def: 9 }, desc: "Violet spikes and glowing golden eyes.", shop: true },
  { id: 'a_scrapplate', img: 'assets/items/a_scrapplate.png', name: "Scrapyard Plate", type: 'armor', rar: 'common', stats: { def: 5, hp: 5 }, desc: "Bolted together from the scrapyard.", shop: true },
  { id: 'a_ragvest', img: 'assets/items/a_ragvest.png', name: "Hooded Jacket", type: 'armor', rar: 'common', stats: { def: 8, hp: 5 }, desc: "Brown leather with a hooded collar.", shop: true },
  { id: 'a_rivetmail', img: 'assets/items/a_rivetmail.png', name: "Rivet Mail", type: 'armor', rar: 'common', stats: { def: 5, hp: 5, agi: 2 }, desc: "Hundreds of rivets, one stubborn robot.", shop: true },
  { id: 'a_cinderhide', img: 'assets/items/a_cinderhide.png', name: "Red Stripe Plate", type: 'armor', rar: 'common', stats: { def: 5, hp: 5 }, desc: "White plating with a red sash.", shop: true },
  { id: 'a_mudguard', img: 'assets/items/a_mudguard.png', name: "Field Jacket", type: 'armor', rar: 'common', stats: { def: 5, hp: 5 }, desc: "Green field vest, patched and tough.", shop: true },
  { id: 'a_aquaplate', img: 'assets/items/a_aquaplate.png', name: "Crystal Plate", type: 'armor', rar: 'rare', stats: { def: 10, hp: 10 }, desc: "White plating with ice-blue crystal.", shop: true },
  { id: 'a_thornmail', img: 'assets/items/a_thornmail.png', name: "Thornmail Vest", type: 'armor', rar: 'rare', stats: { def: 16, hp: 10 }, desc: "Thorny vest that bites back.", shop: true },
  { id: 'a_stormscale', img: 'assets/items/a_stormscale.png', name: "Storm Scale Armor", type: 'armor', rar: 'rare', stats: { def: 10, hp: 10, agi: 3 }, desc: "Scales crackling with static.", shop: true },
  { id: 'a_copperforge', img: 'assets/items/a_copperforge.png', name: "Golden Plate", type: 'armor', rar: 'rare', stats: { def: 10, hp: 10 }, desc: "Gold plating with a red sash.", shop: true },
  { id: 'a_ghostcape', img: 'assets/items/a_ghostcape.png', name: "Mage Cloak", type: 'armor', rar: 'rare', stats: { def: 10, hp: 10 }, desc: "Blue cloak with gold trim.", shop: true },
  { id: 'a_infernocore', img: 'assets/items/a_infernocore.png', name: "Inferno Core Armor", type: 'armor', rar: 'epic', stats: { def: 18, hp: 18 }, desc: "A furnace beats in the chest.", shop: true },
  { id: 'a_violetwarden', img: 'assets/items/a_violetwarden.png', name: "Violet Warden Plate", type: 'armor', rar: 'epic', stats: { def: 28, hp: 18 }, desc: "Warden plate of the violet guard.", shop: true },
  { id: 'a_spineback', img: 'assets/items/a_spineback.png', name: "Spineback Armor", type: 'armor', rar: 'epic', stats: { def: 18, hp: 18, agi: 5 }, desc: "Spines along the back keep enemies off.", shop: true },
  { id: 'a_crimsoncloak', img: 'assets/items/a_crimsoncloak.png', name: "Crimson Cloak Plate", type: 'armor', rar: 'epic', stats: { def: 18, hp: 18 }, desc: "Heavy plate under a blood-red cloak.", shop: true },
  { id: 'a_frostdrake', img: 'assets/items/a_frostdrake.png', name: "Frostdrake Scale", type: 'armor', rar: 'epic', stats: { def: 18, hp: 18 }, desc: "Scales lifted from a frostdrake.", shop: true },
  { id: 'a_seraphplate', img: 'assets/items/a_seraphplate.png', name: "Seraph Wing Plate", type: 'armor', rar: 'legendary', stats: { def: 30, hp: 30 }, desc: "Wings of light spread behind this plate.", shop: true },
  { id: 'a_sunforged', img: 'assets/items/a_sunforged.png', name: "Sunforged Core", type: 'armor', rar: 'legendary', stats: { def: 48, hp: 30 }, desc: "Its core burns like a small sun.", shop: true },
  { id: 'a_voidemperor', img: 'assets/items/a_voidemperor.png', name: "Void Emperor Mantle", type: 'armor', rar: 'legendary', stats: { def: 30, hp: 30, agi: 9 }, desc: "Mantle of an emperor from nowhere.", shop: true },
  { id: 'a_worldbreaker', img: 'assets/items/a_worldbreaker.png', name: "Worldbreaker Plate", type: 'armor', rar: 'legendary', stats: { def: 30, hp: 30 }, desc: "Plate made to take on the whole world.", shop: true },
  { id: 'a_dragonsoul', img: 'assets/items/a_dragonsoul.png', name: "Azure Wing Plate", type: 'armor', rar: 'legendary', stats: { def: 30, hp: 30 }, desc: "Cyan wings and gold trim.", shop: true },
  { id: 'r_nutsig', img: 'assets/items/r_nutsig.png', name: "Ember Stone Ring", type: 'ring', rar: 'common', stats: { agi: 2, def: 2 }, desc: "Cracked black stone with a red glow.", shop: true },
  { id: 'r_tinloop', img: 'assets/items/r_tinloop.png', name: "Blue Gem Band", type: 'ring', rar: 'common', stats: { agi: 2, hp: 4 }, desc: "Silver band with one blue gem.", shop: true },
  { id: 'r_clayband', img: 'assets/items/r_clayband.png', name: "Skull Ring", type: 'ring', rar: 'common', stats: { agi: 2 }, desc: "Red eyes in a grinning skull.", shop: true },
  { id: 'r_leafcoil', img: 'assets/items/r_leafcoil.png', name: "Little Crown Ring", type: 'ring', rar: 'common', stats: { agi: 2 }, desc: "A tiny gold crown with a red gem.", shop: true },
  { id: 'r_gravelring', img: 'assets/items/r_gravelring.png', name: "Spiked Sapphire Ring", type: 'ring', rar: 'common', stats: { agi: 2, def: 1 }, desc: "Silver spikes around a blue gem.", shop: true },
  { id: 'r_aquaring', img: 'assets/items/r_aquaring.png', name: "Aqua Signet", type: 'ring', rar: 'rare', stats: { agi: 4, def: 3 }, desc: "Cool signet with a water-blue gem.", shop: true },
  { id: 'r_jadetwin', img: 'assets/items/r_jadetwin.png', name: "Jade Twin Ring", type: 'ring', rar: 'rare', stats: { agi: 4, hp: 8 }, desc: "Two jade stones, one steady glow.", shop: true },
  { id: 'r_quartzeye', img: 'assets/items/r_quartzeye.png', name: "Azure Crystal Ring", type: 'ring', rar: 'rare', stats: { agi: 4 }, desc: "Crystal spikes of bright blue.", shop: true },
  { id: 'r_silverorb', img: 'assets/items/r_silverorb.png', name: "Silver Amethyst Ring", type: 'ring', rar: 'rare', stats: { agi: 4 }, desc: "Silver thorns around a violet gem.", shop: true },
  { id: 'r_ambercrown', img: 'assets/items/r_ambercrown.png', name: "Golden Gem Ring", type: 'ring', rar: 'rare', stats: { agi: 4, def: 2 }, desc: "A blue gem in a gold setting.", shop: true },
  { id: 'r_violetwing', img: 'assets/items/r_violetwing.png', name: "Violet Wing Ring", type: 'ring', rar: 'epic', stats: { agi: 7, def: 5 }, desc: "Winged ring with a violet shine.", shop: true },
  { id: 'r_infernoband', img: 'assets/items/r_infernoband.png', name: "Inferno Band", type: 'ring', rar: 'epic', stats: { agi: 7, hp: 14 }, desc: "A band of living flame.", shop: true },
  { id: 'r_bloodeye', img: 'assets/items/r_bloodeye.png', name: "Shadow Gem Ring", type: 'ring', rar: 'epic', stats: { agi: 7 }, desc: "A dark purple gem in black thorns.", shop: true },
  { id: 'r_thornking', img: 'assets/items/r_thornking.png', name: "Thornking Ring", type: 'ring', rar: 'epic', stats: { agi: 7 }, desc: "The king of thorns wears this.", shop: true },
  { id: 'r_stormorb', img: 'assets/items/r_stormorb.png', name: "Storm Orb Ring", type: 'ring', rar: 'epic', stats: { agi: 7, def: 4 }, desc: "A tiny storm trapped in an orb.", shop: true },
  { id: 'r_seraphhalo', img: 'assets/items/r_seraphhalo.png', name: "Seraph Halo Ring", type: 'ring', rar: 'legendary', stats: { agi: 12, def: 9 }, desc: "A halo shrunk to fit one finger.", shop: true },
  { id: 'r_suncrown', img: 'assets/items/r_suncrown.png', name: "Sun Crown Ring", type: 'ring', rar: 'legendary', stats: { agi: 12, hp: 24 }, desc: "A crown of sunfire on a golden band.", shop: true },
  { id: 'r_voidgaze', img: 'assets/items/r_voidgaze.png', name: "Void Gaze Ring", type: 'ring', rar: 'legendary', stats: { agi: 12 }, desc: "Stare into it and it stares back.", shop: true },
  { id: 'r_phoenixheart', img: 'assets/items/r_phoenixheart.png', name: "Phoenix Heart Ring", type: 'ring', rar: 'legendary', stats: { agi: 12 }, desc: "A beating phoenix heart set in gold.", shop: true },
  { id: 'r_galaxyorb', img: 'assets/items/r_galaxyorb.png', name: "Galaxy Orb Ring", type: 'ring', rar: 'legendary', stats: { agi: 12, def: 6 }, desc: "A small galaxy spinning inside.", shop: true },
  { id: 's_patchsneaker', img: 'assets/items/s_patchsneaker.png', name: "Racing Stripe Boots", type: 'shoes', rar: 'common', stats: { agi: 4, def: 2 }, desc: "Black boots with red and white stripes.", shop: true },
  { id: 's_mudboots', img: 'assets/items/s_mudboots.png', name: "Mudwalker Boots", type: 'shoes', rar: 'common', stats: { agi: 4, def: 2, hp: 4 }, desc: "Made for long, muddy marches.", shop: true },
  { id: 's_tinhops', img: 'assets/items/s_tinhops.png', name: "Gunmetal Boots", type: 'shoes', rar: 'common', stats: { agi: 4, def: 2 }, desc: "Grey plates, riveted tight.", shop: true },
  { id: 's_gravelstomp', img: 'assets/items/s_gravelstomp.png', name: "Gravel Stompers", type: 'shoes', rar: 'common', stats: { agi: 7, def: 2 }, desc: "Crunch, crunch, crunch.", shop: true },
  { id: 's_leafsteps', img: 'assets/items/s_leafsteps.png', name: "Leaf Steps", type: 'shoes', rar: 'common', stats: { agi: 4, def: 2 }, desc: "Light as a leaf on the wind.", shop: true },
  { id: 's_aquaboots', img: 'assets/items/s_aquaboots.png', name: "Aqua Boots", type: 'shoes', rar: 'rare', stats: { agi: 8, def: 3 }, desc: "Waterproof boots that ride the waves.", shop: true },
  { id: 's_thornspurs', img: 'assets/items/s_thornspurs.png', name: "Thorn Spurs", type: 'shoes', rar: 'rare', stats: { agi: 8, def: 3, hp: 8 }, desc: "Spurs sharp enough to grip any slope.", shop: true },
  { id: 's_coppertreads', img: 'assets/items/s_coppertreads.png', name: "Gold Wing Greaves", type: 'shoes', rar: 'rare', stats: { agi: 8, def: 3 }, desc: "Gold boots with a red gem and wings.", shop: true },
  { id: 's_silverhover', img: 'assets/items/s_silverhover.png', name: "Sapphire Gold Boots", type: 'shoes', rar: 'rare', stats: { agi: 14, def: 3 }, desc: "Blue boots with gold plating.", shop: true },
  { id: 's_hawkclaw', img: 'assets/items/s_hawkclaw.png', name: "Hawk Claw Boots", type: 'shoes', rar: 'rare', stats: { agi: 8, def: 3 }, desc: "Talons for a sure grip.", shop: true },
  { id: 's_violetwing', img: 'assets/items/s_violetwing.png', name: "Violet Wingtips", type: 'shoes', rar: 'epic', stats: { agi: 14, def: 5 }, desc: "Violet wings on both heels.", shop: true },
  { id: 's_infernostride', img: 'assets/items/s_infernostride.png', name: "Inferno Striders", type: 'shoes', rar: 'epic', stats: { agi: 14, def: 5, hp: 14 }, desc: "Blazing pads that leave scorch marks.", shop: true },
  { id: 's_nightfang', img: 'assets/items/s_nightfang.png', name: "Nightfang Boots", type: 'shoes', rar: 'epic', stats: { agi: 14, def: 5 }, desc: "Dark boots with a cruel kick.", shop: true },
  { id: 's_stormspring', img: 'assets/items/s_stormspring.png', name: "Frost Crystal Boots", type: 'shoes', rar: 'epic', stats: { agi: 24, def: 5 }, desc: "Ice crystals climbing the shins.", shop: true },
  { id: 's_ghoststep', img: 'assets/items/s_ghoststep.png', name: "Gold Sapphire Boots", type: 'shoes', rar: 'epic', stats: { agi: 14, def: 5 }, desc: "Gold wings over blue plating.", shop: true },
  { id: 's_seraphsteps', img: 'assets/items/s_seraphsteps.png', name: "Seraph Steps", type: 'shoes', rar: 'legendary', stats: { agi: 24, def: 9 }, desc: "Heavenly wings carry each step.", shop: true },
  { id: 's_sunstriders', img: 'assets/items/s_sunstriders.png', name: "Sun Striders", type: 'shoes', rar: 'legendary', stats: { agi: 24, def: 9, hp: 24 }, desc: "Each stride leaves a trail of sunlight.", shop: true },
  { id: 's_voidwalkers', img: 'assets/items/s_voidwalkers.png', name: "Void Walkers", type: 'shoes', rar: 'legendary', stats: { agi: 24, def: 9 }, desc: "Walk where the ground ends.", shop: true },
  { id: 's_wyrmtalons', img: 'assets/items/s_wyrmtalons.png', name: "Wyrm Talons", type: 'shoes', rar: 'legendary', stats: { agi: 42, def: 9 }, desc: "Wyrm talons that tear through rock.", shop: true },
  { id: 's_worldtreads', img: 'assets/items/s_worldtreads.png', name: "Magma Treads", type: 'shoes', rar: 'legendary', stats: { agi: 24, def: 9 }, desc: "Fire burning around every step.", shop: true },
];
// ---- EVERY item carries all 5 stats: Damage, Vitality, Dexterity, Luck, Agility. Rarer items get more points; the item type decides how they are split. ----
// ITEM_ATTR_BUDGET = vit/agi/dex/luk points per rarity, ITEM_DMG_BUDGET = Damage per rarity. Each stat is at least 1. The weapon keeps its own base Damage (it is the weapon's damage) and gets the 4 attributes.
const ITEM_ATTR_BUDGET = { common: 6, rare: 12, epic: 20, legendary: 32 };
const ITEM_DMG_BUDGET = { common: 1, rare: 2, epic: 4, legendary: 6 };
// ---- DAMAGE LIVES ON WEAPONS ONLY: helmets, rings, armor and shoes have NO Damage stat any more. The Damage they used to give is added to every weapon of the same rarity instead. ----
// bonus = best 2 rings + best helmet + best armor + best shoes of that rarity (the most Damage a full gear set used to give). Change a number here to rebalance a rarity's weapons.
const WEAPON_DMG_BONUS = { common: 11, rare: 20, epic: 35, legendary: 53 };
const ITEM_ATTR_SPLIT = { helmet: { vit: .4, luk: .3, agi: .15, dex: .15 }, armor: { vit: .35, dex: .35, agi: .15, luk: .15 }, ring: { luk: .35, agi: .35, vit: .15, dex: .15 }, shoes: { dex: .35, agi: .3, luk: .2, vit: .15 }, weapon: { luk: .3, agi: .3, dex: .2, vit: .2 } };
const ITEM_DMG_SPLIT = { helmet: 1, ring: 1, armor: .75, shoes: .75 };   // share of ITEM_DMG_BUDGET per item type (weapon: none, its Damage is its own)
[...ITEMS, ...SHOP_GEAR_ITEMS, ...WEAPON_ITEMS, ...SHOP_WEAPON_ITEMS].forEach(it => {
  const b = ITEM_ATTR_BUDGET[it.rar] || 6, sp = ITEM_ATTR_SPLIT[it.type] || {};
  for (const k in sp) if (it.id !== 'w_titan_cannon' && it.id !== 'w_shuriken' && it.id !== 'w_tempest_arc' && it.id !== 'w_doom_axe') it.stats[k] = (it.stats[k] || 0) + Math.max(1, Math.round(b * sp[k]));
  if (it.id === 'w_titan_cannon') { it.stats = { dmg: it.stats.dmg, vit: 10, dex: 20, luk: 3, agi: 3, hp: 50, def: 20 }; }   // Titan Cannon: fixed stats (Damage 300 total, Dex 20, Vit 10, Agi 3, Luck 3, Defense 20), not the rarity split
  if (it.id === 'w_tempest_arc') { it.stats = { dmg: it.stats.dmg, vit: 6, dex: 3, luk: 50, agi: 6, def: 3 }; }   // Tempest Arc: fixed stats (Damage 320 total, Agility 6, Dexterity 3, Defense 3, Luck 50, Vitality 6)
  if (it.id === 'w_doom_axe') { it.stats = { dmg: it.stats.dmg, vit: 5, dex: 25, luk: 25, agi: 3, hp: 25, def: 10 }; }   // Doom Axe: fixed stats (Damage 290 total, Vitality 5, Dexterity 25, Agility 3, Luck 25, Defense 10, Health 25)
  if (it.id === 'w_shuriken') { it.stats = { dmg: it.stats.dmg, vit: 3, dex: 3, luk: 6, agi: 40 }; }   // Shuriken: fixed stats (Damage 350 total, Vitality 3, Agility 40, Luck 6, Dexterity 3)
  if (it.type === 'weapon') { it.baseDmg = it.stats.dmg; it.stats.dmg = it.baseDmg + (WEAPON_DMG_BONUS[it.rar] || 0); }   // gear no longer has Damage: weapons carry it (by rarity)
  const o = {}; ['dmg', 'vit', 'dex', 'luk', 'agi'].forEach(k => { if (k in it.stats) o[k] = it.stats[k]; }); for (const k in it.stats) if (!(k in o)) o[k] = it.stats[k]; it.stats = o;   // show Damage first
});
const HEAL_ITEMS = [{ id: 'heal_divine', img: 'assets/items/heal_divine.png', name: 'Divine Heal', type: 'heal', rar: 'legendary', stats: { hp: 250, heal: 105 }, heal: true,
  desc: 'Angelic orb. Hold FIRE and release to throw it: everyone in its blast heals together (the Heal is split between them), no terrain damage. ' + (typeof HEAL_AMMO !== 'undefined' ? HEAL_AMMO : 2) + ' throws per match at +0. Every upgrade adds +1 throw and raises Health and a lot more Heal.' }];
// WINGS: a new gear type with its own Profile slot. Worn wings are drawn on the robot's back in battle (they flap faster while flying).
// Stats by rarity (fixed, then +10% per upgrade like all gear): Vitality 5 / 10 / 15 / 20, Health 20 / 30 / 40 / 50, Damage 10 / 20 / 30 / 40 (Common / Rare / Epic / Legendary).
// Pictures: assets/items/wings_<look>.png (icon), assets/fx/wings_<look>.png (8-frame flapping sheet, registered as FLY_FX in weapons.js). Sold in the Shop; drop only from boss loot on Sandstorm Dunes and every later map (adventure.js Loot).
const WING_ITEMS = [
  { id: 'wings_common', img: 'assets/items/wings_common.png', name: 'Sky Wings', type: 'wings', rar: 'common', look: 'common', stats: { vit: 5, hp: 20, dmg: 10 }, desc: 'Light blue wings that fold onto your back. Flap them to fly.' },
  { id: 'wings_rare', img: 'assets/items/wings_rare.png', name: 'Jade Wings', type: 'wings', rar: 'rare', look: 'rare', stats: { vit: 10, hp: 30, dmg: 20 }, desc: 'Jade feathers that shimmer when you take off.' },
  { id: 'wings_epic', img: 'assets/items/wings_epic.png', name: 'Amethyst Wings', type: 'wings', rar: 'epic', look: 'epic', stats: { vit: 15, hp: 40, dmg: 30 }, desc: 'Purple wings charged with raw power.' },
  { id: 'wings_legend', img: 'assets/items/wings_legend.png', name: 'Solar Wings', type: 'wings', rar: 'legendary', look: 'legend', stats: { vit: 20, hp: 50, dmg: 40 }, desc: 'Golden wings that blaze in the sun.' },
];
// NECKLACES: a new gear type with its own Profile slot (bottom right under Wings). Each one adds a % of your TOTAL health (the 100 base + every item + attributes),
// e.g. 1000 total health with the +10% necklace becomes 1100. +10% / +20% / +30% / +40% / +50%. They can NOT be upgraded (noUp: the Forge ignores them). Sold in the Shop and found on EVERY boss loot board (adventure.js Loot.neckPick).
// Pictures: assets/items/neck_1.png ... neck_5.png (128x128). To rebalance change `stats.nhp` (percent) here and the prices in ITEM_PRICE below.
const NECK_ITEMS = [
  { id: 'neck_1', img: 'assets/items/neck_1.png', name: 'Cord Pendant', type: 'necklace', rar: 'common', noUp: true, stats: { nhp: 10 }, desc: 'A leather cord with a gold pendant. Adds 10% of your TOTAL health (base + all items + attributes). Cannot be upgraded.' },
  { id: 'neck_2', img: 'assets/items/neck_2.png', name: 'Gilded Chain', type: 'necklace', rar: 'rare', noUp: true, stats: { nhp: 20 }, desc: 'Heavy golden links with a winged sapphire. Adds 20% of your TOTAL health. Cannot be upgraded.' },
  { id: 'neck_3', img: 'assets/items/neck_3.png', name: 'Ruby Spike Chain', type: 'necklace', rar: 'epic', noUp: true, stats: { nhp: 30 }, desc: 'Spiked iron chain around a blood-red ruby. Adds 30% of your TOTAL health. Cannot be upgraded.' },
  { id: 'neck_4', img: 'assets/items/neck_4.png', name: 'Frostcrystal Collar', type: 'necklace', rar: 'legendary', noUp: true, stats: { nhp: 40 }, desc: 'Glowing ice crystals wrapped in gold. Adds 40% of your TOTAL health. Cannot be upgraded.' },
  { id: 'neck_5', img: 'assets/items/neck_5.png', name: 'Voidwing Collar', type: 'necklace', rar: 'legendary', noUp: true, stats: { nhp: 50 }, desc: 'Violet void wings around an amethyst core. Adds 50% of your TOTAL health. Cannot be upgraded.' },
];
// Heal / Team Heal: consumables sold in the Shop (no rarity, no upgrades, not an "owned" item). You can carry at most POTION_MAX of each; every use in a match
// takes one away for good, so you buy again after the match. In battle they are the two clickable boxes at the bottom. pct = share of the robot's MAX health that is healed.
const POTION_MAX = 2;
const POTION_ITEMS = [
  { id: 'pot_heal', img: 'assets/items/pot_heal.png', name: 'Heal', type: 'potion', potion: 'self', pct: .5, rar: 'item', stats: {}, desc: 'Heals the robot that is playing for 50% of its max health. One tap on its box in battle: instant, and you can still fire in the same turn. Carry up to 2. Used ones are gone after the match.' },
  { id: 'pot_team', img: 'assets/items/pot_team.png', name: 'Team Heal', type: 'potion', potion: 'team', pct: .35, rar: 'item', stats: {}, desc: 'Heals EVERY living robot of your team for 35% of its own max health. One tap on its box in battle: instant, and you can still fire in the same turn. Carry up to 2. Used ones are gone after the match.' },
];
const baseId = id => { id = String(id == null ? '' : id); const k = id.indexOf('#'); return k < 0 ? id : id.slice(0, k); };   // 'r_ring#2' -> 'r_ring' (every extra copy of a gear piece is its own item 'baseid#n')
const _itemBase = id => ITEMS.find(i => i.id === id) || NECK_ITEMS.find(i => i.id === id) || GLOVE_ITEMS.find(i => i.id === id) || HEAL_ITEMS.find(i => i.id === id) || WING_ITEMS.find(i => i.id === id) || POTION_ITEMS.find(i => i.id === id) || SHOP_GEAR_ITEMS.find(i => i.id === id) || WEAPON_ITEMS.find(i => i.id === id) || SHOP_WEAPON_ITEMS.find(i => i.id === id) || (typeof MAT_ITEMS !== 'undefined' ? MAT_ITEMS.find(i => i.id === id) : null);
const _instCache = {};
const itemById = id => { if (id == null) return null; if (typeof id === 'string' && id.indexOf('#') > 0) { const b = _itemBase(baseId(id)); if (!b) return null; const c = _instCache[id]; if (c && c.__b === b) return c; return (_instCache[id] = Object.assign({}, b, { id, base: b.id, __b: b })); } return _itemBase(id); };   // an extra copy looks and acts like its base item but has its own id (own upgrade level, own slot)
const weaponItemFor = rid => WEAPON_ITEMS.find(i => i.sig === rid);
const LOOT_LOCK = true;   // true = items must be won (Adventure loot cards). Set to false to own every item like before.
const INV_CELLS = 24;

// ---- upgrading ----
// Level n -> n+1 needs only ONE stone; each extra stone slot used in the Forge adds its UP_RATE chance (lower every level). A failure keeps the level but the stones are gone.
// Every success adds a % of the item's BASE stats (see UP_STEPS: 10%, and 15% / 20% / 25% for +10 / +11 / +12). Max level +12. Upgradable: weapon, helmet, armor, rings, shoes.
const UP_MAX = 12, UP_STEP = 0.10;
const UP_STEPS = [.10, .10, .10, .10, .10, .10, .10, .10, .10, .15, .20, .25];   // bonus added by each success: +1..+9 give +10% each, +10 gives +15%, +11 gives +20%, +12 gives +25%
// Divine Heal's Heal stat has its own, bigger scale. Each upgrade ADDS to the bonus (it stacks): +1..+9 add +75% of the base Heal each, +10 adds +112.5%, +11 adds +150%, +12 adds +185.5%
const HEAL_STEPS = [.75, .75, .75, .75, .75, .75, .75, .75, .75, 1.125, 1.5, 1.855];   // bonus added by each upgrade level (change these)
const HEAL_BONUS = HEAL_STEPS.reduce((a, x) => (a.push(a[a.length - 1] + x), a), [0]);   // total bonus at each level (built from the steps above)
const healBonus = lvl => HEAL_BONUS[Math.max(0, Math.min(UP_MAX, lvl | 0))];
const healThrows = lvl => HEAL_AMMO + Math.max(0, Math.min(UP_MAX, lvl | 0));   // Divine Heal throws per match: 3 at +0, +1 for every upgrade (15 at +12)
const upBonus = lvl => { let b = 0; for (let i = 0; i < lvl && i < UP_MAX; i++) b += UP_STEPS[i]; return b; };   // total bonus at a level (+9 = 90%, +10 = 105%, +11 = 125%, +12 = 150%)
const UP_RATE = [90, 30, 26, 22.5, 19, 16, 13, 10, 7.5, 5.5, 4, 3];   // success chance of ONE stone (x the stone's mult); every extra stone in the Forge adds its own. A bit lower every level (Sun Stone: +0 100%, +1 39%, then lower every level)
const UP_COST = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];   // one stone is enough (each Forge stone slot uses 1)
const STONE_PRICE = 150;   // chips per Blue Stone in the upgrade panel
// ---- 5 kinds of upgrade stones ----
// mult = how strong the stone is: the success chance of an upgrade is UP_RATE[level] x mult (capped at 100%). Better stones are found on later Adventure maps and cost more chips.
const STONE_TYPES = [
  { n: 'Blue Stone',     img: 'assets/stone.png',  mult: .6,  price: 150,  col: '#4fb4ff' },
  { n: 'Jade Stone',     img: 'assets/stone2.png', mult: .8,  price: 300,  col: '#2fd68a' },
  { n: 'Amethyst Stone', img: 'assets/stone3.png', mult: .9,  price: 550,  col: '#c77bff' },
  { n: 'Ruby Stone',     img: 'assets/stone4.png', mult: 1.1, price: 900,  col: '#ff5a6a' },
  { n: 'Sun Stone',      img: 'assets/stone5.png', mult: 1.3, price: 1400, col: '#ffc83a' },
];
const stoneKey = t => t > 1 ? 'stones' + t : 'stones';
const upRate = (L, t = 1) => Math.min(100, Math.round(UP_RATE[L] * STONE_TYPES[t - 1].mult * 10) / 10);
// ===== CHARACTER LEVEL + ATTRIBUTES =====
// Your robot levels up from 1 to LVL_MAX by playing (XP from matches and Adventure stages). EVERY level gives +PTS_PER_LVL to each attribute.
// vit: +5 health each | dex: +2 health and +1 defense each (10 defense = 1% less damage) | agi: +0.25% crit damage and +1 damage each | luk: +0.15% crit chance each. Gear adds to the same attributes.
const VIT_HP = 5, DEX_HP = 2, DEX_DEF = 1, AGI_CDM = .25, AGI_DMG = 1, LUK_CRT = .10;   // what ONE point of each attribute gives (change these to rebalance)
const DEF_DIV = 10;   // Defense points -> damage blocked %: 100 Defense = 10% (blocks 10 of a 100 hit), max 60%. Enemy / boss armor (`armor`) is already a percent.
const defPct = b => Math.min(60, (b.armor || 0) + (b.def || 0) / DEF_DIV);
const LVL_MAX = 50, PTS_PER_LVL = 3, CRIT_BASE = 5, CRITDMG_BASE = 150;   // base crit chance 5%, a crit hit deals 150% damage
const XP_NEED_MUL = 6;   // XP needed per level is multiplied by this (3 = levelling takes 3 times as much XP)
const xpNeed = L => (40 + 12 * L) * XP_NEED_MUL;   // XP needed to go from level L to L+1
const XP_MULT = .5;   // every XP reward (matches + Adventure stages) is multiplied by this: .5 = half the XP. Change it to rebalance levelling.
const charStats = (lvl, g, wmul = 1, wlvl = 0) => {   // g = totals from gear {hp, def, dmg, xdmg, vit, agi, dex, luk, crt, cdm}  (dmg = all gear Damage incl. the weapon, xdmg = Damage from non-weapon gear = the flat bonus added to hits)
  const pts = lvl * PTS_PER_LVL, vit = Math.round(pts + (g.vit || 0)), agi = Math.round(pts + (g.agi || 0)), dex = Math.round(pts + (g.dex || 0)), luk = Math.round(pts + (g.luk || 0)), r1 = n => Math.round(n * 10) / 10;
  return { lvl, vit, agi, dex, luk, hp: Math.round((g.hp || 0) + vit * VIT_HP + dex * DEX_HP), def: r1((g.def || 0) + dex * DEX_DEF), dmg: r1((g.dmg || 0) + agi * AGI_DMG), xdmg: r1((g.xdmg || 0) + agi * AGI_DMG), crt: r1(CRIT_BASE + (g.crt || 0) + luk * LUK_CRT), cdm: r1(CRITDMG_BASE + (g.cdm || 0) + agi * AGI_CDM), wmul, wlvl };
};
// ---- POWER: one number for how strong your robot is (shown in Profile, compared with the boss on the Adventure map) ----
// More health, defense, attack, crits and a better upgraded weapon all raise it. A fresh level 1 robot is about 145.
const POWER_BASE_HP = 100, POWER_BASE_DMG = 30;   // 30 = about the damage of a typical weapon: +30 flat Damage on top doubles your hits
const powerOf = b => { const crt = Math.min(100, b.crt != null ? b.crt : CRIT_BASE) / 100, cd = (b.cdm != null ? b.cdm : CRITDMG_BASE) / 100; return Math.round(100 * (1 + (b.hp || 0) / POWER_BASE_HP) / (1 - defPct(b) / 100) * (1 + (b.xdmg || 0) / POWER_BASE_DMG) * (1 + ((b.wmul || 1) - 1) * .5) * (1 + crt * (cd - 1))); };
const statsAt = (it, lvl = 0) => { const o = {}; for (const s in it.stats) { const v = it.stats[s]; o[s] = v > 0 ? (s === 'heal' ? Math.round(v * (1 + healBonus(lvl))) : Math.round(v * (1 + upBonus(lvl)) * 10) / 10) : v; } return o; };   // negative stats (heavy armor) stay as they are
const fmtN = n => Number.isInteger(n) ? String(n) : n.toFixed(1);

const Stones = {   // 5 kinds of upgrade stones (STONE_TYPES): Adventure loot cards, Blue Stones after matches, or buy them with chips
  get(t = 1) { return store.get(stoneKey(t), 0) | 0; },
  add(n, t = 1) { store.set(stoneKey(t), Math.max(0, this.get(t) + (n | 0))); this.refresh(); },
  spend(n, t = 1) { if (this.get(t) < n) return false; store.set(stoneKey(t), this.get(t) - n); this.refresh(); return true; },
  inner() { return STONE_TYPES.map((s, i) => (i === 0 || this.get(i + 1) > 0) ? `<img src="${s.img}" alt="" draggable="false" title="${s.n}"><b class="stoneval">${this.get(i + 1).toLocaleString()}</b>` : '').join(''); },
  badge() { return `<span class="chipbal stonebal" title="Upgrade stones">${this.inner()}</span>`; },
  refresh() { document.querySelectorAll('.stonebal').forEach(e => e.innerHTML = this.inner()); },
};

const Profile = {
  data: null, sel: null, tab: 'equip', filter: 'all', msg: null, stoneSel: 1, mode: 'main', pickSel: 0, pickKind: 'first', after: null,   // sel = selected item id; filter = inventory tab; mode = 'main' | 'pick' (character select)
  load() {
    const raw = store.get('profile', null), d = raw || {};
    const fresh = !Array.isArray(d.owned) && !d.lootV;   // brand-new save: start with 4 basic items, buy or win the rest
    this.data = { char: d.char | 0, owned: Array.isArray(d.owned) ? d.owned : fresh ? ['h_cap', 'r_bolt', 'a_cloth', 's_sandal'] : ITEMS.map(i => i.id), eq: d.eq && typeof d.eq === 'object' ? d.eq : {}, lootV: d.lootV | 0, up: d.up && typeof d.up === 'object' ? d.up : {}, picked: !!d.picked, lvl: clamp(d.lvl | 0 || 1, 1, LVL_MAX), xp: Math.max(0, d.xp | 0), stock: d.stock && typeof d.stock === 'object' ? d.stock : {}, qty: d.qty && typeof d.qty === 'object' ? d.qty : {} };
    if (LOOT_LOCK) {
      if (!this.data.lootV && fresh) { this.data.lootV = 1; }
      else if (!this.data.lootV) {   // first run with loot: you start with the common items (plus anything you wear); the rest is won from Adventure loot cards
        const keep = new Set(ITEMS.filter(i => i.rar === 'common').map(i => i.id));
        for (const rid in this.data.eq) for (const k in this.data.eq[rid]) keep.add(this.data.eq[rid][k]);
        this.data.owned = ITEMS.map(i => i.id).filter(id => keep.has(id)); this.data.lootV = 1;
      }
    } else for (const id of ITEMS.map(i => i.id)) if (!this.data.owned.includes(id)) this.data.owned.push(id);   // loot lock off: every item is yours
    this.data.char = clamp(this.data.char, 0, Assets.robots.robots.length - 1);
    this.splitStacks(); this.ensureWeapon(); this.save();
    return this.data;
  },
  save() { store.set('profile', this.data); },
  level() { return this.data ? clamp(this.data.lvl | 0 || 1, 1, LVL_MAX) : 1; },
  addXp(n) {   // returns { gained, ups, lvl }; stops at LVL_MAX
    if (!this.data) this.load(); const D = this.data; D.lvl = this.level(); if (D.lvl >= LVL_MAX) return { gained: 0, ups: 0, lvl: D.lvl };
    n = Math.max(1, Math.round(n * XP_MULT));
    D.xp = (D.xp | 0) + n; let ups = 0; while (D.lvl < LVL_MAX && D.xp >= xpNeed(D.lvl)) { D.xp -= xpNeed(D.lvl); D.lvl++; ups++; }
    if (D.lvl >= LVL_MAX) D.xp = 0; this.save(); return { gained: n, ups, lvl: D.lvl };
  },
  xpText(r) { return r.gained ? ` · +${r.gained} XP` + (r.ups ? ` · LEVEL UP! Lv ${r.lvl}` : '') : ''; },
  charId() { return Assets.robots.robots[this.data.char].id; },
  ensureWeapon() {   // you always own and wear your robot's own signature weapon
    const w = weaponItemFor(this.charId()); if (!w) return;
    for (const rid in this.data.eq) if (rid !== this.charId() && this.data.eq[rid].weapon) delete this.data.eq[rid].weapon;
    if (!this.data.owned.includes(w.id)) this.data.owned.push(w.id);
    const eq = this.eqOf(this.charId()), cur = eq.weapon && itemById(eq.weapon);
    if (!(cur && (cur.shop || cur.sig) && this.data.owned.includes(cur.id))) eq.weapon = w.id;   // keep a worn Shop / signature weapon you own, otherwise wear your own signature weapon
  },
  splitStacks() {   // old saves kept "x2" counters in qty: turn every spare into its own item (+0), so gear never stacks
    const D = this.data; if (!D.qty) { D.qty = {}; return; }
    for (const id in D.qty) { const n = D.qty[id] | 0; if (!itemById(id)) continue; for (let i = 0; i < n; i++) D.owned.push(this.newInstId(id)); }
    D.qty = {};
  },
  newInstId(id) { const b = baseId(id), D = this.data; let n = 2; while (D.owned.includes(b + '#' + n)) n++; return b + '#' + n; },
  copies(id) { if (!this.data) this.load(); const b = baseId(id); return this.data.owned.filter(x => baseId(x) === b).length; },   // how many separate copies of this kind of item you own
  hasBase(id) { if (!this.data) this.load(); const b = baseId(id); return this.data.owned.some(x => baseId(x) === b); },
  addCopy(id) { const D = this.data || this.load(), b = baseId(id); if (!D.owned.includes(b)) D.owned.push(b); else D.owned.push(this.newInstId(b)); },   // bought / looted: the first one is the item itself, every next one is a NEW separate item (+0, own slot)
  sellValue(it) { return it && !it.potion && it.type !== 'mat' ? Math.floor(itemPrice(it) * 0.25) : 0; },   // you get 25% of the Shop price
  sellItem(id) {   // sells THIS copy; returns the chips you got (0 = could not sell)
    const D = this.data || this.load(), it = itemById(id), v = this.sellValue(it); if (!it || v <= 0 || !D.owned.includes(id)) return 0;
    const D2 = D; if (it.sig && this.copies(id) <= 1) { D2.sigSold = D2.sigSold || {}; if (D2.sigSold[baseId(id)]) return 0; D2.sigSold[baseId(id)] = 1; }   // your signature weapon CAN be sold, even the last copy: the game gives you a free replacement, but only ONCE (no chip farming)
    D.owned = D.owned.filter(x => x !== id); if (D.up) delete D.up[id];
    for (const rid in D.eq) for (const k in D.eq[rid]) if (D.eq[rid][k] === id) delete D.eq[rid][k];
    Wallet.add(v); this.ensureWeapon(); this.save(); return v;
  },
  sellAsk: null,
  sellBtn(it) {
    const v = this.sellValue(it); if (this.sellAsk && this.sellAsk !== it.id) this.sellAsk = null;
    const last = this.copies(it.id) <= 1; if (v <= 0 || (last && it.sig && this.data.sigSold && this.data.sigSold[baseId(it.id)])) return '';
    const ask = this.sellAsk === it.id;
    return `<button class="btn sm ${ask ? '' : 'alt'}" data-act="sell">${ask ? 'Tap again: sell for ' : 'Sell for '}${v.toLocaleString()} chips${last ? ' (last copy)' : ''}</button>`;
  },
  doSell() {
    const id = this.sel, it = id && itemById(id); if (!it) return;
    if (this.copies(id) <= 1 && this.sellAsk !== id) { this.sellAsk = id; Snd.play('beep'); return; }   // selling your LAST copy asks for a second tap
    this.sellAsk = null; const v = this.sellItem(id);
    if (v) { Snd.play('win'); this.msg = `Sold ${it.name} for ${v.toLocaleString()} chips.`; if (!this.data.owned.includes(id)) this.sel = null; } else Snd.play('dud');
  },
  stockOf(id) { if (!this.data) this.load(); return clamp((this.data.stock && this.data.stock[id]) | 0, 0, POTION_MAX); },   // Heal / Team Heal you carry (max POTION_MAX each)
  addStock(id, n) { if (!this.data) this.load(); this.data.stock = this.data.stock || {}; this.data.stock[id] = clamp(this.stockOf(id) + n, 0, POTION_MAX); this.save(); },
  lvl(id) { return Math.min(UP_MAX, this.data.up[id] | 0); },
  eqOf(id) { return this.data.eq[id] || (this.data.eq[id] = {}); },
  wornBy(itemId) { for (const rid in this.data.eq) for (const k in this.data.eq[rid]) if (this.data.eq[rid][k] === itemId) return { rid, slot: k }; return null; },
  bonuses(robotIdx) {   // totals used in battle: gear (upgrade levels included) + character level. wmul = damage multiplier of the signature weapon
    const rid = Assets.robots.robots[robotIdx].id, eq = this.data.eq[rid] || {}, g = { hp: 0, def: 0, dmg: 0, xdmg: 0, vit: 0, agi: 0, dex: 0, luk: 0, crt: 0, cdm: 0 }; let wmul = 1, wlvl = 0, wid = null, hid = null, heal = 0, hammo = 0, wbon = 0, wing = null, neck = 0;
    for (const k in eq) { const it = itemById(eq[k]); if (!it) continue; const st = statsAt(it, this.lvl(it.id)); if (it.type === 'wings') wing = baseId(it.id); if (it.type === 'necklace') { neck = (it.stats.nhp || 0) / 100; continue; } if (it.type === 'heal') { hid = baseId(it.id); heal = st.heal || 0; hammo = healThrows(this.lvl(it.id)); } if (it.type === 'weapon') { wlvl = this.lvl(it.id); wmul = 1 + upBonus(wlvl); wid = baseId(it.id); wbon = (WEAPON_DMG_BONUS[it.rar] || 0) * wmul; } for (const s in st) if (s in g) g[s] += st[s]; if (it.type !== 'weapon' && st.dmg) g.xdmg += st.dmg; }
    g.xdmg += wbon;   // the rarity Damage bonus sits on the weapon: it is added to every hit and grows with the weapon's upgrade level
    const out = charStats(this.level(), g, wmul, wlvl); out.neck = neck; if (neck) out.hp += Math.round((POWER_BASE_HP + out.hp) * neck);   // NECKLACE: +% of the TOTAL health (100 base + gear + attributes), added last
    out.wid = wid; out.wing = wing; out.hid = hid; out.heal = heal; out.hammo = hammo; out.pots = POTION_ITEMS.map(it => ({ id: it.id, img: it.img, name: it.name, kind: it.potion, pct: it.pct, uses: this.stockOf(it.id) })); return out;   // wid = the weapon item you wear (battle uses it)
  },
  equip(itemId, slotKey) {
    const it = itemById(itemId); if (!it) return;
    if (it.type === 'weapon') {   // weapon slot: your signature weapon or any Shop weapon you own
      if (!(it.shop || it.sig) || !this.data.owned.includes(itemId)) return;   // any Shop weapon or signature weapon you own
      const ow = this.wornBy(itemId); if (ow) delete this.data.eq[ow.rid][ow.slot];
      this.eqOf(this.charId()).weapon = itemId; this.save(); return;
    }
    let slot = SLOTS.find(s => s.key === slotKey && s.type === it.type);
    if (!slot) { const opts = SLOTS.filter(s => s.type === it.type); const eq = this.eqOf(this.charId()); slot = opts.find(s => !eq[s.key]) || opts[0]; }   // rings: first free ring slot
    const w = this.wornBy(itemId); if (w) delete this.data.eq[w.rid][w.slot];   // an item can only be on one robot
    this.eqOf(this.charId())[slot.key] = itemId; this.save();
  },
  unequip(itemId) { const it = itemById(itemId); if (it && it.type === 'weapon' && it.sig === this.charId() && !it.base) return; const w = this.wornBy(itemId); if (w) { delete this.data.eq[w.rid][w.slot]; if (it && it.type === 'weapon') this.ensureWeapon(); this.save(); } },   // taking off a Shop weapon puts your signature weapon back
  upgrade(id) {
    const it = itemById(id), L = this.lvl(id); if (!it || it.potion || L >= UP_MAX || !this.data.owned.includes(id)) return;
    const cost = UP_COST[L], st = this.stoneSel || 1, sn = STONE_TYPES[st - 1].n;
    if (!Stones.spend(cost, st)) { Snd.play('dud'); this.msg = { ok: false, t: `Not enough ${sn}s. You need ${cost}.` }; return; }
    if (Math.random() * 100 < upRate(L, st)) { this.data.up[id] = L + 1; Snd.play('win'); this.msg = { ok: true, t: `Success! ${it.name} is now +${L + 1}.` }; }
    else { Snd.play('dud'); this.msg = { ok: false, t: `Failed. The stones crumbled and ${it.name} stays at +${L}.` }; }
    this.save();
  },
  buyStones(n) {
    const st = this.stoneSel || 1, S = STONE_TYPES[st - 1], price = S.price * n;
    if (!Wallet.spend(price)) { Snd.play('dud'); this.msg = { ok: false, t: `You need ${price.toLocaleString()} chips for ${n} ${S.n}${n > 1 ? 's' : ''}.` }; return; }
    Stones.add(n, st); Snd.play('pick'); this.msg = { ok: true, t: `Bought ${n} ${S.n}${n > 1 ? 's' : ''}.` };
  },
  imgOf(it) { if (it.type !== 'weapon' || !this.data) return it.img; const t = wtier(this.lvl(it.id)); return t ? it.img.replace('.png', '_t' + t + '.png') : it.img; },   // weapon picture changes at +10, +11, +12
  itemTile(it, extra = '', lvl = 0) {
    const r = RARITY[it.rar]; return `<div class="pf-it${it.img ? ' hasimg' : ''}" style="--rc:${r.color}">${it.img ? `<img src="${this.imgOf(it)}" alt="" draggable="false">` : ''}<b>${it.name}</b><i>${it.potion ? '' : r.name}</i>${lvl ? `<u class="lv">+${lvl}</u>` : ''}${extra}</div>`;
  },
  statText(stats) {   // every item shows its Defense: the item's own Defense + what its Dexterity gives (dex x DEX_DEF), and how much damage that blocks
    const st = Object.assign({}, stats), defTot = Math.round(((st.def || 0) + (st.dex || 0) * DEX_DEF) * 10) / 10; delete st.def;
    const row = s => `<span class="${st[s] < 0 ? 'neg' : 'pos'}">${st[s] > 0 ? '+' : ''}${fmtN(st[s])}${STAT_LABEL[s][1]} ${STAT_LABEL[s][0]}</span>`;
    return Object.keys(st).map(row).join('') + (('def' in stats || 'dex' in stats) ? `<span class="pos">+${fmtN(defTot)} Defense (${(defTot / DEF_DIV).toFixed(1)}% blocked)</span>` : '');
  },
  // ---------- New Game: choose your ONE robot ----------
  openPick(kind, after) { this.load(); this.mode = 'pick'; this.pickKind = kind; this.after = after || null; this.pickSel = this.data.char; this.render(); UI.show('profile'); },
  newGame(k) {   // wipes the profile (items, upgrades, chips, stones) and starts over with robot k and its own weapon
    const rid = Assets.robots.robots[k].id, w = weaponItemFor(rid);
    this.data = { char: k, owned: ['h_cap', 'r_bolt', 'a_cloth', 's_sandal', w.id], eq: { [rid]: { weapon: w.id } }, lootV: 1, up: {}, picked: true, lvl: 1, xp: 0, stock: {}, qty: {} };
    store.set('chips', 0); for (let t = 1; t <= 5; t++) store.set(stoneKey(t), 0); for (let t = 1; t <= 3; t++) store.set('amu' + t, 0); store.set('sup1', 0); Stones.add(5); Wallet.refresh(); this.save();
  },
  choose(k) {
    if (this.pickKind === 'new') this.newGame(k);
    else { this.data.char = k; this.data.picked = true; this.ensureWeapon(); if (!store.get('stones', 0)) Stones.add(5); this.save(); }
    UI.setup.teams[0].robot = k; store.set('setup', UI.setup);
    this.mode = 'main'; this.sel = null; this.msg = null; Snd.play('win');
    const a = this.after; this.after = null; UI.show('title'); if (a && $(a)) $(a).click();   // carry on to what you clicked
  },
  renderPick(root) {
    const R = Assets.robots.robots, D = this.data, k = this.pickSel, isNew = this.pickKind === 'new';
    const cards = R.map((r, i) => { const w = weaponItemFor(r.id); return `<div class="cs-card${i === k ? ' on' : ''}" data-pick="${i}" style="--tc:${r.color}"><div class="cs-pt">${frontSVG(r.id)}</div><b>${r.name}</b><span class="cs-w"><img src="${w.img}" alt="" draggable="false">${w.name}</span></div>`; }).join('');
    const w = weaponItemFor(R[k].id);
    root.innerHTML = `<div class="panel pf pfpick"><div class="pf-top"><h2>${isNew ? 'New Game' : 'Choose your robot'}</h2><button class="btn alt sm" id="bPfBack">Back</button></div>
      <p class="dim cs-note">Pick the ONE robot you will play with. ${isNew ? '<b class="neg">Starting a new game resets your items, upgrades, chips and stones.</b>' : 'You can only use this robot in your profile.'} It starts with its own weapon (unlimited shots, small damage) that you can upgrade with stones.</p>
      <div class="cs-grid">${cards}</div>
      <div class="cs-bar"><div class="cs-sel"><b>${R[k].name}</b> · ${w.name}: ${fmtN(w.stats.dmg)} damage</div><button class="btn" id="bPfOk">${isNew ? 'Start new game' : 'Play as'} ${R[k].name}</button></div></div>`;
    $('bPfBack').onclick = () => { this.mode = 'main'; this.after = null; UI.show('title'); };
    $('bPfOk').onclick = () => this.choose(k);
    root.querySelectorAll('[data-pick]').forEach(e => e.onclick = () => { this.pickSel = +e.dataset.pick; Snd.play('beep'); this.render(); });
  },
  render() {
    const root = $('profile'); if (this.mode === 'pick') { this.renderPick(root); return; }
    const D = this.data, R = Assets.robots.robots, rob = R[D.char], eq = this.eqOf(rob.id);
    const worn = new Set(Object.values(this.data.eq).flatMap(o => Object.values(o)));
    const selIt = this.sel ? itemById(this.sel) : null;
    const tot = this.bonuses(D.char), lv = this.level(), xpN = lv >= LVL_MAX ? 0 : xpNeed(lv), xpPct = lv >= LVL_MAX ? 100 : Math.round((D.xp | 0) / xpN * 100);
    const wIt = itemById(eq.weapon), wL = wIt ? this.lvl(wIt.id) : 0, wDmg = wIt ? fmtN(statsAt(wIt, wL).dmg) : '-';
    const slotHTML = key => {
      const s = SLOTS.find(x => x.key === key), id = eq[key], it = id && itemById(id), ok = selIt && selIt.type === s.type && s.type !== 'weapon';
      return `<div class="pf-slot g-${key}${ok ? ' can' : ''}${it && it.id === this.sel ? ' sel' : ''}" data-slot="${key}"><small>${s.label}</small>${it ? this.itemTile(it, '', this.lvl(it.id)) : '<span class="pf-empty">empty</span>'}</div>`;
    };
    const RK = { legendary: 0, epic: 1, rare: 2, common: 3 }, allOwned = D.owned.map(itemById).filter(Boolean);
    const owned = allOwned.filter(it => this.filter === 'all' || it.type === this.filter).map((it, k) => ({ it, k: allOwned.findIndex(o => baseId(o.id) === baseId(it.id)) * 1000 + k })).sort((a, b) => (a.it.type === 'weapon' ? -1 : 0) - (b.it.type === 'weapon' ? -1 : 0) || RK[a.it.rar] - RK[b.it.rar] || a.k - b.k).map(o => o.it);
    const total = Math.max(INV_CELLS, Math.ceil(owned.length / 4) * 4);
    const TABS = [['all', 'All'], ['weapon', 'Weapon'], ['helmet', 'Helmets'], ['ring', 'Rings'], ['armor', 'Armor'], ['shoes', 'Shoes'], ['heal', 'Heal'], ['wings', 'Wings'], ['necklace', 'Necklace'], ['glove', 'Gloves']];
    const tabs = TABS.map(t => `<button class="pf-tab${this.filter === t[0] ? ' on' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('');
    let cells = ''; for (let i = 0; i < total; i++) {
      const it = owned[i]; cells += it ? `<div class="pf-cell${it.id === this.sel ? ' sel' : ''}" data-item="${it.id}">${this.itemTile(it, (worn.has(it.id) ? '<em>E</em>' : ''), this.lvl(it.id))}</div>` : '<div class="pf-cell off"></div>';
    }
    // Items tab: Heal potions + stones + amulets + guardian scroll (nothing here can be worn)
    const cnt = n => n >= 100000 ? Math.round(n / 1000) + 'k' : n >= 10000 ? (n / 1000).toFixed(1) + 'k' : n.toLocaleString();
    const mats = [...POTION_ITEMS.map(it => ({ it, n: this.stockOf(it.id) })), ...MAT_ITEMS.map(it => ({ it, n: Mats.get(it) }))].filter(o => o.n > 0);
    const itotal = Math.max(INV_CELLS, Math.ceil(mats.length / 4) * 4); let icells = '';
    for (let i = 0; i < itotal; i++) { const o = mats[i]; icells += o ? `<div class="pf-cell${o.it.id === this.sel ? ' sel' : ''}" data-item="${o.it.id}">${this.itemTile(o.it, `<s class="cnt">×${cnt(o.n)}</s>`)}</div>` : '<div class="pf-cell off"></div>'; }
    // right column: details of the selected item (upgrading is done in the Forge)
    let side = '';   // the description of the tapped item pops up over the Profile (no more column on the right)
    if (selIt && selIt.type === 'mat') {
      const n = Mats.get(selIt);
      side = `<div class="pf-det" style="--rc:${selIt.col}"><img class="big" src="${selIt.img}" alt="" draggable="false"><h3>${selIt.name} <i>${selIt.tag}</i></h3><div class="st"><span class="pos">${selIt.line}</span></div><p class="dim">${selIt.desc}</p><p class="dim">You have <b>${n.toLocaleString()}</b>. Buy more in the Shop.</p><div class="row"><button class="btn sm" data-act="forge">Open Forge</button></div></div>`;
    } else if (selIt && selIt.potion) {
      side = `<div class="pf-det" style="--rc:${RARITY[selIt.rar].color}"><img class="big" src="${selIt.img}" alt="" draggable="false"><h3>${selIt.name} <i>Battle item</i></h3><p class="dim">${selIt.desc}</p><p class="dim">You carry <b>${this.stockOf(selIt.id)}/${POTION_MAX}</b>.</p></div>`;
    } else if (selIt) {
      const L = this.lvl(selIt.id), w = this.wornBy(selIt.id), me = w && w.rid === rob.id, by = w && !me ? R.find(r => r.id === w.rid).name : '';
      const now = statsAt(selIt, L);
      const btns = (selIt.type === 'weapon' && me && selIt.sig === rob.id && !selIt.base ? '' : me ? '<button class="btn sm alt" data-act="un">Unequip</button>' : `<button class="btn sm" data-act="eq">Equip on ${rob.name}</button>`) + (selIt.noUp ? '' : '<button class="btn sm alt" data-act="forge">Forge</button>') + this.sellBtn(selIt);
      side = `<div class="pf-det" style="--rc:${RARITY[selIt.rar].color}">${selIt.img ? `<img class="big" src="${this.imgOf(selIt)}" alt="" draggable="false">` : ''}<h3>${selIt.name}${L ? ` <u class="lvl">+${L}</u>` : ''} <i>${RARITY[selIt.rar].name} ${selIt.type}</i></h3><div class="st">${selIt.type === 'necklace' ? `<span class="pos">+${selIt.stats.nhp}% of total Health</span><span class="neg">Cannot be upgraded</span>` : this.statText(now)}${selIt.type === 'heal' ? `<span class="pos">${healThrows(L)} throws per match</span>` : ''}</div><p class="dim">${selIt.desc}${by ? ' (worn by ' + by + ' — equipping moves it here)' : ''}</p><div class="row">${btns}</div></div>`;
    }
    const inv = this.tab === 'items'
      ? `<div class="pf-cells">${icells}</div>`
      : `<div class="pf-tabs">${tabs}</div><div class="pf-cells">${cells}</div>`;
    const forgeBtn = `<button class="pf-forge" id="pfHammer" title="Forge: upgrade your items"><img src="assets/forge_anvil.png" alt="" draggable="false"><b>FORGE</b></button>`;
    root.innerHTML = `<div class="panel pf"><div class="pf-top"><h2>Profile</h2><button class="btn alt sm" id="bPfBack">Back</button></div>
      ${forgeBtn}
      <div class="pf-main">
        <div class="pf-eq"><div class="pf-name">${rob.name}<small>Lv ${lv} · weapon ${wDmg} dmg${wL ? ' (+' + wL + ')' : ''}</small><span class="pf-pw">Power: <b>${powerOf(tot)}</b></span></div>
          <div class="pf-grid">${slotHTML('helmet')}${slotHTML('armor')}${slotHTML('shoes')}<div class="pf-port g-port">${frontSVG(rob.id)}</div>${slotHTML('ring1')}${slotHTML('ring2')}${slotHTML('weapon')}${slotHTML('heal')}${slotHTML('wings')}${slotHTML('neck')}${slotHTML('glove')}</div>
          <div class="pf-tot pf-char"><div class="pf-lv"><b>Level ${lv}${lv >= LVL_MAX ? ' (MAX)' : ''}</b><span>${lv >= LVL_MAX ? '' : (D.xp | 0) + ' / ' + xpN + ' XP'}</span></div><div class="pf-xpbar"><i style="width:${xpPct}%"></i></div>
            <small>Attributes (+${PTS_PER_LVL} each level, gear included)</small><div class="pf-at"><span>Vitality <b>${tot.vit}</b></span><span>Agility <b>${tot.agi}</b></span><span>Dexterity <b>${tot.dex}</b></span><span>Luck <b>${tot.luk}</b></span></div>
            <small>Stats</small><div class="pf-at"><span>Health <b>${100 + tot.hp}</b></span><span>Damage <b>${fmtN(tot.dmg)}</b></span><span>Defense <b>${tot.def}</b> <small>(${defPct(tot).toFixed(1)}% blocked)</small></span><span>Crit Damage <b>${tot.cdm}%</b></span><span>Crit Chance <b>${tot.crt}%</b></span></div></div></div>
        <div class="pf-inv"><div class="pf-itabs"><button class="pf-itab${this.tab === 'equip' ? ' on' : ''}" data-itab="equip">Equipment <span>${owned.length}/${allOwned.length}</span></button><button class="pf-itab${this.tab === 'items' ? ' on' : ''}" data-itab="items">Items <span>${mats.length}</span></button></div>${inv}<div class="pf-foot">${Wallet.badge()}</div></div>
        ${side ? `<div class="pf-pop"><div class="pf-popc">${side}<button class="btn sm alt" id="pfClose">Close</button></div></div>` : ''}
      </div></div>`;
    $('bPfBack').onclick = () => { this.msg = null; UI.show('title'); };
    const pfc = $('pfClose'); if (pfc) pfc.onclick = () => { this.sel = null; this.render(); };
    $('pfHammer').onclick = () => { Snd.play('beep'); Forge.open(selIt && selIt.type !== 'mat' && !selIt.potion && !selIt.noUp ? selIt.id : null); };
    root.querySelectorAll('[data-itab]').forEach(e => e.onclick = () => { this.tab = e.dataset.itab; this.sel = null; this.render(); });
    root.querySelectorAll('[data-tab]').forEach(e => e.onclick = () => { this.filter = e.dataset.tab; this.render(); });
    // inventory cells: tap = select, double-tap = equip, drag onto a slot = equip (all handled by initDrag below)
    root.querySelectorAll('[data-slot]').forEach(e => e.onclick = () => {
      const key = e.dataset.slot, cur = eq[key], s = SLOTS.find(x => x.key === key);
      if (selIt && selIt.type === s.type && s.type !== 'weapon' && cur !== selIt.id) { this.equip(selIt.id, key); }
      else if (cur) { this.sel = this.sel === cur ? null : cur; this.tab = 'equip'; this.msg = null; }
      this.render();
    });
    root.querySelectorAll('[data-act]').forEach(e => e.onclick = () => { const a = e.dataset.act; if (a === 'sell') { this.doSell(); this.render(); return; } if (a === 'forge') { Forge.open(selIt && selIt.type !== 'mat' ? selIt.id : null); return; } if (a === 'eq') this.equip(this.sel); else if (a === 'un') this.unequip(this.sel); this.render(); });
  },
  open() { this.load(); this.mode = 'main'; this.sel = null; this.msg = null; this.render(); UI.show('profile'); },
  // ---- inventory: tap = select, double-tap = equip in its own slot, drag onto a slot = equip there (one set of listeners; the screen is re-drawn often) ----
  initDrag() {
    const root = $('profile'); let st = null, last = { id: '', t: 0 };
    const slotAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.pf-slot,.pf-port') : null; };
    const clear = () => { if (st) { clearTimeout(st.hold); if (st.ghost) st.ghost.remove(); } root.querySelectorAll('.drop,.hot').forEach(e => e.classList.remove('drop', 'hot')); st = null; };
    const place = () => { if (st && st.ghost) { st.ghost.style.left = st.cx + 'px'; st.ghost.style.top = st.cy + 'px'; } };
    const begin = () => {
      const it = itemById(st.id); if (!it || !st.can) return;
      st.drag = true; st.ghost = document.createElement('div'); st.ghost.className = 'pf-ghost'; st.ghost.innerHTML = it.img ? `<img src="${this.imgOf(it)}" alt="">` : it.name; document.body.appendChild(st.ghost); place();
      root.querySelectorAll('.pf-slot').forEach(s => { const d = SLOTS.find(x => x.key === s.dataset.slot); if (d && d.type === it.type) s.classList.add('drop'); });   // light up the slots that fit
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
    };
    root.addEventListener('pointerdown', e => {
      if (this.mode !== 'main' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const cell = e.target.closest('.pf-inv .pf-cell[data-item]'); if (!cell) return; const it = itemById(cell.dataset.item); if (!it) return;
      clear(); st = { id: it.id, x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, pid: e.pointerId, drag: false, moved: false, can: SLOTS.some(s => s.type === it.type), touch: e.pointerType !== 'mouse' };
      if (st.can && st.touch) st.hold = setTimeout(() => { if (st && !st.moved) begin(); }, 260);   // finger: press and hold a moment, then drag (so scrolling the list still works)
    });
    window.addEventListener('pointermove', e => {
      if (!st || e.pointerId !== st.pid) return; st.cx = e.clientX; st.cy = e.clientY;
      if (!st.drag) {
        const dx = e.clientX - st.x, dy = e.clientY - st.y; if (Math.hypot(dx, dy) < 9) return;
        st.moved = true; clearTimeout(st.hold);
        if (st.can && (!st.touch || Math.abs(dx) >= Math.abs(dy) * .7)) begin(); else return;   // a mostly-vertical finger swipe is a scroll
      }
      place(); const t = slotAt(e.clientX, e.clientY); root.querySelectorAll('.hot').forEach(x => x.classList.remove('hot')); if (t && t.classList.contains('drop')) t.classList.add('hot');
    });
    window.addEventListener('pointerup', e => {
      if (!st || e.pointerId !== st.pid) return; const s = st; clear(); if (!Profile.data) return;
      if (s.drag) {   // dropped: on its own slot = equip there, on the robot = equip in its designated slot, anywhere else = nothing
        const it = itemById(s.id), t = slotAt(e.clientX, e.clientY); let ok = false, key;
        if (t && t.classList.contains('pf-port')) ok = true;
        else if (t) { const d = SLOTS.find(x => x.key === t.dataset.slot); if (d && d.type === it.type) { ok = true; key = d.key; } }
        if (ok) { this.equip(it.id, key); this.sel = null; Snd.play('pick'); } else if (t) Snd.play('dud');
        this.msg = null; this.render(); return;
      }
      if (s.moved) return;
      const now = performance.now();
      if (last.id === s.id && now - last.t < 380) {   // double-tap: equip in the designated slot (rings take the free ring slot)
        last = { id: '', t: 0 }; const w = this.wornBy(s.id);
        if (s.can && !(w && w.rid === this.charId())) { this.equip(s.id); Snd.play('pick'); }
        this.sel = s.id;
      } else { last = { id: s.id, t: now }; this.sel = this.sel === s.id ? null : s.id; }
      this.msg = null; this.render();
    });
    window.addEventListener('pointercancel', () => clear());
    root.addEventListener('touchmove', e => { if (st && st.drag && e.cancelable) e.preventDefault(); }, { passive: false });   // no list scrolling while an item is being dragged
    root.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.pf-cell')) e.preventDefault(); });
  },
};
function profileBonuses(robotIdx) { if (!Profile.data) Profile.load(); return Profile.bonuses(robotIdx); }


// ===== CHIPS + SHOP =====
// Chips are the money of the game: earned after every match and every Adventure stage, spent in the Shop.
// Price of an item = its rarity band, placed inside the band by how strong its stats are (more stats = more expensive).
const PRICE_BAND = { common: [300, 600], rare: [700, 1400], epic: [1500, 3000], legendary: [3100, 6200] };
const STAT_VALUE = { hp: 1, def: 2.2, dmg: 3, agi: 1.8, vit: 1.2, dex: 1.4, luk: 1.6, crt: 3, cdm: 1.5 };
const ITEM_PRICE = (() => {
  const score = it => Object.keys(it.stats).reduce((a, k) => a + (STAT_VALUE[k] || 1) * it.stats[k], 0), out = {};
  for (const r in PRICE_BAND) {
    const L = ITEMS.filter(i => i.rar === r), sc = L.map(score), lo = Math.min(...sc), hi = Math.max(...sc), [a, b] = PRICE_BAND[r];
    L.forEach((it, k) => { const t = hi > lo ? (sc[k] - lo) / (hi - lo) : 0; out[it.id] = Math.round((a + (b - a) * t) / 10) * 10; });
  }
  return out;
})();
(() => {   // Shop gear prices: same rarity bands as the other gear, placed by how strong each piece is
  const score = it => Object.keys(it.stats).reduce((a, k) => a + (STAT_VALUE[k] || 1) * it.stats[k], 0);
  for (const r in PRICE_BAND) {
    const L = SHOP_GEAR_ITEMS.filter(i => i.rar === r), sc = L.map(score), lo = Math.min(...sc), hi = Math.max(...sc), [a, b] = PRICE_BAND[r];
    L.forEach((it, k) => { const t = hi > lo ? (sc[k] - lo) / (hi - lo) : 0; ITEM_PRICE[it.id] = Math.round((a + (b - a) * t) / 10) * 10; });
  }
})();
(() => {   // Shop weapon prices: 1.5x the item bands, placed by weapon damage
  for (const r in PRICE_BAND) {
    const L = SHOP_WEAPON_ITEMS.filter(i => i.rar === r && i.id !== 'w_shuriken' && i.id !== 'w_tempest_arc' && i.id !== 'w_doom_axe'), sc = L.map(i => { const w = WEAPONS.find(x => x.shop === i.id); return (i.baseDmg != null ? i.baseDmg : i.stats.dmg) * (w.volley ? w.volley.count : 1) * (w.cluster || w.proj.freeze || w.proj.homing ? 1.3 : 1); }), lo = Math.min(...sc), hi = Math.max(...sc), [a, b] = PRICE_BAND[r];
    L.forEach((it, k) => { const t = hi > lo ? (sc[k] - lo) / (hi - lo) : 0; ITEM_PRICE[it.id] = Math.round((a + (b - a) * t) * 1.5 / 10) * 10; });
  }
})();
(() => {   // signature weapons in the Shop: common band x1.5, placed by damage (existing Shop prices are untouched)
  const sc = WEAPON_ITEMS.map(i => i.baseDmg), lo = Math.min(...sc), hi = Math.max(...sc), [a, b] = PRICE_BAND.common;
  WEAPON_ITEMS.forEach((it, k) => { const t = hi > lo ? (sc[k] - lo) / (hi - lo) : 0; ITEM_PRICE[it.id] = Math.round((a + (b - a) * t) * 1.5 / 10) * 10; });
})();
ITEM_PRICE['w_tempest_arc'] = 7000;   // Tempest Arc (Shop only, legendary)
ITEM_PRICE['w_doom_axe'] = 6800;   // Doom Axe (Shop + strong boss loot, legendary)
ITEM_PRICE['w_shuriken'] = 7500;   // Shuriken (Shop only, legendary)
ITEM_PRICE['w_titan_cannon'] = 6500;   // Titan Cannon (Shop only, legendary)
ITEM_PRICE['heal_divine'] = 6000;
ITEM_PRICE['wings_common'] = 600; ITEM_PRICE['wings_rare'] = 1400; ITEM_PRICE['wings_epic'] = 3000; ITEM_PRICE['wings_legend'] = 6200;   // Wings: top of each rarity band (they carry three stats)
ITEM_PRICE['neck_1'] = 800; ITEM_PRICE['neck_2'] = 2000; ITEM_PRICE['neck_3'] = 4200; ITEM_PRICE['neck_4'] = 7500; ITEM_PRICE['neck_5'] = 12000;   // Necklaces (+10..50% total health)
ITEM_PRICE['pot_heal'] = 300; ITEM_PRICE['pot_team'] = 600;   // Heal / Team Heal: cheap, because they are used up   // Divine Heal (legendary band)
(() => {   // Gloves: same rarity bands x1.5 (they carry Damage + 4 attributes), placed by how strong each pair is
  const score = it => Object.keys(it.stats).reduce((a, k) => a + (STAT_VALUE[k] || 1) * it.stats[k], 0);
  for (const r in PRICE_BAND) {
    const L = GLOVE_ITEMS.filter(i => i.rar === r), sc = L.map(score), lo = Math.min(...sc), hi = Math.max(...sc), [a, b] = PRICE_BAND[r];
    L.forEach((it, k) => { const t = hi > lo ? (sc[k] - lo) / (hi - lo) : 0; ITEM_PRICE[it.id] = Math.round((a + (b - a) * t) * 1.5 / 10) * 10; });
  }
})();
const itemPrice = it => ITEM_PRICE[it.base || it.id] || 0;   // extra copies have ids like "r_ring#2": price them by their base item so they can be sold too
const Wallet = {
  get() { return store.get('chips', 0) | 0; },
  add(n) { store.set('chips', Math.max(0, this.get() + (n | 0))); this.refresh(); },
  spend(n) { if (this.get() < n) return false; store.set('chips', this.get() - n); this.refresh(); return true; },
  badge() { return `<span class="chipbal"><img src="assets/chip.png" alt="" draggable="false"><b class="chipval">${this.get().toLocaleString()}</b></span>`; },
  refresh() { document.querySelectorAll('.chipval').forEach(e => e.textContent = this.get().toLocaleString()); },
};
const Shop = {
  type: 'all', rar: 'all', sel: null, msg: '',
  open() { Profile.data || Profile.load(); this.msg = ''; this.render(); UI.show('shop'); },
  render() {
    const root = $('shop'), D = Profile.data || Profile.load(), own = new Set(D.owned.map(baseId)), chips = Wallet.get();
    const RK = { item: -1, common: 0, rare: 1, epic: 2, legendary: 3 };
    const list = [...ITEMS, ...SHOP_GEAR_ITEMS, ...WEAPON_ITEMS, ...SHOP_WEAPON_ITEMS, ...HEAL_ITEMS, ...WING_ITEMS, ...NECK_ITEMS, ...GLOVE_ITEMS, ...POTION_ITEMS, ...MAT_ITEMS].filter(i => (this.type === 'all' || i.type === this.type) && (this.rar === 'all' || i.rar === this.rar)).sort((a, b) => RK[a.rar] - RK[b.rar] || itemPrice(a) - itemPrice(b));
    const TY = [['all', 'All'], ['weapon', 'Weapons'], ['helmet', 'Helmets'], ['ring', 'Rings'], ['armor', 'Armor'], ['shoes', 'Shoes'], ['heal', 'Heal'], ['wings', 'Wings'], ['necklace', 'Necklaces'], ['glove', 'Gloves'], ['potion', 'Items'], ['mat', 'Stones & Scrolls']], RA = [['all', 'Any rarity'], ['common', 'Common'], ['rare', 'Rare'], ['epic', 'Epic'], ['legendary', 'Legendary']];
    const tabs = (arr, cur, key) => arr.map(t => `<button class="pf-tab${cur === t[0] ? ' on' : ''}" data-${key}="${t[0]}">${t[1]}</button>`).join('');
    const cells = list.map(it => `<div class="pf-cell sp${it.id === this.sel ? ' sel' : ''}" data-item="${it.id}">${Profile.itemTile(it, !it.potion && it.type !== 'mat' && own.has(it.id) ? `<s class="cnt">×${Profile.copies(it.id)}</s>` : '')}<u class="pr">${it.type === 'mat' ? `×${fmtK(Mats.get(it))} · <img src="assets/chip.png" alt="">${itemPrice(it).toLocaleString()}` : it.potion ? `${Profile.stockOf(it.id)}/${POTION_MAX} · <img src="assets/chip.png" alt="">${itemPrice(it).toLocaleString()}` : `<img src="assets/chip.png" alt="">${itemPrice(it).toLocaleString()}`}</u></div>`).join('');
    const it = this.sel && itemById(this.sel); let det = '<div class="pf-det"><p class="dim">Tap an item to see its stats, then buy it with chips. Win chips in every match and every Adventure stage.</p></div>';
    if (it) {
      const isMat = it.type === 'mat', pr = itemPrice(it), stk = it.potion ? Profile.stockOf(it.id) : 0, has = it.potion ? stk >= POTION_MAX : false, can = chips >= pr;
      det = `<div class="pf-det" style="--rc:${RARITY[it.rar].color}">${it.img ? `<img class="big" src="${it.img}" alt="" draggable="false">` : ''}<h3>${it.name} <i>${isMat ? it.tag : it.potion ? 'Battle item' : RARITY[it.rar].name + ' ' + it.type}</i></h3><div class="st">${isMat ? `<span class="pos">${it.line}</span>` : it.potion ? `<span class="pos">Heals ${Math.round(it.pct * 100)}% of max health${it.potion === 'team' ? ' · whole team' : ''}</span>` : Profile.statText(it.stats)}</div><p class="dim">${it.desc}</p>${it.potion ? `<p class="dim">You carry <b>${stk}/${POTION_MAX}</b>. You can buy again any time, up to ${POTION_MAX}.</p>` : ''}` +
        (isMat ? `<p class="dim">You have <b>${Mats.get(it).toLocaleString()}</b>. Use it in the Forge (Forge anvil in Profile).</p><div class="row">${[1, 10, 100].map(n => `<button class="btn sm" data-buy="${n}"${chips >= pr * n ? '' : ' disabled'}><img class="cb" src="assets/chip.png" alt="">${(pr * n).toLocaleString()} · ×${n}</button>`).join('')}</div>${chips < pr ? `<p class="dim">You need ${(pr - chips).toLocaleString()} more chips.</p>` : ''}${this.msg ? `<p class="shopmsg">${this.msg}</p>` : ''}</div>` : `<div class="row">${has ? `<button class="btn sm alt" disabled>${it.potion ? 'Full ' + stk + '/' + POTION_MAX : 'Owned'}</button>` : `<button class="btn sm" data-buy="1"${can ? '' : ' disabled'}><img class="cb" src="assets/chip.png" alt="">${pr.toLocaleString()} · Buy</button>`}</div>${!has && !can ? `<p class="dim">You need ${(pr - chips).toLocaleString()} more chips.</p>` : ''}${this.msg ? `<p class="shopmsg">${this.msg}</p>` : ''}</div>`);
    }
    root.innerHTML = `<div class="panel pf shop"><div class="pf-top"><h2>Shop</h2>${Wallet.badge()}<button class="btn alt sm" id="bShopBack">Back</button></div>
      <div class="pf-tabs">${tabs(TY, this.type, 'ty')}</div><div class="pf-tabs">${tabs(RA, this.rar, 'ra')}</div>
      <div class="shop-body"><div class="pf-cells shop-cells">${cells || '<p class="dim">Nothing here.</p>'}</div><div class="shop-det">${det}</div></div></div>`;
    $('bShopBack').onclick = () => UI.show('title');
    root.querySelectorAll('[data-ty]').forEach(e => e.onclick = () => { this.type = e.dataset.ty; this.render(); });
    root.querySelectorAll('[data-ra]').forEach(e => e.onclick = () => { this.rar = e.dataset.ra; this.render(); });
    root.querySelectorAll('[data-item]').forEach(e => e.onclick = () => { this.sel = e.dataset.item; this.msg = ''; this.render(); });
    root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => this.buy(+b.dataset.buy || 1));
  },
  buy(n = 1) {
    const it = itemById(this.sel), D = Profile.data; if (!it) return;
    if (it.type === 'mat') {   // stones / amulets / guardian scroll: buy as many as you like
      const price = itemPrice(it) * n; if (!Wallet.spend(price)) { Snd.play('dud'); return; }
      Mats.add(it, n); Snd.play('win'); this.msg = `Bought ${n} ${it.name}${n > 1 ? 's' : ''}! You have ${Mats.get(it).toLocaleString()}.`; this.render(); return;
    }
    if (it.potion) {   // Heal / Team Heal: buy any time, carry max POTION_MAX of each
      if (Profile.stockOf(it.id) >= POTION_MAX) { Snd.play('dud'); this.msg = `You already carry ${POTION_MAX} ${it.name}.`; this.render(); return; }
      if (!Wallet.spend(itemPrice(it))) { Snd.play('dud'); return; }
      Profile.addStock(it.id, 1); Snd.play('win'); this.msg = `Bought ${it.name}! You carry ${Profile.stockOf(it.id)}/${POTION_MAX}.`; this.render(); return;
    }
    if (!Wallet.spend(itemPrice(it))) { Snd.play('dud'); return; }
    Profile.addCopy(it.id); Profile.save(); Snd.play('win'); this.msg = `Bought ${it.name}! You own ×${Profile.copies(it.id)}. Equip or sell it in Profile.`; this.render();
  },
};

// ---- look (kept here so the feature is one file) ----
(function () {
  const css = document.createElement('style'); css.textContent = `
.pf-top{display:flex;align-items:center;gap:10px;margin-bottom:4px}.pf-top h2{margin:0}.pf-top .btn{margin-left:auto}
.pf-tabs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px}.pf-tab{border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--dim);border-radius:8px;padding:4px 10px;font:700 12px var(--body);cursor:pointer}.pf-tab.on{color:#1a0f00;background:var(--accent);border-color:var(--accent)}
.pf-ih{display:flex;justify-content:space-between;color:var(--dim);margin-bottom:5px}.pf-ih b{font-family:var(--disp);font-weight:400;color:var(--ink)}
.pf-it{position:relative;width:100%;border-radius:9px;background:rgba(10,16,34,.7);border:2px solid var(--rc);padding:5px 4px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;text-align:center;line-height:1.1}
.pf-it b{font-size:13px;color:#fff;font-weight:700}.pf-it i{font:600 10px var(--body);color:var(--rc);text-transform:uppercase;letter-spacing:1px;font-style:normal;margin-top:2px}
.pf-it img{width:48px;height:48px;margin:-2px auto 1px;display:block;pointer-events:none}.pf-it.hasimg b{font-size:12px}
.pf-it em{position:absolute;top:-6px;right:-6px;background:var(--accent);color:#1a0f00;border-radius:50%;width:17px;height:17px;font:800 11px/17px var(--body);font-style:normal;text-align:center}
.pf-it .lv{position:absolute;top:-6px;left:-4px;background:#2d6fd0;color:#fff;border:1px solid #9fdcff;border-radius:8px;padding:0 5px;font:800 11px/15px var(--body);text-decoration:none}
.pf-cells{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px;max-height:300px;overflow-y:auto;padding:6px 4px 2px}
.pf-cell{min-height:84px;border-radius:10px;background:rgba(255,255,255,.04);border:2px solid transparent;display:flex;cursor:pointer;box-sizing:border-box}.pf-cell.off{border:2px dashed rgba(255,255,255,.08);cursor:default}
.pf-cell.sel{border-color:var(--accent2);background:rgba(255,176,74,.14)}.pf-cell .pf-it{border-width:1px}
.pf-det{margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid var(--rc,var(--line));background:rgba(255,255,255,.04);overflow:hidden}.pf-det .big{float:left;width:68px;height:68px;margin:0 10px 4px 0}
.pf-det h3{margin:0 0 4px;font-family:var(--disp);font-weight:400;font-size:18px}.pf-det h3 i{font:600 12px var(--body);color:var(--rc);text-transform:uppercase;letter-spacing:1px;margin-left:6px;font-style:normal}
.pf-det .st{display:flex;gap:10px;flex-wrap:wrap;font-weight:700}.pos{color:#8dff9e}.neg{color:#ff8f7a}.dim{color:var(--dim);margin:6px 0;font-size:14px}.pf-det .row{justify-content:flex-start}
.chipbal{display:inline-flex;align-items:center;gap:6px;background:rgba(10,16,34,.8);border:1px solid rgba(255,200,60,.6);border-radius:20px;padding:2px 12px 2px 4px;font:700 18px var(--body);color:#ffe08a}.chipbal img{width:26px;height:26px}
.chipbal.stonebal{border-color:rgba(120,200,255,.7);color:#bfe6ff}
.pf-ih{align-items:center;gap:8px;flex-wrap:wrap}.pf-ih .stonebal{flex-wrap:wrap;font-size:13px;padding:1px 8px 1px 3px;gap:4px}.pf-ih .stonebal img{width:20px;height:20px}
#title .balrow{position:fixed;top:12px;right:14px;z-index:5;display:flex;gap:8px}
#shop .shop{max-width:min(96vw,980px);padding:12px 16px}
.shop-body{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}.shop-cells{flex:2 1 380px;max-height:min(52vh,430px);grid-template-columns:repeat(auto-fill,minmax(96px,1fr))}.shop-det{flex:1 1 250px;min-width:230px}
.pf-cell.sp{flex-direction:column;min-height:0;padding-bottom:3px}.pf-cell.sp .pf-it{flex:1}.pf-cell.owned{opacity:.55}
.pr{display:flex;align-items:center;justify-content:center;gap:3px;text-decoration:none;font:800 13px var(--body);color:#ffe08a;margin-top:2px}.pr img{width:16px;height:16px}
.btn .cb{width:20px;height:20px;vertical-align:-4px;margin-right:6px}.shopmsg{color:var(--good);font-weight:700;margin:6px 0 0}

/* ===== PROFILE: compact 3-column layout that fits a landscape screen without scrolling ===== */
#profile{padding:6px 10px;gap:0}
#profile .pf{--u:clamp(52px,13.5vh,82px);max-width:min(98vw,1060px);height:min(calc(100vh - 12px),580px);max-height:calc(100dvh - 12px);display:flex;flex-direction:column;padding:8px 12px;overflow:hidden}
#profile .pf-top h2{font-size:19px}#profile .pf-top .btn.sm{padding:5px 14px;font-size:14px}#profile .chipbal{font-size:15px;padding:1px 10px 1px 3px}#profile .chipbal img{width:22px;height:22px}
#profile .pf-main{flex:1;min-height:0;display:grid;grid-template-columns:auto minmax(0,1fr) minmax(200px,285px);gap:12px}
#profile .pf-eq,#profile .pf-inv,#profile .pf-side{min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}
#profile .pf-inv{display:flex;flex-direction:column;min-width:0}
#profile .pf-cells{flex:1;min-height:0;max-height:none;grid-template-columns:repeat(auto-fill,minmax(calc(var(--u)*1.05),1fr));grid-auto-rows:calc(var(--u)*1.08);gap:6px;align-content:start}
#profile .pf-cell{min-height:0}
#profile .pf-name{font-family:var(--disp);font-size:16px;color:var(--accent2);margin-bottom:4px}.pf-name small{display:block;font:600 11px var(--body);letter-spacing:1.2px;color:var(--dim);text-transform:uppercase}
#profile .pf-grid{display:grid;grid-template-columns:repeat(3,var(--u));grid-auto-rows:var(--u);gap:6px}
.pf-port{border-radius:12px;background:rgba(255,255,255,.05);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;padding:3px;box-sizing:border-box}.pf-port svg{width:100%;height:100%}
.pf-slot{position:relative;border-radius:12px;border:2px dashed var(--line);background:rgba(255,255,255,.04);padding:12px 3px 3px;box-sizing:border-box;cursor:pointer;display:flex;align-items:stretch}
.pf-slot>small{position:absolute;top:1px;left:0;right:0;text-align:center;font:700 9px var(--body);letter-spacing:.4px;color:var(--dim);text-transform:uppercase}
.pf-slot.can{border-color:var(--accent);background:rgba(255,176,74,.12)}.pf-slot.sel{border-style:solid;border-color:var(--accent2)}
.pf-empty{margin:auto;color:rgba(255,255,255,.25);font-size:12px}
#profile .pf-it{padding:3px 2px;border-width:1px;height:100%;min-height:0;justify-content:center;overflow:visible}
#profile .pf-it img{width:calc(var(--u)*.52);height:calc(var(--u)*.52);margin:0 auto}
#profile .pf-it b{font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;max-width:100%}
#profile .pf-it i{display:none}
#profile .pf-it .lv{top:-5px;left:-3px;font-size:10px;line-height:13px;padding:0 4px}
#profile .pf-slot .pf-it b{font-size:9px}
.pf-tot{margin-top:8px;padding:6px 8px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.04);font-size:13px;max-width:calc(var(--u)*3 + 12px)}.pf-tot small{display:block;color:var(--dim);letter-spacing:1.2px;text-transform:uppercase;font-size:10px}
#profile .pf-tabs{margin-bottom:5px;flex:0 0 auto}#profile .pf-tab{padding:3px 8px;font-size:11px}
#profile .pf-ih{flex:0 0 auto;margin-bottom:3px;font-size:13px}
#profile .pf-det{margin-top:0;padding:7px 9px}#profile .pf-det .big{width:54px;height:54px;margin-right:8px}
#profile .pf-det h3{font-size:15px}.lvl{color:#9fdcff;text-decoration:none;font-family:var(--body);font-weight:800}
#profile .pf-det .st{gap:8px;font-size:13px}#profile .dim{font-size:12px;margin:4px 0}
#profile .pf-det .row{margin-top:2px}
.pf-up{margin-top:8px;padding:7px 9px;border-radius:12px;border:1px solid rgba(120,200,255,.45);background:rgba(40,80,150,.14);font-size:13px}
.pf-uh{display:flex;justify-content:space-between;align-items:center}.pf-uh b{font-family:var(--disp);font-weight:400;color:#bfe6ff;font-size:14px}.pf-uh span{color:#9fdcff;font-weight:800}
.pips{display:grid;grid-template-columns:repeat(12,1fr);gap:2px;margin:5px 0}.pips i{height:7px;border-radius:2px;background:rgba(255,255,255,.14)}.pips i.on{background:linear-gradient(#9fdcff,#2d8bff);box-shadow:0 0 5px rgba(79,168,255,.8)}
.pf-up .nx{display:flex;flex-direction:column;gap:1px;font-weight:700;margin-bottom:3px}
.pf-up .rate{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}.pf-up .rate b{color:#ffe08a}.pf-up .cost{display:inline-flex;align-items:center;gap:3px;font-weight:800;color:#bfe6ff}.pf-up .cost img{width:20px;height:20px}.pf-up .cost small{color:var(--dim);font-weight:600;font-size:11px}
.pf-up .btn.up{width:100%;background:linear-gradient(#6cc0ff,#2d6fd0);color:#04132b;box-shadow:0 4px 0 #123a78,0 6px 14px rgba(0,0,0,.35)}.pf-up .btn[disabled]{opacity:.45;cursor:not-allowed;filter:grayscale(.5)}
.pf-up .maxed{margin:6px 0;text-align:center;font:400 16px var(--disp);color:#ffd24a;letter-spacing:2px}
.pf-up .buy{display:flex;align-items:center;gap:6px;margin-top:7px;flex-wrap:wrap}.pf-up .buy small{color:var(--dim);flex:1 0 100%}.pf-up .buy .btn{padding:3px 9px;font-size:12px;display:inline-flex;align-items:center;gap:3px}.pf-up .buy img{width:15px;height:15px}
.pf-char{max-width:calc(var(--u)*3 + 12px)}.pf-lv{display:flex;justify-content:space-between;align-items:baseline;font-size:13px}.pf-lv b{font:400 17px var(--disp);color:#ffe08a}.pf-lv span{color:var(--dim);font-size:12px}
.pf-xpbar{height:7px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden;margin:3px 0 6px}.pf-xpbar i{display:block;height:100%;background:linear-gradient(90deg,#4da3ff,#9fdcff)}
.pf-at{display:grid;grid-template-columns:1fr 1fr;gap:1px 8px;font-size:12px;color:var(--dim);margin-bottom:4px}.pf-at b{color:#fff;float:right}
.pf-pw{display:inline-block;margin-top:3px;font:800 15px var(--body);color:#ffe08a;letter-spacing:.5px}.pf-pw b{font-size:18px;color:#fff}
.stsel{display:flex;gap:4px;margin:6px 0}.stb{flex:1;display:flex;flex-direction:column;align-items:center;gap:0;padding:3px 2px;border-radius:9px;border:2px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;cursor:pointer;font:700 12px var(--body)}.stb img{width:26px;height:26px}.stb small{font-size:10px;color:var(--dim)}.stb.on{border-color:var(--sc);background:color-mix(in srgb,var(--sc) 22%,transparent);box-shadow:0 0 10px color-mix(in srgb,var(--sc) 55%,transparent)}.stb.on small{color:#fff}
.upmsg{margin:6px 0 0;font-weight:700;font-size:13px}.upmsg.ok{color:#8dff9e}.upmsg.bad{color:#ff8f7a}
#profile .btn.sm{padding:4px 12px;font-size:13px;box-shadow:0 3px 0 #a44a00}#profile .btn.alt.sm{box-shadow:0 3px 0 #121a30}#profile .pf-up .btn.up{box-shadow:0 3px 0 #123a78}
/* character select */
#profile .pfpick{--u:auto}
.cs-note{margin:2px 0 6px;font-size:13px}
.cs-grid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(2,1fr);gap:8px}
.cs-card{min-height:0;border-radius:12px;border:2px solid var(--line);background:rgba(255,255,255,.04);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px;box-sizing:border-box;text-align:center}
.cs-card.on{border-color:var(--tc);background:rgba(255,255,255,.12);box-shadow:0 0 14px color-mix(in srgb,var(--tc) 50%,transparent)}
.cs-pt{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center}.cs-pt svg{height:100%;max-height:90px;width:auto;max-width:100%}
.cs-card b{font-family:var(--disp);font-weight:400;font-size:13px;white-space:nowrap}.cs-w{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--dim)}.cs-w img{width:30px;height:30px;object-fit:contain}
.cs-bar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px}.cs-sel{font-size:15px}.cs-sel b{color:var(--accent2)}
@media (max-width:620px){#profile .pf-main{grid-template-columns:auto minmax(0,1fr)}#profile .pf-side{grid-column:1/-1}#profile .pf{height:auto;max-height:none}#profile{overflow:auto}}

/* ===== PROFILE v2: equipment around the robot, Equipment / Items tabs, chips under the grid, hammer = Forge ===== */
#profile .pf-grid{grid-template-columns:repeat(4,var(--u));position:relative}
.g-helmet{grid-area:1/1}.g-armor{grid-area:2/1}.g-shoes{grid-area:3/1}.g-ring1{grid-area:1/4}.g-ring2{grid-area:2/4}.g-weapon{grid-area:4/2}.g-heal{grid-area:4/3}.g-wings{grid-area:3/4}.g-neck{grid-area:4/4}.g-glove{grid-area:4/1}.g-port{grid-area:1/2/4/4}
#profile .pf-grid>div:not(.pf-slot):not(.pf-port){display:none}
.pf-port{position:relative;background:radial-gradient(circle at 50% 45%,rgba(120,110,255,.22),rgba(255,255,255,.04) 70%)}
/* Forge button: your anvil picture, in the free cell next to the Angelic Arm slot, with a soft glow so it is easy to notice */
#profile .pf{position:relative}
.pf-forge{position:absolute;z-index:3;top:3px;width:calc(var(--u)*1.12);height:calc(var(--u)*1.12);left:calc(12px + var(--u)*4 + 18px - var(--u)*1.12);border-radius:14px;border:2px solid #ffb04a;background:radial-gradient(circle at 50% 40%,rgba(255,140,40,.35),rgba(30,16,8,.85));box-shadow:0 0 12px rgba(255,150,50,.55),0 3px 0 #5a2a00;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;padding:2px 2px 1px;box-sizing:border-box;animation:pfforge 2s ease-in-out infinite;-webkit-tap-highlight-color:transparent}
.pf-forge img{width:78%;flex:1 1 0;min-height:0;object-fit:contain;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))}
.pf-forge b{font:400 9px var(--disp);letter-spacing:.5px;color:#ffd98a;text-shadow:0 1px 2px #000;line-height:1.1}
.pf-forge:active{transform:translateY(2px);box-shadow:0 0 12px rgba(255,150,50,.55),0 1px 0 #5a2a00}
@keyframes pfforge{0%,100%{box-shadow:0 0 8px rgba(255,150,50,.4),0 3px 0 #5a2a00}50%{box-shadow:0 0 20px rgba(255,170,70,.95),0 3px 0 #5a2a00}}
/* drag and drop: slots that accept the dragged item light up */
.pf-cell[data-item]{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.pf-inv .pf-cell[data-item]{touch-action:pan-y}
.pf-slot.drop{border-style:solid;border-color:#5fe7ff;box-shadow:0 0 0 2px rgba(95,231,255,.35),0 0 14px rgba(95,231,255,.8)}
.pf-slot.hot{background:rgba(95,231,255,.3);transform:scale(1.07)}
.pf-ghost{position:fixed;width:58px;height:58px;margin:-29px 0 0 -29px;pointer-events:none;z-index:9999;filter:drop-shadow(0 6px 10px rgba(0,0,0,.7));opacity:.95;display:flex;align-items:center;justify-content:center;text-align:center;font:700 10px var(--body);color:#fff}
.pf-ghost img{width:100%;height:100%;object-fit:contain}
.pf-itabs{display:flex;gap:5px;margin-bottom:5px;flex:0 0 auto}.pf-itab{flex:1;white-space:nowrap;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--dim);border-radius:9px 9px 0 0;padding:5px 8px;font:400 13px var(--disp);letter-spacing:.5px;cursor:pointer}
.pf-itab span{font:700 11px var(--body);margin-left:4px;opacity:.8}
#profile .pf{--u:clamp(44px,12.2vh,80px)}.pf-itab.on{color:#1a0f00;background:var(--accent);border-color:var(--accent)}
.pf-foot{flex:0 0 auto;display:flex;justify-content:flex-end;margin-top:5px;padding-top:4px;border-top:1px solid var(--line)}
.pf-it .cnt,.pf-cell .cnt{position:absolute;right:-3px;top:-5px;background:rgba(10,12,40,.95);border:1px solid rgba(150,170,255,.7);color:#cfe6ff;border-radius:8px;padding:0 5px;font:800 10px/14px var(--body);text-decoration:none;white-space:nowrap}
#profile .pf-char,#profile .pf-tot{max-width:calc(var(--u)*4 + 18px)}
#profile .pf-main{grid-template-columns:auto minmax(0,1fr) minmax(180px,235px)}
/* FIX: the Equipment / Items tabs were wider than the inventory column (the Items tab lost its right edge), the item grid had a half row cut off at the bottom and the badges touched the edge */
#profile .pf-itabs{gap:4px;min-width:0}
#profile .pf-itab{flex:1 1 0;min-width:0;padding:2px 4px;font-size:12px;letter-spacing:0;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}
#profile .pf-itab:first-child{flex:1.5 1 0}
#profile .pf-itab span{margin-left:3px;font-size:10px}
#profile .pf-cells{padding:7px 7px 4px;box-sizing:border-box}
/* ===== PROFILE v3 (landscape): the description column on the right is gone - tapping an item pops its description up; the stats sit BELOW the character (scroll the left column down to see them), one per line ===== */
#profile .pf-main{grid-template-columns:auto minmax(0,1fr)}
#profile .pf-at{grid-template-columns:1fr;gap:1px 0}
#profile .pf-at span{display:block}
#profile .pf-pop{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;pointer-events:none}
#profile .pf-popc{pointer-events:auto;width:min(78%,370px);max-height:88%;overflow:auto;box-sizing:border-box;padding:8px;border-radius:14px;background:rgba(14,20,46,.97);border:2px solid var(--accent);box-shadow:0 10px 30px rgba(0,0,0,.65);display:flex;flex-direction:column;gap:6px}
#profile .pf-popc .pf-det{margin:0}
#profile .pf-popc>.btn{align-self:flex-end}
/* inventory laid out like the Shop: big tiles (picture, name, rarity), the filter tabs on ONE row you can swipe sideways, the list scrolls up / down */
#profile .pf-tabs{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;gap:4px;-webkit-overflow-scrolling:touch}
#profile .pf-tabs::-webkit-scrollbar{display:none}
#profile .pf-tab{flex:0 0 auto;white-space:nowrap;padding:3px 9px;font-size:11px}
#profile .pf-cells{grid-template-columns:repeat(auto-fill,minmax(clamp(88px,13vw,112px),1fr));grid-auto-rows:clamp(92px,28vh,118px);gap:7px}
#profile .pf-cells .pf-it{padding:4px 3px}
#profile .pf-cells .pf-it img{width:clamp(30px,10vh,46px);height:clamp(30px,10vh,46px);margin:0 auto 2px}
#profile .pf-cells .pf-it b{font-size:11px}
#profile .pf-cells .pf-it i{display:block;font-size:9px}
`; document.head.appendChild(css);
  // FIX: show only WHOLE rows of item cells in the Profile inventory (the cell height is stretched a little so the last visible row is never cut off; scroll for more)
  Profile.fitCells = function () {
    const c = document.querySelector('#profile .pf-cells'); if (!c) return;
    c.style.gridAutoRows = ''; const cs = getComputedStyle(c);
    const gap = parseFloat(cs.rowGap) || 6, base = parseFloat(cs.gridAutoRows), h = c.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    if (!(base > 10) || h < base) return;
    const n = Math.max(1, Math.round((h + gap) / (base + gap)));
    c.style.gridAutoRows = ((h - gap * (n - 1)) / n).toFixed(2) + 'px';
  };
  const _pr = Profile.render; Profile.render = function () { const r = _pr.apply(this, arguments); requestAnimationFrame(() => Profile.fitCells()); return r; };
  addEventListener('resize', () => setTimeout(() => Profile.fitCells(), 60));
  Profile.initDrag();
  $('bProfile').onclick = () => { Snd.init(); Snd.play('beep'); Profile.open(); };
  // Shop screen and the Shop / New Game buttons are added from here so no other file needs them (the title screen no longer shows chips / stones: chips are in Profile, stones in Shop + Profile inventory)
  const sc = document.createElement('div'); sc.id = 'shop'; sc.className = 'scr'; sc.hidden = true; $('app').appendChild(sc);
  const sb = document.createElement('button'); sb.className = 'btn alt'; sb.id = 'bShop'; sb.textContent = 'Shop'; $('bProfile').insertAdjacentElement('beforebegin', sb);
  sb.onclick = () => { Snd.init(); Snd.play('beep'); Shop.open(); };
  const nb = document.createElement('button'); nb.className = 'btn alt'; nb.id = 'bNew'; nb.textContent = 'New Game'; $('bHow').insertAdjacentElement('beforebegin', nb);
  nb.onclick = () => { Snd.init(); Snd.play('beep'); Profile.openPick('new'); };
  // Until you have chosen your ONE robot, Play / Adventure / Profile / Shop first send you to the robot select screen
  $('title').addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#bPlay,#bAdv,#bProfile,#bShop'); if (!b) return;
    const d = Profile.data || Profile.load(); if (d.picked) return;
    e.stopPropagation(); e.preventDefault(); Snd.init(); Profile.openPick('first', b.id);
  }, true);
})();

/* ===== LANDSCAPE FIT: Play (match setup), Adventure and Shop are laid out for a wide phone screen so they fit without scrolling =====
   Sizes use vh / vw so they shrink on short screens. Edit the clamp(...) numbers to make things bigger or smaller. */
(function () {
  const css = document.createElement('style'); css.textContent = `
@media (orientation:landscape){
/* ---- PLAY: match setup. Options in one row, maps in one strip, teams side by side, buttons at the bottom ---- */
#setup{justify-content:flex-start;gap:6px;padding:6px 10px;overflow:hidden}
#setup .panel{flex:1 1 auto;min-height:0;max-width:min(98vw,1100px);padding:6px 10px;display:flex;flex-direction:column;overflow:hidden}
#setup .panel h2{display:none}
#setup .opts{flex:0 0 auto;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px 12px;margin-bottom:4px}
#setup .opt label{font-size:10px;letter-spacing:1.5px;margin-bottom:2px}
#setup .seg button{font-size:clamp(11px,3.4vh,15px);padding:clamp(3px,1.2vh,7px) 3px}
#setup #sTheme button{font-size:clamp(10px,3vh,13px);padding:clamp(3px,1.2vh,7px) 2px}
#setup .mapopt{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:10px;align-items:baseline}
#setup .mapopt label{grid-area:1/1}
#setup #mapDesc{grid-area:1/2;margin:0;min-height:0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#setup #mapGrid{grid-area:2/1/3/3;gap:6px;padding:2px 1px 4px}
#setup .mapc{flex:0 0 clamp(78px,11vw,112px);padding:3px;font-size:10px}
#setup .mapc img,#setup .mapc .mq{aspect-ratio:168/50}
#setup .mapc .mq{font-size:20px}
#setup #teamRows{flex:1 1 auto;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;align-content:start}
#setup .team{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 8px;margin:0;padding:5px 7px}
#setup .team .nm{min-width:0;flex-wrap:nowrap;gap:6px;font-size:clamp(13px,4vh,17px);align-items:baseline}
#setup .team .nm .rn{flex:0 1 auto;margin:0;font-size:11px;letter-spacing:.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#setup .team .seg{min-width:0 !important;width:clamp(110px,16vw,150px)}
#setup .picks{grid-column:1/-1;display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px;min-width:0;flex:none}
#setup .pick{width:100%;height:auto;aspect-ratio:1/1;max-width:clamp(28px,9.5vh,46px);justify-self:center;padding:1px}
#setup>.row{flex:0 0 auto;gap:10px}
#setup>.row .btn{padding:clamp(5px,1.6vh,9px) 26px;font-size:clamp(14px,4vh,18px)}

/* ---- ADVENTURE: boss banner + rewards on the left, map arrows / difficulty / power / Play on the right ---- */
#adventure{justify-content:flex-start;padding:6px 10px;overflow:hidden}
#adventure .adv{height:calc(100vh - 12px);height:calc(100dvh - 12px);max-width:min(98vw,1100px);padding:6px 12px;display:grid;overflow:hidden;
  grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);grid-template-rows:auto auto auto minmax(0,1fr) auto;gap:5px 10px}
#adventure .adv>.adv-top{grid-area:1/1/2/3;margin:0}
#adventure .adv-top h2{font-size:18px}
#adventure .adv-top .btn.sm{padding:4px 14px;font-size:14px}
#adventure .adv>.adv-nav{grid-area:2/2;margin:0;gap:8px}
#adventure .adv-nav .btn.sm{padding:3px 12px;font-size:13px}
#adventure .adv>.adv-ban{grid-area:2/1/5/2;height:auto;min-height:0;margin:0}
#adventure .ban-name{font-size:clamp(20px,7vh,34px)}
#adventure .ban-tag{font-size:11px;padding:1px 18px 1px 8px}
#adventure .ban-txt{width:50%}
#adventure .ban-txt h3{font-size:clamp(13px,4vh,17px)}
#adventure .ban-txt p{font-size:clamp(10px,3vh,13px);-webkit-line-clamp:2}
#adventure .adv>.adv-diffs{grid-area:3/2;display:flex;flex-wrap:nowrap;gap:6px;margin:0;padding:5px 6px}
#adventure .adv-diff{flex:1 1 0;min-width:0;padding:3px 4px;font-size:clamp(11px,3.4vh,15px);letter-spacing:.5px}
#adventure .adv>.adv-pw{grid-area:4/2;margin:0;padding:4px 8px;overflow-y:auto;min-height:0}
#adventure .adv-pw .pw-n{font-size:12px}#adventure .adv-pw .pw-n b{font-size:15px}
#adventure .adv-pw .pw-bar{height:6px;margin:3px 0}
#adventure .adv-pw p{font-size:11px;line-height:1.2}
#adventure .adv>.adv-rw{grid-area:5/1;margin:0;padding:3px 6px}
#adventure .rw-list .dc{flex:0 0 clamp(38px,11vh,46px);height:clamp(38px,11vh,46px)}
#adventure .rw-a{height:clamp(32px,10vh,40px)}
#adventure .adv>.row:not(.adv-diffs){grid-area:5/2;margin:0}
#adventure .adv>.row:not(.adv-diffs) .btn{width:100%;padding:clamp(5px,1.6vh,9px) 12px;font-size:clamp(14px,4.4vh,19px)}

/* ---- SHOP: tabs in single scrolling rows, big item grid on the left, item details on the right ---- */
#shop{justify-content:flex-start;padding:6px 10px;overflow:hidden}
#shop .shop{height:calc(100vh - 12px);height:calc(100dvh - 12px);max-width:min(98vw,1100px);padding:6px 12px;display:flex;flex-direction:column;overflow:hidden}
#shop .pf-top{flex:0 0 auto;margin-bottom:3px}
#shop .pf-top h2{font-size:18px}
#shop .pf-top .btn{padding:4px 14px;font-size:14px}
#shop .pf-tabs{flex:0 0 auto;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;gap:4px;margin-bottom:3px}
#shop .pf-tabs::-webkit-scrollbar{display:none}
#shop .pf-tab{flex:0 0 auto;white-space:nowrap;padding:3px 9px;font-size:11px}
#shop .shop-body{flex:1 1 auto;min-height:0;flex-wrap:nowrap;align-items:stretch;gap:10px}
#shop .shop-cells{flex:1 1 auto;min-width:0;max-height:none;height:100%;grid-template-columns:repeat(auto-fill,minmax(clamp(84px,13vw,110px),1fr));grid-auto-rows:clamp(92px,28vh,118px);align-content:start}
#shop .shop-det{flex:0 0 clamp(210px,30vw,290px);min-width:0;max-height:100%;overflow-y:auto}
#shop .pf-it img{width:clamp(30px,10vh,46px);height:clamp(30px,10vh,46px)}
#shop .pf-it b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
#shop .pr{font-size:12px}
}
`; document.head.appendChild(css);
})();
