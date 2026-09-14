# P16-1: 삭제된 문서 전용 페이지 — 구현 계획

## Global Constraints
- 기존 `restoreDocument`/복구 API(`POST /api/editor/documents/{id}/restore`)는 그대로
  쓴다 — 이번 작업은 목록 표시·검색·진입 경로만 바꾼다.
- 다른 `/editor/*` 페이지(`/editor`, `/editor/new`, `/editor/[pageId]`)와 같은 패턴 —
  서버 컴포넌트가 데이터를 미리 조회해 클라이언트 컴포넌트에 내려준다(클라이언트에서
  마운트 후 fetch하는 기존 Modal 방식 대신).
- `DeletedDocumentEntry`에 필드를 추가해도 기존에 기록된 항목엔 그 필드가 없을 수 있다 —
  읽는 쪽에서 기본값으로 보정한다(쓰는 쪽만 고쳐서는 안 됨).

## Files
- Modify: `src/lib/editor/documents.ts` (`DeletedDocumentEntry`, `recordDeletedDocument`,
  `deleteDocument`)
- Modify: `src/lib/editor/documents.test.ts`
- Modify: `src/lib/editor/deleted-documents.ts` (`listDeletedDocuments`가 `folderName`까지
  포함한 `DeletedDocumentSummary[]`를 반환하도록)
- Modify: `src/lib/editor/deleted-documents.test.ts`
- Add: `src/app/editor/trash/page.tsx`
- Add: `src/components/editor/DeletedDocumentsPage.tsx` (`DeletedDocumentsModal.tsx` 대체)
- Add: `src/components/editor/DeletedDocumentsPage.test.tsx`
- Remove: `src/components/editor/DeletedDocumentsModal.tsx`,
  `src/components/editor/DeletedDocumentsModal.test.tsx`
- Modify: `src/components/editor/EditorSidebar.tsx`, `EditorSidebar.test.tsx` (트리거를
  Modal 여는 버튼에서 `/editor/trash` Link로)
- Modify: `docs/product/design.md`, `docs/product/prd.md`

## Steps
- [x] **Step 1**: `documents.ts` — `DeletedDocumentEntry`에 `tags: string[]`,
      `isPublished: boolean`, `folderId: string | null` 추가. `recordDeletedDocument`가
      이 값들을 받아 저장하도록 시그니처 확장.
- [x] **Step 2**: `deleteDocument()` — `deletePage()` 호출 전에 `getTags`·
      `getPageProperty(publishMetadata)`·`getPageProperty(folderId)`를 기존 sourceProperty
      조회와 `Promise.all`로 묶어 가져오고, `recordDeletedDocument`에 전달.
- [x] **Step 3**: `deleted-documents.ts` — `listDeletedDocuments`가 계정의 `listFolders()`도
      함께 조회해 `folderId → name` 맵을 만들고, 각 항목에 `folderName`을 얹은
      `DeletedDocumentSummary[]`를 반환하도록 바꾼다. 옛 항목(필드 없음)은 기본값 보정.
- [x] **Step 4**: `documents.test.ts`/`deleted-documents.test.ts` 갱신 — 새 필드 기록·보정
      동작을 검증하는 테스트 추가.
- [x] **Step 5**: `src/app/editor/trash/page.tsx` 신설 — 세션 확인 후
      `listDeletedDocuments(email)` 호출, `<DeletedDocumentsPage initialDocuments={...} />`
      렌더(다른 `/editor/*` 페이지와 같은 서버 컴포넌트 패턴).
- [x] **Step 6**: `DeletedDocumentsPage.tsx` 신설 — 상단 검색 입력(제목·태그 필터, 사이드바
      검색과 같은 로직), 하단 목록(제목·`StatusIcon`·태그 `Tag` chips·`folderName ?? "미분류"`·
      삭제일시·복구 버튼). 복구 성공 시 로컬 상태에서 제거 + Toast + `router.refresh()`.
      전체/검색 결과 빈 상태는 `EmptyState`.
- [x] **Step 7**: `EditorSidebar.tsx` — `deletedDocsOpen` state·`Modal`·
      `DeletedDocumentsModal` import 제거, 트리거를 `/editor/trash`로 가는 `Link`로 교체
      (다른 nav 항목과 같은 `guardNavigate` 패턴).
- [x] **Step 8**: `DeletedDocumentsModal.tsx`/`.test.tsx` 삭제, 새 컴포넌트 테스트 작성.
      `EditorSidebar.test.tsx`의 "삭제된 문서" Modal 관련 테스트를 Link 이동 검증으로 교체.
- [x] **Step 9**: `npx vitest run` 변경 파일 전부, `npx eslint` 변경 파일 전부,
      `npm run build`. 여러 모듈에 걸친 변경(문서 삭제 경로 자체를 건드림)이라 회귀
      위험 판단 후 `npm test` 전체도 돌린다.
