// shaders/wgsl/oceanVert.ts

import { SHARED_WGSL } from "./sharedWGSL";

const OCEAN_VERT=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position: vec3<f32>;

uniform time: f32;

varying vWorldPos: vec3<f32>;
varying vLocalPos: vec3<f32>;
varying vOrigXZ: vec2<f32>;

${SHARED_WGSL}

@vertex
fn main(input: VertexInputs) -> FragmentInputs {
    let orig = vertexInputs.position;

    let displaced = surfacePosition(
        orig.xz,
        uniforms.time
    );

    let worldPosition = (
        mesh.world * vec4<f32>(displaced, 1.0)
    ).xyz;

    vertexOutputs.vWorldPos = worldPosition;
    vertexOutputs.vLocalPos = displaced;
    vertexOutputs.vOrigXZ = orig.xz;

    vertexOutputs.position =
        scene.viewProjection *
        vec4<f32>(worldPosition, 1.0);
}`;

export {OCEAN_VERT};
