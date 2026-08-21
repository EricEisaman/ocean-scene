// shaders/wgsl/oceanVert2.ts

import { UTILS_WGSL } from "./utilsWGSL";

export const OCEAN_VERT2 = `#define CUSTOM_VERTEX
#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position: vec3<f32>;
attribute normal: vec3<f32>;
attribute uv: vec2<f32>;

uniform time: f32;

// Wave uniforms (Unity UberStylizedWater)
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

uniform ENABLEWAVE: f32;

varying vWorldPos: vec3<f32>;
varying vWorldPosUndisplaced: vec3<f32>;
varying vNormal: vec3<f32>;
varying vWaveNormal: vec3<f32>;
varying vHeight01: f32;
varying vUV: vec2<f32>;
varying vOrigXZ: vec2<f32>;
varying vLocalPos: vec3<f32>;

${UTILS_WGSL}

@vertex
fn main(input: VertexInputs) -> FragmentInputs {
    let posLocal = vertexInputs.position;
    let nLocal = vertexInputs.normal;

    // Undisplaced world position (circular dependency workaround from Three.js port)
    let worldPosUndisplaced = (mesh.world * vec4f(posLocal, 1.0)).xyz;
    let normalWorld = normalize((mesh.world * vec4f(nLocal, 0.0)).xyz);

    let t = uniforms.time;

    let w1 = gerstnerWave(
        uniforms.Wave1_Length,
        uniforms.Wave1_Height,
        uniforms.Wave1_Speed,
        uniforms.Wave1_Direction,
        uniforms.Wave1_Sharpness,
        worldPosUndisplaced,
        t
    );
    let w2 = gerstnerWave(
        uniforms.Wave2_Length,
        uniforms.Wave2_Height,
        uniforms.Wave2_Speed,
        uniforms.Wave2_Direction,
        uniforms.Wave2_Sharpness,
        worldPosUndisplaced,
        t
    );

    let dispSum = w1.disp + w2.disp;
    let offset = dispSum * uniforms.ENABLEWAVE;

    // Final world position
    let worldPos = worldPosUndisplaced + offset;

    // Wave normal blending - normalize after sum, like URP does
    let nSum = w1.normal + w2.normal;
    let waveNormal = normalize(nSum);

    // Mix geometry normal with wave normal based on ENABLEWAVE
    let finalNormal = normalize(mix(normalWorld, waveNormal, uniforms.ENABLEWAVE));

    // Height for crest color: HLSL x10 mask must remain unclamped so troughs extrapolate
    // Recompute displacement Y at world pos for fragment (approximation in vertex, refined in frag)
    let height01 = (w1.disp.y + w2.disp.y) * 10.0 * uniforms.ENABLEWAVE;

    vertexOutputs.vWorldPos = worldPos;
    vertexOutputs.vWorldPosUndisplaced = worldPosUndisplaced;
    vertexOutputs.vNormal = finalNormal;
    vertexOutputs.vWaveNormal = waveNormal;
    vertexOutputs.vHeight01 = height01;
    vertexOutputs.vUV = vertexInputs.uv;
    vertexOutputs.vOrigXZ = posLocal.xz;
    vertexOutputs.vLocalPos = posLocal + offset;

    vertexOutputs.position = scene.viewProjection * vec4f(worldPos, 1.0);
}
`;
