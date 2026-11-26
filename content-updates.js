export function sundayWorksheetIsAvailable(item, now = new Date()) {
  return !item.worksheetAvailableAt || new Date(item.worksheetAvailableAt) <= now;
}

// Time alone can change visible cards even when every JSON file stays unchanged.
export function contentAvailabilitySignature(content, now = new Date()) {
  const upcoming = date => Boolean(date && new Date(date) > now);
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return JSON.stringify({
    day,
    sunday: (content.sunday?.items || []).map(item => [item.id, sundayWorksheetIsAvailable(item, now), upcoming(item.publishedAt)]),
    journey: (content.journey?.videos || []).map(item => [item.videoId, upcoming(item.publishedAt)]),
    nextJourney: upcoming(content.journey?.nextPublication?.scheduledAt)
  });
}
