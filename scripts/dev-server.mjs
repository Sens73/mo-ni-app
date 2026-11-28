import { withAg56Dates } from "../video-content.js";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { updateJourneyFromFeed } from "./update-knobelreise.mjs";
import {createSundayPublicationCheck} from './sunday-publications.mjs';

const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const requestedPort = Number(process.argv[2] || 4213);
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536 ? requestedPort : 4213;
const bindAddress = process.env.MONI_BIND_ADDRESS === "0.0.0.0" ? "0.0.0.0" : "127.0.0.1";
const publicHost = String(process.env.MONI_PUBLIC_HOST || "localhost").replace(/[^a-zA-Z0-9.:-]/g, "") || "localhost";
const release = "v0.14.0-release-6b";

const contentFile = resolve(projectRoot, "data/content.json");
const editorialFile = resolve(projectRoot, "data/editorial.json");
const matheAgFile = resolve(projectRoot, "data/mathe-ag.json");
const matheAg56File = resolve(projectRoot, "data/mathe-ag-56.json");
const olympiadFile = resolve(projectRoot, "data/olympiade.json");
const mathePlusFile = resolve(projectRoot, "data/matheplus.json");
const journeyFile = resolve(projectRoot, "data/journey.json");
const videoPlaylistsFile = resolve(projectRoot, "data/video-playlists.json");
const sundayFile = resolve(projectRoot, "data/sunday.json");
const pdfCache = new Map();
const journeyRefreshInterval = 15 * 60 * 1000;
const publicationSeed=JSON.parse(await readFile(resolve(projectRoot,'data/sunday-publications.json'),'utf8'));
const checkSundayPublications=createSundayPublicationCheck({confirmed:publicationSeed.confirmed,worksheets:publicationSeed.worksheets,previewWorksheets:publicationSeed.previewWorksheets});

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

async function mergedContent() {
  const [content, editorial, matheAg, matheAg56, olympiad, mathePlus, journey, sunday, videoPlaylists] = await Promise.all([
    readJson(contentFile),
    readJson(editorialFile),
    readJson(matheAgFile),
    readJson(matheAg56File),
    readJson(olympiadFile),
    readJson(mathePlusFile),
    readJson(journeyFile),
    readJson(sundayFile),
    readJson(videoPlaylistsFile)
  ]);

  return {
    ...withAg56Dates(content),
    videoPlaylists,
    journey,
    sunday,
    resources: [
      ...matheAg.items,
      ...matheAg56.items,
      ...olympiad.items,
      ...mathePlus.items,
      ...content.resources.filter(item => !["mathe-ag", "olympiade", "matheplus"].includes(item.category))
    ],
    matheAgArchive: {
      count: matheAg.count + matheAg56.count,
      primaryCount: matheAg.count,
      grades56Count: matheAg56.count,
      grades56CoreCount: matheAg56.coreCount,
      grades56EnrichmentCount: matheAg56.enrichmentCount,
      nextGrades56Number: matheAg56.nextNumber,
      sources: [matheAg.source, matheAg56.source],
      updatedAt: [matheAg.updatedAt, matheAg56.updatedAt].sort().at(-1)
    },
    olympiadArchive: {
      count: olympiad.count,
      source: olympiad.source,
      updatedAt: olympiad.updatedAt
    },
    mathePlusArchive: {
      count: mathePlus.count,
      source: mathePlus.source,
      updatedAt: mathePlus.updatedAt
    },
    editorial
  };
}

async function matheAgPdf(number) {
  const cacheKey = `mathe-ag-${number}`;
  if (pdfCache.has(cacheKey)) return pdfCache.get(cacheKey);
  const archive = await readJson(matheAgFile);
  const item = archive.items.find(entry => entry.number === number && entry.pdf);
  if (!item) return null;

  const upstream = await fetch(item.pdf, {
    headers: { "User-Agent": "MO-Ni-Grundschul-App/0.14.0" },
    signal: AbortSignal.timeout(45_000)
  });
  if (!upstream.ok) throw new Error(`PDF_UPSTREAM_${upstream.status}`);
  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID_PDF");

  const value = { buffer, number };
  pdfCache.set(cacheKey, value);
  if (pdfCache.size > 8) pdfCache.delete(pdfCache.keys().next().value);
  return value;
}

async function matheAg56Pdf(number) {
  const cacheKey = `mathe-ag-56-${number}`;
  if (pdfCache.has(cacheKey)) return pdfCache.get(cacheKey);
  const archive = await readJson(matheAg56File);
  const item = archive.items.find(entry => entry.number === number && entry.pdf);
  if (!item) return null;

  const upstream = await fetch(item.pdf, {
    headers: { "User-Agent": "MO-Ni-Grundschul-App/0.14.0" },
    signal: AbortSignal.timeout(45_000)
  });
  if (!upstream.ok) throw new Error(`PDF_UPSTREAM_${upstream.status}`);
  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID_PDF");

  const value = { buffer, number };
  pdfCache.set(cacheKey, value);
  if (pdfCache.size > 8) pdfCache.delete(pdfCache.keys().next().value);
  return value;
}

