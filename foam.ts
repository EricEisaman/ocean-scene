
import { BOAT_CONFIG } from "./boatConfig";
import { ISLAND_CONFIG } from "./islandConfig";
export type FoamGeometry = { mesh: BABYLON.Mesh; positions: Float32Array; indices: any; };
export function extractFoamGeometry(input?: any): FoamGeometry[] {
  if (!input || !Array.isArray(input)) return [];
  const out: FoamGeometry[] = [];
  for (const m of input) {
    if (!(m instanceof BABYLON.Mesh)) continue;
    if (m.getTotalVertices()===0) continue;
    const pos=m.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const idx=m.getIndices();
    if(!pos||!idx) continue;
    out.push({mesh:m as any, positions:pos as any, indices:idx});
  }
  return out;
}
function toV3(v:any){ return v instanceof BABYLON.Vector3 ? v.clone() : new BABYLON.Vector3(v.x,v.y,v.z); }
function toC4(c:any){ return c instanceof BABYLON.Color4 ? c.clone() : new BABYLON.Color4(c.r,c.g,c.b,c.a); }
function createEmitter(name:string, scene:BABYLON.Scene, cfg:any){
  const p=cfg.particle;
  const tex=new BABYLON.Texture(p.textureUrl, scene);
  const emitter=BABYLON.MeshBuilder.CreateBox(name+"_emitter",{size:0.01},scene); emitter.isVisible=false;
  const ps=new BABYLON.ParticleSystem(name+"_PS", p.capacity, scene);
  ps.particleTexture=tex; ps.emitter=emitter as any;
  ps.minEmitBox=toV3(p.minEmitBox); ps.maxEmitBox=toV3(p.maxEmitBox);
  ps.color1=toC4(p.color1); ps.color2=toC4(p.color2); ps.colorDead=toC4(p.colorDead);
  ps.minSize=p.minSize; ps.maxSize=p.maxSize;
  ps.minLifeTime=p.minLifeTime; ps.maxLifeTime=p.maxLifeTime;
  ps.emitRate=p.emitRate; ps.minEmitPower=p.minEmitPower; ps.maxEmitPower=p.maxEmitPower;
  ps.gravity=toV3(p.gravity); ps.direction1=toV3(p.direction1); ps.direction2=toV3(p.direction2);
  ps.blendMode=p.blendMode==="ADD"?BABYLON.ParticleSystem.BLENDMODE_ADD:BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.start(); return {emitter, ps, loop:[] as BABYLON.Vector3[], cur:0};
}
function buildLoop(geoms:FoamGeometry[], getH:any, t:number, yOff:number, maxTris:number, cull:any){
  const flat:BABYLON.Vector3[]=[]; let tri=0;
  for(const g of geoms){ if(tri>maxTris) break; const mat=g.mesh.getWorldMatrix(); const pos=g.positions; const idx=g.indices;
    for(let i=0;i<idx.length;i+=3){ if(tri++>maxTris) break;
      const ia=idx[i]*3, ib=idx[i+1]*3, ic=idx[i+2]*3;
      const a=BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(pos[ia],pos[ia+1],pos[ia+2]), mat);
      const b=BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(pos[ib],pos[ib+1],pos[ib+2]), mat);
      const c=BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(pos[ic],pos[ic+1],pos[ic+2]), mat);
      if(cull.enabled){ const cx=(a.x+b.x+c.x)/3, cz=(a.z+b.z+c.z)/3; const wh=getH(cx,cz,t); const maxY=Math.max(a.y,b.y,c.y), minY=Math.min(a.y,b.y,c.y); if(cull.above!==undefined && minY>wh+cull.above) continue; if(cull.below!==undefined && maxY<wh-cull.below) continue; }
      const da=a.y-getH(a.x,a.z,t), db=b.y-getH(b.x,b.z,t), dc=c.y-getH(c.x,c.z,t);
      const cr:BABYLON.Vector3[]=[]; const add=(p1:any,p2:any,d1:number,d2:number)=>{ if((d1<0&&d2>0)||(d1>0&&d2<0)){ const pt=BABYLON.Vector3.Lerp(p1,p2,d1/(d1-d2)); pt.y=getH(pt.x,pt.z,t)+yOff; cr.push(pt);} };
      add(a,b,da,db); add(b,c,db,dc); add(c,a,dc,da); if(cr.length===2){ flat.push(cr[0],cr[1]); }
    }
  } return flat;
}

export type FoamSystem = {
  boat: any; island: any;
  rebuildBoat: (t:number)=>void;
  rebuildIsland: (t:number)=>void;
  emit: (isBoatUnderway?:boolean, velocity?:number)=>void;
  emitIsland: ()=>void;
  emitBoat: (isBoatUnderway?:boolean, velocity?:number)=>void;
  dispose: ()=>void;
  setBoatActive: (active:boolean)=>void;
};

