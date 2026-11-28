// Wann die kleine Leiste „MO-Ni als App holen“ erscheint.
// Grundsatz: Wer die App zum ersten Mal öffnet (z. B. per QR-Code), soll sie zuerst ausprobieren.
// Der Hinweis kommt erst nach einem Erfolgserlebnis (Video, Aufgabenblatt, Spielrunde)
// oder beim Besuch an einem weiteren Tag. „Später“ pausiert ihn eine Woche,
// nach zweimal „Später“ bleibt die Installation nur noch unter „Mehr“ erreichbar.

export const HINT_PAUSE_DAYS = 7;
export const HINT_MAX_DISMISSALS = 2;
const DAY = 24 * 60 * 60 * 1000;

const dayKey = now => new Date(now).toISOString().slice(0, 10);

export function emptyHintRecord() {
  return { visitDays: [], snoozedUntil: 0, dismissals: 0 };
}

export function normalizeHintRecord(value) {
  const record = value && typeof value === "object" ? value : {};
  return {
    visitDays: Array.isArray(record.visitDays) ? record.visitDays.filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day)).slice(-10) : [],
    snoozedUntil: Number.isFinite(record.snoozedUntil) ? record.snoozedUntil : 0,
    dismissals: Number.isInteger(record.dismissals) && record.dismissals > 0 ? record.dismissals : 0
  };
}

// Zählt den heutigen Besuch einmal pro Tag.
export function recordVisit(record, now = Date.now()) {
  const next = normalizeHintRecord(record);
  const today = dayKey(now);
  if (!next.visitDays.includes(today)) next.visitDays = [...next.visitDays, today].slice(-10);
  return next;
}

export function snoozeHint(record, now = Date.now()) {
  const next = normalizeHintRecord(record);
  next.dismissals += 1;
  next.snoozedUntil = now + HINT_PAUSE_DAYS * DAY;
  return next;
}

// Reine Entscheidung, damit sie ohne Browser geprüft werden kann.
export function shouldOfferInstallHint({ installed = false, device = "computer", record, successThisVisit = false, now = Date.now() } = {}) {
  if (installed) return false;
  if (device !== "ios" && device !== "android") return false;
  const current = normalizeHintRecord(record);
  if (current.dismissals >= HINT_MAX_DISMISSALS) return false;
  if (current.snoozedUntil > now) return false;
  return successThisVisit || current.visitDays.length >= 2;
}

// Woher der Aufruf kam. „install=1“ steht auf den gedruckten QR-Codes und öffnet
// kein Fenster mehr; nur ausdrückliche Installationswege öffnen die Anleitung sofort.
export function installEntry(href) {
  let url;
  try { url = new URL(href); } catch { return { openGuide: false, fromQr: false }; }
  const value = url.searchParams.get("install");
  const installerPage = /(?:^|\/)(?:browser-install\.html|mo-ni-grundschul-app-installieren\.html)$/.test(url.pathname)
    || url.searchParams.get("browser-install") === "1";
  return {
    openGuide: value === "now" || (value === "1" && installerPage),
    fromQr: value === "1" && !installerPage
  };
}
