// Bend's repo gate (gates/repo.ts) caps bend2/comp.ts at 66000 tokens, counted by
// `ttok -m gpt-3.5-turbo`, whose encoding is cl100k_base. This counts the same encoding with
// js-tiktoken, for comp.ts as released and with each patch.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getEncoding } from "js-tiktoken";
import { ROOT, LOADERS } from "./lib";

const CAP = 66000;
const enc = getEncoding("cl100k_base");
const rows: string[] = [];
let base = 0;
for (const v of LOADERS) {
  const n = enc.encode(readFileSync(join(ROOT, ".vendor", v, "bend2", "comp.ts"), "utf8")).length;
  if (v === "orig") base = n;
  rows.push(`| ${v} | ${n} | ${n - base >= 0 ? "+" : ""}${n - base} | ${CAP - n} | ${n <= CAP ? "passes" : "**over the cap**"} |`);
}
const report = `# bend2/comp.ts against Bend's size gate (cap ${CAP} tokens, cl100k_base)\n\n| Compiler | Tokens | vs released | Room left | Gate |\n|---|---|---|---|---|\n${rows.join("\n")}\n\nCounted with js-tiktoken's cl100k_base, the encoding \`ttok -m gpt-3.5-turbo\` uses; the gate itself shells out to ttok.\n`;
await Bun.write(join(ROOT, "results", "size-gate.md"), report);
console.log(report);
