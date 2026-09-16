# P17-5b: 코드 블록 언어 선택 UI — 결과

## 커밋
- `c684b63` feat: 코드 블록마다 언어를 직접 고를 수 있는 선택 UI 추가 (P17-5b)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx`
  - `CodeBlockView` NodeView(코드 블록 오른쪽 위 언어 선택 `<select>` + 기존 `<pre><code>`)
    를 추가하고, `CodeBlockLowlight.extend({ addNodeView() {...} })`로
    `CodeBlockWithLanguagePicker`를 만들어 기존 `CodeBlockLowlight.configure(...)`를
    대체했다. 언어 목록은 `lowlight.listLanguages()`(이미 만들어 둔 `common` 번들
    인스턴스)에서 가져온다. `NodeViewContent`는 TS 제네릭 추론 문제로
    `<NodeViewContent<"code"> as="code" />`로 명시했다.
  - `language` attrs는 `@tiptap/extension-code-block`이 이미 갖고 있던 필드를 그대로
    쓴다 — 값을 지정하면 `LowlightPlugin`이 그 언어로 강제 강조하고, 비우면(null)
    기존처럼 `highlightAuto()`로 돌아간다(라이브러리 동작, 새 로직 없음).
- `src/app/globals.css` — `.code-block-wrapper`/`.code-block-toolbar`/
  `.code-block-language-select` 스타일 추가(코드 블록 오른쪽 위에 겹쳐 뜨는 드롭다운,
  기존 CSS 변수 토큰만 사용).
- `src/components/editor/RichTextEditor.test.tsx`
  - 기존 "코드블록 문법 강조(P1-7c)" 테스트를 NodeView 도입에 맞춰 `waitFor` 기반
    비동기 검증으로 바꿨다(추가 React 렌더 사이클이 필요해짐).
  - 언어 선택 UI 테스트 3개 추가: 드롭다운 노출+언어 목록 포함 여부, 언어 선택 시
    `codeBlock` 노드의 `language` attrs 반영, "자동 감지" 복귀 시 `null`로 되돌아감.
- `docs/product/prd.md` — Phase 17 P17-5b 항목 완료 표시.

## 자체 검토
- **긍정**: `language` attrs·강제 강조 로직 모두 라이브러리에 이미 있던 것을 그대로
  활용해 새 로직을 만들지 않았다 — UI(드롭다운)만 추가한 셈이라 회귀 리스크가 작다.
  Browser pane으로 실제 렌더링(드롭다운이 코드와 겹치지 않고 각 코드 블록마다 독립적으로
  뜨는 것, 언어 선택 시 강조색이 바뀌는 것)을 직접 확인했다.
- **주의사항**: 언어를 프로그래밍 방식으로 바꾼 뒤 헤드리스 브라우저 스크린샷에서
  `<select>`가 간헐적으로 보이지 않는 현상을 관찰했다 — `getBoundingClientRect`/
  `getComputedStyle`로 위치·색상·visibility가 전부 정상임을 확인했고 실제 값도
  올바르게 반영돼(`select.value === "python"`), 헤드리스 브라우저의 네이티브
  `<select>` 위젯 스크린샷 컴포지팅 한계로 판단했다(실제 동작 자체는 정상).
- **우려사항**: 없음 — 기존 문법 강조·Tab 들여쓰기 테스트 모두 회귀 없이 통과했다.

## P17-5b 적용 후속(같은 PR, 사용자 리뷰 피드백 반영)
사용자가 머지 전 리뷰에서 지적: "드롭다운 디자인이 디자인 시스템에 있는 토큰을 가져와서
한거야? 너무 거칠고 투박스런 디자인인데. 백그라운드 컬러도 단순 화이트라서 코드 블록과
분리되어 보여." 확인 결과 원래 구현은 CSS 변수 토큰은 썼지만(하드코딩 아님) 순정
`<select>` + 커스텀 CSS 클래스였다 — `@sfood/ui`에 정확히 이 용도의 `Select` 컴포넌트가
이미 있었는데 쓰지 않았다(CLAUDE.md "디자인 시스템 우선순위" 규칙 위반).

- `<select>` + `.code-block-language-select` CSS 클래스를 `@sfood/ui`의 `Select`
  컴포넌트로 교체했다(`options`/`placeholder` prop 사용, `className`으로 이 좁은
  자리에 맞게 오버라이드).
- "배경이 흰색이라 분리돼 보인다"는 지적의 원인: `Select`(그리고 원래 커스텀 클래스)
  모두 `bg-surface`류 토큰을 썼는데, 코드 블록 배경은 다른 토큰(`--tw-prose-pre-bg`
  = surface-subtle)이라 서로 달랐다. 배경을 투명하게 바꿔 코드 블록 배경이 그대로
  비치게 했다.
- `background: transparent`만으로는 부족했다 — `<select>` 기본값 `appearance: auto`
  때문에 브라우저가 배경색 지정과 무관하게 자체 네이티브 상자를 그 위에 그린다(널리
  알려진 CSS 한계). `appearance-none`으로 네이티브 껍데기를 없애고, 그러면서 사라지는
  기본 화살표를 작은 글자(▾)로 직접 대체했다.
- 개발자 도구로 확인: `background-color: rgba(0,0,0,0)`, `appearance: none` 모두
  정확히 적용됐고, select의 렌더링 위치가 `<pre>`의 배경(`rgb(31,41,55)`, 어두운
  surface-subtle) 영역 안에 완전히 들어있음을 좌표로 확인했다 — 이제 코드 블록
  배경이 그대로 비쳐 보인다.
- Browser pane 스크린샷에서는 select가 여전히 흰 상자로 보였는데, 컴퓨티드 스타일이
  명백히 올바른데도 그런 것으로 보아 이 세션이 쓰는 헤드리스 브라우저의 네이티브
  `<select>` 위젯 스크린샷 컴포지팅 한계로 판단했다(P17-5b 최초 작업 때도 같은
  종류의 select 렌더링 불일치를 관찰한 바 있음) — `appearance-none` + `background:
  transparent`는 실제 브라우저에서 표준적으로 잘 동작하는 조합이라 실제 사용자
  환경에서는 문제없이 보일 것으로 판단하지만, 확답을 위해 실사용 확인이 필요하다.

## 산출물
- `docs/superpowers/tasks/P17-5b-codeblock-language-selector/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `src/app/globals.css`
- `docs/product/prd.md`
