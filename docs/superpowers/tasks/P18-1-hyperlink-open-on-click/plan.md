# P18-1: 하이퍼링크 텍스트 클릭 시 열기 — 구현 계획

## Global Constraints
- `link: { openOnClick: false }` 설정 자체는 그대로 유지한다(편집 중 실수 방지가
  여전히 유효한 목적) — 그 위에 "의도적으로 열기"를 위한 별도 경로만 추가한다.
- 새 URL 검증 로직을 만들지 않는다 — 기존 `isSafeLinkHref`(링크 팝오버 적용 시
  이미 쓰는 것과 같은 함수)를 Ctrl+클릭 경로에도 그대로 재사용한다.
- `window.open`은 항상 `"_blank", "noopener,noreferrer"`로 호출한다(새 탭 + 원본
  페이지에 대한 참조를 열린 탭에 주지 않는 표준 보안 관례).

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `useEditor`의 `editorProps`에 `handleClick` 추가 — Ctrl/Cmd+클릭이고
      클릭 대상이(또는 그 조상이) 에디터 안의 `<a>`이며 `href`가 `isSafeLinkHref`를
      통과하면 `window.open`으로 새 탭에서 연다.
- [x] **Step 2**: `LinkPopoverForm`에 "열기" 버튼 추가 — 팝오버가 열릴 때 이미
      적용된 링크가 있을 때만(마운트 시점 href가 비어있지 않을 때) 보인다.
      `onMouseDown`에 `preventDefault`를 둬 P17-12에서 확인된 문제(비편집 영역
      버튼의 mousedown이 에디터 선택을 흩트릴 수 있음)를 예방한다.
- [x] **Step 3**: 테스트 — 일반 클릭은 안 열림, Ctrl+클릭은 열림, 안전하지 않은
      스킴은 Ctrl+클릭해도 안 열림, 버블 메뉴 "열기" 버튼 동작, 새 링크 생성 중엔
      "열기" 버튼이 안 보임. `prosemirror-view`의 클릭 감지가 네이티브 `click`
      이벤트가 아니라 `mousedown`→`mouseup` 시퀀스로 동작한다는 것을 확인해(
      node_modules 확인) `fireEvent.click()` 대신 `mouseDown`+`mouseUp`을 직접
      디스패치하는 테스트 헬퍼를 쓴다.
- [x] **Step 4**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`. Browser pane에서 실제 Ctrl+클릭·"열기" 버튼 모두 확인(
      `window.open`을 임시로 가로채 호출 인자를 검사).
