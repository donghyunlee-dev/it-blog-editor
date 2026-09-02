# P1-7c: 코드블록에 문법 강조를 추가한다 — 구현 결과 보고서

## 구현 내용
`@tiptap/extension-code-block-lowlight`(TipTap 공식 확장) + `lowlight`(highlight.js 기반 토크나이저)로 코드블록에 문법 강조를 추가했다.

- `StarterKit.configure({ ..., codeBlock: false })`로 기본(강조 없는) CodeBlock을 끄고, `CodeBlockLowlight.configure({ lowlight: createLowlight(common) })`를 추가했다. `common`은 lowlight가 공식적으로 권장하는 "자주 쓰는 언어 모음" 번들(JS/TS/Python/Java/Go/Rust/SQL 등)이라 언어를 하나씩 등록할 필요가 없다.
- **언어 자동 추정**: `language` 속성을 지정하지 않으면 `CodeBlockLowlight`가 자동으로 `lowlight.highlightAuto()`로 폴백한다는 것을 소스(`node_modules/@tiptap/extension-code-block-lowlight`)로 확인했다 — 그래서 언어를 고르는 UI 없이도(범위 밖) 대부분의 코드가 그럴듯하게 강조된다.
- **색상**: 기성 highlight.js 테마(github/atom-one 등)를 그대로 가져오면 하드코딩 hex가 섞여 이 프로젝트 규칙과 어긋난다 — 대신 `globals.css`에 `hljs-*` 클래스를 이미 있는 시맨틱 토큰(`--color-brand`=키워드, `--color-success`=문자열, `--color-warning`=숫자, `--color-info`=타입/이름, `--color-muted`=주석, `--color-secondary`=속성/변수, `--color-danger`=diff 삭제)에 매핑해, 다크/라이트 테마 전환에 자동으로 따라가게 했다.
- **버전 고정**: `@tiptap/extension-code-block-lowlight`의 최신 버전(3.31.0)은 `@tiptap/core@3.31.0`을 peer dependency로 요구하는데, 이 프로젝트의 다른 `@tiptap/*` 패키지는 전부 `3.30.2`로 맞춰져 있다 — `npm install` 시 이걸 확인하지 않고 그냥 설치했으면 버전 불일치가 조용히 들어올 뻔했다. `npm view`로 각 버전의 peerDependencies를 직접 확인한 뒤 `@3.30.2`로 명시해 설치했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `package.json` | `@tiptap/extension-code-block-lowlight@^3.30.2`, `lowlight@^3.3.0` 추가 |
| `src/components/editor/RichTextEditor.tsx` | `StarterKit`의 `codeBlock` 비활성화, `CodeBlockLowlight` 추가 |
| `src/components/editor/RichTextEditor.test.tsx` | 신규 테스트 1건 |
| `src/app/globals.css` | `hljs-*` 토큰 색상 규칙 추가 |
| `docs/product/prd.md` | P1-7c 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `99e8fd5` | feat: add syntax highlighting to code blocks |

## 자체 검토 (Self-Review)
### 긍정 사항
- 기성 하이라이트 테마를 그대로 붙이지 않고, 이 프로젝트의 디자인 시스템 규칙("커스텀 색상은 CSS Variables로만 참조")을 지키면서 시맨틱 토큰에 강조 색상을 매핑했다 — 다크 모드 전환 시 별도 작업 없이 자동으로 따라간다.
- `@tiptap/extension-code-block-lowlight`의 최신 버전이 이 프로젝트의 다른 `@tiptap/*` 패키지 버전과 peer dependency가 안 맞는다는 것을 설치 전에 확인해, 조용한 버전 불일치를 사전에 막았다.
- "언어 미지정 시 자동 추정으로 폴백한다"는 동작을 추측하지 않고 라이브러리 소스로 직접 확인한 뒤, 그 사실에 근거해 "언어 선택 UI는 범위 밖"이라는 스코프 결정을 내렸다.

### 주의사항
- lowlight의 언어 자동 추정은 통계적 추정이라 100% 정확하지 않을 수 있다(예: 아주 짧은 코드 조각은 오탐 가능성이 있음) — 실사용 중 부정확한 사례가 자주 나오면 언어 선택 UI를 별도 항목으로 추가하는 것을 고려한다.
- 실제 화면에서 강조된 코드블록의 시각적 완성도(색상 대비, 가독성)는 AX Auth 로그인 제약으로 이 세션에서 직접 확인하지 못했다 — 컴포넌트 테스트로 "강조 토큰이 실제로 붙는가"만 확인했다. 실제 화면 확인을 요청한다.

### 우려사항
- 없음.
