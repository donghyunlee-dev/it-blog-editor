# P15-4: "새 문서" 버튼 하단 고정(짧은 목록 포함) — 결과

## 커밋
- (커밋 전 — 아래 커밋 생성 후 SHA 기록)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx`
  - `<nav>`를 `flex flex-1 flex-col overflow-hidden`으로 바꿔 더 이상 직접 스크롤하지
    않게 했다.
  - 폴더 헤더·트리·미분류 목록·"더 보기" 버튼을 새 `<div className="flex-1
    overflow-y-auto p-2.5">`로 묶었다 — 스크롤은 이제 이 div 하나만 담당한다.
  - "새 문서" `<Link>`를 그 div의 형제(`<div className="shrink-0 p-2.5">`)로 옮겼다 —
    스크롤 콘텐츠에 속하지 않으므로 목록이 짧든 길든 항상 패널 맨 아래에 있다.
    `sticky`/`bottom-0`/`shadow-lg` 클래스는 더 이상 필요 없어 제거했다. `border-t`
    구분선은 사용자 지적("왼쪽 패널에 선이 너무 많다")으로 추가하지 않았다.
- `src/components/editor/EditorSidebar.test.tsx` — sticky 클래스를 확인하던 테스트를,
  "새 문서" 링크가 스크롤 영역(`.overflow-y-auto`) 바깥의 형제에 있는지 확인하는
  구조 검증으로 바꿨다.
- `docs/product/prd.md` — Phase 15에 P15-4 항목 추가.

## 자체 검토
- **긍정**: `position: sticky`가 "스크롤이 있어야만 작동한다"는 한계를 정확히 진단하고,
  스크롤 영역 자체를 분리하는 구조적 해법으로 바꿔 "목록 길이와 무관하게 항상 하단"이라는
  요구를 근본적으로 만족시킨다 — 이제 sticky 같은 조건부 CSS 트릭에 기대지 않는다.
- **주의사항**: `<nav>` 내부에 별도 스크롤 div가 하나 더 생겨 DOM 구조가 한 단계
  깊어졌다 — 문서 옵션/폴더 옵션 메뉴 팝업은 이미 `<nav>` 자체가 아니라 그 바깥(형제)에
  그려지므로(P14-3) 이번 변경과 무관하다.
- **우려사항**: 없음 — CSS 구조 변경만으로 기존 스크롤/검색/정렬/메뉴 동작에는 영향이
  없다(테스트로 확인).

## 산출물
- `docs/superpowers/tasks/P15-4-sidebar-new-doc-bottom-anchor/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`, `EditorSidebar.test.tsx`
- `docs/product/prd.md`
