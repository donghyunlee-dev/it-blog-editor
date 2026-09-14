# P12-1: 사이드바 태그 필터(ChipGroup) 제거 — 결과

## 커밋
- (커밋 후 기록 예정)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx` — `activeTag` 상태(및 관련 주석)·`allTags` useMemo·
  `ChipGroup` 렌더 블록·`filteredDocuments`의 태그 필터 조건·`filterKey`의 `activeTag` 항을 모두
  제거했다. 더 이상 쓰이지 않는 `ChipGroup` import(`@sfood/ui`)도 제거했다. 태그 필터를 언급하던
  주석 2곳(P7-8 빈 폴더 판단 관련)도 "검색으로"만 언급하도록 정리했다.
- `src/components/editor/EditorSidebar.test.tsx` — 태그 필터 칩에 의존하던 테스트 3개("태그를
  클릭하면 그 태그가 붙은 문서만 보여준다", "같은 태그를 다시 클릭하면 필터가 해제된다", "태그
  필터와 검색어가 함께(AND) 적용된다")를 제거했다. "문서 목록 행에는 태그를 표시하지 않는다"
  테스트는 `role="tab"`이 이제 존재하지 않음을 확인하도록 뒤집었다.
- `docs/product/prd.md` — "화면 정의" 표(앱 셸 설명, 내 문서함 화면)와 "문서 태그 지정" 기능
  설명에서 태그 필터를 제거하고, 태그가 검색 전용으로 좁혀진 배경(2026-09-14 결정)을 기록했다.
  Phase 12(태그 기능 재검토) 계획과 체크리스트에 P12-1을 추가했다.
- `docs/product/design.md` — "확인된 사항" 표와 컴포넌트 매핑에서 `ChipGroup`(태그 필터) 관련
  서술을 현재 상태(제거됨)에 맞게 갱신했다. 과거 `ChipGroup`을 필터에 쓴 이유를 남긴 기존 기록은
  그대로 두고, 그 위에 2026-09-14 갱신 내용을 덧붙였다.

## 자체 검토
- **긍정**: 태그 데이터·입력·검색 매칭 로직은 전혀 건드리지 않고, 사이드바의 필터 UI 렌더링과
  그에만 쓰이던 상태·계산만 제거해 회귀 위험이 낮다. Ctrl+K 검색이 이미 태그를 매칭하고 있다는
  점을 코드로 직접 확인(`documents.ts`의 `searchDocuments`, `GlobalSearchModal.tsx`의
  `titleOnly`가 클라이언트 사이드 재필터일 뿐임)한 뒤에 착수해, "Ctrl+K에 태그 매칭 추가"라는
  불필요한 작업을 걸러낼 수 있었다.
- **주의사항**: 없음.
- **우려사항**: 태그를 "폭넓게 클릭 한 번으로 좁혀보던" 습관이 있던 사용자라면 검색창에 직접
  타이핑해야 하는 약간의 번거로움이 생길 수 있다 — 다만 이번 방향 전환(검색 전용화)에서 이미
  감수하기로 한 트레이드오프다.

## 산출물
- `docs/superpowers/tasks/P12-1-sidebar-remove-tag-filter/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`
- `src/components/editor/EditorSidebar.test.tsx`
- `docs/product/prd.md`
- `docs/product/design.md`
