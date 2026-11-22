import { gzipSync } from "node:zlib";
import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dir, "..");
export const LOADERS = ["orig", "patched", "named"] as const;
export type AnyLoader = (typeof LOADERS)[number];
export type Loader = (typeof LOADERS)[number];

export const loaderMain = (v: AnyLoader) => join(ROOT, ".vendor", v, "bend2", "main.ts");

export async function bundle(v: AnyLoader, entry: string, outdir: string, minify = true, target: "bun" | "browser" = "bun") {
  const plugin = (await import(loaderMain(v))).default;
  const r = await Bun.build({ entrypoints: [entry], outdir, target, minify, plugins: [plugin] });
  if (!r.success) throw new Error(r.logs.map(String).join("\n"));
  const js = r.outputs.filter((o) => o.path.endsWith(".js"));
  const bytes = new Uint8Array(await new Blob(await Promise.all(js.map((o) => o.arrayBuffer()))).arrayBuffer());
  return { file: js[0].path, raw: bytes.length, gz: gzipSync(bytes, { level: 9 }).length };
}

export async function run(file: string, timeoutMs = 20_000) {
  const p = Bun.spawn(["bun", file], { stdout: "pipe", stderr: "pipe", timeout: timeoutMs });
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { code: await p.exited, out: out.trim(), err: err.trim() };
}

export const kb = (n: number) => (n / 1024).toFixed(1) + " KB";
