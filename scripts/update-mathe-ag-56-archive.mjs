import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceUrl = "https://www.mo-ni.de/vorbereitung-olympiade";
const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const destination = resolve(projectRoot, "data/mathe-ag-56.json");
const kangarooArchiveUrl = "https://www.mathe-kaenguru.de/chronik/aufgaben/index.html";
const bundledPdfToText = process.env.HOME + "/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/poppler/bin/pdftotext";
const pdfToText = process.env.PDFTOTEXT_BIN || bundledPdfToText;

const namedEntities = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  laquo: "«",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  raquo: "»",
  rdquo: "”",
  rsquo: "’"
};

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => namedEntities[name.toLowerCase()] ?? match);
}

function textFromHtml(value) {
  return decodeEntities(value)
    .replace(/<(?:br|\/p|\/div|\/li|\/td|\/th|\/h\d)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellsFromRow(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(match => match[1]);
}

function linksFromHtml(value) {
  return [...value.matchAll(/<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].map(match => ({
    label: textFromHtml(match[3]),
    url: new URL(decodeEntities(match[2]), sourceUrl).href.replace(/^http:/, "https:")
  }));
}

function schoolYearLabel(first, second) {
  return `${first}/${second.slice(-2)}`;
}

export function archiveItemsFromHtml(html) {
  const items = [];
  let schoolYear = "Archiv";
  let topicNumber = null;
  let topicTitle = "";
  let highestStreamNumber = 0;

  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = rowMatch[1];
    const rowText = textFromHtml(rowHtml);
    const cells = cellsFromRow(rowHtml);
    const links = linksFromHtml(rowHtml);
    const videoLink = links.find(link => /(?:youtu\.be|youtube\.com)/i.test(link.url) && /(?:Livestream|Premiere)\s*\d+/i.test(link.label));

    const yearMatch = rowText.match(/Schuljahr\s*(\d{4})\s*\/\s*(\d{4})/i);
    if (yearMatch) schoolYear = schoolYearLabel(yearMatch[1], yearMatch[2]);

    if (!videoLink) {
      const topicMatch = rowText.match(/#\s*(\d{1,2})\s+(.+)/);
      if (topicMatch) {
        topicNumber = Number(topicMatch[1]);
        topicTitle = topicMatch[2].replace(/\s+/g, " ").trim();
      }
      continue;
    }

    const number = Number(videoLink.label.match(/(?:Livestream|Premiere)\s*(\d+)/i)?.[1]);
    if (!Number.isInteger(number) || number < 1) continue;
    highestStreamNumber = Math.max(highestStreamNumber, number);

    const explicitGrades56 = /Klassen?\s*5\s*(?:und|&|\/|–|—|-)\s*6/i.test(rowText);
    const explicitGrades78 = /Klassen?\s*7\s*(?:und|&|\/|–|—|-)\s*8/i.test(rowText);
    const sourceGrades = explicitGrades78 || (!explicitGrades56 && topicNumber >= 10) ? [7, 8] : [5, 6];
    const isEnrichment = sourceGrades[0] === 7;

    const resourceCell = cells[3] || "";
    const resourceText = textFromHtml(resourceCell)
      .replace(/\(Klassen?\s*5\s*(?:und|&|\/|–|—|-)\s*6\)/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const resourceLink = linksFromHtml(resourceCell).find(link => !/(?:youtu\.be|youtube\.com)/i.test(link.url));
    const pdf = resourceLink && /\.pdf(?:$|[?#])/i.test(resourceLink.url) ? resourceLink.url : "";
    const worksheet = resourceLink && !pdf
      ? resourceLink.url
      : !resourceLink && /Känguru[- ]?Wettbewerb/i.test(resourceText)
        ? kangarooArchiveUrl
        : "";
    const subtitle = resourceText || topicTitle || "Vorbereitung auf die Mathematik-Olympiade";
    const topics = [topicTitle, resourceText].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ");
    const date = textFromHtml(cells[0] || "");

    items.push({
      id: `ag-56-${number}-resource`,
      number,
      collection: "56",
      category: "mathe-ag",
      title: `Livestream ${number}`,
      subtitle,
      topics,
      date,
      grade: isEnrichment ? "Vertiefung aus Klasse 7–8" : "Klasse 5–6",
      grades: [5, 6],
      sourceGrades,
      audienceLabel: isEnrichment ? "Vertiefung aus 7–8" : "Klasse 5–6",
      enrichment: isEnrichment,
      year: schoolYear,
      duration: pdf ? "Video & Aufgabenblatt" : worksheet ? "Video & Aufgaben" : "Video",
      video: videoLink.url,
      videos: [{ label: videoLink.label, url: videoLink.url }],
      pdf,
      worksheet,
      pages: null,
      searchText: `${topics} ${subtitle}`.trim()
    });
  }

  const unique = new Map(items.map(item => [item.number, item]));
  return {
    items: [...unique.values()].sort((first, second) => second.number - first.number),
    nextNumber: highestStreamNumber + 1
  };
}

function run(command, argumentsList) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, argumentsList, { stdio: ["ignore", "pipe", "pipe"] });
    const output = [];
    const errors = [];
    child.stdout.on("data", chunk => output.push(chunk));
    child.stderr.on("data", chunk => errors.push(chunk));
    child.on("error", rejectPromise);
    child.on("close", code => code === 0
      ? resolvePromise(Buffer.concat(output).toString("utf8"))
      : rejectPromise(new Error(Buffer.concat(errors).toString("utf8") || `Exit-Code ${code}`)));
  });
}

function cleanSearchText(value) {
  return value
    .replace(/\S+@\S+/g, " ")
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32_000);
}

async function enrichItem(item, temporaryDirectory, index, total) {
  if (!item.pdf) {
    item.searchText = cleanSearchText(item.searchText);
    console.log(`[${index + 1}/${total}] Livestream ${item.number}: Video${item.worksheet ? " und externe Aufgabenseite" : ""} erfasst`);
    return item;
  }

  const file = join(temporaryDirectory, `mathe-ag-56-${item.number}.pdf`);
  try {
    const response = await fetch(item.pdf, {
      headers: { "User-Agent": "MO-Ni-App-Mathe-AG-56/0.13.0" },
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pdf = Buffer.from(await response.arrayBuffer());
    if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("keine PDF-Datei");
    await writeFile(file, pdf);
    const extracted = await run(pdfToText, ["-layout", file, "-"]);
    const pages = extracted.split("\f").filter(page => page.trim()).length;
    item.pages = Math.max(1, pages);
    item.duration = `${item.pages} ${item.pages === 1 ? "Seite" : "Seiten"} · Video`;
    item.searchText = cleanSearchText(`${item.searchText} ${extracted}`);
    console.log(`[${index + 1}/${total}] Livestream ${item.number}: ${item.pages} Seiten indexiert`);
  } catch (error) {
    console.warn(`[${index + 1}/${total}] Livestream ${item.number}: nur Archivtext (${error.message})`);
    item.searchText = cleanSearchText(item.searchText);
  }
  return item;
}

async function mapWithLimit(values, limit, callback) {
  const results = new Array(values.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await callback(values[index], index);
    }
  }));
  return results;
}

