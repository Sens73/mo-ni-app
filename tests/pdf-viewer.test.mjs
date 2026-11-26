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

function renderer({ pageCount = 2, serializationFails = false } = {}) {
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
        tag, children: [], attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        append(child) { this.children.push(child); }
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
    getDocument: () => ({ promise: Promise.resolve({
      numPages: pageCount,
      getPage: async number => ({
        getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
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

console.log("Validated complete PNG preparation before PDF readiness, original canvas retention and image failure propagation.");
