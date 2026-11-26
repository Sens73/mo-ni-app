import { createDivisorGame } from "./divisor-game-view.js?v=0.14.0-release-2";
import { createPuzzleGame } from "./puzzles/puzzle-view.js?v=0.14.0-release-4";
import { createSundayPuzzleTypes } from "./puzzles/sunday-types.js?v=0.14.0-release-4";
import { createMentalMathGame } from "./mental-math-view.js?v=0.14.0-release-2";
import { createNumberWhirlGame } from "./number-whirl-view.js?v=0.14.0-release-2";
import { prepareMaterialLink } from "./material-links.js?v=0.14.0-release-2";
import { filterJourneyItems, matchesJourneyFilters, journeyFilterOptions, toggleJourneyFilter } from "./journey-filters.js?v=0.14.0-release-2";
import { primaryMaterialPresentation, upcomingAgDate, localThumbnail, THUMBNAIL_PLACEHOLDER } from "./material-presentation.js?v=0.14.0-release-2";
import { videosFor, kangarooVideosFor, kangarooCardLabel, KANGAROO_GROUPS, withAg56Dates } from "./video-content.js?v=0.14.0-release-2";
import { AUDIENCES, availableDestination, validAudience, matchesAudience, gradesFor, gradeLabel, olympiadSeason } from "./audience.js?v=0.14.0-release-2";
import { fetchPdfFile } from "./download-manager.js?v=0.14.0-release-2";
import { renderPdfDocument } from "./pdf-viewer.js?v=0.14.0-release-2";
import { createOfflineMaterials, formatBytes } from "./offline-materials.js?v=0.14.0-release-5";
import { installSituation, installPageUrl, openInBrowserUrl } from "./install-guide.js?v=0.14.0-release-5";
import { createPrintManager } from "./print-manager.js?v=0.14.0-release-2";
import { shouldUseOriginalPdfPrint, prepareOriginalPdfPrint } from "./original-pdf-print.js?v=0.14.0-release-2";
import { canActivateAppUpdate, createAppUpdateCoordinator } from "./app-updates.js?v=0.14.0-release-2";
import { contentAvailabilitySignature, sundayWorksheetIsAvailable } from "./content-updates.js?v=0.14.0-release-2";
import { usageStatistics } from "./usage-statistics.js?v=0.14.0-release-2";
import { statisticsEmbedUrl, observeVideo } from "./video-statistics.js?v=0.14.0-release-2";
let disposeVideoStatistics = () => {};

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const STORAGE_PREFIX = "moni-public-v1";
const printManager = createPrintManager({ scope: window });
let pdfPrintPreparation = null;
const initialParameters = new URLSearchParams(location.search);
const supportedViews = new Set(["home", "dates", "training", "workbooks", "journey", "kangaroo", "sunday", "more", "games"]);
const supportedTrainingTabs = new Set(["mathe-ag", "olympiade", "matheplus", "bist-du-fit"]);
const requestedView = initialParameters.get("view") === "community" ? "workbooks" : initialParameters.get("view");
const requestedTrainingTab = initialParameters.get("tab");
const requestedInstallHelp = initialParameters.get("install") === "1";
const requestedMaterial = initialParameters.get("material") || "";
const requestedTask = initialParameters.get("aufgabe") || "";
const requestedInstallDevice = location.hash.toLowerCase() === "#computer" ? "computer" : "";
const localIphoneTest = initialParameters.get("iphone-test") === "1";
const PUBLIC_APP_PATH = "/fileadmin/grundschule-app-test/";
const PUBLIC_BROWSER_INSTALL_PATH = "/fileadmin/mo-ni-grundschul-app-installieren.html";
const CONTENT_REFRESH_INTERVAL = 5 * 60 * 1000;

const isStandaloneMode = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIosDevice = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroidDevice = () => /android/i.test(navigator.userAgent);

function browserInstallUrl() {
  const target = location.pathname.startsWith(PUBLIC_APP_PATH)
    ? new URL(PUBLIC_BROWSER_INSTALL_PATH, location.origin)
    : new URL("./browser-install.html", location.href);
  target.search = "";
  target.searchParams.set("install", "1");
  target.searchParams.set("browser-install", "1");
  target.searchParams.set("audience", state.audience);
  target.searchParams.set("view", state.view === "viewer" ? state.previousView : state.view);
  if (state.view === "training") target.searchParams.set("tab", state.trainingTab);
  return target.href;
}

const storageKey = key => `${STORAGE_PREFIX}-${key}`;
const readStored = (key, fallback = "") => { try { return localStorage.getItem(storageKey(key)) ?? fallback; } catch { return fallback; } };
const offlineMaterials = createOfflineMaterials({
  storage: (() => { try { return window.localStorage; } catch { return null; } })(),
  storageKey: `${STORAGE_PREFIX}-saved-materials`
});
const writeStored = (key, value) => { try { localStorage.setItem(storageKey(key), String(value)); } catch { /* Private mode may deny storage. */ } };
const state = {
  content: null,
  gameActive: false,
  selectedGame: ["rally", "whirl", "puzzles", "divisors"].includes(initialParameters.get("game") || readStored("selectedGame", "rally")) ? (initialParameters.get("game") || readStored("selectedGame", "rally")) : "rally",
  view: supportedViews.has(requestedView) ? requestedView : readStored("view", "home") === "community" ? "workbooks" : readStored("view", "home"),
  trainingTab: supportedTrainingTabs.has(requestedTrainingTab) ? requestedTrainingTab : supportedTrainingTabs.has(readStored("trainingTab")) ? readStored("trainingTab") : "mathe-ag",
  audience: validAudience(initialParameters.get("audience") || readStored("audience", "34")),
  journeySelection: {grades:[], competitions:[]},
  journeyFiltersOpen: false,
  agDateSignature: "",
  gradeFilter: "all",
  dateFilter: "all",
  contactMessage: "",
  query: "",
  sundayQuery: "",
  kangarooQuery: "",
  kangarooSelection: {groups:[], years:[], tasks:[]},
  kangarooFiltersOpen: false,
  previousScrollY: 0,
  previousFocusAttributes: [],
  previousFocusOffset: 0,
  serverMode: false,
  viewer: null,
  previousView: "training",
  pdfRenderSequence: 0,
  deferredInstall: window.__moNiDeferredInstallPrompt || null,
  installed: isStandaloneMode(),
  online: navigator.onLine,
  serviceWorkerReady: false,
  waitingWorker: null,
  modal: requestedInstallHelp ? "install" : null
};

const mathGame = createMentalMathGame({
  read: readJson, write: (key, value) => writeStored(key, JSON.stringify(value)), scope: window,
  onActivityChange: () => {
    state.gameActive = mathGame.active || whirlGame.active || puzzleGame.active || divisorGame.active;
    const active = state.gameActive;
    if (!active) requestAnimationFrame(() => { applyPendingContent(); maybeApplyAppUpdate(); });
  }
});

const whirlGame = createNumberWhirlGame({
  read: readJson, write: (key, value) => writeStored(key, JSON.stringify(value)), scope: window,
  onActivityChange: () => {
    state.gameActive = mathGame.active || whirlGame.active || puzzleGame.active || divisorGame.active;
    if (!state.gameActive) requestAnimationFrame(() => { applyPendingContent(); maybeApplyAppUpdate(); });
  }
});

if (!readJson("puzzle-extension-backup",null)) writeStored("puzzle-extension-backup",JSON.stringify({release:"0.13.0-preview-21",progress:readJson("puzzle-progress",{}),ui:readJson("puzzle-ui",{})}));
const puzzleGame = createPuzzleGame({
  types: createSundayPuzzleTypes(),
  read: readJson, write: (key, value) => writeStored(key, JSON.stringify(value)),
  onActivityChange: () => {
    state.gameActive = mathGame.active || whirlGame.active || puzzleGame.active || divisorGame.active;
    if (!state.gameActive) requestAnimationFrame(() => { applyPendingContent(); maybeApplyAppUpdate(); });
  }
});

const divisorGame = createDivisorGame({
  read: readJson, write: (key, value) => writeStored(key, JSON.stringify(value)),
  onActivityChange: () => {
    state.gameActive = mathGame.active || whirlGame.active || puzzleGame.active || divisorGame.active;
    if (!state.gameActive) requestAnimationFrame(() => { applyPendingContent(); maybeApplyAppUpdate(); });
  }
});

const icons = {
  divisors: '<g fill="#fffdf4"><rect x="1" y="2" width="10" height="16" rx="2"/><rect x="10" y="6" width="13" height="16" rx="2"/></g><g fill="currentColor" stroke="none" text-anchor="middle" font-family="inherit" font-weight="700"><text x="6" y="13" font-size="9">6</text><text x="16.5" y="17" font-size="8.2">12</text></g>',
  rally: '<path d="M9 2h6M12 2v3m6 2 1.5-1.5"/><circle cx="12" cy="13" r="8"/><path d="M12 7v2M7 13h5m-2.5-2.5v5M15 12h3m-3 3h3"/>',
  whirl: '<rect x="2" y="4" width="8" height="9" rx="2" transform="rotate(-8 6 8.5)"/><path d="m5 7 1-1v4"/><rect x="14" y="12" width="8" height="9" rx="2" transform="rotate(8 18 16.5)"/><path d="M16.5 15c0-1 3-1 3 0 0 .8-3 2-3 3h3M14 3c5 0 8 2 8 6m-2-1 2 1 1-2M10 22c-5 0-8-2-8-6m-1 2 1-2 2 1"/>',
  puzzles: '<rect x="2" y="3" width="12" height="16" rx="2"/><path d="M2 8h12M8 3v16M2 14h6m-3-8h.01M10 11h.01M5 16.5h.01M14 14h3v-2a2 2 0 1 1 4 0v2h2v8h-8v-3h-2a2 2 0 1 1 0-4h1Z"/>',
  game: '<rect x="3" y="5" width="18" height="14" rx="5"/><path d="M7 12h6M10 9v6M16 10h.01M18 14h.01"/>',
  back: '<path d="m12 5-7 7 7 7M5 12h15"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  library: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1Z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  moreVertical: '<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>',
  pageMenu: '<path d="M6 7h12M6 12h12M6 17h8"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sparkles: '<path d="m12 3-1.2 3.1L8 7.5l2.8 1.4L12 12l1.2-3.1L16 7.5l-2.8-1.4Z"/><path d="m5 13-.8 2.2L2 16l2.2.8L5 19l.8-2.2L8 16l-2.2-.8ZM19 13l-.8 2.2L16 16l2.2.8L19 19l.8-2.2L22 16l-2.2-.8Z"/>',
  lightbulb: '<path d="M9 18h6M10 22h4"/><path d="M8.5 15.5A7 7 0 1 1 15.5 15.5c-.9.7-1.5 1.4-1.5 2.5h-4c0-1.1-.6-1.8-1.5-2.5Z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 2 21 3 21 3c0 7-3.8 12-10 12"/><path d="M2 21c0-3 1.85-5.36 5.08-6.94C9.11 13.07 12 12 16 12"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
  algebra: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m6 7 4 4m0-4-4 4M14 8h4M14 10h4m-9 6 2 2 4-4"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
  printer: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
  wifiOff: '<path d="M2 8.8A15 15 0 0 1 5.7 7M5 12.6A10 10 0 0 1 8.2 11M8.5 16.4a5 5 0 0 1 4.8-.5M12 20h.01M1 1l22 22M9.5 4.5A15 15 0 0 1 22 8.8M13.8 11a10 10 0 0 1 5.2 1.6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0 2 5"/><path d="M20 4v7h-7"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v8h14v-8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l3 3M14 9l2 2"/>'
};

// Eigene Themenmotive; Bedienzeichen wie Video, Download und Dock bleiben separat.
const topicIcons = {
  mathAg: '<path d="M10 6h14v6c7-4 7 10 0 6v12c-7-4-7 10 0 6v6H10a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z" fill="#b8dcd0"/><path d="M24 6h14a4 4 0 0 1 4 4v14h-6c4-7-10-7-6 0h-6v-6c7 4 7-10 0-6Z" fill="#eeae65"/><path d="M24 24h6c-4-7 10-7 6 0h6v14a4 4 0 0 1-4 4H24v-6c-7 4-7-10 0-6Z" fill="#fffaf0"/>',
  olympiad: '<circle cx="9" cy="19" r="7" stroke="#376b55" stroke-width="2.8"/><circle cx="24" cy="19" r="7" stroke="#376b55" stroke-width="2.8"/><circle cx="39" cy="19" r="7" stroke="#376b55" stroke-width="2.8"/><circle cx="16.5" cy="29" r="7" stroke="#376b55" stroke-width="2.8"/><circle cx="31.5" cy="29" r="7" stroke="#376b55" stroke-width="2.8"/>',
  kangaroo: '<path d="M21 28C17 36 11 40 4 41c8 3 17 0 23-6" fill="#eeae65"/><path d="m28 12 1-9c3 1 4 4 4 8m1 1 5-8c2 3 0 6-2 10" fill="#eeae65"/><path d="M24 24c2-3 3-5 2-8-1-4 2-7 6-6l4 4 7 2-1 4-8 1-3 7c5 1 7 4 5 8l-7 4h10v4H24l-3-7c-5-2-5-10 3-13Z" fill="#eeae65"/><path d="m31 26 8 2 3-2M25 34l6-2"/><circle cx="34" cy="15" r="1.2" fill="currentColor" stroke="none"/>',
  sundayPuzzle: '<rect x="5" y="10" width="34" height="33" rx="4" fill="#fffaf0"/><path d="M5 20h34M13 7v7M29 7v7"/><rect x="11" y="25" width="21" height="12" rx="1" fill="#b8dcd0"/><path d="M18 25v12m7-12v12M11 31h21"/><path d="M28 33h2m-1-1v2" stroke="#fffaf0"/><circle cx="39" cy="9" r="5" fill="#f5cf76"/><path d="M39 1v1m0 14v1M31 9h1m14 0h1m-14-6 1 1m10 10 1 1m0-12-1 1" stroke="#c58a3b"/>',
  mathFit: '<rect x="7" y="4" width="29" height="38" rx="4" fill="#fffaf0"/><rect x="14" y="3" width="15" height="6" rx="2" fill="#b8dcd0"/><path d="m13 15 6 6m0-6-6 6M25 17h6m-6 3h6M13 28h10m-10 5h7"/><circle cx="35" cy="34" r="10" fill="#62aaa0"/><path d="m30 34 3.5 3.5 6.5-7" stroke="#fffaf0" stroke-width="3"/>',
  puzzleJourney: '<path d="m4 12 13-5 14 5 13-5v32l-13 5-14-5-13 5Z" fill="#fffaf0"/><path d="M17 7v32m14-27v32" stroke="#b7d6c8"/><path d="M10 34c13-1 7-18 23-15" stroke="#62aaa0" stroke-width="3" stroke-dasharray="2 5"/><circle cx="10" cy="34" r="3" fill="#eeae65"/><path d="M33 25V8l9 3-9 4" fill="#eeae65"/>',
  workbooks: '<path d="M24 13C17 8 9 9 4 11v28c6-2 13-1 20 4 7-5 14-6 20-4V11c-5-2-13-3-20 2Z" fill="#fffaf0"/><path d="M24 13v30M9 18h9m-9 6h9m-9 6h9M29 18h9m-9 6h5"/><path d="m31 35 8-15 5 3-8 15-7 4Z" fill="#eeae65"/><path d="m31 35 5 3m3-18 2-3c1-2 6 1 5 3l-2 3"/>',
  mathPlus: '<path d="M3 36V12l7 15 7-15v24" stroke="#376b55" stroke-width="3.2"/><ellipse cx="26.5" cy="29.5" rx="5.5" ry="6.5" stroke="#376b55" stroke-width="3.2"/><path d="M32 23v13" stroke="#376b55" stroke-width="3.2"/><path d="M36 24h10m-5-5v10" stroke="#df9650" stroke-width="3.6"/>'
};

