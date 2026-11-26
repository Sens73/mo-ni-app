// Orte außerhalb des Programms findet es über ihren Namen, nicht über einen Pfad (AGENTS.md, Grundsatz 2).
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KEIN_FACHORDNER = new Set(["Werkzeuge", "Skills", "Mentor", "Vorhaben", "node_modules"]);

export function work() {
  let ort = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(ort, "AGENTS.md"))) {
    const oben = dirname(ort);
    if (oben === ort) throw new Error("Ordner work nicht gefunden (AGENTS.md fehlt).");
    ort = oben;
  }
  return ort;
}

// Ordner mit diesem Namen in den Fachordnern, der nächstliegende zuerst.
export function ordner(name, tiefe = 7) {
  const gesucht = name.normalize("NFC");
  let ebene = [work()];
  for (let t = 0; t < tiefe && ebene.length; t += 1) {
    const naechste = [];
    for (const ort of ebene) {
      for (const e of readdirSync(ort, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name.startsWith(".") || (t === 0 && KEIN_FACHORDNER.has(e.name))) continue;
        if (e.name.normalize("NFC") === gesucht) return join(ort, e.name);
        naechste.push(join(ort, e.name));
      }
    }
    ebene = naechste;
  }
  throw new Error(`Ordner „${name}“ nicht gefunden.`);
}
