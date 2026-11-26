import { STATISTICS_CONFIGURATION } from "./statistics-config.js?v=0.14.0-release-2";

/** Only the published app can send these anonymous event payloads to Umami. */
export const STATISTICS_RELEASE = "v0.14.0-release-2";
export const STATISTICS_EXCLUSION_KEY = "moni-statistics-excluded";
const PUBLIC_ORIGINS = new Set(["https://www.mo-ni.de", "https://mo-ni.de"]);
const PUBLIC_PATH = "/fileadmin/grundschule-app-test/";
export const STATISTICS_EVENTS = Object.freeze({
  app_open: "App geladen", video_open: "Video geöffnet", video_start: "Video gestartet",
  pdf_open: "PDF geöffnet", download: "Download ausgelöst"
});
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function isStatisticsSourceAllowed(href, release, excluded = false, automated = false) {
  try {
    const url = new URL(href);
    return !excluded && !automated && /^v?\d+\.\d+\.\d+(-release-\d+)?$/.test(release) && PUBLIC_ORIGINS.has(url.origin)
      && [PUBLIC_PATH, `${PUBLIC_PATH}index.html`, `${PUBLIC_PATH}workbook-view.html`, `${PUBLIC_PATH}external-view.html`].includes(url.pathname)
      && ![...url.searchParams].some(([key, value]) => /^(stats|test|preview|iphone-test|autoupdate)$/i.test(key) && value !== "0"
        || /preview|localhost|127\.0\.0\.1/i.test(value));
  } catch { return false; }
}

export function videoStatisticsTarget(value) {
  try {
    const url = new URL(value);
    if (!["www.youtube.com", "youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) return null;
    const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).at(-1);
    return /^[a-zA-Z0-9_-]{11}$/.test(id || "") ? `video:${id}` : null;
  } catch { return null; }
}

export function pdfStatisticsTarget(value, base) {
  try {
    const url = new URL(value, base);
    return ["https:", "http:"].includes(url.protocol) && (/\.pdf$/i.test(url.pathname) || /\/api\/(mathe-ag(-56)?|olympiade|matheplus|sunday)\/.+\/pdf$/.test(url.pathname))
      ? `pdf:${url.pathname}` : null;
  } catch { return null; }
}

export function createUsageStatistics({ scope = globalThis, release = STATISTICS_RELEASE, configuration = STATISTICS_CONFIGURATION } = {}) {
  let storage;
  try { storage = scope.localStorage; } catch { /* A denied storage API must never interrupt learning. */ }
  const read = key => { try { return storage?.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { storage?.setItem(key, value); } catch { /* Optional test preference. */ } };
  const href = () => scope.location?.href || "";
  try { if (new URL(href()).searchParams.get("stats") === "off") exclude(); } catch { /* No browser location in module tests. */ }
  const configured = configuration.provider === "umami" && configuration.enabled === true && UUID.test(configuration.websiteId || "")
    && configuration.collectUrl === "https://gateway.umami.is/api/send";
  const enabled = () => configured && isStatisticsSourceAllowed(href(), release,
    read(STATISTICS_EXCLUSION_KEY) === "1" || read("umami.disabled") === "1" || read("umami.disabled") === "true", scope.navigator?.webdriver === true);
  const titles = new Map();
  let started = false;
  let pending = 0;
  const audience = () => {
    let query;
    try { query = new URL(href()).searchParams.get("audience"); } catch { /* Non-browser unit tests. */ }
    const value = scope.document?.documentElement?.dataset?.moniAudience || query || read("moni-public-v1-audience") || "34";
    return ["34", "56", "713"].includes(value) ? value : "34";
  };
  function exclude() {
    write(STATISTICS_EXCLUSION_KEY, "1"); write("umami.disabled", "1");
    // Remove pending events from an older collector; they must not be replayed later.
    try { storage?.removeItem("moni-statistics-events"); } catch { /* Optional storage. */ }
  }
  function registerContent(value, parentTitle = "MO-Ni-Material") {
    if (!value || typeof value !== "object") return;
    const title = value.displayTitle || value.title || value.label || parentTitle;
    for (const [field, child] of Object.entries(value)) {
      if (typeof child === "string") {
        const video = videoStatisticsTarget(child);
        if (video) titles.set(video, String(title));
        if (["pdf", "pdfUrl"].includes(field)) {
          const target = pdfStatisticsTarget(child, href());
          if (target) {
            const text = /MO65-Arbeitsheft/.test(child) ? "MO65-Arbeitsheft" : String(title);
            titles.set(target, text);
            if (value.category === "mathe-ag" && value.number) titles.set(`pdf:/api/mathe-ag${value.collection === "56" ? "-56" : ""}/${value.number}/pdf`, text);
            else if (["olympiade", "matheplus"].includes(value.category) && value.id) titles.set(`pdf:/api/${value.category}/${value.id}/pdf`, text);
            else if (value.id?.startsWith("sonntagsraetsel-")) titles.set(`pdf:/api/sunday/${value.id}/pdf`, text);
          }
        }
      } else if (child && typeof child === "object") registerContent(child, String(title));
    }
  }
  function track(metric, target = "app") {
    if (!enabled() || scope.navigator?.onLine === false || !STATISTICS_EVENTS[metric] || !target || target.length > 500) return false;
    if (metric === "app_open" ? target !== "app" : ["video_open", "video_start"].includes(metric) ? !target.startsWith("video:") : !target.startsWith("pdf:")) return false;
    const grade = audience();
    const gradeLabel = { "34": "Klasse 3 und 4", "56": "Klasse 5 und 6", "713": "Klasse 7 bis 13" }[grade];
    let fallback = target;
    if (target.startsWith("pdf:")) { try { fallback = decodeURIComponent(target.split("/").at(-1)); } catch { /* Keep a safe filename. */ } }
    const payload = {
      hostname: new URL(href()).hostname, language: "de", referrer: "", screen: "0x0", title: "MO-Ni App",
      url: `${PUBLIC_PATH}index.html?audience=${grade}`, website: configuration.websiteId,
      name: STATISTICS_EVENTS[metric], data: {
        Klassenbereich: gradeLabel, Inhalt: (titles.get(target) || (target === "app" ? "MO-Ni App" : fallback)).slice(0, 500), Kennung: target
      }
    };
    pending++;
    try {
      // Umami has no documented idempotency key. Send each action once, never retry
      // ambiguous responses or persist visitor/session identifiers returned by the service.
      Promise.resolve(scope.fetch(configuration.collectUrl, {
        method: "POST", mode: "cors", credentials: "omit", cache: "no-store", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "event", payload }),
        signal: AbortSignal.timeout(8000)
      })).catch(() => {}).finally(() => { pending--; });
    } catch { pending--; }
    return true;
  }
  const trackVideo = (metric, url) => track(metric, videoStatisticsTarget(url));
  const trackPdf = (metric, url) => track(metric, pdfStatisticsTarget(url, href()));
  scope.document?.addEventListener?.("moni-pdf-saved", event => trackPdf("download", event.detail?.url));
  return { enabled, track, trackVideo, trackPdf, registerContent, exclude,
    appStarted() { if (!started) { started = true; return track("app_open"); } return false; },
    pendingCount: () => pending };
}

export const usageStatistics = createUsageStatistics();
