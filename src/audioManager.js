import { SOUND_ASSETS } from "./assetConfig.js";
import { DEFAULT_SETTINGS } from "./config.js";

export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.music = new Audio(SOUND_ASSETS.music);
    this.music.loop = true;
    this.music.preload = "auto";
    this.music.volume = 0;
    this.targetMusicVolume = settings.musicEnabled ? settings.musicVolume : 0;
    this.effects = new Map();
    this.effectPaths = {
      slice: SOUND_ASSETS.slice,
      bomb: SOUND_ASSETS.bomb,
      miss: SOUND_ASSETS.miss,
      bubble: SOUND_ASSETS.bubble,
      levelUp: SOUND_ASSETS.levelUp,
    };
    this.music.addEventListener("error", () => this.warnMissing(SOUND_ASSETS.music));
  }

  updateSettings(settings) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.targetMusicVolume = this.settings.musicEnabled ? this.settings.musicVolume : 0;
  }

  async startMusic() {
    if (!this.settings.musicEnabled) return;
    try {
      await this.music.play();
      this.fadeMusic(this.settings.musicVolume, 800);
    } catch {
      this.warnMissing("music autoplay blocked or file missing");
    }
  }

  pauseMusic() {
    this.fadeMusic(this.settings.musicVolume * 0.35, 250);
  }

  resumeMusic() {
    this.fadeMusic(this.settings.musicVolume, 350);
  }

  stopMusic() {
    this.fadeMusic(0, 600, () => {
      this.music.pause();
      this.music.currentTime = 0;
    });
  }

  fadeMusic(target, durationMs, done) {
    const start = this.music.volume;
    const started = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - started) / durationMs);
      this.music.volume = start + (target - start) * t;
      if (t < 1) requestAnimationFrame(step);
      else if (done) done();
    };
    requestAnimationFrame(step);
  }

  play(name) {
    if (!this.settings.soundEnabled) return;
    const path = this.effectPaths[name];
    if (!path) return;
    let pool = this.effects.get(name);
    if (!pool) {
      pool = Array.from({ length: 4 }, () => {
        const audio = new Audio(path);
        audio.preload = "auto";
        audio.volume = this.settings.soundVolume;
        audio.addEventListener("error", () => this.warnMissing(path), { once: true });
        return audio;
      });
      this.effects.set(name, pool);
    }
    const audio = pool.find((item) => item.paused) ?? pool[0];
    audio.volume = this.settings.soundVolume;
    audio.currentTime = 0;
    audio.play().catch(() => this.warnMissing(path));
  }

  warnMissing(path) {
    if (import.meta.env.DEV) {
      console.info(`[Underwater Hand Slice] Audio unavailable: ${path}. The game will continue.`);
    }
  }
}
