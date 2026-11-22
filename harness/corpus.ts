// Differential test over Bend's own test corpus (.vendor/orig/tests/**/*.bend), in module mode:
// each file is compiled by both loaders, imported, and every own export that takes no arguments
// is called. The patch must not change any outcome or any value, and may only drop exports whose
// key is an imported file's (ns:name).
import { readdirSync, statSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT, LOADERS } from "./lib";

const corpus = join(ROOT, ".vendor", "orig", "tests");
const files: string[] = [];
const walk = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : p.endsWith(".bend") && files.push(p); } };
walk(corpus);
files.sort();

const one = async (v: string, f: string) => {
  const p = Bun.spawn(["bun", join(ROOT, "harness", "corpus-one.ts"), v, f], { stdout: "pipe", stderr: "pipe", timeout: 30_000 });
  const out = (await new Response(p.stdout).text()).trim().split("\n").pop() ?? "";
  const code = await p.exited;
  try { return JSON.parse(out); } catch { return { crashed: true, code }; }
};

const tally = { files: files.length, compiled: 0, compileErrors: 0, loadErrors: 0, crashed: 0, valuesCompared: 0, droppedImportedKeys: 0, smaller: 0, bytesOrig: 0, bytesPatched: 0 };
const mismatches: string[] = [];
const limit = Number(process.env.LIMIT ?? files.length);
const par = Number(process.env.PAR ?? 8);

const queue = files.slice(0, limit);
let done = 0;
async function worker() {
  for (let f = queue.shift(); f; f = queue.shift()) {
    const [a, b] = await Promise.all(LOADERS.map((v) => one(v, f!)));
    const name = relative(corpus, f);
    done++;
    if (a.crashed || b.crashed) { tally.crashed++; if (!!a.crashed !== !!b.crashed) mismatches.push(`${name}: crash in one loader only`); continue; }
    if (!a.compiled || !b.compiled) {
      tally.compileErrors++;
      if (a.compiled !== b.compiled || a.error !== b.error) mismatches.push(`${name}: compile outcome differs`);
      continue;
    }
    if (!a.loaded || !b.loaded) { tally.loadErrors++; if (a.loaded !== b.loaded) mismatches.push(`${name}: load outcome differs`); continue; }
    tally.compiled++;
    tally.bytesOrig += a.bytes; tally.bytesPatched += b.bytes;
    if (b.bytes < a.bytes) tally.smaller++;
    const dropped = a.keys.filter((k: string) => !b.keys.includes(k));
    const added = b.keys.filter((k: string) => !a.keys.includes(k));
    if (added.length || dropped.some((k: string) => !k.includes(":"))) mismatches.push(`${name}: own exports changed (+${added} -${dropped})`);
    tally.droppedImportedKeys += dropped.length;
    for (const k of Object.keys(a.values)) {
      tally.valuesCompared++;
      if (a.values[k] !== b.values[k]) mismatches.push(`${name}: ${k} = ${a.values[k]?.slice(0, 80)} vs ${b.values[k]?.slice(0, 80)}`);
    }
    if (done % 100 === 0) console.log(`${done}/${limit}`);
  }
}
await Promise.all(Array.from({ length: par }, worker));

const report = `# Corpus differential (Bend ${process.env.BEND_TAG ?? "v2.0.40"} tests/, module mode)

| | |
|---|---|
| Files | ${Math.min(limit, files.length)} |
| Compiled and loaded by both | ${tally.compiled} |
| Refused by the compiler (both, same error) | ${tally.compileErrors} |
| Compiled but failed to load (both) | ${tally.loadErrors} |
| Crashed or timed out | ${tally.crashed} |
| Own zero-argument exports compared | ${tally.valuesCompared} |
| Imported-def exports dropped by the patch | ${tally.droppedImportedKeys} |
| Modules that got smaller | ${tally.smaller} |
| Module JS, total (orig -> patched) | ${tally.bytesOrig} -> ${tally.bytesPatched} bytes |
| **Mismatches** | **${mismatches.length}** |
${mismatches.length ? "\n## Mismatches\n\n" + mismatches.map((m) => "- " + m).join("\n") + "\n" : ""}`;
mkdirSync(join(ROOT, "results"), { recursive: true });
await Bun.write(join(ROOT, "results", "corpus.md"), report);
console.log(report);
process.exit(mismatches.length ? 1 : 0);
