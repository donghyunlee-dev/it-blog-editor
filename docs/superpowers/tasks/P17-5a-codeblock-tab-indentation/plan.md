# P17-5a: 코드 블록 Tab 들여쓰기 — 구현 계획

## Global Constraints
- 라이브러리(`@tiptap/extension-code-block`)가 이미 구현한 Tab/Shift-Tab 핸들러를
  옵션으로 켜기만 한다 — 직접 키보드 핸들러를 새로 구현하지 않는다.
- 전체 `npm test`는 돌리지 않는다 — 코드 블록과 직접 연관된 `RichTextEditor.test.tsx`만
  실행한다.

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `CodeBlockLowlight.configure({ lowlight })`에 `enableTabIndentation:
      true`를 추가한다. `tabSize`는 기본값(4칸)을 그대로 둔다.
- [x] **Step 2**: 테스트 — 코드 블록 안에 커서를 두고(`placeCursorAfter` 헬퍼, 문법
      강조로 텍스트 노드가 쪼개져 있어 마지막 글자만으로 커서를 코드 끝에 둠) Tab
      keydown을 발생시켜 공백 4칸이 삽입되는지 확인한다. 일반 문단에서는 Tab이 아무
      영향을 주지 않는 회귀 테스트도 추가한다.
- [x] **Step 3**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`.
