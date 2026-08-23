# Runtime equivalence and integrity

`SOURCE_SNAPSHOT.json` pins the current engine, tests, and research-data tree by
path, byte count, and SHA-256. `npm run release:check` verifies that snapshot,
checks the structured data invariants, and scans the repository for common
credential and local-path patterns.

## Zi Wei equivalence audit

On 2026-08-23, the original and optimized `computeZiweiPalaceFlyingGraph`
implementations were compared across:

- eight birth inputs spanning 1925–2024, both genders, solar and lunar input,
  Rat-hour and daytime boundaries;
- Korean, Traditional Chinese, and English locale output;
- common and Zhongzhou placement profiles;
- iztro-documented, Quanshu, and Zhongzhou-Wanli transformation profiles.

All 144 combinations returned byte-equal serialized graphs: 144 checked, zero
differences. The repository test suite also verifies Korean and Traditional
Chinese palace-index equivalence.
