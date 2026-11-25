# Prompt log

The history of our **prompts**: one entry per meaningful prompt or iteration (format and
rules: `CLAUDE.md`, section 5). The history of the **product** is in
[`changelog.md`](changelog.md). Newest entries at the bottom.

---

### [Whole game] Initial game spec and build plan — 2026-11-18 — Esteban
- **Goal:** get an AI coding agent to plan and build a multiplayer pixel-art island roguelike
  step by step, keeping it runnable in the browser after every step.
- **Tool/model:** Claude Code (desktop app), model Claude Opus 5.5, running inside the
  Claude Code Game Studios framework v1.3.0 (agents, skills, hooks).
- **Prompt:** [`prompts/game-prompt-v1.md`](../prompts/game-prompt-v1.md) (full text, about 210 lines).
  Techniques used:
  - **Role:** "You are acting as the lead game developer on a student team project."
  - **Structured context** in 10 numbered sections: concept, tech stack, art direction,
    controls, special rules, GenAI components, multiplayer, audio, milestones, quality bar.
  - **Hard constraints** stated as numbers so they can be checked: 480×270 base resolution,
    integer scaling, 60 FPS with 6 players and about 150 enemies, AI fallback within 1.5 s.
  - **Step-by-step decomposition:** 12 ordered milestones, built one per `/next` command.
  - **Interaction protocol:** custom commands (`/start`, `/next`, `/status`, `/explain`) and a
    required output format for every reply ("How to test").
  - **Plan first, then wait for approval:** "Then wait for me to say 'go' before coding."
- **Result:** the agent replied to `/start` with a stack choice (Phaser 3 + Vite, Colyseus for
  multiplayer), a folder layout and a 12-step test plan. Its key design decision: put the game
  rules in plain JavaScript (`src/shared`) so the same code runs in the browser now and on the
  server in milestone 5. After "go" it built milestone 1 ([changelog](changelog.md)).
- **Problem found:** the prompt asked for every file in full in the chat reply, which for
  30+ files would bury the useful information. The agent raised this itself and asked.
- **Change made and why:** see the next entry.

### [Workflow] Write code to files, not to the chat — 2026-11-18 — Esteban
- **Goal:** keep replies readable while the code base grows.
- **Tool/model:** Claude Code, Claude Opus 5.5.
- **Prompt:** "Do it in files and go"
- **Result:** from milestone 1 on, the agent writes files directly into the repository and
  each reply lists the changed files plus a "How to test" section. The code is reviewed in
  the diff view and in git instead of in chat.
- **Problem found:** none so far. The trade-off is that the full code no longer appears in
  the conversation, so the conversation alone is not a full record. Git history covers that.
- **Change made and why:** replaces the rule "give complete files" from v1 of the spec.
  Reason: a 30-file reply cannot be read or reviewed, and the files are the real artefact.

### [Gameplay] Survivors-style controls: auto-fire instead of mouse aiming — 2026-11-18 — Esteban
- **Goal:** after playing milestone 1, change the control scheme before enemies are built on
  top of it.
- **Tool/model:** Claude Code, Claude Opus 5.5.
- **Prompt (exact):** "before going to milestone 2 some things: I want autoshoot, not clicking
  with a scope, only wasd for movement and then use the mouse when the ability pool pops up,
  like a roguelike. Lets go with milestone 2"
- **Result:** the weapon now fires by itself at the nearest enemy that is within range *and*
  in line of sight (the agent added line of sight on its own so you don't waste shots into
  rocks). The mouse is kept free for the level-up cards. The agent kept Space as the dodge
  roll and said so explicitly, because the enemies it was about to build (tiki bullet rings,
  Crab King) are designed around dodging. Recorded in `design/game-brief.md`, section 4.
  Milestone 2 was built on top ([changelog](changelog.md)).
