# P17-13: 슬래시 메뉴 항목을 클릭해도 반응이 없는 문제 — 구현 계획

## Global Constraints
- 새 메커니즘을 발명하지 않는다 — P17-12(표 툴바 버튼)에서 이미 확립한 표준 패턴
  (버튼 `mousedown`에서 `event.preventDefault()`)을 그대로 따른다.
- `click` 핸들러의 기존 동작(`item.run(currentEditor, currentRange)`)은 그대로 둔다
  — `mousedown`은 막되 `click`은 정상 발생해야 하므로 `preventDefault`만 추가한다.

## Files
- Modify: `src/components/editor/SlashCommandExtension.ts`
- Modify: `src/components/editor/SlashCommandExtension.test.ts`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `createSlashMenuRenderer`의 `renderItems()`에서 각 버튼에
      `button.addEventListener("mousedown", (event) => event.preventDefault())`를
      추가한다.
- [x] **Step 2**: 회귀 테스트 추가 — 렌더링된 각 버튼에 `mousedown`(`cancelable: true`)을
      디스패치해 `event.defaultPrevented === true`인지 확인한다(P17-12의
      `RichTextEditor.test.tsx` 테스트와 동일한 패턴).
- [x] **Step 3**: `npx vitest run src/components/editor/SlashCommandExtension.test.ts`,
      `npx eslint src/components/editor/SlashCommandExtension.ts
      src/components/editor/SlashCommandExtension.test.ts`, `npm run build`.
