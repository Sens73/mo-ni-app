const MO_NI_HOSTS = new Set(["mo-ni.de", "www.mo-ni.de"]);
const KANGAROO_HOSTS = new Set(["mathe-kaenguru.de", "www.mathe-kaenguru.de"]);

function linkLabel(url) {
  if (KANGAROO_HOSTS.has(url.hostname)) {
    return /^\/chronik\/aufgaben(?:\/|$)/.test(url.pathname)
      ? "Känguru-Aufgabenarchiv öffnen"
      : "Känguru-Website öffnen";
  }
  if (/^\/jagtmrx\/olympiadeaufgaben(?:\/|$)/.test(url.pathname)) return "Olympiade-Aufgaben öffnen";
  if (/^\/matheplus(?:\/|$)/.test(url.pathname)) return "MathePlus-Seite öffnen";
  if (/^\/mathe-ag-grundschule(?:\/|$)/.test(url.pathname)) return "Mathe-AG-Seite öffnen";
  return "MO-Ni-Website öffnen";
}

/** Prepare a direct link to a known public website, independently of the material viewer. */
export function prepareMaterialLink(value) {
  if (typeof value !== "string") return null;
  const suppliedUrl = value.trim();
  if (!suppliedUrl || /[\u0000-\u001f\u007f\\]/.test(suppliedUrl)) return null;
  try {
    const url = new URL(suppliedUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!MO_NI_HOSTS.has(url.hostname) && !KANGAROO_HOSTS.has(url.hostname)) return null;
    if (url.username || url.password || url.port) return null;
    const label = linkLabel(url);
    return {
      href: url.href,
      label,
      ariaLabel: `${label} (öffnet in einem neuen Tab)`,
      target: "_blank",
      rel: "noopener noreferrer"
    };
  } catch {
    return null;
  }
}
