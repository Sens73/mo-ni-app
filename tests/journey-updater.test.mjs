import assert from "node:assert/strict";
import { isMatheAgDate, mergeJourney, nextScheduledSlot, parseJourneyChannelPage, parseJourneyFeed, scheduleExclusions, updateJourneyFromFeed } from "../scripts/update-knobelreise.mjs";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const feed = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/"><entry><yt:videoId>newVideo123</yt:videoId><title>NI650312 | Zahlen geschickt ordnen | Mathematik-Olympiade</title><published>2026-09-04T13:30:00Z</published><media:description>Wir ordnen Zahlen Schritt für Schritt.\n\nMehr Informationen.</media:description></entry><entry><yt:videoId>ignored123</yt:videoId><title>#117 | Mathe-AG</title><published>2026-09-03T12:00:00Z</published></entry></feed>`;
const parsed = parseJourneyFeed(feed);
assert.equal(parsed.length, 1);
assert.equal(parsed[0].code, "NI650312");
assert.equal(parsed[0].title, "Zahlen geschickt ordnen");
assert.equal(parsed[0].summary, "Wir ordnen Zahlen Schritt für Schritt.");

const feedWithDownloadFirst = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/"><entry><yt:videoId>newVideo314</yt:videoId><title>NI650314 | Pluszeichen einsetzen | Mathematik-Olympiade</title><published>2026-09-09T12:00:13Z</published><media:description>Aufgabenblatt: https://www.mo-ni.de/app\n\nWo müssen die Pluszeichen stehen, damit die richtigen Ergebnisse entstehen?</media:description></entry></feed>`;
const parsedWithoutDownload = parseJourneyFeed(feedWithDownloadFirst);
assert.equal(parsedWithoutDownload[0].summary, "Wo müssen die Pluszeichen stehen, damit die richtigen Ergebnisse entstehen?");

const laterYearFeed = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/"><entry><yt:videoId>laterYear789</yt:videoId><title>NI660311 | Ein neuer Olympiadejahrgang</title><published>2027-09-01T12:00:00Z</published><media:description>Die Reise geht im neuen Jahrgang weiter.</media:description></entry></feed>`;
const laterYearVideos = parseJourneyFeed(laterYearFeed);
assert.equal(laterYearVideos.length, 1);
assert.equal(laterYearVideos[0].code, "NI660311");

const channelPage = `<script>var ytInitialData = ${JSON.stringify({
  contents: [{
    lockupViewModel: {
      contentId: "fallbackVideo456",
      metadata: { lockupMetadataViewModel: { title: { content: "NI650313 | Würfel geschickt zählen | Mathematik-Olympiade" } } }
    }
  }]
})};</script>`;
const channelVideos = parseJourneyChannelPage(channelPage, 650311, new Date("2026-09-09T12:00:00Z"));
assert.equal(channelVideos.length, 1);
assert.equal(channelVideos[0].code, "NI650313");
assert.equal(channelVideos[0].title, "Würfel geschickt zählen");
assert.equal(channelVideos[0].videoId, "fallbackVideo456");

const journey = {
  startCode: "NI650311",
  publicationSequence: ["NI650311", "NI650312", "NI650313", "NI650321"],
  schedule: {
    timeZone: "Europe/Berlin",
    weekdays: [2, 4],
    time: "14:00",
    skipTuesdayAfterMatheAg: true,
    matheAg: {
      weekday: 1,
      isoWeekParity: "even",
      skipDuringSchoolHolidays: true,
      schoolHolidays: [{ start: "2026-10-12", end: "2026-10-24", name: "Herbstferien 2026" }]
    }
  },
  videos: [{ code: "NI650311", sequence: 650311, title: "Rechenketten lösen", summary: "Handgepflegte Zusammenfassung", publishedAt: "2026-09-02T12:53:15Z" }]
};
const merged = mergeJourney(journey, parsed, new Date("2026-09-05T10:00:00Z"));
assert.deepEqual(merged.videos.map(video => video.code), ["NI650312", "NI650311"]);
assert.equal(merged.nextPublication.code, "NI650313");
assert.equal(new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(merged.nextPublication.scheduledAt)), "14:00");
assert.equal(merged.videos[1].summary, "Handgepflegte Zusammenfassung");

