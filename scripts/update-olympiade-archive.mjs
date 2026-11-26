import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceUrl = "https://www.mo-ni.de/jagtmrx/olympiadeaufgaben";
const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const destination = resolve(projectRoot, "data/olympiade.json");
const bundledPdfToText = process.env.HOME + "/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/poppler/bin/pdftotext";
const pdfToText = process.env.PDFTOTEXT_BIN || bundledPdfToText;

// The website's old link is unavailable. AG 91 covers the identical A64031.pdf.
const correctedVideoUrls = new Map([
  ["https://youtube.com/live/yhc2-HjVLTo", "https://youtube.com/live/JATbSQwYhDg"]
]);

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
  return [...value.matchAll(/<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].map(match => {
    const rawUrl = decodeEntities(match[2]);
    try {
      return { label: textFromHtml(match[3]), url: new URL(rawUrl, sourceUrl).href };
    } catch {
      return { label: textFromHtml(match[3]), url: "" };
    }
  });
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function videoLabel(link, cellText, index, links) {
  const matchingPosition = links.slice(0, index).filter(candidate => candidate.label === link.label).length;
  const detailMatches = link.label
    ? [...cellText.matchAll(new RegExp(`${escapeRegularExpression(link.label)}\\s*\\(([^)]+)\\)`, "gi"))]
    : [];
  const detail = detailMatches[matchingPosition] || detailMatches[0];
  if (detail) return `${link.label} · ${detail[1]}`;
  if (links.length === 1 && /^(?:video|lösung|erklärung)$/i.test(link.label)) return "Lösungsvideo";
  return link.label || `Lösungsvideo ${index + 1}`;
}

export function archiveItemsFromHtml(html) {
  const items = [];
  const stageNames = ["1. Stufe", "2. Stufe", "3. Stufe"];

  for (const tableMatch of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const tableHtml = tableMatch[1];
    const schoolYearMatch = textFromHtml(tableHtml).match(/(20\d{2})\s*\/\s*(\d{2,4})/);
    if (!schoolYearMatch) continue;
    const schoolYear = `${schoolYearMatch[1]}/${schoolYearMatch[2].slice(-2)}`;
    const idYear = schoolYear.replace("/", "-");
    const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];

    for (const rowMatch of rows) {
      const cells = cellsFromRow(rowMatch[1]);
      if (cells.length < 4) continue;
      const gradeMatch = textFromHtml(cells[0]).match(/Klasse\s*([34])/i);
      if (!gradeMatch) continue;
      const grade = Number(gradeMatch[1]);

      for (let stageIndex = 0; stageIndex < 3; stageIndex += 1) {
        const cellHtml = cells[stageIndex + 1] || "";
        const links = linksFromHtml(cellHtml);
        const pdfLink = links.find(link => /\.pdf(?:$|[?#])/i.test(link.url));
        if (!pdfLink) continue;

        const rawVideos = links.filter(link => {
          try {
            const hostname = new URL(link.url).hostname.toLowerCase();
            return hostname === "youtu.be" || hostname.endsWith("youtube.com");
          } catch {
            return false;
          }
        });
        const cellText = textFromHtml(cellHtml);
        const videos = rawVideos.map((link, index) => ({
          label: videoLabel(link, cellText, index, rawVideos),
          url: correctedVideoUrls.get(link.url.replace(/^http:/, "https:")) || link.url.replace(/^http:/, "https:")
        }));
        const stage = stageIndex + 1;
        const topicText = cellText
          .replace(/\bPDF\b/gi, " ")
          .replace(/\bVideo\b/gi, " ")
          .replace(/\s+/g, " ")
          .trim();

        items.push({
          id: `olympiade-${idYear}-k${grade}-s${stage}`,
          category: "olympiade",
          title: `Olympiade ${schoolYear} · Klasse ${grade}`,
          subtitle: `${stageNames[stageIndex]} · Klausur mit Lösung${videos.length === 1 ? "svideo" : videos.length > 1 ? "svideos" : ""}`,
          topics: topicText || `${stageNames[stageIndex]} Klasse ${grade}`,
          grade: `Klasse ${grade}`,
          year: schoolYear,
          stage,
          duration: videos.length > 1 ? `Klausur · ${videos.length} Videos` : videos.length ? "Klausur · Video" : "Klausur",
          video: videos[0]?.url || "",
          videos,
          pdf: pdfLink.url.replace(/^http:/, "https:"),
          worksheet: "",
          pages: null,
          searchText: topicText
        });
      }
    }
  }

  const unique = new Map(items.map(item => [item.id, item]));
  return [...unique.values()].sort((a, b) => b.year.localeCompare(a.year) || a.grade.localeCompare(b.grade) || a.stage - b.stage);
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
  const file = join(temporaryDirectory, `${item.id}.pdf`);
  try {
    const response = await fetch(item.pdf, {
      headers: { "User-Agent": "MO-Ni-Grundschul-App-Olympiadepflege/0.8.0" },
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pdf = Buffer.from(await response.arrayBuffer());
    if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("keine PDF-Datei");
    await writeFile(file, pdf);
    const extracted = await run(pdfToText, ["-layout", file, "-"]);
    const pages = extracted.split("\f").filter(page => page.trim()).length;
    item.pages = Math.max(1, pages);
    item.duration = `${item.pages} ${item.pages === 1 ? "Seite" : "Seiten"}${item.videos.length ? ` · ${item.videos.length === 1 ? "Video" : `${item.videos.length} Videos`}` : ""}`;
    item.searchText = cleanSearchText(`${item.topics} ${extracted}`);
    console.log(`[${index + 1}/${total}] ${item.title}, ${item.subtitle}: ${item.pages} Seiten indexiert`);
  } catch (error) {
    console.warn(`[${index + 1}/${total}] ${item.title}, ${item.subtitle}: nur Tabelleninhalt (${error.message})`);
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

async function main() {
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": "MO-Ni-Grundschul-App-Olympiadepflege/0.8.0" },
    signal: AbortSignal.timeout(45_000)
  });
  if (!response.ok) throw new Error(`Olympiadeseite nicht erreichbar: HTTP ${response.status}`);

  const html = await response.text();
  const items = archiveItemsFromHtml(html);
  if (items.length < 40) throw new Error(`Es wurden nur ${items.length} Olympiadeklausuren erkannt; Aktualisierung abgebrochen.`);

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "mo-ni-olympiade-"));
  try {
    const enriched = await mapWithLimit(items, 6, (item, index) => enrichItem(item, temporaryDirectory, index, items.length));
    const archive = {
      version: "0.8.0",
      source: sourceUrl,
      updatedAt: new Date().toISOString(),
      count: enriched.length,
      items: enriched
    };
    await writeFile(destination, `${JSON.stringify(archive, null, 2)}\n`, "utf8");
    console.log(`${enriched.length} Olympiadeklausuren nach ${destination} geschrieben.`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
