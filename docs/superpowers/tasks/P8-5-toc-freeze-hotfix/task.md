# P8-5 긴급 수정: "## 중제목" 입력 시 사이트가 멈추는 문제

## 배경
직전 수정(`fix/toc-initial-render-race`, PR #103 — 문서를 열기만 해도 목차가 안 보이던
버그)을 배포한 뒤, 사용자가 실사용 중 훨씬 심각한 새 문제를 보고했다: **"새로고침해도
목차가 안 뜨고, `## 중제목`을 설정하면(마크다운 단축키로 H2를 만들면) 사이트가 멈춘다."**

**원인 조사**: 그 수정은 `TableOfContents.tsx`가 스캔한 각 헤딩 DOM에 `element.id = ...`를
직접 써서(스크롤 이동·활성 추적에 쓸 안정적인 식별자가 필요해서) `MutationObserver`로
그 컨테이너를 감시하고 있었다. 그런데 이 헤딩들은 **ProseMirror(TipTap)가 관리하는
DOM**이고, ProseMirror 자신도 같은 DOM을 감시하는 `DOMObserver`를 갖고 있다
(`node_modules/prosemirror-view/src/domobserver.ts`, `attributes: true`로 관찰). 코드를
직접 확인한 결과, `registerMutation()`이 `attributes` 타입 변화를 감지하면(우리가 붙인
`id`처럼 자기가 그리지 않은 속성) 그 노드 범위를 "DOM에서 다시 읽어야 할 변경"으로 보고
재조정(다시 그리기)한다. 그 재조정은 우리 관점에서 `childList` 변화라 우리
`MutationObserver`가 다시 감지해 `scan()`을 또 실행하고, 거기서 또 `id`를 쓰고,
ProseMirror가 또 재조정하고… **무한 루프가 되어 실제로 탭이 멈췄다.** "TOC가 안 뜬다"는
증상도 같은 루프 때문일 가능성이 높다(루프가 렌더링을 막아 목차 자체가 그려질 기회가
없었을 수 있다).

관련 PRD 항목: `docs/product/prd.md`의 **P8-5**(우측 목차 TOC).

## 수용 기준 (Acceptance Criteria)
- [x] `TableOfContents.tsx`가 ProseMirror가 관리하는 헤딩 DOM에 **어떤 속성도 쓰지
      않는다**(직접적인 원인 제거) — 헤딩을 id가 아니라 엘리먼트 참조로 추적한다.
- [x] 실제 TipTap 에디터(`RichTextEditor`)와 `TableOfContents`를 함께 마운트해, 헤딩이
      추가돼도 무한 루프 없이 목차가 갱신되고 헤딩에 아무 속성도 남지 않음을 통합
      테스트로 확인한다(수정 전 코드 구조로는 이 정확한 실패를 재현하기 어려웠던 지점이라,
      "속성을 쓰지 않는다"를 직접 단언하는 것으로 재발을 막는다).
- [x] 기존 P8-5 관련 테스트(활성 헤딩 추적, 클릭 스크롤, 순서·들여쓰기, 초기 렌더 타이밍)에
      회귀가 없다.
- [x] "문서를 열기만 해도 목차가 보인다"는 원래 수정(PR #103)의 효과는 그대로 유지된다.

## 결정이 필요한 사항
없음 — 원인이 ProseMirror 소스 코드로 명확히 확인된 버그라, 고치는 방법(DOM에 쓰지 않고
참조로 추적)도 그 원인을 그대로 제거하는 유일하고 명백한 해법이다.

## 범위 밖
- `RichTextEditor.tsx`나 TipTap 확장 설정 변경 — 문제는 전적으로 `TableOfContents.tsx`가
  남의 DOM에 쓰기를 한 데 있었다.
- 목차의 다른 동작(노출 조건, 활성 표시 색상 등) 변경.
