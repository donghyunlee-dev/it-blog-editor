# P0-8: 게시 여부를 폴더 이동이 아니라 property만으로 관리하도록 단순화한다 — 구현 계획

## Global Constraints
- Restriction 적용/해제는 그 자체로 멱등 연산이라고 가정한다(같은 상태를 다시 걸어도 에러 없이 성공) — 이미 P0-1a~P0-6 전반에서 "완전한 원자성 대신 재시도로 수렴"하는 패턴을 여러 번 써왔다(P0-3 참고).
- 순서 원칙 유지: 게시 시 restriction 해제 → 메타데이터 기록. 게시취소 시 restriction 적용 → 메타데이터 기록. 메타데이터 기록이 실패해도 실제 공개 여부(restriction)는 항상 의도한 상태와 일치하므로, 최악의 경우도 "실제 상태와 표시가 잠깐 어긋남"이지 "보안 위반"이 아니다.
- `PersonalFolder`는 `{ accountFolderId, spaceKey }`로 줄어든다 — `draftFolderId`/`publishedFolderId`를 참조하는 모든 코드를 함께 고친다.

## Files
- Modify: `src/lib/editor/folder.ts`, `folder.test.ts` — 초안/게시 서브폴더 생성·자가복구 로직 제거
- Modify: `src/lib/editor/documents.ts`, `documents.test.ts` — `createDocument`/`listDocuments`가 계정 폴더 하나만 다루도록 변경, `listDocuments`가 `publishMetadata`로 게시 여부 판단
- Modify: `src/lib/editor/publish.ts`, `publish.test.ts` — `movePage`/작성자 폴더 조회 제거, restriction 토글만으로 게시/게시취소
- Modify: `src/lib/editor/deleted-documents.ts`, `deleted-documents.test.ts` — 복구 시 `accountFolderId`로 이동 + `publishMetadata.isPublished`를 `false`로 재설정
- Modify: `src/lib/editor/tag-suggestions.ts`, `tag-suggestions.test.ts` — `listDocuments` 호출 시그니처 변경 반영
- Modify: `src/app/editor/layout.tsx` — `listDocuments` 호출 시그니처 변경 반영
- Modify: `src/app/api/editor/documents/route.ts` — `createDocument` 호출 시 `draftFolderId` 대신 `accountFolderId` 전달
- Modify: `src/app/api/editor/folder/route.ts` — 응답에서 `draftFolderId`/`publishedFolderId` 제거
- Modify: `docs/product/prd.md`(기능별 정의 "초안-게시 생명주기" 갱신 + 체크리스트), `docs/product/architecture.md`, `docs/product/data-spec.md`

## Steps
- [ ] **Step 1**: `folder.ts`를 다시 작성한다 — `PersonalFolder`를 `{accountFolderId, spaceKey}`로 줄이고, `findPersonalFolder`/`createPersonalFolder`가 계정 폴더 하나만 찾거나 만들도록 단순화한다. 계정 폴더 생성 시 `hidePageFromOthers`를 걸지 않는다(계정 폴더 자체는 원래도 제한 없음 — 기존과 동일).
- [ ] **Step 2**: `documents.ts`의 `CreateDocumentInput.draftFolderId` → `accountFolderId`로 이름을 바꾸고 `createDocument`가 그 폴더 하위에 문서를 만들도록 고친다(여전히 `hidePageFromOthers`로 시작은 항상 숨김 상태). `listDocuments(accountFolderId)`로 시그니처를 하나로 줄이고, 문서마다 `getTags`/`sourceDocument`와 함께 `publishMetadata`도 병렬로 읽어 `isPublished`를 판단하도록 바꾼다.
- [ ] **Step 3**: `publish.ts`의 `setPublishState`에서 `getAuthorFolderOrThrow`/`movePage`/`isCurrentlyPublished`(위치 기반 판단)를 제거한다. 게시 시 `revealPageToSpace(pageId)` → 메타데이터 기록, 게시취소 시 `hidePageFromOthers(pageId)` → 메타데이터 기록 순서로 단순화한다. `currentPage`(title 조회용, P0-5b의 `publicSlug` 계산에 필요)는 계속 `getPage`로 가져온다.
- [ ] **Step 4**: `deleted-documents.ts`의 `restoreDocument`가 `movePage(pageId, folder.accountFolderId)`로 바꾸고, `hidePageFromOthers` 다음에 `publishMetadata`를 읽어 `isPublished: false`로 다시 쓰는 단계를 추가한다(수용 기준의 핵심 — 안 하면 게시 중이던 문서가 복구 후에도 "게시됨"으로 잘못 표시된다).
- [ ] **Step 5**: `tag-suggestions.ts`/`layout.tsx`/`documents/route.ts`/`folder/route.ts`의 호출부를 새 시그니처에 맞춰 고친다.
- [ ] **Step 6**: 관련 테스트 파일(`folder.test.ts`/`documents.test.ts`/`publish.test.ts`/`deleted-documents.test.ts`/`tag-suggestions.test.ts`)을 새 동작에 맞게 다시 쓴다.
- [ ] **Step 7**: `npm test`(전체)·`npx tsc --noEmit`·`npm run lint`·`npm run build`로 회귀를 확인한다.
- [ ] **Step 8**: `docs/product/prd.md`의 "기능별 정의 — 초안-게시 생명주기" 설명을 새 메커니즘으로 갱신하고, `architecture.md`/`data-spec.md`의 DraftFolder/PublishedFolder 관련 서술을 정리한다. P1-10 항목에 "이번 리팩터로 재현 경로가 사라짐" 메모를 추가한다.
- [ ] **Step 9**: 필요하면 실제 Confluence 인스턴스로 핵심 가정(restriction 토글이 새 흐름에서도 그대로 동작하는지)을 가볍게 재확인한다 — 이미 P1-2a/P1-2b/P0-7에서 restriction/이동 API 자체는 검증됐으므로, 새로 검증해야 할 것은 "이동 없이 restriction만 토글해도 실제로 공개/비공개가 반영되는지" 정도로 범위가 좁다.

각 Step은 `npm test -- <관련 파일>`로 검증 가능한 단위로 쪼갰다.
