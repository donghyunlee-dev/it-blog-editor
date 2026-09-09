# P7-8: 빈 폴더 상태 UI — 구현 계획

## Global Constraints
- 새 컴포넌트를 만들지 않는다 — `@sfood/ui`의 기존 `EmptyState`를 그대로 재사용한다(문서함 미선택 상태의 최상위 `EmptyState`와 같은 패턴).
- "진짜로 비어 있음"과 "필터로 지금 안 보일 뿐"을 반드시 구분한다 — 판단 기준은 `filteredDocuments`(필터 적용됨)가 아니라 원본 `documents` prop이어야 한다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx` (`folderIdsWithDocuments` 집합 추가, `renderFolderNode`에 빈 폴더 안내 렌더링)
- Modify: `src/components/editor/EditorSidebar.test.tsx` (신규 describe 블록)

## Steps
- [x] **Step 1**: `EditorSidebar.tsx`에 `folderIdsWithDocuments`(원본 `documents` 기준, 폴더 배정이 있는 문서들의 `folderId` 집합)를 추가한다.
- [x] **Step 2**: `renderFolderNode`에서 `isReallyEmpty = childFolders.length === 0 && !folderIdsWithDocuments.has(folder.id)`를 계산하고, `isExpanded && isReallyEmpty`일 때 `EmptyState`를 들여쓰기와 함께 렌더링한다.
- [x] **Step 3**: `EditorSidebar.test.tsx` — 진짜 빈 폴더/하위 폴더만 있는 폴더/문서 있는 폴더/검색으로 가려진 폴더/접힌 폴더, 5가지 경우를 검증한다.
- [x] **Step 4**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- EditorSidebar.test.tsx`로 검증 가능한 단위로 쪼갠다.
