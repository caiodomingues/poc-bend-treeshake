// The same modules outside Bun's bundler. For each compiler, three fixtures are compiled to a
// standalone ES module (what `bend x.bend -o x.mjs` writes) and consumed:
//   node         node runs the consumer directly, no bundler
//   node-loader  node imports the .bend itself through Bend's loader (--import bend2/main.ts)
//   esbuild-esm, esbuild-cjs, rollup-esm, rollup-cjs, vite, webpack: bundled, then run by node
// Every run must print what released Bend prints through `node` for the default import.
// Patch 2's named-import consumers are also checked for size: the bundler should drop the rest.
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { rollup } from "rollup";
import { build as vite } from "vite";
import webpack from "webpack";
import { ROOT, LOADERS, loaderMain, kb, type AnyLoader } from "./lib";

const FIXTURES: Record<string, { def: string; named: string }> = {
  "06-large-library": {
    def: 'import R from "./root.mjs";\nlet n = 0, s = 0;\nfor (let l = R.one(); l.$ === "Con"; l = l.tail) { n++; s = (s + l.head) % 1000003; }\nconsole.log(n, s);\n',
    named: 'import { one } from "./root.mjs";\nlet n = 0, s = 0;\nfor (let l = one(); l.$ === "Con"; l = l.tail) { n++; s = (s + l.head) % 1000003; }\nconsole.log(n, s);\n',
  },
  "09-names": {
    def: 'import D from "./root.mjs";\nconsole.log(D["Place.word"](), D.new(), D.class(), D.constructor(), D.__proto__(), D.default(), D.then());\n',
    named: 'import D, { "Place.word" as w, new as n, class as c, constructor as k, __proto__ as p } from "./root.mjs";\nconsole.log(w(), n(), c(), k(), p(), D.default(), D.then());\n',
  },
  "11-esmodule-name": {
    def: 'import R from "./root.mjs";\nconsole.log(R.pick(), R.__esModule());\n',
    named: 'import R, { pick, __esModule as e } from "./root.mjs";\nconsole.log(pick(), e());\n',
  },
};

const node = async (args: string[], cwd: string) => {
  const p = Bun.spawn(["node", ...args], { cwd, stdout: "pipe", stderr: "pipe", timeout: 60_000 });
  const [o, e] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  const code = await p.exited;
  return code === 0 ? o.trim() : `ERROR ${code}: ${e.split("\n").find((l) => /Error|error/.test(l)) ?? e.slice(0, 120)}`;
};
const size = async (f: string) => { const b = new Uint8Array(await Bun.file(f).arrayBuffer()); return { raw: b.length, gz: gzipSync(b, { level: 9 }).length }; };

type Env = (dir: string, entry: string) => Promise<string>;   // returns the built file to run with node
const ENVS: Record<string, Env> = {
  "esbuild-esm": async (d, e) => { const o = join(d, `esb-${e}.mjs`); await esbuild.build({ entryPoints: [join(d, e)], bundle: true, minify: true, format: "esm", platform: "node", outfile: o, logLevel: "silent" }); return o; },
  "esbuild-cjs": async (d, e) => { const o = join(d, `esb-${e}.cjs`); await esbuild.build({ entryPoints: [join(d, e)], bundle: true, minify: true, format: "cjs", platform: "node", outfile: o, logLevel: "silent" }); return o; },
  "rollup-esm": async (d, e) => { const b = await rollup({ input: join(d, e), onwarn: () => {} }); const o = join(d, `rol-${e}.mjs`); await b.write({ file: o, format: "es" }); return o; },
  "rollup-cjs": async (d, e) => { const b = await rollup({ input: join(d, e), onwarn: () => {} }); const o = join(d, `rol-${e}.cjs`); await b.write({ file: o, format: "cjs" }); return o; },
  vite: async (d, e) => {
    const out = join(d, `vite-${e}`);
    await vite({ configFile: false, logLevel: "silent", build: { outDir: out, emptyOutDir: true, minify: true, lib: { entry: join(d, e), formats: ["es"], fileName: "out" } } });
    return join(out, readdirSync(out).find((f) => f.endsWith(".js") || f.endsWith(".mjs"))!);
  },
  webpack: (d, e) => new Promise((res, rej) => {
    const out = join(d, `wp-${e}`);
    webpack({ mode: "production", target: "node", entry: join(d, e), output: { path: out, filename: "out.cjs" } }, (err, st) =>
      err || st?.hasErrors() ? rej(err ?? new Error(st!.toString("errors-only"))) : res(join(out, "out.cjs")));
  }),
};

const rows: string[] = [];
const problems: string[] = [];
for (const [fx, c] of Object.entries(FIXTURES)) {
  const ref = { out: "" };
  for (const v of LOADERS as readonly AnyLoader[]) {
    const d = join(ROOT, ".out", "env", v, fx);
    mkdirSync(d, { recursive: true });
    const { load } = await import(loaderMain(v));
    await Bun.write(join(d, "root.mjs"), (await load(pathToFileURL(join(ROOT, "scenarios", fx, "root.bend")).href, {}, () => null)).source);
    await Bun.write(join(d, "default.mjs"), c.def);
    await Bun.write(join(d, "named.mjs"), c.named);
    await Bun.write(join(d, "bend.mjs"), c.def.replace("./root.mjs", join(ROOT, "scenarios", fx, "root.bend")));
    const consumers = v === "named" ? ["default.mjs", "named.mjs"] : ["default.mjs"];
    for (const e of consumers) {
      const results: [string, string, string][] = [];
      results.push(["node", await node([e], d), "—"]);
      if (e === "default.mjs") results.push(["node-loader", await node(["--no-warnings", "--experimental-transform-types", "--import", loaderMain(v), "bend.mjs"], d), "—"]);
      for (const [name, env] of Object.entries(ENVS)) {
        try { const f = await env(d, e); const s = await size(f); results.push([name, await node([f], d), `${kb(s.raw)} / ${kb(s.gz)}`]); }
        catch (x) { results.push([name, `BUILD FAILED: ${String(x).split("\n")[0].slice(0, 100)}`, "—"]); }
      }
      if (v === "orig" && e === "default.mjs") ref.out = results[0][1];
      for (const [env, out, sz] of results) {
        const ok = out === ref.out;
        if (!ok) problems.push(`${fx} ${v} ${e} ${env}: printed "${out}" instead of "${ref.out}"`);
        rows.push(`| ${fx} | ${v} | ${e.replace(".mjs", "")} | ${env} | ${ok ? "same" : "**" + out.slice(0, 60) + "**"} | ${sz} |`);
      }
      console.log(`${fx} ${v} ${e}: ${results.filter(([, o]) => o === ref.out).length}/${results.length} environments print the released output`);
    }
  }
}

await Bun.write(join(ROOT, "results", "environments.md"),
  `# Outside Bun's bundler (node ${(await node(["--version"], ROOT))}, esbuild ${esbuild.version}, rollup, vite, webpack ${webpack.version})\n\n` +
  "Each row runs the built consumer with node. \"same\" means it printed what released Bend prints with a default import under plain node.\n\n" +
  "| Fixture | Compiler | Import | Environment | Output | Bundle (raw / gz) |\n|---|---|---|---|---|---|\n" + rows.join("\n") + "\n" +
  (problems.length ? "\n## Differences\n\n" + problems.map((p) => "- " + p).join("\n") + "\n" : "\nNo differences.\n"));
console.log(problems.length ? `${problems.length} DIFFERENCES (see results/environments.md)` : "ALL ENVIRONMENTS PRINT THE RELEASED OUTPUT");
