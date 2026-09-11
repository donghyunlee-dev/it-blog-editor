# P8-5 버그 수정: 목차 초기 렌더 타이밍 — 결과

## 커밋
- `ce6719c` fix: 문서를 열기만 해도(편집 안 해도) 목차가 나타나도록 수정 (P8-5)

## 변경 파일
- `src/components/editor/TableOfContents.tsx` — 헤딩 스캔 로직을 `scan()` 함수로 뽑아내고,
  `useEffect`가 `containerRef.current`에 마운트 시 한 번 `scan()`을 호출한 뒤,
  `MutationObserver(scan)`으로 그 컨테이너의 `childList`/`subtree`/`characterData` 변화를
  계속 감시하도록 바꿨다. 언마운트·재실행 시 `observer.disconnect()`로 정리한다. `doc`을
  여전히 effect 의존성에 남겨(이전 동작과의 호환), 편집으로 인한 `doc` 변경 시에도 즉시
  재구독·재스캔한다.
- `src/components/editor/TableOfContents.test.tsx` — `AsyncMountHarness`(마운트 후
  `setTimeout(0)`으로 컨테이너에 `<h2>`를 늦게 주입해 `immediatelyRender:false`의 비동기
  타이밍을 재현)와 그 위에서 도는 회귀 테스트 1개를 추가했다. **수정 전 코드로 이 테스트를
  먼저 돌려 실패를 확인**했고(`headings`가 끝까지 빈 배열로 남아 `nav`가 렌더링되지 않음),
  수정 후 통과를 재확인했다.

## 자체 검토
- **긍정**: 실제 사용자가 스크린샷으로 제보한 재현 가능한 버그를, 추측이 아니라 원인
  (TipTap `immediatelyRender:false`의 지연 마운트 + `doc`에만 의존하는 재스캔 조건)까지
  코드로 추적해 고쳤다. 수정 전 테스트 실패 → 수정 후 통과를 직접 확인해, "고쳤다고
  주장만 하고 실제로는 재현조차 안 해본" 상태가 아니라는 증거를 남겼다.
- **주의사항**: `MutationObserver`는 컨테이너 하위 트리 전체를 감시하므로, 본문이 아주
  자주(예: 매 키 입력마다) 바뀌는 동안 `scan()`이 그만큼 자주 호출된다 — 이 프로젝트의
  문서 길이·헤딩 개수 규모에서는 `querySelectorAll("h2, h3")` 비용이 무시할 만한 수준이라
  실질적 성능 문제로 보지 않았다(디바운스 등 추가 최적화는 하지 않음, 필요해지면 후속
  과제로 남긴다).
- **우려사항**: 이 작업 도중 같은 저장소를 다른 세션이 동시에 쓰고 있다는 것을 발견했다
  (Phase 9 콜아웃 아이콘 커스터마이징 작업, `docs/product/prd.md`를 포함한 다수 파일이
  이미 우커밋 상태였고, 이후 그 세션이 이 저장소의 메인 작업 디렉터리에서 직접 브랜치를
  전환하는 것까지 확인됐다). 그 세션의 미완성 작업을 내 커밋에 섞지 않기 위해 처음에는
  변경 파일만 골라 스테이징했지만, 두 번째 커밋 시도 때 그 세션의 `git commit`이 내가
  스테이징해 둔 `result.md`/`test.md`까지 함께 가져가 버리는 충돌이 실제로 발생했다
  (`feat/p9-1-callout-icon-model` 브랜치의 `166eb9c` 커밋에 이 두 파일이 섞여 들어감).
  다행히 내 원래 커밋(`ce6719c`)은 그 브랜치의 영향을 받지 않고 그대로 남아 있었다 —
  이를 확인한 뒤 메인 작업 디렉터리를 건드리지 않고 별도의 `git worktree`를 만들어 이
  파일들을 다시 작성했다(지금 이 문서가 그 결과물이다). PRD 체크리스트 갱신은 여전히
  하지 못했다 — 공유 중인 `docs/product/prd.md`가 다른 세션의 미완성 작업과 얽혀 있어
  안전하게 손댈 수 없었다. 그 파일이 정리되는 대로 이 수정 내용을 P8-5 항목에 후속으로
  추가해야 한다.

## 산출물
- `docs/superpowers/tasks/P8-5-toc-initial-render-fix/{task,plan,result,test}.md`
