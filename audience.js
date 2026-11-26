// Shared selection rules: explicit grade metadata first; legacy labels/codes as fallback.
export const AUDIENCES = { "34": [3, 4], "56": [5, 6], "713": [7, 8, 9, 10, 11, 12, 13] };
export function availableDestination(audience, view, tab = "mathe-ag") {
  audience = validAudience(audience);
  const tabs = audience === "713" ? ["olympiade", "bist-du-fit"] : ["mathe-ag", "olympiade", "matheplus"];
  const views = ["home", "games", "dates", "more", "journey", "kangaroo", "training", ...(audience === "713" ? [] : ["sunday"]), ...(audience === "34" ? ["workbooks"] : [])];
  return {view: views.includes(view) && (view !== "training" || tabs.includes(tab)) ? view : "home", tab: tabs.includes(tab) ? tab : tabs[0]};
}
export function validAudience(value) { return Object.hasOwn(AUDIENCES, value) ? value : "34"; }
export function gradesFor(item = {}) {
  if (Array.isArray(item.grades)) return item.grades.filter(n => Number.isInteger(n) && n >= 3 && n <= 13);
  const label = String(item.grade || "").match(/Klasse(?:n)?\s*(1[0-3]|[3-9])\b(?:\s*(?:[–—/&,\-]|bis|und)\s*(1[0-3]|[3-9])\b)?/i);
  if (label) return label[2] ? Array.from({length: Number(label[2])-Number(label[1])+1}, (_,i) => Number(label[1])+i) : [Number(label[1])];
  const code = String(item.code || "").match(/^(?:NI|MO)?\d{2}(0[3-9]|1[0-3])\d{2}$/i);
  return code ? [Number(code[1])] : [];
}
export function matchesAudience(item, audience) {
  audience = validAudience(audience);
  if (item.shared === true) return true;
  if (audience === "56" && item.category === "matheplus" && gradesFor(item).includes(7)) return true;
  return gradesFor(item).some(grade => AUDIENCES[validAudience(audience)].includes(grade));
}
export function gradeLabel(item) {
  if (item.shared) return "Gemeinsam knobeln";
  const grades = gradesFor(item);
  return grades.length ? `Klasse ${grades.length > 2 ? `${grades[0]}–${grades.at(-1)}` : grades.join("–")}` : "Klasse noch offen";
}
export function nextAgDate(dates, audience, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {timeZone: "Europe/Berlin", year:"numeric", month:"2-digit", day:"2-digit"}).format(now);
  return dates.filter(item => item.type === "Mathe-AG" && !item.preview && matchesAudience(item, audience) && item.date >= today)
    .sort((a,b) => a.date.localeCompare(b.date))[0] || null;
}
export function olympiadSeason(item) { return String(item.code || "").match(/^(?:NI|MO)(\d{2})/i)?.[1] || ""; }
