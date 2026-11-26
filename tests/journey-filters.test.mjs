import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  classifyJourneyItem, normalizeJourneySelection, toggleJourneyFilter,
  matchesJourneyFilters, filterJourneyItems, journeyFilterOptions
} from "../journey-filters.js";

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
const journey = deepFreeze(JSON.parse(await readFile(new URL("../data/journey.json", import.meta.url), "utf8")));
const videos = journey.videos;
const sourceSnapshot = JSON.stringify(journey);
assert.ok(videos.length >= 15);
videos.forEach(video => {
  assert.deepEqual(classifyJourneyItem(video), { grades: [3], competitions: ["olympiad"] }, video.code);
  assert.equal(matchesJourneyFilters(video, { grades: [3], competitions: ["olympiad"] }), true);
});
const nextGrade = Number(journey.nextPublication.code.slice(5, 6));
assert.ok([3, 4].includes(nextGrade), "The next Knobelreise task is a grade-3 or grade-4 Olympiad task.");
assert.deepEqual(classifyJourneyItem(journey.nextPublication), { grades: [nextGrade], competitions: ["olympiad"] });
assert.equal(filterJourneyItems(videos).length, videos.length);
assert.equal(filterJourneyItems(videos, { grades: [3, 4], competitions: ["olympiad"] }).length, videos.length);
assert.equal(filterJourneyItems(videos, { grades: [4] }).length, 0);
assert.equal(filterJourneyItems(videos, { competitions: ["kangaroo", "bolyai", "pangea"] }).length, 0);
const options = journeyFilterOptions(videos);
assert.deepEqual(options.map(({ id, count }) => [id, count]), [
  ["grade-3", videos.length], ["grade-4", 0], ["olympiad", videos.length], ["kangaroo", 0], ["bolyai", 0], ["pangea", 0], ["all", videos.length]
]);
assert.equal(options.find(option => option.id === "pangea").label, "Pangea Wettbewerb");

const futureSources = deepFreeze([
  { id: "mo4", code: "NI650411", title: "Frühstücksmöglichkeiten" },
  { id: "kangaroo34", title: "Mathe mit dem Känguru 2027 | Würfel bauen", grades: [3, 4] },
  { id: "bolyai3", title: "Bolyai-Teamwettbewerb 2027 | Zahlen finden", grade: "Klasse 3" },
  { id: "pangea4", title: "Pangea Wettbewerb | Figuren legen", fullTitle: "Pangea Wettbewerb Klasse 4" },
  { id: "explicit-kangaroo", title: "Viele Dreiecke", grades: [4], competition: "Känguru" },
  { id: "unknown", title: "Eine knifflige Aufgabe" }
]);
const futureSnapshot = JSON.stringify(futureSources);
assert.deepEqual(classifyJourneyItem(futureSources[0]), { grades: [4], competitions: ["olympiad"] });
assert.deepEqual(classifyJourneyItem(futureSources[1]), { grades: [3, 4], competitions: ["kangaroo"] });
assert.deepEqual(classifyJourneyItem(futureSources[2]), { grades: [3], competitions: ["bolyai"] });
assert.deepEqual(classifyJourneyItem(futureSources[3]), { grades: [4], competitions: ["pangea"] });
assert.deepEqual(classifyJourneyItem(futureSources[4]), { grades: [4], competitions: ["kangaroo"] });
assert.deepEqual(classifyJourneyItem(futureSources[5]), { grades: [], competitions: [] });
assert.deepEqual(classifyJourneyItem({ title: "Ein Känguru springt über Pangea", archiveType: "olympiad" }), { grades: [], competitions: [] }, "Animal names, continents and derived archive labels are not competition sources.");
assert.deepEqual(classifyJourneyItem({ competition: "Pangea Wettbewerb", grades: [4], code: "NI650311", title: "Ein Vergleich mit der Mathematik-Olympiade" }), { grades: [4], competitions: ["pangea"] }, "Explicit source metadata takes precedence over secondary mentions.");
assert.deepEqual(classifyJourneyItem({ competition: "Unknown contest", title: "Vergleich mit der Mathematik-Olympiade" }).competitions, []);
assert.deepEqual(classifyJourneyItem({ category: "pangea", title: "Vergleich mit der Mathematik-Olympiade" }).competitions, ["pangea"]);
assert.deepEqual(classifyJourneyItem({ title: "Mathematik-Olympiade Klasse 3 und 4" }), { grades: [3, 4], competitions: ["olympiad"] });
assert.deepEqual(classifyJourneyItem({ code: "NI650511", title: "Mathematik-Olympiade Klasse 5" }).grades, []);

const ids = (selection) => filterJourneyItems(futureSources, selection).map(item => item.id);
assert.deepEqual(ids({ grades: [3, 4], competitions: ["olympiad", "kangaroo"] }), ["mo4", "kangaroo34", "explicit-kangaroo"], "Classes use OR, competitions use OR, both dimensions use AND.");
assert.deepEqual(ids({ grades: [3], competitions: ["kangaroo", "bolyai"] }), ["kangaroo34", "bolyai3"]);
assert.deepEqual(ids({ grades: [4], competitions: ["bolyai", "pangea"] }), ["pangea4"]);
assert.equal(ids({}).length, 6, "No selection keeps all real items, including unclassified sources.");
assert.deepEqual(ids({ competitions: ["pangea"] }), ["pangea4"]);
assert.equal(matchesJourneyFilters(futureSources[5], { grades: [3] }), false);
assert.equal(matchesJourneyFilters(futureSources[5], { competitions: ["olympiad"] }), false);

const selection = deepFreeze({ grades: [3], competitions: ["kangaroo"] });
assert.deepEqual(toggleJourneyFilter(selection, "grade-4"), { grades: [3, 4], competitions: ["kangaroo"] });
assert.deepEqual(toggleJourneyFilter(selection, "kangaroo"), { grades: [3], competitions: [] });
assert.deepEqual(toggleJourneyFilter(selection, "all"), { grades: [], competitions: [] }, "All contents resets both dimensions.");
assert.deepEqual(toggleJourneyFilter({ grades: [], competitions: [] }, "olympiad"), { grades: [], competitions: ["olympiad"] });
assert.deepEqual(toggleJourneyFilter(selection, "unknown"), selection);
assert.deepEqual(normalizeJourneySelection({ grades: [3, "4", 4, 5], competitions: ["pangea", "unknown", "pangea"] }), { grades: [3, 4], competitions: ["pangea"] });
assert.deepEqual(normalizeJourneySelection({ grades: "legacy value", competitions: "unknown value" }), { grades: [], competitions: [] });
assert.deepEqual(selection, { grades: [3], competitions: ["kangaroo"] });
assert.notEqual(filterJourneyItems(videos), videos, "Filtering returns a new list.");
assert.equal(filterJourneyItems(videos)[0], videos[0], "Filtering preserves source-item identity.");
options[0].label = "Local UI change";
assert.equal(journeyFilterOptions(videos)[0].label, "Klasse 3", "UI callers cannot alter shared filter definitions.");
assert.equal(JSON.stringify(journey), sourceSnapshot);
assert.equal(JSON.stringify(futureSources), futureSnapshot);
console.log(`Journey filters: ${videos.length} actual sources, honest zero counts, safe classifications, OR/AND multiple selection, reset and immutable sources verified.`);
