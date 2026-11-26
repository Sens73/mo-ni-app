const DEFAULT_CONFIRMATION_DELAY = 900;

function wait(milliseconds, schedule = setTimeout) {
  return new Promise(resolve => schedule(resolve, milliseconds));
}

function nativePrintPlugin(scope) {
  const directPlugin = scope?.MONiPrint;
  const capacitorPlugin = scope?.Capacitor?.Plugins?.MONiPrint;
  const plugin = directPlugin || capacitorPlugin;
  return plugin && typeof plugin.printPdf === "function" ? plugin : null;
}

function canOpenApplePrintMenu(file, navigator) {
  const appleMobile = /iPhone|iPad|iPod/i.test(navigator?.userAgent || "")
    || (navigator?.platform === "MacIntel" && navigator?.maxTouchPoints > 1);
  return appleMobile
    && file
    && typeof navigator?.share === "function"
    && navigator.canShare?.({ files: [file] }) === true;
}

/** Match the workbook's isolated print tree without copying canvas pixels. */
function isolateBrowserPdf(scope) {
  const document = scope?.document;
  const surface = document?.querySelector?.(".pdf-print-surface");
  const parent = surface?.parentNode;
  const body = document?.body;
  if (!surface || !parent || !body || parent === body) return () => {};

  const placeholder = document.createComment("MO-Ni PDF print position");
  parent.insertBefore(placeholder, surface);
  body.append(surface);
  body.classList.add("pdf-document-printing");
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    if (placeholder.parentNode) placeholder.parentNode.replaceChild(surface, placeholder);
    else surface.remove();
    body.classList.remove("pdf-document-printing");
  };
}

/**
 * Starts printing from the original button event. Native app shells receive the
 * PDF itself; regular browsers print the already rendered PDF pages.
 */
export function createPrintManager({
  scope = globalThis,
  confirmationDelay = DEFAULT_CONFIRMATION_DELAY,
  schedule = setTimeout
} = {}) {
  return {
    async printPdf({ url, title, file, originalPdf }) {
      const plugin = nativePrintPlugin(scope);
      if (plugin) {
        try {
          await plugin.printPdf({ url, title });
          return { status: "native-dialog" };
        } catch (error) {
          return { status: "error", message: error?.message || "Der native Druckdialog konnte nicht geöffnet werden." };
        }
      }

      if (canOpenApplePrintMenu(file, scope?.navigator)) {
        try {
          await scope.navigator.share({ files: [file], title });
          return { status: "apple-print-menu" };
        } catch (error) {
          if (error?.name === "AbortError") return { status: "cancelled" };
          return { status: "error", message: error?.message || "Das iPhone-Druckmenü konnte nicht geöffnet werden." };
        }
      }

      if (originalPdf) {
        const previousFocus = scope.document?.activeElement;
        try {
          const frame = originalPdf.frame;
          const target = frame?.contentWindow;
          if (!frame?.isConnected || typeof target?.print !== "function") throw new Error("Die PDF-Druckansicht ist nicht mehr verfügbar. Bitte öffne das Aufgabenblatt erneut.");
          target.focus?.();
          // PDFKit prints its original pages and may emit no HTML print events.
          target.print();
          return { status: "browser-dialog" };
        } catch (error) {
          return { status: "error", message: error?.message || "Der PDF-Druckdialog konnte nicht geöffnet werden." };
        } finally {
          if (previousFocus?.isConnected !== false) {
            try { previousFocus?.focus?.({ preventScroll: true }); } catch { /* Focus must not change the print result. */ }
          }
        }
      }

      if (typeof scope?.print !== "function") {
        return { status: "unsupported" };
      }

      let printEventSeen = false;
      let printActive = false;
      let restoreSurface = () => {};
      const printMedia = typeof scope.matchMedia === "function" ? scope.matchMedia("print") : null;
      const removePrintListeners = () => {
        scope.removeEventListener?.("beforeprint", markPrintEvent);
        scope.removeEventListener?.("afterprint", finishPrint);
        printMedia?.removeEventListener?.("change", markPrintMedia);
      };
      const markPrintEvent = () => { printEventSeen = true; printActive = true; };
      const finishPrint = () => {
        printEventSeen = true;
        printActive = false;
        restoreSurface();
        removePrintListeners();
      };
      const markPrintMedia = event => {
        if (event.matches) markPrintEvent();
        else {
          printActive = false;
          restoreSurface();
          removePrintListeners();
        }
      };

      scope.addEventListener?.("beforeprint", markPrintEvent, { once: true });
      scope.addEventListener?.("afterprint", finishPrint, { once: true });
      printMedia?.addEventListener?.("change", markPrintMedia);

      try {
        restoreSurface = isolateBrowserPdf(scope);
        scope.focus?.();
        // Keep this call synchronous: browsers may reject delayed print calls.
        scope.print();
      } catch (error) {
        restoreSurface();
        removePrintListeners();
        return { status: "error", message: error?.message || "Der Druckdialog konnte nicht geöffnet werden." };
      }

      await wait(confirmationDelay, schedule);
      const confirmed = printEventSeen || printMedia?.matches === true;
      // Nonblocking dialogs can stay open longer than the confirmation timer.
      if (!printActive && printMedia?.matches !== true) {
        restoreSurface();
        removePrintListeners();
      }
      return { status: confirmed ? "browser-dialog" : "browser-unconfirmed" };
    }
  };
}
