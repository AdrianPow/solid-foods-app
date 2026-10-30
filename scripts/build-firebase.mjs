// Bundles the Firebase SDK pieces used for syncing into js/vendor/firebase.js,
// so the app loads it from its own site (works offline, no CDN needed).
// The app only loads this file when js/sync-config.js has a Firebase config.
//
// Usage: npm run build:firebase
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const { version } = JSON.parse(await readFile(root + "node_modules/firebase/package.json", "utf8"));

await build({
  entryPoints: [root + "scripts/firebase-entry.js"],
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2020",
  platform: "browser",
  legalComments: "none",
  banner: { js: `// Firebase JS SDK ${version}, Copyright Google LLC, Apache License 2.0. Bundled by scripts/build-firebase.mjs.` },
  outfile: root + "js/vendor/firebase.js",
});
const size = (await readFile(root + "js/vendor/firebase.js")).length;
console.log(`wrote js/vendor/firebase.js (${(size / 1024).toFixed(0)} KB)`);
