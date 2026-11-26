import {readFile, writeFile, rename, open, unlink} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve, dirname} from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const textOf = value => value?.simpleText || value?.content || (value?.runs || []).map(run => run.text || "").join("");
function visit(value, callback) {
  if (!value || typeof value !== "object") return;
  callback(value);
  for (const child of Object.values(value)) visit(child, callback);
}

function initialPlaylistData(html) {
  const match = html.match(/(?:var\s+ytInitialData\s*=|window\["ytInitialData"\]\s*=)\s*(\{.*?\});<\/script>/s);
  if (!match) throw new Error("YouTube-Seite enthält keine lesbaren Playlistdaten.");
  return JSON.parse(match[1]);
}

export function parsePlaylistPage(data, initial = false) {
  const videos = []; const tokens = [];
  let expected = null, scope = data;
  visit(data, value => {
    const info = value.playlistSidebarPrimaryInfoRenderer;
    if (info) for (const stat of info.stats || []) {
      const text = textOf(stat);
      const count = text.match(/^([\d.,]+)\s+Videos?$/i);
      if (count) expected = Number(count[1].replace(/[.,]/g, ""));
    }
    if (initial && value.playlistVideoListRenderer) scope = value.playlistVideoListRenderer;
    if (initial && value.itemSectionRenderer?.contents?.some(item => item.lockupViewModel?.contentType === "LOCKUP_CONTENT_TYPE_VIDEO")) scope = value.itemSectionRenderer;
  });
  visit(scope, value => {
    const token = value.continuationCommand?.token;
    if (token) tokens.push(token);
    const legacy = value.playlistVideoRenderer;
    if (legacy?.isPlayable !== false && legacy?.videoId) videos.push({videoId:legacy.videoId,title:textOf(legacy.title)});
    const item = value.lockupViewModel;
    if (item?.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" && /^[\w-]{11}$/.test(item.contentId)) {
      videos.push({videoId:item.contentId,title:textOf(item.metadata?.lockupMetadataViewModel?.title)});
    }
  });
  return {videos, expected, tokens:[...new Set(tokens)]};
}

function completeVideos(videos, expected) {
  if (expected === null || expected !== videos.length) throw new Error(`Playlist unvollständig: ${videos.length} von ${expected ?? "unbekannt"}. Bisheriger Bestand bleibt erhalten.`);
  const unique = [...new Map(videos.map(video => [video.videoId,video])).values()];
  if (!unique.length) throw new Error("Leere Playlist; bisheriger Bestand bleibt erhalten.");
  return unique;
}

export function parsePlaylistHtml(html) {
  const page = parsePlaylistPage(initialPlaylistData(html), true);
  return completeVideos(page.videos, page.expected);
}

export async function readPublicPlaylist(source, fetcher = fetch) {
  const html = await (await get(`https://www.youtube.com/playlist?list=${source.id}`,fetcher)).text();
  const page = parsePlaylistPage(initialPlaylistData(html), true);
  const videos = [...page.videos]; const seen = new Set(); let tokens = page.tokens;
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];
  while (tokens.length && videos.length < page.expected) {
    if (tokens.length !== 1 || !clientVersion) throw new Error("Playlist-Folgeseite ist nicht eindeutig lesbar.");
    const token = tokens[0];
    if (seen.has(token) || seen.size >= 100) throw new Error("Wiederholte oder zu viele Playlist-Folgeseiten.");
    seen.add(token);
    const response = await fetcher("https://www.youtube.com/youtubei/v1/browse", {
      method:"POST", headers:{"Content-Type":"application/json","User-Agent":"MO-Ni-App-Playlistpflege/0.12"},
      body:JSON.stringify({context:{client:{clientName:"WEB",clientVersion,hl:"de",gl:"DE"}},continuation:token}),
      signal:AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Videoquelle antwortet mit HTTP ${response.status}.`);
    const next = parsePlaylistPage(await response.json());
    videos.push(...next.videos); tokens = next.tokens;
  }
  return completeVideos(videos,page.expected);
}

async function get(url, fetcher = fetch) {
  const response = await fetcher(url, {headers:{"User-Agent":"MO-Ni-App-Playlistpflege/0.12"},signal:AbortSignal.timeout(30000)});
  // Do not include URLs in errors: API URLs may contain the server-only key.
  if (!response.ok) throw new Error(`Videoquelle antwortet mit HTTP ${response.status}.`);
  return response;
}

export async function readApiPlaylist(source, key, fetcher = fetch) {
  const items = []; const seen = new Set(); let token = "";
  do {
    if (seen.has(token)) throw new Error("Wiederholte YouTube-Seitenkennung.");
    seen.add(token);
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.search = new URLSearchParams({part:"snippet,contentDetails,status",playlistId:source.id,maxResults:"50",key,...(token?{pageToken:token}:{})});
    const data = await (await get(url,fetcher)).json();
    if (!Array.isArray(data.items)) throw new Error("Unvollständige API-Antwort.");
    items.push(...data.items);
    token = data.nextPageToken || "";
  } while (token);
  return items.filter(item => item.status?.privacyStatus === "public" &&
    /^[\w-]{11}$/.test(item.snippet?.resourceId?.videoId || "") &&
    !["Private video","Deleted video"].includes(item.snippet.title))
    .map(item => ({videoId:item.snippet.resourceId.videoId,title:item.snippet.title,
      publishedAt:item.contentDetails?.videoPublishedAt || ""}));
}

export function makeCollections(config, sources) {
  const collections = {};
  for (const collection of config.collections) {
    const newestFirst = collection.key === "olympiad56";
    const map = new Map();
    for (const source of collection.sources.filter(source => source.id)) {
      const videos = sources.get(source.id);
      if (!videos?.length) throw new Error(`Keine vollständigen öffentlichen Videos für ${source.title}.`);
      videos.forEach((video,position) => {
        if (!/^[\w-]{11}$/.test(video.videoId) || !video.title) throw new Error("Ungültiger Videoeintrag.");
        if (newestFirst) {
          const publishedAt = Date.parse(video.publishedAt);
          if (!Number.isFinite(publishedAt)) throw new Error(`Veröffentlichungsdatum für ${video.videoId} fehlt.`);
          if (publishedAt > Date.now()) return;
        }
        const old = map.get(video.videoId);
        const year = video.title.match(/\b(?:19|20)\d{2}\b/)?.[0] || "";
        const presentation = config.presentation?.[video.videoId] || {};
        const task = video.title.match(/\b[A-C](?:10|[1-9])\b/)?.[0] || "";
        const topic = video.title.split("|").map(part=>part.trim()).filter(part => part && !/Känguru|Klasse\s*\d|Grundschüler|Mathe\s*Fit\s*#/i.test(part))[0];
        const displayTitle = presentation.displayTitle || topic || video.title;
        map.set(video.videoId,{...video,displayTitle,task:presentation.task || task,grades:[...new Set([...(old?.grades || []),...source.grades])],
          url:`https://www.youtube.com/watch?v=${video.videoId}`,
          thumbnail:presentation.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,year:presentation.year || year,
          playlistIds:[...new Set([...(old?.playlistIds || []),source.id])],position:old?.position ?? position});
      });
    }
    const videos = [...map.values()];
    if (newestFirst) videos.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    collections[collection.key] = {title:collection.title,description:collection.description,
      ...(collection.emptyMessage ? {emptyMessage:collection.emptyMessage} : {}),
      sources:collection.sources, pendingGrades:collection.sources.filter(source=>!source.id).flatMap(source=>source.grades),
      videos};
  }
  return {version:"0.13.0",updatedAt:new Date().toISOString(),collections};
}

