// Room-based runs: templates, room generation, doors, the room chain and the clock.
import { describe, it, expect } from 'vitest';
import { FIGHT_ROOMS, BREAK_ROOMS, SOCKETS } from '../../../src/shared/content/rooms/index.js';
import { TILE, TILE_RULES } from '../../../src/shared/content/tiles.js';
import { parseArena, tileAt, boxBlocked, pointBlocksBullet, tileBlocks } from '../../../src/shared/sim/map.js';
import {
  planRoom, socketTiles, clearRoom, rollDestination, enterRoom,
} from '../../../src/shared/sim/systems/rooms.js';
import { createWorld } from '../../../src/shared/sim/world.js';
import { killEnemy } from '../../../src/shared/sim/systems/damage.js';
import { CONFIG } from '../../../src/shared/config.js';
import { makeRun, run, runCollect, placeEnemy, input, TEST_CONFIG, TEST_ROOM_TEMPLATES } from '../helpers/fixtures.js';

const C = TEST_CONFIG;
const ticksFor = (seconds) => Math.round(seconds * 60);
const TS = 16;

/** Tiles reachable on foot from (sx, sy), as a Set of "x,y". */
function floodFrom(map, sx, sy) {
  const seen = new Set([`${sx},${sy}`]);
  const queue = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || tileBlocks(map, nx, ny)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

/** The open tile just inside a socket. */
function insideSocket(rows, side) {
  const t = socketTiles(rows, side)[0];
  const d = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] }[side];
  return { tx: t.tx + d[0], ty: t.ty + d[1] };
}

describe('room templates', () => {
  const all = [...FIGHT_ROOMS.map((t) => ['fight', t]), ...BREAK_ROOMS.map((t) => ['break', t])];

  it('there are at least 5 fight templates and 1 break template', () => {
    expect(FIGHT_ROOMS.length).toBeGreaterThanOrEqual(5);
    expect(BREAK_ROOMS.length).toBeGreaterThanOrEqual(1);
  });

  for (const [kind, t] of all) {
    it(`${t.id}: right size, one P, four 2-tile sockets on their edges, open inside`, () => {
      const w = t.rows[0].length;
      const h = t.rows.length;
      expect(w).toBeGreaterThanOrEqual(22);
      expect(w).toBeLessThanOrEqual(34);
      expect(h).toBeGreaterThanOrEqual(14);
      expect(h).toBeLessThanOrEqual(22);
      for (const row of t.rows) expect(row.length).toBe(w);
      expect(t.rows.join('').split('P').length - 1).toBe(1);
      for (const side of SOCKETS) {
        const tiles = socketTiles(t.rows, side);
        expect(tiles.length, side).toBe(2);
        for (const { tx, ty } of tiles) {
          if (side === 'N') expect(ty).toBe(0);
          if (side === 'S') expect(ty).toBe(h - 1);
          if (side === 'W') expect(tx).toBe(0);
          if (side === 'E') expect(tx).toBe(w - 1);
        }
      }
      if (kind === 'break') {
        expect(t.rows.join('').split('C').length - 1).toBe(1);
        expect(t.rows.join('').split('$').length - 1).toBe(1);
      }
    });

    it(`${t.id}: every socket can reach every other one and the spawn on foot`, () => {
      // All sockets as open doors, so the map parses and they count as walkable.
      const rows = t.rows.map((r) => r.replace(/[NESW]/g, 'd'));
      const map = parseArena({ id: t.id, rows }, TS);
      const start = insideSocket(t.rows, 'N');
      const reach = floodFrom(map, start.tx, start.ty);
      for (const side of SOCKETS) {
        const p = insideSocket(t.rows, side);
        expect(reach.has(`${p.tx},${p.ty}`), side).toBe(true);
      }
      expect(reach.has(`${Math.floor(map.spawn.x / TS)},${Math.floor(map.spawn.y / TS)}`)).toBe(true);
    });
  }
});

