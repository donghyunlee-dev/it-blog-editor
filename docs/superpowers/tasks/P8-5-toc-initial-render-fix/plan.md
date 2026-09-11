# P8-5 버그 수정: 목차 초기 렌더 타이밍 — 구현 계획

## Global Constraints
- 기존 TOC 동작(활성 헤딩 추적, 클릭 스크롤, `≥1280px` 노출 조건, 헤딩 없으면 렌더링
  안 함)은 전혀 바꾸지 않는다 — 헤딩을 "언제 다시 스캔하는지"만 고친다.
- 수정 전에 버그를 재현하는 테스트를 먼저 작성해 실패를 확인한 뒤 고친다(회귀 방지
  근거를 명확히 남긴다).

## Files
- Modify: `src/components/editor/TableOfContents.tsx` — 헤딩 스캔을 `scan()` 함수로
  뽑아내고, 초기 스캔 + `MutationObserver`(컨테이너의 `childList`/`subtree`/
  `characterData` 변화를 감시)로 교체.
- Modify: `src/components/editor/TableOfContents.test.tsx` — `immediatelyRender:false`
  타이밍을 흉내 내는 `AsyncMountHarness`(마운트 후 `setTimeout(0)`으로 컨테이너 DOM을
  채움)와 회귀 테스트 추가.
- Create: `docs/superpowers/tasks/P8-5-toc-initial-render-fix/{task,plan,result,test}.md`.
- Modify: `docs/product/prd.md` — P8-5 항목에 이 버그 수정을 후속 기록으로 추가.

## Steps
- [x] **Step 1**: `AsyncMountHarness` + 회귀 테스트를 먼저 작성하고, 수정 전 코드로
  `npx vitest run TableOfContents.test.tsx -t "비동기로 채워져도"`를 돌려 **실패를
  확인**한다(버그가 실제로 재현됨을 증명).
- [x] **Step 2**: `TableOfContents.tsx`의 스캔 로직을 `scan()` 함수로 추출하고,
  `MutationObserver`로 컨테이너를 감시하도록 바꾼다.
- [x] **Step 3**: 같은 테스트를 다시 돌려 **통과를 확인**하고, 기존 8개 테스트도 전부
  회귀 없이 통과하는지 확인한다.
- [x] **Step 4**: `npx vitest run DocumentEditor.test.tsx`로 통합 지점 회귀 확인.
- [x] **Step 5**: `npx eslint TableOfContents.tsx TableOfContents.test.tsx` 확인.
- [x] **Step 6**: PRD 갱신, `result.md`/`test.md` 작성.
