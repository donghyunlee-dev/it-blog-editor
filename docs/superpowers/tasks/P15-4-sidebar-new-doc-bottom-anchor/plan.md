# P15-4: "새 문서" 버튼 하단 고정(짧은 목록 포함) — 구현 계획

## Global Constraints
- href·클릭 동작은 그대로 둔다.
- 전체 `npm test`는 돌리지 않는다 — 위치 이동 + 새 문서 기능 범위로만 검증(CLAUDE.md
  테스트 루틴 반영).

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `<nav>`를 `flex flex-1 flex-col overflow-hidden`으로 바꾼다(더 이상
      직접 스크롤하지 않음).
- [x] **Step 2**: 기존 nav 콘텐츠(폴더 헤더·트리·미분류 목록·"더 보기")를 새
      `<div className="flex-1 overflow-y-auto p-2.5">`로 감싼다 — 이 div만 스크롤된다.
- [x] **Step 3**: "새 문서" `<Link>`를 그 div 형제(`<div className="shrink-0 p-2.5">`)로
      옮긴다 — 스크롤에 영향받지 않으므로 목록 길이와 무관하게 항상 패널 맨 아래에
      있다. `sticky`/`bottom-0`/`shadow-lg`는 더 이상 필요 없어 제거한다. 구분선
      (`border-t`)은 넣지 않는다(사용자 지적 — 패널에 라인이 너무 많음).
- [x] **Step 4**: 테스트를 "sticky 클래스 확인"에서 "새 문서 링크가 스크롤 영역
      (`.overflow-y-auto`) 바깥의 형제에 있다"는 구조 검증으로 바꾼다.
- [x] **Step 5**: `npx vitest run EditorSidebar.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`.
