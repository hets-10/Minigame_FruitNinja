let nextObjectId = 1;

export class GameObject {
  constructor({ image, type, width, height, canvasWidth, canvasHeight, level, difficultyMultiplier }) {
    this.id = nextObjectId++;
    this.image = image;
    this.type = type;
    this.width = width;
    this.height = height;
    this.scale = 1;
    this.collisionRadius = Math.max(width, height) * 0.43;
    this.x = canvasWidth * (0.12 + Math.random() * 0.76);
    this.y = canvasHeight + height;
    this.previousX = this.x;
    this.previousY = this.y;
    const direction = this.x < canvasWidth / 2 ? 1 : -1;
    const speedFactor = difficultyMultiplier * (1 + level * 0.035);
    this.vx = direction * (120 + Math.random() * 260) * speedFactor;
    this.vy = -(880 + Math.random() * 260 + level * 24) * speedFactor;
    this.gravity = 820 + Math.random() * 120 + level * 8;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 4;
    this.sliced = false;
    this.opacity = 1;
    this.spawnTimestamp = performance.now();
    this.buoyancyPhase = Math.random() * Math.PI * 2;
    this.drift = (Math.random() - 0.5) * 24;
    this.missed = false;
  }

  update(deltaSeconds, timeSeconds) {
    this.previousX = this.x;
    this.previousY = this.y;
    if (this.sliced) {
      this.opacity -= deltaSeconds * 1.9;
      this.scale *= 1 - deltaSeconds * 0.75;
      this.vy += this.gravity * 0.35 * deltaSeconds;
      this.rotationSpeed *= 1.015;
    } else {
      this.vy += this.gravity * deltaSeconds;
      this.vx += Math.sin(timeSeconds * 1.7 + this.buoyancyPhase) * this.drift * deltaSeconds;
    }
    this.x += this.vx * deltaSeconds;
    this.y += this.vy * deltaSeconds;
    this.rotation += this.rotationSpeed * deltaSeconds;
  }

  markSliced() {
    this.sliced = true;
    this.vy *= 0.45;
    this.vx *= 1.25;
    this.rotationSpeed += Math.sign(this.rotationSpeed || 1) * 5;
  }

  isOffscreen(canvasHeight) {
    return this.opacity <= 0.02 || this.y > canvasHeight + this.height * 1.8;
  }

  getCircle() {
    return { x: this.x, y: this.y, radius: this.collisionRadius * this.scale };
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);
    if (this.image?.complete && this.image.naturalWidth > 0) {
      ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      drawFallbackObject(ctx, this.type, this.width, this.height);
    }
    ctx.restore();
  }
}

function drawFallbackObject(ctx, type, width, height) {
  if (type === "bad") {
    const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, width * 0.48);
    gradient.addColorStop(0, "#7ef9ff");
    gradient.addColorStop(0.55, "#154e7a");
    gradient.addColorStop(1, "#051924");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(width, height) * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9ee8ff";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#d8fbff";
    ctx.font = `${Math.round(width * 0.34)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", 0, 2);
    return;
  }
  const gradient = ctx.createRadialGradient(-width * 0.15, -height * 0.15, 5, 0, 0, width * 0.5);
  gradient.addColorStop(0, "#f4fff7");
  gradient.addColorStop(0.45, "#76f7c4");
  gradient.addColorStop(1, "#068487");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    const radius = i % 2 ? width * 0.32 : width * 0.46;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c9fff4";
  ctx.lineWidth = 3;
  ctx.stroke();
}
