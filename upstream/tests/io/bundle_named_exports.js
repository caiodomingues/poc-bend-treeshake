function bundle_named_exports() {
  const fs = require("node:fs");
  const path = require("node:path");
  const child = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(process.cwd(), ".bend-named-exports-"));
  const run = (...args) => child.spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: { ...process.env, HOME: dir, BEND_ORIGIN: "http://127.0.0.1:9" },
  });
  const put = (name, text) => fs.writeFileSync(path.join(dir, name), text);
  const page = (name, script) => {
    const out = path.join(dir, "out-" + name);
    put(name + ".html", '<script type="module">' + script + "</script>\n");
    if (run(path.resolve("bend2/main.ts"), path.join(dir, name + ".html"), "-o", out).status !== 0) return null;
    const js = fs.readdirSync(out).filter((f) => f.endsWith(".js"))
      .map((f) => fs.readFileSync(path.join(out, f), "utf8")).join("");
    const src = /src="([^"]+)"/.exec(fs.readFileSync(path.join(out, name + ".html"), "utf8"))?.[1];
    const got = src ? run(path.resolve(out, src)) : null;
    return { js, out: got?.status === 0 ? got.stdout.trim() : null };
  };
  try {
    put("lib.bend", 'import Base\n\ndef used() -> U32: 7\n\ndef unused() -> String: "BEND_UNUSED_7f3a"\n');
    put("m.bend", "import Base\nimport ./lib.bend as L\n\ndef pick() -> U32: L.used()\n\n"
      + 'def own_unused() -> String: "BEND_OWN_UNUSED_9c1d"\n\n'
      + "def Place.word() -> U32: 5\n\ndef then() -> U32: 1\n\ndef default() -> U32: 2\n");
    const named = page("named", 'import { pick } from "./m.bend"; console.log(pick());');
    if (!named || named.out !== "7") return 1;
    if (named.js.includes("BEND_UNUSED_7f3a") || named.js.includes("BEND_OWN_UNUSED_9c1d")) return 2;
    const dflt = page("dflt", 'import M from "./m.bend"; console.log(M.pick(), typeof M["lib:used"]);');
    if (!dflt || dflt.out !== "7 function") return 3;
    const names = page("names", 'import M, * as ns from "./m.bend"; import { "Place.word" as w } from "./m.bend";'
      + ' console.log(w(), M.then(), M.default(), "then" in ns, ns.default === M);');
    return names && names.out === "5 1 2 false true" ? 0 : 4;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

io_eff(CID(Bundle.named_exports), bundle_named_exports);
