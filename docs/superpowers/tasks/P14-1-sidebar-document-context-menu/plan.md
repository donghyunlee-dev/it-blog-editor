# P14-1: 사이드바 문서 행 컨텍스트 메뉴 전환 — 구현 계획

## Global Constraints
- `@sfood/ui`의 `DropdownMenu`를 그대로 쓴다 — 직접 구현하지 않는다(CLAUDE.md "① `@sfood/ui`
  컴포넌트 최우선" 원칙, `FileExplorer.itemActions`가 이미 같은 패턴을 씀).
- `DropdownMenu`의 `trigger`는 클릭 가능한 단일 엘리먼트여야 하고, 내부적으로
  `onClick`/`aria-haspopup`/`aria-expanded`/`ref`를 주입한다(컴파일된 `index.js` 확인) —
  트리거에 별도 `onClick`을 달지 않는다(주입된 토글 핸들러와 충돌하지 않도록).
- 에디터 헤더·폴더 행은 건드리지 않는다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `docs/product/design.md` (컴포넌트 매핑 표에 `DropdownMenu` 추가)
- Modify: `docs/product/prd.md` (Phase 14 신규)

## Steps
- [ ] **Step 1**: `MoveToFolderIcon` 근처에 `MoreIcon`(세로 점 3개, 기존 아이콘과 같은
      `viewBox 0 0 20 20`/`currentColor` 스타일)을 추가한다.
- [ ] **Step 2**: `EditorSidebar.tsx` import에 `DropdownMenu`를 추가한다.
- [ ] **Step 3**: `renderDocumentRow`의 "이동 가능한 폴더가 있음" 분기에서, 기존
      `<button aria-label="다른 폴더로 이동">` 단일 버튼을 `<DropdownMenu trigger={<button
      aria-label="문서 옵션">...<MoreIcon/></button>} items={[{ label: "다른 폴더로 이동",
      icon: <MoveToFolderIcon/>, onClick: () => setMoveDocumentTarget(document) }]} />`로
      교체한다. 트리거 버튼의 클래스(호버/포커스 시에만 노출, `mt-1.5` 정렬)는 기존 값을
      그대로 옮긴다.
- [ ] **Step 4**: `EditorSidebar.test.tsx`에서 "다른 폴더로 이동" 버튼을 직접 클릭하던 테스트를
      "옵션(⋯) 버튼 클릭 → 메뉴에서 '다른 폴더로 이동' 클릭"의 2단계 흐름으로 갱신한다.
- [ ] **Step 5**: `docs/product/design.md`의 "실제 쓴 `@sfood/ui` 컴포넌트" 표에 `DropdownMenu`
      항목을 추가한다. `docs/product/prd.md`에 Phase 14 계획·체크리스트를 추가한다.
- [ ] **Step 6**: `npx vitest run EditorSidebar.test.tsx`, `npx eslint
      src/components/editor/EditorSidebar.tsx`, `npm run build`로 확인한다.
