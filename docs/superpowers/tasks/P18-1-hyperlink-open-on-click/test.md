# P18-1: 하이퍼링크 텍스트 클릭 시 열기 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 71개 전부 통과
  (새로 추가한 5개 포함): 일반 클릭 안 열림, Ctrl+클릭 열림, 안전하지 않은
  스킴(javascript:)은 Ctrl+클릭해도 안 열림, 버블 메뉴 "열기" 버튼 클릭 시 열림,
  아직 URL이 없는 새 링크 팝오버엔 "열기" 버튼이 안 보임.
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상
  생성.
- 사용자 요청대로 범위를 링크 기능과 직접 연관된 파일로 좁혀 전체 `npm test`는
  실행하지 않았다(CLAUDE.md 테스트 루틴).

## 테스트 중 발견 및 조치
- **문제**: 처음 `fireEvent.click(link, { ctrlKey: true })`로 작성한 테스트가
  실패했다 — "Ctrl+클릭하면 열린다" 테스트에서 `window.open`이 전혀 호출되지
  않았다(호출 0회).
- **원인**: `prosemirror-view`(node_modules 확인)의 클릭 감지는 네이티브 `click`
  이벤트를 듣는 게 아니라, 자체 `mousedown` 핸들러가 이후의 `mouseup`까지의
  시간·위치를 추적해 "이게 단일 클릭이었는지"를 판단한 뒤 `editorProps.handleClick`
  을 호출한다. `fireEvent.click()`은 `click` 이벤트 하나만 디스패치하므로 이
  내부 로직 자체가 전혀 실행되지 않는다 — 즉 "일반 클릭은 안 열려야 한다"는
  테스트도 실제로는 핸들러가 호출 안 돼서 우연히 통과하는(거짓 양성) 상태였다.
- **조치**: `fireEvent.mouseDown(link, options)` 다음 `fireEvent.mouseUp(link,
  options)`를 순서대로 디스패치하는 `clickLink()` 헬퍼로 실제 클릭과 같은 이벤트
  시퀀스를 재현했다.
- **재검증**: 위 조치 후 "Ctrl+클릭하면 열린다" 테스트가 정확히 의도한 이유로
  통과함을 확인했다(1회 호출, 정확한 인자).

## 수동/시각 검증(Browser pane으로 실제 확인)
AX Auth 로그인 제약으로 실제 `/editor/[pageId]` 화면은 열 수 없어, 링크 텍스트
하나를 렌더링하는 임시 디버그 페이지(검증 후 삭제)로 확인했다. `window.open`을
임시로 가로채(`window.open = (...args) => { window.__openCalls.push(args); }`)
호출 여부·인자를 직접 확인했다.

1. 링크 텍스트를 일반 클릭 — `window.__openCalls`가 빈 배열로 유지됨(안 열림).
2. 같은 텍스트를 Ctrl+클릭 — `window.__openCalls`에
   `["https://example.com", "_blank", "noopener,noreferrer"]`가 정확히 기록됨.
3. 텍스트를 더블클릭으로 선택해 서식 버블 메뉴를 띄운 뒤 "링크" 토글을 클릭 →
   URL 입력 팝오버가 뜨고 "열기" 버튼이 보임 → 클릭 → 같은 인자로 `window.open`
   호출 확인.
4. 임시 디버그 페이지를 삭제했다.

## P18-1 후속 검증(같은 PR, 버블 메뉴 랜덤 미표시 + 링크 발견성 개선)
사용자 지적: "이미지 캡션 저장은 누를때마다 랜덤하게 컴포넌트가 나오고" /
"링크는 컨트롤 누르면 기능이 되지만 화면 상 되는 지 알수가 없어. 대부분 마우스
포인터에 변화가 없으니까 어떤 동작이 될 거란 생각이 안 들어."

- `EditorBubbleMenu`에도 `updateDelay={0}`을 추가(이미지 버블 메뉴에서 먼저
  재현·수정한 것과 같은 원인 — 자세한 내용은
  `docs/superpowers/tasks/P17-8-image-delete-reupload/test.md` 참고).
- Browser pane에서 링크 텍스트의 `title` 속성이 실제로
  `"Ctrl(Windows)/Cmd(Mac)+클릭하여 링크 열기"`로 렌더링됨을
  `a.getAttribute('title')`로 확인했다 — 처음 `HTMLAttributes`로 시도했을 때는
  반영되지 않아 `LinkWithOpenHint`(Link 확장)로 바꿨다(원인은 result.md 참고).
- `getComputedStyle(a).cursor`가 `"pointer"`로 나옴을 확인했다.
- Ctrl+클릭·"열기" 버튼이 이 변경 후에도 여전히 정상 동작함을 재확인했다
  (`window.open` 호출 인자 동일).
- `npx vitest run RichTextEditor.test.tsx` — 71개 전부 통과(회귀 없음).
- `npm run build` — 성공.
- 네이티브 브라우저 툴팁(제목 속성 호버 시 뜨는 것) 자체는 이 세션의 헤드리스
  브라우저 스크린샷 도구로 캡처되지 않는다(OS 렌더링 레이어라 이전에 겪은 네이티브
  select 팝업과 같은 한계) — `title` 속성이 DOM에 정확히 존재함을 확인한 것으로
  충분하다고 판단했다(모든 브라우저가 `title` 속성에 대해 기본 제공하는 표준 동작).

## 새로운 결정 사항
없음 — task.md에 정리한 대로, "Ctrl/Cmd+클릭 + 열기 버튼 둘 다 지원"은 사용자가
직접 확인해 준 결정이다.
