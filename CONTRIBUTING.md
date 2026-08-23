# Contributing

Pull requests from forks are welcome. Small fixes, new source audits, test
coverage, performance improvements, and bounded calculation methods can all be
proposed through a pull request.

Never include a real person's name, birth date, birth time, birthplace,
relationship history, or consultation record in an issue, test, fixture, or
pull request. Use clearly synthetic data. If a bug only reproduces with private
data, reduce it to the smallest non-identifying calculation signature before
sharing it.

New formulas require all of the following:

1. a named system and lineage;
2. a stable source locator or independently reproducible reference implementation;
3. a structured rule rather than copied prose;
4. golden or exhaustive fixtures;
5. explicit omitted dimensions;
6. a redistribution decision for new data.

Do not resolve conflicting schools by averaging them. Do not fill an unknown
input with a convenient default.

Before opening a pull request, run:

```bash
npm test
npm run typecheck
npm run build
npm run release:check
```

Changes to a hot calculation path should also include a before-and-after run of
`npm run benchmark`. Do not add a timing threshold to CI unless it is stable on
shared runners.

## Pull request scope

- Keep one conceptual change per pull request.
- Explain the source, lineage, and redistribution status for new traditional
  material.
- Add a regression test for calculation changes.
- Preserve disagreements between lineages instead of forcing one verdict.
- Do not add model-generated prose as a substitute for a calculation rule.

Maintainers may ask for a smaller fixture, a stronger source locator, or a
license clarification before merging.
