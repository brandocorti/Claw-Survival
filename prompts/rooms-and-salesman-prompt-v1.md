# Change request: room-based runs, break rooms and the Salesman (v1)

You are the lead game developer on our student team project (the island roguelike in this
repository). Milestones 1 and 2 are done and playable. This is a **change request** to the
core loop. Read it fully, then follow the "How to reply" section at the end. **Do not write
code until I say "go".**

==================================================
1. CONTEXT YOU MUST RESPECT
==================================================

- Read `src/README.md`, `design/game-brief.md` and `src/shared/config.js` first.
- The architecture rule still holds: game rules live in `src/shared/sim` (plain JS, no Phaser),
  so the same code can run on the server in milestone 5. The client only reads the world and
  draws it. Every tuning value goes in `src/shared/config.js`.
- Today the PvE runs on one big arena (`content/arenas/beach.js`, 56×36 tiles) with a timer
  split into 5 rounds of continuous spawning (`sim/systems/spawner.js`). **This change replaces
  that model with rooms.**
- Two things this change depends on **do not exist yet**:
  - Buffs/debuffs (abilities and bad perks are milestones 3 and 6).
  - Other players (multiplayer is milestone 5).
  Section 5 says how to handle each. Don't build the full systems from those milestones. Build
  only the minimal, reusable pieces described there.
- The game must stay runnable after every step, and all existing tests must keep passing. If a
  test no longer makes sense (for example the timed-rounds tests), rewrite it for the new rules
  and say which tests you changed and why. Never delete a test silently.

==================================================
2. THE FEATURE (WHAT THE PLAYER EXPERIENCES)
==================================================

A run is now a chain of rooms:

1. The player starts in a **fight room**. The exits are **blocked**.
2. Enemies spawn inside the room. When **every enemy is dead**, the room is cleared: a
   "ROOM CLEARED" banner shows, the leftover XP gems fly to the player, and the **doors unlock**.
3. A cleared room has **1, 2 or 3 doors** to the next room. The player walks through one.
4. Each door leads to a fight room, or, with a **small chance**, to a **break room**.
5. After **8 fight rooms in a row** without a break, the next room is a **mandatory break room**:
   every door leads there.
6. In a break room the player can spend **XP** to recover health, and can talk to the
   **Salesman**.

==================================================
3. DETAILED RULES (DEFAULTS: ALL CONFIGURABLE)
==================================================

Put every number below in `config.js` under a new `rooms` / `breakRoom` / `salesman` section.
The values are starting points. Change them if playtesting shows they are wrong, and say so.

Rooms and layout:
- Fight rooms are **smaller than the current arena**: about 22–34 tiles wide and 14–22 tiles
  tall. The viewport is 30×17 tiles, so some rooms fit on screen and some scroll a little.
  If a room is smaller than the screen, center the camera on it.
- Rooms are **hand-made ASCII templates** in `src/shared/content/rooms/`, in the same format as
  `beach.js`. Make at least 5 fight templates and 1 break template.
- Add door tiles on the edges of the template (for example `N`, `E`, `S`, `W` sockets). One
  socket is the entrance and the rest are possible exits. The generator picks 1–3 exits and walls
  off the unused sockets. A locked door blocks movement and bullets. Open, it is walkable.
- Example template (few-shot, adapt it freely):
  ```
  ##########NN##########
  #....................#
  #..o.............o...#
  W....................E
  W.........P..........E
  #.......~~~..........#
  #..o....~~~.......o..#
  #....................#
  ##########SS##########
  ```
- Exit count weights: `{ 1: 0.25, 2: 0.45, 3: 0.30 }`.

Door choice:
- Each exit rolls its destination on its own: break room with chance `breakChance = 0.12`,
  otherwise a fight room. **A break room never comes directly after another break room.**
- When the fight-room counter reaches `mandatoryBreakAfter = 8`, every exit leads to a break
  room. The counter resets to 0 after any break room.
- Show what is behind each door with an icon above it when it unlocks (crossed swords or
  campfire). Add a config flag `revealDoorTypes: true` so we can try hidden doors later.
- Walking into an open door: short fade, the next room loads, and the player appears at the
  matching entrance with ~1 s of spawn protection.

Enemies per room:
- Each fight room has a fixed **enemy budget**, not continuous spawning. The budget spawns in
  waves inside the room, never closer than ~4 tiles to the player. Keep the existing sand-swirl
  warning and reuse `pickEnemyType`.
