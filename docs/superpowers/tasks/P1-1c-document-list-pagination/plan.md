# P1-1c: 문서 목록 페이지네이션 — 구현 계획

## Global Constraints
- `listDocuments()` 자체(서버 조회 범위)는 바꾸지 않는다 — `tag-suggestions.ts`가 전체 목록을 필요로 한다(`task.md` 참고).
- 필터·정렬이 바뀌면 표시 개수를 처음(30개)으로 되돌린다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`

## Steps
- [ ] **Step 1**: `EditorSidebar.test.tsx`에 실패하는 테스트를 먼저 추가한다(TDD) — 31개 이상의 문서가 있으면 처음엔 30개만 보이고 "더 보기" 버튼이 있는지, 눌렀을 때 나머지가 보이는지, 30개 이하면 버튼이 없는지, 검색어를 바꾸면 다시 30개로 리셋되는지.
- [ ] **Step 2**: `npx vitest run src/components/editor/EditorSidebar.test.tsx`로 실패 확인.
- [ ] **Step 3**: `EditorSidebar.tsx`에 `PAGE_SIZE = 30`과 `visibleCount` state를 추가하고, 필터링·정렬된 `visibleDocuments`를 `.slice(0, visibleCount)`로 자른 뒤 그 아래에 "더 보기" 버튼(남은 개수가 0보다 클 때만)을 추가한다. 검색어·태그·정렬이 바뀌면 `visibleCount`를 `PAGE_SIZE`로 리셋하는 `useEffect`를 둔다.
- [ ] **Step 4**: `npx vitest run src/components/editor/EditorSidebar.test.tsx`로 통과 확인.
- [ ] **Step 5**: `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 확인.
