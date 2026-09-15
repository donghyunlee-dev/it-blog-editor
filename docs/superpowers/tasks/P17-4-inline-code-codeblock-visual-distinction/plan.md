# P17-4: 인라인 코드 vs 코드 블록 시각적 구분 — 구현 계획

## Global Constraints
- 순수 CSS(`globals.css`)만 수정한다 — 새 컴포넌트/attrs/노드뷰를 추가하지 않는다.
- 커스텀 색상은 하드코딩하지 않고 기존 CSS 변수 토큰만 참조한다(CLAUDE.md 디자인
  시스템 규칙).
- 전체 `npm test`는 돌리지 않는다 — 이 변경(코드 렌더링)과 직접 연관된
  `RichTextEditor.test.tsx`의 기존 코드 관련 테스트만 재실행해 회귀를 확인한다.

## Files
- Modify: `src/app/globals.css`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: 임시 디버그 페이지(`/dev-preview-table-toolbar` 경로 재사용, 커밋
      안 함)로 인라인 코드 마크 + 코드 블록이 함께 있는 문서를 렌더링해 Browser
      pane에서 라이트/다크 테마 둘 다 실제로 확인한다.
- [x] **Step 2**: `.prose code:not(pre code)`에 배경(`--color-surface-subtle`)·테두리
      (`--color-border`)·둥근 모서리·패딩을 추가해 배경 칩으로 만든다.
- [x] **Step 3**: `@tailwindcss/typography` 기본값이 넣는 백틱 의사요소
      (`code::before`/`code::after`)를 끈다 — 배경 칩 자체가 이미 "코드"라는 신호를
      주므로 백틱과 칩을 함께 쓰면 중복이다(코드 블록 쪽은 플러그인이 이미 꺼둔
      상태라 이 규칙은 사실상 인라인에만 영향).
- [x] **Step 4**: 같은 디버그 페이지로 라이트/다크 테마 모두 재확인(스크린샷).
- [x] **Step 5**: 디버그 페이지를 삭제한다(임시 검증용, 커밋 대상 아님).
- [x] **Step 6**: `npx vitest run RichTextEditor.test.tsx`(코드 관련 기존 테스트 회귀
      확인 — CSS만 바뀌어 새 단위 테스트는 추가하지 않음, 시각 검증은 스크린샷으로
      대체), `npm run build`(Tailwind/PostCSS 컴파일 확인).
