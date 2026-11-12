// Generates js/data/icons.js: the food tile and outcome icons, taken from Microsoft's
// Fluent Emoji Flat set (MIT licensed, via @iconify-json/fluent-emoji-flat)
// plus recolored variants for foods that have no emoji of their own.
// Only icons referenced in js/data/food-icons.js or OUTCOMES are included.
//
// Usage: npm run build:icons
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CATEGORY_ICONS, FOOD_ICONS } from "../js/data/food-icons.js";
import { OUTCOMES } from "../js/data/meta.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const set = JSON.parse(await readFile(root + "node_modules/@iconify-json/fluent-emoji-flat/icons.json", "utf8"));

// Variant name: [base icon, target color, optional source color]. The base
// icon's main color (or the given source color) and everything close to it
// is shifted to the target; other parts (leaves, stems, lids) are left alone.
const VARIANTS = {
  apricot: ["peach", "#f2a03d"],
  nectarine: ["peach", "#e8573f"],
  plum: ["peach", "#7d3269"],
  prune: ["peach", "#4a2238"],
  fig: ["peach", "#8f4f74"],
  cantaloupe: ["melon", "#f2a35e"],
  jackfruit: ["melon", "#c9c141"],
  grapefruit: ["tangerine", "#f2766a"],
  pomelo: ["tangerine", "#d7e078"],
  lychee: ["tangerine", "#e45a6e"],
  longan: ["tangerine", "#c9a36b"],
  rambutan: ["tangerine", "#d63c3c"],
  pumpkin: ["tangerine", "#e2761f"],
  "passion-fruit": ["red-apple", "#5c2b60"],
  pomegranate: ["red-apple", "#a81c2e"],
  "dragon-fruit": ["red-apple", "#e0398f"],
  mangosteen: ["red-apple", "#4a1f3b"],
  persimmon: ["tomato", "#f28a26", "#f8312f"],
  tomatillo: ["tomato", "#9cc24c", "#f8312f"],
  // The berries name their own color: the icon's largest shape is a pale
  // highlight, and shifting from that turns every berry near-black.
  blackberry: ["blueberries", "#3a2b5e", "#6b438b"],
  raspberry: ["blueberries", "#e3405f", "#6b438b"],
  cranberry: ["blueberries", "#c2243a", "#6b438b"],
  currant: ["blueberries", "#8a1c33", "#6b438b"],
  gooseberry: ["blueberries", "#a0cb5c", "#6b438b"],
  goji: ["blueberries", "#e95b2b", "#6b438b"],
  acai: ["blueberries", "#5a2f6e", "#6b438b"],
  puffs: ["rosette", "#f0d9a4"],
  raisin: ["grapes", "#5b3524"],
  date: ["beans", "#5c3120"],
  "beans-black": ["beans", "#2e2b2b"],
  "beans-red": ["beans", "#8f1f2b"],
  "beans-white": ["beans", "#eee4ca"],
  "beans-tan": ["beans", "#d9b36b"],
  "beans-orange": ["beans", "#e2793a"],
  "beans-green": ["beans", "#7ba34b"],
  "beans-lime": ["beans", "#c2d690"],
  "beans-yellow": ["beans", "#e3c34a"],
  "beans-pinto": ["beans", "#c9946b"],
  tamarind: ["peanuts", "#7b4a2b"],
  pistachio: ["chestnut", "#9cb95b"],
  "nut-cream": ["chestnut", "#e9d4a9"],
  almond: ["chestnut", "#ba794b"],
  "jar-brown": ["jar", "#8a5a32"],
  "jar-red": ["jar", "#c8352f"],
  "jar-yellow": ["jar", "#e8be3a"],
  "jar-cream": ["jar", "#efe3c4"],
  "spice-brown": ["salt", "#a2643b"],
  "spice-red": ["salt", "#c9472f"],
  "spice-yellow": ["salt", "#e4b33d"],
  pepper: ["salt", "#3b3b3b"],
  "cheese-white": ["cheese-wedge", "#f5f1e4"],
  cheddar: ["cheese-wedge", "#f2a334"],
  "white-block": ["butter", "#f6f4ec"],
  tempeh: ["butter", "#caa56b"],
  "salmon-fish": ["fish", "#f28c6b"],
  "silver-fish": ["fish", "#9ba9b6"],
  "fish-gray": ["fish", "#5c6771"],
  "red-fish": ["fish", "#e0503e"],
  mussel: ["oyster", "#2c3651"],
  pork: ["cut-of-meat", "#e9a2a2"],
  ham: ["cut-of-meat", "#f2a9b4"],
  liver: ["cut-of-meat", "#6b2b2b"],
  seitan: ["cut-of-meat", "#caa16b"],
  cauliflower: ["broccoli", "#f0eada"],
  romanesco: ["broccoli", "#a9d05b"],
  cabbage: ["leafy-green", "#a9d18b"],
  celery: ["leafy-green", "#bcd98c"],
  endive: ["leafy-green", "#e3e6a2"],
  rhubarb: ["leafy-green", "#c43a4c"],
  artichoke: ["leafy-green", "#7b9b6b"],
  zucchini: ["cucumber", "#3f6c2b"],
  pickle: ["cucumber", "#7b8b3b"],
  okra: ["hot-pepper", "#6ba94b", "#f8312f"],
  beet: ["onion", "#8b1b4b"],
  radish: ["onion", "#e24b6b"],
  turnip: ["onion", "#ede1f1"],
  shallot: ["onion", "#b9616b"],
  kohlrabi: ["onion", "#a9cd6b"],
  rutabaga: ["onion", "#d9b96b"],
  fennel: ["onion", "#d6e6b4"],
  daikon: ["carrot", "#f3f0e5", "#ff6723"],
  parsnip: ["carrot", "#ebdaa9", "#ff6723"],
  leek: ["carrot", "#dfe8b8", "#ff6723"],
  asparagus: ["carrot", "#6fa84a", "#ff6723"],
  "potato-light": ["potato", "#e4d7b1"],
  taro: ["potato", "#8b7b8b"],
  yam: ["potato", "#6b4b3b"],
  plantain: ["banana", "#80af4b"],
  "star-fruit": ["lemon", "#e7e15b"],
  quince: ["pear", "#e9c94b"],
  "asian-pear": ["pear", "#d9b975"],
  chayote: ["pear", "#b1d171"],
  feijoa: ["pear", "#6b8b3b"],
  butternut: ["pear", "#e9a151"],
  papaya: ["mango", "#f28b3b"],
  "wild-rice": ["cooked-rice", "#4b3b2b", "#ffffff"],
  quinoa: ["cooked-rice", "#e1c991", "#ffffff"],
  couscous: ["cooked-rice", "#edd37b", "#ffffff"],
  sugar: ["ice", "#f8f8f3"],
  marshmallow: ["ice", "#fce9ef"],
  kombucha: ["sake", "#c98b3b"],
  "soy-sauce": ["sake", "#3b2519"],
  "duck-egg": ["egg", "#dfeae5"],
  "quail-egg": ["egg", "#e9d9b9"],
  // Leaves and herbs
  "leafy-dark": ["leafy-green", "#2f7d4f"],
  kale: ["leafy-green", "#5f8f7f"],
  "hearts-of-palm": ["cucumber", "#ece3c6"],
  "herb-blue": ["herb", "#5aa88a"],
  mint: ["leaf-fluttering-in-wind", "#35c48d", "#008463"],
  sage: ["leaf-fluttering-in-wind", "#9fb59c", "#008463"],
  chives: ["sheaf-of-rice", "#5fa53a"],
  lemongrass: ["sheaf-of-rice", "#c3d67a"],
  seaweed: ["coral", "#3f8f5a"],
  // Spices
  "spice-dark": ["salt", "#5c3520"],
  "spice-tan": ["salt", "#c9a56a"],
  "spice-green": ["salt", "#a9b87a"],
  nutmeg: ["chestnut", "#8f6243"],
  vanilla: ["hot-pepper", "#4a2c1e", "#f8312f"],
  cardamom: ["peanuts", "#9ab86a"],
  "star-anise": ["rosette", "#8a4f2e"],
  cinnamon: ["baguette-bread", "#a65e2e", "#f3ad61"],
  // Grains and baked things
  "sheaf-brown": ["sheaf-of-rice", "#9a6b3a"],
  bulgur: ["cooked-rice", "#c9a468", "#ffffff"],
  millet: ["cooked-rice", "#f2cf4f", "#ffffff"],
  amaranth: ["cooked-rice", "#efe6c4", "#ffffff"],
  "bowl-tan": ["bowl-with-spoon", "#c9965a", "#00a6ed"],
  "bowl-green": ["bowl-with-spoon", "#6dbb6a", "#00a6ed"],
  muffin: ["cupcake", "#c98f52", "#ff6dc6"],
  cracker: ["cookie", "#ecd09a", "#f3ad61"],
  chips: ["potato", "#f1cd62"],
  // Fish
  "fish-white": ["fish", "#dfe6ea"],
  "fish-sand": ["fish", "#cdb588"],
  "fish-brown": ["fish", "#7d6a55"],
  "fish-navy": ["fish", "#2f4f85"],
  // Cheese and milks
  "cheese-round": ["moon-cake", "#f4eeda"],
  burrata: ["garlic", "#f6f3ea"],
  "string-cheese": ["baguette-bread", "#f3edd8", "#f3ad61"],
  halloumi: ["butter", "#f0dfae"],
  "cheese-pale": ["cheese-wedge", "#f1e2a6"],
  "cheese-gold": ["cheese-wedge", "#e8b84a"],
  "milk-almond": ["glass-of-milk", "#dcbc8e"],
  "milk-oat": ["glass-of-milk", "#efe2b8"],
  "milk-soy": ["glass-of-milk", "#cfe0a8"],
  // Nuts and seeds
  "seeds-brown": ["beans", "#8a5a32"],
  "seeds-hemp": ["beans", "#b9b78a"],
  "seeds-poppy": ["beans", "#3d4763"],
  walnut: ["chestnut", "#b08a5a"],
  pecan: ["chestnut", "#8a4a2a"],
  "brazil-nut": ["chestnut", "#5f4636"],
  // Cuts of meat
  bison: ["cut-of-meat", "#8a2b2b"],
  venison: ["cut-of-meat", "#6e2a3a"],
  veal: ["cut-of-meat", "#dc8f84"],
};

