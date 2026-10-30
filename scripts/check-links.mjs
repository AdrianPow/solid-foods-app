// Checks that each food's Solid Starts link points to a page that exists,
// using the public sitemap Solid Starts publishes for search engines
// (one request; no food pages are downloaded).
//
// Usage: npm run check:links
import { FOODS } from "../js/data/index.js";

const res = await fetch("https://solidstarts.com/sitemap.xml");
if (!res.ok) throw new Error(`Couldn't fetch the sitemap (HTTP ${res.status}).`);
const xml = await res.text();
const slugs = new Set([...xml.matchAll(/<loc>https:\/\/solidstarts\.com\/foods\/([^/<]+)\/<\/loc>/g)].map((m) => m[1]));

const broken = FOODS.filter((f) => f.ss && !slugs.has(f.ss));
const unlinked = FOODS.filter((f) => !f.ss).map((f) => f.id);
console.log(`${FOODS.length} foods, ${FOODS.length - unlinked.length} linked, ${slugs.size} food pages in the sitemap.`);
if (unlinked.length) console.log(`No Solid Starts page (search link only): ${unlinked.join(", ")}`);
if (broken.length) {
  console.log("Links to pages that don't exist:");
  for (const f of broken) console.log(`  ${f.id}: ${f.ss}`);
  process.exitCode = 1;
} else {
  console.log("All links point to existing pages.");
}
