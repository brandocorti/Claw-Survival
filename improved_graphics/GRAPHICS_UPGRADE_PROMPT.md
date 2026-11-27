# Prompt: Graphics upgrade (environment, Crab Emperor, hero)

> Paste everything from **"ROLE"** down into the AI coding assistant, with the repository and this
> `improved_graphics/` folder available to it. The folder holds the target images, videos and a
> working prototype of every change (`reference_code/`). The goal is for the game to look like
> `images/` and `videos/` after the work is done.

---

## ROLE

You are a senior gameplay programmer and technical pixel artist on a student team. You have shipped
top-down pixel-art roguelikes in the style of *Enter the Gungeon*. You write clean, modular
JavaScript (ES modules) for **Phaser 3.90 + Vite 6**, and you care about readability at 480×270,
60 FPS and game feel.

## CONTEXT

- Repository: browser game, Phaser 3.90.0, Vite 6.3.5, tests with Vitest (`npm test`, `npm run smoke`).
  Code layout: `src/client/` (art, entities, scenes, systems, ui), `src/shared/` (config, sim, content, art).
- Rendering is pixel-perfect: internal resolution **480×270**, integer scaling, `pixelArt: true`,
  `roundPixels: true`, 16 px tiles. All art is generated in code from pixel grids
  (`src/client/art/pixelArt.js`: `gridFromStrings`, `addOutline`, `createTextureFromGrid`, `createSpritesheet`).
- The simulation in `src/shared/sim/` is deterministic and will run on a server later.
  **Visual changes must never change game rules.** Views read the world state and the events
  (`src/shared/protocol.js`) and draw them.
- Palette rule from the design brief: **purple is reserved for curses / bad perks**. Never use it for anything else.
- Team rules (`CLAUDE.md`): every substantial change gets an entry in `docs/changelog.md`, every
  AI prompt / iteration gets an entry in `docs/prompt-log.md`, entries cross-linked, English only,
  no commits unless the user asks, always keep a runnable build.

### The reference material in `improved_graphics/`

| Path | What it is | How to use it |
|---|---|---|
| `images/environment/*_calm.png`, `*_fight.png` | Left = game before, right = after one upgrade (same seed, same inputs) | Visual target for upgrades E1–E5 |
| `images/environment/all_calm.png`, `all_fight.png` | All five environment upgrades together | Overall target |
| `images/environment/frame_now_fight_1x.png`, `frame_target_fight_1x.png` | The same game frame at native 480×270, before and after | Pixel-level target for colours and sizes |
| `images/villain/villain_design_sheet.png` | Your current Crab Emperor (top) vs the proposed parts and poses (bottom) | Target for V1 |
| `images/villain/villain_key_moments.png` | Entrance card, fan cone, charge lane, ring circle + phase II | Target for V3–V5 |
| `images/villain/frame_*_1x.png` | Native-resolution boss frames: intro, fan wind-up, charge wind-up, ring wind-up, death + crown | Pixel-level targets |
| `images/hero/hero_design_sheet.png` | Current hero vs every proposed frame (walk ×4 × 3 directions, idle ×2, blink, hurt, roll ×4, 4 skins) | Target for H1–H3, H5 |
| `images/hero/hero_ingame_closeups.png` | Current vs proposed hero in game (walk, roll, facing away) | Target in context |
| `videos/before_after_side_by_side.mp4` | 12 s, before (left) vs all environment upgrades (right) | Motion target: water, palms, glows, debris, footprints |
| `videos/after_all_upgrades_fullsize.mp4` | Same 12 s, full size, upgraded only | Motion target |
| `videos/villain_proposed_fight.mp4` | 13 s boss fight: entrance, telegraphs, phase II, death, crown drop | Motion target for V2–V5 |
| `videos/hero_before_after_closeup.mp4` | 8 s close-up, current vs proposed hero | Motion target for H2–H4 |
| `reference_code/prototype.patch` | `git diff` of the working prototype against the version reviewed (Crab King era) | **Primary source.** Port it, do not reinvent it |
| `reference_code/new_files/` | The new modules from the patch as plain files | Same code, easier to read |
| `tools/capture.py`, `tools/crop_follow.py` | Deterministic frame capture (Playwright + Chrome) | Produce your own matching screenshots for verification |

