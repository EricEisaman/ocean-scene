// shaders/wgsl/floorFrag.ts
const FLOOR_FRAG=`#define CUSTOM_FRAGMENT
varying vWorldPos: vec3<f32>;
varying vUV: vec2<f32>;
varying vNormal: vec3<f32>;
varying vHeight: f32;
varying vSlope: f32;
varying vRidgeMask: f32;

var seabedTexture: texture_2d<f32>;
var seabedTextureSampler: sampler;

uniform cameraPosition: vec3<f32>;
uniform terrainRender: vec4<f32>;
uniform chunkOrigin: vec2<f32>;

// from ocean.ts - you tweak these, not the shader math
uniform sandColor: vec3<f32>;
uniform gravelColor: vec3<f32>;
uniform grassColor: vec3<f32>;
uniform rockColor: vec3<f32>;
uniform snowColor: vec3<f32>;
uniform sandH: f32;
uniform gravelH: f32;
uniform grassH: f32;
uniform rockH: f32;
uniform snowH: f32;
uniform sunDir: vec3<f32>;
uniform ambient: f32;
uniform diffuseBoost: f32;
uniform waterDepthFog: vec3<f32>;
uniform waterColor: vec3<f32>;
uniform detailTiling: f32;
uniform detailStrength: f32;
uniform grassMaskLow: f32;
uniform grassMaskHigh: f32;
uniform rockStart: f32;
uniform rockEnd: f32;
uniform grassRockLerpStart: f32;
uniform grassRockLerpEnd: f32;
uniform beachFlatThreshold: f32;
uniform ridgeInfluence: f32;
uniform distanceFogStart: f32;
uniform distanceFogEnd: f32;
uniform distanceFogColor: vec3<f32>;

fn heightBlend(h: f32) -> vec3f {
  var c = uniforms.sandColor;
  c = mix(c, uniforms.gravelColor, smoothstep(uniforms.sandH, uniforms.gravelH, h));
  c = mix(c, uniforms.grassColor,  smoothstep(uniforms.gravelH, uniforms.grassH, h));
  c = mix(c, uniforms.rockColor,    smoothstep(uniforms.grassH, uniforms.rockH, h));
  c = mix(c, uniforms.snowColor,    smoothstep(uniforms.rockH, uniforms.snowH, h));
  return c;
}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let h = input.vHeight;
    let slope = input.vSlope; // 0 = flat, 1 = vertical from dataCS
    let ridge = input.vRidgeMask;
    var N = normalize(input.vNormal);

    // 1. base color by HEIGHT
    var base = heightBlend(h);

    // 2. SLOPE modifies thresholds - steep = rock earlier
    // effective grass->rock transition moves down when steep
    let steepness = clamp(slope + ridge*uniforms.ridgeInfluence, 0.0, 1.0);
    let effectiveRockH = mix(uniforms.rockH, uniforms.grassH, smoothstep(uniforms.grassRockLerpStart, uniforms.grassRockLerpEnd, steepness));
    
    // recompute grass/rock mix with slope-aware height
    let grassRockT = smoothstep(uniforms.grassH, effectiveRockH, h);
    var slopeRock = mix(uniforms.grassColor, uniforms.rockColor, grassRockT);
    // if flat, keep heightBlend, if steep, push toward slopeRock
    base = mix(base, slopeRock, smoothstep(uniforms.grassRockLerpStart, uniforms.grassRockLerpEnd, steepness));

    // 3. Beach rule: always sand/gravel if very low, regardless of slope but flatten cliff
    let beachMask = 1.0 - smoothstep(uniforms.sandH, uniforms.gravelH + 1.0, h);
    base = mix(base, uniforms.sandColor, beachMask * (1.0 - smoothstep(uniforms.beachFlatThreshold * 0.22, uniforms.beachFlatThreshold, steepness)));
    base = mix(base, uniforms.gravelColor, beachMask * smoothstep(uniforms.beachFlatThreshold * 0.44, uniforms.beachFlatThreshold + 0.05, steepness) * 0.7);

    // 4. CLIFF rule: high slope = rock
    let cliff = smoothstep(uniforms.rockStart, uniforms.rockEnd, steepness);
    base = mix(base, uniforms.rockColor, cliff * (1.0 - beachMask * 0.8));

    // 5. SNOW rule: high AND flat = snow, high AND steep = rock with snow patches
    let snowFlat = smoothstep(uniforms.rockH, uniforms.snowH, h) * (1.0 - smoothstep(0.32, 0.62, steepness));
    let snowOnRock = smoothstep(uniforms.snowH - 10.0, uniforms.snowH + 5.0, h) * cliff * 0.25;
    base = mix(base, uniforms.snowColor, snowFlat);
    base = mix(base, uniforms.snowColor, snowOnRock);

    // micro detail
    let worldXZ = input.vWorldPos.xz;
    let detail = textureSampleLevel(seabedTexture, seabedTextureSampler, fract(worldXZ/uniforms.detailTiling), 0.0).rgb;
    let grassMask = (1.0 - cliff) * smoothstep(uniforms.grassMaskLow, uniforms.grassMaskHigh, h);
    base *= mix(vec3f(1.0), detail, uniforms.detailStrength * grassMask);

    let diffuse = max(dot(N, normalize(uniforms.sunDir)), 0.0);
    let lit = base * (uniforms.ambient + diffuse * uniforms.diffuseBoost);

    let waterDepth = max(-h, 0.0);
    let camDist = distance(uniforms.cameraPosition, input.vWorldPos);
    let trans = exp(-(waterDepth + camDist*0.025) * uniforms.waterDepthFog);
    var finalCol = mix(uniforms.waterColor, lit, trans);
    finalCol = mix(finalCol, uniforms.distanceFogColor, smoothstep(uniforms.distanceFogStart, uniforms.distanceFogEnd,camDist));

    fragmentOutputs.color = vec4f(finalCol, 1.0);
}`;
export {FLOOR_FRAG};
