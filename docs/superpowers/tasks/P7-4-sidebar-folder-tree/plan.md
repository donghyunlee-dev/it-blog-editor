# P7-4: 사이드바 폴더 트리 UI — 구현 계획

## Global Constraints
- 폴더가 없는 계정에서는 기존 렌더링 결과와 완전히 동일해야 한다(회귀 없음) — 기존 `EditorSidebar.test.tsx` 스위트가 그대로 통과해야 한다.
- 펼침/접힘 상태는 `EditorShell.tsx`의 `WIDTH_STORAGE_KEY`/`COLLAPSED_STORAGE_KEY`와 같은 패턴(`try/catch` + 마운트 후 `useEffect` 동기화)을 그대로 재사용한다.
- 새 SVG 아이콘(폴더, 펼침/접힘 화살표)은 이 파일이 이미 쓰는 스타일(`viewBox="0 0 20 20"`, `stroke="currentColor"`, `strokeWidth` 1.4~1.8)을 그대로 따른다 — `@sfood/ui`의 `Icon`은 `search`/`comment`만 제공해 대응 요소가 없다(기존 `StatusIcon` 선례와 동일한 이유).

## Files
- Modify: `src/app/editor/layout.tsx` (`listFolders` 조회 추가)
- Modify: `src/components/editor/EditorShell.tsx` (`folders` prop 전달)
- Modify: `src/components/editor/EditorShell.test.tsx` (prop 전달 회귀 테스트, 필요 시)
- Modify: `src/components/editor/EditorSidebar.tsx` (폴더 트리 렌더링 추가)
- Modify: `src/components/editor/EditorSidebar.test.tsx` (신규 테스트)

## Steps
- [ ] **Step 1**: `layout.tsx`가 `listFolders(folder.accountFolderId)`를 `Promise.all`에 추가하고 `EditorShell`에 `folders`로 전달한다.
- [ ] **Step 2**: `EditorShell.tsx`의 `EditorShellProps`에 `folders?: FolderNode[]`를 추가하고 `EditorSidebar`에 그대로 넘긴다.
- [ ] **Step 3**: `EditorSidebar.tsx`에 `folders` prop을 추가하고, `childrenByParent`(폴더를 `parentId` 기준으로 묶은 맵) + `documentsByFolder`(필터링된 문서를 `folderId` 기준으로 묶은 맵)를 계산한다.
- [ ] **Step 4**: 문서 링크 행 렌더링을 `DocumentRow` 내부 컴포넌트로 추출한다(기존 목록과 폴더 안 목록이 공유).
- [ ] **Step 5**: 재귀 컴포넌트 `FolderTreeItem`(폴더 행 + 펼쳐졌을 때 하위 폴더·문서)을 추가하고, `expandedFolders` 상태(`localStorage` 연동)로 펼침/접힘을 관리한다.
- [ ] **Step 6**: 기존 `nav` 블록을 "폴더 트리(있으면) + 미분류 섹션(폴더가 있으면 레이블 포함, 없으면 레이블 없이 기존 그대로)" 구조로 재구성한다. 페이지네이션은 미분류 섹션에만 적용한다.
- [ ] **Step 7**: 회귀 테스트(폴더 없을 때 기존과 동일) + 신규 테스트(폴더 렌더링, 펼침/접힘, 미분류 분리, 하위 폴더 들여쓰기, localStorage 저장)를 추가한다.
- [ ] **Step 8**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- EditorSidebar.test.tsx`로 검증 가능한 단위로 쪼갠다.
