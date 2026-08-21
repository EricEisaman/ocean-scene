// skybox.ts - skybox + moon + lens flares + godrays
export type SkySetup = {
  skybox: BABYLON.Mesh,
  moonMesh: BABYLON.Mesh,
  lensFlareSystem: BABYLON.LensFlareSystem,
  godrays: BABYLON.VolumetricLightScatteringPostProcess
};

export function setupSky(scene: BABYLON.Scene, camera: BABYLON.Camera, engine: BABYLON.Engine): SkySetup {
  const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
  const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", scene);
  skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
  skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  skybox.material = skyboxMaterial;

  const moonMesh = BABYLON.MeshBuilder.CreateSphere("moon", { diameter: 65, segments: 32 }, scene);
  const moonMat = new BABYLON.StandardMaterial("moonMat", scene);
  const moonTex = new BABYLON.Texture(
    "https://raw.githubusercontent.com/EricEisaman/assets/main/images/moontex.jpg",
    scene
  );
  moonMat.emissiveTexture = moonTex;
  moonMat.disableLighting = true;
  moonTex.uScale = -1;
  moonMesh.material = moonMat;
  moonMesh.position = new BABYLON.Vector3(100, 360, 460);
  moonMesh.scaling.setAll(0.6);
  moonMesh.applyFog = false;
  moonMesh.isBlocker = false;

  const lensFlareSystem = new BABYLON.LensFlareSystem("lensFlareSystem", moonMesh, scene);
  lensFlareSystem.borderLimit = 0;
  lensFlareSystem.viewportBorder = 0;
  lensFlareSystem.isEnabled = false;

  new BABYLON.LensFlare(0.6, 0, new BABYLON.Color3(1, 1, 1), "https://playground.babylonjs.com/textures/flare.png", lensFlareSystem);
  new BABYLON.LensFlare(0.2, 0.2, new BABYLON.Color3(1, 0.9, 0.8), "https://playground.babylonjs.com/textures/flare.png", lensFlareSystem);
  new BABYLON.LensFlare(0.12, 0.45, new BABYLON.Color3(0.8, 0.56, 0.72), "https://playground.babylonjs.com/textures/flare3.png", lensFlareSystem);
  new BABYLON.LensFlare(0.18, -0.15, new BABYLON.Color3(0.71, 0.8, 0.95), "https://playground.babylonjs.com/textures/Flare2.png", lensFlareSystem);
  new BABYLON.LensFlare(0.25, -0.4, new BABYLON.Color3(0.95, 0.89, 0.71), "https://playground.babylonjs.com/textures/flare.png", lensFlareSystem);

  const godrays = new BABYLON.VolumetricLightScatteringPostProcess(
    "godrays", 1.0, camera as BABYLON.FreeCamera, moonMesh, 75,
    BABYLON.Texture.BILINEAR_SAMPLINGMODE, engine, false, scene
  );
  godrays.exposure = 0.2;
  godrays.decay = 0.97;
  godrays.weight = 0.1;
  godrays.density = 0.96;
  godrays.excludedMeshes.push(skybox);

  return { skybox, moonMesh, lensFlareSystem, godrays };
}
