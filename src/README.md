# [GAME TITLE] — code guide

Browser game: Phaser 3.90 + Vite. Design brief: [`design/game-brief.md`](../design/game-brief.md).

## Run it

Needs Node.js 18.18 or newer (developed on 26 LTS).

```
npm install        # once
npm run dev        # open http://localhost:5173
npm test           # unit tests (Vitest)
npm run smoke      # tests + production build into dist/
```

**Controls:** WASD / arrows move, Space rolls, E interacts (campfire, Salesman). The
slingshot fires by itself at the nearest enemy in range with a clear line of sight.
R restarts after you die or when time is up. In the Salesman's menu: 1 / 2 / 3 or the mouse.

**The run:** a chain of rooms. Kill every enemy to open the doors (1-3 of them; an icon shows
a fight or a break room behind each). After 8 fight rooms the next room is always a break room:
rest at the campfire or buy ONE thing from the Salesman (a mystery buff/curse roll, or gossip
about the other players), paying with XP. Difficulty grows with depth (fight rooms cleared).

In the game (dev mode only): **F9** saves a 3x screenshot to `production/qa/evidence/`.
Dev URL options (combine with `&`):

| Option | What it does |
|---|---|
| `?room=N` | start in fight room N (`?room=8` meets the Crab King) |
| `?depth=N` | start at difficulty depth N (same as `?room=N+1`) |
| `?break` | start in a break room (campfire + Salesman) |
| `?rich` | level 3 with a nearly full XP bar, to try the prices |
| `?effect=id,id` | start with effects, e.g. `?effect=sunburn` (ids in `shared/content/effects/`) |
| `?time=N` | N seconds already gone on the match clock (`?time=590`: time-up in 10 s) |
| `?fast` | 100 s match |
| `?tough` | 10 hearts |
| `?seed=N` | same rooms and spawns every run |
| `?qa=NAME` | scripted states for screenshots: `clear`, `shop`, `roll`, `gossip`, `crowd` |

Examples: `/?room=8&tough` (Crab King), `/?break&rich` (shop with enough XP),
`/?room=21&tough` (deep room with elites).

**Screenshots without a person playing:** with `npm run dev` running,
`node tools/qa/cdp-shot.mjs "<url>" out.png wait:3000 key:KeyE shot` plays the game in a
headless Chrome in real time, presses keys and saves the screen (steps are listed at the top of
the file). `page-shot.sh` is not usable for this game: its virtual time only runs a few frames.

## Where things live

| Folder | What | Phaser? |
|---|---|---|
| `shared/config.js` | **Every tuning value** (speeds, fire rate, roll, camera) | no |
| `shared/sim/` | The game rules: `world.js` runs one fixed tick; `systems/` change state; `entities/` define data | no |
| `shared/content/` | Data: tiles, enemies, `rooms/` (room templates), `effects/` (buffs and debuffs), arenas | no |
| `shared/rivals/` | `RivalStatusSource` (the other players, for the Salesman's gossip); `BotRivalSource` until milestone 5 | no |
| `shared/dialogue/` | `SalesmanLines` (what the Salesman says); fixed lines now, an LLM later | no |
| `shared/art/` | Procedural sprites as plain color grids (reused by the server for fallback skins) | no |
| `client/scenes/` | Phaser scenes: `BootScene` makes textures, `GameScene` runs the run of rooms | yes |
| `client/entities/` | Views that draw simulation entities (players, bullets, map) | yes |
| `client/systems/` | Input, camera, particles, integer scaling, draw order | yes |
| `client/network/` | `LocalTransport` runs the sim in the browser; milestone 5 adds the server version | yes |
| `client/art/` | Palette, pixel font, tileset and sprite generators (`roomArt.js`: Salesman, campfire, icons) | yes |
| `client/ui/` | `Hud` and `SalesmanMenu` | yes |

**The one rule:** game rules go in `shared/sim` and never import Phaser. The client
only reads the world and draws it. That lets the same code run on the server in
milestone 5 and be unit tested now.

## Frame flow

`GameScene.update` → `InputSystem.read()` → `LocalTransport.update()` runs fixed
60 Hz ticks of `stepWorld()` → views interpolate between the last two ticks →
`EffectsSystem` and `Hud` turn tick events (`shot`, `enemyDied`, `levelUp`…) into
particles, shake and banners.

One tick of `stepWorld()`: run (match clock, walk between rooms, room spawner:
waves and boss) → player movement + E interactions → enemy AI + separation +
contact damage → auto-aim + shooting → bullets → explosions → XP gems → remove
the dead → effects count down → room state (clear the room, open doors, step into a door).

Main systems of the room-based run (all in `shared/sim/systems/`):

| File | Owns |
|---|---|
| `rooms.js` | `world.run`: depth, fight counter, building a room from a template, doors, clearing, transitions, match clock |
| `roomSpawner.js` | enemy budget of a fight room, split into waves |
| `difficulty.js` | **every** depth formula: `difficultyAt(config, depth)` |
| `spawner.js` | creating one enemy (type, place, scaled stats) |
| `effects.js` | buffs/debuffs: apply, expire, work out `player.stats` (milestones 3 and 6 reuse it) |
| `breakRoom.js` | XP prices, resting, the Salesman's sale, `applyAction()` |

## Adding things

- **A tuning change:** edit `shared/config.js`. Nothing else.
- **A tile type:** add it to `shared/content/tiles.js` (character + collision
  rules), draw it in `client/art/tileArt.js`, map it in `client/entities/MapView.js`.
- **A room template:** add it to `shared/content/rooms/fightRooms.js` (or `breakRooms.js`)
  and to the list at the bottom of that file. Rules: every row the same length, 22-34 tiles
  wide and 14-22 tall, exactly one `P`, a 2-tile door socket on each edge (`NN` on the top
  row, `SS` on the bottom row, `W`/`E` on two rows of the left/right column) with sand right
  inside it, and every socket reachable from every other. Break rooms also need one `C`
  (campfire) and one `$` (Salesman). `tests/unit/sim/rooms.test.js` checks all of this for
  every template, so `npm test` tells you what is wrong.
- **A buff or debuff:** add an entry to `shared/content/effects/index.js` (stat modifiers
  only: `moveSpeed`, `fireRate`, `damage`, `maxHealth`, `pickupRadius`) and, if it needs a new
  icon, draw it in `client/art/roomArt.js` → `EFFECT_ICONS`.
- **A difficulty change:** `shared/config.js` → `difficulty`. The curve tests fail if a value
  ever gets easier with depth, breaks a cap, or jumps more than ~20% in one room.
- **A sprite:** pixel strings in `client/art/sprites.js` (`.` = transparent);
  outlines are added automatically. Purple is reserved for curses (`art/palette.js`).
- **An enemy:** (1) stats in `shared/config.js` → `enemies`; (2) a behaviour file in
  `shared/content/enemies/` with `update(world, enemy, target, stats, dt)` (helpers:
  `moveToward`, `keepDistance`, `fireFan`, `fireRing`; optional `onContact`, `onDeath`);
  (3) register it in `shared/content/enemies/index.js`; (4) pixel art in
  `client/art/enemyArt.js`; (5) add it to `difficulty.enemyWeightsByDepth` so it spawns.
  `tests/unit/art/art.test.js` fails if steps 2–4 are missing.
- **A rule:** a function in `shared/sim/systems/`, called from `stepWorld()`, with a
  test in `tests/unit/sim/`. All damage goes through `systems/damage.js`.
