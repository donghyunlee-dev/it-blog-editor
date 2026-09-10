# P7-9: 검색·삭제된 문서·공유 문서와의 통합 정합성 — 구현 계획

## Global Constraints
- 새 API를 만들지 않는다 — `DocumentSearchResult`(`DocumentSummary` 확장)가 이미 `folderId`를 갖고 있으므로(P7-3), `buildFolderPath`(P7-7에서 만든 순수 함수)만 재사용한다.
- 검색 결과의 폴더 경로는 P7-7 편집 화면 브레드크럼과 같은 표기("/") 관례를 따른다.
- 복구 시 폴더 정합성 보정은 이미 있는 함수(`setDocumentFolder`/`deletePageProperty` 패턴)와 같은 스타일로 새 함수 하나만 추가한다 — `deleted-documents.ts`가 `documents.ts`의 속사정(property 키 등)을 직접 알 필요는 없다.

## Files
- Modify: `src/lib/editor/documents.ts` (`reconcileFolderAfterRestore` 추가)
- Modify: `src/lib/editor/deleted-documents.ts` (`restoreDocument`가 복구 후 `reconcileFolderAfterRestore` 호출)
- Modify: `src/lib/editor/deleted-documents.test.ts` (신규 테스트 3개)
- Modify: `src/components/editor/GlobalSearchModal.tsx` (`folders` prop, 결과 목록·미리보기에 폴더 경로 표시)
- Modify: `src/components/editor/GlobalSearchModal.test.tsx` (신규 테스트 2개)
- Modify: `src/components/editor/EditorShell.tsx` (`<GlobalSearchModal folders={folders} />`)
- Modify: `src/components/editor/EditorSidebar.test.tsx` (공유 문서-폴더 트리 독립성 회귀 테스트 1개)

## Steps
- [x] **Step 1**: `documents.ts`에 `reconcileFolderAfterRestore(pageId, accountFolderId)`를 추가한다 — 문서의 현재 `folderId`가 그 계정의 폴더 트리에 실제로 존재하는지 확인하고, 없으면 `deletePageProperty`로 지운다.
- [x] **Step 2**: `deleted-documents.ts`의 `restoreDocument`가 `movePage` 성공 후 `reconcileFolderAfterRestore`를 호출하도록 한다.
- [x] **Step 3**: `deleted-documents.test.ts`에 세 가지 경우(폴더 그대로 있음/폴더 삭제됨/애초에 미분류)를 검증하는 테스트를 추가한다.
- [x] **Step 4**: `GlobalSearchModal.tsx`에 `folders` prop과 `buildFolderPath` 기반 `folderLabel()` 헬퍼를 추가하고, 결과 목록 행과 미리보기 패널에 렌더링한다.
- [x] **Step 5**: `EditorShell.tsx`가 `folders`를 `GlobalSearchModal`에도 내려주도록 한다.
- [x] **Step 6**: `GlobalSearchModal.test.tsx`에 폴더 경로 표시/미표시 테스트를 추가한다.
- [x] **Step 7**: `EditorSidebar.test.tsx`에 "공유받은 문서는 folderId가 있어도 폴더 트리에 편입되지 않는다" 회귀 테스트를 추가한다.
- [x] **Step 8**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- documents.test.ts deleted-documents.test.ts GlobalSearchModal.test.tsx EditorSidebar.test.tsx EditorShell.test.tsx`로 검증 가능한 단위로 쪼갠다.
