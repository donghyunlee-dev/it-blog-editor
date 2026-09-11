# P11-1: 사이드바 문서 목록 행에서 태그 표시 제거 — 결과

## 커밋
- `00aa24e` fix: 사이드바 문서 목록 행에서 태그 표시 제거 (P11-1)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx` — 문서 행 렌더러에서 `document.tags.length > 0 && (...)` 태그 칩 나열 블록을 제거했다. 모든 목록(미분류/폴더/공유받은 문서)이 같은 행 렌더러를 공유해, 이 한 곳만 고쳐도 전체에 적용된다. 더 이상 쓰이지 않는 `Tag`(`@sfood/ui`) import도 함께 제거했다(상단 태그 필터는 `ChipGroup`을 쓰므로 영향 없음).
- `src/components/editor/EditorSidebar.test.tsx` — "문서에 붙은 태그를 함께 보여준다" 테스트를 "문서 목록 행에는 태그를 표시하지 않는다"로 갱신했다.

## 자체 검토
- **긍정**: 태그 필터링·검색 로직은 전혀 건드리지 않고 순수 렌더링 블록만 제거해, 회귀 위험이 매우 낮은 변경이었다. 모든 문서 목록이 같은 행 렌더러를 공유한다는 것을 코드로 확인해, 미분류/폴더/공유받은 문서 목록 전부에 일관되게 적용됨을 보장했다.
- **주의사항**: 없음.
- **우려사항**: 태그를 목록에서 아예 안 보이게 하면, 태그로 문서를 구분하며 스캔하던 사용자 습관이 있었다면 아쉬울 수 있다 — 다만 사용자가 대화 중 이 트레이드오프를 이미 고려하고 "제거"로 직접 결정했다.

## 산출물
- `docs/superpowers/tasks/P11-1-sidebar-remove-inline-tags/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`
