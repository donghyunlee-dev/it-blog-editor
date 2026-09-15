# P17-4: 인라인 코드 vs 코드 블록 시각적 구분 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 55개 전부 통과
  (기존 "코드블록 문법 강조(P1-7c)"·버블 메뉴 "코드" 토글 테스트 포함, 회귀 없음).
  이번 변경은 순수 CSS(`globals.css`)라 새 vitest 단위 테스트는 추가하지 않았다 —
  이 프로젝트의 컴포넌트 테스트는 `globals.css`를 로드하지 않아(vitest 설정에
  import 없음) 배경색 같은 실제 렌더링 결과를 jsdom/happy-dom에서 검증할 수 없다.
  대신 아래처럼 실제 브라우저(Browser pane)로 시각 검증했다.
- `npm run build` — Turbopack 프로덕션 빌드 성공(Tailwind/PostCSS 컴파일 확인),
  20개 라우트 정상 생성.
- 사용자 요청대로 범위를 코드 렌더링과 직접 연관된 파일로 좁혀 전체 `npm test`는
  실행하지 않았다(CLAUDE.md 테스트 루틴). CSS 전용 변경이라 `npx eslint`는 대상
  파일이 없다(globals.css는 ESLint 대상 아님).

## 수동/시각 검증(Browser pane으로 실제 확인)
AX Auth 로그인 제약으로 실제 `/editor/[pageId]` 화면은 열 수 없어, 인라인 코드 마크 +
코드 블록이 함께 있는 문서를 렌더링하는 임시 디버그 페이지(`/dev-preview-table-toolbar`
경로 재사용, 검증 후 삭제)로 Chromium 기반 Browser pane에서 확인했다.

1. **다크 테마**: "inline code" 텍스트가 옅은 회색 배경 + 테두리가 있는 짧은 칩으로
   나타나고, 백틱(`) 없이 텍스트만 보였다. 그 아래 코드 블록은 전체 폭의 어두운
   배경 박스에 `const`(브랜드색)·`1`(경고색)·`console`/`log`(정보색) 등 문법 강조가
   적용돼 인라인 칩과 뚜렷이 다른 모양으로 보였다.
2. **라이트 테마**(`document.documentElement.setAttribute('data-theme','light')`로
   전환): 인라인 코드 칩이 옅은 회색 배경으로 정상 렌더링됐고, 코드 블록도 밝은
   배경으로 대비 문제 없이 보였다 — 하드코딩 색상이 아니라 CSS 변수 토큰을 썼기
   때문에 테마 전환에 자동으로 대응함을 확인했다.

## 문제 → 조치 → 재검증
없음 — 원인 진단(인라인 코드가 배경·백틱 신호 없이 본문과 같은 색)부터 CSS 수정까지
한 번에 반영됐고, 테스트/빌드 모두 첫 시도에 통과했으며 Browser pane 시각 확인도
두 테마 모두 첫 시도에 의도대로 보였다.

## 새로운 결정 사항
없음.
