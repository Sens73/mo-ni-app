import { gradesFor } from "../audience.js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const runFile = promisify(execFile);
const workbookWorker = fileURLToPath(new URL("../../../Serverautomatisierung/arbeitsheft/sync-workbook.py", import.meta.url));

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function tag(entry, name) {
  return decodeXml(entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1]?.trim() || "");
}

function summarize(description) {
  const paragraphs = description.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean);
  const paragraph = paragraphs.find(value => !/(?:https?:\/\/|www\.)/i.test(value)) || paragraphs[0] || "";
  return paragraph.length > 220 ? `${paragraph.slice(0, 217).trim()}…` : paragraph;
}

function isUsefulSummary(value = "") {
  return Boolean(value.trim()) && !/(?:https?:\/\/|www\.)/i.test(value);
}

function splitJourneyTitle(fullTitle, codeMatch) {
  const titleParts = fullTitle.split("|").map(value => value.trim()).filter(Boolean);
  return titleParts[1] || fullTitle.replace(codeMatch[0], "").replace(/^\s*[-–—|:]\s*/, "").trim();
}

export function parseJourneyFeed(xml, startSequence = 650311) {
  const videos = [];
  for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const entry = match[1];
    const fullTitle = tag(entry, "title");
    const codeMatch = fullTitle.match(/\bNI(\d{6})\b/i);
    if (!codeMatch) continue;
    const sequence = Number(codeMatch[1]);
    if (sequence < startSequence) continue;

    const videoId = tag(entry, "yt:videoId");
    const publishedAt = tag(entry, "published");
    if (!videoId || !publishedAt) continue;
    const shortTitle = splitJourneyTitle(fullTitle, codeMatch);
    videos.push({
      code: `NI${sequence}`,
      sequence,
      title: shortTitle || `Etappe ${sequence}`,
      fullTitle,
      summary: summarize(tag(entry, "media:description")),
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: new Date(publishedAt).toISOString()
    });
  }
  return videos.sort((a, b) => b.sequence - a.sequence);
}

export function parseJourneyChannelPage(html, startSequence = 650311, discoveredAt = new Date()) {
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf(";</script>", jsonStart);
  if (jsonEnd < 0) return [];

  let initialData;
  try {
    initialData = JSON.parse(html.slice(jsonStart, jsonEnd));
  } catch {
    return [];
  }

  const videos = new Map();
  const visit = value => {
    if (!value || typeof value !== "object") return;
    const lockup = value.lockupViewModel;
    if (lockup) {
      const fullTitle = lockup.metadata?.lockupMetadataViewModel?.title?.content || "";
      const codeMatch = fullTitle.match(/\bNI(\d{6})\b/i);
      const sequence = Number(codeMatch?.[1]);
      const videoId = lockup.contentId
        || lockup.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId
        || "";
      if (codeMatch && sequence >= startSequence && videoId) {
        videos.set(`NI${sequence}`, {
          code: `NI${sequence}`,
          sequence,
          title: splitJourneyTitle(fullTitle, codeMatch) || `Etappe ${sequence}`,
          fullTitle,
          summary: `Ein neues Knobelvideo mit einer Aufgabe der ${String(sequence).slice(0, 2)}. Mathematik-Olympiade.`,
          videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          publishedAt: new Date(discoveredAt).toISOString()
        });
      }
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(initialData);
  return [...videos.values()].sort((a, b) => b.sequence - a.sequence);
}

function dateParts(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(value);
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
}

function dateKey(value, timeZone) {
  const parts = dateParts(value, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function addCalendarDays(value, days) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
}

function localDateTimeToIso(localDate, time, timeZone) {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(target);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = dateParts(candidate, timeZone);
    const difference = target - Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    if (difference === 0) break;
    candidate = new Date(candidate.getTime() + difference);
  }
  return candidate.toISOString();
}

function isoWeekNumber(localDate) {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86_400_000) + 1) / 7);
}

export function scheduleExclusions(journey, content = {}) {
  const schedule = journey.schedule || {};
  return new Set([
    ...(schedule.excludedVideoDates || []),
    ...(content.dates || []).filter(entry => entry.type === "Video-Pause").map(entry => entry.date)
  ]);
}

function isSchoolHoliday(localDate, matheAg = {}) {
  return (matheAg.schoolHolidays || []).some(period =>
    localDate >= period.start && localDate <= period.end
  );
}

export function isMatheAgDate(localDate, schedule = {}) {
  const matheAg = schedule.matheAg || {};
  const weekday = new Date(`${localDate}T12:00:00Z`).getUTCDay();
  if (weekday !== Number(matheAg.weekday ?? 1)) return false;
  const parity = matheAg.isoWeekParity || "even";
  const week = isoWeekNumber(localDate);
  if (parity === "even" && week % 2 !== 0) return false;
  if (parity === "odd" && week % 2 !== 1) return false;
  if (matheAg.skipDuringSchoolHolidays !== false && isSchoolHoliday(localDate, matheAg)) return false;
  return true;
}

