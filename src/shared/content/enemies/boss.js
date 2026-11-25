// Shared boss brain: walk toward the player, pause, wind up (flash), attack, repeat.
// Attacks read their numbers from the boss's config: fan, ring, charge, spiral.
import { moveToward, angleTo, fireBullet, fireFan, fireRing } from './helpers.js';

/**
 * @param {object} world
 * @param {import('../../sim/entities/enemy.js').Enemy} e
 * @param {import('../../sim/entities/player.js').Player} target
 * @param {object} s - the boss's config
 * @param {number} dt
 * @param {() => string} nextAttack - picks the next attack name
 */
export function updateBoss(world, e, target, s, dt, nextAttack) {
  e.timer -= dt;
  switch (e.state) {
    case 'walk':
      moveToward(world, e, target, s.speed);
      if (e.timer > 0) break;
      {
        const attack = nextAttack();
        e.state = `${attack}Windup`;
        e.timer = s[attack].windup;
        const a = angleTo(e, target);
        e.dirX = Math.cos(a);
        e.dirY = Math.sin(a);
      }
      break;

    case 'fanWindup':
      e.telegraph = true;
      if (e.timer > 0) break;
      fireFan(world, e, angleTo(e, target), s.fan.count, s.fan.spread, s.fan);
      backToWalk(e, s);
      break;

    case 'ringWindup':
      e.telegraph = true;
      if (e.timer > 0) break;
      fireRing(world, e, s.ring.count, world.rng.range(0, Math.PI), s.ring);
      backToWalk(e, s);
      break;

    case 'chargeWindup':
      e.telegraph = true;
      if (e.timer > 0) break;
      e.state = 'charge';
      e.timer = s.charge.duration;
      break;

    case 'charge':
      e.vx = e.dirX * s.charge.speed;
      e.vy = e.dirY * s.charge.speed;
      if (e.timer <= 0 || e.hitWall) backToWalk(e, s);
      break;

    case 'spiralWindup':
      e.telegraph = true;
      if (e.timer > 0) break;
      e.state = 'spiral';
      e.timer = s.spiral.duration;
      e.spiralNext = 0;
      e.spiralAngle = angleTo(e, target);
      break;

    case 'spiral':
      // Stands still and sprays rotating arms of bullets: walk around it with the gap.
      e.spiralNext -= dt;
      if (e.spiralNext <= 0) {
        e.spiralNext += s.spiral.interval;
        for (let i = 0; i < s.spiral.arms; i++) {
          fireBullet(world, e, e.spiralAngle + (i * Math.PI * 2) / s.spiral.arms, s.spiral);
        }
        world.events.push({ type: 'enemyShot', id: e.id, x: e.x, y: e.y });
        e.spiralAngle += s.spiral.turn;
      }
      if (e.timer <= 0) backToWalk(e, s);
      break;

    default:
      backToWalk(e, s);
  }
}

function backToWalk(e, s) {
  e.state = 'walk';
  e.timer = s.attackPause;
}
