import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = (await readFile(new URL("../workbook-print.js", import.meta.url), "utf8"))
  .replace(/^import .*;\n/gm, "")
  .replace("export async function prepareWorkbookPrint", "async function prepareWorkbookPrint");

function pilot({ delayedFile = false, failedPreparation = false } = {}) {
  const nodes = [];
  let dialog, print, close, status, resolveFile;
  let disposed = 0, prepared = 0, calls = 0;
  const originalPdf = { frame: {}, dispose() { disposed++; } };
  const document = {
    createElement(tag) {
      const listeners = new Map();
      const node = { tag, removed: false, style: {}, setAttribute() {},
        addEventListener(type, fn) { listeners.set(type, fn); },
        trigger(type) { return listeners.get(type)?.(); },
        remove() { this.removed = true; }, focus() {}, showModal() {},
        close() { this.trigger("close"); }, querySelector(selector) {
          return selector === "[data-print]" ? print : selector === "[data-close]" ? close : status;
        }
      };
      nodes.push(node);
      if (tag === "dialog") {
        dialog = node;
        print = document.createElement("button");
        close = document.createElement("button");
        status = document.createElement("p");
      }
      return node;
    }, body: { append() {} }
  };
  const context = vm.createContext({ document, window: {}, AbortController, URL, console: { error() {}, warn() {} },
    shouldUseOriginalPdfPrint: () => true,
    fetchPdfFile: ({ signal }) => {
      assert.ok(signal, "Closing workbook preparation also aborts the original file download.");
      if (!delayedFile) return Promise.resolve({ type: "application/pdf" });
      return new Promise(resolve => { resolveFile = file => { assert.equal(signal.aborted, true); resolve(file); }; });
    },
    prepareOriginalPdfPrint: async () => {
      prepared++;
      if (failedPreparation) throw new Error("PDF could not load");
      return originalPdf;
    },
    createPrintManager: () => ({ printPdf(options) {
      calls++;
      assert.equal(options.originalPdf, originalPdf);
      return Promise.resolve({ status: "browser-dialog" });
    } })
  });
  vm.runInContext(source, context);
  const pending = context.prepareWorkbookPrint({ pdf: { numPages: 57, getPage() { throw new Error("Safari must retain original vector pages instead of rasterizing the workbook."); } }, url: "workbook.pdf", title: "MO65" });
  return { pending, originalPdf, get dialog() { return dialog; }, get print() { return print; }, get close() { return close; }, get status() { return status; },
    get disposed() { return disposed; }, get prepared() { return prepared; }, get calls() { return calls; }, resolve() { resolveFile({ type: "application/pdf" }); } };
}

const ready = pilot();
await ready.pending;
assert.match(ready.status.textContent, /57 Seiten/);
assert.equal(ready.print.disabled, false);
await ready.print.trigger("click");
await ready.print.trigger("click");
assert.equal(ready.calls, 2, "Cancelling a native preview can be followed by another print.");
assert.equal(ready.disposed, 0, "The PDF remains alive while Safari's dialog lifetime is unknown.");
assert.equal(ready.dialog.removed, false);
await ready.close.trigger("click");
assert.equal(ready.disposed, 1, "Explicitly closing the preparation dialog releases the native PDF.");
assert.equal(ready.dialog.removed, true);

const cancelled = pilot({ delayedFile: true });
await cancelled.close.trigger("click");
cancelled.resolve();
await cancelled.pending;
assert.equal(cancelled.prepared, 0, "An abandoned file fetch must not create a late native print frame.");

const failed = pilot({ failedPreparation: true });
await failed.pending;
assert.notEqual(failed.print.disabled, false, "A preparation failure never enables printing partial content.");
assert.match(failed.status.textContent, /nicht vollständig/);
assert.equal(failed.close.textContent, "Schließen");

console.log("Validated original workbook pages, repeated native print, explicit lifetime, cancellation and readiness errors.");
