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
- **Goal:** change the control scheme before milestone 2 builds enemies on top of it.
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
  (Enter the Gungeon style). The only reason given in the prompt is "like a roguelike".
- **Correction (2026-11-25):** the first version of this entry, written by the AI, gave a reason
  the author never stated (that hand-aiming "made the player stand still") and said the change
  followed playing milestone 1. Both were invented and have been removed. See the limitations below.

### [Gameplay] Level-up cards: ask for a recap, then approve — 2026-11-25 — Esteban
- **Goal:** build milestone 3, after checking what it contains.
- **Tool/model:** Claude Code, Claude Opus 5.5.
- **Prompt 1 (exact):** "so, lets go with the phase 3, but before it, could you remember me what is abot?"
- **Result 1:** a summary of milestone 3, the 8 abilities from the spec, what is left out (bad perks,
  milestone 6), and three questions: keep the Space roll (the fire-trail card needs it)? can cards
  stack (the spec does not say)? correct the docs at the same time?
- **Prompt 2 (exact):** "go", which the reply had defined as: keep the roll, stack the cards, fix the docs.
- **Result 2:** milestone 3 ([changelog](changelog.md)). This also settles the open question about the
  roll from the previous entry.
- **Problem found:** all the new tests passed on their first run, which says little about the tests.
- **Change made and why:** the AI then broke the code on purpose in 14 ways. The tests caught 13; the
  other one changes nothing today (only one ability affects the fire rate). One test was also found
  to check a copy of the config instead of the real one, and was fixed.

### [Balance] Shorter and harder after playing — 2026-11-25 — Esteban
- **Goal:** make the match shorter and more difficult before the art pass.
- **Tool/model:** Claude Code, Claude Opus 5.5.
- **Prompt (exact):** "before going to milestone 4, i would improve the game by reducing the timer from
  ten to five because is too long, and also making it harder, because there are too few creatures and
  is very easy"
- **Result:** instead of guessing numbers, the AI wrote a throwaway bot that plays whole matches without
  graphics, confirmed the complaint (1.7 enemies on screen in round 1, no damage taken), and compared
  six settings. It chose the middle one ([changelog](changelog.md)).
- **Problem found:** the prompt names the problem but not a target ("harder" than what?). Halving the
  timer alone would have left round 1 as empty as before (1.8 enemies on screen).
- **Change made and why:** spawn rate and enemy mix changed along with the timer. Two stronger settings
  were rejected because no bot got past round 3. Whether this is the right difficulty for a person
  still has to be played.

### [Balance] A bit softer: round 4 was a wall — 2026-11-25 — Esteban
- **Goal:** keep the new difficulty but make the match passable.
- **Tool/model:** Claude Code, Claude Opus 5.5.
- **Prompt (exact, in Spanish):** "un poco mas chill, no mucho pero que sea pasable, porque ahora la fase
  4 no he sido capaz" (a bit more chill, not much but passable, because I was not able to pass phase 4).
  "Phase 4" was read as round 4 of the match.
- **Result:** the AI compared 9 softer settings with the bot and chose one that softens the climb
  between rounds ([changelog](changelog.md)).
- **Problem found:** the first idea, only spawning fewer enemies, did not help the bots: fewer enemies
  also means less XP and fewer cards. With 20 matches per setting the results were also too noisy.
- **Change made and why:** spawn growth, enemy health growth and enemy mix were softened together, and
  the final comparison used 40 matches per setting. One more starting heart was tested and left out,
  because it went further than "a bit".

### [Balance] A little bit less in round 5 — 2026-11-25 — Esteban
- **Goal:** fine-tune the late rounds.
- **Tool/model:** Claude Code, Claude Opus 5.5.
- **Prompts (exact):** "damelo en la ronda 5 para probar" (give it to me at round 5 to try), then
  "a little bit less".
- **Result:** the AI opened round 5 with 15 cards, then compared five small changes on that same setup
  and on full matches, and applied one ([changelog](changelog.md)).
