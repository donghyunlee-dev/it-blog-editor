# P1-2b: 삭제된 문서 복구 — 구현 계획

## Global Constraints
- 기존 계층 원칙을 따른다: `confluence/client.ts`(저수준) → `editor/documents.ts` 또는 `editor/folder.ts`(도메인) → API route → 컴포넌트.
- 소유권 판단은 `requireDocumentOwner`(트래시된 페이지의 `authorMeta` 재조회에 의존)를 쓰지 않고, 항상 "로그인한 이메일의 계정 폴더 레지스트리에 그 pageId가 있는가"로만 한다(`task.md` "수용 기준" 참고).
- 복구된 문서는 항상 "초안" 서브폴더 + 작성자 전용 제한으로 돌아온다(게시 상태를 신뢰하지 않음).
- 확인 없는 파괴적 동작을 만들지 않는다 — 다만 복구 자체는 되돌릴 수 있는(다시 삭제 가능한) 동작이라 `Modal` 확인 없이 즉시 실행해도 CLAUDE.md 규칙에 어긋나지 않는다(삭제만 확인 모달 대상).

## Files
- Modify: `src/lib/confluence/client.ts`, `client.test.ts` — 트래시된 페이지에도 동작하는지 확인이 필요한 부분은 `movePage`/`getPage` 재사용(신규 함수 없음, 기존 함수 그대로 재사용).
- Modify: `src/lib/editor/documents.ts`, `documents.test.ts` — `deleteDocument`가 레지스트리에 기록하도록 변경.
- Create: `src/lib/editor/deleted-documents.ts`, `deleted-documents.test.ts` — 레지스트리 읽기/쓰기/제거 + `restoreDocument`.
- Create: `src/app/api/editor/documents/deleted/route.ts`, `route.test.ts` — `GET`(목록).
- Create: `src/app/api/editor/documents/[pageId]/restore/route.ts`, `route.test.ts` — `POST`(복구).
- Create: `src/components/editor/DeletedDocumentsModal.tsx`, `DeletedDocumentsModal.test.tsx`.
- Modify: `src/components/editor/EditorSidebar.tsx`, `EditorSidebar.test.tsx` — 진입점 버튼 추가.

## Steps
- [ ] **Step 1**: `documents.test.ts`에 실패하는 테스트를 추가한다 — `deleteDocument`가 삭제 전 `authorMeta`로 작성자 계정 폴더를 찾아 `deletedDocuments` property에 `{pageId, title, deletedAt}`를 append하는지(기존 값 유지하며 추가).
- [ ] **Step 2**: `documents.ts`의 `deleteDocument`를 구현한다 — `getPageOrThrow` → `authorMeta` 조회 → `findPersonalFolder`/`createPersonalFolder` → 계정 폴더의 `deletedDocuments` property를 `upsertPageProperty`로 갱신 → `deletePage`.
- [ ] **Step 3**: `deleted-documents.test.ts`를 먼저 작성한다 — `listDeletedDocuments(email)`(레지스트리 읽기), `restoreDocument(email, pageId)`(레지스트리에 없으면 `NotFoundError`, 있으면 `movePage`+`hidePageFromOthers` 후 레지스트리에서 제거, `movePage`가 404를 던지면 — 이미 영구 삭제된 경우 — 레지스트리에서만 제거하고 `NotFoundError`로 안내).
- [ ] **Step 4**: `deleted-documents.ts`를 구현한다.
- [ ] **Step 5**: `deleted/route.test.ts` → `deleted/route.ts`(`GET`, 세션 이메일 기준 `listDeletedDocuments` 호출).
- [ ] **Step 6**: `[pageId]/restore/route.test.ts` → `restore/route.ts`(`POST`, 세션 이메일 기준 `restoreDocument` 호출 — `requireDocumentOwner` 대신 이 라우트 자체가 이메일 스코프로 동작).
- [ ] **Step 7**: `DeletedDocumentsModal.test.tsx`(로딩/빈 목록/목록/복구 클릭 시 콜백) → `DeletedDocumentsModal.tsx` 구현(`VersionHistory.tsx`와 동일한 마운트 시 fetch 패턴 재사용).
- [ ] **Step 8**: `EditorSidebar.test.tsx`에 진입점 버튼 테스트 추가 → `EditorSidebar.tsx`에 아이콘 버튼(헤더 행, `onCollapse` 옆) + Modal 상태 추가. 복구 성공 시 `router.refresh()`로 문서 목록을 갱신한다.
- [ ] **Step 9**: 각 단계 개별 테스트 통과 확인 후 `npm test` + `npm run lint` + `npx tsc --noEmit` + `npm run build` 전체 회귀 확인.
- [ ] **Step 10**: PRD 갱신(P1-2b를 "PR 리뷰 대기"로), `result.md`/`test.md` 작성.
- [ ] **Step 11**: `feature/p1-2b-restore-deleted-document` 브랜치 push 후 `gh pr create` — PR 본문에 "트래시된 페이지에 대한 `getPage`/`movePage` 동작 미검증" 사실을 명시.
