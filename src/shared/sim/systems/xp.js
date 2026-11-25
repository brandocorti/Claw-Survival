// XP gems and levelling. Level-ups are counted in player.pendingLevelUps; the
// card choice that spends them is milestone 3.
import { createGem } from '../entities/gem.js';

/**
 * XP needed to go from `level` to `level + 1`:
 *   round(base + growth * (level - 1) ^ exponent)
 * @param {number} level - current level, starting at 1
 * @param {{ base: number, growth: number, exponent: number }} curve - config.xp.curve
 */
export function xpToNextLevel(level, curve) {
  return Math.round(curve.base + curve.growth * Math.pow(level - 1, curve.exponent));
}

/**
 * Splits an XP value into gems (largest first) that pop out around (x, y).
 * @param {object} world
 */
export function dropGems(world, x, y, value) {
  let left = value;
  for (const size of world.config.xp.gemValues) {
    while (left >= size) {
      const angle = world.rng.range(0, Math.PI * 2);
      const speed = world.rng.range(20, 55);
      world.gems.push(createGem(world.nextId++, size, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed));
      left -= size;
    }
  }
}

/**
 * Adds XP to a player and levels up as many times as it covers.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {number} value
 */
export function grantXp(world, player, value) {
  player.xp += value;
  let need = xpToNextLevel(player.level, world.config.xp.curve);
  while (player.xp >= need) {
    player.xp -= need;
    player.level++;
    player.pendingLevelUps++;
    world.events.push({ type: 'levelUp', playerId: player.id, level: player.level });
    need = xpToNextLevel(player.level, world.config.xp.curve);
  }
}

/**
 * Moves gems: they pop out and slow down, then fly to a living player within
 * their pickup radius (player.stats.pickupRadius) and are collected on touch.
 * @param {object} world
 * @param {number} dt
 */
export function updateGems(world, dt) {
  const cfg = world.config.xp;
  const pickupDist = world.config.player.radius + 2;
  const gems = world.gems;
  let kept = 0;

  for (let i = 0; i < gems.length; i++) {
    const g = gems[i];
    let target = g.targetId ? world.players.find((p) => p.id === g.targetId && p.alive) : null;
    if (!target) {
      g.targetId = null;
      target = nearestPlayerInReach(world, g.x, g.y);
      if (target) g.targetId = target.id;
    }

    if (target) {
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const dist = Math.hypot(dx, dy) || 1;
      // Steer the velocity toward "straight at the player at full speed". Pulling
      // toward the position instead made far gems (room-clear vacuum) orbit the
      // player forever without ever touching them.
      const wantX = (dx / dist) * cfg.magnetMaxSpeed - g.vx;
      const wantY = (dy / dist) * cfg.magnetMaxSpeed - g.vy;
      const want = Math.hypot(wantX, wantY);
      const steer = cfg.magnetAcceleration * dt;
      if (want <= steer) {
        g.vx += wantX;
        g.vy += wantY;
      } else {
        g.vx += (wantX / want) * steer;
        g.vy += (wantY / want) * steer;
      }
    } else {
      const drag = Math.pow(0.02, dt); // the pop-out stops within ~1 s
      g.vx *= drag;
      g.vy *= drag;
    }
    g.x += g.vx * dt;
    g.y += g.vy * dt;

    if (target && Math.hypot(target.x - g.x, target.y - g.y) <= pickupDist) {
      g.collected = true;
      world.events.push({ type: 'gemCollected', playerId: target.id, value: g.value });
      grantXp(world, target, g.value);
      continue;
    }
    gems[kept++] = g;
  }
  gems.length = kept;
}

function nearestPlayerInReach(world, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const p of world.players) {
    if (!p.alive) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= p.stats.pickupRadius && d <= bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