- The Crab King appears in the **8th fight room** (the one before the mandatory break) and in
  every 8th fight room after that.
- The room is cleared when the budget is spent and no enemy is alive.

Difficulty curve (the deeper you go, the harder it gets):
- Difficulty depends on **depth** = the number of fight rooms cleared so far in this run. Break
  rooms don't count. Write every formula in one pure module, `sim/systems/difficulty.js`, with
  a function `difficultyAt(config, depth)` that returns all the values below. The spawner and
  the enemy factory read from it, never from their own formulas.
- **More enemies:** `budget = min(maxBudget, baseEnemies + enemiesPerRoom * depth)`, defaults
  8, 3 and 60.
- **More waves:** `waves = min(maxWaves, 2 + floor(depth / 4))`, max 5. Later waves also come
  faster: the gap between waves shrinks from 4 s to a minimum of 1.5 s.
- **Stronger enemies:**
  - health × `1 + healthPerDepth * depth` (default 0.12), replacing the per-round `healthScale`.
  - contact and bullet damage × `1 + damagePerDepth * depth` (default 0.05). Damage is in half
    hearts, so round it and never let it go below the base value.
  - speed × `min(maxSpeedScale, 1 + speedPerDepth * depth)` (defaults 0.02 and 1.3), so
    enemies stay dodgeable.
- **Harder enemy mix:** `rounds.enemyWeights` becomes `difficulty.enemyWeightsByDepth`: a list
  of `{ fromDepth, weights }`. Crabs and coconuts come first, then skeletons, then tiki spirits.
  Each Crab King after the first gets the same health and damage scaling.
- **Elite enemies (from depth 6):** a chance per spawn (default `5% + 1% per depth`, capped at
  25%) to spawn an elite version with ×2 health, ×1.5 XP and a gold outline. Gold, not purple:
  purple is for curses.
- **Rewards keep pace:** enemy XP × `1 + xpPerDepth * depth` (default 0.08). Stronger rooms
  must still pay for the break-room prices.
- **No difficulty spikes:** a new value may be at most ~20% harder than the room before (check
  it in a test), except Crab King rooms.
- Show the depth on the HUD ("ROOM 7") and briefly flash "DANGER RISES" every 4 depths.
- Add a dev URL option `?depth=N` to start at any difficulty, and print a short table of
  `difficultyAt(0..24)` in your final reply so we can check the curve.

The match timer:
- Keep `match.durationSeconds` as the global PvE clock. When it runs out, PvE ends (the final
  PvP comes in milestone 8). The 5 timed rounds are removed. The HUD shows "ROOM 7" where
  "ROUND 3" was. Replace the dev URL option `?round=N` with `?room=N` and add `?break` (start
  in a break room) for testing.

Break room:
- No enemies. It contains a **campfire** (rest) and the **Salesman** (section 4).
- **Rest at the campfire (E):** recover `healAmount = 2` half hearts (1 heart) for XP. You can
  rest more than once while you have the XP and are missing health.
- **XP as currency:** prices are a **fraction of the current XP bar**, so they scale with level:
  `cost = ceil(priceFraction * xpToNextLevel(level))`. Defaults: rest 0.4, roll 0.5, intel 0.3.
  The XP is taken from the progress on the current bar. **Spending never removes a level.** If
  the player can't afford something, show the option greyed out with its price.
- Break-room doors are unlocked from the start.

==================================================
4. THE SALESMAN (NEW CHARACTER)
==================================================

- A chibi wandering merchant who lives in break rooms. Big backpack full of junk, a straw hat, a
  shifty smile. Pixel art drawn in code like the other sprites. **No purple on him**: purple is
  reserved for curses.
- Walk up to him and press **E** to open his menu (mouse or keys 1/2/3, like the level-up cards).
  The game pauses while the menu is open.
- **One purchase per visit.** He sells exactly **one** of these per break room:
  1. **Mystery roll:** a random buff **or** a random debuff on yourself. It's a gamble. Odds are
     in config, default 65% buff / 35% debuff. Show the result as a card that flips over.
     Debuffs are purple, as the art direction requires.
  2. **Gossip (intel):** a report on **every other player**: their **level**, **current room**,
     **active buffs** and **active debuffs**.
  After buying one, the other option is locked until the next break room, and he says something
  in character.