const editorialJourney = {
  ...journey,
  videos: [{ code: "NI650311", sequence: 650311, title: "Rechenketten lösen", publishedAt: "2026-09-02T12:53:15Z" }],
  nextPublication: {
    code: "NI650312",
    sequence: 650312,
    title: "Neues Knobelvideo",
    scheduledAt: "2026-09-07T12:00:00Z",
    confirmed: true,
    source: "editorial"
  }
};
const preserved = mergeJourney(editorialJourney, [], new Date("2026-09-05T10:00:00Z"));
assert.equal(preserved.nextPublication.scheduledAt, "2026-09-07T12:00:00Z");
assert.equal(preserved.nextPublication.source, "editorial");

const rescheduledJourney = {
  ...journey,
  publicationSequence: ["NI650315", "NI650316", "NI650321"],
  videos: [{ code: "NI650315", sequence: 650315, title: "Quader aus Würfeln", publishedAt: "2026-09-11T12:00:08Z" }],
  nextPublication: {
    code: "NI650316",
    sequence: 650316,
    title: "Magisches Labyrinth",
    scheduledAt: "2026-09-17T12:00:00.000Z",
    videoId: "",
    url: "",
    confirmed: true,
    source: "editorial"
  }
};
const rescheduled = mergeJourney(rescheduledJourney, [], new Date("2026-09-15T18:00:00Z"));
assert.deepEqual(rescheduled.nextPublication, rescheduledJourney.nextPublication, "The confirmed Thursday publication must not revert to the normal Wednesday slot.");

const scheduleContent = {
  dates: [
    { date: "2026-09-24", type: "Video-Pause" },
    { date: "2026-09-28", type: "Mathe-AG" }
  ]
};
const exclusions = scheduleExclusions(journey, scheduleContent);
assert.deepEqual([...exclusions], ["2026-09-24"]);
assert.equal(isMatheAgDate("2026-09-28", journey.schedule), true);
assert.equal(isMatheAgDate("2026-10-12", journey.schedule), false, "Eine gerade Ferienwoche erhält keine Mathe-AG.");
assert.equal(
  nextScheduledSlot(new Date("2026-09-07T12:01:00Z"), journey.schedule, exclusions),
  "2026-09-08T12:00:00.000Z"
);
assert.equal(
  nextScheduledSlot(new Date("2026-09-24T12:01:00Z"), journey.schedule, exclusions),
  "2026-10-01T12:00:00.000Z",
  "Der Dienstag nach der Mathe-AG entfällt."
);
assert.equal(
  nextScheduledSlot(new Date("2026-10-08T12:01:00Z"), journey.schedule, exclusions),
  "2026-10-13T12:00:00.000Z",
  "Während der Herbstferien findet keine Mathe-AG statt; das Dienstagsvideo bleibt."
);

const afterFirstRound = mergeJourney({
  ...journey,
  publicationSequence: ["NI650311", "NI650312", "NI650313", "NI650314", "NI650315", "NI650316", "NI650321"],
  videos: [311, 312, 313, 314, 315, 316].map(suffix => ({
    code: `NI650${suffix}`,
    sequence: Number(`650${suffix}`),
    title: "Veröffentlicht",
    publishedAt: "2026-09-17T12:00:00Z"
  }))
}, [], new Date("2026-09-18T10:00:00Z"));
assert.equal(afterFirstRound.nextPublication.code, "NI650321", "Nach NI650316 folgt die echte nächste Heftaufgabe NI650321.");
assert.equal(afterFirstRound.nextPublication.scheduledAt, "2026-09-22T12:00:00.000Z");

