// oceanConfig.ts
// Shared config for all ocean alternatives - now uses TERRAIN_CONFIG as source of truth for terrain

import { TERRAIN_CONFIG } from "./terrainConfig";

export type OceanSample = {
  paramX: number; paramZ: number;
  position: BABYLON.Vector3;
  normal: BABYLON.Vector3;
  velocity: BABYLON.Vector3;
  jacobian: number;
};

export const OCEAN_CONFIG = {
  terrain: { 
    size: TERRAIN_CONFIG.mesh.size, 
    subdivisions: TERRAIN_CONFIG.mesh.subdivisions, 
    groundY: TERRAIN_CONFIG.mesh.groundY, 
    macroAmplitude: TERRAIN_CONFIG.generation.baseAmplitude, 
    baseDepth: 0.0, 
    anisotropicLevel: TERRAIN_CONFIG.mesh.anisotropicLevel,
    gradient: {
      sand:   { h: TERRAIN_CONFIG.shading.gradient.sand.h,  color: TERRAIN_CONFIG.shading.gradient.sand.color },
      gravel: { h: TERRAIN_CONFIG.shading.gradient.gravel.h,  color: TERRAIN_CONFIG.shading.gradient.gravel.color },
      grass:  { h: TERRAIN_CONFIG.shading.gradient.grass.h, color: TERRAIN_CONFIG.shading.gradient.grass.color },
      rock:   { h: TERRAIN_CONFIG.shading.gradient.rock.h,   color: TERRAIN_CONFIG.shading.gradient.rock.color },
      snow:   { h: TERRAIN_CONFIG.shading.gradient.snow.h,   color: TERRAIN_CONFIG.shading.gradient.snow.color },
    },
    // keep full shading for advanced consumers
    shading: TERRAIN_CONFIG.shading,
    foam: TERRAIN_CONFIG.foam,
  },
  ocean: { width: 1000, height: 1000, subdivisions: 400, baseY: 1.5 },
  fog: { underwaterColor: { r: 0.02, g: 0.54, b: 0.72 }, density: 0.00016, transitionDepth: 0.5 },
  material: { foamStrength: 0.25, causticStrength: 0.75 },
  textures: { seabed: TERRAIN_CONFIG.textures.seabed },
  audio: {
    submerge: "https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/submerge.mp3",
    submerged: "https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/submerged.mp3",
    emerge: "https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/emerge.mp3",
  },
  boat: { asset: "https://raw.githubusercontent.com/EricEisaman/assets/main/items/boats/fishing_boat.glb" }
};
