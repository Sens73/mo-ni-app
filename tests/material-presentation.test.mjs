import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { primaryMaterialPresentation, upcomingAgDate } from "../material-presentation.js";

const thumbnail = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const videoId = "abcdefghijk";
for (const url of [
  `https://youtube.com/live/${videoId}`,
  `https://www.youtube.com/watch?v=${videoId}&t=30`,
  `https://youtu.be/${videoId}?si=public-share`,
  `https://www.youtube.com/embed/${videoId}`,
  `https://www.youtube-nocookie.com/embed/${videoId}`
]) {
  assert.equal(primaryMaterialPresentation({ video: url }).thumbnail, thumbnail(videoId), url);
}
for (const url of [
  "", "not a URL", "./relative-video", "https://youtube.com/watch?v=short",
  `https://youtube.com.evil.example/watch?v=${videoId}`,
  `https://notyoutube.com/watch?v=${videoId}`,
  `https://youtu.be/${videoId}/extra`,
  `ftp://youtube.com/watch?v=${videoId}`,
  `https://example.com/embed/${videoId}`
]) {
  assert.equal(primaryMaterialPresentation({ video: url }).thumbnail, "", url);
}
assert.equal(primaryMaterialPresentation().thumbnail, "");
assert.deepEqual(primaryMaterialPresentation().meta, []);
assert.equal(primaryMaterialPresentation({ thumbnail: "./assets/custom.png?v=20261004", video: "invalid" }).thumbnail, "./assets/custom.png?v=20261004");
assert.equal(primaryMaterialPresentation({ thumbnail: "  ", video: `https://youtu.be/${videoId}` }).thumbnail, thumbnail(videoId));
assert.equal(primaryMaterialPresentation({ video: `https://youtu.be/${videoId}`, videos: [{ url: "https://youtu.be/lmnopqrstuv" }] }).thumbnail, thumbnail("lmnopqrstuv"), "The preview belongs to the first selectable video.");
assert.deepEqual(primaryMaterialPresentation({category:"olympiade", year: "2025/26", pages: 1 }).meta, []);
assert.deepEqual(primaryMaterialPresentation({ pages: -1 }).meta, []);

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const ag = deepFreeze(JSON.parse(await readFile(new URL("../data/mathe-ag.json", import.meta.url), "utf8")));
const olympiad = deepFreeze(JSON.parse(await readFile(new URL("../data/olympiade.json", import.meta.url), "utf8")));
assert.equal(ag.items.length, 120);
assert.equal(olympiad.items.length, 49);
const original = JSON.stringify({ ag, olympiad });
let checkedVideos = 0;
for (const item of [...ag.items, ...olympiad.items]) {
  const presentation = primaryMaterialPresentation(item);
  assert.equal(presentation.title, item.category === "olympiade" ? item.title.replace(/^Olympiade/, "Mathe-Olympiade") : item.title, item.id);
  assert.equal(presentation.subtitle, item.subtitle, `${item.id}: keep the source topic or stage.`);
  assert.deepEqual(presentation.meta, item.category === "mathe-ag" ? [`Schuljahr ${item.year}`] : [], item.id);
  assert.ok(!presentation.meta.some(value => /Seiten?/.test(value)), item.id);
  assert.match(presentation.thumbnail, /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/hqdefault\.jpg$/, item.id);
  for (const video of item.videos) {
    const url = new URL(video.url);
    const id = url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : url.pathname.startsWith("/live/")
        ? url.pathname.slice(6)
        : url.searchParams.get("v");
    assert.match(id || "", /^[A-Za-z0-9_-]{11}$/, `${item.id}: valid source video URL.`);
    assert.equal(primaryMaterialPresentation({ video: video.url }).thumbnail, thumbnail(id), `${item.id}: supported source video URL.`);
    checkedVideos += 1;
  }
}
assert.equal(checkedVideos, 225);
const ag79 = ag.items.find(item => item.number === 79);
assert.equal(ag79.videos.length, 3);
assert.equal(primaryMaterialPresentation(ag79).thumbnail, thumbnail("mjdGAnsjdaM"));
const ag78 = ag.items.find(item => item.number === 78);
assert.equal(ag78.pdf, "");
assert.equal(ag78.worksheet, "https://www.mathe-kaenguru.de/chronik/aufgaben/index.html");
assert.ok(!("pdf" in primaryMaterialPresentation(ag78)), "Presentation must not invent a PDF link.");
const ag118 = ag.items.find(item => item.number === 118);
const content = JSON.parse(await readFile(new URL("../data/content.json",import.meta.url),"utf8"));
const options = {dates:content.dates,now:new Date("2026-10-04T12:00:00Z")};
assert.deepEqual(primaryMaterialPresentation(ag118,options).meta,[ag118.date,"Schuljahr 2026/27"]);
assert.deepEqual(primaryMaterialPresentation(ag.items.find(item => item.number === 117),options).meta,["Schuljahr 2026/27"]);
assert.equal(upcomingAgDate(ag118,content.dates,new Date("2026-10-26T15:29:59Z")),ag118.date,"During the planned stream, the announcement still helps.");
assert.equal(upcomingAgDate(ag118,content.dates,new Date("2026-10-26T15:30:00Z")),"","At the end (16:30 in Berlin), the date expires.");
assert.deepEqual(primaryMaterialPresentation(ag118,{dates:content.dates,now:new Date("2026-10-27T09:00:00Z")}).meta,["Schuljahr 2026/27"]);
assert.equal(upcomingAgDate(ag118,[],options.now),"","Do not guess an event date from unstructured archive text.");
assert.equal(upcomingAgDate(ag118,[{...content.dates.find(item=>item.id==="ag-118"),preview:true}],options.now),"");
assert.equal(upcomingAgDate(ag118,content.dates,new Date("invalid")),"");
const summerEvent={id:"ag-118",date:"2026-06-01",time:"15:30–ca. 16:30",type:"Mathe-AG"};
assert.equal(upcomingAgDate(ag118,[summerEvent],new Date("2026-06-01T14:29:59Z")),ag118.date);
assert.equal(upcomingAgDate(ag118,[summerEvent],new Date("2026-06-01T14:30:00Z")),"","The cutoff also respects summer time.");
assert.equal(primaryMaterialPresentation(olympiad.items[0]).title, "Mathe-Olympiade 2025/26 · Klasse 3");
assert.equal(JSON.stringify({ ag, olympiad }), original, "Rendering must not mutate the archives, links or multiple-video arrays.");
console.log("Material presentation: 120 AG and 49 Olympiad cards, all 225 video URLs, multiple videos, task link and future-only dates and their expiry in winter/summer time verified.");