async function olympiadPdf(id) {
  const cacheKey = `olympiade-${id}`;
  if (pdfCache.has(cacheKey)) return pdfCache.get(cacheKey);
  const archive = await readJson(olympiadFile);
  const item = archive.items.find(entry => entry.id === id && entry.pdf);
  if (!item) return null;

  const upstream = await fetch(item.pdf, {
    headers: { "User-Agent": "MO-Ni-Grundschul-App/0.14.0" },
    signal: AbortSignal.timeout(45_000)
  });
  if (!upstream.ok) throw new Error(`PDF_UPSTREAM_${upstream.status}`);
  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID_PDF");

  const value = { buffer, id };
  pdfCache.set(cacheKey, value);
  if (pdfCache.size > 8) pdfCache.delete(pdfCache.keys().next().value);
  return value;
}

async function mathePlusPdf(id) {
  const cacheKey = `matheplus-${id}`;
  if (pdfCache.has(cacheKey)) return pdfCache.get(cacheKey);
  const archive = await readJson(mathePlusFile);
  const item = archive.items.find(entry => entry.id === id && entry.pdf);
  if (!item) return null;

  const upstream = await fetch(item.pdf, {
    headers: { "User-Agent": "MO-Ni-Grundschul-App/0.14.0" },
    signal: AbortSignal.timeout(45_000)
  });
  if (!upstream.ok) throw new Error(`PDF_UPSTREAM_${upstream.status}`);
  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID_PDF");

  const value = { buffer, id };
  pdfCache.set(cacheKey, value);
  if (pdfCache.size > 8) pdfCache.delete(pdfCache.keys().next().value);
  return value;
}

async function sundayPdf(id) {
  const cacheKey = `sunday-${id}`;
  if (pdfCache.has(cacheKey)) return pdfCache.get(cacheKey);
  const archive = await readJson(sundayFile);
  const item = archive.items.find(entry => entry.id === id && entry.pdf);
  if (!item) return null;

  let buffer;
  if (item.pdf.startsWith("./")) {
    const localPath = resolve(projectRoot, item.pdf.split("?")[0].slice(2));
    if (!localPath.startsWith(`${projectRoot}${sep}`)) throw new Error("INVALID_LOCAL_PDF_PATH");
    buffer = await readFile(localPath);
  } else {
    const upstream = await fetch(item.pdf, {
      headers: { "User-Agent": "MO-Ni-Grundschul-App/0.14.0" },
      signal: AbortSignal.timeout(45_000)
    });
    if (!upstream.ok) throw new Error(`PDF_UPSTREAM_${upstream.status}`);
    buffer = Buffer.from(await upstream.arrayBuffer());
  }
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID_PDF");

  const value = { buffer, id };
  pdfCache.set(cacheKey, value);
  if (pdfCache.size > 8) pdfCache.delete(pdfCache.keys().next().value);
  return value;
}

