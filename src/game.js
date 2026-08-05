import { GOOD_IMAGES, BAD_IMAGES, UNDERWATER_ASSETS, EFFECT_ASSETS } from "./assetConfig.js";
import { GAME_CONFIG, GAME_STATES, DEFAULT_SETTINGS, QUALITY_PRESETS, clamp } from "./config.js";
import { GameObject } from "./gameObject.js";
import { HandTracking } from "./handTracking.js";
import { PersonSegmentation } from "./personSegmentation.js";
import { ParticleSystem } from "./particleSystem.js";
import { UnderwaterScene } from "./underwaterScene.js";
import { AudioManager } from "./audioManager.js";
import { getBladeSpeed, lineIntersectsCircle } from "./collision.js";
import { UI, loadSettings, loadHighScore, saveHighScore } from "./ui.js";

export class Game {
  constructor(elements) {
    Object.assign(this, elements);
    this.bgCtx = this.backgroundCanvas.getContext("2d");
    this.gameCtx = this.gameCanvas.getContext("2d");
    this.effectsCtx = this.effectsCanvas.getContext("2d");
    this.settings = { ...DEFAULT_SETTINGS, ...loadSettings() };
    this.assets = new Map();
    this.missingAssets = new Set();
    this.scene = new UnderwaterScene(this);
    this.particles = new ParticleSystem();
    this.audio = new AudioManager(this.settings);
    this.handTracking = new HandTracking(this.video, (status) => { this.trackingStatus = status; });
    this.segmentation = new PersonSegmentation(this.video, this.cameraCanvas, (status) => { this.segmentationStatus = status; });
    this.ui = new UI({ hud: this.hud, overlay: this.overlay, settings: this.settings, onAction: (action) => this.handleAction(action) });
    this.state = GAME_STATES.LOADING;
    this.previousTime = performance.now();
    this.score = 0;
    this.highScore = loadHighScore();
    this.lives = GAME_CONFIG.startingLives;
    this.combo = 0;
    this.level = 1;
    this.objects = [];
    this.trail = [];
    this.pointer = null;
    this.previousPointer = null;
    this.bladeSpeed = 0;
    this.lastSpawn = 0;
    this.countdownStart = 0;
    this.countdownText = "";
    this.trackingStatus = "Not started";
    this.segmentationStatus = "Not started";
    this.cameraStream = null;
    this.dimensions = { width: 1, height: 1, dpr: 1 };
  }

