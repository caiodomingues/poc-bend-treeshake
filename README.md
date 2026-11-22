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
page. The CLI build (`bend x.bend -o x.js`) does not have this problem, because it roots only
`main`.

## Two changes

**Patch 1, own definitions only** ([`patch/js-lib-own-defs.patch`](patch/js-lib-own-defs.patch), one line)

A module exports only its own definitions. Imported definitions stay internal, and the existing
reachability pass keeps only what those exports reach. This follows a convention Bend already
has:
- `bend.ts` says "ns:name is internal";
- `main.ts`'s `cli_verdict` already uses `!k.includes(":")` to mean "a def of this file";
- the guide describes `-o f.mjs`, which takes the same code path, as "an ES module of its non-IO
  defs".

It removes one behavior: JS can no longer read an imported definition through the default
object (`R["lib:used"]()`).

**Patch 2, named exports beside the default object** ([`patch/named-exports.patch`](patch/named-exports.patch), about 20 lines)

The default object stays exactly as it is today. Each of the file's own definitions is also a
named export under its Bend name, and every value is marked `/* @__PURE__ */` so a bundler may
drop what nobody imports.
- `import R from "./x.bend"` behaves as today.
- `import { pick } from "./x.bend"` lets the bundler drop everything else, including the file's
  own unused definitions, which patch 1 does not reach.

Bend names that are awkward in JS:

| Bend def | Named export | How JS imports it |
|---|---|---|
| `Place.word` (dotted) | yes, under its exact name (an ES2022 string export name) | `import { "Place.word" as word }`, or `NS["Place.word"]` |
| `new`, `class`, `constructor`, `__proto__` (reserved words) | yes | `import { new as n }` |
| `default` | no: it would clash with the default export | `R.default()` (default object, as today) |
| `then` | no: it would make the module a thenable, which `await import()` never resolves (observed: the import hangs) | `R.then()` (default object, as today) |

No mangling is needed: the export name is the Bend name.

## Evidence

All runs used Bend v2.0.40, both as released and with each patch, on Bun 1.4.5 under macOS 27.2
(arm64).

### 1. Bend's own test corpus, differential ([`results/corpus.md`](results/corpus.md))

Every `tests/**/*.bend` of the v2.0.40 tag was compiled in module mode by all three compilers and
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

All outputs match released Bend except patch 1 on scenario 07, which is the one behavior it
removes.

### 3. A real project ([`results/engine.md`](results/engine.md))

[opengameworld/engine](https://github.com/opengameworld/engine) at `a728de4`, a game engine in Bend
with a 42-clip animation library (3.8 MB of generated Bend).

| | released | patch 1 | patch 2 |
|---|---|---|---|
| The engine's test suite | ALL 99 PASS | ALL 99 PASS | ALL 99 PASS |
| Editor page JS (`bend index.html -o`, default imports) | 10,243 / 2,157 KB | 9,275 / 1,969 KB | 10,249 / 2,160 KB |
| A module using 1 of the 42 clips | 9,071 / **1,893 KB** | 167 / **33.5 KB** | 167 / **33.4 KB** (named import) |
| The clip's value (length, hash) | 209575, 4100284925987309443 | identical | identical |

### 4. Public code that imports `.bend` modules ([`results/github-usage.md`](results/github-usage.md))

GitHub code search turned up 272 candidate files, of which 5 files in 3 repositories import a
`.bend` module:
- **4** use only `X.name` with plain names, which neither patch changes.
- **1** was flagged, and on inspection it imports a `.bend` file as a path asset
  (`with { type: "file" }`), not as a module.
- **0** depend on the default object's imported keys.

The limits: code search only covers indexed default branches, so this is a sample, not a census.

## Choosing between them

| | Patch 1 | Patch 2 |
|---|---|---|
| Size of the change | 1 line | about 20 lines |
| Behavior removed | JS reading imported definitions through the default object (none found in use) | none |
| Benefit with `import R from` (today's style) | yes, automatic | none |
| Benefit with `import { x } from` | yes | yes, and it also drops the file's own unused definitions |
| Cost | none | a few bytes per module, for the export list |

They also combine: patch 1's export set with patch 2's named exports gives both the automatic win
and the finer one. Code that relied on an imported key migrates with one line in Bend, re-exporting
the definition from its own file:

```
def used() -> U32: L.used()
```

## Not addressed

**Shared code is duplicated across modules.** Each `.bend` imported from JS is compiled
separately, with its own copy of the runtime and of shared dependencies (`run_loop2` and
`$small_used2` in scenario 05). The engine's editor page holds 23 runtime copies. The runtime is
small after tree shaking (about 600 B), but shared Bend code is repeated. Neither patch changes
this, and it was not measured in full.

## Reproduce

Needs [Bun](https://bun.sh), git, and for the last step the [gh](https://cli.github.com) CLI,
logged in.

```sh
./setup.sh                    # bendlang/bend v2.0.40 three times in .vendor/: released, patch 1, patch 2
bun harness/scenarios.ts      # results/scenarios.md
bun harness/corpus.ts         # results/corpus.md        (PAR=8, LIMIT=n for a quick run; ~15 min)
bun harness/engine.ts         # results/engine.md        (clones opengameworld/engine; ENGINE_REF pins it)
bun harness/github-usage.ts   # results/github-usage.md  (rate-limited; a few minutes)
```

`BEND_SRC=/path/to/local/bend ./setup.sh` uses a local clone instead of downloading.

## License

Apache-2.0, like Bend. The patches are changes to Bend's own source.
