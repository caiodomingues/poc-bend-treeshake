# In a browser (Chrome/158.0.8127.42, headless, cache off; median of 5)

The engine module that uses 1 of 42 clips. Time = from navigation until the module ran and computed the clip.
Patch 2 uses a named import. Every run computed the same clip (JSON length 209575).

| Compiler | Build | JS (raw / gz) | localhost, normal CPU | localhost, CPU 4x slower | phone: CPU 4x slower, 1.6 Mbit/s, 150 ms |
|---|---|---|---|---|---|
| orig | minified | 9070.7 KB / 1893.1 KB | 86 ms | 120 ms | 10.18 s |
| orig | unminified (dev) | 18754.5 KB / 2290.9 KB | 127 ms | 160 ms | 12.11 s |
| patched | minified | 166.8 KB / 33.5 KB | 18 ms | 43 ms | 520 ms |
| patched | unminified (dev) | 320.4 KB / 38.6 KB | 19 ms | 43 ms | 545 ms |
| named | minified | 166.8 KB / 33.4 KB | 19 ms | 44 ms | 511 ms |
| named | unminified (dev) | 320.4 KB / 38.5 KB | 19 ms | 45 ms | 537 ms |
