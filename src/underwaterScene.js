import { UNDERWATER_ASSETS } from "./assetConfig.js";
import { GAME_CONFIG, QUALITY_PRESETS } from "./config.js";

export class UnderwaterScene {
  constructor(assetLoader) {
    this.assets = assetLoader;
    this.fish = [];
    this.bubbles = [];
    this.particles = [];
    this.plants = [];
    this.time = 0;
    this.effects = "medium";
    this.reducedMotion = false;
  }

  setOptions({ effects, reducedMotion }) {
    this.effects = effects;
    this.reducedMotion = reducedMotion;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.plants = Array.from({ length: 10 }, (_, index) => ({
      x: (index / 9) * width + (Math.random() - 0.5) * 50,
      h: 80 + Math.random() * 110,
      phase: Math.random() * Math.PI * 2,
      color: index % 2 ? "#0d8d85" : "#0b6c76",
    }));
  }

  update(deltaSeconds) {
    this.time += deltaSeconds;
    const quality = this.getQuality();
    const fishLimit = Math.round(GAME_CONFIG.underwater.maximumFish * quality.fish * (this.reducedMotion ? 0.45 : 1));
    const bubbleLimit = Math.round(GAME_CONFIG.underwater.maximumBackgroundBubbles * quality.bubbles * (this.reducedMotion ? 0.5 : 1));
    while (this.fish.length < fishLimit) this.spawnFish();
    while (this.bubbles.length < bubbleLimit) this.spawnBubble(false);
    this.fish.forEach((fish) => {
      fish.x += fish.speed * fish.direction * deltaSeconds;
      fish.y += Math.sin(this.time * fish.wobble + fish.phase) * 14 * deltaSeconds;
      if ((fish.direction > 0 && fish.x > this.width + 90) || (fish.direction < 0 && fish.x < -90)) {
        Object.assign(fish, this.createFish());
      }
    });
    this.bubbles.forEach((bubble) => {
      bubble.y -= bubble.speed * deltaSeconds;
      bubble.x += Math.sin(this.time * bubble.drift + bubble.phase) * 18 * deltaSeconds;
      bubble.alpha = Math.min(0.72, bubble.y / this.height);
      if (bubble.y < -20) Object.assign(bubble, this.createBubble(true));
    });
  }

