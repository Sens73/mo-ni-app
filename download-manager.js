/** Keep PDF saves inside the app instead of navigating the current window. */
export function isAppleMobile(navigator) {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function canSaveWithShare(file, navigator) {
  return isAppleMobile(navigator) && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] }) === true;
}

export async function fetchPdfFile({ url, fileName, signal } = {}) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  const signature = await blob.slice(0, 5).text();
  if (signature !== "%PDF-") throw new Error("Invalid PDF");
  return new File([blob], String(fileName || "MO-Ni-Material.pdf").replace(/[\\/]/g, "-"), { type: "application/pdf" });
}

export async function savePreparedPdf(file, { navigator = globalThis.navigator, document = globalThis.document, urlApi = URL, schedule = setTimeout } = {}) {
  if (canSaveWithShare(file, navigator)) {
    // Must be invoked directly by the save button: iOS requires a fresh gesture.
    await navigator.share({ files: [file], title: file.name });
    return "shared";
  }
  // A download frame protects the current app even if a browser previews files.
  const frame = document.createElement("iframe");
  frame.name = `pdf-download-${Date.now()}`;
  frame.hidden = true;
  frame.setAttribute("aria-hidden", "true");
  const blobUrl = urlApi.createObjectURL(new Blob([file], { type: "application/octet-stream" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = file.name;
  link.target = frame.name;
  link.hidden = true;
  document.body.append(frame, link);
  link.click();
  link.remove();
  schedule(() => { urlApi.revokeObjectURL(blobUrl); frame.remove(); }, 60_000);
  return "download-started";
}

export async function downloadPdf({ url, fileName }) {
  const dialog = document.createElement("dialog");
  dialog.className = "pdf-action-dialog";
  dialog.setAttribute("aria-labelledby", "pdf-download-title");
  dialog.innerHTML = `<h2 id="pdf-download-title">PDF herunterladen</h2><p class="pdf-action-status" role="status" aria-live="polite">Die Datei wird vorbereitet …</p><div class="pdf-action-buttons"><button class="secondary-button" type="button" data-save hidden>Datei speichern</button><button class="soft-button" type="button" data-close>Schließen</button></div>`;
  const status = dialog.querySelector(".pdf-action-status");
  const save = dialog.querySelector("[data-save]");
  const controller = new AbortController();
  let file;
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { controller.abort(); dialog.remove(); file = null; });
  document.body.append(dialog);
  dialog.showModal();
  async function saveFile() {
    if (!file) return;
    save.disabled = true;
    try {
      await savePreparedPdf(file);
      if (typeof CustomEvent === "function") document.dispatchEvent?.(new CustomEvent("moni-pdf-saved", { detail: { url } }));
      dialog.close();
    } catch (error) {
      save.disabled = false;
      if (error.name !== "AbortError") status.textContent = "Die Datei konnte nicht gespeichert werden. Bitte versuche es erneut.";
    }
  }
  save.addEventListener("click", saveFile);
  try {
    file = await fetchPdfFile({ url, fileName, signal: controller.signal });
    if (controller.signal.aborted) return;
    if (canSaveWithShare(file, navigator)) {
      status.textContent = "Die PDF ist bereit. Tippe auf „Datei speichern“ und wähle „In Dateien sichern“.";
      save.hidden = false;
      save.focus();
    } else {
      await saveFile();
    }
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error(error);
    status.textContent = "Die PDF konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und versuche es erneut.";
  }
}

if (typeof document !== "undefined") document.addEventListener("click", event => {
  const button = event.target.closest("[data-pdf-download]");
  if (!button) return;
  event.preventDefault();
  downloadPdf({ url: button.dataset.downloadUrl, fileName: button.dataset.downloadName });
});
