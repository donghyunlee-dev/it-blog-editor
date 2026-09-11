# P8-5 긴급 수정: 목차 무한 루프 — 구현 계획

## Global Constraints
- ProseMirror가 관리하는 DOM(컨테이너 안의 실제 h2/h3)에는 어떤 형태로도 쓰기(속성 추가,
  텍스트 변경 등)를 하지 않는다 — 이번 버그의 근본 원인이자 앞으로도 지켜야 할 불변식이다.
- "문서를 열기만 해도 목차가 보인다"(직전 PR #103의 수정)는 그대로 유지한다 — 초기 스캔 +
  `MutationObserver` 구조 자체는 옳았다, 그 안에서 DOM에 쓰던 부분만 문제였다.

## Files
- Modify: `src/components/editor/TableOfContents.tsx` — `HeadingItem`이 `id: string` 대신
  `key: string`(React key 전용, DOM에 반영 안 됨) + `element: HTMLHeadingElement`(참조)를
  갖도록 변경. `scan()`에서 `element.id = ...` 제거. `IntersectionObserver`/클릭 스크롤/
  활성 추적을 전부 id 조회(`document.getElementById`) 대신 엘리먼트 참조 비교로 바꾼다.
- Modify: `src/components/editor/TableOfContents.test.tsx` — 기존 id 기반 테스트 2개를
  엘리먼트 참조 기반으로 갱신. "헤딩에 어떤 속성도 안 남긴다" 단위 테스트 추가. 실제
  `RichTextEditor`(TipTap)를 마운트해 ProseMirror 자신의 DOM 관찰자와 공존해도 무한
  루프·속성 오염이 없음을 확인하는 통합 테스트 추가.
- Create: `docs/superpowers/tasks/P8-5-toc-freeze-hotfix/{task,plan,result,test}.md`.
- Modify: `docs/product/prd.md` — P8-5 항목에 이 긴급 수정을 후속 기록으로 추가.

## Steps
- [x] **Step 1**: `node_modules/prosemirror-view/src/domobserver.ts`를 읽어 `attributes`
  타입 변화 처리(`registerMutation`)가 실제로 그 노드 범위를 재조정 대상으로 반환함을
  확인한다 — 추측이 아니라 소스로 원인을 확정한다.
- [x] **Step 2**: `TableOfContents.tsx`를 엘리먼트 참조 기반으로 재작성한다(DOM 쓰기 제거).
- [x] **Step 3**: 기존 테스트를 새 API에 맞게 갱신하고, "속성을 쓰지 않는다" 단위 테스트를
  추가한다. `npx vitest run TableOfContents.test.tsx`로 검증.
- [x] **Step 4**: 실제 `RichTextEditor` + `TableOfContents`를 함께 마운트하는 통합 테스트를
  추가해, ProseMirror의 실제 `DOMObserver`와 우리 `MutationObserver`가 같은 DOM을 감시하는
  실제 조건에서도 무한 루프·속성 오염이 없음을 확인한다.
- [x] **Step 5**: `npx vitest run DocumentEditor.test.tsx`로 통합 지점 회귀 확인,
  `npx eslint TableOfContents.tsx TableOfContents.test.tsx`, `npm run build`로 최종 검증.
- [x] **Step 6**: PRD 갱신, `result.md`/`test.md` 작성.
