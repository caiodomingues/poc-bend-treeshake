# Outside Bun's bundler (node v22.23.5, esbuild 0.28.2, rollup, vite, webpack 5.113.0)

Each row runs the built consumer with node. "same" means it printed what released Bend prints with a default import under plain node.

| Fixture | Compiler | Import | Environment | Output | Bundle (raw / gz) |
|---|---|---|---|---|---|
| 06-large-library | orig | default | node | same | — |
| 06-large-library | orig | default | node-loader | same | — |
| 06-large-library | orig | default | esbuild-esm | same | 183.6 KB / 37.3 KB |
| 06-large-library | orig | default | esbuild-cjs | same | 183.6 KB / 37.3 KB |
| 06-large-library | orig | default | rollup-esm | same | 239.0 KB / 37.9 KB |
| 06-large-library | orig | default | rollup-cjs | same | 239.1 KB / 37.9 KB |
| 06-large-library | orig | default | vite | same | 1426.8 KB / 63.7 KB |
| 06-large-library | orig | default | webpack | same | 184.7 KB / 37.2 KB |
| 06-large-library | patched | default | node | same | — |
| 06-large-library | patched | default | node-loader | same | — |
| 06-large-library | patched | default | esbuild-esm | same | 3.3 KB / 0.9 KB |
| 06-large-library | patched | default | esbuild-cjs | same | 3.3 KB / 0.9 KB |
| 06-large-library | patched | default | rollup-esm | same | 4.4 KB / 1.1 KB |
| 06-large-library | patched | default | rollup-cjs | same | 4.4 KB / 1.1 KB |
| 06-large-library | patched | default | vite | same | 24.2 KB / 2.0 KB |
| 06-large-library | patched | default | webpack | same | 3.3 KB / 1.0 KB |
| 06-large-library | named | default | node | same | — |
| 06-large-library | named | default | node-loader | same | — |
| 06-large-library | named | default | esbuild-esm | same | 183.6 KB / 37.3 KB |
| 06-large-library | named | default | esbuild-cjs | same | 183.6 KB / 37.3 KB |
| 06-large-library | named | default | rollup-esm | same | 240.0 KB / 38.0 KB |
| 06-large-library | named | default | rollup-cjs | same | 240.0 KB / 38.0 KB |
| 06-large-library | named | default | vite | same | 1427.8 KB / 63.8 KB |
| 06-large-library | named | default | webpack | same | 185.3 KB / 36.9 KB |
| 06-large-library | named | named | node | same | — |
| 06-large-library | named | named | esbuild-esm | same | 3.3 KB / 0.9 KB |
| 06-large-library | named | named | esbuild-cjs | same | 3.3 KB / 0.9 KB |
| 06-large-library | named | named | rollup-esm | same | 4.4 KB / 1.1 KB |
| 06-large-library | named | named | rollup-cjs | same | 4.4 KB / 1.1 KB |
| 06-large-library | named | named | vite | same | 24.2 KB / 2.0 KB |
| 06-large-library | named | named | webpack | same | 3.3 KB / 1.0 KB |
| 09-names | orig | default | node | same | — |
| 09-names | orig | default | node-loader | same | — |
| 09-names | orig | default | esbuild-esm | same | 1.2 KB / 0.4 KB |
| 09-names | orig | default | esbuild-cjs | same | 1.2 KB / 0.4 KB |
| 09-names | orig | default | rollup-esm | same | 1.9 KB / 0.6 KB |
| 09-names | orig | default | rollup-cjs | same | 1.9 KB / 0.6 KB |
| 09-names | orig | default | vite | same | 2.4 KB / 0.6 KB |
| 09-names | orig | default | webpack | same | 1.0 KB / 0.4 KB |
| 09-names | patched | default | node | same | — |
| 09-names | patched | default | node-loader | same | — |
| 09-names | patched | default | esbuild-esm | same | 1.2 KB / 0.4 KB |
| 09-names | patched | default | esbuild-cjs | same | 1.2 KB / 0.4 KB |
| 09-names | patched | default | rollup-esm | same | 1.9 KB / 0.6 KB |
| 09-names | patched | default | rollup-cjs | same | 1.9 KB / 0.6 KB |
| 09-names | patched | default | vite | same | 2.4 KB / 0.7 KB |
| 09-names | patched | default | webpack | same | 1.0 KB / 0.4 KB |
| 09-names | named | default | node | same | — |
| 09-names | named | default | node-loader | same | — |
| 09-names | named | default | esbuild-esm | same | 1.2 KB / 0.5 KB |
| 09-names | named | default | esbuild-cjs | same | 1.2 KB / 0.5 KB |
| 09-names | named | default | rollup-esm | same | 2.2 KB / 0.6 KB |
| 09-names | named | default | rollup-cjs | same | 2.2 KB / 0.6 KB |
| 09-names | named | default | vite | same | 2.6 KB / 0.7 KB |
| 09-names | named | default | webpack | same | 1.1 KB / 0.5 KB |
| 09-names | named | named | node | same | — |
| 09-names | named | named | esbuild-esm | same | 1.2 KB / 0.5 KB |
| 09-names | named | named | esbuild-cjs | same | 1.2 KB / 0.5 KB |
| 09-names | named | named | rollup-esm | same | 2.2 KB / 0.6 KB |
| 09-names | named | named | rollup-cjs | same | 2.2 KB / 0.6 KB |
| 09-names | named | named | vite | same | 2.6 KB / 0.7 KB |
| 09-names | named | named | webpack | same | 1.0 KB / 0.4 KB |
| 11-esmodule-name | orig | default | node | same | — |
| 11-esmodule-name | orig | default | node-loader | same | — |
| 11-esmodule-name | orig | default | esbuild-esm | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | orig | default | esbuild-cjs | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | orig | default | rollup-esm | same | 0.5 KB / 0.3 KB |
| 11-esmodule-name | orig | default | rollup-cjs | same | 0.5 KB / 0.3 KB |
| 11-esmodule-name | orig | default | vite | same | 0.5 KB / 0.3 KB |
| 11-esmodule-name | orig | default | webpack | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | patched | default | node | same | — |
| 11-esmodule-name | patched | default | node-loader | same | — |
| 11-esmodule-name | patched | default | esbuild-esm | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | patched | default | esbuild-cjs | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | patched | default | rollup-esm | same | 0.5 KB / 0.3 KB |
| 11-esmodule-name | patched | default | rollup-cjs | same | 0.5 KB / 0.3 KB |
| 11-esmodule-name | patched | default | vite | same | 0.5 KB / 0.3 KB |
| 11-esmodule-name | patched | default | webpack | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | named | default | node | same | — |
| 11-esmodule-name | named | default | node-loader | same | — |
| 11-esmodule-name | named | default | esbuild-esm | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | named | default | esbuild-cjs | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | named | default | rollup-esm | same | 0.6 KB / 0.3 KB |
| 11-esmodule-name | named | default | rollup-cjs | same | 0.6 KB / 0.3 KB |
| 11-esmodule-name | named | default | vite | same | 0.5 KB / 0.3 KB |
| 11-esmodule-name | named | default | webpack | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | named | named | node | same | — |
| 11-esmodule-name | named | named | esbuild-esm | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | named | named | esbuild-cjs | same | 0.3 KB / 0.2 KB |
| 11-esmodule-name | named | named | rollup-esm | same | 0.5 KB / 0.3 KB |
| 11-esmodule-name | named | named | rollup-cjs | same | 0.5 KB / 0.3 KB |
| 11-esmodule-name | named | named | vite | same | 0.4 KB / 0.3 KB |
| 11-esmodule-name | named | named | webpack | same | 0.3 KB / 0.2 KB |

No differences.
