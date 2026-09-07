# P2-1a: 슬래시 메뉴 ARIA 보강 — 구현 계획

## Global Constraints
- 기존 마우스 클릭·ArrowUp/ArrowDown/Enter 키보드 순환 동작을 그대로 유지한다(속성만 추가, 동작 변경 없음).
- `props.editor`가 실제 TipTap `Editor` 인스턴스가 아닌 테스트용 목(`{} as Editor` 등)으로 들어올 수 있으므로, `editor.view`가 없을 때도 던지지 않아야 한다.

## Files
- Modify: `src/components/editor/SlashCommandExtension.ts`
- Modify: `src/components/editor/SlashCommandExtension.test.ts`(신규 ARIA 검증 테스트 추가)

## Steps
- [ ] **Step 1**: `menuEl`에 `role="listbox"`, `aria-label="슬래시 명령어 목록"`을 정적으로 부여한다.
- [ ] **Step 2**: `renderItems()`에서 각 버튼에 `role="option"`, `id="slash-menu-option-${index}"`, `aria-selected` (index === selectedIndex 문자열) 부여. 빈 상태 div에는 `role="status"`, `aria-live="polite"` 부여.
- [ ] **Step 3**: 현재 선택된 option의 `id`를 `editor.view.dom`(존재할 때만)의 `aria-activedescendant`로 동기화하는 헬퍼를 추가하고, `onStart`/`onUpdate`/키보드 이동 후 호출한다. `onExit`에서 `removeAttribute`.
- [ ] **Step 4**: `npx vitest run src/components/editor/SlashCommandExtension.test.ts`로 기존 테스트 통과 확인 후, role/aria-selected/aria-activedescendant를 검증하는 신규 테스트 3~4건 추가.
- [ ] **Step 5**: 전체 스위트·lint·tsc·build 재확인.
