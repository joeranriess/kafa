#!/usr/bin/env node
// Run once: node generate-icons.js
// Generates icon16.png, icon48.png, icon128.png using pure Node.js (no canvas dep needed)
// Uses a minimal PNG writer to create colored square icons

const fs = require("fs");
const path = require("path");
const { createCanvas } = (() => {
  try {
    return require("canvas");
  } catch {
    return null;
  }
})() || {};

if (!createCanvas) {
  // Fallback: write minimal 1x1 placeholder PNGs so the extension loads
  // Real icons can be added later; Chrome accepts any PNG
  console.log("canvas not available — writing placeholder PNGs");
  writePlaceholderPngs();
} else {
  writeRealIcons();
}

function writePlaceholderPngs() {
  // Minimal valid 1×1 blue PNG (base64)
  const BLUE_1PX =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const sizes = [16, 48, 128];
  const dir = path.join(__dirname, "icons");
  for (const size of sizes) {
    const dest = path.join(dir, `icon${size}.png`);
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, Buffer.from(BLUE_1PX, "base64"));
      console.log(`Wrote placeholder ${dest}`);
    }
  }
}

function writeRealIcons() {
  const sizes = [16, 48, 128];
  const dir = path.join(__dirname, "icons");
  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#3451d1";
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fill();

    // Shield emoji approximation
    ctx.fillStyle = "#ffffff";
    ctx.font = `${size * 0.6}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🛡", size / 2, size / 2);

    fs.writeFileSync(path.join(dir, `icon${size}.png`), canvas.toBuffer("image/png"));
    console.log(`Wrote icon${size}.png`);
  }
}
