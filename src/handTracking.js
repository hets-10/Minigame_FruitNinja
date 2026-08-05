import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { GAME_CONFIG } from "./config.js";

export class HandTracking {
  constructor(video, onStatus) {
    this.video = video;
    this.onStatus = onStatus;
    this.landmarker = null;
    this.lastRun = 0;
    this.lastVideoTime = -1;
    this.status = "Not started";
    this.smoothedTip = null;
    this.landmarks = null;
  }

  async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm");
      for (const delegate of ["GPU", "CPU"]) {
        try {
          this.setStatus(`Loading hand model (${delegate})`);
          this.landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
              delegate,
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: GAME_CONFIG.tracking.minimumConfidence,
            minHandPresenceConfidence: GAME_CONFIG.tracking.minimumConfidence,
            minTrackingConfidence: GAME_CONFIG.tracking.minimumConfidence,
          });
          this.setStatus(`Ready (${delegate})`);
          return true;
        } catch (error) {
          console.warn(`Hand tracking ${delegate} delegate could not start`, error);
        }
      }
    } catch (error) {
      console.warn("Hand tracking assets could not load", error);
    }
    this.setStatus("Hand tracking unavailable, switch to mouse mode");
    return false;
  }

  update(now, canvasWidth, canvasHeight) {
    if (!this.landmarker || !this.video.videoWidth || this.video.readyState < 2) {
      return { detected: false, point: null, landmarks: null };
    }
    const minInterval = 1000 / GAME_CONFIG.tracking.handTrackingFPS;
    if (now - this.lastRun < minInterval) {
      return { detected: Boolean(this.smoothedTip), point: this.smoothedTip, landmarks: this.landmarks };
    }
    this.lastRun = now;
    if (this.video.currentTime === this.lastVideoTime) {
      return { detected: Boolean(this.smoothedTip), point: this.smoothedTip, landmarks: this.landmarks };
    }
    this.lastVideoTime = this.video.currentTime;
    const results = this.landmarker.detectForVideo(this.video, now);
    const hand = results.landmarks?.[0];
    if (!hand) {
      this.landmarks = null;
      this.setStatus("Place your hand in view");
      return { detected: false, point: null, landmarks: null };
    }
    this.landmarks = hand.map((landmark) => ({
      x: (1 - landmark.x) * canvasWidth,
      y: landmark.y * canvasHeight,
      z: landmark.z,
    }));
    const rawTip = this.landmarks[8];
    if (!this.smoothedTip) {
      this.smoothedTip = { ...rawTip };
    } else {
      const amount = GAME_CONFIG.blade.smoothing;
      this.smoothedTip.x += (rawTip.x - this.smoothedTip.x) * amount;
      this.smoothedTip.y += (rawTip.y - this.smoothedTip.y) * amount;
    }
    this.setStatus("Tracking hand");
    return { detected: true, point: { ...this.smoothedTip }, landmarks: this.landmarks };
  }

  resetSmoothing() {
    this.smoothedTip = null;
  }

  setStatus(status) {
    if (status !== this.status) {
      this.status = status;
      this.onStatus?.(status);
    }
  }
}