function icon(name, className = "") {
  if (topicIcons[name]) return `<svg class="icon topic-icon ${className}" aria-hidden="true" viewBox="0 0 48 48" data-topic-icon="${name}">${topicIcons[name]}</svg>`;
  return `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24">${icons[name] || icons.info}</svg>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
  })[character]);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(readStored(key, JSON.stringify(fallback)));
  } catch {
    return fallback;
  }
}

function formatDate(dateString, endDate) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = new Intl.DateTimeFormat("de-DE", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("de-DE", { month: "short" }).format(date).replace(".", "");
  let label = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  if (endDate) {
    const end = new Date(`${endDate}T12:00:00`);
    label = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" }).formatRange(date, end);
  }
  return { day, month, label };
}

function formatPublicationDateTime(value) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(value)).replace(",", " ·");
}

function monthKey(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(date);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function offlineChip(url) {
  return url && offlineMaterials.isSaved(url) ? `<span class="meta-chip offline-chip">${icon("download")} Offline gesichert</span>` : "";
}

function offlineSection() {
  if (!offlineMaterials.available()) return "";
  const saved = offlineMaterials.list();
  const rows = saved.map(entry => `<div class="settings-row offline-row"><span class="icon-tile mint">${icon("download")}</span><span><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(formatBytes(entry.bytes))} · gesichert am ${escapeHtml(new Date(entry.savedAt).toLocaleDateString("de-DE"))}</span></span><span class="offline-row-actions"><button class="soft-button" type="button" data-action="open-offline" data-offline-url="${escapeHtml(entry.url)}">Öffnen</button><button class="soft-button" type="button" data-action="remove-offline" data-offline-url="${escapeHtml(entry.url)}" aria-label="${escapeHtml(`${entry.title} nicht mehr offline sichern`)}">Entfernen</button></span></div>`).join("");
  const summary = saved.length
    ? `${saved.length} ${saved.length === 1 ? "Blatt" : "Blätter"}, zusammen ${formatBytes(offlineMaterials.totalBytes())}. Sie bleiben auch nach einem App-Update erhalten.`
    : "Öffne ein Aufgabenblatt und tippe auf „Offline sichern“. Dann kannst du es auch ohne Internet öffnen.";
  return `<section class="section settings-card offline-card"><div class="section-header"><div><h2>Offline gesicherte Blätter</h2><p>${summary}</p></div></div>${rows ? `<div class="settings-list">${rows}</div>` : ""}</section>`;
}

function topbar() {
  return `<header class="topbar">
    <button class="brand text-button" type="button" data-view="home" aria-label="Zur Startseite">
      <span class="brand-mark"><img src="${usesOlderVideos() ? "./assets/mo-ni-kanallogo-56.png" : "./assets/mo-ni-kanallogo.png"}" alt="" /></span>
      <span class="brand-copy"><span class="brand-title">Unterwegs mit <b class="brand-mo">MO</b> und <b class="brand-ni">Ni</b></span></span>
    </button>
    <span class="version-badge">V0.14</span>
  </header>`;
}

function systemBanners() {
  const offlineBanner = state.online ? "" : `<aside class="system-banner offline" role="status">
    ${icon("wifiOff")}
    <span><strong>Du bist gerade offline.</strong><small>Bereits geladene App-Inhalte bleiben verfügbar. Videos und noch nicht geladene Aufgabenblätter benötigen Internet.</small></span>
  </aside>`;
  const updateBanner = state.waitingWorker ? `<aside class="system-banner update" role="status">
    ${icon("refresh")}
    <span><strong>Eine neue Fassung ist bereit.</strong><small>Jetzt aktualisieren, um die neuesten Verbesserungen zu verwenden.</small></span>
    <button class="soft-button" type="button" data-action="activate-update">Aktualisieren</button>
  </aside>` : "";
  return `${offlineBanner}${updateBanner}`;
}

const navItems = [
  ["home", "home", "Start"],
  ["games", "game", "Spiel und Spaß"],
  ["dates", "calendar", "Termine"],
  ["more", "more", "Mehr"]
];

function bottomNav() {
  const currentView = state.view === "viewer" ? state.previousView : state.view;
  const activeView = ["dates", "more", "games"].includes(currentView) ? currentView : "home";
  return `<nav class="bottom-nav primary-nav with-games" aria-label="Hauptnavigation">
    ${navItems.map(([view, iconName, label]) => `<button class="nav-item ${activeView === view ? "active" : ""}" type="button" data-view="${view}" ${activeView === view ? 'aria-current="page"' : ""}>${icon(iconName)}<span>${escapeHtml(label)}</span></button>`).join("")}
  </nav>`;
}

function audiencePicker() {
  return `<nav class="audience-picker" aria-label="Klassenstufe"><div class="audience-options" role="group" aria-label="Klassenstufe auswählen">${[["34","Klasse 3–4"],["56","Klasse 5–6"],["713","Klasse 7–13"]].map(([id,label]) => `<button type="button" class="audience-button audience-${id} ${state.audience === id ? "selected" : ""}" data-audience="${id}" aria-pressed="${state.audience === id}">${label}</button>`).join("")}</div></nav>`;
}
function mascotImage() { return usesOlderVideos() ? "./assets/mo-ni-reise-56.png" : "./assets/mo-ni-reise.png"; }
function usesOlderVideos() { return state.audience !== "34"; }
function usesSeniorVideos() { return state.audience === "713"; }
function journeyLabel() { return usesOlderVideos() ? "Mathe mit dem Känguru" : "Knobelreise"; }
function olympiadLabel() { return state.audience === "56" ? "Mathematik-Olympiade" : "Mathe-Olympiade"; }
function audienceChip(item) { return `<span class="audience-chip ${gradesFor(item).some(g => g >= 5) ? "older" : ""}">${escapeHtml(item.audienceLabel || gradeLabel(item))}</span>`; }
function homeView() {
  const senior = usesSeniorVideos();
  const welcomeImage = senior ? "./assets/mo-ni-mathe-713-v3.png" : state.audience === "56" ? "./assets/mo-ni-geometrie-56.png" : mascotImage();
  const welcomeAlt = senior ? "MO mit türkisfarbener Mütze und Ni mit orangefarbenen Kopfhörern untersuchen gemeinsam eine quadratische Funktion" : state.audience === "56" ? "MO mit türkisfarbener Kappe und Ni mit orangefarbenem Entdeckerhut untersuchen gemeinsam ein Dreieck" : "MO und Ni gehen gemeinsam auf Mathe-Reise";
  return `<main class="page" id="main-content">
    <section class="hero">
      <div class="hero-copy">
        <h1${senior ? ' class="hero-title-stacked"' : ""}>${senior ? "<span>Mathe</span> <span>Verstehen.</span> <span>Weiterdenken.</span>" : "Bereit für dein nächstes Mathe-Abenteuer?"}</h1>
      </div>
      <img class="hero-mascot" src="${welcomeImage}" alt="${welcomeAlt}" />
      <p>${senior ? "Löse spannende Wettbewerbsaufgaben aus aller Welt und diskutiere mit uns deine Lösungsideen." : "Entdecken, tüfteln und mathematische Ideen Schritt für Schritt verstehen."}</p>
    </section>

    <section class="section">
      <div class="quick-grid ${usesOlderVideos() ? "older" : ""}">
        ${senior ? `<button class="quick-card" type="button" data-view="training" data-tab="bist-du-fit"><span class="icon-tile home-accent">${icon("mathFit")}</span><strong>Bist du fit?</strong><span>Terme und Gleichungen</span></button>` : ""}
        ${usesSeniorVideos() ? "" : `<button class="quick-card" type="button" data-view="training" data-tab="mathe-ag"><span class="icon-tile home-accent">${icon("mathAg")}</span><strong>Mathe-AG</strong><span>Videos & Aufgabenblätter</span></button>`}
        ${senior ? "" : `<button class="quick-card" type="button" data-view="training" data-tab="olympiade"><span class="icon-tile home-accent">${icon("olympiad")}</span><strong>${escapeHtml(olympiadLabel())}</strong><span>${usesOlderVideos() ? "Aufgaben & Lösungsvideos" : "Klausuren & Lösungsvideos"}</span></button>`}
        <button class="quick-card" type="button" data-view="journey"><span class="icon-tile home-accent">${icon(usesOlderVideos() ? "kangaroo" : "puzzleJourney")}</span><strong>${escapeHtml(journeyLabel())}</strong><span>${usesOlderVideos() ? "Aufgaben & Lösungsvideos" : "Videos zum Knobeln"}</span></button>
        ${usesOlderVideos() ? "" : `<button class="quick-card" type="button" data-view="kangaroo"><span class="icon-tile home-accent">${icon("kangaroo")}</span><strong>Mathe mit dem Känguru</strong><span>Aufgaben & Lösungsvideos</span></button>`}
        ${usesOlderVideos() ? "" : `<button class="quick-card" type="button" data-view="workbooks"><span class="icon-tile home-accent">${icon("workbooks")}</span><strong>Arbeitshefte</strong><span>Für Klasse 3–4</span></button>`}
        ${usesSeniorVideos() ? "" : `<button class="quick-card" type="button" data-view="sunday"><span class="icon-tile home-accent">${icon("sundayPuzzle")}</span><strong>Sonntagsrätsel</strong><span>Aufgabenblätter & Videos</span></button>`}
        ${senior ? `<button class="quick-card" type="button" data-view="training" data-tab="olympiade"><span class="icon-tile home-accent">${icon("olympiad")}</span><strong>${escapeHtml(olympiadLabel())}</strong><span>Aufgaben & Lösungsvideos</span></button>` : `<button class="quick-card" type="button" data-view="training" data-tab="matheplus"><span class="icon-tile home-accent">${icon("mathPlus")}</span><strong>MathePlus</strong><span>Aufgaben nach Klasse & Serie</span></button>`}
      </div>
    </section>

  </main>`;
}

function gamesView() {
  const choices = [["rally", "rally", "Rechen-Rallye", "Rechne & sammle"], ["whirl", "whirl", "Zahlenwirbel", "Sortiere & sammle"], ["divisors", "divisors", "Teiler & Vielfache", "Zu zweit oder allein"], ["puzzles", "puzzles", "Rätsel", "Knobele & entdecke"]];
  return `<main class="page games-page" id="main-content"><button class="text-button game-home-link" type="button" data-view="home">‹ Start</button><div class="section-header"><h1>Spiel und Spaß</h1></div><div class="game-picker" role="group" aria-label="Spiel auswählen">${choices.map(([id, symbol, title, text]) => `<button type="button" data-game="${id}" aria-pressed="${state.selectedGame === id}"><span aria-hidden="true">${icon(symbol,'game-picker-icon')}</span><strong>${title === "Zahlenwirbel" ? "Zahlen<wbr>wirbel" : title}</strong><small>${text}</small></button>`).join("")}</div>${state.selectedGame === "divisors" ? '<section class="math-game divisor-game" aria-label="Teiler-Vielfache-Spiel" data-divisor-root></section>' : state.selectedGame === "puzzles" ? '<section class="math-game puzzle-game" aria-label="Rätsel" data-puzzle-root></section>' : state.selectedGame === "whirl" ? '<section class="math-game" aria-label="Zahlenwirbel" data-whirl-root></section>' : '<section class="math-game" aria-label="Rechen-Rallye" data-math-root></section>'}</main>`;
}

function datesView() {
  const filters = [["all", "Alle"], ...(usesSeniorVideos() ? [] : [["mathe-ag", "Mathe-AG"]]), ["olympiade", olympiadLabel()], ["organisation", "Für Lehrkräfte"]];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const matchingDates = state.content.dates
    .filter(item => matchesAudience(item, state.audience))
    .filter(item => !usesSeniorVideos() || item.type !== "Mathe-AG")
    .filter(item => state.dateFilter === "all" || item.type.toLowerCase().includes(state.dateFilter.replace("mathe-ag", "mathe-ag")))
    .map(item => ({...item, ...item.audienceDetails?.[state.audience]}));
  const currentOrUpcomingDates = matchingDates.filter(item => (item.endDate || item.date) >= today);
  const filtered = currentOrUpcomingDates.sort((first, second) => first.date.localeCompare(second.date));
  let lastMonth = "";
  const items = filtered.map(item => {
    const month = monthKey(item.date);
    const formatted = formatDate(item.date, item.endDate);
    const timing = item.endDate ? formatted.label : item.time;
    const monthLabel = month !== lastMonth ? `<div class="month-label">${escapeHtml(month)}</div>` : "";
    lastMonth = month;
    return `${monthLabel}<article class="timeline-item ${item.accent}"><span class="timeline-dot" aria-hidden="true"></span><div class="date-card"><div class="date-box ${item.accent}"><strong>${formatted.day}</strong><span>${formatted.month}</span></div><div class="date-copy"><small>${escapeHtml(item.type)} · ${escapeHtml(gradeLabel({...item, grades: gradesFor(item).filter(grade => AUDIENCES[state.audience].includes(grade))}))}${timing ? ` · ${escapeHtml(timing)}` : ""}</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></div><span class="date-arrow">${icon("calendar")}</span></div></article>`;
  }).join("");

  return `<main class="page" id="main-content">
    <div class="page-heading"><span class="eyebrow">Schuljahr ${escapeHtml(state.content.meta.schoolYear)}</span><h1>Alle Termine</h1><p>Laufende und kommende Termine im Überblick.</p></div>
    <div class="filter-row" aria-label="Termine filtern">${filters.map(([id, label]) => `<button class="filter-chip ${state.dateFilter === id ? "active" : ""}" type="button" data-date-filter="${id}">${label}</button>`).join("")}</div>
    <section class="section timeline">${items || '<div class="empty-state">Für diese Auswahl sind noch keine kommenden Termine eingetragen.</div>'}</section>
  </main>`;
}

function resourceIcon(category) {
  if (category === "mathe-ag") return ["mathAg", "mint"];
  if (category === "olympiade") return ["olympiad", "leaf"];
  if (category === "matheplus") return ["mathPlus", "mint"];
  return ["plus", "gold"];
}

function normalizeSearch(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function resourceMatches(item, query) {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = ["mathe-ag", "olympiade", "matheplus"].includes(item.category)
    ? normalizeSearch(`${item.searchText || ""} ${item.title} ${item.subtitle} ${item.number || ""} ${item.date || ""} ${item.year || ""} ${item.stage || ""}`)
    : normalizeSearch(`${item.title} ${item.subtitle} ${item.topics || ""} ${item.grade} ${item.year}`);
  return tokens.every(token => haystack.includes(token));
}

function illustratedMaterialCard({className,thumbnail,thumbnailAlt,title,subtitle,iconName,meta,actions,before = "",after = ""}) {
  return `<article class="resource-card archive-card ${className}">
    ${localThumbnail(thumbnail) ? `<img class="sunday-card-thumbnail" src="${escapeHtml(localThumbnail(thumbnail))}" alt="${escapeHtml(thumbnailAlt)}" loading="lazy" data-card-thumbnail data-thumbnail />` : ""}
    ${before}
    ${title ? `<div class="resource-top"><span class="icon-tile home-accent">${icon(iconName)}</span><div><h3>${escapeHtml(title)}</h3>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div></div>` : ""}
    ${meta ? `<div class="meta-row">${meta}</div>` : ""}
    ${actions ? `<div class="action-row">${actions}</div>` : ""}
    ${after}
  </article>`;
}

// „Eine Aufgabe für meine Stunde“: Angaben für Lehrkräfte je Aufgabe (data/lehrkraefte.json).
function teacherTasks(item) {
  const tasks = state.teacherNotes?.items?.[item.id]?.tasks;
  return Array.isArray(tasks) ? tasks.filter(task => Number.isInteger(task.number) && task.title) : [];
}

function teacherShareUrl(item, task) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  for (const [key, value] of [["audience", state.audience], ["view", "training"], ["tab", item.category], ["material", item.id], ["aufgabe", task.number]]) url.searchParams.set(key, value);
  return url.href;
}

function teacherCard(item) {
  const tasks = teacherTasks(item);
  if (!tasks.length) return "";
  const field = (label, value) => value ? `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>` : "";
  const sections = tasks.map(task => `<details class="teacher-task">
      <summary><span class="teacher-task-number">Aufgabe ${task.number}</span> ${escapeHtml(task.title)}${task.minutes ? `<span class="teacher-task-time">${icon("clock")} ${escapeHtml(task.minutes)}</span>` : ""}</summary>
      ${task.source ? `<p class="teacher-task-source">${escapeHtml(task.source)}${Number.isInteger(task.page) ? ` · Seite ${task.page}` : ""}</p>` : ""}
      <dl>${field("Lernziel", task.goal)}${field("Vorwissen", task.prior)}${field("Einstieg", task.impulse)}${field("Vertiefung", task.deepening)}</dl>
      ${task.results ? `<details class="teacher-results"><summary>Ergebnisse anzeigen</summary><p>${escapeHtml(task.results)}</p></details>` : ""}
      <div class="action-row">${item.pdf ? `<button class="soft-button" type="button" data-open-resource data-resource-id="${escapeHtml(item.id)}" data-viewer-type="pdf" data-page="${Number.isInteger(task.page) ? task.page : ""}">${icon("download")} Aufgabe öffnen</button>` : ""}<button class="soft-button" type="button" data-action="share-task" data-share-url="${escapeHtml(teacherShareUrl(item, task))}" data-share-title="${escapeHtml(`${item.title} · Aufgabe ${task.number}: ${task.title}`)}">${icon("share")} Link teilen</button></div>
    </details>`).join("");
  return `<section class="teacher-card" aria-label="Für Lehrkräfte"><h4>${icon("info")} Für Lehrkräfte: ${tasks.length === 1 ? "eine Aufgabe" : `${tasks.length} Aufgaben`} für Ihre Stunde</h4>${sections}</section>`;
}

function websiteAction(value, className = "soft-button", content = "") {
  const link = prepareMaterialLink(value);
  return link ? `<a class="${className}" href="${escapeHtml(link.href)}" target="${link.target}" rel="${link.rel}" aria-label="${escapeHtml(link.ariaLabel)}">${content || `${icon("globe")} ${escapeHtml(link.label)}`}</a>` : "";
}

function resourceCard(item) {
  const [iconName, color] = resourceIcon(item.category);
  const videos = item.videos?.length ? item.videos : item.video ? [{ label: "Video", url: item.video }] : [];
  const videoLabel = videos.length > 1 ? `${videos.length} Videos` : "Video";
  const isArchiveMaterial = ["mathe-ag", "olympiade", "matheplus"].includes(item.category);
  const archiveActions = isArchiveMaterial
    ? `${videos.length ? `<button class="secondary-button" type="button" data-open-resource data-resource-id="${escapeHtml(item.id)}" data-viewer-type="video">${icon("play")} ${videoLabel}</button>` : ""}${item.pdf ? `<button class="soft-button" type="button" data-open-resource data-resource-id="${escapeHtml(item.id)}" data-viewer-type="pdf">${icon("download")} PDF öffnen</button>` : ""}${websiteAction(item.worksheet)}`
    : `${item.video ? `<button class="secondary-button" type="button" data-open-viewer data-viewer-type="video" data-viewer-url="${escapeHtml(item.video)}" data-viewer-title="${escapeHtml(item.title)} · Video">${icon("play")} Video</button>` : ""}${item.pdf ? `<button class="soft-button" type="button" data-open-viewer data-viewer-type="pdf" data-viewer-url="${escapeHtml(item.pdf)}" data-viewer-title="${escapeHtml(item.title)} · Aufgabenblatt">${icon("download")} PDF öffnen</button>` : ""}${websiteAction(item.url,"secondary-button")}`;

  if (["mathe-ag","olympiade"].includes(item.category)) {
    const presentation = primaryMaterialPresentation(item, {dates:state.content.dates});
    if (item.enrichment) presentation.meta.unshift(item.audienceLabel || "Vertiefung aus Klasse 7–8");
    const announcement = upcomingAgDate(item,state.content.dates);
    const meta = presentation.meta.map(value => `<span class="meta-chip" ${value === announcement ? `data-ag-announcement="${escapeHtml(item.id)}"` : ""}>${escapeHtml(value)}</span>`).join("") + offlineChip(item.pdf);
    return illustratedMaterialCard({className:"material-card",thumbnail:presentation.thumbnail,thumbnailAlt:`Vorschaubild zu ${presentation.title}`,title:presentation.title,subtitle:presentation.subtitle,iconName,meta,actions:archiveActions,after:teacherCard(item)});
  }
  return `<article class="resource-card ${isArchiveMaterial ? "archive-card" : ""}"><div class="resource-top"><span class="icon-tile ${color}">${icon(iconName)}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.subtitle)}</p></div></div><div class="meta-row">${audienceChip(item)}<span class="meta-chip">${escapeHtml(item.year)}</span><span class="meta-chip">${escapeHtml(item.duration)}</span>${offlineChip(item.pdf)}</div><div class="action-row">${archiveActions}</div></article>`;
}

const offerPictures = {
  "mathe-ag": { "34": "./assets/offers/mathe-ag-34.png", "56": "./assets/mo-ni-geometrie-56.png" },
  olympiade: { "34": "./assets/offers/olympiade-34.png", "56": "./assets/offers/olympiade-56.png", "713": "./assets/offers/olympiade-713-v2.png" },
  kangaroo: { "34": "./assets/offers/kaenguru-34.png", "56": "./assets/offers/kaenguru-56.png", "713": "./assets/offers/kaenguru-713-v5.png" },
  matheplus: { "34": "./assets/offers/matheplus-34.png", "56": "./assets/offers/matheplus-56.png" },
  "bist-du-fit": { "713": "./assets/offers/mathefit-713-v3.png" },
  journey: { "34": "./assets/mo-ni-reise.png" },
  workbooks: { "34": "./assets/mo-ni-arbeitsheft.png" },
  sunday: { "34": "./assets/offers/sonntagsraetsel-34.png", "56": "./assets/offers/sonntagsraetsel-56.png" }
};

function offerHeader(key, title, description) {
  const image = offerPictures[key][state.audience];
  const heading = escapeHtml(title).replace("Mathematik-Olympiade", "Mathematik-<wbr>Olympiade").replace("Mathe-Olympiade", "Mathe-<wbr>Olympiade").replace("Sonntagsrätsel", "Sonntags&shy;rätsel");
  const website = key === "kangaroo" ? '<span class="offer-website">www.mathe-kaenguru.de</span>' : "";
  return `<section class="offer-header" data-offer="${key}"><div class="offer-copy"><h1>${heading}</h1><p>${escapeHtml(description)}</p>${website}</div><img src="${image}" alt="MO und Ni entdecken ${escapeHtml(title)}" /></section>`;
}

function trainingView() {
  if (state.trainingTab === "olympiade" && usesOlderVideos()) return playlistView(usesSeniorVideos() ? "olympiad713" : "olympiad56", true);
  if (state.trainingTab === "bist-du-fit" && usesSeniorVideos()) return playlistView("fit713", true);
  const query = state.query.trim();
  const showGradeFilter = state.trainingTab !== "mathe-ag";
  const filterGrades = state.trainingTab === "matheplus" && state.audience !== "34" ? [...AUDIENCES[state.audience], 7] : AUDIENCES[state.audience];
  const matchesGrade = item => matchesAudience(item, state.audience) && (!showGradeFilter || state.gradeFilter === "all" || gradesFor(item).includes(Number(state.gradeFilter)));
  const filtered = state.content.resources.filter(item => item.category === state.trainingTab && matchesGrade(item) && resourceMatches(item, query));
  const headings = {
    "mathe-ag": ["Mathe-AG", "Entdecke spannende Mathe-Aufgaben und knobele gemeinsam mit uns."],
    olympiade: [olympiadLabel(), "Löse Olympiade-Aufgaben und entdecke verschiedene Lösungsideen."],
    matheplus: ["MathePlus", "Knoble an vielseitigen Aufgaben und vertiefe deine Mathekenntnisse."]
  };
  const [title, copy] = headings[state.trainingTab];
  const searchMaterialLabel = state.trainingTab === "mathe-ag" ? "Mathe-AG-Folgen" : state.trainingTab === "olympiade" ? "Klausurblätter" : "Aufgabenblätter";
  const emptyMaterialLabel = searchMaterialLabel;
  return `<main class="page training-page" id="main-content">
    ${offerHeader(state.trainingTab, title, copy)}
    <label class="search-field">${icon("search")}<input type="search" data-role="resource-search" value="${escapeHtml(state.query)}" placeholder="Thema oder Aufgabe suchen …" aria-label="Aufgaben durchsuchen" /></label>
    ${query ? `<div class="search-summary"><strong>${filtered.length} Treffer</strong><span>${searchMaterialLabel} mit „${escapeHtml(query)}“</span></div>` : ""}
    ${showGradeFilter ? `<div class="filter-row compact" aria-label="Klassenstufe filtern"><button class="filter-chip ${state.gradeFilter === "all" ? "active" : ""}" type="button" data-grade="all">Alle</button>${filterGrades.map(grade => `<button class="filter-chip ${state.gradeFilter === String(grade) ? "active" : ""}" type="button" data-grade="${grade}">Klasse ${grade}</button>`).join("")}${query ? "" : `<span class="result-count">${filtered.length} Einträge</span>`}</div>` : ""}
    ${state.trainingTab === "matheplus" && state.audience !== "34" ? '<p class="library-note">Zusätzlich findest du hier die MathePlus-Blätter für Klasse 7.</p>' : ""}
    <section class="resource-list" aria-label="Materialien">${filtered.length ? filtered.map(resourceCard).join("") : `<div class="empty-state">Keine passenden ${emptyMaterialLabel} gefunden. Probiere einen ähnlichen Begriff${showGradeFilter ? " oder wähle eine andere Klassenstufe" : ""}.</div>`}</section>
  </main>`;
}

function workbooksView() {
  const workbooks = state.content.workbooks;
  const available = Boolean(workbooks.pdfUrl);
  return `<main class="page workbooks-page" id="main-content">
    ${offerHeader("workbooks", workbooks.title, workbooks.description)}
    <article class="workbook-announcement">
      <span class="icon-tile mint">${icon(available ? "workbooks" : "calendar")}</span>
      <div><small>${escapeHtml(workbooks.availableFrom)}</small><h2>${escapeHtml(workbooks.announcementTitle)}</h2><p>${escapeHtml(workbooks.announcementBody)}</p>${available ? `<p>${escapeHtml(workbooks.details)}</p><div class="workbook-actions"><a class="primary-button" href="./workbook-view.html">${icon("library")} PDF öffnen</a><button class="soft-button" type="button" data-pdf-download data-download-url="${escapeHtml(workbooks.pdfUrl)}" data-download-name="${escapeHtml(workbooks.fileName)}">${icon("download")} Herunterladen</button></div>` : '<span class="status-pill">In Vorbereitung</span>'}</div>
    </article>
  </main>`;
}

function youtubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.includes("youtu.be")
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : url;
  } catch {
    return url;
  }
}

function viewerPdfUrl(viewer) {
  if (!state.serverMode) return viewer.url;
  if (viewer.resourceCategory === "mathe-ag" && viewer.resourceCollection === "56" && viewer.resourceNumber) return `./api/mathe-ag-56/${viewer.resourceNumber}/pdf`;
  if (viewer.resourceCategory === "mathe-ag" && viewer.resourceNumber) return `./api/mathe-ag/${viewer.resourceNumber}/pdf`;
  if (viewer.resourceCategory === "olympiade" && viewer.resourceId) return `./api/olympiade/${encodeURIComponent(viewer.resourceId)}/pdf`;
  if (viewer.resourceCategory === "matheplus" && viewer.resourceId) return `./api/matheplus/${encodeURIComponent(viewer.resourceId)}/pdf`;
  if (viewer.resourceCategory === "sunday" && viewer.resourceId) return `./api/sunday/${encodeURIComponent(viewer.resourceId)}/pdf`;
  return viewer.url;
}

function offlineAction(viewer, pdfUrl) {
  if (!offlineMaterials.available() || !pdfUrl || pdfUrl.includes("/api/")) return "";
  if (viewer.offlineSaving) return `<button class="soft-button offline-action" type="button" disabled>${icon("download")} Wird gesichert …</button>`;
  return offlineMaterials.isSaved(pdfUrl)
    ? `<button class="soft-button offline-action saved" type="button" data-action="offline-info">${icon("download")} Offline gesichert ✓</button>`
    : `<button class="soft-button offline-action" type="button" data-action="save-offline">${icon("download")} Offline sichern</button>`;
}

function viewerView() {
  const viewer = state.viewer;
  if (!viewer) return trainingView();
  const videos = viewer.videos?.length ? viewer.videos : viewer.type === "video" ? [{ label: "Video", url: viewer.url }] : [];
  const activeVideo = videos[viewer.videoIndex || 0] || videos[0];
  const embeddedUrl = viewer.type === "video" ? statisticsEmbedUrl(youtubeEmbedUrl(activeVideo?.url || viewer.url)) : viewer.url;
  const website = viewer.type === "web" ? prepareMaterialLink(viewer.url) : null;
  const frame = viewer.type === "pdf"
    ? `<div class="pdf-viewer"><div class="pdf-status" id="pdf-status" role="status" aria-live="polite">Aufgabenblatt wird vorbereitet …</div><div class="pdf-pages pdf-print-surface" id="pdf-pages"></div></div>`
    : viewer.type === "web"
      ? website ? `<div class="viewer-frame website"><iframe src="${escapeHtml(website.href)}" title="${escapeHtml(viewer.title)}" loading="eager" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : `<p class="empty-state">Diese Website konnte nicht geöffnet werden.</p>`
      : `<div class="viewer-frame video"><iframe src="${escapeHtml(embeddedUrl)}" title="${escapeHtml(viewer.title)}" loading="eager" allow="fullscreen; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>${videos.length > 1 ? `<div class="video-picker" aria-label="Videos dieser Folge">${videos.map((video, index) => `<button class="filter-chip ${(viewer.videoIndex || 0) === index ? "active" : ""}" type="button" data-action="select-video" data-video-index="${index}">${escapeHtml(video.label || `Video ${index + 1}`)}</button>`).join("")}</div>` : ""}`;

  const pdfUrl = viewer.type === "pdf" ? viewerPdfUrl(viewer) : "";
  const downloadUrl = pdfUrl ? `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}download=1` : "";
  const gameCards = state.previousView === "games" && state.selectedGame === "divisors";
  const returnLabel = viewer.type === "web" ? "Zurück zur App" : gameCards ? "Zurück zum Spiel" : viewer.resourceCategory === "mathe-ag"
    ? "Zurück zur Mathe-AG"
    : viewer.resourceCategory === "olympiade"
      ? `Zurück zur ${olympiadLabel()}`
      : viewer.resourceCategory === "matheplus"
        ? "Zurück zu MathePlus"
        : viewer.resourceCategory === "journey"
          ? "Zurück zur Knobelreise"
          : viewer.resourceCategory?.startsWith("kangaroo") ? "Zurück zu Mathe mit dem Känguru"
          : viewer.resourceCategory?.startsWith("olympiad") ? `Zurück zur ${olympiadLabel()}`
          : viewer.resourceCategory === "fit713" ? "Zurück zu Bist du fit"
          : viewer.resourceCategory === "sunday"
            ? state.previousView === "games" ? "Zurück zum Rätsel" : "Zurück zu den Sonntagsrätseln"
        : "Zurück zur vorherigen Ansicht";
  const returnAction = `<button class="soft-button viewer-home-action" type="button" data-action="close-viewer" aria-label="${returnLabel}" title="${returnLabel}">${icon("back")} ${viewer.type === "web" || gameCards ? returnLabel : "Zurück"}</button>`;
  const materialActions = viewer.type === "pdf"
    ? `${returnAction}<button class="soft-button viewer-print-action" type="button" data-action="print-document">${icon("printer")} Drucken</button><button class="soft-button" type="button" data-pdf-download data-download-url="${escapeHtml(downloadUrl)}" data-download-name="${escapeHtml(viewer.title)}.pdf">${icon("download")} Herunterladen</button>${offlineAction(viewer, pdfUrl)}`
    : returnAction;
  const actionBar = `<div class="viewer-actions ${viewer.type === "pdf" ? "pdf-actions" : "video-actions"}">${materialActions}</div>${viewer.type === "pdf" ? '<p class="print-result" id="print-result" role="status" aria-live="polite" hidden></p>' : ""}`;
  return `<main class="page viewer-page${gameCards ? " game-material-page" : ""}${viewer.type === "web" ? " website-page" : ""}" id="main-content">
    <div class="viewer-actions-top">${actionBar}</div>
    ${frame}
  </main>`;
}

