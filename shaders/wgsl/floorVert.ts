// shaders/wgsl/floorVert.ts

const FLOOR_VERT=`#define CUSTOM_VERTEX
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position: vec3<f32>;
attribute uv: vec2<f32>;
varying vWorldPos: vec3<f32>;
varying vUV: vec2<f32>;
varying vNormal: vec3<f32>;
varying vHeight: f32;
varying vSlope: f32;
varying vRidgeMask: f32;

var heightTexture: texture_2d<f32>;
var dataTexture: texture_2d<f32>;
var heightTextureSampler: sampler;
var dataTextureSampler: sampler;

uniform terrainRender: vec4<f32>;
uniform chunkOrigin: vec2<f32>;

@vertex
fn main(input: VertexInputs) -> FragmentInputs {
    let worldXZ = input.position.xz;
    let texUV = (worldXZ - uniforms.chunkOrigin) / uniforms.terrainRender.x;

    let h = textureSampleLevel(heightTexture, heightTextureSampler, texUV, 0.0).r;
    let data = textureSampleLevel(dataTexture, dataTextureSampler, texUV, 0.0);

    // data.rg = normal xz packed 0-1 -> -1 to 1, from your dataCS
    let nx = data.r * 2.0 - 1.0;
    let nz = data.g * 2.0 - 1.0;
    let ny = sqrt(max(0.0, 1.0 - nx*nx - nz*nz));
    let localN = vec3f(nx, ny, nz);

    let localPos = vec3f(input.position.x, h, input.position.z);
    let worldPos = (mesh.world * vec4f(localPos, 1.0)).xyz;
    let worldN = normalize((mesh.world * vec4f(localN, 0.0)).xyz);

    vertexOutputs.vWorldPos = worldPos;
    vertexOutputs.vUV = input.uv;
    vertexOutputs.vNormal = worldN;
    vertexOutputs.vHeight = h;
    vertexOutputs.vSlope = data.b;
    vertexOutputs.vRidgeMask = data.a;
    vertexOutputs.position = scene.viewProjection * vec4f(worldPos, 1.0);
}`;
export {FLOOR_VERT};
