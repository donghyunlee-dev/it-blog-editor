# P17-22: 사이드바를 다시 항상 왼쪽에 고정 — 구현 계획

## Global Constraints
- P17-18의 원래 목표("넓은 모니터에서 본문 좌우로 커지는 빈 공간 방지") 자체는
  유지한다 — 적용 범위만 "워크스페이스 전체(사이드바 포함)"에서 "본문+TOC 묶음"
  으로 좁힌다. 기능을 완전히 되돌리는 게 아니다.
- 이 최대폭보다 좁은 화면에서는 P17-18 이전과 완전히 같게 렌더링돼야 한다 —
  새로운 시각적 차이를 만들지 않는다.

## Files
- Modify: `src/components/editor/EditorShell.tsx`
- Modify: `src/components/editor/EditorShell.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `workspaceRef`와 그것을 감싸던 바깥 `<div className="h-screen
      w-full bg-background">`/`<div ref={workspaceRef} className="relative mx-auto
      ... max-w-[1800px] ...">` 2단 래퍼를 제거하고, 루트를 원래의
      `<div className="flex h-screen flex-col md:flex-row">` 하나로 되돌린다.
- [x] **Step 2**: `handleMouseMove`를 `event.clientX`를 그대로 쓰는 원래 계산으로
      되돌린다(오프셋 빼기 로직 제거).
- [x] **Step 3**: 접힌 사이드바를 펴는 버튼의 `absolute` → `fixed`로 되돌린다.
- [x] **Step 4**: 본문(`{children}`)과 TOC 레일을 하나의 `flex` 컨테이너로 묶고,
      그 컨테이너에 `max-w-[1300px]`를 씌운 뒤, 그 컨테이너를 감싸는 `flex-1
      justify-center` 래퍼로 사이드바 오른쪽 남은 공간 안에서 가운데 정렬한다.
- [x] **Step 5**: `EditorShell.test.tsx`의 "폭 조절 핸들 마우스 드래그(P17-18)"
      describe를 원래(오프셋 없는) 동작을 검증하는 테스트로 교체한다.
- [x] **Step 6**: 임시 디버그 페이지(`/dev-preview-sidebar-fix`, 검증 후 삭제)로
      2200px(최대폭 초과)와 1440px(최대폭 이하) 두 뷰포트에서 사이드바가 항상
      x=8(브랜딩 행 자체 패딩만)에서 시작하고, 본문+TOC 묶음만 대칭으로 가운데
      정렬(또는 최대폭 이하에서는 기존과 동일)되는지 실측 확인.
- [x] **Step 7**: `npx vitest run src/components/editor/EditorShell.test.tsx
      src/components/editor/DocumentEditor.test.tsx
      src/components/editor/TableOfContents.test.tsx
      src/components/editor/EditorSidebar.test.tsx`, `npx tsc --noEmit -p .`,
      `npx eslint src/components/editor/EditorShell.tsx
      src/components/editor/EditorShell.test.tsx`, `npm run build`.
