
// boatConfig.ts - all boat tuning in one place
// Change GLB, transforms, physics, sounds, and foam particle settings here without touching boat.ts or foam.ts

export const BOAT_CONFIG = {
  // --- GLB source ---
  glb: {
    rootUrl: "https://raw.githubusercontent.com/EricEisaman/assets/main/items/boats/",
    fileName: "fishing_boat.glb",
    // fullUrl: "https://.../my_boat.glb", // if set, overrides rootUrl/fileName
  },

  // --- Visual transform applied to modelRoot (the fix node) ---
  transform: {
    scaling: 0.01, // number = uniform, or {x,y,z}
    rotation: { x: 0, y: Math.PI / 2, z: 0 }, // radians
    position: { x: 0, y: 1.6, z: 0 }, // local offset inside physics rig
    initialPosition: { x: 30, y: 0, z: -5 },
    autoSnapY: true,
    snapYOffset: 0.6,
  },

  // --- Physics ---
  physics: {
    baseMass: 200,
    effectiveMassFactor: 8.0,
    keelDepth: 0.7,
    keelBallastFactor: 0.1,
    rollStiffness: 5.0,
    maxThrust: 25000,
    maxRudderDeg: 45,
    hull: { length: 6.0, width: 2.2, rows: 6, cols: 4 },
    damping: { linear: 90, angular: 500, normal: 900, tangential: 500 },
  },

  // --- Sounds - everything here now ---
  sounds: {
    idle: {
      url: "https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/boat-idle.m4a",
      volume: 0.85,
      maxDistance: 70,
      rolloffFactor: 1.1,
      autoplay: true,
      loop: true,
    },
    underway: {
      url: "https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/boat-underway.m4a",
      volume: 10,
      maxDistance: 90,
      rolloffFactor: 1.0,
      autoplay: false,
      loop: true,
      // how volume ramps with throttle
      throttleMinVol: 0.3,
      throttleVolScale: 1.7,
      throttleThreshold: 0.08,
    },
  },

  // --- Foam ---
  foam: {
    enabled: true,
    activeOnlyUnderway: true, // <- if true, boat foam only emits when underway (T/G throttling)
    intersection: { yOffset: 0.18, maxTris: 3000, heightCulling: false, rebuildEvery: 12 },
    emission: { emitCount: 20, manualEmitCount: 3 },
    particle: {
      capacity: 5000,
      textureUrl: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/misc/water_splash.webp",
      minEmitBox: new BABYLON.Vector3(-0.08, 0, -0.08),
      maxEmitBox: new BABYLON.Vector3(0.08, 0, 0.08),
      color1: new BABYLON.Color4(0.6, 0.7, 1, 0.20),
      color2: new BABYLON.Color4(0.59, 0.69, 1, 0.13),
      colorDead: new BABYLON.Color4(0.4, 0.5, 1, 0),
      minSize: 0.1, maxSize: 1.5,
      minLifeTime: 0.7, maxLifeTime: 1.6,
      emitRate: 600,
      minEmitPower: 0.06, maxEmitPower: 0.15,
      velocityScaling: { maxPowerPerMps: 0.12, minPowerPerMps: 0.0, emitCountPerMps: 2.2, manualCountPerMps: 0.5, maxSpeed: 15 },
      gravity: new BABYLON.Vector3(0, -0.1, 0),
      direction1: new BABYLON.Vector3(-0.35, -0.4, -0.35),
      direction2: new BABYLON.Vector3(0.35, -0.4, 0.35),
      blendMode: "ADD" as const,
    },
  },
} as const;
