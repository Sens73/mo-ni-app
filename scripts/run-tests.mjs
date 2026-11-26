// Führt alle Prüfungen aus, auch wenn eine davon fehlschlägt, und fasst das Ergebnis zusammen.
// Aufruf: npm test  (oder: node scripts/run-tests.mjs kenken journey)
import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const filters = process.argv.slice(2);

async function sourceFiles(folder) {
  const entries = await readdir(join(root, folder), { withFileTypes: true });
  return entries.filter(entry => entry.isFile() && /\.(m?js|cjs)$/.test(entry.name)).map(entry => join(folder, entry.name));
}

function run(args) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd: root });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("close", code => resolve({ ok: code === 0, output: output.trim() }));
  });
}

async function inParallel(jobs, worker) {
  const results = new Array(jobs.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(availableParallelism(), jobs.length) }, async () => {
    while (next < jobs.length) { const index = next++; results[index] = await worker(jobs[index]); }
  });
  await Promise.all(lanes);
  return results;
}

const code = [...await sourceFiles("."), ...await sourceFiles("puzzles"), ...await sourceFiles("scripts")];
const tests = (await readdir(join(root, "tests"))).filter(name => name.endsWith(".test.mjs")).sort()
  .filter(name => !filters.length || filters.some(filter => name.includes(filter)))
  .map(name => join("tests", name));

const syntax = filters.length ? [] : await inParallel(code, async file => ({ file, ...await run(["--check", file]) }));
const results = await inParallel(tests, async file => ({ file, ...await run([file]) }));

const syntaxErrors = syntax.filter(result => !result.ok);
for (const { file, output } of syntaxErrors) console.log(`✗ Syntax ${relative(".", file)}\n${output}\n`);
for (const { file, ok, output } of results) {
  console.log(`${ok ? "✓" : "✗"} ${file}`);
  if (!ok) console.log(output.split("\n").slice(0, 25).map(line => `    ${line}`).join("\n"));
}
const failed = results.filter(result => !result.ok).length + syntaxErrors.length;
console.log(`\n${syntax.length} Dateien auf Syntax geprüft, ${results.length} Testdateien ausgeführt, ${failed} fehlgeschlagen.`);
process.exitCode = failed ? 1 : 0;
