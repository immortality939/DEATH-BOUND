/* ONLINE VERSION of weapons.js - upload this file to GitHub (online game only).
   The offline app keeps using weapons.js. Edit the two files separately on purpose. */
'use strict';
// ===== SAME WEIGHT FOR EVERY WEAPON =====
// Change these 4 numbers and ALL weapons change together.
const WEAPON_G = 0.11;            // gravity pulling every projectile down (bigger = heavier, drops faster)
const CHARGE_SPEED = [3.5, 17];   // launch speed for min..full charge (all charged shots + throws)
const WEAPON_WIND = 0.5;          // how much wind pushes charged shots
const THROW_BOUNCE = 0.5;         // bounciness of thrown grenades/bombs
// type: burst | shot | timed | place | beam | arc | flame | melee
const WEAPONS = [
  { id: '01_Blaster_Pistol', name: 'Blaster Pistol', desc: '3 quick energy bolts', ammo: Infinity, type: 'burst', shots: 3, gap: 11, spread: .6, proj: { spr: 'proj_bolt_cyan', ss: .7, speed: 18, g: WEAPON_G, dmg: 11, blast: 16, hit: 'energy_hit', hs: .45, snd: 'blaster', knock: 1.4 } },
  { id: '02_Pump_Shotgun', name: 'Pump Shotgun', desc: '2 blasts of 6 pellets', ammo: 8, type: 'burst', shots: 2, gap: 34, pellets: 6, spread: 5.5, proj: { spr: 'proj_bullet', ss: .8, speed: 20, g: WEAPON_G, dmg: 7, blast: 10, hit: 'spark_hit', hs: .55, snd: 'shotgun', knock: .9 } },
  { id: '03_Assault_Rifle', name: 'Assault Rifle', desc: '6-round burst', ammo: 6, type: 'burst', shots: 6, gap: 5, spread: 1.8, proj: { spr: 'proj_bullet', ss: .8, speed: 23, g: WEAPON_G, dmg: 7, blast: 10, hit: 'spark_hit', hs: .55, snd: 'shot', knock: .9 } },
  { id: '04_Minigun', name: 'Minigun', desc: '26 rounds of lead', ammo: 3, type: 'burst', shots: 26, gap: 2, spread: 5.5, proj: { spr: 'proj_bullet', ss: .75, speed: 22, g: WEAPON_G, dmg: 4, blast: 8, hit: 'spark_hit', hs: .45, snd: 'shot', knock: .6 } },
  { id: '05_Sniper_Rifle', name: 'Sniper Rifle', desc: 'Pin-point hitscan, 48 dmg', ammo: 4, type: 'beam', range: 1700, dmg: 48, carve: 9, width: 3, c1: '#ffffff', c2: '#7fe0ff', hit: 'energy_hit', hs: .6, snd: 'rail', knock: 5, stop: true },
  { id: '06_Plasma_Rifle', name: 'Plasma Rifle', desc: 'Charged plasma ball', ammo: 6, type: 'shot', charge: true, proj: { spr: 'proj_plasma', ss: .9, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, dmg: 36, blast: 42, hit: 'plasma_hit', hs: 1.05, snd: 'plasma', knock: 6 } },
  { id: '07_Laser_Cannon', name: 'Laser Cannon', desc: 'Burns a tunnel through terrain', ammo: 3, type: 'beam', range: 600, dmg: 26, carve: 10, width: 14, c1: '#fff3d0', c2: '#ff7a1a', hit: 'explosion_small', hs: .8, snd: 'laser', knock: 5, stop: false },
  { id: '08_Railgun', name: 'Railgun', desc: 'Pierces everything in line', ammo: 3, type: 'beam', range: 2200, dmg: 38, carve: 5, width: 6, c1: '#ffffff', c2: '#35c8ff', hit: 'energy_hit', hs: .75, snd: 'rail', knock: 7, stop: false },
  { id: '09_Flamethrower', name: 'Flamethrower', desc: 'Short-range stream of fire', ammo: 4, type: 'flame', proj: { dmg: 1.3 } },
  { id: '10_Freeze_Ray', name: 'Freeze Ray', desc: 'Freezes victims for a turn', ammo: 4, type: 'shot', charge: false, proj: { spr: 'proj_ice', ss: .9, speed: 13, g: WEAPON_G, dmg: 6, blast: 46, hit: 'ice_hit', hs: 1.1, snd: 'freeze', knock: 2, freeze: true, carve: 0 } },
  { id: '11_Tesla_Gun', name: 'Tesla Gun', desc: 'Chain lightning, hits up to 3', ammo: 4, type: 'arc', range: 360, cone: 42, dmgs: [24, 16, 11] },
  { id: '12_Bazooka', name: 'Bazooka', desc: 'Classic rocket, wind-affected', ammo: 6, type: 'shot', charge: true, proj: { spr: 'proj_rocket', ss: .75, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, rot: true, dmg: 58, blast: 52, hit: 'explosion_big', hs: .85, snd: 'rocket', knock: 9, trail: true } },
  { id: '13_Homing_Missile_Pod', name: 'Homing Missile', desc: 'Flies like a rocket, locks on only when an enemy is close', ammo: 3, type: 'shot', charge: true, proj: { spr: 'proj_missile', ss: .75, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, rot: true, homing: true, homeRange: 170, dmg: 48, blast: 46, hit: 'explosion_big', hs: .78, snd: 'rocket', knock: 8, trail: true, life: 2400 } },
  { id: '14_Grenade_Launcher', name: 'Grenade Launcher', desc: 'Launches a grenade that explodes on impact, huge blast', ammo: 6, type: 'shot', charge: true, proj: { spr: 'grenade_shell', ss: 1, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, rot: true, dmg: 78, blast: 92, hit: 'explosion_big', hs: 1.5, snd: 'rocket', knock: 14, trail: true } },
  { id: '15_Frag_Grenade', name: 'Frag Grenade', desc: 'Thrown, 3s fuse', ammo: 6, type: 'timed', charge: true, proj: { spr: 'w:15_Frag_Grenade', ss: 1.15, speed: CHARGE_SPEED, g: WEAPON_G, bounce: THROW_BOUNCE, fuse: 180, dmg: 58, blast: 50, hit: 'explosion_big', hs: .8, snd: 'jump', knock: 9 } },
  { id: '16_Dynamite', name: 'Dynamite', desc: 'Drop it, run! 5s fuse, huge blast', ammo: 2, type: 'place', proj: { spr: 'w:16_Dynamite', ss: 1.15, g: WEAPON_G, bounce: .15, fuse: 300, dmg: 92, blast: 86, hit: 'explosion_big', hs: 1.3, snd: 'tick', knock: 12 } },
  { id: '17_Land_Mine', name: 'Land Mine', desc: 'Arms in 1.5s, blows when near', ammo: 4, type: 'place', mine: true, proj: { spr: 'w:17_Land_Mine', ss: 1.1, g: WEAPON_G, bounce: 0, dmg: 56, blast: 56, hit: 'explosion_big', hs: .85, snd: 'tick', knock: 10 } },
  { id: '18_Cluster_Bomb', name: 'Cluster Bomb', desc: 'Splits into 6 bomblets', ammo: 3, type: 'timed', charge: true, cluster: 6, proj: { spr: 'w:18_Cluster_Bomb', ss: 1.15, speed: CHARGE_SPEED, g: WEAPON_G, bounce: THROW_BOUNCE, fuse: 140, dmg: 60, blast: 66, hit: 'explosion_small', hs: 1, snd: 'jump', knock: 6, clusterSpread: 1.25, clusterSpd: [3, 8], miniFuse: [40, 90], miniImpact: true, bomblet: { dmg: 56, blast: 62 } } },
  { id: '19_Energy_Sword', name: 'Energy Sword', desc: 'Melee slash, 32 dmg', ammo: Infinity, type: 'melee', range: 70, dmg: 32, knock: 7, fx: 'slash_cyan', snd: 'slash', carve: 0 },
  { id: '20_Battle_Axe', name: 'Battle Axe', desc: 'Heavy melee, big knockback', ammo: 6, type: 'melee', range: 82, dmg: 44, knock: 12, fx: 'slash_orange', snd: 'axe', carve: 18 },
  { id: '21_Teleporter', name: 'Teleporter', desc: 'Tap the map to jump there', ammo: 3, type: 'teleport' },
  { id: '22_Banana_Bomb', name: 'Banana Bomb', desc: 'Splatters into exploding bananas', ammo: 3, type: 'timed', charge: true, cluster: 12, proj: { spr: 'w:22_Banana_Bomb', miniSpr: 'proj_banana_small', miniSs: .45, ss: .62, speed: CHARGE_SPEED, g: WEAPON_G, bounce: THROW_BOUNCE, fuse: 170, dmg: 52, blast: 62, hit: 'explosion_small', hs: 1, snd: 'jump', knock: 6, clusterSpread: 1.25, clusterSpd: [4, 10], miniFuse: [45, 110], miniImpact: true, bomblet: { dmg: 40, blast: 58 } } },
  { id: '23_Meteor_Bomb', name: 'Meteor Bomb', desc: 'Bursts over enemies into 8 falling bombs', ammo: 3, type: 'shot', charge: true, proj: { spr: 'proj_meteor', ss: .8, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, rot: true, dmg: 30, blast: 36, hit: 'explosion_small', hs: 1.05, snd: 'rocket', knock: 6, trail: true, meteor: { count: 8, dmg: 30, blast: 36, spread: 4 } } },
  { id: '24_Cannon', name: 'Cannon', desc: '3 cannonballs, one every 0.6s, heavy recoil', ammo: 3, type: 'shot', charge: true, volley: { count: 3, gap: 36, recoil: 2.6 }, proj: { spr: 'cannonball', ss: 1, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, dmg: 40, blast: 44, hit: 'explosion_big', hs: .8, snd: 'shotgun', knock: 8, trail: true } },
  { id: '25_Missile_Tech', name: 'Missile Tech', desc: '10 small rockets, one every 0.3s, recoil each shot', ammo: 2, type: 'shot', charge: true, volley: { count: 10, gap: 18, recoil: 1.0, spread: 5, lift: 1.5 }, proj: { spr: 'proj_missile', ss: .4, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, rot: true, dmg: 17, blast: 22, hit: 'explosion_small', hs: .6, snd: 'rocket', knock: 3.5, trail: true } },
];