- **Dialogue:** short lines (max ~12 words) for greeting, the sale, a refusal (no XP) and
  goodbye. Write them through an interface `SalesmanLines` with a fixed-line implementation now.
  A later GenAI step will add an LLM-backed implementation (same pattern as `MessageGenerator`
  in the spec: async, with fallback). Style examples:
  - "Psst. Castaway. I sell luck, gossip, and slightly used coconuts."
  - "Maria? Level 6, room 11. And cursed. Heh."
  - "No XP, no deal. The sea doesn't give credit."

==================================================
5. HOW TO HANDLE WHAT DOES NOT EXIST YET
==================================================

Buffs and debuffs (minimal version, reused later by milestones 3 and 6):
- Create a small, data-driven **status effect** module: `shared/content/effects/` holds the
  definitions and `shared/sim/systems/effects.js` applies them. Each effect has an id, a kind
  (`buff` | `debuff`), a name, a short description, a duration (seconds or `rooms`), and stat
  modifiers (move speed, fire rate, damage, max health, pickup radius…).
- Start with 4 buffs and 4 debuffs that only change existing stats, for example: +20% fire
  rate, +15% move speed, +1 max heart, +50% pickup radius / −20% move speed, −25% fire rate,
  −1 heart until the next break, smaller pickup radius. No new mechanics.
- Show active effects as small icons in the HUD (debuffs purple).
- Design it so milestone 3's level-up cards and milestone 6's bad perks can use the same
  module. Explain this in your plan.

Other players (for the Salesman's gossip):
- Define an interface `RivalStatusSource` with `getRivals(): RivalStatus[]`, where
  `RivalStatus = { name, level, room, buffs: string[], debuffs: string[], alive }`.
- Now: a `BotRivalSource` that simulates 3 seeded bot rivals with funny castaway names. Their
  room and level advance over match time at slightly different speeds, and they collect random
  effects from the same effect pool. Results must be deterministic for a given seed.
- Milestone 5 will replace it with real server data. The Salesman must only talk to the
  interface.

==================================================
6. ACCEPTANCE CRITERIA (HOW WE KNOW IT WORKS)
==================================================

Unit tests in `tests/unit/` (Vitest, deterministic, seeded):
- Room generation: exit count is always 1–3, and unused sockets are walled off.
- Doors stay locked while any enemy is alive and unlock on the tick the last one dies.
- A break room never follows a break room. The 9th room after 8 fight rooms is always a break.
- The enemy budget formula, and that a room clears only when the budget is spent.
- `difficultyAt` never decreases as depth grows (budget, waves, health, damage, speed, elite
  chance), respects every cap, and never rises more than ~20% from one depth to the next.
- Enemies spawned at depth 10 have more health and damage than at depth 0, and the enemy mix
  follows `enemyWeightsByDepth`.
- Prices scale with level. Spending never removes a level. Buying is refused without enough XP.
- The Salesman sells at most one item per visit.
- Effect apply/expire changes the right stats and restores them afterwards.
- `BotRivalSource` returns the same snapshot for the same seed and time.

Play and observe (screenshots in `production/qa/evidence/`, as `.claude/docs/run-and-observe.md`
requires):
- A fight room with locked doors, the same room cleared with door icons showing, a break room
  with the Salesman menu open, the gossip report, and a mystery roll result.
- Still 60 FPS in a crowded fight room.

==================================================
7. DOCUMENTATION (SAME SESSION)
==================================================

- Update `design/game-brief.md` (core loop section) and `src/README.md` (new folders, dev URL
  options, "how to add a room template").
- Add an entry to `docs/changelog.md` and link it to this prompt's entry in `docs/prompt-log.md`.
- In the final reply, list any **model limitations or bugs you hit** and how you fixed them.
  This goes into our prompt log.

==================================================
HOW TO REPLY
==================================================

Step 1, now: **no code yet.** Reply with:
1. **Assumptions and open questions.** Anything in this request that is ambiguous or conflicts
   with the current code or `design/game-brief.md`. For each one, give your proposed default.
   (At least think about: XP as currency vs. levelling, what happens to the timer, whether
   door types should be hidden, and rest vs. the Salesman's one-purchase rule.)
2. **Files** you will add, change or remove, one line each.
3. **A numbered build plan** in small steps. Each step leaves the game runnable and says how I
   can see it in the browser.

Then wait for me to say "go".

Step 2, after "go": build step by step. Write tests with each sim system and run
`npm run smoke` before calling a step done. Before your final reply, **review your own diff**
against section 6 and list each criterion as met or not met, with the evidence.
