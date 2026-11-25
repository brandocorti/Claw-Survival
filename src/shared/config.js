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
    /** Length of the waves. When it runs out, the final boss duel starts (and later the PvP, milestone 8). */
    durationSeconds: 300,
  },

  rounds: {
    /** The match is split into this many equal rounds (300 s / 5 = 1 min each). */
    count: 5,
    /** No spawns for this long at the start of each round, while the banner shows. */
    breakSeconds: 2,
    /** Rounds that end with a mini-boss (1-based). */
    bossRounds: [3],
    /** The boss appears when this many seconds are left in a boss round. */
    bossAtSecondsLeft: 25,
    /** Enemy mix per round, as relative weights. Later rounds reuse the last entry. */
    enemyWeights: [
      { crab: 6, coconut: 3, skeleton: 1 },
      { crab: 5, coconut: 3, skeleton: 2, tiki: 1 },
      { crab: 5, coconut: 3, skeleton: 3, tiki: 1 },
      { crab: 5, coconut: 3, skeleton: 3, tiki: 2 },
      { crab: 5, coconut: 4, skeleton: 3, tiki: 2 },
    ],
  },

  finalBoss: {
    type: 'crabEmperor',
    /** Calm between the last enemy vanishing and the boss appearing. */
    introSeconds: 3,
    /** Half hearts given back before the duel. */
    healBefore: 0,
  },

  spawning: {
    /** Enemies per second in round 1. Formula in shared/sim/systems/spawner.js. */
    baseRate: 1.6,
    /** Added to the rate for each round after the first. */
    ratePerRound: 0.3,
    /** The rate grows by this fraction from the start to the end of each round (0.8 = +80%). */
    rampWithinRound: 0.8,
    /** Spawning pauses while this many enemies are alive (performance budget). */
    maxAlive: 150,
    /** Enemies appear between these distances from the player (just off screen). */
    minDistance: 150,
    maxDistance: 260,
    /** Warning time: a sand swirl shows where an enemy will appear; it cannot hurt or be hurt yet. */
    spawnDelay: 0.7,
    /** Enemy health grows by this fraction per round (0.15 = +15% per round). */
    healthPerRound: 0.15,
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
    /** Final boss. Health also grows with the round, like every enemy. */
    crabEmperor: {
      hp: 800, speed: 34, radius: 15, contactDamage: 2, xp: 0, boss: true,
      spawnDelay: 1.6,
      pattern: ['fan', 'charge', 'ring'],
      /** Used below half health. */
      enragedPattern: ['spiral', 'charge', 'fan', 'ring', 'charge'],
      attackPause: 1.0,
      charge: { windup: 0.6, speed: 190, duration: 0.8 },
      fan: { windup: 0.5, count: 7, spread: 1.2, bulletSpeed: 85, damage: 1, range: 300 },
      ring: { windup: 0.6, count: 16, bulletSpeed: 65, damage: 1, range: 320 },
      spiral: { windup: 0.7, duration: 2.2, interval: 0.14, arms: 3, turn: 0.22, bulletSpeed: 70, damage: 1, range: 320 },
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

  cards: {
    /** How many cards a level-up offers. */
    choices: 3,
  },

  /**
   * Ability cards. Picking a card again raises its level, up to maxLevel.
   * Code lives in shared/content/abilities/<id>.js.
   */
  abilities: {
    damage: { maxLevel: 5, damagePerLevel: 1 },
    /** +20% of the weapon's base fire rate per level. */
    fireRate: { maxLevel: 5, ratePerLevel: 0.2 },
    /** +8% of the base move speed per level. */
    moveSpeed: { maxLevel: 5, speedPerLevel: 0.08 },
    /** In half hearts: 2 = one heart. Also heals that much when picked. */
    maxHearts: { maxLevel: 4, healthPerLevel: 2 },
    /** Extra pebbles per shot, fanned out by `spread` radians between neighbours. */
    multishot: { maxLevel: 3, shotsPerLevel: 1, spread: 0.16 },
    /** Extra enemies each pebble passes through. */
    piercing: { maxLevel: 3, piercePerLevel: 1 },
    /** Coconuts circling the player. The orbit is wider than an enemy coconut's blast on purpose. */
    orbitCoconuts: { maxLevel: 4, perLevel: 1, orbitRadius: 36, angularSpeed: 2.6, radius: 5, damage: 2, hitCooldown: 0.5 },
    /** Burning ground left by a dodge roll. Flying enemies are not burned. */
    fireTrail: {
      maxLevel: 3, spacing: 10, radius: 8, hitCooldown: 0.4,
      baseDamage: 1, damagePerLevel: 1, baseDuration: 1, durationPerLevel: 0.5,
    },
  },

  /** Timed buff pickups spawned on walkable sand during waves. */
  pickups: {
    initialDelay: 12,
    spawnInterval: 22,
    maxOnMap: 2,
    lifetime: 18,
    collectRadius: 9,
    minDistance: 60,
    maxDistance: 170,
    /** Effect ids eligible to spawn as arena pickups. */
    pool: ['doubleXp'],
  },

  /**
   * Timed status effects (buffs and debuffs).
   * Code lives in shared/content/effects/index.js.
   */
  effects: {
    doubleXp: { duration: 9, multiplier: 2 },
  },
};
