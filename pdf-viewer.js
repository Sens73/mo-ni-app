import * as pdfjs from "./assets/vendor/pdfjs/pdf.min.js";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("./assets/vendor/pdfjs/pdf.worker.min.js", import.meta.url).href;

export async function renderPdfDocument({ url, container, onProgress = () => {} }) {
  if (!container) throw new Error("Die Druckansicht wurde nicht gefunden.");
  container.replaceChildren();
  onProgress("Aufgabenblatt wird geladen …");

  const task = pdfjs.getDocument({ url });
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
    canvas.setAttribute("aria-label", `Seite ${pageNumber} von ${pdfDocument.numPages}`);

    const sheet = document.createElement("figure");
    sheet.className = "pdf-sheet";
    sheet.append(canvas);
    container.append(sheet);

    await page.render({ canvasContext: context, viewport }).promise;

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
