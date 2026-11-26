// Täglicher Inhalts-Abgleich der MO-Ni-App (läuft auf Andreas' Mac).
//
// Grundsatz: Maßgeblich ist der Stand, der gerade auf mo-ni.de liegt. Der Abgleich ergänzt nur NEUE
// Blätter und Videos aus den öffentlichen Quellen. Bestehende Einträge (von Hand gepflegte Untertitel,
// Klassenangaben, korrigierte PDF-Fassungen) bleiben unangetastet. Er lädt selbst nichts hoch:
// Er legt die geänderten Dateien mit einem Bericht in einen Ausgabeordner, das Hochladen nach TYPO3
// erledigt der geplante Claude-Auftrag. Danach prüft „--rueckpruefen“, ob mo-ni.de alles richtig ausliefert.
//
// Aufruf:  node scripts/inhalte-abgleichen.mjs [--ausgabe=ORDNER] [--app=https://www.mo-ni.de/fileadmin/grundschule-app-test/]
//          node scripts/inhalte-abgleichen.mjs --rueckpruefen=ORDNER/bericht.json
import { cp, mkdtemp, mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { dirname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const HEADERS = { "User-Agent": "MO-Ni-App-Inhaltsabgleich/1.0 (+https://www.mo-ni.de/app)" };
const DEFAULT_APP = "https://www.mo-ni.de/fileadmin/grundschule-app-test/";

export const ARCHIVES = [
  { file: "mathe-ag", script: "update-mathe-ag-archive.mjs", label: "Mathe-AG 3/4" },
  { file: "mathe-ag-56", script: "update-mathe-ag-56-archive.mjs", label: "Mathe-AG 5/6" },
  { file: "olympiade", script: "update-olympiade-archive.mjs", label: "Olympiade" },
  { file: "matheplus", script: "update-matheplus-archive.mjs", label: "MathePlus" }
];
// Diese Dateien lädt die App beim Start; sie bilden den Ausgangsstand.
const DATA_FILES = ["content", "mathe-ag", "mathe-ag-56", "olympiade", "matheplus", "journey", "sunday", "editorial", "video-playlists"];

const sha256 = buffer => createHash("sha256").update(buffer).digest("hex");
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const filled = value => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && !value.length);

// Felder, die (fast) alle bisherigen Einträge haben, muss auch ein neuer Eintrag haben.
// So fällt z. B. auf, wenn ein Erzeuger die Klassenangabe „grades“ vergisst.
export function requiredFields(items, share = 0.9) {
  const counts = new Map();
  for (const item of items) for (const [key, value] of Object.entries(item)) if (filled(value)) counts.set(key, (counts.get(key) || 0) + 1);
  return [...counts].filter(([, count]) => items.length && count / items.length >= share).map(([key]) => key).sort();
}

export function mergeArchive(published, generated, now = new Date()) {
  const publishedItems = Array.isArray(published?.items) ? published.items : [];
  const generatedItems = Array.isArray(generated?.items) ? generated.items : [];
  const byId = new Map(publishedItems.map(item => [item.id, item]));
  const required = [...new Set(["id", "title", ...requiredFields(publishedItems)])];
  const added = [];
  const rejected = [];
  for (const item of generatedItems) {
    if (!item?.id || byId.has(item.id)) continue;
    const missing = required.filter(key => !filled(item[key]));
    if (!filled(item.pdf) && !filled(item.video)) missing.push("pdf oder video");
    if (missing.length) rejected.push({ id: item.id, title: item.title || "", missing });
    else added.push(item);
  }
  if (!added.length) return { merged: published, added, rejected };
  // Reihenfolge wie auf der Quellseite; bestehende Einträge in ihrer veröffentlichten Fassung.
  const addedIds = new Set(added.map(item => item.id));
  const ordered = generatedItems.filter(item => byId.has(item.id) || addedIds.has(item.id)).map(item => byId.get(item.id) || item);
  const placed = new Set(ordered.map(item => item.id));
  const items = [...ordered, ...publishedItems.filter(item => !placed.has(item.id))];
  const merged = { ...published, items, count: items.length, updatedAt: now.toISOString() };
  if ("coreCount" in published) {
    merged.coreCount = items.filter(item => !item.enrichment).length;
    merged.enrichmentCount = items.filter(item => item.enrichment).length;
  }
  if ("nextNumber" in published) merged.nextNumber = Math.max(Number(published.nextNumber) || 0, Number(generated.nextNumber) || 0);
  return { merged, added, rejected };
}

export function videoIds(value) {
  return [...new Set([...JSON.stringify(value).matchAll(/(?:i\.ytimg\.com\/vi\/|youtu\.be\/|watch\?v=|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/g)].map(match => match[1]))];
}

async function fetchBuffer(url) {
  const response = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${url} antwortet mit ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
async function exists(url) {
  const response = await fetch(url, { method: "HEAD", headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(30_000) }).catch(() => null);
  return Boolean(response?.ok);
}

async function prepare({ appBase, output, log }) {
  const now = new Date();
  const work = await mkdtemp(join(tmpdir(), "moni-abgleich-"));
  const report = { erstellt: now.toISOString(), app: appBase.href, hochladen: [], neu: [], abgelehnt: [], hinweise: [] };
  try {
    // Nur die Teile kopieren, die die Erzeuger brauchen (keine PDFs, Bilder oder .git).
    const skip = new Set([".git", "node_modules", "assets", "docs", "native-print", "browser-tests", "tests"]);
    await cp(projectRoot, work, { recursive: true, filter: source => {
      const parts = relative(projectRoot, source).split(sep);
      return !skip.has(parts[0]) && !(parts.length === 1 && /\.pdf$/i.test(parts[0]));
    } });
    const published = {};
    for (const name of DATA_FILES) {
      const buffer = await fetchBuffer(new URL(`data/${name}.json`, appBase));
      published[name] = JSON.parse(buffer.toString("utf8"));
      await writeFile(join(work, "data", `${name}.json`), buffer);
    }

    // 1. Archive (Mathe-AG, Olympiade, MathePlus): nur neue Einträge übernehmen.
    for (const archive of ARCHIVES) {
      try {
        await run(process.execPath, [join(work, "scripts", archive.script)], { cwd: work, timeout: 20 * 60_000, maxBuffer: 16 * 1024 * 1024, env: process.env });
        const generated = JSON.parse(await readFile(join(work, "data", `${archive.file}.json`), "utf8"));
        const { merged, added, rejected } = mergeArchive(published[archive.file], generated, now);
        await writeFile(join(work, "data", `${archive.file}.json`), json(merged));
        for (const item of added) report.neu.push(`${archive.label}: ${item.title}${item.subtitle ? ` – ${item.subtitle}` : ""}`);
        for (const item of rejected) report.abgelehnt.push(`${archive.label}: ${item.title || item.id} (es fehlt: ${item.missing.join(", ")})`);
      } catch (error) {
        await writeFile(join(work, "data", `${archive.file}.json`), json(published[archive.file]));
        report.hinweise.push(`${archive.label}: Abgleich nicht möglich, bisheriger Stand bleibt (${String(error.message).split("\n")[0]})`);
      }
    }

    // 2. Knobelreise und Arbeitsheft: der geprüfte Erzeuger, ausgehend vom veröffentlichten Stand.
    const currentPdf = String(published.content?.workbooks?.pdfUrl || "").replace(/^\.\//, "");
    if (/^MO65-Arbeitsheft-[0-9a-f]+\.pdf$/.test(currentPdf)) await writeFile(join(work, currentPdf), await fetchBuffer(new URL(currentPdf, appBase)));
    try {
      const env = { ...process.env };
      if (process.platform === "darwin" && !env.SSL_CERT_FILE && existsSync("/etc/ssl/cert.pem")) env.SSL_CERT_FILE = "/etc/ssl/cert.pem";
      const { stdout } = await run(process.env.MO_NI_WORKBOOK_PYTHON || "python3",
        [join(work, "Serverautomatisierung", "arbeitsheft", "sync-workbook.py"), "--app-root", work, "--now", now.toISOString()],
        { timeout: 5 * 60_000, maxBuffer: 4 * 1024 * 1024, env });
      const result = JSON.parse(stdout.trim().split("\n").pop());
      const before = new Set((published.journey.videos || []).map(video => video.videoId));
      const journey = JSON.parse(await readFile(join(work, "data", "journey.json"), "utf8"));
      for (const video of journey.videos || []) if (!before.has(video.videoId)) report.neu.push(`Knobelreise: ${video.code} ${video.title}`);
      const pdf = String(result.pdfUrl || "").replace(/^\.\//, "");
      if (pdf && pdf !== currentPdf) report.neu.push(`Arbeitsheft: neue Fassung ${pdf} (${result.workbookVideos} Videos verlinkt)`);
    } catch (error) {
      for (const name of ["journey", "content"]) await writeFile(join(work, "data", `${name}.json`), json(published[name]));
      report.hinweise.push(`Knobelreise/Arbeitsheft: Abgleich nicht möglich, bisheriger Stand bleibt (${String(error.stderr || error.message).trim().split("\n").pop()})`);
    }

    // 3. Was hat sich geändert? Nur wirklich geänderte Dateien werden hochgeladen.
    const changedData = [];
    for (const name of DATA_FILES) {
      const after = JSON.parse(await readFile(join(work, "data", `${name}.json`), "utf8"));
      if (JSON.stringify(after) !== JSON.stringify(published[name])) changedData.push({ name, after });
    }
    // Sicherheitsnetz: Nichts darf verschwinden.
    for (const { name, after } of changedData) {
      const list = value => value?.items || value?.videos || [];
      if (list(after).length < list(published[name]).length) throw new Error(`${name}.json hätte weniger Einträge als veröffentlicht – Abbruch, nichts wird hochgeladen.`);
    }

    const files = [];
    // Neue Arbeitsheft-PDF zuerst, dann Vorschaubilder, zum Schluss die Daten (journey/content ganz am Ende).
    const content = changedData.find(entry => entry.name === "content")?.after;
    const newPdf = String(content?.workbooks?.pdfUrl || "").replace(/^\.\//, "");
    if (newPdf && newPdf !== currentPdf) files.push({ path: newPdf, source: join(work, newPdf), grund: "neue Fassung des Arbeitshefts" });
    const knownIds = new Set(DATA_FILES.flatMap(name => videoIds(published[name])));
    for (const id of changedData.flatMap(entry => videoIds(entry.after)).filter(id => !knownIds.has(id))) {
      const path = `assets/vorschaubilder/${id}.jpg`;
      if (await exists(new URL(path, appBase))) continue;
      try {
        const image = join(work, "vorschaubild.jpg");
        const prepared = join(work, `${id}.jpg`);
        await writeFile(image, await fetchBuffer(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`));
        // 480×360 mit Balken -> 480×270 wie die Karten (sips gibt es auf dem Mac).
        await run("sips", ["--cropToHeightWidth", "270", "480", "-s", "format", "jpeg", "-s", "formatOptions", "70", image, "--out", prepared]).catch(() => copyFile(image, prepared));
        files.push({ path, source: prepared, grund: "Vorschaubild zu einem neuen Video" });
      } catch (error) {
        report.hinweise.push(`Vorschaubild ${id}: nicht geladen (${error.message}); die App zeigt bis dahin das Platzhalterbild.`);
      }
    }
    const lastOrder = ["journey", "content"];
    changedData.sort((a, b) => lastOrder.indexOf(a.name) - lastOrder.indexOf(b.name));
    for (const { name } of changedData) files.push({ path: `data/${name}.json`, source: join(work, "data", `${name}.json`), grund: "neue Einträge" });

    await rm(output, { recursive: true, force: true });
    await mkdir(output, { recursive: true });
    for (const file of files) {
      const target = join(output, file.path);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(file.source, target);
      const buffer = await readFile(target);
      report.hochladen.push({ pfad: file.path, typo3Ordner: `fileadmin/grundschule-app-test/${dirname(file.path) === "." ? "" : `${dirname(file.path)}/`}`, sha256: sha256(buffer), bytes: buffer.length, grund: file.grund });
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
  await mkdir(output, { recursive: true });
  await writeFile(join(output, "bericht.json"), json(report));
  await writeFile(join(output, "bericht.txt"), describe(report));
  log(describe(report));
  return report;
}

export function describe(report) {
  const lines = [`Inhalts-Abgleich vom ${new Date(report.erstellt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`];
  lines.push(report.hochladen.length ? `\nHochladen (in dieser Reihenfolge, jeweils Datei ersetzen):` : "\nNichts hochzuladen – die App ist auf dem neuesten Stand.");
  report.hochladen.forEach((file, index) => lines.push(`  ${index + 1}. ${file.pfad}  →  ${file.typo3Ordner}  (${file.grund})`));
  if (report.neu.length) lines.push("\nNeu in der App:", ...report.neu.map(line => `  + ${line}`));
  if (report.abgelehnt.length) lines.push("\nNicht übernommen, bitte von Hand ansehen:", ...report.abgelehnt.map(line => `  ! ${line}`));
  if (report.hinweise.length) lines.push("\nHinweise:", ...report.hinweise.map(line => `  · ${line}`));
  return `${lines.join("\n")}\n`;
}

// Nach dem Hochladen: Liefert mo-ni.de genau die vorbereiteten Dateien aus?
export async function verify(reportFile, log = console.log) {
  const report = JSON.parse(await readFile(reportFile, "utf8"));
  const appBase = new URL(report.app);
  const problems = [];
  for (const file of report.hochladen) {
    try {
      const buffer = await fetchBuffer(new URL(`${file.pfad}?pruefung=${Date.now()}`, appBase));
      if (sha256(buffer) !== file.sha256) problems.push(`${file.pfad}: auf mo-ni.de liegt eine andere Fassung`);
    } catch (error) {
      problems.push(`${file.pfad}: ${error.message}`);
    }
  }
  log(problems.length ? `✗ Rückprüfung: ${problems.length} Problem(e)\n${problems.map(line => `  ${line}`).join("\n")}` : `✓ Rückprüfung: alle ${report.hochladen.length} Dateien sind auf mo-ni.de richtig angekommen.`);
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const option = name => process.argv.find(argument => argument.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  if (option("rueckpruefen")) {
    if ((await verify(resolve(option("rueckpruefen")))).length) process.exitCode = 1;
  } else {
    const output = resolve(option("ausgabe") || join(homedir(), "MO-Ni-Abgleich", "heute"));
    await prepare({ appBase: new URL(option("app") || DEFAULT_APP), output, log: console.log });
    console.log(`Ausgabeordner: ${output}`);
  }
}
