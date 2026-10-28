// Offline support for the installed app: serve the app shell from cache,
// refresh it in the background when online.
const CACHE = "first-bites-v1";
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
  "js/data/index.js",
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

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Stale-while-revalidate for same-origin GETs; fonts and other hosts go to
// the network and are cached opportunistically.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response.ok || response.type === "opaque") cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
