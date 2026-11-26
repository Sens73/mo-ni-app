function youtubeThumbnail(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    const host = url.hostname.toLowerCase();
    let id = "";
    if (host === "youtu.be") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length === 1) id = parts[0];
    } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else id = url.pathname.match(/^\/(?:live|embed)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] || "";
    } else if (host === "youtube-nocookie.com" || host === "www.youtube-nocookie.com") {
      id = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/)?.[1] || "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id)
      ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      : "";
  } catch {
    return "";
  }
}

/** Show the original AG announcement only until its scheduled end in Niedersachsen. */
export function upcomingAgDate(item = {}, dates = [], now = new Date()) {
  if (item.category !== "mathe-ag" || !item.date || !Number.isInteger(item.number)) return "";
  const dateId = item.collection === "56" ? `ag-56-${item.number}` : `ag-${item.number}`;
  const event = dates.find(value => value.id === dateId && value.type === "Mathe-AG" && !value.preview);
  if (!event || !/^\d{4}-\d{2}-\d{2}$/.test(event.date || "")) return "";
  const times = String(event.time || "").match(/\b\d{1,2}:\d{2}\b/g);
  if (!times?.length || Number.isNaN(new Date(now).getTime())) return "";
  const endTime = times.at(-1).padStart(5, "0");
  const parts = new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(now));
  const part = kind => parts.find(value => value.type === kind).value;
  const localNow = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
  return localNow < `${event.date}T${endTime}:00` ? String(item.date) : "";
}

/** Card copy for the primary-school archive; links and source data stay intact. */
export function primaryMaterialPresentation(item = {}, {dates = [], now = new Date()} = {}) {
  const title = String(item.title || "");
  const meta = [];
  if (item.category === "mathe-ag") {
    const date = upcomingAgDate(item, dates, now);
    if (date) meta.push(date);
    if (item.year) meta.push(`Schuljahr ${item.year}`);
  }
  const existingThumbnail = typeof item.thumbnail === "string" && item.thumbnail.trim() ? item.thumbnail : "";
  return {
    title: item.category === "olympiade" ? title.replace(/^(?:Mathematik-)?Olympiade\b/, "Mathe-Olympiade") : title,
    subtitle: String(item.subtitle || ""),
    thumbnail: existingThumbnail || youtubeThumbnail(item.videos?.[0]?.url || item.video),
    meta
  };
}
