import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareMaterialLink } from "../material-links.js";

const kangarooArchive = "https://www.mathe-kaenguru.de/chronik/aufgaben/index.html";
const examples = new Map([
  ["https://www.mo-ni.de/", "MO-Ni-Website öffnen"],
  ["https://www.mo-ni.de/jagtmrx/olympiadeaufgaben", "Olympiade-Aufgaben öffnen"],
  ["https://www.mo-ni.de/matheplus", "MathePlus-Seite öffnen"],
  ["https://www.mo-ni.de/mathe-ag-grundschule", "Mathe-AG-Seite öffnen"],
  [kangarooArchive, "Känguru-Aufgabenarchiv öffnen"]
]);
for (const [url, label] of examples) {
  assert.deepEqual(prepareMaterialLink(url), {
    href: url,
    label,
    ariaLabel: `${label} (öffnet in einem neuen Tab)`,
    target: "_blank",
    rel: "noopener noreferrer"
  });
}
assert.equal(prepareMaterialLink(`  ${kangarooArchive}  `).href, kangarooArchive);
assert.equal(prepareMaterialLink("http://mathe-kaenguru.de/chronik/aufgaben/index.html").label, "Känguru-Aufgabenarchiv öffnen");
assert.equal(prepareMaterialLink("https://mo-ni.de/matheplus?jahr=2026#aufgaben").href, "https://mo-ni.de/matheplus?jahr=2026#aufgaben");
assert.equal(prepareMaterialLink("HTTPS://WWW.MO-NI.DE:443/matheplus/").href, "https://www.mo-ni.de/matheplus/");
assert.equal(prepareMaterialLink("https://www.mo-ni.de/matheplus-fremd").label, "MO-Ni-Website öffnen", "A similar path must not acquire the MathePlus label.");
assert.equal(prepareMaterialLink("https://www.mathe-kaenguru.de/").label, "Känguru-Website öffnen");

for (const invalid of [
  "", "   ", null, undefined, 42, {},
  "./aufgaben", "/chronik/aufgaben/index.html", "//www.mo-ni.de/",
  "not a URL", "javascript:alert(1)", "data:text/html,<script>alert(1)</script>",
  "mailto:mo@mo-ni.de", "file:///tmp/aufgaben.pdf", "ftp://www.mo-ni.de/",
  "https://example.com/", "https://www.youtube.com/watch?v=abcdefghijk",
  "https://www.mo-ni.de.evil.example/", "https://evil.example/www.mo-ni.de/",
  "https://www.mathe-kaenguru.de.evil.example/chronik/aufgaben/index.html",
  "https://notmo-ni.de/", "https://subdomain.mo-ni.de/", "https://www.mo-ni.de./",
  "https://www.mo-ni.de@evil.example/", "https://evil.example@www.mo-ni.de/",
  "https://user:password@www.mathe-kaenguru.de/chronik/aufgaben/index.html",
  "https://www.mo-ni.de:8443/", "http://www.mathe-kaenguru.de:8080/",
  "https://www.mo-ni.de/\u0000", "https://www.mo-\nni.de/", "https://www.mo-ni.de/\u007f",
  "https://www.mo-ni.de\\@evil.example/"
]) {
  assert.equal(prepareMaterialLink(invalid), null, String(invalid));
}

const root = new URL("../", import.meta.url);
const content = JSON.parse(await readFile(new URL("data/content.json", root), "utf8"));
const primary = JSON.parse(await readFile(new URL("data/mathe-ag.json", root), "utf8"));
const older = JSON.parse(await readFile(new URL("data/mathe-ag-56.json", root), "utf8"));
const olympiad = JSON.parse(await readFile(new URL("data/olympiade.json", root), "utf8"));
const mathePlus = JSON.parse(await readFile(new URL("data/matheplus.json", root), "utf8"));
const original = JSON.stringify({content, primary, older, olympiad, mathePlus});
const websiteTargets = [
  content.meta.website,
  ...Object.values(content.collections).map(collection => collection.url),
  ...content.resources.map(item => item.worksheet || item.url).filter(Boolean),
  ...[primary, older, olympiad, mathePlus].flatMap(archive => archive.items.map(item => item.worksheet || item.url).filter(Boolean))
];
for (const target of websiteTargets) {
  const link = prepareMaterialLink(target);
  assert.ok(link, `The current task or website target must remain reachable: ${target}`);
  assert.equal(link.href, target);
  assert.equal(link.label, examples.get(target), `The link must name its actual destination: ${target}`);
}
const externalWorksheetItems = [...primary.items, ...older.items, ...olympiad.items, ...mathePlus.items].filter(item => item.worksheet);
assert.equal(externalWorksheetItems.length, 6);
assert.ok(externalWorksheetItems.every(item => item.worksheet === kangarooArchive));
assert.equal(primary.items.find(item => item.number === 78).worksheet, kangarooArchive, "AG 78 retains its official task archive.");
assert.equal(new Set(websiteTargets).size, 5);
assert.equal(JSON.stringify({content, primary, older, olympiad, mathePlus}), original, "Link preparation must not alter source materials.");

console.log(`Material links: all ${websiteTargets.length} current task/website references, six Känguru worksheets, concrete labels and rejected malformed/foreign URLs verified.`);