function selectedKangarooVideos(collection) {
  return kangarooVideosFor(collection, state.kangarooSelection.groups, state.kangarooSelection.years, state.kangarooQuery, state.kangarooSelection.tasks);
}

function kangarooFilters(collection) {
  const years = [...new Set(collection.videos.map(video => video.year).filter(Boolean))].sort().reverse();
  const groups = KANGAROO_GROUPS.filter(group => collection.videos.some(video => group.grades.some(grade => video.grades.includes(grade))));
  const resultCount = selectedKangarooVideos(collection).length;
  const resultLabel = `${resultCount} ${resultCount === 1 ? "Video" : "Videos"}`;
  const option = (dimension, value, label) => `<label class="journey-filter-option"><input type="checkbox" data-kangaroo-choice="${dimension}:${value}" ${state.kangarooSelection[dimension].includes(value) ? "checked" : ""} /><span>${escapeHtml(label)}</span></label>`;
  return `<div class="playlist-filters"><label class="search-field">${icon("search")}<input type="search" data-role="kangaroo-search" value="${escapeHtml(state.kangarooQuery)}" placeholder="Thema oder Aufgabe suchen …" aria-label="Känguru-Aufgaben durchsuchen" /></label>
    <details class="journey-filter-panel kangaroo-filter-panel" ${state.kangarooFiltersOpen ? "open" : ""}><summary>${icon("filter")} Filter <span class="filter-selection-count" data-kangaroo-result-count aria-live="polite">${resultLabel}</span>${icon("chevron")}</summary><div class="journey-filter-body">
      <button class="soft-button" type="button" data-action="reset-kangaroo-filters">${icon("reset")} Filter zurücksetzen</button>
      <fieldset><legend>Klassenstufe</legend>${groups.map(group => option("groups", group.id, group.label)).join("")}</fieldset>
      <fieldset class="kangaroo-years"><legend>Jahr</legend>${years.map(year => option("years", year, year)).join("")}</fieldset>
      <fieldset><legend>Aufgabengruppe</legend>${["A","B","C"].map(task => option("tasks", task, `${task}-Aufgaben`)).join("")}</fieldset>
      <button class="primary-button" type="button" data-action="apply-kangaroo-filters">${resultLabel} anzeigen</button>
    </div></details></div>`;
}

