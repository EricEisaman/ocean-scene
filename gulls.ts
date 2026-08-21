// gulls.ts

export type GullSystem = {
  root: BABYLON.TransformNode;
  update: (opts: {
    time: number,
    delta: number,
    getWaterHeight: (x: number, z: number, t: number) => number,
    getGroundHeight: (x: number, z: number) => number
  }) => void;
  dispose: () => void;
};

export type Predator = {
  position: BABYLON.Vector3;
  active: boolean;
  radius?: number;
};

type Boid = {
  transform: BABYLON.TransformNode;
  velocity: BABYLON.Vector3;
  acceleration: BABYLON.Vector3;
  instances: BABYLON.InstancedMesh[];
  phase: number;
  flapSpeed: number;
  lastYaw: number;
};

const CONFIG = {
  TEMPLATE_SCALE: 0.07,
  maxSpeed: 18.0,
  minSpeed: 9.0,
  maxForce: 14.0,
  separationDist: 5.5,
  alignmentDist: 14.0,
  cohesionDist: 20.0,
  separationWeight: 1.9,
  alignmentWeight: 1.15,
  cohesionWeight: 0.95,
  centerWeight: 0.18,

  // ZERO COST BOUNDS - edit here
  altitude: { min: 30, max: 75, preferred: 38 },
  bounds: {
    minX: -400,
    maxX: 400,
    minZ: -300,
    maxZ: 300,
    turnDistance: 70, // start turning this far from edge
    weight: 4.5, // how hard to turn away
  },

  bankingFactor: 1.35,
  turnLerp: 6.0,
  fleeRadius: 55,
  fleeWeight: 4.5,
};

function limitLength(v: BABYLON.Vector3, max: number) {
  const l2 = v.lengthSquared();
  if (l2 > max * max) v.normalize().scaleInPlace(max);
}
function clampLength(v: BABYLON.Vector3, min: number, max: number) {
  const len = v.length();
  if (len === 0) return;
  if (len > max) v.scaleInPlace(max / len);
  else if (len < min) v.scaleInPlace(min / len);
}