export function createFoamSystem(scene:BABYLON.Scene, boatGeoms:FoamGeometry[], islandGeoms:FoamGeometry[], getWaterHeight:any): FoamSystem {
  const boatEnabled = BOAT_CONFIG.foam.enabled;
  const islandEnabled = ISLAND_CONFIG.foam.enabled;

  const boat = boatEnabled ? createEmitter("boatFoam", scene, BOAT_CONFIG.foam) : null as any;
  const island = islandEnabled ? createEmitter("islandFoam", scene, ISLAND_CONFIG.foam) : null as any;

  // track active state for boat foam so we can stop/start emission cleanly
  let boatActiveOverride: boolean | null = null; // null = use config logic

  const isBoatFoamAllowed = (isUnderway?: boolean) => {
    if (!boatEnabled) return false;
    if (boatActiveOverride !== null) return boatActiveOverride;
    const cfg = BOAT_CONFIG.foam as any;
    if (cfg.activeOnlyUnderway) {
      // if caller provides underway state, use it, else check throttle threshold via config
      return !!isUnderway;
    }
    return true;
  };

  const rebuildBoat=(t:number)=>{
    if(!boatEnabled||!boatGeoms.length) return;
    // don't rebuild if not allowed? still rebuild so loop is ready, but cheap to skip
    boatGeoms.forEach(g=>g.mesh.computeWorldMatrix(true));
    const ic=BOAT_CONFIG.foam.intersection;
    boat.loop=buildLoop(boatGeoms,getWaterHeight,t,ic.yOffset,ic.maxTris,{enabled:ic.heightCulling});
  };
  const rebuildIsland=(t:number)=>{
    if(!islandEnabled||!islandGeoms.length) return;
    islandGeoms.forEach(g=>g.mesh.computeWorldMatrix(true));
    const ic=ISLAND_CONFIG.foam.intersection;
    island.loop=buildLoop(islandGeoms,getWaterHeight,t,ic.yOffset,ic.maxTris,{enabled:ic.heightCulling, above:ic.cullAbove, below:ic.cullBelow});
  };

  const baseBoatPower = boat ? {
    min: boat.ps.minEmitPower,
    max: boat.ps.maxEmitPower,
    emitCount: BOAT_CONFIG.foam.emission.emitCount,
    manualEmitCount: BOAT_CONFIG.foam.emission.manualEmitCount
  } : null;
  const emitBoat=(isUnderway?:boolean, velocityOrSpeed?:number)=>{
    if(!boat) return;
    if(!isBoatFoamAllowed(isUnderway)){ return; }
    if(!boat.loop.length) return;
    let speed = typeof velocityOrSpeed === 'number' ? velocityOrSpeed : 0;
    const cfgScale = (BOAT_CONFIG.foam.particle as any).velocityScaling ?? {};
    const powerScale = cfgScale.maxPowerPerMps ?? 0.18;
    const countScale = cfgScale.emitCountPerMps ?? 2.2;
    const minPowerScale = cfgScale.minPowerPerMps ?? 0.10;
    const maxSpeedClamp = cfgScale.maxSpeed ?? 15;
    const clampedSpeed = Math.min(Math.max(speed, 0), maxSpeedClamp);
    if (baseBoatPower) {
      boat.ps.minEmitPower = baseBoatPower.min + clampedSpeed * minPowerScale;
      boat.ps.maxEmitPower = baseBoatPower.max + clampedSpeed * powerScale;
    }
    const em=BOAT_CONFIG.foam.emission;
    const scaledEmitCount = Math.floor(baseBoatPower ? baseBoatPower.emitCount + clampedSpeed * countScale : em.emitCount);
    const scaledManualCount = Math.floor(baseBoatPower ? baseBoatPower.manualEmitCount + clampedSpeed * (cfgScale.manualCountPerMps ?? 0.5) : em.manualEmitCount);
    for(let k=0;k<scaledEmitCount;k++){
      boat.emitter.position.copyFrom(boat.loop[boat.cur%boat.loop.length]);
      boat.cur=(boat.cur+1)%boat.loop.length;
      (boat.ps as any).manualEmitCount=scaledManualCount;
    }
  };

  const emitIsland=()=>{
    if(!island||!island.loop.length) return;
    const em=ISLAND_CONFIG.foam.emission;
    for(let k=0;k<em.emitCount;k++){
      island.emitter.position.copyFrom(island.loop[island.cur%island.loop.length]);
      island.cur=(island.cur+1)%island.loop.length;
      (island.ps as any).manualEmitCount=em.manualEmitCount;
    }
  };

  const emit=(isUnderway?:boolean, velocity?:number)=>{
    emitBoat(isUnderway, velocity);
    emitIsland();
  };

  const setBoatActive=(active:boolean)=>{
    boatActiveOverride = active;
    if(!boat) return;
    if(!active){
      // optional: stop system to prevent idle emitRate (we use manualEmitCount, so just skipping is enough)
      // but if you use emitRate, set to 0
      // boat.ps.emitRate = 0;
    } else {
      // boat.ps.emitRate = BOAT_CONFIG.foam.particle.emitRate;
    }
  };

  const dispose=()=>{ if(boat){boat.ps.dispose(); boat.emitter.dispose();} if(island){island.ps.dispose(); island.emitter.dispose();} };

  return {boat, island, rebuildBoat, rebuildIsland, emit, emitBoat, emitIsland, dispose, setBoatActive};
}
