// ocean2.ts - Goal preset, decoupled via terrain.ts
import { OCEAN_CONFIG as SHARED_CONFIG } from "./oceanConfig";
import { OCEAN_VERT2 } from "./shaders/wgsl/oceanVert2";
import { OCEAN_FRAG2 } from "./shaders/wgsl/oceanFrag2";
import { FLOOR_VERT } from "./shaders/wgsl/floorVert";
import { FLOOR_FRAG } from "./shaders/wgsl/floorFrag";
import { setupTerrain, type TerrainSetupOptions, type TerrainSystem } from "./terrain";
export const OCEAN_CONFIG = SHARED_CONFIG;
export const HDR_COLOR_KEYS = new Set(['Color_Shallow', 'Color_Deep', 'Specular_Color']);
export function srgbToLinear(c: number): number { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
export function gammaColorToLinear(r: number, g: number, b: number, a: number) { return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b), a] as const; }
export type WaterUniforms = ReturnType<typeof createWaterUniforms>;
export function createWaterUniforms() {
  const water = SHARED_CONFIG.ocean;
  const depth = water.depth;
  const foam = water.surfaceFoam;
  const distortion = water.surfaceDistortion;
  const intersection = water.intersectionFoam;
  const shoreline = water.shoreline;
  const underwater = water.underwater;
  const normal = water.normal;
  const lighting = water.lighting;
  const reflection = water.reflection;
  const refraction = water.refraction;
  const caustics = water.caustics;
  const waves = water.waves;
  return {
    Color_Shallow: depth.shallowColor, Color_Deep: depth.deepColor, Water_Depth: depth.waterDepth, WorldSpaceDepth: depth.worldSpaceDepth,
    DistanceMask_Start: depth.distanceMaskStart, DistanceMask_Fade: depth.distanceMaskFade, ShoreFade: depth.shoreFade, ShoreFade_Smoothness: depth.shoreFadeSmoothness,
    Enable_SurfaceFoam: foam.enabled ? 1 : 0, SurfFoam_Color: foam.color, SurfFoam_AlphaBlend: foam.alphaBlend, Invert_SurfFoam: foam.invert,
    SurfFoam_Pan: foam.pan, SurfFoam_Scale: foam.scale, SurfFoam_Tile: foam.tile, SurfFoam_Edge: foam.edge, SurfFoam_EdgeSmooth: foam.edgeSmooth,
    SurfFoam_LodNear: foam.lodNear, SurfFoam_LodFar: foam.lodFar, SurfFoam_LodDistance: foam.lodDistance, SurfFoam_SecondScale: foam.secondScale, SurfFoam_RemapBase: foam.remapBase, SurfFoam_RemapRange: foam.remapRange, SurfFoam_SecondRemapBase: foam.secondRemapBase, SurfFoam_SecondRemapRange: foam.secondRemapRange, SurfFoam_Blend: foam.blend,
    SurfaceDistortion_Scale: distortion.scale, SurfaceDistortion_Strength: distortion.strength, SurfaceDistortion_Pan: distortion.pan,
    Enable_Intersection: intersection.enabled ? 1 : 0, InterSec_Color: intersection.color, InterSec_Width: intersection.width, InterSec_Dissolve: intersection.dissolve, InterSec_Foam_Invert: intersection.invert,
    InterSec_Foam_Scale: intersection.scale, InterSec_Foam_Tile: intersection.tile, InterSec_Foam_Pan: intersection.pan, InterSec_Foam_Distortion: intersection.distortion, InterSec_Foam_Smooth: intersection.smooth, InterSec_GradientDissolve: intersection.gradientDissolve, InterSec_Edge_Fade: intersection.edgeFade,
    ENABLESHORELINE: shoreline.enabled ? 1 : 0, SL_Color: shoreline.color, SL_WaterDepth: shoreline.waterDepth, SL_Speed: shoreline.speed, SL_Ammount: shoreline.amount, SL_Thickness: shoreline.thickness, SL_CenterMask: shoreline.centerMask, SL_CenterMaskFade: shoreline.centerMaskFade, SL_Dissolve: shoreline.dissolve, SL_GradientDissolve: shoreline.gradientDissolve, SL_MaskPan: shoreline.maskPan, SL_MaskScale: shoreline.maskScale, SL_MaskTile: shoreline.maskTile, SL_EnableTrail: shoreline.enableTrail, SL_Trail_Fade: shoreline.trailFade,
    ENABLE_UNDERWATERLAYER: underwater.enabled ? 1 : 0, UnderWater_Depth: underwater.depth, ConformToGeometry: underwater.conformToGeometry, Underwater_Color: underwater.color, UnderWater_ScaleModifier: underwater.scaleModifier, UnderWater_Start: underwater.start, Underwater_Fade: underwater.fade,
    ENABLENORMAL: normal.enabled ? 1 : 0, Normal_Strength: normal.strength, Normal_Pan: normal.pan, Normal_Scale: normal.scale, Normal_DistanceStrength: normal.distanceStrength,
    sunDir: lighting.sunDir,
    ShadowColor: lighting.shadowColor, Specular_Color: lighting.specularColor, Specular_Spread: lighting.specularSpread, Specular_Hardness: lighting.specularHardness, Specular_Size: lighting.specularSize,
    ENABLEPLANERREFLECTION: reflection.enabled ? 1 : 0, Reflection_Strength: reflection.strength, Reflection_Fresnel: reflection.fresnel, Reflection_Distortion: reflection.distortion,
    ENABLEREFRACTION: refraction.enabled ? 1 : 0, Refraction_Strength: refraction.strength, Refraction_Distance_Strength: refraction.distanceStrength, Refraction_Distance_Fade: refraction.distanceFade,
    ENABLECAUSTICS: caustics.enabled ? 1 : 0, Caustics_Depth: caustics.depth, Caustics_Pan: caustics.pan, Caustics_Scale: caustics.scale, Caustics_Strength: caustics.strength, Caustics_Distortion_Strength: caustics.distortionStrength, Caustics_Distortion_Scale: caustics.distortionScale, Caustics_Start: caustics.start, Caustics_Fade: caustics.fade,
    ENABLEWAVE: waves.enabled ? 1 : 0, Wave_Top_Color: waves.topColor,
    Wave1_Length: waves.wave1.length, Wave1_Height: waves.wave1.height, Wave1_Speed: waves.wave1.speed, Wave1_Direction: waves.wave1.direction, Wave1_Sharpness: waves.wave1.sharpness,
    Wave2_Length: waves.wave2.length, Wave2_Height: waves.wave2.height, Wave2_Speed: waves.wave2.speed, Wave2_Direction: waves.wave2.direction, Wave2_Sharpness: waves.wave2.sharpness,
  };
}
export const TEXTURE_SLOTS = ['SurfFoam_Map','SurfaceDistortion_Map','InterSec_Foam_Mask','SL_Dissolve_Mask','Normal_Map','Caustics_Map','Caustics_Distortion_Map'] as const;
export type TextureSlot = typeof TEXTURE_SLOTS[number];
export const DEFAULT_TEXTURES: Record<TextureSlot, string> = {
  SurfFoam_Map: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/foam1.png",
  SurfaceDistortion_Map: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/noise1.png",
  InterSec_Foam_Mask: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/noise2.png",
  SL_Dissolve_Mask: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/noise3.png",
  Normal_Map: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/normal1.png",
  Caustics_Map: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/caustic1.png",
  Caustics_Distortion_Map: "https://raw.githubusercontent.com/EricEisaman/assets/main/images/textures/water/noise4.png",
};
export function createTextureRegistry(scene: BABYLON.Scene) {
  const textures = new Map<TextureSlot, BABYLON.Texture>();
  const get = (slot: TextureSlot) => {
    if (!textures.has(slot)) {
      const configured = SHARED_CONFIG.textures.foam as Record<string, string>;
      const configuredUrls: Partial<Record<TextureSlot, string>> = {
        SurfFoam_Map: configured.surfFoam, SurfaceDistortion_Map: configured.distortion,
        InterSec_Foam_Mask: configured.intersectionMask, SL_Dissolve_Mask: configured.shorelineDissolve,
        Normal_Map: configured.normal,
      };
      const url = configuredUrls[slot] || DEFAULT_TEXTURES[slot];
      const t = new BABYLON.Texture(url, scene, true, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
      t.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE; t.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE; t.anisotropicFilteringLevel = 4; textures.set(slot, t);
    }
    return textures.get(slot)!;
  };
  const set = (slot: TextureSlot, url: string) => {
    const t = new BABYLON.Texture(url, scene, true, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
    t.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE; t.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE; textures.set(slot, t);
  };
  return { get, set, getAll: () => textures };
}
const GRAVITY = 9.81;
function safeDenomJS(x: number) { const sgn = x >= 0 ? 1 : -1; return sgn * Math.max(Math.abs(x), 1e-6); }
function gerstnerWaveJS(len: number, height: number, speed: number, dir: { x: number, y: number, z: number }, sharp: number, P: { x: number, y: number, z: number }, t: number) {
  const D = { x: dir.x, y: dir.y, z: -dir.z }; const l = Math.hypot(D.x, D.y, D.z) || 1; const Dn = { x: D.x / l, y: D.y / l, z: D.z / l };
  const k = (2 * Math.PI) / Math.max(len, 0.001); const w = Math.sqrt(k * GRAVITY);
  const phase = (P.x * Dn.x + P.y * Dn.y + P.z * Dn.z) * k - w * t * speed; const c = Math.cos(phase); const s = Math.sin(phase);
  const kA = k * height; const Q = sharp / safeDenomJS(kA);
  const disp = { x: -Dn.x * s * Q * height, y: c * height, z: -Dn.z * s * Q * height };
  const nxz = { x: Dn.x * s * kA, z: Dn.z * s * kA }; const normal = { x: nxz.x, y: 1 - Q * c * kA, z: nxz.z };
  return { disp, normal };
}
export function createOceanEvaluator(baseY: number, uniforms?: ReturnType<typeof createWaterUniforms>) {
  const u = uniforms || createWaterUniforms();
  const sampleAt = (x: number, z: number, t: number) => {
    const P = { x, y: 0, z };
    const w1 = gerstnerWaveJS(u.Wave1_Length, u.Wave1_Height, u.Wave1_Speed, u.Wave1_Direction as any, u.Wave1_Sharpness, P, t);
    const w2 = gerstnerWaveJS(u.Wave2_Length, u.Wave2_Height, u.Wave2_Speed, u.Wave2_Direction as any, u.Wave2_Sharpness, P, t);
    const disp = { x: w1.disp.x + w2.disp.x, y: w1.disp.y + w2.disp.y, z: w1.disp.z + w2.disp.z };
    const enable = u.ENABLEWAVE;
    const pos = new BABYLON.Vector3(x + disp.x * enable, disp.y * enable + baseY, z + disp.z * enable);
    const nSum = { x: w1.normal.x + w2.normal.x, y: w1.normal.y + w2.normal.y, z: w1.normal.z + w2.normal.z };
    const len = Math.hypot(nSum.x, nSum.y, nSum.z) || 1;
    const waveNormal = new BABYLON.Vector3(nSum.x / len, nSum.y / len, nSum.z / len);
    const normalWorld = new BABYLON.Vector3(0, 1, 0);
    const finalNormal = BABYLON.Vector3.Lerp(normalWorld, waveNormal, enable).normalize();
    const e = 0.08;
    const w1x = gerstnerWaveJS(u.Wave1_Length, u.Wave1_Height, u.Wave1_Speed, u.Wave1_Direction as any, u.Wave1_Sharpness, {x: x+e, y:0, z}, t);
    const w2x = gerstnerWaveJS(u.Wave2_Length, u.Wave2_Height, u.Wave2_Speed, u.Wave2_Direction as any, u.Wave2_Sharpness, {x: x+e, y:0, z}, t);
    const w1z = gerstnerWaveJS(u.Wave1_Length, u.Wave1_Height, u.Wave1_Speed, u.Wave1_Direction as any, u.Wave1_Sharpness, {x, y:0, z: z+e}, t);
    const w2z = gerstnerWaveJS(u.Wave2_Length, u.Wave2_Height, u.Wave2_Speed, u.Wave2_Direction as any, u.Wave2_Sharpness, {x, y:0, z: z+e}, t);
    const dx = (w1x.disp.x + w2x.disp.x - disp.x) / e; const dz = (w1z.disp.z + w2z.disp.z - disp.z) / e; const jac = (1+dx)*(1+dz);
    const dt = 1/60; const w1p = gerstnerWaveJS(u.Wave1_Length, u.Wave1_Height, u.Wave1_Speed, u.Wave1_Direction as any, u.Wave1_Sharpness, P, t - dt);
    const w2p = gerstnerWaveJS(u.Wave2_Length, u.Wave2_Height, u.Wave2_Speed, u.Wave2_Direction as any, u.Wave2_Sharpness, P, t - dt);
    const prevY = (w1p.disp.y + w2p.disp.y) * enable; const vel = new BABYLON.Vector3(0, (pos.y - baseY - prevY)/dt, 0);
    return { paramX: x, paramZ: z, position: pos, normal: finalNormal, velocity: vel, jacobian: jac };
  };
  return {
    sampleFull: (x:number,z:number,t:number) => { const s = sampleAt(x,z,t); return { paramX: s.paramX, paramZ: s.paramZ, position: s.position, normal: s.normal, velocity: s.velocity, jacobian: s.jacobian }; },
    samplePhysics: (x:number,z:number,t:number) => { const s = sampleAt(x,z,t); return { paramX: s.paramX, paramZ: s.paramZ, position: s.position, normal: s.normal, velocity: s.velocity, jacobian: s.jacobian }; },
    getWaterHeightAtAccurate: (tx:number,tz:number,t:number) => sampleAt(tx,tz,t).position.y,
  };
}
export type OceanSetupOptions = TerrainSetupOptions;
export async function setupOcean(scene: BABYLON.Scene, options?: OceanSetupOptions) {
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["oceanFloorVertexShader"] = FLOOR_VERT;
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["oceanFloorFragmentShader"] = FLOOR_FRAG;
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["ocean2VertexShader"] = OCEAN_VERT2;
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["ocean2FragmentShader"] = OCEAN_FRAG2;
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["oceanVertexShader"] = OCEAN_VERT2;
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["oceanFragmentShader"] = OCEAN_FRAG2;
  const terrain: TerrainSystem = await setupTerrain(scene, options);
  const { ground, floorMaterial, heightTexture, dataTexture, cachedHeights, getGroundHeightAt, updateTerrain, seabedTexture, chunkOrigin, textureWorldSize } = terrain;
  const ocean = BABYLON.MeshBuilder.CreateGround("ocean2", { width: OCEAN_CONFIG.ocean.width, height: OCEAN_CONFIG.ocean.height, subdivisions: OCEAN_CONFIG.ocean.subdivisions }, scene);
  ocean.position.y = OCEAN_CONFIG.ocean.baseY;
  const waterUniforms = createWaterUniforms(); const texRegistry = createTextureRegistry(scene);
  const oceanMat = new BABYLON.ShaderMaterial("stylizedOceanMaterial", scene, { vertex: "ocean2", fragment: "ocean2" }, {
    attributes: ["position", "normal", "uv"],
    uniforms: ["time", "cameraPosition", "chunkOrigin", "textureWorldSize", "isUnderwater", "waterHeightAtCamera", "Color_Shallow", "Color_Deep", "Water_Depth", "WorldSpaceDepth", "DistanceMask_Start", "DistanceMask_Fade", "ShoreFade", "ShoreFade_Smoothness", "Enable_SurfaceFoam", "SurfFoam_Color", "SurfFoam_AlphaBlend", "Invert_SurfFoam", "SurfFoam_Pan", "SurfFoam_Scale", "SurfFoam_Tile", "SurfFoam_Edge", "SurfFoam_EdgeSmooth", "SurfFoam_LodNear", "SurfFoam_LodFar", "SurfFoam_LodDistance", "SurfFoam_SecondScale", "SurfFoam_RemapBase", "SurfFoam_RemapRange", "SurfFoam_SecondRemapBase", "SurfFoam_SecondRemapRange", "SurfFoam_Blend", "SurfaceDistortion_Scale", "SurfaceDistortion_Strength", "SurfaceDistortion_Pan", "Enable_Intersection", "InterSec_Color", "InterSec_Width", "InterSec_Dissolve", "InterSec_Foam_Invert", "InterSec_Foam_Scale", "InterSec_Foam_Tile", "InterSec_Foam_Pan", "InterSec_Foam_Distortion", "InterSec_Foam_Smooth", "InterSec_GradientDissolve", "InterSec_Edge_Fade", "ENABLESHORELINE", "SL_Color", "SL_WaterDepth", "SL_Speed", "SL_Ammount", "SL_Thickness", "SL_CenterMask", "SL_CenterMaskFade", "SL_Dissolve", "SL_GradientDissolve", "SL_MaskPan", "SL_MaskScale", "SL_MaskTile", "SL_EnableTrail", "SL_Trail_Fade", "ENABLE_UNDERWATERLAYER", "UnderWater_Depth", "ConformToGeometry", "Underwater_Color", "UnderWater_ScaleModifier", "UnderWater_Start", "Underwater_Fade", "ENABLENORMAL", "Normal_Strength", "Normal_Pan", "Normal_Scale", "Normal_DistanceStrength", "sunDir", "ShadowColor", "Specular_Color", "Specular_Spread", "Specular_Hardness", "Specular_Size", "ENABLEPLANERREFLECTION", "Reflection_Strength", "Reflection_Fresnel", "Reflection_Distortion", "ENABLEREFRACTION", "Refraction_Strength", "Refraction_Distance_Strength", "Refraction_Distance_Fade", "ENABLECAUSTICS", "Caustics_Depth", "Caustics_Pan", "Caustics_Scale", "Caustics_Strength", "Caustics_Distortion_Strength", "Caustics_Distortion_Scale", "Caustics_Start", "Caustics_Fade", "ENABLEWAVE", "Wave_Top_Color", "Wave1_Length", "Wave1_Height", "Wave1_Speed", "Wave1_Direction", "Wave1_Sharpness", "Wave2_Length", "Wave2_Height", "Wave2_Speed", "Wave2_Direction", "Wave2_Sharpness"],
    uniformBuffers: ["Scene", "Mesh"],
    samplers: ["SurfFoam_Map", "SurfaceDistortion_Map", "InterSec_Foam_Mask", "SL_Dissolve_Mask", "Normal_Map", "Caustics_Map", "Caustics_Distortion_Map", "heightTexture", "seabedTexture"],
    shaderLanguage: BABYLON.ShaderLanguage.WGSL
  });
  const setColor4 = (name: string, col: any) => {
    if (col._isGamma) { const lin = gammaColorToLinear(col.r, col.g, col.b, col.a); oceanMat.setColor4(name, new BABYLON.Color4(lin[0], lin[1], lin[2], lin[3])); }
    else { oceanMat.setColor4(name, new BABYLON.Color4(col.r, col.g, col.b, col.a)); }
  };
  const applyWaterUniforms = (u: any) => {
    setColor4("Color_Shallow", u.Color_Shallow); setColor4("Color_Deep", u.Color_Deep);
    oceanMat.setFloat("Water_Depth", u.Water_Depth); oceanMat.setFloat("WorldSpaceDepth", u.WorldSpaceDepth);
    oceanMat.setFloat("DistanceMask_Start", u.DistanceMask_Start); oceanMat.setFloat("DistanceMask_Fade", u.DistanceMask_Fade);
    oceanMat.setFloat("ShoreFade", u.ShoreFade); oceanMat.setFloat("ShoreFade_Smoothness", u.ShoreFade_Smoothness);
    oceanMat.setFloat("Enable_SurfaceFoam", u.Enable_SurfaceFoam); setColor4("SurfFoam_Color", u.SurfFoam_Color);
    oceanMat.setFloat("SurfFoam_AlphaBlend", u.SurfFoam_AlphaBlend); oceanMat.setFloat("Invert_SurfFoam", u.Invert_SurfFoam);
    oceanMat.setVector2("SurfFoam_Pan", new BABYLON.Vector2(u.SurfFoam_Pan.x, u.SurfFoam_Pan.y)); oceanMat.setFloat("SurfFoam_Scale", u.SurfFoam_Scale);
    oceanMat.setVector2("SurfFoam_Tile", new BABYLON.Vector2(u.SurfFoam_Tile.x, u.SurfFoam_Tile.y)); oceanMat.setFloat("SurfFoam_Edge", u.SurfFoam_Edge); oceanMat.setFloat("SurfFoam_EdgeSmooth", u.SurfFoam_EdgeSmooth);
    oceanMat.setFloat("SurfaceDistortion_Scale", u.SurfaceDistortion_Scale); oceanMat.setFloat("SurfaceDistortion_Strength", u.SurfaceDistortion_Strength); oceanMat.setVector2("SurfaceDistortion_Pan", new BABYLON.Vector2(u.SurfaceDistortion_Pan.x, u.SurfaceDistortion_Pan.y));
    oceanMat.setFloat("Enable_Intersection", u.Enable_Intersection); setColor4("InterSec_Color", u.InterSec_Color);
    oceanMat.setFloat("InterSec_Width", u.InterSec_Width); oceanMat.setFloat("InterSec_Dissolve", u.InterSec_Dissolve); oceanMat.setFloat("InterSec_Foam_Invert", u.InterSec_Foam_Invert);
    oceanMat.setFloat("InterSec_Foam_Scale", u.InterSec_Foam_Scale); oceanMat.setVector2("InterSec_Foam_Tile", new BABYLON.Vector2(u.InterSec_Foam_Tile.x, u.InterSec_Foam_Tile.y)); oceanMat.setVector2("InterSec_Foam_Pan", new BABYLON.Vector2(u.InterSec_Foam_Pan.x, u.InterSec_Foam_Pan.y));
    oceanMat.setFloat("InterSec_Foam_Distortion", u.InterSec_Foam_Distortion); oceanMat.setFloat("InterSec_Foam_Smooth", u.InterSec_Foam_Smooth); oceanMat.setFloat("InterSec_GradientDissolve", u.InterSec_GradientDissolve); oceanMat.setFloat("InterSec_Edge_Fade", u.InterSec_Edge_Fade);
    oceanMat.setFloat("ENABLESHORELINE", u.ENABLESHORELINE); setColor4("SL_Color", u.SL_Color); oceanMat.setFloat("SL_WaterDepth", u.SL_WaterDepth); oceanMat.setFloat("SL_Speed", u.SL_Speed); oceanMat.setFloat("SL_Ammount", u.SL_Ammount); oceanMat.setFloat("SL_Thickness", u.SL_Thickness); oceanMat.setFloat("SL_CenterMask", u.SL_CenterMask); oceanMat.setFloat("SL_CenterMaskFade", u.SL_CenterMaskFade); oceanMat.setFloat("SL_Dissolve", u.SL_Dissolve); oceanMat.setFloat("SL_GradientDissolve", u.SL_GradientDissolve); oceanMat.setVector2("SL_MaskPan", new BABYLON.Vector2(u.SL_MaskPan.x, u.SL_MaskPan.y)); oceanMat.setFloat("SL_MaskScale", u.SL_MaskScale); oceanMat.setVector2("SL_MaskTile", new BABYLON.Vector2(u.SL_MaskTile.x, u.SL_MaskTile.y)); oceanMat.setFloat("SL_EnableTrail", u.SL_EnableTrail); oceanMat.setFloat("SL_Trail_Fade", u.SL_Trail_Fade);
    oceanMat.setFloat("ENABLE_UNDERWATERLAYER", u.ENABLE_UNDERWATERLAYER); oceanMat.setFloat("UnderWater_Depth", u.UnderWater_Depth); oceanMat.setFloat("ConformToGeometry", u.ConformToGeometry); setColor4("Underwater_Color", u.Underwater_Color); oceanMat.setFloat("UnderWater_ScaleModifier", u.UnderWater_ScaleModifier); oceanMat.setFloat("UnderWater_Start", u.UnderWater_Start); oceanMat.setFloat("Underwater_Fade", u.Underwater_Fade);
    oceanMat.setFloat("ENABLENORMAL", u.ENABLENORMAL); oceanMat.setFloat("Normal_Strength", u.Normal_Strength); oceanMat.setFloat("Normal_Pan", u.Normal_Pan); oceanMat.setFloat("Normal_Scale", u.Normal_Scale); oceanMat.setFloat("Normal_DistanceStrength", u.Normal_DistanceStrength);
    oceanMat.setFloat("SurfFoam_LodNear", u.SurfFoam_LodNear); oceanMat.setFloat("SurfFoam_LodFar", u.SurfFoam_LodFar); oceanMat.setFloat("SurfFoam_LodDistance", u.SurfFoam_LodDistance); oceanMat.setFloat("SurfFoam_SecondScale", u.SurfFoam_SecondScale); oceanMat.setFloat("SurfFoam_RemapBase", u.SurfFoam_RemapBase); oceanMat.setFloat("SurfFoam_RemapRange", u.SurfFoam_RemapRange); oceanMat.setFloat("SurfFoam_SecondRemapBase", u.SurfFoam_SecondRemapBase); oceanMat.setFloat("SurfFoam_SecondRemapRange", u.SurfFoam_SecondRemapRange); oceanMat.setFloat("SurfFoam_Blend", u.SurfFoam_Blend);
    oceanMat.setVector3("sunDir", new BABYLON.Vector3(u.sunDir.x, u.sunDir.y, u.sunDir.z));
    setColor4("ShadowColor", u.ShadowColor); oceanMat.setColor4("Specular_Color", new BABYLON.Color4(u.Specular_Color.r, u.Specular_Color.g, u.Specular_Color.b, u.Specular_Color.a)); oceanMat.setFloat("Specular_Spread", u.Specular_Spread); oceanMat.setFloat("Specular_Hardness", u.Specular_Hardness); oceanMat.setFloat("Specular_Size", u.Specular_Size);
    oceanMat.setFloat("ENABLEPLANERREFLECTION", u.ENABLEPLANERREFLECTION); oceanMat.setFloat("Reflection_Strength", u.Reflection_Strength); oceanMat.setFloat("Reflection_Fresnel", u.Reflection_Fresnel); oceanMat.setFloat("Reflection_Distortion", u.Reflection_Distortion);
    oceanMat.setFloat("ENABLEREFRACTION", u.ENABLEREFRACTION); oceanMat.setFloat("Refraction_Strength", u.Refraction_Strength); oceanMat.setFloat("Refraction_Distance_Strength", u.Refraction_Distance_Strength); oceanMat.setFloat("Refraction_Distance_Fade", u.Refraction_Distance_Fade);
    oceanMat.setFloat("ENABLECAUSTICS", u.ENABLECAUSTICS); oceanMat.setFloat("Caustics_Depth", u.Caustics_Depth); oceanMat.setFloat("Caustics_Pan", u.Caustics_Pan); oceanMat.setFloat("Caustics_Scale", u.Caustics_Scale); oceanMat.setFloat("Caustics_Strength", u.Caustics_Strength); oceanMat.setFloat("Caustics_Distortion_Strength", u.Caustics_Distortion_Strength); oceanMat.setFloat("Caustics_Distortion_Scale", u.Caustics_Distortion_Scale); oceanMat.setFloat("Caustics_Start", u.Caustics_Start); oceanMat.setFloat("Caustics_Fade", u.Caustics_Fade);
    oceanMat.setFloat("ENABLEWAVE", u.ENABLEWAVE); setColor4("Wave_Top_Color", u.Wave_Top_Color);
    oceanMat.setFloat("Wave1_Length", u.Wave1_Length); oceanMat.setFloat("Wave1_Height", u.Wave1_Height); oceanMat.setFloat("Wave1_Speed", u.Wave1_Speed); oceanMat.setVector3("Wave1_Direction", new BABYLON.Vector3(u.Wave1_Direction.x, u.Wave1_Direction.y, u.Wave1_Direction.z)); oceanMat.setFloat("Wave1_Sharpness", u.Wave1_Sharpness);
    oceanMat.setFloat("Wave2_Length", u.Wave2_Length); oceanMat.setFloat("Wave2_Height", u.Wave2_Height); oceanMat.setFloat("Wave2_Speed", u.Wave2_Speed); oceanMat.setVector3("Wave2_Direction", new BABYLON.Vector3(u.Wave2_Direction.x, u.Wave2_Direction.y, u.Wave2_Direction.z)); oceanMat.setFloat("Wave2_Sharpness", u.Wave2_Sharpness);
  };
  applyWaterUniforms(waterUniforms);
  oceanMat.setTexture("SurfFoam_Map", texRegistry.get("SurfFoam_Map")); oceanMat.setTexture("SurfaceDistortion_Map", texRegistry.get("SurfaceDistortion_Map")); oceanMat.setTexture("InterSec_Foam_Mask", texRegistry.get("InterSec_Foam_Mask")); oceanMat.setTexture("SL_Dissolve_Mask", texRegistry.get("SL_Dissolve_Mask")); oceanMat.setTexture("Normal_Map", texRegistry.get("Normal_Map")); oceanMat.setTexture("Caustics_Map", texRegistry.get("Caustics_Map")); oceanMat.setTexture("Caustics_Distortion_Map", texRegistry.get("Caustics_Distortion_Map"));
  oceanMat.setTexture("heightTexture", heightTexture); oceanMat.setTexture("seabedTexture", seabedTexture);
  oceanMat.setVector2("chunkOrigin", chunkOrigin); oceanMat.setFloat("textureWorldSize", textureWorldSize);
  oceanMat.backFaceCulling = false; oceanMat.needDepthPrePass = false; oceanMat.separateCullingPass = true; (oceanMat as any).needAlphaBlending = true; oceanMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND; oceanMat.alphaMode = BABYLON.Engine.ALPHA_COMBINE; (oceanMat as any).disableDepthWrite = false;
  oceanMat.setFloat("time", 0); oceanMat.setFloat("isUnderwater", 0); oceanMat.setFloat("waterHeightAtCamera", 0);
  ocean.material = oceanMat;
  const evaluator = createOceanEvaluator(OCEAN_CONFIG.ocean.baseY, waterUniforms);
  return { ground, floorMaterial, heightTexture, dataTexture, cachedHeights, getGroundHeightAt, updateTerrain, terrain, seabedTexture, chunkOrigin, textureWorldSize, ocean, oceanMaterial: oceanMat, getWaterHeightAtAccurate: evaluator.getWaterHeightAtAccurate, getWaterHeightAtFast: evaluator.getWaterHeightAtAccurate, sampleAtWorldXZ: evaluator.samplePhysics, sampleFull: evaluator.sampleFull, waterUniforms, textureRegistry: texRegistry, setWaterUniform: (key: string, value: any) => { (waterUniforms as any)[key] = value; applyWaterUniforms(waterUniforms); } };
}