// ===== ADVENTURE: SKILL WEAPONS DO LESS DAMAGE =====
// In ADVENTURE only, a Shop weapon that has a SKILL (several shots, scatter / cluster bomblets, freeze, homing) deals ADV_SKILL_DMG of its normal damage. The skill itself is not touched, only the damage.
// Weapons with no skill (and Shuriken, Titan Cannon, Doom Axe, Tempest Arc) keep full damage. Normal battles are not changed. Set ADV_SKILL_DMG to 1 to switch it off.
const ADV_SKILL_DMG = 0.5;
const ADV_SKILL_FREE = ['w_shuriken', 'w_titan_cannon', 'w_doom_axe', 'w_tempest_arc'];
const hasWeaponSkill = w => !!(w && w.shop && !ADV_SKILL_FREE.includes(w.shop) && (w.volley || w.cluster || (w.proj && (w.proj.freeze || w.proj.homing))));

// ===== SIGNATURE WEAPONS (one per robot) =====
// Every robot owns ONE of these from the start. They have UNLIMITED ammo, small damage and are always LOBBED:
// hold fire to charge, the shot flies in an arc, wind pushes it and gravity drops it (like the Bazooka). No straight-line shots.
// Damage grows +10% per upgrade level in the Profile (+15% at +10, +20% at +11, +25% at +12; max +12). Sprites are PNG files: assets/weapons/26..35_*.png
const SIG_WMETA = {"26_Magma_Mortar": {"muzzle": [360, 120], "bbox": [90, 40, 420, 216]}, "27_Frost_Lobber": {"muzzle": [388, 114], "bbox": [90, 40, 420, 216]}, "28_Acid_Slinger": {"muzzle": [322, 122], "bbox": [90, 40, 420, 216]}, "29_Gold_Cannon": {"muzzle": [386, 123], "bbox": [90, 40, 420, 216]}, "30_Shuriken_Lobber": {"muzzle": [364, 123], "bbox": [90, 40, 420, 216]}, "31_Thunder_Mortar": {"muzzle": [372, 125], "bbox": [90, 40, 420, 216]}, "32_Steel_Howitzer": {"muzzle": [374, 120], "bbox": [90, 40, 420, 216]}, "33_Void_Launcher": {"muzzle": [352, 124], "bbox": [90, 40, 420, 216]}, "34_Blood_Chucker": {"muzzle": [372, 132], "bbox": [90, 40, 420, 216]}, "35_Emerald_Spore_Cannon": {"muzzle": [374, 124], "bbox": [90, 40, 420, 216]}};
const wtier = lvl => lvl >= 12 ? 3 : lvl >= 11 ? 2 : lvl >= 10 ? 1 : 0;   // look of a signature weapon: +0..+9 plain, +10, +11, +12 more and more epic
const wpath = (id, tier = 0) => 'weapons/' + id + (SIG_WMETA[id] ? (tier ? '_t' + tier : '') + '.png' : '.webp');   // new weapons are .png (4 looks each), the original 25 are .webp
const teamWTier = team => wtier((team && team.bonus && team.bonus.wlvl) | 0);
const SIG = (n, rob, name, desc, look, dmg, blast, hit, hs, snd, knock, trail) => ({ id: n, name, desc, ammo: Infinity, type: 'shot', charge: true, sig: rob,
  proj: { spr: 'sig', look, ss: 1, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, dmg, blast, hit, hs, snd, knock, trail: !!trail } });
WEAPONS.push(
  SIG('26_Magma_Mortar', '01_Inferno_Titan', 'Magma Mortar', 'Iron pot that lobs balls of lava. Unlimited.', { k: 'orb', c1: '#fff3c0', c2: '#ff6a10' }, 15, 34, 'explosion_small', .8, 'rocket', 3.2, true),
  SIG('27_Frost_Lobber', '02_Frost_Reaper', 'Frost Staff', 'Staff that lobs ice crystals. Unlimited.', { k: 'gem', c1: '#e8f8ff', c2: '#4fc3ff' }, 13, 32, 'ice_hit', .9, 'plasma', 3, false),
  SIG('28_Acid_Slinger', '03_Toxic_Crusher', 'Acid Slingshot', 'Slingshot that flings acid. Unlimited.', { k: 'blob', c1: '#e6ff9a', c2: '#5fc01f' }, 14, 33, 'plasma_hit', .8, 'plasma', 3, false),
  SIG('29_Gold_Cannon', '04_Golden_Warlord', 'Royal Cannon', 'Golden cannon on wheels. Unlimited.', { k: 'ball', c1: '#fff0a8', c2: '#b8860b' }, 16, 30, 'explosion_small', .75, 'shotgun', 3.4, true),
  SIG('30_Shuriken_Lobber', '05_Shadow_Ninja', 'Hanabi Tube', 'Bamboo tube that lobs spinning stars. Unlimited.', { k: 'star', c1: '#e6b8ff', c2: '#6a3fb0' }, 13, 28, 'spark_hit', .9, 'plasma', 2.6, false),
  SIG('31_Thunder_Mortar', '06_Thunder_Striker', 'Tesla Staff', 'Orb staff that lobs lightning. Unlimited.', { k: 'bolt', c1: '#ffffff', c2: '#ffdf3f' }, 15, 32, 'energy_hit', .85, 'plasma', 3, false),
  SIG('32_Steel_Howitzer', '07_Steel_Juggernaut', 'Rocket Pod', 'Triple-tube pod, lobs heavy shells. Unlimited.', { k: 'shell', c1: '#cfd6e0', c2: '#555c68' }, 17, 36, 'explosion_small', .85, 'rocket', 3.6, true),
  SIG('33_Void_Launcher', '08_Void_Phantom', 'Void Ring', 'Portal ring that lobs void orbs. Unlimited.', { k: 'orb', c1: '#d8fffd', c2: '#6a3fe0' }, 14, 34, 'plasma_hit', .85, 'plasma', 3, false),
  SIG('34_Blood_Chucker', '09_Blood_Berserker', 'Skull Cannon', 'Screaming skull that spits spiked bombs. Unlimited.', { k: 'spike', c1: '#ff8a8a', c2: '#8a0f1a' }, 16, 30, 'explosion_small', .75, 'shotgun', 3.4, false),
  SIG('35_Emerald_Spore_Cannon', '10_Emerald_Guardian', 'Spore Bloom', 'Flower pod that lobs emerald spores. Unlimited.', { k: 'gem', c1: '#c4ffe8', c2: '#1fb070' }, 14, 34, 'plasma_hit', .85, 'plasma', 3, false),
);

