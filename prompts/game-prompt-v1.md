Make me a game: a browser-based, multiplayer, top-down pixel-art roguelike called "[GAME TITLE]" (working title), visually inspired by Enter the Gungeon but set on a tropical survival island.

You are acting as the lead game developer on a student team project. Build it step by step, keep the code clean and modular, and always keep the game runnable in a browser.

==================================================
0. HOW WE WORK TOGETHER (COMMANDS)
==================================================

- `/start`: Before writing any code, reply with:
  1. The engine and tech stack you chose and why (see section 2).
  2. The project folder structure.
  3. A numbered step-by-step build plan, following the milestones in section 9, with what each step delivers and how I can test it in the browser.
  Then wait for me to say "go" before coding.
- `/next`: Implement the next milestone of the plan. Give me the full code for every new or changed file, then tell me exactly how to run and test it.
- `/status`: Show which milestones are done, what's in progress, and known bugs.
- `/explain <topic>`: Explain how a part of the code works so the team can work on it.

Rules for every reply that contains code:
- Give complete files, never "…rest of code unchanged".
- Name each file with its path above its code block.
- End with "How to test": the exact steps to see the change working in the browser.

==================================================
1. GAME CONCEPT
==================================================

Story: A group of players sail to a remote tropical island. The boat breaks apart and everyone washes up on the beach. Help is coming, but the rescue boat only has room for one. Players must survive the island, grow stronger, sabotage each other, and finally fight for the rescue.

Core loop:
1. Each player plays through X rounds (configurable, default 5) of increasingly difficult enemy waves.
2. Defeated enemies drop XP gems. When the XP bar fills, the player levels up.
3. On level-up, the game pauses for that player only and shows 3 cards. The player picks ONE:
   - ABILITY: buffs their own build.
   - BAD PERK: a debuff sent to another player (the player chooses the target).
4. When the 10-minute match timer ends (configurable), the PvE stops. All surviving players are brought into one final arena and fight each other (PvP). The last one alive wins the rescue.

==================================================
2. ENGINE & TECH STACK (WEB / HTML)
==================================================

- The game must run in a modern browser (Chrome, Firefox, Edge) with no install.
- Frontend: HTML5 + JavaScript (ES modules) + Phaser 3 (loaded from a CDN or npm).
  - If you think another web engine is clearly better, propose it during /start and justify it, but the default is Phaser 3.
- Rendering: pixel-perfect.
  - Base resolution 480×270, scaled up with integer scaling and nearest-neighbor filtering.
  - `pixelArt: true`, `roundPixels: true`.
- Multiplayer: a Node.js game server with WebSockets (Socket.IO or Colyseus; pick one and justify it).
  - The server is authoritative for match state, timer, enemy spawns, damage, perks, and deaths.
  - Clients send inputs and render the state with interpolation.
- Generative AI calls (section 6) are always made from the server, never from the client, so API keys never reach the browser.
- No paid assets. Until real art exists, generate placeholder pixel-art sprites in code (e.g. draw them onto canvas textures from small pixel arrays) that already follow the art direction.
- Configuration goes in one file (`config.js`): timer, rounds, XP curve, enemy stats, ability/perk values.

==================================================
3. ART DIRECTION (ENTER THE GUNGEON → ISLAND)
==================================================

Camera and view:
- Top-down 3/4 perspective like Enter the Gungeon: floors are seen from above, and walls, cliffs and objects show their front face.
- The camera follows the local player with slight smoothing. A small screen shake on big hits.

Style:
- Chunky, detailed pixel art with dark outlines and high contrast.
- Cute, chibi characters and enemies with big heads, readable silhouettes, and personality.
- Rooms or arenas framed by walls. On our island those are clearings framed by rock cliffs, dense jungle, ruin walls and water.
- Lots of debris and particles: wood splinters, sand bursts, leaves, shells, broken crates. Some objects act as cover.
- Lighting: warm glow around torches and campfires with a dark vignette at the screen edges (night arenas). Golden light on the beach (day arenas).

Palette:
- Warm sand and wood, deep jungle greens, turquoise water, torch orange.
- PURPLE IS RESERVED for curses and bad perks, so sabotage is always instantly readable.
- Bright, saturated projectiles and VFX against a more muted ground.

Environments: the beach with the shipwreck (spawn), palm jungle, rocky cliffs, ancient stone ruins, tiki camp, and the Gulag (a dark stone pit on a separate rock islet).

Enemies (cute but dangerous):
- Angry crab: fast, charges sideways.
- Coconut creature: rolls, explodes on death.
- Skeleton pirate: shoots slow bullets.
- Tiki mask spirit: floats and fires bullet patterns (light bullet-hell).
- Round-end mini-boss every few rounds (e.g. giant crab king).

HUD (pixel-art, minimal):
- Hearts for health.
- XP bar at the top.
- Match timer at the top-right.
- A small list of other players with their status (alive / Gulag / dead).
- Active debuff icons in purple.

==================================================
4. GAMEPLAY & CONTROLS
==================================================

Controls (Gungeon-style, keyboard + mouse):
- WASD to move, mouse to aim, left click to shoot.
- Space or right click to dodge roll, with brief invulnerability and a cooldown.
- E to interact.
- Level-up cards are chosen with the mouse or the keys 1/2/3.

