// The guide says `bend file.bend -o f.mjs` emits "an ES module of its non-IO defs, for JS to
// import". This runs that exact command on scenario 01 (root.bend imports lib.bend) with each
// compiler, imports the .mjs under node, and lists what it exports.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, LOADERS, loaderMain } from "./lib";

const src = join(ROOT, "scenarios", "01-unused-import", "root.bend");
const guide = (await Bun.file(join(ROOT, ".vendor", "orig", "guide", "GUIDE.md")).text())
  .split("\n").find((l) => l.includes("-o f.mjs"))!.trim();
const rows: string[] = [];
for (const v of LOADERS) {
  const dir = join(ROOT, ".out", "cli-mjs", v);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "root.mjs");
  const b = Bun.spawn(["bun", loaderMain(v), src, "-o", out], { stdout: "pipe", stderr: "pipe" });
  if ((await b.exited) !== 0) throw new Error(await new Response(b.stderr).text());
  const n = Bun.spawn(["node", "--input-type=module", "-e",
    `const m = await import(${JSON.stringify(out)}); console.log(JSON.stringify({ default: Object.keys(m.default), named: Object.keys(m).filter((k) => k !== "default") }));`],
    { stdout: "pipe" });
  const got = JSON.parse((await new Response(n.stdout).text()).trim());
  rows.push(`| ${v} | ${got.default.map((k: string) => "`" + k + "`").join(", ")} | ${got.named.map((k: string) => "`" + k + "`").join(", ") || "—"} |`);
  console.log(rows.at(-1));
}
await Bun.write(join(ROOT, "results", "cli-mjs.md"),
  "# `bend root.bend -o root.mjs` (scenario 01: root.bend imports lib.bend)\n\n" +
  `The guide (v2.0.40, GUIDE.md): \`${guide}\`\n\n` +
  "root.bend's own non-IO defs: `pick`. lib.bend's: `used`, `unused_big`.\n\n" +
  "| Compiler | Keys of the default export | Named exports |\n|---|---|---|\n" + rows.join("\n") + "\n");