describe('room generation', () => {
  it('always 1-3 exits, never the entrance; every unused socket is walled off', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const world = createWorld({ config: CONFIG, seed });
      const entrance = seed % 5 === 0 ? null : SOCKETS[seed % 4];
      const kind = seed % 7 === 0 ? 'break' : 'fight';
      const plan = planRoom(world, kind, entrance);
      expect(plan.exits.length).toBeGreaterThanOrEqual(1);
      expect(plan.exits.length).toBeLessThanOrEqual(3);
      expect(plan.exits.some((e) => e.side === entrance)).toBe(false);
      const text = plan.rows.join('');
      expect(text).not.toMatch(/[NESW]/); // no socket left as is
      expect(text.split('D').length - 1).toBe(plan.exits.length * 2);
      for (const side of SOCKETS) {
        const isExit = plan.exits.some((e) => e.side === side);
        for (const { tx, ty } of socketTiles(plan.template.rows, side)) {
          expect(plan.rows[ty][tx]).toBe(isExit ? 'D' : '#');
        }
      }
    }
  });

  it('exit counts follow exitWeights roughly', () => {
    const counts = { 1: 0, 2: 0, 3: 0 };
    const n = 2000;
    for (let seed = 1; seed <= n; seed++) {
      counts[planRoom(createWorld({ config: CONFIG, seed }), 'fight', 'W').exits.length]++;
    }
    for (const [k, w] of Object.entries(CONFIG.rooms.exitWeights)) expect(counts[k] / n).toBeCloseTo(w, 1);
  });

  it('a locked door blocks walking, flying and bullets; an open one lets everything through', () => {
    expect(TILE_RULES[TILE.DOOR_LOCKED]).toEqual({ blocksMove: true, blocksFlying: true, blocksBullets: true });
    expect(TILE_RULES[TILE.DOOR_OPEN]).toEqual({ blocksMove: false, blocksFlying: false, blocksBullets: false });
    const { world } = makeRun();
    const door = world.run.room.doors[0];
    const { tx, ty } = door.tiles[0];
    expect(tileAt(world.map, tx, ty)).toBe(TILE.DOOR_LOCKED);
    expect(boxBlocked(world.map, (tx + 0.5) * TS, (ty + 0.5) * TS, 4)).toBe(true);
    expect(pointBlocksBullet(world.map, (tx + 0.5) * TS, (ty + 0.5) * TS)).toBe(true);
  });
});

describe('doors and clearing', () => {
  it('doors stay locked while any enemy is alive and unlock on the tick the last one dies', () => {
    const { world, player } = makeRun({ spawning: true });
    player.invulnerableTime = 9999;
    const door = world.run.room.doors[0].tiles[0];
    let openedAt = -1;
    let lastDeathAt = -1;
    for (let i = 0; i < ticksFor(90) && openedAt < 0; i++) {
      const events = runCollect(world, 1);
      const anyAlive = world.enemies.some((e) => !e.dead);
      if (events.some((e) => e.type === 'enemyDied') && !anyAlive) lastDeathAt = i;
      if (events.some((e) => e.type === 'doorsOpened')) openedAt = i;
      else expect(tileAt(world.map, door.tx, door.ty)).toBe(TILE.DOOR_LOCKED);
      if (anyAlive) expect(world.run.room.cleared).toBe(false);
    }
    expect(openedAt).toBeGreaterThan(0);
    expect(openedAt).toBe(lastDeathAt);
    expect(tileAt(world.map, door.tx, door.ty)).toBe(TILE.DOOR_OPEN);
  });

  it('clearing a fight room adds one depth and sends the leftover gems to the player', () => {
    const { world, player } = makeRun();
    world.run.spawn = null; // nothing left to spawn
    const e = placeEnemy(world, 'dummy', player.x + 100, player.y + 20);
    e.hp = 1;
    killEnemy(world, e, 'p1');
    expect(world.gems.length).toBeGreaterThan(0);
    const events = runCollect(world, 1);
    expect(events.some((x) => x.type === 'roomCleared')).toBe(true);
    expect(world.run.depth).toBe(1);
    expect(world.gems.every((g) => g.targetId === 'p1')).toBe(true);
    run(world, ticksFor(2));
    expect(world.gems.length).toBe(0); // all of them reached the player
    expect(player.xp).toBe(C.enemies.dummy.xp);
  });

  it('break rooms start open, have no enemies and do not count as depth', () => {
    const { world } = makeRun({ startIn: 'break', spawning: true });
    expect(world.run.room.cleared).toBe(true);
    expect(world.run.room.doors.every((d) => d.open)).toBe(true);
    run(world, ticksFor(5));
    expect(world.enemies.length).toBe(0);
    expect(world.run.depth).toBe(0);
  });
});