The prototype was built behind URL flags (`?gfx=all` or `?gfx=terrain,props,light,juice,hud,boss,hero`)
on top of the **Crab King** boss. The current repository may already have a **Crab Emperor** final boss
(`FINAL BOSS` / `CRAB EMPEROR` in the HUD). Apply the villain work to the Crab Emperor; where the
patch says `crabKing`, use the Emperor's entity type, stats and attack states.

## TASK

Implement **15 graphics upgrades** so the game matches the reference images and videos. Work in the
milestone order below. After each milestone the game must build, run and pass the tests.

### Milestone 0: set-up (no visual change yet)

1. Read `improved_graphics/` fully: this prompt, every image, `reference_code/prototype.patch`.
2. Find the current boss code (search `src/` for `Emperor`, `bossRounds`, `boss: true`). Write down
   its type key, radius, HP, attack states and where its view is created. If it has no wind-up state
   per attack, list that as a gap and ask before changing the simulation.
3. Create `src/client/gfx/` and copy in `flags.js`, `noise.js` from the reference.
4. Change `flags.js` so that **every upgrade is ON by default**, and `?classic` switches them all
   OFF (for before/after recordings in the presentation). Keep the single flags (`?gfx=terrain`, etc.)
   for testing one upgrade at a time.
5. Keep the dev capture options from the patch: `?capture` (game loop sleeps; a harness steps frames,
   `preserveDrawingBuffer: true`) and `?script` (deterministic scripted input). Dev only.

### Milestone 1: environment (E1–E5)

Port these modules from `reference_code/new_files/client/gfx/` and wire them as in the patch.

**E1 · Terrain and shorelines (`terrain.js`, used by `MapView.js`)**
- Bake the whole arena floor into **3 canvas textures** (`terrain0..2`) once, at map creation, and cycle them every **380 ms** (water animation). Hide the old tilemap layer; **collision stays on the 16 px tile grid**.
- Water edge = tile water mask, box-blurred twice (radius 5 then 4), plus value noise (scale 7, ±0.07). Threshold 0.5 gives rounded shorelines.
- Water colours by depth: foam `#e6fff8` (animated band around 0.535 ± 0.02), shallow `#56cfc2`, water `#22a7a6`, dark `#1b8a8e`, deep `#167683`, wave streaks `#8debdd`, sparkles. Bank face where land is above the water (3/4 view): `#8f6a40`, `#6e5032`, then a `deep` row.
- Wet sand ring `#c9a265` / `#b38a55` where the blurred value is above 0.33.
- Cliff faces are **26 px tall** (more than one tile): grass lip, hanging vines (`#2c5a2c` / `#4f8f42`), strata lines every 7 px with noise wobble, cracks, dithered shading `#97836b → #7d6b58 → #66574a`, dark base 2 px.
- Jungle tops: round bush clumps from a jittered 10 px grid, lit from the top-left (`#7fbf5a`, `#5a9a48`, `#3e7a3a`, `#2c5a2c`, rims `#244a26`), outline `#1b331d` where it meets sand.
- Sand: large soft patches (value noise 56 px + 18 px, very light dither), wind ripples `#d6b273`, sparse specks.
- Cliff shadows on sand and water: 3 px strong (×0.70), dithered up to 8 px below the face, up to 5 px to the right.
- Target: `images/environment/terrain_calm.png`.