function playlistSection(key, training = false, standalone = false) {
  const collection = state.content.videoPlaylists.collections[key];
  const kangaroo = key.startsWith("kangaroo"), fit = key === "fit713";
  const videos = kangaroo
    ? selectedKangarooVideos(collection)
    : videosFor(collection, fit ? "all" : state.gradeFilter, state.query);
  const cards = videos.map(video => {
    const fitNumber = video.title.match(/Mathe\s*Fit\s*#\s*(\d+)/i)?.[1];
    const fitLabel = fitNumber ? `Mathe Fit #${fitNumber}` : "";
    if (!kangaroo) return illustratedMaterialCard({
      className: `material-card${fit ? " mathe-fit-card" : ""}`, thumbnail: video.thumbnail,
      thumbnailAlt: `Vorschaubild zu ${video.displayTitle || video.title}`,
      title: fit ? "" : video.displayTitle || video.title, subtitle: "", iconName: "olympiad",
      before: `<small class="video-task-label">${escapeHtml(fit ? `${fitLabel || "Terme und Gleichungen"}: ${video.displayTitle || video.title}` : video.task || video.year || "Mathematik-Olympiade")}</small>`,
      meta: "",
      actions: `<button class="secondary-button" type="button" data-action="open-playlist-video" data-collection="${key}" data-video-id="${video.videoId}"${fit ? ` aria-label="Video ansehen: ${escapeHtml(fitLabel)} · ${escapeHtml(video.displayTitle || video.title)}"` : ""}>${icon("play")} Video ansehen</button>`
    });
    const metadata = kangarooCardLabel(video);
    return `<article class="journey-video-card kangaroo-video-card">
    <button class="kangaroo-thumbnail" type="button" data-action="open-playlist-video" data-collection="${key}" data-video-id="${video.videoId}" data-video-entry="thumbnail" aria-label="Video ansehen: ${escapeHtml(video.displayTitle || video.title)} · ${escapeHtml(metadata)}" title="Video ansehen"><img src="${escapeHtml(localThumbnail(video.thumbnail) || THUMBNAIL_PLACEHOLDER)}" alt="Vorschaubild zu ${escapeHtml(video.displayTitle || video.title)}" loading="lazy" data-thumbnail /></button>
    <p class="kangaroo-card-meta">${escapeHtml(metadata)}</p>
    <div class="kangaroo-card-actions"><button class="secondary-button" type="button" data-action="open-playlist-video" data-collection="${key}" data-video-id="${video.videoId}" data-video-entry="button" aria-label="Video ansehen: ${escapeHtml(metadata)}">${icon("play")} Video ansehen</button></div>
  </article>`;
  }).join("");
  const unavailable = collection.emptyMessage && !collection.videos.length;
  const empty = unavailable ? collection.emptyMessage : fit ? "Keine passende Folge gefunden. Probiere einen anderen Suchbegriff." : "Keine passende Aufgabe gefunden. Probiere einen anderen Suchbegriff oder ändere die Filter.";
  return `<section class="journey-archive">${kangaroo && !standalone ? kangarooFilters(collection) : ""}<div class="section-header"><div><h2>${standalone ? fit ? "Terme und Gleichungen (Algebra)" : "Unsere Aufgaben" : escapeHtml(collection.title)}</h2></div>${kangaroo ? "" : `<span class="result-count" role="status">${videos.length} ${videos.length === 1 ? "Video" : "Videos"}</span>`}</div>
    ${!unavailable && collection.pendingGrades?.length ? `<p class="library-note">Videos für Klasse ${collection.pendingGrades.join(" und ")} sind hier noch nicht verfügbar.</p>` : ""}
    <div class="${kangaroo ? "journey-video-list" : "resource-list"}">${cards || `<div class="empty-state">${escapeHtml(empty)}</div>`}</div></section>`;
}

function playlistView(key, training = false) {
  const collection = state.content.videoPlaylists.collections[key];
  const fit = key === "fit713", unavailable = collection.emptyMessage && !collection.videos.length;
  const grades = [...new Set(collection.videos.flatMap(video => video.grades))].sort((a,b) => a-b);
  const filters = training && !fit && grades.length > 1 ? `<div class="filter-row compact" aria-label="Klassenstufe filtern">${["all",...grades].map(grade => `<button class="filter-chip ${state.gradeFilter === String(grade) ? "active" : ""}" type="button" data-grade="${grade}">${grade === "all" ? "Alle" : `Klasse ${grade}`}</button>`).join("")}</div>` : "";
  const search = unavailable ? "" : training ? `<label class="search-field">${icon("search")}<input type="search" data-role="resource-search" value="${escapeHtml(state.query)}" placeholder="${fit ? "Thema oder Folge suchen …" : "Thema oder Aufgabe suchen …"}" aria-label="${fit ? "Bist-du-fit-Videos durchsuchen" : "Aufgaben durchsuchen"}" /></label>` : kangarooFilters(collection);
  const offer = key.startsWith("kangaroo") ? "kangaroo" : fit ? "bist-du-fit" : "olympiade";
  return `<main class="page ${training ? "training-page" : "journey-page"}" id="main-content">${offerHeader(offer, fit ? "Bist du fit?" : collection.title, collection.description)}
    ${search}${filters}${playlistSection(key, training, true)}</main>`;
}

function journeyConfig() {
  return state.content.journey;
}

function journeyArchiveVideos() {
  return journeyConfig().videos || [];
}

function journeyFilters() {
  const options = journeyFilterOptions(journeyArchiveVideos().filter(video => matchesAudience(video, state.audience)));
  const activeCount = state.journeySelection.grades.length + state.journeySelection.competitions.length;
  const option = entry => {
    const selected = entry.id === "all" ? activeCount === 0 : state.journeySelection[entry.dimension].includes(entry.value);
    return `<label class="journey-filter-option"><input type="checkbox" data-journey-choice="${entry.id}" ${selected ? "checked" : ""} /><span>${escapeHtml(entry.label)}</span><small>${entry.count} ${entry.count === 1 ? "Video" : "Videos"}</small></label>`;
  };
  return `<details class="journey-filter-panel" ${state.journeyFiltersOpen ? "open" : ""}><summary>${icon("filter")} Filter${activeCount ? `<span class="filter-selection-count">${activeCount}</span>` : ""}${icon("chevron")}</summary><div class="journey-filter-body">${options.filter(entry => entry.id === "all").map(option).join("")}<fieldset><legend>Klassenstufe</legend>${options.filter(entry => entry.dimension === "grades").map(option).join("")}</fieldset><fieldset><legend>Aufgaben aus</legend>${options.filter(entry => entry.dimension === "competitions").map(option).join("")}</fieldset></div></details>`;
}

function kangarooView() {
  return playlistView(`kangaroo${state.audience}`);
}

function journeyView() {
  if (usesOlderVideos()) return kangarooView();
  const journey = journeyConfig();
  const next = journey.nextPublication;
  const videos = filterJourneyItems(journeyArchiveVideos().filter(video => matchesAudience(video, state.audience)), state.journeySelection);
  const showNext = next && matchesAudience(next, state.audience) && matchesJourneyFilters(next, state.journeySelection) && new Date(next.scheduledAt) > new Date();
  const firstPublishedIndex = videos.findIndex(video => new Date(video.publishedAt || 0) <= new Date());
  const nextAction = next?.url
    ? `<button class="secondary-button" type="button" data-action="open-journey-video" data-journey-video-id="${escapeHtml(next.videoId)}">${icon("play")} Video öffnen</button>`
    : `<span class="journey-coming-soon">${icon("clock")} Das nächste Video erscheint hier nach seiner Veröffentlichung.</span>`;
  const videoCards = videos.map((video, index) => {
    const upcoming = new Date(video.publishedAt || 0) > new Date();
    const status = upcoming ? "Premiere" : index === firstPublishedIndex ? "Aktuell" : "";
    const premiereDate = upcoming
      ? `<span class="journey-premiere-date">${icon("calendar")} Premiere: ${escapeHtml(formatPublicationDateTime(video.publishedAt))} Uhr</span>`
      : "";
    return `<article class="journey-video-card ${status ? "latest" : ""}">
    <img src="${escapeHtml(localThumbnail(video.thumbnail) || THUMBNAIL_PLACEHOLDER)}" alt="Vorschaubild zu ${escapeHtml(video.code)}" loading="lazy" data-thumbnail />
    <div class="journey-video-copy">${premiereDate}<div class="meta-row"><span class="meta-chip">${escapeHtml(video.code)}</span>${audienceChip(video)}${status ? `<span class="meta-chip current">${status}</span>` : ""}</div><h3>${escapeHtml(video.title)}</h3><p>${escapeHtml(video.summary)}</p><button class="secondary-button" type="button" data-action="open-journey-video" data-journey-video-id="${escapeHtml(video.videoId)}">${icon("play")} Video ansehen</button></div>
  </article>`;
  }).join("");

  return `<main class="page journey-page" id="main-content">
    ${offerHeader("journey", "Knobelreise", journey.description)}
    ${journeyFilters()}
    ${showNext ? `<article class="journey-next-card"><span class="journey-next-icon">${icon("calendar")}</span><div><small>Nächste Veröffentlichung</small><h2>${escapeHtml(next.code)} · ${escapeHtml(next.title)}</h2><p>${escapeHtml(formatPublicationDateTime(next.scheduledAt))}</p>${nextAction}</div></article>` : ""}
    <section class="journey-archive"><div class="section-header"><div><h2>Unsere Reiseziele</h2></div><span class="result-count">${videos.length} ${videos.length === 1 ? "Video" : "Videos"}</span></div><div class="journey-video-list">${videoCards || `<div class="empty-state"><p>Für diese Auswahl gibt es noch keine Videos.</p><button class="soft-button" type="button" data-action="reset-journey-filters">Alle Inhalte anzeigen</button></div>`}</div></section>
  </main>`;
}

function sundayConfig() {
  return state.content.sunday || {
    title: "Sonntagsrätsel",
    description: "Knifflige Aufgabenblätter zum Tüfteln – mit einem Video zum Nachdenken, Vergleichen und Weiterlernen.",
    rhythm: "Neue Rätsel erscheinen sonntags.",
    items: []
  };
}

function sundayMatches(item, query) {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalizeSearch(`${item.title || ""} ${item.subtitle || ""} ${item.code || ""} ${item.searchText || ""}`);
  return tokens.every(token => haystack.includes(token));
}

function sundayCard(item, index) {
  const videos = item.videos?.length ? item.videos : item.video ? [{ label: "Video", url: item.video }] : [];
  const videoLabel = videos.length > 1 ? `${videos.length} Videos` : "Video";
  const upcoming = item.publishedAt && new Date(item.publishedAt) > new Date();
  const videoReady = !upcoming || item.premiere;
  const publicationDate = upcoming
    ? `<span class="journey-premiere-date sunday-premiere-date">${icon("calendar")} ${item.premiere ? "Premiere" : "Video ab"}: ${escapeHtml(formatPublicationDateTime(item.publishedAt))} Uhr</span>`
    : "";
  const meta = [item.code, item.dateLabel || item.date]
    .filter(Boolean)
    .map(value => `<span class="meta-chip">${escapeHtml(value)}</span>`)
    .join("") + offlineChip(item.pdf);
  const actions = `${videos.length && videoReady ? `<button class="secondary-button" type="button" data-open-sunday-resource data-sunday-id="${escapeHtml(item.id)}" data-viewer-type="video">${icon("play")} ${videoLabel}</button>` : ""}${item.pdf ? `<button class="soft-button" type="button" data-open-sunday-resource data-sunday-id="${escapeHtml(item.id)}" data-viewer-type="pdf">${icon("download")} PDF öffnen</button>` : ""}`;

  return illustratedMaterialCard({className:`sunday-card ${index === 0 ? "latest" : ""}`,thumbnail:item.thumbnail,thumbnailAlt:`Vorschaubild zu ${item.code || item.title}: ${item.title}`,title:item.title,subtitle:item.subtitle || "Erst selbst knobeln, dann den Lösungsweg entdecken.",iconName:"sundayPuzzle",meta,actions:actions+(puzzleGame.registry.list().some(t=>t.episodes?.some(e=>e.id===item.id))?`<button class="primary-button" type="button" data-play-sunday="${escapeHtml(item.id)}">In der App lösen</button>`:""),before:publicationDate});
}

function sundayView() {
  const sunday = sundayConfig();
  const items = [...(sunday.items || [])].filter(item => sundayWorksheetIsAvailable(item)).sort((first, second) =>
    String(second.date || second.code || "").localeCompare(String(first.date || first.code || ""))
  );
  const query = state.sundayQuery.trim();
  const filtered = items.filter(item => sundayMatches(item, query));
  const search = items.length
    ? `<label class="search-field">${icon("search")}<input type="search" data-role="sunday-search" value="${escapeHtml(state.sundayQuery)}" placeholder="Sonntagsrätsel durchsuchen …" aria-label="Sonntagsrätsel durchsuchen" /></label>${query ? `<div class="search-summary"><strong>${filtered.length} ${filtered.length === 1 ? "Treffer" : "Treffer"}</strong><span>Rätsel mit „${escapeHtml(query)}“</span></div>` : ""}`
    : "";
  const archive = items.length
    ? `<section class="sunday-archive"><div class="section-header"><div><h2>Alle Sonntagsrätsel</h2></div>${query ? "" : `<span class="result-count">${items.length} Rätsel</span>`}</div><div class="resource-list">${filtered.length ? filtered.map(sundayCard).join("") : '<div class="empty-state">Kein passendes Sonntagsrätsel gefunden. Probiere einen ähnlichen Begriff.</div>'}</div></section>`
    : `<article class="sunday-empty"><span class="icon-tile home-accent">${icon("sundayPuzzle")}</span><div><small>Demnächst</small><h2>Das erste Rätsel ist unterwegs</h2><p>Sobald das erste Aufgabenblatt bereitsteht, findest du es hier. Das passende Video kommt anschließend dazu.</p><span class="sunday-rhythm">${icon("calendar")} ${escapeHtml(sunday.rhythm)}</span></div></article>`;

  return `<main class="page training-page sunday-page" id="main-content">
    ${offerHeader("sunday", sunday.title, "Knoble an unserem Rätsel zum Wochenende und entdecke im Video den Lösungsweg.")}
    ${search}
    ${archive}
  </main>`;
}

function contactMailto(message) {
  const subject = encodeURIComponent("MO-Ni-App: Rückmeldung");
  const body = encodeURIComponent(String(message));
  return `mailto:${state.content.meta.contactEmail}?subject=${subject}&body=${body}`;
}

function moreView() {
  const installRow = state.installed
    ? ""
    : `<button class="settings-row text-button" type="button" data-action="install"><span class="icon-tile">${icon("download")}</span><span><strong>App installieren</strong><span>${state.deferredInstall ? "Jetzt direkt auf diesem Gerät installieren." : isIosDevice() ? "Auf dem iPhone oder iPad zum Home-Bildschirm hinzufügen." : "Anleitung für dieses Gerät anzeigen."}</span></span>${icon("chevron")}</button>`;
  return `<main class="page" id="main-content">
    <div class="page-heading"><span class="eyebrow">MO-Ni e.V.</span><h1>Mehr</h1><p>Fragen, Tipps und Neues.</p></div>
    <section class="contact-card"><div class="contact-heading"><span class="icon-tile">${icon("mail")}</span><h2>Deine Nachricht an MO und Ni</h2></div><p>Hast du eine Frage oder eine Idee? Schreib uns!</p><form data-role="contact-form"><div class="form-field"><label for="message">Deine Nachricht</label><textarea id="message" name="message" placeholder="Schreibe hier deine Nachricht …" aria-describedby="contact-note" required>${escapeHtml(state.contactMessage)}</textarea></div><p class="contact-note" id="contact-note">Öffnet dein E-Mail-Programm. Dort schickst du die Nachricht ab.</p><button class="secondary-button" type="submit">${icon("send")} Nachricht senden</button></form></section>
    <section class="section settings-card"><div class="section-header"><div><h2>Rund um MO-Ni</h2></div></div><div class="settings-list"><button class="settings-row text-button" type="button" data-open-viewer data-viewer-type="web" data-viewer-url="${escapeHtml(state.content.meta.website)}" data-viewer-title="MO-Ni-Website"><span class="icon-tile">${icon("globe")}</span><span><strong>MO-Ni-Website</strong><span>Aktuelles und weitere Informationen</span></span>${icon("chevron")}</button><button class="settings-row text-button" type="button" data-action="open-about"><span class="icon-tile mint">${icon("info")}</span><span><strong>Neues zur App</strong><span>Versionen und neue Funktionen</span></span>${icon("chevron")}</button>${installRow}</div></section>
    ${offlineSection()}
  </main>`;
}

function modalView() {
  if (!state.modal) return "";
  if (state.modal === "install") {
    const situation = installSituation(navigator);
    const pageUrl = installPageUrl(location.href);
    // Eingebaute Browser (z. B. in der YouTube-App) können nicht installieren: ein Knopf öffnet den richtigen Browser.
    const escapeSteps = device => `<div class="install-escape"><p class="install-lead">Hier im eingebauten Browser lässt sich MO-Ni nicht installieren. Öffne die Seite in ${device === "ios" ? "Safari" : "Chrome"}, dort geht es mit einem Fingertipp weiter.</p><a class="primary-button full-button" href="${escapeHtml(openInBrowserUrl(device, pageUrl))}" data-install-escape>${icon("globe")} In ${device === "ios" ? "Safari" : "Chrome"} öffnen</a><button class="soft-button full-button" type="button" data-action="copy-install-link" data-link="${escapeHtml(pageUrl)}">${icon("share")} Link kopieren</button><p class="install-hint">Öffnet sich nichts? Dann tippe auf „Link kopieren“, öffne ${device === "ios" ? "Safari" : "Chrome"} und füge den Link oben in die Adresszeile ein.</p></div>`;
    const iosPicture = `<figure class="install-picture" aria-hidden="true"><svg viewBox="0 0 320 96" role="presentation"><rect x="8" y="18" width="304" height="60" rx="30" fill="#f2f4f3" stroke="#c9d6cf"/><g stroke="#176b4d" stroke-width="4" stroke-linecap="round"><path d="M34 38h20M34 48h20M34 58h13"/></g><circle cx="44" cy="48" r="22" fill="none" stroke="#e0583c" stroke-width="4" class="install-picture-ring"/><rect x="82" y="36" width="176" height="24" rx="12" fill="#fff"/><text x="170" y="53" text-anchor="middle" font-size="14" fill="#557066">mo-ni.de</text><g fill="none" stroke="#557066" stroke-width="3" stroke-linecap="round"><path d="M280 48h4M290 48h4M270 48h4"/></g><path d="M44 4v8m0 0l-5-5m5 5l5-5" stroke="#e0583c" stroke-width="3" fill="none" stroke-linecap="round" class="install-picture-arrow"/></svg><figcaption>Dieses Symbol unten links in Safari antippen</figcaption></figure>`;
    const iosSafariSteps = `<ol class="install-steps"><li><span>1</span><div><strong class="install-step-title"><span class="safari-page-menu-symbol">${icon("pageMenu")}</span><span>Seitenmenü öffnen</span></strong><p>Tippe unten links neben der Webadresse auf das Symbol mit drei waagerechten Strichen.</p>${iosPicture}</div></li><li><span>2</span><div><strong>Teilen und Mehr anzeigen</strong><p>Wähle „Teilen“. Tippe anschließend auf „Mehr anzeigen“, falls „Zum Home-Bildschirm“ noch nicht zu sehen ist.</p></div></li><li><span>3</span><div><strong>App hinzufügen</strong><p>Wähle „Zum Home-Bildschirm“, aktiviere „Als Web-App öffnen“ und tippe auf „Hinzufügen“.</p></div></li></ol><p class="install-hint">Siehst du keine Webadresse, sondern oben nur „Fertig“? Dann tippe unten rechts auf das Safari-Symbol, damit sich die Seite in Safari öffnet.</p>`;
    const iosChromeSteps = `<ol class="install-steps"><li><span>1</span><div><strong>Teilen antippen</strong><p>Tippe oben rechts in der Adresszeile auf das Teilen-Symbol.</p></div></li><li><span>2</span><div><strong>App hinzufügen</strong><p>Wähle „Zum Home-Bildschirm“ und tippe auf „Hinzufügen“.</p></div></li></ol>`;
    const iosSteps = situation.device === "ios" && situation.browser === "in-app" ? escapeSteps("ios")
      : situation.device === "ios" && situation.browser === "chrome" ? iosChromeSteps
      : iosSafariSteps;
    const directInstall = `<button class="primary-button full-button" type="button" data-action="install">${icon("download")} Jetzt installieren</button>`;
    const androidMenuSteps = `<ol class="install-steps"><li><span>⋮</span><div><strong>Browser-Menü antippen</strong><p>Tippe oben rechts auf ⋮ und wähle „Installieren und Verknüpfung erstellen“ oder „App installieren“.</p></div></li></ol>`;
    const androidSteps = state.deferredInstall ? directInstall
      : situation.device === "android" && situation.browser !== "chrome" ? escapeSteps("android")
      : androidMenuSteps;
    const phoneCode = `<figure class="install-qr"><img src="./assets/app-qr-code.svg" alt="QR-Code für mo-ni.de/app" width="150" height="150"><figcaption><strong>Auf das Handy holen</strong><span>Öffne die Kamera am Handy und richte sie auf diesen Code. Oder tippe dort mo-ni.de/app ein.</span></figcaption></figure>`;
    const computerSteps = `<div class="computer-install-options">
      ${phoneCode}
      ${state.deferredInstall ? directInstall : ""}
      <section class="computer-install-section"><h3>Mac</h3><div class="computer-browser-step"><strong>Safari</strong><p>Wähle in der Menüleiste „Ablage“ › „Zum Dock hinzufügen“.</p></div><div class="computer-browser-step"><strong>Chrome</strong><p>Klicke rechts in der Symbolleiste auf <span class="browser-menu-symbol">${icon("moreVertical")}</span> und wähle „Streamen, speichern und teilen“ › „Seite als App installieren…“.</p></div></section>
      <section class="computer-install-section"><h3>Windows-PC</h3><div class="computer-browser-step"><strong>Chrome</strong><p>Klicke rechts oben auf <span class="browser-menu-symbol">${icon("moreVertical")}</span> und wähle „Streamen, speichern und teilen“ › „Seite als App installieren…“.</p></div><div class="computer-browser-step"><strong>Edge</strong><p>Klicke rechts oben auf ⋯ und wähle „Weitere Tools“ › „Apps“ › „Diese Website als App installieren“.</p></div></section>
    </div>`;
    const iosGuide = state.installed && isIosDevice()
      ? `<a class="install-device install-device-link" href="${escapeHtml(browserInstallUrl())}"><span>iPhone oder iPad</span>${icon("chevron")}</a>`
      : `<details class="install-device" name="install-device" ${isIosDevice() ? "open" : ""}><summary>iPhone oder iPad</summary>${iosSteps}</details>`;
    // Im eingebauten Browser zählt nur ein Weg: hinaus in Safari bzw. Chrome.
    const onlyEscape = situation.device !== "computer" && !state.installed && !state.deferredInstall && (situation.browser === "in-app" || (situation.device === "android" && situation.browser !== "chrome"));
    const installationGuides = requestedInstallDevice === "computer"
      ? `<div class="install-guides install-guides-focused">${computerSteps}</div>`
      : onlyEscape
        ? `<div class="install-guides install-guides-focused">${escapeSteps(situation.device)}</div>`
        : `<div class="install-guides">${iosGuide}<details class="install-device" name="install-device" ${isAndroidDevice() ? "open" : ""}><summary>Android-Handy oder -Tablet</summary>${androidSteps}</details><details class="install-device" name="install-device" ${!isIosDevice() && !isAndroidDevice() ? "open" : ""}><summary>PC oder Mac</summary>${computerSteps}</details></div>`;
    const installNote = localIphoneTest
      ? `<div class="safety-note">${icon("info")}<span>Für diesen Test müssen Mac und iPhone im selben WLAN bleiben; das Startfenster auf dem Mac muss geöffnet sein.</span></div>`
      : "";
    const installTitle = requestedInstallDevice === "computer" ? "MO-Ni auf Mac oder Windows-PC installieren" : "MO-Ni installieren";
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-panel><div class="modal-header"><h2 id="modal-title">${installTitle}</h2><button class="icon-button" type="button" data-action="close-modal" aria-label="Schließen">${icon("x")}</button></div>${installationGuides}${installNote}</section></div>`;
  }
  return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-panel><div class="modal-header"><h2 id="modal-title">Neues zur App</h2><button class="icon-button" type="button" data-action="close-modal" aria-label="Schließen">${icon("x")}</button></div><ol class="release-notes"><li><h3>Version 0.14</h3><p class="release-date">Oktober 2026</p><ul><li>Deka Dots: die fünf Aufgaben aus Sonntagsrätsel #06 jetzt auch in der App lösen.</li><li>Teiler-Vielfache-Spiel zu zweit oder gegen MO und Ni, mit drei Spielstärken. 40, 100 oder eine eigene Kartenzahl über 100.</li><li>Größerer Ablagestapel, Spielverlauf und kurze Denkpausen beim Spiel gegen MO oder Ni.</li><li>Mehr Platz beim Spielen, mit direktem Rückweg zur Auswahl und zur Startseite.</li><li>Polyomino-Spielfeld, Teile und Werkzeuge gemeinsam im Blick, auch im Querformat.</li></ul></li><li><h3>Version 0.13 </h3><p class="release-date">Oktober 2026</p><ul><li>Spiel und Spaß für alle Klassenbereiche: Rechen-Rallye, Zahlenwirbel und Rätsel.</li><li>Zahlenregen oder schwebende Steine, Sortieren von Zahlen und Rechnungen.</li><li>MO und Ni öffnen die Goldtalertruhe, hüpfen vor Freude und winken dir zu.</li><li>Rechen-Rallye mit Zahlenbereich, Rechenarten und drei Antworten.</li><li>Goldtaler, Ein-Minuten-Runden und Üben ohne Zeitlimit.</li><li>Persönliche Bestleistung für dieselbe Aufgabenauswahl.</li></ul></li><li><h3>Version 0.12 </h3><p class="release-date">Oktober 2026</p><ul><li>Eigene Angebote für Klasse 3–4, Klasse 5–6 und Klasse 7–13.</li><li>Mathe mit dem Känguru für Klasse 5–13 mit einzelnen Videokarten.</li><li>Bist du fit: Terme und Gleichungen für Klasse 7–13.</li><li>Übersichtliche Angebotskarten und mehr Auswahl beim Knobelreise-Filter.</li><li>Einfacher Kontakt zur Mathepost und ein Rückweg von der MO-Ni-Website.</li></ul></li><li><h3>Version 0.11</h3><p class="release-date">September–Oktober 2026</p><ul><li>Sonntagsrätsel mit Aufgabenblättern und Erklärvideos im eigenen Bereich.</li><li>Arbeitshefte mit Aufgaben, Lösungen und passenden Videos.</li><li>Neue Inhalte werden beim Zurückkehren und während der Nutzung aktualisiert.</li></ul></li></ol></section></div>`;
}

function disposePdfPrintPreparation() {
  state.pdfRenderSequence += 1;
  if (!pdfPrintPreparation) return;
  pdfPrintPreparation.controller.abort();
  pdfPrintPreparation.originalPdf?.dispose();
  pdfPrintPreparation.viewer.originalPdf = null;
  pdfPrintPreparation.viewer.printFile = null;
  pdfPrintPreparation.viewer.pdfReady = false;
  pdfPrintPreparation = null;
}

async function hydratePdfViewer() {
  const viewer = state.viewer;
  const container = document.querySelector("#pdf-pages");
  const status = document.querySelector("#pdf-status");
  if (!viewer || viewer.type !== "pdf" || !container || !status) return;

  disposePdfPrintPreparation();
  const sequence = state.pdfRenderSequence;
  const preparation = { viewer, controller: new AbortController(), originalPdf: null };
  pdfPrintPreparation = preparation;
  const current = () => sequence === state.pdfRenderSequence && state.viewer === viewer && state.view === "viewer" && status.isConnected && container.isConnected;
  const originalPdfRequired = shouldUseOriginalPdfPrint(window);
  viewer.pdfReady = false;
  viewer.printFile = null;
  viewer.originalPdf = null;
  viewer.printError = "";
  let documentRendered = false;
  try {
    await renderPdfDocument({
      url: viewerPdfUrl(viewer),
      container,
      onProgress: message => {
        if (current()) {
          status.textContent = message;
          status.hidden = !message;
        }
      }
    });
    documentRendered = true;
    // Ein geteilter Aufgabenlink springt direkt zur richtigen Seite.
    if (current() && viewer.page > 1) container.children[viewer.page - 1]?.scrollIntoView({ block: "start" });
    if (current()) {
      if (!viewer.statisticsPdfOpened) {
        usageStatistics.trackPdf("pdf_open", viewer.url);
        viewer.statisticsPdfOpened = true;
      }
      try {
        viewer.printFile = await fetchPdfFile({
          url: new URL(viewerPdfUrl(viewer), location.href).href,
          fileName: `${viewer.title}.pdf`,
          signal: preparation.controller.signal
        });
      } catch (error) {
        if (!current() || error.name === "AbortError") return;
        if (originalPdfRequired) throw error;
        console.warn("Die PDF konnte nicht für das mobile Druckmenü vorbereitet werden.", error);
      }
      if (!current()) return;
      if (originalPdfRequired) {
        status.hidden = false;
        status.textContent = "Aufgabenblatt wird vorbereitet …";
        const originalPdf = await prepareOriginalPdfPrint({ file: viewer.printFile, scope: window, signal: preparation.controller.signal });
        if (!current()) { originalPdf.dispose(); return; }
        preparation.originalPdf = originalPdf;
        viewer.originalPdf = originalPdf;
        status.hidden = true;
      }
      viewer.pdfReady = true;
    }
  } catch (error) {
    if (current() && error.name !== "AbortError") {
      console.error(error);
      status.hidden = false;
      if (documentRendered && originalPdfRequired) {
        viewer.printError = "Drucken konnte nicht vorbereitet werden. Öffne das Aufgabenblatt bitte erneut.";
        status.textContent = viewer.printError;
      } else {
        status.textContent = "Das Aufgabenblatt konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und versuche es erneut.";
      }
    }
  }
}

function render() {
  disposeVideoStatistics();
  disposeVideoStatistics = () => {};
  disposePdfPrintPreparation();
  if (!state.content) {
    app.innerHTML = '<div class="loading"><div><div class="spinner"></div><p>Lade Mathe-Abenteuer …</p></div></div>';
    return;
  }
  if (state.view !== "viewer") {
    const destination = availableDestination(state.audience, state.view, state.trainingTab);
    if (destination.view !== state.view || destination.tab !== state.trainingTab) {
      state.view = destination.view; state.trainingTab = destination.tab;
      writeStored("view", state.view); writeStored("trainingTab", state.trainingTab); syncViewUrl();
    }
  }
  state.agDateSignature = upcomingAgSignature();
  renderedAvailabilitySignature = contentAvailabilitySignature(state.content);
  pendingContentRender = false;
  pendingContentNotice = false;
  const gameVisible = state.view === "games" && !state.modal && document.visibilityState === "visible";
  mathGame.setVisible(gameVisible && state.selectedGame === "rally");
  whirlGame.setVisible(gameVisible && state.selectedGame === "whirl");
  puzzleGame.setVisible(gameVisible && state.selectedGame === "puzzles");
  divisorGame.setVisible(gameVisible && state.selectedGame === "divisors");
  puzzleGame.updateTypes(createSundayPuzzleTypes(state.content.sunday,state.content.puzzlePublications,new Date(),undefined,{allowPreviewWorksheets:["localhost","127.0.0.1","[::1]"].includes(location.hostname)}));
  const views = { games: gamesView, home: homeView, dates: datesView, training: trainingView, workbooks: workbooksView, journey: journeyView, kangaroo: kangarooView, sunday: sundayView, viewer: viewerView, more: moreView };
  document.documentElement.dataset.moniAudience = state.audience;
  app.innerHTML = `<div class="app-header">${topbar()}${!["viewer", "games"].includes(state.view) ? audiencePicker() : ""}</div>${systemBanners()}${(views[state.view] || homeView)()}${bottomNav()}${modalView()}`;
  if (state.view === "games") {
    mathGame.mount(document.querySelector("[data-math-root]"));
    whirlGame.mount(document.querySelector("[data-whirl-root]"));
    puzzleGame.mount(document.querySelector("[data-puzzle-root]"));
    divisorGame.mount(document.querySelector("[data-divisor-root]"));
  }
  if (state.view === "viewer" && state.viewer?.type === "pdf") requestAnimationFrame(hydratePdfViewer);
  if (state.view === "viewer" && state.viewer?.type === "video") {
    const viewer = state.viewer;
    const url = viewer.videos?.[viewer.videoIndex || 0]?.url || viewer.url;
    const key = `${viewer.videoIndex || 0}|${url}`;
    if (viewer.statisticsVideo?.key !== key) viewer.statisticsVideo = { key };
    disposeVideoStatistics = observeVideo(document.querySelector(".viewer-frame.video iframe"), url, viewer.statisticsVideo);
  }
  requestAnimationFrame(maybeApplyAppUpdate);
}

function syncViewUrl() {
  if (location.protocol === "file:") return;
  const url = new URL(location.href);
  url.searchParams.set("audience", state.audience);
  url.searchParams.set("view", state.view === "viewer" ? state.previousView || "training" : state.view);
  if ((state.view === "viewer" ? state.previousView : state.view) === "training") url.searchParams.set("tab", state.trainingTab);
  else url.searchParams.delete("tab");
  if (state.view === "games") url.searchParams.set("game", state.selectedGame);
  else url.searchParams.delete("game");
  url.searchParams.delete("material");
  url.searchParams.delete("aufgabe");
  history.replaceState(null, "", url);
}

function openResource(resource, type, page = 0) {
  const videos = resource.videos?.length ? resource.videos : resource.video ? [{ label: "Video", url: resource.video }] : [];
  state.previousView = state.view === "viewer" ? state.previousView || "training" : state.view;
  state.viewer = {
    type,
    url: type === "video" ? videos[0]?.url : resource.pdf,
    title: `${resource.title} · ${type === "video" ? "Video" : "Aufgabenblatt"}`,
    resourceNumber: resource.number,
    resourceCollection: resource.collection,
    resourceCategory: resource.category,
    resourceId: resource.id,
    videos,
    videoIndex: 0,
    page: type === "pdf" && page > 0 ? page : 0,
    pdfReady: false
  };
  state.view = "viewer";
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function rememberViewerOrigin(button) {
  state.previousScrollY = window.scrollY;
  state.previousFocusAttributes = [...button.attributes].filter(attribute => attribute.name.startsWith("data-")).map(attribute => [attribute.name, attribute.value]);
  state.previousFocusOffset = button.getBoundingClientRect().top;
}

function setView(view, tab, restore = false) {
  if (tab && tab !== state.trainingTab) { state.query = ""; state.gradeFilter = "all"; }
  state.view = view === "workbooks" && usesOlderVideos() ? "home" : view;
  state.viewer = null;
  if (tab) state.trainingTab = tab;
  writeStored("view", state.view);
  writeStored("trainingTab", state.trainingTab);
  syncViewUrl();
  render();
  if (restore) requestAnimationFrame(() => {
    const previousButton = [...app.querySelectorAll("button")].find(button => state.previousFocusAttributes.length && state.previousFocusAttributes.every(([name,value]) => button.getAttribute(name) === value));
    const top = previousButton ? window.scrollY + previousButton.getBoundingClientRect().top - state.previousFocusOffset : state.previousScrollY;
    previousButton?.focus({preventScroll:true});
    window.scrollTo({top,behavior:"instant"});
  });
  else window.scrollTo({ top: 0, behavior: "instant" });
}

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(path, {
      ...options,
      signal: options.signal || controller.signal,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

function showPrintResult(message, tone = "info") {
  const result = document.querySelector("#print-result");
  if (!result) return;
  result.textContent = message;
  result.dataset.tone = tone;
  result.hidden = false;
}

function hidePrintResult() {
  const result = document.querySelector("#print-result");
  if (!result) return;
  result.textContent = "";
  result.hidden = true;
}

async function requestSystemPrint() {
  const viewer = state.viewer;
  if (!viewer?.pdfReady) {
    showToast(viewer?.printError || "Bitte warte, bis alle Seiten druckbereit sind.");
    return;
  }
  const button = document.querySelector('[data-action="print-document"]');
  button?.setAttribute("aria-busy", "true");
  button?.setAttribute("disabled", "");
  hidePrintResult();

  const result = await printManager.printPdf({
    url: new URL(viewerPdfUrl(viewer), location.href).href,
    title: viewer.title,
    file: viewer.printFile,
    originalPdf: viewer.originalPdf
  });

  button?.removeAttribute("aria-busy");
  button?.removeAttribute("disabled");
  if (state.viewer === viewer && button?.isConnected) button.focus({ preventScroll: true });
  if (result.status === "native-dialog" || result.status === "browser-dialog" || result.status === "apple-print-menu" || result.status === "cancelled") {
    hidePrintResult();
  } else if (result.status === "browser-unconfirmed" || result.status === "unsupported") {
    showPrintResult("In dieser Vorschau kann kein Druckdialog geöffnet werden. Öffne die App in Chrome oder Safari und versuche es dort erneut.", "warning");
  } else {
    showPrintResult(result.message || "Der System-Druckdialog konnte nicht geöffnet werden.", "error");
  }
}

// A missing external preview does not remove the card's own title or links.
document.addEventListener("error", event => {
  const image = event.target;
  // Fehlt das Bild eines ganz neuen Videos noch, erscheint der MO-Ni-Platzhalter (nie das Google-Bild).
  if (image.matches?.("img[data-thumbnail]") && !image.dataset.thumbnailFallback) {
    image.dataset.thumbnailFallback = "1";
    image.src = THUMBNAIL_PLACEHOLDER;
  } else if (image.matches?.("img[data-card-thumbnail]")) image.hidden = true;
}, true);

document.addEventListener("toggle", event => {
  if (event.target.matches(".kangaroo-filter-panel") && document.contains(event.target)) { state.kangarooFiltersOpen = event.target.open; return; }
  if (event.target.matches(".journey-filter-panel") && document.contains(event.target)) state.journeyFiltersOpen = event.target.open;
}, true);

document.addEventListener("change", event => {
  const kangarooChoice = event.target.closest("[data-kangaroo-choice]");
  if (kangarooChoice) {
    const [dimension, value] = kangarooChoice.dataset.kangarooChoice.split(":");
    const selected = state.kangarooSelection[dimension];
    state.kangarooSelection[dimension] = selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value];
    state.kangarooFiltersOpen = true;
    render(); document.querySelector(`[data-kangaroo-choice="${kangarooChoice.dataset.kangarooChoice}"]`)?.focus({preventScroll:true}); return;
  }
  const filter = event.target.closest("[data-journey-choice]");
  if (!filter) return;
  state.journeySelection = toggleJourneyFilter(state.journeySelection, filter.dataset.journeyChoice);
  state.journeyFiltersOpen = true;
  render();
  document.querySelector(`[data-journey-choice="${filter.dataset.journeyChoice}"]`)?.focus({preventScroll:true});
});

document.addEventListener("click", async event => {
  const gameButton = event.target.closest('[data-game]');
  if (gameButton) {
    if (gameButton.dataset.game === 'divisors' && state.selectedGame !== 'divisors') divisorGame.showSetup();
    if (gameButton.dataset.game === 'puzzles' && state.selectedGame !== 'puzzles') puzzleGame.showCatalog();
    state.selectedGame = ['rally', 'whirl', 'puzzles', 'divisors'].includes(gameButton.dataset.game) ? gameButton.dataset.game : 'rally';
    writeStored('selectedGame', state.selectedGame); syncViewUrl(); render();
    document.querySelector(`[data-game="${state.selectedGame}"]`)?.focus({preventScroll:true}); return;
  }
  const kangarooApply = event.target.closest('[data-action="apply-kangaroo-filters"]');
  if (kangarooApply) {
    state.kangarooFiltersOpen = false;
    render(); document.querySelector('.kangaroo-filter-panel summary')?.focus(); return;
  }
  const kangarooReset = event.target.closest('[data-action="reset-kangaroo-filters"]');
  if (kangarooReset) {
    state.kangarooSelection = {groups:[], years:[], tasks:[]};
    render(); document.querySelector('[data-action="reset-kangaroo-filters"]')?.focus({preventScroll:true}); return;
  }
  const audience = event.target.closest("[data-audience]");
  if (audience) {
    state.audience = validAudience(audience.dataset.audience);
    state.gradeFilter = "all"; state.journeySelection = {grades:[],competitions:[]}; state.journeyFiltersOpen = false;
    state.query = ""; state.kangarooQuery = ""; state.kangarooSelection = {groups:[], years:[], tasks:[]}; state.kangarooFiltersOpen = false; state.dateFilter = "all";
    writeStored("audience", state.audience);
    syncViewUrl(); render();
    document.querySelector(`[data-audience="${state.audience}"]`)?.focus();
    return;
  }
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    event.preventDefault();
    if (viewButton.dataset.view === 'games' && !['games', 'viewer'].includes(state.view) && state.selectedGame === 'puzzles') puzzleGame.showCatalog();
    setView(viewButton.dataset.view, viewButton.dataset.tab);
    return;
  }

  const playSundayButton=event.target.closest("[data-play-sunday]");
  if(playSundayButton){if(puzzleGame.showEpisode(playSundayButton.dataset.playSunday)){state.selectedGame="puzzles";writeStored("selectedGame","puzzles");setView("games");}return;}

  const sundayViewerButton = event.target.closest("[data-open-sunday-resource]");
  if (sundayViewerButton) {
    const resource = sundayConfig().items.find(item => item.id === sundayViewerButton.dataset.sundayId);
    if (!resource) return;
    const type = sundayViewerButton.dataset.viewerType;
    const videos = resource.videos?.length ? resource.videos : resource.video ? [{ label: "Video", url: resource.video }] : [];
    rememberViewerOrigin(sundayViewerButton);
    state.previousView = state.view;
    state.viewer = {
      type,
      url: type === "video" ? videos[0]?.url : resource.pdf,
      title: `${resource.title} · ${type === "video" ? "Video" : "Aufgabenblatt"}`,
      resourceCategory: "sunday",
      resourceId: resource.id,
      videos,
      videoIndex: 0,
      pdfReady: false
    };
    state.view = "viewer";
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  const resourceViewerButton = event.target.closest("[data-open-resource]");
  if (resourceViewerButton) {
    const resource = state.content.resources.find(item => item.id === resourceViewerButton.dataset.resourceId);
    if (!resource) return;
    rememberViewerOrigin(resourceViewerButton);
    openResource(resource, resourceViewerButton.dataset.viewerType, Number(resourceViewerButton.dataset.page) || 0);
    return;
  }

  const viewerButton = event.target.closest("[data-open-viewer]");
  if (viewerButton) {
    rememberViewerOrigin(viewerButton);
    state.previousView = state.view;
    state.viewer = {
      type: viewerButton.dataset.viewerType,
      url: viewerButton.dataset.viewerUrl,
      title: viewerButton.dataset.viewerTitle
    };
    state.view = "viewer";
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) {
    state.trainingTab = tabButton.dataset.tab;
    writeStored("trainingTab", state.trainingTab);
    state.gradeFilter = "all";
    state.query = "";
    syncViewUrl();
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  const gradeButton = event.target.closest("[data-grade]");
  if (gradeButton) {
    state.gradeFilter = gradeButton.dataset.grade;
    render();
    return;
  }

  const dateFilterButton = event.target.closest("[data-date-filter]");
  if (dateFilterButton) {
    state.dateFilter = dateFilterButton.dataset.dateFilter;
    render();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;

  if (action === "open-playlist-video") {
    const collection = state.content.videoPlaylists.collections[actionButton.dataset.collection];
    const video = collection?.videos.find(item => item.videoId === actionButton.dataset.videoId);
    if (!video) return;
    rememberViewerOrigin(actionButton);
    state.previousView = state.view;
    state.viewer = {type:"video",url:video.url,title:video.title,resourceCategory:actionButton.dataset.collection};
    state.view = "viewer";
    render(); window.scrollTo({top:0,behavior:"auto"});
  } else if (action === "open-journey-video") {
    const video = journeyArchiveVideos().find(item => item.videoId === actionButton.dataset.journeyVideoId)
      || (journeyConfig().nextPublication?.videoId === actionButton.dataset.journeyVideoId ? journeyConfig().nextPublication : null);
    if (!video?.url) return;
    rememberViewerOrigin(actionButton);
    state.previousView = "journey";
    state.viewer = {
      type: "video",
      url: video.url,
      title: `${video.code} · ${video.title}`,
      resourceCategory: "journey"
    };
    state.view = "viewer";
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  } else if (action === "open-about") {
    state.modal = "about";
    render();
  } else if (action === "close-modal") {
    if (actionButton.matches("button") || !event.target.closest("[data-modal-panel]")) {
      state.modal = null;
      render();
    }
  } else if (action === "reset-journey-filters") {
    state.journeySelection = {grades:[],competitions:[]};
    render();
  } else if (action === "close-viewer") {
    const destination = state.previousView || "training";
    state.viewer = null;
    setView(destination, undefined, true);
  } else if (action === "select-video" && state.viewer) {
    state.viewer.videoIndex = Number(actionButton.dataset.videoIndex || 0);
    render();
  } else if (action === "print-document" && state.viewer?.type === "pdf") {
    void requestSystemPrint();
  } else if (action === "save-offline" && state.viewer?.type === "pdf") {
    const viewer = state.viewer;
    viewer.offlineSaving = true;
    render();
    try {
      const { bytes } = await offlineMaterials.save({ url: viewerPdfUrl(viewer), title: viewer.title.replace(/ · Aufgabenblatt$/, "") });
      showToast(`Offline gesichert (${formatBytes(bytes)}). Du findest das Blatt auch unter „Mehr“.`);
    } catch (error) {
      console.warn(error);
      showToast("Das Blatt konnte gerade nicht gesichert werden. Bitte versuche es mit Internet noch einmal.");
    }
    viewer.offlineSaving = false;
    if (state.viewer === viewer) render();
  } else if (action === "share-task") {
    const url = actionButton.dataset.shareUrl;
    const title = actionButton.dataset.shareTitle;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); showToast("Link kopiert. Er öffnet direkt diese Aufgabe."); }
    } catch (error) {
      if (error?.name !== "AbortError") showToast("Der Link konnte nicht geteilt werden.");
    }
  } else if (action === "offline-info") {
    showToast("Dieses Blatt ist offline gesichert. Entfernen kannst du es unter „Mehr“.");
  } else if (action === "open-offline") {
    const entry = offlineMaterials.list().find(item => item.url === actionButton.dataset.offlineUrl);
    if (!entry) return;
    rememberViewerOrigin(actionButton);
    state.previousView = state.view;
    state.viewer = { type: "pdf", url: entry.url, title: `${entry.title} · Aufgabenblatt` };
    state.view = "viewer";
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  } else if (action === "remove-offline") {
    await offlineMaterials.remove(actionButton.dataset.offlineUrl);
    showToast("Das Blatt ist nicht mehr offline gesichert.");
    render();

  } else if (action === "copy-install-link") {
    try { await navigator.clipboard.writeText(actionButton.dataset.link); showToast("Link kopiert. Füge ihn jetzt im Browser oben in die Adresszeile ein."); }
    catch { showToast(`Bitte diese Adresse im Browser eingeben: ${actionButton.dataset.link}`); }
  } else if (action === "install") {
    if (state.installed) {
      showToast("MO-Ni ist auf diesem Gerät bereits installiert.");
    } else if (state.deferredInstall) {
      const installationPrompt = state.deferredInstall;
      await installationPrompt.prompt();
      const choice = await installationPrompt.userChoice.catch(() => ({ outcome: "dismissed" }));
      state.deferredInstall = null;
      window.__moNiDeferredInstallPrompt = null;
      if (choice.outcome === "accepted") state.modal = null;
      showToast(choice.outcome === "accepted" ? "MO-Ni wird installiert." : "Die Installation wurde noch nicht gestartet.");
      render();
    } else {
      state.modal = "install";
      render();
    }
  } else if (action === "activate-update" && state.waitingWorker) {
    if (maybeApplyAppUpdate()) actionButton.setAttribute("disabled", "");
    else showToast(state.gameActive ? "Beende zuerst deine Spielrunde. Danach kann die App aktualisiert werden." : "Deine Nachricht bleibt erhalten. Die App aktualisiert sich, sobald du fertig bist.");
  }
});

document.addEventListener("input", event => {
  if (event.target.matches('[data-role="contact-form"] textarea')) {
    state.contactMessage = event.target.value;
  } else if (event.target.matches('[data-role="resource-search"]')) {
    state.query = event.target.value;
    const position = event.target.selectionStart;
    render();
    const next = document.querySelector('[data-role="resource-search"]');
    next?.focus();
    next?.setSelectionRange(position, position);
  } else if (event.target.matches('[data-role="kangaroo-search"]')) {
    state.kangarooQuery = event.target.value;
    const position = event.target.selectionStart;
    render();
    const next = document.querySelector('[data-role="kangaroo-search"]');
    next?.focus({preventScroll:true}); next?.setSelectionRange(position,position);
  } else if (event.target.matches('[data-role="sunday-search"]')) {
    state.sundayQuery = event.target.value;
    const position = event.target.selectionStart;
    render();
    const next = document.querySelector('[data-role="sunday-search"]');
    next?.focus();
    next?.setSelectionRange(position, position);
  }
});

document.addEventListener("submit", async event => {
  if (event.target.matches('[data-role="contact-form"]')) {
    event.preventDefault();
    const form = new FormData(event.target);
    state.contactMessage = String(form.get("message") || "");
    if (!state.contactMessage.trim()) { document.querySelector("#message")?.focus(); return; }
    window.location.href = contactMailto(state.contactMessage);
    showToast("Schicke die Nachricht jetzt in deinem E-Mail-Programm ab.");
  }
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  state.deferredInstall = event;
  if (state.view === "more" || state.modal === "install") render();
});

window.addEventListener("appinstalled", () => {
  state.installed = true;
  state.deferredInstall = null;
  showToast("MO-Ni wurde erfolgreich installiert.");
  render();
});

window.addEventListener("online", () => {
  state.online = true;
  showToast("Die Internetverbindung ist wieder verfügbar.");
  if (contentCanRender()) render();
  void refreshContent();
});

window.addEventListener("offline", () => {
  state.online = false;
  if (contentCanRender()) render();
});

let pendingAppReload = false;
let appReloading = false;
const appUpdateCoordinator = createAppUpdateCoordinator({
  canActivate: () => document.visibilityState === "visible" && !document.querySelector("dialog[open]") && canActivateAppUpdate(state, document.activeElement)
});

function maybeApplyAppUpdate() {
  if (document.visibilityState !== "visible" || document.querySelector("dialog[open]") || !canActivateAppUpdate(state, document.activeElement)) return false;
  if (pendingAppReload && !appReloading) {
    appReloading = true;
    location.reload();
    return true;
  }
  const activated = appUpdateCoordinator.tryActivate();
  if (activated) state.waitingWorker = null;
  return activated;
}

async function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  const registration = await navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" });
  state.serviceWorkerReady = true;

  const announceUpdate = worker => {
    state.waitingWorker = worker;
    if (appUpdateCoordinator.offer(worker)) state.waitingWorker = null;
  };

  if (registration.waiting) announceUpdate(registration.waiting);
  registration.addEventListener("updatefound", () => {
    const installingWorker = registration.installing;
    installingWorker?.addEventListener("statechange", () => {
      if (installingWorker.state === "installed" && navigator.serviceWorker.controller) announceUpdate(installingWorker);
    });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || appReloading) return;
    // Another open tab can activate the worker while this child is still busy.
    pendingAppReload = true;
    maybeApplyAppUpdate();
  });

  registration.update().catch(() => {});
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") registration.update().catch(() => {});
  });
}

