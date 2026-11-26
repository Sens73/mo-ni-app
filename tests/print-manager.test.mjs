import assert from "node:assert/strict";
import { createPrintManager } from "../print-manager.js";

function browserScope({ confirm = false, fail = false } = {}) {
  const listeners = new Map();
  return {
    printCalls: 0,
    focusCalls: 0,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    emit(type) { listeners.get(type)?.(); },
    focus() { this.focusCalls += 1; },
    matchMedia() { return { addEventListener() {}, removeEventListener() {} }; },
    print() {
      this.printCalls += 1;
      if (fail) throw new Error("PRINT_BLOCKED");
      if (confirm) listeners.get("beforeprint")?.();
    }
  };
}

const immediateSchedule = callback => callback();

class DomNode {
  constructor(name) { this.name = name; this.children = []; this.parentNode = null; }
  append(child) { child.remove(); this.children.push(child); child.parentNode = this; }
  insertBefore(child, reference) {
    child.remove();
    const index = this.children.indexOf(reference);
    assert.ok(index >= 0);
    this.children.splice(index, 0, child);
    child.parentNode = this;
  }
  replaceChild(child, reference) {
    child.remove();
    const index = this.children.indexOf(reference);
    assert.ok(index >= 0);
    this.children.splice(index, 1, child);
    child.parentNode = this;
    reference.parentNode = null;
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
    this.parentNode = null;
  }
}

function pdfDom() {
  const body = new DomNode("body");
  const app = new DomNode("app");
  const parent = new DomNode("pdf-viewer");
  const before = new DomNode("status");
  const surface = new DomNode("pdf-print-surface");
  const sheet = new DomNode("sheet");
  const canvas = new DomNode("canvas");
  const after = new DomNode("after");
  canvas.pixels = "the rendered worksheet";
  canvas.cloneNode = () => { throw new Error("Cloning a canvas would lose its pixels."); };
  body.append(app); app.append(parent);
  parent.append(before); parent.append(surface); parent.append(after);
  surface.append(sheet); sheet.append(canvas);
  const classes = new Set();
  body.classList = { add: value => classes.add(value), remove: value => classes.delete(value) };
  return {
    body, parent, surface, sheet, canvas, before, after, classes,
    document: {
      body,
      querySelector: selector => selector === ".pdf-print-surface" ? surface : null,
      createComment: () => new DomNode("placeholder")
    }
  };
}

for (const outcome of ["afterprint", "unconfirmed", "blocked"]) {
  const dom = pdfDom();
  const scope = browserScope({ confirm: outcome === "afterprint", fail: outcome === "blocked" });
  scope.document = dom.document;
  const browserPrint = scope.print.bind(scope);
  scope.print = () => {
    assert.equal(dom.surface.parentNode, dom.body, "The live print surface is isolated directly under body before print().");
    assert.equal(dom.surface.children[0].children[0], dom.canvas, "The original rendered canvas is retained, not copied.");
    assert.equal(dom.canvas.pixels, "the rendered worksheet");
    assert.equal(dom.classes.has("pdf-document-printing"), true);
    browserPrint();
    if (outcome === "afterprint") {
      scope.emit("afterprint");
      assert.equal(dom.surface.parentNode, dom.parent, "Closing the system print dialog restores the viewer immediately.");
    }
  };
  const manager = createPrintManager({ scope, confirmationDelay: 0, schedule: immediateSchedule });
  const pending = manager.printPdf({ url: "https://example.test/blatt.pdf", title: "Worksheet" });
  assert.equal(scope.printCalls, 1, "DOM isolation preserves the original synchronous print gesture.");
  const result = await pending;
  assert.equal(result.status, outcome === "blocked" ? "error" : outcome === "afterprint" ? "browser-dialog" : "browser-unconfirmed");
  assert.deepEqual(dom.parent.children, [dom.before, dom.surface, dom.after], "The exact reading position is restored, including on failure.");
  assert.equal(dom.classes.has("pdf-document-printing"), false);
  assert.equal(dom.body.children.length, 1, "No duplicate print tree remains after printing.");
}

for (const closingEvent of ["afterprint", "media-end"]) {
  const dom = pdfDom();
  const scope = browserScope();
  let timer;
  let mediaChange;
  const media = {
    matches: false,
    addEventListener(type, handler) { mediaChange = handler; },
    removeEventListener(type, handler) { if (mediaChange === handler) mediaChange = null; }
  };
  scope.document = dom.document;
  scope.matchMedia = () => media;
  scope.print = () => {
    scope.printCalls += 1;
    scope.emit("beforeprint");
    media.matches = true;
    mediaChange({ matches: true });
    // The system dialog stays open although the JavaScript print call returns.
  };
  const manager = createPrintManager({ scope, schedule: callback => { timer = callback; } });
  const pending = manager.printPdf({ title: "Nonblocking print preview" });
  assert.equal(scope.printCalls, 1);
  timer();
  assert.equal((await pending).status, "browser-dialog");
  assert.equal(dom.surface.parentNode, dom.body,
    "The confirmation timer must not remove the print tree while the system dialog is still active.");
  assert.equal(dom.classes.has("pdf-document-printing"), true);
  if (closingEvent === "afterprint") scope.emit("afterprint");
  else {
    media.matches = false;
    assert.equal(typeof mediaChange, "function", "The print-mode listener stays alive after confirmation.");
    mediaChange({ matches: false });
  }
  assert.deepEqual(dom.parent.children, [dom.before, dom.surface, dom.after],
    "Closing the nonblocking preview restores the original canvas and viewer position.");
  assert.equal(dom.classes.has("pdf-document-printing"), false);
  assert.equal(mediaChange, null, "Lifecycle listeners are released after the dialog closes.");
}

