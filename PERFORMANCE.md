# Performance

Legend Saju exposes a reproducible local benchmark rather than a universal speed claim.

```bash
npm run benchmark
```

The command builds the current source and measures:

- fresh-process ESM import;
- manifest lookup;
- a Four Pillars chart query;
- a known-time cross-system dossier with a target date and three-year timeline;
- an unknown-time dossier;
- process memory before and after the measured operations.

## Reference run

Environment: Apple Silicon, macOS, Node v26.0.0. Results recorded on 2026-08-23
after replacing repeated Zi Wei palace-search walks with direct canonical-star indexing.

| Operation | Median | p95 |
| --- | ---: | ---: |
| Fresh-process import | 63.1 ms | 67.1 ms |
| Four Pillars chart query | 1.13 ms | 1.50 ms |
| Known-time full dossier | 600 ms | 606 ms |
| Unknown-time dossier | 0.48 ms | 1.02 ms |

Built JavaScript measured 2,378,176 bytes for the main entry and 5,564,556 bytes
for the standalone naming entry, including the full 9,495-entry name-character
dataset. RSS moved from 118.52 MiB before the measured operations to 167.98 MiB
afterward; heap used moved from 13.30 MiB to 13.93 MiB.

The known-time path is intentionally heavier because it compares Zi Wei placement
and transformation profiles and builds a multi-system dossier. Unknown birth time
does not fabricate Zi Wei results, so it returns much faster. Machine, Node version,
filesystem cache, and input shape all affect the numbers.
