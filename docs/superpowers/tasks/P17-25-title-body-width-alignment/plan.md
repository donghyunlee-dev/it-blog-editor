# P17-25: 제목·본문 입력 영역 왼쪽 위치·폭 불일치 수정 — 구현 계획

## Global Constraints
- 포커스 시 배경이 넓어지는 기존 상쇄 패턴(음수 마진 + 같은 크기 패딩)은 유지한다 —
  구조를 갈아엎지 않고 값/폭 계산만 고친다.
- 본문(`.ProseMirror`) 쪽은 손대지 않는다 — 제목을 본문 기준에 맞춘다.

## Files
- Modify: `src/components/editor/DocumentEditor.tsx`(`TitleTextarea`)

## Steps
- [x] **Step 1**: 임시 라우트(`/dev-preview-editor-canvas`, AX Auth 밖)로
      `DocumentEditor`를 마운트해 제목·본문 텍스트 영역의 `getBoundingClientRect()`/
      `getComputedStyle()`을 실측 비교 — 원인이 `w-full`(고정 폭)과 `.ProseMirror`의
      `width: auto`(음수 마진에 따라 자동으로 넓어짐) 차이임을 확인.
- [x] **Step 2**: `TitleTextarea`의 `w-full`을 `w-[calc(100%+1rem)]`(마진으로 줄어드는
      0.5rem×2=1rem을 폭에 미리 더함)로 교체 — `.ProseMirror`와 같은 방식으로 좌우
      대칭 확장되게 한다.
- [x] **Step 3**: 같은 임시 라우트에서 수정 후 다시 실측해 제목·본문 텍스트 영역의
      좌표(왼쪽 44.5px, 오른쪽 964.5px)가 정확히 일치하는지 확인.
- [x] **Step 4**: 임시 라우트 삭제.
- [x] **Step 5**: `npx vitest run src/components/editor/DocumentEditor.test.tsx`,
      `npx eslint src/components/editor/DocumentEditor.tsx`, `npm run build`.
