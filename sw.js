// QCI Assessments service worker: works offline once opened, picks up new versions automatically.
const VERSION = "qci-pwa-2.0.0";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "qci-logo.png"];
const CDN = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com", "storage.googleapis.com"];

self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== VERSION + "-cdn").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                       // never touch uploads or AI calls
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html")) {
      // the app itself: newest version when online, saved copy when offline
      e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put("index.html", c)); return r; })
        .catch(() => caches.match("index.html")));
    } else {
      e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); return r; })));
    }
    return;
  }
  if (CDN.includes(url.hostname)) {                       // libraries, fonts and the object-detection model
    e.respondWith(caches.open(VERSION + "-cdn").then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
  }
});
