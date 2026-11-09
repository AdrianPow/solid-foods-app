// Bundles the Firebase SDK pieces the app uses, so it loads them from its own
// site (works offline, no CDN needed):
//   js/vendor/firebase.js     syncing (sign-in and the shared log)
//   js/vendor/firebase-ai.js  reading food labels from a photo
// Both share one Firebase core (a chunk-*.js file), so they work on the same
// app instance. The app only loads them when js/sync-config.js has a config.
//
// Usage: npm run build:firebase
import { build } from "esbuild";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = root + "js/vendor/";
const { version } = JSON.parse(await readFile(root + "node_modules/firebase/package.json", "utf8"));

// Clear out old shared chunks, whose names change with their contents.
for (const name of await readdir(out)) if (name.startsWith("chunk-")) await rm(out + name);

await build({
  entryPoints: { firebase: root + "scripts/firebase-entry.js", "firebase-ai": root + "scripts/firebase-ai-entry.js" },
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: "es2020",
  platform: "browser",
  legalComments: "none",
  banner: { js: `// Firebase JS SDK ${version}, Copyright Google LLC, Apache License 2.0. Bundled by scripts/build-firebase.mjs.` },
  outdir: out,
  chunkNames: "chunk-[hash]",
});
// Keep the offline cache list pointing at the current shared chunk.
const chunk = (await readdir(out)).find((name) => name.startsWith("chunk-"));
const swPath = root + "sw.js";
const sw = await readFile(swPath, "utf8");
await writeFile(swPath, sw.replace(/"js\/vendor\/chunk-[A-Z0-9]+\.js"/, `"js/vendor/${chunk}"`));

for (const name of (await readdir(out)).sort()) {
  const size = (await readFile(out + name)).length;
  console.log(`wrote js/vendor/${name} (${(size / 1024).toFixed(0)} KB)`);
}