const response = await fetch(sourceUrl, {
  headers: { "User-Agent": "MO-Ni-App-Mathe-AG-56/0.13.0" },
  signal: AbortSignal.timeout(45_000)
});
if (!response.ok) throw new Error(`Vorbereitungsseite nicht erreichbar: HTTP ${response.status}`);

const html = await response.text();
const parsed = archiveItemsFromHtml(html);
if (parsed.items.length < 55) throw new Error(`Es wurden nur ${parsed.items.length} Livestreams der Reihe erkannt; Aktualisierung abgebrochen.`);
if (parsed.nextNumber < 56) throw new Error(`Die Fortsetzungsnummer ${parsed.nextNumber} ist unerwartet; Aktualisierung abgebrochen.`);

const temporaryDirectory = await mkdtemp(join(tmpdir(), "mo-ni-mathe-ag-56-"));
try {
  const enriched = await mapWithLimit(parsed.items, 6, (item, index) => enrichItem(item, temporaryDirectory, index, parsed.items.length));
  const coreCount = enriched.filter(item => !item.enrichment).length;
  const enrichmentCount = enriched.filter(item => item.enrichment).length;
  const archive = {
    version: "0.13.0",
    source: sourceUrl,
    updatedAt: new Date().toISOString(),
    count: enriched.length,
    coreCount,
    enrichmentCount,
    nextNumber: parsed.nextNumber,
    items: enriched
  };
  await writeFile(destination, `${JSON.stringify(archive, null, 2)}\n`, "utf8");
  console.log(`${enriched.length} Livestreams nach ${destination} geschrieben (${coreCount} für Klasse 5–6, ${enrichmentCount} Vertiefungen aus 7–8). Fortsetzung: Livestream ${parsed.nextNumber}.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