// ---- color helpers ----
function hexToRgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function rgbToHex(rgb) {
  return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
}
function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb([h, s, l]) {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const hueDist = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// The color covering the most of the icon, judged by path data length.
function dominantColor(body) {
  const weight = new Map();
  for (const m of body.matchAll(/fill="(#[0-9a-fA-F]{3,6})"(?:[^>]*?) d="([^"]*)"|d="([^"]*)"(?:[^>]*?) fill="(#[0-9a-fA-F]{3,6})"/g)) {
    const color = (m[1] || m[4]).toLowerCase();
    const len = (m[2] || m[3]).length;
    weight.set(color, (weight.get(color) || 0) + len);
  }
  return [...weight.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function recolor(body, target, source) {
  const from = rgbToHsl(hexToRgb(source || dominantColor(body)));
  const to = rgbToHsl(hexToRgb(target));
  const neutral = from[1] < 0.15;
  return body.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (hex) => {
    const c = rgbToHsl(hexToRgb(hex));
    const similar = neutral
      ? c[1] < 0.3 && Math.abs(c[2] - from[2]) < 0.4
      : c[1] > 0.12 && hueDist(c[0], from[0]) < 38 && Math.abs(c[2] - from[2]) < 0.45;
    if (!similar) return hex;
    const h = neutral ? to[0] : to[0] + (c[0] - from[0]);
    const s = neutral ? to[1] : clamp(to[1] * (c[1] / Math.max(from[1], 0.01)));
    const l = clamp(to[2] + (c[2] - from[2]), 0.04, 0.98);
    return rgbToHex(hslToRgb([h, s, l]));
  });
}

// How much of an icon is very pale or very dark, judged like dominantColor.
// Pale icons fade into the light theme's pastel tiles, and dark ones into the
// dark theme's tiles, so the app gives those a faint outline.
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function tone(body) {
  let total = 0;
  let pale = 0;
  let dark = 0;
  const add = (hex, weight) => {
    const lum = luminance(hex);
    total += weight;
    if (lum > 0.62) pale += weight;
    if (lum < 0.08) dark += weight;
  };
  for (const m of body.matchAll(/fill="(#[0-9a-fA-F]{3,6})"(?:[^>]*?) d="([^"]*)"|d="([^"]*)"(?:[^>]*?) fill="(#[0-9a-fA-F]{3,6})"/g)) add(m[1] || m[4], (m[2] || m[3]).length);
  for (const m of body.matchAll(/<(?:circle|ellipse|rect)[^>]*fill="(#[0-9a-fA-F]{3,6})"/g)) add(m[1], 120);
  return { pale: pale / total, dark: dark / total };
}

// Pale icons the measure above misses, because a small colored part (a leaf,
// a lid, a glass) outweighs the pale body.
const ALSO_PALE = new Set(["cheese-round", "daikon", "fish-white", "jar-cream", "leek", "marshmallow", "milk-almond", "parsnip"]);

// Shorten numbers and prefix internal ids so icons can share one page.
function tidy(body, key) {
  return body
    .replace(/(\d+\.\d)\d+/g, "$1")
    .replace(/id="([^"]+)"/g, `id="${key}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${key}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${key}-$1"`);
}

const wanted = new Set([...Object.values(FOOD_ICONS), ...Object.values(CATEGORY_ICONS), ...OUTCOMES.map((o) => o.icon)]);
const out = {};
const outline = { pale: [], dark: [] };
const foodIcons = new Set([...Object.values(FOOD_ICONS), ...Object.values(CATEGORY_ICONS)]);
for (const key of [...wanted].sort()) {
  const variant = VARIANTS[key];
  const baseName = variant ? variant[0] : key;
  const base = set.icons[baseName];
  if (!base) throw new Error(`Unknown icon "${baseName}" (for "${key}")`);
  const body = variant ? recolor(base.body, variant[1], variant[2]) : base.body;
  out[key] = tidy(body, key);
  if (!foodIcons.has(key)) continue;
  const t = tone(body);
  if (t.pale > 0.8 || ALSO_PALE.has(key)) outline.pale.push(key);
  if (t.dark > 0.38) outline.dark.push(key);
}

const header = `// Generated by scripts/build-icons.mjs. Do not edit by hand.
// Icons: Fluent Emoji Flat, Copyright (c) Microsoft Corporation, MIT License
// (https://github.com/microsoft/fluentui-emoji). Some are recolored.
`;
const list = (keys) => JSON.stringify(keys).replace(/","/g, '", "');
const js = `${header}export const ICON_VIEWBOX = "0 0 32 32";

// Icons that need a faint outline to show up on their tile: pale ones in the
// light theme, dark ones in the dark theme.
export const ICON_OUTLINE = {
  pale: new Set(${list(outline.pale)}),
  dark: new Set(${list(outline.dark)}),
};

export const ICONS = ${JSON.stringify(out, null, 0).replace(/","/g, '",\n"')};
`;
await writeFile(root + "js/data/icons.js", js);
console.log(`wrote js/data/icons.js: ${Object.keys(out).length} icons, ${(js.length / 1024).toFixed(0)} KB`);
console.log(`outlined when pale: ${outline.pale.join(" ")}`);
console.log(`outlined when dark: ${outline.dark.join(" ")}`);
