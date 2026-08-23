---
name: legend-saju
description: Use the local Legend Saju engine for Saju, Myeongri, Zi Wei Dou Shu, compatibility, timing, Qimen, Daliuren, Tieban Shenshu, naming, or other East Asian metaphysics questions that need deterministic calculations and source or lineage boundaries. Trigger when a user asks for a reading, chart, luck period, compatibility, auspicious date, divination calculation, or wants to inspect which traditional method can answer a question.
---

# Legend Saju

Use the engine as the calculation and evidence layer. Let the user speak naturally; never make them choose a capability ID or fill a developer-facing schema. The host model may explain the returned structure, but it must not invent a chart value, silently merge lineages, or turn a bounded interpretation into a guaranteed event.

## Workflow

1. Identify the user's actual question and extract reliable dates, people, names, events, or decisions from the conversation.
2. Match the user goal to the focused tool: ordinary readings use `legend_saju_read_fortune`; two-person comparison uses `legend_saju_analyze_compatibility`; explicit date selection uses `legend_saju_select_dates`; question-time divination uses `legend_saju_cast_divination`; Korean-name work uses `legend_saju_analyze_name`.
3. Use `legend_saju_capabilities` and `legend_saju_resolve` only when the user names a specialized method, lineage, capability, or evidence need that the focused tools do not express.
4. Keep the default `consumer` output. Its `readingSummary`, domain `sections`, and `timeline` are the engine's bounded meaning layer; present those before raw claims. Request `evidence` or `debug` only when the user wants raw methodology or a developer trace.
5. Treat `available`, `partial`, and `blocked` routes differently. Ask one short follow-up only when a missing input would materially change the requested result.
6. Explain the source-linked interpretations first. Use `evidenceClaimIds`, `sourceRefs`, `counterClaimIds`, and `limitationRefs` when a conclusion needs support or qualification; do not lead with sentences that merely report a calculation was completed.

## Input handling

- Never invent a birth hour. Omit it when unknown and preserve the engine's candidate envelope.
- Set `birthTimeAccuracy: recorded` only when the user explicitly identifies an official or written record. Use `family_memory`, `estimated`, or `unknown` without upgrading certainty.
- Normalize local time in 24-hour notation: Korean 오후 12시는 12 (정오), 오전 12시는 0 (자정). Ask when the expression remains ambiguous.
- Record whether a date is solar or lunar. For an ambiguous lunar leap month, ask before calculating.
- Treat an invalid birth date in a `blocked` route as a correction request. Invalid target or casting dates fail the tool call and must be corrected before retrying.
- Keep `targetDate` separate from `questionDateTime`; the latter is the casting moment for question-time systems.
- Pass specialized capability IDs as ordinary strings returned by the live registry. Do not assume the list is closed.
- For compatibility, supply both `birth` and `partnerBirth` when known.
- For Korean-name analysis, put actual surname and given-name Hanja in `name`. Do not reduce a supplied name to stroke arrays or route it only through the birth-based naming subset. Use declared stroke counts only when the user also identifies the stroke standard.
- For past-event comparison, keep the user's event description and year intact rather than converting it into a success label.

## Interpretation boundary

- Cite the returned capability lineage, maturity, source IDs, and omitted dimensions when they affect the conclusion.
- Independent systems are parallel evidence. Agreement is worth reporting; disagreement must remain visible.
- Traditional calculations are not scientific proof and are not substitutes for medical, legal, financial, or mental-health advice.
- The MCP server itself makes no model call and needs no OpenAI or Anthropic API key. The surrounding client still uses its own normal model/session allowance to converse and explain results.

## User experience

- Accept ordinary requests such as "내 생년월일로 앞으로 3년 직업, 돈, 결혼을 종합해서 봐줘."
- Do not present the user with an intent menu, capability list, JSON, or a mandatory intake form.
- Use the focused MCP tool whose name matches the user's goal. The execution plan in its response records which calculations were actually selected and omitted.
- Use `inputNotes` to state material time, calendar, or location assumptions briefly. Do not hide them or repeat them under every section.
- If the user asks what was calculated, name the systems and capability IDs after the result, together with their maturity and limitations.
