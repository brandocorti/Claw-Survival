// Runs every enemy's behaviour, keeps them from stacking on top of each other,
// moves them, and applies contact damage to players.
import { isActive } from '../entities/enemy.js';
import { moveBox, tileAt } from '../map.js';
import { TILE } from '../../content/tiles.js';
import { EPSILON } from '../math.js';
import { damagePlayer } from './damage.js';

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
    const result = moveBox(world.map, e.x, e.y, e.radius, (e.vx + sx) * dt, (e.vy + sy) * dt, e.travel);
    e.hitWall = result.hitX || result.hitY;
    e.x = result.x;
    e.y = result.y;
    if (e.travel === 'giant') crushRocks(world, e);
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
      else damagePlayer(world, p, world.config.enemies[e.type].contactDamage, { kind: 'contact', attackerId: e.id, enemy: e });
    });
  }
}

/**
 * Giants turn the rocks they touch into sand. Otherwise one standing on a rock
 * could not be shot, because rocks stop bullets.
 */
function crushRocks(world, e) {
  const { map } = world;
  const ts = map.tileSize;
  for (let ty = Math.floor((e.y - e.radius) / ts); ty <= Math.floor((e.y + e.radius) / ts); ty++) {
    for (let tx = Math.floor((e.x - e.radius) / ts); tx <= Math.floor((e.x + e.radius) / ts); tx++) {
      if (tileAt(map, tx, ty) !== TILE.ROCK) continue;
      map.tiles[ty * map.width + tx] = TILE.SAND;
      world.flowField.invalidate();
      world.events.push({ type: 'rockCrushed', tx, ty, x: (tx + 0.5) * ts, y: (ty + 0.5) * ts });
    }
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
