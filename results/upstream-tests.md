# Tests in Bend's format (upstream/tests/io)

Each prints 0 when what it checks holds, or the number of the first check that failed.

| Test | Compiler | Interpreted | Compiled to JS |
|---|---|---|---|
| bundle_own_exports | orig | fail (prints 2) | fail (prints 2) |
| bundle_named_exports | orig | fail (prints 1) | fail (prints 1) |
| bundle_own_exports | patched | pass | pass |
| bundle_named_exports | patched | fail (prints 1) | fail (prints 1) |
| bundle_own_exports | named | fail (prints 2) | fail (prints 2) |
| bundle_named_exports | named | pass | pass |
