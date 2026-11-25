// Volcano hazards: warning shadows, falling rocks, and area explosions.
import { boxBlocked } from '../map.js';
import { EPSILON } from '../math.js';
import { queueExplosion } from './damage.js';

const ROCK_CLEARANCE_RADIUS = 5;

/**
 * Creates a volcano rock hazard with a warning timer, pushes it to world.hazards,
 * emits volcanoRockWarning, and returns the hazard object.
 * @param {object} world
 * @param {number} x
 * @param {number} y
 * @param {object} [cfg]
 * @returns {object}
 */
export function spawnVolcanoRock(world, x, y, cfg = world.config?.volcano) {
  const hazard = {
    id: world.nextId++,
    kind: 'volcanoRock',
    x,
    y,
    remaining: cfg.warningSeconds,
    duration: cfg.warningSeconds,
    radius: cfg.radius,
    playerDamage: cfg.playerDamage,
    enemyDamage: cfg.enemyDamage,
  };
  (world.hazards = world.hazards || []).push(hazard);
  world.events.push({
    type: 'volcanoRockWarning',
    id: hazard.id,
    x,
    y,
    radius: cfg.radius,
    duration: cfg.warningSeconds,
  });
  return hazard;
}

/**
 * Finds a reachable walkable sand spot near a living player, falling back
 * to any open walkable tile.
 * @param {object} world
 * @param {import('../entities/player.js').Player[]} alive
 * @param {object} cfg
 * @returns {{ x: number, y: number } | null}
 */
export function findRockSpot(world, alive, cfg) {
  const { map, rng } = world;
  const minD = cfg.minDistance;
  const maxD = cfg.maxDistance;
  const ok = (x, y) =>
    !boxBlocked(map, x, y, ROCK_CLEARANCE_RADIUS, 'walk') && world.flowField.stepsAt(x, y) !== 0xffff;

  for (let attempt = 0; attempt < 24; attempt++) {
    const anchor = alive[rng.int(0, alive.length - 1)];
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
    if (ok(x, y)) return { x, y };
  }
  return null;
}

/**
 * Triggers a volcano eruption, updating the flow field and spawning up to
 * cfg.rockCount rocks on reachable sand spots around living players.
 * @param {object} world
 * @returns {number} number of rocks spawned
 */
export function triggerVolcanoEruption(world) {
  const cfg = world.config?.volcano;
  const alive = world.players.filter((p) => p.alive);
  if (!cfg || alive.length === 0) return 0;

  world.flowField.update(alive);
  const rockCount = cfg.rockCount ?? 0;
  let count = 0;

  for (let i = 0; i < rockCount; i++) {
    const spot = findRockSpot(world, alive, cfg);
    if (spot) {
      spawnVolcanoRock(world, spot.x, spot.y, cfg);
      count++;
    }
  }

  if (count > 0) {
    world.events.push({ type: 'volcanoStarted', count });
  }
  return count;
}

/**
 * Advances hazard timers, triggers periodic eruptions during waves,
 * and explodes hazards whose warning duration has elapsed.
 * @param {object} world
 * @param {number} dt
 */
export function updateHazards(world, dt) {
  const cfg = world.config?.volcano;
  const alive = world.players.filter((p) => p.alive);

  if (
    world.spawning &&
    world.match?.phase === 'waves' &&
    cfg &&
    world.match.round >= cfg.startRound &&
    alive.length > 0
  ) {
    if (world.volcanoTimer == null) {
      world.volcanoTimer = cfg.initialDelay ?? cfg.interval;
    }
    world.volcanoTimer -= dt;
    if (world.volcanoTimer <= EPSILON) {
      world.volcanoTimer = cfg.interval;
      triggerVolcanoEruption(world);
    }
  }

  const hazards = world.hazards;
  if (!hazards || hazards.length === 0) return;

  let kept = 0;
  for (let i = 0; i < hazards.length; i++) {
    const h = hazards[i];
    h.remaining -= dt;
    if (h.remaining <= EPSILON) {
      queueExplosion(
        world,
        h.x,
        h.y,
        { radius: h.radius, playerDamage: h.playerDamage, enemyDamage: h.enemyDamage },
        null,
      );
      world.events.push({
        type: 'volcanoRockImpact',
        id: h.id,
        x: h.x,
        y: h.y,
        radius: h.radius,
      });
    } else {
      hazards[kept++] = h;
    }
  }
  hazards.length = kept;
}
