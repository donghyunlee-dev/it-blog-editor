# P15-2: 폴더 "+" 클릭 시 메인 화면으로 튕기는 버그 수정 — 결과

## 커밋
- `57cf458` fix: 폴더 "+" 클릭 시 메인 화면으로 튕기는 버그 수정 (P15-2)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx`
  - `focusFolderId`(P7-7 폴더 도착 처리용) 계산을 `pathname === "/editor"`일 때만
    `searchParams.get("folder")`를 읽도록 좁혔다 — 다른 경로에서는 항상 `null`이라 그
    effect 전체(펼침·스크롤·강조·`router.replace`)가 아예 실행되지 않는다.
- `src/components/editor/EditorSidebar.test.tsx`
  - `next/navigation` 모킹에 `usePathname`을 추가(`mockPathname`, 기본값 `"/editor"` —
    기존 P7-7 테스트들의 동작을 그대로 유지).
  - `/editor/new?folder={id}`(폴더 "+"로 도착한 상황)에서는 `router.replace`가 호출되지
    않는다는 회귀 테스트를 추가했다.
- `docs/product/prd.md` — P15-1 체크리스트 항목 옆에 이 버그 수정을 P15-2로 추가하고,
  상단 진행률 요약도 갱신했다.

## 자체 검토
- **긍정**: 근본 원인(쿼리 이름 우연한 충돌)을 이름을 바꾸는 임시방편이 아니라, 애초에 그
  effect가 관여해야 할 화면(`/editor`)으로 명확히 좁히는 방식으로 고쳤다 — 앞으로 다른
  화면이 우연히 또 `folder`라는 쿼리 이름을 쓰게 되어도 이 effect가 다시 오작동할 일이
  없다.
- **주의사항**: 이 effect가 원래 "브레드크럼에서 도착했을 때"만 의도된 것이었는데
  pathname 체크가 없었던 것 자체가 P7-7 구현 당시부터 있던 잠재 결함이었다 — 이번에
  우연히 P15-1이 트리거하면서 드러났을 뿐이다. 비슷한 패턴(사이드바 전역에서 쿼리를
  읽는 effect)이 앞으로 추가될 때는 반드시 pathname 스코프를 함께 고려해야 한다.
- **우려사항**: 없음 — 수정 자체는 조건 하나를 좁히는 것뿐이라 다른 동작에 영향을 주지
  않는다(테스트로 확인).

## 산출물
- `docs/superpowers/tasks/P15-2-folder-new-doc-param-collision-fix/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`, `EditorSidebar.test.tsx`
- `docs/product/prd.md`
