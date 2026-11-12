// Offline support for the installed app.
//
// The app's own files are fetched from the network first, so a newly
// published version shows up on the next load; the cached copy is used when
// offline, or when the connection is too weak to open the page in a few
// seconds. Google Fonts come from the cache once downloaded. Everything
// else (Firebase sync traffic, links out) is left alone: caching those would
// serve stale data.
const CACHE = "first-bites-v9";
const SHELL = [
  "./",
  "index.html",
  "css/styles.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "js/app.js",
  "js/theme.js",
  "js/logic.js",
  "js/store.js",
  "js/cloud.js",
  "js/label.js",
  "js/sync-config.js",
  "js/vendor/firebase.js",
  "js/vendor/chunk-UQGNWA5L.js",
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
  if (url.origin === self.location.origin) event.respondWith(networkFirst(event));
  else if (FONT_HOSTS.has(url.hostname)) event.respondWith(cacheFirst(request));
});

// How long opening the page waits for the network before using the cache.
const PAGE_TIMEOUT_MS = 3000;
// After that, the page's other files come from the cache too for this
// long, so one load never mixes cached files with newer ones.
const CACHED_LOAD_MS = 20000;
let cachedLoadUntil = 0;

async function networkFirst(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const isPage = request.mode === "navigate";
  const fromCache = async () => (await cache.match(request)) || (isPage && (await cache.match("./"))) || null;
  if (isPage) cachedLoadUntil = 0;
  else if (Date.now() < cachedLoadUntil) {
    const cached = await fromCache();
    if (cached) return cached;
  }
  // "no-cache" asks the server whether the file changed (cheap when it hasn't).
  let gaveUp = false;
  const network = fetch(request, { cache: "no-cache" }).then((response) => {
    if (response.ok && !gaveUp) {
      const saved = cache.put(request, response.clone()).catch(() => {});
      try {
        event.waitUntil(saved);
      } catch {
        // The request was already answered; the copy is still being saved.
      }
    }
    return response;
  });
  try {
    if (!isPage) return await network;
    const timeout = new Promise((resolve) => setTimeout(resolve, PAGE_TIMEOUT_MS, null));
    const response = await Promise.race([network, timeout]);
    if (response) return response;
  } catch (err) {
    const cached = await fromCache();
    if (!cached) throw err;
    if (isPage) cachedLoadUntil = Date.now() + CACHED_LOAD_MS;
    return cached;
  }
  // The page is taking too long: open the cached copy if there is one.
  const cached = await fromCache();
  if (!cached) return network;
  gaveUp = true;
  network.catch(() => {});
  cachedLoadUntil = Date.now() + CACHED_LOAD_MS;
  return cached;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") cache.put(request, response.clone());
  return response;
}
