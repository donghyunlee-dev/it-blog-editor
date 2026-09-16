# P17-11: 코드 블록 IDE 스타일 다크 테마 + 줄 번호 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 62개 전부 통과
  (새로 추가한 2개 포함: 줄 수만큼 거터 번호 순서대로 표시, 빈 코드 블록엔 "1"만
  표시). CSS(배경색 고정)는 이 프로젝트 컴포넌트 테스트가 `globals.css`를 로드하지
  않아 jsdom에서 검증할 수 없어 자동화 테스트 대상이 아니다 — Browser pane 시각
  검증으로 대체(아래).
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상
  생성.
- 사용자 요청대로 범위를 코드 블록과 직접 연관된 파일로 좁혀 전체 `npm test`는
  실행하지 않았다(CLAUDE.md 테스트 루틴).

## 수동/시각 검증(Browser pane으로 실제 확인)
AX Auth 로그인 제약으로 실제 `/editor/[pageId]` 화면은 열 수 없어, 코드 블록 1개
(4줄 JS 함수)를 렌더링하는 임시 디버그 페이지(검증 후 삭제)로 Chromium 기반 Browser
pane에서 확인했다.

1. **다크 테마**: 페이지 배경·코드 블록 배경 모두 어두워, 코드 블록이 잘 드러나지
   않았지만(원래 다크 테마에서도 이미 어두운 코드 블록이었음) 문법 강조·줄 번호(1~4)
   모두 정상 표시됐다(스크린샷 확인).
2. **라이트 테마로 전환**(`document.documentElement.setAttribute('data-theme',
   'light')`): 페이지 배경은 밝게 바뀌었지만 코드 블록은 계속 어두운 배경을
   유지해 "IDE 패널이 문서 안에 박혀 있는" 모양이 됐다 — 요청한 효과를 정확히
   확인했다(스크린샷 확인). 줄 번호(1~4)도 어두운 배경 위에 흐린 회색으로 정상
   표시됐다.
3. **버그 발견 → 수정 → 재확인**: 2번 확인 중 언어 선택 드롭다운("자동 감지") 글자가
   안 보이는 것을 발견했다 — `getComputedStyle`로 `select`의 `color`가
   `rgb(17, 24, 39)`(라이트 테마의 `--color-foreground`, 어두운 색)이고 `<pre>`
   배경도 같은 `rgb(17, 24, 39)`(고정한 `--gray-900`)라 글자와 배경이 완전히 같은
   색이었음을 확인했다. `.code-block-toolbar`에 `--color-foreground` 등을 고정
   오버라이드한 뒤 재확인 — `color`가 `rgb(249, 250, 251)`(gray-50)로 바뀌었고,
   스크린샷에서도 "자동 감지" 글자가 어두운 배경 위에 명확히 보였다.
4. 다시 다크 테마로 전환해 회귀가 없는지 재확인 — 정상.

## 문제 → 조치 → 재검증
- **문제**: 코드 블록 배경을 고정 다크로 만든 뒤 라이트 테마에서 언어 선택 드롭다운
  글자가 안 보임.
- **원인**: `@sfood/ui`의 `Select`가 쓰는 `text-foreground`가 라이트 테마에서는
  어두운 색인데, 배경을 항상 어둡게 고정해 "같은 색 글자 위에 같은 색 배경"이 됨.
- **조치**: `.code-block-toolbar`에도 `--color-foreground`/`--color-border`/
  `--color-muted`를 고정 오버라이드.
- **재검증**: Browser pane에서 라이트/다크 둘 다 정상 표시 확인(위 3·4번).

## 새로운 결정 사항
없음.
