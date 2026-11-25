# Changelog

The history of the **product**, newest first (format and rules: `CLAUDE.md`, section 5).
The history of the **prompts** is in [`prompt-log.md`](prompt-log.md).
(The root `CHANGELOG.md` belongs to the Claude Code Game Studios framework, not to our game.)

---

### 2026-11-25 — Milestone 3: level-up cards and 8 abilities — Esteban — commit cddb0f3
- **Type:** feature
- **What changed:** leveling up pauses the game and offers 3 random cards; pick with the mouse or
  1 / 2 / 3. Abilities: damage, fire rate, move speed, max hearts, multishot, piercing, orbiting
  coconuts, fire-trail roll. Picking one again makes it stronger, up to a maximum. Owned abilities
  show at the left of the HUD. New dev option `?cards=N`.
- **Modules/files touched:** `src/shared/content/abilities/`, `src/shared/sim/systems/` (abilities,
  cards, combat, movement), `src/client/ui/CardScreen.js`, `src/client/entities/AbilityViews.js`,
  `src/client/art/cardArt.js`, `tests/unit/`.
- **Why:** milestone 3 of the plan in `design/game-brief.md`.
- **Evidence:** 114 unit tests pass; cards picked by real clicks and keys in the browser, also after a
  resize; a fully maxed build ran at 60 FPS with up to 15 enemies. Screenshots:
  `production/qa/evidence/2026-11-25-*`. Balance has only been tried with a scripted player.
- **Prompt log:** [Level-up cards](prompt-log.md#gameplay-level-up-cards-ask-for-a-recap-then-approve--2026-11-25--esteban).

### 2026-11-25 — Corrections to earlier entries — Esteban — commit 9d4100e
- **Type:** docs
- **What changed:** three statements in the entries below are wrong. Old entries are never rewritten,
  so they are corrected here:
  - Milestone 2 says the control change "came from playtesting milestone 1". Nobody stated that.
  - Milestone 2's "155 enemies + 505 bullets at 60 FPS" was measured with one player, weapon damage
    set to 0 and the player made invulnerable, so that nothing died. It is not the 6-player target.
  - The framework entry says its hooks block commits of `.env` files. They do not: `.gitignore` keeps
    `.env` out of commits, and the framework's settings block reading and editing `.env` files.
- **Why:** the AI wrote them without a source.
- **Prompt log:** "Model limitations" in [prompt-log.md](prompt-log.md).

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
