// Time, not just size: how long the loader takes to compile a module (what `bun run dev` pays on
// every .bend change) and how long bun takes to import the result. Each round is a fresh process,
// the compilers are interleaved, and the median of ROUNDS rounds is reported.
// Needs harness/engine.ts to have run once (it clones the engine into .vendor/eng).
import { join } from "node:path";
import { existsSync } from "node:fs";
import { ROOT, LOADERS, kb } from "./lib";

const ROUNDS = Number(process.env.ROUNDS ?? 7);
const eng = join(ROOT, ".vendor", "eng", "engine");
const FIXTURES: Record<string, string> = {
  "06 one def of a 60-def library": join(ROOT, "scenarios", "06-large-library", "root.bend"),
  "engine: module using 1 of 42 clips": join(eng, "poc", "one.bend"),
  "engine: editor workspace page (uses all 42)": join(eng, "editor", "workspace", "view.bend"),
};
if (!existsSync(join(eng, "poc", "one.bend"))) throw new Error("run harness/engine.ts first");

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const one = async (v: string, f: string) => {
  const p = Bun.spawn(["bun", join(ROOT, "harness", "perf-one.ts"), v, f], { stdout: "pipe", stderr: "pipe" });
  const out = (await new Response(p.stdout).text()).trim().split("\n").pop()!;
  await p.exited;
  return JSON.parse(out) as { compileMs: number; jsBytes: number; importMs: number };
};

const rows: string[] = [];
for (const [name, file] of Object.entries(FIXTURES)) {
  const got: Record<string, { c: number[]; i: number[]; b: number }> = {};
  for (const v of LOADERS) got[v] = { c: [], i: [], b: 0 };
  for (let r = 0; r < ROUNDS; r++) {
    for (const v of r % 2 ? [...LOADERS].reverse() : LOADERS) {
      const m = await one(v, file);
      got[v].c.push(m.compileMs); got[v].i.push(m.importMs); got[v].b = m.jsBytes;
    }
  }
  for (const v of LOADERS) {
    const g = got[v];
    rows.push(`| ${name} | ${v} | ${median(g.c).toFixed(0)} ms (${Math.min(...g.c).toFixed(0)}–${Math.max(...g.c).toFixed(0)}) | ${kb(g.b)} | ${median(g.i).toFixed(1)} ms (${Math.min(...g.i).toFixed(1)}–${Math.max(...g.i).toFixed(1)}) |`);
    console.log(rows.at(-1));
  }
}

await Bun.write(join(ROOT, "results", "perf.md"),
  `# Compile and import time (Bun ${Bun.version}, ${ROUNDS} rounds, fresh process each, interleaved; median (min–max))\n\n` +
  "Compile = the loader turning the .bend into JS (module mode, unminified: what the dev server serves). Import = bun importing that JS.\n" +
  "Patch 2 is measured with the default object, as released code imports it; its named exports change bundles, not this.\n\n" +
  "| Module | Compiler | Compile | JS (unminified) | Import |\n|---|---|---|---|---|\n" + rows.join("\n") + "\n");
