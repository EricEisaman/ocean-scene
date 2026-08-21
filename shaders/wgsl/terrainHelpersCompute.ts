// shaders/wgsl/terrainHelpersCompute.ts

const TERRAIN_HELPERS_COMPUTE = `struct ComputeUniforms {
    chunkOrigin: vec2f,
    textureWorldSize: vec2f,
    metersPerTexel: f32,
    texelDelta: f32,
    seed: f32,
    worldScale: f32,
    baseAmplitude: f32,
    baseFrequency: f32,
    baseOctaves: u32,
    baseGain: f32,
    lacunarity: f32,
    warpStrength: f32,
    warpFrequency: f32,
    ridgeAmplitude: f32,
    ridgeFrequency: f32,
    ridgeSharpness: f32,
    cliffAmount: f32,
    cliffThreshold: f32,
    cliffSoftness: f32,
    valleyAmplitude: f32,
    valleyFrequency: f32,
    seaLevel: f32,
    coastalPlainsPrevalence: f32,
    coastalPlainsWidth: f32,
    coastalPlainsHeight: f32,
    coastalPlainsFalloff: f32,
};
fn hash12(p: vec2f)->f32 { return fract(sin(dot(p, vec2f(127.1,311.7))) * 43758.5453123); }
fn noise2D(p: vec2f)->f32 {
    let i = floor(p); let f = fract(p); let u = f*f*(3.0-2.0*f);
    let a = hash12(i); let b = hash12(i+vec2f(1.0,0.0)); let c = hash12(i+vec2f(0.0,1.0)); let d = hash12(i+vec2f(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y)*2.0-1.0;
}
fn fbm(p0: vec2f, octaves: u32, gain: f32, lacunarity: f32) -> f32 {
    var p = p0; var sum=0.0; var amp=0.5; var norm=0.0;
    for(var i=0u; i<octaves; i++) { sum += amp * noise2D(p); norm += amp; p *= lacunarity; amp *= gain; }
    return sum / max(norm, 0.0001);
}
fn ridgedFbm(p0: vec2f, octaves: u32, gain: f32, lacunarity: f32, sharpness: f32) -> f32 {
    var p = p0; var sum=0.0; var amp=0.5; var norm=0.0; var weight=1.0;
    for(var i=0u; i<octaves; i++) {
        var n = 1.0 - abs(noise2D(p)); n = max(n, 0.0); n = pow(n, sharpness); n *= weight;
        sum += n * amp; norm += amp; weight = clamp(n * 1.8, 0.0, 1.0); p *= lacunarity; amp *= gain;
    }
    return sum / max(norm, 0.0001);
}
fn terrainHeight(worldXZ: vec2f, u: ComputeUniforms) -> f32 {
    let p = worldXZ * u.worldScale;
    let warpX = fbm(p * u.warpFrequency + vec2f(17.13, 91.71), 3u, 0.5, 2.0);
    let warpY = fbm(p * u.warpFrequency + vec2f(63.47, 25.19), 3u, 0.5, 2.0);
    let pw = p + u.warpStrength * vec2f(warpX, warpY);
    let base = fbm(pw * u.baseFrequency, u.baseOctaves, u.baseGain, u.lacunarity);
    let mountainMask = smoothstep(0.05, 0.45, fbm(p * 0.12 + vec2f(113.0, 37.0), 3u, 0.55, 2.0));
    let ridges = ridgedFbm(pw * u.ridgeFrequency, u.baseOctaves, u.baseGain, u.lacunarity, u.ridgeSharpness);
    let valleys = 1.0 - abs(fbm(pw * u.valleyFrequency + vec2f(51.0,73.0), 4u, 0.5, 2.0));
    var h = base * u.baseAmplitude; h += mountainMask * ridges * u.ridgeAmplitude; h -= valleys * u.valleyAmplitude;
    let cliffMask = mountainMask * smoothstep(u.cliffThreshold - u.cliffSoftness, u.cliffThreshold + u.cliffSoftness, ridges);
    let strata = floor(h) + pow(fract(h), 0.32); h = mix(h, strata, u.cliffAmount * cliffMask);
    
    // Coastal plains prevalence - flat low terrain near shore
    if (u.coastalPlainsPrevalence > 0.001) {
        let dist = length(worldXZ);
        let innerRadius = 80.0 + (1.0 - u.coastalPlainsPrevalence) * 280.0;
        let outerRadius = innerRadius + u.coastalPlainsWidth;
        let coastalFactor = smoothstep(innerRadius, outerRadius, dist);
        let lowBias = smoothstep(8.0, -2.0, h);
        let plainsInfluence = coastalFactor * (0.4 + 0.6 * lowBias) * u.coastalPlainsPrevalence;
        let plainsNoise = fbm(worldXZ * 0.015, 3u, 0.5, 2.0) * 0.6;
        let targetPlainsHeight = u.coastalPlainsHeight + plainsNoise;
        h = mix(h, targetPlainsHeight, plainsInfluence * 0.8);
    }
    
    return h - u.seaLevel;
}
`;

export {TERRAIN_HELPERS_COMPUTE};
