// Preview 51: eigene Themenmotive und einheitliche Angebotskarten für alle Klassen.
const CACHE_PREFIX = "moni-grundschule-";
const RELEASE_CACHE = "v0.14.0-release-4";
// Schnellere Zahlenwirbel-Steine mit kontinuierlichen Rechteckkollisionen.
const SHELL_CACHE = `${CACHE_PREFIX}${RELEASE_CACHE}-shell`;
const DATA_CACHE = `${CACHE_PREFIX}${RELEASE_CACHE}-data`;
const RUNTIME_CACHE = `${CACHE_PREFIX}${RELEASE_CACHE}-runtime`;

const APP_SHELL = [
  "./app.js?v=0.14.0-release-4",
  "./styles.css?v=0.14.0-release-4b",
  "./puzzles/sunday-types.js?v=0.14.0-release-4",
  "./puzzles/sunday-presentation.js?v=0.14.0-release-4",
  "./puzzles/sunday-levels.js?v=0.14.0-release-4",
  "./puzzles/puzzle-view.js?v=0.14.0-release-4",
  "./puzzles/extension-library.js?v=0.14.0-release-4",
  "./puzzles/kenken-view.js?v=0.14.0-release-4",
  "./puzzles/kenken.js?v=0.14.0-release-4",
  "./puzzles/kenken-levels.js?v=0.14.0-release-4",
  "./assets/puzzles/kenken-example.png",
  "./assets/puzzles/kenken-solution.png",
  "./Sonntagsraetsel-07-KenKens-Aufgabenblatt.pdf?v=20261031",
  "./assets/sonntagsraetsel-07-kenkens.png?v=20261031",
  "./assets/puzzles/deka-dots-example.png",
  "./assets/puzzles/deka-dots-solution.png",
  "./assets/puzzles/deka-dots-card.svg?v=0.14.0-release-3",
  "./assets/puzzles/zahlenkreuze-card.svg?v=0.14.0-release-3",
  "./assets/puzzles/differenzpyramiden-card.svg?v=0.14.0-release-3",
  "./divisor-computer.js?v=0.14.0-release-2",
  "./divisor-computer-worker.js?v=0.14.0-release-2",
  "./divisor-game.js?v=0.14.0-release-2",
  "./divisor-game-view.js?v=0.14.0-release-2",
  "./assets/games/teiler-vielfache.svg",
  "./statistics-config.js?v=0.14.0-release-2",
  "./usage-statistics.js?v=0.14.0-release-2",
  "./video-statistics.js?v=0.14.0-release-2",
  "./index.html",
  "./browser-install.html",
  "./styles.css?v=0.14.0-release-2",
  "./audience.js?v=0.14.0-release-2",
  "./material-presentation.js?v=0.14.0-release-2",
  "./material-links.js?v=0.14.0-release-2",
  "./journey-filters.js?v=0.14.0-release-2",
  "./video-content.js?v=0.14.0-release-2",
  "./data/video-playlists.json",
  "./app.js?v=0.14.0-release-2",
  "./mental-math.js?v=0.14.0-release-2",
  "./mental-math-view.js?v=0.14.0-release-2",
  "./number-whirl.js?v=0.14.0-release-2",
  "./number-whirl-view.js?v=0.14.0-release-2",
  "./game-celebration.js?v=0.14.0-release-2",
  "./assets/celebration/mo-ni-jubelfilm.mp4",
  "./assets/celebration/mo-ni-jubelfilm-poster.png",
  "./puzzles/puzzle-view.js?v=0.14.0-release-2",
  "./puzzles/solution-presentation.js?v=0.14.0-release-2",
  "./puzzles/extension-library.js?v=0.14.0-release-2",
  "./puzzles/sunday-types.js?v=0.14.0-release-2",
  "./puzzles/sunday-presentation.js?v=0.14.0-release-2",
  "./assets/puzzles/sumdoku-example.png",
  "./assets/puzzles/sumdoku-solution.png",
  "./assets/puzzles/zahlenpfade-example.png",
  "./assets/puzzles/zahlenpfade-solution.png",
  "./assets/puzzles/zahlenkreuze-example.png",
  "./assets/puzzles/zahlenkreuze-solution.png",
  "./assets/puzzles/polyominos-example.png",
  "./assets/puzzles/polyominos-solution.png",
  "./assets/puzzles/differenzpyramiden-example.png",
  "./assets/puzzles/differenzpyramiden-solution.png",
  "./puzzles/sunday-levels.js?v=0.14.0-release-2",
  "./data/sunday-publications.json",
  "./Sonntagsraetsel-01-Sumdoku.pdf?v=20260918",
  "./puzzles/registry.js?v=0.14.0-release-2",
  "./puzzles/progress.js?v=0.14.0-release-2",
  "./puzzles/sumdoku.js?v=0.14.0-release-2",
  "./puzzles/sumdoku-levels.js?v=0.14.0-release-2",
  "./puzzles/sumdoku-view.js?v=0.14.0-release-2",
  "./puzzles/pyramid-input.js?v=0.14.0-release-2",
  "./puzzles/number-logic.js?v=0.14.0-release-2",
  "./puzzles/number-logic-view.js?v=0.14.0-release-2",
  "./puzzles/logic-levels.js?v=0.14.0-release-2",
  "./puzzles/beast-number-levels.js?v=0.14.0-release-2",
  "./puzzles/own-pyramid-levels.js?v=0.14.0-release-2",
  "./puzzles/beast-geometry-levels.js?v=0.14.0-release-2",
  "./puzzles/geometry-logic.js?v=0.14.0-release-2",
  "./puzzles/geometry-logic-view.js?v=0.14.0-release-2",
  "./puzzles/geometry-levels.js?v=0.14.0-release-2",
  "./app-updates.js?v=0.14.0-release-2",
  "./content-updates.js?v=0.14.0-release-2",
  "./print-manager.js?v=0.14.0-release-2",
  "./original-pdf-print.js?v=0.14.0-release-2",
  "./download-manager.js?v=0.14.0-release-2",
  "./pdf-actions.css?v=0.14.0-release-2",
  "./workbook-print.js?v=0.14.0-release-2",
  "./pdf-viewer.js?v=0.14.0-release-2",
  "./external-view.html",
  "./workbook-view.html",
  "./workbook-view.js?v=0.14.0-release-2",
  "./workbook-view.css?v=0.14.0-release-2",
  "./external-view.js?v=0.14.0-release-2",
  "./data/content.json",
  "./data/mathe-ag.json",
  "./data/mathe-ag-56.json",
  "./data/olympiade.json",
  "./data/matheplus.json",
  "./data/journey.json",
  "./data/sunday.json",
  "./data/editorial.json",
  "./Sonntagsraetsel-02-Zahlenpfade.pdf?v=20260925-aufgabenblatt",
  "./Sonntagsraetsel-03-Zahlenkreuze-Aufgabenblatt.pdf?v=20261003",
  "./Sonntagsraetsel-04-Polyominos-Aufgabenblatt.pdf?v=20261003",
  "./Sonntagsraetsel-05-Differenzpyramiden-Aufgabenblatt.pdf?v=20261017b",
  "./manifest.webmanifest?v=0.14.0-release-2",
  "./assets/mo-ni-kanallogo.png",
  "./assets/mo-ni-kanallogo-56.png",
  "./assets/mo-ni-reise.png",
  "./assets/games/rechen-rallye.png",
  "./assets/games/zahlenwirbel.png",
  "./assets/games/raetsel.png",
  "./assets/mo-ni-reise-56.png",
  "./assets/mo-ni-mathe-713.png",
  "./assets/mo-ni-geometrie-56.png",
  "./assets/mo-ni-mathe-713-v2.png",
  "./assets/mo-ni-mathe-713-v3.png",
  "./assets/offers/mathefit-713-v2.png",
  "./assets/offers/mathefit-713-v3.png",
  "./assets/offers/kaenguru-713-v3.png",
  "./assets/offers/kaenguru-713-v4.png",
  "./assets/offers/kaenguru-713-v5.png",
  "./assets/offers/kaenguru-713-v2.png",
  "./assets/offers/olympiade-713-v2.png",
  "./assets/mo-ni-arbeitsheft.png",
  "./assets/offers/mathe-ag-34.png",
  "./assets/offers/olympiade-34.png",
  "./assets/offers/olympiade-56.png",
  "./assets/offers/olympiade-713.png",
  "./assets/offers/kaenguru-34.png",
  "./assets/offers/kaenguru-56.png",
  "./assets/offers/kaenguru-713.png",
  "./assets/offers/matheplus-34.png",
  "./assets/offers/matheplus-56.png",
  "./assets/offers/sonntagsraetsel-34.png",
  "./assets/offers/sonntagsraetsel-56.png",
  "./assets/sonntagsraetsel-02-zahlenpfade.png?v=20260925",
  "./assets/sonntagsraetsel-03-zahlenkreuze.png?v=20261003",
  "./assets/sonntagsraetsel-04-polyominos.png?v=20261003",
  "./assets/sonntagsraetsel-05-differenzpyramiden.png?v=20261004",
  "./assets/vendor/pdfjs/pdf.min.js",
  "./assets/vendor/pdfjs/pdf.worker.min.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon-180.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: "reload" })))));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, DATA_CACHE, RUNTIME_CACHE].includes(key))
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await caches.match(request)) || (fallbackUrl ? await caches.match(fallbackUrl) : undefined) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(request);
  const update = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await update) || Response.error();
}

