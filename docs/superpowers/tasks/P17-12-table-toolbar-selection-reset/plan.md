# P17-12: 표 툴바 버튼이 커서 선택을 되돌려버리는 문제 — 구현 계획

## Global Constraints
- 리치 텍스트 에디터 툴바의 표준 패턴(mousedown에서 기본 동작 방지)을 따른다 —
  새로운 메커니즘을 발명하지 않는다.
- `.selectedCell` 스타일은 `prosemirror-tables`가 공식 제공하는 클래스에 맞춰
  CSS만 추가한다(JS 로직 변경 없음).

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `TableToolbarButton`의 `<Button>`에
      `onMouseDown={(e) => e.preventDefault()}`를 추가해, 버튼 클릭이 에디터의
      기존 선택(커서/셀 범위)을 건드리지 않게 한다.
- [x] **Step 2**: `globals.css`에 `.ProseMirror td.selectedCell`/
      `.ProseMirror th.selectedCell` 규칙을 추가해 `--color-brand-subtle` 배경으로
      다중 셀 선택을 시각적으로 표시한다.
- [x] **Step 3**: 테스트 — 셀 안에 커서가 있는 상태에서 툴바 버튼을 클릭해도
      (jsdom에서 재현 가능한 범위 내에서) 의도한 대상에 명령이 적용되는지 확인하는
      회귀 테스트를 추가한다. mousedown 이벤트에 대해 `preventDefault`가 호출되는지
      직접 검증한다(jsdom은 실제 브라우저의 "버튼 클릭 시 선택 되돌림" 동작 자체를
      재현하지 않으므로, 핸들러가 존재하고 `preventDefault`를 호출한다는 것만 단위
      테스트로 고정한다).
- [x] **Step 4**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`.
