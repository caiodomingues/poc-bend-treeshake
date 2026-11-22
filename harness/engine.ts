// A real project: opengameworld/engine at a pinned commit. With each loader it runs the engine's
// own test suite, builds its editor page (`bend index.html -o`), and bundles a module that uses
// one clip of its 42-clip animation library, checking the clip's value is identical.
import { existsSync, mkdirSync, symlinkSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { ROOT, LOADERS, bundle, run, kb, type Loader } from "./lib";

const REF = process.env.ENGINE_REF ?? "a728de4";
const base = join(ROOT, ".vendor", "eng");
const eng = join(base, "engine");

const sh = async (cmd: string[], cwd = eng) => {
  const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const [o, e] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  if ((await p.exited) !== 0) throw new Error(`${cmd.join(" ")}\n${e}`);
  return o.trim();
};

if (!existsSync(eng)) {
  mkdirSync(base, { recursive: true });
  await sh(["git", "clone", "-q", "https://github.com/opengameworld/engine.git", eng], base);
}
await sh(["git", "checkout", "-q", REF]);
await sh(["bun", "install", "--frozen-lockfile"]);

mkdirSync(join(eng, "poc"), { recursive: true });
await Bun.write(join(eng, "poc", "one.bend"),
  "import Base\nimport ../library/quaternius/gen/motions.bend as Ual\nimport ../engine/motion.bend as M\n\ndef jog() -> M.Motion: Ual.m5()\n");
await Bun.write(join(eng, "poc", "entry.js"),
  'import O from "./one.bend";\nconst s = JSON.stringify(O.jog());\nconsole.log(s.length, Bun.hash(s));\n');

const rows: string[] = [];
const got: Record<string, Record<string, string>> = {};
for (const v of LOADERS as readonly Loader[]) {
  rmSync(join(base, "bend"), { force: true });
  symlinkSync(join(ROOT, ".vendor", v), join(base, "bend"));
  await sh(["bun", "tools/shaders/catalog.js"]);
  const tests = (await sh(["bun", "tools/test.ts"])).split("\n").pop()!;
  const dist = join(ROOT, ".out", "engine", v);
  rmSync(dist, { recursive: true, force: true });
  await sh(["bun", join(base, "bend", "bend2", "main.ts"), "index.html", "-o", dist]);
  const js = readdirSync(dist).filter((f) => f.endsWith(".js")).map((f) => Bun.file(join(dist, f)));
  const page = new Uint8Array(await new Blob(await Promise.all(js.map((f) => f.arrayBuffer()))).arrayBuffer());
  const clip = await bundle(v, join(eng, "poc", "entry.js"), join(ROOT, ".out", "engine-clip", v));
  const value = (await run(clip.file, 120_000)).out;
  got[v] = { tests, value };
  rows.push(`| ${v} | ${tests} | ${kb(page.length)} / ${kb(gzipSync(page, { level: 9 }).length)} | ${kb(clip.raw)} / ${kb(clip.gz)} | ${value} |`);
  console.log(rows.at(-1));
}

const same = got.orig.value === got.patched.value && got.orig.tests === got.patched.tests;
await Bun.write(join(ROOT, "results", "engine.md"),
  `# A real project: opengameworld/engine @ ${REF}\n\n` +
  "| Loader | Engine tests | Editor page JS (raw / gz) | Module using 1 of 42 clips (raw / gz) | Clip value (length, hash) |\n|---|---|---|---|---|\n" +
  rows.join("\n") + `\n\nSame tests result and same clip value: **${same ? "yes" : "NO"}**\n`);
console.log(same ? "ENGINE: SAME BEHAVIOR" : "ENGINE: BEHAVIOR DIFFERS");
process.exit(same ? 0 : 1);
