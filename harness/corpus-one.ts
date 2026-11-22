// One corpus file through one loader, in module mode (the bun plugin's path). Prints one JSON
// line: the compile outcome, the exported keys, and the value of every own export that takes no
// arguments.
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loaderMain, type Loader } from "./lib";

const [v, file] = Bun.argv.slice(2) as [Loader, string];
const { load } = await import(loaderMain(v));
const show = (x: unknown) => JSON.stringify(x, (_, y) => (typeof y === "bigint" ? `${y}n` : typeof y === "function" ? "<fn>" : y));

let source: string;
try {
  source = (await load(pathToFileURL(file).href, {}, () => null)).source;
} catch (e) {
  console.log(show({ compiled: false, error: String(e).split("\n")[0] }));
  process.exit(0);
}

const tmp = join(tmpdir(), `bend-ts-${v}-${process.pid}.mjs`);
await Bun.write(tmp, source);
let mod: Record<string, unknown>;
try {
  mod = (await import(tmp)).default ?? {};
} catch (e) {
  console.log(show({ compiled: true, loaded: false, error: String(e).split("\n")[0] }));
  process.exit(0);
}

const keys = Object.keys(mod).sort();
const values: Record<string, string> = {};
for (const k of keys.filter((k) => !k.includes(":"))) {
  const f = mod[k] as (...a: unknown[]) => unknown;
  try {
    const r = f();
    values[k] = typeof r === "function" ? "<takes arguments>" : show(r);
  } catch (e) {
    values[k] = "<throws> " + String(e).split("\n")[0];
  }
}
console.log(show({ compiled: true, loaded: true, bytes: source.length, keys, values }));
