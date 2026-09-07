# P2-1b: 사이드바 리사이즈 핸들 키보드 조작 — 구현 계획

## Global Constraints
- 기존 마우스 드래그 로직(`startResize`, `handleMouseMove`, `handleMouseUp`)은 건드리지 않는다 — 키보드 경로를 별도로 추가한다.
- 폭 계산은 항상 기존 `clampWidth()`를 통해서만 이뤄지게 해 드래그·키보드 두 경로가 같은 min/max 규칙을 공유한다.

## Files
- Modify: `src/components/editor/EditorShell.tsx`
- Modify: `src/components/editor/EditorShell.test.tsx`(있으면 확인 후 신규 테스트 추가, 없으면 신규 파일 생성)
- Modify: `src/app/globals.css`(포커스 링 규칙 추가)

## Steps
- [ ] **Step 1**: `EditorShell.tsx`에 `STEP = 16` 상수와 `handleHandleKeyDown(event)` 함수를 추가한다 — ArrowLeft(-STEP)/ArrowRight(+STEP)/Home(MIN_WIDTH)/End(MAX_WIDTH), 각각 `clampWidth`로 감싸 `setSidebarWidth` + `persistWidth` 호출, `event.preventDefault()`.
- [ ] **Step 2**: 핸들 `<div>`에 `tabIndex={0}`, `onKeyDown={handleHandleKeyDown}`, `aria-valuenow={sidebarWidth}`, `aria-valuemin={MIN_WIDTH}`, `aria-valuemax={MAX_WIDTH}`를 추가한다.
- [ ] **Step 3**: `globals.css`에 이 핸들 전용 클래스(`sidebar-resize-handle` 등)의 `:focus-visible` 포커스 링 규칙을 `.rounded-btn:focus-visible`과 같은 스타일(`outline: 2px solid var(--color-brand); outline-offset: 2px;`)로 추가하고, 핸들 div에 그 클래스를 부여한다.
- [ ] **Step 4**: `EditorShell.test.tsx`가 있으면 기존 관례를 확인하고, 방향키/Home/End로 폭이 바뀌는지, `localStorage`에 저장되는지, `aria-valuenow`가 갱신되는지 테스트를 추가한다. 없으면 최소한의 렌더링+상호작용 테스트 파일을 새로 만든다.
- [ ] **Step 5**: 전체 스위트·lint·tsc·build 재확인.
