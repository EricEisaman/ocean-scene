// islandConfig.ts - all island tuning in one place
// Now uses TERRAIN_CONFIG.foam.particles as single source of truth for shoreline particle foam

import { TERRAIN_CONFIG } from "./terrainConfig";

export const ISLAND_CONFIG = {
  glb: {
    rootUrl: "https://raw.githubusercontent.com/EricEisaman/assets/main/environment/",
    fileName: "lighthouse_rough.glb",
    // fullUrl: "https://.../my_island.glb",
  },
  transform: {
    scaling: 2.0, // number or {x,y,z}
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
  },
  extras: { isBlocker: true },
  foam: {
    enabled: TERRAIN_CONFIG.foam.particles.enabled,
    intersection: TERRAIN_CONFIG.foam.particles.intersection,
    emission: TERRAIN_CONFIG.foam.particles.emission,
    particle: TERRAIN_CONFIG.foam.particles.particle,
  },
} as const;
