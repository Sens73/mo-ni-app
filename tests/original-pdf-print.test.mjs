import assert from "node:assert/strict";
import { prepareOriginalPdfPrint, shouldUseOriginalPdfPrint } from "../original-pdf-print.js";

const safariAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15";
const desktop = { userAgent: safariAgent, platform: "MacIntel", maxTouchPoints: 0 };
assert.equal(shouldUseOriginalPdfPrint({ navigator: desktop }), true);
for (const navigator of [
  { userAgent: safariAgent.replace("Version/26.0", "Chrome/140.0.0.0") },
  { userAgent: safariAgent.replace("Version/26.0", "Edg/140.0") },
  { userAgent: "Mozilla/5.0 (Macintosh) Gecko/20100101 Firefox/143.0" },
  { userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1" },
  { ...desktop, maxTouchPoints: 5 },
  { userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0 Safari/537.36" }
]) assert.equal(shouldUseOriginalPdfPrint({ navigator }), false);
for (const shell of [{ MONiPrint: { printPdf() {} } }, { Capacitor: { Plugins: { MONiPrint: { printPdf() {} } } } }]) {
  assert.equal(shouldUseOriginalPdfPrint({ navigator: desktop, ...shell }), false);
}

function harness() {
  const frames = [];
  const urls = [];
  const revoked = [];
  const timers = new Map();
  let nextTimer = 0;
  const scope = {
    document: {
      body: { append(frame) { frame.isConnected = true; } },
      createElement(tag) {
        assert.equal(tag, "iframe");
        const listeners = new Map();
        const frame = {
          isConnected: false, style: {}, attributes: {},
          setAttribute(name, value) { this.attributes[name] = value; },
          addEventListener(name, listener) { listeners.set(name, listener); },
          removeEventListener(name, listener) { if (listeners.get(name) === listener) listeners.delete(name); },
          emit(name) { listeners.get(name)?.(); },
          remove() { this.isConnected = false; },
          contentWindow: { focus() {}, print() { throw new Error("Preparation must not print automatically."); } }
        };
        frames.push(frame);
        return frame;
      }
    },
    URL: {
      createObjectURL(file) { urls.push(file); return `blob:https://app.test/original-${urls.length}`; },
      revokeObjectURL(url) { revoked.push(url); }
    },
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  return { scope, frames, urls, revoked, timers };
}

const file = { type: "application/pdf", originalBytes: "%PDF-the-original" };
{
  const test = harness();
  const pending = prepareOriginalPdfPrint({ file, scope: test.scope });
  assert.equal(test.urls[0], file, "The native viewer receives the prepared original PDF, without raster conversion.");
  const frame = test.frames[0];
  assert.equal(frame.isConnected, true);
  assert.equal(frame.attributes["aria-hidden"], "true");
  assert.equal(frame.tabIndex, -1);
  let ready = false;
  pending.then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false, "Readiness waits for the PDF frame load event.");
  frame.emit("load");
  const originalPdf = await pending;
  assert.equal(originalPdf.frame, frame);
  assert.equal(test.timers.size, 0, "The load timeout ends on readiness.");
  assert.equal(frame.isConnected, true, "A loaded frame stays alive until its viewer explicitly leaves.");
  assert.deepEqual(test.revoked, []);
  originalPdf.dispose();
  originalPdf.dispose();
  assert.equal(frame.isConnected, false);
  assert.deepEqual(test.revoked, [frame.src], "The Blob URL is revoked exactly once.");
}

for (const outcome of ["error", "timeout", "abort", "unavailable"]) {
  const test = harness();
  const controller = new AbortController();
  const pending = prepareOriginalPdfPrint({ file, scope: test.scope, signal: controller.signal });
  const rejected = assert.rejects(pending, outcome === "abort" ? { name: "AbortError" } : /Druckansicht/);
  const frame = test.frames[0];
  if (outcome === "error") frame.emit("error");
  if (outcome === "timeout") test.timers.values().next().value();
  if (outcome === "abort") controller.abort();
  if (outcome === "unavailable") { frame.contentWindow = null; frame.emit("load"); }
  await rejected;
  assert.equal(frame.isConnected, false, `${outcome} removes the unready frame.`);
  assert.deepEqual(test.revoked, [frame.src]);
  assert.equal(test.timers.size, 0);
  frame.emit("load");
  controller.abort();
  assert.equal(test.revoked.length, 1, "Late events cannot revive or double-dispose a failed frame.");
}

{
  const test = harness();
  const controller = new AbortController();
  const pending = prepareOriginalPdfPrint({ file, scope: test.scope, signal: controller.signal });
  test.frames[0].emit("load");
  const originalPdf = await pending;
  controller.abort();
  assert.equal(originalPdf.frame.isConnected, false, "Leaving after readiness also disposes the retained frame.");
  assert.equal(test.revoked.length, 1);
}

{
  const test = harness();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(prepareOriginalPdfPrint({ file, scope: test.scope, signal: controller.signal }), { name: "AbortError" });
  await assert.rejects(prepareOriginalPdfPrint({ file: { type: "text/html" }, scope: test.scope }), /Druckansicht/);
  assert.equal(test.frames.length, 0, "Invalid or already abandoned work creates no frame or Blob URL.");
}

console.log("Validated Safari-only routing, original PDF frame readiness, explicit lifetime, load/timeout errors and cancellation before and after load.");
