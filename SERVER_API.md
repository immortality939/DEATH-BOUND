# New server calls for the online client (Render + Supabase)

The client (`online_server.js`) already works without these: if the server answers 404 it keeps the
character on the phone (so the screens can be tested). To make the name and server real for other players, add:

All are POST with `Authorization: Bearer <token>` and JSON, like `/api/me`.

| Call | Body | Answer |
|---|---|---|
| `/api/servers` | `{}` | `{"servers":[{"id":1,"players":132,"mine":{"name":"Patrick","robot":3}|null}, ... id 1..5]}` |
| `/api/character` | `{"server":2,"robot":3,"name":"Patrick"}` | `{"player":{"name":"Patrick","robot":3,"server":2,"power":0}}` (error 409 `{"error":"Name already taken"}`) |
| `/api/enter` | `{"server":2}` | `{"player":{...same...}}` (404 if no character on that server) |

Rules to check on the server: server 1..5, robot 0..9, name 3-14 letters/numbers/space/_/- (trim, no double spaces),
name unique per server, one character per account per server.

## Supabase SQL
```sql
create table if not exists characters (
  id         bigint generated always as identity primary key,
  account_id uuid   not null,            -- same id your guest accounts use
  server     smallint not null check (server between 1 and 5),
  robot      smallint not null check (robot between 0 and 9),
  name       text not null check (char_length(name) between 3 and 14),
  power      integer not null default 0,
  created_at timestamptz not null default now(),
  unique (account_id, server),
  unique (server, lower(name))
);
```
`players` in `/api/servers` = `select server, count(*) from characters group by server`.

## Not built yet (waiting for your function list)
Arena, League, Hall of Fame, the 6 icons (bag, quests, rankings, friends, mail, settings) and live chat.
Chat now only echoes your own messages on the phone; Guild tab says "join a league".

## Arena (client: `arena_server.js`)
All are POST with `Authorization: Bearer <token>` and JSON, answers are `{ ... }`. **While these answer 404 the client runs in PRACTICE mode** (rooms, players and opponents are simulated on the phone, opponents are played by the computer), so the screens can be tested before the server exists.

A `player` in the answers = `{"name","robot":0-9,"level","power","league":null|"League name","ready":true|false,"host":true|false,"weapon":{"name","img"}|null}`.
A `room` = `{"id","num":26,"mode":"free"|"league","league":null|"name","state":"idle"|"searching"|"playing","players":[player x 1..4]}` (first player = owner / `host:true`).

| Call | Body | Answer / rule |
|---|---|---|
| `/api/arena/rooms` | `{server}` | `{rooms:[room]}` open rooms of that server (not `playing`) |
| `/api/arena/online` | `{server}` | `{players:[player]}` everybody online on that server (lobby list + Invite > World) |
| `/api/arena/create` | `{server,mode}` | `{room}`; `league` mode only if the player has a league (error 400) |
| `/api/arena/join` | `{server,room}` | `{room}`; errors: full (4), already searching, League Fight and not the same league |
| `/api/arena/leave` | `{room}` | `{}`; owner leaves -> next player becomes owner, empty room is deleted |
| `/api/arena/mode` | `{room,mode}` | `{room}` owner only |
| `/api/arena/ready` | `{room,ready}` | `{room}` guests only |
| `/api/arena/start` | `{room}` | `{room}` owner only, everybody ready; room goes `searching` and waits in a queue for another room with the SAME number of players (and same mode) |
| `/api/arena/cancel` | `{room}` | `{}` back to `idle` |
| `/api/arena/invite` | `{room,to}` | `{}` owner invites a player (friend list / world) |
| `/api/arena/poll` | `{server,room}` | every second: `{room}` (null = closed) and, when an opponent room was found, `{room, match:{opp:[player...]}}` (opp[0] = the other owner) |

League Fight: both rooms must be from different leagues and every member of one room from the same league. Free Fight: any players, similar level.
Chat in the room is still local (live chat server not built yet). `/api/me` should also return `level` and `league` in `player`.

The fight itself: after `match` the client starts the game with one robot per player (`per: 1`), teammates are allies, the map is random (normal maps + `arena_maps_server.js`). Real player-vs-player turns need a battle channel on the server (not built yet): until then the other players of a fight are played by the computer.
