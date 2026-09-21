# P17-20: 새 문서 버튼 hover가 라이트 모드에서 안 보이던 문제 수정 — 구현 계획

## Global Constraints
- 새 색상/새 CSS 규칙을 만들지 않는다 — 이 파일의 다른 행이 이미 쓰는
  `.sidebar-row-hover`(globals.css, color-mix 기반)를 그대로 재사용한다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: "새 문서" `<Link>`의 className에서 `hover:bg-surface-raised`를
      제거하고 `sidebar-row-hover`를 추가한다. `bg-surface`(기본 배경)·`border
      border-border`(테두리)는 그대로 둔다.
- [x] **Step 2**: 회귀 테스트 추가 — "새 문서" 링크가 `sidebar-row-hover` 클래스를
      갖는지 확인.
- [x] **Step 3**: `node_modules/@sfood/ui/tokens/semantic.css`로 라이트/다크 모드의
      `--color-surface`/`--color-surface-raised` 값을 재확인해 원인을 코드로 증명한다.
- [x] **Step 4**: 실제 컴파일된 CSS(`.sidebar-row-hover:hover`)가 `color-mix`를
      사용해 라이트/다크 어느 쪽이든 `bg-surface`와 항상 다른 색을 내는지 브라우저의
      CSSOM으로 직접 확인한다.
- [x] **Step 5**: `npx vitest run src/components/editor/EditorSidebar.test.tsx`,
      `npx eslint src/components/editor/EditorSidebar.tsx
      src/components/editor/EditorSidebar.test.tsx`, `npm run build`.
