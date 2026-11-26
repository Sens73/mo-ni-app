// Content rules shared by the browser, importer and tests.
function normalizeSearch(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de");
}

export function videosFor(collection, grade = "all", query = "") {
  const needles = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  return (collection?.videos || []).filter(video =>
    (grade === "all" || video.grades.includes(Number(grade))) &&
    needles.every(needle => normalizeSearch(`${video.title} ${video.displayTitle || ""} ${video.summary || ""} ${video.year || ""} ${video.task || ""}`).includes(needle))
  );
}

export const KANGAROO_GROUPS = [{id:"34",label:"Klasse 3–4",grades:[3,4]}, {id:"56",label:"Klasse 5–6",grades:[5,6]}, {id:"78",label:"Klasse 7–8",grades:[7,8]}, {id:"910",label:"Klasse 9–10",grades:[9,10]}, {id:"1113",label:"Klasse 11–13",grades:[11,12,13]}];
export function kangarooCardLabel(video) {
  const grades = [...new Set(video.grades || [])].sort((a,b) => a-b);
  const group = grades.length > 2 && grades.every((grade,index) => index === 0 || grade === grades[index-1]+1)
    ? `${grades[0]} bis ${grades.at(-1)}`
    : grades.join(" und ");
  const grade = group ? `Klasse ${group}` : "Alle Klassenstufen";
  return `${grade} | ${[video.year, video.task].filter(Boolean).join(" ") || "Livestream"}`;
}

export function kangarooVideosFor(collection, groups = [], years = [], query = "", taskGroups = []) {
  const selection = value => Array.isArray(value) ? value : value === "all" ? [] : [value];
  const selectedGroups = selection(groups), selectedYears = selection(years), selectedTasks = selection(taskGroups);
  const grades = KANGAROO_GROUPS.filter(item => selectedGroups.includes(item.id)).flatMap(item => item.grades);
  return videosFor(collection,"all",query).filter(video =>
    (!selectedGroups.length || grades.some(grade => video.grades.includes(grade))) &&
    (!selectedYears.length || selectedYears.includes(video.year)) &&
    (!selectedTasks.length || video.task === "Alle Aufgaben" || selectedTasks.includes(video.task?.match(/^([A-C])\d+$/)?.[1]))
  );
}

export function isoWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return Math.ceil((((date - new Date(Date.UTC(date.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}

export function ag56Dates(schedule) {
  if (!schedule) return [];
  const entries = [];
  const day = new Date(`${schedule.startDate}T12:00:00Z`);
  let number = schedule.firstNumber;
  for (; day.toISOString().slice(0, 10) <= schedule.endDate; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    if (day.getUTCDay() !== 1 || isoWeek(date) % 2 !== 1) continue;
    if (schedule.holidays.some(range => date >= range.start && date <= range.end)) continue;
    if ((schedule.daysOff || []).includes(date)) continue;
    entries.push({id: `ag-56-${number}`, date, time: "15:30–ca. 16:30", type: "Mathe-AG",
      title: `Livestream ${number} · Klasse 5–6`,
      description: "Gemeinsam knobeln und Lösungswege entdecken. Montags in ungeraden Kalenderwochen; in den Ferien findet keine AG statt.",
      grades: [5, 6], accent: "teal", number: number++});
  }
  return entries;
}

export function withAg56Dates(content) {
  return {...content, dates: [...content.dates.filter(item => !item.id.startsWith("ag-56-")), ...ag56Dates(content.ag56Schedule)]};
}
