# Scenarios (Bend v2.0.40, Bun 1.4.5, minified)

| Scenario | orig raw / gz | patched raw / gz | Output | Expectation |
|---|---|---|---|---|
| 01-unused-import | 0.8 KB / 0.3 KB | 0.3 KB / 0.2 KB | identical | as expected |
| 02-import-chain | 0.9 KB / 0.3 KB | 0.3 KB / 0.2 KB | identical | as expected |
| 03-diamond | 0.9 KB / 0.3 KB | 0.4 KB / 0.3 KB | identical | as expected |
| 04-types-and-closures | 1.1 KB / 0.5 KB | 1.0 KB / 0.5 KB | identical | as expected |
| 05-two-entries | 1.7 KB / 0.4 KB | 0.6 KB / 0.3 KB | identical | as expected |
| 06-large-library | 183.6 KB / 37.3 KB | 3.4 KB / 1.0 KB | identical | as expected |
| 07-compat-imported-key | 1.0 KB / 0.4 KB | 0.5 KB / 0.3 KB | differs | as expected |
| 08-own-unused-def | 0.8 KB / 0.3 KB | 0.8 KB / 0.3 KB | identical | as expected |
