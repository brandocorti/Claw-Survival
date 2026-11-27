# Changelog

The history of the **product**, newest first (format and rules: `CLAUDE.md`, section 5).
The history of the **prompts** is in [`prompt-log.md`](prompt-log.md).
(The root `CHANGELOG.md` belongs to the Claude Code Game Studios framework, not to our game.)

---

### 2026-11-27 — Online: players who are out watch the others — alvarofeher — commit (pending)
- **Type:** feature
- **What changed:** online, a player who is out (or who beat the boss and waits) sees "WASHED OUT" for 2 s, then
  watches another player still playing: their island, hearts, level, boss bar and screen shake. Q / E (or the
  arrow keys) switch between the players still playing; a bar shows `WATCHING ANA 2/3  Q < > E  M MENU`. When the
  watched player's run ends, the watcher sees the end for 1.5 s and moves on to the next one. Level-up cards and
  the shop of the watched player never open on the watcher's screen. When the match ends, the usual winner screen
  shows with the watcher's own numbers.
- **Modules/files touched:** `src/shared/net/spectate.js` (new: who may watch, who can be watched, cycling),
  `src/shared/net/messages.js` (`spectate` message and its check), `src/server/rooms/MatchRoom.js` (who watches
  whom; each island is encoded once and sent to its owner and its watchers), `src/client/network/ColyseusTransport.js`
  (the island on screen; the snapshot buffer starts over on a switch; no input while watching),
  `src/client/network/spectatorList.js` (new), `src/client/scenes/GameScene.js`, `src/client/ui/Hud.js`,
  `src/shared/config.js` (`net.spectateDelaySeconds`, `net.spectateSwitchSeconds`); tests in
  `tests/unit/net/spectate*.test.js`, `tests/unit/net/messages.test.js`, `tests/integration/server/matchRoom.test.js`.
- **Why:** a player who died early had nothing to do but wait for the winner screen.
- **Evidence:** `production/qa/evidence/2026-11-27-16-02-*_spectate-*.png` (a real online match against 3 bots:
  playing, washed out, watching, switching, the watched bot going out). 274 tests pass.
