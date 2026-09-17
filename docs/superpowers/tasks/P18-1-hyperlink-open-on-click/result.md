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

## 산출물
- `docs/superpowers/tasks/P18-1-hyperlink-open-on-click/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
