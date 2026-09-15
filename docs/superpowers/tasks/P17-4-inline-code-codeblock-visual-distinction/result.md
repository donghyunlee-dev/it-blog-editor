# P17-4: 인라인 코드 vs 코드 블록 시각적 구분 — 결과

## 커밋
- `cdbf2c4` fix: 인라인 코드에 배경 칩을 줘 코드 블록과 시각적으로 구분 (P17-4)

## 변경 파일
- `src/app/globals.css`
  - `.prose code:not(pre code)`에 배경(`var(--color-surface-subtle)`)·테두리
    (`var(--color-border)`)·`border-radius: 0.25rem`·패딩(`0.15em 0.4em`)을 추가해
    인라인 코드를 짧은 배경 칩으로 만들었다 — 코드 블록(전체 폭 박스 + 문법 강조)과
    형태 자체로 구분된다.
  - `.prose code::before`/`::after`에 `content: none`을 추가해
    `@tailwindcss/typography` 기본 백틱(`) 의사요소를 껐다 — 배경 칩이 이미 "코드"
    신호를 주므로 중복을 없앴다(코드 블록 쪽은 플러그인이 이미 꺼둔 상태라 이 규칙은
    사실상 인라인에만 영향).
- `docs/product/prd.md` — Phase 17 P17-4 항목 완료 표시.

## 자체 검토
- **긍정**: 새 컴포넌트나 attrs 없이 순수 CSS 조정만으로 해결했다 — GitHub/Notion류
  에디터의 표준 "인라인 코드 배경 칩" 패턴을 그대로 따르고, 이미 있는 CSS 변수
  토큰만 재사용해 라이트/다크 테마 모두 자동으로 대응한다(임시 디버그 페이지로
  Browser pane에서 두 테마 다 스크린샷으로 직접 확인).
- **주의사항**: 백틱 의사요소 제거 규칙(`.prose code::before/::after`)이 `pre code`도
  포함하는 넓은 선택자이지만, 코드 블록 쪽은 `@tailwindcss/typography` 기본값이 이미
  `pre code::before/::after { content: none }`로 꺼둔 상태라 이 변경이 실질적으로
  영향을 주는 대상은 인라인 코드뿐이다.
- **우려사항**: 없음 — 코드 블록의 문법 강조(`.hljs-*`)와 배경은 이번 변경과 무관한
  선택자라 그대로 유지된다(테스트로 회귀 확인, 스크린샷으로 시각 확인).

## 산출물
- `docs/superpowers/tasks/P17-4-inline-code-codeblock-visual-distinction/{task,plan,result,test}.md`
- `src/app/globals.css`
- `docs/product/prd.md`