**E2 · Set dressing (`props.js`)**
- Palm trees: trunk 12×42 (curved, segmented), crown 50×30 that **sways ±2.5°** (sine, 1.6 s period, offset per palm), soft frond-shaped shadow offset +14 px right. Place them deterministically near cliffs (≤2 tiles), rarely near water, ≥10 tiles apart (Manhattan), never within 5×4 tiles of the spawn.
- **Shipwreck next to the spawn** (84×56 hull, ribs, snapped mast, torn sail, sand drifts without outline), with crates, a barrel and driftwood around it.
- Scatter: grass tufts (3 variants, mostly at cliff bases), shells and starfish at the water's edge, rare driftwood, bones, crates, barrels.
- Add a shadow under every rock.
- **New in the final version:** keep tall props (palms, wreck) at least 4 tiles away from the boss's spawn point and the central fight area, so the boss is never hidden (in the prototype a palm crown sometimes covers it). Wreck, crates and barrels must block movement, so add them to the collision map (new tile types or a prop collision list in `src/shared/`) and to the flow field. Palm trunks block movement too (radius 3 px).
- Target: `images/environment/props_calm.png`.

**E3 · Light and atmosphere (`lighting.js`)**
- Screen-space vignette (smooth, starts at 0.6 of the radius, max alpha **0.7**, colour `#1a0c14`).
- Warm sun wash from the top-left (`#ffc46e`, ADD blend, alpha **0.08**).
- Camera colour grade (WebGL `postFX.addColorMatrix`): `saturate(0.15)`, `contrast(0.05, true)`, `brightness(0.95, true)`. Wrap it in `try` so the canvas renderer still works. **Do not** raise brightness: the sand clips to white.
- 3 drifting cloud shadows (smooth alpha, `#141e3c`, alpha **0.08**, scale 1.4–1.9, ~7 px/s).
- Additive glows (stepped 24×24 radial texture `glow`, tinted): player pebbles `#ffc84a`, enemy bullets `#ff3d4a`, XP gems in their own colour (pulsing), fire-trail flames `#ff8a2a`.
- Floating light motes (few, ADD, fade in and out).
- Target: `images/environment/light_fight.png` and the colours of `frame_target_fight_1x.png`.

**E4 · Combat feedback and debris (`juice.js` + view changes)**
- Enemies **squash** on hit (scale x+0.3 / y−0.25, back over 0.14 s), **pop** when they finish spawning, and breathe slightly (scaleY ±4 %).
- Player pebbles leave a **3-dot trail** (`#fff7c2`, `#ffb52e`, alpha 0.75/0.5/0.25).
- On death: 5 chunks (30 for a boss) in the enemy's colours fly in an arc (gravity 420), bounce twice, then are **stamped permanently into a ground RenderTexture**, with a faint stain. A white "poof" ring.
- Explosions stamp a dark **scorch mark** (jagged edge, scale ≤0.7, alpha 0.85).
- Footprints: a 2×2 dark sand print every 7 px walked, alternating sides, fading after 1.2 s.
- **New in the final version:** hit-stop of 3–4 frames on a boss hit-phase change, the boss death and big explosions. Client-side only (pause the render interpolation, not the simulation), so it stays server-safe.
- Target: `images/environment/juice_fight.png` and the debris in `videos/before_after_side_by_side.mp4`.

**E5 · HUD and player marker**
- Dark glass plates behind the hearts and the timer, a blue level chip (`#1f6f8b`), the round on a **wooden plank sign**, ability icons in framed slots with **level pips** (gold `#ffd23a` = owned level, `#4a3a3a` = remaining up to `maxLevel`) instead of a number.
- XP bar: 10 segment ticks, two-tone fill, a white leading edge and a moving shine.
- Player marker: a 18×8 ellipse ring under the feet, cyan `#4de1ff`, pulsing alpha (in multiplayer, use one colour per player; never purple).
- Target: `images/environment/hud_fight.png`.

### Milestone 2: villain, the Crab Emperor (V1–V5)

Port `shared/art/emperor.js` and `client/gfx/boss.js`, and wire them through `EnemyViews.js`, `GameScene.js` and `Hud.js` as in the patch.