// ===== SHOP WEAPONS (20, bought in the Shop; boss loot boards also hold 2 of them) =====
// Same rules as the signature weapons: lobbed shots, unlimited ammo, upgraded with stones (look changes at +10, +11, +12).
// Equip one in the Profile weapon slot and it replaces your signature weapon in battle. Pictures: assets/weapons/S??_*.png (+_t1.._t3) and assets/items/w_*.png (+_t1.._t3).
const SHOP_WMETA = {"S01_Rivet_Cannon":{"muzzle":[394,128],"bbox":[90,20,470,236]},"S02_Bronze_Bombard":{"muzzle":[396,128],"bbox":[90,20,470,236]},"S03_Pipe_Organ":{"muzzle":[410,128],"bbox":[90,20,470,236]},"S04_Copper_Coil":{"muzzle":[420,128],"bbox":[90,20,470,236]},"S05_Leaf_Launcher":{"muzzle":[400,128],"bbox":[90,20,470,236]},"S06_Tidal_Cannon":{"muzzle":[404,128],"bbox":[90,20,470,236]},"S07_Ember_Drake":{"muzzle":[424,128],"bbox":[90,20,470,236]},"S08_Volt_Mortar":{"muzzle":[392,134],"bbox":[90,20,470,236]},"S09_Viper_Spitter":{"muzzle":[424,128],"bbox":[90,20,470,236]},"S10_Prism_Shard":{"muzzle":[438,128],"bbox":[90,20,470,236]},"S11_Gear_Grinder":{"muzzle":[396,128],"bbox":[90,20,470,236]},"S12_Scorpion_Tail":{"muzzle":[440,124],"bbox":[90,20,470,236]},"S13_Nova_Burst":{"muzzle":[410,128],"bbox":[90,20,470,236]},"S14_Reaper_Scythe":{"muzzle":[380,130],"bbox":[90,20,470,236]},"S15_Inferno_Gatling":{"muzzle":[410,128],"bbox":[90,20,470,236]},"S16_Storm_Trident":{"muzzle":[444,128],"bbox":[90,20,470,236]},"S17_Blizzard_Bow":{"muzzle":[436,128],"bbox":[90,20,470,236]},"S18_Sunbreaker":{"muzzle":[408,128],"bbox":[90,20,470,236]},"S19_Void_Devourer":{"muzzle":[410,128],"bbox":[90,20,470,236]},"S20_Dragon_King":{"muzzle":[398,124],"bbox":[90,20,470,236]},"S31_Titan_Cannon":{"muzzle":[432,128],"bbox":[90,20,470,236]}};
Object.assign(SIG_WMETA, SHOP_WMETA);
Object.assign(SIG_WMETA, {"S21_Cinder_Pot":{"muzzle":[388,128],"bbox":[90,20,470,236]},"S22_Bone_Slinger":{"muzzle":[403,128],"bbox":[90,20,470,236]},"S23_Tin_Twin":{"muzzle":[400,128],"bbox":[90,20,470,236]},"S24_Moss_Mortar":{"muzzle":[400,128],"bbox":[90,20,470,236]},"S25_Pearl_Tide":{"muzzle":[400,128],"bbox":[90,20,470,236]},"S26_Thorn_Vine":{"muzzle":[400,128],"bbox":[90,20,470,236]},"S27_Crystal_Spire":{"muzzle":[460,128],"bbox":[90,20,470,236]},"S28_Night_Fang":{"muzzle":[403,128],"bbox":[90,20,470,236]},"S29_Phoenix_Wing":{"muzzle":[403,128],"bbox":[90,20,470,236]},"S30_Galaxy_Eye":{"muzzle":[400,128],"bbox":[90,20,470,236]}});   // 10 more Shop weapons (S21-S30): pictures assets/weapons/S2?_*.png / S30_*.png (+_t1.._t3), assets/items/w_*.png (+_t1.._t3)
// SHOPW(id, name, rarity, desc, look, dmg, blast, hit, hs, snd, knock, trail, extras)  extras: vol {count,gap,recoil,spread}, cluster + bomblet, freeze, homing
const SHOPW = (n, name, rar, desc, look, dmg, blast, hit, hs, snd, knock, trail, x = {}) => {
  const proj = { spr: 'sig', look, ss: 1, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, dmg, blast, hit, hs, snd, knock, trail: !!trail };
  if (x.freeze) proj.freeze = true; if (x.homing) { proj.homing = true; proj.homeRange = 200; proj.life = 2400; } if (x.bomblet) proj.bomblet = x.bomblet; if (x.clusterSpread) proj.clusterSpread = x.clusterSpread; if (x.clusterSpd) proj.clusterSpd = x.clusterSpd; if (x.miniFuse) proj.miniFuse = x.miniFuse; if (x.miniImpact !== undefined) proj.miniImpact = x.miniImpact;
  if (x.hitT) proj.hitT = x.hitT; if (x.noKnock) proj.noKnock = true; if (x.hitSnd) proj.hitSnd = x.hitSnd;   // hitT: own hit effect per upgrade look [+0..+9, +10, +11, +12] (null = the normal hit); noKnock: blast never pushes anyone
  const w = { id: n, name, desc, ammo: Infinity, type: 'shot', charge: true, shop: 'w_' + n.slice(4).toLowerCase(), rar, proj };
  if (x.vol) w.volley = x.vol; if (x.cluster) w.cluster = x.cluster; return w;
};
WEAPONS.push(
  SHOPW('S01_Rivet_Cannon', 'Rivet Cannon', 'common', 'Riveted steel cannon on a wooden cradle.', { k: 'ball', c1: '#e8eaf0', c2: '#6b7280' }, 16, 32, 'explosion_small', .8, 'shotgun', 3.4, true),
  SHOPW('S02_Bronze_Bombard', 'Bronze Bombard', 'common', 'Old bronze mortar with a wide mouth.', { k: 'ball', c1: '#ffe0a8', c2: '#a8641c' }, 17, 36, 'explosion_small', .85, 'rocket', 3.6, true),
  SHOPW('S03_Pipe_Organ', 'Pipe Organ Lobber', 'common', 'Four pipes, 2 shells one after another.', { k: 'shell', c1: '#dbe6f5', c2: '#5b6a84' }, 12, 28, 'explosion_small', .75, 'rocket', 2.6, true, { vol: { count: 2, gap: 26, recoil: 1, spread: 2 } }),
  SHOPW('S04_Copper_Coil', 'Copper Coil Zapper', 'common', 'Copper coil that flings sparks.', { k: 'bolt', c1: '#ffffff', c2: '#ffb02e' }, 15, 30, 'energy_hit', .85, 'plasma', 3, false),
  SHOPW('S05_Leaf_Launcher', 'Leaf Launcher', 'common', 'Flower trumpet that spits green goo.', { k: 'blob', c1: '#e6ff9a', c2: '#4fb02a' }, 16, 33, 'plasma_hit', .8, 'plasma', 3, false),
  SHOPW('S06_Tidal_Cannon', 'Tidal Cannon', 'rare', 'Water tank cannon, heavy splash.', { k: 'orb', c1: '#e0fbff', c2: '#2aa6e0' }, 21, 38, 'explosion_small', .9, 'plasma', 3.4, true),
  SHOPW('S07_Ember_Drake', 'Ember Drake', 'rare', 'Dragon head that breathes fireballs.', { k: 'orb', c1: '#fff3c0', c2: '#ff4a10' }, 23, 40, 'explosion_small', .9, 'rocket', 4, true),
  SHOPW('S08_Volt_Mortar', 'Volt Coil Mortar', 'rare', 'Tesla ball on top, 2 lightning shots.', { k: 'bolt', c1: '#ffffff', c2: '#ffe84a' }, 16, 32, 'energy_hit', .85, 'plasma', 3, false, { vol: { count: 2, gap: 24, recoil: 1, spread: 2 } }),
  SHOPW('S09_Viper_Spitter', 'Viper Spitter', 'rare', 'Snake that spits toxic blobs.', { k: 'blob', c1: '#e6ff9a', c2: '#2a9a1a' }, 22, 38, 'plasma_hit', .9, 'plasma', 3, false),
  SHOPW('S10_Prism_Shard', 'Prism Shard Gun', 'rare', 'Crystal gun that fires shards.', { k: 'gem', c1: '#ffffff', c2: '#ff7ad9' }, 22, 36, 'energy_hit', .9, 'plasma', 3, false),
  SHOPW('S11_Gear_Grinder', 'Gear Grinder', 'rare', 'Cogs fling spinning gear stars.', { k: 'star', c1: '#ffe0a8', c2: '#e07a2a' }, 21, 34, 'spark_hit', .9, 'plasma', 3.2, false),
  SHOPW('S12_Scorpion_Tail', 'Scorpion Tail', 'rare', 'Stinger tail that flings barbs.', { k: 'spike', c1: '#ffd88a', c2: '#b8620e' }, 24, 36, 'explosion_small', .85, 'shotgun', 3.6, false),
  SHOPW('S13_Nova_Burst', 'Nova Burst Cannon', 'epic', 'Sleek energy cannon, 2 nova blasts.', { k: 'orb', c1: '#ffffff', c2: '#2fd8ff' }, 20, 40, 'energy_hit', 1, 'plasma', 3.6, true, { vol: { count: 2, gap: 28, recoil: 1.2, spread: 2 } }),
  SHOPW('S14_Reaper_Scythe', 'Reaper Scythe', 'epic', 'Soul scythe that lobs spinning souls.', { k: 'star', c1: '#f0d8ff', c2: '#8a2fd8' }, 29, 40, 'plasma_hit', .95, 'plasma', 4, true),
  SHOPW('S15_Inferno_Gatling', 'Inferno Gatling', 'epic', 'Three burning barrels, 3 shells.', { k: 'shell', c1: '#ffd8a0', c2: '#d8321a' }, 17, 34, 'explosion_small', .8, 'rocket', 3, true, { vol: { count: 3, gap: 22, recoil: 1.1, spread: 3 } }),
  SHOPW('S16_Storm_Trident', 'Storm Trident', 'epic', 'Trident that hurls thunder.', { k: 'bolt', c1: '#ffffff', c2: '#4fb8ff' }, 27, 42, 'energy_hit', 1, 'plasma', 4, false),
  SHOPW('S17_Blizzard_Bow', 'Blizzard Crossbow', 'epic', 'Ice crossbow, freezes on hit.', { k: 'gem', c1: '#ffffff', c2: '#6fd8ff' }, 22, 42, 'ice_hit', 1, 'freeze', 3, false, { freeze: true }),
  SHOPW('S18_Sunbreaker', 'Solar Sunbreaker', 'legendary', 'Sun cannon, bursts into 4 sparks.', { k: 'orb', c1: '#ffffff', c2: '#ffc21a' }, 33, 50, 'explosion_big', 1, 'rocket', 5, true, { cluster: 4, clusterSpread: 0.6, clusterSpd: [3, 8], miniFuse: [40, 90], miniImpact: true, bomblet: { dmg: 14, blast: 50 } }),
  SHOPW('S19_Void_Devourer', 'Void Devourer', 'legendary', 'Hungry void eye. Locks on when close.', { k: 'orb', c1: '#f0d8ff', c2: '#6a1fd0' }, 34, 48, 'plasma_hit', 1, 'plasma', 5, true, { homing: true }),
  SHOPW('S20_Dragon_King', 'Dragon King Cannon', 'legendary', 'Golden dragon cannon, 2 heavy balls.', { k: 'ball', c1: '#ffe8a0', c2: '#d8321a' }, 25, 46, 'explosion_big', 1, 'rocket', 5, true, { vol: { count: 2, gap: 34, recoil: 1.6, spread: 1 } }),
);

