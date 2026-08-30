# P1-4a: 구조화 로깅을 도입한다 — 구현 계획

## Global Constraints
- Slack 알림 발송 로직(`notifyUpstreamFailure`, `sendSlackAlert`)의 동작(메시지 내용, 발송 조건)은 바꾸지 않는다 — 로그 포맷만 바꾼다.
- 기존 도메인 에러 분류(`toErrorResponse`의 401/400/404/409 응답)는 이 작업과 무관하므로 건드리지 않는다.

## Files
- Create: `src/lib/logger.ts`, `src/lib/logger.test.ts`
- Modify: `src/lib/api-response.ts` (`api-response.test.ts` 필요 시 갱신)
- Modify: `src/lib/editor/documents.ts` (`documents.test.ts` 필요 시 갱신)
- Modify: `src/lib/editor/tag-suggestions.ts` (`tag-suggestions.test.ts` 필요 시 갱신)

## Steps
- [ ] **Step 1**: `logger.ts` 작성 — `serializeError`(Error의 message/stack/추가 속성을 평범한 객체로 변환), `logger.info/warn/error`(JSON 한 줄 출력).
- [ ] **Step 2**: `logger.test.ts` 작성 — JSON 형태·필드(level/message/timestamp/context) 검증, `serializeError`가 Error의 message/stack/커스텀 속성(status 등)을 모두 담는지 검증, level별로 올바른 console 메서드(log/warn/error)를 호출하는지 검증.
- [ ] **Step 3**: `api-response.ts`의 두 `console.error` 호출을 `logger.error`로 교체 — `notifyUpstreamFailure`는 `{ error: serializeError(slackError) }`, `toErrorResponse`는 원본 `error`(메시지만 추출한 `detail`이 아니라)를 `serializeError`로 감싸 context로 남긴다(ConfluenceApiError의 `status` 등 추가 정보를 살리기 위해).
- [ ] **Step 4**: `documents.ts`의 `deleteDocument` catch 블록을 `logger.error("[deleteDocument] 삭제된 문서 레지스트리 기록 실패", { pageId, error: serializeError(error) })`로 교체.
- [ ] **Step 5**: `tag-suggestions.ts`의 catch 블록을 `logger.error(...)`로 교체하고 `email`을 context에 포함한다.
- [ ] **Step 6**: 기존 테스트 중 `console.error`를 직접 spy하는 곳(`api-response.test.ts` 등)이 있으면 `logger`(또는 `console.error`가 호출되는 것 자체)를 검증하도록 갱신한다.
- [ ] **Step 7**: `npm test`(전체)·`npx tsc --noEmit`·`npm run lint`·`npm run build`로 회귀를 확인한다.

각 Step은 `npm test -- logger.test.ts`로 검증 가능한 단위로 쪼갰다.
