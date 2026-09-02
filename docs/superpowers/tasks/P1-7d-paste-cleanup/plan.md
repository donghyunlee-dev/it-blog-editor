# P1-7d: 붙여넣기 서식 정제 — 구현 계획

## Global Constraints
- 텍스트 내용은 절대 잃지 않는다 — 서식(스타일)만 제거한다.
- 같은 세션 내부 복사-붙여넣기(ProseMirror의 슬라이스 재사용 최적화 경로)는 건드리지 않는다 — `transformPastedHTML`은 브라우저 클립보드 HTML을 실제로 재파싱하는 경로에만 개입하므로 별도 처리가 필요 없다.

## Task: `transformPastedHTML`로 인라인 스타일 제거
### Files
- `src/components/editor/RichTextEditor.tsx` (수정)
- `src/components/editor/RichTextEditor.test.tsx` (테스트 추가)

### Steps
- [ ] `stripPastedInlineStyles(html: string): string` 함수를 추가한다 — `DOMParser`로 파싱한 뒤 `[style]`이 있는 모든 요소의 `style` 속성을 제거하고 다시 `innerHTML`로 직렬화한다.
- [ ] `editorProps.transformPastedHTML`에 이 함수를 연결한다.
- [ ] 테스트: `<span style="color:...">텍스트</span>`를 붙여넣기 이벤트로 시뮬레이션해, 결과 문서에 `style` 속성을 가진 요소가 없고 텍스트는 보존되는지 확인한다.
- [ ] 테스트 작성 중 `@tiptap/extension-code-block`의 VS Code 붙여넣기 감지 플러그인이 `clipboardData.getData('vscode-editor-data')`를 무조건 호출한다는 것을 발견했다 — 테스트용 clipboardData mock이 이 타입에도 (엉뚱한) 값을 돌려주면 그 플러그인이 `JSON.parse`에서 예외를 던진다. mock의 `getData`가 `text/html`/`text/plain` 외에는 빈 문자열을 돌려주도록 만든다.
- [ ] 전체 테스트·`tsc`·`lint`·`build` 재확인.
