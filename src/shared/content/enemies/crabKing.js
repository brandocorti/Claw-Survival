// Crab King (mini-boss): walks at you and cycles through attacks from
// config.enemies.crabKing.pattern: an aimed fan of bullets, a charge, and
// (below half health only) a full ring. Every attack has a wind-up flash.
import { moveToward, angleTo, fireFan, fireRing } from './helpers.js';

export const crabKing = {
  update(world, e, target, s, dt) {
    switch (e.state) {
      case 'start':
        e.state = 'walk';
        e.timer = s.attackPause;
        break;

      case 'walk':
        moveToward(world, e, target, s.speed);
        e.timer -= dt;
        if (e.timer <= 0) {
          let attack = s.pattern[e.counter % s.pattern.length];
          e.counter++;
          if (attack === 'ring' && e.hp > e.maxHp / 2) attack = 'fan';
          e.state = `${attack}Windup`;
          e.timer = s[attack].windup;
          const a = angleTo(e, target);
          e.dirX = Math.cos(a);
          e.dirY = Math.sin(a);
        }
        break;

      case 'fanWindup':
      case 'ringWindup':
      case 'chargeWindup':
        e.telegraph = true;
        e.timer -= dt;
        if (e.timer > 0) break;
        if (e.state === 'fanWindup') {
          fireFan(world, e, angleTo(e, target), s.fan.count, s.fan.spread, s.fan);
          backToWalk(e, s);
        } else if (e.state === 'ringWindup') {
          fireRing(world, e, s.ring.count, world.rng.range(0, Math.PI), s.ring);
          backToWalk(e, s);
        } else {
          e.state = 'charge';
          e.timer = s.charge.duration;
        }
        break;

      case 'charge':
        e.vx = e.dirX * s.charge.speed;
        e.vy = e.dirY * s.charge.speed;
        e.timer -= dt;
        if (e.timer <= 0 || e.hitWall) backToWalk(e, s);
        break;

      default:
        e.state = 'start';
    }
  },
};

function backToWalk(e, s) {
  e.state = 'walk';
  e.timer = s.attackPause;
}