// ===== 10 MORE SHOP WEAPONS (S21-S30), same rules as the 20 above =====
WEAPONS.push(
  SHOPW('S21_Cinder_Pot', "Cinder Pot", 'common', "Stubby iron pot that lobs hot coals.", { k: 'orb', c1: '#ffe0a8', c2: '#e0561a' }, 16, 32, 'explosion_small', 0.8, 'rocket', 3.4, true),
  SHOPW('S22_Bone_Slinger', "Bone Slinger", 'common', "Rib-bone cannon that flings marrow shells.", { k: 'ball', c1: '#f4ead0', c2: '#a89868' }, 16, 31, 'spark_hit', 0.8, 'shotgun', 3.2, false),
  SHOPW('S23_Tin_Twin', "Tin Twin Barrel", 'common', "Two tin barrels, 2 quick shots.", { k: 'shell', c1: '#e8eef8', c2: '#7a8498' }, 12, 28, 'explosion_small', 0.75, 'rocket', 2.6, true, { vol: { count: 2, gap: 24, recoil: 1, spread: 2 } }),
  SHOPW('S24_Moss_Mortar', "Moss Mortar", 'common', "Overgrown mortar that spits mossy balls.", { k: 'blob', c1: '#e6ff9a', c2: '#3a8a2a' }, 17, 33, 'plasma_hit', 0.8, 'plasma', 3, false),
  SHOPW('S25_Pearl_Tide', "Pearl Tide Cannon", 'rare', "Sea cannon with a glowing pearl core.", { k: 'orb', c1: '#f0fdff', c2: '#2aa6e0' }, 22, 38, 'explosion_small', 0.9, 'plasma', 3.4, true),
  SHOPW('S26_Thorn_Vine', "Thorn Vine Launcher", 'rare', "Vine-wrapped launcher that fires thorns.", { k: 'spike', c1: '#e6ff9a', c2: '#3a8a22' }, 23, 37, 'spark_hit', 0.85, 'shotgun', 3.6, false),
  SHOPW('S27_Crystal_Spire', "Crystal Spire Gun", 'rare', "Crystal gun that bursts into bright shards.", { k: 'gem', c1: '#ffffff', c2: '#c04aff' }, 22, 36, 'energy_hit', 0.9, 'plasma', 3, false),
  SHOPW('S28_Night_Fang', "Nightfang Cannon", 'epic', "Fanged cannon, 2 shadow blasts.", { k: 'orb', c1: '#f0d8ff', c2: '#4a1a7a' }, 19, 38, 'plasma_hit', 0.95, 'plasma', 3.4, true, { vol: { count: 2, gap: 26, recoil: 1.1, spread: 2 } }),
  SHOPW('S29_Phoenix_Wing', "Phoenix Wing Cannon", 'epic', "Winged cannon that hurls phoenix fire.", { k: 'orb', c1: '#fff3c0', c2: '#ff4a10' }, 28, 42, 'explosion_big', 1, 'rocket', 4, true),
  SHOPW('S30_Galaxy_Eye', "Galaxy Eye Launcher", 'legendary', "A tiny galaxy shell, bursts into 3 stars.", { k: 'orb', c1: '#ffffff', c2: '#7a4aff' }, 30, 48, 'explosion_big', 1, 'plasma', 5, true, { cluster: 3, clusterSpread: 1.25, clusterSpd: [3, 8], miniFuse: [40, 90], miniImpact: true, bomblet: { dmg: 14, blast: 30 } }),
);

// ===== TITAN CANNON (legendary Shop weapon): ONE single heavy cannonball, no skill, just a MUCH bigger blast =====
// Looks: +0..+9 black cannonball, +10 same but bigger, +11 black ball with spikes, +12 gold ball with spikes (same size as +10). Drawn in render.js (look k:'cball').
// Fixed stats (see TITAN_STATS in profile.js): Damage 300 (incl. the legendary bonus), Dex 20, Vit 10, Agi 3, Luck 3, Defense 20.
WEAPONS.push(
  SHOPW('S31_Titan_Cannon', "Titan Cannon", 'legendary', "One huge cannonball with a giant blast. No skill, only power.", { k: 'cball', c1: '#8a93a3', c2: '#323946' }, 247, 70, 'explosion_big', 0.85, 'mp3_titan_fire', 8, true, { hitT: ['titan_hit_t0', 'titan_hit_t1', 'titan_hit_t2', 'titan_hit_t3'] }),   // own red fire-smoke hit effect per upgrade look (+0..+9, +10, +11, +12)
);

