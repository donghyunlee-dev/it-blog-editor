# P8-4 되돌리기: 랜딩 화면 검색 버튼 제거 — 구현 계획

## Global Constraints
- 헤더 검색 버튼(P8-1)의 `triggerSearch`/`openSignal`/`GlobalSearchModal` 배선은 절대
  건드리지 않는다 — 랜딩 버튼만을 위해 추가했던 부분만 걷어낸다.
- 사용하지 않게 되는 코드(`GlobalSearchContext.tsx` 등)는 재사용 가능성을 이유로 남기지
  않고 완전히 삭제한다(CLAUDE.md/시스템 지침 — 확실히 안 쓰는 코드는 삭제).

## Files
- Modify: `src/app/editor/page.tsx` — `LandingSearchButton` import·렌더링 제거.
- Modify: `src/components/editor/EditorShell.tsx` — `GlobalSearchProvider`로 `children`을
  감싸던 부분을 원래대로(`<div>{children}</div>`) 되돌리고 관련 import 제거.
- Delete: `src/components/editor/LandingSearchButton.tsx`,
  `src/components/editor/LandingSearchButton.test.tsx`,
  `src/components/editor/GlobalSearchContext.tsx`, `src/app/editor/page.test.tsx`(P8-4
  버튼만 검증하던 파일이라 함께 삭제).
- Modify: `src/components/editor/EditorShell.test.tsx` — `useGlobalSearch` import,
  `ChildSearchTrigger` 헬퍼, 그 헬퍼를 쓰는 테스트 2개 제거.
- Modify: `docs/product/design.md` "8. 검색" 절 — 되돌린 사실과 근거를 추가.
- Modify: `docs/product/prd.md` — P8-4 항목을 "완료했다가 제거"로 갱신.
- Create: `docs/superpowers/tasks/P8-4-revert-landing-search-button/{task,plan,result,test}.md`.

## Steps
- [x] **Step 1**: `page.tsx`에서 `LandingSearchButton` 제거.
- [x] **Step 2**: `EditorShell.tsx`에서 `GlobalSearchProvider` 래핑·import 제거.
- [x] **Step 3**: 이제 안 쓰이는 파일 4개(`LandingSearchButton.tsx`/`.test.tsx`,
  `GlobalSearchContext.tsx`, `page.test.tsx`) 삭제.
- [x] **Step 4**: `EditorShell.test.tsx`에서 제거된 기능을 검증하던 테스트·헬퍼·import 정리.
- [x] **Step 5**: `npx tsc --noEmit`, 변경/영향 파일 대상
  `npx vitest run EditorShell.test.tsx GlobalSearchModal.test.tsx EditorSidebar.test.tsx`,
  `npx eslint <변경 파일>`로 검증. 코드 변경이 있으므로 `npm run build`도 실행.
- [x] **Step 6**: design.md·PRD 갱신, `result.md`/`test.md` 작성.