  async start() {
    this.resize();
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === GAME_STATES.PLAYING) this.pause();
    });
    window.addEventListener("keydown", (event) => this.handleKey(event));
    this.gameCanvas.addEventListener("pointermove", (event) => this.handleMouseMove(event));
    await this.preloadAssets();
    this.state = GAME_STATES.MENU;
    this.ui.showMenu();
    requestAnimationFrame((time) => this.loop(time));
  }

  async preloadAssets() {
    const paths = [...GOOD_IMAGES, ...BAD_IMAGES, ...Object.values(UNDERWATER_ASSETS).flat(), ...Object.values(EFFECT_ASSETS)];
    await Promise.all(paths.map((path) => this.loadImage(path)));
  }

  loadImage(path) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        this.assets.set(path, image);
        resolve(image);
      };
      image.onerror = () => {
        this.missingAssets.add(path);
        if (import.meta.env.DEV) console.info(`[Underwater Hand Slice] Image missing, using procedural fallback: ${path}`);
        resolve(null);
      };
      image.src = path;
    });
  }

  get(path) {
    return this.assets.get(path);
  }

  async begin() {
    this.applySettings();
    this.resetRun();
    this.audio.updateSettings(this.settings);
    await this.audio.startMusic();
    if (this.settings.controlMode === "mouse") {
      this.state = GAME_STATES.COUNTDOWN;
      this.countdownStart = performance.now();
      this.ui.showCalibration({ mouseMode: true, handDetected: true, countdownText: "3" });
      return;
    }
    this.state = GAME_STATES.REQUESTING_CAMERA;
    this.ui.showCalibration({ mouseMode: false, handDetected: false });
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      this.video.srcObject = this.cameraStream;
      await this.video.play();
    } catch {
      this.state = GAME_STATES.ERROR;
      this.ui.showError("Camera access was blocked or unavailable. Enable camera permissions or switch to mouse mode.");
      return;
    }
    const [handReady, segmentationReady] = await Promise.all([
      this.handTracking.initialize(),
      this.segmentation.initialize(),
    ]);
    if (!handReady) {
      this.state = GAME_STATES.ERROR;
      this.ui.showError("Hand tracking could not start in this browser. You can keep playing with mouse mode, or retry after checking camera permission and refreshing the page.");
      return;
    }
    if (!segmentationReady) this.segmentationStatus = "Using dimmed fallback";
    this.state = GAME_STATES.CALIBRATING;
  }

  resetRun() {
    this.score = 0;
    this.lives = GAME_CONFIG.startingLives;
    this.combo = 0;
    this.level = 1;
    this.objects = [];
    this.trail = [];
    this.previousPointer = null;
    this.pointer = null;
    this.lastSpawn = performance.now();
    this.countdownText = "";
    this.particles.particles.length = 0;
  }

  loop(time) {
    const deltaSeconds = Math.min(0.033, (time - this.previousTime) / 1000 || 0);
    this.previousTime = time;
    this.update(time, deltaSeconds);
    this.draw(time, deltaSeconds);
    requestAnimationFrame((next) => this.loop(next));
  }

  update(time, deltaSeconds) {
    this.scene.setOptions({ effects: this.settings.underwaterEffects, reducedMotion: this.settings.reducedMotion });
    this.scene.update(deltaSeconds);
    this.particles.setIntensity(this.getQuality().particles * (this.settings.reducedMotion ? 0.55 : 1));
    this.particles.update(deltaSeconds);

    if (![GAME_STATES.PLAYING, GAME_STATES.CALIBRATING, GAME_STATES.COUNTDOWN].includes(this.state)) {
      this.ui.renderHUD(this.getHudData());
      return;
    }

    this.updatePointer(time, deltaSeconds);
    this.segmentation.setOptions({ mode: this.settings.cameraMode, quality: this.settings.segmentationQuality });
    this.segmentation.draw(time, this.dimensions.width, this.dimensions.height, this.latestLandmarks, this.settings.playerEffect);

    if (this.state === GAME_STATES.CALIBRATING && this.pointer) {
      this.state = GAME_STATES.COUNTDOWN;
      this.countdownStart = time;
    }
    if (this.state === GAME_STATES.COUNTDOWN) this.updateCountdown(time);
    if (this.state === GAME_STATES.PLAYING) {
      this.spawnObjects(time);
      this.updateObjects(deltaSeconds, time / 1000);
      this.checkSlices(deltaSeconds);
    }
    this.ui.renderHUD(this.getHudData());
  }

  updatePointer(time, deltaSeconds) {
    let point = null;
    let detected = false;
    if (this.settings.controlMode === "mouse") {
      point = this.pointer;
      detected = Boolean(point);
      this.trackingStatus = detected ? "Mouse slicing" : "Move mouse to slice";
    } else {
      const result = this.handTracking.update(time, this.dimensions.width, this.dimensions.height);
      point = result.point;
      detected = result.detected;
      this.latestLandmarks = result.landmarks;
    }
    if (!detected || !point) return;
    this.previousPointer = this.trail.length ? { ...this.trail[this.trail.length - 1] } : this.previousPointer;
    this.pointer = point;
    if (this.previousPointer) this.bladeSpeed = getBladeSpeed(this.previousPointer, this.pointer, deltaSeconds);
    this.trail.push({ ...point, age: 0, speed: this.bladeSpeed });
    while (this.trail.length > GAME_CONFIG.blade.trailLength) this.trail.shift();
    for (const pointInTrail of this.trail) pointInTrail.age += deltaSeconds;
    if (this.bladeSpeed > GAME_CONFIG.blade.minimumSliceSpeed * 1.2 && Math.random() > 0.78) {
      this.particles.spawn("bubble", point.x, point.y, { vx: (Math.random() - 0.5) * 50, vy: -80, size: 3 + Math.random() * 6, life: 0.55, color: "#d9ffff" });
    }
  }

  updateCountdown(time) {
    const elapsed = (time - this.countdownStart) / 1000;
    if (elapsed < 1) this.countdownText = "3";
    else if (elapsed < 2) this.countdownText = "2";
    else if (elapsed < 3) this.countdownText = "1";
    else if (elapsed < 3.65) this.countdownText = "SLICE!";
    else {
      this.state = GAME_STATES.PLAYING;
      this.ui.clearOverlay();
      return;
    }
    this.ui.showCalibration({ mouseMode: this.settings.controlMode === "mouse", handDetected: Boolean(this.pointer), countdownText: this.countdownText });
  }

  spawnObjects(time) {
    const difficulty = this.getDifficulty();
    const levelFactor = Math.min(0.54, (this.level - 1) * 0.045);
    const interval = (1450 - levelFactor * 1200) * difficulty.spawn;
    if (time - this.lastSpawn < interval || this.objects.length >= GAME_CONFIG.objects.maximumActiveObjects) return;
    this.lastSpawn = time;
    const waveCount = this.level < 2 ? 1 : this.level < 4 ? 1 + Number(Math.random() > 0.55) : 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < waveCount; i += 1) {
      const badChance = clamp((0.05 + this.level * 0.025) * difficulty.bad, 0.04, 0.32);
      const type = Math.random() < badChance ? "bad" : "good";
      this.objects.push(this.createObject(type, difficulty.speed));
    }
  }

  createObject(type, speedMultiplier) {
    const paths = type === "good" ? GOOD_IMAGES : BAD_IMAGES;
    const image = this.get(paths[Math.floor(Math.random() * paths.length)]);
    const min = type === "good" ? GAME_CONFIG.objects.goodMinSize : GAME_CONFIG.objects.badMinSize;
    const max = type === "good" ? GAME_CONFIG.objects.goodMaxSize : GAME_CONFIG.objects.badMaxSize;
    const base = min + Math.random() * (max - min);
    const aspect = image ? image.naturalWidth / image.naturalHeight : 1;
    const width = aspect >= 1 ? base : base * aspect;
    const height = aspect >= 1 ? base / aspect : base;
    return new GameObject({
      image,
      type,
      width,
      height,
      canvasWidth: this.dimensions.width,
      canvasHeight: this.dimensions.height,
      level: this.level,
      difficultyMultiplier: speedMultiplier,
    });
  }

  updateObjects(deltaSeconds, timeSeconds) {
    for (const object of this.objects) object.update(deltaSeconds, timeSeconds);
    for (const object of this.objects) {
      if (object.type === "good" && !object.sliced && !object.missed && object.y > this.dimensions.height + object.height) {
        object.missed = true;
        this.combo = 0;
        this.audio.play("miss");
        this.particles.addMissSplash(object.x, this.dimensions.height - 18);
        if (GAME_CONFIG.loseLifeOnMiss) this.loseLife();
      }
    }
    this.objects = this.objects.filter((object) => !object.isOffscreen(this.dimensions.height));
    const nextLevel = 1 + Math.floor(this.score / 180);
    if (nextLevel > this.level) {
      this.level = nextLevel;
      this.audio.play("levelUp");
      this.particles.addLevelText(`Descending to Level ${this.level}`, this.dimensions.width / 2, this.dimensions.height * 0.32);
    }
  }

  checkSlices(deltaSeconds) {
    if (!this.previousPointer || !this.pointer || this.bladeSpeed < GAME_CONFIG.blade.minimumSliceSpeed) return;
    for (const object of this.objects) {
      if (object.sliced) continue;
      if (!lineIntersectsCircle(this.previousPointer, this.pointer, object.getCircle())) continue;
      object.markSliced();
      if (object.type === "good") this.sliceGood(object);
      else this.sliceBad(object);
    }
  }

  sliceGood(object) {
    this.combo += 1;
    const comboBonus = Math.max(0, this.combo - 1) * 2;
    const milestoneBonus = this.combo > 0 && this.combo % 5 === 0 ? 20 : this.combo > 0 && this.combo % 3 === 0 ? 10 : 0;
    this.score += GAME_CONFIG.baseGoodScore + comboBonus + milestoneBonus;
    this.highScore = Math.max(this.highScore, this.score);
    saveHighScore(this.highScore);
    this.audio.play("slice");
    if (Math.random() > 0.55) this.audio.play("bubble");
    this.particles.addSliceBurst(object.x, object.y, this.combo);
    if (this.combo === 3) this.particles.addComboText("3x Combo", this.dimensions.width / 2, this.dimensions.height * 0.38);
    if (this.combo === 5) this.particles.addComboText("Deep Sea Combo!", this.dimensions.width / 2, this.dimensions.height * 0.38);
    if (this.combo > 7 && this.combo % 4 === 0) this.particles.addComboText("Ocean Master!", this.dimensions.width / 2, this.dimensions.height * 0.38);
  }

  sliceBad(object) {
    this.combo = 0;
    this.audio.play("bomb");
    this.particles.addBadBurst(object.x, object.y, this.settings.reducedMotion);
    if (this.settings.instantGameOver || GAME_CONFIG.instantGameOverOnBadObject) {
      this.lives = 0;
      this.endGame();
    } else {
      this.loseLife();
    }
  }

  loseLife() {
    this.lives -= 1;
    if (this.lives <= 0) this.endGame();
  }

  endGame() {
    this.state = GAME_STATES.GAME_OVER;
    this.audio.stopMusic();
    this.ui.showGameOver(this.score, this.highScore);
  }

  draw(time) {
    const { width, height } = this.dimensions;
    this.bgCtx.clearRect(0, 0, width, height);
    this.gameCtx.clearRect(0, 0, width, height);
    this.effectsCtx.clearRect(0, 0, width, height);
    const shake = this.particles.screenShake;
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    this.scene.drawBackground(this.bgCtx);
    this.gameCtx.save();
    this.gameCtx.translate(sx, sy);
    this.scene.drawMidground(this.gameCtx);
    for (const object of this.objects) object.draw(this.gameCtx);
    if (this.settings.trailEnabled) this.drawTrail(this.gameCtx);
    this.drawFingerMarker(this.gameCtx, time);
    this.particles.draw(this.gameCtx);
    this.scene.drawForeground(this.gameCtx);
    this.gameCtx.restore();
  }

  drawTrail(ctx) {
    if (this.trail.length < 2 || !this.pointer) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < this.trail.length; i += 1) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      const alpha = i / this.trail.length;
      ctx.strokeStyle = `rgba(217, 255, 255, ${alpha * 0.78})`;
      ctx.shadowColor = "#65dcff";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 4 + Math.min(12, (b.speed || 0) / 220);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFingerMarker(ctx, time) {
    if (!this.pointer || ![GAME_STATES.CALIBRATING, GAME_STATES.COUNTDOWN, GAME_STATES.PLAYING].includes(this.state)) return;
    const pulse = 1 + Math.sin(time * 0.008) * 0.12;
    ctx.save();
    ctx.strokeStyle = "#eaffff";
    ctx.fillStyle = "rgba(123, 241, 255, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.pointer.x, this.pointer.y, 17 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  resize() {
    const rect = this.gameCanvas.parentElement.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(420, Math.floor(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const canvas of [this.backgroundCanvas, this.cameraCanvas, this.gameCanvas, this.effectsCanvas]) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.dimensions = { width, height, dpr };
    this.scene.resize(width, height);
  }

  handleMouseMove(event) {
    if (this.settings.controlMode !== "mouse") return;
    const rect = this.gameCanvas.getBoundingClientRect();
    this.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  handleAction(action) {
    if (action === "start") this.begin();
    if (action === "forceHand") {
      this.settings.controlMode = "hand";
      this.ui.updateSettings(this.settings);
      this.ui.showMenu("Hand tracking selected. Press Start Game.");
    }
    if (action === "pause") this.state === GAME_STATES.PAUSED ? this.resume() : this.pause();
    if (action === "resume") this.resume();
    if (action === "restart") this.begin();
    if (action === "menu") this.returnToMenu();
    if (action === "settings") {
      if (this.state === GAME_STATES.MENU) this.ui.showMenu();
      else this.ui.showPaused();
    }
    if (action === "settingsChanged") this.applySettings();
    if (action === "toggleMusic") this.toggleMusic();
    if (action === "toggleSound") this.toggleSound();
    if (action === "skipCalibration") {
      this.state = GAME_STATES.COUNTDOWN;
      this.countdownStart = performance.now();
    }
    if (action === "useMouse") {
      this.settings.controlMode = "mouse";
      this.ui.updateSettings(this.settings);
      this.begin();
    }
  }

  handleKey(event) {
    if (event.key === "Escape") this.state === GAME_STATES.PAUSED ? this.resume() : this.pause();
    if (event.key.toLowerCase() === "r" && this.state === GAME_STATES.GAME_OVER) this.begin();
    if (event.key.toLowerCase() === "m") this.toggleMusic();
    if (event.key.toLowerCase() === "s") this.toggleSound();
    if (event.key.toLowerCase() === "h" && this.state !== GAME_STATES.PLAYING) {
      this.settings.controlMode = this.settings.controlMode === "hand" ? "mouse" : "hand";
      this.ui.updateSettings(this.settings);
    }
  }

  pause() {
    if (![GAME_STATES.PLAYING, GAME_STATES.COUNTDOWN, GAME_STATES.CALIBRATING].includes(this.state)) return;
    this.state = GAME_STATES.PAUSED;
    this.audio.pauseMusic();
    this.ui.showPaused();
  }

  resume() {
    if (this.state !== GAME_STATES.PAUSED) return;
    this.state = GAME_STATES.COUNTDOWN;
    this.countdownStart = performance.now();
    this.audio.resumeMusic();
  }

  returnToMenu() {
    this.state = GAME_STATES.MENU;
    this.audio.stopMusic();
    this.ui.showMenu();
  }

  toggleMusic() {
    this.settings.musicEnabled = !this.settings.musicEnabled;
    this.ui.updateSettings(this.settings);
    this.audio.updateSettings(this.settings);
    if (this.settings.musicEnabled) this.audio.startMusic();
    else this.audio.stopMusic();
  }

  toggleSound() {
    this.settings.soundEnabled = !this.settings.soundEnabled;
    this.ui.updateSettings(this.settings);
    this.audio.updateSettings(this.settings);
  }

  applySettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...this.ui.settings };
    this.audio.updateSettings(this.settings);
  }

  getHudData() {
    return {
      state: this.state,
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      combo: this.combo,
      level: this.level,
      trackingStatus: this.trackingStatus,
      segmentationStatus: this.segmentationStatus,
      musicEnabled: this.settings.musicEnabled,
      soundEnabled: this.settings.soundEnabled,
    };
  }

  getDifficulty() {
    return GAME_CONFIG.difficulty[this.settings.difficulty] ?? GAME_CONFIG.difficulty.normal;
  }

  getQuality() {
    return QUALITY_PRESETS[this.settings.underwaterEffects === "high" ? "high" : this.settings.underwaterEffects === "low" ? "performance" : "balanced"];
  }
}