// ===== SHURIKEN (legendary Shop weapon): ONE fast-spinning shot, no knockback, no skill. The shot IS the weapon picture (4 looks: normal, +10, +11, +12) =====
// Fixed stats (see profile.js): Damage 350 (incl. the legendary bonus), Vitality 3, Agility 40, Luck 6, Dexterity 3. Price 7500. Shop only (not in boss loot).
// Hit effect: +0..+9 the normal explosion, +10 / +11 / +12 their own sprite sheets (assets/fx/shuriken_hit_t1..t3.webp, listed in assets/fx.json).
Object.assign(SIG_WMETA, { 'S32_Shuriken': { muzzle: [395, 128], bbox: [90, 20, 470, 236] } });
const TITAN_FX = {   // Titan Cannon hit effects: red fire + smoke, stronger at every look (assets/fx/titan_hit_t0..t3.webp)
  titan_hit_t0: { file: 'fx/titan_hit_t0.webp', frames: 14, cols: 7, fw: 256, fh: 256, fps: 18, loop: false },
  titan_hit_t1: { file: 'fx/titan_hit_t1.webp', frames: 14, cols: 7, fw: 256, fh: 256, fps: 18, loop: false },
  titan_hit_t2: { file: 'fx/titan_hit_t2.webp', frames: 14, cols: 7, fw: 256, fh: 256, fps: 18, loop: false },
  titan_hit_t3: { file: 'fx/titan_hit_t3.webp', frames: 14, cols: 7, fw: 256, fh: 256, fps: 18, loop: false },
};
const SHURIKEN_FX = {   // hit effect sprite sheets for +10 / +11 / +12 (assets/fx/shuriken_hit_t1..t3.webp), same format as assets/fx.json (registered in core.js because assets/data.js replaces fx.json)
  shuriken_hit_t1: { file: 'fx/shuriken_hit_t1.webp', frames: 12, cols: 6, fw: 192, fh: 192, fps: 20, loop: false },
  shuriken_hit_t2: { file: 'fx/shuriken_hit_t2.webp', frames: 12, cols: 6, fw: 192, fh: 192, fps: 20, loop: false },
  shuriken_hit_t3: { file: 'fx/shuriken_hit_t3.webp', frames: 12, cols: 6, fw: 192, fh: 192, fps: 20, loop: false },
};
WEAPONS.push(
  SHOPW('S32_Shuriken', 'Shuriken', 'legendary', 'A legendary throwing star. One fast-spinning shot, no knockback, no skill.', { k: 'shur', c1: '#ffffff', c2: '#c8ccd8' }, 297, 40, 'explosion_small', 1.4, 'mp3_shuriken_shoot', 0, false, { hitT: [null, 'shuriken_hit_t1', 'shuriken_hit_t2', 'shuriken_hit_t3'], noKnock: true, hitSnd: 'shuriken_hit' }),
);

// ===== TEMPEST ARC (legendary Shop weapon): fires ONE crackling bolt of lightning (a short, jagged electric line, not a ball), bursts into an electric hit effect =====
// 4 looks (+0..+9, +10, +11, +12): weapon pictures assets/weapons/S33_Tempest_Arc(_t1..t3).png, shop icons assets/items/w_tempest_arc(_t1..t3).png,
// shots assets/proj/volt_bolt_t0..t3.png (4 jagged variants side by side, they flicker in flight), hit effects assets/fx/volt_hit_t0..t3.webp (electric burst, stronger at every look).
// Fixed stats (see profile.js): Damage 320 total (267 + the legendary bonus 53), Agility 6, Dexterity 3, Defense 3, Luck 50, Vitality 6. Price 7000. Shop only (not in boss loot).
Object.assign(SIG_WMETA, { 'S33_Tempest_Arc': { muzzle: [432, 128], bbox: [60, 40, 450, 216] } });
const VOLT_FX = {   // electric hit effect sheets (12 frames of 192x192), drawn additive (render.js)
  volt_hit_t0: { file: 'fx/volt_hit_t0.webp', frames: 12, cols: 6, fw: 192, fh: 192, fps: 24, loop: false },
  volt_hit_t1: { file: 'fx/volt_hit_t1.webp', frames: 12, cols: 6, fw: 192, fh: 192, fps: 24, loop: false },
  volt_hit_t2: { file: 'fx/volt_hit_t2.webp', frames: 12, cols: 6, fw: 192, fh: 192, fps: 24, loop: false },
  volt_hit_t3: { file: 'fx/volt_hit_t3.webp', frames: 12, cols: 6, fw: 192, fh: 192, fps: 24, loop: false },
};
WEAPONS.push(
  SHOPW('S33_Tempest_Arc', 'Tempest Arc', 'legendary', 'Electric arc cannon. Fires a crackling bolt of lightning that bursts into sparks.', { k: 'volt', c1: '#ffffff', c2: '#40d8ff' }, 267, 44, 'energy_hit', 1, 'mp3_tempest_shoot', 3.2, false, { hitT: ['volt_hit_t0', 'volt_hit_t1', 'volt_hit_t2', 'volt_hit_t3'], hitSnd: 'tempest_hit' }),
);

// ===== BOSS WEAPONS (Adventure only) =====
// Every Adventure boss owns ONE weapon: rockets that are FLUNG in an arc and land on the ground (wind pushes them, gravity drops them).
// Launcher sprite = assets/weapons/B??_*.png (3D art), rocket sprite = assets/proj/B??_*_rocket.png. Bosses have unlimited ammo; nobody else can use these.
// To tweak a boss weapon change its numbers below: dmg = damage per rocket (the boss's own +% ATK from adventure.js is added on top), blast = explosion size, count = rockets per turn.
const BOSS_WMETA = {"B01_Scrap_Rocket_Rack": {"muzzle": [408, 116], "bbox": [90, 40, 430, 216]}, "B02_Glacier_Missile": {"muzzle": [416, 118], "bbox": [90, 40, 430, 216]}, "B03_Storm_Rocket_Array": {"muzzle": [420, 118], "bbox": [90, 40, 430, 216]}, "B04_Magma_Rocket": {"muzzle": [408, 118], "bbox": [90, 40, 430, 216]}, "B05_Thornvine_Pods": {"muzzle": [414, 118], "bbox": [90, 40, 430, 216]}, "B06_Scarab_Seeker": {"muzzle": [416, 118], "bbox": [90, 40, 430, 216]}, "B07_Cyclone_Missiles": {"muzzle": [420, 120], "bbox": [90, 40, 430, 216]}, "B08_Plague_Bomb_Rocket": {"muzzle": [408, 118], "bbox": [90, 40, 430, 216]}, "B09_Prism_Barrage": {"muzzle": [416, 118], "bbox": [90, 40, 430, 216]}, "B10_Void_Seeker": {"muzzle": [416, 118], "bbox": [90, 40, 430, 216]}};
Object.assign(SIG_WMETA, BOSS_WMETA);   // so wpath() finds the .png and muzzleWorld() finds the muzzle point
const BOSS_W = (id, boss, name, desc, o) => {
  const vol = o.vol || null, n = vol ? vol.count : 1;
  const proj = { spr: 'img:proj/' + id + '_rocket.png', ss: o.ss, speed: CHARGE_SPEED, g: WEAPON_G, wind: WEAPON_WIND, rot: true, dmg: o.dmg, blast: o.blast, hit: o.hit, hs: o.hs, snd: o.snd || 'rocket', knock: o.knock, trail: true, life: 2400 };
  if (o.freeze) proj.freeze = true; if (o.homing) { proj.homing = true; proj.homeRange = 200; } if (o.bomblet) proj.bomblet = o.bomblet; if (o.clusterSpread) proj.clusterSpread = o.clusterSpread; if (o.clusterSpd) proj.clusterSpd = o.clusterSpd; if (o.miniFuse) proj.miniFuse = o.miniFuse; if (o.miniImpact !== undefined) proj.miniImpact = o.miniImpact;
  const w = { id, name, desc, ammo: Infinity, type: 'shot', charge: true, boss, rockets: n, proj };
  if (vol) w.volley = vol; if (o.cluster) w.cluster = o.cluster;
  return w;
};
WEAPONS.push(
  BOSS_W('B01_Scrap_Rocket_Rack', 'boss_canyon', "Scrap Rocket Rack", "Twin rusty tubes fling 2 rockets in an arc.", {"dmg": 30, "blast": 46, "knock": 8, "ss": 0.55, "vol": {"count": 2, "gap": 30, "recoil": 1.2, "spread": 2}, "hit": "explosion_big", "hs": 0.8}),
  BOSS_W('B02_Glacier_Missile', 'boss_glacier', "Glacier Missile", "One frost rocket that lands and freezes everyone nearby.", {"dmg": 44, "blast": 56, "knock": 7, "ss": 0.7, "freeze": true, "hit": "ice_hit", "hs": 1.0, "snd": "freeze"}),
  BOSS_W('B03_Storm_Rocket_Array', 'boss_citadel', "Storm Rocket Array", "Three charged rockets, one after another.", {"dmg": 26, "blast": 40, "knock": 6, "ss": 0.5, "vol": {"count": 3, "gap": 22, "recoil": 1.0, "spread": 3}, "hit": "energy_hit", "hs": 0.85}),
  BOSS_W('B04_Magma_Rocket', 'boss_ember', "Magma Rocket", "One huge lava rocket. Big crater, big knockback.", {"dmg": 70, "blast": 76, "knock": 13, "ss": 0.8, "hit": "explosion_big", "hs": 1.15}),
  BOSS_W('B05_Thornvine_Pods', 'boss_ruins', "Thornvine Pods", "Three spiky seed rockets, wide spread.", {"dmg": 28, "blast": 42, "knock": 6, "ss": 0.5, "vol": {"count": 3, "gap": 24, "recoil": 1.0, "spread": 5}, "hit": "plasma_hit", "hs": 0.85}),
  BOSS_W('B06_Scarab_Seeker', 'boss_dunes', "Scarab Seeker", "Two rockets that lock on when you are close.", {"dmg": 40, "blast": 48, "knock": 7, "ss": 0.58, "vol": {"count": 2, "gap": 36, "recoil": 1.0, "spread": 1}, "homing": true, "hit": "explosion_big", "hs": 0.8}),
  BOSS_W('B07_Cyclone_Missiles', 'boss_marble', "Cyclone Missiles", "Four small fast rockets in a row.", {"dmg": 24, "blast": 36, "knock": 5, "ss": 0.42, "vol": {"count": 4, "gap": 16, "recoil": 0.9, "spread": 5, "lift": 1.5}, "hit": "explosion_small", "hs": 0.8}),
  BOSS_W('B08_Plague_Bomb_Rocket', 'boss_bog', "Plague Bomb Rocket", "One rocket that bursts into 5 toxic bomblets.", {"dmg": 40, "blast": 50, "knock": 6, "ss": 0.62, "cluster": 5, "clusterSpread": 1.25, "clusterSpd": [3, 8], "miniFuse": [40, 90], "miniImpact": true, "bomblet": {"dmg": 16, "blast": 34}, "hit": "plasma_hit", "hs": 0.9}),
  BOSS_W('B09_Prism_Barrage', 'boss_prism', "Prism Barrage", "Three crystal rockets in a fan.", {"dmg": 38, "blast": 46, "knock": 7, "ss": 0.55, "vol": {"count": 3, "gap": 20, "recoil": 1.0, "spread": 7}, "hit": "energy_hit", "hs": 0.9}),
  BOSS_W('B10_Void_Seeker', 'boss_void', "Void Seeker", "Two heavy void rockets that lock on when close.", {"dmg": 56, "blast": 68, "knock": 11, "ss": 0.68, "vol": {"count": 2, "gap": 40, "recoil": 1.4, "spread": 1}, "homing": true, "hit": "plasma_hit", "hs": 1.1}),
);

