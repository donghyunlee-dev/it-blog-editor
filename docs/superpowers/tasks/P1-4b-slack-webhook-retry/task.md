# P1-4b: Slack 웹훅 전송 자체가 실패할 때의 재시도/폴백을 추가한다

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 지적된 항목. `sendSlackAlert`(`src/lib/notifications/slack.ts`)는 Slack Incoming Webhook에 한 번만 POST하고, 실패하면(네트워크 오류·Slack 쪽 일시적 5xx/429 등) 그대로 예외를 던진다. 유일한 호출부인 `notifyUpstreamFailure`(`api-response.ts`)는 이 예외를 잡아 `logger.error`로 서버 로그에만 남기고 끝낸다(P1-4a) — 즉 지금은 "Confluence 연동 실패 → Slack 알림 시도 → 그마저 실패 → 조용히 로그만 남고 아무도 못 알아챈다"는 이중 실패 시나리오에 재시도가 전혀 없다.

## 수용 기준 (Acceptance Criteria)
- [ ] `sendSlackAlert`가 네트워크 오류 또는 Slack의 일시적 실패(429, 5xx)에 대해 지수 백오프로 재시도한다.
- [ ] Slack이 429와 함께 `Retry-After` 헤더를 주면(레이트리밋 안내) 그 값을 지수 백오프 계산값 대신 우선 사용한다.
- [ ] 4xx(429 제외 — 예: 400 잘못된 payload, 404 잘못된 웹훅 URL)는 재시도해도 절대 성공하지 않으므로 즉시 실패 처리한다(불필요한 재시도로 지연만 늘리지 않는다).
- [ ] 재시도를 모두 소진해도 실패하면 기존과 동일하게 예외를 던진다 — 호출부(`notifyUpstreamFailure`)의 기존 "실패하면 로그만 남기고 넘어간다" 폴백 동작은 그대로 유지한다(이게 이미 이 항목이 말하는 "폴백"이다 — 별도의 2차 알림 채널은 두지 않는다, [Issue #4](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/4)에서 "Slack만 유지"로 결정됐으므로).
- [ ] `sendSlackAlert` 자체에는 지금까지 테스트가 없었다 — 이번에 처음으로 단위 테스트를 추가한다.

## 결정이 필요한 사항
없음 — P1-3(`confluenceRequest` 재시도)에서 이미 쓴 것과 같은 종류의 기본값(최대 3회, 지수 백오프+jitter, `Retry-After` 우선)을 그대로 적용한다. Slack 웹훅에 대한 재시도는 Confluence의 title 충돌 같은 "재시도가 오히려 중복 부작용을 만드는" 위험이 없다 — 최악의 경우 같은 알림 메시지가 Slack 채널에 두 번 뜨는 정도이고, 이건 데이터 유실보다 훨씬 가벼운 트레이드오프라 GET/POST 구분 없이 재시도해도 안전하다고 판단했다.

## 범위 밖
- Slack 외 2차 알림 채널(이메일, PagerDuty 등) 추가 — Issue #4에서 "Slack만 유지"로 이미 결정됨.
- `notifyUpstreamFailure` 자체의 실패 시 동작 변경 — 기존처럼 로그만 남기고 API 응답에는 영향을 주지 않는 방식을 그대로 유지한다(이 함수가 실패해도 사용자에게 보여줄 502 응답 자체는 이미 준비돼 있어야 한다).
