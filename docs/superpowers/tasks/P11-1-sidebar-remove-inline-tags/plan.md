# P11-1: 사이드바 문서 목록 행에서 태그 표시 제거 — 구현 계획

## Global Constraints
- 태그 데이터·필터링 로직(`activeTag`, `ChipGroup`)은 그대로 둔다 — 목록 행의 렌더링 블록만 제거한다.
- 모든 문서 목록(미분류/폴더/공유받은 문서)이 같은 행 렌더러를 공유하므로, 그 한 곳만 고치면 전체에 적용된다(중복 코드 없음, 확인 필요).

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`

## Steps
- [ ] **Step 1**: `EditorSidebar.tsx`의 문서 행 렌더러에서 `document.tags.length > 0 && (...)` 블록(태그 `Tag` 칩 나열)을 제거한다.
- [ ] **Step 2**: 더 이상 쓰이지 않는 `Tag` import(`@sfood/ui`)를 제거한다(상단 필터는 `ChipGroup`을 쓰므로 영향 없음).
- [ ] **Step 3**: `EditorSidebar.test.tsx`의 "문서에 붙은 태그를 함께 보여준다" 테스트를 "문서 목록 행에는 태그를 표시하지 않는다"로 갱신 — 문서 목록 영역(`aria-label="문서 목록"`)에서 태그 텍스트가 없는지, 상단 필터 칩(`role="tab"`)에는 여전히 있는지 확인한다.
- [ ] **Step 4**: `npx vitest run EditorSidebar.test.tsx`, `npx eslint src/components/editor/EditorSidebar.tsx`, `npm run build`로 확인한다.

각 Step은 `npx vitest run EditorSidebar.test.tsx`로 검증 가능한 단위로 쪼갠다.
