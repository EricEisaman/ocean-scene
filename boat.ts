
import { BOAT_CONFIG } from "./boatConfig";

const WATER_DENSITY = 1025;
const GRAVITY = 9.81;
type HullSample = { localPos: BABYLON.Vector3; area: number };

export type BoatSystem = {
  root: BABYLON.TransformNode;
  physicsRoot: BABYLON.TransformNode;
  update: (t:number,d:number)=>void;
  dispose:()=>void;
  meshes: BABYLON.AbstractMesh[];
  result: BABYLON.ISceneLoaderAsyncResult;
  isUnderway: boolean;
  throttle: number;
  throttleTarget: number;
};

function resolveGlb(cfg:any){ if(cfg.fullUrl){ const u=cfg.fullUrl as string; const s=u.lastIndexOf("/"); return {rootUrl:u.substring(0,s+1), fileName:u.substring(s+1)}; } return {rootUrl:cfg.rootUrl, fileName:cfg.fileName}; }
function applyScale(node: BABYLON.TransformNode, s:any){ if(typeof s==="number") node.scaling.setAll(s); else node.scaling.set(s.x,s.y,s.z); }

export async function setupBoat(scene: BABYLON.Scene, samplePhysics:any, getHeight:any): Promise<BoatSystem>{
  const {rootUrl,fileName}=resolveGlb(BOAT_CONFIG.glb);
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, fileName, scene);
  const TUNING = BOAT_CONFIG.physics;
  const keelFactor = TUNING.keelBallastFactor;
  const comOffset = new BABYLON.Vector3(0, -TUNING.keelDepth * (keelFactor/(1+keelFactor))*0.8, 0);
  const visualOffset = comOffset.scale(-1);
  const physicsRoot = new BABYLON.TransformNode("boatPhysicsRoot", scene); physicsRoot.rotationQuaternion=BABYLON.Quaternion.Identity();
  const visualOffsetNode = new BABYLON.TransformNode("boatVisualOffset", scene); visualOffsetNode.parent=physicsRoot; visualOffsetNode.position.copyFrom(visualOffset);
  const modelRoot = new BABYLON.TransformNode("boatModelRoot", scene); modelRoot.parent=visualOffsetNode; (modelRoot as any).rotationQuaternion=null;
  const tr=BOAT_CONFIG.transform;
  modelRoot.rotation=new BABYLON.Vector3(tr.rotation.x,tr.rotation.y,tr.rotation.z);
  applyScale(modelRoot, tr.scaling as any);
  modelRoot.position=new BABYLON.Vector3(tr.position.x,tr.position.y,tr.position.z);
  result.meshes.filter(m=>!m.parent).forEach(m=>{ m.parent=modelRoot; (m as any).isBlocker=false; });
  result.meshes.forEach(m=> (m as any).isBlocker=false);
  let prop=null as any, rudder=null as any;
  result.meshes.forEach(m=>{ const n=m.name.toLowerCase(); if(n.includes("prop")) prop=m; if(n.includes("rudder")) rudder=m; });
  const audioEmitter = BABYLON.MeshBuilder.CreateBox("boatAudioEmitter",{size:0.1},scene); audioEmitter.isVisible=false; audioEmitter.parent=physicsRoot;
  const idleCfg=BOAT_CONFIG.sounds.idle; const underwayCfg=BOAT_CONFIG.sounds.underway;
  const boatIdle=new BABYLON.Sound("boat-idle", idleCfg.url, scene, ()=>{ if(!boatIdle.isPlaying) boatIdle.play(); }, {loop:idleCfg.loop, autoplay:idleCfg.autoplay, spatialSound:true, distanceModel:"linear" as any, maxDistance:idleCfg.maxDistance, rolloffFactor:idleCfg.rolloffFactor, volume:idleCfg.volume});
  boatIdle.attachToMesh(audioEmitter);
  const boatUnderway=new BABYLON.Sound("boat-underway", underwayCfg.url, scene, null, {loop:underwayCfg.loop, autoplay:underwayCfg.autoplay, spatialSound:true, distanceModel:"linear" as any, maxDistance:underwayCfg.maxDistance, rolloffFactor:underwayCfg.rolloffFactor, volume:underwayCfg.volume});
  boatUnderway.attachToMesh(audioEmitter);
  const totalMass=TUNING.baseMass*TUNING.effectiveMassFactor*(1+keelFactor*0.3); const totalDispArea=totalMass/(WATER_DENSITY*0.6);
  const length=TUNING.hull.length, width=TUNING.hull.width, rows=TUNING.hull.rows, cols=TUNING.hull.cols; const samples:HullSample[]=[]; const areaPer=totalDispArea/(rows*cols);
  for(let iz=0;iz<rows;iz++){ const z=(iz/(rows-1)-0.5)*length*0.85; const taper=1-Math.abs(z)/(length*0.5)*0.25; for(let ix=0;ix<cols;ix++){ const x=(ix/(cols-1)-0.5)*width*taper; const y=-0.35+Math.abs(x)*0.12; samples.push({localPos:new BABYLON.Vector3(x,y,z), area:areaPer}); } }
  let init=BOAT_CONFIG.transform.initialPosition; let position=new BABYLON.Vector3(init.x,init.y,init.z); if(BOAT_CONFIG.transform.autoSnapY) position.y=getHeight(position.x,position.z,0)+BOAT_CONFIG.transform.snapYOffset;
  let velocity=BABYLON.Vector3.Zero(); let orientation=BABYLON.Quaternion.Identity(); let angularVelocity=BABYLON.Vector3.Zero();
  const baseInertia=new BABYLON.Vector3(600,1000,1800); const inertia=baseInertia.scale(1+keelFactor*0.6);
  let throttle=0,throttleTarget=0,rudderAngle=0,rudderTarget=0; const maxRudder=TUNING.maxRudderDeg*Math.PI/180;
  let _isUnderway=false;
  const keys:any={t:false,g:false,f:false,h:false};
  const onKeyDown=(e:KeyboardEvent)=>{ if(e.code==="KeyT") keys.t=true; if(e.code==="KeyG") keys.g=true; if(e.code==="KeyF") keys.f=true; if(e.code==="KeyH") keys.h=true; };
  const onKeyUp=(e:KeyboardEvent)=>{ if(e.code==="KeyT") keys.t=false; if(e.code==="KeyG") keys.g=false; if(e.code==="KeyF") keys.f=false; if(e.code==="KeyH") keys.h=false; };
  window.addEventListener("keydown",onKeyDown); window.addEventListener("keyup",onKeyUp);
  const propLocal=new BABYLON.Vector3(0,-0.35,-2.9); const rudderLocal=new BABYLON.Vector3(0,-0.55,-3.1); let accum=0; const fixedDt=1/60;
  const update=(time:number,delta:number)=>{
    if(keys.t) throttleTarget=Math.min(1,throttleTarget+delta*0.9); else if(keys.g) throttleTarget=Math.max(-0.6,throttleTarget-delta*0.9); else throttleTarget=BABYLON.Scalar.Lerp(throttleTarget,0,delta*1.2); throttle=BABYLON.Scalar.Lerp(throttle,throttleTarget,delta*3);
    if(keys.h) rudderTarget=Math.min(maxRudder,rudderTarget+delta*1.4); else if(keys.f) rudderTarget=Math.max(-maxRudder,rudderTarget-delta*1.4); else rudderTarget=BABYLON.Scalar.Lerp(rudderTarget,0,delta*2.5); rudderAngle=BABYLON.Scalar.Lerp(rudderAngle,rudderTarget,delta*4);
    const isThrottling=keys.t||keys.g||Math.abs(throttle)>underwayCfg.throttleThreshold||Math.abs(throttleTarget)>underwayCfg.throttleThreshold;
    _isUnderway=isThrottling;
    if(isThrottling){ if(!boatUnderway.isPlaying) boatUnderway.play(); const vol=BABYLON.Scalar.Clamp(Math.abs(throttle)*underwayCfg.throttleVolScale+underwayCfg.throttleMinVol,0,1); boatUnderway.setVolume(vol); } else { if(boatUnderway.isPlaying) boatUnderway.pause(); }
    if(!boatIdle.isPlaying && boatIdle.isReady()) boatIdle.play();
    accum+=delta; while(accum>=fixedDt){ let totalForce=BABYLON.Vector3.Zero(); let totalTorque=BABYLON.Vector3.Zero(); const physicsWorld=BABYLON.Matrix.Compose(BABYLON.Vector3.One(),orientation,position); for(const s of samples){ const rFromCOM=s.localPos.subtract(comOffset); const worldPoint=BABYLON.Vector3.TransformCoordinates(rFromCOM,physicsWorld); const water=samplePhysics(worldPoint.x,worldPoint.z,time); const depth=BABYLON.Vector3.Dot(water.position.subtract(worldPoint),water.normal); if(depth<=0) continue; const clamped=Math.min(depth,1.0); const buoy=new BABYLON.Vector3(0,WATER_DENSITY*GRAVITY*s.area*clamped,0); totalForce.addInPlace(buoy); const r=worldPoint.subtract(position); const velAtPoint=velocity.add(BABYLON.Vector3.Cross(angularVelocity,r)); const rel=velAtPoint.subtract(water.velocity); const vn=BABYLON.Vector3.Dot(rel,water.normal); const nDamp=water.normal.scale(-Math.max(vn,0)*TUNING.damping.normal*s.area); const tang=rel.subtract(water.normal.scale(vn)); const tDamp=tang.scale(-TUNING.damping.tangential*s.area); const damp=nDamp.add(tDamp); totalForce.addInPlace(damp); totalTorque.addInPlace(BABYLON.Vector3.Cross(r,buoy.add(damp))); } totalForce.addInPlace(new BABYLON.Vector3(0,-totalMass*GRAVITY,0)); const boatUp=new BABYLON.Vector3(0,1,0); boatUp.rotateByQuaternionToRef(orientation,boatUp); const dot=BABYLON.Vector3.Dot(boatUp,BABYLON.Vector3.Up()); const cross=BABYLON.Vector3.Cross(boatUp,BABYLON.Vector3.Up()); const angle=Math.acos(BABYLON.Scalar.Clamp(dot,-1,1)); let righting=TUNING.rollStiffness*totalMass*GRAVITY*(0.5+keelFactor); if(dot<0) righting*=2.5; totalTorque.addInPlace(cross.scale(angle*righting)); const fwd=new BABYLON.Vector3(0,0,1); const worldFwd=BABYLON.Vector3.Zero(); fwd.rotateByQuaternionToRef(orientation,worldFwd); const thrust=worldFwd.scale(throttle*TUNING.maxThrust); const propW=BABYLON.Vector3.TransformCoordinates(propLocal.subtract(comOffset),physicsWorld); totalForce.addInPlace(thrust); totalTorque.addInPlace(BABYLON.Vector3.Cross(propW.subtract(position),thrust)); const speed=velocity.length(); const rudderEff=60*Math.max(speed,0.3)*(0.3+Math.abs(throttle)); const lat=new BABYLON.Vector3(1,0,0); const worldLat=BABYLON.Vector3.Zero(); lat.rotateByQuaternionToRef(orientation,worldLat); const rudderForce=worldLat.scale(-rudderAngle*rudderEff); const rudderW=BABYLON.Vector3.TransformCoordinates(rudderLocal.subtract(comOffset),physicsWorld); totalForce.addInPlace(rudderForce); totalTorque.addInPlace(BABYLON.Vector3.Cross(rudderW.subtract(position),rudderForce)); totalForce.addInPlace(velocity.scale(-TUNING.damping.linear*TUNING.effectiveMassFactor)); totalTorque.addInPlace(angularVelocity.scale(-TUNING.damping.angular*TUNING.effectiveMassFactor)); const accel=totalForce.scale(1/totalMass); velocity.addInPlace(accel.scale(fixedDt)); position.addInPlace(velocity.scale(fixedDt)); const angAccel=new BABYLON.Vector3(totalTorque.x/inertia.x,totalTorque.y/inertia.y,totalTorque.z/inertia.z); angularVelocity.addInPlace(angAccel.scale(fixedDt)); const halfDt=fixedDt*0.5; const q=orientation; const aq=new BABYLON.Quaternion(angularVelocity.x*halfDt,angularVelocity.y*halfDt,angularVelocity.z*halfDt,0); const dq=aq.multiply(q); orientation=new BABYLON.Quaternion(q.x+dq.x,q.y+dq.y,q.z+dq.z,q.w+dq.w).normalize(); accum-=fixedDt; } physicsRoot.position.copyFrom(position); if(physicsRoot.rotationQuaternion) physicsRoot.rotationQuaternion.copyFrom(orientation); if(prop) prop.rotate(BABYLON.Axis.Z,throttle*delta*35,BABYLON.Space.LOCAL); if(rudder) rudder.rotation.y=rudderAngle; };
  const dispose=()=>{ window.removeEventListener("keydown",onKeyDown); window.removeEventListener("keyup",onKeyUp); try{boatIdle.stop(); boatUnderway.stop();}catch{} physicsRoot.dispose(); };
  // Return object that satisfies BoatSystem - getters proxy to closure vars
  return {
    root: modelRoot,
    physicsRoot,
    update,
    dispose,
    meshes: result.meshes,
    result,
    get isUnderway(){ return _isUnderway; },
    set isUnderway(v:boolean){ _isUnderway=v; },
    get throttle(){ return throttle; },
    set throttle(v:number){ throttle=v; },
    get throttleTarget(){ return throttleTarget; },
    set throttleTarget(v:number){ throttleTarget=v; },
    get velocity(){ return velocity.clone(); },
    get speed(){ return velocity.length(); },
  } as BoatSystem;
}
