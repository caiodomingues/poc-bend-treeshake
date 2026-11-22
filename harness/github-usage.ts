// How public JS/TS code uses a .bend module it imports, found with GitHub code search (needs the
// gh CLI, logged in). Patch 1 removes the default object's imported keys ("lib:used"), so the
// question is whether anyone reaches them. For each default import of a .bend file:
//   reaches  - a ":" key, a computed X[expr], Object.keys/values/entries(X), for..in X, {...X}
//   passes   - X handed whole to something else (where it goes is not followed)
//   names    - only X.name with a plain name (never an imported key)
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib";

const queries = ['".bend"', "bend2/main.ts", "bend loader plugin"];
const langs = ["javascript", "typescript"];

// code search allows about 10 requests a minute: wait and retry when GitHub says so
const gh = async (args: string[], tries = 6): Promise<string> => {
  const p = Bun.spawn(["gh", ...args], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(p.stdout).text();
  if ((await p.exited) === 0) return out;
  const err = await new Response(p.stderr).text();
  if (tries > 0 && /rate limit|secondary rate|403/i.test(err)) {
    await Bun.sleep(65_000);
    return gh(args, tries - 1);
  }
  throw new Error(err);
};

const hits = new Map<string, { repo: string; path: string }>();
for (const q of queries) for (const l of langs) {
  const r = JSON.parse(await gh(["search", "code", q, "--language", l, "--limit", "300", "--json", "repository,path"]));
  for (const x of r) hits.set(`${x.repository.nameWithOwner}/${x.path}`, { repo: x.repository.nameWithOwner, path: x.path });
}

type Use = { file: string; imports: number; reaches: string[]; passes: string[] };
const uses: Use[] = [];
const importRe = /import\s+(?:([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?|\*\s+as\s+([A-Za-z_$][\w$]*))\s+from\s+["']([^"']+\.bend)["']/g;

for (const { repo, path } of hits.values()) {
  let src: string;
  try { src = await gh(["api", `repos/${repo}/contents/${path}`, "-H", "Accept: application/vnd.github.raw"]); }
  catch { continue; }
  const u: Use = { file: `${repo}/${path}`, imports: 0, reaches: [], passes: [] };
  for (const m of src.matchAll(importRe)) {
    const x = m[1] ?? m[2];
    u.imports++;
    const e = x.replace(/\$/g, "\\$");
    const checks: [string, RegExp][] = [
      ["colon key", new RegExp(`${e}\\s*\\[\\s*["'\`][^"'\`]*:`)],
      ["computed key", new RegExp(`${e}\\s*\\[\\s*[^"'\`\\s\\]]`)],
      ["Object.keys/values/entries", new RegExp(`Object\\.(keys|values|entries)\\(\\s*${e}\\s*\\)`)],
      ["for..in", new RegExp(`for\\s*\\([^)]*\\bin\\s+${e}\\s*\\)`)],
      ["spread", new RegExp(`\\.\\.\\.\\s*${e}\\b`)],
    ];
    for (const [what, re] of checks) if (re.test(src)) u.reaches.push(`${x}: ${what}`);
    if (new RegExp(`[(,]\\s*${e}\\s*[,)]`).test(src)) u.passes.push(x);
  }
  if (u.imports) uses.push(u);
}

const reach = uses.filter((u) => u.reaches.length);
const pass = uses.filter((u) => !u.reaches.length && u.passes.length);
const repos = new Set(uses.map((u) => u.file.split("/").slice(0, 2).join("/")));
const report = `# Public code that imports .bend modules (GitHub code search, ${new Date().toISOString().slice(0, 10)})

Queries: ${queries.map((q) => "`" + q + "`").join(", ")} in ${langs.join(" and ")}. ${hits.size} files found; ${uses.length} files in ${repos.size} repositories import a .bend module.

| | Files |
|---|---|
| Only \`X.name\` with plain names (unaffected by either patch) | ${uses.length - reach.length - pass.length} |
| Hand the module object to other code (not followed) | ${pass.length} |
| Reach keys in a way an imported key could be among them | ${reach.length} |

${reach.length ? "## Files that reach keys\n\n" + reach.map((u) => `- \`${u.file}\`: ${u.reaches.join("; ")}`).join("\n") + "\n\n" : ""}${pass.length ? "## Files that hand the module object on\n\n" + pass.map((u) => `- \`${u.file}\`: ${u.passes.join(", ")}`).join("\n") + "\n" : ""}
Limits: code search covers default branches GitHub has indexed and returns at most 300 results per
query here; a match is a text pattern, so a file listed above still needs a human look.
`;
mkdirSync(join(ROOT, "results"), { recursive: true });
await Bun.write(join(ROOT, "results", "github-usage.md"), report);
console.log(report);
