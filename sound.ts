// sound.ts - all SFX + ambience
import { OCEAN_CONFIG } from "./oceanConfig";

export type SoundSystem = {
  submergeSfx: BABYLON.Sound,
  submergedSfx: BABYLON.Sound,
  emergeSfx: BABYLON.Sound,
  getOvercast: () => BABYLON.Sound | null,
  handleWaterCross: (e: { to: string, time: number }) => void,
  update: (isAbove: boolean) => void,
  dispose: () => void
};

export function setupSound(scene: BABYLON.Scene, canvas: HTMLCanvasElement): SoundSystem {
  const submergeSfx = new BABYLON.Sound("submerge", OCEAN_CONFIG.audio.submerge, scene, null, {
    volume: 0.9, loop: false, autoplay: false
  });
  const submergedSfx = new BABYLON.Sound("submerged", OCEAN_CONFIG.audio.submerged, scene, null, {
    volume: 0.5, loop: true, autoplay: false
  });
  const emergeSfx = new BABYLON.Sound("emerge", OCEAN_CONFIG.audio.emerge, scene, null, {
    volume: 0.9, loop: false, autoplay: false
  });

  let overcast: BABYLON.Sound | null = null;
  let audioStarted = false;
  let lastSplash = 0;

  const onCanvasClick = async () => {
    if (audioStarted) return;
    audioStarted = true;
    await BABYLON.Engine.audioEngine?.unlock();
    overcast = new BABYLON.Sound(
      "overcast",
      "https://raw.githubusercontent.com/EricEisaman/assets/main/audio/ambience/Overcast.mp3",
      scene,
      () => { overcast!.play(); },
      { autoplay: false, loop: true, volume: 0.38 }
    );
  };
  canvas.addEventListener("click", onCanvasClick);

  const handleWaterCross = (e: { to: string, time: number }) => {
    if (e.time - lastSplash < 0.6) return;
    lastSplash = e.time;
    if (e.to === "below") {
      emergeSfx.stop();
      submergeSfx.play();
    } else {
      submergeSfx.stop();
      emergeSfx.play();
    }
  };

  const update = (isAbove: boolean) => {
    if (isAbove) {
      if (overcast && (overcast as any).isPaused) (overcast as any).play();
      if (submergedSfx.isPlaying) submergedSfx.pause();
    } else {
      if (overcast &&!(overcast as any).isPaused) (overcast as any).pause();
      if (!submergedSfx.isPlaying) submergedSfx.play();
    }
  };

  const dispose = () => {
    canvas.removeEventListener("click", onCanvasClick);
  };

  return {
    submergeSfx,
    submergedSfx,
    emergeSfx,
    getOvercast: () => overcast,
    handleWaterCross,
    update,
    dispose
  };
}
