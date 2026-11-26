import * as pdfjs from "./assets/vendor/pdfjs/pdf.min.js";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("./assets/vendor/pdfjs/pdf.worker.min.js", import.meta.url).href;

// Unsichtbarer, echter Text über jeder Seite: Sprachausgabe (VoiceOver, TalkBack) liest
// die Aufgabe vor, und man kann Text markieren und mit der Suche finden.
async function addTextLayer(page, sheet, viewport) {
  if (typeof pdfjs.TextLayer !== "function" || typeof page.streamTextContent !== "function") return false;
  const layer = document.createElement("div");
  layer.className = "textLayer pdf-text-layer";
  layer.setAttribute("lang", "de");
  sheet.append(layer);
  try {
    await new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport }).render();
  } catch (error) {
    console.warn("Der Text dieser Seite konnte nicht vorbereitet werden.", error);
    layer.remove();
    return false;
  }
  if (layer.textContent.trim()) return true;
  layer.remove();
  return false;
}

// Die Textebene ist in PDF-Punkten angelegt; sie wächst mit der angezeigten Seitenbreite mit.
function followSheetWidth(sheet, pageWidth) {
  const update = () => {
    const width = sheet.clientWidth;
    if (width) sheet.style.setProperty("--total-scale-factor", String(width / pageWidth));
  };
  update();
  if (typeof ResizeObserver === "function") new ResizeObserver(update).observe(sheet);
}

export async function renderPdfDocument({ url, container, onProgress = () => {} }) {
  if (!container) throw new Error("Die Druckansicht wurde nicht gefunden.");
  container.replaceChildren();
  onProgress("Aufgabenblatt wird geladen …");

  // Ganze Datei statt Teilstücke laden: So funktioniert das Blatt auch aus dem Offline-Speicher,
  // und zum Drucken wird die ganze Datei ohnehin gebraucht.
  const task = pdfjs.getDocument({ url, disableRange: true });
  const pdfDocument = await task.promise;

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    onProgress(`Seite ${pageNumber} von ${pdfDocument.numPages} wird vorbereitet …`);
    const page = await pdfDocument.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const desiredWidth = Math.max(900, Math.min(1300, (container.clientWidth || 420) * Math.min(2, window.devicePixelRatio || 1)));
    const viewport = page.getViewport({ scale: desiredWidth / base.width });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const pageLabel = `Seite ${pageNumber} von ${pdfDocument.numPages}`;
    canvas.setAttribute("aria-label", pageLabel);

    const sheet = document.createElement("figure");
    sheet.className = "pdf-sheet";
    sheet.setAttribute("aria-label", pageLabel);
    sheet.append(canvas);
    container.append(sheet);

    await page.render({ canvasContext: context, viewport }).promise;

    if (await addTextLayer(page, sheet, base)) {
      // Der Text ersetzt für die Sprachausgabe das Seitenbild; sonst bliebe nur „Seite x von y“.
      canvas.setAttribute("aria-hidden", "true");
      canvas.removeAttribute("aria-label");
      followSheetWidth(sheet, base.width);
    }

    // Prepare a decoded PNG while loading, so the print button can still open
    // the browser dialog synchronously and Safari need not print a live canvas.
    const printImage = document.createElement("img");
    printImage.className = "pdf-print-image";
    printImage.alt = "";
    printImage.setAttribute("aria-hidden", "true");
    printImage.src = canvas.toDataURL("image/png");
    sheet.append(printImage);
    await printImage.decode();
  }

  onProgress("");
  return { pages: pdfDocument.numPages };
}
