// Ability registry. To add an ability card:
//   1. numbers in config.js -> abilities.<id> (must include maxLevel)
//   2. an object with `name`, `describe(level, cfg)` and one or more of:
//        modify(stats, level, cfg, base)        change the player's numbers
//        onPick(world, player, level, cfg)      one-time effect when picked
//        update(world, player, level, cfg, dt)  runs every tick
//   3. register it below
//   4. an icon in src/client/art/cardArt.js
import { damage, fireRate, moveSpeed, maxHearts, multishot, piercing } from './statBoosts.js';
import { orbitCoconuts } from './orbitCoconuts.js';
import { fireTrail } from './fireTrail.js';
import { orbitShield } from './orbitShield.js';
import { bombCannon } from './bombCannon.js';

export { orbitShield, bombCannon };

export const ABILITY_TYPES = Object.freeze({
  damage, fireRate, moveSpeed, maxHearts, multishot, piercing, orbitCoconuts, fireTrail, orbitShield, bombCannon,
});
