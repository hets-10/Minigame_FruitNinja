export const GAME_STATES = {
  LOADING: "LOADING",
  MENU: "MENU",
  REQUESTING_CAMERA: "REQUESTING_CAMERA",
  CALIBRATING: "CALIBRATING",
  COUNTDOWN: "COUNTDOWN",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  GAME_OVER: "GAME_OVER",
  ERROR: "ERROR",
};

export const INSTANT_GAME_OVER_ON_BAD_OBJECT = false;
export const LOSE_LIFE_ON_MISS = false;

export const GAME_CONFIG = {
  runDurationSeconds: 60,
  startingLives: 2,
  baseGoodScore: 10,
  loseLifeOnMiss: LOSE_LIFE_ON_MISS,
  instantGameOverOnBadObject: INSTANT_GAME_OVER_ON_BAD_OBJECT,
  blade: {
    minimumSliceSpeed: 600,
    smoothing: 0.35,
    trailLength: 14,
    handPadding: 42,
    hiddenAfterMs: 300,
  },
  objects: {
    goodMinSize: 84,
    goodMaxSize: 138,
    badMinSize: 88,
    badMaxSize: 144,
    baseGravity: 900,
    maximumActiveObjects: 18,
  },
  underwater: {
    maximumFish: 10,
    maximumBackgroundBubbles: 40,
    maximumForegroundBubbles: 15,
    maximumParticles: 250,
    enableLightRays: true,
    enableCaustics: true,
    enableSeaweedSway: true,
  },
  audio: {
    musicVolume: 0.25,
    soundEffectsVolume: 0.7,
  },
  tracking: {
    handTrackingFPS: 30,
    segmentationFPS: 20,
    minimumConfidence: 0.6,
    segmentationQuality: "balanced",
  },
  difficulty: {
    easy: { speed: 0.9, spawn: 1.15, bad: 0.75 },
    normal: { speed: 1, spawn: 1, bad: 1 },
    hard: { speed: 1.15, spawn: 0.85, bad: 1.2 },
  },
};

export const DEFAULT_SETTINGS = {
  controlMode: "hand",
  musicEnabled: true,
  soundEnabled: true,
  musicVolume: GAME_CONFIG.audio.musicVolume,
  soundVolume: GAME_CONFIG.audio.soundEffectsVolume,
  cameraMode: "segmented",
  playerEffect: "subtle",
  segmentationQuality: "balanced",
  underwaterEffects: "medium",
  difficulty: "normal",
  trailEnabled: true,
  instantGameOver: false,
  reducedMotion: false,
};

export const PERFORMANCE_CONFIG = {
  targetFPS: 60,
  handTrackingFPS: 30,
  segmentationFPS: 20,
  maxGameObjects: 15,
  maxParticles: 250,
  maxDecorativeFish: 10,
  maxBackgroundBubbles: 40,
};

export const QUALITY_PRESETS = {
  performance: { segmentationFPS: 12, segmentationScale: 0.5, particles: 0.55, fish: 0.55, bubbles: 0.55, rays: 3 },
  balanced: { segmentationFPS: 20, segmentationScale: 0.75, particles: 0.8, fish: 0.8, bubbles: 0.8, rays: 5 },
  high: { segmentationFPS: 28, segmentationScale: 1, particles: 1, fish: 1, bubbles: 1, rays: 7 },
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
