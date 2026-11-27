# Graphics upgrade: status and notes

Prompt: [`improved_graphics/GRAPHICS_UPGRADE_PROMPT.md`](../improved_graphics/GRAPHICS_UPGRADE_PROMPT.md).

| Milestone | State |
|---|---|
| M0 set-up | done |
| M1 environment | done |
| M2 Crab Emperor | done |
| M3 hero | done (optional diagonal directions not made) |
| M4 verify, document, report | done; not yet judged by a person |

## Differences from the reference

- `?classic` also removes the props' collision (no invisible walls), so a classic and a new run drift apart a little.
- The Crab King of round 3 keeps its old sprite, banner and simple yellow wind-up; the rig is only for the Emperor.
- Props never block shots. Tall props also turn see-through when they cover the player or a boss.
- Big explosions are three or more at once (hit-stop at most every half second).
- The four skin palettes were matched by eye to the design sheet; they are data only until the lobby exists.
- The reference folder is in the repository without its 30 MB of videos.

## Current boss code (asked for by M0)

- Type key `crabEmperor`, stats in `src/shared/config.js`, behaviour in `src/shared/content/enemies/crabEmperor.js`
  and `boss.js`. Radius was 15, now 22. HP 800, times 1.6 in round 5 = 1280.
- Attack states: `walk`, `fanWindup`, `ringWindup`, `chargeWindup` then `charge`, `spiralWindup` then `spiral`
  (the spiral only below half health). Every attack has its own wind-up, so there is no gap to ask about.
- Its view is created in `src/client/entities/EnemyViews.js` (`create`), art in `src/client/art/enemyArt.js`.
- The Crab King (`crabKing`) is now a separate mini-boss in round 3; the reference patch calls the final boss `crabKing`.

## What the port found

- With a radius of 22, the searches for "who is near" (16 px) miss the boss's edge and must reach 22 px.
- The victory screen would cover the death sequence, so it has to wait.
- The wreck would stand where the salesman is, so he moves beside it.
