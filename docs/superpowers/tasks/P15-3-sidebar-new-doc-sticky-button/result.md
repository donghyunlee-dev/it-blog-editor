# P15-3: 사이드바 "새 문서" 버튼 sticky 고정 — 결과

## 커밋
- `943699e` fix: 사이드바 "새 문서" 버튼을 스크롤 컨테이너 하단에 고정 (P15-3)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx` — "새 문서" `<Link>`에 `sticky bottom-0
  shadow-lg`를 추가했다. `<nav>`가 스크롤 컨테이너라 이 버튼이 그 안에서 항상 하단에
  붙어 있는다. 배경(`bg-brand`)이 이미 불투명해 별도 배경색 처리는 필요 없었다.
- `src/components/editor/EditorSidebar.test.tsx` — 이 버튼의 className에 `sticky`/
  `bottom-0`이 있는지 확인하는 테스트를 추가했다.
- `docs/product/prd.md` — Phase 15에 P15-3 체크리스트 항목을 추가했다.
- `CLAUDE.md` — (같은 세션의 앞선 요청으로) 테스트 루틴에서 "공용 모듈이면 전체
  `npm test`로 확장" 예외를 제거 — 이번 작업부터 그 갱신된 규칙을 실제로 적용했다.

## 자체 검토
- **긍정**: CSS 클래스 두 개만 추가하는 최소 변경이라 회귀 위험이 사실상 없다 — href·
  클릭 핸들러·guardNavigate 로직은 전혀 건드리지 않았다.
- **주의사항**: 없음.
- **우려사항**: `sticky`가 실제 브라우저에서 의도대로 보이는지(다른 요소의 `overflow`
  설정과 충돌해 sticky가 무시되는 경우가 있다 — P14-3에서 겪은 클리핑 문제와는 다른
  종류의 함정)는 jsdom 테스트로는 확인할 수 없다 — 실제 화면 캡처 필요.

## 산출물
- `docs/superpowers/tasks/P15-3-sidebar-new-doc-sticky-button/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`, `EditorSidebar.test.tsx`
- `docs/product/prd.md`
