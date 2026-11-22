# poc-bend-treeshake

A proof of concept for a one-line change to [Bend](https://github.com/bendlang/bend)'s JS loader.
With it, a page that imports a `.bend` file ships only the code that file reaches, instead of
every definition of every file it imports.

**Status: evidence gathered, not yet proposed upstream.** This repository exists to test the
change against realistic cases before opening an issue or pull request on Bend.

## The problem

Bend 2.0.40's loader (the bun plugin in `bend2/main.ts`) compiles each imported `.bend` with
`js_lib(book, mod = true)` in `bend2/comp.ts`. In that mode:

1. every live, non-IO definition of the **whole book** becomes an export. That includes every
   definition of every file the module imports, under keys like `"lib:unused_big"`;
2. the compiler then compiles everything reachable from all of them;
3. everything is exported as one object, `export default { ... }`, and bundlers cannot drop
   properties of an object.

So a module that uses one definition of a large library ships the whole library. This came up
in a real project: one animation clip out of a 42-clip library put **1.89 MB gzip** of JS on a
page (table below). The CLI build (`bend x.bend -o x.js`) does not have this problem, because it
roots only `main`.

## The change ([`patch/js-lib-own-defs.patch`](patch/js-lib-own-defs.patch))

```diff
-    return done_live(t) && !t.b && t.x === 0 && io_base(FL.book, t.T) === null;
+    return done_live(t) && !t.b && t.x === 0 && io_base(FL.book, t.T) === null
+      && !k.includes(":");   // its own defs: an imported file's ns:name stay internal
```

A module exports only its own definitions. Imported definitions stay internal, and the
existing reachability pass keeps only what those exports reach. This follows a convention Bend
already has:
- `bend.ts` says "ns:name is internal";
- `main.ts`'s `cli_verdict` already uses `!k.includes(":")` to mean "a def of this file".

## Evidence

All runs: Bend v2.0.40 (released, and the same tag plus the patch), Bun 1.4.5, macOS 27.2 arm64.

### 1. Bend's own test corpus, differential ([`results/corpus.md`](results/corpus.md))

Every `tests/**/*.bend` of the v2.0.40 tag was compiled through both loaders in module mode and
imported. Then every exported definition of the file itself that takes no arguments was called,
and the results compared.

| | |
|---|---|
| Files | 1852 |
| Compiled and loaded by both | 1237 |
| Refused by the compiler (both, same error) | 609 |
| Crashed or timed out (both) | 6 |
| Values compared | 4605 |
| Imported-definition exports dropped by the patch | 288 |
| **Mismatches** | **0** |

### 2. Scenarios ([`results/scenarios.md`](results/scenarios.md))

Each scenario is bundled with `Bun.build` (minified), run, and its output compared.

| Scenario | released (raw / gz) | patched (raw / gz) | Output |
|---|---|---|---|
| 01 unused definition in an imported file | 0.8 / 0.3 KB | 0.3 / 0.2 KB | identical |
| 02 chain of imports (root → b → c) | 0.9 / 0.3 KB | 0.3 / 0.2 KB | identical |
| 03 diamond (b and c both import d) | 0.9 / 0.3 KB | 0.4 / 0.3 KB | identical |
| 04 imported types, constructors, closures, currying | 1.1 / 0.5 KB | 1.0 / 0.5 KB | identical |
| 05 two modules imported by JS, sharing a dependency | 1.7 / 0.4 KB | 0.6 / 0.3 KB | identical |
| 06 one definition of a 60-definition library | 183.6 / 37.3 KB | 3.4 / 1.0 KB | identical |
| 07 JS reading an imported definition through the default object | 1.0 / 0.4 KB | 0.5 / 0.3 KB | **differs (expected, see below)** |
| 08 a file's own unused definition | 0.8 / 0.3 KB | 0.8 / 0.3 KB | identical (not addressed) |

### 3. A real project ([`results/engine.md`](results/engine.md))

[opengameworld/engine](https://github.com/opengameworld/engine) at `a728de4`. It is a game engine
in Bend with a 42-clip animation library (3.8 MB of generated Bend).

| | released | patched |
|---|---|---|
| The engine's own test suite | ALL 99 TESTS PASS | ALL 99 TESTS PASS |
| Editor page JS (`bend index.html -o`) | 10,243 KB / 2,157 KB gz | 9,275 KB / 1,969 KB gz |
| A module using 1 of the 42 clips | 9,071 KB / **1,893 KB gz** | 167 KB / **33.5 KB gz** |
| The clip's value (JSON length, hash) | 209575, 4100284925987309443 | identical |

The editor page shrinks only about 9%, because the editor really uses all 42 clips. The
single-clip module shrinks about 56x.

## What changes for users

Scenario 07 is the one behavior the patch removes. A JS caller could read an imported
definition through the default object, as in `R["lib:used"]()`. After the patch that key is
gone. The engine above never did this, and no file in Bend's corpus depends on it (0
mismatches). Code outside those two sets might, though, so the proposal should say so.
Possible mitigations, for the Bend team to choose:
- accept the change as is (the keys contain `:`, so dot access never worked);
- re-export imported definitions only on request.

## What it does not address

- **A file's own unused definitions** (scenario 08) still ship, because the module is still one
  default object. Named ESM exports (`export const pick = ...`) would let bundlers drop those
  too, but they change how JS imports a module.
- **Shared code is duplicated across modules.** Each `.bend` imported from JS is compiled
  separately, with its own copy of the runtime and of shared dependencies (`run_loop2`,
  `$small_used2` in scenario 05). The engine's editor page holds 23 runtime copies. The runtime
  is small after Bun's tree shaking (about 600 B), but shared Bend code is repeated. This was not
  measured in full.

## Reproduce

Needs [Bun](https://bun.sh) and git.

```sh
./setup.sh                    # clones bendlang/bend v2.0.40 twice into .vendor/, patches one copy
bun harness/scenarios.ts      # results/scenarios.md
bun harness/corpus.ts         # results/corpus.md   (PAR=8 workers, LIMIT=n for a quick run; ~10 min)
bun harness/engine.ts         # results/engine.md   (clones opengameworld/engine, ENGINE_REF to pin)
```

`BEND_SRC=/path/to/local/bend ./setup.sh` uses a local clone instead of downloading.

## License

Apache-2.0, like Bend. The patch is a change to Bend's own source.