- **Problem found:** the prompt was ambiguous about the roll ("only wasd for movement").
  The agent picked an interpretation and flagged it for confirmation instead of guessing
  silently. Still open: does the team want the roll?
- **Change made and why:** v1 of the spec said "WASD to move, mouse to aim, left click to shoot"
  (Enter the Gungeon style). Changed because with hordes of enemies, aiming by hand made the
  player stand still. Survivors-style controls keep the focus on movement and dodging, and
  leave the mouse for build decisions, which are the core of the roguelike loop.

### [Core loop] Room-based runs, break rooms and the Salesman — 2026-11-25 — Alvaro
- **Goal:** replace the timed rounds on one big arena with a chain of smaller rooms: doors
  unlock when the room is clear, 1–3 exits, a chance of a break room and a mandatory one after
  8 fight rooms, XP spent on healing, and a Salesman NPC who sells either a random buff/debuff
  roll or a status report on the other players.
- **Tool/model:** Claude Code (VS Code extension), Claude Opus 5.5. The model first turned a
  short informal request into the structured prompt below.
- **Prompt:** [`prompts/rooms-and-salesman-prompt-v1.md`](../prompts/rooms-and-salesman-prompt-v1.md).
  Original request (exact): "make the game work by rooms. each fighting room is smaller than the
  current one and there are 1,2, or 3 paths to continue to the next room, with a small chance of
  the next room being a break room. in the "break room" you can recover some health in exchange
  of xp maybe or purchase a random buff/debuff roll for xp too there is a mandatory break room
  after 8 rooms. after killing all enemies you move to the next room and doors are unblocked.
  add a character that is a salesman and he can inform of the status of the other players [...]
  you must interact with him to also buy only one random buff/debuff roll or only one check to
  the other players status."
  Techniques used (different from the v1 spec on purpose):
  - **Change request, not a spec:** states what exists now and what it replaces.
  - **Grounded in the repo:** names the real files to read and change (`spawner.js`,
    `config.js`, `beach.js`) so the agent doesn't invent its own structure.
  - **Defaults for every ambiguity:** each vague point in the request becomes a number in
    `config.js` (break chance 12%, prices as a fraction of the XP bar, exit weights).
  - **Handles missing dependencies:** buffs/debuffs and other players don't exist yet, so
    the prompt asks for a minimal reusable effect module and a `RivalStatusSource` interface
    with seeded bots.
  - **Few-shot:** an example room template in ASCII and three example Salesman lines for tone.
  - **Testable acceptance criteria**, plus a **self-review** step against those criteria.
  - **Plan first, then wait:** the agent must list its assumptions and open questions before it
    writes any code.