**V1 · Silhouette from parts**: separate textures, all with the 1 px `#1a1212` outline: body 52×32 (domed navy shell `#1f3352`/`#2f4d78`/`#4f78a8`/`#8fb4e0`, deep `#0f1828`, gold filigree band `#f0c040`, 5 ridge spikes, barnacles, front face with a fanged mouth), claw 30×26 in **3 frames** (closed / half / open; crimson `#c8322a`, light `#ff6a4a`, dark `#8a1e1a`, gold tips), leg 16×6, eye stalk 8×14, crown 22×13 (gold, red centre gem, teal side gems). A **phase-2 body** with glowing cracks (`#ff7a2a` / `#ffe08a`). Target: `villain_design_sheet.png`.
- **Fix:** the boss collision radius must match the art. Set it to about **22 px** (the prototype kept the Crab King's 12, which feels unfair). Check spawn spacing and the flow field still work.

**V2 · Animated rig** (a Phaser Container, depth = ground y): legs scuttle (±0.35 rad, faster while charging), body bobs, eye stalks sway, **2×2 pupils track the hero** (red when angry), claws snap idly, body leans into the charge, and the boss rises out of the sand while spawning.

**V3 · Ground telegraphs per attack** (drawn on the ground, below characters, `#ff3d4a`):
- Fan: a cone of radius 110 and the real spread toward the hero, filled more as the wind-up progresses.
- Charge: a lane of the real charge length (`speed × duration`) and width `radius×2+10`, outlined, with 4 moving yellow chevrons.
- Ring: a circle growing from 14 to 64 px, with dots where each bullet will start.
- During any wind-up the claws rise 10 px and open, the parts flicker a light tint `#ffd0a0`, and sparks gather on the claws.
- Map these to the Emperor's real attacks. Any new attack gets its own readable shape.
- **Remove the auto-aim corner brackets from the boss** (they cover it in the current game).

**V4 · Entrance, phase II, death**
- Entrance on `bossSpawned`: black bars slide in (24 px), the camera **pans to the boss for 1.8 s**, a screen shake, and a name plate "CRAB EMPEROR" (gold, ×2) with "TYRANT OF THE TIDE" (`#ff6a4a`). Out after 2.3 s. Replace the old "CRAB KING!" banner.
- Phase II below 50 % HP: cracked body texture, red pupils, the crown tilts, steam particles.
- Death: 7 chained explosions over ~0.85 s with shakes, chunks, and the **crown flies up, spins and lands as a trophy** that stays on the ground.
- Target: `villain_key_moments.png`, `frame_intro_1x.png`, `frame_death_crown_1x.png`, `videos/villain_proposed_fight.mp4`.

**V5 · Boss UI and hit flash**
- Framed boss bar 200 px wide at the bottom: dark plate with gold lines, "CRAB EMPEROR" in gold (" - II - " added in phase two), a **white trailing bar** that catches up slowly (lerp 0.04 per frame), a gold notch at 50 %.
- **Hit flash throttled**: at most one 0.035 s white flash every 0.3 s, plus a tiny squash, so a stream of pebbles never turns the boss into a white blob.

### Milestone 3: hero (H1–H5)

Port `shared/art/hero.js` and `client/gfx/hero.js`, and the `PlayerView.js` changes.

- **H1 · Redraw** at **18×23** (20×25 with outline): bigger head, big eyes with a highlight, side-swept fringe, red bandana with tails, **teal vest** (`#2f7f9e` / `#55b4cc` / `#1d5468`) over a cream shirt, navy shorts (`#2b3a5c`), rope belt, sandals. Directions: down, up, side (left = mirrored).
- **H2 · Animations**: 4-frame walk per direction at 10 fps (contact frames drop the body 1 px, arms swing opposite to the legs, bandana tails flutter), idle 2 frames at 2 fps (breathing), a blink every ~3.2 s, a hurt face for 0.35 s after a hit.
- **H3 · Roll**: a curled-up 16×16 ball rotated in 90° steps (8 steps per second, direction follows the roll), with a 4 px hop.
- **H4 · Feedback**: a new slingshot sprite with `rest` / `pull` frames; on each `shot` event of the local player show `pull` for 0.06 s and move the hand back 2 px. On hit: a white silhouette flash. During invincibility: flicker a light tint `#ffb0a0`, **never** go transparent.
- **H5 · Skins**: the hero art is built from traits (`HERO_TRAITS`). Expose the trait palette so the lobby / GenAI skin pipeline can recolour it; the 4 example palettes are in `hero_design_sheet.png`. This is the procedural fallback for the `SkinGenerator`.
- Small fixes over the prototype: clean the back-view bandana knot (it reads as scattered red pixels), and keep the weapon hand position correct for the taller sprite (`config.player.handHeight`).
- Optional, only if time allows: diagonal directions (down-left/right, up-left/right).
- Target: `images/hero/*`, `videos/hero_before_after_closeup.mp4`.

### Milestone 4: verify, document, report

1. Run `npm run smoke` (tests + build). Fix anything that fails.
2. Capture matched screenshots with the harness: `npm run dev`, then
   `python3 improved_graphics/tools/capture.py "tough&round=3&cards=10&seed=7" out_now "450,3600"` with `&classic`,
   and again without it. Compare them with `images/environment/all_calm.png` / `all_fight.png`.
   For the boss use `"tough&round=3&cards=12&seed=7&bosshp=0.6"` and frames around 5700–6100.
   (If your boss or arena changed, the frames will differ; compare the look, not the exact positions.)
3. Check performance: **60 FPS with ~150 enemies** in Chrome on a normal laptop. Pool every per-bullet/per-gem glow and trail sprite (as the reference does). If FPS drops, first reduce glow count for enemy bullets, then cloud shadows.
4. Add entries to `docs/changelog.md` (one per milestone, type `feature`/`assets`, files touched, link to the prompt-log entry) and to `docs/prompt-log.md` (use `improved_graphics/prompt-log-entries.md` and add one entry for this run).
5. Report in this format.

## CONSTRAINTS

- Do not change game rules except the three listed changes: the boss radius (V1), prop collision (E2), and the boss wind-up state if one is missing (ask first).
- Everything stays generated in code (no external image files) so the art keeps working on the server and for GenAI skins.
- Integer pixel positions (`Math.round`) for all sprites. Nearest-neighbour only.
- Purple stays reserved for curses.
- Pool and reuse game objects; no per-frame allocations in hot loops.
- One module per upgrade area under `src/client/gfx/`. Short comments in English.
- Give complete files, never "…rest unchanged". Name each file with its path above its code block.
- Do not commit unless the user asks.

## OUTPUT FORMAT (per milestone)

1. **Summary**: 3–5 bullets of what changed.
2. **Files**: full content of every new or changed file, with its path.
3. **How to test**: exact URL(s) and what you should see, with the matching reference image or video.
4. **Differences from the reference**: anything that looks different and why.
5. **Changelog and prompt-log entries** for this milestone.

## ACCEPTANCE CHECKLIST

- [ ] Ponds have rounded, foamy, animated shores; cliffs show 26 px faces with vines and cast shadows.
- [ ] Palms sway; the wreck is beside the spawn; props never hide the boss; solid props block movement.
- [ ] Vignette, warm grade, glows and cloud shadows are on, and the sand is not blown out.
- [ ] Enemies squash on hit; debris stays on the ground; explosions leave scorch marks; footprints fade.
- [ ] HUD has plates, plank round sign, ability pips; the player has a ring.
- [ ] The Crab Emperor is built from animated parts, its eyes follow the hero, and its hitbox matches the art.
- [ ] Every boss attack shows its own ground telegraph; no aim brackets on the boss.
- [ ] Entrance card + camera pan, phase II look, death chain + crown trophy.
- [ ] Boss bar with trailing damage and phase notch; hit flash is throttled.
- [ ] Hero is 18×23 with 4-frame walks, idle/blink/hurt, real roll frames, slingshot pull, tint i-frames.
- [ ] `?classic` shows the old look for before/after comparisons.
- [ ] `npm run smoke` passes; 60 FPS with ~150 enemies.
- [ ] `docs/changelog.md` and `docs/prompt-log.md` updated and cross-linked.
