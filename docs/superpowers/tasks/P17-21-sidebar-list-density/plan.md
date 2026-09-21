# P17-21: 문서함 리스트 행 밀도 조정 — 구현 계획

## Global Constraints
- 새 spacing 값을 발명하지 않는다 — Tailwind 기본 스케일(`py-1`, 4px)을 그대로 쓴다.
- 문서 행·폴더 행·공유받은 문서 행 세 곳이 항상 같은 높이를 유지해야 한다는 기존
  제약(P8-2/P13-1 주석)을 그대로 지킨다 — 한 곳만 바꾸지 않는다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `docs/product/design.md`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: 문서 목록 행(`renderDocumentRow`)의 `py-1.5` → `py-1`.
- [x] **Step 2**: 문서 행 "⋯" 버튼의 `mt-1.5` → `mt-1`(Link 상단 패딩과 정렬 유지).
- [x] **Step 3**: 폴더 토글 버튼(`renderFolderNode`)의 `py-1.5` → `py-1`.
- [x] **Step 4**: "공유받은 문서" 행의 `py-1.5` → `py-1`.
- [x] **Step 5**: `docs/product/design.md`의 사이드바 스펙과 "4. 좌측 사이드바" 비교
      표를 새 값(`py-1`, 4px)으로 갱신.
- [x] **Step 6**: 회귀 테스트 추가 — 문서 행이 `py-1` 클래스를 갖는지 확인.
- [x] **Step 7**: 임시 디버그 페이지(`/dev-preview-density`, 검증 후 삭제)로 15개
      문서를 렌더링해 실측 행 간격(`getBoundingClientRect`)이 줄어들었는지 확인.
- [x] **Step 8**: `npx vitest run src/components/editor/EditorSidebar.test.tsx`,
      `npx eslint src/components/editor/EditorSidebar.tsx
      src/components/editor/EditorSidebar.test.tsx`, `npm run build`.