- **Known limits:** the map's crushed rocks and ground debris are drawn from your own island, not the watched one.
- **Prompt log:** [Spectating](prompt-log.md#online-spectating-for-players-who-are-out--2026-11-27--alvarofeher).

### 2026-11-27 — Online: every island plays the whole run up to the Crab Emperor; solo works after online — alvarofeher — commit (pending)
- **Type:** fix + rule change
- **What changed:**
  - Online, each island now plays the whole solo run: 5 rounds, then its own Crab Emperor. Before,
    the match ended for everyone as soon as only one player was alive (often during round 1), and
    online islands skipped the final boss.
  - A player who dies or leaves is out; the others play on. The match ends once every run is over.
    Winner: whoever beat the boss (most kills if several); if nobody did, whoever lasted longest.
    Alone, only beating the boss wins. Beating the boss first shows "YOU SURVIVED! Waiting for the others".
    (The PvP final can later go between "every run is over" and the winner.)
  - "Start run" after an online match starts a normal solo run again.
- **Modules/files touched:** `src/shared/sim/match.js` (no `finale: 'external'`, `checkFinished` and
  `pickWinner` replace `checkLastAlive`, summary field `bossBeaten` replaces `wavesDone`),
  `src/server/rooms/schema.js`, `src/server/rooms/MatchRoom.js`, `src/client/ui/Hud.js`,
  `src/client/scenes/MenuScene.js`, `src/client/scenes/GameScene.js`, `src/client/ui/PauseMenu.js`,
  `tests/unit/sim/match.test.js`, `tests/integration/server/matchRoom.test.js`.
- **Why:** the "last alive wins at once" rule came from the first online design (a shared PvP match);
  with one solo run per island it cut runs short. The solo bug: Phaser reuses a scene's last start data
  when `scene.start('Game')` gets none, so the menu restarted the game in online mode with the closed room.
- **Prompt log:** [Ends after one round; no solo after online](prompt-log.md#bug-it-finishes-after-one-round--2026-11-27--alvarofeher).

### 2026-11-27 — Fix: online the screen froze while shopping or picking cards — alvarofeher — commit (pending)
- **Type:** fix
- **What changed:** while your island is frozen (salesman or card choice), the screen now keeps
  updating: a purchase shows at once, and the second card choice of a double level-up replaces the first.
- **Modules/files touched:** `src/shared/net/snapshot.js` (each snapshot also carries the server's
  clock), `src/server/rooms/MatchRoom.js`, `src/client/network/ColyseusTransport.js`,
  `tools/bench-bandwidth.js`, `tests/unit/net/frozenIsland.test.js` (new), `tests/unit/net/snapshot.test.js`.
- **Why:** snapshots were stamped with the island's own time, which stops while it is frozen. The
  client drops a snapshot that is not newer than the last one (a late duplicate), so it dropped every
  update while you shopped. Bug introduced by the merge below. The client now orders snapshots by the
  server's clock and animates with the island's time.
- **Prompt log:** [It gets frozen](prompt-log.md#bug-it-gets-frozen--2026-11-27--alvarofeher).

### 2026-11-27 — Online meets main: salesman, menu and graphics online; one clock per island — alvarofeher — commit (pending)
- **Type:** feature (merge of `main` into `tryingOnline`)
- **What changed:**
  - Online play now has everything from `main`: the salesman, coins and hearts, the start menu,
    settings, music, the pause menu and the graphics upgrade. Solo plays exactly as on `main`.
  - **Each island has its own clock.** Picking a level-up card or talking to the salesman freezes
    only your own island, as in solo; the other players keep playing. The 10-second card auto-pick is gone.
  - Players can now be in different rounds. Whoever finishes the waves first sees "waiting for the
    other players"; the match moves on once everyone has finished or is out.
  - The salesman's "How is everyone?" table and the HUD list show each player's own round.
  - Flow: the start menu has **Play online**, which opens the lobby; the lobby's "Play solo" became
    "Back to menu". `?online` opens the lobby straight away (`?online&fast` for a 100 s online match);
    a `?room=CODE` link still does.
  - Online the pause menu says the game does not stop, has no restart, and "Leave the match" leaves the room.
- **Modules/files touched:** `src/shared/sim/` (`world.js`, `match.js`, `systems/spawner.js`,
  `systems/cards.js`), `src/shared/net/` (`snapshot.js`, `messages.js`), `src/server/rooms/`
  (`MatchRoom.js`, `schema.js`), `src/client/network/ColyseusTransport.js`, `src/client/scenes/`
  (`GameScene.js`, `BootScene.js`, `MenuScene.js`, `LobbyScene.js`, `main.js`), `src/client/ui/`
  (`Hud.js`, `CardScreen.js`, `PauseMenu.js`, `LobbyOverlay.js`), `src/client/devOptions.js`,
  `src/shared/config.js` (removed `net.cardTimeoutSeconds`), tests in `tests/unit/` and
  `tests/integration/server/` (`cardTimeout.test.js` replaced by per-island tests in `match.test.js`).
- **Why:** the two branches had grown apart (7 files in conflict). The online branch shared one clock
  between all islands, so it could never pause, which clashed with `main`'s salesman, which pauses the
  game. Since every player is on their own island, nothing needs a shared clock.
- **Evidence:** 255 tests pass (`npm run smoke`); a two-browser online match was played headless and
  captured in `production/qa/evidence/2026-11-27-13-4*_m5-merge-*.png` (shop and card choice frozen
  on one island while the other ran on; host in round 1 while the guest was in round 2).
- **Prompt log:** [Merge main into the online branch](prompt-log.md#merge-main-into-the-online-branch-one-clock-per-island--2026-11-27--alvarofeher).

### 2026-11-25 — Play with friends over the internet (`npm run online`) — alvarofeher — commit 2c43ab1
- **Type:** feature
- **What changed:** `npm run online` starts the game server, the client and a free Cloudflare quick
  tunnel, then prints a public `https://….trycloudflare.com` link. Anyone on any network opens it and
  joins the room. The browser now reaches the game server through `/colyseus` on the page's own
  address, so localhost, Wi-Fi and tunnel all use the same code path.
- **Modules/files touched:** `vite.config.js` (proxy, `allowedHosts`, `host`, `strictPort`),
  `src/client/network/serverUrl.js` (new, moved out of `LobbyScene`), `src/shared/config.js`
  (`net.proxyPath`), `tools/online.js` (new), `package.json` (`online`),
  `tests/unit/net/serverUrl.test.js` (new), `README.md`.
- **Why:** before this, only players on the same Wi-Fi could join, and university Wi-Fi often blocks
  devices from talking to each other.
- **Prompt log:** [Play across the internet with a Cloudflare tunnel](prompt-log.md).

### 2026-11-25 — Play online in the browser: menu, lobby, room codes, own island each — alvarofeher — commit 2c43ab1
- **Type:** feature
- **What changed:**
  - The game now opens on a menu: play solo, create a room, or join one with a 4-character code
    or a `?room=CODE` link. Solo dev shortcuts (`?round=3`, `?boss`…) still skip the menu.
  - The lobby lists the players; only the host sees Add bot, Remove bot and Start.
  - Online, each player plays their own island, drawn from server snapshots 20 times per second
    and smoothed between them. The HUD lists the other players (name, level, or OUT).
  - Card choices don't pause online: shorter cards along the bottom edge, with an auto-pick countdown.
  - End screens: "WASHED OUT" when you are out, then "YOU WIN!" or "<NAME> WINS" for everyone.
    R returns to the menu.
- **Modules/files touched:** `src/client/` (new `LobbyScene`, `ColyseusTransport`, `SnapshotBuffer`,
  `LobbyOverlay`; changed `GameScene`, `Hud`, `CardScreen`, pixel font), `src/shared/net/snapshot.js`
  (new), `src/server/` (snapshots, match length in the room state), `src/shared/sim/systems/damage.js`,
  `tools/bench-bandwidth.js`, `package.json` (`dev:lan`, `bench:bandwidth`).
- **Why:** milestone 5, online prompt v2, step 3.
- **Fixed on the way (found by playing in the browser, not by the tests):**
  - The guest's timer showed the 5-minute match while the host's `?fast` match lasted 100 s.
    The server now sends the match length.
  - Every player was disconnected a few seconds after the match ended (see the prompt log).
  - A player who died with a card choice open kept seeing the cards over the end screen.
  - Each fix has a regression test, seen failing first.
- **Evidence:** 191 tests pass. Two headless Chrome tabs created and joined a room by code and started the
  match. Both showed the same clock and the same timer, with different enemies, and entered round 2 on the
  same tick (20.25 s). Choosing a card did not stop the clock, and pressing 1 picked the card. After the
  match both stayed connected and saw the same winner. No console errors. Bandwidth per client, measured on
  the bytes Colyseus sends (`npm run bench:bandwidth`): 13 KB/s in round 1, 38 KB/s in round 5, 97 KB/s
  worst case. Screenshots: `production/qa/evidence/2026-11-25-19-5*_m5-*` (the `m5-bug-*` ones show
  the bugs before the fixes).
- **Prompt log:** [v2 run: step 3](prompt-log.md#multiplayer-v2-run-step-3-browser-client--2026-11-25--alvarofeher).

### 2026-11-25 — Online server: own arenas on one shared clock, plus test bots — alvarofeher — commit 2c43ab1
- **Type:** feature
- **What changed:** a game server (`npm run server`, port 2567). A host creates a room with a 4-character
  code, others join with it, and the host starts with 2 to 6 players (bots count). Every player gets
  their own arena on the server, and all arenas read one match clock, so everyone is in the same round.
  Online, a card choice no longer pauses the game: after 10 s a random card is picked. When at most one
  player is alive the match ends. The host can add bots (`bots: N`), which walk randomly and pick random
  cards. Not playable in the browser yet: the client side is step 3. Solo is unchanged.
- **Modules/files touched:** `src/server/` (new), `src/shared/sim/match.js` (new), `src/shared/net/` (new),
  `src/shared/sim/systems/` (cards, spawner, damage: new options, solo defaults unchanged),
  `src/shared/config.js` (`net` section), `tools/`, `vitest.config.js`, `package.json` (Colyseus 0.18,
  Node 22 or newer).
- **Why:** milestone 5, online prompt v2, step 2.
- **Evidence:** 179 tests pass (134 old, 37 new unit tests, 8 tests against a real server over
  WebSockets). Four rules were broken on purpose (shared clock, no pause, timeout, last alive) and the tests
  caught each one. Server cost: 6 arenas with 462 enemies take 0.60 ms per tick on average, 1.50 ms at the
  99th percentile; the budget is 16.67 ms (`npm run bench:server 6 5 stress`).
- **Prompt log:** [v2 run: plan and server](prompt-log.md#multiplayer-v2-run-plan-step-1-and-server-step-2--2026-11-25--alvarofeher).

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
