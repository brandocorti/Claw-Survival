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

### [Multiplayer] A prompt only for the online mode — 2026-11-25 — alvarofeher
- **Goal:** build a working online mode (milestone 5), nothing else.
- **Tool/model:** Claude Code (VS Code extension), Claude Opus 5.5. The model wrote this prompt
  after reading the code base.
- **Prompt:** [`prompts/online-prompt-v1.md`](../prompts/online-prompt-v1.md). Techniques: role,
  context taken from the real code (file names, sim API, transport interface), explicit
  in-scope and out-of-scope lists, numbered constraints, step-by-step plan with a stop for
  approval, a self-review checklist that requires evidence, and a one-row example
  (few-shot) of the schema table we expect.
- **Result:** pending; this prompt has not been run yet.
- **Problem found (with the previous version):** section 7 of `game-prompt-v1.md` mixed the
  online mode with perks, the Gulag, bots and the final PvP, and it said nothing about the
  card pause: `world.paused` stops the whole world, so in a shared room one player's card
  choice would freeze everyone.
- **Change made and why:** this prompt covers only online play, names the card-pause trap, and
  forbids copying the simulation to the server. Its checklist also asks the agent to report
  any unchecked item as unchecked, because earlier the AI documented things it had not
  verified (see "Model limitations" below).

### [Multiplayer] v2: own islands, shared clock, curses and a final fight — 2026-11-25 — alvarofeher
- **Goal:** online play in which every player survives their own rounds, all on one clock, can
  send curses to the others when leveling up, and ends in a fight between the survivors.
- **Tool/model:** Claude Code (VS Code extension), Claude Opus 5.5.
- **Prompt (exact request to the model):** "make it so many players play their own rounds but
  start at the same time and end up fighting each other. players can choose debuffs when
  leveling up". Result: [`prompts/online-prompt-v2.md`](../prompts/online-prompt-v2.md).
- **Result:** pending; this prompt has not been run yet.
- **Problem found (with v1):** v1 only gave co-op in one shared arena. It ruled out the final
  PvP, and players could not hurt each other anyway, because player bullets only hit enemies.
- **Change made and why:** one world per player on the server with a match clock shared by the
  room. Curses are offered as one of the 3 level-up cards and need a target. When the clock ends,
  the survivors move into one PvP arena where player bullets hit players. Because the clock is
  shared, a card choice can no longer pause a player's world, so online play uses a card timeout
  instead. Online, the PvP replaces the final boss duel; solo keeps the boss. This answers the
  open question in the previous entries. Bots were added so one person can test a full match,
  and step 1 now asks the model to point out anything in the prompt it thinks is a bad idea.

### [Multiplayer] v2 run: plan (step 1) and server (step 2) — 2026-11-25 — alvarofeher
- **Goal:** run [`online-prompt-v2.md`](../prompts/online-prompt-v2.md) step by step.
- **Tool/model:** Claude Code (VS Code extension), Claude Opus 5.5.
- **Prompt:** the v2 prompt as written. After the plan, the author replied "go".
- **Result, step 1 (plan, no code):** the model read the code first and proposed keeping all match rules
  in a plain-JS `match.js`, with a thin Colyseus room around it, so every rule can be tested without a
  network. It also pushed back on parts of the prompt, as the prompt asked:
  - 5 of the 6 curses: the seagull needs a new entity, AI, art and sync, about as much work as the others together.
  - PvP would last about 3 s with 3 hearts and auto-aim, so it proposed a PvP health knob.
  - Random-walking bots die early, so the last-alive rule ends a bot match before the PvP; it proposed `?botsTough`.
  - The fog curse is drawn by the client, so a modified client could remove it.
  - It flagged its own knowledge of Colyseus 0.18 as a risk.
