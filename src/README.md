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

**Controls:** WASD / arrows move, Space rolls, mouse or 1 / 2 / 3 picks level-up cards. The slingshot fires by itself at the
nearest enemy in range with a clear line of sight. R restarts after you die.

In the game (dev mode only): **F9** saves a 3x screenshot to `production/qa/evidence/`.
Dev URL options (combine with `&`): `?fast` (100 s match, 20 s rounds),
`?round=3` (start at round 3), `?boss` (straight to the final boss), `?tough` (10 hearts), `?cards=5` (start with 5 cards to pick), `?seed=42` (same spawns every run).
Example: `http://localhost:5173/?fast&round=3&tough` shows the Crab King within seconds.

## Where things live

| Folder | What | Phaser? |
|---|---|---|
| `shared/config.js` | **Every tuning value** (speeds, fire rate, roll, camera) | no |
| `shared/sim/` | The game rules: `world.js` runs one fixed tick; `systems/` change state; `entities/` define data | no |
| `shared/content/` | One file per arena / tile type (later: enemy, ability, perk) | no |
| `shared/art/` | Procedural sprites as plain color grids (reused by the server for fallback skins) | no |
| `client/scenes/` | Phaser scenes: `BootScene` makes textures, `GameScene` runs the arena | yes |
| `client/entities/` | Views that draw simulation entities (players, bullets, map) | yes |
| `client/systems/` | Input, camera, particles, integer scaling, draw order | yes |
| `client/network/` | `LocalTransport` runs the sim in the browser; milestone 5 adds the server version | yes |
| `client/art/` | Palette, pixel font, tileset and sprite generators | yes |

**The one rule:** game rules go in `shared/sim` and never import Phaser. The client
only reads the world and draws it. That lets the same code run on the server in
milestone 5 and be unit tested now.

## Frame flow

`GameScene.update` → `InputSystem.read()` → `LocalTransport.update()` runs fixed
60 Hz ticks of `stepWorld()` → views interpolate between the last two ticks →
`EffectsSystem` and `Hud` turn tick events (`shot`, `enemyDied`, `levelUp`…) into
particles, shake and banners.

One tick of `stepWorld()`: shop and level-up cards (an open one stops the tick here) → spawner (match clock, rounds, waves, boss) → player
movement → enemy AI + separation + contact damage → abilities (orbiting coconuts, fire) → auto-aim + shooting →
bullets → explosions → XP gems → remove the dead.

## Adding things

- **A tuning change:** edit `shared/config.js`. Nothing else.
- **A tile type:** add it to `shared/content/tiles.js` (character + collision
  rules), draw it in `client/art/tileArt.js`, map it in `client/entities/MapView.js`.
- **An arena:** copy `shared/content/arenas/beach.js`; every row the same length,
  exactly one `P`.
- **A sprite:** pixel strings in `client/art/sprites.js` (`.` = transparent);
  outlines are added automatically. Purple is reserved for curses (`art/palette.js`).
- **An enemy:** (1) stats in `shared/config.js` → `enemies`; (2) a behaviour file in
  `shared/content/enemies/` with `update(world, enemy, target, stats, dt)` (helpers:
  `moveToward`, `keepDistance`, `fireFan`, `fireRing`; optional `onContact`, `onDeath`);
  (3) register it in `shared/content/enemies/index.js`; (4) pixel art in
  `client/art/enemyArt.js`; (5) add it to `rounds.enemyWeights` so it spawns.
  `tests/unit/art/art.test.js` fails if steps 2–4 are missing.
- **An ability card:** the 4 steps are at the top of `shared/content/abilities/index.js`
  (numbers in `config.js`, code, registration, icon). `art.test.js` fails if one is missing or
  the text does not fit the card.
- **Music:** files in `assets/audio/music/`, loaded in `client/audio/MusicPlayer.js`, chosen in
  `client/audio/musicFor.js`. Record the generator and licence in `assets/audio/README.md`.
- **A setting:** default in `client/settings.js`, a row in `client/ui/SettingsPanel.js`.
- **A rule:** a function in `shared/sim/systems/`, called from `stepWorld()`, with a
  test in `tests/unit/sim/`. All damage goes through `systems/damage.js`.
