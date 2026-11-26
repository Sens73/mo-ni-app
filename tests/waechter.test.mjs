import assert from "node:assert/strict";
import { missingWorksheets, missingJourneyVideos } from "../scripts/waechter.mjs";

const page = `<a href="/fileadmin/JagtMrX/Mathe_AG/AG_120.pdf">120</a> <a href="https://www.mo-ni.de/fileadmin/JagtMrX/Mathe_AG/AG_121.pdf?v=2">121</a>
  <a href="/fileadmin/user_upload/M%C3%B6bius__Vorlage_A3_.pdf">Vorlage</a> <a href="/fileadmin/JagtMrX/Mathe_AG/AG_122.pdf">neu</a>`;
const items = [{ pdf: "https://www.mo-ni.de/fileadmin/JagtMrX/Mathe_AG/AG_120.pdf" }, { pdf: "https://www.mo-ni.de/fileadmin/JagtMrX/Mathe_AG/AG_121.pdf?v=1" }];
assert.deepEqual(missingWorksheets(page, items), ["https://www.mo-ni.de/fileadmin/jagtmrx/mathe_ag/ag_122.pdf"],
  "Only the new sheet is reported; version suffixes and listed exceptions are ignored.");

const feed = `<feed><entry><yt:videoId>aaa</yt:videoId><title>NI650336 Würfel</title></entry>
  <entry><yt:videoId>bbb</yt:videoId><title>NI650341 Neue Aufgabe</title></entry>
  <entry><yt:videoId>ccc</yt:videoId><title>Sonntagsrätsel #08</title></entry></feed>`;
const journey = { publicationSequence: ["NI650336", "NI650341"], videos: [{ videoId: "aaa" }] };
assert.deepEqual(missingJourneyVideos(feed, journey), ["NI650341: NI650341 Neue Aufgabe (https://youtu.be/bbb)"]);

console.log("Wächter: neue Blätter und Knobelreise-Videos werden erkannt, Ausnahmen und Versionszusätze nicht gemeldet.");
