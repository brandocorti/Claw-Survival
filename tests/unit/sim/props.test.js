import { describe, it, expect } from 'vitest';
import { parseArena, boxBlocked, moveBox, pointBlocksBullet, tileAt, walkBlocks } from '../../../src/shared/sim/map.js';
import { propSolid } from '../../../src/shared/sim/props.js';
import { FlowField } from '../../../src/shared/sim/flowField.js';
import { createBullet } from '../../../src/shared/sim/entities/bullet.js';
import { MAX_ENEMY_RADIUS } from '../../../src/shared/sim/entities/enemy.js';
import { BEACH_ARENA } from '../../../src/shared/content/arenas/beach.js';
import { TILE } from '../../../src/shared/content/tiles.js';
import { CONFIG } from '../../../src/shared/config.js';
import { makeWorld, placeSturdyEnemy, run, BIG_ROOM, TEST_CONFIG } from '../helpers/fixtures.js';

const map = parseArena(BEACH_ARENA, 16);
const R = CONFIG.player.radius;

describe('props on the island', () => {
  it('has a wreck, palms, crates and barrels, always in the same places', () => {
    expect(new Set(map.props.map((p) => p.kind))).toEqual(new Set(['wreck', 'palm', 'crate', 'barrel']));
    expect(parseArena(BEACH_ARENA, 16).props).toEqual(map.props);
    expect(map.props.filter((p) => p.kind === 'wreck').length).toBe(1);
  });

  it('every prop stands on open sand and blocks walkers, but not spirits, bosses or shots', () => {
    for (const prop of map.props) {
      const s = propSolid(prop);
      const [x, y] = [(s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2];
      expect(tileAt(map, Math.floor(x / 16), Math.floor(y / 16)), prop.kind).toBe(TILE.SAND);
      expect(boxBlocked(map, x, y, R), prop.kind).toBe(true);
      expect(boxBlocked(map, x, y, R, 'fly')).toBe(false);
      expect(boxBlocked(map, x, y, R, 'giant')).toBe(false);
      expect(pointBlocksBullet(map, x, y)).toBe(false);
    }
  });

  it('tall props stay at least 4 tiles from where the duel usually starts', () => {
    for (const p of map.props.filter((q) => q.kind === 'palm' || q.kind === 'wreck')) {
      const far = Math.max(Math.abs(p.x - map.spawn.x), Math.abs(p.y - map.spawn.y));
      expect(far, `${p.kind} ${p.x},${p.y}`).toBeGreaterThan(64);
    }
  });

  it('the spawn and the salesman are free, and every open tile can still be reached', () => {
    expect(boxBlocked(map, map.spawn.x, map.spawn.y, R)).toBe(false);
    expect(boxBlocked(map, map.vendor.x, map.vendor.y, R)).toBe(false);
    const field = new FlowField(map);
    field.update([map.spawn]);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (!walkBlocks(map, x, y)) expect(field.stepsAt(x * 16 + 8, y * 16 + 8), `${x},${y}`).not.toBe(0xffff);
      }
    }
  });

  it('walking into a prop stops at it, from every side, and never gets inside', () => {
    for (const prop of map.props) {
      const s = propSolid(prop);
      const c = { x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2 };
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const start = { x: c.x - dx * 60, y: c.y - dy * 40 };
        if (boxBlocked(map, start.x, start.y, R)) continue;
        const end = moveBox(map, start.x, start.y, R, dx * 120, dy * 80);
        expect(boxBlocked(map, end.x, end.y, R), prop.kind).toBe(false);
      }
    }
  });

  it('arenas without props have none', () => {
    expect(parseArena({ ...BEACH_ARENA, props: false }, 16).props).toEqual([]);
  });
});

describe('the bigger Crab Emperor', () => {
  it('no enemy is bigger than MAX_ENEMY_RADIUS', () => {
    for (const [type, e] of Object.entries(CONFIG.enemies)) expect(e.radius, type).toBeLessThanOrEqual(MAX_ENEMY_RADIUS);
  });

  it('can be shot at its very edge, from every direction', () => {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const config = {
        ...TEST_CONFIG,
        autoAim: { ...TEST_CONFIG.autoAim, range: 0 },
        enemies: { ...TEST_CONFIG.enemies, crabEmperor: { ...TEST_CONFIG.enemies.crabEmperor, radius: CONFIG.enemies.crabEmperor.radius } },
      };
      const { world, player } = makeWorld({ arena: BIG_ROOM, config });
      player.invulnerableTime = 999;
      const boss = placeSturdyEnemy(world, 'crabEmperor', player.x + 100, player.y);
      boss.state = 'walk';
      boss.timer = 999;
      const d = boss.radius + 1;
      world.bullets.push(createBullet(999, 'p1', 'player', boss.x + Math.cos(a) * d, boss.y + Math.sin(a) * d, a + Math.PI, { speed: 60, range: 60, damage: 7, radius: 2 }));
      run(world, 2);
      expect(1e9 - boss.hp, `angle ${a}`).toBe(7);
    }
  });
});
