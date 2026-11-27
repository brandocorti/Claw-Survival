// Coins and hearts dropped by enemies, and the movement shared with XP gems:
// pop out, slow down, then fly to a nearby player.
import { createPickup } from '../entities/pickup.js';
import { openSpotNear } from '../map.js';

/** Random pop-out velocity. */
export function popVelocity(rng) {
  const angle = rng.range(0, Math.PI * 2);
  const speed = rng.range(20, 55);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

/**
 * Rolls an enemy's loot: a coin with drops.coinChance (bosses drop a fixed number),
 * and a heart with drops.heartChance.
 * @param {object} world
 * @param {import('../entities/enemy.js').Enemy} enemy
 */
export function dropLoot(world, enemy) {
  const { drops, enemies } = world.config;
  const coins = enemies[enemy.type].coins ?? (world.rng.next() < drops.coinChance ? 1 : 0);
  for (let i = 0; i < coins; i++) drop(world, 'coin', 1, enemy);
  if (world.rng.next() < drops.heartChance) drop(world, 'heart', drops.heartHeal, enemy);
}

function drop(world, kind, value, at) {
  const spot = openSpotNear(world.map, at.x, at.y);
  const v = popVelocity(world.rng);
  world.pickups.push(createPickup(world.nextId++, kind, value, spot.x, spot.y, v.vx, v.vy));
}

/** Moves coins and hearts and applies the ones that reach a player. */
export function updatePickups(world, dt) {
  // A heart stays on the ground while you are at full health.
  const wants = (player, pickup) => pickup.kind !== 'heart' || player.health < player.maxHealth;
  flyToPlayers(world, world.pickups, dt, wants, (player, pickup) => {
    if (pickup.kind === 'coin') player.coins += pickup.value;
    else player.health = Math.min(player.maxHealth, player.health + pickup.value);
    world.events.push({ type: 'pickupCollected', playerId: player.id, kind: pickup.kind, x: player.x, y: player.y });
  });
}

/**
 * Moves everything in `list`; items that reach a player are passed to `take` and removed.
 * @param {object} world
 * @param {object[]} list - changed in place
 * @param {number} dt
 * @param {(player: object, item: object) => boolean} wants
 * @param {(player: object, item: object) => void} take
 */
export function flyToPlayers(world, list, dt, wants, take) {
  const cfg = world.config.xp;
  const pickupDist = world.config.player.radius + 2;
  let kept = 0;
  for (const item of list) {
    let target = item.targetId ? world.players.find((p) => p.id === item.targetId && p.alive && wants(p, item)) : null;
    target ??= nearestPlayerWithin(world, item, cfg.pickupRadius, wants);
    item.targetId = target ? target.id : null;

    if (target) {
      const dx = target.x - item.x;
      const dy = target.y - item.y;
      const dist = Math.hypot(dx, dy) || 1;
      item.vx += (dx / dist) * cfg.magnetAcceleration * dt;
      item.vy += (dy / dist) * cfg.magnetAcceleration * dt;
      const speed = Math.hypot(item.vx, item.vy);
      if (speed > cfg.magnetMaxSpeed) {
        item.vx *= cfg.magnetMaxSpeed / speed;
        item.vy *= cfg.magnetMaxSpeed / speed;
      }
    } else {
      const drag = Math.pow(0.02, dt); // the pop-out stops within about 1 s
      item.vx *= drag;
      item.vy *= drag;
    }
    item.x += item.vx * dt;
    item.y += item.vy * dt;

    if (target && Math.hypot(target.x - item.x, target.y - item.y) <= pickupDist) take(target, item);
    else list[kept++] = item;
  }
  list.length = kept;
}

function nearestPlayerWithin(world, item, radius, wants) {
  let best = null;
  let bestD = radius;
  for (const p of world.players) {
    if (!p.alive || !wants(p, item)) continue;
    const d = Math.hypot(p.x - item.x, p.y - item.y);
    if (d <= bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
