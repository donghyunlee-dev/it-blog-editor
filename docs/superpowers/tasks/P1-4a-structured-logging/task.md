# P1-4a: 구조화 로깅을 도입한다

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 지적된 항목. 현재 관측 채널이 Slack 웹훅 하나뿐이고(`src/lib/notifications/slack.ts`), 나머지는 `console.error`에 사람이 읽는 문자열을 그대로 찍는 산발적인 로그뿐이라(`src/lib/api-response.ts`, `src/lib/editor/documents.ts`, `src/lib/editor/tag-suggestions.ts`) 구조화된 로그·요청 추적이 전혀 없다.

[Issue #4](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/4)에서 결정(2026-08-28): "slack만 유지. 채널은 추후 변경 가능." — 즉 새 로깅 도구(APM/로그 수집 서비스)는 도입하지 않는다. 배포 환경(AWS, 컨테이너/서버리스 미정 — P2-3)이 정해지기 전이라 어차피 특정 로그 서비스에 종속적인 SDK를 지금 넣는 건 이르다는 판단과도 일치한다. 대신 콘솔에 JSON 한 줄로 구조화해 남기면, 나중에 어떤 배포 방식·로그 수집기를 쓰든(예: AWS CloudWatch Logs가 컨테이너/Lambda의 stdout을 자동 수집) 그대로 파싱 가능한 로그가 쌓인다.

## 수용 기준 (Acceptance Criteria)
- [ ] `src/lib/logger.ts`에 `logger.info/warn/error(message, context?)`를 제공한다. 출력은 `{level, message, timestamp, context?}` 형태의 JSON 한 줄이다.
- [ ] `Error` 인스턴스를 로그에 남기면 `message`/`stack`과, `ConfluenceApiError.status`처럼 도메인별로 덧붙인 속성까지 온전히 직렬화된다(기본 `JSON.stringify(error)`는 `{}`만 남기는 문제를 피한다).
- [ ] 기존에 산발적으로 있던 `console.error(...)` 호출 4곳(`api-response.ts` 2곳, `documents.ts`, `tag-suggestions.ts`)을 `logger.error(...)`로 교체하고, 원인 파악에 필요한 맥락(pageId, email 등)을 `context`로 함께 남긴다.
- [ ] Slack 알림 로직(`notifications/slack.ts`, `notifyUpstreamFailure`) 자체는 바꾸지 않는다 — 이 작업은 서버 로그 쪽만 구조화한다.
- [ ] 기존 동작(에러 응답 코드/메시지, Slack 알림 발송 여부)에 회귀가 없다.

## 결정이 필요한 사항
없음 — [Issue #4](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/4)에서 이미 "Slack만 유지"로 결정됨.

## 범위 밖
- 실제 로그 수집기/APM 연동(예: CloudWatch Logs 설정, 별도 로그 서비스 SDK 도입) — 배포 방식이 P2-3(Issue #6)에서 아직 결정되지 않았고, 이번 결정("Slack만 유지")의 취지 자체가 지금은 도구를 늘리지 않는 것이다. 배포 방식이 정해지면 그때 실제 수집 설정을 논의한다.
- 요청 추적(request tracing, correlation ID 등) — 감사 리포트가 언급한 것과 별개로 이번 결정에서 다루지 않기로 범위를 좁혔다(Slack 알림 이상의 관측성 확장은 다음 단계).
- 클라이언트(브라우저) 쪽 로깅 — 현재 클라이언트 컴포넌트에는 `console.*` 호출이 없음을 확인했다(범위 자체가 없음).
