# P0-7: Confluence 페이지 title 충돌로 인한 문서 생성 실패를 막는다 — 구현 계획

## Global Constraints
- 기존 API 요청/응답 스키마(`POST /api/editor/documents`, `PUT /api/editor/documents/{pageId}`, `GET /api/editor/documents`)는 그대로 유지한다 — 내부 저장 방식만 바뀐다.
- `sourceDocument` property는 이미 P0-3(버전 가드)의 대상이므로, `title` 필드를 추가해도 기존 `expectedVersion` 낙관적 동시성 로직을 그대로 재사용한다(별도 버전 관리 추가하지 않음).
- Confluence page의 실제 title은 생성 이후 어떤 경로로도 다시 쓰지 않는다(`updateDocument`가 `updatePage`를 호출할 때도 기존 title을 그대로 다시 보낸다).

## Files
- Modify: `src/lib/editor/documents.ts` (`createDocument`/`updateDocument`/`getDocumentDetail`/`listDocuments`/`deleteDocument`)
- Modify: `src/lib/editor/documents.test.ts`
- (P0-5b와 공유) Modify: `src/lib/editor/publish.ts`, `src/lib/confluence/client.ts` — 자세한 내용은 [P0-5b-slug-structural-uniqueness/plan.md](../P0-5b-slug-structural-uniqueness/plan.md) 참고

## Steps
- [ ] **Step 1**: `documents.ts`에 `import { randomUUID } from "crypto"` 추가. `createDocument`가 `randomUUID()`로 `internalKey`를 만들어 `createPage`의 `title`로 쓰고, 사용자가 입력한 `input.title`은 `sourceDocument` property에 `{ title, doc }`로 함께 저장한다.
- [ ] **Step 2**: `updateDocument`가 `updatePage` 호출 시 `title: input.title` 대신 `title: current.title`(기존 값 그대로)을 보내도록 바꾸고, `sourceDocument` upsert에 `{ title: input.title, doc: input.doc }`를 저장한다.
- [ ] **Step 3**: `getDocumentDetail`이 `page.title` 대신 `sourceProperty.value.title`(없으면 빈 문자열)을 반환하도록 바꾼다.
- [ ] **Step 4**: `listDocuments`가 문서마다 `getTags`와 함께 `sourceDocument` property도 병렬로 조회해, `sourceProperty?.value?.title ?? page.title`(하위 호환 fallback)을 표시 제목으로 쓰도록 바꾼다.
- [ ] **Step 5**: `deleteDocument`가 삭제된 문서 레지스트리(`recordDeletedDocument`)에 넘기는 제목을 `page.title` 대신 `sourceDocument.title`(없으면 `page.title` fallback)로 바꾼다.
- [ ] **Step 6**: `documents.test.ts`의 관련 테스트를 갱신한다 — `createPage`가 UUID 형식의 title로 호출되는지, `sourceDocument` upsert에 `title`이 함께 들어가는지, `updatePage`가 기존 title을 그대로 재전송하는지, `listDocuments`/`getDocumentDetail`/`deleteDocument`가 `sourceDocument.title`을 우선 쓰고 없으면 fallback하는지.
- [ ] **Step 7**: `npm test -- documents.test.ts`로 검증 후 `npm test`(전체)·`npx tsc --noEmit`·`npm run lint`·`npm run build`로 회귀를 확인한다.
- [ ] **Step 8**: 실제 Confluence 인스턴스에 임시 페이지를 만들어 핵심 가정(서로 다른 부모 밑에 같은 title로 만들면 실제로 충돌하는지, `randomUUID()` title은 충돌 없이 통과하는지)을 직접 확인하고 즉시 정리한다.

각 Step은 `npm test -- documents.test.ts`로 검증 가능한 단위로 쪼갰다.
