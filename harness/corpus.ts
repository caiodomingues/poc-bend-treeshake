// Differential test over Bend's own test corpus (.vendor/orig/tests/**/*.bend), in module mode:
// each file is compiled by both loaders, imported, and every own export that takes no arguments
// is called. Patch 1 must not change any outcome or any value, and may only drop exports whose
// key is an imported file's (ns:name). Patch 2 must leave everything as released and only add
// named exports, each the same function as the default object's.
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

const tally = { namedExports: 0, bytesNamed: 0, files: files.length, compiled: 0, compileErrors: 0, loadErrors: 0, crashed: 0, valuesCompared: 0, droppedImportedKeys: 0, smaller: 0, bytesOrig: 0, bytesPatched: 0 };
const mismatches: string[] = [];
const named2: string[] = [];
const limit = Number(process.env.LIMIT ?? files.length);
const par = Number(process.env.PAR ?? 8);

const queue = files.slice(0, limit);
let done = 0;
async function worker() {
  for (let f = queue.shift(); f; f = queue.shift()) {
    const [a, b, c] = await Promise.all(LOADERS.map((v) => one(v, f!)));
    const name = relative(corpus, f);
    done++;
    if (a.crashed || b.crashed || c.crashed) { tally.crashed++; if (!!a.crashed !== !!b.crashed || !!a.crashed !== !!c.crashed) mismatches.push(`${name}: crash in some loaders only`); continue; }
    // patch 2 must leave the default object exactly as released, and add only named exports
    // that are the same functions
    const seen = (r: any) => JSON.stringify([r.compiled, r.loaded, r.error, r.keys, r.values]);
    if (seen(a) !== seen(c)) named2.push(`${name}: default object or outcome differs from released`);
    if (c.loaded) tally.bytesNamed += c.bytes;
    if (c.loaded) {
      const want = a.keys.filter((k: string) => !k.includes(":") && k !== "default" && k !== "then");
      if (JSON.stringify(want) !== JSON.stringify(c.named)) named2.push(`${name}: named exports ${c.named} instead of ${want}`);
      if (!c.sameFunctions) named2.push(`${name}: a named export is not the default object's function`);
      tally.namedExports += c.named.length;
    }
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
| **Patch 1 mismatches** | **${mismatches.length}** |
| Patch 2: named exports checked (each the default object's own function) | ${tally.namedExports} |
| Patch 2: module JS, total (cost of the export list) | ${tally.bytesNamed} bytes |
| **Patch 2 differences from released (default object, keys, values, outcomes)** | **${named2.length}** |
${mismatches.length ? "\n## Patch 1 mismatches\n\n" + mismatches.map((m) => "- " + m).join("\n") + "\n" : ""}${named2.length ? "\n## Patch 2 differences\n\n" + named2.map((m) => "- " + m).join("\n") + "\n" : ""}`;
mkdirSync(join(ROOT, "results"), { recursive: true });
await Bun.write(join(ROOT, "results", "corpus.md"), report);
console.log(report);
process.exit(mismatches.length || named2.length ? 1 : 0);
