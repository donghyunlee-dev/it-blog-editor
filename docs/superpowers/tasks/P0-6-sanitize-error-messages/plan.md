# P0-6: 내부 오류 응답 새니타이즈 — 구현 계획

## Global Constraints
- 도메인 에러(`UnauthorizedError`/`ValidationError`/`NotFoundError`/`ConflictError`) 4개 분기는 건드리지 않는다 — 이미 안전한, 의도된 메시지다.
- Slack 알림(`notifyUpstreamFailure`)에는 상세 메시지를 계속 그대로 보낸다.
- 상태 코드(502)·에러 코드(`UPSTREAM_ERROR`)는 그대로 유지한다.

## Files
- Modify: `src/lib/api-response.ts`
- Create: `src/lib/api-response.test.ts`(신규 — 이 파일은 지금까지 테스트가 없었다)

## Steps
- [ ] **Step 1**: `api-response.test.ts`를 먼저 작성한다(TDD) — (a) 4개 도메인 에러 각각이 올바른 코드/상태/메시지로 매핑되는지, (b) 분류되지 않은 에러(예: 원문에 민감해 보이는 문구를 담은 `Error`)를 던지면 응답 메시지가 그 원문을 포함하지 **않고** 고정 문구인지, (c) `console.error`로 원문이 로깅되는지(`vi.spyOn(console, "error")`), (d) Slack 알림에는 여전히 원문이 전달되는지(`sendSlackAlert` 모킹).
- [ ] **Step 2**: `npx vitest run src/lib/api-response.test.ts`로 실패 확인.
- [ ] **Step 3**: `api-response.ts`의 마지막 분기를 수정한다 — `console.error`로 원문 로깅 추가, 클라이언트 응답 메시지를 고정 문구("일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.")로 교체. `notifyUpstreamFailure`에는 원문을 그대로 전달(기존 유지).
- [ ] **Step 4**: `npx vitest run src/lib/api-response.test.ts`로 통과 확인.
- [ ] **Step 5**: `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 확인.
