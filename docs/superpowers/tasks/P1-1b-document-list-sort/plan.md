# P1-1b: 문서 목록 정렬 옵션 — 구현 계획

## Global Constraints
- `@sfood/ui`의 `Select`를 쓴다(네이티브 select 기반, `options: {value, label}[]`) — 직접 마크업하지 않는다(CLAUDE.md 규칙).
- 정렬은 필터(태그·검색어) 적용 후의 결과에 대해서만 수행한다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`

## Steps
- [ ] **Step 1**: `EditorSidebar.test.tsx`에 실패하는 테스트를 먼저 추가한다(TDD) — 기본값(최신순)일 때 `updatedAt` 내림차순으로 나오는지, "제목순"으로 바꾸면 제목 오름차순으로 바뀌는지, 문서가 없으면 정렬 드롭다운이 없는지.
- [ ] **Step 2**: `npx vitest run src/components/editor/EditorSidebar.test.tsx`로 실패 확인.
- [ ] **Step 3**: `EditorSidebar.tsx`에 `sortBy` state와 `Select` UI, 필터 이후 `.sort()` 단계를 추가한다.
- [ ] **Step 4**: `npx vitest run src/components/editor/EditorSidebar.test.tsx`로 통과 확인.
- [ ] **Step 5**: `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 확인.
