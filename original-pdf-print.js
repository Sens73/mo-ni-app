/** Keep native shells and Apple mobile devices on their existing PDF routes. */
export function shouldUseOriginalPdfPrint(scope = globalThis) {
  const navigator = scope.navigator || {};
  const agent = navigator.userAgent || "";
  const mobile = /iPhone|iPad|iPod/i.test(agent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const plugin = scope.MONiPrint || scope.Capacitor?.Plugins?.MONiPrint;
  return !mobile && typeof plugin?.printPdf !== "function"
    && /Macintosh|Mac OS X/.test(agent)
    && /Version\/[\d.]+.*Safari\//.test(agent)
    && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS|Firefox/i.test(agent);
}

function aborted() {
  const error = new Error("Die PDF-Druckvorbereitung wurde beendet.");
  error.name = "AbortError";
  return error;
}

/** Load the original PDF before the click; retain it until the viewer leaves. */
export function prepareOriginalPdfPrint({ file, scope = globalThis, signal, timeoutMs = 15_000 } = {}) {
  if (signal?.aborted) return Promise.reject(aborted());
  if (!file || file.type !== "application/pdf") return Promise.reject(new Error("Die PDF-Druckansicht konnte nicht vorbereitet werden."));
  const document = scope.document;
  const urlApi = scope.URL || URL;
  const frame = document.createElement("iframe");
  frame.title = "PDF-Druckansicht";
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  // Keep the native PDF plugin in a live frame, outside the visible app.
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  const blobUrl = urlApi.createObjectURL(file);
  return new Promise((resolve, reject) => {
    let settled = false;
    let disposed = false;
    let timer;
    const clearLoadListeners = () => {
      frame.removeEventListener("load", loaded);
      frame.removeEventListener("error", failed);
      if (timer !== undefined) scope.clearTimeout(timer);
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      clearLoadListeners();
      signal?.removeEventListener("abort", dispose);
      frame.remove();
      urlApi.revokeObjectURL(blobUrl);
      if (!settled) {
        settled = true;
        reject(aborted());
      }
    };
    const fail = error => {
      if (settled) return;
      settled = true;
      dispose();
      reject(error);
    };
    const failed = () => fail(new Error("Die PDF-Druckansicht konnte nicht geladen werden."));
    const loaded = () => {
      if (settled) return;
      try {
        if (typeof frame.contentWindow?.print !== "function") throw new Error("Die PDF-Druckansicht ist nicht verfügbar.");
        settled = true;
        clearLoadListeners();
        resolve({ frame, dispose });
      } catch (error) {
        fail(error);
      }
    };
    frame.addEventListener("load", loaded);
    frame.addEventListener("error", failed);
    signal?.addEventListener("abort", dispose, { once: true });
    timer = scope.setTimeout(() => fail(new Error("Die PDF-Druckansicht konnte nicht rechtzeitig geladen werden. Bitte versuche es erneut.")), timeoutMs);
    try {
      frame.src = blobUrl;
      document.body.append(frame);
    } catch (error) {
      fail(error);
    }
  });
}
