import { DEFAULT_SETTINGS, GAME_STATES } from "./config.js";

const SETTINGS_KEY = "underwater-hand-slice-settings";
const HIGH_SCORE_KEY = "underwater-hand-slice-high-score";

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be disabled; gameplay should continue.
  }
}

export function loadHighScore() {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
  } catch {
    return 0;
  }
}

export function saveHighScore(score) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Ignore private browsing or quota failures.
  }
}

export class UI {
  constructor({ hud, overlay, onAction, settings }) {
    this.hud = hud;
    this.overlay = overlay;
    this.onAction = onAction;
    this.settings = settings;
    this.isSettingsOpen = false;
  }

  updateSettings(settings) {
    this.settings = settings;
    saveSettings(settings);
  }

  renderHUD({ state, score, highScore, lives, combo, level, trackingStatus, segmentationStatus, musicEnabled, soundEnabled }) {
    const hidden = [GAME_STATES.MENU, GAME_STATES.LOADING, GAME_STATES.ERROR].includes(state);
    this.hud.classList.toggle("hidden", hidden);
    if (hidden) return;
    this.hud.innerHTML = `
      <div class="hud-group">
        <span>Score <strong>${score}</strong></span>
        <span>High <strong>${highScore}</strong></span>
        <span>Lives <strong>${"O".repeat(Math.max(0, lives)) || "-"}</strong></span>
        <span>Combo <strong>${combo}x</strong></span>
        <span>Level <strong>${level}</strong></span>
      </div>
      <div class="hud-group hud-actions">
        <span class="tracking-pill">${trackingStatus}</span>
        <span class="tracking-pill">${segmentationStatus}</span>
        <button type="button" data-action="pause" aria-label="${state === GAME_STATES.PAUSED ? "Resume" : "Pause"}">${state === GAME_STATES.PAUSED ? "Resume" : "Pause"}</button>
        <button type="button" data-action="toggleMusic" aria-label="Toggle music">${musicEnabled ? "Music" : "Muted"}</button>
        <button type="button" data-action="toggleSound" aria-label="Toggle sound effects">${soundEnabled ? "SFX" : "Silent"}</button>
      </div>
    `;
    this.bindHudButtons();
  }

  showMenu(statusText = "Camera permission starts only after Start Game.") {
    this.overlay.className = "overlay";
    this.overlay.innerHTML = `
      <section class="panel menu-panel">
        <p class="eyebrow">Webcam arcade slicing</p>
        <h1>Underwater Hand Slice</h1>
        <p>Allow camera access and move your index finger through objects to slice them. Good custom images score points. Bad images cost a life.</p>
        <div class="status-grid">
          <span>Camera</span><strong>${statusText}</strong>
          <span>Hand tracking</span><strong>Ready to load</strong>
          <span>Segmentation</span><strong>Ready to load</strong>
        </div>
        <label class="check-row"><input id="mouseStart" type="checkbox" ${this.settings.controlMode === "mouse" ? "checked" : ""}> Use mouse instead of hand tracking</label>
        <div class="button-row">
          <button type="button" class="primary" data-action="start">Start Game</button>
          <button type="button" data-action="forceHand">Use Hand Tracking</button>
          <button type="button" data-action="settings">Settings</button>
        </div>
        <p class="file-hint">Place scoring images in <code>public/assets/good/</code> and harmful images in <code>public/assets/bad/</code>.</p>
      </section>
      ${this.settingsPanel()}
    `;
    this.bindOverlayButtons();
  }

  showCalibration({ mouseMode, handDetected, countdownText }) {
    this.overlay.className = "overlay translucent";
    this.overlay.innerHTML = `
      <section class="panel compact-panel">
        <h2>${countdownText || (mouseMode ? "Mouse mode ready" : "Place your hand in view")}</h2>
        <p>${mouseMode ? "Move the mouse quickly through objects to slice." : "Show your hand and index fingertip to begin the countdown."}</p>
        <div class="button-row">
          ${mouseMode ? '<button type="button" class="primary" data-action="skipCalibration">Skip Calibration</button>' : ""}
          <button type="button" data-action="pause">Pause</button>
        </div>
        <span class="tracking-pill">${handDetected ? "Index fingertip detected" : "Waiting for hand"}</span>
      </section>
    `;
    this.bindOverlayButtons();
  }

