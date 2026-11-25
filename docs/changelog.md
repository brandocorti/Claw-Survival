# Changelog

The history of the **product**, newest first (format and rules: `CLAUDE.md`, section 5).
The history of the **prompts** is in [`prompt-log.md`](prompt-log.md).
(The root `CHANGELOG.md` belongs to the Claude Code Game Studios framework, not to our game.)

---

### 2026-11-25 — Room-based runs, break rooms and the Salesman — Alvaro — commit pending
- **Type:** feature
- **What changed:** the PvE is now a chain of small rooms instead of 5 timed rounds on one big
  beach. A fight room keeps its doors locked until every enemy is dead ("ROOM CLEARED", leftover
  XP flies to you); then 1-3 doors open with an icon for what is behind each (fight or break).
  The deeper you go, the more enemies and waves, the stronger and faster they are, the harder
  the mix, plus gold-outlined elites from room 7 and a Crab King in every 8th fight room, right
  before a mandatory break room. Break rooms: rest at the campfire for XP, and the Salesman
  (new character) sells ONE thing per visit: a mystery roll (buff or purple curse) or gossip on
  the other players (3 simulated rivals for now). New HUD: ROOM n, DANGER RISES, active effect
  icons, E prompts, a time-up screen. Controls: E interacts, 1/2/3 in the Salesman's menu.
- **Modules/files touched:** `src/shared/sim/systems/` (new `rooms.js`, `roomSpawner.js`,
  `difficulty.js`, `effects.js`, `breakRoom.js`; `spawner.js` rewritten), `src/shared/content/`
  (new `rooms/`, `effects/`; door and campfire tiles), `src/shared/rivals/`, `src/shared/dialogue/`,
  `src/shared/config.js` (`rounds` replaced by `rooms`, `difficulty`, `breakRoom`, `salesman`,
  `rivals`), `src/client/` (room art, `SalesmanMenu`, HUD, camera, map view, dev options),
  `tests/unit/` (78 → 169 tests; the timed-round tests were rewritten for rooms, see the header
  of `spawner.test.js`), `tools/qa/cdp-shot.mjs` (real-time screenshots), docs.
- **Why:** shorter, readable fights with a choice after each one (which door), a place to spend
  XP, and a first sabotage-adjacent mechanic (gossip) before multiplayer exists. Buffs/debuffs
  and the rival source are built so milestones 3, 5 and 6 can reuse them.
- **Fixes found on the way:** XP gems pulled from far away orbited the player forever (gem
  magnet now steers the velocity); a "+1 max heart" refill also triggered when a curse ended.
- **Evidence:** 169 unit tests pass (`npm run smoke`). Screenshots in
  `production/qa/evidence/rooms-and-salesman/` (locked room, same room cleared with door icons,
  Salesman menu, gossip, buff and curse rolls, campfire rest, Crab King, room 21 with elites,
  DANGER RISES, time-up). 60 FPS in a room crowded with 150 spawned enemies; the simulation
  takes 0.11 ms per tick with 150 enemies and ~500 bullets.
- **Prompt log:** [Room-based runs, break rooms and the Salesman](prompt-log.md#core-loop-room-based-runs-break-rooms-and-the-salesman--2026-11-25--alvaro).

### 2026-11-19 — Milestone 2: enemies, rounds, XP, HUD, auto-aim — Esteban — commit 57e1af1
- **Type:** feature
- **What changed:** the game is now playable solo PvE. Survive a 10-minute match of 5 rounds
  against crabs (sideways charges), coconuts (explode on death and set off chain reactions),
  skeleton pirates (aimed shots), tiki spirits (rotating bullet rings) and the Crab King
  mini-boss (rounds 3 and 5). Enemies drop XP gems; you level up. The HUD has hearts, XP bar,
  round, timer, kills and a boss bar, plus a game-over screen (R to retry). The slingshot now
  fires automatically (WASD + Space only).
- **Modules/files touched:** `src/shared/sim/systems/` (combat, damage, enemies, spawner, xp),
  `src/shared/sim/flowField.js`, `src/shared/content/enemies/`, `src/shared/content/arenas/beach.js`,
  `src/client/` (enemy art, views, HUD, effects), `tests/unit/`.
- **Why:** milestone 2 of the plan in `design/game-brief.md`. The control change came from
  playtesting milestone 1.
- **Evidence:** 78 unit tests pass; 155 enemies + 505 bullets at 60 FPS (simulation 0.78 ms per
  frame); screenshots in `production/qa/evidence/2026-11-19-*`.
- **Prompt log:** [Survivors-style controls](prompt-log.md#gameplay-survivors-style-controls-auto-fire-instead-of-mouse-aiming--2026-11-18--esteban).

### 2026-11-18 — Milestone 1: project setup and test arena — Esteban — commit 57e1af1
- **Type:** feature
- **What changed:** first runnable version. A pixel-perfect 480×270 canvas (whole-number
  scaling, sharp pixels on any screen), a beach arena with cliffs, rocks and water, and a
  castaway who walks, aims, shoots a slingshot and dodge-rolls. All art is placeholder pixel
  art drawn in code.
- **Modules/files touched:** `package.json`, `vite.config.js`, `src/shared/` (config, simulation,
  map), `src/client/` (Phaser scenes, art, input, camera), `tests/unit/`.
- **Why:** milestone 1 of the plan. The rules live in `src/shared` (no Phaser) so the
  multiplayer server in milestone 5 can run the same code.
- **Note:** milestones 1 and 2 were pushed to GitHub together in one commit, so they share a hash.
- **Prompt log:** [Initial game spec](prompt-log.md#whole-game-initial-game-spec-and-build-plan--2026-11-18--esteban),
  [Write code to files](prompt-log.md#workflow-write-code-to-files-not-to-the-chat--2026-11-18--esteban).

### 2026-11-18 — Add the Claude Code Game Studios framework — Esteban — commit 1507d10
- **Type:** docs / tooling
- **What changed:** added the open-source framework our Claude Code sessions use (`.claude/`
  agents, skills, hooks, rules). The team's `CLAUDE.md` text is unchanged; the framework's
  settings are appended as its section 10.
- **Modules/files touched:** `.claude/`, `CLAUDE.md`, `licenses/`, framework docs.
- **Why:** gives the AI agent a structured workflow (plans, tests, evidence screenshots) and
  safety hooks (for example it blocks `rm -rf` and commits of `.env` files).
- **Prompt log:** —
