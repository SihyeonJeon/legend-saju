# Engine modules

Public entry point: `src/index.ts` → open-ended `resolve(...)`, typed `analyze(...)`, or legacy `query(...)`.

| Module | Responsibility |
| --- | --- |
| `saju-engine.ts` | Four Pillars chart, elements, ten gods, interactions, compatibility, and date calculations |
| `saju-engine-advanced.ts` | seasonal balance, true solar time, luck cycles, and structure observations |
| `engine-v2.ts` | question-first routing and cross-system dossier assembly |
| `engine-capabilities.ts` | machine-readable capability, source, input, and omission registry |
| `resolver.ts` | natural-language capability discovery and runtime string-ID routing |
| `ziwei-engine.ts` | Zi Wei Dou Shu chart, lineage comparison, flying transformations, and timing layers |
| `yukim-engine.ts` | Daliuren four lessons and three transmissions |
| `gimun-engine.ts` | Qimen rotating-plate calculation |
| `cheolpan-engine.ts` | Huangji number chain, explicit Kunji-code conversion, and separate question-time 14-series table calculation |
| `divination-engines.ts` | I Ching cast, Eight Mansions, Dang Saju, and Tojeong calculations |

The authoritative runtime boundary is `getEngineManifest()`. A listed omission is
not silently inferred or filled by a language model. See the repository root
`README.md`, `DATA_LICENSES.md`, and `PERFORMANCE.md` for public-release details.
