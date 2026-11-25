// Auto-aim, player shooting, and projectiles (player and enemy bullets).
import { createBullet } from '../entities/bullet.js';
import { isActive } from '../entities/enemy.js';
import { pointBlocksBullet, lineBlocked } from '../map.js';
import { EPSILON } from '../math.js';
import { damageEnemy, damagePlayer } from './damage.js';

/**
 * The nearest active enemy within autoAim.range that a shot could reach
 * (no wall or rock in between). Checks line of sight for the closest few only.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @returns {import('../entities/enemy.js').Enemy | null}
 */
export function findTarget(world, player) {
  const { range, lineOfSightChecks } = world.config.autoAim;
  const range2 = range * range;
  const candidates = [];
  for (const e of world.enemies) {
    if (!isActive(e)) continue;
    const d2 = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    if (d2 <= range2) candidates.push({ e, d2 });
  }
  candidates.sort((a, b) => a.d2 - b.d2);
  const checks = Math.min(candidates.length, lineOfSightChecks);
  for (let i = 0; i < checks; i++) {
    const { e } = candidates[i];
    if (!lineBlocked(world.map, player.x, player.y, e.x, e.y)) return e;
  }
  return null;
}

/**
 * Aims at the auto-aim target and fires at the player's fire rate (weapon + effects) while there is one.
 * No shooting during a roll. Without a target the player faces where they walk.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {number} dt - seconds
 */
export function updatePlayerWeapon(world, player, dt) {
  if (!player.alive) return;
  const weapon = world.config.weapons[player.weapon];
  const target = findTarget(world, player);
  player.targetId = target ? target.id : null;
  if (target) player.aim = Math.atan2(target.y - player.y, target.x - player.x);
  else if (player.moving) player.aim = player.moveAngle;

  if (!target || player.rolling) {
    // Do not bank shots: the next target is shot right away, but no faster than the fire rate.
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    return;
  }

  // Only count down while reloading. Leftover time carries into the next shot,
  // so the fire rate stays exact even when 1/fireRate is not a whole number of ticks.
  if (player.fireCooldown > 0) player.fireCooldown -= dt;

  const stats = { speed: weapon.bulletSpeed, range: weapon.range, damage: player.stats.damage, radius: weapon.bulletRadius };
  while (player.fireCooldown <= EPSILON) {
    const angle = player.aim + world.rng.range(-weapon.spread, weapon.spread);
    const x = player.x + Math.cos(angle) * weapon.muzzleDistance;
    const y = player.y + Math.sin(angle) * weapon.muzzleDistance;
    world.bullets.push(createBullet(world.nextId++, player.id, 'player', x, y, angle, stats));
    world.events.push({ type: 'shot', playerId: player.id, x, y, angle });
    player.fireCooldown += 1 / player.stats.fireRate;
  }
}

/**
 * Moves all bullets. Player bullets hit enemies, enemy bullets hit players
 * (a rolling player is invulnerable and the bullet passes through).
 * Bullets stop at walls and rocks and drop at the end of their range.
 * @param {object} world
 * @param {number} dt
 */
export function updateBullets(world, dt) {
  const bullets = world.bullets;
  let kept = 0;
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (pointBlocksBullet(world.map, b.x, b.y)) {
      world.events.push({ type: 'bulletHit', x: b.x, y: b.y, team: b.team });
      continue;
    }
    if (b.team === 'player' ? hitEnemy(world, b) : hitPlayer(world, b)) continue;
    if (b.life <= 0) {
      world.events.push({ type: 'bulletExpired', x: b.x, y: b.y, team: b.team });
      continue;
    }
    bullets[kept++] = b;
  }
  bullets.length = kept;
}

/** @returns {boolean} true if the bullet hit (and should be removed) */
function hitEnemy(world, b) {
  let hit = null;
  world.grid.forEachNear(b.x, b.y, b.radius + 16, (e) => {
    if (hit || !isActive(e)) return;
    const r = e.radius + b.radius;
    if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 <= r * r) hit = e;
  });
  if (!hit) return false;
  damageEnemy(world, hit, b.damage, b.ownerId);
  return true;
}

/** @returns {boolean} true if the bullet hit (and should be removed) */
function hitPlayer(world, b) {
  const hurtRadius = world.config.player.hurtRadius;
  for (const p of world.players) {
    if (!p.alive) continue;
    const r = hurtRadius + b.radius;
    if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 > r * r) continue;
    if (damagePlayer(world, p, b.damage)) return true;
  }
  return false;
}
