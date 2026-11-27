# Changelog

The history of the **product**, newest first (format and rules: `CLAUDE.md`, section 5).
The history of the **prompts** is in [`prompt-log.md`](prompt-log.md).
(The root `CHANGELOG.md` belongs to the Claude Code Game Studios framework, not to our game.)

---

### 2026-11-27 — Boss entrance animation, second version — alvarofeher — commit (pending)
- **Type:** assets
- **What changed:** the boss entrance now uses the second generated version of the animation, which has a new,
  more muscular and menacing Crab Emperor portrait. Same timing, banner and titles; the game still freezes while it plays.
- **Modules/files touched:** `assets/animations/crab_intro_animation 3/` (new), `src/client/ui/BossIntroCutscene.js`
  (reads the new frames). The first version in `assets/animations/crab_intro_animation/` is no longer used.
- **Why:** the team preferred the new portrait.
- **Evidence:** `production/qa/evidence/2026-11-27-15-29-*_new-boss-intro-*.png`.
- **Prompt log:** [Boss entrance animation, second version](prompt-log.md#art-boss-entrance-animation-second-version--2026-11-27--alvarofeher).

### 2026-11-27 — Generated entrance animation for the Crab Emperor — alvarofeher — commit c4217a1
- **Type:** feature, assets
- **What changed:** when the final boss appears, a generated 3-second animation (portrait, banner, "CRAB EMPEROR -
  TYRANT OF THE TIDE") plays over the game. The game is frozen while it plays and the boss music keeps running.
  After the last frame it fades out (0.3 s) and play resumes. It replaces the old letterbox name card.
- **Modules/files touched:** `assets/animations/crab_intro_animation/` (new: 90 overlay frames, a preview set with
  the game baked in, and separate layers), `src/client/ui/BossIntroCutscene.js` (new),
  `src/client/scenes/GameScene.js`, `src/client/scenes/BootScene.js` (loads the frames), `src/client/gfx/boss.js`
  (old card removed), `src/shared/config.js` (`finalBoss.introCutscene`), `tests/unit/ui/bossIntro.test.js`.
- **Why:** a stronger boss entrance, made with a generated animation instead of code-drawn shapes.
- **Evidence:** `production/qa/evidence/2026-11-27-15-18-*_boss-intro-*.png` (during and after). The game time
  stayed at 3.017 s for the whole animation and moved on once it ended.
- **Prompt log:** [Boss entrance animation](prompt-log.md#art-generated-entrance-animation-for-the-crab-emperor--2026-11-27--alvarofeher).

### 2026-11-27 — Comic "HIT!" pop-up on player damage — alvarofeher — commit ea6cee5
- **Type:** feature
- **What changed:** when a player takes damage, a bold white comic-style "HIT!" pops up next to them with a
  random tilt, then floats up and fades after about half a second.
- **Modules/files touched:** `src/client/art/hitText.js` (new), `src/client/systems/EffectsSystem.js`,
  `src/client/scenes/BootScene.js`, `src/client/scenes/GameScene.js`, `src/shared/config.js`
  (`display.hitText` timings and offsets), `tests/unit/art/hitText.test.js`.
- **Why:** hits were easy to miss among the sparks and screen shake.
- **Evidence:** `production/qa/evidence/2026-11-27-14-53-3*_hit-text-*.png` (the `14-52-*` shots are the first attempt).
- **Prompt log:** [Comic "HIT!" pop-up](prompt-log.md#juice-comic-hit-pop-up-when-the-hero-is-hit--2026-11-27--alvarofeher).

### 2026-11-25 — Graphics upgrade M3: the hero — Esteban — commit 80e5856
- **Type:** feature, assets
- **What changed:** redrawn hero (18×23, teal vest) with 4-frame walks, idle, blink, hurt face, tuck roll and
  slingshot pull; white flash on a hit and a light flicker while invulnerable. Four example skins. The salesman
  matches the new size.
- **Modules/files touched:** `src/shared/art/hero.js`, `src/client/gfx/hero.js`, `src/client/entities/PlayerView.js`, `src/client/art/sprites.js`.
- **Why:** H1 to H5 of the graphics prompt.
- **Evidence:** `production/qa/evidence/*_gfx-m3-hero-sheet.png`.
- **Prompt log:** [Graphics upgrade, M1 to M4](prompt-log.md#art-graphics-upgrade-m1-to-m4--2026-11-25--esteban).

### 2026-11-25 — Graphics upgrade M2: the Crab Emperor — Esteban — commit 80e5856
- **Type:** feature, assets
- **What changed:** the final boss is an animated rig whose eyes follow you, with a warning on the ground for
  each attack (cone, lane, circle and curved arms for the spiral), an entrance card, cracks below half health,
  a death sequence that leaves its crown, and a framed health bar. Its radius grew from 15 to 22 to match the
  art, and the victory screen waits for the death sequence. No aim brackets on bosses.
- **Modules/files touched:** `src/shared/art/emperor.js`, `src/client/gfx/boss.js`, `src/client/ui/Hud.js`,
  `src/client/entities/EnemyViews.js`, `src/shared/config.js`, `src/shared/sim/systems/`.
- **Why:** V1 to V5 of the graphics prompt.
- **Evidence:** `production/qa/evidence/*_gfx-m2-*.png`. Bots starting at round 5: 25 of 34 beat it with either radius.
- **Prompt log:** [Graphics upgrade, M1 to M4](prompt-log.md#art-graphics-upgrade-m1-to-m4--2026-11-25--esteban).

### 2026-11-25 — Graphics upgrade M1: environment — Esteban — commit 80e5856
- **Type:** feature, assets
- **What changed:** painted ground with rounded, animated shores and tall cliffs; palms, shipwreck, crates and
  barrels; warm light, vignette, glows and cloud shadows; squash, debris that stays, scorch marks, footprints and
  hit-stop; framed HUD with level pips and a ring under the player. The wreck, crates, barrels and palm trunks
  block walking (not shots, spirits or bosses). The salesman moved next to the wreck. Bullets are drawn above props.
- **Modules/files touched:** `src/client/gfx/`, `src/shared/sim/props.js`, `src/shared/sim/map.js`,
  `src/shared/sim/flowField.js`, views, HUD.
- **Why:** E1 to E5 of the graphics prompt.
- **Evidence:** 195 unit tests pass. 60 FPS with 154 enemies and 782 enemy bullets (one player, weapon damage 0
  and invulnerable so nothing died). Bots, 60 full matches: 24 wins, 18 before. Before/after:
  `production/qa/evidence/*_gfx-before-f900.png`, `*_gfx-after-f900.png`. Not yet played by a person.
- **Prompt log:** [Graphics upgrade, M1 to M4](prompt-log.md#art-graphics-upgrade-m1-to-m4--2026-11-25--esteban).

### 2026-11-25 — Graphics upgrade M0: set-up — Esteban — commit 80e5856
- **Type:** refactor
- **What changed:** nothing visible. Graphics flags (all on; `?classic` turns them off), shared noise helpers,
  and dev capture options `?capture`, `?script` and `?bosshp=N`. The prompt and its references are in
  `improved_graphics/` (without the 30 MB of videos).
- **Modules/files touched:** `src/client/gfx/`, `src/client/main.js`, `src/client/scenes/`, `src/shared/sim/hash.js`.
- **Why:** first milestone of the graphics prompt. Status: [`graphics-upgrade.md`](graphics-upgrade.md).
- **Evidence:** two captures of the same frame are identical pixel for pixel.
- **Prompt log:** [Graphics upgrade, M0](prompt-log.md#art-graphics-upgrade-m0--2026-11-25--esteban).

### 2026-11-25 — Salesman, money, hearts, start menu and music — Esteban — commit 3b93e08
- **Type:** feature, assets
- **What changed:** enemies sometimes drop coins and, rarely, hearts. A salesman, marked by a coin over
  his head and a gold dot on the new minimap, is talked to with E: he shows every player's status and
  sells one random ability per round (10 coins, 5 more each time). He leaves when the waves end. New
  start menu, settings (volume, sound, shake, map, FPS, full screen; remembered), pause menu (Esc) and
  music: Island Pixel Waves (menu, pause, salesman, victory), Under the Canopy (rounds) and Claws of the
  Mangrove (final boss). Drops over water now land on reachable ground.
- **Modules/files touched:** `src/shared/sim/systems/` (pickups, shop, damage, xp, cards), `src/shared/sim/map.js`,
  `src/client/` (menu scene, pause, settings, shop panel, minimap, music), `assets/audio/`.
- **Why:** requested by the author, with three songs.
- **Evidence:** 168 unit tests pass; menus, shop, pause and music checked in the browser; screenshots
  `production/qa/evidence/2026-11-25-17-*`. Balance, 60 bot matches per setting: a first guess (12% coins,
  1.2% hearts) took wins from 7 to 34 of 40, so rates were cut to 4.5% and 0.2%, and spawn growth raised
  from 0.3 to 0.36 per round. Bots reaching round 4: 36 before, 35 after; winning: 13 before, 18 after.
  Complete runs average 41 coins, 2 hearts and 2 purchases. Not yet judged by a person.
- **Known limits:** with no multiplayer yet (milestone 5), the status list only shows you.
- **Prompt log:** [Salesman, money and menu](prompt-log.md#gameplay-salesman-money-hearts-menu-and-music--2026-11-25--esteban).

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
