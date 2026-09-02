# P1-7c: 코드블록 문법 강조 — 구현 계획

## Global Constraints
- 기존 "코드블록" 슬래시 메뉴 항목(`SlashCommandExtension.ts`)이 쓰는 `toggleCodeBlock()` 커맨드 이름을 그대로 유지한다 — `CodeBlockLowlight`는 `CodeBlock`을 확장하므로 커맨드가 그대로 상속된다.
- 강조 색상은 하드코딩 hex 없이 기존 CSS 변수 토큰만 참조한다(CLAUDE.md 규칙).
- `@tiptap/*` 패키지는 이 프로젝트가 전부 `3.30.2`로 맞춰 쓰고 있다 — 새로 추가하는 `@tiptap/extension-code-block-lowlight`도 `^3.30.2`로 맞춰 설치해 peer dependency 불일치(최신 버전은 `@tiptap/core@3.31.0`을 요구)를 피한다.

## Task: lowlight 기반 코드블록 문법 강조 추가
### Files
- `package.json` (수정 — 의존성 추가)
- `src/components/editor/RichTextEditor.tsx` (수정)
- `src/components/editor/RichTextEditor.test.tsx` (테스트 추가)
- `src/app/globals.css` (수정 — hljs-* 토큰 색상)

### Steps
- [ ] `npm install @tiptap/extension-code-block-lowlight@3.30.2 lowlight@^3` — 버전을 명시적으로 맞춰 설치.
- [ ] `RichTextEditor.tsx`: `StarterKit.configure({ ..., codeBlock: false })`로 기본 CodeBlock을 끄고, `CodeBlockLowlight.configure({ lowlight: createLowlight(common) })`를 extensions 배열에 추가한다. `lowlight` 인스턴스는 컴포넌트 바깥(모듈 스코프)에서 한 번만 생성한다.
- [ ] `globals.css`: `hljs-*` 클래스(comment/keyword/string/number/title 등)를 기존 시맨틱 토큰에 매핑하는 CSS를 추가한다.
- [ ] 테스트: `codeBlock` 노드를 담은 문서를 렌더링해 `pre code` 안에 `hljs-*` 클래스를 가진 span이 실제로 생기는지 확인한다(언어를 지정하지 않아도 자동 추정으로 강조되는지).
- [ ] 전체 테스트·`tsc`·`lint`·`build` 재확인.
