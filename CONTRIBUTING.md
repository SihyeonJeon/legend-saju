# Contributing

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
