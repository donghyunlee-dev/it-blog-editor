# P1-7a: 표에 행/열 추가·삭제 컨트롤을 추가한다

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 지적된 항목. `RichTextEditor.tsx`의 `TableControls`는 이미 "셀 병합"/"셀 분할" 버튼을 제공하지만(P0 이전부터 존재), 행/열 자체를 추가·삭제하는 컨트롤이 없다. 표는 슬래시 메뉴(`/표`)로 2x2 크기만 삽입할 수 있어, 그 이후 행·열을 늘리거나 줄일 방법이 아예 없는 상태다 — TipTap의 `@tiptap/extension-table`은 `addRowBefore`/`addRowAfter`/`deleteRow`/`addColumnBefore`/`addColumnAfter`/`deleteColumn` 커맨드를 이미 제공하므로, `TableControls`에 버튼만 추가하면 된다.

## 수용 기준 (Acceptance Criteria)
- [ ] 커서가 표 안에 있을 때(`editor.isActive("table")`) `TableControls`에 행 추가(위/아래)·행 삭제·열 추가(왼쪽/오른쪽)·열 삭제 버튼이 노출된다.
- [ ] 각 버튼은 TipTap이 제공하는 해당 커맨드(`addRowBefore`/`addRowAfter`/`deleteRow`/`addColumnBefore`/`addColumnAfter`/`deleteColumn`)를 그대로 호출한다 — 커맨드 자체를 재구현하지 않는다.
- [ ] 각 버튼은 기존 "셀 병합"/"셀 분할"과 동일하게 `editor.can()`으로 확인해 커맨드를 실행할 수 없는 상태(표 밖 등)에서는 비활성화한다. 다만 "마지막 한 행/열 삭제" 경계는 prosemirror-tables 자체의 `can()` 구현이 검사하지 않는 것으로 실측 확인됐다(범위 밖 — 라이브러리 한계, 아래 참고) — 이 경계에서 버튼은 계속 활성 상태로 남지만, 실제 클릭 시 라이브러리가 트랜잭션을 디스패치하지 않아 조용히 아무 일도 일어나지 않는다(표가 깨지지 않음).
- [ ] 표 밖에 커서가 있을 때는 기존과 동일하게 `TableControls` 전체가 렌더링되지 않는다.

## 결정이 필요한 사항
없음 — TipTap 표 확장이 이미 제공하는 표준 커맨드를 그대로 노출하는 UI 작업이라 별도 정책 결정이 필요 없다.

## 범위 밖
- 표 컬럼 리사이즈 활성화(P1-7b) — 별도 PRD 항목.
- 표 자체를 삭제하는 컨트롤(`deleteTable`) — PRD 항목이 "행/열"만 명시하고 있어 범위 밖으로 둔다. 필요해지면 별도로 추가한다.
- 헤더 행/열 토글(`toggleHeaderRow`/`toggleHeaderColumn`) — 범위 밖.
