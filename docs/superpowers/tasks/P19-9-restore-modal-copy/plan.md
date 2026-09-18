# P19-9: 복원 Modal 문구 개선 — 구현 계획

## Global Constraints
없음 — 마크업/문구만 변경, 로직 변경 없음.

## Files
- Modify: `src/components/editor/VersionHistoryPage.tsx` — Modal 본문을 문단 3개로 분리,
  확인 버튼 라벨 변경.
- Modify: `src/components/editor/VersionHistoryPage.test.tsx` — 버튼 이름 assertion 갱신.

## Steps
- [x] **Step 1**: Modal 본문 분리, 버튼 라벨 변경.
- [x] **Step 2**: 테스트 갱신, `npx vitest run VersionHistoryPage.test.tsx`.
- [x] **Step 3**: `npx eslint`, `npm run build`.
