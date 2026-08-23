# Open research data

Legend Saju publishes both executable calculators and the source-oriented data
used to inspect or rebuild its knowledge layers. Runtime code does not fetch
these files over the network.

## Knowledge

| File | Scope |
| --- | --- |
| `knowledge/myeongri-vault-trilingual.json` | 777 facts across 36 areas with Korean, classical characters, Chinese, Japanese, school, source, relation, and safety fields |
| `knowledge/myeongri-trilingual-glossary.json` | 777 multilingual lookup entries |
| `knowledge/ziwei-trilingual-glossary.json` | 214 Zi Wei terms aligned to the runtime locale vocabulary |
| `knowledge/sipsin-ilgan-matrix.json` | Deterministic 10×10 day-master/other-stem ten-god matrix |
| `knowledge/suri-81-primary-row-audit.json` | 81-row primary-source direction and locator audit |
| `knowledge/hanja-naming-research-subset.json` | 121-character research subset kept separate from legal eligibility data |
| `knowledge/juyeok-64.json` | King Wen 64-hexagram index |

The 777-fact vault is also embedded as typed constants in
`src/engine/myeongri-knowledge-trilingual.ts`, so normal analysis remains
deterministic and filesystem-independent. `getEngineManifest().knowledge`
reports the live embedded counts.

## Naming

`naming/korean-court-name-snapshot.json.gz` is the compressed source observation
used to build `src/naming/data/name-hanja-support.json`. It expands to a
7,047,823-byte JSON file containing 9,495 official-entry observations. Its
uncompressed SHA-256 is:

```text
43e2361a1c2ec52490546495c13b0770431cb1562d07739ce881c810c17c6ae1
```

The runtime dataset preserves legal eligibility, designated readings, observed
lookup strokes, Unicode fields, and graphical decomposition as separate layers.
It does not automatically choose a fortune-telling stroke count or turn a
graphical component into an etymological claim.

## Dream research

The `dreams/` directory is published research material, not an activated birth
chart capability.

- `zhougong-primary.json`: 988 entries from the Zhougong dreambook tradition;
  the pinned Wikisource transcription is CC BY-SA 4.0.
- `artemidorus-1644-primary.json`: 211 sections from the EEBO-TCP text released
  under CC0 1.0.
- `cross-culture-seed-audit.json`: five project-audited concept seeds.
- `source-manifest.json`: source-family, rights, lineage, and activation boundaries.

Opposing interpretations remain separate. These corpora are not presented as
scientific prediction data, and the two primary corpora are not silently routed
into the engine before semantic mapping and source-level attribution are ready.

See the root `DATA_LICENSES.md` and `THIRD_PARTY_NOTICES.md` before redistribution.