// Exercise the production Node -> Python handover in a disposable App root.
// The injected feed belongs only to this local probe; real App/source data stay intact.
const stage = await mkdtemp(resolve(tmpdir(), "mo-ni-complete-refresh-"));
try {
  const root = new URL("../", import.meta.url);
  const published = new URL("../v0.11-sonntagsraetsel/", root);
  const previewContent = JSON.parse(await readFile(new URL("data/content.json", root), "utf8"));
  const confirmedContent = JSON.parse(await readFile(new URL("data/content.json", published), "utf8"));
  const stagedContent = { ...previewContent, workbooks: confirmedContent.workbooks };
  await mkdir(resolve(stage, "data"));
  await writeFile(resolve(stage, "data/content.json"), JSON.stringify(stagedContent));
  await copyFile(new URL("data/journey.json", root), resolve(stage, "data/journey.json"));
  await copyFile(new URL(confirmedContent.workbooks.pdfUrl, published), resolve(stage, confirmedContent.workbooks.pdfUrl));
  const stagedJourney = JSON.parse(await readFile(resolve(stage, "data/journey.json"), "utf8"));
  // Keep the historical nine-to-ten-video transaction independent of the current catalogue.
  stagedJourney.videos = stagedJourney.videos.filter(video => video.sequence <= 650323);
  await writeFile(resolve(stage, "data/journey.json"), JSON.stringify(stagedJourney));
  const channelId = stagedJourney.channelId;
  const feedPath = resolve(stage, "test-feed.xml");
  const validFeed = entries => `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>${channelId}</yt:channelId><author><uri>https://www.youtube.com/channel/${channelId}</uri></author>${entries}</feed>`;
  await writeFile(feedPath, validFeed(""));
  const baselineJourney = await updateJourneyFromFeed({ appRoot: stage, feedFile: feedPath, now: new Date("2026-10-05T09:00:00Z"), log: false });
  assert.equal(baselineJourney.videos.length, 9);
  const beforeNew = JSON.parse(await readFile(resolve(stage, "data/content.json"), "utf8"));
  await writeFile(feedPath, validFeed(`<entry><title>NI650324 | Lokale Ablaufprobe</title><yt:channelId>${channelId}</yt:channelId><yt:videoId>ABCDEFGHIJK</yt:videoId><published>2026-10-05T08:00:00Z</published></entry>`));
  const updatedJourney = await updateJourneyFromFeed({ appRoot: stage, feedFile: feedPath, now: new Date("2026-10-05T09:00:00Z"), log: false });
  assert.equal(updatedJourney.videos.length, 10);
  const updatedContent = JSON.parse(await readFile(resolve(stage, "data/content.json"), "utf8"));
  assert.deepEqual({ ...updatedContent, workbooks: null }, { ...beforeNew, workbooks: null }, "Neue Heftlinks erhalten alle aktuellen 3/4- und 5/6-Inhalte.");
  assert.equal(updatedContent.workbooks.videoCount, 10);
  assert.notEqual(updatedContent.workbooks.pdfUrl, beforeNew.workbooks.pdfUrl);
  const pdfPath = resolve(stage, updatedContent.workbooks.pdfUrl);
  const pdfBytes = await readFile(pdfPath);
  assert.equal(pdfBytes.subarray(0, 5).toString(), "%PDF-");
  assert.equal(createHash("sha256").update(pdfBytes).digest("hex"), updatedContent.workbooks.sha256);
  const files = [resolve(stage, "data/content.json"), resolve(stage, "data/journey.json"), pdfPath];
  const beforeRepeat = await Promise.all(files.map(async path => [await readFile(path), (await stat(path)).mtimeMs]));
  await updateJourneyFromFeed({ appRoot: stage, feedFile: feedPath, now: new Date("2026-10-05T09:00:00Z"), log: false });
  for (let i = 0; i < files.length; i += 1) {
    assert.deepEqual(await readFile(files[i]), beforeRepeat[i][0]);
    assert.equal((await stat(files[i])).mtimeMs, beforeRepeat[i][1], "Unveränderte Inhalte erzeugen keine neue Ausgabe.");
  }
  await writeFile(feedPath, "Kein gültiger YouTube-Feed");
  await assert.rejects(updateJourneyFromFeed({ appRoot: stage, feedFile: feedPath, now: new Date("2026-10-05T09:00:00Z"), log: false }));
  for (let i = 0; i < files.length; i += 1) assert.deepEqual(await readFile(files[i]), beforeRepeat[i][0]);
} finally {
  await rm(stage, { recursive: true, force: true });
}

console.log("Validated NI schedules and the complete preview refresh: new QR-linked PDF, preserved 3/4 and 5/6 content, unchanged repeats and failure recovery.");
