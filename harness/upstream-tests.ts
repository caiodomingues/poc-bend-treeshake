// The tests in upstream/tests/io are written in Bend's own format (a .bend whose `#|` lines are
// what its run must print, with a .js twin for the effect, like tests/io/bundle_inline). This
// copies them into each Bend tree, runs the two lanes that apply without a C twin (interpreted,
// and compiled to JS then run by bun, as gates/test.ts does), and removes them again.
// Each test must fail on released Bend and pass with its own patch.
import { copyFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ROOT, LOADERS } from "./lib";

const src = join(ROOT, "upstream", "tests", "io");
const files = readdirSync(src);
const tests = files.filter((f) => f.endsWith(".bend")).map((f) => f.replace(".bend", ""));
const want = (t: string) => (Bun.file(join(src, t + ".bend")).text()).then((s) =>
  s.split("\n").filter((l) => l.startsWith("#|")).map((l) => l.slice(2)).join("\n"));

const sh = async (cmd: string[], cwd: string) => {
  const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe", timeout: 300_000 });
  const out = await new Response(p.stdout).text();
  await p.exited;
  return out.trim();
};

const rows: string[] = [];
for (const v of LOADERS) {
  const tree = join(ROOT, ".vendor", v);
  for (const f of files) copyFileSync(join(src, f), join(tree, "tests", "io", f));
  try {
    for (const t of tests) {
      const file = join("tests", "io", t + ".bend");
      const interp = await sh(["bun", "bend2/main.ts", file], tree);
      const js = join(tmpdir(), `${v}-${t}.js`);
      await sh(["bun", "bend2/main.ts", file, "-o", js], tree);
      const compiled = await sh(["bun", js], tree);
      const w = await want(t);
      const pass = (x: string) => (x === w ? "pass" : `fail (prints ${x || "nothing"})`);
      rows.push(`| ${t} | ${v} | ${pass(interp)} | ${pass(compiled)} |`);
      console.log(rows.at(-1));
    }
  } finally {
    for (const f of files) rmSync(join(tree, "tests", "io", f), { force: true });
  }
}

await Bun.write(join(ROOT, "results", "upstream-tests.md"),
  "# Tests in Bend's format (upstream/tests/io)\n\nEach prints 0 when what it checks holds, or the number of the first check that failed.\n\n" +
  "| Test | Compiler | Interpreted | Compiled to JS |\n|---|---|---|---|\n" + rows.join("\n") + "\n");
