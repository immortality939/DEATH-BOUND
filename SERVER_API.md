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
