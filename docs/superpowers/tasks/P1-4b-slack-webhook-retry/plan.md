# P1-4b: Slack 웹훅 전송 자체가 실패할 때의 재시도/폴백을 추가한다 — 구현 계획

## Global Constraints
- P1-3(`confluenceRequest`)에서 쓴 재시도 정책(최대 3회, `300ms * 2^attempt` + jitter, `Retry-After` 우선, 4xx는 즉시 실패)을 그대로 재사용한다 — 이 프로젝트에 이미 검증된 패턴을 새로 발명하지 않는다.
- `notifyUpstreamFailure`(호출부)는 수정하지 않는다 — 재시도는 `sendSlackAlert` 내부에서 끝나야 하고, 소진 후 실패하면 지금처럼 예외를 던져 호출부의 기존 catch/log 폴백이 그대로 동작하게 한다.

## Files
- Modify: `src/lib/notifications/slack.ts`
- Create: `src/lib/notifications/slack.test.ts` (기존에 테스트가 없던 파일 — 처음 추가)

## Steps
- [ ] **Step 1**: `slack.ts`에 재시도 루프를 추가한다 — `MAX_RETRIES = 3`, `isRetryableStatus(status) = status === 429 || status >= 500`, `Retry-After` 헤더 우선 처리. 4xx(429 제외)는 즉시 던진다.
- [ ] **Step 2**: `slack.test.ts` 신규 작성 — 정상 전송, 5xx 재시도 후 성공, 재시도 소진 후 예외, `Retry-After` 준수, 4xx(예: 400) 즉시 실패(재시도 없음), `fetch` 자체가 던지는 네트워크 오류도 재시도 대상인지 검증.
- [ ] **Step 3**: `npm test -- slack.test.ts`로 검증 후 `npm test`(전체)·`npx tsc --noEmit`·`npm run lint`·`npm run build`로 회귀를 확인한다.

각 Step은 `npm test -- slack.test.ts`로 검증 가능한 단위로 쪼갰다.
