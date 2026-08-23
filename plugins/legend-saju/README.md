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

평소 운세는 목적별 도구가 질문에 필요한 계산만 실행한다. 깊은 종합 분석은 `legend_saju_read_fortune`에 `detailLevel: expert`를 주면 명리·자미와 관련 보조 엔진을 한 번에 조합한다. 기본 출력에는 요약·영역별 해석·행동 제안·시간축과 각 문장의 근거 ID가 함께 들어 있다. `raw`는 개발자가 전체 실행 기록을 점검할 때만 사용한다.

MCP 응답의 짧은 `content`는 계산 완료 알림이다. 실제 답변은 `structuredContent`의 `readingSummary`, `sections`, `recommendations`, `timeline`을 사용하고, 전문가 모드에서는 `methodAnalysis.methodResults`, 출처, 충돌, 누락 범위까지 확인한다.

한국 이름을 분석할 때는 실제 성과 이름 한자를 입력의 `name` 필드로 전달한다. 이 경로는 인명용 한자 관측 9,495건 전체에 접근한다. 출생 정보만으로 이름을 제안하는 기존 기능은 범위가 더 작은 별도 방법이다.

플러그인은 공개 HTTPS MCP 서버에 연결하므로 Node.js를 설치하거나 저장소를 내려받을 필요가 없다. MCP 서버는 결정론적 계산만 수행하며 OpenAI 또는 Anthropic API 키를 읽거나 모델을 호출하지 않는다. 질문 이해와 결과 설명에는 호스트 클라이언트의 기존 모델 세션이 사용된다.

생년월일과 이름을 외부 서버로 보내고 싶지 않다면 저장소 최상단 [README](../../README.md)의 로컬 STDIO 설치법을 사용하면 된다. 로컬과 원격은 같은 엔진 진입점을 사용한다.

플러그인 없이 MCP만 연결하려면 저장소 최상단 [README](../../README.md)의 한 줄 설치법을 따르면 된다.
