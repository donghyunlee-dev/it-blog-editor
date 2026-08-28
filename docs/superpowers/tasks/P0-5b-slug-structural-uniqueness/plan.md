# P0-5b: slug 조회를 구조적으로 해결한다 — 구현 계획

## Global Constraints
- P0-7(문서 title 구조 변경)이 먼저 적용되어 있어야 한다 — `publicSlug` 계산이 Confluence page title(내부 고유키)에 의존한다.
- 기존 `ConflictError`(같은 뷰어 내 slug 중복)는 더 이상 발생하지 않는다 — 관련 API 문서(api-spec.md)의 409 설명에서 제거한다.
- `PublishViewerMetadata`(저장/응답용, `publicSlug` 필수)와 클라이언트가 보내는 입력값(`publicSlug` 없음)을 같은 타입으로 섞지 않는다 — 별도 `PublishViewerInput` 타입으로 분리한다.

## Files
- Modify: `src/lib/confluence/client.ts` (slug 인덱스/캐시 전체 제거)
- Modify: `src/lib/editor/publish.ts` (`assertNoSlugConflict` → `validateAndComposeViewers`)
- Modify: `src/lib/editor/publish.test.ts`
- Modify: `src/lib/confluence/client.test.ts`
- Modify: `src/app/api/editor/documents/[pageId]/publish/route.ts`, `route.test.ts`
- Modify: `src/components/editor/PublishForm.tsx`
- Modify: `docs/product/data-spec.md`, `docs/product/api-spec.md`

## Steps
- [ ] **Step 1**: `client.ts`에서 `SLUG_INDEX_TTL_MS`/`SlugIndexCache`/`slugIndexCache`/`slugKey`/`buildSlugIndex`/`findPublishedPageBySlug`/`invalidateSlugIndexCache`/`__resetSlugIndexCacheForTests`와, 이제 유일한 호출부를 잃는 `listAllSpacePages`를 함께 제거한다.
- [ ] **Step 2**: `publish.ts`에 `PublishViewerInput`(`{slug, metaDescription}`)과 `PublishViewerMetadata`(`PublishViewerInput` + `publicSlug`) 두 타입을 분리하고, `assertNoSlugConflict`를 `validateAndComposeViewers(internalKey, nextViewers)`로 바꿔 검증 + `publicSlug` 계산만 하도록(스캔 없음) 재작성한다. `setPublishState`가 `currentPage.title`(내부 고유키)을 이 함수에 넘긴다.
- [ ] **Step 3**: `publish/route.ts`가 `PublishViewerMetadata` 대신 `PublishViewerInput`을 요청 페이로드 타입으로 쓰도록 바꾼다.
- [ ] **Step 4**: `PublishForm.tsx`의 로컬 `ViewerMetadata`에 읽기 전용 `publicSlug?: string`을 추가하고, slug 입력 아래에 있으면 "실제 공개 경로: ..."를 안내 텍스트로 보여준다(서버로 다시 보내지 않음).
- [ ] **Step 5**: `client.test.ts`/`publish.test.ts`/`route.test.ts`에서 제거된 함수를 테스트하던 코드를 지우고, `publicSlug` 계산을 검증하는 테스트로 교체한다.
- [ ] **Step 6**: `data-spec.md`/`api-spec.md`를 갱신한다 — `publishMetadata.viewers[viewerId]`에 `publicSlug` 추가, slug 유니크 제약 설명을 "스캔 기반 검사"에서 "구조적으로 불가능"으로 교체, 409(같은 뷰어 내 slug 중복) 응답 케이스 제거.
- [ ] **Step 7**: `npm test -- publish.test.ts client.test.ts`로 검증 후 `npm test`(전체)·`npx tsc --noEmit`·`npm run lint`·`npm run build`로 회귀를 확인한다.
- [ ] **Step 8**: [Issue #3](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/3)을 이 최종 결정으로 닫는다.

각 Step은 `npm test -- publish.test.ts client.test.ts`로 검증 가능한 단위로 쪼갰다.
