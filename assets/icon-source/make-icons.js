// Renders every app icon from one drawing of the bulb.
//   node assets/icon-source/make-icons.js   (needs @resvg/resvg-js: npm i --no-save @resvg/resvg-js)
// Outputs into assets/images/:
//   icon.png             1024, full bleed, no transparency (iOS home screen + App Store)
//   adaptive-icon.png    Android adaptive foreground: bulb inside the safe zone, transparent
//   adaptive-bg.png      Android adaptive background: the gradient
//   monochrome-icon.png  Android 13+ themed icon: bulb only
//   splash-icon.png      rounded tile for the splash screen
//   favicon.png          48 px, web
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { Resvg } = require("@resvg/resvg-js");

const OUT = path.join(__dirname, "..", "images");

// The bulb, drawn on a 520 x 520 square (the original artwork's tile).
const BULB = `
  <path d="M 291 396 C 290 380 282 367 266.6 351.4 A 118 118 0 1 1 433.4 351.4 C 418 367 410 380 409 396"
        fill="none" stroke="FILL" stroke-width="67" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="258" y="437" width="186" height="65" rx="32.5" fill="FILL"/>
  <rect x="278" y="515" width="146" height="67" rx="33.5" fill="FILL"/>`;
// The bulb's own centre on that square, used to scale it about itself.
const BULB_CX = 350.5;
const BULB_CY = 349;
const INK = "#121212";

const GRADIENT = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF9410"/>
      <stop offset="1" stop-color="#FFF35A"/>
    </linearGradient>
  </defs>`;

const bulb = (fill, scale = 1) =>
  `<g transform="translate(350 350) scale(${scale}) translate(${-BULB_CX} ${-BULB_CY})">${BULB.replace(/FILL/g, fill)}</g>`;

const svg = (body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="90 90 520 520" width="520" height="520">${defs}${body}</svg>`;

const DRAWINGS = {
  // Full bleed: iOS rounds the corners itself and refuses transparency.
  icon: svg(`<rect x="90" y="90" width="520" height="520" fill="url(#g)"/>${bulb(INK, 0.8)}`, GRADIENT),
  // Android shows the middle 72/108 of an adaptive icon and may mask it to a circle as small as
  // 66/108 across, so the bulb is kept inside that circle.
  "adaptive-icon": svg(bulb(INK, 0.6)),
  "adaptive-bg": svg(`<rect x="90" y="90" width="520" height="520" fill="url(#g)"/>`, GRADIENT),
  "monochrome-icon": svg(bulb("#FFFFFF", 0.6)),
  "splash-icon": svg(
    `<rect x="90" y="90" width="520" height="520" rx="116" fill="url(#g)"/>${bulb(INK, 0.86)}`,
    GRADIENT
  ),
  favicon: svg(`<rect x="90" y="90" width="520" height="520" rx="96" fill="url(#g)"/>${bulb(INK, 0.8)}`, GRADIENT),
};

const SIZES = {
  icon: 1024,
  "adaptive-icon": 1024,
  "adaptive-bg": 1024,
  "monochrome-icon": 1024,
  "splash-icon": 1024,
  favicon: 48,
};

// PNG writer, so icon.png can be saved with no alpha channel at all (App Store Connect rejects one).
function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(rgba, size, withAlpha) {
  const bpp = withAlpha ? 4 : 3;
  const raw = Buffer.alloc((size * bpp + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * bpp + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      const d = y * (size * bpp + 1) + 1 + x * bpp;
      raw[d] = rgba[s];
      raw[d + 1] = rgba[s + 1];
      raw[d + 2] = rgba[s + 2];
      if (withAlpha) raw[d + 3] = rgba[s + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = withAlpha ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(__dirname, "icon.svg"), DRAWINGS.icon + "\n");
for (const [name, drawing] of Object.entries(DRAWINGS)) {
  const size = SIZES[name];
  const img = new Resvg(drawing, { fitTo: { mode: "width", value: size } }).render();
  const opaque = name === "icon" || name === "adaptive-bg";
  fs.writeFileSync(path.join(OUT, `${name}.png`), encodePng(img.pixels, size, !opaque));
  console.log(`${name}.png ${size}x${size}${opaque ? " (no alpha)" : ""}`);
}
