# P17-12: 표 툴바 버튼이 커서 선택을 되돌려버리는 문제 — 결과

## 커밋
- (커밋 예정 — 아래 "산출물" 참고)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx`
  - `TableToolbarButton`의 `<Button>`에 `onMouseDown={(event) =>
    event.preventDefault()}` 추가 — 표 툴바(행/열 추가·삭제, 병합, 분할, 표 삭제
    버튼 전부가 이 공용 컴포넌트를 씀)의 어떤 버튼을 눌러도 mousedown 시점에
    브라우저가 에디터의 기존 선택을 표 첫 셀로 되돌리지 않게 한다.
- `src/app/globals.css`
  - `.ProseMirror td.selectedCell`/`.ProseMirror th.selectedCell`에
    `background-color: var(--color-brand-subtle)` 추가 — `prosemirror-tables`가
    다중 셀 선택 시 공식적으로 붙여 주는 `selectedCell` 클래스에 이 프로젝트가
    지금까지 대응하는 CSS가 없어 선택이 시각적으로 전혀 안 보이던 문제를 고쳤다.
- `src/components/editor/RichTextEditor.test.tsx`
  - "표 툴바 버튼은 mousedown의 기본 동작을 막아 에디터 선택이 바뀌지 않게 한다"
    테스트 추가 — 행/열 추가·삭제 버튼 각각에 `mousedown` 이벤트를 직접 디스패치해
    `event.defaultPrevented`가 `true`인지 확인한다.
- `docs/product/prd.md` — Phase 17에 P17-12 항목 추가 및 완료 표시.

## 원인
- `TableToolbarButton`은 표 노드뷰의 `contentDOM`(tbody) 밖, `<table>` 바로 앞
  슬롯에 렌더링된다(`createStickyTableView`/`TableToolbar` 참고). `onClick`만
  있고 `onMouseDown`으로 기본 동작을 막지 않으면, 리치 텍스트 에디터 툴바에서
  흔히 겪는 문제대로 버튼을 누르는 mousedown 시점에 브라우저가 에디터의 선택을
  건드려 버린다 — 사용자가 실제 브라우저에서 직접 확인한 증상은 "표의 첫 번째
  셀로 선택이 되돌아간다"였다. 그 뒤 실행되는 `addRowBefore`/`addRowAfter`/
  `mergeCells`/`splitCell` 등은 이미 망가진 선택을 기준으로 동작해, "행 추가가
  항상 1행 기준"/"병합 버튼은 활성화되는데 눌러도 아무 일도 안 일어난다"는 서로
  다른 증상이 같은 원인에서 나왔다.
- 셀 다중 선택 시 배경색이 안 보이는 건 별개 원인(스타일 누락)이다.

## 자체 검토
- **긍정**: 두 가지로 보고된 증상(행 추가 위치, 병합 무반응)이 사실 하나의
  근본 원인(mousedown 기본 동작 미차단)에서 나온다는 걸 사용자가 직접 진단했고,
  업계에 잘 알려진 표준 수정 패턴(`onMouseDown` preventDefault)으로 해결했다 —
  임시방편이 아니라 근본 수정이다. 공용 컴포넌트(`TableToolbarButton`)에 한 번만
  고쳐 표의 모든 버튼(행/열 추가·삭제, 병합, 분할, 표 삭제)에 동시에 적용된다.
- **주의사항**: 이 세션의 Browser pane(헤드리스 Chromium)과 실제 Playwright
  자동화 둘 다 원래 버그 자체를 재현하지 못했다 — 합성 마우스 이벤트가 이 특정
  브라우저의 "비편집 버튼 mousedown 시 선택 되돌림" 동작을 트리거하지 않는
  것으로 보인다. 따라서 이 수정이 실제로 문제를 없애는지는 이 세션에서 시각적으로
  직접 재확인하지 못했다(사용자의 진단과 업계 표준 수정 패턴에 대한 확신에
  근거해 적용) — 사용자의 실제 브라우저 재확인이 필요하다.
- **우려사항**: 없음 — `preventDefault()`는 클릭(`onClick`) 자체의 발생을 막지
  않으므로(mousedown만 막고 클릭 이벤트는 정상 발생) 버튼의 기존 동작에는 영향이
  없다. 기존 테스트 66개 전부 통과로 회귀 없음을 확인했다.

## 산출물
- `docs/superpowers/tasks/P17-12-table-toolbar-selection-reset/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `src/app/globals.css`
- `docs/product/prd.md`
