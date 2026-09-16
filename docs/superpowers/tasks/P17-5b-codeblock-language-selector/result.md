# P17-5b: 코드 블록 언어 선택 UI — 결과

## 커밋
- (커밋 후 기록 — 아래 "산출물" 참고)

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

## 산출물
- `docs/superpowers/tasks/P17-5b-codeblock-language-selector/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `src/app/globals.css`
- `docs/product/prd.md`
