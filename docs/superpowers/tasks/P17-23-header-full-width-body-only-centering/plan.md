# P17-23: 헤더는 항상 꽉 채우고 본문만 가운데 정렬 — 구현 계획

## Global Constraints
- `DocumentEditor.tsx`의 본문 자체 가운데 정렬(920/1200px)은 이미 올바르게
  동작하므로 손대지 않는다 — 이 작업은 EditorShell 레벨의 wrapper만 제거한다.
- P17-18/22의 시도(전체 워크스페이스 정렬 → 본문+TOC만 정렬)가 두 차례 모두
  실사용 중 예상치 못한 부작용을 냈으므로, 이번엔 가장 단순한(EditorShell을
  P17-18 이전 구조로 완전히 되돌리는) 방향으로 확실하게 정리한다 — 또 다른
  절충안을 새로 만들지 않는다.

## Files
- Modify: `src/components/editor/EditorShell.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: P17-22가 추가한 `<div className="flex flex-1 justify-center
      overflow-hidden"><div className="flex h-full w-full max-w-[1300px]">...
      </div></div>` 2단 wrapper를 제거하고, 본문 스크롤 div와 TOC 레일 div를
      다시 메인 flex row의 직접 자식(형제)으로 되돌린다.
- [x] **Step 2**: 관련 주석을 갱신해 P17-18→P17-22→P17-23으로 이어지는 판단
      과정과 최종 결론(헤더는 항상 꽉 채움, 정렬 기능은 EditorShell에 없음)을
      명확히 기록한다.
- [x] **Step 3**: 임시 디버그 페이지(`/dev-preview-header-check`, 검증 후 삭제)로
      1920px 뷰포트에서 헤더가 사이드바~TOC 사이를 정확히 채우고(빈틈 없음),
      TOC가 화면 진짜 오른쪽 끝에 있으며, 본문 텍스트만 그 칼럼 안에서 자체
      중앙 정렬되는지 실측 확인.
- [x] **Step 4**: `npx vitest run src/components/editor/EditorShell.test.tsx
      src/components/editor/DocumentEditor.test.tsx
      src/components/editor/TableOfContents.test.tsx
      src/components/editor/EditorSidebar.test.tsx`, `npx tsc --noEmit -p .`,
      `npx eslint src/components/editor/EditorShell.tsx`, `npm run build`.
      (기존 테스트 구조를 그대로 재사용하므로 새 테스트 추가는 필요 없다 — 되돌린
      구조는 P17-18 이전에 이미 검증되던 것과 동일하다.)
