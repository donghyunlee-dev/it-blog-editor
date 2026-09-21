# P17-14: "새 문서" 버튼 강조도 낮추기 — 구현 계획

## Global Constraints
- `@sfood/ui`가 이미 제공하는 팔레트(`Button secondary` 변형)를 그대로 재사용한다 —
  새 CSS 변수나 하드코딩 색상을 추가하지 않는다(CLAUDE.md "UI 컴포넌트" 우선순위 규칙).
- `Button` 컴포넌트는 `<button>`만 지원해(`ButtonProps extends
  ButtonHTMLAttributes<HTMLButtonElement>`) `/editor/new`로 이동하는 `<Link>`를 그
  컴포넌트로 바꿀 수는 없다 — secondary 변형의 클래스 문자열만 옮겨 적용한다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: 하단 "새 문서" `<Link>`의 className을 `bg-brand ... text-on-brand
      hover:bg-brand-hover`에서 `border border-border bg-surface ... text-foreground
      hover:bg-surface-raised`로 교체한다(`node_modules/@sfood/ui/dist/index.js`의
      `secondary` 분기 확인).
- [x] **Step 2**: `npx vitest run src/components/editor/EditorSidebar.test.tsx` —
      href/위치를 검증하는 기존 테스트가 스타일 변경과 무관하게 통과하는지 확인(클래스명을
      단언하는 테스트는 없음을 확인했으므로 신규 테스트는 추가하지 않는다).
- [x] **Step 3**: 임시 디버그 페이지(`/dev-preview-new-doc-button`, 검증 후 삭제)로
      Browser pane에서 실제 렌더링된 배경/테두리 색을 `getComputedStyle`로 측정해 확인.
- [x] **Step 4**: `npx eslint src/components/editor/EditorSidebar.tsx`, `npm run build`.
