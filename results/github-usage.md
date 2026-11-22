# Public code that imports .bend modules (GitHub code search, 2026-11-22)

Queries: `".bend"`, `bend2/main.ts`, `bend loader plugin` in javascript and typescript. 272 files found; 5 files in 3 repositories import a .bend module.

| | Files |
|---|---|
| Only `X.name` with plain names (unaffected by either patch) | 4 |
| Hand the module object to other code (not followed) | 1 |
| Reach keys in a way an imported key could be among them | 0 |

## Files that hand the module object on

- `oxiglade/toph/scripts/vendor-bend.ts`: basePath

Limits: code search covers default branches GitHub has indexed and returns at most 300 results per
query here; a match is a text pattern, so a file listed above still needs a human look.


## Checked by hand

- `oxiglade/toph/scripts/vendor-bend.ts`: `import basePath from "./base.bend" with { type: "file" }`
  imports the file's path as an asset, not a Bend module. Not a use of the loader's default
  object, so neither patch affects it.

Net: no public file found that depends on the default object's imported keys.
