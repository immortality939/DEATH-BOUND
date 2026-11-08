/* ARENA MAPS - separate from the Play maps (maps.js). The arena picks one of these at random for every fight.
   Each entry uses the same fields as maps.js:  id, name, desc, bg ('day' | 'sunset' | 'night'), img (PNG, 2800 x 1000, see-through sky).
   source: 'play'  = reuses a map picture that already exists in the app (assets/maps/<id>.png)
   source: 'arena' = a picture made only for the arena (put it in the app at assets/arena_maps/<id>.png)
   To add an arena-only map: paint the PNG, add it to the app, then add one line to ARENA_MAPS_OWN below and upload this file to GitHub.
   To use an arena map in Play too: add the same line to MAPS in maps.js (offline game). */
const ARENA_MAPS_OWN = [
  { id: 'colosseum', name: 'Colosseum Pit', desc: 'A sand ring with stone steps, two towers and floating slabs', bg: 'sunset', img: 'arena_maps/colosseum.png', thumb: 'assets/arena_maps/thumb_colosseum.png', source: 'arena' },
  { id: 'frozen', name: 'Frozen Lake', desc: 'A snowy ice field with a frozen pond and icy spikes', bg: 'day', img: 'arena_maps/frozen.png', thumb: 'assets/arena_maps/thumb_frozen.png', source: 'arena' },
  { id: 'jungle', name: 'Jungle Ruins', desc: 'Mossy hills, broken ruin pillars and vine islands', bg: 'day', img: 'arena_maps/jungle.png', thumb: 'assets/arena_maps/thumb_jungle.png', source: 'arena' },
  { id: 'lavarift', name: 'Lava Rift', desc: 'Two cliffs split by a deep rift with floating rocks', bg: 'night', img: 'arena_maps/lavarift.png', thumb: 'assets/arena_maps/thumb_lavarift.png', source: 'arena' },
  { id: 'dunes', name: 'Desert Dunes', desc: 'Big smooth sand dunes with a giant dune in the middle', bg: 'sunset', img: 'arena_maps/dunes.png', thumb: 'assets/arena_maps/thumb_dunes.png', source: 'arena' },
  { id: 'graveyard', name: 'Haunted Hollow', desc: 'Gloomy graveyard mound with crypts and floating tombs', bg: 'night', img: 'arena_maps/graveyard.png', thumb: 'assets/arena_maps/thumb_graveyard.png', source: 'arena' },
  { id: 'citadel', name: 'Floating Citadel', desc: 'Marble islands in the sky: two big keeps and a middle isle', bg: 'day', img: 'arena_maps/citadel.png', thumb: 'assets/arena_maps/thumb_citadel.png', source: 'arena' },
  { id: 'canyon', name: 'Red Canyon', desc: 'Layered red rock mesas around a deep V-shaped canyon', bg: 'sunset', img: 'arena_maps/canyon.png', thumb: 'assets/arena_maps/thumb_canyon.png', source: 'arena' },
  { id: 'sakura', name: 'Sakura Cliffs', desc: 'Tall cliffs with pink blossom grass and a low middle terrace', bg: 'day', img: 'arena_maps/sakura.png', thumb: 'assets/arena_maps/thumb_sakura.png', source: 'arena' },
  { id: 'spire', name: 'Crystal Spire', desc: 'A glowing crystal spire with a tunnel, floating crystal rocks', bg: 'night', img: 'arena_maps/spire.png', thumb: 'assets/arena_maps/thumb_spire.png', source: 'arena' },
];
// the arena picks from its own 10 pictures (assets/arena_maps/*.png inside the app)
const ARENA_MAPS_PLAY_IDS = [];   // the arena now has its own 10 maps, so no Play maps are mixed in
const ARENA_MAPS = ARENA_MAPS_OWN.concat(
  (typeof MAPS !== 'undefined' ? MAPS : []).filter(m => ARENA_MAPS_PLAY_IDS.includes(m.id)).map(m => Object.assign({ source: 'play' }, m))
);
const arenaRandomMap = () => ARENA_MAPS.length ? ARENA_MAPS[Math.floor(Math.random() * ARENA_MAPS.length)] : { id: 'random', name: 'Random map', desc: '', bg: 'day', img: '', source: 'play' };
