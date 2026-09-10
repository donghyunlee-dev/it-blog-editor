# P8-4: 소개/랜딩 화면 메인 검색 진입점 추가 — 구현 계획

## Global Constraints
- `GlobalSearchModal`의 기존 계약(자체 `open` 상태 관리, Ctrl+K·Escape 내부 처리)을 깨지
  않는다 — P8-1에서 추가한 `openSignal` prop과 `EditorShell.tsx`의 `triggerSearch()`를
  그대로 재사용한다(새 상태·새 모달 인스턴스를 만들지 않는다).
- 랜딩 화면(`src/app/editor/page.tsx`)은 서버 컴포넌트다 — `EditorShell.tsx`가 이미
  `triggerSearch`를 로컬 state로만 갖고 있어 prop으로 내려줄 수 없으므로(children은 이미
  렌더링된 JSX), Context로 감싸는 방식이 필요하다(`UnsavedChangesContext.tsx`와 같은
  기존 패턴 재사용).
- 기존 `GlobalSearchModal.test.tsx`/`EditorSidebar.test.tsx`/`EditorShell.test.tsx`(P8-1
  포함, 89개)는 모두 그대로 통과해야 한다.

## Files
- Create: `src/components/editor/GlobalSearchContext.tsx` — `triggerSearch`를 내려주는
  Context(기본값 no-op)와 `useGlobalSearch()` 훅.
- Create: `src/components/editor/LandingSearchButton.tsx` — 히어로 검색 버튼(클라이언트
  컴포넌트, `useGlobalSearch()` 사용).
- Modify: `src/components/editor/EditorShell.tsx` — `children`을
  `<GlobalSearchProvider value={{ triggerSearch }}>`로 감싼다.
- Modify: `src/app/editor/page.tsx` — 히어로 영역에 `<LandingSearchButton />` 추가.
- Create: `src/components/editor/LandingSearchButton.test.tsx`,
  `src/app/editor/page.test.tsx`.
- Modify: `src/components/editor/EditorShell.test.tsx` — children이 Context로 같은
  트리거를 쓸 수 있는지, 헤더 버튼과 충돌하지 않는지 검증하는 케이스 추가.
- Modify: `docs/product/prd.md` — P8-4 체크리스트 완료 표시.
- Create: `docs/superpowers/tasks/P8-4-landing-search-entry/{task,plan,result,test}.md`.

## Steps
- [x] **Step 1**: `GlobalSearchContext.tsx`를 `UnsavedChangesContext.tsx`와 같은 패턴(기본값
  no-op, Provider 없이도 안전)으로 작성한다.
- [x] **Step 2**: `EditorShell.tsx`의 `children` 렌더링을 `GlobalSearchProvider`로 감싼다.
  `npx vitest run EditorShell.test.tsx`로 기존 케이스(P8-1 포함) 회귀 없음 + 신규 2개
  (children이 트리거 가능/헤더 버튼과 충돌 없이 같은 모달 하나만 뜸) 검증.
- [x] **Step 3**: `LandingSearchButton.tsx`를 작성하고(아이콘+"문서 검색..."+`Ctrl K` 힌트),
  `page.tsx` 히어로에 추가한다. `npx vitest run LandingSearchButton.test.tsx
  src/app/editor/page.test.tsx`로 검증(Provider 없이도 안전 + 클릭/Enter로 트리거 호출 +
  실제 페이지에 렌더링됨).
- [x] **Step 4**: `npx tsc --noEmit`, 변경 파일 대상 `npx eslint` 확인.
- [x] **Step 5**: `npm test`/`npm run build` 전체 실행, `docs/product/prd.md` P8-4 항목을
  완료로 표시, `result.md`/`test.md` 작성.
