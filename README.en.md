<!-- mcp-name: io.github.SihyeonJeon/legend-saju -->

<div align="center">
  <img src="assets/og-social-1280x640.png" alt="Legend Saju, an open-source East Asian metaphysics engine" width="100%" />

# Legend Saju

**The calculation layer under the prompt.**

[![CI](https://github.com/SihyeonJeon/legend-saju/actions/workflows/ci.yml/badge.svg)](https://github.com/SihyeonJeon/legend-saju/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)

[한국어](README.md) · [Contributing](CONTRIBUTING.md) · [Remote MCP](https://legend-saju-mcp-production.up.railway.app/mcp)

</div>

Legend Saju is a deterministic, source-traceable engine for Saju/Bazi, Myeongri,
Zi Wei Dou Shu, Qimen Dunjia, Daliuren, bounded Tieban methods, Korean naming,
and related East Asian systems. It keeps conflicting lineages separate, never
invents a noon birth time, and makes no hidden model calls.

**777 source-linked knowledge records · 720 Daliuren charts · 9,495 Korean court name-character observations · 0 model calls in the calculation path**

## Use it now

Connect any Streamable HTTP MCP client to:

```text
https://legend-saju-mcp-production.up.railway.app/mcp
```

Official MCP Registry name: `io.github.SihyeonJeon/legend-saju`

### Claude Code

```bash
claude mcp add --transport http --scope user legend-saju https://legend-saju-mcp-production.up.railway.app/mcp
```

### Codex

```bash
codex mcp add legend-saju --url https://legend-saju-mcp-production.up.railway.app/mcp
```

After connecting, ask in ordinary language. The host model selects relevant
methods and explains the engine's structured evidence.

```text
I know my birth date but not my birth time. Separate stable findings from all
hour candidates, then examine work and money over the next three years.
```

The public endpoint stores no birth or name input and calls no model API. Use
the local STDIO setup below when you prefer to keep all inputs on your machine.

## Local STDIO

```bash
git clone https://github.com/SihyeonJeon/legend-saju.git
cd legend-saju
npm ci
npm run build
codex mcp add legend-saju -- node "$PWD/bin/legend-saju-mcp.js"
```

Node.js 20 or newer is required.

## Why it is different

- The same input produces the same calculation without an LLM.
- Unknown birth time returns distinct candidates instead of fabricated noon.
- Myeongri lenses such as climate, pattern, strength, mediation, and
  illness/remedy remain separate.
- Zi Wei transformation lineages remain parallel instead of being averaged.
- Claims carry source IDs, maturity, omissions, conflicts, and uncertainty.
- The full Korean naming path reads all 9,495 observed official entries lazily.

The MCP exposes three gateways rather than three metaphysics features:

| Tool | Purpose |
| --- | --- |
| `legend_saju_manifest` | Inspect live methods, data coverage, and sources |
| `legend_saju_capabilities` | Find relevant calculations from natural language |
| `legend_saju_resolve` | Route open-ended input through multiple calculators |

## Auditable scope

The repository includes the calculation core, redistributable data, provenance,
tests, and method boundaries. See:

- [Capabilities](docs/CAPABILITIES.md)
- [Methodology](docs/METHODOLOGY.md)
- [How it was built](docs/HOW_IT_WAS_BUILT.md)
- [Data and licenses](DATA_LICENSES.md)
- [Performance](PERFORMANCE.md)

## Development

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run release:check
```

Pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before adding
a method or dataset. Never submit a real person's birth, name, or consultation
record as a fixture.

Code is licensed under Apache-2.0. Third-party data retains its documented
license and redistribution boundary.
