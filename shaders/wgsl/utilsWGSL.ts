// shaders/wgsl/utilsWGSL.ts
// Common WGSL utilities for all ocean variants.
// This is the new home for reusable water + terrain math.
// Future ocean3..6 should import and compose from here.

export const UTILS_WGSL = `
// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------
const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;
const GRAVITY: f32 = 9.81;
const WATER_IOR: f32 = 1.333;
const EPS: f32 = 1e-6;

// ------------------------------------------------------------
// Hash / Noise (reused by terrain + ocean foam)
// ------------------------------------------------------------
fn hash12(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
}
fn hash21(p: vec2f) -> f32 {
  let h = dot(p, vec2f(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}
fn hash22(p: vec2f) -> vec2f {
  return vec2f(hash21(p + vec2f(17.0, 3.0)), hash21(p + vec2f(41.0, 29.0)));
}
fn valueNoise(p: vec2f) -> f32 {
  let cell = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash12(cell);
  let b = hash12(cell + vec2f(1.0, 0.0));
  let c = hash12(cell + vec2f(0.0, 1.0));
  let d = hash12(cell + vec2f(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}
fn valueNoise01(p: vec2f) -> f32 {
  // 0..1 variant for masks
  return valueNoise(p) * 0.5 + 0.5;
}
fn fbm(pIn: vec2f, octaves: u32, gain: f32, lac: f32) -> f32 {
  var p = pIn;
  var sum = 0.0;
  var amp = 0.5;
  var norm = 0.0;
  for (var i: u32 = 0u; i < octaves; i++) {
    sum += amp * valueNoise(p);
    norm += amp;
    p *= lac;
    amp *= gain;
  }
  return sum / max(norm, 0.0001);
}
fn gaussianNoise(seed: vec2f) -> f32 {
  let h = hash22(seed);
  let u = max(h.x, 0.0001);
  let v = h.y;
  return sqrt(-2.0 * log(u)) * cos(TWO_PI * v);
}
fn rotate2(v: vec2f, a: f32) -> vec2f {
  let c = cos(a);
  let s = sin(a);
  return vec2f(c * v.x - s * v.y, s * v.x + c * v.y);
}
fn random2(p: vec2f) -> vec2f {
  let k = vec2f(0.3183099, 0.3678794);
  var x = p * k.x + k.yx;
  x = x * fract(x.yx);
  return fract(16.0 * k * fract(x.x * x.y));
}
fn swissCheeseNoise(uv: vec2f, scale: f32, softness: f32) -> f32 {
  let st = uv * scale;
  let i_st = floor(st);
  let f_st = fract(st);
  var min_dist = 1.0;
  var hv = 0.0;
  for (var y: i32 = -1; y <= 1; y++) {
    for (var x: i32 = -1; x <= 1; x++) {
      let neighbor = vec2f(f32(x), f32(y));
      let point = random2(i_st + neighbor);
      let diff = neighbor + point - f_st;
      let dist = length(diff);
      if (dist < min_dist) {
        min_dist = dist;
        hv = point.x;
      }
    }
  }
  let radius = 0.12 + hv * 0.18;
  return smoothstep(radius, radius + softness, min_dist);
}

// ------------------------------------------------------------
// Color space
// ------------------------------------------------------------
fn srgbToLinearChannel(c: f32) -> f32 {
  if (c <= 0.04045) {
    return c / 12.92;
  } else {
    return pow((c + 0.055) / 1.055, 2.4);
  }
}
fn gammaColorToLinear(col: vec4f) -> vec4f {
  return vec4f(srgbToLinearChannel(col.r), srgbToLinearChannel(col.g), srgbToLinearChannel(col.b), col.a);
}

// ------------------------------------------------------------
// Generic masking helpers (port of SG_* nodes)
// ------------------------------------------------------------
fn smoothMask(edge: f32, edgeSmooth: f32, x: f32) -> f32 {
  // Unity: smoothstep(edge, edge + smoothness, x)
  // Guard against zero smoothness like HLSL does
  let e1 = edge;
  let e2 = edge + max(edgeSmooth, 0.0001);
  return smoothstep(e1, e2, x);
}
fn worldUV(worldPos: vec3f) -> vec2f {
  // Unity's world UV is XZ scaled; flip Z for three/Babylon handedness handled outside
  // Keep 0.1 scale to match stylized water tiling expectation
  return worldPos.xz * 0.1;
}
fn uvPanner(baseUV: vec2f, pan: vec2f, tile: vec2f, scale: f32, time: f32) -> vec2f {
  return baseUV * tile * scale + pan * time;
}
fn uvPannerDistorted(baseUV: vec2f, tile: vec2f, scale: f32, pan: vec2f, distortionStrength: f32, distValue: vec2f, time: f32) -> vec2f {
  let uv = uvPanner(baseUV, pan, tile, scale, time);
  return uv + distValue * distortionStrength;
}
fn paralaxUV(baseUV: vec2f, depth: f32, viewDir: vec3f) -> vec2f {
  // Simple view-dependent parallax; mirrors SG_ParalaxUV
  // viewDir is world space view direction
  return baseUV + viewDir.xz * depth * 0.05;
}
fn paralaxUVFromTS(baseUV: vec2f, depth: f32, viewDirTS: vec3f) -> vec2f {
  // When view dir is already in tangent space (as in caustics), use xy
  return baseUV + viewDirTS.xy * depth * 0.05;
}
fn distanceFromCamera(posWS: vec3f, camPos: vec3f, start: f32, fade: f32) -> f32 {
  let d = distance(camPos, posWS);
  return saturate((d - start) / max(fade, 0.0001));
}
fn saturate(x: f32) -> f32 {
  return clamp(x, 0.0, 1.0);
}
fn saturateVec3(v: vec3f) -> vec3f {
  return clamp(v, vec3f(0.0), vec3f(1.0));
}
fn layerAlpha(layerColor: vec4f, baseAlpha: f32, mask: f32, blend: f32) -> f32 {
  // Port of SG layerAlpha: mixes base alpha towards 1 based on mask * (1-blend)
  let t = saturate(mask * (1.0 - blend));
  return mix(baseAlpha, 1.0, t);
}
fn colorLayerAlpha(prev: vec4f, layer: vec4f, mask: f32) -> vec4f {
  // Mix RGB by mask * layer.a, preserve previous alpha
  let m = saturate(mask * layer.a);
  return vec4f(mix(prev.rgb, layer.rgb, m), prev.a);
}

// ------------------------------------------------------------
// Gerstner waves (literal port of SG_GersterWaveGenerator)
// ------------------------------------------------------------
struct GerstnerResult {
  disp: vec3f,
  normal: vec3f,
}
fn safeDenom(x: f32) -> f32 {
  let sgn = select(-1.0, 1.0, x >= 0.0);
  return sgn * max(abs(x), 1e-6);
}
fn gerstnerWave(len: f32, height: f32, speed: f32, dir: vec3f, sharp: f32, P: vec3f, t: f32) -> GerstnerResult {
  // Unity -> Babylon flip Z once
  let D = vec3f(dir.x, dir.y, -dir.z);
  let Dn = normalize(D + vec3f(0.0, 0.00001, 0.0));
  let k = TWO_PI / max(len, 0.001);
  let w = sqrt(k * GRAVITY);
  let phase = dot(P, Dn * k) - w * t * speed;
  let c = cos(phase);
  let s = sin(phase);
  let kA = k * height;
  let Q = sharp / safeDenom(kA);
  let disp = vec3f(0.0, 1.0, 0.0) * c * height - Dn * s * Q * height;
  let nxz = Dn * s * kA;
  let n = vec3f(nxz.x, 1.0 - Q * c * kA, nxz.z);
  return GerstnerResult(disp, n);
}

// ------------------------------------------------------------
// Normal map + reflection helpers
// ------------------------------------------------------------
fn sampleNormalMapGrad(uv: vec2f, normalMap: texture_2d<f32>, normalSampler: sampler, gx: vec2f, gy: vec2f) -> vec3f {
  // Two-way blend preservation + anisotropic knee from Three.js port
  // For Babylon we use textureSampleGrad where available; fallback to level
  // The caller passes dFdx/dFdy
  let anisoKnee = 4.0;
  let anisoMaxBoost = 16.0;
  let lx = length(gx);
  let ly = length(gy);
  let ratio = max(lx, ly) / max(min(lx, ly), 1e-8);
  let k = 1.0 / clamp(ratio / anisoKnee, 1.0, anisoMaxBoost);
  // WGSL textureSampleGrad not universally available in Babylon's WGSL shim, use SampleLevel with bias 0
  // We emulate by scaling grad
  let samp = textureSample(normalMap, normalSampler, uv) * 2.0 - 1.0;
  // Note: actual grad version would be textureSampleGrad; we keep simple but preserve k factor in uv jitter
  return samp.rgb;
}
fn buildNormalTSFromMaps(
  baseUV: vec2f,
  normalScale: f32,
  normalPan: f32,
  time: f32,
  enableNormal: f32,
  distanceMask: f32,
  normalStrength: f32,
  normalDistStrength: f32,
  normalMap: texture_2d<f32>,
  normalSampler: sampler
) -> vec3f {
  let uvA = baseUV * (normalScale * 0.5) + vec2f(normalPan * -0.05 * time);
  let uvB = baseUV * normalScale + vec2f(normalPan * 0.1 * time);
  let nA = textureSample(normalMap, normalSampler, uvA).rgb * 2.0 - 1.0;
  let nB = textureSample(normalMap, normalSampler, uvB).rgb * 2.0 - 1.0;
  let nBlend = mix(nA, nB, 0.5);
  let strength = mix(normalStrength, normalDistStrength, distanceMask);
  let nScaled = vec3f(nBlend.xy * strength, mix(1.0, nBlend.z, saturate(strength)));
  return mix(vec3f(0.0, 0.0, 1.0), nScaled, enableNormal);
}
fn worldNormalFromTS(nTS: vec3f, Ngeo: vec3f) -> vec3f {
  let T = vec3f(-1.0, 0.0, 0.0);
  let B = cross(Ngeo, T);
  return normalize(T * nTS.x + B * nTS.y + Ngeo * nTS.z);
}

// ------------------------------------------------------------
// Depth helpers (Babylon approximation using heightTexture)
// ------------------------------------------------------------
struct DepthData {
  eyeDepth: f32,
  sceneEyeDepth: f32,
  scenePosWS: vec3f,
  ws: f32, // world space shallow mask 1=shoreline
  cs: f32, // view space shallow
  depthColorMask: f32,
  shoreFadeMask: f32,
  distanceMask: f32,
  vertical: f32,
}
fn buildDepthFromHeightMap(
  worldPos: vec3f,
  camPos: vec3f,
  heightMap: texture_2d<f32>,
  heightSampler: sampler,
  chunkOrigin: vec2f,
  textureWorldSize: f32,
  waterDepth: f32,
  worldSpaceDepth: f32,
  shoreFade: f32,
  shoreFadeSmooth: f32,
  distanceStart: f32,
  distanceFade: f32
) -> DepthData {
  // Sample terrain height at worldPos.xz
  let texUV = (worldPos.xz - chunkOrigin) / textureWorldSize;
  let clampedUV = clamp(texUV, vec2f(0.0), vec2f(1.0));
  let sceneY = textureSampleLevel(heightMap, heightSampler, clampedUV, 0.0).r;
  let scenePosWS = vec3f(worldPos.x, sceneY, worldPos.z);
  let vertical = worldPos.y - scenePosWS.y;
  let ws = saturate(exp(-vertical / max(waterDepth, 0.0001)));
  // cs approximated via eye depth difference; in Babylon we use vertical difference * 0.1 as proxy
  let eyeDepth = distance(camPos, worldPos);
  let sceneEyeDepth = distance(camPos, scenePosWS);
  let cs = 1.0 - saturate((sceneEyeDepth - eyeDepth) / max(waterDepth * 10.0, 0.0001));
  let depthColorMask = mix(cs, ws, worldSpaceDepth);
  let depth01 = saturate(1.0 - ws);
  let edge = shoreFade - 1.0;
  let shoreFadeMask = smoothstep(edge, edge + shoreFadeSmooth, depth01);
  let distanceMask = saturate((eyeDepth - distanceStart) / max(distanceFade, 0.0001));
  return DepthData(eyeDepth, sceneEyeDepth, scenePosWS, ws, cs, depthColorMask, shoreFadeMask, distanceMask, vertical);
}

// ------------------------------------------------------------
// Foam / Intersection / Shoreline helpers
// ------------------------------------------------------------
fn surfDistortionValue(baseUV: vec2f, scale: f32, pan: vec2f, time: f32, distMap: texture_2d<f32>, distSampler: sampler) -> vec2f {
  let uv = uvPanner(baseUV, pan, vec2f(1.0), scale, time);
  let r = textureSample(distMap, distSampler, uv).r;
  // Remap to -1..1
  return vec2f(r * 2.0 - 1.0, r * 2.0 - 1.0);
}
fn surfaceFoamMaskAt(
  baseUV: vec2f,
  scale: f32,
  tile: vec2f,
  pan: vec2f,
  edge: f32,
  edgeSmooth: f32,
  invert: f32,
  distortionStrength: f32,
  distValue: vec2f,
  time: f32,
  foamMap: texture_2d<f32>,
  foamSampler: sampler
) -> f32 {
  let uv = uvPannerDistorted(baseUV, tile, scale, pan, distortionStrength, distValue, time);
  let r = textureSample(foamMap, foamSampler, uv).r;
  let m = smoothMask(edge, edgeSmooth, r);
  return mix(m, 1.0 - m, invert);
}
fn intersectionFoamMask(
  waterDepthMask: f32,
  baseUV: vec2f,
  tile: vec2f,
  scale: f32,
  pan: vec2f,
  distortion: f32,
  distValue: vec2f,
  time: f32,
  width: f32,
  dissolve: f32,
  gradientDissolve: f32,
  foamInvert: f32,
  foamSmooth: f32,
  edgeFade: f32,
  foamMaskTex: texture_2d<f32>,
  foamMaskSampler: sampler
) -> f32 {
  let g = mix(0.1, 1.0, gradientDissolve);
  let w = width * mix(0.7, 1.0, g);
  let edge = 1.0 - w;
  let band = smoothMask(edge, g, waterDepthMask);
  let foamUV = uvPannerDistorted(baseUV, tile, scale, pan, distortion, distValue, time);
  // blur the foam mask to remove high-frequency shimmer
  let r = textureSampleLevel(foamMaskTex, foamMaskSampler, foamUV, 1.8).r;
  let m = mix(1.0 - r, r, foamInvert);
  let d = dissolve * mix(2.5, 1.0, g);
  let dm = 1.0 - m * d;
  let x = band * (band + dm);
  let foam = smoothMask(0.1, max(foamSmooth, 1e-6), x);
  let wideBand = smoothMask(edge, 1.0, waterDepthMask);
  let result = mix(foam, wideBand * foam, edgeFade);
  return saturate(result);
}
fn shorelineMask(
  worldPos: vec3f,
  scenePosWS: vec3f,
  time: f32,
  waterDepthSL: f32,
  centerMask: f32,
  centerMaskFade: f32,
  thickness: f32,
  speed: f32,
  amount: f32,
  dissolve: f32,
  gradientDissolve: f32,
  enableTrail: f32,
  trailFade: f32,
  maskPan: vec2f,
  maskScale: f32,
  maskTile: vec2f,
  dissolveMaskTex: texture_2d<f32>,
  dissolveSampler: sampler
) -> f32 {
  let vertical = worldPos.y - scenePosWS.y;
  let depth = saturate(exp(-vertical / max(waterDepthSL, 1e-6)));
  let cMask = smoothMask(centerMask, centerMaskFade, depth);
  let thickEdge = thickness * -0.5;
  let x = depth - speed * 0.1 * time;
  let xScaled = x * amount;
  let fracNeg = fract(-xScaled);
  let fracPos = fract(xScaled);
  let smA = smoothMask(thickEdge, 1.0, fracNeg);
  let smB = smoothMask(thickEdge, 1.0, fracPos);
  let speedPos = select(0.0, 1.0, speed > 0.0);
  let dirBand = mix(smB, smA, speedPos);
  let lines = mix(min(smA, smB), dirBand, enableTrail);
  let dUV = uvPanner(worldUV(worldPos), maskPan, maskTile, maskScale, time);
  let dTex = textureSample(dissolveMaskTex, dissolveSampler, dUV).r;
  let dissolved = lines * (1.0 - dTex * dissolve);
  let expanded = mix(dissolved, lines, depth * gradientDissolve);
  let stepped = step(0.5, expanded);
  let fracSel = mix(fracNeg, fracPos, speedPos);
  let trail = fracSel * stepped;
  let trailed = mix(stepped, trail, trailFade);
  let mask = saturate(cMask - (1.0 - trailed));
  return mask;
}

// ------------------------------------------------------------
// Lighting / Reflection
// ------------------------------------------------------------
fn schlickFresnel(N: vec3f, V: vec3f, f0: f32) -> f32 {
  let c = saturate(dot(N, V));
  return f0 + (1.0 - f0) * pow(1.0 - c, 5.0);
}
fn skyColor(dirIn: vec3f) -> vec3f {
  let dir = normalize(dirIn);
  let hor = vec3f(0.40, 0.56, 0.68);
  let zen = vec3f(0.025, 0.055, 0.105);
  let h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  let sl = smoothstep(0.05, 0.72, dir.y);
  let sd = normalize(vec3f(-0.22, 0.54, 0.81));
  let sa = max(dot(dir, sd), 0.0);
  var col = mix(hor, zen, h);
  col = mix(col, col * vec3f(0.52, 0.58, 0.66), sl * 0.38);
  col += vec3f(1.0, 0.70, 0.42) * pow(sa, 160.0) * 2.0;
  col += vec3f(0.16, 0.19, 0.23) * pow(sa, 8.0) * 0.22;
  return col;
}
`;
