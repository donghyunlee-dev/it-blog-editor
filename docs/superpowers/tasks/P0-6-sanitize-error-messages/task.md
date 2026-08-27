# P0-6: 내부 오류 응답 새니타이즈

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 P0로 지적된 항목. `toErrorResponse`(`src/lib/api-response.ts:31-58`)는 분류되지 않은 오류(주로 `ConfluenceApiError`)에 대해 `error.message`를 그대로 클라이언트 응답(`errorBody("UPSTREAM_ERROR", message)`)에 담는다. `ConfluenceApiError`의 메시지에는 Confluence 응답 본문이 그대로 포함돼 있어(`src/lib/confluence/client.ts:43-46`), 내부 시스템 정보가 브라우저 콘솔·토스트에 노출될 수 있다.

## 수용 기준 (Acceptance Criteria)
- [ ] 분류되지 않은 오류(`UnauthorizedError`/`ValidationError`/`NotFoundError`/`ConflictError`가 아닌 모든 오류)에 대한 클라이언트 응답 메시지는 항상 고정된 일반 문구여야 한다 — 오류의 원문 내용(`error.message`)을 절대 그대로 노출하지 않는다.
- [ ] 원문 상세는 서버 로그(`console.error`)에 남는다 — 운영 중 실제 원인 파악이 가능해야 한다.
- [ ] Slack 이상 감지 알림(`notifyUpstreamFailure`)에는 지금처럼 상세 메시지를 계속 담는다(운영자 전용 채널이라 상세가 필요하다) — 이건 이미 사용자에게 노출되지 않는 경로이므로 바꾸지 않는다.
- [ ] 도메인 계층이 의도적으로 만든 사용자 대상 메시지(`ValidationError`/`NotFoundError`/`ConflictError`/`UnauthorizedError`의 메시지, 예: "문서를 찾을 수 없습니다.", "이미 사용 중인 slug입니다.")는 지금처럼 그대로 노출한다 — 이건 원문 유출이 아니라 의도된 사용자 안내다. 새니타이즈 대상은 UPSTREAM_ERROR(502) 분기뿐이다.
- [ ] 기존에 이 함수를 거치는 라우트들의 상태 코드·에러 코드(`UPSTREAM_ERROR`, 502)는 그대로 유지한다 — 메시지 내용만 바뀐다.

## 결정이 필요한 사항
없음.

## 범위 밖
- 구조화 로깅 도구 도입(P1-4a, Issue #4에서 결정 대기) — 이 작업은 기존처럼 `console.error`만 쓴다.