- **Result, step 2:** the server room, the shared clock, the card timeout, last-alive and bots, with 45 new
  tests; see the [changelog](changelog.md#2026-11-25--online-server-own-arenas-on-one-shared-clock-plus-test-bots--alvarofeher--commit-pending).
  The model installed the `colyseus` meta-package, saw it pulls in auth, monitoring and Redis, and replaced
  it with the three packages the server strictly needs, as the prompt's dependency rule asked.
- **Problem found:** see the three new items in "Model limitations" below (outdated API knowledge, a
  test that passed for the wrong reason, and a blocked destructive command). Also, the benchmark
  first reported 0 ms with 0 enemies: its warm-up ran past the end of the match. The model fixed the
  script instead of reporting the number.
- **Change made and why:** none to the prompt yet. Steps 3 to 7 follow.

### [Multiplayer] v2 run: step 3 (browser client) — 2026-11-25 — alvarofeher
- **Goal:** step 3 of [`online-prompt-v2.md`](../prompts/online-prompt-v2.md): `ColyseusTransport`,
  interpolation, lobby and room codes; two tabs each play their own island.
- **Tool/model:** Claude Code (VS Code extension), Claude Opus 5.5.
- **Prompt:** the author replied "go" to the step 2 report.
- **Result:** see the [changelog](changelog.md#2026-11-25--play-online-in-the-browser-menu-lobby-room-codes-own-island-each--alvarofeher--commit-pending).
  The model checked its work by driving two headless Chrome tabs from a throwaway script: create, join with
  the code, start, compare both islands, pick a card, play to the end. It also looked at the screenshots.
- **Problem found:** all three bugs of this step were found in the browser, after the unit and server tests
  had passed:
  - **The timers disagreed.** Found by looking at the screenshots: only the host's URL had `?fast`.
  - **Players were disconnected after the match.** Both players were dropped about 3 s after the winner
    was shown. See "Model limitations" below.
  - **Cards stayed over the end screen.** A dead player's last snapshot still held an open card choice.
  - The model also wrote an invented game title ("CASTAWAYS") and tagline into the menu, then replaced
    them with the page title and a plain description, because the title has not been chosen.
- **Change made and why:** none to the prompt. The run itself is the lesson: a passing test suite missed
  three visible bugs, which supports the prompt's demand for screenshots and "not checked" honesty.

### [Multiplayer] Play across the internet with a Cloudflare tunnel — 2026-11-25 — alvarofeher
- **Goal:** let people on different computers and different networks join the same room.
- **Tool/model:** Claude Code (VS Code extension), Claude Opus 5.5.
- **Prompt:** three short conversational prompts, each narrowing the goal:
  1. "for the online feature should it run on cloudflare tunnels?" (asks for an opinion, no code)
  2. "i want to do whatever allows me to play with different people with different computers"
  3. "wait, and to make it reachable across the internet? not within the same wifi"
- **Result:** for prompt 1 the model read the client and server code before answering. It found
  that the client built `wss://<host>:2567`, which a tunnel cannot serve because a tunnel only
  answers on port 443, and that Vite 6 blocks unknown hosts. It recommended one tunnel, with Vite
  forwarding `/colyseus` to the game server. After prompt 2 it built that and added `npm run online`.
  It tested it by joining a room with two clients through the public `trycloudflare.com` URL.
  See the [changelog](changelog.md).
- **Problem found:** the first real test through the tunnel returned **403**. An older Vite server
  from an earlier session was still listening on `[::1]:5173`, and `localhost` resolved to it. The
  model found this with `lsof` instead of guessing. It pointed the tunnel at `127.0.0.1` and turned
  on `strictPort`.
- **Change made and why:** prompt 3 came in while the model was already building and testing. No
  change was needed, because a Cloudflare tunnel is already reachable from any network. The lesson
  is that prompt 2 described the outcome ("different people, different computers") rather than a
  technology, which left the model free to choose. Prompt 3 checked that the choice met the real
  need: a different network, not only a different Wi-Fi.

### [Art] Milestone 4, first attempt (stopped) — 2026-11-25 — Esteban
- **Goal:** the island art pass of the original spec.
- **Tool/model:** Claude Code, Claude Opus 5.5, all art drawn in code.
- **Prompt (exact):** "ok perfect push it and we can continue with phase 4", then, while the AI was
  working: "stop, ill have a propper prompt with the art section and then ill pass it to you".
- **Result:** a new island layout, a painted ground (rendered to an image, never seen in the game), and
  untested code for props, lighting and particles. Set aside in a local git stash, not in the repository.
- **Problem found:** the go-ahead gave no art direction beyond the spec, so the AI chose the style itself.
- **Change made and why:** stopped by the author, who will write a dedicated art prompt.

### [Gameplay] Salesman, money, hearts, menu and music — 2026-11-25 — Esteban
- **Goal:** something to do between fights, a reason to collect drops, and a proper start to the game.
- **Tool/model:** Claude Code, Claude Opus 5.5. Music: Suno and Google generative AI (see
  `assets/audio/README.md`).
- **Prompt (exact, with three songs attached):** "add a character that is a salesman and he can inform of
  the status of the other players. mark it in the map somehow  you must interact with him with E to also
  buy only one random buff roll. Add the posibility of enemies droping money randomly to trade later. Make
  it balanced. Also that they can drop randomly hearts with a "low" rate. Add also a menu to start the run
  with settings and things like that. Ill give to you the music of each phase."
- **Result:** all of it ([changelog](changelog.md)).
- **Problem found:** two ambiguities. "Only one random buff roll" was read as one per round, and the songs
  were assigned to phases by their titles, since the AI cannot listen to them. "Make it balanced" had no
  number: the AI's first guess for the drop rates nearly quintupled the bots' wins.
- **Change made and why:** each effect was measured separately (hearts alone, shop alone), which showed
  that hearts made the game easier far more than the shop, and the rates were set from that.
- **Follow-up prompt (exact, in Spanish):** "hay 3 musicas diferentes, una para menú, pausa y salesman
  (island pixel waves), para el juego normal (under the canopy), y por ultimo para el boss (claws of the
  mangrove)" (there are 3 songs: one for menu, pause and salesman, one for the normal game, one for the
  boss). The AI's guess from the titles was wrong for rounds 1-2, pause and salesman, and was replaced.

### [Art] Graphics upgrade, M0 — 2026-11-25 — Esteban
- **Goal:** apply the dedicated graphics prompt, one milestone at a time.
- **Tool/model:** Claude Code, Claude Opus 5.5. The prompt itself was written with another AI session; its three
  log entries are in `improved_graphics/prompt-log-entries.md` and still need the name of their author.
- **Prompt (exact, with `improved_graphics.zip`):** "subelo a github and then graphics, make sure to use the
  prompt in  GRAPHICS_UPGRADE_PROMPT.md", and later "completa el m0 y para ahi, continuare mañana" (finish M0
  and stop there, I will continue tomorrow).