Combat:
- Every player starts with a basic weapon, a castaway slingshot or flare pistol that fires projectiles.
- Enemy bullets are visible and dodgeable.

Abilities (self-buffs, at least 8 to start), e.g.:
- +damage, +fire rate, +move speed, +max hearts
- multishot, piercing shots, orbiting coconuts, fire-trail roll

Bad perks (sent to another player, at least 6 to start). All are purple-themed and last a limited time unless stated otherwise, e.g.:
- Slowed movement
- Fog of war shrinking their vision
- Extra enemy spawns near them
- Inverted controls (short)
- Weapon jams randomly
- A seagull that steals one XP gem every few seconds

==================================================
5. SPECIAL RULES
==================================================

Sabotage compensation:
- The server tracks who sent each active bad perk.
- If a player dies while affected by a bad perk (or within N seconds after it ends), the sender is credited and rewarded. The default reward is one free ability pick plus bonus XP; it is configurable.
- Show a killfeed message, e.g. "Alvaro's curse took down Maria!"

Gulag:
- A player who dies is sent to the Gulag instead of being eliminated.
- Gulag rule (default; make it configurable): a 1v1 duel against another dead player, or a 30-second survival challenge if they are alone. The winner returns to the island with reduced health.
- Each player can return from the Gulag only once.
- The Gulag closes when the final PvP starts.

Final PvP:
- When the timer ends, enemies despawn, and all living players are teleported to the final arena: the beach at sunset with the rescue ship on the horizon.
- They fight with their current builds. The last one standing wins.
- Show a win screen.

==================================================
6. GENERATIVE AI COMPONENTS
==================================================

A) AI-generated character skins
- In the lobby, the player chooses a few traits (e.g. outfit, accessory, main color).
- The server sends those traits plus FIXED constraints to an image model:
  - 32×32 pixel sprite, top-down 3/4 view
  - Chibi proportions, dark outline, transparent background
  - Palette limited to N colors
  - Island castaway theme
- The result is post-processed on the server (downscaled to the grid, palette quantized, background removed), cached, and sent to all clients.
- Fallback: if the AI call fails or is too slow, use a procedurally generated placeholder skin built from the same traits.
- Build this behind an interface (`SkinGenerator`) so the model can be swapped later. Start with a mock implementation.

B) AI-generated debuff messages
- When a bad perk is applied, the server asks an LLM for a short, funny, themed message (max ~15 words) using:
  - the perk type
  - the sender's name
  - the target's name
  - the island theme
  Example: "Maria bribed a seagull to steal your sandals. Enjoy walking slowly."
- The message is shown to the target in a purple pixel speech bubble or toast.
- It must never block gameplay: request it asynchronously, and use pre-written fallback messages if there's no response within ~1.5 s.
- Behind an interface (`MessageGenerator`), with a mock implementation first.
- Put API keys in a `.env` on the server. Never commit them.

==================================================
7. MULTIPLAYER
==================================================

- Lobby: create a room, then share a room code or link. Others join with a name. The host starts the match. 2–6 players (configurable).
- Each player fights on their own instance of the island during the PvE phase (separate arenas, same timer). Players can see the others' status in the HUD.
  - If you think a shared map is better, explain the trade-off in /start.
- The server owns:
  - the timer, spawns, damage, XP, level-ups
  - perk targeting, the compensation credit, the Gulag queue, and the final PvP
- Handle disconnects gracefully: a disconnected player counts as dead after a short grace period.
- During development, also support a "solo + bots" mode, where bots pick random cards and can be targeted by perks, so we can test without several people.

==================================================
8. AUDIO
==================================================

- Tropical chiptune feel (steel drums, percussion).
- Punchy retro SFX for shooting, hits, dodge, level-up, the curse being received (a distinct ominous purple sound), Gulag entry, and victory.
- Use generated or free placeholders at first.
- Add a mute toggle and volume settings.
- Audio starts only after the first user click, as browsers require.

==================================================
9. MILESTONES (BUILD IN THIS ORDER)
==================================================

1. Project setup: Phaser + pixel-perfect config + one playable test arena with a placeholder player (move, aim, shoot, dodge).
2. Enemies + waves + rounds + XP gems + HUD.
3. Level-up card system with abilities, solo only.
4. Island art pass: tileset, 3/4 walls and cliffs, lighting, particles, screen shake. The game should already look like "Enter the Gungeon on an island".
5. Node server + lobby + room codes + basic multiplayer sync.
6. Bad perks + targeting + compensation + killfeed.
7. Gulag.
8. Match timer + final PvP + win screen.
9. GenAI: debuff messages (mock first, then a real LLM).
10. GenAI: skin generation pipeline (mock first, then a real model).
11. Audio, polish, balancing, bug fixing.
12. Deployment: static frontend hosting plus the game server, with instructions.

==================================================
10. QUALITY BAR
==================================================

- 60 FPS in the browser with 6 players and around 150 enemies on screen.
- Readable at a glance: players, enemies, bullets, and curses must never blend into the background.
- Code is split by system (`scenes/`, `entities/`, `systems/`, `network/`, `ai/`, `config.js`) with short comments, so a team of 9–10 people can work in parallel.
- Include a README with how to run it locally (client + server) and how to add a new enemy, ability, or perk.

Start by replying to /start.
