import { TERRAIN_HELPERS_COMPUTE } from "./terrainHelpersCompute";
const TERRAIN_DATA_COMPUTE = `${TERRAIN_HELPERS_COMPUTE}
@group(0) @binding(0) var heightMap: texture_2d<f32>;
@group(0) @binding(1) var dataMap: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> u: ComputeUniforms;
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let size = textureDimensions(heightMap); if(id.x >= size.x || id.y >= size.y) { return; }
    let p = vec2i(id.xy);
    let hL = textureLoad(heightMap, p - vec2i(1,0), 0).r; let hR = textureLoad(heightMap, p + vec2i(1,0), 0).r;
    let hD = textureLoad(heightMap, p - vec2i(0,1), 0).r; let hU = textureLoad(heightMap, p + vec2i(0,1), 0).r;
    let dx = hL - hR; let dz = hD - hU; let n = normalize(vec3f(dx, 2.0 * u.metersPerTexel, dz));
    let slope = 1.0 - n.y;
    let worldXZ = u.chunkOrigin + vec2f(f32(id.x), f32(id.y)) * u.metersPerTexel;
    let ridgeMask = ridgedFbm(worldXZ * u.worldScale * u.ridgeFrequency, 3u, 0.5, 2.0, u.ridgeSharpness);
    textureStore(dataMap, vec2u(p), vec4f(n.x, n.z, slope, ridgeMask));
}`;
export {TERRAIN_DATA_COMPUTE};
