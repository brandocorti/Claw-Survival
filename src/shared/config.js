// =============================================================================
// GAME CONFIG - every tuning value lives here.
// Units: distances in world pixels (1 tile = 16 px), times in seconds,
// speeds in pixels per second, angles in radians, health in HALF hearts.
// Shared by the browser client and (from milestone 5) the game server.
// =============================================================================

export const CONFIG = {
  /** Simulation runs at a fixed rate, independent of the screen's refresh rate. */
  sim: {
    tickRate: 60,
    /** Never simulate more than this many ticks in one frame (prevents a "spiral of death" after a tab switch). */
    maxTicksPerFrame: 8,
  },

  /** Internal resolution. The canvas is scaled up by whole numbers only. */
  display: {
    width: 480,
    height: 270,
    tileSize: 16,
  },

  camera: {
    /** 0..1, how quickly the camera catches up with its target each 1/60 s. */
    followLerp: 0.12,
    /** The camera leads this many pixels in the direction you walk. */
    moveLookAhead: 16,
  },

  match: {
    /** PvE length. When it runs out, the final PvP starts (milestone 8). */
    durationSeconds: 600,
  },

  /** A run is a chain of rooms. Rules in shared/sim/systems/rooms.js. */
  rooms: {
    /** How many exits a cleared room has, as weights. */
    exitWeights: { 1: 0.25, 2: 0.45, 3: 0.3 },
    /** Chance that an exit leads to a break room (never right after a break room). */
    breakChance: 0.12,
    /** After this many fight rooms in a row, every exit leads to a break room. */
    mandatoryBreakAfter: 8,
    /** The Crab King waits in the fight room where the counter reaches this (the one before the mandatory break). */
    bossAtFightRoom: 8,
    /** Show what is behind each door (crossed swords or campfire) once it opens. */
    revealDoorTypes: true,
    /** Seconds of fade between rooms; the player cannot move or be hurt meanwhile. */
    transitionSeconds: 0.4,
    /** Invulnerable for this long after entering a room. */
    spawnProtection: 1.0,
    /** The player appears this many tiles inside the entrance. */
    entranceInset: 1.5,
    /** Seconds before the first wave of a fight room. */
    firstWaveDelay: 1.0,
  },

  /**
   * Difficulty by depth (= fight rooms cleared this run; break rooms do not count).
   * Every formula is in shared/sim/systems/difficulty.js -> difficultyAt(config, depth).
   */
  difficulty: {
    /** Enemies per fight room: min(maxBudget, baseEnemies + enemiesPerRoom * depth). */
    baseEnemies: 10,
    enemiesPerRoom: 2,
    maxBudget: 60,
    /** Waves per room: min(maxWaves, baseWaves + floor(depth / wavesEvery)). */
    baseWaves: 2,
    wavesEvery: 4,
    maxWaves: 5,
    /** Seconds between waves: max(waveGapMin, waveGapStart - waveGapPerDepth * depth). */
    waveGapStart: 4,
    waveGapPerDepth: 0.1,
    waveGapMin: 1.5,
    /** Enemy health x (1 + healthPerDepth * depth). */
    healthPerDepth: 0.12,
    /** Contact, bullet and blast damage x (1 + damagePerDepth * depth), rounded, never below the base. */
    damagePerDepth: 0.05,
    /** Enemy speed x min(maxSpeedScale, 1 + speedPerDepth * depth). */
    speedPerDepth: 0.02,
    maxSpeedScale: 1.3,
    /** Enemy XP x (1 + xpPerDepth * depth), so deeper rooms pay for break-room prices. */
    xpPerDepth: 0.08,
    /** Elites: gold outline, more health and XP. Chance per spawn from fromDepth on. */
    elite: { fromDepth: 6, baseChance: 0.05, chancePerDepth: 0.01, maxChance: 0.25, healthScale: 2, xpScale: 1.5 },
    /** The HUD flashes "DANGER RISES" every this many depths. */
    dangerEvery: 4,
    /** Enemy mix as relative weights; the last entry whose fromDepth <= depth is used. */
    enemyWeightsByDepth: [
      { fromDepth: 0, weights: { crab: 6, coconut: 2 } },
      { fromDepth: 3, weights: { crab: 5, coconut: 3, skeleton: 2 } },
      { fromDepth: 6, weights: { crab: 4, coconut: 3, skeleton: 3, tiki: 1 } },
      { fromDepth: 10, weights: { crab: 4, coconut: 3, skeleton: 3, tiki: 2 } },
      { fromDepth: 16, weights: { crab: 4, coconut: 4, skeleton: 4, tiki: 3 } },
    ],
  },

  spawning: {
    /** Never more than this many enemies alive at once (performance budget); the rest of a wave waits. */
    maxAlive: 150,
    /** Enemies never appear closer than this to a player (4 tiles). */
    minDistance: 64,
    /** Warning time: a sand swirl shows where an enemy will appear; it cannot hurt or be hurt yet. */
    spawnDelay: 0.7,
  },

  /** Break rooms: no enemies, a campfire and the Salesman. Rules in shared/sim/systems/breakRoom.js. */
  breakRoom: {
    /** Half hearts healed per rest at the campfire. */
    healAmount: 2,
    /**
     * Prices are a fraction of the current XP bar, so they scale with level:
     *   cost = ceil(price * xpToNextLevel(level)), paid from the progress on the bar (never a level).
     */
    prices: { rest: 0.4, roll: 0.5, intel: 0.3 },
    /** E works within this distance of the campfire or the Salesman. */
    interactRadius: 26,
  },

  salesman: {
    /** Mystery roll odds: buff, otherwise debuff. */
    buffChance: 0.65,
  },

  /** Simulated rivals for the Salesman's gossip until real players exist (milestone 5). */
  rivals: {
    count: 3,
    names: ['BARNACLE BEA', 'COCONUT CARL', 'DRIFTWOOD DOT', 'SALTY SAM', 'MANGO MO', 'SEAWEED SUE'],
    /** Each bot gets a speed between these (seeded). */
    roomsPerMinute: [1.4, 2.2],
    levelsPerMinute: [0.7, 1.3],
    /** Their effects change every this many seconds. */
    effectEverySeconds: 45,
    /** From this many effect periods on, each period a bot may wash out (dead). */
    safePeriods: 4,
    deathChance: 0.05,
  },

  player: {
    /** Half-size of the player's collision box, at the feet. */
    radius: 5,
    /** Enemy bullets hit when closer than this to the feet (smaller than the sprite, on purpose). */
    hurtRadius: 4,
    /** In half hearts: 6 = 3 hearts. */
    maxHealth: 6,
    moveSpeed: 95,
    /** Invulnerable for this long after taking a hit (the player blinks). */
    hitInvulnerability: 1.0,
    /** Height of the hands above the feet; bullets are drawn at this height. */
    handHeight: 8,
    roll: {
      speed: 210,
      duration: 0.32,
      /** Invulnerable for the first part of the roll. */
      invulnerableTime: 0.26,
      /** Cooldown starts when the roll ends. */
      cooldown: 0.45,
    },
    startingWeapon: 'slingshot',
  },

  autoAim: {
    /** Auto-fire only at enemies closer than this. */
    range: 170,
    /** How many of the nearest enemies are checked for a clear line of sight. */
    lineOfSightChecks: 6,
  },

  weapons: {
    slingshot: {
      /** Shots per second while a target is in range. */
      fireRate: 3,
      damage: 2,
      bulletSpeed: 240,
      /** Max travel distance before the shot drops. */
      range: 230,
      /** Random angle added to each shot, +/- this value. */
      spread: 0.04,
      bulletRadius: 2,
      /** Distance from the player's feet where the bullet appears. */
      muzzleDistance: 9,
    },
  },

  /**
   * Enemy stats. Behaviour code lives in shared/content/enemies/<id>.js.
   * hp = base health in round 1. contactDamage / bullet damage are in half hearts.
   */
  enemies: {
    crab: {
      hp: 3, speed: 42, radius: 5, contactDamage: 1, xp: 1,
      /** Charges sideways at the player every few seconds, after a short wind-up. */
      charge: { intervalMin: 2.5, intervalMax: 4, maxDistance: 150, windup: 0.45, speed: 175, duration: 0.4 },
    },
    coconut: {
      hp: 2, speed: 35, radius: 5, contactDamage: 1, xp: 1,
      /** Speeds up while rolling. */
      maxSpeed: 80, acceleration: 30,
      /** Explodes on death (and when it touches you). Explosions also hurt other enemies. */
      explosion: { radius: 26, playerDamage: 1, enemyDamage: 4 },
    },
    skeleton: {
      hp: 6, speed: 32, radius: 5, contactDamage: 1, xp: 3,
      /** Keeps this distance and shoots slow aimed bullets. */
      preferredRange: 100,
      fire: { interval: 2.4, windup: 0.4, bulletSpeed: 70, damage: 1, range: 260 },
    },
    tiki: {
      hp: 8, speed: 22, radius: 6, contactDamage: 1, xp: 4, flying: true,
      preferredRange: 120,
      /** Rings of bullets, each ring rotated a bit from the last. */
      ring: { interval: 3.2, windup: 0.5, count: 8, rotateStep: 0.39, bulletSpeed: 55, damage: 1, range: 300 },
    },
    crabKing: {
      hp: 90, speed: 28, radius: 12, contactDamage: 2, xp: 25, boss: true,
      spawnDelay: 1.4,
      /** Attack cycle; "ring" is only used below half health. */
      pattern: ['fan', 'charge', 'fan', 'ring'],
      attackPause: 1.2,
      charge: { windup: 0.7, speed: 160, duration: 0.7 },
      fan: { windup: 0.5, count: 5, spread: 0.9, bulletSpeed: 75, damage: 1, range: 280 },
      ring: { windup: 0.6, count: 14, bulletSpeed: 60, damage: 1, range: 300 },
    },
  },

  enemyBullets: {
    radius: 3,
  },

  xp: {
    /** Gems within this distance fly to the player. */
    pickupRadius: 30,
    magnetAcceleration: 600,
    magnetMaxSpeed: 220,
    /**
     * XP needed to go from level L to L+1:
     *   round(base + growth * (L - 1) ^ exponent)
     * L1: 5, L2: 8, L5: 22, L10: 52
     */
    curve: { base: 5, growth: 3, exponent: 1.25 },
    /** Gem sizes: an enemy's XP is split into the largest gems first. */
    gemValues: [20, 5, 1],
  },
};