- **Iteration before sending (same day):** added a "Difficulty curve" section at the request
  of Alvaro ("i also want difficulty increase in the rooms, as the player advances the enemies
  get stronger and more appear"). The first draft only grew the enemy count. The revised prompt
  puts all scaling in one pure function `difficultyAt(config, depth)` (count, waves, health,
  damage, speed, enemy mix, elites, XP reward) with caps and a "no more than ~20% harder per
  room" test. **Why:** if the formulas were scattered, the curve could not be tested or tuned,
  and without caps late rooms would become impossible to dodge.
- **Result:** the plan-first step worked. Before writing code the agent listed 19 assumptions
  and found that **the prompt's own default numbers broke the prompt's own rule**: a budget of
  `8 + 3 per room` is +37% from room 1 to 2, more than the "~20% per room" limit. It proposed
  `10 + 2 per room` (exactly +20%, then less), applying the 20% test to continuous values only
  (wave counts and the first elite chance move in whole steps), and keeping rounded damage
  even though it jumps from 1 to 2 half hearts at depth 10 (section 6 asks for exactly that).
  After "go" it built the feature in about 30 files: rooms from 6 hand-made ASCII templates, the
  enemy budget in waves, `difficultyAt()`, a reusable status-effect module (8 effects), the break
  room, the Salesman and his menu, seeded bot rivals for the gossip. Tests went from 78 to 169,
  all passing; 15 screenshots in `production/qa/evidence/rooms-and-salesman/`. Product entry:
  [changelog](changelog.md#2026-11-25--room-based-runs-break-rooms-and-the-salesman--alvaro--commit-pending).
- **Problem found:** the tests caught two real bugs the code looked fine without: XP gems pulled
  from across the room **orbited the player forever** (the magnet pulled toward the position,
  not the direction), and a "+1 max heart" rule **refilled the heart a curse had taken** when
  the curse ended. The screenshots caught four more that no test could: unreadable speech
  bubble text, see-through "sold out" cards, left-aligned card text, and an effect counter one
  too high in break rooms. All fixed in the same session. Also: the headless screenshot tool
  the framework ships (`page-shot.sh`) only plays ~0.3 s of a Phaser game, so the agent wrote
  its own real-time driver (`tools/qa/cdp-shot.mjs`).
- **Change made and why:** the informal request left out several decisions: how XP can be
  spent without breaking levelling, what happens to the 10-minute timer, and whether resting
  counts toward the Salesman's one-purchase rule. The prompt gives a default for each one and
  asks the agent to challenge them, so nothing important is decided by guessing.

## Model limitations met so far (and how we handled them)

- **The prompt's numbers contradicted the prompt's rules** (rooms change, 2026-11-25). We wrote
  "budget 8 + 3 per room" and "never more than ~20% harder per room" in the same prompt; the
  first breaks the second. Asking for "assumptions and open questions" before any code is what
  surfaced it. The test that enforces the rule was checked against the old numbers and fails
  with them (budget ×1.375), so it is known to work.
- **A bug only far-away gems could show.** The XP magnet had worked for two milestones because
  gems were always picked up from close by. The room-clear vacuum pulls them from across the
  room, and the agent's own test showed one gem circling the player at 14–46 px forever. Fixed by
  steering the gem's velocity, not its acceleration toward the player.
- **The agent's own tests were wrong twice, and it said so.** One test read a stale event from
  the previous room, another forgot its own "next wave comes early" rule. Both times it debugged
  first (printed the room chain and the gem distances) before deciding the code was right.
- **Looking at the wrong game.** The first real-time screenshot showed a *different* game: a
  project from another folder was already running on port 5173, and our dev server had moved to
  5174. The agent noticed because the HUD said "BANK 0" and "WASHED ASHORE!", which our game
  does not have. Lesson: check what a screenshot shows against what you expect, not only that
  one was saved.
- **The headless browser did not really play.** `page-shot.sh` uses Chrome's virtual time,
  which ran ~0.3 s of the game whatever the wait (the screen was still fading in). Replaced with
  a small real-time driver over the Chrome DevTools protocol that also presses keys.
- **A small sample looked like a bug.** 5 cursed rolls in 29 seeds (17%) against 35% in the
  config. Checked over 2000 seeds before changing anything: 35.5%, correct.

- **The first version had real bugs that only tests caught.** In milestone 1 the agent's own
  unit tests failed 5 times: walls stopped the player 1–2 px early (`Math.min`/`Math.max`
  swapped); a timer leftover of 1e-17 made rolls one tick too long; the fire rate was one
  tick early. Fix: we ask for tests with every system and run them before accepting.
- **Plausible code is not working code.** In the running game, a fast mouse click fired
  nothing (the click was shorter than one frame). Only playing it in a browser showed this.
  Now every milestone is played and screenshotted (`production/qa/evidence/`).
- **The test environment can lie.** A hidden browser tab pauses the game loop, so the first
  FPS reading (31 FPS) was wrong. Measured again with the tab visible: 60 FPS.
- **A false alarm from the AI's own test.** A pathfinding test failed because the player's
  new auto-fire killed the test enemy, not because pathing was broken. The agent traced it,
  fixed the test, and checked that the test still fails when pathfinding is switched off.