// ===== CREATURE BOSS WEAPONS (HARD + HEROIC second boss; not robots, they breathe fire / throw things) =====
// Held art = assets/weapons/C??_*.png (sits at the creature's hand / mouth), flying art = assets/proj/C??_*_proj.png (spins or follows the flight path).
// o.spin = spin speed (rad/frame, 0 = points along the flight path), o.glow = halo colour, o.add = additive blend (fire). Everything else like BOSS_W.
const CBOSS_WMETA = {"C01_Gutrot_Spear": {"muzzle": [473.8, 141.6], "bbox": [90, 114, 474, 166]}, "C05_Temple_Axe": {"muzzle": [337.5, 135.5], "bbox": [69, 48, 411, 227]}, "C07_Zenith_Axe": {"muzzle": [337.5, 135.5], "bbox": [69, 48, 411, 227]}, "C03_Storm_Skull": {"muzzle": [211.1, 117.6], "bbox": [161, 68, 270, 180]}, "C06_Tomb_Skull": {"muzzle": [211.1, 117.6], "bbox": [161, 68, 270, 180]}, "C08_Bog_Cannon": {"muzzle": [221.7, 130.9], "bbox": [171, 68, 272, 185]}, "C09_Crystal_Cannon": {"muzzle": [221.7, 130.9], "bbox": [148, 54, 295, 208]}, "C02_Frost_Breath": {"muzzle": [205, 128], "bbox": [168, 98, 319, 157]}, "C04_Inferno_Breath": {"muzzle": [205, 128], "bbox": [168, 98, 319, 157]}, "C10_Void_Breath": {"muzzle": [205, 128], "bbox": [168, 98, 319, 157]}};
Object.assign(SIG_WMETA, CBOSS_WMETA);
Object.assign(SIG_WMETA, { 'C11_Warchief_Rock': { muzzle: [205, 128], bbox: [140, 63, 270, 193] }, 'C12_Scorpion_Venom': { muzzle: [170, 128], bbox: [0, 0, 1, 1] }, 'C13_Lava_Hound_Lava': { muzzle: [170, 128], bbox: [0, 0, 1, 1] }, 'C14_Zeus_Bolt': { muzzle: [170, 128], bbox: [0, 0, 1, 1] }, 'C15_Reaper_Scythe': { muzzle: [170, 128], bbox: [0, 0, 1, 1] } });   // HEROIC third bosses (boss3.js)
SIG_WMETA['M0_Blank'] = { muzzle: [170, 128], bbox: [0, 0, 1, 1] };   // empty picture: creature minions carry no weapon, they smash / spit fire
const CBOSS_W = (id, boss, name, desc, o) => {
  const vol = o.vol || null, n = vol ? vol.count : 1;
  const proj = { spr: 'cimg:proj/' + id + '_proj.png', ss: o.ss || 1, speed: CHARGE_SPEED, g: o.g || WEAPON_G, wind: WEAPON_WIND, spin: o.spin || 0, glow: o.glow || null, add: !!o.add, dmg: o.dmg, blast: o.blast, hit: o.hit, hs: o.hs, snd: o.snd || 'rocket', knock: o.knock, trail: !!o.trail, life: 2400 };
  if (o.freeze) proj.freeze = true; if (o.homing) { proj.homing = true; proj.homeRange = 200; } if (o.bomblet) proj.bomblet = o.bomblet; if (o.clusterSpread) proj.clusterSpread = o.clusterSpread; if (o.clusterSpd) proj.clusterSpd = o.clusterSpd; if (o.miniFuse) proj.miniFuse = o.miniFuse; if (o.miniImpact !== undefined) proj.miniImpact = o.miniImpact;
  const wp = { id, name, desc, ammo: Infinity, type: 'shot', charge: true, boss, rockets: n, proj };
  if (vol) wp.volley = vol; if (o.cluster) wp.cluster = o.cluster;
  return wp;
};
WEAPONS.push(
  CBOSS_W('C01_Gutrot_Spear', 'boss_gutrot', "Gutrot's Spear", "One huge spear hurled hard and flat.", { dmg: 62, blast: 40, knock: 10, ss: .95, g: .09, hit: 'explosion_big', hs: .8, snd: 'mp3_orc_spear' }),
  CBOSS_W('C02_Frost_Breath', 'boss_frostwyrm', "Frost Breath", "Three icy fireballs that freeze whoever they hit.", { dmg: 30, blast: 40, knock: 6, ss: 1, vol: { count: 3, gap: 14, recoil: 1.2, spread: 3 }, freeze: true, hit: 'ice_hit', hs: 1.0, snd: 'freeze', glow: '#7fd6ff', add: true }),
  CBOSS_W('C03_Storm_Skull', 'boss_stormbone', "Storm Skull", "A crackling skull that bursts into 3 bone bombs.", { dmg: 46, blast: 52, knock: 8, ss: 1, spin: .22, cluster: 3, clusterSpread: 1.25, clusterSpd: [3, 8], miniFuse: [40, 90], miniImpact: true, bomblet: { dmg: 14, blast: 32 }, hit: 'energy_hit', hs: .95, glow: '#5be0ff' }),
  CBOSS_W('C04_Inferno_Breath', 'boss_cinderdrake', "Inferno Breath", "A long burst of 6 fireballs from the dragon's mouth.", { dmg: 18, blast: 32, knock: 4, ss: 1, vol: { count: 6, gap: 7, recoil: .8, spread: 4 }, hit: 'explosion_small', hs: .85, glow: '#ff8a30', add: true, trail: true }),
  CBOSS_W('C05_Temple_Axe', 'boss_templemino', "Temple Axe", "A giant double axe thrown end over end. Huge knockback.", { dmg: 78, blast: 54, knock: 13, ss: 1.1, spin: .2, hit: 'explosion_big', hs: 1.0 }),
  CBOSS_W('C06_Tomb_Skull', 'boss_tombking', "Tomb Skulls", "Two cursed skulls that lock on when you are close.", { dmg: 38, blast: 44, knock: 7, ss: 1, spin: .25, vol: { count: 2, gap: 34, recoil: 1.0, spread: 1 }, homing: true, hit: 'plasma_hit', hs: .9, glow: '#ff9a30' }),
  CBOSS_W('C07_Zenith_Axe', 'boss_zenithmino', "Zenith Twin Axes", "Two golden axes thrown one after the other.", { dmg: 44, blast: 46, knock: 9, ss: 1.05, spin: .2, vol: { count: 2, gap: 30, recoil: 1.0, spread: 2 }, hit: 'explosion_big', hs: .85 }),
  // The old Bog / Crystal Slime Kings are now YOUR Slime King in green / violet (slimeboss.js). They never fire a rocket: this entry only carries the base damage and the name shown on the map screen.
  // (the ids C08 / C09 are kept so the existing art / muzzle data still load; damage = the old cannon numbers of the map: Bog 58, Crystal 3 x 30)
  CBOSS_W('C08_Bog_Cannon', 'boss_slimeking_bog', "Bog Slime Smash", "Leaps high and smashes the ground (hurts every player on the ground), splashes anyone who comes close.", { dmg: 58, blast: 60, knock: 6, ss: 1, hit: 'splash', hs: 1.2, snd: 'boom' }),
  CBOSS_W('C09_Crystal_Cannon', 'boss_slimeking_crystal', "Crystal Slime Smash", "Leaps high and smashes the ground (hurts every player on the ground), splashes anyone who comes close.", { dmg: 90, blast: 60, knock: 6, ss: 1, hit: 'splash', hs: 1.2, snd: 'boom' }),
  CBOSS_W('C10_Void_Breath', 'boss_voiddrake', "Void Breath", "Four void flames that lock on when close.", { dmg: 34, blast: 46, knock: 7, ss: 1, vol: { count: 4, gap: 12, recoil: 1.0, spread: 3 }, homing: true, hit: 'plasma_hit', hs: 1.0, glow: '#d65aff', add: true, trail: true }),
  // ---- HEROIC third bosses (boss3.js): their basic attack / base damage numbers ----
  CBOSS_W('C11_Warchief_Rock', 'boss_warchief', "Warchief's Boulder", "A huge boulder hurled with brute force.", { dmg: 76, blast: 56, knock: 12, ss: .9, spin: .18, hit: 'b3_rock_hit', hs: 1.0, snd: 'rocket' }),
  CBOSS_W('C12_Scorpion_Venom', 'boss_scorpionking', "Venom Stinger", "Three poison bolts shot from the tail.", { dmg: 34, blast: 40, knock: 5, ss: 1, vol: { count: 3, gap: 14, recoil: 1.0, spread: 3 }, hit: 'b3_poison_hit', hs: 1.0, snd: 'slash', glow: '#6dff3a', trail: true }),
  CBOSS_W('C13_Lava_Hound_Lava', 'boss_lavahound', "Molten Spit", "Two balls of lava spat from the hound's jaws.", { dmg: 46, blast: 50, knock: 7, ss: 1.1, vol: { count: 2, gap: 20, recoil: 1.0, spread: 3 }, hit: 'b3_lava_hit', hs: 1.1, glow: '#ff8a30', add: true, trail: true }),
  CBOSS_W('C14_Zeus_Bolt', 'boss_zeus', "Zeus' Lightning", "Lightning strikes one player directly and jumps to every player standing close.", { dmg: 64, blast: 30, knock: 4, ss: 1, hit: 'b3_bolt_hit', hs: 1.0, snd: 'freeze', glow: '#9fe4ff', add: true }),
  CBOSS_W('C15_Reaper_Scythe', 'boss_deathreaper', "Reaper's Scythe", "Dashes to a random player and slashes, then flies back.", { dmg: 70, blast: 40, knock: 8, ss: 1, spin: .3, hit: 'spark_hit', hs: 1.0, snd: 'slash', glow: '#6dffa0', add: true }),
  CBOSS_W('C16_Werewolf_Claw', 'boss_werewolf', "Shadow Claws", "Double claw slash: two hits in a row. Every 3rd turn he strikes across the whole map.", { dmg: 42, blast: 30, knock: 6, ss: 1, hit: 'spark_hit', hs: 1.0, snd: 'slash', glow: '#b46bff', add: true }),
);

