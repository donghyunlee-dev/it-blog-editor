# P12-1: 사이드바 태그 필터(ChipGroup) 제거 — 구현 계획

## Global Constraints
- 태그 데이터 흐름(등록 API, `TagInput`, `getTags`/`setTags`, 검색 매칭 로직)은 전혀 건드리지
  않는다 — 사이드바의 "필터 칩" 렌더링과 그 칩에만 쓰이던 상태만 제거한다.
- 검색창의 제목+태그 매칭(`filteredDocuments`의 두 번째 `.filter`)은 그대로 유지한다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `docs/product/prd.md` (기능별 정의·화면 정의 갱신)
- Modify: `docs/product/design.md` (사이드바 관련 서술에 필터 칩 언급이 있으면 갱신)

## Steps
- [ ] **Step 1**: `EditorSidebar.tsx`에서 `ChipGroup` 렌더 블록(태그 필터, `allTags.length > 0 && (...)`)을
      제거한다.
- [ ] **Step 2**: `activeTag` state와 그 주석, `allTags` useMemo, `filteredDocuments`의
      `!activeTag || document.tags.includes(activeTag)` 필터 조건, `filterKey`의 `activeTag` 항을
      모두 제거한다.
- [ ] **Step 3**: 더 이상 쓰이지 않는 `ChipGroup` import(`@sfood/ui`)를 제거한다.
- [ ] **Step 4**: `EditorSidebar.test.tsx`에서 태그 필터 칩에 의존하는 테스트("태그를 클릭하면 그
      태그가 붙은 문서만 보여준다", "같은 태그를 다시 클릭하면 필터가 해제된다", "태그 필터와
      검색어가 함께(AND) 적용된다")를 제거한다. "문서 목록 행에는 태그를 표시하지 않는다" 테스트는
      `role="tab"` 존재 확인 부분을 "더 이상 존재하지 않음"으로 뒤집어 갱신한다.
- [ ] **Step 5**: `docs/product/prd.md`의 "내 문서함 조회" 화면 정의(사이드바 구성 요소 나열)와
      "문서 태그 지정" 기능 설명에서 "태그 필터"를 제거하고, 검색(사이드바 인라인 검색 + Ctrl+K)이
      태그 매칭을 담당한다는 서술로 갱신한다. 관련 Phase 체크리스트에 P12-1 항목을 추가한다.
- [ ] **Step 6**: `npx vitest run EditorSidebar.test.tsx`, `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx`, `npm run build`로 확인한다.

각 Step은 `npx vitest run EditorSidebar.test.tsx`로 검증 가능한 단위로 쪼갠다.
