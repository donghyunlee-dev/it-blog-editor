# P17-5c: 코드 블록 복사 버튼 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 65개 전부 통과
  (새로 추가한 3개 포함: 클릭 시 클립보드 복사 + 성공 토스트, 실패 시 실패 토스트,
  코드 블록 여러 개일 때 버튼별로 자신의 코드만 복사).
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상 생성.
- 사용자 요청대로 범위를 코드 블록과 직접 연관된 파일로 좁혀 전체 `npm test`는 실행하지
  않았다(CLAUDE.md 테스트 루틴).

## 수동/시각 검증(Browser pane으로 실제 확인)
사용자의 실행 중인 dev 서버(`localhost:3000`)에 임시 디버그 페이지(검증 후 삭제,
`ToastProvider`로 감싼 `RichTextEditor` 하나, 코드 블록 1개)를 추가해 확인했다(AX Auth
로그인 제약으로 실제 `/editor/[pageId]` 화면은 열 수 없어 기존 P17-5b/P17-11과 같은
방식을 그대로 따랐다).

1. 코드 블록 툴바에 언어 선택 드롭다운과 나란히 복사 버튼이 정상 렌더링됐다(`find`로
   `aria-label="코드 복사"` 버튼 확인).
2. 버튼을 클릭했다. `get_page_text`로 확인한 결과 "코드 복사에 실패했습니다." 토스트가
   떴다.
3. `javascript_tool`로 직접 `navigator.clipboard.writeText("test")`를 호출해 원인을
   확인 — `"Failed to execute 'writeText' on 'Clipboard': Write permission denied."`
   이 세션의 Browser pane(헤드리스 Chromium)이 `clipboard-write` 권한 자체를 거부하고
   있음을 확인했다. 즉 우리 코드(`handleCopy`)는 정확히 의도한 대로 동작했다 —
   `navigator.clipboard.writeText`를 호출했고, 그 Promise가 reject되자 `catch` 블록이
   실행돼 실패 토스트를 띄웠다. 이는 코드 블록 안의 실제 텍스트("function add(a, b) {...}")
   유무와 무관하게, 이 환경의 권한 정책 때문에 항상 실패로 귀결되는 조건이다.
