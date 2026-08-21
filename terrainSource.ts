// terrainSource.ts - heightmap resolver, decoupled
export type TerrainParams = {
  worldScale: number; baseAmplitude: number; baseFrequency: number; baseOctaves: number; baseGain: number; lacunarity: number;
  warpStrength: number; warpFrequency: number; ridgeAmplitude: number; ridgeFrequency: number; ridgeSharpness: number;
  cliffAmount: number; cliffThreshold: number; cliffSoftness: number; valleyAmplitude: number; valleyFrequency: number; seaLevel: number;
  coastalPlainsPrevalence: number; coastalPlainsWidth: number; coastalPlainsHeight: number; coastalPlainsFalloff: number;
};
export const DEFAULT_TERRAIN_PARAMS: TerrainParams = {
  worldScale: 0.018, baseAmplitude: 2, baseFrequency: 0.2, baseOctaves: 5, baseGain: 0.5, lacunarity: 2.2,
  warpStrength: 1.2, warpFrequency: 0.6, ridgeAmplitude: 100, ridgeFrequency: 1.1, ridgeSharpness: 3.0,
  cliffAmount: 0.35, cliffThreshold: 0.2, cliffSoftness: 0.55, valleyAmplitude: 4, valleyFrequency: 1.0, seaLevel: 0,
  coastalPlainsPrevalence: 0.95, coastalPlainsWidth: 280, coastalPlainsHeight: 1.2, coastalPlainsFalloff: 0.15,
};
const _fract = (x: number) => x - Math.floor(x);
const _mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;
const _smooth = (e0: number, e1: number, x: number) => { const tt = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return tt * tt * (3 - 2 * tt); };
function _hash12(p: { x: number; y: number }) { return _fract(Math.sin(p.x * 127.1 + p.y * 311.7) * 43758.5453123); }
function _noise2D(p: { x: number; y: number }) {
  const i = { x: Math.floor(p.x), y: Math.floor(p.y) }; const f = { x: p.x - i.x, y: p.y - i.y };
  const u = { x: f.x * f.x * (3 - 2 * f.x), y: f.y * f.y * (3 - 2 * f.y) };
  const a = _hash12(i), b = _hash12({ x: i.x + 1, y: i.y }), c = _hash12({ x: i.x, y: i.y + 1 }), d = _hash12({ x: i.x + 1, y: i.y + 1 });
  return _mix(_mix(a, b, u.x), _mix(c, d, u.x), u.y) * 2 - 1;
}
function _fbm(p0: { x: number; y: number }, oct: number, gain: number, lac: number) {
  let p = { ...p0 }, sum = 0, amp = 0.5, norm = 0;
  for (let i = 0; i < oct; i++) { sum += amp * _noise2D(p); norm += amp; p = { x: p.x * lac, y: p.y * lac }; amp *= gain; }
  return sum / Math.max(norm, 0.0001);
}
function _ridged(p0: { x: number; y: number }, oct: number, gain: number, lac: number, sharp: number) {
  let p = { ...p0 }, sum = 0, amp = 0.5, norm = 0, w = 1;
  for (let i = 0; i < oct; i++) { let n = 1 - Math.abs(_noise2D(p)); n = Math.max(n, 0); n = Math.pow(n, sharp) * w; sum += n * amp; norm += amp; w = Math.min(Math.max(n * 1.8, 0), 1); p = { x: p.x * lac, y: p.y * lac }; amp *= gain; }
  return sum / Math.max(norm, 0.0001);
}
function terrainHeightCPU_procedural(worldXZ: { x: number; y: number }, q: TerrainParams) {
  const p = { x: worldXZ.x * q.worldScale, y: worldXZ.y * q.worldScale };
  const warpX = _fbm({ x: p.x * q.warpFrequency + 17.13, y: p.y * q.warpFrequency + 91.71 }, 3, 0.5, 2.0);
  const warpY = _fbm({ x: p.x * q.warpFrequency + 63.47, y: p.y * q.warpFrequency + 25.19 }, 3, 0.5, 2.0);
  const pw = { x: p.x + q.warpStrength * warpX, y: p.y + q.warpStrength * warpY };
  const base = _fbm({ x: pw.x * q.baseFrequency, y: pw.y * q.baseFrequency }, q.baseOctaves, q.baseGain, q.lacunarity);
  const mountainMask = _smooth(0.05, 0.45, _fbm({ x: p.x * 0.12 + 113, y: p.y * 0.12 + 37 }, 3, 0.55, 2.0));
  const ridges = _ridged({ x: pw.x * q.ridgeFrequency, y: pw.y * q.ridgeFrequency }, q.baseOctaves, q.baseGain, q.lacunarity, q.ridgeSharpness);
  const valleys = 1 - Math.abs(_fbm({ x: pw.x * q.valleyFrequency + 51, y: pw.y * q.valleyFrequency + 73 }, 4, 0.5, 2.0));
  let h = base * q.baseAmplitude + mountainMask * ridges * q.ridgeAmplitude - valleys * q.valleyAmplitude;
  const cliffMask = mountainMask * _smooth(q.cliffThreshold - q.cliffSoftness, q.cliffThreshold + q.cliffSoftness, ridges);
  const strata = Math.floor(h) + Math.pow(h - Math.floor(h), 0.32);
  h = _mix(h, strata, q.cliffAmount * cliffMask);
  const prevalence = q.coastalPlainsPrevalence ?? 0.65;
  if (prevalence > 0.001) {
    const width = q.coastalPlainsWidth ?? 280; const plainsHeight = q.coastalPlainsHeight ?? 1.2;
    const dist = Math.hypot(worldXZ.x, worldXZ.y); const innerRadius = 80 + (1 - prevalence) * 280; const outerRadius = innerRadius + width;
    const coastalFactor = _smooth(innerRadius, outerRadius, dist); const lowBias = _smooth(8, -2, h);
    const plainsInfluence = coastalFactor * (0.4 + 0.6 * lowBias) * prevalence;
    const plainsNoise = _fbm({ x: worldXZ.x * 0.015, y: worldXZ.y * 0.015 }, 3, 0.5, 2.0) * 0.6;
    const targetPlainsHeight = plainsHeight + plainsNoise; h = _mix(h, targetPlainsHeight, plainsInfluence * 0.8);
  }
  return h - q.seaLevel;
}
export type TerrainSource =
  | { type: 'procedural'; params?: Partial<TerrainParams> }
  | { type: 'imageUrl'; url: string; scale?: number; offset?: number; invert?: boolean; channel?: 'r'|'g'|'b'|'luminance' }
  | { type: 'imageFile'; file: File; scale?: number; offset?: number; invert?: boolean; channel?: 'r'|'g'|'b'|'luminance' }
  | { type: 'raw'; data: Float32Array; width: number; height: number; scale?: number; offset?: number }
  | { type: 'canvas'; canvas: HTMLCanvasElement; scale?: number; offset?: number; invert?: boolean; channel?: 'r'|'g'|'b'|'luminance' }
  | { type: 'function'; fn: (x: number, z: number) => number; scale?: number; offset?: number };
