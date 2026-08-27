# P0-5a: slug 중복 검사 반복 비용을 캐시로 완화 — 구현 계획

## Global Constraints
- `findPublishedPageBySlug`의 시그니처·반환 타입은 그대로 유지한다 — `publish.ts` 호출부를 바꾸지 않는다.
- 캐시는 "slug → 어느 페이지가 점유하고 있는지"를 통째로 인덱싱해 둔다(단순히 마지막 조회 slug 하나만 캐싱하는 게 아니라) — 서로 다른 slug를 연달아 검사해도(예: 여러 뷰어) 첫 스캔 이후에는 전부 캐시로 처리되게 한다.
- 테스트에서 모듈 레벨 캐시가 이전 테스트로부터 오염되지 않도록, 테스트 전용 리셋 함수를 export한다(이름에 `ForTests`를 넣어 프로덕션 코드에서 쓰면 안 된다는 것을 명확히 한다).

## Files
- Modify: `src/lib/confluence/client.ts`
- Modify: `src/lib/confluence/client.test.ts`
- Modify: `src/lib/editor/publish.ts`
- Modify: `src/lib/editor/publish.test.ts`

## Steps
- [ ] **Step 1**: `client.test.ts`에 실패하는 테스트를 먼저 추가한다(TDD) — (a) 같은 spaceId에 대해 `findPublishedPageBySlug`를 두 번 연달아 호출하면 두 번째는 스캔 API를 다시 호출하지 않는다(fetch 호출 횟수로 검증), (b) `invalidateSlugIndexCache()`를 호출한 뒤에는 다시 스캔한다, (c) TTL이 지나면(시간 모킹) 다시 스캔한다.
- [ ] **Step 2**: `npx vitest run src/lib/confluence/client.test.ts`로 실패 확인.
- [ ] **Step 3**: `client.ts` 수정.
  - 모듈 레벨 캐시: `let slugIndexCache: { spaceId: string; builtAt: number; bySlugKey: Map<string, ConfluencePage> } | null = null;`
  - `SLUG_INDEX_TTL_MS = 15_000`.
  - `buildSlugIndex(spaceId, propertyKey)`: 기존 `findPublishedPageBySlug`가 하던 전체 스캔 로직을 그대로 옮기되, 특정 slug 하나만 찾는 대신 게시 중인 모든 문서의 `{viewerId}:{slug}` → `ConflucePage`를 전부 인덱싱한다.
  - `findPublishedPageBySlug(spaceId, viewerId, slug, propertyKey)`: 캐시가 없거나, spaceId가 다르거나, TTL이 지났으면 `buildSlugIndex`로 다시 채운 뒤 `bySlugKey.get(`${viewerId}:${slug}`)`을 반환한다.
  - `export function invalidateSlugIndexCache(): void { slugIndexCache = null; }` — 이 프로세스가 방금 게시해 알고 있는 상태가 바뀌었을 때 쓴다.
  - `export function __resetSlugIndexCacheForTests(): void { slugIndexCache = null; }` — 테스트 전용(문서 주석으로 명시).
- [ ] **Step 4**: `npx vitest run src/lib/confluence/client.test.ts`로 통과 확인.
- [ ] **Step 5**: `publish.test.ts`에 실패하는 테스트를 추가한다 — 게시(`isPublished: true`)가 성공하면 `invalidateSlugIndexCache`가 호출되는지.
- [ ] **Step 6**: `publish.ts`의 `setPublishState`에서, 게시 분기의 `upsertPageProperty(PUBLISH_PROPERTY_KEY, value)` 성공 직후 `invalidateSlugIndexCache()`를 호출한다.
- [ ] **Step 7**: `npx vitest run src/lib/editor/publish.test.ts`로 통과 확인.
- [ ] **Step 8**: `client.test.ts`의 다른 describe 블록들이 이 새 캐시로 인해 오염되지 않도록, 최상단 `beforeEach`에 `__resetSlugIndexCacheForTests()` 호출을 추가한다.
- [ ] **Step 9**: `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 확인.
