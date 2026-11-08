/* ARENA MAPS - separate from the Play maps (maps.js). The arena picks one of these at random for every fight.
   Each entry uses the same fields as maps.js:  id, name, desc, bg ('day' | 'sunset' | 'night'), img (PNG, 2800 x 1000, see-through sky).
   source: 'play'  = reuses a map picture that already exists in the app (assets/maps/<id>.png)
   source: 'arena' = a picture made only for the arena (put it in the app at assets/arena_maps/<id>.png)
   To add an arena-only map: paint the PNG, add it to the app, then add one line to ARENA_MAPS_OWN below and upload this file to GitHub.
   To use an arena map in Play too: add the same line to MAPS in maps.js (offline game). */
const ARENA_MAPS_OWN = [
  // { id: 'colosseum', name: 'Colosseum Pit', desc: 'A flat sand ring with two stone towers', bg: 'sunset', img: 'arena_maps/colosseum.png', source: 'arena' },
];
// until you add arena-only pictures, the arena rotates through these Play maps
const ARENA_MAPS_PLAY_IDS = ['hills', 'alps', 'twinpeaks', 'mesas', 'isles', 'volcano'];
const ARENA_MAPS = ARENA_MAPS_OWN.concat(
  (typeof MAPS !== 'undefined' ? MAPS : []).filter(m => ARENA_MAPS_PLAY_IDS.includes(m.id)).map(m => Object.assign({ source: 'play' }, m))
);
const arenaRandomMap = () => ARENA_MAPS.length ? ARENA_MAPS[Math.floor(Math.random() * ARENA_MAPS.length)] : { id: 'random', name: 'Random map', desc: '', bg: 'day', img: '', source: 'play' };