- **Problem found:** "a little bit less" does not say less of what. It was read as less difficulty in
  the late rounds, and the reply said so.
- **Change made and why:** only the growth per round was lowered, so the early rounds, which the author
  had found too empty at first, stay as they are.

### [Gameplay] Final boss duel after the timer — 2026-11-25 — Esteban
- **Goal:** give the solo match an ending.
- **Tool/model:** Claude Code, Claude Opus 5.5.
- **Prompt (exact):** "when surviving the 5 minutes, make a 1v1 against the final boss, not at the same
  time when the timer is out"
- **Result:** a duel phase, a new boss and a victory screen ([changelog](changelog.md)).
- **Problem found:** tests passed, but a bot fighting the boss showed it was stuck behind rocks for about
  11 of every 35 seconds: it was too big for the paths enemies follow.
- **Change made and why:** bosses may now cross rocks and water. That would have made a boss standing on a
  rock impossible to hit, because rocks stop shots, so bosses crush rocks. The time spent stuck fell to
  0.1 to 0.3 s. The author played it and answered "ok perfect push it". Open question for milestone 8: how this duel fits with the final PvP of the original spec.

### [Deployment] Set up GitHub Pages from the plan — 2026-11-25 — brandocorti
- **Goal:** put the game online, following `docs/deployment-plan.md`, working on a dedicated `deployment`
  branch and merging into `main` only at the end.
- **Tool/model:** Claude Code (Sonnet 5.5) in VS Code.
- **Prompt:** "guarda il deployment_pla.md e dimmi cosa ce da fare", then "in questo branch andiamo a fare
  tutta la spec di deployment quindi prima pusheremo su deployment e poi andiamo a mergeare in seguito,
  organizza e inizia a organizzare il codice e dimmi quello che posso fare io".
- **Result:** the agent first only read the plan and compared it with the repo (no `base`, no workflow, no
  README link). After the second prompt it added `base: './'`, created `.github/workflows/deploy.yml` and
  ran `npm run smoke` (134 tests, build OK).
- **Problem found:** the plan says to push to `main`, but the team wants to work on `deployment` first. The
  workflow only triggers on `main`, so a push to `deployment` publishes nothing (this is intended). Also
  the Pages setting can only be changed by the repo owner, so the agent cannot finish this alone.
- **Change made and why:** kept the workflow trigger as in the plan instead of adding `deployment`, so a
  half-finished branch can never overwrite the public site. The agent did not commit or push; that stays a
  human step.

## Model limitations met so far (and how we handled them)

- **The first version had real bugs that only tests caught.** In milestone 1 the agent's own
  unit tests failed 5 times on the first run: two because walls stopped the player 1–2 px early
  (`Math.min`/`Math.max` swapped), two because a timer leftover of 1e-17 made rolls one tick too
  long, and one because a test room had two spawns. The next run showed the fire rate was one
  tick early. Fix: we ask for tests with every system and run them before accepting.
- **Plausible code is not working code.** In the running game, a fast mouse click fired
  nothing (the click was shorter than one frame). Only playing it in a browser showed this.
  Now every milestone is played and screenshotted (`production/qa/evidence/`).
- **The test environment can lie.** A hidden browser tab pauses the game loop, so the first
  FPS reading (31 FPS) was wrong. Measured again with the tab visible: 60 FPS.
- **A false alarm from the AI's own test.** A pathfinding test failed because the player's
  new auto-fire killed the test enemy, not because pathing was broken. The agent traced it,
  fixed the test, and checked that the test still fails when pathfinding is switched off.
- **The AI invented facts in our own documentation.** When it wrote this log and the changelog, it
  filled in a motivation for the control change and a claim about playtesting that nobody had
  stated, and described a safety hook it had not checked. It reported this itself a few days
  later. Lesson: AI-written process documentation must be checked by the person it speaks for.
