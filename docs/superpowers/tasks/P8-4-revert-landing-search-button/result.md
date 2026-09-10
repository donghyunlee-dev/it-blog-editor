# P8-4 되돌리기: 랜딩 화면 검색 버튼 제거 — 결과

## 커밋
- `e162f65` fix: 랜딩 화면의 중복 검색 버튼 제거 (P8-4 되돌리기)

## 변경 파일
- `src/app/editor/page.tsx` — `LandingSearchButton` import·렌더링·관련 주석 제거. 히어로에는
  다시 "새 문서 작성" 링크만 남는다.
- `src/components/editor/EditorShell.tsx` — `children`을 `GlobalSearchProvider`로 감싸던
  부분을 `<div className="flex-1 overflow-y-auto">{children}</div>`로 되돌리고
  `GlobalSearchProvider` import를 제거했다. 헤더 검색 버튼(P8-1)이 쓰는
  `triggerSearch`/`searchOpenSignal`/`<GlobalSearchModal openSignal={...} />` 배선은
  전혀 손대지 않았다.
- `src/components/editor/LandingSearchButton.tsx`(삭제), `LandingSearchButton.test.tsx`
  (삭제), `GlobalSearchContext.tsx`(삭제) — 랜딩 버튼만을 위해 만들었던 코드라 더는 쓰이지
  않아 완전히 제거했다(죽은 코드 방치 없음).
- `src/app/editor/page.test.tsx`(삭제) — 이 파일이 검증하던 유일한 대상(랜딩 히어로 검색
  버튼)이 사라져 파일 자체를 삭제했다.
- `src/components/editor/EditorShell.test.tsx` — `useGlobalSearch` import, `ChildSearchTrigger`
  대역 컴포넌트, 그것을 쓰던 테스트 2개("children이 useGlobalSearch()로..." /"헤더 버튼과
  children의 검색 트리거가...")를 제거했다. 헤더 버튼 관련 기존 테스트는 그대로 남아있다.
- `docs/product/design.md` "8. 검색" 절 — 되돌린 사실과 근거(레퍼런스는 공개 헬프센터의
  신규 방문자 안내 맥락, 이 프로젝트는 사내 반복 사용 도구라 그 맥락이 약함)를 추가했다.
- `docs/product/prd.md` — P8-4 항목을 "완료했다가 제거"로 갱신.

## 자체 검토
- **긍정**: 사용자가 실제 화면을 보고 직접 제기한 지적이라, 추측이 아니라 검증된 UX
  피드백에 근거한 되돌림이다. 헤더 검색 버튼(P8-1)의 배선을 전혀 건드리지 않아 그 기능은
  회귀 위험이 없다(관련 테스트 재실행으로 확인).
  랜딩 버튼만을 위해 만들었던 파일들을 전부 삭제해 죽은 코드를 남기지 않았다.
- **주의사항**: `GlobalSearchContext.tsx`는 "서버 컴포넌트에서도 검색을 열 수 있게 하는
  범용 메커니즘"으로 설계됐던 것이라, 나중에 다른 화면에서 같은 필요가 생기면 이 커밋
  이전 버전(`docs/superpowers/tasks/P8-4-landing-search-entry/result.md` 참고)을 참고해
  다시 만들 수 있다.
- **우려사항**: 없음 — 순수 제거 작업이라 새로운 위험을 만들지 않았다.

## 산출물
- `docs/superpowers/tasks/P8-4-revert-landing-search-button/{task,plan,result,test}.md`
