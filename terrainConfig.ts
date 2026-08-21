// terrainConfig.ts
// ONE STOP SHOP FOR ALL TERRAIN RELATED TWEAKING
import type { TerrainSource } from "./terrainSource";
export type TerrainTechnique = 'default' | 'atoll' | 'volcanic' | (string & {});
export const TERRAIN_CONFIG = {
  type: 'default' as TerrainTechnique,
  customHeightmap: undefined as TerrainSource | undefined,
  generation: {
    worldScale: 0.018, baseAmplitude: 2, baseFrequency: 0.2, baseOctaves: 5, baseGain: 0.5, lacunarity: 2.2,
    warpStrength: 1.2, warpFrequency: 0.6, ridgeAmplitude: 100, ridgeFrequency: 1.1, ridgeSharpness: 3.0,
    cliffAmount: 0.35, cliffThreshold: 0.2, cliffSoftness: 0.55, valleyAmplitude: 4, valleyFrequency: 1.0,
    seaLevel: 0, seed: 0, coastalPlainsPrevalence: 0.95, coastalPlainsWidth: 280, coastalPlainsHeight: 1.2, coastalPlainsFalloff: 0.15,
    mountainMask: { frequency: 0.12, low: 0.35, high: 0.35 },
  },
  mesh: {
    size: 1000, subdivisions: 512, groundY: 0, heightTexSize: 512, anisotropicLevel: 4,
    get textureWorldSize() { return this.size; },
    get metersPerTexel() { return this.size / this.heightTexSize; },
    get chunkOrigin() { return { x: -this.size * 0.5, y: -this.size * 0.5 }; },
  },
  shading: {
    gradient: {
      sand: { h: 0.0, color: new BABYLON.Color3(0.98, 0.97, 0.97) },
      gravel: { h: 8.5, color: new BABYLON.Color3(0.82, 0.73, 0.6) },
      grass: { h: 14.0, color: new BABYLON.Color3(0.52, 0.75, 0.52) },
      rock: { h: 32.0, color: new BABYLON.Color3(0.42, 0.53, 0.48) },
      snow: { h: 40.0, color: new BABYLON.Color3(0.05, 0.05, 0.06) },
    },
    lighting: {
      sunDir: { x: 0.35, y: 0.85, z: -0.28 }, ambient: 0.24, diffuseBoost: 0.76,
      waterDepthFog: { r: 0.055, g: 0.023, b: 0.010 }, waterColor: new BABYLON.Color3(0.14, 0.39, 0.46),
      distanceFog: { start: 250, end: 850, color: new BABYLON.Color3(0.018, 0.12, 0.17) },
    },
    detail: { tiling: 12.0, strength: 0.22, grassMaskRange: { low: 8.5, high: 32.0 } },
    slope: { rockStart: 0.42, rockEnd: 0.72, grassRockLerpStart: 0.28, grassRockLerpEnd: 0.58, beachFlatThreshold: 0.45, ridgeInfluence: 0.25 },
  },
  foam: {
    shader: {
      enabled: true, color: new BABYLON.Color4(1.0, 1.0, 1.0, 0.90), width: 14.52, dissolve: 0.42, gradientDissolve: 0.88, edgeFade: 0.92, invert: 0, scale: 0.85, tile: { x: 1, y: 1 }, pan: { x: 0.0008, y: 0.0005 }, distortion: 0.06, smooth: 0.48,
      worley: {
        baseScale: 2.9,
        large: { scale: 0.52, radiusBase: 0.16, radiusVar: 0.44, softness: 0.16, edgeWidth: 0.13 },
        medium: { scale: 1.28, radiusBase: 0.10, radiusVar: 0.36, softness: 0.11, edgeWidth: 0.09 },
        small: { scale: 2.85, radiusBase: 0.06, radiusVar: 0.24, softness: 0.07 },
        domainWarpStrength: 0.65, lacyBoost: 0.85, softPow: 0.85,
      },
      dissipation: { breakupScale: 2.6, breakupOctaves: 4, fineNoiseScale: 11.5, mix: 0.38, outerFadeStart: 0.05, outerFadeEnd: 0.75, innerKeep: 0.25, finalFadeStart: 0.0, finalFadeEnd: 0.55, liftBase: 0.82, liftVar: 0.62 },
    },
    particles: {
      enabled: true,
      intersection: { yOffset: 0.25, maxTris: 15000, heightCulling: true, cullAbove: 12, cullBelow: 8, rebuildEvery: 24 },
      emission: { emitCount: 32, manualEmitCount: 2 },
      particle: {
        capacity: 9000, textureUrl: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/misc/water_splash.webp",
        minEmitBox: { x: -0.15, y: 0, z: -0.15 }, maxEmitBox: { x: 0.15, y: 0, z: 0.15 },
        color1: new BABYLON.Color4(0.8, 0.9, 1, 0.1), color2: new BABYLON.Color4(0.7, 0.8, 1, 0.06), colorDead: new BABYLON.Color4(0.3, 0.4, 0.6, 0),
        minSize: 0.35, maxSize: 4.0, minLifeTime: 1.0, maxLifeTime: 3.0, emitRate: 800, minEmitPower: 0.04, maxEmitPower: 0.1,
        gravity: { x: 0, y: 0.0, z: 0 }, direction1: { x: -0.18, y: 0.0, z: -0.18 }, direction2: { x: 0.18, y: 0.0, z: 0.18 }, blendMode: "ADD" as const,
      },
    },
    global: { distanceFadeStart: 250, distanceFadeEnd: 850 },
  },
  textures: {
    seabed: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/rocky_trail_1k.blend/textures/rocky_trail_diff_1k.jpg",
    foam: {
      surfFoam: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/foam1.png",
      distortion: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/noise1.png",
      intersectionMask: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/noise2.png",
      shorelineDissolve: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/noise3.png",
      normal: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/normal1.png",
    },
  },
  presets: {
    atoll: { generation: { baseAmplitude: 6, ridgeAmplitude: 30, cliffAmount: 0.15, valleyAmplitude: 2 }, shading: { gradient: { sand: { h: 0.0 }, gravel: { h: 3.0 }, grass: { h: 6.0 }, rock: { h: 18.0 }, snow: { h: 35.0 } } } },
    volcanic: { generation: { baseAmplitude: 18, ridgeAmplitude: 140, ridgeSharpness: 3.8, cliffAmount: 0.55, cliffThreshold: 0.5 }, shading: { gradient: { sand: { h: 0.0 }, gravel: { h: 5.0 }, grass: { h: 10.0 }, rock: { h: 22.0 }, snow: { h: 38.0 } } } },
  },
  helpers: {
    getComputeUniforms() {
      const g = TERRAIN_CONFIG.generation; const m = TERRAIN_CONFIG.mesh;
      return { chunkOrigin: m.chunkOrigin, textureWorldSize: m.textureWorldSize, metersPerTexel: m.metersPerTexel, texelDelta: 1 / m.heightTexSize, seed: g.seed, worldScale: g.worldScale, baseAmplitude: g.baseAmplitude, baseFrequency: g.baseFrequency, baseOctaves: g.baseOctaves, baseGain: g.baseGain, lacunarity: g.lacunarity, warpStrength: g.warpStrength, warpFrequency: g.warpFrequency, ridgeAmplitude: g.ridgeAmplitude, ridgeFrequency: g.ridgeFrequency, ridgeSharpness: g.ridgeSharpness, cliffAmount: g.cliffAmount, cliffThreshold: g.cliffThreshold, cliffSoftness: g.cliffSoftness, valleyAmplitude: g.valleyAmplitude, valleyFrequency: g.valleyFrequency, seaLevel: g.seaLevel };
    },
    getShadingUniforms() {
      const s = TERRAIN_CONFIG.shading;
      return { sandColor: s.gradient.sand.color, gravelColor: s.gradient.gravel.color, grassColor: s.gradient.grass.color, rockColor: s.gradient.rock.color, snowColor: s.gradient.snow.color, sandH: s.gradient.sand.h, gravelH: s.gradient.gravel.h, grassH: s.gradient.grass.h, rockH: s.gradient.rock.h, snowH: s.gradient.snow.h };
    },
  },
};
export const TERRAIN_TYPES = { default: 'default' as TerrainTechnique, atoll: 'atoll' as TerrainTechnique, volcanic: 'volcanic' as TerrainTechnique } as const;
export function getMergedTerrainConfig(technique: TerrainTechnique = 'default') {
  const base: any = TERRAIN_CONFIG; const preset = base.presets?.[technique];
  if (!preset) { return { generation: base.generation, mesh: base.mesh, shading: base.shading, foam: base.foam, textures: base.textures, type: technique }; }
  const gradient = Object.fromEntries(Object.entries(base.shading.gradient).map(([name, value]) => [name, { ...(value as object), ...(preset.shading?.gradient?.[name] || {}) }]));
  return { generation: { ...base.generation, ...(preset.generation || {}) }, mesh: base.mesh, shading: { ...base.shading, gradient }, foam: base.foam, textures: base.textures, type: technique };
}
export type TerrainGenerationConfig = typeof TERRAIN_CONFIG.generation;
export type TerrainMeshConfig = typeof TERRAIN_CONFIG.mesh;
export type TerrainShadingConfig = typeof TERRAIN_CONFIG.shading;
export type TerrainFoamParticlesConfig = typeof TERRAIN_CONFIG.foam.particles;
