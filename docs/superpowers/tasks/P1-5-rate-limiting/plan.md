# P1-5: 민감 API 엔드포인트에 레이트리밋을 추가한다 — 구현 계획

## Global Constraints
- 외부 스토어(Redis 등)를 도입하지 않는다 — Issue #5 결정에 따라 프로세스 메모리(`Map`)만 쓴다.
- 레이트리밋 초과 시 에러는 기존 도메인 에러 체계(`src/lib/editor/errors.ts` → `toErrorResponse`)에 편입시킨다 — 별도의 에러 응답 포맷을 만들지 않는다.

## Files
- Modify: `src/lib/editor/errors.ts` — `RateLimitError` 추가.
- Modify: `src/lib/api-response.ts` — `RateLimitError` → 429 + `Retry-After` 헤더 매핑 추가.
- Create: `src/lib/rate-limit.ts` — `enforceRateLimit(action, identifier, limit?, now?)`.
- Create: `src/lib/rate-limit.test.ts`.
- Modify: `src/app/api/editor/documents/route.ts`(POST), `src/app/api/editor/documents/[pageId]/images/route.ts`(POST), `src/app/api/editor/documents/[pageId]/publish/route.ts`(PATCH) — `requireSessionEmail()` 직후 `enforceRateLimit(...)` 호출 추가.
- Modify: 위 세 라우트의 `.test.ts` — `@/lib/rate-limit`를 `vi.mock`하고 초과 시 429/`Retry-After`/후속 미호출을 검증하는 테스트 추가.

## Steps
- [x] **Step 1**: `errors.ts`에 `RateLimitError`(retryAfterSeconds 포함) 추가.
- [x] **Step 2**: `rate-limit.ts` 구현 — 고정 윈도우(1분), `action:identifier` 키, `now` 주입 가능.
- [x] **Step 3**: `rate-limit.test.ts` — 통과/초과/윈도우 롤오버/독립 집계 5건.
- [x] **Step 4**: `api-response.ts`에 429 매핑 추가.
- [x] **Step 5**: 세 라우트에 `enforceRateLimit` 호출 삽입.
- [x] **Step 6**: 세 라우트 테스트에 초과 케이스 추가, 기존 테스트는 `enforceRateLimit`을 모킹해 영향받지 않게 함.
- [x] **Step 7**: `npm test`, `npm run lint`, `npm run build` 전체 실행.
