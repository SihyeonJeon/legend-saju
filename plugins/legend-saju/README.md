# Legend Saju Codex 플러그인

이 플러그인은 Legend Saju의 읽기 전용 MCP 서버와 자연어 사용 지침을 함께 묶는다. 설치 뒤에는 capability ID나 JSON 스키마를 고르지 않고 평소처럼 질문하면 된다.

> 양력 1990년 1월 1일 정오 출생이야. 직업, 재물, 결혼과 앞으로 3년을 종합해서 봐줘.

플러그인은 대화에서 확실한 입력만 추출하고, 질문에 맞는 계산법을 찾고, 엔진이 돌려준 근거를 설명한다.

내부에는 사용 목적별 MCP 도구가 있다.

- `legend_saju_read_fortune`: 일반·올해·재물·직업·연애·건강운
- `legend_saju_analyze_compatibility`: 두 사람 궁합
- `legend_saju_select_dates`: 명시적으로 요청한 택일
- `legend_saju_cast_divination`: 기문·육임·주역 질문점
- `legend_saju_analyze_name`: 실제 이름 한자·81수·작명
- `legend_saju_interpret_dream`: 교차 전승 의미 대조가 끝난 범위의 해몽
- `legend_saju_manifest`: 엔진과 데이터 범위 확인
- `legend_saju_capabilities`: 전문 계산법 탐색
- `legend_saju_run_methods`: 여러 유파·계산법을 한 계획으로 묶는 전문가용 실행

`detailLevel`은 계산 범위, `outputMode`는 반환 형식이다. `action_only`는 행동, `consumer`는 읽기 좋은 해석, `evidence`는 claim·계산 결과·지식·원문·출처, `debug`는 내부 실행 기록을 반환한다.

MCP 응답의 짧은 `content`는 완료 알림이다. 실제 답변은 `structuredContent`를 사용하며, 근거가 필요한 경우 같은 입력을 `evidence`로 다시 호출한다.

한국 이름을 분석할 때는 실제 성과 이름 한자를 입력의 `name` 필드로 전달한다. 이 경로는 인명용 한자 관측 9,495건 전체에 접근한다. 출생 정보만으로 이름을 제안하는 기존 기능은 범위가 더 작은 별도 방법이다.

플러그인은 공개 HTTPS MCP 서버에 연결하므로 Node.js를 설치하거나 저장소를 내려받을 필요가 없다. MCP 서버는 결정론적 계산만 수행하며 OpenAI 또는 Anthropic API 키를 읽거나 모델을 호출하지 않는다. 질문 이해와 결과 설명에는 호스트 클라이언트의 기존 모델 세션이 사용된다.

생년월일과 이름을 외부 서버로 보내고 싶지 않다면 저장소 최상단 [README](../../README.md)의 로컬 STDIO 설치법을 사용하면 된다. 로컬과 원격은 같은 엔진 진입점을 사용한다.

플러그인 없이 MCP만 연결하려면 저장소 최상단 [README](../../README.md)의 한 줄 설치법을 따르면 된다.
