# P9-2: 콜아웃 아이콘 선택 UI

## 배경
[P9-1](../P9-1-callout-icon-model/task.md)에서 패널 노드에 `icon` attrs와 storage 직렬화를 먼저 갖춘 뒤, 이 항목에서 사용자가 실제로 아이콘을 바꿀 수 있는 UI를 추가한다. `docs/product/prd.md` Phase 9(P9-2) 항목.

## 수용 기준 (Acceptance Criteria)
- [ ] 패널 블록에 `NodeView`(React 컴포넌트)가 생겨, 아이콘 부분을 클릭하면 이모지를 고를 수 있는 팝오버가 열린다(`@sfood/ui`의 `Popover` 재사용 — 글자색/하이라이트 스와치 팝오버와 같은 패턴, `RichTextEditor.tsx`의 `SwatchGrid` 참고).
- [ ] 팝오버 안에는 [Issue #101](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/101)에서 확정된 큐레이션 이모지 목록이 그리드로 표시된다. 클릭하면 해당 패널의 `icon` attrs가 즉시 바뀐다.
- [ ] 패널 색상 테마(정보/경고/노트)는 이 UI로 바꾸지 않는다 — 아이콘만 바꾼다(범위 밖 참고).
- [ ] 키보드로도 패널에 포커스를 옮기고 팝오버를 열 수 있다(기존 서식 버블 메뉴 팝오버와 동일한 접근성 수준 — Tab/Enter로 트리거, Escape로 닫기).
- [ ] 기존 패널 렌더링(본문 내용 편집)이 NodeView 도입 후에도 그대로 동작한다(회귀 없음).

## 결정이 필요한 사항
- [ ] 큐레이션 이모지 목록 구성(개수·항목) — Issue: [#101](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/101)(미해결, 답변 대기 중). **이 항목은 답변을 받기 전까지 착수하지 않는다.**

## 범위 밖
- 이모지 외 아이콘(외부 이미지 업로드 등) — 노션의 `icon.type === "external"/"file"`에 해당, 사용자 확인으로 이번 범위에서 제외.
- 색상 팔레트 자유 선택(콜아웃 배경색 변경) — 이번 요청은 아이콘에 관한 것으로 한정.
- 노션 문서 실제 가져오기/내보내기 — Phase 9 범위 밖(별도 Phase 후보).