- **Result:** M0 done ([changelog](changelog.md)).
- **Problem found:** the AI had run ahead and drafted M1 to M3 before showing M0.
- **Change made and why:** the draft was set aside in a git stash, unverified, and the project left at M0.

### [Art] Graphics upgrade, M1 to M4 — 2026-11-25 — Esteban
- **Goal:** the rest of the graphics prompt.
- **Tool/model:** Claude Code, Claude Opus 5.5.
- **Prompt (exact):** "continue now till the end of mx", read as "through the last milestone".
- **Result:** 15 upgrades ported from the reference code ([changelog](changelog.md)).
- **Problem found:** the reference was made for an older version. The bigger boss could not be hit at its edge,
  the victory screen hid the death sequence, the wreck stood on the salesman, bullets hid behind palm leaves,
  and the first captures were not repeatable: the game ran before the harness started, and tweens read the
  real clock.
- **Change made and why:** each was fixed while porting, and the new collision, art and flags got tests. Shipping
  working reference code with target images made the result match far better than the earlier free attempt.

### [Merge] Merge main into the online branch: one clock per island — 2026-11-27 — alvarofeher
- **Goal:** bring `main`'s gameplay (salesman, money, hearts, menu, music, graphics) into the online
  branch without changing it, and add online play on top.
