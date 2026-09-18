# P19-8: 이력 화면 제목 위계 수정 — 구현 계획

## Global Constraints
없음 — 기존 마크업 순서·클래스만 교체한다.

## Files
- Modify: `src/components/editor/VersionHistoryPage.tsx` — "문서 이력"을 작은 라벨(`<p>`)로,
  문서 제목을 큰 제목(`<h1>`)으로 교체.
- Modify: `src/components/editor/VersionHistoryPage.test.tsx` — 제목이 `heading` role로
  렌더링되는지 검증하도록 assertion 강화.

## Steps
- [x] **Step 1**: 마크업 순서 교체.
- [x] **Step 2**: 테스트 갱신, `npx vitest run VersionHistoryPage.test.tsx`.
- [x] **Step 3**: `npx eslint`, `npm run build`.