4. 위 실패 경로는 실제 DOM에서 끝까지 확인됐지만, 성공 경로(클립보드에 실제로 값이
   들어가고 성공 토스트가 뜨는지)는 이 환경에서 재현할 수 없었다 — 자동화 테스트에서
   `navigator.clipboard.writeText`를 resolve하도록 모킹해 성공 토스트("코드를
   클립보드에 복사했습니다.")가 뜨는지, 그리고 실제로 호출된 인자가 해당 코드 블록의
   텍스트와 일치하는지 확인했다(위 자동화 테스트 항목 참고).
5. 임시 디버그 페이지를 삭제했다.

## 문제 → 조치 → 재검증
- **문제**: 없음(구현 중 회귀 없이 한 번에 통과).
- 참고: Browser pane의 클립보드 권한 제약은 이 작업의 코드 결함이 아니라 세션 도구
  환경의 한계로 판단했다(위 3번). 실제 사용자 브라우저(Chrome/Edge 등)는 `localhost`/
  `https` 컨텍스트에서 `clipboard-write`를 프롬프트 없이 허용하는 것이 표준 동작이다.

## P17-5c 후속 검증(같은 PR, `hover:bg-surface-raised` 라이트 배경 수정)
사용자 지적: "라이트 모드일 때 마우스 오버하면 라이트 백그라운드가 되어서 잘 안보여.
전체적으로 다크톤인데 마우스 오버할 때 다크모드 처럼 CSS가 적용되어야 해."

- `.code-block-toolbar`에 `--color-surface`/`--color-surface-raised`/
  `--color-surface-overlay`/`--color-surface-subtle`를 다크 테마 값으로 고정
  오버라이드했다(원인·조치는 result.md 참고).
- Browser pane에서 `document.documentElement.setAttribute('data-theme', 'light')`로
  라이트 테마를 강제한 뒤, `getComputedStyle(toolbar).getPropertyValue('--color-surface-
  raised')`가 `#1f2937`(gray-800)로 나오는지 확인 — 정확히 일치했다(수정 전이었다면
  `#ffffff`). 복사 버튼의 `className`에 `hover:bg-surface-raised`가 포함돼 있음도
  확인해, 이 값이 실제로 마우스 오버 배경에 쓰인다는 것을 재확인했다.
- 이 세션의 헤드리스 브라우저에서는 스크린샷/실제 `:hover` 트리거가 이전에도 불안정했던
  것과 같은 이유로(P17-11 산출물 참고) 마우스를 올린 상태의 스크린샷 자체는 찍지
  못했다 — 대신 CSS 커스텀 프로퍼티가 실제로 다크 값으로 해석됨을 계산된 스타일로
  직접 확인했다(위와 동일한 근거로 충분하다고 판단).
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 65개 전부 통과
  (회귀 없음 — CSS만 바뀌어 기존 테스트에 영향 없음).
- `npx eslint src/app/globals.css` — 이 프로젝트는 CSS에 대한 ESLint 설정이 없어
  "설정 없음" 경고만 뜨고 에러는 없다(정상).
- `npm run build` — 성공.

## P17-5c 두 번째 후속 검증(같은 PR, 헤더/본문 구조 분리)
사용자 요청: "고정했어? 방법이 없나? 나중에 디자인 수정할 때 문제 있지 않아?" →
"차라리 헤더를 만들어서 테마에 영향을 받게 수정해줘. 헤더와 코드 영역을 나누고 코드
영역은 전문성 있게 배경을 하고 헤더는 스타일 따라가게 하면 지금처럼 강제로 할 필요가
없을 것 같아."

- 헤더(`.code-block-header`)와 본문(`<pre data-theme="dark">`)을 구조적으로 분리했다
  (자세한 설계는 result.md 참고).
- Browser pane에서 `data-theme`을 `light`/`dark`로 각각 강제한 뒤
  `getComputedStyle`로 확인:
  - 라이트: `headerBg: rgb(243, 244, 246)`, `preBg: rgb(17, 24, 39)`,
    `preColor: rgb(249, 250, 251)`, `pre[data-theme]: "dark"`,
    복사 버튼의 `--color-surface-raised: "#fff"`, select `color: rgb(17, 24, 39)`.
  - 다크: `headerBg: rgb(31, 41, 55)`, `preBg: rgb(17, 24, 39)`(동일, 항상 고정),
    복사 버튼의 `--color-surface-raised: "#1f2937"`, select `color: rgb(249, 250, 251)`.
  - 두 테마 모두 헤더 안 컴포넌트의 배경·글자·hover색이 항상 서로 올바르게 짝지어짐을
    확인했다 — 더 이상 어떤 토큰도 수동으로 오버라이드하지 않는다.
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 65개 전부 통과.
- `npx eslint` 대상 파일 — 0 errors.
- `npm run build` — 성공.
- 이 세션의 헤드리스 브라우저 스크린샷 도구가 이전과 같은 이유로(렌더링 타임아웃)
  시각적 스크린샷 자체는 찍지 못했지만, computed style로 라이트/다크 각 테마에서
  기대한 정확한 색상값이 나옴을 확인했으므로 충분한 근거로 판단했다.

## P17-5c 세 번째 후속 검증(같은 PR, 옵션 팝업 글자색 회귀 수정)
사용자 지적: "다크로 했을 때 언어 폰트 컬러가 반전이 안됐어."

- 원인·조치는 result.md 참고 — `.code-block-header select option`에
  `var(--color-surface)`/`var(--color-foreground)` 참조를 다시 추가했다.
- Browser pane에서 실제 `ThemeToggle` 버튼을 클릭해(속성 강제가 아닌 실제 UI 조작)
  시스템 → 라이트 → 다크로 전환한 뒤, `document.body.style.zoom = '4'`로 확대해
  스크린샷으로 확인 — 닫힌 select 상자의 "javascript"(언어 지정 시)/"자동 감지"
  (미지정 시) 텍스트가 다크 헤더 배경 위에 하얗게 선명히 보였다(수정 전에도 닫힌
  상자 자체는 `getComputedStyle`상 정상이었지만, 옵션 팝업 전용 규칙이 빠져 있었다는
  게 이번에 발견한 문제).
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 65개 전부 통과.
- `npx eslint`/`npm run build` — 정상.
- 옵션 팝업 자체(네이티브 렌더링 표면)는 이 세션의 헤드리스 브라우저가 스크린샷에
  담지 못하는 기존 한계(P17-11 산출물 참고)로 이번에도 시각적으로 재확인하지 못했다
  — 다만 이번에 적용한 `<option>` 직접 선언 방식은 P17-11에서 실사용 확인까지 거쳐
  검증된 것과 동일한 기법이다.

## 새로운 결정 사항
없음.
