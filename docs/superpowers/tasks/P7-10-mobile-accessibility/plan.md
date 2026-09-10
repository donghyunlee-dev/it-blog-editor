# P7-10: 모바일 대응 + 접근성 — 구현 계획

## Global Constraints
- 기존 Tab 순서·클릭 동작을 그대로 둔다 — 방향키 탐색은 그 위에 얹는 추가 계층이지, 로빙 tabindex로 Tab 자체를 재정의하지 않는다(task.md "결정이 필요한 사항" 참고).
- 새 컴포넌트를 만들지 않는다 — 기존 `EditorSidebar.tsx`의 `renderFolderNode`/`renderDocumentRow`에 ARIA 속성과 `onKeyDown`만 추가한다.
- "미분류"/"공유받은 문서" 목록은 트리 구조가 아니므로 `role="treeitem"`을 붙이지 않는다 — `renderDocumentRow`에 `treeItem` 플래그를 추가해 트리 안에서 호출될 때만 켠다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx` (트리 노드 순회·키보드 핸들러, ARIA 속성)
- Modify: `src/components/editor/EditorSidebar.test.tsx` (신규 describe 블록 — ARIA 구조·방향키 탐색)
- Modify: `src/components/editor/EditorShell.test.tsx` (신규 describe 블록 — 모바일 드로어 안에서의 회귀 확인)

## Steps
- [x] **Step 1**: `EditorSidebar.tsx`에 `TreeNode` 타입과 `collectVisibleTreeNodes`(지금 화면에 보이는 트리 노드를 렌더 순서 그대로 평평하게 편 목록)를 추가한다.
- [x] **Step 2**: `focusTreeNode`/`handleTreeKeyDown`(ArrowDown/Up/Left/Right/Home/End)을 추가한다 — 각 노드의 DOM id(`sidebar-folder-toggle-{id}`/`sidebar-document-link-{pageId}`)로 포커스를 옮긴다.
- [x] **Step 3**: `renderFolderNode`의 `<li>`에 `role="treeitem"`/`aria-expanded`/`aria-level`/`aria-selected`를, 토글 버튼에 `id`와 `onKeyDown`을 추가한다. 자식 `<ul>`에 `role="group"`, 트리 루트 `<ul>`에 `role="tree"`를 추가한다.
- [x] **Step 4**: `renderDocumentRow`에 `treeItem` 매개변수를 추가해, 트리 안에서 호출될 때만(`childDocuments.map(...)`) `role="treeitem"`/`aria-level`/`aria-selected`와 `onKeyDown`을 붙인다. "미분류" 목록 호출부는 그대로 둔다(플래그 기본값 false).
- [x] **Step 5**: `EditorSidebar.test.tsx`에 ARIA 구조·방향키 탐색(ArrowDown/Up/Left/Right/Home/End) 테스트를 추가한다.
- [x] **Step 6**: `EditorShell.test.tsx`에 모바일 오프캔버스 드로어 안에서 폴더 트리의 포커스 트랩·방향키 탐색이 정상 동작하는 회귀 테스트를 추가한다.
- [x] **Step 7**: `npm test`, `npm run lint`(jsx-a11y의 `role-has-required-aria-props` 등 확인), `npm run build`로 최종 확인한다.

각 Step은 `npm test -- EditorSidebar.test.tsx EditorShell.test.tsx`로 검증 가능한 단위로 쪼갠다.
