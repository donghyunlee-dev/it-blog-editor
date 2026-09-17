# P18-1: 하이퍼링크 텍스트 클릭 시 열기 — 결과

## 커밋
- (커밋 예정 — 아래 "산출물" 참고)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx`
  - `useEditor`의 `editorProps.handleClick` 추가 — `event.ctrlKey || event.metaKey`
    이고 클릭 대상이 에디터 안의 `<a>`(또는 그 조상)이며 `href`가
    `isSafeLinkHref`를 통과하면 `window.open(href, "_blank",
    "noopener,noreferrer")`로 새 탭에서 연다. 일반 클릭은 기존과 동일하게 아무
    동작도 하지 않는다(커서 배치만).
  - `LinkPopoverForm`에 "열기" 버튼 추가 — 팝오버 마운트 시점에 이미 적용된
    링크가 있을 때만(`href` 초기값이 비어있지 않을 때) 보인다. 클릭하면
    `editor.getAttributes("link").href`를 `window.open`으로 연다.
    `onMouseDown={(e) => e.preventDefault()}`로 P17-12에서 확인된 "비편집 버튼의
    mousedown이 에디터 선택을 흩트릴 수 있다"는 문제를 예방적으로 막는다.
- `src/components/editor/RichTextEditor.test.tsx`
  - "RichTextEditor 하이퍼링크 열기(P18-1)" describe 블록 추가(5개 테스트):
    일반 클릭 안 열림, Ctrl+클릭 열림, 안전하지 않은 스킴은 Ctrl+클릭해도 안 열림,
    버블 메뉴 "열기" 버튼 동작, 새 링크 생성 중엔 "열기" 버튼 안 보임.
- `docs/product/prd.md` — Phase 18 신설(P18-1/P18-2 계획), P18-1 완료 표시.

## 자체 검토
- **긍정**: `openOnClick: false`가 편집 중 실수 방지라는 원래 목적을 유지하면서도,
  "링크를 열 방법이 아예 없다"는 실제 사용성 문제를 Notion/Google Docs와 같은
  업계 표준 관례(Ctrl/Cmd+클릭)로 해결했다. 버블 메뉴의 "열기" 버튼은 단축키를
  모르는 사용자도 발견할 수 있는 대안 경로다. 기존 `isSafeLinkHref` 검증을
  재사용해 새로운 보안 검증 로직을 중복 작성하지 않았다.
- **주의사항**: 테스트 작성 중 `prosemirror-view`의 클릭 감지가 네이티브 `click`
  이벤트가 아니라 `mousedown`→`mouseup` 시퀀스로 동작한다는 것을 발견했다(자세한
  내용은 test.md 참고) — `fireEvent.click()`만으로는 `editorProps.handleClick`이
  전혀 호출되지 않아, 처음 작성한 테스트가 전부(거짓으로) 통과해버릴 뻔했다.
  `mouseDown`+`mouseUp`을 직접 디스패치하는 테스트 헬퍼로 바로잡았다.
- **우려사항**: 없음 — Browser pane 실브라우저에서 `window.open`을 가로채 Ctrl+클릭·
  "열기" 버튼 둘 다 정확한 인자로 호출됨을 직접 확인했다.

## P18-1 후속 수정(같은 PR, 사용자 실사용 확인 후 리포트)
사용자 지적 세 가지를 추가로 받았다:
1. "이미지 캡션 저장은 누를때마다 랜덤하게 컴포넌트가 나오고"
2. "링크는 컨트롤 누르면 기능이 되지만 화면 상 되는 지 알수가 없어. 대부분 마우스
   포인터에 변화가 없으니까 어떤 동작이 될 거란 생각이 안 들어"

**1) 버블 메뉴가 랜덤하게 안 뜨는 문제**: 이미지 버블 메뉴(P17-8)에서 먼저 재현·
확인했다(원인·조치는 `docs/superpowers/tasks/P17-8-image-delete-reupload/
result.md` 참고 — `@tiptap/extension-bubble-menu`의 기본 `updateDelay`(250ms)가
짧은 시간 안에 여러 번 바뀌는 선택 변화를 디바운스하며 경합을 일으킨다). 같은
근본 원인이 텍스트 서식 버블 메뉴(`EditorBubbleMenu`, 링크 편집 폼이 들어있는 바로
그 메뉴)에도 있어, `updateDelay={0}`을 여기도 추가해 함께 고쳤다.

**2) 링크에 마우스 포인터 변화가 없어 아무 힌트도 없는 문제**: 두 가지를 추가했다.
- `globals.css`의 `.prose a { cursor: pointer; }` — contenteditable 안에서는
  링크도 기본 `cursor: text`(I-beam)라 클릭 가능한 요소처럼 안 느껴졌다.
- 링크에 `title` 속성으로 "Ctrl(Windows)/Cmd(Mac)+클릭하여 링크 열기" 힌트를
  달아, 호버 시 브라우저 네이티브 툴팁으로 사용법을 안내한다. 처음에는
  `StarterKit.configure({ link: { HTMLAttributes: { title } } })`로 시도했는데
  실제 DOM에 반영되지 않았다(실측 확인 — 같은 방식으로 넣은 `class`는 반영되는데
  `title`만 빠짐. `target`/`rel`/`class`는 `@tiptap/extension-link`의 schema
  attrs로 이미 등록돼 있어 렌더링되지만, schema attrs로 등록되지 않은 임의의
  `HTMLAttributes` 키는 최종 DOM에 반영되지 않는 것으로 보인다). `Link`를
  `LinkWithOpenHint`로 직접 확장해 `title`을 이 확장 자체의 attrs로 등록하는
  방식으로 바꿔 해결했다(`codeBlock`을 `CodeBlockWithLanguagePicker`로 대체하는
  것과 같은 기존 패턴).

**재검증**: Browser pane에서 `title` 속성이 실제로 렌더링됨(`getAttribute('title')`
로 직접 확인), `cursor: pointer`가 적용됨, Ctrl+클릭·"열기" 버튼이 여전히 정상
동작함을 재확인했다.

## 산출물
- `docs/superpowers/tasks/P18-1-hyperlink-open-on-click/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `src/app/globals.css`
- `docs/product/prd.md`
