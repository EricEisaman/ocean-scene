// terrain.ts - Decoupled terrain system
import { TERRAIN_CONFIG, TERRAIN_TYPES, getMergedTerrainConfig, type TerrainTechnique } from "./terrainConfig";
import { FLOOR_VERT } from "./shaders/wgsl/floorVert";
import { FLOOR_FRAG } from "./shaders/wgsl/floorFrag";
import { TERRAIN_DATA_COMPUTE } from "./shaders/wgsl/terrainDataCompute";
import { resolveTerrainHeights, createHeightTexture, type TerrainSource, type TerrainParams, type ResolvedTerrain } from "./terrainSource";
export type TerrainSetupOptions = {
  terrainSource?: TerrainSource; heightTexSize?: number; terrainParams?: Partial<TerrainParams>;
  technique?: TerrainTechnique; terrainType?: TerrainTechnique; type?: TerrainTechnique;
};
export type TerrainSystem = {
  ground: BABYLON.Mesh; heightTexture: BABYLON.RawTexture; dataTexture: BABYLON.RawTexture; seabedTexture: BABYLON.Texture;
  floorMaterial: BABYLON.ShaderMaterial; getGroundHeightAt: (x: number, z: number) => number; cachedHeights: Float32Array;
  config: ReturnType<typeof getMergedTerrainConfig>; chunkOrigin: BABYLON.Vector2; textureWorldSize: number; metersPerTexel: number; heightTexSize: number;
  updateTerrain: (newSource: TerrainSource) => Promise<ResolvedTerrain>;
};
export async function setupTerrain(scene: BABYLON.Scene, options?: TerrainSetupOptions): Promise<TerrainSystem> {
  const technique = options?.technique ?? options?.terrainType ?? options?.type ?? (TERRAIN_CONFIG as any).type ?? TERRAIN_TYPES.default;
  const cfg = getMergedTerrainConfig(technique); const meshCfg = cfg.mesh; const shading = cfg.shading;
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["oceanFloorVertexShader"] = FLOOR_VERT;
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["oceanFloorFragmentShader"] = FLOOR_FRAG;
  const engine = scene.getEngine() as BABYLON.WebGPUEngine;
  const heightTexSize = options?.heightTexSize ?? meshCfg.heightTexSize;
  const textureWorldSize = meshCfg.size; const metersPerTexel = textureWorldSize / heightTexSize;
  const chunkOrigin = new BABYLON.Vector2(-textureWorldSize * 0.5, -textureWorldSize * 0.5);
  const genParams = { ...cfg.generation, ...(options?.terrainParams ?? {}) } as TerrainParams;
  let effectiveSource: TerrainSource = options?.terrainSource ?? { type: 'procedural', params: genParams };
  if (effectiveSource.type === 'procedural' && options?.terrainParams) { effectiveSource = { type: 'procedural', params: { ...genParams, ...(effectiveSource.params ?? {}) } }; }
  if (effectiveSource.type === 'procedural' && !effectiveSource.params) { effectiveSource = { type: 'procedural', params: genParams }; }
  const resolved = await resolveTerrainHeights(effectiveSource, heightTexSize, textureWorldSize, chunkOrigin, metersPerTexel);
  const cachedHeights = resolved.heights;
  const heightTexture = createHeightTexture(scene, cachedHeights, heightTexSize);
  const dataTexture = BABYLON.RawTexture.CreateRGBAStorageTexture(null, heightTexSize, heightTexSize, scene, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE, BABYLON.Constants.TEXTURETYPE_HALF_FLOAT);
  const ubo = new BABYLON.UniformBuffer(engine);
  ubo.addUniform("chunkOrigin", 2); ubo.addUniform("textureWorldSize", 2); ubo.addUniform("metersPerTexel", 1); ubo.addUniform("texelDelta", 1);
  ubo.addUniform("seed", 1); ubo.addUniform("worldScale", 1); ubo.addUniform("baseAmplitude", 1); ubo.addUniform("baseFrequency", 1); ubo.addUniform("baseOctaves", 1); ubo.addUniform("baseGain", 1);
  ubo.addUniform("lacunarity", 1); ubo.addUniform("warpStrength", 1); ubo.addUniform("warpFrequency", 1); ubo.addUniform("ridgeAmplitude", 1); ubo.addUniform("ridgeFrequency", 1); ubo.addUniform("ridgeSharpness", 1);
  ubo.addUniform("cliffAmount", 1); ubo.addUniform("cliffThreshold", 1); ubo.addUniform("cliffSoftness", 1); ubo.addUniform("valleyAmplitude", 1); ubo.addUniform("valleyFrequency", 1); ubo.addUniform("seaLevel", 1); ubo.addUniform("_pad0", 1);
  const g = genParams as any;
  ubo.updateFloat2("chunkOrigin", chunkOrigin.x, chunkOrigin.y); ubo.updateFloat2("textureWorldSize", textureWorldSize, textureWorldSize);
  ubo.updateFloat("metersPerTexel", metersPerTexel); ubo.updateFloat("texelDelta", 1 / heightTexSize);
  ubo.updateFloat("seed", g.seed ?? 0); ubo.updateFloat("worldScale", g.worldScale); ubo.updateFloat("baseAmplitude", g.baseAmplitude); ubo.updateFloat("baseFrequency", g.baseFrequency);
  ubo.updateInt("baseOctaves", g.baseOctaves); ubo.updateFloat("baseGain", g.baseGain); ubo.updateFloat("lacunarity", g.lacunarity);
  ubo.updateFloat("warpStrength", g.warpStrength); ubo.updateFloat("warpFrequency", g.warpFrequency); ubo.updateFloat("ridgeAmplitude", g.ridgeAmplitude); ubo.updateFloat("ridgeFrequency", g.ridgeFrequency); ubo.updateFloat("ridgeSharpness", g.ridgeSharpness);
  ubo.updateFloat("cliffAmount", g.cliffAmount); ubo.updateFloat("cliffThreshold", g.cliffThreshold); ubo.updateFloat("cliffSoftness", g.cliffSoftness);
  ubo.updateFloat("valleyAmplitude", g.valleyAmplitude); ubo.updateFloat("valleyFrequency", g.valleyFrequency); ubo.updateFloat("seaLevel", g.seaLevel); ubo.updateFloat("_pad0", 0); ubo.update();
  const dataCS = new BABYLON.ComputeShader("dataCS", engine, { computeSource: TERRAIN_DATA_COMPUTE }, { bindingsMapping: { heightMap: { group: 0, binding: 0 }, dataMap: { group: 0, binding: 1 }, u: { group: 0, binding: 2 } } });
  dataCS.setTexture("heightMap", heightTexture, false); dataCS.setStorageTexture("dataMap", dataTexture); dataCS.setUniformBuffer("u", ubo);
  dataCS.dispatchWhenReady(Math.ceil(heightTexSize / 8), Math.ceil(heightTexSize / 8), 1);
  const ground = BABYLON.MeshBuilder.CreateGround("seabed", { width: meshCfg.size, height: meshCfg.size, subdivisions: meshCfg.subdivisions, updatable: false }, scene);
  ground.position.y = meshCfg.groundY;
  const floorMat = new BABYLON.ShaderMaterial("oceanFloorMaterial", scene, { vertex: "oceanFloor", fragment: "oceanFloor" }, {
    attributes: ["position", "uv"], uniforms: ["terrainRender","chunkOrigin","cameraPosition","sandColor","gravelColor","grassColor","rockColor","snowColor","sandH","gravelH","grassH","rockH","snowH"],
    uniformBuffers: ["Scene","Mesh"], samplers: ["seabedTexture","heightTexture","dataTexture"], shaderLanguage: BABYLON.ShaderLanguage.WGSL
  });
  const grad = shading.gradient;
  floorMat.setColor3("sandColor", new BABYLON.Color3(grad.sand.color.r, grad.sand.color.g, grad.sand.color.b));
  floorMat.setColor3("gravelColor", new BABYLON.Color3(grad.gravel.color.r, grad.gravel.color.g, grad.gravel.color.b));
  floorMat.setColor3("grassColor", new BABYLON.Color3(grad.grass.color.r, grad.grass.color.g, grad.grass.color.b));
  floorMat.setColor3("rockColor", new BABYLON.Color3(grad.rock.color.r, grad.rock.color.g, grad.rock.color.b));
  floorMat.setColor3("snowColor", new BABYLON.Color3(grad.snow.color.r, grad.snow.color.g, grad.snow.color.b));
  floorMat.setFloat("sandH", grad.sand.h); floorMat.setFloat("gravelH", grad.gravel.h); floorMat.setFloat("grassH", grad.grass.h); floorMat.setFloat("rockH", grad.rock.h); floorMat.setFloat("snowH", grad.snow.h);
  const seabedTex = new BABYLON.Texture(cfg.textures.seabed, scene, true, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
  seabedTex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE; seabedTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE; seabedTex.anisotropicFilteringLevel = meshCfg.anisotropicLevel;
  floorMat.setTexture("seabedTexture", seabedTex); floorMat.setTexture("heightTexture", heightTexture); floorMat.setTexture("dataTexture", dataTexture);
  floorMat.setVector4("terrainRender", new BABYLON.Vector4(textureWorldSize, metersPerTexel, 0, 0)); floorMat.setVector2("chunkOrigin", chunkOrigin);
  ground.material = floorMat;
  const getGroundHeightAt = (x: number, z: number) => {
    const u = (x - chunkOrigin.x) / textureWorldSize; const v = (z - chunkOrigin.y) / textureWorldSize;
    if (u < 0 || u > 1 || v < 0 || v > 1) return meshCfg.groundY;
    const fx = u * (heightTexSize - 1), fz = v * (heightTexSize - 1); const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz;
    const row = iz * heightTexSize + ix; if (row < 0 || row + heightTexSize + 1 >= cachedHeights.length) return meshCfg.groundY;
    const h00 = cachedHeights[row], h10 = cachedHeights[row + 1], h01 = cachedHeights[row + heightTexSize], h11 = cachedHeights[row + heightTexSize + 1];
    const h = (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
    return meshCfg.groundY + h;
  };
  const updateTerrain = async (newSource: TerrainSource) => {
    const newResolved = await resolveTerrainHeights(newSource, heightTexSize, textureWorldSize, chunkOrigin, metersPerTexel);
    try { (heightTexture as any).update(newResolved.heights as any); } catch { const newTex = createHeightTexture(scene, newResolved.heights, heightTexSize); floorMat.setTexture("heightTexture", newTex); dataCS.setTexture("heightMap", newTex, false); }
    dataCS.dispatchWhenReady(Math.ceil(heightTexSize / 8), Math.ceil(heightTexSize / 8), 1); cachedHeights.set(newResolved.heights); return newResolved;
  };
  return { ground, heightTexture, dataTexture, seabedTexture: seabedTex, floorMaterial: floorMat, getGroundHeightAt, cachedHeights, config: cfg as any, chunkOrigin, textureWorldSize, metersPerTexel, heightTexSize, updateTerrain };
}
export { TERRAIN_TYPES, getMergedTerrainConfig } from "./terrainConfig";
export type { TerrainTechnique } from "./terrainConfig";
