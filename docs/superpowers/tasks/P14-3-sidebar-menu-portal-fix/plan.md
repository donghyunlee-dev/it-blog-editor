# P14-3: 문서 옵션 메뉴 클리핑 수정 — 구현 계획

## Global Constraints
- 접근성 역할(`role="menu"`/`role="menuitem"`, `aria-haspopup`, `aria-expanded`)은
  `@sfood/ui`의 `DropdownMenu`가 제공하던 것과 동일하게 유지한다 — 기존 테스트가 이 역할로
  요소를 찾는다.
- React `createPortal`은 쓰지 않는다 — 팝업을 `<nav>` 형제 위치(이 컴포넌트가 이미 반환하는
  JSX 트리 안)에 조건부로 렌더링하는 것만으로 충분하다(트리 재배치 없이 DOM 위치만 옮기면
  됨).

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/product/design.md`, `docs/product/prd.md`

## Steps
- [ ] **Step 1**: `openDocumentMenu` state(`{ document, anchorRect, triggerEl }`)와
      `documentMenuPopupRef`를 추가한다.
- [ ] **Step 2**: `renderDocumentRow`에서 `<DropdownMenu>` 사용을 제거하고, 트리거 `<button>`만
      남긴다 — 클릭 시 `event.currentTarget.getBoundingClientRect()`로 좌표를 잡아
      `openDocumentMenu`를 토글한다.
- [ ] **Step 3**: 메뉴 항목 조립 로직을 `buildDocumentMenuItems(document)` 함수로 뽑아
      `renderDocumentRow` 밖으로 옮긴다(팝업 렌더 쪽에서만 필요하므로).
- [ ] **Step 4**: 바깥 클릭(mousedown)·Escape·스크롤/리사이즈 시 닫는 `useEffect`를 추가한다
      (`@sfood/ui` DropdownMenu 구현을 참고하되, 트리거·팝업 두 DOM 노드를 모두 확인한다).
- [ ] **Step 5**: `<nav>` 바로 다음(형제 위치)에 실제 팝업을 조건부 렌더링한다 —
      `position: fixed`, `top`/`left`를 `anchorRect`에서 계산.
- [ ] **Step 6**: `globals.css`의 `.sidebar-row-menu-right` 규칙을 제거한다(더 이상 필요
      없음 — 이유를 주석으로 남긴다).
- [ ] **Step 7**: `npx vitest run EditorSidebar.test.tsx`, `npx eslint
      src/components/editor/EditorSidebar.tsx`, `npm run build`(타입 체크 포함),
      회귀 위험이 있어 `npm test` 전체도 돌린다.
