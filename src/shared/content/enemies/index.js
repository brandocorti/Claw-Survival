// Enemy registry. To add an enemy:
//   1. stats in config.js -> enemies.<id>
//   2. behaviour file here with update(world, enemy, target, stats, dt)
//      (optional: onContact(world, enemy, player), onDeath(world, enemy, killerId))
//   3. register it below
//   4. art in src/client/art/enemyArt.js
//   5. add it to config.rounds.enemyWeights so it spawns
import { crab } from './crab.js';
import { coconut } from './coconut.js';
import { skeleton } from './skeleton.js';
import { tiki } from './tiki.js';
import { crabKing } from './crabKing.js';
import { crabEmperor } from './crabEmperor.js';

export const ENEMY_TYPES = Object.freeze({ crab, coconut, skeleton, tiki, crabKing, crabEmperor });