- **Tool/model:** Claude Code (Claude Opus 5.5) in VS Code.
- **Prompt (a conversation, in order):**
  1. "how hard would it be to merge the online branch with the main branch?" then "dont do anything
     yet, just evaluate". The model dry-ran the merge (`git merge-tree`, nothing touched): 7 files in
     conflict, and a bigger problem than the conflicts. `main`'s salesman pauses the game, but the
     online branch shares one clock between all islands and therefore never pauses.
  2. "should i first merge main into tryinOnline branch? and then you fix whatever but just keping the
     online side from my branch and leave main as it is gameplay wise, just adding online feature".
     The model agreed and proposed: main wins on gameplay, the online branch wins on networking.
     It suggested that online the shop could not pause and should time out like the cards.
  3. **The correction:** "why cant it be frozen online if players dont play in the same island? each
     player plays its own solo run until they reach the final. if any debuff is sent just make it show
     when the player closes the salesman of finishes choosing an ability".
  4. "each island uses its own clock, each player will do different amount of rounds depending on its
     skill, its part of the game". The model pointed out that on `main` rounds are fixed by time (5 x 60 s),
     so skill would not change the number of rounds, and offered three rule sets (A: clear a wave to
     advance, B: fixed time with endless rounds, C: keep main's timed rounds).
  5. "with C can we make the choosing of cards and salesman stop the game while that player chooses and
     not affect others?" then "then lets do it this way i just merged main into tryingOnline."
- **Result:** the merge was resolved with one clock per island (see the [changelog](changelog.md)).
  Cards and the salesman freeze only the player's own island, the auto-pick is gone, and the salesman,
  coins and hearts work online. The model also added an end-to-end server test (E at the salesman over
  real WebSockets) and played a two-player match in two headless Chrome tabs. Screenshots are in
  `production/qa/evidence/`.
- **Problem found:**
  - The model's first plan treated the shared clock as a constraint of online play. It was only a design
    choice of the earlier online prompt ([v2: own islands, shared clock](#multiplayer-v2-own-islands-shared-clock-curses-and-a-final-fight--2026-11-25--alvarofeher)).
    The person, who knows the game design, saw that separate islands do not need a shared clock.
  - Prompt 4 mixed two ideas: per-island clocks, and "different amount of rounds depending on skill".
    The second does not follow from the first under `main`'s rules. The model checked the round rules in
    the code instead of assuming, and asked before changing gameplay.
  - The model's first headless test showed the shop "open" while the island's clock still moved. The game
    was right; the test script was wrong: it kept pressing E until the client saw the shop, and on the
    server a second E closes the shop. The script was changed to press once.
- **Change made and why:** prompt 3 changed the design (the shop timeout was replaced by per-island
  freezing), and prompt 5 fixed the round rules (C: timed rounds, as on `main`). Asking "evaluate first"
  (prompt 1) gave a cost estimate and exposed the design clash before any file was touched.
- **Open:** an optional cap on total pause time per player, so nobody can keep the others waiting forever;
  debuffs that wait until the player closes the shop or picks a card (prompt 3) are not built yet.

## Model limitations met so far (and how we handled them)

- **A wrong diagnosis, and a test that could not fail.** All players were dropped about 3 s after a match
  ended. The model's first explanation was close but wrong:
  - **First theory:** the room clock stops whenever no simulation loop runs. A regression test written
    for that theory passed on the unfixed code.
  - **Second attempt:** a test that ended the match by a player *leaving*. It also passed, because a
    leave ends the match outside a tick and never reaches the line that stops the loop.
  - **The real cause,** found in the Colyseus source: stopping the loop leaves a stale handle behind,
    so after the first match nothing advances the clock that Colyseus's per-second message limit reads.
  - Only a test where a player *dies during a tick* failed with the real 4002 drop. After the fix it passes.
- **Inventing content.** Writing the menu, the model filled the missing game title with one it made up.
  It caught this itself, but the lesson is the same as for the documentation: placeholders the team has
  not decided must stay placeholders.

- **Outdated knowledge of a library (Colyseus 0.18).** The model assumed, from older versions, that
  defining `onUnhandledMessage` makes the server ignore unknown messages. In 0.18 the client is
  still disconnected. A test over real WebSockets showed it. The model then read the library's
  source, kept the stricter behaviour (our client never sends unknown messages) and changed the test
  to check it. Also from the source: Colyseus always loads pm2's metrics module, which broke Vitest's
  process pool, so the server tests run in worker threads.
- **A test that passes is not proof.** The first shared-clock test passed even when the arenas ignored
  the shared clock, because they all stepped together anyway. The model broke each new rule on purpose
  to see the tests fail. That showed the gap, and a test that moves the clock directly now catches it.
- **A design choice taken for a constraint.** Merging the branches, the model assumed online islands must
  share one clock and proposed a shop timeout. The person pointed out that separate islands need no shared
  clock, which made online play simpler (no timeouts) and identical to solo. Lesson: when the model says
  "this cannot work online", ask why, and check whether the reason is a rule of the game or an earlier prompt.
- **A command that would have destroyed work.** To undo those deliberate breaks, the model ran
  `git checkout -- <file>`, which would also have thrown away its own uncommitted changes to those files.
  Claude Code's safety check blocked it. The model switched to restoring from copies in a scratch folder.

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
