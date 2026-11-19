// Building blocks for enemy behaviours: steering and firing.
import { createBullet } from '../../sim/entities/bullet.js';
import { lineBlocked } from '../../sim/map.js';

export const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
export const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

/**
 * Sets the enemy's velocity toward the target. Walkers follow the flow field
 * around ponds and rocks; flyers go straight.
 */
export function moveToward(world, enemy, target, speed) {
  let dx = target.x - enemy.x;
  let dy = target.y - enemy.y;
  if (!enemy.flying) {
    const dir = world.flowField.directionFrom(enemy.x, enemy.y);
    if (dir) {
      dx = dir.x;
      dy = dir.y;
    }
  }
  const len = Math.hypot(dx, dy) || 1;
  enemy.vx = (dx / len) * speed;
  enemy.vy = (dy / len) * speed;
}

/**
 * Stays about `preferred` pixels from the target: closes in, backs off, or
 * circles around it in between (direction depends on the enemy id).
 */
export function keepDistance(world, enemy, target, speed, preferred) {
  const d = distance(enemy, target);
  if (d > preferred + 15 || (!enemy.flying && lineBlocked(world.map, enemy.x, enemy.y, target.x, target.y))) {
    moveToward(world, enemy, target, speed);
    return;
  }
  const a = angleTo(enemy, target);
  if (d < preferred - 15) {
    enemy.vx = -Math.cos(a) * speed;
    enemy.vy = -Math.sin(a) * speed;
    return;
  }
  const side = enemy.id % 2 === 0 ? 1 : -1;
  enemy.vx = -Math.sin(a) * side * speed * 0.5;
  enemy.vy = Math.cos(a) * side * speed * 0.5;
}

/**
 * Fires one enemy bullet from the enemy's position.
 * @param {{ bulletSpeed: number, damage: number, range: number }} stats
 */
export function fireBullet(world, enemy, angle, stats) {
  world.bullets.push(
    createBullet(world.nextId++, enemy.id, 'enemy', enemy.x, enemy.y, angle, {
      speed: stats.bulletSpeed,
      range: stats.range,
      damage: stats.damage,
      radius: world.config.enemyBullets.radius,
    }),
  );
}

/** Fires `count` bullets in a full circle, starting at `offset` radians. */
export function fireRing(world, enemy, count, offset, stats) {
  for (let i = 0; i < count; i++) fireBullet(world, enemy, offset + (i * Math.PI * 2) / count, stats);
  world.events.push({ type: 'enemyShot', id: enemy.id, x: enemy.x, y: enemy.y });
}

/** Fires `count` bullets spread over `spread` radians, centered on `angle`. */
export function fireFan(world, enemy, angle, count, spread, stats) {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    fireBullet(world, enemy, angle + t * spread, stats);
  }
  world.events.push({ type: 'enemyShot', id: enemy.id, x: enemy.x, y: enemy.y });
}

/** True if a bullet from the enemy could reach the target (no wall or rock between). */
export function canShoot(world, enemy, target, range) {
  return distance(enemy, target) <= range && !lineBlocked(world.map, enemy.x, enemy.y, target.x, target.y);
}