describe('the room chain', () => {
  /** Clears the room (if needed) and walks through the first door matching `prefer`. */
  function goThrough(world, player, prefer = 'fight') {
    world.events.length = 0; // drop events from earlier rooms
    if (!world.run.room.cleared) {
      world.run.spawn = null;
      world.enemies.length = 0;
      clearRoom(world);
    }
    const doors = world.run.room.doors;
    const door = doors.find((d) => d.dest === prefer) ?? doors[0];
    const t = door.tiles[0];
    player.x = (t.tx + 0.5) * TS;
    player.y = (t.ty + 0.5) * TS;
    const events = runCollect(world, ticksFor(C.rooms.transitionSeconds) + 2);
    return { door, entered: events.filter((e) => e.type === 'roomEntered').pop() };
  }

  it('walking into an open door fades to the next room, at the opposite entrance, protected', () => {
    const { world, player } = makeRun();
    const { door, entered } = goThrough(world, player);
    expect(entered).toBeDefined();
    expect(entered.kind).toBe(door.dest);
    const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' }[door.side];
    expect(world.run.room.entrance).toBe(opposite);
    expect(world.run.room.doors.some((d) => d.side === opposite)).toBe(false);
    expect(player.invulnerableTime).toBeGreaterThan(0.5);
    expect(boxBlocked(world.map, player.x, player.y, C.player.radius)).toBe(false);
  });

  it('the player cannot move during the fade', () => {
    const { world, player } = makeRun();
    world.run.spawn = null;
    clearRoom(world);
    const t = world.run.room.doors[0].tiles[0];
    player.x = (t.tx + 0.5) * TS;
    player.y = (t.ty + 0.5) * TS;
    run(world, 1);
    expect(world.run.transition).not.toBe(null);
    const x = player.x;
    run(world, 3, input({ moveX: 1, moveY: 1 }));
    expect(player.x).toBe(x);
  });

  it('a break room never follows a break room; after 8 fight rooms the next is always a break', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { world, player } = makeRun({ seed });
      const kinds = ['fight'];
      for (let i = 0; i < 30; i++) {
        const room = world.run.room;
        if (room.kind === 'break') expect(room.doors.every((d) => d.dest === 'fight')).toBe(true);
        if (room.kind === 'fight' && world.run.fightStreak >= C.rooms.mandatoryBreakAfter) {
          expect(room.doors.every((d) => d.dest === 'break')).toBe(true);
        }
        kinds.push(goThrough(world, player, 'fight').entered.kind);
      }
      const text = kinds.map((k) => (k === 'fight' ? 'F' : 'B')).join('');
      expect(text).not.toContain('BB');
      expect(text).not.toContain('F'.repeat(C.rooms.mandatoryBreakAfter + 1));
      expect(text).toContain('F'.repeat(C.rooms.mandatoryBreakAfter) + 'B'); // we always chose fight doors
    }
  });

  it('the fight counter resets after a break room, and depth only counts fight rooms', () => {
    const { world, player } = makeRun({ startIn: 'break' });
    expect(world.run.fightStreak).toBe(0);
    goThrough(world, player, 'fight');
    expect(world.run.fightStreak).toBe(1);
    expect(world.run.room.number).toBe(1);
    goThrough(world, player, 'fight');
    expect(world.run.depth).toBe(1);
    expect(world.run.room.number).toBe(2);
  });

  it('an exit of a fight room can lead to a break with breakChance', () => {
    const { world } = makeRun({ seed: 3 });
    world.run.fightStreak = 1;
    let breaks = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) if (rollDestination(world, 'fight') === 'break') breaks++;
    expect(breaks / n).toBeCloseTo(C.rooms.breakChance, 1);
  });

  it('every room after the first loads a different template from the last one', () => {
    const { world, player } = makeRun();
    let last = world.run.room.templateId;
    for (let i = 0; i < 10; i++) {
      goThrough(world, player, 'fight');
      if (world.run.room.kind === 'fight') {
        expect(world.run.room.templateId).not.toBe(last);
        last = world.run.room.templateId;
      }
    }
  });

  it('?room=N style start: depth and the fight counter are where they would be', () => {
    const { world } = makeRun({ depth: 7 });
    expect(world.run.depth).toBe(7);
    expect(world.run.room.number).toBe(8);
    expect(world.run.room.boss).toBe(true);
    expect(world.run.room.doors.every((d) => d.dest === 'break')).toBe(true);
  });
});

describe('match clock', () => {
  it('runs in every room and ends PvE when it runs out: enemies leave, doors stop working', () => {
    const config = { ...C, match: { durationSeconds: 2 } };
    const { world, player } = makeRun({ config });
    player.invulnerableTime = 9999;
    placeEnemy(world, 'dummy', player.x + 60, player.y);
    const events = runCollect(world, ticksFor(2.1));
    expect(events.filter((e) => e.type === 'pveOver').length).toBe(1);
    expect(world.run.pveOver).toBe(true);
    expect(world.enemies.length).toBe(0);
    expect(world.match.elapsed).toBe(2);
    run(world, 60);
    expect(world.match.elapsed).toBe(2);
  });

  it('keeps running in break rooms', () => {
    const { world } = makeRun({ startIn: 'break' });
    run(world, 60);
    expect(world.match.elapsed).toBeCloseTo(1);
  });

  it('enterRoom works with the injected templates', () => {
    const { world } = makeRun();
    enterRoom(world, 'break', 'W');
    expect(world.run.room.templateId).toBe(TEST_ROOM_TEMPLATES.break[0].id);
  });
});
