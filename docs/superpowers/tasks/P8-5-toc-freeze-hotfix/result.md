# P8-5 긴급 수정: 목차 무한 루프 — 결과

## 커밋
- `c0db2c9` fix: 목차가 헤딩 DOM에 id를 써서 생기던 무한 재조정 루프 제거 (P8-5 긴급)

## 변경 파일
- `src/components/editor/TableOfContents.tsx` — `HeadingItem`을 `{ id, level, text }`에서
  `{ key, level, text, element }`로 바꿨다. `key`는 React `key` prop 전용 문자열이라 DOM에
  전혀 반영되지 않는다(더 이상 `element.id = ...`를 쓰지 않는다). 클릭 스크롤은
  `document.getElementById(...)` 대신 저장해 둔 `heading.element.scrollIntoView(...)`를
  직접 호출한다. 활성 헤딩 추적(`IntersectionObserver`)도 id 문자열이 아니라 교차
  엔트리의 `target`(엘리먼트 자체)을 그대로 `activeElement` state에 저장해 비교한다.
  결과적으로 이 컴포넌트는 ProseMirror가 관리하는 DOM을 **읽기만 하고 전혀 쓰지 않는다**.
- `src/components/editor/TableOfContents.test.tsx`:
  - 기존 "IntersectionObserver 교차 시 활성 표시" 테스트 2개를
    `document.querySelectorAll("h2")`로 얻은 실제 엘리먼트를 직접 `fireIntersections`에
    넘기도록 갱신(더 이상 `href`에서 id를 추출하지 않는다).
  - 신규: "헤딩 엘리먼트에 어떤 속성도 쓰지 않는다" — 스캔 후 모든 헤딩의
    `attributes.length`가 0인지 확인하는 단위 테스트.
  - 신규: "실제 TipTap/ProseMirror 에디터와의 통합" describe 블록 — 합성 HTML이 아니라
    진짜 `RichTextEditor`를 마운트하고, 그 `.ProseMirror` 루트에 새 헤딩을 직접 삽입해
    (ProseMirror 자신의 `DOMObserver`가 동시에 그 삽입을 감지하는 실제 조건) 목차가
    갱신되면서도 그 헤딩에 아무 속성도 남지 않음을 확인한다. 이 테스트가 타임아웃 없이
    끝나는 것 자체가 무한 루프가 재발하지 않았다는 직접적인 증거다.

## 자체 검토
- **긍정**: 추측으로 고치지 않고 `node_modules/prosemirror-view/src/domobserver.ts`
  소스를 직접 읽어 원인을 확정한 뒤 고쳤다(`registerMutation`이 `attributes` 타입
  변화를 감지하면 그 노드 범위를 재조정 대상으로 돌려준다는 것을 코드로 확인). 실제
  TipTap 에디터를 마운트하는 통합 테스트로 "두 개의 실제 MutationObserver(우리 것 +
  ProseMirror 내장)가 같은 DOM을 감시해도 안전하다"는 것까지 검증해, 합성 HTML 테스트만
  으로는 잡을 수 없었던 이 정확한 실패 모드를 재발 방지선으로 남겼다.
- **주의사항**: `href="#"`로 바뀌어(예전엔 `href="#{id}"`) 목차 링크를 마우스 오른쪽
  클릭 → "새 탭에서 열기"처럼 브라우저 네이티브 앵커 이동에 의존하는 조작은 더 이상
  그 헤딩으로 이동하지 않는다(클릭 이벤트를 가로채는 일반 클릭만 정상 동작). 이는
  ProseMirror가 관리하는 DOM에 id를 쓰지 않기로 한 이번 수정의 직접적인 트레이드오프다.
  실제 URL 해시 딥링크가 필요해지면, id를 ProseMirror 스키마 attrs로(즉 TipTap 확장이
  직접 렌더링하는 값으로) 관리하는 별도 설계가 필요하다 — 이번 긴급 수정의 범위 밖이다.
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 "새로고침 후 목차가
  뜨는지"와 "## 중제목 입력 시 더 이상 멈추지 않는지"를 직접 재현·확인하지 못했다 —
  사용자가 제보한 실제 증상과 ProseMirror 소스 코드 확인, 그리고 실제 에디터를 마운트한
  통합 테스트로 원인·수정을 모두 뒷받침했다.

## 산출물
- `docs/superpowers/tasks/P8-5-toc-freeze-hotfix/{task,plan,result,test}.md`
