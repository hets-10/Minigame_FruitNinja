import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { GAME_CONFIG, QUALITY_PRESETS } from "./config.js";

export class PersonSegmentation {
  constructor(video, canvas, onStatus) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.onStatus = onStatus;
    this.segmenter = null;
    this.lastRun = 0;
    this.status = "Not started";
    this.maskCanvas = document.createElement("canvas");
    this.maskCtx = this.maskCanvas.getContext("2d", { willReadFrequently: true });
    this.mode = "segmented";
    this.quality = "balanced";
  }

  async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm");
      this.segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
      this.setStatus("Ready");
      return true;
    } catch (error) {
      console.warn("Segmentation could not start", error);
      this.setStatus("Background removal unavailable");
      return false;
    }
  }

  setOptions({ mode, quality }) {
    this.mode = mode;
    this.quality = quality;
  }

  draw(now, width, height, landmarks, playerEffect) {
    this.ctx.clearRect(0, 0, width, height);
    if (this.mode === "hidden") return;
    if (!this.video.videoWidth || this.video.readyState < 2) return;

    if (this.mode === "raw" || !this.segmenter) {
      this.drawMirroredVideo(width, height);
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.fillStyle = "rgba(0, 45, 75, 0.46)";
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.filter = "none";
      return;
    }

    const preset = QUALITY_PRESETS[this.quality] ?? QUALITY_PRESETS.balanced;
    const minInterval = 1000 / preset.segmentationFPS;
    if (now - this.lastRun >= minInterval) {
      this.lastRun = now;
      try {
        const result = this.segmenter.segmentForVideo(this.video, now);
        const mask = result.categoryMask;
        if (mask) this.updateMask(mask, width, height, landmarks);
        result.close?.();
        this.setStatus("Removing background");
      } catch (error) {
        console.warn("Segmentation frame failed", error);
        this.setStatus("Using dimmed camera fallback");
      }
    }

    this.drawMirroredVideo(width, height);
    this.ctx.globalCompositeOperation = "destination-in";
    this.ctx.filter = "blur(2px)";
    this.ctx.drawImage(this.maskCanvas, 0, 0, width, height);
    this.ctx.filter = "none";
    this.ctx.globalCompositeOperation = "source-atop";
    this.applyPlayerEffect(width, height, playerEffect);
    this.ctx.globalCompositeOperation = "source-over";
  }

  updateMask(categoryMask, width, height, landmarks) {
    this.maskCanvas.width = width;
    this.maskCanvas.height = height;
    const maskWidth = categoryMask.width;
    const maskHeight = categoryMask.height;
    const data = categoryMask.getAsUint8Array();
    const imageData = this.maskCtx.createImageData(maskWidth, maskHeight);
    for (let i = 0; i < data.length; i += 1) {
      const person = data[i] > 0 ? 255 : 0;
      const j = i * 4;
      imageData.data[j] = 255;
      imageData.data[j + 1] = 255;
      imageData.data[j + 2] = 255;
      imageData.data[j + 3] = person;
    }
    const temp = document.createElement("canvas");
    temp.width = maskWidth;
    temp.height = maskHeight;
    temp.getContext("2d").putImageData(imageData, 0, 0);
    this.maskCtx.clearRect(0, 0, width, height);
    this.maskCtx.save();
    this.maskCtx.scale(-1, 1);
    this.maskCtx.drawImage(temp, -width, 0, width, height);
    this.maskCtx.restore();
    this.preserveHandLandmarks(landmarks, GAME_CONFIG.blade.handPadding);
  }

  preserveHandLandmarks(landmarks, padding) {
    if (!landmarks?.length) return;
    this.maskCtx.save();
    this.maskCtx.fillStyle = "#fff";
    this.maskCtx.filter = "blur(12px)";
    for (const point of landmarks) {
      this.maskCtx.beginPath();
      this.maskCtx.arc(point.x, point.y, padding, 0, Math.PI * 2);
      this.maskCtx.fill();
    }
    this.maskCtx.beginPath();
    for (const point of landmarks) this.maskCtx.lineTo(point.x, point.y);
    this.maskCtx.closePath();
    this.maskCtx.fill();
    this.maskCtx.restore();
  }

  drawMirroredVideo(width, height) {
    this.ctx.save();
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(this.video, -width, 0, width, height);
    this.ctx.restore();
  }

  applyPlayerEffect(width, height, effect) {
    if (effect === "off") return;
    const alpha = effect === "strong" ? 0.32 : 0.16;
    this.ctx.fillStyle = `rgba(36, 176, 218, ${alpha})`;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.fillStyle = `rgba(255, 255, 255, ${effect === "strong" ? 0.08 : 0.04})`;
    for (let x = -width; x < width * 2; x += 110) {
      this.ctx.beginPath();
      this.ctx.ellipse(x + (performance.now() * 0.012) % 220, height * 0.12, 18, height * 0.75, -0.24, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  setStatus(status) {
    if (this.status !== status) {
      this.status = status;
      this.onStatus?.(status);
    }
  }
}