  showPaused() {
    this.overlay.className = "overlay translucent";
    this.overlay.innerHTML = `
      <section class="panel compact-panel">
        <h2>Paused</h2>
        <div class="button-row">
          <button type="button" class="primary" data-action="resume">Resume</button>
          <button type="button" data-action="restart">Restart</button>
          <button type="button" data-action="menu">Menu</button>
          <button type="button" data-action="settings">Settings</button>
        </div>
      </section>
      ${this.settingsPanel()}
    `;
    this.bindOverlayButtons();
  }

  showGameOver(score, highScore) {
    this.overlay.className = "overlay translucent";
    this.overlay.innerHTML = `
      <section class="panel compact-panel">
        <p class="eyebrow">Run complete</p>
        <h2>Game Over</h2>
        <p>Score <strong>${score}</strong> · High score <strong>${highScore}</strong></p>
        <div class="button-row">
          <button type="button" class="primary" data-action="restart">Restart</button>
          <button type="button" data-action="menu">Return to Menu</button>
        </div>
      </section>
    `;
    this.bindOverlayButtons();
  }

  showError(message) {
    this.overlay.className = "overlay";
    this.overlay.innerHTML = `
      <section class="panel compact-panel">
        <h2>Something needs attention</h2>
        <p>${message}</p>
        <div class="button-row">
          <button type="button" class="primary" data-action="useMouse">Use Mouse Mode</button>
          <button type="button" data-action="menu">Return to Menu</button>
        </div>
      </section>
    `;
    this.bindOverlayButtons();
  }

  clearOverlay() {
    this.overlay.className = "overlay hidden";
    this.overlay.innerHTML = "";
  }

  settingsPanel() {
    return `
      <section class="panel settings-panel ${this.isSettingsOpen ? "" : "hidden"}" aria-label="Settings">
        <h2>Settings</h2>
        <div class="settings-grid">
          ${this.select("controlMode", "Controls", [["hand", "Hand Tracking"], ["mouse", "Mouse Control"]])}
          ${this.checkbox("musicEnabled", "Music")}
          ${this.checkbox("soundEnabled", "Sound Effects")}
          ${this.range("musicVolume", "Music Volume")}
          ${this.range("soundVolume", "Sound Effects Volume")}
          ${this.select("cameraMode", "Camera", [["segmented", "Show Segmented Player"], ["hidden", "Hide Player"], ["raw", "Show Dimmed Raw Camera"]])}
          ${this.select("playerEffect", "Player Underwater Effect", [["off", "Off"], ["subtle", "Subtle"], ["strong", "Strong"]])}
          ${this.select("segmentationQuality", "Segmentation Quality", [["performance", "Performance"], ["balanced", "Balanced"], ["high", "High Quality"]])}
          ${this.select("underwaterEffects", "Underwater Effects", [["low", "Low"], ["medium", "Medium"], ["high", "High"]])}
          ${this.select("difficulty", "Difficulty", [["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]])}
          ${this.checkbox("trailEnabled", "Trail")}
          ${this.checkbox("instantGameOver", "Instant Game Over")}
          ${this.checkbox("reducedMotion", "Reduced Motion")}
        </div>
      </section>
    `;
  }

  select(key, label, options) {
    return `<label>${label}<select data-setting="${key}">${options.map(([value, text]) => `<option value="${value}" ${this.settings[key] === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
  }

  checkbox(key, label) {
    return `<label class="check-row"><input type="checkbox" data-setting="${key}" ${this.settings[key] ? "checked" : ""}> ${label}</label>`;
  }

  range(key, label) {
    return `<label>${label}<input type="range" min="0" max="1" step="0.05" data-setting="${key}" value="${this.settings[key]}"></label>`;
  }

  bindHudButtons() {
    this.hud.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => this.onAction(button.dataset.action));
    });
  }

  bindOverlayButtons() {
    this.overlay.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.action === "settings") this.isSettingsOpen = !this.isSettingsOpen;
        this.onAction(button.dataset.action);
      });
    });
    const mouseStart = this.overlay.querySelector("#mouseStart");
    if (mouseStart) {
      mouseStart.addEventListener("change", () => {
        this.settings.controlMode = mouseStart.checked ? "mouse" : "hand";
        this.updateSettings(this.settings);
      });
    }
    this.overlay.querySelectorAll("[data-setting]").forEach((input) => {
      input.addEventListener("input", () => {
        const key = input.dataset.setting;
        this.settings[key] = input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value;
        this.updateSettings(this.settings);
        this.onAction("settingsChanged");
      });
    });
  }
}
