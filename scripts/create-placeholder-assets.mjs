import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function writePng(path, width, height, painter) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = painter(x, y, width, height);
      const index = 1 + x * 4;
      row[index] = r;
      row[index + 1] = g;
      row[index + 2] = b;
      row[index + 3] = a;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(join(root, path), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

const radial = (colors, transparent = true) => (x, y, width, height) => {
  const cx = width / 2;
  const cy = height / 2;
  const d = Math.hypot((x - cx) / width, (y - cy) / height) * 2;
  const t = Math.min(1, d);
  const c0 = colors[0];
  const c1 = colors[1];
  const a = transparent && t > 0.86 ? Math.max(0, 255 * (1 - (t - 0.86) / 0.14)) : 255;
  return [
    Math.round(c0[0] + (c1[0] - c0[0]) * t),
    Math.round(c0[1] + (c1[1] - c0[1]) * t),
    Math.round(c0[2] + (c1[2] - c0[2]) * t),
    a,
  ];
};

writePng("public/assets/good/good1.png", 128, 128, radial([[218, 255, 229], [12, 154, 144]]));
writePng("public/assets/good/good2.png", 128, 128, radial([[255, 247, 184], [16, 132, 174]]));
writePng("public/assets/good/good3.png", 128, 128, radial([[240, 255, 255], [116, 91, 198]]));
writePng("public/assets/bad/bomb1.png", 128, 128, radial([[167, 249, 255], [2, 18, 31]]));
writePng("public/assets/bad/bomb2.png", 128, 128, radial([[235, 246, 255], [55, 25, 78]]));
writePng("public/assets/effects/bubble.png", 96, 96, radial([[255, 255, 255], [112, 222, 244]]));
writePng("public/assets/effects/sparkle.png", 96, 96, radial([[255, 255, 255], [124, 242, 255]]));
writePng("public/assets/effects/explosion.png", 128, 128, radial([[228, 255, 255], [4, 36, 55]]));
writePng("public/assets/underwater/bubble.png", 96, 96, radial([[255, 255, 255], [122, 224, 245]]));
writePng("public/assets/underwater/fish1.png", 140, 80, radial([[131, 232, 221], [22, 112, 143]]));
writePng("public/assets/underwater/fish2.png", 140, 80, radial([[250, 206, 126], [191, 82, 121]]));
writePng("public/assets/underwater/fish3.png", 140, 80, radial([[187, 242, 255], [87, 101, 193]]));
writePng("public/assets/underwater/seaweed1.png", 80, 180, radial([[64, 210, 155], [7, 83, 89]]));
writePng("public/assets/underwater/seaweed2.png", 80, 180, radial([[89, 230, 178], [13, 107, 103]]));
writePng("public/assets/underwater/coral1.png", 140, 120, radial([[255, 178, 194], [170, 71, 124]]));
writePng("public/assets/underwater/coral2.png", 140, 120, radial([[255, 205, 128], [185, 83, 112]]));
writePng("public/assets/underwater/starfish.png", 100, 100, radial([[255, 226, 143], [232, 128, 76]]));
writePng("public/assets/underwater/foreground-rocks.png", 600, 160, radial([[23, 86, 103], [2, 20, 33]], false));
writePng("public/assets/underwater/background.jpg", 900, 600, (x, y, width, height) => {
  const t = y / height;
  const ray = Math.max(0, Math.sin(x * 0.035 + y * 0.012) * 20);
  return [Math.round(7 + 8 * (1 - t) + ray), Math.round(38 + 104 * (1 - t) + ray), Math.round(70 + 85 * (1 - t) + ray), 255];
});