{
  const scope = browserScope({ confirm: true });
  const body = new DomNode("body");
  const workbook = new DomNode("workbook-print-surface");
  body.append(workbook);
  body.classList = { add() { throw new Error("Workbook printing must keep its existing CSS route."); } };
  scope.document = { body, querySelector: () => null, createComment: () => { throw new Error("Workbook already has its own print tree."); } };
  const manager = createPrintManager({ scope, confirmationDelay: 0, schedule: immediateSchedule });
  assert.equal((await manager.printPdf({ title: "57-page workbook" })).status, "browser-dialog");
  assert.deepEqual(body.children, [workbook], "The workbook route retains its existing print tree.");
}

{
  const scope = browserScope({ confirm: true });
  const manager = createPrintManager({ scope, confirmationDelay: 0, schedule: immediateSchedule });
  const pending = manager.printPdf({ url: "https://example.test/blatt.pdf", title: "Mathe-AG 115" });
  assert.equal(scope.printCalls, 1, "The browser print call must happen synchronously in the click turn.");
  assert.equal((await pending).status, "browser-dialog");
}

{
  let prints = 0;
  let focuses = 0;
  let restored = 0;
  const originalPdf = {
    frame: { isConnected: true, contentWindow: { focus() { focuses += 1; }, print() { prints += 1; } } },
    dispose() { throw new Error("Printing must retain the PDF frame for repeated clicks."); }
  };
  const scope = {
    print() { throw new Error("An original PDF must not print the app HTML."); },
    document: {
      activeElement: { isConnected: true, focus() { restored += 1; } },
      querySelector() { throw new Error("The original PDF route must not move the screen canvas."); }
    },
    addEventListener() { throw new Error("PDFKit may emit no HTML print events."); }
  };
  const manager = createPrintManager({ scope, schedule() { throw new Error("Original PDF printing has no confirmation delay."); } });
  const pending = manager.printPdf({ title: "Original PDF", originalPdf });
  assert.equal(prints, 1, "The preloaded PDF frame prints synchronously in the original button turn.");
  assert.equal(restored, 1, "Returning from the native PDF call restores its original focus target synchronously.");
  assert.equal((await pending).status, "browser-dialog");
  assert.equal((await manager.printPdf({ title: "Repeat after cancel", originalPdf })).status, "browser-dialog");
  assert.equal(prints, 2);
  assert.equal(focuses, 2);
  assert.equal(originalPdf.frame.isConnected, true);
  originalPdf.frame.isConnected = false;
  assert.equal((await manager.printPdf({ originalPdf })).status, "error", "A stale PDF frame cannot silently fall back to HTML printing.");
  originalPdf.frame.isConnected = true;
  originalPdf.frame.contentWindow.print = () => { throw new Error("PDF_PRINT_BLOCKED"); };
  assert.equal((await manager.printPdf({ originalPdf })).message, "PDF_PRINT_BLOCKED");
  assert.equal(restored, 4, "A blocked or stale frame also restores focus without discarding its PDF.");
}

{
  const scope = browserScope();
  const manager = createPrintManager({ scope, confirmationDelay: 0, schedule: immediateSchedule });
  assert.equal((await manager.printPdf({ url: "https://example.test/blatt.pdf", title: "Blatt" })).status, "browser-unconfirmed");
}

{
  let nativeCalls = 0;
  const scope = {
    document: { querySelector() { throw new Error("Native printing must not move browser canvases."); } },
    Capacitor: { Plugins: { MONiPrint: { async printPdf({ url, title }) {
      nativeCalls += 1;
      assert.match(url, /blatt\.pdf$/);
      assert.equal(title, "Mathe-AG 115");
    } } } },
    print() { throw new Error("The browser fallback must not run inside the native app."); }
  };
  const manager = createPrintManager({ scope, confirmationDelay: 0, schedule: immediateSchedule });
  assert.equal((await manager.printPdf({ url: "https://example.test/blatt.pdf", title: "Mathe-AG 115", originalPdf: { frame: null } })).status, "native-dialog");
  assert.equal(nativeCalls, 1);
}

{
  const file = { name: "Sonntagsraetsel-01.pdf", type: "application/pdf" };
  let shareCalls = 0;
  const scope = {
    document: { querySelector() { throw new Error("iPhone printing must use the original PDF file."); } },
    navigator: {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      canShare({ files }) { return files?.[0] === file; },
      async share({ files, title }) {
        shareCalls += 1;
        assert.equal(files[0], file);
        assert.equal(title, "Sonntagsrätsel 01");
      }
    },
    print() { throw new Error("The iPhone must use its native share and print menu."); }
  };
  const manager = createPrintManager({ scope, confirmationDelay: 0, schedule: immediateSchedule });
  assert.equal((await manager.printPdf({ url: "https://example.test/blatt.pdf", title: "Sonntagsrätsel 01", file, originalPdf: { frame: null } })).status, "apple-print-menu");
  assert.equal(shareCalls, 1);
}

{
  const manager = createPrintManager({ scope: {}, confirmationDelay: 0, schedule: immediateSchedule });
  assert.equal((await manager.printPdf({ url: "https://example.test/blatt.pdf", title: "Blatt" })).status, "unsupported");
}

{
  const manager = createPrintManager({ scope: browserScope({ fail: true }), confirmationDelay: 0, schedule: immediateSchedule });
  const result = await manager.printPdf({ url: "https://example.test/blatt.pdf", title: "Blatt" });
  assert.equal(result.status, "error");
  assert.equal(result.message, "PRINT_BLOCKED");
}

console.log("Validated native/iPhone routes, synchronous printing with live canvas isolation, nonblocking dialog lifetime beyond confirmation, restoration after close/failure and untouched workbook route.");
