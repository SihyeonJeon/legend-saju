# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
