// One measurement in a fresh process: the loader compiles a .bend (module mode), then bun imports
// the result. Prints {compileMs, jsBytes, importMs}.
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loaderMain, type AnyLoader } from "./lib";

const [v, file] = Bun.argv.slice(2) as [AnyLoader, string];
const { load } = await import(loaderMain(v));
const t0 = performance.now();
const src = (await load(pathToFileURL(file).href, {}, () => null)).source;
const t1 = performance.now();
const tmp = join(tmpdir(), `bend-perf-${v}-${process.pid}.mjs`);
await Bun.write(tmp, src);
const t2 = performance.now();
await import(tmp);
const t3 = performance.now();
console.log(JSON.stringify({ compileMs: t1 - t0, jsBytes: src.length, importMs: t3 - t2 }));
