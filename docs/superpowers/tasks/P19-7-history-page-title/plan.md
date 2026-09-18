# P19-7: 이력 화면 제목 표시 — 구현 계획

## Global Constraints
- 추가 API 호출 없이 진행한다 — `page.tsx`가 P19-6을 위해 이미 조회해 둔 `currentTitle`을
  재사용한다.

## Files
- Modify: `src/components/editor/VersionHistoryPage.tsx` — 헤더에 `currentTitle` 표시.
- Modify: `src/components/editor/VersionHistoryPage.test.tsx` — 표시/빈 제목 대체 테스트.

## Steps
- [x] **Step 1**: 헤더에 `currentTitle`(없으면 "(제목 없음)") 표시 추가.
- [x] **Step 2**: 테스트 추가, `npx vitest run VersionHistoryPage.test.tsx`.
- [x] **Step 3**: `npx eslint`, `npm run build`.
