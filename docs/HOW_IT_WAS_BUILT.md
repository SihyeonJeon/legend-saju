# How Legend Saju was built

Legend Saju did not begin by sending birth data to a language model. It began by separating what can be calculated from what depends on interpretation, tracing Korean, Chinese, Taiwanese, Hong Kong, and Japanese materials by lineage, and compiling only bounded methods into code and data.

```text
multilingual source search
→ lineage separation
→ deterministic rules and tables
→ exhaustive, regression, and cross-implementation checks
→ uncertainty and conflict preservation
→ provenance and redistribution audit
→ application-independent open-source core
```

## The actual development order

1. **Build below the prompt.** Calendar conversion, leap months, solar terms, four pillars, luck cycles, and date boundaries became a deterministic base layer.
2. **Separate Myeongri lenses.** Ten gods, hidden stems, roots, combinations, clashes, punishments, breaks, and harms are observations. Month command, pattern, climate, strength, mediation, and illness/remedy remain separate judgment methods.
3. **Search beyond Korean summaries.** Traditional and modern terminology was expanded across simplified Chinese, traditional Chinese, Japanese, and English to find primary texts, editions, public worked examples, and independent implementations.
4. **Compile prose into rules.** A record keeps its source, section, lineage, predicates, output, evidence role, maturity, and omitted dimensions. Qiongtong Baojian became 120 stem-by-month cells plus executable subclauses; the multilingual knowledge layer became 777 facts across 36 areas.
5. **Keep Zi Wei lineages parallel.** The 12 palaces, sanfang-sizheng, natal transformations, palace-stem transformations, self-transformations, flying transformations, Qintian structures, and multiple transformation profiles do not collapse into one table.
6. **Add only bounded methods.** Qimen, Daliuren, I Ching, Dang Saju, Tojeong, Feng Shui, electional methods, and Tieban paths were added when their calculation or lookup path could be reproduced. The Daliuren corpus closes all 60 day pillars × 12 heaven plates.
7. **Do not invent noon.** Unknown birth time produces all hour candidates, including distinct Rat-hour date policies. Stable and variable claims remain separate; past events compare candidates without declaring one correct.
8. **Use a claim graph, not a fate score.** Results are returned as claims, conflicts, synthesis, timelines, blocked systems, source IDs, and limitations.
9. **Keep naming independent.** Official Korean name-character observations, assigned readings, observed strokes, Unicode decomposition, user-declared stroke policy, and source-bounded 81-number material remain distinct layers.
10. **Do not overclaim dream material.** Public Zhougong and Artemidorus corpora remain source material. The deterministic dream path activates only five concepts whose meanings were compared item by item across both traditions; the other 1,199 source items are not treated as an automatic dictionary.
11. **Keep adapters outside the core.** Writing, UI, and publishing belong outside the deterministic engine. The repository contains the calculation core, redistributable data, provenance, and tests.

## Reproducible research brief

The following is the condensed instruction that can take an agent from zero to the same kind of engine. It is a research and engineering brief, not a fortune-writing prompt.

```text
Act as an East Asian primary-source researcher, deterministic-engine designer,
data engineer, and release auditor.

The goal is not a chatbot that writes plausible readings. Build an open-source
engine that calculates major traditional systems from documented methods,
preserves differences between lineages, and returns the same calculation for
the same input without an LLM. A model may explain the result but may not
invent calculations.

1. Build a capability matrix for:
   - calendar, solar terms, lunar/leap months, pillars, luck cycles;
   - ten gods, hidden stems, roots, combinations/clashes/punishments/breaks/harms;
   - month command, pattern, climate, strength, mediation, illness/remedy;
   - Qiongtong Baojian, Di Tian Sui, Sanming Tonghui, Yuanhai Ziping;
   - Zi Wei 12 palaces, sanfang-sizheng, all time limits, natal and palace
     transformations, self/flying transformations, Qintian and modern lineages;
   - Qimen, Daliuren, I Ching, Tieban, Dang Saju, Tojeong, Feng Shui, election;
   - naming, 81 numbers, official Korean name characters, decomposition;
   - dream interpretation as a separately licensed research pack.

2. Mark every capability deterministic, source-backed, experimental, blocked,
   or excluded. Never fill a missing formula by intuition.

3. Prefer government and court data, national libraries, public-domain primary
   texts, official library documentation, commit-pinned open source, and golden
   fixtures. Use modern blogs and courses only to discover terminology.

4. Search in simplified Chinese, traditional Chinese, Japanese, Korean, and
   English. Start with query families such as:

   窮通寶鑑 十干 十二月 原文 月令 調候 例外
   三命通會 月令 格局 成敗 透干 通根
   滴天髓闡微 得令 得地 得勢 從格 化格
   淵海子平 格局 財官印食 殺傷劫刃
   子平真詮 月令 用神 格局 成敗 救應

   紫微斗數全書 十二宮 星曜 原文 三方四正
   紫微斗數 生年四化 宮干四化 自化
   欽天四化 離心 向心 體用 法象
   飛宮四化 化忌沖對宮 中州派 白派
   來因宮 天地不作來因

   鐵板神數 皇極 元會運世 考刻 分數 條文
   正統鐵板神數 先天數 五音 日命數 時運數 本命數
   鐵版神數 演算法 查表 實例

   奇門遁甲 拆補 轉盤 九宮 值符 值使 置閏
   大六壬 四課三傳 720局
   大六壬 涉害 昴星 別責 八專 伏吟 返吟

   熊崎健翁 運命の神秘 撰名字引 五格 81数 原文
   Korean Supreme Court official name characters assigned reading strokes
   Unihan kTotalStrokes kRSUnicode decomposition
   周公解夢 原文 分類
   Artemidorus Oneirocritica public domain transcription

5. Give each rule a ruleId, system, lineage, sourceId, edition/page/section/URL
   or commit, requiredInputs, predicates, outputs, evidenceRole, maturity,
   omittedDimensions, and redistributionStatus. Separate original wording,
   modern explanation, and executable logic.

6. Separate the engine into calendar/astronomy, deterministic calculators,
   lineage-specific rule evaluators, a conflict-preserving claim graph, and a
   writer/UI. The first four layers must not depend on a prompt or model.

7. Preserve unknown-time candidates and lineage conflicts. Never average
   different useful-god methods, Zi Wei transformation tables, or Tieban
   number systems into one answer.

8. Validate exhaustively where the domain is finite: all 120 Qiongtong cells,
   leap-month/date-boundary fixtures, every unknown-hour candidate, 4-by-4
   compatibility contacts, all Zi Wei palaces and transformation profiles,
   all 720 Daliuren charts, reproducible Qimen/Tieban examples, timing
   boundaries, and official name-character observations.

9. Return structured claims, conflicts, uncertainties, time windows, action
   translations, source references, and omitted dimensions. Do not create a
   single good/bad or fate score.

10. Audit code and dataset licenses before release. Exclude copyrighted modern
    books, scans, lectures, dream text, and clause corpora that cannot legally
    be redistributed.

Before declaring completion, report implemented, bounded, blocked, and excluded
areas separately. A reproduced traditional calculation is not scientific
validation of predictive truth.
```

The full source inventory, license boundary, parity notes, and live capability metadata in this repository are the auditable result of that process.
