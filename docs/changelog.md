# Changelog

The history of the **product**, newest first (format and rules: `CLAUDE.md`, section 5).
The history of the **prompts** is in [`prompt-log.md`](prompt-log.md).
(The root `CHANGELOG.md` belongs to the Claude Code Game Studios framework, not to our game.)

---

### 2026-11-25 — Phase 2+3: 5 timed pickup buffs, Shell shield & Bomb cannon cards, and Volcano eruptions — Team — commit e8ae537
- **Type:** feature
- **What changed:** added 5 timed pickup buffs (`totalShield` invulnerability, `multiDirFire` 4-way firing, `lifesteal` hit/kill threshold healing, `thorns` contact/boss/ranged counter-damage, and `homing` projectile steering) plus an instant Heart pickup (`heal`, +1 full heart) and `+1` half-heart heal on every XP level-up (`healOnLevelUp`); implemented 2 new card abilities (`orbitShield` rotating shell barrier blocking bullets at L1-L2 and reflecting them with `+1.0s` lifetime at L3-L4, `bombCannon` lobbed ballistic explosives bypassing rocks and triggering coconut chain reactions); added environmental `hazards.js` system simulating timed volcano warning rings, falling rocks, and crater impacts; integrated minimal placeholder pixel art, right-edge HUD effect labels, and typed SimEvents (`totalShieldBlocked`, `shieldBlocked`, `shieldReflected`, `thornsHit`, `lifestealHeal`, `bombLaunched`, `volcanoStarted`, `volcanoRockImpact`) with 0 changes to map/tileset files.
- **Modules/files touched:** `src/shared/content/effects/` (`totalShield.js`, `multiDirFire.js`, `lifesteal.js`, `thorns.js`, `homing.js`, `heal.js`, `index.js`), `src/shared/content/abilities/` (`orbitShield.js`, `bombCannon.js`, `index.js`), `src/shared/sim/entities/` (`bomb.js`, `player.js`, `bullet.js`), `src/shared/sim/systems/` (`hazards.js`, `abilities.js`, `combat.js`, `damage.js`, `effects.js`, `xp.js`), `src/shared/sim/world.js`, `src/shared/config.js`, `src/client/art/` (`effectArt.js`, `cardArt.js`, `sprites.js`), `src/client/entities/` (`AbilityViews.js`, `PlayerView.js`), `src/client/systems/EffectsSystem.js`, `src/client/ui/Hud.js`, `tests/unit/`.
- **Why:** delivers rich combat variety, defensive tactical options, sustain for solo/multiplayer, and dynamic island hazard events parallel-safe for graphics/tilesets, audio, and multiplayer teams.
- **Evidence:** 15/15 test files and 161/161 unit tests passing (`tests/unit/sim/effects.test.js`, `abilities.test.js`, `hazards.test.js`), plus `vite build` production bundle verified via `npm run smoke`.
- **Prompt log:** [Phase 2+3 timed buffs, cards, and volcano hazards](prompt-log.md#gameplay-phase-23-timed-buffs-shieldbomb-cards-and-volcano-hazards--2026-11-25--team).

### 2026-11-25 — Phase 1: timed status effects, buff pickups, and attacker tracking — Team — commit 9a7091a
- **Type:** feature
- **What changed:** added a pure-simulation timed `statusEffects` system (`player.effects`) with `doubleXp` (2x XP for 9s) as the first buff, periodic buff pickups on walkable sand (`world.pickups`), right-edge HUD effect timer icons (buffs in gold, debuffs in reserved purple), and `?pickup` dev shortcut. Also added attacker `source` tracking to `damagePlayer()` and damage hooks on active effects.
- **Modules/files touched:** `src/shared/content/effects/`, `src/shared/sim/systems/` (effects, pickups, abilities, damage, xp, combat, enemies), `src/shared/sim/entities/` (player, pickup), `src/shared/` (world, config, protocol), `src/client/` (effectArt, PickupViews, Hud, BootScene, GameScene, EffectsSystem, devOptions, LocalTransport), `tests/unit/`.
- **Why:** builds the shared foundation required for Phase 2 solo buffs and Milestone 6 curses/sabotage credit without coupling game rules to Phaser.
- **Prompt log:** [Phase 1 status effects and pickups](prompt-log.md#gameplay-phase-1-timed-status-effects-and-buff-pickups--2026-11-25--team).

### 2026-11-25 — Final boss duel and victory — Esteban — commit 142a7cd
- **Type:** feature
- **What changed:** when the 5 minutes run out, all enemies and their bullets vanish and, after 3 quiet
  seconds, the Crab Emperor appears alone for a one-against-one duel with the clock stopped. Beating it
  wins ("YOU SURVIVED!", R to play again). Round 5 no longer has a Crab King; round 3 still does. Both
  bosses now cross water and crush the rocks they walk over. New dev option `?boss`.
- **Modules/files touched:** `src/shared/sim/systems/` (spawner, enemies, cards), `src/shared/sim/map.js`,
  `src/shared/content/enemies/` (boss, crabKing, crabEmperor), `src/client/` (HUD, art, map, effects).
- **Why:** the author asked for a duel with the final boss after the timer, not while it runs.
- **Evidence:** 134 unit tests pass; the whole sequence was played in the browser by a scripted player
  with extra hearts, screenshots in `production/qa/evidence/2026-11-25-16-4*`. In bot matches started at
  round 5 with 15 cards, 25 of 30 reached the boss and 22 beat it, in about 34 s. Played full matches:
  13 of 48 reached it with slightly lower boss health (600 instead of 800). The author then played it: "ok perfect".
- **Prompt log:** [Final boss duel](prompt-log.md#gameplay-final-boss-duel-after-the-timer--2026-11-25--esteban).

### 2026-11-25 — Late rounds one step softer — Esteban — commit 142a7cd
- **Type:** feature (balance)
- **What changed:** spawn rate grows by +0.3/s per round (was +0.4) and enemy health by +15% per round
  (was +20%). Round 1 is unchanged.
- **Modules/files touched:** `src/shared/config.js` (numbers only), docs.
- **Why:** after asking for round 5 to try it, the author asked for "a little bit less".
- **Evidence:** bots starting at round 5 with 15 cards: 41 of 60 survived before, 49 after; enemies on
  screen 18.9 before, 15.8 after. Full matches won: 5 of 40 before, 9 after.
- **Prompt log:** [A little bit less](prompt-log.md#balance-a-little-bit-less-in-round-5--2026-11-25--esteban).

### 2026-11-25 — A bit softer: gentler late rounds — Esteban — commit 142a7cd
- **Type:** feature (balance)
- **What changed:** the match stays at 5 minutes and round 1 stays busy, but difficulty climbs more
  slowly: spawn rate 1.6/s in round 1 (was 1.8) and +0.4/s per round (was +0.8), enemy health +20% per
  round (was +30%), and fewer skeletons and tikis in rounds 2 to 5.
- **Modules/files touched:** `src/shared/config.js` (numbers only), docs.
- **Why:** after playing the previous version, the author could not get past round 4.
- **Evidence:** 40 bot matches per setting. Bots reaching round 4: 4 before, 21 after. Winning: 0 before,
  5 after. Enemies on screen in round 1: 8.1 before, 6.9 after (1.7 in the original 10-minute version).
- **Prompt log:** [A bit softer](prompt-log.md#balance-a-bit-softer-round-4-was-a-wall--2026-11-25--esteban).

### 2026-11-25 — Shorter and harder: 5-minute match, more enemies — Esteban — commit 142a7cd
- **Type:** feature (balance)
- **What changed:** a match lasts 5 minutes instead of 10 (five 1-minute rounds). Enemies spawn three
  times as fast in round 1, skeletons appear from round 1 and tikis from round 2, and the Crab King
  arrives with 25 s left in rounds 3 and 5.
- **Modules/files touched:** `src/shared/config.js` (numbers only), a config sanity test, docs.
- **Why:** feedback after playing: the timer was too long, there were too few creatures and it was
  very easy.
- **Evidence:** bots played whole matches without graphics. Average enemies on screen per round
  (careful bot): before 1.7 / 3.8 / 8.4 / 9.4 / 9.5, after 8.4 / 14.1 / 14.9 / 16.9 / 20.8. Later
  rounds only count the bots still alive. Careful bots won 6 of 24 matches before and 1 of 10 after.
  Bots dodge worse than people, so these numbers compare settings; they do not predict a player.
- **Prompt log:** [Shorter and harder](prompt-log.md#balance-shorter-and-harder-after-playing--2026-11-25--esteban).

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
