// index.ts - Clean entry point, swappable ocean variants
import { setupOcean } from "./ocean2";
import { setupSky2 as setupSky } from "./sky2";
import { setupSound2 as setupSound } from "./sound2";
import { SKY_CONFIG } from "./skyConfig";
import { createCameraSystem } from "./camera";
import { setupBoat } from "./boat";
import { setupGulls } from "./gulls";
import { extractFoamGeometry, createFoamSystem } from "./foam";
import { ISLAND_CONFIG } from "./islandConfig";
import { BOAT_CONFIG } from "./boatConfig";
import { TERRAIN_CONFIG, TERRAIN_TYPES } from "./terrainConfig";
import type { TerrainSource } from "./terrainSource";
function resolveGlb(cfg:any){ if(cfg.fullUrl){ const u=cfg.fullUrl as string; const s=u.lastIndexOf("/"); return {rootUrl:u.substring(0,s+1), fileName:u.substring(s+1)}; } return {rootUrl:cfg.rootUrl, fileName:cfg.fileName}; }
function applyScale(node:BABYLON.TransformNode, s:any){ if(typeof s==="number") node.scaling.setAll(s); else node.scaling.set(s.x,s.y,s.z); }
class Playground {
  public static async CreateScene(engine:BABYLON.Engine, canvas:HTMLCanvasElement):Promise<BABYLON.Scene>{
    BABYLON.WebGPUTintWASM.DisableUniformityAnalysis=true;
    const scene=new BABYLON.Scene(engine);
    const skyCfg=SKY_CONFIG.tropicalSunny;
    scene.clearColor=skyCfg.fog?.clearColor?new BABYLON.Color4(skyCfg.fog.clearColor.r,skyCfg.fog.clearColor.g,skyCfg.fog.clearColor.b,skyCfg.fog.clearColor.a):new BABYLON.Color4(0.39,0.54,0.67,1.0);
    const light=new BABYLON.HemisphericLight("light", new BABYLON.Vector3(skyCfg.light.direction.x,skyCfg.light.direction.y,skyCfg.light.direction.z), scene); light.intensity=skyCfg.light.intensity;
    const cameraSystem=createCameraSystem(scene, canvas); const camera=cameraSystem.camera;
    const soundSystem=setupSound(scene, canvas);
    const {skybox, moonMesh, lensFlareSystem, godrays}=setupSky(scene, camera, engine);
    const terrainSource: TerrainSource | undefined = (TERRAIN_CONFIG as any).customHeightmap ?? undefined;
    const terrainType = (TERRAIN_CONFIG as any).type ?? TERRAIN_TYPES.default;
    const oceanSystem = await setupOcean(scene, { terrainSource, technique: terrainType });
    const { ground, ocean, oceanMaterial, floorMaterial, getWaterHeightAtAccurate, sampleAtWorldXZ, getGroundHeightAt, updateTerrain } = oceanSystem;
    const getWaterHeightAtFast = (oceanSystem as any).getWaterHeightAtFast ?? getWaterHeightAtAccurate;
    (window as any).updateTerrain = updateTerrain;
    (window as any).setCustomHeightmap = (urlOrSource: string | TerrainSource) => {
      const src: TerrainSource = typeof urlOrSource === 'string' ? { type: 'imageUrl', url: urlOrSource, scale: 50, offset: -5 } : urlOrSource;
      return updateTerrain(src);
    };
    (window as any).TERRAIN_TYPES = TERRAIN_TYPES; (window as any).oceanSystem = oceanSystem;
    const islandGlb=resolveGlb(ISLAND_CONFIG.glb as any);
    const islandResult=await BABYLON.SceneLoader.ImportMeshAsync("", islandGlb.rootUrl, islandGlb.fileName, scene);
    const islandRoot=new BABYLON.TransformNode("islandRoot", scene);
    applyScale(islandRoot, ISLAND_CONFIG.transform.scaling as any);
    islandRoot.rotation=new BABYLON.Vector3(ISLAND_CONFIG.transform.rotation.x,ISLAND_CONFIG.transform.rotation.y,ISLAND_CONFIG.transform.rotation.z);
    islandRoot.position=new BABYLON.Vector3(ISLAND_CONFIG.transform.position.x,ISLAND_CONFIG.transform.position.y,ISLAND_CONFIG.transform.position.z);
    islandResult.meshes.forEach(m=>{ if(!m.parent) m.parent=islandRoot; });
    if(ISLAND_CONFIG.extras.isBlocker) islandResult.meshes.forEach(m=>{ if(m!==moonMesh) (m as any).isBlocker=true; });
    const boatSystem=await setupBoat(scene, sampleAtWorldXZ, getWaterHeightAtAccurate);
    cameraSystem.setFollowTarget(boatSystem.physicsRoot);
    const rawBoatMeshes=(boatSystem as any).meshes?? (boatSystem as any)._result?.meshes?? [];
    const rawIslandMeshes=(islandResult as any).meshes?? islandRoot.getChildMeshes(false)?? [];
    const boatGeoms=extractFoamGeometry(rawBoatMeshes);
    let islandGeoms=extractFoamGeometry(rawIslandMeshes);
    if(islandGeoms.length===0) islandGeoms=extractFoamGeometry(islandRoot.getChildMeshes(false) as any);
    const foamSystem=createFoamSystem(scene, boatGeoms, islandGeoms, getWaterHeightAtFast);
    let wasAbove=true; const onWaterCrossObservable=new BABYLON.Observable<any>(); (scene as any).onWaterCrossObservable=onWaterCrossObservable;
    const gullSystem=await setupGulls(scene, 500);
    scene.registerBeforeRender(()=>{
      const t=performance.now()*0.001; const dt=engine.getDeltaTime()*0.001;
      if(!oceanMaterial.isReady()) return;
      boatSystem.update(t,dt);
      oceanMaterial.setFloat("time",t); oceanMaterial.setVector3("cameraPosition",camera.position); floorMaterial.setVector3("cameraPosition",camera.globalPosition);
      gullSystem.update({time:t,delta:dt,getWaterHeight:getWaterHeightAtFast,getGroundHeight:getGroundHeightAt});
      const {isAbove}=cameraSystem.update({time:t,deltaSeconds:dt,ground,getWaterHeight:getWaterHeightAtFast,getGroundHeight:getGroundHeightAt});
      soundSystem.update(isAbove); godrays.excludedMeshes=isAbove?[skybox]:[skybox,ocean]; (lensFlareSystem as any).isEnabled=isAbove;
      oceanMaterial.setFloat("isUnderwater", isAbove?0:1); oceanMaterial.setFloat("waterHeightAtCamera", getWaterHeightAtFast(camera.position.x,camera.position.z,t));
      if(isAbove!==wasAbove){ const evt={from:wasAbove?"above":"below",to:isAbove?"above":"below",isAbove,waterHeight:0,time:t}; soundSystem.handleWaterCross(evt); onWaterCrossObservable.notifyObservers(evt); wasAbove=isAbove; }
      const frame=scene.getFrameId();
      if((frame % BOAT_CONFIG.foam.intersection.rebuildEvery)===0) foamSystem.rebuildBoat(t);
      if((frame % ISLAND_CONFIG.foam.intersection.rebuildEvery)===0) foamSystem.rebuildIsland(t);
      const isUnderway = (boatSystem as any).isUnderway ?? false; const boatSpeed = (boatSystem as any).speed ?? 0;
      foamSystem.emit(isUnderway, boatSpeed);
    });
    return scene;
  }
}
export { Playground };
