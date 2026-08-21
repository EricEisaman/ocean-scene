// shaders/wgsl/oceanFrag2.ts

import { UTILS_WGSL } from "./utilsWGSL";

export const OCEAN_FRAG2 = `#define CUSTOM_FRAGMENT
#include<sceneUboDeclaration>

varying vWorldPos: vec3<f32>;
varying vWorldPosUndisplaced: vec3<f32>;
varying vNormal: vec3<f32>;
varying vWaveNormal: vec3<f32>;
varying vHeight01: f32;
varying vUV: vec2<f32>;
varying vOrigXZ: vec2<f32>;
varying vLocalPos: vec3<f32>;

// Core uniforms
uniform time: f32;
uniform cameraPosition: vec3<f32>;
uniform chunkOrigin: vec2<f32>;
uniform textureWorldSize: f32;
uniform isUnderwater: f32;
uniform waterHeightAtCamera: f32;

// Base
uniform Color_Shallow: vec4f;
uniform Color_Deep: vec4f;
uniform Water_Depth: f32;
uniform WorldSpaceDepth: f32;
uniform DistanceMask_Start: f32;
uniform DistanceMask_Fade: f32;
uniform ShoreFade: f32;
uniform ShoreFade_Smoothness: f32;

// Surface foam
uniform Enable_SurfaceFoam: f32;
uniform SurfFoam_Color: vec4f;
uniform SurfFoam_AlphaBlend: f32;
uniform Invert_SurfFoam: f32;
uniform SurfFoam_Pan: vec2f;
uniform SurfFoam_Scale: f32;
uniform SurfFoam_Tile: vec2f;
uniform SurfFoam_Edge: f32;
uniform SurfFoam_EdgeSmooth: f32;
uniform SurfFoam_LodNear: f32;
uniform SurfFoam_LodFar: f32;
uniform SurfFoam_LodDistance: f32;
uniform SurfFoam_SecondScale: f32;
uniform SurfFoam_RemapBase: f32;
uniform SurfFoam_RemapRange: f32;
uniform SurfFoam_SecondRemapBase: f32;
uniform SurfFoam_SecondRemapRange: f32;
uniform SurfFoam_Blend: f32;



uniform SurfaceDistortion_Scale: f32;
uniform SurfaceDistortion_Strength: f32;
uniform SurfaceDistortion_Pan: vec2f;

// Intersection
uniform Enable_Intersection: f32;
uniform InterSec_Color: vec4f;
uniform InterSec_Width: f32;
uniform InterSec_Dissolve: f32;
uniform InterSec_Foam_Invert: f32;
uniform InterSec_Foam_Scale: f32;
uniform InterSec_Foam_Tile: vec2f;
uniform InterSec_Foam_Pan: vec2f;
uniform InterSec_Foam_Distortion: f32;
uniform InterSec_Foam_Smooth: f32;
uniform InterSec_GradientDissolve: f32;
uniform InterSec_Edge_Fade: f32;

// Shoreline
uniform ENABLESHORELINE: f32;
uniform SL_Color: vec4f;
uniform SL_WaterDepth: f32;
uniform SL_Speed: f32;
uniform SL_Ammount: f32;
uniform SL_Thickness: f32;
uniform SL_CenterMask: f32;
uniform SL_CenterMaskFade: f32;
uniform SL_Dissolve: f32;
uniform SL_GradientDissolve: f32;
uniform SL_MaskPan: vec2f;
uniform SL_MaskScale: f32;
uniform SL_MaskTile: vec2f;
uniform SL_EnableTrail: f32;
uniform SL_Trail_Fade: f32;

// Underwater
uniform ENABLE_UNDERWATERLAYER: f32;
uniform UnderWater_Depth: f32;
uniform ConformToGeometry: f32;
uniform Underwater_Color: vec4f;
uniform UnderWater_ScaleModifier: f32;
uniform UnderWater_Start: f32;
uniform Underwater_Fade: f32;

// Normal
uniform ENABLENORMAL: f32;
uniform Normal_Strength: f32;
uniform Normal_Pan: f32;
uniform Normal_Scale: f32;
uniform Normal_DistanceStrength: f32;
uniform sunDir: vec3f;

// Lighting
uniform ShadowColor: vec4f;
uniform Specular_Color: vec4f;
uniform Specular_Spread: f32;
uniform Specular_Hardness: f32;
uniform Specular_Size: f32;

// Reflection
uniform ENABLEPLANERREFLECTION: f32;
uniform Reflection_Strength: f32;
uniform Reflection_Fresnel: f32;
uniform Reflection_Distortion: f32;

// Refraction
uniform ENABLEREFRACTION: f32;
uniform Refraction_Strength: f32;
uniform Refraction_Distance_Strength: f32;
uniform Refraction_Distance_Fade: f32;

// Caustics
uniform ENABLECAUSTICS: f32;
uniform Caustics_Depth: f32;
uniform Caustics_Pan: f32;
uniform Caustics_Scale: f32;
uniform Caustics_Strength: f32;
uniform Caustics_Distortion_Strength: f32;
uniform Caustics_Distortion_Scale: f32;
uniform Caustics_Start: f32;
uniform Caustics_Fade: f32;

// Waves
uniform ENABLEWAVE: f32;
uniform Wave_Top_Color: vec4f;
uniform Wave1_Length: f32;
uniform Wave1_Height: f32;
uniform Wave1_Speed: f32;
uniform Wave1_Direction: vec3f;
uniform Wave1_Sharpness: f32;
uniform Wave2_Length: f32;
uniform Wave2_Height: f32;
uniform Wave2_Speed: f32;
uniform Wave2_Direction: vec3f;
uniform Wave2_Sharpness: f32;

// Textures
var SurfFoam_Map: texture_2d<f32>;
var SurfFoam_MapSampler: sampler;

var SurfaceDistortion_Map: texture_2d<f32>;
var SurfaceDistortion_MapSampler: sampler;

var InterSec_Foam_Mask: texture_2d<f32>;
var InterSec_Foam_MaskSampler: sampler;

var SL_Dissolve_Mask: texture_2d<f32>;
var SL_Dissolve_MaskSampler: sampler;

var Normal_Map: texture_2d<f32>;
var Normal_MapSampler: sampler;

var Caustics_Map: texture_2d<f32>;
var Caustics_MapSampler: sampler;

var Caustics_Distortion_Map: texture_2d<f32>;
var Caustics_Distortion_MapSampler: sampler;

var heightTexture: texture_2d<f32>;
var heightTextureSampler: sampler;

var seabedTexture: texture_2d<f32>;
var seabedTextureSampler: sampler;

${UTILS_WGSL}

fn buildBaseColor(depthMask: f32) -> vec4f {
  return mix(uniforms.Color_Deep, uniforms.Color_Shallow, depthMask);
}

fn buildCausticsMask(worldPos: vec3f, depthWS: f32, time: f32, camPos: vec3f) -> f32 {
  let shallowMask = depthWS;
  let paralaxDepth = (1.0 - shallowMask) * uniforms.Caustics_Depth;
  let viewDir = normalize(camPos - worldPos);
  let pUV = paralaxUV(worldUV(worldPos), paralaxDepth, viewDir);

  let dUV = uvPanner(pUV, vec2f(-uniforms.Caustics_Pan, 0.0), vec2f(uniforms.Caustics_Distortion_Scale), 1.0, time);
  let dR = textureSample(Caustics_Distortion_Map, Caustics_Distortion_MapSampler, dUV).r;
  let distStrength = uniforms.Caustics_Distortion_Strength * 0.01;
  let distortion = vec2f((dR * 2.0 - 1.0) * 0.01, (dR * 2.0 - 1.0) * 2.0) * distStrength;

  let uvA = uvPanner(pUV, vec2f(uniforms.Caustics_Pan), vec2f(uniforms.Caustics_Scale), 1.0, time) + distortion;
  let uvB = uvPanner(pUV, vec2f(-uniforms.Caustics_Pan), vec2f(uniforms.Caustics_Scale), 1.3, time) + distortion;

  let texA = textureSample(Caustics_Map, Caustics_MapSampler, uvA);
  let texB = textureSample(Caustics_Map, Caustics_MapSampler, uvB);
  let dual = min(texA, texB);
  let caustics = dual * uniforms.Caustics_Strength;

  let distFade = 1.0 - saturate((distance(camPos, worldPos) - uniforms.Caustics_Start) / max(uniforms.Caustics_Fade, 0.0001));

  return caustics.r * shallowMask * distFade * uniforms.ENABLECAUSTICS;
}

fn buildUnderwaterMask(
  worldPos: vec3f,
  depthR: DepthData,
  depthS: DepthData,
  camPos: vec3f,
  time: f32,
  distValue: vec2f
) -> f32 {
  let uwDepth = mix(uniforms.UnderWater_Depth, uniforms.UnderWater_Depth * (1.0 - depthR.depthColorMask), uniforms.ConformToGeometry);
  let viewDir = normalize(camPos - worldPos);
  let uwUV = paralaxUV(worldUV(worldPos), uwDepth, viewDir);

  let uwInter = intersectionFoamMask(
    depthS.ws,
    uwUV,
    uniforms.InterSec_Foam_Tile,
    uniforms.InterSec_Foam_Scale,
    uniforms.InterSec_Foam_Pan,
    uniforms.InterSec_Foam_Distortion,
    distValue,
    time,
    uniforms.InterSec_Width,
    uniforms.InterSec_Dissolve,
    uniforms.InterSec_GradientDissolve,
    uniforms.InterSec_Foam_Invert,
    uniforms.InterSec_Foam_Smooth,
    uniforms.InterSec_Edge_Fade,
    InterSec_Foam_Mask,
    InterSec_Foam_MaskSampler
  ) * uniforms.Enable_Intersection;

  let uwFoam = surfaceFoamMaskAt(
    uwUV,
    uniforms.SurfFoam_Scale + uniforms.UnderWater_ScaleModifier,
    uniforms.SurfFoam_Tile,
    uniforms.SurfFoam_Pan,
    uniforms.SurfFoam_Edge,
    uniforms.SurfFoam_EdgeSmooth,
    uniforms.Invert_SurfFoam,
    uniforms.SurfaceDistortion_Strength,
    distValue,
    time,
    SurfFoam_Map,
    SurfFoam_MapSampler
  ) * uniforms.Enable_SurfaceFoam;

  let uwDistFade = 1.0 - distanceFromCamera(worldPos, camPos, uniforms.UnderWater_Start, uniforms.Underwater_Fade);

  return saturate(uwInter + uwFoam) * uwDistFade * uniforms.ENABLE_UNDERWATERLAYER;
}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let worldPos = fragmentInputs.vWorldPos;
    let worldPosUndis = fragmentInputs.vWorldPosUndisplaced;
    let camPos = uniforms.cameraPosition;
    let t = uniforms.time;

    let viewDir = normalize(camPos - worldPos);
    let viewDist = length(camPos - worldPos);

    // Depth
    let depthS = buildDepthFromHeightMap(
        worldPos, camPos, heightTexture, heightTextureSampler,
        uniforms.chunkOrigin, uniforms.textureWorldSize,
        uniforms.Water_Depth, uniforms.WorldSpaceDepth,
        uniforms.ShoreFade, uniforms.ShoreFade_Smoothness,
        uniforms.DistanceMask_Start, uniforms.DistanceMask_Fade
    );

    // Normal for refraction distortion (unscaled)
    let baseUV = worldUV(worldPos);
    let uvA = baseUV * (uniforms.Normal_Scale * 0.5) + vec2f(uniforms.Normal_Pan * -0.05 * t);
    let uvB = baseUV * uniforms.Normal_Scale + vec2f(uniforms.Normal_Pan * 0.1 * t);
    let nA = textureSample(Normal_Map, Normal_MapSampler, uvA).rgb * 2.0 - 1.0;
    let nB = textureSample(Normal_Map, Normal_MapSampler, uvB).rgb * 2.0 - 1.0;
    let unscaledN = mix(nA, nB, 0.5);

    let far01 = saturate((viewDist - uniforms.Refraction_Distance_Fade) / 5.0);
    let refrStrength = mix(depthS.shoreFadeMask * uniforms.Refraction_Strength, uniforms.Refraction_Distance_Strength, far01);
    let refrOffset = unscaledN.xy * refrStrength * 0.08;

    let keep = 1.0;
    let refrUVWorld = worldPos + vec3f(refrOffset.x, 0.0, refrOffset.y) * keep * uniforms.ENABLEREFRACTION;
    let depthR = buildDepthFromHeightMap(
        refrUVWorld, camPos, heightTexture, heightTextureSampler,
        uniforms.chunkOrigin, uniforms.textureWorldSize,
        uniforms.Water_Depth, uniforms.WorldSpaceDepth,
        uniforms.ShoreFade, uniforms.ShoreFade_Smoothness,
        uniforms.DistanceMask_Start, uniforms.DistanceMask_Fade
    );

    // Base color - deep to shallow
    var base = buildBaseColor(depthR.depthColorMask);

    // Shared distortion
    let sharedDistUV = uvPanner(baseUV, uniforms.SurfaceDistortion_Pan, vec2f(1.0), uniforms.SurfaceDistortion_Scale, t);
    let sharedDistR = textureSample(SurfaceDistortion_Map, SurfaceDistortion_MapSampler, sharedDistUV).r;
    let sharedDistValue = vec2f(sharedDistR * 2.0 - 1.0, sharedDistR * 2.0 - 1.0);

    // Masks
    let causticsMask = buildCausticsMask(worldPos, depthS.ws, t, camPos);
    let underMask = buildUnderwaterMask(worldPos, depthR, depthS, camPos, t, sharedDistValue);

    let interMask = intersectionFoamMask(
        depthS.ws,
        baseUV,
        uniforms.InterSec_Foam_Tile,
        uniforms.InterSec_Foam_Scale,
        uniforms.InterSec_Foam_Pan,
        uniforms.InterSec_Foam_Distortion,
        sharedDistValue,
        t,
        uniforms.InterSec_Width,
        uniforms.InterSec_Dissolve,
        uniforms.InterSec_GradientDissolve,
        uniforms.InterSec_Foam_Invert,
        uniforms.InterSec_Foam_Smooth,
        uniforms.InterSec_Edge_Fade,
        InterSec_Foam_Mask,
        InterSec_Foam_MaskSampler
    ) * uniforms.Enable_Intersection;

    let shoreMask = shorelineMask(
        worldPos, depthS.scenePosWS, t,
        uniforms.SL_WaterDepth, uniforms.SL_CenterMask, uniforms.SL_CenterMaskFade,
        uniforms.SL_Thickness, uniforms.SL_Speed, uniforms.SL_Ammount,
        uniforms.SL_Dissolve, uniforms.SL_GradientDissolve,
        uniforms.SL_EnableTrail, uniforms.SL_Trail_Fade,
        uniforms.SL_MaskPan, uniforms.SL_MaskScale, uniforms.SL_MaskTile,
        SL_Dissolve_Mask, SL_Dissolve_MaskSampler
    ) * uniforms.ENABLESHORELINE;

    // --- FINAL NO-DARK FIX ---
    // The dark veins you see are mask=0 showing deep water.
    // We force LOD 2.5 blur + minimum 55% coverage so close looks like far.
    let viewDistFoam = length(camPos - worldPos);
    // Blur LOD: 2.2 close, 3.0 far - makes close as soft as far
    let lod = uniforms.SurfFoam_LodNear + saturate(viewDistFoam / uniforms.SurfFoam_LodDistance) * (uniforms.SurfFoam_LodFar - uniforms.SurfFoam_LodNear);

    // Sample foam texture blurry
    var uvFoam = baseUV * uniforms.SurfFoam_Tile * uniforms.SurfFoam_Scale + uniforms.SurfFoam_Pan * t;
    let r = textureSampleLevel(SurfFoam_Map, SurfFoam_MapSampler, uvFoam, lod).r;
    // Very soft edge: 0.12 to 1.02 = almost full coverage, thin faint veins
    var rawMask = smoothMask(uniforms.SurfFoam_Edge, uniforms.SurfFoam_EdgeSmooth, r);
    rawMask = mix(rawMask, 1.0 - rawMask, uniforms.Invert_SurfFoam);
    // REMAP to never be dark: 0.55 to 0.85 (was 0 to 1)
    // This is the key: gaps are 0.55 foam, blobs 0.85 foam = no dark base
    rawMask = uniforms.SurfFoam_RemapBase + rawMask * uniforms.SurfFoam_RemapRange;
    // Add subtle second octave for variation, but keep in same range
    var uv2 = baseUV * uniforms.SurfFoam_Tile * uniforms.SurfFoam_Scale * 1.6 - uniforms.SurfFoam_Pan * t;
    let r2 = textureSampleLevel(SurfFoam_Map, SurfFoam_MapSampler, uv2, lod + 0.5).r;
    var rawMask2 = smoothMask(uniforms.SurfFoam_Edge, uniforms.SurfFoam_EdgeSmooth, r2);
    rawMask2 = mix(rawMask2, 1.0 - rawMask2, uniforms.Invert_SurfFoam);
    rawMask2 = uniforms.SurfFoam_SecondRemapBase + rawMask2 * uniforms.SurfFoam_SecondRemapRange;
    var foamCombined = rawMask * uniforms.SurfFoam_Blend + rawMask2 * (1.0 - uniforms.SurfFoam_Blend);
    foamCombined = saturate(foamCombined);
    
    let foamMask = foamCombined * uniforms.Enable_SurfaceFoam;

    // Color layering
    var c = base;
    c = colorLayerAlpha(c, vec4f(4.0, 4.0, 4.0, 1.0), causticsMask);
    c = colorLayerAlpha(c, uniforms.Underwater_Color, underMask);
    c = colorLayerAlpha(c, uniforms.InterSec_Color, interMask);
    c = colorLayerAlpha(c, uniforms.SL_Color, shoreMask);
    // FIX 3: Normal-based soft crest foam (was height-based stripes)
    // Use wave normal Y to detect crest steepness - flat = N.y ~1, crest = N.y drops
    // This is physically correct: foam appears where wave face tilts / breaks
    let Ngeo_crest = normalize(fragmentInputs.vWaveNormal);
    let slope = 1.0 - Ngeo_crest.y; // 0 = flat, >0 = steep
    let heightPositive = saturate(fragmentInputs.vHeight01 * 0.6); // only above midline
    // Combine slope + height: need both steep AND high
    var crestFoam = slope * heightPositive;
    // Soften and shape - power for soft falloff
    crestFoam = pow(crestFoam, 1.8);
    // Smoothstep for soft edge, not hard stripe
    crestFoam = smoothstep(0.06, 0.32, crestFoam);
    // Very soft strength - blue variant foam
    crestFoam = crestFoam * 0.28;
    // Distance fade - less foam far away
    let distFadeCrest = 1.0 - saturate((length(uniforms.cameraPosition - worldPos) - 35.0) / 90.0) * 0.6;
    crestFoam = crestFoam * distFadeCrest;
    // Add subtle normal-map breakup so foam isn't uniform ribbon
    let foamBreakup = textureSample(SurfaceDistortion_Map, SurfaceDistortion_MapSampler, baseUV * 2.5 + vec2f(t * 0.004)).r;
    crestFoam = crestFoam * (0.7 + foamBreakup * 0.6);
    c = colorLayerAlpha(c, uniforms.Wave_Top_Color, crestFoam);
    c = colorLayerAlpha(c, uniforms.SurfFoam_Color, foamMask);

    var a = base.a;
    a = layerAlpha(uniforms.InterSec_Color, a, interMask, 0.0);
    a = layerAlpha(uniforms.SL_Color, a, shoreMask, 0.0);
    a = layerAlpha(uniforms.SurfFoam_Color, a, foamMask, uniforms.SurfFoam_AlphaBlend);
    let layeredAlpha = a;

    // Water normal for lighting
    let distanceMask = depthS.distanceMask;
    let nTS = buildNormalTSFromMaps(
        baseUV,
        uniforms.Normal_Scale,
        uniforms.Normal_Pan,
        t,
        uniforms.ENABLENORMAL,
        distanceMask,
        uniforms.Normal_Strength,
        uniforms.Normal_DistanceStrength,
        Normal_Map,
        Normal_MapSampler
    );
    let Ngeo = normalize(fragmentInputs.vWaveNormal);
    let N = worldNormalFromTS(nTS, Ngeo);

    // ===== FIX 1: REMOVE TAN COLOR =====
    // Old code sampled seabedTexture (rocky brown) and smeared it across ocean as refractedScene.
    // That caused the terrible tan wash. Instead we use pure water color and let real transparency
    // show the actual seabed mesh underneath. Shallow water gets only a subtle light sand tint (not brown).
    let lightSand = vec3f(0.68, 0.82, 0.94); // BLUE tinted shallow, no tan
    let shallowFactor = saturate(depthS.ws); // 1 at shore, 0 in deep
    // BLUE ONLY - no tan/yellow ever. Pure water color, slight light-blue lift in shallow
    let blueLift = vec3f(0.35, 0.70, 0.92); // light blue variant
    let refractedScene = mix(c.rgb, blueLift, shallowFactor * 0.12);
    var rgb = c.rgb;
    if (uniforms.ENABLEREFRACTION > 0.5) {
        rgb = mix(c.rgb, refractedScene, 0.18);
    }

    // Reflection - low for transparent look
    let reflDir = reflect(-viewDir, N);
    let skyRefl = skyColor(reflDir);
    let fresnel = pow(saturate(1.0 - max(dot(Ngeo, viewDir), 0.00001)), uniforms.Reflection_Fresnel);
    let reflFactor = fresnel * uniforms.Reflection_Strength;
    rgb = mix(rgb, skyRefl, reflFactor);

    // Specular - soft
    let halfVec = normalize(viewDir + normalize(uniforms.sunDir));
    let NdotH = max(dot(N, halfVec), 0.0);
    let specPower = mix(16.0, 128.0, uniforms.Specular_Hardness);
    var spec = pow(NdotH, specPower) * uniforms.Specular_Size;
    spec *= (1.0 - uniforms.Specular_Spread * 0.5);
    let specular = spec * uniforms.Specular_Color.rgb * uniforms.Specular_Color.a;
    rgb = rgb + specular;

    // Shadow placeholder
    let shadowFactor = 0.0;
    rgb = mix(rgb, uniforms.ShadowColor.rgb, shadowFactor);

    // ===== FIX 2: MAKE OCEAN PARTLY TRANSPARENT =====
    // Old code: let outAlpha = mix(depthS.shoreFadeMask * layeredAlpha, depthS.shoreFadeMask, ENABLEREFRACTION)
    // When ENABLEREFRACTION=1, this forced alpha = shoreFadeMask = 1.0 everywhere = opaque!
    // New: respect layeredAlpha (which contains Color_Shallow.a = 0.38) so shallow is transparent
    var outAlpha = depthS.shoreFadeMask * layeredAlpha;
    // Deep water should still be mostly opaque but not fully: 0.88, shallow ~0.38
    // Add distance fade: far water more opaque for horizon
    let distAlphaBoost = saturate(viewDist / 180.0) * 0.25;
    outAlpha = saturate(outAlpha + distAlphaBoost);
    // Clamp to keep some transparency everywhere
    outAlpha = clamp(outAlpha, 0.28, 0.92);

    // Underwater handling - keep alpha
    fragmentOutputs.color = vec4f(rgb, outAlpha);
}
`;