export async function setupGulls(
  scene: BABYLON.Scene,
  numGulls: number,
  predatorRef?: { current: Predator | null }
): Promise<GullSystem> {

  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    "", "https://raw.githubusercontent.com/EricEisaman/assets/main/items/animals/", "seagull.glb", scene
  );
  result.meshes.forEach(m => {
    (m as any).isBlocker = false;
    m.isPickable = false;
  });

  const templateRoot = result.meshes[0] as BABYLON.Mesh;
  const sourceMeshes = result.meshes.filter(m =>
    (m as BABYLON.Mesh).getTotalVertices && (m as BABYLON.Mesh).getTotalVertices() > 0
  ) as BABYLON.Mesh[];
  const renderSources = sourceMeshes.length > 0? sourceMeshes : [templateRoot];

  templateRoot.setEnabled(false);
  templateRoot.scaling.setAll(1);

  if (result.animationGroups) {
    result.animationGroups.forEach(ag => {
      ag.play(true);
      ag.speedRatio = 0.9 + Math.random() * 0.5;
    });
  }

  const flockRoot = new BABYLON.TransformNode("flockRoot", scene);
  const boids: Boid[] = [];

  for (let i = 0; i < numGulls; i++) {
    const t = new BABYLON.TransformNode(`gull_${i}`, scene);
    t.parent = flockRoot;
    t.scaling.setAll(CONFIG.TEMPLATE_SCALE);

    // spawn INSIDE bounds
    t.position = new BABYLON.Vector3(
      BABYLON.Scalar.RandomRange(CONFIG.bounds.minX * 0.6, CONFIG.bounds.maxX * 0.6),
      BABYLON.Scalar.Lerp(CONFIG.altitude.min, CONFIG.altitude.max, Math.random() * 0.6 + 0.2),
      BABYLON.Scalar.RandomRange(CONFIG.bounds.minZ * 0.6, CONFIG.bounds.maxZ * 0.6)
    );

    const yaw = Math.random() * Math.PI * 2;
    const vel = new BABYLON.Vector3(Math.cos(yaw), (Math.random() - 0.5) * 0.2, Math.sin(yaw))
    .normalize()
    .scaleInPlace(BABYLON.Scalar.Lerp(CONFIG.minSpeed, CONFIG.maxSpeed, Math.random()));

    const instances: BABYLON.InstancedMesh[] = [];
    for (const src of renderSources) {
      const inst = src.createInstance(`gull_${i}_${src.name}`);
      inst.parent = t;
      inst.isPickable = false;
      inst.position.setAll(0);
      inst.rotation.set(-Math.PI/2, Math.PI, 0);
      instances.push(inst);
    }

    boids.push({
      transform: t,
      velocity: vel,
      acceleration: BABYLON.Vector3.Zero(),
      instances,
      phase: Math.random() * Math.PI * 2,
      flapSpeed: 7.5 + Math.random() * 3.5,
      lastYaw: yaw,
    });
  }

  let accum = 0;
  const fixedDt = 1 / 60;
  const tmpSep = new BABYLON.Vector3();
  const tmpAlign = new BABYLON.Vector3();
  const tmpCoh = new BABYLON.Vector3();
  const tmpCenter = new BABYLON.Vector3();
  const flockCenter = new BABYLON.Vector3();

  const update = (opts: {
    time: number,
    delta: number,
    getWaterHeight: (x: number, z: number, t: number) => number,
    getGroundHeight: (x: number, z: number) => number
  }) => {
    const { time, delta } = opts; // getWaterHeight/getGroundHeight ignored for zero-cost
    accum += delta;

    while (accum >= fixedDt) {
      flockCenter.setAll(0);
      for (const b of boids) flockCenter.addInPlace(b.transform.position);
      flockCenter.scaleInPlace(1 / Math.max(1, boids.length));

      for (let i = 0; i < boids.length; i++) {
        const bi = boids[i];
        tmpSep.setAll(0); tmpAlign.setAll(0); tmpCoh.setAll(0);
        let sepCount = 0, alignCount = 0, cohCount = 0;

        for (let j = 0; j < boids.length; j++) {
          if (i === j) continue;
          const bj = boids[j];
          const diff = bi.transform.position.subtractToRef(bj.transform.position, new BABYLON.Vector3());
          const d = diff.length();
          if (d > 0 && d < CONFIG.separationDist) {
            diff.normalize().scaleInPlace(1 / Math.max(0.1, d));
            tmpSep.addInPlace(diff);
            sepCount++;
          }
          if (d > 0 && d < CONFIG.alignmentDist) {
            tmpAlign.addInPlace(bj.velocity);
            alignCount++;
          }
          if (d > 0 && d < CONFIG.cohesionDist) {
            tmpCoh.addInPlace(bj.transform.position);
            cohCount++;
          }
        }

        if (sepCount > 0) {
          tmpSep.scaleInPlace(1 / sepCount);
          tmpSep.normalize().scaleInPlace(CONFIG.maxSpeed);
          tmpSep.subtractInPlace(bi.velocity);
          limitLength(tmpSep, CONFIG.maxForce);
        }
        if (alignCount > 0) {
          tmpAlign.scaleInPlace(1 / alignCount);
          tmpAlign.normalize().scaleInPlace(CONFIG.maxSpeed);
          tmpAlign.subtractInPlace(bi.velocity);
          limitLength(tmpAlign, CONFIG.maxForce);
        }
        if (cohCount > 0) {
          tmpCoh.scaleInPlace(1 / cohCount);
          tmpCoh.subtractInPlace(bi.transform.position);
          tmpCoh.normalize().scaleInPlace(CONFIG.maxSpeed);
          tmpCoh.subtractInPlace(bi.velocity);
          limitLength(tmpCoh, CONFIG.maxForce);
        }

        bi.acceleration.setAll(0);
        bi.acceleration.addInPlace(tmpSep.scale(CONFIG.separationWeight));
        bi.acceleration.addInPlace(tmpAlign.scale(CONFIG.alignmentWeight));
        bi.acceleration.addInPlace(tmpCoh.scale(CONFIG.cohesionWeight));

        tmpCenter.copyFrom(flockCenter).subtractInPlace(bi.transform.position);
        if (tmpCenter.length() > 10) {
          tmpCenter.normalize().scaleInPlace(CONFIG.centerWeight * 0.8);
          bi.acceleration.addInPlace(tmpCenter);
        }

        // --- ZERO COST BOUNDS ---
        const p = bi.transform.position;
        const td = CONFIG.bounds.turnDistance;
        const bw = CONFIG.bounds.weight;

        // X
        if (p.x < CONFIG.bounds.minX + td) {
          const d = (CONFIG.bounds.minX + td) - p.x;
          bi.acceleration.x += d * bw * 0.12;
        } else if (p.x > CONFIG.bounds.maxX - td) {
          const d = p.x - (CONFIG.bounds.maxX - td);
          bi.acceleration.x -= d * bw * 0.12;
        }
        // Z
        if (p.z < CONFIG.bounds.minZ + td) {
          const d = (CONFIG.bounds.minZ + td) - p.z;
          bi.acceleration.z += d * bw * 0.12;
        } else if (p.z > CONFIG.bounds.maxZ - td) {
          const d = p.z - (CONFIG.bounds.maxZ - td);
          bi.acceleration.z -= d * bw * 0.12;
        }
        // Y - you already had this
        if (p.y < CONFIG.altitude.min) {
          bi.acceleration.y += (CONFIG.altitude.min - p.y) * 0.35;
        } else if (p.y > CONFIG.altitude.max) {
          bi.acceleration.y -= (p.y - CONFIG.altitude.max) * 0.35;
        } else {
          bi.acceleration.y += (CONFIG.altitude.preferred - p.y) * 0.05;
        }

        // predator (future)
        const predator = predatorRef?.current;
        if (predator?.active) {
          const toPred = p.subtract(predator.position);
          const dPred = toPred.length();
          if (dPred < CONFIG.fleeRadius) {
            const fleeStrength = (1 - dPred / CONFIG.fleeRadius) * CONFIG.fleeWeight;
            toPred.normalize().scaleInPlace(fleeStrength * CONFIG.maxForce);
            bi.acceleration.addInPlace(toPred);
          }
        }

        limitLength(bi.acceleration, CONFIG.maxForce);
      }

      for (const b of boids) {
        b.velocity.addInPlace(b.acceleration.scale(fixedDt));
        clampLength(b.velocity, CONFIG.minSpeed, CONFIG.maxSpeed);
        b.transform.position.addInPlace(b.velocity.scale(fixedDt));

        // hard clamp - prevents escape if maxForce is low
        b.transform.position.x = BABYLON.Scalar.Clamp(b.transform.position.x, CONFIG.bounds.minX, CONFIG.bounds.maxX);
        b.transform.position.z = BABYLON.Scalar.Clamp(b.transform.position.z, CONFIG.bounds.minZ, CONFIG.bounds.maxZ);
        b.transform.position.y = BABYLON.Scalar.Clamp(b.transform.position.y, CONFIG.altitude.min, CONFIG.altitude.max);

        // bounce velocity if we clamped
        if (b.transform.position.x <= CONFIG.bounds.minX || b.transform.position.x >= CONFIG.bounds.maxX) {
          b.velocity.x *= -0.6;
        }
        if (b.transform.position.z <= CONFIG.bounds.minZ || b.transform.position.z >= CONFIG.bounds.maxZ) {
          b.velocity.z *= -0.6;
        }
      }

      accum -= fixedDt;
    }

    const lerpFactor = Math.min(1, delta * CONFIG.turnLerp);
    for (const b of boids) {
      const vel = b.velocity;
      if (vel.lengthSquared() < 0.001) continue;
      const yaw = Math.atan2(vel.x, vel.z);
      const horizSpeed = Math.hypot(vel.x, vel.z);
      const pitch = -Math.atan2(vel.y, horizSpeed) * 0.7;

      let yawDelta = yaw - b.lastYaw;
      if (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      if (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
      b.lastYaw = yaw;

      const roll = -yawDelta * 18 * CONFIG.bankingFactor - vel.x * 0.01;
      const flap = Math.sin(time * b.flapSpeed + b.phase) * 0.12;
      const targetRot = new BABYLON.Vector3(pitch + flap, yaw, roll);

      if (!b.transform.rotationQuaternion) b.transform.rotationQuaternion = BABYLON.Quaternion.Identity();
      const targetQ = BABYLON.Quaternion.FromEulerAngles(targetRot.x, targetRot.y, targetRot.z);
      BABYLON.Quaternion.SlerpToRef(b.transform.rotationQuaternion!, targetQ, lerpFactor, b.transform.rotationQuaternion!);
    }
  };

  const dispose = () => {
    for (const b of boids) {
      b.instances.forEach(inst => inst.dispose());
      b.transform.dispose();
    }
    boids.length = 0;
    templateRoot.dispose();
    flockRoot.dispose();
  };

  return { root: flockRoot, update, dispose };
}