export type ResolvedTerrain = { heights: Float32Array; width: number; height: number; source: TerrainSource; };
function getChannelValue(data: Uint8ClampedArray, idx: number, channel: string): number {
  const r = data[idx]; const g = data[idx + 1]; const b = data[idx + 2];
  if (channel === 'r') return r / 255; if (channel === 'g') return g / 255; if (channel === 'b') return b / 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
async function canvasToHeights(canvas: HTMLCanvasElement, texSize: number, scale: number, offset: number, invert: boolean, channel: string): Promise<Float32Array> {
  const off = document.createElement('canvas'); off.width = texSize; off.height = texSize;
  const ctx = off.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(canvas, 0, 0, texSize, texSize);
  const imgData = ctx.getImageData(0, 0, texSize, texSize); const out = new Float32Array(texSize * texSize);
  for (let i = 0, j = 0; i < imgData.data.length; i += 4, j++) { let v = getChannelValue(imgData.data, i, channel); if (invert) v = 1 - v; out[j] = v * scale + offset; }
  return out;
}
async function imageElementToHeights(img: HTMLImageElement, texSize: number, scale: number, offset: number, invert: boolean, channel: string): Promise<Float32Array> {
  const c = document.createElement('canvas'); c.width = texSize; c.height = texSize;
  const ctx = c.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(img, 0, 0, texSize, texSize);
  const imgData = ctx.getImageData(0, 0, texSize, texSize); const out = new Float32Array(texSize * texSize);
  for (let i = 0, j = 0; i < imgData.data.length; i += 4, j++) { let v = getChannelValue(imgData.data, i, channel); if (invert) v = 1 - v; out[j] = v * scale + offset; }
  return out;
}
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => resolve(img); img.onerror = (e) => reject(e); img.src = url; });
}
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const url = URL.createObjectURL(file); const img = new Image(); img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); }; img.src = url; });
}
function resampleRawToSize(src: Float32Array, srcW: number, srcH: number, dstSize: number, scale: number, offset: number): Float32Array {
  const out = new Float32Array(dstSize * dstSize); const xRatio = srcW / dstSize; const yRatio = srcH / dstSize;
  for (let y = 0; y < dstSize; y++) { for (let x = 0; x < dstSize; x++) {
    const sx = x * xRatio; const sy = y * yRatio; const ix = sx | 0; const iy = sy | 0; const tx = sx - ix; const ty = sy - iy;
    const ix1 = Math.min(ix + 1, srcW - 1); const iy1 = Math.min(iy + 1, srcH - 1);
    const h00 = src[iy * srcW + ix]; const h10 = src[iy * srcW + ix1]; const h01 = src[iy1 * srcW + ix]; const h11 = src[iy1 * srcW + ix1];
    const h = (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
    out[y * dstSize + x] = h * scale + offset; } }
  return out;
}
export async function resolveTerrainHeights(source: TerrainSource | undefined, texSize: number, textureWorldSize: number, chunkOrigin: BABYLON.Vector2, metersPerTexel: number): Promise<ResolvedTerrain> {
  const src: TerrainSource = source ?? { type: 'procedural' };
  if (src.type === 'procedural') {
    const params = { ...DEFAULT_TERRAIN_PARAMS, ...(src.params ?? {}) };
    const heights = new Float32Array(texSize * texSize);
    for (let y = 0; y < texSize; y++) { for (let x = 0; x < texSize; x++) {
      const worldXZ = { x: chunkOrigin.x + x * metersPerTexel, y: chunkOrigin.y + y * metersPerTexel };
      heights[y * texSize + x] = terrainHeightCPU_procedural(worldXZ, params); } }
    return { heights, width: texSize, height: texSize, source: src };
  }
  if (src.type === 'function') {
    const heights = new Float32Array(texSize * texSize); const fn = src.fn; const s = src.scale ?? 1;
    for (let y = 0; y < texSize; y++) { for (let x = 0; x < texSize; x++) {
      const worldX = chunkOrigin.x + x * metersPerTexel; const worldZ = chunkOrigin.y + y * metersPerTexel;
      heights[y * texSize + x] = fn(worldX, worldZ) * s; } }
    return { heights, width: texSize, height: texSize, source: src };
  }
  if (src.type === 'raw') {
    const scale = src.scale ?? 1; const offset = src.offset ?? 0; let heights: Float32Array;
    if (src.width === texSize && src.height === texSize) { heights = new Float32Array(texSize * texSize); for (let i = 0; i < heights.length; i++) heights[i] = src.data[i] * scale + offset; }
    else { heights = resampleRawToSize(src.data, src.width, src.height, texSize, scale, offset); }
    return { heights, width: texSize, height: texSize, source: src };
  }
  if (src.type === 'canvas') {
    const scale = src.scale ?? 50; const offset = src.offset ?? -5; const invert = src.invert ?? false; const channel = src.channel ?? 'luminance';
    const heights = await canvasToHeights(src.canvas, texSize, scale, offset, invert, channel);
    return { heights, width: texSize, height: texSize, source: src };
  }
  if (src.type === 'imageFile') {
    const scale = src.scale ?? 50; const offset = src.offset ?? -5; const invert = src.invert ?? false; const channel = src.channel ?? 'luminance';
    const img = await fileToImage(src.file); const heights = await imageElementToHeights(img, texSize, scale, offset, invert, channel);
    return { heights, width: texSize, height: texSize, source: src };
  }
  if (src.type === 'imageUrl') {
    const scale = src.scale ?? 50; const offset = src.offset ?? -5; const invert = src.invert ?? false; const channel = src.channel ?? 'luminance';
    const img = await loadImage(src.url); const heights = await imageElementToHeights(img, texSize, scale, offset, invert, channel);
    return { heights, width: texSize, height: texSize, source: src };
  }
  return resolveTerrainHeights({ type: 'procedural' }, texSize, textureWorldSize, chunkOrigin, metersPerTexel);
}
export function createHeightTexture(scene: BABYLON.Scene, heights: Float32Array, size: number): BABYLON.RawTexture {
  return BABYLON.RawTexture.CreateRTexture(heights, size, size, scene, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE, BABYLON.Constants.TEXTURETYPE_FLOAT);
}



// ---- UI helper: simple file drop + URL input ----
export function attachHeightmapUI(
  onSource: (src: TerrainSource) => void,
  container?: HTMLElement
) {
  const root = container ?? document.body;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;top:12px;left:12px;z-index:9999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);padding:12px 14px;border-radius:12px;color:white;font-family:system-ui,sans-serif;font-size:12px;max-width:300px;';
  wrapper.innerHTML = `
    <div style="font-weight:600;margin-bottom:8px;">Terrain Heightmap</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span>Image URL (grayscale)</span>
        <input id="hm-url" placeholder="https://.../heightmap.png" style="padding:6px 8px;border-radius:6px;border:none;background:rgba(255,255,255,0.12);color:white;" />
      </label>
      <button id="hm-load-url" style="padding:6px;border-radius:6px;border:none;background:#3b82f6;color:white;cursor:pointer;">Load URL</button>
      <label style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
        <span>Or upload file</span>
        <input id="hm-file" type="file" accept="image/*" style="color:white;" />
      </label>
      <div style="display:flex;gap:6px;margin-top:4px;">
        <label style="flex:1;">Scale <input id="hm-scale" type="number" value="50" style="width:100%;padding:4px;border-radius:4px;border:none;background:rgba(255,255,255,0.12);color:white;"></label>
        <label style="flex:1;">Offset <input id="hm-offset" type="number" value="-5" style="width:100%;padding:4px;border-radius:4px;border:none;background:rgba(255,255,255,0.12);color:white;"></label>
      </div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:4px;">
        <input id="hm-invert" type="checkbox" /> Invert
      </label>
      <button id="hm-procedural" style="margin-top:6px;padding:6px;border-radius:6px;border:none;background:rgba(255,255,255,0.15);color:white;cursor:pointer;">Back to Procedural Noise</button>
      <div style="opacity:0.7;font-size:11px;margin-top:4px;">Tip: you can also call <code>window.setCustomHeightmap(url)</code> or pass <code>?heightmap=URL</code> in query.</div>
    </div>
  `;
  root.appendChild(wrapper);

  const urlInput = wrapper.querySelector('#hm-url') as HTMLInputElement;
  const scaleInput = wrapper.querySelector('#hm-scale') as HTMLInputElement;
  const offsetInput = wrapper.querySelector('#hm-offset') as HTMLInputElement;
  const invertInput = wrapper.querySelector('#hm-invert') as HTMLInputElement;

  const getOpts = () => ({
    scale: parseFloat(scaleInput.value) || 50,
    offset: parseFloat(offsetInput.value) || 0,
    invert: invertInput.checked,
  });

  wrapper.querySelector('#hm-load-url')!.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) return;
    const o = getOpts();
    onSource({ type: 'imageUrl', url, scale: o.scale, offset: o.offset, invert: o.invert });
  });

  wrapper.querySelector('#hm-file')!.addEventListener('change', (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const o = getOpts();
    onSource({ type: 'imageFile', file, scale: o.scale, offset: o.offset, invert: o.invert });
  });

  wrapper.querySelector('#hm-procedural')!.addEventListener('click', () => {
    onSource({ type: 'procedural' });
  });

  return wrapper;
}

