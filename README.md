<!-- mcp-name: io.github.SihyeonJeon/legend-saju -->

<div align="center">
  <img src="assets/og-social-1280x640.png" alt="Legend Saju — 출처와 유파를 추적하는 동양 역학 엔진" width="100%" />

# Legend Saju

**사주 몇 글자를 LLM에 넘기는 래퍼가 아니다.**
계산식, 유파, 출처, 불확실성을 구조화해 반환하는 동양 역학 엔진이다.

[![CI](https://github.com/SihyeonJeon/legend-saju/actions/workflows/ci.yml/badge.svg)](https://github.com/SihyeonJeon/legend-saju/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)

[English](README.en.md) · [기여하기](CONTRIBUTING.md) · [원격 MCP](https://legend-saju-mcp-production.up.railway.app/mcp)

</div>

> 같은 생년월일을 여러 전통으로 계산한다. 계산 경로 안에는 숨겨진 LLM 호출이 없다.

**출처가 연결된 지식 777건 · 대육임 720국 · 한국 인명용 한자 관측 9,495건 · 계산 경로 모델 호출 0회**

Legend Saju는 사주·명리, 자미두수, 기문둔갑, 대육임, 철판신수, 성명학 등 서로 다른 전통의 계산을 하나의 엔진에서 다룬다. 유파가 다르면 억지로 하나의 결론으로 합치지 않고, 출생시간을 모르면 임의의 시각을 만들어내지 않는다.

## 가장 빠른 사용법

설치 없이 연결할 수 있는 HTTPS MCP 주소다.

```text
https://legend-saju-mcp-production.up.railway.app/mcp
```

공식 MCP Registry 이름은 `io.github.SihyeonJeon/legend-saju`다.

### Claude Code

아래 명령은 모든 프로젝트에서 쓸 수 있도록 사용자 범위에 연결한다.

```bash
claude mcp add --transport http --scope user legend-saju https://legend-saju-mcp-production.up.railway.app/mcp
claude mcp list
```

Claude Code를 열고 `/mcp`에서 `legend-saju`가 연결됐는지 확인한 다음 평소처럼 질문하면 된다.

### ChatGPT 개발자 모드

1. ChatGPT의 **Settings → Security and login**에서 **Developer mode**를 켠다.
2. [ChatGPT Plugins](https://chatgpt.com/plugins)에서 `+`를 누른다.
3. 이름과 설명을 입력하고 **Connection**에 위 MCP 주소를 `/mcp`까지 포함해 넣는다.
4. 연결을 만든 뒤 `legend_saju_read_fortune`, `legend_saju_analyze_compatibility`, `legend_saju_select_dates` 등이 발견되는지 확인한다.
5. 새 대화의 도구 메뉴에서 연결을 선택하고 자연어로 질문한다.

개발자 모드 사용 가능 여부는 계정과 워크스페이스 정책에 따라 다를 수 있다. 자세한 절차는 [OpenAI의 플러그인 연결 안내](https://developers.openai.com/plugins/deploy/connect-chatgpt)를 참고하면 된다.

### Codex

MCP만 바로 연결하려면 다음 두 줄이면 된다.

```bash
codex mcp add legend-saju-remote --url https://legend-saju-mcp-production.up.railway.app/mcp
codex mcp list
```

MCP 연결과 자연어 사용 지침을 함께 설치하려면 저장소를 플러그인 소스로 추가하고 Plugins 화면에서 **Legend Saju**를 설치한다.

```bash
codex plugin marketplace add SihyeonJeon/legend-saju --ref main
```

원격 서버는 입력값을 저장하지 않으며 모델 API를 호출하지 않는다. 요청 크기, 분당 요청 수, 동시 실행 수 제한은 적용된다.

### 로컬에서 실행하기

생년월일이나 이름을 외부 서버로 보내고 싶지 않다면 Node.js 20 이상이 설치된 컴퓨터에서 STDIO 방식으로 실행한다.

```bash
git clone https://github.com/SihyeonJeon/legend-saju.git
cd legend-saju
npm ci
npm run build
```

저장소 루트에서 사용하는 클라이언트에 맞는 명령을 실행한다. `$PWD`는 셸이 현재 절대경로로 바꿔 저장한다.

```bash
codex mcp add legend-saju -- node "$PWD/bin/legend-saju-mcp.js"
claude mcp add --transport stdio --scope user legend-saju -- node "$PWD/bin/legend-saju-mcp.js"
```

설치 뒤에는 도구 이름이나 JSON을 말할 필요 없이 평소처럼 질문하면 된다.

> 양력 1990년 1월 1일 정오 출생이야. 직업, 재물, 결혼과 앞으로 3년을 종합해서 봐줘.

> 두 사람의 생년월일시를 줄게. 양쪽 원국 전체로 궁합과 결혼 시기를 함께 봐줘.

> 이름 한자를 줄게. 사주와 분리해서 성명학 근거도 분석해줘.

### 다른 MCP 클라이언트에서 연결하기

원격 HTTP MCP를 지원하는 클라이언트라면 아래 설정을 사용할 수 있다. 설정 파일의 위치는 클라이언트마다 다르다.

```json
{
  "mcpServers": {
    "legend-saju": {
      "type": "http",
      "url": "https://legend-saju-mcp-production.up.railway.app/mcp"
    }
  }
}
```

로컬 소스를 고정해서 쓰고 싶다면 저장소를 빌드한 뒤 CLI 래퍼를 직접 실행한다.

```json
{
  "mcpServers": {
    "legend-saju": {
      "command": "node",
      "args": ["/절대/경로/legend-saju/bin/legend-saju-mcp.js"]
    }
  }
}
```

로컬 STDIO 방식은 위 빌드를 한 번 마친 뒤 사용할 수 있다.

## MCP가 하는 일

MCP 서버는 사용자의 목적이 이름에 드러나는 읽기 전용 도구를 제공한다.

| 도구 | 역할 |
| --- | --- |
| `legend_saju_read_fortune` | 일반 사주, 총운, 재물·사업·직업·연애·건강운을 질문 범위에 맞춰 계산한다 |
| `legend_saju_analyze_compatibility` | 두 사람의 출생 정보를 비교한다 |
| `legend_saju_select_dates` | 명시적으로 택일을 요청한 경우에만 후보 날짜를 계산한다 |
| `legend_saju_cast_divination` | 기문·육임·주역처럼 질문 시각이나 괘가 필요한 계산을 수행한다 |
| `legend_saju_analyze_name` | 실제 이름 한자, 법원 인명용 한자 관측, 81수와 작명 정보를 분리해 계산한다 |
| `legend_saju_manifest` | 현재 엔진에 들어 있는 계산법, 출처, 데이터 범위를 확인한다 |
| `legend_saju_capabilities` | 전문적인 질문에 맞는 세부 계산법을 찾는다 |
| `legend_saju_resolve` | 유파·계산법을 직접 지정하는 전문가용 요청을 실행한다 |

일상적인 운세 요청은 목적별 도구가 필요한 계산만 고른다. 예컨대 재물·사업운에 택일이나 개운 계산을 자동으로 섞지 않는다. 세부 유파를 직접 고르거나 전체 근거를 점검할 때만 capability 검색과 전문가용 resolver를 사용한다.

```text
사용자의 자연어 질문
        ↓
호스트 모델이 입력을 정리하고 계산법을 탐색
        ↓
Legend Saju MCP가 결정론적 계산 수행
        ↓
출처·유파·충돌·누락 정보가 포함된 구조화 결과
        ↓
호스트 모델이 사람이 읽기 쉬운 한국어로 설명
```

Legend Saju MCP 자체는 OpenAI나 Anthropic API 키를 읽지 않으며 모델을 호출하지 않는다. 대화와 설명에는 사용 중인 Codex·Claude·기타 클라이언트의 기존 모델 세션이 쓰인다.

## MCP와 동봉 플러그인의 차이

- **MCP만 연결**하면 계산 엔진과 목적별 도구를 바로 사용할 수 있다.
- [`plugins/legend-saju/`](plugins/legend-saju/README.md)의 **Codex 플러그인**에는 MCP 설정과 자연어 사용 지침이 함께 들어 있다. 사용자가 capability ID나 입력 스키마를 고르지 않도록 호스트 모델의 처리 방식을 보강한다.
- 계산 능력은 플러그인 안에 축소 복사돼 있지 않다. MCP와 플러그인 모두 같은 공개 엔진 진입점을 사용한다.

## 자연어 입력

이 프로젝트가 의도한 인터페이스는 접수 폼이나 intent 메뉴가 아니라 대화다. 모델은 대화에서 확실한 정보만 추출하고, 필요한 계산법을 찾은 뒤, 엔진이 돌려준 근거를 설명한다.

```text
1990년 1월 1일 양력이고 태어난 시간은 몰라.
앞으로 3년 직업과 돈을 봐줘.
```

출생시간을 모른다고 말하면 엔진은 정오를 임의로 넣지 않는다. 자시의 날짜 경계 두 방식까지 포함한 후보 차트를 분리해 반환한다.

## 개발자로 실행하기

```bash
git clone https://github.com/SihyeonJeon/legend-saju.git
cd legend-saju
npm ci
npm test
npm run build
npm run demo
```

Node.js 20 이상이 필요하며 ESM 전용이다.

```ts
import { resolve } from "./dist/index.js";

const result = resolve({
  birth: {
    year: 1990,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    calendar: "solar",
    gender: "여",
    birthTimeAccuracy: "recorded"
  },
  question: "직업과 재물, 연애 결혼, 앞으로 3년",
  timelineRange: { startYear: 2026, endYear: 2028 }
});

console.log(result.dossier?.claims);
console.log(result.dossier?.conflicts);
console.log(result.routes);
```

반환값은 완성된 점사 문장이 아니라 계산과 해석의 근거 데이터다.

```ts
{
  executionPlan: {
    entryIntent: string;
    domains: string[];
    core: string[];
    supporting: string[];
    selected: string[];
  };
  selection: { requested: string[]; selected: string[]; unsupported: string[] };
  routes: CapabilityPreflight[];
  dossier?: {
    claims: EngineClaim[];
    conflicts: ClaimConflict[];
    synthesis: DomainSynthesis[];
    timeline?: LifeTimeline;
    blockedSystems: { capabilityId: string; reason: string }[];
  };
  evidence: SajuEvidence[];
  nameAnalysis?: KoreanNameAnalysis;
  noModelCalls: true;
  interpretationBoundary: string;
}
```

MCP의 기본 응답은 `consumer` 모드다. 핵심 주장·출처·한계를 중복 없이 압축하며, 전체 계산 자료가 필요할 때만 `evidence` 또는 `debug` 모드를 요청한다.

## 왜 만들었나

많은 역학 AI 서비스는 프롬프트에서 시작한다. Legend Saju는 그보다 한 층 아래인 계산과 근거에서 시작한다.

- **결정론적 코어**: 같은 입력은 LLM 없이 같은 계산 결과를 만든다.
- **유파 보존**: 명리 관법이나 자미두수 사화표가 다르면 각각의 결과로 남긴다.
- **출생시간 미상 처리**: 모르는 시각은 후보군으로 계산하며 정오로 꾸며내지 않는다.
- **출처 추적**: 기능마다 성숙도, 근거 역할, 유파, 출처 ID, 빠진 차원을 기록한다.
- **운명 점수 없음**: 여러 체계의 근거와 충돌을 하나의 숫자로 뭉개지 않는다.

## 실제로 들어 있는 자산

이 저장소는 모델 호출 인터페이스만 공개하는 것이 아니라, 어려운 데이터와 규칙 작업을 함께 공개한다.

| 자산 | 공개 범위 |
| --- | ---: |
| 다국어 역학 지식 저장소 | 36개 영역, 777개 근거 항목 |
| 명리 용어집 | 한국어·한자·중국어·일본어 777개 항목 |
| 자미두수 용어집 | 언어별로 정렬된 214개 항목 |
| 궁통보감 | 일간×월령 120칸과 실행 가능한 하위 예외절 66개 |
| 자미두수 궁성 이론 | 구조화 규칙 163개와 서로 분리 계산되는 사화 프로필 3종 |
| 대육임 | 60일진×12천반, 닫힌 720국 전송표 |
| 철판신수 질문시각 경로 | 괘 1,500칸, 선천 144행, 평생 2,028행 |
| 한국 성명학 | 대법원 인명용 한자 관측 9,495건과 획수 이형 관측 2,003건 |
| 원전 범위가 명시된 81수 | 81개 전체 행과 1차 출처 대조 |
| 해몽 연구 데이터 | 주공해몽 988개, 아르테미도로스 211절, 교차문화 감사 시드 5개 |

검사 가능한 원본 데이터는 [`data/`](data/README.md)에 있다. 실행에 필요한 지식은 런타임에 포함되므로 원격 데이터베이스나 숨겨진 검색 서비스에 의존하지 않는다.

자미두수 궁성 계산의 최적화 전후 결과는 144개 조합에서 바이트 단위로 일치했다. 자세한 검증 범위는 [`docs/PARITY.md`](docs/PARITY.md)에 기록돼 있다.

## 구현 범위

| 체계 | 현재 구현 경계 |
| --- | --- |
| 만세력·사주 원국 | 양력·음력·윤달 변환, 사주팔자, 대운, 날짜 경계 |
| 명리 | 월령, 통근, 지장간, 십성, 합충형파해, 용신 관법 3종, 궁통보감 120칸 |
| 자미두수 | 12궁, 삼방사정, 복수 사화 프로필, 비성 연결, 중첩 운한 |
| 대육임 | 60일진×12천반의 닫힌 표와 경계가 명시된 과전법 |
| 기문둔갑 | 시가전반, 구궁, 구성, 팔문, 팔신, 직부·직사, 공망 |
| 철판신수 | 세 판본의 황극 연쇄와 별도 질문시각 14계열 표, 선천수, 108년 조문수 |
| 한국 성명학 | 인명용 한자 9,495건, 유니코드·자형 분해, 사용자가 밝힌 획수 체계의 오격 계산, 원전 범위 81수 |

기능 수를 README의 고정 숫자로 믿기보다 `getEngineManifest()`로 현재 레지스트리를 확인하는 편이 정확하다.

출생시각은 현지 민간시로 해석한다. `timezone`과 `longitudeE`는 출생지 메타데이터로 보존하지만, 기본 차트가 근사 진태양시 보정을 몰래 적용하지는 않는다. 이 누락은 기능 및 입력 감사 메타데이터에 기록된다.

잘못된 출생 정보는 구조화된 `blocked` 경로로 반환돼 다른 결과와 함께 정정 요청을 할 수 있다. 존재할 수 없는 `targetDate`나 `questionDateTime`은 날짜 기반 계산 전체를 안전하게 진행할 수 없으므로 요청 자체를 거절한다.

## 하나의 열린 진입점

```ts
import { resolve } from "./dist/index.js";
```

`resolve({ question, ...inputs })`는 현재 레지스트리를 검색하고, 질문을 라우팅하고, 실행 가능한 계산기를 호출하고, 부족한 입력을 숨기지 않은 채 반환한다. `requestedCapabilities`는 닫힌 enum이 아닌 일반 문자열을 받는다. 따라서 엔진에 새 모듈을 추가해도 모든 클라이언트 스키마를 함께 바꿀 필요가 없다.

이름을 `resolveAsync`의 `name`으로 넘기면 별도의 한국 성명학 전체 경로가 열린다. 실제 성과 이름 한자를 9,495개 관측 스냅샷과 대조하고, 법적 사용 가능성, 배정 음, 관측 획수 후보, 유니코드, 자형 분해, 사용자가 밝힌 오격 계산법, 81수 대조를 서로 다른 근거 층으로 유지한다.

기존 동기식 `resolve`는 계산 전용 사용자와 호환된다. 비동기식은 이름이 들어왔을 때만 큰 성명학 데이터를 지연 로딩하므로 일반 사주 계산의 시작 비용을 늘리지 않는다.

`analyze(input)`는 타입이 정해진 출생 명세 API다. `query({ intent, ... })`는 26개 intent를 지원하는 호환 인터페이스다. 설명과 UI 같은 어댑터는 계산 코어와 분리한다.

## 성능

재현 가능한 벤치마크가 포함돼 있다.

```bash
npm run benchmark
```

현재 Apple Silicon 개발 장비와 Node 26에서 최적화 기준값은 사주 원국 질의 중앙값 1.13ms, 출생시간을 아는 전체 명세 중앙값 약 600ms, 새 프로세스 import 중앙값 63.1ms였다. 기기와 환경에 따라 달라질 수 있는 공학적 관측값이다. 최신 환경과 측정법은 [`PERFORMANCE.md`](PERFORMANCE.md)를 참고한다.

## 출생시간을 모를 때

```ts
const result = analyze({
  birth: {
    year: 1990,
    month: 1,
    day: 1,
    calendar: "solar",
    gender: "남",
    birthTimeAccuracy: "unknown"
  },
  question: "전체 인생"
});
```

고정되는 기둥, 달라지는 관계, 모든 시주 후보를 분리해 반환한다. 과거 사건으로 후보를 비교할 수는 있어도 엔진이 혼자 하나의 출생시간을 정답으로 선언하지 않는다.

## 신비보다 방법론

이 프로젝트는 다음 단계를 구분한다.

1. 역법과 원국 계산
2. 구조 관찰
3. 유파에 따른 해석
4. 여러 체계의 종합
5. 인간 또는 LLM이 작성한 설명

제품 수준의 주장을 하기 전 [방법론](docs/METHODOLOGY.md)과 [기능 경계](docs/CAPABILITIES.md)를 읽어야 한다.

[실제 개발 과정](docs/HOW_IT_WAS_BUILT.md)에는 개발 순서, 다국어 조사 쿼리, 재현 가능한 에이전트 작업 지시가 들어 있다.

## 라이선스

프로젝트 코드는 Apache-2.0이다. 외부 라이브러리와 데이터셋은 각자의 이용 조건을 따른다. [`DATA_LICENSES.md`](DATA_LICENSES.md)와 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)를 참고한다.
