# Scenarios (Bend v2.0.40, Bun 1.4.5, minified; raw / gzip)

| Scenario | released | patch 1 (own defs) | patch 2, default import (vs released) | patch 2, named imports |
|---|---|---|---|---|
| 01-unused-import | 0.8 KB / 0.3 KB | 0.3 KB / 0.2 KB (same) | same output, +4 B | 0.3 KB / 0.2 KB (same) |
| 02-import-chain | 0.9 KB / 0.3 KB | 0.3 KB / 0.2 KB (same) | same output, +4 B | 0.3 KB / 0.2 KB (same) |
| 03-diamond | 0.9 KB / 0.3 KB | 0.4 KB / 0.3 KB (same) | same output, +4 B | 0.4 KB / 0.2 KB (same) |
| 04-types-and-closures | 1.1 KB / 0.5 KB | 1.0 KB / 0.5 KB (same) | same output, +16 B | 0.9 KB / 0.5 KB (same) |
| 05-two-entries | 1.7 KB / 0.4 KB | 0.6 KB / 0.3 KB (same) | same output, +8 B | 0.6 KB / 0.3 KB (same) |
| 06-large-library | 183.6 KB / 37.3 KB | 3.4 KB / 1.0 KB (same) | same output, +6 B | 3.4 KB / 1.0 KB (same) |
| 07-compat-imported-key | 1.0 KB / 0.4 KB | 0.5 KB / 0.3 KB (differs) | same output, +4 B | — |
| 08-own-unused-def | 0.8 KB / 0.3 KB | 0.8 KB / 0.3 KB (same) | same output, +8 B | 0.3 KB / 0.2 KB (same) |
| 09-names | 1.2 KB / 0.5 KB | 1.2 KB / 0.5 KB (same) | same output, +36 B | 1.8 KB / 0.8 KB (same) |
