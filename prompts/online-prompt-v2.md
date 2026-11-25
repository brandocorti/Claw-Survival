# Online multiplayer prompt — v2 (own islands, shared clock, curses, final PvP)

Use: paste into Claude Code from the repo root, on the `tryingOnline` branch.
Replaces [`online-prompt-v1.md`](online-prompt-v1.md), which only gave co-op in one shared
arena. Logged in [`docs/prompt-log.md`](../docs/prompt-log.md).

---

## ROLE

You are the network and gameplay programmer on our student team. You know Node.js,
WebSockets, Colyseus and authoritative game servers. You prefer a small, working, tested
result over a large one, and you say so when something does not fit.

## CONTEXT (read before planning)

The game is a top-down pixel-art survivors-style roguelike (Phaser 3.90 + Vite 6, ES modules).
Milestones 1 to 3 are done and playable solo: 5 timed rounds of waves, XP gems, level-up cards
with 8 abilities, a mini-boss in round 3 and a final boss duel when the timer ends.

- `src/shared/sim/` holds all game rules in plain JavaScript (no Phaser, no DOM, seeded RNG).
  `createWorld`, `addPlayer`, `stepWorld(world, inputsById, dt)` and `drainEvents` in
  `src/shared/sim/world.js` are the whole simulation API. **One world = one arena.**
- `src/shared/protocol.js` defines `PlayerInput` (`moveX`, `moveY`, `roll`, `pick`) and the
  `SimEvent` union.
- `src/client/network/LocalTransport.js` runs the sim in the browser. `GameScene` only uses
  `update(deltaMs, input)`, `world`, `alpha`, `renderTime`, `localPlayerId`,
  `getLocalPlayer()` and `drainEvents()`.
- `src/shared/sim/systems/cards.js` draws ability cards and has the comment
  "Bad perks (milestone 6) will be offered through this same choice". While a card is open it
  sets `world.paused`, which freezes that world.
- `src/shared/sim/systems/spawner.js` runs the phases `waves -> bossIntro -> boss -> won`.
- Bullets have `team: 'player' | 'enemy'`: player bullets only hit enemies, and auto-aim only
  targets enemies. Players cannot hurt each other yet.
- At `/start` we already chose **Colyseus** for the server.

Read `src/README.md`, `world.js`, `protocol.js`, `cards.js`, `spawner.js`, `combat.js`,
`LocalTransport.js`, `GameScene.js` and `src/shared/config.js` before you propose anything.

## THE MATCH WE WANT (online mode)

1. **Lobby.** "Play solo", "Create room" or "Join room" (name + 4-character code, or a link
   such as `?room=ABCD`). The lobby lists the players (2 to 6); only the host can press Start.
2. **Own island, same clock.** When the host starts, every player gets **their own arena**
   (their own world on the server) with their own enemies, gems and rounds. All arenas start
   on the same tick and share **one match clock owned by the room**, so every player is in
   the same round at the same time. The HUD shows the other players: name, level, alive/dead.
3. **Level-ups with curses.** Each level-up offers 3 cards. When at least one other player is
   alive, one of the 3 cards (`config.curses.cardsPerOffer`) is a **curse** (bad perk). Picking
   a curse opens a second choice: which rival to send it to (keys 1 to 5 or a click; only alive
   rivals). The curse then hits that player's arena. The target sees a purple toast:
   "Maria cursed you: Slowed!" Purple is reserved for curses.
4. **Curses to implement (at least 4 of these 6)**, each with its numbers in `config.js`:
   slowed movement, shrinking vision (fog), extra enemy spawns around the target, inverted
   controls (short), weapon jams, a seagull that steals an XP gem every few seconds.
   They last a limited time and show a purple icon with the time left in the target's HUD.
5. **No freezing online.** A player's world must not pause while they choose a card, because
   the clock is shared. They keep moving and choose with 1/2/3. After
   `config.net.cardTimeoutSeconds` (default 10) a random card is picked for them. Solo mode
   keeps the pause exactly as today.
6. **Death in the waves.** A dead player is out of the match and watches (spectates) any
   other player's arena. If only one player is left alive before the timer ends, they win.
   (The Gulag is a later milestone: leave a `// milestone 7:` hook, nothing more.)
7. **Final fight.** When the clock ends: all enemies and curses disappear, every surviving
   player moves into **one shared PvP arena** (a new world; reuse the beach map if there is no
   better one) with the build they earned. There is a 3-second countdown with spawn points
   spread apart. In this phase **player bullets hit other players** and auto-aim targets the
   nearest rival in line of sight. The last player alive wins; everyone sees the win screen
   with the winner's name, then returns to the lobby.
