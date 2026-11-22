// A real browser: the engine module that uses 1 of 42 clips, bundled for the browser by each
// compiler, minified (a production build) and unminified (what a dev server serves), loaded in
// a headless Chromium with the cache off, served gzipped as a real server would. Measured:
// milliseconds from navigation until the module has run and computed the clip, under three
// conditions: localhost at normal CPU; localhost with the CPU slowed 4x; and a phone on a slow
// link (CPU 4x slower, 1.6 Mbit/s down, 150 ms latency, emulated by the browser).
// Median of ROUNDS rounds, interleaved.
//
// BROWSER is the Chromium to drive (default: Brave on macOS; any Chrome works). It runs headless
// with a throwaway profile.
import { mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import puppeteer from "puppeteer-core";
import { ROOT, LOADERS, bundle, kb, type AnyLoader } from "./lib";

const ROUNDS = Number(process.env.ROUNDS ?? 5);
const BROWSER = process.env.BROWSER ?? "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const one = join(ROOT, ".vendor", "eng", "engine", "poc", "one.bend");
if (!existsSync(one)) throw new Error("run harness/engine.ts first");

const site = join(ROOT, ".out", "browser");
const builds: { id: string; v: AnyLoader; minify: boolean; raw: number; gz: number }[] = [];
for (const v of LOADERS) for (const minify of [true, false]) {
  const id = `${v}-${minify ? "min" : "dev"}`;
  const dir = join(site, id);
  mkdirSync(dir, { recursive: true });
  const imp = v === "named" ? `import { jog } from ${JSON.stringify(one)};\nconst s = JSON.stringify(jog());`
    : `import O from ${JSON.stringify(one)};\nconst s = JSON.stringify(O.jog());`;
  await Bun.write(join(dir, "entry.js"), `${imp}\nwindow.__check = s.length;\nwindow.__ready = performance.now();\n`);
  const b = await bundle(v, join(dir, "entry.js"), join(dir, "out"), minify, "browser");
  await Bun.write(join(dir, "out", "index.html"), `<!doctype html><meta charset="utf-8"><script type="module" src="./entry.js"></script>\n`);
  builds.push({ id, v, minify, raw: b.raw, gz: b.gz });
}

// compressed once, up front, so the server's own gzip time never enters a measurement
const gz = new Map<string, Uint8Array>();
for (const b of builds) for (const f of ["index.html", "entry.js"]) {
  gz.set(`/${b.id}/out/${f}`, Bun.gzipSync(new Uint8Array(await Bun.file(join(site, b.id, "out", f)).arrayBuffer())));
}
const server = Bun.serve({ port: 0, fetch: (req) => {
  const p = new URL(req.url).pathname;
  const body = gz.get(p);
  if (!body) return new Response("not found", { status: 404 });
  return new Response(body, { headers: { "Content-Type": p.endsWith(".html") ? "text/html" : "text/javascript",
    "Content-Encoding": "gzip", "Cache-Control": "no-store" } });
} });

const CONDITIONS = [
  { name: "localhost, normal CPU", cpu: 1, net: null },
  { name: "localhost, CPU 4x slower", cpu: 4, net: null },
  { name: "phone: CPU 4x slower, 1.6 Mbit/s, 150 ms", cpu: 4, net: { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750 } },
] as const;

const profile = mkdtempSync(join(tmpdir(), "bend-poc-profile-"));
const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, userDataDir: profile,
  args: ["--no-first-run", "--no-default-browser-check", "--disable-extensions"] });
const version = await browser.version();
const times: Record<string, Record<string, number[]>> = {};
const checks = new Set<number>();
try {
  for (let r = 0; r < ROUNDS; r++) for (const c of CONDITIONS) {
    for (const b of r % 2 ? [...builds].reverse() : builds) {
      const page = await browser.newPage();
      const cdp = await page.createCDPSession();
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: c.cpu });
      if (c.net) await cdp.send("Network.emulateNetworkConditions", c.net);
      await page.goto(`http://localhost:${server.port}/${b.id}/out/index.html`);
      await page.waitForFunction("window.__ready !== undefined", { timeout: 300_000 });
      const [ready, check] = await page.evaluate(() => [(window as any).__ready, (window as any).__check]);
      checks.add(check);
      ((times[b.id] ??= {})[c.name] ??= []).push(ready);
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.stop(true);
  rmSync(profile, { recursive: true, force: true });
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const ms = (x: number) => (x >= 1000 ? (x / 1000).toFixed(2) + " s" : x.toFixed(0) + " ms");
const rows = builds.map((b) => `| ${b.v} | ${b.minify ? "minified" : "unminified (dev)"} | ${kb(b.raw)} / ${kb(b.gz)} | ${CONDITIONS.map((c) => ms(median(times[b.id][c.name]))).join(" | ")} |`);
const report = `# In a browser (${version}, headless, cache off; median of ${ROUNDS})\n\n` +
  "The engine module that uses 1 of 42 clips. Time = from navigation until the module ran and computed the clip.\n" +
  `Patch 2 uses a named import. Every run computed the same clip (JSON length ${[...checks].join(", ")}).\n\n` +
  "| Compiler | Build | JS (raw / gz) | " + CONDITIONS.map((c) => c.name).join(" | ") + " |\n|---|---|---|---|---|---|\n" + rows.join("\n") + "\n";
await Bun.write(join(ROOT, "results", "browser.md"), report);
console.log(report);
if (checks.size !== 1) { console.log("DIFFERENT RESULTS ACROSS BUILDS"); process.exit(1); }
