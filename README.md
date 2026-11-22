# poc-bend-treeshake

A proof of concept for letting pages drop unused code when they import a `.bend` file through
[Bend](https://github.com/bendlang/bend)'s JS loader. Today a page that imports a `.bend` file
ships every definition of every file that file imports. This repository tests two small changes
to Bend's compiler against realistic cases before anything is proposed upstream.

**Status: evidence gathered, not yet proposed upstream.**

## The problem

Bend 2.0.40's loader (the bun plugin in `bend2/main.ts`) compiles each imported `.bend` with
`js_lib(book, mod = true)` in `bend2/comp.ts`. In that mode:

1. every live, non-IO definition of the **whole book** becomes an export. That includes every
   definition of every file the module imports, under keys like `"lib:unused_big"`;
2. the compiler compiles everything reachable from all of them;
3. everything is exported as one object, `export default { ... }`, and bundlers cannot drop
   properties of an object.

So a module that uses one definition of a large library ships the whole library. This came up
in a real project: one animation clip out of a 42-clip library put **1.89 MB gzip** of JS on a
page. On an emulated phone (CPU 4x slower, 1.6 Mbit/s) that page took **10.2 s** to become ready;
with patch 1 it took **0.52 s**.

It also contradicts the guide. The guide says `bend file.bend -o f.mjs` emits "an ES module of
**its** non-IO defs". Run on a file that imports another, that command also exports the imported
file's definitions ([`results/cli-mjs.md`](results/cli-mjs.md)). Patch 1 makes it do what the
guide says.

The whole-program build (`bend x.bend -o x.js`) does not have this problem, because it roots only
`main`.

## Two changes

**Patch 1, own definitions only** ([`patch/js-lib-own-defs.patch`](patch/js-lib-own-defs.patch), one line)

```diff
-    return done_live(t) && !t.b && t.x === 0 && io_base(FL.book, t.T) === null;
+    return done_live(t) && !t.b && t.x === 0 && io_base(FL.book, t.T) === null
+      && !k.includes(":");
```

A module exports only its own definitions. Imported ones stay internal, and the existing
reachability pass keeps only what the exports reach. This follows conventions Bend already has:
- `bend.ts` says "ns:name is internal";
- `main.ts`'s `cli_verdict` already uses `!k.includes(":")` to mean "a def of this file";
- the guide describes `-o f.mjs`, which takes this code path, as "an ES module of its non-IO
  defs".

**Patch 2, named exports beside the default object** ([`patch/named-exports.patch`](patch/named-exports.patch), about 20 lines)

The default object stays exactly as it is today. Each of the file's own definitions is also a
named export under its exact Bend name (an ES2022 string export name, so `Place.word` needs no
mangling). Every value is marked `/* @__PURE__ */`, so a bundler may drop what nobody imports.
- `import R from "./x.bend"` behaves as today.
- `import { pick } from "./x.bend"` lets the bundler drop everything else, including the file's
  own unused definitions.

Two names cannot become named exports, and stay reachable through the default object:
- `default` clashes with the default export (observed: the build fails);
- `then` makes the module a thenable that `await import()` never resolves (observed: the import
  hangs).

## Evidence

All runs used Bend v2.0.40, as released and with each patch; Bun 1.4.5; Node 22.23.5; Chromium
158 (Brave, headless); macOS 27.2 (arm64).

### 1. Bend's own test corpus, differential ([`results/corpus.md`](results/corpus.md))

Every `tests/**/*.bend` of the tag was compiled in module mode by all three compilers and
imported. Every exported definition of the file itself that takes no arguments was called.

| | |
|---|---|
| Files | 1852 |
| Compiled and loaded | 1237 |
| Refused by the compiler (all three, same error) | 609 |
| Crashed or timed out (all three) | 6 |
| Values compared | 4605 |
| **Patch 1: mismatches** | **0** (it drops 288 imported-definition exports) |
| **Patch 2: differences from released** (default object, keys, values, outcomes) | **0** |
| Patch 2: named exports checked to be the very function the default object holds | 4602 |

### 2. Scenarios ([`results/scenarios.md`](results/scenarios.md))

Each scenario is bundled with `Bun.build` (minified) and run. Sizes are raw / gzip.

| Scenario | released | patch 1 | patch 2, `import R` | patch 2, `import { x }` |
|---|---|---|---|---|
| 01 unused definition in an imported file | 0.8 / 0.3 KB | 0.3 / 0.2 KB | same output, +4 B | 0.3 / 0.2 KB |
| 02 chain of imports | 0.9 / 0.3 KB | 0.3 / 0.2 KB | same output, +4 B | 0.3 / 0.2 KB |
| 03 diamond | 0.9 / 0.3 KB | 0.4 / 0.3 KB | same output, +4 B | 0.4 / 0.2 KB |
| 04 imported types, constructors, closures, currying | 1.1 / 0.5 KB | 1.0 / 0.5 KB | same output, +16 B | 0.9 / 0.5 KB |
| 05 two modules sharing a dependency | 1.7 / 0.4 KB | 0.6 / 0.3 KB | same output, +8 B | 0.6 / 0.3 KB |
| 06 one definition of a 60-definition library | 183.6 / 37.3 KB | 3.4 / 1.0 KB | same output, +6 B | 3.4 / 1.0 KB |
| 07 JS reading an imported definition through the default object | 1.0 / 0.4 KB | **output differs** | **same output**, +4 B | — |
| 08 a file's own unused definition | 0.8 / 0.3 KB | 0.8 / 0.3 KB | same output, +8 B | **0.3 / 0.2 KB** |
| 09 dotted names, reserved words, `default`, `then` | 1.2 / 0.5 KB | 1.2 / 0.5 KB | same output, +36 B | same output |
| 10 an imported file's JS effect with code that runs at load | — | **output differs** | **same output** | same output |
| 11 a definition named `__esModule` | — | same output | same output | same output |

### 3. Outside Bun's bundler ([`results/environments.md`](results/environments.md))

Scenarios 06, 09 and 11 were compiled to a standalone ES module (what `bend x.bend -o x.mjs`
writes) and run in eight environments:
- Node with no bundler;
- Node through Bend's own loader;
- esbuild (ESM and CommonJS);
- Rollup (ESM and CommonJS);
- Vite;
- webpack.

In every environment, every compiler and import style **printed what released Bend prints**. That
includes dotted names, reserved words and `__esModule` in CommonJS output. Every bundler also drops
the unused code, as this gzip comparison for scenario 06 shows:

| Bundler | released | patch 1 | patch 2, named import |
|---|---|---|---|
| esbuild | 37.3 KB | 0.9 KB | 0.9 KB |
| Rollup | 37.9 KB | 1.1 KB | 1.1 KB |
| webpack | 37.2 KB | 1.0 KB | 1.0 KB |
| Vite (library mode, whitespace kept) | 63.7 KB | 2.0 KB | 2.0 KB |

Bend's loader under Node needs `--experimental-transform-types` even as released: `main.ts` uses
a TypeScript parameter property, which Node's default strip-only mode rejects. This happens
without either patch.

### 4. A real project ([`results/engine.md`](results/engine.md))

[opengameworld/engine](https://github.com/opengameworld/engine) at `a728de4`, a game engine in Bend
with a 42-clip animation library (3.8 MB of generated Bend).

| | released | patch 1 | patch 2 |
|---|---|---|---|
| The engine's test suite | ALL 99 PASS | ALL 99 PASS | ALL 99 PASS |
| Editor page JS (`bend index.html -o`, default imports) | 10,243 / 2,157 KB | 9,275 / 1,969 KB | 10,249 / 2,160 KB |
| A module using 1 of the 42 clips | 9,071 / **1,893 KB** | 167 / **33.5 KB** | 167 / **33.4 KB** (named import) |
| The clip's value (length, hash) | 209575, 4100284925987309443 | identical | identical |

(Patch 1 was measured here with an earlier, comment-only variant; the code is the same.)

### 5. Time, not just size ([`results/perf.md`](results/perf.md), [`results/browser.md`](results/browser.md))

These are the engine module that uses 1 of the 42 clips, and the editor page. Compile and import
times are medians of 7 rounds, each a fresh process, with the compilers interleaved.

| | released | patch 1 | patch 2 |
|---|---|---|---|
| Loader compile, 1-clip module (what `bun run dev` pays on every `.bend` change) | 3,102 ms | **764 ms** | 3,115 ms |
| JS the dev server serves for it (unminified) | 18.9 MB | **327 KB** | 19.0 MB |
| Bun importing that JS | 91 ms | **11 ms** | 92 ms |
| Loader compile, editor page (really uses all 42 clips) | 3,216 ms | 3,041 ms | 3,262 ms |

Patch 2 does not speed up compiling. It still compiles everything and only lets a bundler drop code
afterwards.

In a browser (Chromium 158, headless, cache off, files served gzipped; median of 5), the time from
navigation until the module has run and computed the clip:

| Build | released | patch 1 | patch 2 (named import) |
|---|---|---|---|
| Minified, localhost | 86 ms | 18 ms | 19 ms |
| Minified, CPU 4x slower | 120 ms | 43 ms | 44 ms |
| **Minified, phone: CPU 4x slower, 1.6 Mbit/s, 150 ms latency** | **10.18 s** | **0.52 s** | **0.51 s** |
| Unminified (dev), phone conditions | 12.11 s | 0.55 s | 0.54 s |

The network conditions are emulated by the browser (Chrome DevTools Protocol), not a real phone.
Every run computed the same clip.

### 6. Public code that imports `.bend` modules ([`results/github-usage.md`](results/github-usage.md))

GitHub code search turned up 272 candidate files, of which 5 files in 3 repositories import a
`.bend` module:
- **4** use only `X.name` with plain names, which neither patch changes.
- **1** was flagged, and on inspection it imports a `.bend` file as a path asset, not as a module.
- **0** depend on the default object's imported keys.

Code search covers only what GitHub has indexed, so this is a sample, not a census.

### 7. Bend's size gate ([`results/size-gate.md`](results/size-gate.md))

`gates/repo.ts` caps `bend2/comp.ts` at 66,000 tokens. The gate counts with `ttok -m
gpt-3.5-turbo`, whose encoding is cl100k_base; we counted the same encoding with js-tiktoken.

| `comp.ts` | Tokens | Room under the cap |
|---|---|---|
| released | 65,977 | 23 |
| patch 1 | 65,984 (+7) | 16: **passes** |
| patch 2 | 66,183 (+206) | **over by 183** |

Patch 2 also stays over the cap in a compacted form (about +77 tokens). By the gate's own rule, it
needs room made by simplifying something else in `comp.ts`. That is the Bend team's call.

### 8. Tests in Bend's format ([`upstream/tests/io`](upstream/tests/io), [`results/upstream-tests.md`](results/upstream-tests.md))

`bundle_own_exports` and `bundle_named_exports` follow `tests/io/bundle_inline`: a `.bend` file
whose JS effect builds a page with the real CLI, checks it, and prints `0`. Both were run in the
two lanes that need no C twin, interpreted and compiled to JS.

| Test | released | patch 1 | patch 2 |
|---|---|---|---|
| `bundle_own_exports` | fails (check 2: unused code shipped) | **passes** | fails |
| `bundle_named_exports` | fails (check 1: no named export) | fails | **passes** |

Each test fails on released Bend and passes only with its own patch.

## Side effects, known

1. **Patch 1: JS can no longer read an imported definition through the default object**
   (`R["lib:used"]()`, scenario 07). No public code found does this. Code that did migrates with
   one line in Bend, re-exporting the definition from its own file:
   `def used() -> U32: L.used()`.
2. **Patch 1: an imported file's JS effect may stop loading when nothing uses it** (scenario 10).
   Released Bend loads it whenever an unused exported definition reaches it. In the scenario, a
   function returning IO is exported because the exporter does not see it as IO. If that effect
   file runs code at load time, that code no longer runs. Bend's own effects (`bend2/effs/*.js`)
   only register their handler at load time, so they are unaffected.
3. **Patch 2: a namespace import lists more keys.** `Object.keys(await import("./x.bend"))` returns
   the named exports as well as `default`.
4. **Patch 2: the `@__PURE__` marks are a promise.** They are true today, because `run_lib` only
   wraps a function. A future change that made it do more would have to drop them.
5. **Patch 2: it does not fit the size gate as written** (section 6).

## Choosing between them

| | Patch 1 | Patch 2 |
|---|---|---|
| Size of the change | 1 line, +7 tokens (fits the gate) | about 20 lines, +206 tokens (over the gate) |
| Faster dev compile | yes (3.1 s to 0.76 s for the 1-clip module) | no |
| Matches the guide's `-o f.mjs` wording | yes | no (still exports imported definitions) |
| Behavior changed | side effects 1 and 2 above | none for existing code |
| Benefit with `import R from` (today's style) | yes, automatic | none |
| Benefit with `import { x } from` | yes | yes, and it also drops the file's own unused definitions |

The two could also be combined (patch 1's export set plus patch 2's named exports), which should
give both the automatic win and the finer one. **That combination is not tested here.**

## Not addressed

**Shared code is duplicated across modules.** Each `.bend` imported from JS is compiled
separately, with its own copy of the runtime and of shared dependencies (`run_loop2` and
`$small_used2` in scenario 05). The engine's editor page holds 23 runtime copies. Neither patch
changes this, and it was not measured in full.

## Reproduce

Needs [Bun](https://bun.sh), [Node](https://nodejs.org) 22+, git, a Chromium-based browser for
the browser measurement (Chrome, Brave, ...; it runs headless with a throwaway profile), and for
the usage scan the [gh](https://cli.github.com) CLI, logged in.

```sh
bun install                   # esbuild, rollup, vite, webpack, js-tiktoken, puppeteer-core (dev only)
./setup.sh                    # bendlang/bend v2.0.40 three times in .vendor/: released, patch 1, patch 2
bun harness/scenarios.ts      # results/scenarios.md
bun harness/corpus.ts         # results/corpus.md          (PAR=8, LIMIT=n for a quick run; ~15 min)
bun harness/environments.ts   # results/environments.md
bun harness/engine.ts         # results/engine.md          (clones opengameworld/engine; ENGINE_REF pins it)
bun harness/size-gate.ts      # results/size-gate.md
bun harness/cli-mjs.ts        # results/cli-mjs.md         (the `-o f.mjs` command against the guide)
bun harness/perf.ts           # results/perf.md            (after engine.ts; ROUNDS=7)
bun harness/browser.ts        # results/browser.md         (after engine.ts; BROWSER=/path/to/chromium, ROUNDS=5)
bun harness/upstream-tests.ts # results/upstream-tests.md
bun harness/github-usage.ts   # results/github-usage.md    (rate-limited; a few minutes)
```

`BEND_SRC=/path/to/local/bend ./setup.sh` uses a local clone instead of downloading.

## License

Apache-2.0, like Bend. The patches are changes to Bend's own source.
