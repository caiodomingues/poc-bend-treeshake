// Every scenarios/<name> is bundled (Bun.build, minified) and run four ways:
//   orig    + entry.js        Bend as released
//   patched + entry.js        patch 1: a module exports only its own defs
//   named   + entry.js        patch 2, default import: must print exactly what orig prints; its
//                             only cost is the named-export list (reported in bytes)
//   named   + entry.named.js  patch 2, named imports: must print what orig prints for entry.js
// expect.json says whether patch 1 keeps orig's output ("same") or changes it ("differs").
import { existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, bundle, run, kb, type AnyLoader } from "./lib";

const dir = join(ROOT, "scenarios");
const out = join(ROOT, ".out", "scenarios");
const rows: string[] = [];
const problems: string[] = [];

async function go(name: string, v: AnyLoader, entry: string) {
  const b = await bundle(v, join(dir, name, entry), join(out, name, `${v}-${entry}`));
  const r = await run(b.file);
  if (r.code !== 0) throw new Error(`${name} ${v} ${entry} exited ${r.code}: ${r.err}`);
  return { ...b, out: r.out };
}

for (const name of readdirSync(dir).sort()) {
  const expect = await Bun.file(join(dir, name, "expect.json")).json();
  const o = await go(name, "orig", "entry.js");
  const p = await go(name, "patched", "entry.js");
  const nd = await go(name, "named", "entry.js");
  const hasNamed = existsSync(join(dir, name, "entry.named.js"));
  const nn = hasNamed ? await go(name, "named", "entry.named.js") : null;

  const p1 = (o.out === p.out) === (expect.patched === "same");
  const zeroBreak = nd.out === o.out;
  const cost = nd.raw - o.raw;
  const namedOk = !nn || nn.out.split("\n")[0] === o.out.split("\n")[0];
  if (!p1) problems.push(`${name}: patch 1 output ${o.out === p.out ? "same" : "differs"}, expected ${expect.patched}`);
  if (!zeroBreak) problems.push(`${name}: patch 2 with the default import prints something else than orig`);
  if (!namedOk) problems.push(`${name}: patch 2 with named imports prints something else`);
  const flag = p1 && zeroBreak && namedOk ? "ok  " : "FAIL";
  console.log(`${flag} ${name}: patch 1 ${o.out === p.out ? "same output" : "output differs"}; patch 2 default import ${zeroBreak ? `same output (+${cost} B)` : "DIFFERENT"}${nn ? `; named imports ${namedOk ? "same output" : "DIFFERENT"}` : ""}`);
  if (o.out !== p.out) console.log(`       orig:    ${o.out.replace(/\n/g, " | ")}\n       patch 1: ${p.out.replace(/\n/g, " | ")}`);
  if (name === "09-names" && nn) console.log(`       patch 2 named: ${nn.out.replace(/\n/g, " | ")}`);
  rows.push(`| ${name} | ${kb(o.raw)} / ${kb(o.gz)} | ${kb(p.raw)} / ${kb(p.gz)} (${o.out === p.out ? "same" : "differs"}) | ${zeroBreak ? "same output" : "DIFFERENT"}, +${cost} B | ${nn ? `${kb(nn.raw)} / ${kb(nn.gz)} (${namedOk ? "same" : "DIFFERENT"})` : "—"} |`);
}

mkdirSync(join(ROOT, "results"), { recursive: true });
await Bun.write(join(ROOT, "results", "scenarios.md"),
  `# Scenarios (Bend ${process.env.BEND_TAG ?? "v2.0.40"}, Bun ${Bun.version}, minified; raw / gzip)\n\n` +
  "| Scenario | released | patch 1 (own defs) | patch 2, default import (vs released) | patch 2, named imports |\n|---|---|---|---|---|\n" +
  rows.join("\n") + "\n" + (problems.length ? "\n## Problems\n\n" + problems.map((x) => "- " + x).join("\n") + "\n" : ""));
console.log(problems.length ? `${problems.length} PROBLEMS` : "ALL SCENARIOS AS EXPECTED");
process.exit(problems.length ? 1 : 0);
