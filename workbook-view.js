import "./download-manager.js?v=0.14.0-release-2";
import { prepareWorkbookPrint } from "./workbook-print.js?v=0.14.0-release-2";
import * as pdfjs from "./assets/vendor/pdfjs/pdf.min.js";
import { usageStatistics } from "./usage-statistics.js?v=0.14.0-release-2";
pdfjs.GlobalWorkerOptions.workerSrc = new URL("./assets/vendor/pdfjs/pdf.worker.min.js", import.meta.url).href;

const status = document.querySelector("#reader-status");
const canvas = document.querySelector("#reader-canvas");
const sheet = document.querySelector("#reader-sheet");
const links = document.querySelector("#reader-links");
const pageInput = document.querySelector("#reader-page");
const previous = document.querySelector("#reader-previous");
const next = document.querySelector("#reader-next");
let documentPdf;
let pageNumber = 1;
let renderTask;
let renderSequence = 0;
let currentPage;

function syncControls() {
  pageInput.value = String(pageNumber);
  previous.disabled = pageNumber <= 1;
  next.disabled = pageNumber >= documentPdf.numPages;
}

async function followDestination(destination) {
  try {
    const resolved = typeof destination === "string" ? await documentPdf.getDestination(destination) : destination;
    if (!resolved) return;
    const index = typeof resolved[0] === "number" ? resolved[0] : await documentPdf.getPageIndex(resolved[0]);
    await showPage(index + 1);
  } catch { status.textContent = "Diese Verknüpfung konnte nicht geöffnet werden."; }
}

function drawLinks(annotations, viewport) {
  links.replaceChildren();
  for (const annotation of annotations) {
    if (annotation.subtype !== "Link" || !annotation.rect || (!annotation.url && !annotation.dest)) continue;
    const link = document.createElement("a");
    if (annotation.url) {
      const url = new URL(annotation.url, location.href);
      if (!["https:", "http:"].includes(url.protocol)) continue;
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-label", `Verknüpfung öffnen: ${url.href}`);
      link.addEventListener("click", () => usageStatistics.trackVideo("video_open", url.href));
    } else {
      link.href = "#";
      link.setAttribute("aria-label", "Zur verknüpften Seite");
      link.addEventListener("click", event => { event.preventDefault(); followDestination(annotation.dest); });
    }
    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(annotation.rect);
    Object.assign(link.style, {
      left: `${100 * Math.min(x1, x2) / viewport.width}%`,
      top: `${100 * Math.min(y1, y2) / viewport.height}%`,
      width: `${100 * Math.abs(x2 - x1) / viewport.width}%`,
      height: `${100 * Math.abs(y2 - y1) / viewport.height}%`
    });
    links.append(link);
  }
}

async function showPage(requestedPage, scroll = true) {
  if (!documentPdf) return;
  const number = Number(requestedPage);
  if (!Number.isInteger(number) || number < 1 || number > documentPdf.numPages) { syncControls(); return; }
  const sequence = ++renderSequence;
  pageNumber = number;
  syncControls();
  status.textContent = `Seite ${number} wird geladen …`;
  links.replaceChildren();
  if (renderTask) {
    const previousTask = renderTask;
    previousTask.cancel();
    try { await previousTask.promise; } catch { /* A newer page replaces this render. */ }
  }
  if (sequence !== renderSequence) return;
  try {
    const page = await documentPdf.getPage(number);
    if (sequence !== renderSequence) return;
    const base = page.getViewport({ scale: 1 });
    const width = sheet.parentElement.clientWidth - 24;
    const pixelWidth = Math.min(1800, Math.max(700, width * Math.min(2, window.devicePixelRatio || 1)));
    const viewport = page.getViewport({ scale: pixelWidth / base.width });
    if (currentPage && currentPage !== page) currentPage.cleanup();
    currentPage = page;
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.hidden = false;
    canvas.setAttribute("aria-label", `Seite ${number} von ${documentPdf.numPages}`);
    renderTask = page.render({ canvasContext: canvas.getContext("2d", { alpha: false }), viewport });
    await renderTask.promise;
    if (sequence !== renderSequence) return;
    renderTask = null;
    const annotations = await page.getAnnotations({ intent: "display" });
    if (sequence !== renderSequence) return;
    drawLinks(annotations, viewport);
    status.textContent = "";
    if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
  } catch (error) {
    if (sequence !== renderSequence || error.name === "RenderingCancelledException") return;
    console.error(error);
    status.textContent = "Diese Seite konnte nicht geladen werden. Bitte wähle die Seite erneut oder lade das Heft herunter.";
  }
}

previous.addEventListener("click", () => showPage(pageNumber - 1));
next.addEventListener("click", () => showPage(pageNumber + 1));
pageInput.addEventListener("change", () => showPage(pageInput.value));
document.querySelector("#reader-page-form").addEventListener("submit", event => { event.preventDefault(); showPage(pageInput.value); pageInput.blur(); });

async function start() {
  try {
    const response = await fetch("./data/content.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { workbooks } = await response.json();
    usageStatistics.registerContent({workbooks});
    const url = new URL(workbooks.pdfUrl, location.href);
    if (url.origin !== location.origin) throw new Error("Invalid workbook URL");
    document.querySelector("#reader-title").textContent = workbooks.announcementTitle;
    const download = document.querySelector("#reader-download");
    download.dataset.downloadUrl = url.href;
    download.dataset.downloadName = workbooks.fileName;
    download.hidden = false;
    documentPdf = await pdfjs.getDocument({ url: url.href }).promise;
    usageStatistics.trackPdf("pdf_open", url.href);
    document.querySelector("#reader-count").textContent = `von ${documentPdf.numPages}`;
    pageInput.max = String(documentPdf.numPages);
    pageInput.disabled = false;
    const print = document.querySelector("#reader-print");
    print.disabled = false;
    print.addEventListener("click", () => prepareWorkbookPrint({ pdf: documentPdf, url: url.href, title: workbooks.announcementTitle }));
    await showPage(1, false);
  } catch (error) {
    console.error(error);
    status.textContent = "Das Arbeitsheft konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und öffne es erneut.";
  }
}
start();
