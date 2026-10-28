// Renders the SVG app icons to the PNG sizes phones need.
// Usage: node scripts/render-icons.mjs  (needs Playwright + Chromium)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = fileURLToPath(new URL("..", import.meta.url));

// iOS draws its own rounded corners and fills transparency with black, so
// the Apple touch icon is rendered full-bleed (rx="0").
const jobs = [
  ["icons/icon.svg", "icons/icon-180.png", 180, true],
  ["icons/icon.svg", "icons/icon-192.png", 192],
  ["icons/icon.svg", "icons/icon-512.png", 512],
  ["icons/icon-maskable.svg", "icons/icon-maskable-512.png", 512],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, size, square] of jobs) {
  let svg = await readFile(root + src, "utf8");
  if (square) svg = svg.replace('rx="112"', 'rx="0"');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: root + out, omitBackground: true });
  console.log("wrote", out);
}
await browser.close();
