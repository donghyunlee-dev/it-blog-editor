# P8-1: 헤더 레이아웃 정비 — 검색 트리거 버튼 추가 — 구현 계획

## Global Constraints
- `GlobalSearchModal`은 자기 `open` 상태를 스스로 관리하고(Ctrl+K·Escape는 내부 처리) 다른
  컴포넌트가 직접 그 상태를 소유하지 않는다(design.md/컴포넌트 주석에 이미 명시된 결정) —
  이 제약을 깨지 않고 "외부에서 열어달라는 요청"만 추가로 받을 수 있게 최소 확장한다.
- 기존 `GlobalSearchModal.test.tsx`(10개), `EditorSidebar.test.tsx`, `EditorShell.test.tsx`의
  기존 테스트는 모두 그대로 통과해야 한다(회귀 없음) — API를 깨는 방식(예: `open`/`onOpenChange`
  필수 prop)으로 바꾸지 않는다.
- 사이드바 폭은 220~440px로 가변이므로(EditorShell.tsx `MIN_WIDTH`/`MAX_WIDTH`) 새 버튼은
  고정 픽셀이 아니라 내용물 기준으로 자연스럽게 줄어들어야 한다.

## Files
- Modify: `src/components/editor/GlobalSearchModal.tsx` — `openSignal?: number` prop과 이를
  구독하는 effect 추가.
- Modify: `src/components/editor/EditorSidebar.tsx` — `SearchTriggerIcon` export, `onOpenSearch`
  prop, 헤더 행에 검색 버튼 렌더링.
- Modify: `src/components/editor/EditorShell.tsx` — `searchOpenSignal` state + `triggerSearch()`,
  모바일 상단 바에 검색 버튼 추가, `GlobalSearchModal`/`EditorSidebar`에 각각 연결.
- Modify: `src/components/editor/GlobalSearchModal.test.tsx`, `EditorSidebar.test.tsx`,
  `EditorShell.test.tsx` — 새 동작 테스트 추가.
- Modify: `docs/product/prd.md` — P8-1 체크리스트 완료 표시.
- Create: `docs/superpowers/tasks/P8-1-header-search-trigger/{task,plan,result,test}.md`.

## Steps
- [x] **Step 1**: `GlobalSearchModal`에 `openSignal?: number` prop을 추가하고, 값이
  `undefined`가 아니게 바뀔 때만 `setOpen(true)`를 호출하는 effect를 단다(마운트 시 기본값
  `undefined`라 즉시 열리지 않음). `npx vitest run GlobalSearchModal.test.tsx`로 기존 10개
  + 신규 2개(undefined→open 안 됨, 값 변경→열림) 검증.
- [x] **Step 2**: `EditorSidebar.tsx`에 `SearchTriggerIcon`(export)과 `onOpenSearch?: () => void`
  prop을 추가하고, 헤더 행(로고 Link와 접기 버튼 사이)에 검색 버튼을 렌더링한다.
  `npx vitest run EditorSidebar.test.tsx`로 신규 2개(prop 없으면 버튼 없음/있으면 클릭 시 호출)
  검증.
- [x] **Step 3**: `EditorShell.tsx`에 `searchOpenSignal` state + `triggerSearch()`를 추가해
  `GlobalSearchModal`과 `EditorSidebar`(`onOpenSearch`)에 연결하고, 모바일 상단 바에도 같은
  버튼을 추가한다. `npx vitest run EditorShell.test.tsx`로 신규 2개(모바일 상단 바/데스크톱
  사이드바 각각 클릭 시 모달 열림) 검증.
- [x] **Step 4**: `npx tsc --noEmit`, `npx eslint <변경 파일 3개>`로 타입·린트 확인(첫 시도에서
  `react-hooks/set-state-in-effect` 에러 발견 → 기존 `EditorShell.tsx` 패턴과 같은
  `eslint-disable-next-line` 주석으로 수정, 재검증 통과 — `test.md` 참고).
- [x] **Step 5**: `npm test`/`npm run lint`/`npm run build` 전체 실행, `docs/product/prd.md`
  P8-1 항목을 완료로 표시, `result.md`/`test.md` 작성.
