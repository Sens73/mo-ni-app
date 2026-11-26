import { fetchPdfFile } from "./download-manager.js?v=0.14.0-release-2";
import { createPrintManager } from "./print-manager.js?v=0.14.0-release-2";
import { prepareOriginalPdfPrint, shouldUseOriginalPdfPrint } from "./original-pdf-print.js?v=0.14.0-release-2";

/** Prepare the whole workbook on demand, preserving every page's orientation. */
export async function prepareWorkbookPrint({ pdf, url, title }) {
  const dialog = document.createElement("dialog");
  dialog.className = "pdf-action-dialog";
  dialog.setAttribute("aria-labelledby", "workbook-print-title");
  dialog.innerHTML = `<h2 id="workbook-print-title">Arbeitsheft drucken</h2><p class="pdf-action-status" role="status" aria-live="polite">Das vollständige Heft wird vorbereitet …</p><div class="pdf-action-buttons"><button class="secondary-button" type="button" data-print disabled>Drucken</button><button class="soft-button" type="button" data-close>Abbrechen</button></div>`;
  const status = dialog.querySelector(".pdf-action-status");
  const print = dialog.querySelector("[data-print]");
  const close = dialog.querySelector("[data-close]");
  const surface = document.createElement("section");
  surface.className = "workbook-print-surface";
  const urls = [];
  let cancelled = false;
  let currentRender;
  let ready = false;
  let printFile = null;
  let originalPdf = null;
  const printPreparation = new AbortController();
  function cleanUp() {
    cancelled = true;
    printPreparation.abort();
    originalPdf?.dispose();
    currentRender?.cancel();
    surface.remove();
    urls.forEach(value => URL.revokeObjectURL(value));
    dialog.remove();
  }
  dialog.addEventListener("close", cleanUp);
  close.addEventListener("click", () => dialog.close());
  document.body.append(surface, dialog);
  dialog.showModal();
  const manager = createPrintManager({ scope: window });
  print.addEventListener("click", async () => {
    if (!ready) return;
    print.disabled = true;
    const result = await manager.printPdf({ url, title, file: printFile, originalPdf });
    print.disabled = false;
    if (["native-dialog", "browser-dialog", "apple-print-menu", "cancelled"].includes(result.status)) {
      // Safari's PDF plugin has no reliable afterprint event. Keep its PDF
      // alive until the user closes this preparation dialog after printing.
      if (!originalPdf) dialog.close();
    }
    else {
      status.textContent = result.message || "Der Druckdialog konnte in diesem Browser nicht geöffnet werden. Bitte öffne die App in Chrome oder Safari und versuche es dort erneut.";
      close.textContent = "Schließen";
    }
  });
  const canvas = document.createElement("canvas");
  try {
    if (shouldUseOriginalPdfPrint(window)) {
      printFile = await fetchPdfFile({ url, fileName: `${title}.pdf`, signal: printPreparation.signal });
      if (cancelled) return;
      originalPdf = await prepareOriginalPdfPrint({ file: printFile, scope: window, signal: printPreparation.signal });
      if (cancelled) { originalPdf.dispose(); return; }
      ready = true;
      status.textContent = `Das vollständige Arbeitsheft mit ${pdf.numPages} Seiten ist druckbereit.`;
      print.disabled = false;
      close.textContent = "Schließen";
      print.focus();
      return;
    }
    for (let number = 1; number <= pdf.numPages; number++) {
      if (cancelled) return;
      status.textContent = `Druckseite ${number} von ${pdf.numPages} wird vorbereitet …`;
      const page = await pdf.getPage(number);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 150 / 72 });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      currentRender = page.render({ canvasContext: canvas.getContext("2d", { alpha: false }), viewport, intent: "print" });
      await currentRender.promise;
      currentRender = null;
      if (cancelled) return;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (cancelled) return;
      if (!blob) throw new Error("Die Druckseite konnte nicht vorbereitet werden.");
      const source = URL.createObjectURL(blob);
      urls.push(source);
      const image = document.createElement("img");
      image.src = source;
      image.alt = `Druckseite ${number}`;
      const figure = document.createElement("figure");
      figure.className = `reader-print-page${viewport.width > viewport.height ? " landscape" : ""}`;
      figure.append(image);
      surface.append(figure);
      await image.decode();
      // Reuse one canvas, keeping the reading view small until printing is requested.
      canvas.width = canvas.height = 1;
    }
    if (cancelled) return;
    try {
      printFile = await fetchPdfFile({ url, fileName: `${title}.pdf` });
    } catch (error) {
      console.warn("Das Arbeitsheft konnte nicht für das mobile Druckmenü vorbereitet werden.", error);
    }
    ready = true;
    status.textContent = `Das vollständige Arbeitsheft mit ${pdf.numPages} Seiten ist druckbereit.`;
    print.disabled = false;
    close.textContent = "Schließen";
    print.focus();
  } catch (error) {
    if (cancelled || error.name === "RenderingCancelledException") return;
    console.error(error);
    status.textContent = "Das Heft konnte nicht vollständig zum Drucken vorbereitet werden. Bitte schließe dieses Fenster und versuche es erneut.";
    close.textContent = "Schließen";
  } finally {
    canvas.width = canvas.height = 1;
  }
}
