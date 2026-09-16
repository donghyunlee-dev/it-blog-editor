# P17-5c: 코드 블록 복사 버튼 — 구현 계획

## Global Constraints
- 새 노드뷰를 만들지 않는다 — 기존 `CodeBlockView`(P17-5b/P17-11)의 `.code-block-toolbar`
  안에 버튼만 추가한다.
- `@sfood/ui`의 `Button`을 쓴다(직접 `<button>` 마크업 금지 — CLAUDE.md 디자인 시스템
  우선순위 규칙).
- 새 아이콘 라이브러리를 추가하지 않는다 — 기존 `TableIcon` 선례(P1-7a/P17-3)와 같은
  스타일(viewBox 0 0 24 24, stroke currentColor, strokeWidth 2, h-4 w-4)로 직접 그린다.
- `useToast()`는 `CodeBlockView` 안에서 직접 호출한다 — `DocumentLinkView`가 이미
  NodeView 안에서 `useRouter()`를 직접 호출하는 선례가 있어(포털 렌더링이어도 같은
  React 트리라 컨텍스트/훅이 정상 동작), toast 콜백을 prop으로 내려받을 필요가 없다.

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `CodeBlockView` 바로 위에 복사 아이콘(`CodeCopyIcon`) SVG 컴포넌트를
      추가한다.
- [x] **Step 2**: `CodeBlockView`에 `useToast()`를 추가하고, 클립보드 복사 핸들러
      (`navigator.clipboard.writeText(node.textContent)` → 성공 시 success 토스트,
      실패(reject/예외) 시 danger 토스트)를 구현한다.
- [x] **Step 3**: `.code-block-toolbar` 안에 언어 선택 드롭다운과 나란히 복사 버튼
      (`Button variant="ghost" size="sm"`, `aria-label="코드 복사"`)을 추가한다. 드롭다운
      쪽 절대 위치 화살표(▾)가 버튼과 겹치지 않도록 드롭다운+화살표를 자체 `relative`
      래퍼로 감싸고, 툴바 전체는 `flex` 레이아웃으로 바꾼다.
- [x] **Step 4**: 테스트 — 복사 버튼이 보이는지, 클릭 시 `navigator.clipboard.writeText`가
      해당 코드 블록의 텍스트로 호출되는지, 성공/실패 시 각각 토스트 문구가 뜨는지,
      코드 블록이 2개일 때 각 버튼이 자신의 코드만 복사하는지 확인한다(jsdom엔
      `navigator.clipboard`가 없어 테스트에서 직접 모킹).
- [x] **Step 5**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`.
