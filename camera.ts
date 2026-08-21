// camera.ts - standard free cam + smooth boat follow (toggle with 1)
import { OCEAN_CONFIG } from "./oceanConfig";

export type CameraMode = 'standard' | 'boatFollow';

export type CameraSystem = {
  camera: BABYLON.FreeCamera,
  underwaterLens: BABYLON.LensRenderingPipeline,
  yawSpeed: number,
  getMode: () => CameraMode,
  toggleMode: () => void,
  setFollowTarget: (target: BABYLON.TransformNode) => void,
  isDolphinMode: () => boolean,
  update: (opts: {
    time: number,
    deltaSeconds: number,
    ground: BABYLON.Mesh,
    getWaterHeight: (x: number, z: number, t: number) => number,
    getGroundHeight: (x: number, z: number) => number
  }) => { isAbove: boolean, underwaterAmount: number },
  dispose: () => void
};

export function createCameraSystem(scene: BABYLON.Scene, canvas: HTMLCanvasElement): CameraSystem {
  const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(58.97, 4.78, 11.66), scene);
  camera.setTarget(new BABYLON.Vector3(38.68, 6.46, 6.31));
  camera.attachControl(canvas, true);
  camera.minZ = 0.1;
  camera.maxZ = 5000.0;
  camera.speed = 0.7;
  camera.keysUp.push(87); // W
  camera.keysDown.push(83); // S

  const yawSpeed = 0.7;

  const underwaterFogColor = new BABYLON.Color3(
    OCEAN_CONFIG.fog.underwaterColor.r,
    OCEAN_CONFIG.fog.underwaterColor.g,
    OCEAN_CONFIG.fog.underwaterColor.b
  );
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor.copyFrom(underwaterFogColor);
  scene.fogDensity = 0.0;

  const underwaterLens = new BABYLON.LensRenderingPipeline(
    "underwaterLens",
    {
      edge_blur: 0.0, chromatic_aberration: 0.5, distortion: 0.0,
      dof_focus_distance: 1000.0, dof_aperture: 0.0, dof_darken: 0.0,
      dof_pentagon: false, dof_gain: 0.1, dof_threshold: 1.0,
      grain_amount: 0.0, blur_noise: false
    },
    scene, 0.5, [camera]
  );

  // ---- standard mode state ----
  let dolphinMode = false;
  let cameraRotationAnimatable: BABYLON.Animatable | null = null;
  let lensAttached = true;
  let rotateLeft = false;
  let rotateRight = false;

  const stopRotationX = () => {
    if (cameraRotationAnimatable) {
      cameraRotationAnimatable.stop();
      cameraRotationAnimatable = null;
    }
  };

  const animateRotationXToZero = () => {
    if (cameraRotationAnimatable !== null) return;
    if (Math.abs(camera.rotation.x) < 0.0001) { camera.rotation.x = 0.0; return; }
    const easing = new BABYLON.CubicEase();
    easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
    const anim = BABYLON.Animation.CreateAndStartAnimation(
      "cameraRotationXToZero", camera, "rotation.x", 60, 60,
      camera.rotation.x, 0.0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, easing
    );
    cameraRotationAnimatable = anim;
    anim!.onAnimationEndObservable.addOnce(() => {
      camera.rotation.x = 0.0;
      cameraRotationAnimatable = null;
    });
  };

  const setDOFEnabled = (enabled: boolean) => {
    if (enabled === lensAttached) return;
    if (enabled) {
      scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("underwaterLens", camera);
    } else {
      scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("underwaterLens", camera);
    }
    lensAttached = enabled;
  };

  // ---- follow mode state (inspired by SmoothFollowCameraController) ----
  let mode: CameraMode = 'standard';
  let followTarget: BABYLON.TransformNode | null = null;
  let followOffset = new BABYLON.Vector3(0, 6, -16); // behind + up in boat local space
  let followLookAtOffset = new BABYLON.Vector3(0, 2.0, 2.0); // look slightly forward of boat center
  let followSmoothing = 0.08; // lerp factor
  let orbitYaw = 0; // user orbit around boat
  let orbitPitch = 0.15; // slight pitch
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  const dragSensitivity = 0.005;
  const zoomMin = 4;
  const zoomMax = 40;

  const setFollowTarget = (target: BABYLON.TransformNode) => {
    followTarget = target;
  };

  const getMode = () => mode;

  const toggleMode = () => {
    if (mode === 'standard') {
      mode = 'boatFollow';
      // detach free cam controls so WASD doesn't move camera
      camera.detachControl();
      // reset orbit
      orbitYaw = 0;
      console.log("Camera: Boat Follow Mode [1 to toggle, drag to orbit, wheel to zoom]");
    } else {
      mode = 'standard';
      camera.attachControl(canvas, true);
      camera.lockedTarget = null;
      console.log("Camera: Standard Free Mode [1 to toggle]");
    }
  };

  // ---- input ----
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Digit1" && !e.repeat) {
      toggleMode();
      return;
    }
    if (mode === 'boatFollow') return; // no free cam keys in follow
    if (e.code === "KeyA") rotateLeft = true;
    if (e.code === "KeyD") rotateRight = true;
    if (e.code !== "KeyJ" || e.repeat) return;
    dolphinMode = !dolphinMode;
    camera.speed = dolphinMode ? 0.4 : 0.7;
    if (dolphinMode) stopRotationX();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (mode === 'boatFollow') return;
    if (e.code === "KeyJ") { dolphinMode = false; camera.speed = 0.7; }
    if (e.code === "KeyA") rotateLeft = false;
    if (e.code === "KeyD") rotateRight = false;
  };

  // follow mode drag orbit (like Game Starter)
  const onPointerDown = (e: PointerEvent) => {
    if (mode !== 'boatFollow') return;
    isDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  };
  const onPointerUp = () => {
    isDragging = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging || mode !== 'boatFollow') return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    orbitYaw -= dx * dragSensitivity;
    orbitPitch = BABYLON.Scalar.Clamp(orbitPitch + dy * dragSensitivity * 0.5, -0.5, 0.8);
  };
  const onWheel = (e: WheelEvent) => {
    if (mode !== 'boatFollow') return;
    e.preventDefault();
    const delta = e.deltaY * 0.01;
    const currentLen = followOffset.length();
    const newLen = BABYLON.Scalar.Clamp(currentLen + delta, zoomMin, zoomMax);
    followOffset = followOffset.normalize().scale(newLen);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("wheel", onWheel, { passive: false } as any);

  const update = (opts: { time: number, deltaSeconds: number, ground: BABYLON.Mesh, getWaterHeight: (x: number, z: number, t: number) => number, getGroundHeight: (x: number, z: number) => number }) => {
    const { time, deltaSeconds, ground, getWaterHeight, getGroundHeight } = opts;
    let waterHeight: number;
    let isAbove: boolean;
    let underwaterAmount: number;

    if (mode === 'boatFollow' && followTarget) {
      // ---- smooth follow ----
      const targetPos = followTarget.getAbsolutePosition();

      // boat rotation - physicsRoot uses quaternion
      let boatRot = followTarget.rotationQuaternion;
      if (!boatRot) {
        boatRot = BABYLON.Quaternion.FromEulerAngles(0, followTarget.rotation.y, 0);
      }
      // user orbit
      const orbitQuat = BABYLON.Quaternion.FromEulerAngles(orbitPitch, orbitYaw, 0);
      const totalRot = boatRot.multiply(orbitQuat);

      // rotated offset behind boat
      const rotatedOffset = new BABYLON.Vector3(0, 0, 0);
      followOffset.rotateByQuaternionToRef(totalRot, rotatedOffset);

      const desiredPos = targetPos.add(rotatedOffset);
      const lookAtPos = targetPos.add(followLookAtOffset.rotateByQuaternionToRef(boatRot, new BABYLON.Vector3()));

      // dynamic smoothing based on distance - closer = more responsive (like Game Starter)
      const len = followOffset.length();
      const normalized = (len - zoomMin) / (zoomMax - zoomMin);
      const dynamicSmoothing = BABYLON.Scalar.Lerp(0.12, 0.04, normalized); // closer = higher lerp

      BABYLON.Vector3.LerpToRef(camera.position, desiredPos, dynamicSmoothing, camera.position);

      camera.setTarget(lookAtPos);

      waterHeight = getWaterHeight(camera.position.x, camera.position.z, time);
      isAbove = camera.position.y > waterHeight + 0.25;
      underwaterAmount = BABYLON.Scalar.Clamp((waterHeight - camera.position.y) / OCEAN_CONFIG.fog.transitionDepth, 0, 1);

      // ground clamp still
      const groundH = getGroundHeight(camera.position.x, camera.position.z);
      if (camera.position.y < groundH + 2) {
        camera.position.y = groundH + 2;
      }

    } else {
      // ---- standard free cam ----
      waterHeight = getWaterHeight(camera.position.x, camera.position.z, time);
      isAbove = camera.position.y > waterHeight + 0.25;
      underwaterAmount = BABYLON.Scalar.Clamp((waterHeight - camera.position.y) / OCEAN_CONFIG.fog.transitionDepth, 0, 1);

      if (dolphinMode) {
        camera.rotation.x = Math.cos(1.8 * time) * 0.40;
      }
      if (rotateLeft) camera.rotation.y -= yawSpeed * deltaSeconds;
      if (rotateRight) camera.rotation.y += yawSpeed * deltaSeconds;

      if (!isAbove) {
        camera.speed = dolphinMode ? 0.4 : 0.18;
      } else {
        if (!dolphinMode) camera.speed = 0.7;
      }

      const groundH = getGroundHeight(camera.position.x, camera.position.z);
      if (camera.position.y < groundH + 2.0) {
        camera.position.y = groundH + 2.0;
        if (!dolphinMode) animateRotationXToZero();
      }
    }

    // shared fog/lens
    //underwaterLens.setFocusDistance(BABYLON.Scalar.Lerp(100.0, 2.0, underwaterAmount));
    underwaterLens.setAperture(BABYLON.Scalar.Lerp(0.0, 2, underwaterAmount));
    underwaterLens.setDarkenOutOfFocus(BABYLON.Scalar.Lerp(0.2, 0.14, underwaterAmount));
    scene.fogDensity = OCEAN_CONFIG.fog.density * underwaterAmount;
    setDOFEnabled(!isAbove);

    return { isAbove, underwaterAmount };
  };

  const dispose = () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("wheel", onWheel as any);
  };

  return {
    camera,
    underwaterLens,
    yawSpeed,
    getMode,
    toggleMode,
    setFollowTarget,
    isDolphinMode: () => dolphinMode,
    update,
    dispose
  };
}