async function loadPuzzlePublications() {
  for (const path of ["./api/puzzle-publications","./sunday-publications.php","./data/sunday-publications.json"]) {
    try { const response=await fetch(path,{cache:"no-store",signal:AbortSignal.timeout(6000)});if(!response.ok)continue;const value=await response.json();if(Array.isArray(value.confirmed))return value; } catch {}
  }
  return {confirmed:[]};
}

async function loadContent() {
  try {
    return { content: {...withAg56Dates(await apiRequest("./api/content", { cache: "no-store" })),puzzlePublications:await loadPuzzlePublications()}, serverMode: true };
  } catch {
    const paths = ["content", "mathe-ag", "mathe-ag-56", "olympiade", "matheplus", "journey", "sunday", "editorial", "video-playlists"];
    const responses = await Promise.all(paths.map(name => fetch(`./data/${name}.json`, { cache: "no-store" })));
    if (responses.some(response => !response.ok)) throw new Error(`Inhaltsdaten: ${responses.map(response => response.status).join("/")}`);
    const [content, archive, archive56, olympiad, mathePlus, journey, sunday, editorial, videoPlaylists] = await Promise.all(responses.map(response => response.json()));
    return {
      content: {
        ...withAg56Dates(content),
        videoPlaylists,
        editorial,
        journey,
        sunday,
        puzzlePublications:await loadPuzzlePublications(),
        resources: [...archive.items, ...archive56.items, ...olympiad.items, ...mathePlus.items, ...content.resources.filter(item => !["mathe-ag", "olympiade", "matheplus"].includes(item.category))],
        matheAgArchive: { count: archive.count + archive56.count, primaryCount: archive.count, grades56Count: archive56.count, grades56CoreCount: archive56.coreCount, grades56EnrichmentCount: archive56.enrichmentCount, nextGrades56Number: archive56.nextNumber, sources: [archive.source, archive56.source], updatedAt: [archive.updatedAt, archive56.updatedAt].sort().at(-1) },
        olympiadArchive: { count: olympiad.count, source: olympiad.source, updatedAt: olympiad.updatedAt },
        mathePlusArchive: { count: mathePlus.count, source: mathePlus.source, updatedAt: mathePlus.updatedAt }
      },
      serverMode: false
    };
  }
}

