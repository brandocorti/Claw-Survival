// Damage, deaths and explosions. Every hit in the game goes through here, so
// later systems (curses, compensation credit, Gulag) have one place to hook in.
import { isActive } from '../entities/enemy.js';
import { clearEffects } from './effects.js';
import { dropGems } from './xp.js';

/**
 * @typedef {object} DamageSource
 * @property {'contact'|'bullet'|'explosion'|'hazard'} kind
 * @property {string|number|null} [attackerId]
 * @property {import('../entities/enemy.js').Enemy} [enemy]
 */

/**
 * Damages a player unless they are dead or invulnerable (rolling or recently hit).
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {number} amount - half hearts
 * @param {DamageSource | null} [source]
 * @returns {boolean} true if the damage was applied
 */
export function damagePlayer(world, player, amount, source = null) {
  if (!player.alive || player.invulnerableTime > 0 || amount <= 0) return false;
  player.health = Math.max(0, player.health - amount);
  player.lastHitTime = world.time;

  for (const effect of [...(player.effects ?? [])]) {
    world.effectTypes?.[effect.id]?.onPlayerDamaged?.(
      world,
      player,
      effect,
      world.config.effects?.[effect.id],
      { amount, source },
    );
  }

  if (player.health === 0) {
    const curseSources = (player.effects ?? [])
      .filter((e) => e.kind === 'debuff' && e.sourceId != null)
      .map((e) => e.sourceId);
    player.alive = false;
    player.rolling = false;
    player.targetId = null;
    clearEffects(world, player);
    world.events.push({ type: 'playerDied', playerId: player.id, x: player.x, y: player.y, source, curseSources });
  } else {
    player.invulnerableTime = world.config.player.hitInvulnerability;
    world.events.push({ type: 'playerHit', playerId: player.id, x: player.x, y: player.y, health: player.health, source });
  }
  return true;
}

/**
 * Damages an active enemy; kills it at 0 hp.
 * @param {object} world
 * @param {import('../entities/enemy.js').Enemy} enemy
 * @param {number} amount
 * @param {string|null} attackerId - player credited with the kill (null = environment)
 * @returns {boolean} true if the damage was applied
 */
export function damageEnemy(world, enemy, amount, attackerId) {
  if (!isActive(enemy) || amount <= 0) return false;
  enemy.hp -= amount;
  enemy.lastHitTime = world.time;
  world.events.push({ type: 'enemyHit', id: enemy.id, x: enemy.x, y: enemy.y });
  if (enemy.hp <= 0) killEnemy(world, enemy, attackerId);

  if (attackerId != null) {
    const attacker = world.players.find((p) => p.id === attackerId && p.alive);
    if (attacker) {
      for (const effect of [...(attacker.effects ?? [])]) {
        world.effectTypes?.[effect.id]?.onEnemyDamaged?.(
          world,
          attacker,
          effect,
          world.config.effects?.[effect.id],
          { enemy, amount, killed: enemy.dead },
        );
      }
    }
  }
  return true;
}

/**
 * Kills an enemy: XP gems and a kill for the attacker (if any), then the
 * enemy type's onDeath hook (e.g. the coconut explodes).
 * @param {object} world
 * @param {import('../entities/enemy.js').Enemy} enemy
 * @param {string|null} killerId
 */
export function killEnemy(world, enemy, killerId) {
  if (enemy.dead) return;
  enemy.dead = true;
  enemy.hp = 0;
  enemy.killedByPlayer = killerId != null;
  world.events.push({ type: 'enemyDied', id: enemy.id, enemyType: enemy.type, x: enemy.x, y: enemy.y, boss: enemy.boss });

  if (killerId != null) {
    const killer = world.players.find((p) => p.id === killerId);
    if (killer) killer.kills++;
    dropGems(world, enemy.x, enemy.y, world.config.enemies[enemy.type].xp);
  }
  const def = world.enemyTypes[enemy.type];
  if (def.onDeath) def.onDeath(world, enemy, killerId);
}

/**
 * Queues an explosion; processExplosions() resolves it at the end of the tick,
 * so chain reactions (coconut blows up coconut) run in a simple loop.
 * @param {object} world
 * @param {number} x
 * @param {number} y
 * @param {{ radius: number, playerDamage: number, enemyDamage: number }} stats
 * @param {string|null} creditId - player credited with enemies it kills
 */
export function queueExplosion(world, x, y, stats, creditId) {
  world.pendingExplosions.push({ x, y, stats, creditId });
}

/** Resolves all queued explosions, including ones they trigger. */
export function processExplosions(world) {
  let guard = 0;
  while (world.pendingExplosions.length > 0 && guard++ < 1000) {
    const { x, y, stats, creditId } = world.pendingExplosions.shift();
    world.events.push({ type: 'explosion', x, y, radius: stats.radius });

    for (const p of world.players) {
      if (Math.hypot(p.x - x, p.y - y) <= stats.radius + world.config.player.radius) {
        damagePlayer(world, p, stats.playerDamage, { kind: 'explosion', attackerId: creditId });
      }
    }
    for (const e of world.enemies) {
      if (!isActive(e)) continue;
      if (Math.hypot(e.x - x, e.y - y) <= stats.radius + e.radius) {
        damageEnemy(world, e, stats.enemyDamage, creditId);
      }
    }
  }
}
