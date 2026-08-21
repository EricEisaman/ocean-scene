// ocean.ts - Storm ocean variant, decoupled + OPTIMIZED for 60fps with foam
// FIX: fps drop from 60 to 4 when switching from ocean2 to ocean was caused by foamSystem calling getWaterHeightAtAccurate 60k+ times per rebuild
//      Accurate version does 8 Newton iterations * 3 surface evals * 10 spectral harmonics = ~240 wave evals per call
//      Fast version does 1 surface eval = 10 wave evals -> 24x faster, visually identical for foam/culling
import { OCEAN_CONFIG, type OceanSample } from "./oceanConfig";
export { OCEAN_CONFIG }; export type { OceanSample } from "./oceanConfig";
import { OCEAN_VERT } from "./shaders/wgsl/oceanVert";
import { OCEAN_FRAG } from "./shaders/wgsl/oceanFrag";
import { setupTerrain, type TerrainSetupOptions, type TerrainSystem } from "./terrain";

const GRAVITY = 9.81; const WIND_SPEED = 100.0; const SEA_HEIGHT = 40.0; const CHOPPY_VISUAL = 100.0; const CHOPPY_PHYSICS = 70.0;
type V2 = { x: number, y: number }; type V3 = { x: number, y: number, z: number };
const fractJ = (x: number) => x - Math.floor(x); const mixJ = (a: number, b: number, t: number) => a * (1 - t) + b * t;
const smoothJ = (e0: number, e1: number, x: number) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const dot2 = (a: V2, b: V2) => a.x * b.x + a.y * b.y; const len2 = (v: V2) => Math.hypot(v.x, v.y);
const norm2 = (v: V2): V2 => { const l = len2(v) || 1; return { x: v.x / l, y: v.y / l }; };
const rot2 = (v: V2, ang: number): V2 => { const c = Math.cos(ang), s = Math.sin(ang); return { x: c * v.x - s * v.y, y: s * v.x + c * v.y }; };
const hash21J = (p: V2) => fractJ(Math.sin(p.x * 127.1 + p.y * 311.7) * 43758.5453123);
const hash22J = (p: V2): V2 => ({ x: hash21J({ x: p.x + 17, y: p.y + 3 }), y: hash21J({ x: p.x + 41, y: p.y + 29 }) });
const gNoiseJ = (s: V2) => { const h = hash22J(s); return Math.sqrt(-2 * Math.log(Math.max(h.x, 0.0001))) * Math.cos(6.2831853 * h.y); };
const phillJ = (wl: number, amp: number) => { const k = 6.2831853 / Math.max(wl, 0.001); const k2 = k * k; const L = (WIND_SPEED * WIND_SPEED) / GRAVITY; return amp * 0.0024 * Math.exp(-1 / Math.max(k2 * L * L, 0.0001)) * Math.exp(-k2 * 0.22); };
const dispJ = (wl: number, d: number) => { const k = 6.2831853 / Math.max(wl, 0.001); const deep = GRAVITY * k; const shal = GRAVITY * k * Math.tanh(k * Math.max(d, 0.01)); return Math.sqrt(mixJ(shal, deep, smoothJ(8, 35, d))); };
const sharpWJ = (ph: number, sh: number) => { const sp = Math.sin(ph), cp = Math.cos(ph); const n = (sp + 1) * 0.5; const e = Math.max(1, Math.min(5.5, sh)); return { x: Math.pow(n, e) * 2 - 1, y: e * Math.pow(Math.max(n, 0.0001), e - 1) * 0.5 * cp }; };
function specJ(p: V2, t: number, dir: V2, wl: number, amp: number, off: number, seed: V2, ch: number, dep: number, hs: number, ss: number, choppy: number): V3 {
  const d = norm2(dir); const k = 6.2831853 / Math.max(wl, 0.001); const eff = amp * hs; const en = phillJ(wl, eff);
  const gau = 0.78 + gNoiseJ(seed) * 0.14; const ang = 0.92 + 0.08 * Math.sin(dot2(p, rot2(d, 1.7)) * 0.21 + t * 0.43 + seed.x);
  const om = dispJ(wl, dep); const ph = dot2(p, d) * k - om * t * 0.78 * ss + off; const sharp = 1.2 + ch * 0.55 + eff * 0.18;
  const w = sharpWJ(ph, sharp); const boost = 1 + eff * 0.28 + wl * 0.02; const h = w.x * en * gau * ang;
  return { x: d.x * w.y * en * ch * choppy * gau * boost, y: h * SEA_HEIGHT, z: d.y * w.y * en * ch * choppy * gau * boost };
}
function stormSurface(p: V2, t: number, choppy: number): V3 {
  let rx = 0, ry = 0, rz = 0; const add = (h: V3) => { rx += h.x; ry += h.y; rz += h.z; };
  const d0: V2 = { x: 0.9407, y: 0.3393 }; const d1 = rot2(d0, 1.04719755); const d2 = rot2(d0, 1.74532925);
  add(specJ(p, t, d0, 52, 5.8, 0.3, { x: 1, y: 4 }, 0.58, 45, 1, 1, choppy));
  add(specJ(p, t, d0, 34, 4.0, 1.9, { x: 3, y: 7 }, 0.64, 42, 1, 1, choppy));
  add(specJ(p, t, d0, 22, 2.7, 0.8, { x: 5, y: 11 }, 0.85, 34, 1, 1, choppy));
  add(specJ(p, t, d0, 12, 1.5, 4.2, { x: 17, y: 9 }, 1.05, 26, 1, 1, choppy));
  add(specJ(p, t, d1, 38, 5.8, 1.2, { x: 8, y: 2 }, 0.78, 38, 0.6666667, 0.6666667, choppy));
  add(specJ(p, t, d1, 20, 3.0, 2.3, { x: 13, y: 5 }, 0.98, 30, 0.6666667, 0.6666667, choppy));
  add(specJ(p, t, d1, 9.5, 1.5, 1.6, { x: 23, y: 4 }, 1.15, 22, 0.6666667, 0.6666667, choppy));
  add(specJ(p, t, d2, 28, 5.8, 3.1, { x: 19, y: 6 }, 0.72, 36, 0.4, 0.4, choppy));
  add(specJ(p, t, d2, 15, 3.2, 0.9, { x: 27, y: 3 }, 1.10, 28, 0.4, 0.4, choppy));
  add(specJ(p, t, d2, 7, 1.8, 4.8, { x: 31, y: 12 }, 1.20, 18, 0.4, 0.4, choppy));
  return { x: rx, y: ry, z: rz };
}
const fineJ = (p: V2, t: number) => (Math.sin(p.x * 1.23 + p.y * 1.87 + t * 1.8) * Math.sin(p.x * -2.11 + p.y * 0.91 - t * 1.22) * 0.48 + Math.sin(p.x * 3.71 - p.y * 2.43 + t * 0.71) * Math.sin(p.x * 5.17 + p.y * 4.33 - t * 0.37) * 0.28) * 0.12;
const rippleJ = (p: V2, t: number) => { const dx = p.x + 7, dz = p.y + 25; const dist = Math.hypot(dx, dz); const wf = dist - t * 4.2; return Math.sin(wf * 3.8) * Math.exp(-dist * 0.055) * Math.exp(-Math.abs(wf) * 0.20) * 0.18; };
function surfaceFull(p: V2, t: number): V3 { const fade = 1 - smoothJ(45, 105, len2(p)); const st = stormSurface(p, t, CHOPPY_VISUAL); return { x: p.x + st.x, y: st.y + fineJ(p, t) * fade + rippleJ(p, t) * fade, z: p.y + st.z }; }
function surfacePhysics(p: V2, t: number): V3 { const st = stormSurface(p, t, CHOPPY_PHYSICS); return { x: p.x + st.x, y: st.y, z: p.y + st.z }; }