export function nextScheduledSlot(reference, schedule = {}, excludedDates = new Set()) {
  const weekdays = schedule.weekdays || [2, 4];
  const time = schedule.time || "14:00";
  const timeZone = schedule.timeZone || "Europe/Berlin";
  const referenceDate = dateKey(reference, timeZone);
  for (let offset = 0; offset <= 21; offset += 1) {
    const localDate = addCalendarDays(referenceDate, offset);
    const weekday = new Date(`${localDate}T12:00:00Z`).getUTCDay();
    if (!weekdays.includes(weekday) || excludedDates.has(localDate)) continue;
    if (weekday === 2 && schedule.skipTuesdayAfterMatheAg === true) {
      const monday = addCalendarDays(localDate, -1);
      if (isMatheAgDate(monday, schedule)) continue;
    }
    const candidate = localDateTimeToIso(localDate, time, timeZone);
    if (new Date(candidate) > reference) return candidate;
  }
  throw new Error("Kein nächster Veröffentlichungstermin gefunden.");
}

export function mergeJourney(journey, feedVideos, now = new Date(), { content = {} } = {}) {
  const startSequence = Number(String(journey.startCode).replace(/^NI/i, ""));
  const byCode = new Map(journey.videos.map(video => [video.code, video]));
  const upcoming = [];

  for (const video of feedVideos.filter(video => video.sequence >= startSequence)) {
    if (new Date(video.publishedAt) > now) {
      upcoming.push(video);
      continue;
    }
    const previous = byCode.get(video.code);
    byCode.set(video.code, {
      ...previous,
      ...video,
      grades: gradesFor(video).length ? gradesFor(video) : gradesFor(previous),
      summary: isUsefulSummary(previous?.summary) ? previous.summary : video.summary,
      publishedAt: previous?.publishedAt || video.publishedAt || now.toISOString()
    });
  }

  const videos = [...byCode.values()].map(video => ({...video, grades: gradesFor(video)})).sort((a, b) => b.sequence - a.sequence);
  const plannedCodes = new Set(journey.publicationSequence || []);
  const scheduleVideos = plannedCodes.size ? videos.filter(video => plannedCodes.has(video.code)) : videos.filter(video => gradesFor(video).some(grade => grade === 3 || grade === 4));
  const latestSequence = Math.max(startSequence - 1, ...scheduleVideos.map(video => Number(video.sequence)));
  const publishedCodes = new Set(videos.map(video => video.code));
  const plannedCode = (journey.publicationSequence || []).find(code => !publishedCodes.has(code));
  const plannedSequence = plannedCode ? Number(plannedCode.replace(/^NI/i, "")) : latestSequence + 1;
  const nextVideo = upcoming
    .filter(video => !plannedCode || video.code === plannedCode)
    .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt))[0];
  const nextSequence = nextVideo?.sequence || plannedSequence;
  const nextCode = nextVideo?.code || plannedCode || `NI${nextSequence}`;
  const editorialNext = journey.nextPublication;
  const editorialDate = editorialNext?.scheduledAt ? new Date(editorialNext.scheduledAt) : null;
  const keepEditorialDate = !nextVideo
    && editorialNext?.confirmed === true
    && Number(editorialNext.sequence) === nextSequence
    && editorialDate
    && !Number.isNaN(editorialDate.valueOf())
    && editorialDate > now;
  return {
    ...journey,
    updatedAt: now.toISOString(),
    nextPublication: plannedCodes.size && !plannedCode ? null : nextVideo ? {
      code: nextVideo.code,
      sequence: nextVideo.sequence,
      title: nextVideo.title,
      scheduledAt: nextVideo.publishedAt,
      videoId: nextVideo.videoId,
      url: nextVideo.url,
      source: "youtube",
      confirmed: true
    } : keepEditorialDate ? editorialNext : {
    code: nextCode,
      sequence: nextSequence,
      title: "Neues Knobelvideo",
      scheduledAt: nextScheduledSlot(now, journey.schedule, scheduleExclusions(journey, content)),
      videoId: "",
      url: "",
      source: "schedule",
      confirmed: false
    },
    videos
  };
}

export async function updateJourneyFromFeed({ now = new Date(), log = true, appRoot = projectRoot, feedFile } = {}) {
  // Use the same validated journey -> QR fields -> immutable PDF -> App pointer
  // transaction as the published version. Preview work never writes its TeX source.
  const environment = { ...process.env };
  if (process.platform === "darwin" && !environment.SSL_CERT_FILE && existsSync("/etc/ssl/cert.pem")) {
    environment.SSL_CERT_FILE = "/etc/ssl/cert.pem";
  }
  const args = [workbookWorker, "--app-root", appRoot, "--now", now.toISOString()];
  if (feedFile) args.push("--feed-file", feedFile);
  const { stdout } = await runFile(process.env.MO_NI_WORKBOOK_PYTHON || "python3", args,
    { timeout: 90_000, maxBuffer: 1024 * 1024, env: environment });
  if (log) console.log(stdout.trim());
  return JSON.parse(await readFile(resolve(appRoot, "data/journey.json"), "utf8"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await updateJourneyFromFeed();
}
