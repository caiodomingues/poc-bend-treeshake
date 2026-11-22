// Builds every scenarios/<name>/entry.js with both loaders (Bun.build, minified), runs each
// bundle, and checks the outputs against scenarios/<name>/expect.json.
import { readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { LOADERS, ROOT, bundle, run, kb } from "./lib";

const dir = join(ROOT, "scenarios");
const out = join(ROOT, ".out", "scenarios");
const rows: string[] = [];
let failed = 0;

for (const name of readdirSync(dir).sort()) {
  const expect = await Bun.file(join(dir, name, "expect.json")).json();
  const got: Record<string, { raw: number; gz: number; out: string }> = {};
  for (const v of LOADERS) {
    const b = await bundle(v, join(dir, name, "entry.js"), join(out, name, v));
    const r = await run(b.file);
    if (r.code !== 0) throw new Error(`${name} (${v}) exited ${r.code}: ${r.err}`);
    got[v] = { raw: b.raw, gz: b.gz, out: r.out };
  }
  const same = got.orig.out === got.patched.out;
  const ok = same === expect.same;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: output ${same ? "identical" : "differs"}`);
  if (!same) console.log(`       orig:    ${got.orig.out.replace(/\n/g, " | ")}\n       patched: ${got.patched.out.replace(/\n/g, " | ")}`);
  rows.push(`| ${name} | ${kb(got.orig.raw)} / ${kb(got.orig.gz)} | ${kb(got.patched.raw)} / ${kb(got.patched.gz)} | ${same ? "identical" : "differs"} | ${ok ? "as expected" : "UNEXPECTED"} |`);
}

mkdirSync(join(ROOT, "results"), { recursive: true });
await Bun.write(join(ROOT, "results", "scenarios.md"),
  `# Scenarios (Bend ${process.env.BEND_TAG ?? "v2.0.40"}, Bun ${Bun.version}, minified)\n\n` +
  "| Scenario | orig raw / gz | patched raw / gz | Output | Expectation |\n|---|---|---|---|---|\n" + rows.join("\n") + "\n");
console.log(failed ? `${failed} SCENARIOS UNEXPECTED` : "ALL SCENARIOS AS EXPECTED");
process.exit(failed ? 1 : 0);
