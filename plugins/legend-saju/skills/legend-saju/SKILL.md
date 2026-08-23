---
name: legend-saju
description: Use the Legend Saju MCP for Saju and Myeongri, Zi Wei Dou Shu, Qimen, Daliuren, I Ching, Tieban Shenshu, Dang Saju, Tojeong, Feng Shui, date selection, Korean naming and Hanja, 81-number analysis, or source-bounded dream interpretation. Trigger for natal readings, luck periods, compatibility, auspicious dates, divination, names, dreams, named schools, or mixed traditional methods.
---

# Legend Saju

Use Legend Saju as the deterministic calculation, knowledge, and evidence layer. Accept natural language. Never ask the user to choose a capability ID, and never invent a birth time, chart value, or lineage agreement.

## Route the goal

1. Use `legend_saju_read_fortune` for an ordinary natal, current, annual, career, wealth, relationship, health, or action reading.
2. Set `detailLevel: expert` on that same tool when the user asks for a comprehensive, deep, multi-year, or cross-checked natal reading. This expands the calculations without changing the response format.
3. Use `legend_saju_analyze_compatibility`, `legend_saju_select_dates`, `legend_saju_cast_divination`, `legend_saju_analyze_name`, or `legend_saju_interpret_dream` when that is the user's primary goal.
4. Use `legend_saju_capabilities` only for a named school, specialized formula, unusual cross-system request, or method-discovery question. Pass returned string IDs together to `legend_saju_run_methods`; do not execute one method per turn unless the user requested that comparison.
5. Use `outputMode: action_only` for actions alone, `consumer` for a readable answer, `evidence` for claims, method data, knowledge assets, sources, and original excerpts, and `debug` for the resolver record. Use `brief`, `standard`, `expert`, and `raw` only for calculation breadth.

## Read the result

- Always inspect `structuredContent`; the short `content` message is only a completion digest.
- For a readable answer, use `readingSummary`, `sections`, `recommendations`, and `timeline`.
- Request `evidence` separately when the user wants calculations, knowledge, original excerpts, sources, or school comparisons. Do not flatten disagreements between schools or systems.
- State important assumptions from `inputNotes` once. Treat `available`, `partial`, and `blocked` routes differently.
- In evidence responses, preserve `evidenceClaimIds`, `sourceRefs`, and `counterClaimIds`.

## Inputs

- Set `birthTimeAccuracy: recorded` only for an official or written record. Use `family_memory`, `estimated`, or `unknown` otherwise.
- Interpret 오후 12시 as 12:00 and 오전 12시 as 00:00 only when the wording is clear. Ask if it remains ambiguous.
- Preserve solar or lunar calendar and leap-month status. Never substitute noon for an unknown time.
- Keep `targetDate` separate from the question-time `questionDateTime` used for Qimen or Daliuren.
- For names, pass the actual surname and given-name Hanja. Keep legal eligibility, observed strokes, 81-number rules, graphical decomposition, and birth-based naming as distinct evidence layers.
- For dreams, preserve the narrative and user-supplied context. The active deterministic interpretation covers five cross-culturally audited concepts; the broader 1,199-item source corpus is provenance, not an automatic dictionary.
The server is read-only, makes no model or network call during calculation, and never publishes anything.
