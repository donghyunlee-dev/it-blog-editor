# P14-2: 사이드바 문서 옵션 메뉴에 "이력"·"삭제" 추가 — 구현 계획

## Global Constraints
- `VersionHistory` 컴포넌트는 그대로 재사용한다(`pageId`만 받는 자기완결형 컴포넌트라 옮기기
  쉽다).
- 삭제 API(`DELETE /api/editor/documents/{pageId}`)는 그대로 재사용하되, 호출 위치가
  DocumentEditor(항상 "지금 보고 있는 문서")에서 EditorSidebar(목록의 임의 행)로 바뀌므로
  "지금 보고 있는 문서를 지웠는지" 여부에 따라 네비게이션 분기가 필요하다.
- `DropdownMenu`는 props로 위치를 바꿀 수 없으므로 CSS 오버라이드로 해결한다 — 컴포넌트를
  포크하거나 새로 만들지 않는다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `src/components/editor/DocumentEditor.tsx`
- Modify: `src/components/editor/DocumentEditor.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/product/design.md`, `docs/product/prd.md`

## Steps
- [ ] **Step 1**: `EditorSidebar.tsx`에 `VersionHistory` import, `HistoryIcon`(DocumentEditor의
      것과 같은 모양) 추가.
- [ ] **Step 2**: `historyDocumentTarget`/`deleteDocumentTarget`/`deletingDocument` state와
      `handleDeleteDocument`(활성 문서 여부에 따라 push 분기)를 `moveDocumentTarget`과 같은
      자리에 추가한다.
- [ ] **Step 3**: `renderDocumentRow`에서 메뉴 아이템을 배열로 조립한다 — "이동"은
      `flatFolderOptions.length > 0`일 때만, "이력"·"삭제"는 항상 추가한다. 트리거를 감싸는
      `<div className="sidebar-row-menu-right">`를 추가한다.
- [ ] **Step 4**: `globals.css`에 `.sidebar-row-menu-right [role="menu"] { left: 0; right:
      auto; }`를 추가한다.
- [ ] **Step 5**: 이력·삭제 모달 2개(`Modal` + `VersionHistory`, `Modal` + 확인 footer)를
      `moveDocumentTarget` 모달 근처에 추가한다.
- [ ] **Step 6**: `DocumentEditor.tsx`에서 `TrashIcon`/`HistoryIcon` 함수, `deleteModalOpen`/
      `versionHistoryModalOpen` state, `handleDelete`, 헤더의 이력·삭제 버튼(+ 구분선), 두
      모달 렌더, `VersionHistory` import를 모두 제거한다. `status` 타입에서 `"deleting"`을
      뺀다.
- [ ] **Step 7**: `DocumentEditor.test.tsx`에서 이력/삭제 관련 테스트·mock을 제거한다.
      `EditorSidebar.test.tsx`에 새 describe 블록으로 옮겨 쓴다(메뉴 표시 조건, 이력 모달,
      삭제 확인/취소/실패, 활성 문서 삭제 시 네비게이션).
- [ ] **Step 8**: `docs/product/design.md`, `docs/product/prd.md` 갱신.
- [ ] **Step 9**: `npx vitest run EditorSidebar.test.tsx DocumentEditor.test.tsx`,
      `npx eslint <바뀐 파일들>`, `npm run build`, 그리고 변경 범위가 넓으므로(에디터 헤더+
      사이드바, 삭제/네비게이션 흐름) `npm test` 전체도 추가로 돌린다.
