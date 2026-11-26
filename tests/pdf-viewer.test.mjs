import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Exercise the real renderer with PDF transport and browser pixels stubbed.
const source = (await readFile(new URL("../pdf-viewer.js", import.meta.url), "utf8"))
  .replace(/^import .*;\n/gm, "")
  .replace(/^pdfjs\.GlobalWorkerOptions\.workerSrc = .*;\n/m, "")
  .replace("export async function renderPdfDocument", "async function renderPdfDocument");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function renderer({ pageCount = 2, serializationFails = false, pageTexts = [] } = {}) {
  const renders = Array.from({ length: pageCount }, deferred);
  const decodes = Array.from({ length: pageCount }, deferred);
  const canvases = [];
  const images = [];
  const progress = [];
  const container = {
    children: ["old content"], clientWidth: 420,
    replaceChildren() { this.children = []; },
    append(child) { this.children.push(child); }
  };
  const document = {
    createElement(tag) {
      const element = {
        tag, children: [], attributes: {}, style: { properties: {}, setProperty(name, value) { this.properties[name] = value; } },
        clientWidth: 400, textContent: "", parent: null,
        setAttribute(name, value) { this.attributes[name] = value; },
        removeAttribute(name) { delete this.attributes[name]; },
        append(child) { this.children.push(child); child.parent = this; },
        remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
      };
      if (tag === "canvas") {
        const number = canvases.length;
        element.getContext = () => ({ canvas: element });
        element.toDataURL = type => {
          assert.equal(type, "image/png", "Text and QR codes use a lossless image.");
          assert.equal(element.pixels, `complete page ${number + 1}`, "The image is captured only after rendering finishes.");
          if (serializationFails) throw new Error("PNG preparation failed");
          return `data:image/png;base64,page-${number + 1}`;
        };
        canvases.push(element);
      }
      if (tag === "img") {
        const number = images.length;
        element.decode = () => decodes[number].promise;
        images.push(element);
      }
      return element;
    }
  };
  const pdfjs = {
    TextLayer: class {
      constructor({ textContentSource, container, viewport }) {
        assert.equal(viewport.width, 600, "The text layer uses PDF points and scales with CSS.");
        Object.assign(this, { textContentSource, container });
      }
      async render() { this.container.textContent = await this.textContentSource; }
    },
    getDocument: () => ({ promise: Promise.resolve({
      numPages: pageCount,
      getPage: async number => ({
        getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
        streamTextContent: () => Promise.resolve(pageTexts[number - 1] || ""),
        render: ({ canvasContext }) => ({
          promise: renders[number - 1].promise.then(() => {
            canvasContext.canvas.pixels = `complete page ${number}`;
          })
        })
      })
    }) })
  };
  const context = vm.createContext({ document, window: { devicePixelRatio: 2 }, pdfjs });
  vm.runInContext(source, context);
  const run = () => context.renderPdfDocument({ url: "worksheet.pdf", container, onProgress: message => progress.push(message) });
  return { run, renders, decodes, canvases, images, container, progress };
}

const flush = async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); };

const ready = renderer();
let complete = false;
const pending = ready.run().then(result => { complete = true; return result; });
await flush();
assert.equal(ready.images.length, 0, "Unrendered pixels are never made printable.");
ready.renders[0].resolve();
await flush();
assert.equal(ready.images.length, 1);
assert.equal(complete, false, "The document cannot become print-ready before the first image is decoded.");
assert.equal(ready.canvases.length, 1, "Pages are prepared sequentially without racing the image decoder.");
ready.decodes[0].resolve();
await flush();
ready.renders[1].resolve();
await flush();
assert.equal(complete, false, "The final image must also be decoded before print-ready.");
ready.decodes[1].resolve();
assert.equal((await pending).pages, 2);
assert.equal(ready.progress.at(-1), "");
for (let index = 0; index < 2; index++) {
  const sheet = ready.container.children[index];
  assert.equal(sheet.children[0], ready.canvases[index], "The original screen canvas is retained.");
  assert.equal(ready.canvases[index].pixels, `complete page ${index + 1}`);
  assert.equal(sheet.children[1], ready.images[index]);
  assert.equal(ready.images[index].src, `data:image/png;base64,page-${index + 1}`);
  assert.equal(ready.images[index].attributes["aria-hidden"], "true");
  assert.equal(ready.images[index].alt, "");
}

const failedDecode = renderer({ pageCount: 1 });
const decodeResult = failedDecode.run();
const decodeRejected = assert.rejects(decodeResult, /Image could not be decoded/);
await flush();
failedDecode.renders[0].resolve();
await flush();
failedDecode.decodes[0].reject(new Error("Image could not be decoded"));
await decodeRejected;
assert.notEqual(failedDecode.progress.at(-1), "", "A failed image does not report readiness to the caller.");

const failedSerialization = renderer({ pageCount: 1, serializationFails: true });
const serializationResult = failedSerialization.run();
const serializationRejected = assert.rejects(serializationResult, /PNG preparation failed/);
await flush();
failedSerialization.renders[0].resolve();
await serializationRejected;
assert.equal(failedSerialization.container.children[0].children.length, 1, "A failed PNG does not replace the original canvas.");

// Text layer: pages with text become readable, the canvas is hidden from screen readers.
const readable = renderer({ pageCount: 2, pageTexts: ["Quersumme 9: Finde alle Zahlen …", "   "] });
const readableResult = readable.run();
for (let index = 0; index < 2; index++) {
  await flush(); readable.renders[index].resolve(); await flush(); await flush(); readable.decodes[index].resolve(); await flush();
}
await readableResult;
const [textSheet, imageSheet] = readable.container.children;
assert.equal(textSheet.attributes["aria-label"], "Seite 1 von 2");
const layer = textSheet.children.find(child => child.className?.includes("textLayer"));
assert.ok(layer, "A page with text gets a text layer.");
assert.equal(layer.textContent, "Quersumme 9: Finde alle Zahlen …");
assert.equal(layer.attributes.lang, "de");
assert.equal(readable.canvases[0].attributes["aria-hidden"], "true", "The text replaces the picture for screen readers.");
assert.equal(textSheet.style.properties["--total-scale-factor"], String(400 / 600));
assert.ok(!imageSheet.children.some(child => child.className?.includes("textLayer")), "A page without text keeps no empty layer.");
assert.equal(readable.canvases[1].attributes["aria-label"], "Seite 2 von 2", "A page without text keeps its page label.");
assert.equal(readable.canvases[1].attributes["aria-hidden"], undefined);

console.log("Validated complete PNG preparation before PDF readiness, original canvas retention, image failure propagation and the readable text layer.");