// Serve ranges from the full cached movie; never cache partial (206) responses.
async function filmResponse(request) {
  const cached=await caches.match(request.url);
  if(!cached)return fetch(request);
  const match=/^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range")||"");
  if(!match||(!match[1]&&!match[2]))return cached;
  const bytes=await cached.arrayBuffer(),size=bytes.byteLength;
  const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
  const end=match[1]&&match[2]?Math.min(Number(match[2]),size-1):size-1;
  const headers=new Headers(cached.headers);
  headers.set("Accept-Ranges","bytes");
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size||(!match[1]&&Number(match[2])===0)) {
    headers.set("Content-Range",`bytes */${size}`);headers.set("Content-Length","0");
    return new Response(null,{status:416,headers});
  }
  headers.set("Content-Type","video/mp4");headers.set("Content-Range",`bytes ${start}-${end}/${size}`);headers.set("Content-Length",String(end-start+1));
  return new Response(bytes.slice(start,end+1),{status:206,headers});
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/statistics-test.html")) return;
  if (url.pathname.includes("/api/")) return;

  if (url.pathname.endsWith(".mp4")) {
    event.respondWith(filmResponse(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE, "./index.html"));
    return;
  }

  if (url.pathname.includes("/data/") && url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});

// Preview 74: completed pointer and keyboard input revision.
