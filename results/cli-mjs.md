# `bend root.bend -o root.mjs` (scenario 01: root.bend imports lib.bend)

The guide (v2.0.40, GUIDE.md): `bend file.bend -o f.mjs   # emit an ES module of its non-IO defs, for JS to import`

root.bend's own non-IO defs: `pick`. lib.bend's: `used`, `unused_big`.

| Compiler | Keys of the default export | Named exports |
|---|---|---|
| orig | `lib:used`, `lib:unused_big`, `pick` | — |
| patched | `pick` | — |
| named | `lib:used`, `lib:unused_big`, `pick` | `pick` |
