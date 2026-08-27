# P1-1a: 사이드바 검색을 태그까지 확장 — 구현 계획

## Global Constraints
- 본문 검색은 다루지 않는다(`task.md` 참고, 별도 GitHub Issue로 결정 대기).
- 새 네트워크 호출을 추가하지 않는다 — `DocumentSummary.tags`가 이미 클라이언트에 있다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`

## Steps
- [ ] **Step 1**: `EditorSidebar.test.tsx`에 실패하는 테스트를 먼저 추가한다(TDD) — 제목에는 없지만 태그에 검색어가 포함된 문서가 검색 결과에 남는지, 태그 필터와 검색어가 함께 적용되는지.
- [ ] **Step 2**: `npx vitest run src/components/editor/EditorSidebar.test.tsx`로 실패 확인.
- [ ] **Step 3**: `EditorSidebar.tsx`의 검색 필터를 제목 OR 태그 포함으로 바꾸고, `sr-only` 라벨을 "문서 제목·태그 검색"으로 갱신한다.
- [ ] **Step 4**: `npx vitest run src/components/editor/EditorSidebar.test.tsx`로 통과 확인.
- [ ] **Step 5**: `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 확인.
- [ ] **Step 6**: 본문 검색 방식 결정을 위한 GitHub Issue를 등록하고 `_pending-decisions.md`에 추가한다.
