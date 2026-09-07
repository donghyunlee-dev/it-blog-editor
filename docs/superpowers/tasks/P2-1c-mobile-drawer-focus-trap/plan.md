# P2-1c: 모바일 오프캔버스 드로어 포커스 트랩 — 구현 계획

## Global Constraints
- `GlobalSearchModal.tsx`의 검증된 포커스 트랩 패턴(`FOCUSABLE_SELECTOR`, 첫 포커스 이동, Tab 순환, 닫힐 때 포커스 복원)을 그대로 재현한다 — 새 접근 방식을 발명하지 않는다.
- 데스크톱(`!isMobile`)에서는 이 트랩이 전혀 활성화되지 않아야 한다 — effect가 `isMobile && open`일 때만 개입한다.
- 기존 배경 오버레이 클릭 닫기, `onNavigate` 콜백(문서 링크 클릭 시 닫힘)은 건드리지 않는다.

## Files
- Modify: `src/components/editor/EditorShell.tsx`
- Modify: `src/components/editor/EditorShell.test.tsx`

## Steps
- [ ] **Step 1**: `FOCUSABLE_SELECTOR` 상수와 사이드바 드로어 래퍼(`fixed inset-y-0 left-0 z-40 ...` div)에 붙일 `drawerRef`를 추가한다.
- [ ] **Step 2**: `isMobile && open`일 때만 동작하는 `useEffect`를 추가한다 — 열릴 때 첫 포커스 가능 요소로 포커스 이동, Tab/Shift+Tab 순환, Escape 시 `setOpen(false)`, 클린업에서 이전 포커스 복원(`GlobalSearchModal`과 동일한 구조).
- [ ] **Step 3**: `npx vitest run src/components/editor/EditorShell.test.tsx`로 기존 테스트 통과 확인 후, 모바일 열림 시 초기 포커스·Tab 순환·Escape 닫기·포커스 복원·데스크톱에서는 트랩이 개입하지 않음을 검증하는 테스트를 추가한다.
- [ ] **Step 4**: 전체 스위트·lint·tsc·build 재확인.
