# P19-10: 이력 화면 헤더 최종 정리 — 구현 계획

## Global Constraints
없음 — 마크업/문구만 변경.

## Files
- Modify: `src/components/editor/VersionHistoryPage.tsx` — 헤더 마크업 재조정, 부제 제거.
- Modify: `src/components/editor/VersionHistoryPage.test.tsx` — heading assertion을
  "문서 이력"으로 되돌림.

## Steps
- [x] **Step 1**: 헤더 마크업 재조정(`h1`="문서 이력", 그 아래 강조 텍스트=문서 제목),
      부제 제거.
- [x] **Step 2**: 테스트 갱신, `npx vitest run VersionHistoryPage.test.tsx`.
- [x] **Step 3**: `npx eslint`, `npm run build`.