async function handleApi(request, response, requestUrl) {
  const pathname = requestUrl.pathname;
  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ok: true, service: "MO-Ni Inhaltsdienst", version: "0.14.0", release });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/content") {
    sendJson(response, 200, await mergedContent());
    return true;
  }

  if (request.method === "GET" && pathname === "/api/puzzle-publications") {
    sendJson(response,200,await checkSundayPublications(await readJson(sundayFile)));
    return true;
  }

  const pdfMatch = pathname.match(/^\/api\/mathe-ag\/(\d+)\/pdf$/);
  if ((request.method === "GET" || request.method === "HEAD") && pdfMatch) {
    const material = await matheAgPdf(Number(pdfMatch[1]));
    if (!material) {
      sendJson(response, 404, { ok: false, message: "Aufgabenblatt nicht gefunden." });
      return true;
    }
    const disposition = requestUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    response.writeHead(200, {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `${disposition}; filename="MO-Ni-Mathe-AG-${material.number}.pdf"`,
      "Content-Length": material.buffer.length,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else response.end(material.buffer);
    return true;
  }

  const grades56PdfMatch = pathname.match(/^\/api\/mathe-ag-56\/(\d+)\/pdf$/);
  if ((request.method === "GET" || request.method === "HEAD") && grades56PdfMatch) {
    const material = await matheAg56Pdf(Number(grades56PdfMatch[1]));
    if (!material) {
      sendJson(response, 404, { ok: false, message: "Aufgabenblatt nicht gefunden." });
      return true;
    }
    const disposition = requestUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    response.writeHead(200, {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `${disposition}; filename="MO-Ni-Livestream-${material.number}-Klasse-5-6.pdf"`,
      "Content-Length": material.buffer.length,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else response.end(material.buffer);
    return true;
  }

  const olympiadPdfMatch = pathname.match(/^\/api\/olympiade\/(olympiade-[a-z0-9-]+)\/pdf$/);
  if ((request.method === "GET" || request.method === "HEAD") && olympiadPdfMatch) {
    const material = await olympiadPdf(olympiadPdfMatch[1]);
    if (!material) {
      sendJson(response, 404, { ok: false, message: "Olympiadeklausur nicht gefunden." });
      return true;
    }
    const disposition = requestUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    response.writeHead(200, {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `${disposition}; filename="MO-Ni-${material.id}.pdf"`,
      "Content-Length": material.buffer.length,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else response.end(material.buffer);
    return true;
  }

  const mathePlusPdfMatch = pathname.match(/^\/api\/matheplus\/(matheplus-[a-z0-9-]+)\/pdf$/);
  if ((request.method === "GET" || request.method === "HEAD") && mathePlusPdfMatch) {
    const material = await mathePlusPdf(mathePlusPdfMatch[1]);
    if (!material) {
      sendJson(response, 404, { ok: false, message: "MathePlus-Aufgabenblatt nicht gefunden." });
      return true;
    }
    const disposition = requestUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    response.writeHead(200, {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `${disposition}; filename="MO-Ni-${material.id}.pdf"`,
      "Content-Length": material.buffer.length,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else response.end(material.buffer);
    return true;
  }

  const sundayPdfMatch = pathname.match(/^\/api\/sunday\/([a-z0-9-]+)\/pdf$/);
  if ((request.method === "GET" || request.method === "HEAD") && sundayPdfMatch) {
    const material = await sundayPdf(sundayPdfMatch[1]);
    if (!material) {
      sendJson(response, 404, { ok: false, message: "Sonntagsrätsel nicht gefunden." });
      return true;
    }
    const disposition = requestUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    response.writeHead(200, {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `${disposition}; filename="MO-Ni-${material.id}.pdf"`,
      "Content-Length": material.buffer.length,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else response.end(material.buffer);
    return true;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(response, 404, { ok: false, message: "API-Endpunkt nicht gefunden." });
    return true;
  }

  return false;
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (await handleApi(request, response, requestUrl)) return;

    if (request.method === "GET" && requestUrl.pathname === "/file-bootstrap.js") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "text/javascript; charset=utf-8",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(`if (location.protocol === "file:") location.replace("http://localhost:${port}/?version=0.14&view=home");`);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Methode nicht erlaubt.");
      return;
    }

    const relativePath = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname).replace(/^\/+/, "");
    const filePath = resolve(projectRoot, relativePath);

    if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${sep}`)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Zugriff nicht erlaubt.");
      return;
    }

    const file = await stat(filePath);
    if (!file.isFile()) throw new Error("NOT_A_FILE");

    // Native video players seek using byte ranges, including on iPhone/iPad.
    const headers = {
      "Cache-Control": "no-cache",
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
      "Content-Length": file.size,
      "X-Content-Type-Options": "nosniff"
    };
    let start=0,end=file.size-1,status=200;
    if(extname(filePath)===".mp4") {
      headers["Accept-Ranges"]="bytes";
      const match=/^bytes=(\d*)-(\d*)$/.exec(request.headers.range||"");
      if(match&&(match[1]||match[2])) {
        start=match[1]?Number(match[1]):Math.max(0,file.size-Number(match[2]));
        end=match[1]&&match[2]?Math.min(Number(match[2]),file.size-1):file.size-1;
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=file.size||(!match[1]&&Number(match[2])===0)) {
          response.writeHead(416,{...headers,"Content-Range":`bytes */${file.size}`,"Content-Length":0});response.end();return;
        }
        status=206;headers["Content-Range"]=`bytes ${start}-${end}/${file.size}`;headers["Content-Length"]=end-start+1;
      }
    }
    response.writeHead(status, headers);
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath,extname(filePath)===".mp4"?{start,end}:undefined).pipe(response);
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { ok: false, message: "Ungültige Anfrage." });
    } else {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Datei nicht gefunden.");
    }
  }
});

server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} wird bereits verwendet. Bitte das andere Vorschaufenster schließen.`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

server.listen(port, bindAddress, () => {
  console.log(`MO-Ni Version 0.14: http://${publicHost}:${port}/`);
  if (bindAddress === "0.0.0.0") console.log("Lokaler iPhone-Test im gemeinsamen WLAN ist aktiv.");
  if (process.env.MONI_AUTO_CONTENT !== "0") {
    const refreshJourney = () => {
      void updateJourneyFromFeed({ log: false }).catch(error => {
        console.warn("Knobelreise und Arbeitsheft bleiben auf dem bisherigen Stand:", error.message);
      });
    };
    refreshJourney();
    const journeyTimer = setInterval(refreshJourney, journeyRefreshInterval);
    journeyTimer.unref();
  }
  console.log("Zum Beenden dieses Fenster schließen oder Strg+C drücken.");
});
