# P17-5b: 코드 블록 언어 선택 UI — 구현 계획

## Global Constraints
- `language` attrs는 `@tiptap/extension-code-block`이 이미 스키마에 갖고 있는 필드를
  그대로 쓴다 — 새 attrs를 추가하지 않는다.
- 새 아이콘 라이브러리를 추가하지 않는다 — 순정 `<select>` + 기존 CSS 변수 토큰만
  쓴다.
- 전체 `npm test`는 돌리지 않는다 — 코드 블록과 직접 연관된 `RichTextEditor.test.tsx`만
  실행한다.

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `CodeBlockView` NodeView 컴포넌트를 추가한다 — `lowlight.listLanguages()`
      로 언어 목록을 만들고, 코드 블록 오른쪽 위에 겹쳐 뜨는 `<select>`(값: `node.attrs
      .language`, "자동 감지" = 빈 값)를 렌더링한다. 선택이 바뀌면
      `updateAttributes({ language: value || null })`.
- [x] **Step 2**: `CodeBlockLowlight.extend({ addNodeView() { return
      ReactNodeViewRenderer(CodeBlockView) } })`로 `CodeBlockWithLanguagePicker`를
      만들고, 기존 `CodeBlockLowlight.configure(...)` 자리를 이걸로 교체한다.
- [x] **Step 3**: `globals.css`에 `.code-block-wrapper`(position: relative)·
      `.code-block-toolbar`(절대 위치, 오른쪽 위)·`.code-block-language-select`
      스타일을 추가한다.
- [x] **Step 4**: 임시 디버그 페이지(커밋 안 함)로 Browser pane에서 실제 렌더링을
      확인한다 — 언어 선택 드롭다운이 코드와 겹치지 않고 잘 보이는지, 언어를 바꾸면
      강조가 그 언어 기준으로 바뀌는지.
- [x] **Step 5**: 기존 "코드블록 문법 강조(P1-7c)" 테스트가 NodeView 도입으로 동기
      검증이 깨져(추가 React 렌더 사이클 필요) `waitFor`로 바꾼다. 새 언어 선택 UI
      테스트 3개(드롭다운 노출+목록, 언어 선택 시 attrs 반영, "자동 감지" 복귀) 추가.
- [x] **Step 6**: `NodeViewContent as="code"`가 TypeScript 제네릭 추론 문제로 빌드
      타입 에러가 나 `<NodeViewContent<"code"> as="code" />`로 명시한다.
- [x] **Step 7**: 디버그 페이지를 삭제한다.
- [x] **Step 8**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`.
