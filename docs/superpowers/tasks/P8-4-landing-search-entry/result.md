# P8-4: 소개/랜딩 화면 메인 검색 진입점 추가 — 결과

## 커밋
- `2b7b6a4` feat: 소개 화면 히어로에 검색 진입점 추가 (P8-4)

## 변경 파일
- `src/components/editor/GlobalSearchContext.tsx`(신규) — `triggerSearch: () => void`를
  담는 Context(`UnsavedChangesContext.tsx`와 같은 "기본값 no-op" 패턴)와 `useGlobalSearch()`
  훅. `EditorShell.tsx`가 이미 갖고 있는 `triggerSearch`(P8-1)를 prop 드릴링 없이 서버
  컴포넌트인 라우트 페이지 아래까지 전달하기 위한 것이다.
- `src/components/editor/EditorShell.tsx` — `children` 렌더링을
  `<GlobalSearchProvider value={{ triggerSearch }}>`로 감쌌다. 기존 `openSignal`/헤더 버튼
  배선은 그대로다 — 새 Context는 "추가 경로"일 뿐 기존 경로를 대체하지 않는다.
- `src/components/editor/LandingSearchButton.tsx`(신규) — 히어로 검색 버튼. 아이콘(P8-1의
  `SearchTriggerIcon` 재사용) + "문서 검색..." + `Ctrl K` 힌트 pill. 클릭 시
  `useGlobalSearch().triggerSearch()`만 호출한다(새 검색 로직 없음).
- `src/app/editor/page.tsx` — 히어로 영역("새 문서 작성" 링크 아래)에
  `<LandingSearchButton />`을 추가했다. 페이지 자체는 여전히 서버 컴포넌트다(검색 버튼만
  분리된 클라이언트 컴포넌트).
- 테스트: `LandingSearchButton.test.tsx`(신규 3개 — Provider 없이도 안전/클릭 시
  triggerSearch 호출/Enter 키로도 호출), `src/app/editor/page.test.tsx`(신규 1개 — 히어로에
  "새 문서 작성"과 검색 버튼이 함께 렌더링됨), `EditorShell.test.tsx`(신규 2개 — children이
  Context로 같은 모달을 열 수 있음, 헤더 버튼과 children 트리거가 충돌 없이 같은 모달
  하나만 엶).

## 자체 검토
- **긍정**: P8-1이 만든 `triggerSearch`/`GlobalSearchModal` 계약을 전혀 바꾸지 않고, 서버
  컴포넌트 경계를 넘어 전달하는 얇은 Context 하나만 얹었다 — 새 상태·새 모달 인스턴스가
  생기지 않아 "여러 진입점이 결국 하나의 모달만 연다"는 것이 구조적으로 보장된다(테스트로도
  명시적으로 고정).
- **주의사항**: `LandingSearchButton`은 Provider 밖에서 렌더링해도(예: 이 컴포넌트를
  단독으로 쓰는 향후 테스트) 에러 없이 클릭이 아무 일도 하지 않는 것으로 그친다 —
  `UnsavedChangesContext`의 기존 관례를 그대로 따른 것이라 새로운 실패 모드는 아니다.
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 히어로 버튼의 시각적
  배치(420px 폭, "새 문서 작성"과의 간격)를 스크린샷으로 확인하지 못했다(P7-7/P8-1과 동일한
  한계) — 컴포넌트·페이지 테스트로만 검증했다.

## 산출물
- `docs/superpowers/tasks/P8-4-landing-search-entry/{task,plan,result,test}.md`
