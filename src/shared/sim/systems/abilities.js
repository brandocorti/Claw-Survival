// Abilities: turns the cards a player owns into numbers (player.stats) and runs
// the abilities that act every tick (orbiting coconuts, fire trail).
import { isActive } from '../entities/enemy.js';
import { damageEnemy } from './damage.js';

/**
 * Recomputes player.stats and maxHealth from the base config plus every owned ability.
 * Always starts from the base values, so levels never compound by accident.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 */
export function refreshStats(world, player) {
  const { config } = world;
  const weapon = config.weapons[player.weapon];
  const stats = {
    damage: weapon.damage,
    fireRate: weapon.fireRate,
    moveSpeed: config.player.moveSpeed,
    maxHealth: config.player.maxHealth,
    shots: 1,
    shotSpread: 0,
    pierce: 0,
  };
  // What "+20%" is a percentage of.
  const base = { ...stats };
  for (const [id, level] of Object.entries(player.abilities)) {
    world.abilityTypes[id].modify?.(stats, level, config.abilities[id], base);
  }
  player.stats = stats;
  player.maxHealth = stats.maxHealth;
}

/**
 * Gives a player one level of an ability.
 * @returns {number} the new level
 */
export function gainAbility(world, player, id) {
  const level = (player.abilities[id] ?? 0) + 1;
  player.abilities[id] = level;
  refreshStats(world, player);
  world.abilityTypes[id].onPick?.(world, player, level, world.config.abilities[id]);
  return level;
}

/** Runs per-tick abilities, then the burning ground they leave behind. */
export function updateAbilities(world, dt) {
  for (const p of world.players) {
    if (!p.alive) continue;
    for (const [id, level] of Object.entries(p.abilities)) {
      world.abilityTypes[id].update?.(world, p, level, world.config.abilities[id], dt);
    }
  }
  updateFires(world, dt);
}

function updateFires(world, dt) {
  const { fires } = world;
  let kept = 0;
  for (const f of fires) {
    f.life -= dt;
    if (f.life <= 0) continue;
    hitEnemiesAround(world, f, f, f.ownerId, `fire:${f.ownerId}`, (e) => !e.flying);
    fires[kept++] = f;
  }
  fires.length = kept;
}

/**
 * Damages active enemies touching a circle, at most once per `hitCooldown` for each key.
 * @param {object} world
 * @param {{ x: number, y: number }} at
 * @param {{ radius: number, damage: number, hitCooldown: number }} hit
 * @param {string} ownerId - player credited
 * @param {string} key - cooldown group, e.g. 'orbit:p1'
 * @param {(enemy: object) => boolean} [filter]
 */
export function hitEnemiesAround(world, at, hit, ownerId, key, filter = () => true) {
  world.grid.forEachNear(at.x, at.y, hit.radius + 16, (e) => {
    if (!isActive(e) || !filter(e)) return;
    if ((e.hitCooldowns[key] ?? 0) > world.time) return;
    const r = e.radius + hit.radius;
    if ((e.x - at.x) ** 2 + (e.y - at.y) ** 2 > r * r) return;
    e.hitCooldowns[key] = world.time + hit.hitCooldown;
    damageEnemy(world, e, hit.damage, ownerId);
  });
}
