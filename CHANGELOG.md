# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ChatGPT Apps(MCP UI) 위젯 4종: 원국 카드·영역별 운세 카드(총운/재물운/연애운 등)·궁합 카드·대운 타임라인. `text/html+skybridge` 리소스와 `legend_saju_card_*` 도구로 노출되며, 계산 값은 서버가 결정적으로 채우고 해석 문장·점수는 호출 모델이 작성해 카드에 "AI 해석"으로 표기된다. 위젯 구성은 지식iN·네이트판 '사주' 실질문 스크래핑(궁합·원국 풀이·재물/연애/직업운·대운 시기) 기반.
- consumer 응답에 `verdicts` 상시 포함: 왕쇠 판정, 격국(격국명·성패·보강/훼손 장치), 용신 후보(조후·격국 기능·부억 관법 분리 + 충돌). 문장 budget과 무관하게 항상 실린다.
- consumer/action_only 응답에 `evidenceIndex` 추가: 프로젝션에서 생략된 내부 claim(구조 관찰·계산 사실·방법론 설명)의 도메인·종류별 색인.
- claim 조회 포트: 동일 입력으로 재호출하며 `claimIds`를 넘기면 색인의 claim 전문(진술·관찰·출처·한계·반대근거)을 선택적으로 반환하는 `mode: "claims"` 응답. claim ID는 동일 입력에 대해 결정적이다.
- Biome lint 도입: `npm run lint` / `npm run lint:fix` 스크립트와 CI 린트 게이트.
- `.editorconfig`, `CHANGELOG.md` 추가.

### Fixed
- `forEach` 콜백이 `Set.add`/`Map.set` 반환값을 암묵 반환하던 패턴 정리 (gimun·ziwei·myeongri-judgment·mcp·saju-engine).
- `hasOwnProperty` 직접 호출을 `Object.hasOwn`으로 교체, 불필요한 이스케이프·빈 export 제거 등 린트 지적 사항 일괄 정리.

## [0.4.0] - 2026-08-23

### Added
- MCP 응답 프로젝션 분리: `outputMode`(consumer / action_only / evidence / debug)별 응답 스키마.
- 심층 엔진 오케스트레이션의 MCP 노출 (`legend_saju_run_methods`, capabilities 라우팅).
- 출처 연결(source-linked) consumer 리딩과 evidence claim ID 체계.

## [0.3.0] - 2026-08-23

### Added
- MCP Registry 등록 메타데이터(`server.json`)와 publish 워크플로.
- 커뮤니티 문서: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, 이슈/PR 템플릿.

### Changed
- MCP 라우팅과 consumer 응답 구조 정리.

## [0.2.0] - 2026-08-23

### Added
- 사주·자미두수·기문·육임·철판 등 엔진군과 지식 자산(삼국어 명리 vault, 주역 64괘, 꿈 해석 원전 데이터).
- HTTP MCP 서버(호스트/오리진 검증, 레이트리밋, 바디 제한)와 stdio MCP 서버.

## [0.1.0] - 2026-08-23

### Added
- 최초 공개: lunar-typescript 기반 사주 원국 계산과 해석 heuristic, 프라이버시 안전 공개 구성.