// FAST PATH for foam/gulls/camera - no inverse solve, just evaluate at param = world XZ
function surfaceFullFast(p: V2, t: number): V3 { return surfaceFull(p, t); }
function getWaterHeightFast(tx: number, tz: number, t: number, baseY: number): number {
  const p = surfaceFullFast({ x: tx, y: tz }, t);
  return p.y + baseY;
}

function sampleWithSolver(tx: number, tz: number, t: number, baseY: number, surf: (p: V2, t: number) => V3): OceanSample {
  let px = tx, pz = tz;
  for (let iter = 0; iter < 8; iter++) {
    const c = surf({ x: px, y: pz }, t); const ex = 0.05, ez = 0.05;
    const sx = surf({ x: px + ex, y: pz }, t); const sz = surf({ x: px, y: pz + ez }, t);
    const fx = c.x - tx, fz = c.z - tz; const j00 = (sx.x - c.x) / ex, j10 = (sx.z - c.z) / ex, j01 = (sz.x - c.x) / ez, j11 = (sz.z - c.z) / ez;
    const det = j00 * j11 - j01 * j10; if (Math.abs(det) < 1e-5) break;
    px -= (j11 * fx - j01 * fz) / det; pz -= (-j10 * fx + j00 * fz) / det; if (fx * fx + fz * fz < 1e-6) break;
  }
  const p = surfaceFull({ x: px, y: pz }, t); const pPhys = surf({ x: px, y: pz }, t); const e = 0.08;
  const px1 = surf({ x: px + e, y: pz }, t); const pz1 = surf({ x: px, y: pz + e }, t);
  const tx1 = new BABYLON.Vector3((px1.x - pPhys.x) / e, (px1.y - pPhys.y) / e, (px1.z - pPhys.z) / e);
  const tz1 = new BABYLON.Vector3((pz1.x - pPhys.x) / e, (pz1.y - pPhys.y) / e, (pz1.z - pPhys.z) / e);
  const normal = BABYLON.Vector3.Cross(tz1, tx1).normalize(); const dt = 1 / 120; const prev = surf({ x: px, y: pz }, t - dt);
  const vel = new BABYLON.Vector3((pPhys.x - prev.x) / dt, (pPhys.y - prev.y) / dt, (pPhys.z - prev.z) / dt);
  const ex = 0.05; const sx = surf({ x: px + ex, y: pz }, t); const sz = surf({ x: px, y: pz + ex }, t);
  const j00 = (sx.x - pPhys.x) / ex, j11 = (sz.z - pPhys.z) / ex;
  return { paramX: px, paramZ: pz, position: new BABYLON.Vector3(pPhys.x, pPhys.y + baseY, pPhys.z), normal, velocity: vel, jacobian: j00 * j11 };
}
function createOceanEvaluator(baseY: number) {
  return {
    samplePhysics: (x: number, z: number, t: number) => sampleWithSolver(x, z, t, baseY, surfacePhysics),
    sampleFull: (x: number, z: number, t: number) => sampleWithSolver(x, z, t, baseY, surfaceFull),
    getWaterHeightAtAccurate: (tx: number, tz: number, t: number) => sampleWithSolver(tx, tz, t, baseY, surfaceFull).position.y,
    getWaterHeightAtFast: (tx: number, tz: number, t: number) => getWaterHeightFast(tx, tz, t, baseY),
    // fast sample for gulls/camera that don't need Jacobian
    sampleFast: (x: number, z: number, t: number) => {
      const p = surfaceFullFast({ x, y: z }, t);
      return { position: new BABYLON.Vector3(p.x, p.y + baseY, p.z), paramX: x, paramZ: z };
    }
  };
}
export type OceanSetupOptions = TerrainSetupOptions;
export async function setupOcean(scene: BABYLON.Scene, options?: OceanSetupOptions) {
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["oceanVertexShader"] = OCEAN_VERT;
  (BABYLON.ShaderStore as any).ShadersStoreWGSL["oceanFragmentShader"] = OCEAN_FRAG;
  const terrain: TerrainSystem = await setupTerrain(scene, options);
  const { ground, floorMaterial, heightTexture, dataTexture, cachedHeights, getGroundHeightAt, updateTerrain } = terrain;
  const ocean = BABYLON.MeshBuilder.CreateGround("ocean", { width: OCEAN_CONFIG.ocean.width, height: OCEAN_CONFIG.ocean.height, subdivisions: OCEAN_CONFIG.ocean.subdivisions }, scene);
  ocean.position.y = OCEAN_CONFIG.ocean.baseY;
  const oceanMat = new BABYLON.ShaderMaterial("stormOceanMaterial", scene, { vertex: "ocean", fragment: "ocean" }, { attributes: ["position"], uniforms: ["time", "cameraPosition", "foamStrength", "causticStrength", "isUnderwater", "waterHeightAtCamera"], uniformBuffers: ["Scene", "Mesh"], shaderLanguage: BABYLON.ShaderLanguage.WGSL });
  oceanMat.backFaceCulling = false; oceanMat.needDepthPrePass = false; (oceanMat as any).needAlphaBlending = true; oceanMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  oceanMat.setFloat("foamStrength", OCEAN_CONFIG.material.foamStrength); oceanMat.setFloat("causticStrength", OCEAN_CONFIG.material.causticStrength);
  oceanMat.setFloat("isUnderwater", 0); oceanMat.setFloat("waterHeightAtCamera", 0); ocean.material = oceanMat;
  const evaluator = createOceanEvaluator(OCEAN_CONFIG.ocean.baseY);
  return { ground, floorMaterial, heightTexture, dataTexture, cachedHeights, getGroundHeightAt, updateTerrain, terrain, ocean, oceanMaterial: oceanMat, getWaterHeightAtAccurate: evaluator.getWaterHeightAtAccurate, getWaterHeightAtFast: evaluator.getWaterHeightAtFast, sampleAtWorldXZ: evaluator.samplePhysics, sampleFull: evaluator.sampleFull, sampleFast: evaluator.sampleFast };
}
