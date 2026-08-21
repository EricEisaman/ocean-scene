// oceanConfig.ts
// Shared config for all ocean alternatives.

import {
    TERRAIN_CONFIG
} from "./terrainConfig";

export type OceanSample = {
    paramX: number;paramZ: number;
    position: BABYLON.Vector3;
    normal: BABYLON.Vector3;
    velocity: BABYLON.Vector3;
    jacobian: number;
};

export const OCEAN_CONFIG = {
    ocean: {
        width: 1000,
        height: 1000,
        subdivisions: 400,
        baseY: 1.5,
        depth: {
            shallowColor: new BABYLON.Color4(0.14, 0.52, 0.74, 0.85),
            deepColor: new BABYLON.Color4(0.03, 0.21, 0.29, 0.95),
            waterDepth: 1.0,
            worldSpaceDepth: 0.35,
            shoreFade: 0.35,
            shoreFadeSmoothness: 2.2,
            distanceMaskStart: 22,
            distanceMaskFade: 45,
        },
        surfaceFoam: {
            enabled: true,
            color: new BABYLON.Color4(0.92, 0.97, 1.0, 0.10),
            alphaBlend: 0.5,
            invert: 0,
            pan: {
                x: 0.008,
                y: 0.006
            },
            scale: 3.2,
            tile: {
                x: 1,
                y: 1
            },
            edge: 0.12,
            edgeSmooth: 0.90,
            lodNear: 2.2,
            lodFar: 3.0,
            lodDistance: 100,
            secondScale: 1.6,
            remapBase: 0.12,
            remapRange: 0.32,
            secondRemapBase: 0.08,
            secondRemapRange: 0.22,
            blend: 0.58
        },
        surfaceDistortion: {
            scale: 1.0,
            strength: 2.0,
            pan: {
                x: 0.6,
                y: 0.4
            }
        },
        intersectionFoam: {
            enabled: true,
            color: new BABYLON.Color4(0.96, 0.98, 1.0, 0.65),
            width: 0.6,
            dissolve: 0.42,
            invert: 0,
            scale: 0.85,
            tile: {
                x: 1,
                y: 1
            },
            pan: {
                x: 0.0008,
                y: 0.0005
            },
            distortion: 0.06,
            smooth: 0.48,
            gradientDissolve: 0.88,
            edgeFade: 0.92
        },
        shoreline: {
            enabled: false,
            color: new BABYLON.Color4(1, 1, 1, 0.75),
            waterDepth: 2,
            speed: 0.05,
            amount: 5,
            thickness: 2,
            centerMask: 0.5,
            centerMaskFade: 0,
            dissolve: 0.7,
            gradientDissolve: 0,
            maskPan: {
                x: 0.01,
                y: 0
            },
            maskScale: 4,
            maskTile: {
                x: 1,
                y: 1
            },
            enableTrail: 1,
            trailFade: 1
        },
        underwater: {
            enabled: false,
            depth: -4,
            conformToGeometry: 1,
            color: new BABYLON.Color4(0, 0, 0, 0.6),
            scaleModifier: 0,
            start: 2,
            fade: 8
        },
        normal: {
            enabled: true,
            strength: 0.14,
            pan: 0.03,
            scale: 2.4,
            distanceStrength: 0.02
        },
        lighting: {
            sunDir: {
                x: 0.35,
                y: 0.85,
                z: -0.28
            },
            shadowColor: new BABYLON.Color4(0.15, 0.18, 0.22, 0.9),
            specularColor: new BABYLON.Color4(1, 1, 1, 0.9),
            specularSpread: 0.65,
            specularHardness: 0.25,
            specularSize: 0.28
        },
        reflection: {
            enabled: true,
            strength: 0.44,
            fresnel: 3.2,
            distortion: 0.04
        },
        refraction: {
            enabled: true,
            strength: 0.18,
            distanceStrength: 0.015,
            distanceFade: 28
        },
        caustics: {
            enabled: true,
            depth: -0.8,
            pan: 0.03,
            scale: 0.68,
            strength: 0.8,
            distortionStrength: 0.7,
            distortionScale: 1.2,
            start: 2,
            fade: 22
        },
        waves: {
            enabled: true,
            topColor: new BABYLON.Color4(0.68, 0.86, 1.0, 0.95),
            wave1: {
                length: 32,
                height: 1.1,
                speed: 0.45,
                direction: {
                    x: 1,
                    y: 0,
                    z: 0.3
                },
                sharpness: 0.52
            },
            wave2: {
                length: 16,
                height: 0.06,
                speed: 0.28,
                direction: {
                    x: -0.7,
                    y: 0,
                    z: 0.7
                },
                sharpness: 0.55
            }
        },
    },
    fog: {
        underwaterColor: {
            r: 0.02,
            g: 0.54,
            b: 0.72
        },
        density: 0.00016,
        transitionDepth: 0.5
    },
    material: {
        foamStrength: 0.25,
        causticStrength: 0.75
    },
    textures: {
        seabed: TERRAIN_CONFIG.textures.seabed,
        foam: TERRAIN_CONFIG.textures.foam
    },
    audio: {
        submerge: "https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/submerge.mp3",
        submerged: "https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/submerged.mp3",
        emerge: "https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/emerge.mp3",
    },
    boat: {
        asset: "https://raw.githubusercontent.com/EricEisaman/assets/main/items/boats/fishing_boat.glb"
    }
};
