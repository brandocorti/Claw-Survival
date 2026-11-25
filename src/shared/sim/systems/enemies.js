// Runs every enemy's behaviour, keeps them from stacking on top of each other,
// moves them, and applies contact damage to players.
import { isActive } from '../entities/enemy.js';
import { moveBox } from '../map.js';
import { EPSILON } from '../math.js';
import { damagePlayer } from './damage.js';
import { scaleDamage } from './difficulty.js';

/** How hard overlapping enemies push apart (pixels per second per pixel of overlap). */
const SEPARATION_STRENGTH = 10;

/**
 * @param {object} world
 * @param {number} dt
 */
export function updateEnemies(world, dt) {
  const alivePlayers = world.players.filter((p) => p.alive);
  if (alivePlayers.length > 0) world.flowField.update(alivePlayers);

  // 1. Behaviour: each enemy type sets its desired velocity (vx, vy).
  for (const e of world.enemies) {
    if (e.dead) continue;
    e.vx = 0;
    e.vy = 0;
    e.telegraph = false;
    if (e.spawnDelay > 0) {
      e.spawnDelay -= dt;
      if (e.spawnDelay <= EPSILON) e.spawnDelay = 0;
      continue;
    }
    const target = nearestPlayer(alivePlayers, e.x, e.y);
    if (!target) continue;
    world.enemyTypes[e.type].update(world, e, target, world.config.enemies[e.type], dt);
  }

  // 2. Separation, using positions before this tick's movement.
  rebuildGrid(world);
  for (const e of world.enemies) {
    if (!isActive(e)) continue;
    let sx = 0;
    let sy = 0;
    world.grid.forEachNear(e.x, e.y, e.radius + 16, (o) => {
      if (o === e) return;
      const dx = e.x - o.x;
      const dy = e.y - o.y;
      const minDist = e.radius + o.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minDist * minDist) return;
      const d = Math.sqrt(d2) || 0.01;
      // Big enemies (bosses) push small ones aside but are barely pushed back.
      const weight = (2 * o.radius) / minDist;
      const push = (minDist - d) * SEPARATION_STRENGTH * weight;
      // Exactly on top of each other: no direction to push, so split by id.
      sx += d2 === 0 ? (e.id % 2 ? push : -push) : (dx / d) * push;
      sy += (dy / d) * push;
    });
    // Deeper rooms: every velocity the behaviour set is scaled (charges too), separation is not.
    const vx = e.vx * e.speedScale + sx;
    const vy = e.vy * e.speedScale + sy;
    const result = moveBox(world.map, e.x, e.y, e.radius, vx * dt, vy * dt, e.flying);
    e.hitWall = result.hitX || result.hitY;
    e.x = result.x;
    e.y = result.y;
  }

  // 3. Grid with the new positions, used by bullets and explosions this tick.
  rebuildGrid(world);

  // 4. Contact damage.
  for (const p of alivePlayers) {
    world.grid.forEachNear(p.x, p.y, 32, (e) => {
      if (!isActive(e) || !p.alive) return;
      if (Math.hypot(e.x - p.x, e.y - p.y) >= e.radius + world.config.player.radius * 0.8) return;
      const def = world.enemyTypes[e.type];
      if (def.onContact) def.onContact(world, e, p);
      else damagePlayer(world, p, scaleDamage(world.config.enemies[e.type].contactDamage, e.damageScale));
    });
  }
}

/** Removes dead enemies from the world (end of tick). */
export function removeDeadEnemies(world) {
  const enemies = world.enemies;
  let kept = 0;
  for (let i = 0; i < enemies.length; i++) {
    if (!enemies[i].dead) enemies[kept++] = enemies[i];
  }
  enemies.length = kept;
}

function rebuildGrid(world) {
  world.grid.clear();
  for (const e of world.enemies) if (isActive(e)) world.grid.insert(e);
}

function nearestPlayer(players, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const p of players) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
