const PAGES_CACHE_PREFIX = "bunny-pages-";
const PAGES_CACHE = `${PAGES_CACHE_PREFIX}v1`;
const STATIC_CACHE = "bunny-static";
const OFFLINE_URL = "/offline.html";
const MAX_PAGES = 40;

const PAGE_PATTERNS = [
  /^\/dashboard$/,
  /^\/trips\/[0-9a-fA-F-]{36}(?:\/.*)?$/,
];

const STATIC_PATTERN = /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll([OFFLINE_URL, "/bunny%20logo%20white.jpeg"]),
      )
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(PAGES_CACHE_PREFIX) && key !== PAGES_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_PAGES") {
    event.waitUntil(clearPages());
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    return;
  }
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/.well-known/")
  ) {
    return;
  }
  if (url.searchParams.has("token") || url.searchParams.has("code")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request, url));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    request.destination === "image" ||
    request.destination === "font" ||
    STATIC_PATTERN.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
  }
});

async function handleNavigate(request, url) {
  let cache = null;
  try {
    cache = await caches.open(PAGES_CACHE);
  } catch {
    // Storage unavailable; fall back to a plain network request.
  }
  const cacheKey = new Request(url.origin + url.pathname);

  try {
    const response = await fetch(request);
    if (cache && isCacheablePage(response) && isAllowedPage(url.pathname)) {
      try {
        await cache.put(cacheKey, response.clone());
        void trimPages(cache);
      } catch {
        // Quota or Vary failures should never break the navigation.
      }
    }
    return response;
  } catch {
    if (cache) {
      try {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
      } catch {
        // Fall through to the offline page.
      }
    }
    try {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    } catch {
      // Fall through to a network error response.
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  let cache = null;
  try {
    cache = await caches.open(STATIC_CACHE);
  } catch {
    // Storage unavailable; fall back to a plain network request.
  }

  if (cache) {
    try {
      const cached = await cache.match(request);
      if (cached) return cached;
    } catch {
      // Ignore malformed cache entries.
    }
  }

  try {
    const response = await fetch(request);
    if (
      cache &&
      response.ok &&
      response.status === 200 &&
      response.type === "basic"
    ) {
      try {
        await cache.put(request, response.clone());
      } catch {
        // Ignore quota or opaque-response failures.
      }
    }
    return response;
  } catch {
    return Response.error();
  }
}

function isAllowedPage(pathname) {
  return PAGE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isCacheablePage(response) {
  return (
    response.ok &&
    response.status === 200 &&
    !response.redirected &&
    response.type === "basic"
  );
}

async function trimPages(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= MAX_PAGES) return;
    await Promise.all(
      keys
        .slice(0, keys.length - MAX_PAGES)
        .map((key) => cache.delete(key)),
    );
  } catch {
    // Trimming is best-effort.
  }
}

async function clearPages() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(PAGES_CACHE_PREFIX))
      .map((key) => caches.delete(key)),
  );
}
