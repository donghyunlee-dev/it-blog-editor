# P13-2: 사이드바 행 왼쪽 여백 + 호버 하이라이트 복구 — 구현 계획

## Global Constraints
- `.sidebar-row-active`(2026-08-26)가 이미 확립한 패턴(라이트/다크 모드 토큰이 우연히 같아지는
  문제를 `color-mix()`로 직접 해결)을 그대로 따른다 — 같은 문제이므로 같은 해법을 쓴다.
- 활성(선택) 행에는 호버 클래스를 아예 추가하지 않는 기존 삼항 구조를 그대로 유지한다(활성
  상태가 호버보다 우선).

## Files
- Modify: `src/app/globals.css`
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `docs/product/design.md`

## Steps
- [ ] **Step 1**: `globals.css`의 `.sidebar-row-active` 바로 아래에 `.sidebar-row-hover:hover`를
      추가한다(`color-mix(in srgb, var(--color-brand) 5%, var(--color-surface))` — 선택
      상태의 10%보다 옅은 5%).
- [ ] **Step 2**: `EditorSidebar.tsx`의 문서 행 `Link`(비활성 분기)에서 `hover:bg-surface-raised`를
      `sidebar-row-hover`로 바꾸고, 클래스에 `pl-2`를 추가한다(`pr-2`와 대칭).
- [ ] **Step 3**: 폴더 행 wrapper `<div>`에서 `hover:bg-surface-raised`를 `sidebar-row-hover`로
      바꾸고, `pr-1`과 대칭되도록 `pl-1`을 추가한다.
- [ ] **Step 4**: 공유받은 문서 행 `Link`(비활성 분기)에서도 `hover:bg-surface-raised`를
      `sidebar-row-hover`로 바꾼다(이미 `pl-2 pr-2`가 있어 패딩은 손댈 필요 없음).
- [ ] **Step 5**: `docs/product/design.md`에 이번 발견(라이트 모드에서 `surface-raised`가
      `surface`와 같은 값이라 사이드바 행 호버가 무효였던 문제, `.sidebar-row-hover` 신설)을
      기록한다.
- [ ] **Step 6**: `npx vitest run EditorSidebar.test.tsx`, `npx eslint
      src/components/editor/EditorSidebar.tsx`, `npm run build`로 확인한다.
