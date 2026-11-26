import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const [siteId, destination] = process.argv.slice(2);
if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(siteId || "") || !destination) {
  console.error("Benötigt die öffentliche Umami-Website-ID und den App-Ordner. Keine Passwörter oder API-Schlüssel verwenden.");
  process.exitCode = 1;
} else {
  const configuration = {provider:"umami",enabled:true,websiteId:siteId,collectUrl:"https://gateway.umami.is/api/send"};
  await writeFile(resolve(destination,"statistics-config.js"), `/** Public website identifier only. No account credentials. */\nexport const STATISTICS_CONFIGURATION = Object.freeze(${JSON.stringify(configuration,null,2)});\n`);
  console.log("Umami-Anbindung vorbereitet. Vorschau-Builds bleiben automatisch ausgeschlossen.");
}
