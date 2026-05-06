self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).then(res => {
      const h = new Headers(res.headers);
      h.set("Cross-Origin-Embedder-Policy", "require-corp");
      h.set("Cross-Origin-Opener-Policy", "same-origin");
      return new Response(res.body, { headers: h });
    })
  );
});
