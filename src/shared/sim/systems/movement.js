// Player movement and dodge roll.
import { clampToUnit, EPSILON } from '../math.js';
import { moveBox } from '../map.js';

/**
 * Advances one player's movement by one tick.
 * Rolling: fixed direction and speed, invulnerable at the start, cooldown after.
 * @param {object} world - from createWorld()
 * @param {import('../entities/player.js').Player} player
 * @param {import('../../protocol.js').PlayerInput} input
 * @param {number} dt - seconds
 */
export function updatePlayerMovement(world, player, input, dt) {
  if (!player.alive) {
    player.moving = false;
    return;
  }
  const cfg = world.config.player;

  player.rollCooldown = countDown(player.rollCooldown, dt);
  player.invulnerableTime = countDown(player.invulnerableTime, dt);

  if (player.rolling) {
    player.rollTime -= dt;
    if (player.rollTime <= EPSILON) {
      player.rolling = false;
      player.rollTime = 0;
      player.rollCooldown = cfg.roll.cooldown;
    }
  }

  if (!player.rolling && input.roll && player.rollCooldown <= 0) {
    startRoll(world, player, input);
  }

  let vx;
  let vy;
  if (player.rolling) {
    vx = player.rollDirX * cfg.roll.speed;
    vy = player.rollDirY * cfg.roll.speed;
  } else {
    const dir = clampToUnit(input.moveX, input.moveY);
    vx = dir.x * player.stats.moveSpeed;
    vy = dir.y * player.stats.moveSpeed;
    if (vx !== 0 || vy !== 0) player.moveAngle = Math.atan2(vy, vx);
  }

  const result = moveBox(world.map, player.x, player.y, cfg.radius, vx * dt, vy * dt);
  player.x = result.x;
  player.y = result.y;
  player.moving = !player.rolling && (vx !== 0 || vy !== 0);
}

/** Decreases a timer, snapping to exactly 0 when it is done. */
function countDown(timer, dt) {
  const t = timer - dt;
  return t <= EPSILON ? 0 : t;
}

/** Rolls toward the movement keys, or the way the player faces when standing still. */
function startRoll(world, player, input) {
  const cfg = world.config.player.roll;
  let dx = input.moveX;
  let dy = input.moveY;
  if (dx === 0 && dy === 0) {
    dx = Math.cos(player.aim);
    dy = Math.sin(player.aim);
  }
  const len = Math.hypot(dx, dy);
  player.rolling = true;
  player.rollTime = cfg.duration;
  player.rollDirX = dx / len;
  player.rollDirY = dy / len;
  player.invulnerableTime = Math.max(player.invulnerableTime, cfg.invulnerableTime);
  world.events.push({
    type: 'roll',
    playerId: player.id,
    x: player.x,
    y: player.y,
    dirX: player.rollDirX,
    dirY: player.rollDirY,
  });
}
