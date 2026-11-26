import { usageStatistics, videoStatisticsTarget } from "./usage-statistics.js?v=0.14.0-release-2";

let apiPromise;
function loadYoutubeApi(scope) {
  if (scope.YT?.Player) return Promise.resolve(scope.YT);
  if (!apiPromise) apiPromise = new Promise(resolve => {
    const previous = scope.onYouTubeIframeAPIReady;
    scope.onYouTubeIframeAPIReady = () => { previous?.(); resolve(scope.YT); };
    const script = scope.document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    scope.document.head.append(script);
  });
  return apiPromise;
}

export function statisticsEmbedUrl(value, tracker = usageStatistics, scope = globalThis) {
  if (!tracker.enabled()) return value;
  const url = new URL(value);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("origin", scope.location.origin);
  return url.href;
}

/** An opening is counted once; pause/resume and incidental app redraws do not add plays. */
export function observeVideo(frame, url, opening, { tracker = usageStatistics, scope = globalThis, loadApi = loadYoutubeApi } = {}) {
  if (!frame || !tracker.enabled() || !videoStatisticsTarget(url)) return () => {};
  if (!opening.opened) { tracker.trackVideo("video_open", url); opening.opened = true; }
  let disposed = false;
  let player;
  void loadApi(scope).then(api => {
    if (disposed || !frame.isConnected) return;
    player = new api.Player(frame, { events: { onStateChange(event) {
      if (!disposed && event.data === 1 && !opening.played) {
        opening.played = true;
        tracker.trackVideo("video_start", url);
      }
    } } });
  }).catch(() => {});
  return () => { disposed = true; try { player?.destroy(); } catch { /* Detached players are already gone. */ } };
}
