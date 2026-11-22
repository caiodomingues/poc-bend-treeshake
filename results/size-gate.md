# bend2/comp.ts against Bend's size gate (cap 66000 tokens, cl100k_base)

| Compiler | Tokens | vs released | Room left | Gate |
|---|---|---|---|---|
| orig | 65977 | +0 | 23 | passes |
| patched | 65984 | +7 | 16 | passes |
| named | 66183 | +206 | -183 | **over the cap** |

Counted with js-tiktoken's cl100k_base, the encoding `ttok -m gpt-3.5-turbo` uses; the gate itself shells out to ttok.