let contentSignature = "";
let renderedAvailabilitySignature = "";
let pendingContentRender = false;
let pendingContentNotice = false;
let refreshPromise = null;

function contentDataSignature(content) {
  const {puzzlePublications, ...data} = content;
  return JSON.stringify({...data, puzzlePublications: {confirmed: [...new Set(puzzlePublications?.confirmed || [])].sort(), worksheets: (puzzlePublications?.worksheets || []).map(({id,pdf,sha256})=>({id,pdf,sha256})).sort((a,b)=>a.id.localeCompare(b.id))}});
}

function contentCanRender() {
  return !state.gameActive && state.view !== "viewer" && !state.modal && !document.activeElement?.matches("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
}

function applyPendingContent() {
  if (!pendingContentRender || !contentCanRender() || document.visibilityState !== "visible") return;
  const scrollY = window.scrollY;
  const notify = pendingContentNotice;
  render();
  requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
  if (notify) showToast("Neue Inhalte sind verfügbar.");
}

function refreshTimedContent() {
  if (!state.content || document.visibilityState !== "visible") return;
  if (contentAvailabilitySignature(state.content) !== renderedAvailabilitySignature) pendingContentRender = true;
  applyPendingContent();
  refreshTimedCards();
  maybeApplyAppUpdate();
}

function upcomingAgSignature() {
  return (state.content?.resources || []).filter(item => item.category === "mathe-ag" && matchesAudience(item,state.audience)).map(item => upcomingAgDate(item,state.content.dates)).join("|");
}

function refreshTimedCards() {
  if (state.view !== "training" || state.trainingTab !== "mathe-ag" || state.modal || document.visibilityState !== "visible") return;
  const signature = upcomingAgSignature();
  if (signature === state.agDateSignature) return;
  // Update only the dated chips; the child's search cursor and list position stay in place.
  document.querySelectorAll("[data-ag-announcement]").forEach(chip => {
    const item = state.content.resources.find(resource => resource.id === chip.dataset.agAnnouncement);
    const label = upcomingAgDate(item,state.content.dates);
    if (label) chip.textContent = label;
    else {
      const row = chip.parentElement;
      chip.remove();
      if (!row.children.length) row.remove();
    }
  });
  state.agDateSignature = signature;
}

async function refreshContent() {
  if (!state.content || !navigator.onLine || document.visibilityState !== "visible") return;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const result = await loadContent();
      const signature = contentDataSignature(result.content);
      if (signature !== contentSignature) {
        state.content = result.content;
        state.serverMode = result.serverMode;
        contentSignature = signature;
        pendingContentRender = true;
        pendingContentNotice = true;
      }
      refreshTimedContent();
    } catch (error) {
      console.warn("Inhalte konnten noch nicht aktualisiert werden.", error);
    }
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

// Die Angaben für Lehrkräfte sind freiwillig: Fehlt die Datei, bleibt alles wie bisher.
async function loadTeacherNotes() {
  try {
    const response = await fetch("./data/lehrkraefte.json", { cache: "no-store" });
    if (response.ok) state.teacherNotes = await response.json();
  } catch { /* offline ohne gespeicherte Datei */ }
  const resource = requestedMaterial && state.content?.resources.find(item => item.id === requestedMaterial);
  const task = resource && teacherTasks(resource).find(item => String(item.number) === requestedTask);
  if (resource?.pdf) openResource(resource, "pdf", task?.page || 0);
  else if (state.teacherNotes && state.view === "training" && !state.modal) render();
}

async function start() {
  writeStored("audience", state.audience);
  writeStored("trainingTab", state.trainingTab);
  render();
  try {
    const result = await loadContent();
    state.content = result.content;
    usageStatistics.registerContent(state.content);
    state.serverMode = result.serverMode;
    contentSignature = contentDataSignature(result.content);
    syncViewUrl();
    render();
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    await loadTeacherNotes();
    usageStatistics.appStarted();
  } catch (error) {
    console.error(error);
    app.innerHTML = `<div class="loading"><div><h1>Das hat noch nicht geklappt.</h1><p>Bitte lade die App neu oder öffne sie erneut.</p></div></div>`;
  }

  registerPwaServiceWorker().catch(() => {});
  const savedBefore = offlineMaterials.list().length;
  offlineMaterials.reconcile().then(kept => { if (kept.length !== savedBefore) render(); }).catch(() => {});
  document.addEventListener("visibilitychange", () => {
    divisorGame.setVisible(document.visibilityState === "visible" && state.view === "games" && state.selectedGame === "divisors" && !state.modal);
    puzzleGame.setVisible(document.visibilityState === "visible" && state.view === "games" && state.selectedGame === "puzzles" && !state.modal);
    if (document.visibilityState === "visible") { refreshTimedContent(); void refreshContent(); }
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) void refreshContent();
  });
  window.setInterval(() => { void refreshContent(); }, CONTENT_REFRESH_INTERVAL);
  window.setInterval(refreshTimedContent, 60 * 1000);
  document.addEventListener("focusout", () => requestAnimationFrame(() => { applyPendingContent(); maybeApplyAppUpdate(); }));
}

start();