export async function synchronize({configPath=resolve(root,"data/video-sources.json"),
  outputPath=resolve(root,"data/video-playlists.json"),snapshotDirectory="",dryRun=false}={}) {
  const lockPath = `${outputPath}.lock`;
  const lock = await open(lockPath,"wx");
  try {
    const config = JSON.parse(await readFile(configPath,"utf8"));
    const previous = await readFile(outputPath,"utf8").then(JSON.parse).catch(()=>null);
    const datedSources = new Set(config.collections.find(collection => collection.key === "olympiad56")?.sources.map(source => source.id));
    const knownDates = new Map(previous?.collections?.olympiad56?.videos?.map(video => [video.videoId, video.publishedAt]));
    const sources = new Map();
    for (const source of config.collections.flatMap(collection=>collection.sources).filter(source=>source.id)) {
      if (sources.has(source.id)) continue;
      const key = process.env.YOUTUBE_API_KEY;
      const videos = snapshotDirectory
        ? parsePlaylistHtml(await readFile(resolve(snapshotDirectory,`${source.id}.html`),"utf8"))
        : key ? await readApiPlaylist(source,key)
        : await readPublicPlaylist(source);
      if (datedSources.has(source.id)) {
        for (const video of videos) {
          const knownDate = video.publishedAt || knownDates.get(video.videoId);
          if (Number.isFinite(Date.parse(knownDate))) {
            video.publishedAt = new Date(knownDate).toISOString();
            continue;
          }
          const html = snapshotDirectory
            ? await readFile(resolve(snapshotDirectory,`${video.videoId}.watch.html`),"utf8")
            : await (await get(`https://www.youtube.com/watch?v=${video.videoId}`)).text();
          const publishedAt = html.match(/"publishDate":"([^"]+)"/)?.[1];
          if (!Number.isFinite(Date.parse(publishedAt))) throw new Error(`Veröffentlichungsdatum für ${video.videoId} fehlt.`);
          video.publishedAt = new Date(publishedAt).toISOString();
        }
      }
      sources.set(source.id,videos);
    }
    const result = makeCollections(config,sources);
    if (previous?.version === result.version && JSON.stringify(previous.collections) === JSON.stringify(result.collections)) return previous;
    if (!dryRun) {
      const temporary = resolve(dirname(outputPath),`.video-playlists-${process.pid}.tmp`);
      try {await writeFile(temporary,JSON.stringify(result,null,2)+"\n");await rename(temporary,outputPath);}
      finally {await unlink(temporary).catch(()=>{});}
    }
    return result;
  } finally {await lock.close();await unlink(lockPath);}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = name => process.argv.find(argument=>argument.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  synchronize({configPath:option("config") || undefined,outputPath:option("output") || undefined,
    snapshotDirectory:option("snapshots") || "",dryRun:process.argv.includes("--dry-run")})
    .then(result=>console.log(JSON.stringify(Object.fromEntries(Object.entries(result.collections).map(([key,value])=>[key,{videos:value.videos.length,pendingGrades:value.pendingGrades}])))))
    .catch(error=>{console.error(error.message);process.exitCode=1;});
}