8. **The final boss.** In online mode the PvP fight replaces the final boss duel. The
   mini-boss in round 3 stays. Solo mode keeps the boss duel unchanged.

## SCOPE

In scope: everything in "The match we want", the server, `ColyseusTransport`, the lobby,
disconnects, and a dev option to add bots.

- **Disconnects:** a disconnected player is kept for `config.net.reconnectGraceSeconds`
  (default 10) and can rejoin their arena; after that they count as dead. If the host
  leaves the lobby, the next player becomes host.
- **Bots for testing:** the host can add bots (`?bots=N` or a lobby button). A bot walks
  randomly, picks random cards and can be cursed and fought, so one person can test
  the whole match.

Out of scope (do not start these, even partly): curse compensation and killfeed rewards
(milestone 6 later), Gulag (7), AI-generated curse messages (9), AI skins (10), audio,
accounts, public deployment. Use fixed text for the curse toasts.

## CONSTRAINTS

- The server is authoritative. Clients send only `PlayerInput` plus their card and target
  choice; never positions, damage, XP or results. The server checks every value
  (clamp `moveX`/`moveY` to -1..1, the pick must be a card on offer, the target must be an
  alive rival) and ignores bad messages.
- Do not fork or duplicate the simulation. The server imports `src/shared/`. Curses are
  content like abilities: a registry in `src/shared/content/curses/` with the same
  "how to add one" comment as `content/abilities/index.js`. Rule changes go in
  `src/shared/sim/` behind options, so solo behaviour stays identical, and every new rule
  (curse effects, the cross-arena curse delivery, PvP damage, last-alive win, the card timeout)
  has a Vitest unit test.
- Each client receives the full state of **their own arena only** (or the arena they
  spectate), plus a small summary of every player (name, level, alive, active curses).
  Send state at about 20 Hz, not at the 60 Hz sim rate.
- All new numbers go in `config.js` (`net`, `curses`, `pvp` sections). No magic numbers.
- `npm run server` starts the server, `npm run dev` the client, and `npm run dev:all` both.
  The client finds the server through `VITE_SERVER_URL` (default `ws://localhost:2567`).
- Only Colyseus (server + client SDK) and what it strictly needs as new dependencies, with
  exact versions. No secrets in the repo. English code, comments and docs; doc comments on
  public functions.

## STEPS (stop after step 1 and wait for my "go")

1. **Plan.** Reply with: the files you will add or change; the room state and message schema
   (a table, like the example below); how one room runs several worlds on one clock; how a
   curse travels from one world to another; how PvP damage works with the current `team`
   field; risks and anything in this prompt you think is a bad idea. No code yet.
2. Server room with one world per player on a shared clock + bots, tested with Vitest.
3. `ColyseusTransport` + interpolation + lobby and room codes. Two tabs each play their own island.
4. Curses: registry, card offer, target choice, delivery, HUD icon and toast.
5. Final PvP arena, countdown, win screen, back to lobby.
6. Disconnect/reconnect, host change, spectating.
7. README section "Play online", plus `docs/changelog.md` and `docs/prompt-log.md` entries.

After each step run `npm run smoke` and tell me exactly how to test it by hand.

## SELF-REVIEW BEFORE YOU SAY "DONE"

Report each item as pass, fail or not checked, with the evidence:
- [ ] Solo mode still works (with the boss duel) and all old tests pass.
- [ ] Two windows on one computer: different enemies in each, same round number at the same time.
- [ ] A curse sent from window A changes window B within a few ticks and shows the purple toast.
- [ ] Choosing a card does not stop the clock; the timeout picks a card.
- [ ] At the end of the clock both players meet in one arena, can damage each other, and both
      see the same winner.
- [ ] One player plus 3 bots plays a full match to the win screen.
- [ ] A second computer on the same Wi-Fi joins with the room code.
- [ ] A client cannot cheat with `moveX: 50`, a pick out of range or cursing a dead player.
- [ ] Measured bytes per second per client with 6 players.
- [ ] Screenshots of the lobby, a curse toast and the PvP fight in `production/qa/evidence/`.

Do not mark an item as passed if you could not check it.

## OUTPUT FORMAT

Write the code to files (not to the chat). Each reply lists the changed files, explains the
important decisions in a few lines, and ends with a **How to test** section.

### Example of the level of detail I want in the schema table

| Direction | Message | Payload | When |
|---|---|---|---|
| client → server | `input` | `{ seq, moveX, moveY, roll }` | when the input changes, max 30/s |
| client → server | `pickCard` | `{ index, targetId? }` | once per level-up |
| server → client | arena state | own players, enemies, bullets, gems | 20 Hz |
| server → all | room summary | `{ clock, round, phase, players: [{ id, name, level, alive, curses }] }` | 5 Hz |
