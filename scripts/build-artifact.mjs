// Builds a single self-contained page (dist/first-bites.html) for hosting as
// a claude.ai Artifact. The page skeleton (doctype, head, body) is added by
// the Artifact host, so this file holds only the title, styles, markup and
// one bundled script.
//
// Usage: npm run build:artifact
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const html = await readFile(root + "index.html", "utf8");
const css = await readFile(root + "css/styles.css", "utf8");

const markup = html.match(/<!-- app:start -->([\s\S]*?)<!-- app:end -->/);
if (!markup) throw new Error("index.html is missing the app:start / app:end markers");
const fonts = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)">/);

const bundle = await build({
  entryPoints: [root + "js/app.js"],
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  write: false,
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const page = `<title>First Bites</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts ? `<link rel="stylesheet" href="${fonts[1]}">` : ""}
<style>
${css}
</style>
${markup[1].trim()}
<script>
${js}
</script>
`;

await mkdir(root + "dist", { recursive: true });
await writeFile(root + "dist/first-bites.html", page);
console.log(`wrote dist/first-bites.html (${(page.length / 1024).toFixed(0)} KB)`);