Object.assign(SIG_WMETA, { 'C16_Werewolf_Claw': { muzzle: [170, 128], bbox: [0, 0, 1, 1] } });
const bossWeaponOf = bossId => WEAPONS.find(w => w.boss === bossId) || null;
const bossStatText = w => { if (!w) return ''; const p = w.proj, n = w.rockets || 1; return `${n > 1 ? n + ' rockets × ' : '1 rocket × '}${p.dmg} dmg · blast ${p.blast}${w.cluster ? ' · +' + w.cluster + ' bomblets (' + p.bomblet.dmg + ' dmg)' : ''}${p.freeze ? ' · freezes' : ''}${p.homing ? ' · homing' : ''}`; };   // text shown on the Adventure map screen

// ===== BOSS MINION MELEE WEAPONS =====
// A boss summons 3 melee bots in the first round and then every 2 rounds. Each bot carries one of these (picked in turn, so they look different).
// dmg = damage of one swing (the boss's own +% ATK from adventure.js is added on top), range = reach in pixels, knock = push (0 = NO knockback, as it is now for all of them).  art = picture from assets/weapons/.
const MINION_WEAPONS = [
  { id: 'M1_Scrap_Blade',  art: '19_Energy_Sword',    name: 'Scrap Blade',  desc: 'Quick melee slash',      ammo: Infinity, type: 'melee', range: 62, dmg: 7,  knock: 0,  fx: 'slash_cyan',   snd: 'slash', carve: 0, minion: true },
  { id: 'M2_Rusty_Hatchet', art: '20_Battle_Axe',     name: 'Rusty Hatchet', desc: 'Heavy chop',           ammo: Infinity, type: 'melee', range: 66, dmg: 10, knock: 0, fx: 'slash_orange', snd: 'axe',   carve: 0, minion: true },
  { id: 'M3_Bone_Scythe',  art: 'S14_Reaper_Scythe',  name: 'Bone Scythe',  desc: 'Long reach sweep',       ammo: Infinity, type: 'melee', range: 88, dmg: 8,  knock: 0,  fx: 'slash_cyan',   snd: 'slash', carve: 0, minion: true },
  { id: 'M4_Storm_Trident', art: 'S16_Storm_Trident', name: 'Storm Trident', desc: 'Longest reach stab',    ammo: Infinity, type: 'melee', range: 96, dmg: 9,  knock: 0,  fx: 'slash_cyan',   snd: 'slash', carve: 0, minion: true },
  { id: 'M5_Night_Fang',   art: 'S28_Night_Fang',     name: 'Night Fang',   desc: 'Short but vicious bite', ammo: Infinity, type: 'melee', range: 54, dmg: 12, knock: 0,  fx: 'slash_orange', snd: 'slash', carve: 0, minion: true },
];

