# Online multiplayer prompt — v1

Use: paste into Claude Code from the repo root, on the `tryingOnline` branch.
It narrows milestone 5 of [`game-prompt-v1.md`](game-prompt-v1.md) (section 7 "Multiplayer")
to one goal: make online play work. Logged in [`docs/prompt-log.md`](../docs/prompt-log.md).

---

## ROLE

You are the network programmer on our student team. You know Node.js, WebSockets, Colyseus and
authoritative game servers. You value a small, working, tested result over a large one.

## CONTEXT (read before planning)

The game is a top-down pixel-art survivors-style roguelike (Phaser 3.90 + Vite 6, ES modules).
Milestones 1 to 3 are done and playable solo. The architecture was built for this step:

- `src/shared/sim/` holds all game rules in plain JavaScript (no Phaser, no DOM, seeded RNG,
  no `Math.random()`). `createWorld`, `addPlayer`, `stepWorld(world, inputsById, dt)` and
  `drainEvents` in `src/shared/sim/world.js` are the whole simulation API.
- `src/shared/protocol.js` defines `PlayerInput` (`moveX`, `moveY`, `roll`, `pick`) and the
  `SimEvent` union. These are the objects that must travel over the network.
- `src/client/network/LocalTransport.js` runs the sim in the browser. `GameScene` only uses
  `update(deltaMs, input)`, `world`, `alpha`, `renderTime`, `localPlayerId`,
  `getLocalPlayer()` and `drainEvents()`.
- At `/start` we already chose **Colyseus** for the server.
- Known trap: when a player has a level-up card open, `updateCards` sets `world.paused` and
  the whole world stops. That is fine solo, but in a shared world one player's card choice
  would freeze everyone.

Read `src/README.md`, `world.js`, `protocol.js`, `LocalTransport.js`, `GameScene.js` and
`src/shared/config.js` before you propose anything.

## TASK

Implement **only** a functional online mode: 2 to 6 players on different computers join the
same room and play the current PvE match together, with the server as the authority.

In scope:
1. **Server** (`server/`, Node.js + Colyseus): one room type that creates the world with
   the code in `src/shared/` (import it, never copy it) and calls `stepWorld` at
   `config.sim.tickRate`, with every connected player's latest input.
2. **Lobby**: a simple menu before the game: "Play solo", "Create room", "Join room" (name +
   4-character room code). A lobby screen lists the players, shows the code, and lets only
   the host press "Start". Players can also join with a link such as `?room=ABCD`.
3. **`ColyseusTransport`** in `src/client/network/`, with the **same public interface** as
   `LocalTransport`, so `GameScene` changes as little as possible. It sends inputs, receives
   state, and renders other players and enemies with interpolation (render about 100 ms
   behind the server). The local player may use simple client-side prediction; say if you
   skip it and why.
4. **Shared world, with no global pause in online mode**: all players are in one arena.
   A player choosing a card keeps playing while the choice is open (or is made
   invulnerable, your call, but justify it). Solo mode must behave exactly as today.
5. **Events**: the `SimEvent`s the client needs for visuals (shots, hits, deaths, level-ups)
   reach every client, and only the owner sees their own card choice.
6. **Disconnects**: a disconnected player is kept for `config.net.reconnectGraceSeconds`
   (default 10). Reconnecting in time resumes control; otherwise the player counts as dead.
   If the host leaves, the next player becomes host.
7. **Game over**: when every player is dead, or the boss is beaten, all clients see the end
   screen and can return to the lobby.

Out of scope (do not start these, even partly): bad perks, Gulag, final PvP, AI messages,
AI skins, audio, accounts, matchmaking, deployment to a public host. Leave a short
`// milestone N:` comment where a later milestone will plug in, and nothing more.

## CONSTRAINTS

- The server is authoritative. Clients send only `PlayerInput`; they never send positions,
  damage, XP or card results. The server validates input ranges and ignores bad messages.
- Do not fork or duplicate the simulation. If the sim needs a change for multiplayer
  (for example the card pause), change it in `src/shared/` behind an option, keep solo
  behaviour identical, and cover the change with a unit test.
- New tunables go in `config.js` under a `net` section (port, tick and patch rates,
  interpolation delay, max players, grace period). No magic numbers.
- Keep the bandwidth sane for 6 players and about 150 enemies: send state at a lower rate
  than the sim tick if needed (for example 20 Hz) and send only what the client draws.
- One command to run each part locally: `npm run server` and `npm run dev`. A third
  `npm run dev:all` that starts both is welcome. The client finds the server through
  `VITE_SERVER_URL`, defaulting to `ws://localhost:2567`.
- No secrets in the repo. No new dependency beyond Colyseus (server and client SDK) and what
  it strictly needs; pin exact versions.
- Code, comments and docs in English. Doc comments on public functions.

## STEPS (stop after step 1 and wait for my "go")

1. **Plan.** Reply with: the file list you will add or change; the message and state schema
   (as a short table); how you solve the card pause; prediction yes or no; risks. No code yet.
2. Server room running the shared sim, plus a Vitest test that steps a room with two fake
   players and checks the inputs move the right player.
3. `ColyseusTransport` + interpolation; two browser tabs see each other move.
4. Lobby, room codes, host start, join by link.
5. Disconnect/reconnect, host migration, game over back to lobby.
6. README section "Play online" (how to run it locally and on one LAN), and the
   entries in `docs/changelog.md` and `docs/prompt-log.md`.

After each step: run `npm run smoke`, then tell me exactly how to test it by hand.

## SELF-REVIEW BEFORE YOU SAY "DONE"

Check each item and report it as pass or fail, with the evidence:
- [ ] Solo mode still works and all existing tests pass.
- [ ] Two browser windows on one computer play in the same room for 2 minutes without desync.
- [ ] A second computer on the same Wi-Fi can join with the room code.
- [ ] A player opening a card does not freeze the other player.
- [ ] Closing a tab and reopening it within 10 s gives back control of the same character.
- [ ] A client cannot move faster by sending `moveX: 50` (the input is clamped).
- [ ] Measured: messages per second and bytes per second per client with 6 players.
- [ ] Screenshot of two clients in one match saved in `production/qa/evidence/`.

If you could not check an item, say so; do not mark it as passed.

## OUTPUT FORMAT

Write the code to files (not to the chat). Each reply lists the changed files, explains the
important decisions in a few lines, and ends with a **How to test** section.

### Example of the level of detail I want in the plan's schema table

| Direction | Message | Payload | When |
|---|---|---|---|
| client → server | `input` | `{ seq, moveX, moveY, roll, pick }` | every frame the input changes, max 30/s |
| server → client | state patch | players (id, x, y, hp, level, alive), enemies (id, type, x, y), bullets, gems | 20 Hz |
| server → one client | `cardsOffered` | `{ cards: string[] }` | on level-up |
