const PAGES_CACHE_PREFIX = "bunny-pages-";

export async function clearOfflinePages() {
  if (typeof caches === "undefined") return;

  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(PAGES_CACHE_PREFIX))
        .map((key) => caches.delete(key)),
    );
  } catch {
    return;
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_PAGES" });
  }
}