  drawBackground(ctx) {
    const bg = this.assets.get(UNDERWATER_ASSETS.background);
    if (bg) {
      ctx.drawImage(bg, 0, 0, this.width, this.height);
      ctx.fillStyle = "rgba(0, 42, 82, 0.28)";
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
      gradient.addColorStop(0, "#087fa3");
      gradient.addColorStop(0.42, "#064d79");
      gradient.addColorStop(1, "#03182d");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    this.drawLightRays(ctx);
    this.drawCaustics(ctx);
    this.drawParticles(ctx);
    this.drawFish(ctx, "distant");
    this.drawBubbles(ctx, 0.45);
  }

  drawMidground(ctx) {
    this.drawFish(ctx, "medium");
    this.drawSeaFloor(ctx, 0.62);
    this.drawPlants(ctx, 0.78);
  }

  drawForeground(ctx) {
    this.drawBubbles(ctx, 1);
    this.drawSeaFloor(ctx, 1);
    this.drawPlants(ctx, 1);
  }

  drawLightRays(ctx) {
    const quality = this.getQuality();
    const count = this.reducedMotion ? 2 : quality.rays;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < count; i += 1) {
      const x = ((i / count) * this.width + Math.sin(this.time * 0.25 + i) * 90) % this.width;
      const gradient = ctx.createLinearGradient(x, 0, x + 120, this.height * 0.85);
      gradient.addColorStop(0, "rgba(214, 255, 255, 0.15)");
      gradient.addColorStop(1, "rgba(214, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x - 34, 0);
      ctx.lineTo(x + 78, 0);
      ctx.lineTo(x + 180, this.height);
      ctx.lineTo(x - 150, this.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawCaustics(ctx) {
    if (this.effects === "low" || this.reducedMotion) return;
    ctx.save();
    ctx.globalAlpha = this.effects === "high" ? 0.11 : 0.07;
    ctx.strokeStyle = "#d8ffff";
    ctx.lineWidth = 1.2;
    for (let y = 80; y < this.height; y += 54) {
      ctx.beginPath();
      for (let x = -20; x <= this.width + 20; x += 28) {
        const wave = Math.sin(x * 0.02 + this.time * 0.9 + y * 0.01) * 12;
        ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#c4faff";
    const count = this.reducedMotion ? 35 : 90;
    for (let i = 0; i < count; i += 1) {
      const x = (i * 97 + this.time * 12) % this.width;
      const y = (i * 53 + Math.sin(this.time + i) * 20) % this.height;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.restore();
  }

  drawFish(ctx, layer) {
    const filtered = this.fish.filter((fish) => fish.layer === layer);
    for (const fish of filtered) {
      ctx.save();
      ctx.globalAlpha = fish.alpha;
      ctx.translate(fish.x, fish.y);
      ctx.scale(fish.direction, 1);
      const img = this.assets.get(fish.asset);
      if (img) {
        ctx.drawImage(img, -fish.size / 2, -fish.size * 0.25, fish.size, fish.size * 0.5);
      } else {
        ctx.fillStyle = fish.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size * 0.46, fish.size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-fish.size * 0.42, 0);
        ctx.lineTo(-fish.size * 0.68, -fish.size * 0.18);
        ctx.lineTo(-fish.size * 0.68, fish.size * 0.18);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawBubbles(ctx, opacityScale) {
    for (const bubble of this.bubbles) {
      if (bubble.foreground !== (opacityScale > 0.8)) continue;
      ctx.save();
      ctx.globalAlpha = bubble.alpha * opacityScale;
      ctx.strokeStyle = "#d6fbff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawSeaFloor(ctx, alpha) {
    const rocks = this.assets.get(UNDERWATER_ASSETS.foregroundRocks);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (rocks) {
      ctx.drawImage(rocks, 0, this.height - this.height * 0.22, this.width, this.height * 0.24);
    } else {
      const floor = ctx.createLinearGradient(0, this.height * 0.76, 0, this.height);
      floor.addColorStop(0, "rgba(2, 47, 64, 0)");
      floor.addColorStop(1, "#02121f");
      ctx.fillStyle = floor;
      ctx.fillRect(0, this.height * 0.72, this.width, this.height * 0.28);
      ctx.fillStyle = "#07354b";
      for (let i = 0; i < 14; i += 1) {
        ctx.beginPath();
        ctx.ellipse(i * this.width / 12, this.height - 8, 80 + (i % 3) * 35, 34 + (i % 4) * 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.drawStarfish(ctx);
    ctx.restore();
  }

  drawStarfish(ctx) {
    const starfish = this.assets.get(UNDERWATER_ASSETS.starfish);
    const x = this.width * 0.16;
    const y = this.height - 64;
    if (starfish) {
      ctx.drawImage(starfish, x - 28, y - 28, 56, 56);
      return;
    }
    ctx.fillStyle = "#ffc36b";
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 ? 15 : 32;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  }

  drawPlants(ctx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const plant of this.plants) {
      const sway = Math.sin(this.time * 1.4 + plant.phase) * 18;
      ctx.strokeStyle = plant.color;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(plant.x, this.height);
      ctx.bezierCurveTo(plant.x + sway * 0.25, this.height - plant.h * 0.35, plant.x + sway, this.height - plant.h * 0.72, plant.x + sway * 0.45, this.height - plant.h);
      ctx.stroke();
    }
    ctx.fillStyle = "#bf5d80";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(this.width * (0.65 + i * 0.055), this.height - 38 - (i % 2) * 18, 18 + i * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  spawnFish() {
    this.fish.push(this.createFish());
  }

  createFish() {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const layerRoll = Math.random();
    const layer = layerRoll < 0.48 ? "distant" : layerRoll < 0.88 ? "medium" : "foreground";
    const sizeBase = layer === "distant" ? 32 : layer === "medium" ? 56 : 82;
    return {
      x: direction > 0 ? -80 - Math.random() * 200 : this.width + 80 + Math.random() * 200,
      y: this.height * (0.12 + Math.random() * 0.46),
      direction,
      speed: (layer === "distant" ? 20 : layer === "medium" ? 42 : 68) + Math.random() * 38,
      size: sizeBase + Math.random() * sizeBase * 0.45,
      alpha: layer === "distant" ? 0.22 : layer === "medium" ? 0.48 : 0.36,
      layer,
      wobble: 0.8 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      color: ["#69d7df", "#9de6c4", "#dcb36c"][Math.floor(Math.random() * 3)],
      asset: UNDERWATER_ASSETS.fish[Math.floor(Math.random() * UNDERWATER_ASSETS.fish.length)],
    };
  }

  spawnBubble(foreground) {
    this.bubbles.push(this.createBubble(false, foreground));
  }

  createBubble(fromBottom = false, foreground = Math.random() > 0.65) {
    return {
      x: Math.random() * this.width,
      y: fromBottom ? this.height + 20 : Math.random() * this.height,
      size: (foreground ? 5 : 2) + Math.random() * (foreground ? 12 : 7),
      speed: 24 + Math.random() * (foreground ? 72 : 40),
      drift: 0.7 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.4 + Math.random() * 0.32,
      foreground,
    };
  }

  getQuality() {
    const key = this.effects === "high" ? "high" : this.effects === "low" ? "performance" : "balanced";
    return QUALITY_PRESETS[key];
  }
}
