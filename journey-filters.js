const COMPETITIONS = Object.freeze(["olympiad", "kangaroo", "bolyai", "pangea"]);
const OPTIONS = Object.freeze([
  { id: "grade-3", label: "Klasse 3", dimension: "grades", value: 3 },
  { id: "grade-4", label: "Klasse 4", dimension: "grades", value: 4 },
  { id: "olympiad", label: "Mathe-Olympiade", dimension: "competitions", value: "olympiad" },
  { id: "kangaroo", label: "Mathe mit dem Känguru", dimension: "competitions", value: "kangaroo" },
  { id: "bolyai", label: "Bolyai-Teamwettbewerb", dimension: "competitions", value: "bolyai" },
  { id: "pangea", label: "Pangea Wettbewerb", dimension: "competitions", value: "pangea" },
  { id: "all", label: "Alle Inhalte", dimension: "all", value: "all" }
].map(Object.freeze));

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function competitionFromField(value) {
  const name = normalized(value).replace(/[\s_-]+/g, " ");
  if (["olympiad", "olympiade", "mo", "mathe olympiade", "mathematik olympiade"].includes(name)) return "olympiad";
  if (["kangaroo", "kanguru", "kaenguru", "mathe mit dem kanguru", "mathe mit dem kaenguru", "kanguru wettbewerb", "kaenguru wettbewerb"].includes(name)) return "kangaroo";
  if (["bolyai", "bolyai teamwettbewerb"].includes(name)) return "bolyai";
  if (["pangea", "pangea wettbewerb"].includes(name)) return "pangea";
  return "";
}

function gradesInLabel(value) {
  const match = String(value || "").match(/\bKlasse(?:n|nstufen)?\s*([3-6])(?:\s*(?:[–—/&,\-]|und)\s*([3-6]))?\b/i);
  if (!match) return null;
  const first = Number(match[1]);
  const last = match[2] ? Number(match[2]) : first;
  if (last < first) return [];
  return [3, 4].filter(grade => grade >= first && grade <= last);
}

/** Use source metadata or clearly named competitions; task topics alone are not a source. */
export function classifyJourneyItem(item = {}) {
  item = item || {};
  const moCode = String(item.code || "").match(/^(?:NI|MO)?\d{2}0([3-6])\d{2}$/i);
  const titles = [item.title, item.fullTitle].filter(value => typeof value === "string");
  let grades;
  if (Array.isArray(item.grades) && item.grades.length) {
    grades = [...new Set(item.grades.filter(grade => Number.isInteger(grade) && [3, 4].includes(grade)))];
  } else {
    grades = gradesInLabel(item.grade);
    if (grades === null && moCode) grades = [3, 4].includes(Number(moCode[1])) ? [Number(moCode[1])] : [];
    if (grades === null) grades = titles.map(gradesInLabel).find(value => value !== null) || [];
  }

  const explicit = [item.competition, item.competitionId,
    ...(Array.isArray(item.competitions) ? item.competitions : [])
  ].filter(value => typeof value === "string" && value.trim());
  const category = competitionFromField(item.category);
  let competitions;
  if (explicit.length) {
    competitions = [...new Set(explicit.map(competitionFromField).filter(Boolean))];
  } else if (category) {
    competitions = [category];
  } else {
    const found = new Set();
    if (moCode) found.add("olympiad");
    for (const title of titles) {
      const text = normalized(title);
      if (/\bmathe(?:matik)?[ -]olympiade\b/.test(text)) found.add("olympiad");
      if (/\b(?:mathe mit dem (?:kanguru|kaenguru)|(?:kanguru|kaenguru)[ -]wettbewerb|(?:kanguru|kaenguru) der mathematik|(?:kanguru|kaenguru)\s+20\d{2})\b/.test(text)) found.add("kangaroo");
      if (/\bbolyai(?:[ -]teamwettbewerb)?\b/.test(text)) found.add("bolyai");
      if (/\bpangea[ -]wettbewerb\b/.test(text)) found.add("pangea");
    }
    competitions = [...found];
  }
  return {
    grades: grades.sort((first, second) => first - second),
    competitions: COMPETITIONS.filter(competition => competitions.includes(competition))
  };
}

/** Empty dimensions mean no restriction. Never mutate the caller's selection. */
export function normalizeJourneySelection(selection = {}) {
  const grades = Array.isArray(selection?.grades) ? selection.grades : [];
  const competitions = Array.isArray(selection?.competitions) ? selection.competitions : [];
  return {
    grades: [3, 4].filter(grade => grades.some(value => String(value) === String(grade))),
    competitions: COMPETITIONS.filter(competition => competitions.includes(competition))
  };
}

export function toggleJourneyFilter(selection, id) {
  const next = normalizeJourneySelection(selection);
  if (id === "all") return { grades: [], competitions: [] };
  const option = OPTIONS.find(candidate => candidate.id === id);
  if (!option) return next;
  const values = next[option.dimension];
  next[option.dimension] = values.includes(option.value)
    ? values.filter(value => value !== option.value)
    : [...values, option.value];
  return normalizeJourneySelection(next);
}

function matchesClassifiedItem(classified, selection) {
  return (!selection.grades.length || selection.grades.some(grade => classified.grades.includes(grade)))
    && (!selection.competitions.length || selection.competitions.some(competition => classified.competitions.includes(competition)));
}

export function matchesJourneyFilters(item, selection = {}) {
  return matchesClassifiedItem(classifyJourneyItem(item), normalizeJourneySelection(selection));
}

export function filterJourneyItems(items = [], selection = {}) {
  const normalizedSelection = normalizeJourneySelection(selection);
  return items.filter(item => matchesClassifiedItem(classifyJourneyItem(item), normalizedSelection));
}

/** Counts describe the real collection, including zeroes for requested future categories. */
export function journeyFilterOptions(items = []) {
  const classified = items.map(classifyJourneyItem);
  return OPTIONS.map(option => ({
    ...option,
    count: option.dimension === "all"
      ? items.length
      : classified.filter(item => item[option.dimension].includes(option.value)).length
  }));
}