// ===== DIVINE HEAL (Angelic Arm slot in the Profile, own Heal button in battle) =====
// Wear the "Divine Heal" item in the Profile's Angelic Arm slot (left of the shoes). In battle a Heal button appears next to the weapon button (HEAL_AMMO throws per match).
// Hold FIRE, release: the winged orb is lobbed like a grenade (flapping wings + sparkle trail) and bursts when it touches the ground or a robot. It never digs the terrain.
// Every robot inside the blast (DIVINE_RADIUS wide) SHARES the heal: the item's Heal stat (550, more when upgraded) / robots in the blast. A robot never goes above its max health.
const HEAL_AMMO = 3;                 // throws per battle at +0 (every upgrade of the Divine Heal adds +1 more throw)
const DIVINE_RADIUS = 140;           // how wide the heal blast reaches (world pixels)
const DIVINE_HEALS_ENEMIES = true;   // true = enemies standing in the blast get healed (and share the amount) too. false = only your own team
const DIVINE_BASE_HEAL = 105;
SIG_WMETA['H01_Divine_Heal'] = { muzzle: [171, 112], bbox: [72, 9, 268, 188] };
WEAPONS.push({ id: 'H01_Divine_Heal', name: 'Divine Heal', desc: 'Winged orb that heals everyone in the blast. The heal is split between all robots in range.', ammo: HEAL_AMMO, type: 'shot', charge: true, heal: true,
  proj: { spr: 'divine', ss: .3, speed: CHARGE_SPEED, g: WEAPON_G, wind: .15, dmg: 0, blast: DIVINE_RADIUS, healR: DIVINE_RADIUS, heal: DIVINE_BASE_HEAL, divine: true, hit: null, hs: 1, snd: 'wing', knock: 0, carve: 0, trail: false, life: 2400 } });
// effect sheets (picked up by loadCore in core.js, same format as assets/fx.json)
const DIVINE_FX = {
  divine_fly: { file: 'fx/divine_fly.webp', frames: 8, cols: 4, fw: 192, fh: 192, fps: 30, loop: true },
  divine_trail: { file: 'fx/divine_trail.webp', frames: 8, cols: 4, fw: 64, fh: 64, fps: 16, loop: false },
  divine_burst: { file: 'fx/divine_burst.webp', frames: 16, cols: 4, fw: 256, fh: 256, fps: 24, loop: false },
  divine_heal_on: { file: 'fx/divine_heal_on.webp', frames: 12, cols: 4, fw: 192, fh: 192, fps: 18, loop: false },
  // Azure (rare, light-blue) Divine Heal: same sheets recoloured light blue (used when the Azure Divine Heal is worn)
  divine_fly_b: { file: 'fx/divine_fly_azure.webp', frames: 8, cols: 4, fw: 192, fh: 192, fps: 30, loop: true },
  divine_trail_b: { file: 'fx/divine_trail_azure.webp', frames: 8, cols: 4, fw: 64, fh: 64, fps: 16, loop: false },
  divine_burst_b: { file: 'fx/divine_burst_azure.webp', frames: 16, cols: 4, fw: 256, fh: 256, fps: 24, loop: false },
  divine_heal_on_b: { file: 'fx/divine_heal_on_azure.webp', frames: 12, cols: 4, fw: 192, fh: 192, fps: 18, loop: false },
};

// ===== HEAL / TEAM HEAL (battle items) =====
// Two item slots in the Profile ("Item 1" / "Item 2") take the Shop items Heal (heals the robot that is playing) and Team Heal (heals every living robot of your team).
// In battle they are the two clickable boxes at the bottom, right of the weapon and Divine Heal buttons. One tap = instant heal + green sprite animation, it does not end your turn.
const POTION_PER_TURN = 1;   // how many of these items you may use in ONE turn (set 2 to allow both)
const POTION_FX = {          // sprite animation sheets (assets/fx), same format as assets/fx.json
  heal_pulse: { file: 'fx/heal_pulse.webp', frames: 12, cols: 4, fw: 192, fh: 192, fps: 18, loop: false },
  team_heal_wave: { file: 'fx/team_heal_wave.webp', frames: 16, cols: 4, fw: 256, fh: 256, fps: 20, loop: false },
};

// ===== FLY (jet-wings button in battle, right of Divine Heal) =====
// Tap the Fly button (UNLIMITED uses, never costs a turn), then hold FIRE: the power meter fills, release = your robot launches along the aim arrow
// (the yellow +angle arrow decides direction, the meter decides distance) and flies until it lands where it drops. No fall damage. The sea is still deadly.
// After the flight you are back on your normal weapon, with the turn timer still running, so you can fly and still shoot.
const FLY_ADVENTURE_ONLY = true;   // true = the Fly button only exists in Adventure battles. false = every battle where you play
const FLY_SPEED = [3.5, 13];       // launch speed for min..full charge (bigger = flies farther)
const FLY_G = 0.15;                // gravity while flying (the normal fall is 0.3, so it floats)
const FLY_FX = {                   // sprite animation sheets (assets/fx), same format as assets/fx.json
  fly_wings: { file: 'fx/fly_wings.webp', frames: 8, cols: 4, fw: 192, fh: 192, fps: 24, loop: true },   // flapping wings (wing joint at 120,110)
  fly_flame: { file: 'fx/fly_flame.webp', frames: 6, cols: 3, fw: 96, fh: 128, fps: 24, loop: true },     // jet flame under the feet (top-centre 48,8)
  fly_trail: { file: 'fx/fly_trail.webp', frames: 8, cols: 4, fw: 64, fh: 64, fps: 18, loop: false },     // sparkle puffs left in the air
  // WINGS gear (profile.js WING_ITEMS): one flapping sheet per look, same layout as fly_wings (8 frames, 4 columns, 192x192, wing joint at 120,110)
  wings_common: { file: 'fx/wings_common.png', frames: 8, cols: 4, fw: 192, fh: 192, fps: 24, loop: true },
  wings_rare: { file: 'fx/wings_rare.png', frames: 8, cols: 4, fw: 192, fh: 192, fps: 24, loop: true },
  wings_epic: { file: 'fx/wings_epic.png', frames: 8, cols: 4, fw: 192, fh: 192, fps: 24, loop: true },
  wings_legend: { file: 'fx/wings_legend.png', frames: 8, cols: 4, fw: 192, fh: 192, fps: 24, loop: true },
};

// ===== DOOM AXE (legendary Shop weapon + strong-boss loot): the thrown shot IS the axe picture, spinning slowly, with its own trail + hit effect per look =====
// 4 looks (+0..+9 steel, +10 gold, +11 crimson, +12 fire). Pictures: assets/weapons/S34_Doom_Axe(_t1..t3).png (held, drawn 1.3x bigger), assets/items/w_doom_axe(_t1..t3).png (shop icon),
// assets/proj/doom_axe_t0..t3.png (flying axe), assets/fx/axe_trail_t0..t3.png (trail), assets/fx/axe_hit_t0..t3.png (hit effect).
// Fixed stats (profile.js): Damage 290 (237 + legendary bonus 53), Vitality 5, Dexterity 25, Agility 3, Luck 25, Defense 10, Health 25. Price 6800.
// Boss loot: sits in the legendary weapon window by Damage, so only the stronger bosses (late maps / HARD / HEROIC) drop it.
const DOOM_AXE_HOLD = 1.3;   // how much bigger the axe is drawn in the robot's hands (1 = normal weapon size)
const DOOM_AXE_SPIN = 0.09;  // spin speed of the thrown axe (radians per frame, smaller = slower)
Object.assign(SIG_WMETA, { 'S34_Doom_Axe': { muzzle: [372, 128], bbox: [90, 20, 470, 236] } });
const AXE_FX = {};
for (let t = 0; t < 4; t++) {
  AXE_FX['axe_hit_t' + t] = { file: 'fx/axe_hit_t' + t + '.png', frames: 12, cols: 6, fw: 192, fh: 192, fps: 22, loop: false };
  AXE_FX['axe_trail_t' + t] = { file: 'fx/axe_trail_t' + t + '.png', frames: 8, cols: 4, fw: 128, fh: 128, fps: 16, loop: false };
}
WEAPONS.push(
  SHOPW('S34_Doom_Axe', 'Doom Axe', 'legendary', 'A legendary war axe. You throw the axe itself, spinning slowly, and it chops down with a huge hit.', { k: 'daxe', c1: '#ffffff', c2: '#c8ccd8' }, 237, 46, 'explosion_big', 1.2, 'axe', 6, false, { hitT: ['axe_hit_t0', 'axe_hit_t1', 'axe_hit_t2', 'axe_hit_t3'] }),
);
{ const dw = WEAPONS.find(w => w.id === 'S34_Doom_Axe'); dw.hold = DOOM_AXE_HOLD; dw.proj.trailFx = ['axe_trail_t0', 'axe_trail_t1', 'axe_trail_t2', 'axe_trail_t3']; }
