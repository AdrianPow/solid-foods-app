// Offline support for the installed app.
//
// The app's own files are fetched from the network first, so a newly
// published version shows up on the next load; the cached copy is only used
// when offline. Google Fonts come from the cache once downloaded. Everything
// else (Firebase sync traffic, links out) is left alone: caching those would
// serve stale data.
const CACHE = "first-bites-v4";
const SHELL = [
  "./",
  "index.html",
  "css/styles.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "js/app.js",
  "js/logic.js",
  "js/store.js",
  "js/cloud.js",
  "js/sync-config.js",
  "js/vendor/firebase.js",
  "js/data/index.js",
  "js/data/icons.js",
  "js/data/food-icons.js",
  "js/data/define.js",
  "js/data/meta.js",
  "js/data/guide.js",
  "js/data/fruits.js",
  "js/data/vegetables.js",
  "js/data/grains.js",
  "js/data/legumes.js",
  "js/data/meat.js",
  "js/data/fish.js",
  "js/data/dairy.js",
  "js/data/nuts.js",
  "js/data/herbs.js",
  "js/data/pantry.js",
  "js/data/drinks.js",
];

const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

self.addEventListener("install", (event) => {
  // cache: "reload" skips the browser's HTTP cache, so the precache holds
  // what is on the server now, not a copy from a few minutes ago.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
  else if (FONT_HOSTS.has(url.hostname)) event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    // "no-cache" asks the server whether the file changed (cheap when it hasn't).
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = (await cache.match(request)) || (request.mode === "navigate" && (await cache.match("./")));
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") cache.put(request, response.clone());
  return response;
}
