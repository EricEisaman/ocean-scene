
// skyConfig.ts - Top level sky configuration for switchable skies
// Supports overcast (original) and tropical sunny (DaySkyHDRI027B_1K)

export type SkyVariantId = 'overcast' | 'tropicalSunny';

export const SKY_CONFIG = {
  overcast: {
    id: 'overcast' as const,
    label: 'Overcast Moonlight (original)',
    skybox: {
      type: 'default' as const,
      // Babylon playground default skybox - looks for textures/skybox_px etc
      root: 'textures/skybox',
    },
    celestial: {
      type: 'moon' as const,
      diameter: 65,
      texture: 'https://raw.githubusercontent.com/EricEisaman/assets/main/images/moontex.jpg',
      position: { x: 100, y: 360, z: 460 },
      scale: 0.6,
      emissiveTextureInvertU: true,
    },
    lensFlares: {
      enabled: true,
      borderLimit: 0,
      colors: [
        { size: 0.6, pos: 0, color: { r: 1, g: 1, b: 1 } },
        { size: 0.2, pos: 0.2, color: { r: 1, g: 0.9, b: 0.8 } },
        { size: 0.12, pos: 0.45, color: { r: 0.8, g: 0.56, b: 0.72 } },
        { size: 0.18, pos: -0.15, color: { r: 0.71, g: 0.8, b: 0.95 } },
        { size: 0.25, pos: -0.4, color: { r: 0.95, g: 0.89, b: 0.71 } },
      ]
    },
    godrays: {
      exposure: 0.2,
      decay: 0.97,
      weight: 0.1,
      density: 0.96,
      sampleCount: 75,
    },
    light: {
      intensity: 0.5,
      direction: { x: 0, y: 1.0, z: 0.8 },
    }
  },

  tropicalSunny: {
    id: 'tropicalSunny' as const,
    label: 'Tropical Sunny - DaySkyHDRI027B_1K',
    // Source: EricEisaman/assets/tree/main/images/skies/DaySkyHDRI027B_1K/cubemap
    // Poly Haven DaySkyHDRI027B_1K converted via https://matheowis.github.io/HDRI-to-CubeMap/
    // Expected files in that folder: px.jpg, nx.jpg, py.jpg, ny.jpg, pz.jpg, nz.jpg
    // (converter outputs exactly those six names)
    skybox: {
      type: 'cubemap' as const,
      baseUrl: 'https://raw.githubusercontent.com/EricEisaman/assets/main/images/skies/DaySkyHDRI027B_1K/cubemap/',
      // Raw file map - keep both naming conventions in case repo uses prefixed names
      files: {
        px: 'px.png',
        nx: 'nx.png',
        py: 'py.png',
        ny: 'ny.png',
        pz: 'pz.png',
        nz: 'nz.png',
        // alt naming fallback if files are prefixed like DaySkyHDRI027B_1K_px.jpg
        alt_px: 'DaySkyHDRI027B_1K_px.jpg',
        alt_nx: 'DaySkyHDRI027B_1K_nx.jpg',
        alt_py: 'DaySkyHDRI027B_1K_py.jpg',
        alt_ny: 'DaySkyHDRI027B_1K_ny.jpg',
        alt_pz: 'DaySkyHDRI027B_1K_pz.jpg',
        alt_nz: 'DaySkyHDRI027B_1K_nz.jpg',
      },
      // Babylon CubeTexture.CreateFromImages expects order: px, py, pz, nx, ny, nz
      // See: Babylon docs - array ["_px.png","_py.png","_pz.png","_nx.png","_ny.png","_nz.png"]
      orderedFiles: [
        'https://raw.githubusercontent.com/EricEisaman/assets/main/images/skies/DaySkyHDRI027B_1K/cubemap/px.png',
        'https://raw.githubusercontent.com/EricEisaman/assets/main/images/skies/DaySkyHDRI027B_1K/cubemap/py.png',
        'https://raw.githubusercontent.com/EricEisaman/assets/main/images/skies/DaySkyHDRI027B_1K/cubemap/pz.png',
        'https://raw.githubusercontent.com/EricEisaman/assets/main/images/skies/DaySkyHDRI027B_1K/cubemap/nx.png',
        'https://raw.githubusercontent.com/EricEisaman/assets/main/images/skies/DaySkyHDRI027B_1K/cubemap/ny.png',
        'https://raw.githubusercontent.com/EricEisaman/assets/main/images/skies/DaySkyHDRI027B_1K/cubemap/nz.png',
      ] as const,
      // For new BABYLON.CubeTexture(root, scene, extensions) fallback
      extensions: ['_px.jpg', '_nx.jpg', '_py.jpg', '_ny.jpg', '_pz.jpg', '_nz.jpg'] as const,
      size: 2000,
    },
    celestial: {
      type: 'sun' as const,
      diameter: 75,
      // Sunny - no moon texture, use warm emissive color
      emissiveColor: { r: 1.0, g: 0.93, b: 0.72 },
      position: { x: 280, y: 480, z: -180 },
      scale: 0.9,
    },
    lensFlares: {
      enabled: true,
      borderLimit: 50,
      viewportBorder: 50,
      colors: [
        // warmer, brighter for sun
        { size: 0.8, pos: 0, color: { r: 1, g: 1, b: 0.85 } },
        { size: 0.35, pos: 0.15, color: { r: 1, g: 0.95, b: 0.6 } },
        { size: 0.18, pos: 0.35, color: { r: 1, g: 0.8, b: 0.5 } },
        { size: 0.22, pos: -0.2, color: { r: 0.8, g: 0.9, b: 1.0 } },
        { size: 0.3, pos: -0.45, color: { r: 1, g: 0.9, b: 0.7 } },
      ]
    },
    godrays: {
      exposure: 0.38,
      decay: 0.96,
      weight: 0.52,
      density: 0.88,
      sampleCount: 100,
    },
    light: {
      // Bright tropical sun
      intensity: 1.15,
      direction: { x: -0.35, y: 1.0, z: -0.25 },
      diffuse: { r: 1.0, g: 0.98, b: 0.92 },
      specular: { r: 1.0, g: 1.0, b: 0.95 },
    },
    fog: {
      // lighter, less dense for sunny
      clearColor: { r: 0.52, g: 0.78, b: 0.97, a: 1.0 },
    }
  }
} as const;

export type SkyConfig = typeof SKY_CONFIG;
export const DEFAULT_SKY_VARIANT: SkyVariantId = 'tropicalSunny';
