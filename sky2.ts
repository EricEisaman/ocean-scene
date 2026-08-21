
// sky2.ts - Tropical sunny skybox using DaySkyHDRI027B_1K cubemap
// Source folder: https://github.com/EricEisaman/assets/tree/main/images/skies/DaySkyHDRI027B_1K/cubemap
// Six images: px.jpg, nx.jpg, py.jpg, ny.jpg, pz.jpg, nz.jpg (HDRI Haven converter output)

import { SKY_CONFIG } from "./skyConfig";

export type SkySetup = {
  skybox: BABYLON.Mesh,
  moonMesh: BABYLON.Mesh, // kept name for compatibility - actually sun in this variant
  lensFlareSystem: BABYLON.LensFlareSystem,
  godrays: BABYLON.VolumetricLightScatteringPostProcess
};

export function setupSky(scene: BABYLON.Scene, camera: BABYLON.Camera, engine: BABYLON.Engine): SkySetup {
  // alias so existing index.ts that imports from "./sky2" can also work if it calls setupSky
  return setupSky2(scene, camera, engine);
}

export function setupSky2(scene: BABYLON.Scene, camera: BABYLON.Camera, engine: BABYLON.Engine): SkySetup {
  const cfg = SKY_CONFIG.tropicalSunny;

  // ---- Skybox ----
  const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: cfg.skybox.size }, scene);
  const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.disableLighting = true;
  
  // Create cubemap from six images
  // Babylon expects order px, py, pz, nx, ny, nz for CreateFromImages
  // Files located at: https://raw.githubusercontent.com/EricEisaman/assets/main/images/skies/DaySkyHDRI027B_1K/cubemap/
  try {
    // Primary: explicit six URLs
    const files = [...cfg.skybox.orderedFiles];
    const reflectionTexture = BABYLON.CubeTexture.CreateFromImages(files, scene);
    // Some Babylon versions need explicit coordinatesMode
    reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.reflectionTexture = reflectionTexture;
  } catch (e) {
    console.warn("[sky2] CreateFromImages failed, falling back to CubeTexture root + extensions", e);
    // Fallback: CubeTexture with root + extensions _px.jpg etc
    // root = baseUrl + "something" - we use baseUrl as root and supply extensions
    // The folder itself contains px.jpg not _px.jpg, so we try with no prefix but extension list
    const texture = new BABYLON.CubeTexture(cfg.skybox.baseUrl, scene, cfg.skybox.extensions as any);
    texture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.reflectionTexture = texture;
  }

  skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  skybox.material = skyboxMaterial;
  skybox.infiniteDistance = true; // keep skybox centered

  // ---- Sun (replaces moon) ----
  const sunMesh = BABYLON.MeshBuilder.CreateSphere("sun", { diameter: cfg.celestial.diameter, segments: 32 }, scene);
  const sunMat = new BABYLON.StandardMaterial("sunMat", scene);
  sunMat.emissiveColor = new BABYLON.Color3(cfg.celestial.emissiveColor.r, cfg.celestial.emissiveColor.g, cfg.celestial.emissiveColor.b);
  sunMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  sunMat.specularColor = new BABYLON.Color3(0, 0, 0);
  sunMat.disableLighting = true;
  sunMesh.material = sunMat;
  sunMesh.position = new BABYLON.Vector3(cfg.celestial.position.x, cfg.celestial.position.y, cfg.celestial.position.z);
  sunMesh.scaling.setAll(cfg.celestial.scale);
  sunMesh.applyFog = false;
  sunMesh.isBlocker = false;

  // ---- Lens flares - warm sunny ----
  const lensFlareSystem = new BABYLON.LensFlareSystem("lensFlareSystem", sunMesh, scene);
  lensFlareSystem.borderLimit = cfg.lensFlares.borderLimit;
  lensFlareSystem.viewportBorder = cfg.lensFlares.viewportBorder ?? 0;
  lensFlareSystem.isEnabled = true;

  // Create flares from config
  for (const f of cfg.lensFlares.colors) {
    new BABYLON.LensFlare(
      f.size,
      f.pos,
      new BABYLON.Color3(f.color.r, f.color.g, f.color.b),
      "https://playground.babylonjs.com/textures/flare.png",
      lensFlareSystem
    );
  }

  // ---- Godrays - stronger for sunny ----
  const godrays = new BABYLON.VolumetricLightScatteringPostProcess(
    "godrays",
    1.0,
    camera as BABYLON.FreeCamera,
    sunMesh,
    cfg.godrays.sampleCount,
    BABYLON.Texture.BILINEAR_SAMPLINGMODE,
    engine,
    false,
    scene
  );
  godrays.exposure = cfg.godrays.exposure;
  godrays.decay = cfg.godrays.decay;
  godrays.weight = cfg.godrays.weight;
  godrays.density = cfg.godrays.density;
  godrays.excludedMeshes.push(skybox);

  // Optional: Adjust scene clear color to match tropical sky if fog config exists
  if (cfg.fog?.clearColor) {
    scene.clearColor = new BABYLON.Color4(cfg.fog.clearColor.r, cfg.fog.clearColor.g, cfg.fog.clearColor.b, cfg.fog.clearColor.a);
  }

  // For compatibility with index.ts that expects moonMesh name
  return { skybox, moonMesh: sunMesh, lensFlareSystem, godrays };
}
