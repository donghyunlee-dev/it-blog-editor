# P15-3: 사이드바 "새 문서" 버튼 sticky 고정 — 구현 계획

## Global Constraints
- href·클릭 동작(미분류 문서 생성)은 그대로 둔다 — CSS 위치만 바꾼다.
- 테스트는 이 버튼(위치)과 새 문서 생성 기능에 직접 연관된 범위로만 좁힌다(전체 스위트
  실행 안 함 — CLAUDE.md 테스트 루틴 갱신 반영).

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: "새 문서" `<Link>`에 `sticky bottom-0`(+ `shadow-lg`로 스크롤되는 목록과
      시각적으로 분리)을 추가한다. 이미 불투명한 `bg-brand` 배경이라 별도 배경색 추가는
      필요 없다.
- [x] **Step 2**: 이 버튼이 `sticky`/`bottom-0` 클래스를 갖는지 확인하는 테스트를 추가한다.
- [x] **Step 3**: `npx vitest run EditorSidebar.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`. 전체 `npm test`는 돌리지 않는다(범위를 벗어난 공용 컴포넌트
      확장 검증은 이번엔 하지 않기로 함).
