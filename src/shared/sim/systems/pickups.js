// Buff pickups: periodic arena spawns on reachable sand and collection on touch.
import { createPickup } from '../entities/pickup.js';
import { boxBlocked } from '../map.js';
import { EPSILON } from '../math.js';
import { applyEffect } from './effects.js';

const PICKUP_CLEARANCE_RADIUS = 5;

/**
 * Spawns a pickup at (x, y) and emits pickupSpawned.
 * @param {object} world
 * @param {string} effectId
 * @param {number} x
 * @param {number} y
 * @param {number} [lifetime]
 * @returns {import('../entities/pickup.js').Pickup}
 */
export function spawnPickup(world, effectId, x, y, lifetime = world.config.pickups?.lifetime ?? 18) {
  const pickup = createPickup(world.nextId++, effectId, x, y, lifetime);
  world.pickups.push(pickup);
  world.events.push({ type: 'pickupSpawned', id: pickup.id, effectId, x, y });
  return pickup;
}

/**
 * Finds a reachable walkable sand spot near a random living player.
 * @param {object} world
 * @returns {{ x: number, y: number } | null}
 */
export function findPickupSpot(world) {
  const { map, rng, config } = world;
  const alive = world.players.filter((p) => p.alive);
  if (alive.length === 0) return null;

  world.flowField.update(alive);
  const anchor = alive[rng.int(0, alive.length - 1)];
  const minD = config.pickups?.minDistance ?? 60;
  const maxD = config.pickups?.maxDistance ?? 170;
  const ok = (x, y) =>
    !boxBlocked(map, x, y, PICKUP_CLEARANCE_RADIUS, 'walk') && world.flowField.stepsAt(x, y) !== 0xffff;

  for (let attempt = 0; attempt < 24; attempt++) {
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(minD, maxD);
    const x = anchor.x + Math.cos(angle) * dist;
    const y = anchor.y + Math.sin(angle) * dist;
    if (ok(x, y)) return { x, y };
  }

  const ts = map.tileSize;
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = (rng.int(0, map.width - 1) + 0.5) * ts;
    const y = (rng.int(0, map.height - 1) + 0.5) * ts;
    if (Math.hypot(x - anchor.x, y - anchor.y) >= minD * 0.5 && ok(x, y)) return { x, y };
  }
  return null;
}

/**
 * Spawns timed buff pickups during waves, expires old ones, and collects on player touch.
 * @param {object} world
 * @param {number} dt
 */
export function updatePickups(world, dt) {
  const cfg = world.config.pickups;
  const alive = world.players.filter((p) => p.alive);

  if (world.spawning && world.match.phase === 'waves' && cfg?.pool?.length > 0 && alive.length > 0) {
    world.pickupSpawnTimer -= dt;
    if (world.pickupSpawnTimer <= EPSILON) {
      world.pickupSpawnTimer = cfg.spawnInterval;
      if (world.pickups.length < cfg.maxOnMap) {
        const effectId = cfg.pool[world.rng.int(0, cfg.pool.length - 1)];
        const spot = findPickupSpot(world);
        if (spot) spawnPickup(world, effectId, spot.x, spot.y, cfg.lifetime);
      }
    }
  }

  const collectDist = world.config.player.radius + (cfg?.collectRadius ?? 9);
  const collectDist2 = collectDist * collectDist;
  const pickups = world.pickups;
  let kept = 0;

  for (let i = 0; i < pickups.length; i++) {
    const p = pickups[i];
    p.life -= dt;
    if (p.life <= EPSILON) continue;

    let collector = null;
    for (const player of alive) {
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      if (dx * dx + dy * dy <= collectDist2) {
        collector = player;
        break;
      }
    }

    if (collector) {
      p.collected = true;
      applyEffect(world, collector, p.effectId);
      world.events.push({
        type: 'pickupCollected',
        id: p.id,
        playerId: collector.id,
        effectId: p.effectId,
        x: p.x,
        y: p.y,
      });
      continue;
    }

    pickups[kept++] = p;
  }
  pickups.length = kept;
}
