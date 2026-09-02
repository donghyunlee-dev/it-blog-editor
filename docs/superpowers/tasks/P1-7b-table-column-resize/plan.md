# P1-7b: 표 컬럼 리사이즈 활성화 — 구현 계획

## Global Constraints
- P1-7a의 `StickyTableView`/`TableToolbar`가 그대로 살아남아야 한다 — 리사이즈 켜짐/꺼짐 두 렌더링 경로 모두에서 동일하게 동작하도록 "커서가 이 표 안에 있는가" 판단 로직을 `getPos` 의존에서 제거한다.
- `Table.extend({...})`로 `addNodeView`/`addProseMirrorPlugins`를 오버라이드할 때, `@tiptap/extension-table`의 원본 구현(둘 다 `node_modules`에서 실측 확인됨)과 동일한 분기 조건(`resizable && editor.isEditable`)을 그대로 복제한다 — 다르게 판단하면 리사이즈 온/오프 경계에서 미묘한 불일치가 생긴다.

## Task: `StickyTableView`를 `getPos` 독립적으로 리팩터링 + 리사이즈 활성화
### Files
- `src/components/editor/RichTextEditor.tsx` (수정)
- `src/components/editor/RichTextEditor.test.tsx` (기존 테스트가 새 설정에서도 통과하는지 확인, 필요 시 조정)
- `src/app/globals.css` (수정 — 리사이즈 손잡이/커서 CSS 추가)

### Steps
- [ ] `@tiptap/pm/tables`에서 `columnResizing`/`tableEditing` import, `@tiptap/core`에서 `findParentNodeClosestToPos` import.
- [ ] `StickyTableView` 클래스를 `createStickyTableView(editor: Editor)` 팩토리 함수로 바꾼다 — 생성자에서 `editor`를 인자로 받는 대신 팩토리의 클로저로 캡처해, `columnResizing`이 요구하는 3-인자 생성자 시그니처(`node, cellMinWidth, view`)와도 호환되게 한다.
- [ ] `syncActive()`를 `getPos()` + `nodeSize` 범위 비교 대신 `findParentNodeClosestToPos(editor.state.selection.$from, n => n.type.name === "table")`로 찾은 표 노드와 `this.node`의 **객체 참조가 같은지**로 판단하도록 바꾼다(ProseMirror 노드는 불변 객체라 참조 비교가 안전하다 — 내용이 같은 표 두 개도 서로 다른 객체라 정확히 구분된다).
- [ ] `TableWithToolbar = Table.extend({...})`에서 `addNodeView()`와 `addProseMirrorPlugins()`를 함께 오버라이드한다 — 원본의 `resizable && editor.isEditable` 분기를 그대로 복제하되, `View`(= `columnResizing`에 넘길 클래스, 그리고 `addNodeView()`가 직접 생성할 때 쓸 클래스)를 `createStickyTableView(this.editor)`로 만든 값으로 교체한다.
- [ ] `Table.configure({ resizable: false })` → `TableWithToolbar.configure({ resizable: true })`로 바꾼다(이미 P1-7a에서 `Table`을 `TableWithToolbar`로 바꿔뒀으므로 `resizable` 값만 변경).
- [ ] `globals.css`에 `.tableWrapper { overflow-x: auto; }`, `.resize-cursor { cursor: col-resize; }`, `.column-resize-handle { position: absolute; ...; background-color: var(--color-brand); }` 추가(TipTap 공식 예시 CSS를 이 프로젝트 토큰에 맞게 이식).
- [ ] 기존 `RichTextEditor.test.tsx`의 P1-7a 테스트 스위트(9건)를 그대로 재실행해 회귀가 없는지 확인 — `resizable: true`로 렌더링 경로가 바뀌었으니 반드시 재확인해야 한다.
- [ ] 전체 테스트·`tsc`·`lint`·`build` 재확인.
