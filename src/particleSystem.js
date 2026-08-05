import { clamp, GAME_CONFIG } from "./config.js";

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = GAME_CONFIG.underwater.maximumParticles;
    this.screenShake = 0;
  }

  setIntensity(multiplier) {
    this.maxParticles = Math.round(GAME_CONFIG.underwater.maximumParticles * multiplier);
  }

  addSliceBurst(x, y, combo = 1) {
    this.addRipple(x, y, "#b9fbff", 0.8, 72);
    this.addText(`+${10 + Math.max(0, combo - 1) * 2}`, x, y - 18, "#e7fffb");
    const count = clamp(16 + combo * 2, 16, 30);
    for (let i = 0; i < count; i += 1) {
      this.spawn("bubble", x, y, {
        vx: (Math.random() - 0.5) * 260,
        vy: -80 - Math.random() * 220,
        size: 3 + Math.random() * 8,
        life: 0.7 + Math.random() * 0.45,
        color: Math.random() > 0.45 ? "#c7fbff" : "#8edcff",
      });
    }
    for (let i = 0; i < 12; i += 1) {
      this.spawn("sparkle", x, y, {
        vx: (Math.random() - 0.5) * 340,
        vy: (Math.random() - 0.6) * 230,
        size: 2 + Math.random() * 5,
        life: 0.45 + Math.random() * 0.35,
        color: "#ffffff",
      });
    }
  }

  addBadBurst(x, y, reducedMotion = false) {
    this.addRipple(x, y, "#defbff", 1, 150);
    this.addRipple(x, y, "#052239", 0.7, 100);
    this.addText("Danger!", x, y - 30, "#ffffff", 30);
    if (!reducedMotion) this.screenShake = 14;
    for (let i = 0; i < 48; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 360;
      this.spawn(Math.random() > 0.35 ? "bubble" : "ink", x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        size: 5 + Math.random() * 22,
        life: 0.8 + Math.random() * 0.8,
        color: Math.random() > 0.35 ? "#bdf7ff" : "#06233a",
      });
    }
  }

  addMissSplash(x, y) {
    this.addRipple(x, y, "#88dced", 0.45, 58);
    for (let i = 0; i < 12; i += 1) {
      this.spawn("bubble", x, y, {
        vx: (Math.random() - 0.5) * 100,
        vy: -80 - Math.random() * 90,
        size: 3 + Math.random() * 6,
        life: 0.55 + Math.random() * 0.3,
        color: "#b4f6ff",
      });
    }
  }

  addComboText(text, x, y) {
    this.addText(text, x, y, "#fff5ad", 34, 1.1);
  }

  addLevelText(text, x, y) {
    this.addText(text, x, y, "#d9fdff", 42, 1.6);
  }

  addRipple(x, y, color, alpha, maxRadius) {
    this.spawn("ripple", x, y, { vx: 0, vy: 0, size: 8, life: 0.75, color, alpha, maxRadius });
  }

  addText(text, x, y, color, size = 28, life = 0.9) {
    this.spawn("text", x, y, { text, vx: 0, vy: -58, size, life, color });
  }

  spawn(type, x, y, options) {
    if (this.particles.length >= this.maxParticles) this.particles.shift();
    this.particles.push({ type, x, y, age: 0, ...options });
  }

  update(deltaSeconds) {
    this.screenShake = Math.max(0, this.screenShake - deltaSeconds * 42);
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.age += deltaSeconds;
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;
      if (p.type === "bubble") p.vy -= 34 * deltaSeconds;
      if (p.age >= p.life) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const t = clamp(p.age / p.life, 0, 1);
      ctx.save();
      ctx.globalAlpha = (p.alpha ?? 1) * (1 - t);
      if (p.type === "ripple") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (p.maxRadius - p.size) * t, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === "text") {
        ctx.fillStyle = p.color;
        ctx.font = `800 ${p.size}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#003f5f";
        ctx.shadowBlur = 12;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size * (p.type === "ink" ? 1 + t : 1 - t * 0.3)), 0, Math.PI * 2);
        ctx.fill();
        if (p.type === "bubble") {
          ctx.strokeStyle = "#efffff";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
}
