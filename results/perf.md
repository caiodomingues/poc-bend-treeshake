# Compile and import time (Bun 1.4.5, 7 rounds, fresh process each, interleaved; median (min–max))

Compile = the loader turning the .bend into JS (module mode, unminified: what the dev server serves). Import = bun importing that JS.
Patch 2 is measured with the default object, as released code imports it; its named exports change bundles, not this.

| Module | Compiler | Compile | JS (unminified) | Import |
|---|---|---|---|---|
| 06 one def of a 60-def library | orig | 100 ms (98–120) | 242.7 KB | 11.5 ms (11.1–57.8) |
| 06 one def of a 60-def library | patched | 63 ms (61–64) | 8.1 KB | 10.8 ms (10.6–13.0) |
| 06 one def of a 60-def library | named | 103 ms (101–104) | 243.7 KB | 11.5 ms (11.1–16.0) |
| engine: module using 1 of 42 clips | orig | 3102 ms (3068–3470) | 18938.7 KB | 90.6 ms (82.2–99.3) |
| engine: module using 1 of 42 clips | patched | 764 ms (754–797) | 327.4 KB | 11.2 ms (11.1–12.0) |
| engine: module using 1 of 42 clips | named | 3115 ms (2975–3293) | 18998.3 KB | 92.3 ms (82.6–298.1) |
| engine: editor workspace page (uses all 42) | orig | 3216 ms (3071–3357) | 20108.2 KB | 96.9 ms (81.2–112.6) |
| engine: editor workspace page (uses all 42) | patched | 3041 ms (2956–3129) | 19338.6 KB | 81.6 ms (70.5–100.4) |
| engine: editor workspace page (uses all 42) | named | 3262 ms (3076–3414) | 20191.6 KB | 103.6 ms (91.4–263.5) |
