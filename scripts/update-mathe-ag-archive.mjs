import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceUrl = "https://www.mo-ni.de/mathe-ag-grundschule";
const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const destination = resolve(projectRoot, "data/mathe-ag.json");
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

function linksFromRow(rowHtml) {
  return [...rowHtml.matchAll(/<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].map(match => ({
    label: textFromHtml(match[3]),
    url: new URL(decodeEntities(match[2]), sourceUrl).href
  }));
}

function latestSchoolYear(html, position) {
  const prefix = textFromHtml(html.slice(Math.max(0, position - 80_000), position));
  const matches = [...prefix.matchAll(/Schuljahr\s*(\d{4})\s*\/\s*(\d{4})/gi)];
  const last = matches.at(-1);
  return last ? `${last[1]}/${last[2].slice(-2)}` : "Archiv";
}

function archiveItemsFromHtml(html) {
  const items = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = row[1];
    const links = linksFromRow(rowHtml);
    const worksheetLink = links.find(link => /Blatt\s*\d+/i.test(link.label));
    if (!worksheetLink) continue;

    const numberMatch = worksheetLink.label.match(/Blatt\s*(\d+)/i);
    const number = Number(numberMatch?.[1]);
    if (!Number.isInteger(number) || number < 1) continue;

    const rowText = textFromHtml(rowHtml);
    const marker = rowText.match(new RegExp(`Blatt\\s*${number}\\b`, "i"));
    const rawTopic = marker ? rowText.slice(marker.index + marker[0].length).trim() : "";
    const topic = rawTopic.replace(/^[-–—,:;\s]+/, "") || "Gemeinsames Knobeln mit Wettbewerbsaufgaben";
    const displayTopics = {
      115: "Sieben Zwerge, Quadrate, Frühstück und Polyominos",
      116: "Fliegen, gleiche Summen, Zahlenrätsel und Zifferndifferenzen"
    };
    const displayTopic = displayTopics[number] || topic;
    const videoLinks = links
      .filter(link => link !== worksheetLink && /(?:youtu\.be|youtube\.com|facebook\.com)/i.test(link.url))
      .map((link, index) => ({ label: link.label || `Video ${index + 1}`, url: link.url }));
    const prefix = marker ? rowText.slice(0, marker.index) : rowText;
    const date = prefix
      .replace(/(?:Livestream|Premiere|Erklärvideo|Video|Aufgabe)\s*\d+(?:\s*,\s*Aufgabe\s*\d+)*/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    items.push({
      id: `ag-${number}-resource`,
      number,
      category: "mathe-ag",
      title: `Mathe-AG ${number}`,
      subtitle: displayTopic,
      topics: topic,
      date,
      grade: "Klasse 3/4",
      grades: [3, 4],
      year: latestSchoolYear(html, row.index),
      duration: videoLinks.length > 1 ? `${videoLinks.length} Videos & Blatt` : videoLinks.length ? "Video & Blatt" : "Aufgabenblatt",
      video: videoLinks[0]?.url || "",
      videos: videoLinks,
      pdf: /\.pdf(?:$|[?#])/i.test(worksheetLink.url) ? worksheetLink.url : "",
      worksheet: /\.pdf(?:$|[?#])/i.test(worksheetLink.url) ? "" : worksheetLink.url,
      pages: null,
      searchText: topic
    });
  }

  const unique = new Map(items.map(item => [item.number, item]));
  return [...unique.values()].sort((a, b) => b.number - a.number);
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
    .slice(0, 24_000);
}

async function enrichItem(item, temporaryDirectory, index, total) {
  if (!item.pdf) {
    console.log(`[${index + 1}/${total}] Mathe-AG ${item.number}: externe Aufgabenseite erfasst`);
    return item;
  }
  const file = join(temporaryDirectory, `mathe-ag-${item.number}.pdf`);
  try {
    const response = await fetch(item.pdf, {
      headers: { "User-Agent": "MO-Ni-Grundschul-App-Archivpflege/0.7.1" },
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    const extracted = await run(pdfToText, ["-layout", file, "-"]);
    const pages = extracted.split("\f").filter(page => page.trim()).length;
    item.pages = Math.max(1, pages);
    item.duration = `${item.pages} ${item.pages === 1 ? "Seite" : "Seiten"}${item.videos.length ? ` · ${item.videos.length === 1 ? "Video" : `${item.videos.length} Videos`}` : ""}`;
    item.searchText = cleanSearchText(`${item.topics} ${extracted}`);
    console.log(`[${index + 1}/${total}] Mathe-AG ${item.number}: ${item.pages} Seiten indexiert`);
  } catch (error) {
    console.warn(`[${index + 1}/${total}] Mathe-AG ${item.number}: nur Archivtext (${error.message})`);
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
  headers: { "User-Agent": "MO-Ni-Grundschul-App-Archivpflege/0.7.1" },
  signal: AbortSignal.timeout(45_000)
});
if (!response.ok) throw new Error(`Archivseite nicht erreichbar: HTTP ${response.status}`);

const html = await response.text();
const items = archiveItemsFromHtml(html);
if (items.length < 100) throw new Error(`Es wurden nur ${items.length} Mathe-AGs erkannt; Aktualisierung abgebrochen.`);

const temporaryDirectory = await mkdtemp(join(tmpdir(), "mo-ni-mathe-ag-"));
try {
  const enriched = await mapWithLimit(items, 6, (item, index) => enrichItem(item, temporaryDirectory, index, items.length));
  const archive = {
    version: "0.7.1",
    source: sourceUrl,
    updatedAt: new Date().toISOString(),
    count: enriched.length,
    items: enriched
  };
  await writeFile(destination, `${JSON.stringify(archive, null, 2)}\n`, "utf8");
  console.log(`${enriched.length} Mathe-AGs nach ${destination} geschrieben.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
