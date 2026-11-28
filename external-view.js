import { prepareMaterialLink } from "./material-links.js?v=0.14.0-release-2";
import { fetchPdfFile } from "./download-manager.js?v=0.14.0-release-2";
import { renderPdfDocument } from "./pdf-viewer.js?v=0.14.0-release-6";
import { createPrintManager } from "./print-manager.js?v=0.14.0-release-2";
import { usageStatistics } from "./usage-statistics.js?v=0.14.0-release-6";
import { statisticsEmbedUrl, observeVideo } from "./video-statistics.js?v=0.14.0-release-6";

const parameters = new URLSearchParams(location.search);
const type = parameters.get("type") || "web";
const title = parameters.get("title") || "MO-Ni-Material";
const suppliedUrl = parameters.get("url") || "";
const suppliedReturnUrl = parameters.get("return") || "./";
const content = document.querySelector("#external-content");
const status = document.querySelector("#external-status");
const printButton = document.querySelector("#external-print");
const downloadLink = document.querySelector("#external-download");
let pdfReady = false;
let printFile = null;
const printManager = createPrintManager({ scope: window });

document.querySelector("#external-title").textContent = title;
document.title = `${title} – MO-Ni`;

function safeUrl(value) {
  try {
    const parsed = new URL(value, location.href);
    const allowedHosts = new Set([location.hostname, "www.mo-ni.de", "mo-ni.de", "youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com"]);
    return ["http:", "https:"].includes(parsed.protocol) && allowedHosts.has(parsed.hostname) ? parsed.href : "";
  } catch {
    return "";
  }
}

function youtubeEmbedUrl(value) {
  const parsed = new URL(value);
  const id = parsed.hostname === "youtu.be"
    ? parsed.pathname.slice(1)
    : parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
  return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : "";
}

function returnToApp() {
  const parsedReturnUrl = new URL(suppliedReturnUrl, location.href);
  const returnUrl = parsedReturnUrl.origin === location.origin ? parsedReturnUrl.href : new URL("./", location.href).href;
  if (window.opener && !window.opener.closed) {
    window.opener.focus();
    window.close();
    setTimeout(() => { location.href = returnUrl; }, 150);
    return;
  }
  location.href = returnUrl;
}

document.querySelector("#return-to-app").addEventListener("click", returnToApp);
printButton.addEventListener("click", async () => {
  if (!pdfReady) {
    status.hidden = false;
    status.textContent = "Bitte warte, bis alle Seiten druckbereit sind.";
    return;
  }
  printButton.disabled = true;
  printButton.setAttribute("aria-busy", "true");
  status.textContent = "";
  status.hidden = true;
  const result = await printManager.printPdf({ url, title, file: printFile });
  printButton.disabled = false;
  printButton.removeAttribute("aria-busy");
  if (["native-dialog", "browser-dialog", "apple-print-menu", "cancelled"].includes(result.status)) {
    status.textContent = "";
    status.hidden = true;
  } else if (result.status === "browser-unconfirmed" || result.status === "unsupported") {
    status.hidden = false;
    status.textContent = "In dieser Vorschau kann kein Druckdialog geöffnet werden. Öffne die App in Chrome oder Safari und versuche es dort erneut.";
  } else {
    status.hidden = false;
    status.textContent = result.message || "Der System-Druckdialog konnte nicht geöffnet werden.";
  }
});

const materialLink = type === "web" ? prepareMaterialLink(suppliedUrl) : null;
const url = type === "web" ? materialLink?.href || "" : safeUrl(suppliedUrl);
if (!url) {
  status.textContent = "Dieses Material konnte nicht sicher geöffnet werden.";
} else if (type === "pdf") {
  content.className = "pdf-pages pdf-print-surface";
  printButton.hidden = false;
  downloadLink.hidden = false;
  downloadLink.dataset.downloadUrl = `${url}${url.includes("?") ? "&" : "?"}download=1`;
  downloadLink.dataset.downloadName = `${title.replace(/[^a-z0-9äöüß-]+/gi, "-")}.pdf`;
  renderPdfDocument({ url, container: content, onProgress: message => { status.textContent = message; status.hidden = !message; } })
    .then(async () => {
      usageStatistics.trackPdf("pdf_open", url);
      try {
        printFile = await fetchPdfFile({ url, fileName: `${title}.pdf` });
      } catch (error) {
        console.warn("Die PDF konnte nicht für das mobile Druckmenü vorbereitet werden.", error);
      }
      pdfReady = true;
      status.hidden = true;
    })
    .catch(error => {
      console.error(error);
      status.hidden = false;
      status.textContent = "Das Aufgabenblatt konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und versuche es erneut.";
    });
} else if (type === "video") {
  const frame = document.createElement("iframe");
  frame.className = "external-video-frame";
  frame.src = statisticsEmbedUrl(youtubeEmbedUrl(url));
  frame.title = title;
  frame.allow = "fullscreen; encrypted-media; picture-in-picture";
  frame.allowFullscreen = true;
  content.append(frame);
  const stopObserving = observeVideo(frame, url, {});
  window.addEventListener("pagehide", stopObserving, { once: true });
  status.textContent = "";
  status.hidden = true;
} else {
  const card = document.createElement("div");
  card.className = "external-preview";
  const heading = document.createElement("h2");
  heading.textContent = title;
  const copy = document.createElement("p");
  copy.textContent = "Die Website wird in einem neuen Tab geöffnet.";
  const link = document.createElement("a");
  link.className = "secondary-button";
  link.href = url;
  link.target = "_blank";
  link.rel = materialLink.rel;
  link.setAttribute("aria-label",materialLink.ariaLabel);
  link.textContent = materialLink.label;
  card.append(heading, copy, link);
  content.append(card);
  status.textContent = "";
  status.hidden = true;
}
