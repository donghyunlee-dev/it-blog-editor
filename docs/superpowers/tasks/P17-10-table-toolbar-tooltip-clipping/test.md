# P17-10: 표 툴바 툴팁 클리핑 수정 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 55개 전부 통과(새로
  추가한 1개 포함: 표 툴바 버튼 3개의 툴팁이 `side="bottom"`으로 뜨는지 확인).
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상
  생성(디버그 페이지는 라우트 목록에 없음 — 커밋 전 삭제 확인).
- 사용자 요청대로 범위를 표 툴바와 직접 연관된 파일로 좁혀 전체 `npm test`/
  `npm run lint`는 실행하지 않았다(CLAUDE.md 테스트 루틴).

## 수동/시각 검증(이번엔 Browser pane으로 실제 재현·확인함)
AX Auth 로그인 제약으로 실제 `/editor/[pageId]` 화면은 이 세션에서 열 수 없지만, 이번엔
`EditorShell.tsx`의 실제 구조(상단 56px 고정 헤더 + `overflow-y-auto` 스크롤 컨테이너)를
그대로 재현한 임시 디버그 페이지(`/dev-preview-table-toolbar`, 검증 후 삭제)를 만들어
Chromium 기반 Browser pane에서 실제로 재현·확인했다.

1. **수정 전 재현**: 표를 스크롤해 툴바가 스크롤 컨테이너 맨 위(헤더 바로 아래)에
   붙은 상태에서 "행 삭제" 버튼에 마우스를 올리자, 툴팁이 둥근 모서리도 텍스트도 없이
   경계에 걸친 얇은 흰 띠로만 보였다(스크린샷으로 확인). JS로 측정: 툴팁
   `top=38`, 스크롤 컨테이너 `top=56` — 툴팁 위쪽 18px가 컨테이너 경계 밖에서
   잘려 하단 6px(38~56은 안 보이고 56~62만 보임)만 남았다.
2. **수정 후 재확인**: 같은 시나리오에서 "행 삭제"·"행 추가(위)" 버튼에 마우스를
   올리자, 툴팁이 버튼 바로 아래에 완전한 모양(흰 배경 + 둥근 모서리 + "행 삭제"/
   "행 추가(위)" 텍스트)으로 잘리지 않고 보였다(스크린샷으로 확인, 컨테이너 경계와
   무관하게 항상 정상 표시).

## 문제 → 조치 → 재검증
- **문제**: 사용자가 "표 툴바에 마우스 올렸을 때 top 라인의 크기가 이상해. 버튼에
  맞지 않고 크게 나와"라고 지적.
- **원인**: 표 툴바가 `sticky top-14`라 표를 스크롤하면 `EditorShell`의
  `overflow-y-auto` 스크롤 컨테이너 맨 위에 붙는데, 툴팁 기본값(`side="top"`)이
  버튼 위(=컨테이너 경계 밖)로 그려지려다 그 컨테이너의 강제된 `overflow-x: auto`
  (P14-3과 같은 CSS 스펙 동작)에 잘려 얇은 띠만 남았다.
- **조치**: `TableToolbarButton`의 `Tooltip`에 `side="bottom"`을 지정해, 항상 공간이
  보장되는 버튼 아래로 방향을 구조적으로 고정했다.
- **재검증**: 임시 디버그 페이지로 수정 전/후를 직접 스크린샷 비교해 잘림이 사라짐을
  확인했고, 자동화 테스트로 회귀를 고정했다.

## 새로운 결정 사항
없음.
