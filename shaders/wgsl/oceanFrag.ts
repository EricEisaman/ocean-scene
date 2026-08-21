// shaders/wgsl/oceanFrag.ts

import { SHARED_WGSL } from "./sharedWGSL";

const OCEAN_FRAG=`#include<sceneUboDeclaration>

varying vWorldPos: vec3<f32>;
varying vLocalPos: vec3<f32>;
varying vOrigXZ: vec2<f32>;

uniform time: f32;
uniform cameraPosition: vec3<f32>;
uniform foamStrength: f32;
uniform causticStrength: f32;
uniform isUnderwater: f32;
uniform waterHeightAtCamera: f32;

${SHARED_WGSL}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let worldPosition = fragmentInputs.vWorldPos;
    let localPosition = fragmentInputs.vLocalPos;
    let p = fragmentInputs.vOrigXZ;

    let cameraToSurface = worldPosition - uniforms.cameraPosition;
    let distanceToCamera = length(cameraToSurface);
    let viewDirection = normalize(-cameraToSurface);

    let baseNormal = surfaceNormal(p, uniforms.time);
    let farNormalFade = smoothstep(42.0, 145.0, distanceToCamera);

    var N0 = normalize(
        mix(
            baseNormal,
            vec3<f32>(0.0, 1.0, 0.0),
            farNormalFade * 0.76
        )
    );

    let jacobian = surfaceJacobian(p, uniforms.time);
    var N = N0;

    if (dot(baseNormal, viewDirection) < 0.0) {
        N = -N0;
    }

    if (dot(N, viewDirection) < 0.0) {
        N = -N;
    }

    let sunDirection = normalize(vec3<f32>(-0.22, 0.70, 0.68));
    let deepWaterColor = vec3<f32>(0.008, 0.05, 0.075);

    var finalColor: vec3<f32>;
    var oceanAlpha: f32;

    if (uniforms.isUnderwater > 0.5) {
        let eyeDepth = max(
            0.0,
            uniforms.waterHeightAtCamera - uniforms.cameraPosition.y
        );

        let edgeFade = 1.0 - smoothstep(
            350.0,
            500.0,
            length(fragmentInputs.vOrigXZ)
        );

        let F = schlickFresnel(N, viewDirection, 0.02037);
        let refrDir = refract(-viewDirection, N, WATER_IOR);

        var skyThrough = vec3<f32>(0.02, 0.15, 0.25);

        if (dot(refrDir, refrDir) > 0.001) {
            skyThrough = skyColor(refrDir);
        }

        let waterTint = vec3<f32>(0.12, 0.48, 0.55);

        var col = mix(
            mix(skyThrough * 1.25, waterTint, 0.15),
            deepWaterColor * 0.6,
            F
        );

        col = mix(
            vec3<f32>(0.02, 0.34, 0.52),
            col,
            exp(-distanceToCamera * 0.032 - eyeDepth * 0.15)
        );

        finalColor = col;

        oceanAlpha = clamp(
            mix(0.18, 0.88, F) * edgeFade,
            0.15,
            0.90
        );
    } else {
        let reflectedDirection = reflect(-viewDirection, N);
        let refractedDirection = refract(
            -viewDirection,
            N,
            1.0 / WATER_IOR
        );

        let reflectionColor = skyColor(reflectedDirection) * 0.4;
        let transmittedSky = skyColor(refractedDirection);

        let waterMid = vec3<f32>(0.06, 0.28, 0.38);

        let refractionColor =
            mix(
                deepWaterColor,
                waterMid,
                clamp(N.y, 0.0, 1.0) * 0.1
            ) +
            transmittedSky * vec3<f32>(0.06, 0.38, 0.46);

        let fresnel = schlickFresnel(N, viewDirection, 0.02037);

        var color = mix(
            refractionColor,
            reflectionColor,
            fresnel
        );

        let halfVector = normalize(viewDirection + sunDirection);

        let causticValue = caustics(
            worldPosition,
            N,
            uniforms.time,
            uniforms.causticStrength
        );

        let stormFoam = foamPotential(
            p,
            localPosition.y,
            N,
            jacobian,
            uniforms.time,
            uniforms.foamStrength
        );

        color +=
            vec3<f32>(0.06, 0.30, 0.34) *
            causticValue *
            (1.0 - fresnel) *
            0.36;

        let visibleFoam = stormFoam;
        let softFoam = pow(visibleFoam, 0.65);

        color = mix(
            color,
            vec3<f32>(0.96, 0.98, 1.0),
            softFoam * 0.85
        );

        color += vec3<f32>(0.1, 0.15, 0.15) * softFoam * 0.1;

        let crestGlint =
            pow(max(dot(N, halfVector), 0.0), 42.0) *
            smoothstep(0.18, 0.72, 1.0 - jacobian) *
            visibleFoam;

        color += vec3<f32>(0.34, 0.48, 0.52) * crestGlint * 0.42;

        oceanAlpha = mix(0.77, 0.96, fresnel);

        let horizonFog = smoothstep(
            180.0,
            720.0,
            distanceToCamera
        );

        color = mix(
            color,
            skyColor(viewDirection),
            horizonFog * 0.38
        );

        color = pow(
            max(color, vec3<f32>(0.0)),
            vec3<f32>(0.76)
        );

        finalColor = color;
    }

    fragmentOutputs.color = vec4<f32>(finalColor, oceanAlpha);
}`;

export {OCEAN_FRAG};
