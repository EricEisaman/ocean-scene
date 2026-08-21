import { TERRAIN_HELPERS_COMPUTE } from "./terrainHelpersCompute";
const TERRAIN_HEIGHT_COMPUTE = `@group(0) @binding(0) var heightMap: texture_storage_2d<r32float, write>;
@group(0) @binding(1) var<uniform> u: ComputeUniforms;
${TERRAIN_HELPERS_COMPUTE}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let size = textureDimensions(heightMap); if(id.x >= size.x || id.y >= size.y) { return; }
    let worldXZ = u.chunkOrigin + vec2f(f32(id.x), f32(id.y)) * u.metersPerTexel;
    let h = terrainHeight(worldXZ, u);
    textureStore(heightMap, vec2u(id.xy), vec4f(h, 0.0, 0.0, 0.0));
}`;
export {TERRAIN_HEIGHT_COMPUTE};
