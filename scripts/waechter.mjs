// Wächter: Fehlt in der veröffentlichten App etwas, das auf mo-ni.de oder YouTube schon öffentlich ist?
// Läuft täglich auf GitHub (ohne Andreas' Mac). Findet er etwas, endet er mit Fehler und GitHub schickt eine E-Mail.
// Aufruf: node scripts/waechter.mjs [--nur-bericht] [--app=https://www.mo-ni.de/fileadmin/grundschule-app-test/]
import { readFile } from "node:fs/promises";

const option = name => process.argv.find(argument => argument.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const APP = new URL(option("app") || "https://www.mo-ni.de/fileadmin/grundschule-app-test/");
const REPORT_ONLY = process.argv.includes("--nur-bericht");
const HEADERS = { "User-Agent": "MO-Ni-App-Waechter/1.0 (+https://www.mo-ni.de/app)" };
// Bewusst nicht in der App: Lösungen, Hinweisblätter u. Ä. Ein Eintrag je Zeile, Teil der Adresse genügt.
const exceptions = JSON.parse(await readFile(new URL("./waechter-ausnahmen.json", import.meta.url), "utf8").catch(() => "[]"));

async function fetchText(url) {
  const response = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} antwortet mit ${response.status}`);
  return response.text();
}
const fetchJson = async url => JSON.parse(await fetchText(url));
const normalize = href => {
  try { const url = new URL(href.replace(/&amp;/g, "&"), "https://www.mo-ni.de/"); url.hash = ""; return decodeURI(url.href).toLowerCase(); } catch { return ""; }
};
const excepted = href => exceptions.some(part => href.includes(String(part).toLowerCase()));

// Aufgabenblätter: Jede PDF auf der Quellseite sollte in der App vorkommen.
export function missingWorksheets(pageHtml, appItems) {
  const inApp = new Set(appItems.flatMap(item => [item.pdf, item.worksheet, ...(item.pdfs || []).map(entry => entry.url || entry)]).filter(Boolean).map(normalize));
  const onPage = new Set([...pageHtml.matchAll(/href\s*=\s*["']([^"']+\.pdf)(?:[?#][^"']*)?["']/gi)].map(match => normalize(match[1])).filter(Boolean));
  return [...onPage].filter(href => !inApp.has(href) && !excepted(href)).sort();
}

// Knobelreise: Jedes öffentliche Video der Aufgabenfolge sollte in der App sein.
export function missingJourneyVideos(feedXml, journey) {
  const codes = new Set((journey.publicationSequence || []).map(code => String(code).trim()));
  const inApp = new Set((journey.videos || []).map(video => video.videoId));
  return [...feedXml.matchAll(/<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]*)<\/title>[\s\S]*?<\/entry>/g)]
    .map(([, videoId, title]) => ({ videoId, title, code: [...codes].find(code => title.includes(code)) }))
    .filter(entry => entry.code && !inApp.has(entry.videoId))
    .map(entry => `${entry.code}: ${entry.title} (https://youtu.be/${entry.videoId})`);
}

async function main() {
  const findings = [];
  const notes = [];
  for (const [label, file] of [["Mathe-AG 3/4", "mathe-ag"], ["Mathe-AG 5/6", "mathe-ag-56"], ["Olympiade", "olympiade"], ["MathePlus", "matheplus"]]) {
    try {
      const data = await fetchJson(new URL(`data/${file}.json`, APP));
      const missing = missingWorksheets(await fetchText(data.source), data.items || []);
      notes.push(`${label}: ${data.items?.length || 0} Einträge in der App, ${missing.length} fehlen`);
      for (const href of missing) findings.push(`${label}: ${href}`);
    } catch (error) {
      findings.push(`${label}: Prüfung nicht möglich (${error.message})`);
    }
  }
  try {
    const journey = await fetchJson(new URL("data/journey.json", APP));
    const missing = missingJourneyVideos(await fetchText(journey.feedUrl), journey);
    notes.push(`Knobelreise: ${journey.videos?.length || 0} Videos in der App, ${missing.length} fehlen`);
    for (const entry of missing) findings.push(`Knobelreise: ${entry}`);
  } catch (error) {
    findings.push(`Knobelreise: Prüfung nicht möglich (${error.message})`);
  }

  console.log(notes.join("\n"));
  if (!findings.length) return console.log("\n✓ Die App auf mo-ni.de ist auf dem Stand der öffentlichen Seiten.");
  console.log(`\n${findings.length} Hinweis(e):\n${findings.map(line => `✗ ${line}`).join("\n")}`);
  if (!REPORT_ONLY) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
