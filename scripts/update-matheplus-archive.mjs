import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceUrl = "https://www.mo-ni.de/matheplus";
const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const destination = resolve(projectRoot, "data/matheplus.json");
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

function schoolYearFromUrl(url) {
  const match = url.match(/\/(20\d{2})_(20\d{2})\//);
  return match ? `${match[1]}/${match[2].slice(-2)}` : "Aktuell";
}

function periodLabel(value) {
  return value
    .replace(/\s*-\s*/, "–")
    .replace(/(\d{2}\.\d{2}\.)((?:20)\d{2})/g, "$1$2")
    .trim();
}

function archiveItemsFromHtml(html) {
  const items = [];
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = cellsFromRow(rowMatch[1]);
    if (cells.length < 4) continue;
    const series = Number(textFromHtml(cells[0]));
    if (!Number.isInteger(series) || series < 1 || series > 6) continue;
    const period = periodLabel(textFromHtml(cells[1]));

    for (const grade of [3, 4, 5, 6, 7]) {
      const gradeCell = cells[grade - 1] || "";
      const pdfLink = linksFromHtml(gradeCell).find(link => /\.pdf(?:$|[?#])/i.test(link.url));
      if (!pdfLink) continue;
      const year = schoolYearFromUrl(pdfLink.url);
      const idYear = year.replace("/", "-").toLowerCase();
      items.push({
        id: `matheplus-${idYear}-k${grade}-s${series}`,
        category: "matheplus",
        title: `Mathe Plus ${year} · Klasse ${grade}`,
        subtitle: `Serie ${series} · Bearbeitungszeitraum ${period}`,
        topics: `Mathe Plus Serie ${series} Klasse ${grade} Bearbeitungszeitraum ${period}`,
        grade: `Klasse ${grade}`,
        grades: [grade],
        year,
        series,
        period,
        duration: "Aufgabenblatt",
        video: "",
        videos: [],
        pdf: pdfLink.url,
        worksheet: "",
        pages: null,
        searchText: ""
      });
    }
  }

  const unique = new Map(items.map(item => [item.id, item]));
  return [...unique.values()].sort((a, b) => b.year.localeCompare(a.year) || b.series - a.series || a.grade.localeCompare(b.grade));
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
      headers: { "User-Agent": "MO-Ni-Grundschul-App-MathePluspflege/0.9.0" },
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pdf = Buffer.from(await response.arrayBuffer());
    if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("keine PDF-Datei");
    await writeFile(file, pdf);
    const extracted = await run(pdfToText, ["-layout", file, "-"]);
    const pages = extracted.split("\f").filter(page => page.trim()).length;
    item.pages = Math.max(1, pages);
    item.duration = `${item.pages} ${item.pages === 1 ? "Seite" : "Seiten"}`;
    item.searchText = cleanSearchText(`${item.topics} ${extracted}`);
    console.log(`[${index + 1}/${total}] ${item.title}, Serie ${item.series}: ${item.pages} Seiten indexiert`);
  } catch (error) {
    console.warn(`[${index + 1}/${total}] ${item.title}, Serie ${item.series}: nur Tabelleninhalt (${error.message})`);
    item.searchText = item.topics;
  }
  return item;
}

const response = await fetch(sourceUrl, {
  headers: { "User-Agent": "MO-Ni-Grundschul-App-MathePluspflege/0.9.0" },
  signal: AbortSignal.timeout(45_000)
});
if (!response.ok) throw new Error(`MathePlus-Seite nicht erreichbar: HTTP ${response.status}`);

const html = await response.text();
const items = archiveItemsFromHtml(html);
if (items.length < 4) throw new Error(`Es wurden nur ${items.length} MathePlus-Blätter für Klasse 3–7 erkannt; Aktualisierung abgebrochen.`);

const temporaryDirectory = await mkdtemp(join(tmpdir(), "mo-ni-matheplus-"));
try {
  const enriched = await Promise.all(items.map((item, index) => enrichItem(item, temporaryDirectory, index, items.length)));
  const archive = {
    version: "0.9.0",
    source: sourceUrl,
    updatedAt: new Date().toISOString(),
    count: enriched.length,
    items: enriched
  };
  await writeFile(destination, `${JSON.stringify(archive, null, 2)}\n`, "utf8");
  console.log(`${enriched.length} MathePlus-Blätter nach ${destination} geschrieben.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
