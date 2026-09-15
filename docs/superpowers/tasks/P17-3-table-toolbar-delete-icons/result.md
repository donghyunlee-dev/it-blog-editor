# P17-3: 표 툴바 삭제 아이콘 구분 — 결과

## 커밋
- `6069ef5` fix: 표 툴바 행/열/표 삭제 아이콘을 시각적으로 구분 (P17-3)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx`
  - `RowDeleteIcon`/`ColumnDeleteIcon` 컴포넌트를 추가했다 — 기존 삽입 아이콘의
    가로줄(행)/세로줄(열) 시각 문법을 그대로 가져와, 그 축을 나타내는 평행한 두 줄
    위에 X를 그어 "삭제"를 표현한다.
  - "행 삭제" 버튼은 `RowDeleteIcon`, "열 삭제" 버튼은 `ColumnDeleteIcon`을 쓰도록
    바꿨다. "표 삭제" 버튼은 기존 `TrashIcon`(범용 휴지통 모양)을 그대로 유지했다 —
    유일하게 확인 Modal을 거치는, 가장 파괴적인 동작이라 "표 전체가 없어진다"는 기존
    표현이 여전히 적절하다고 판단했다.
  - 아이콘 재사용 이유를 설명하던 기존 주석을 새 구조에 맞게 갱신했다.
- `src/components/editor/RichTextEditor.test.tsx` — "행 삭제"·"열 삭제"·"표 삭제" 버튼의
  SVG innerHTML이 서로 다른지 확인하는 테스트를 추가했다.
- `docs/product/prd.md` — Phase 17 P17-3 항목 완료 표시.

## 자체 검토
- **긍정**: 완전히 새로운 아이콘 문법을 만들지 않고, 이미 검증된 "삽입 아이콘의
  가로줄=행/세로줄=열" 문법을 그대로 확장해 일관성을 유지했다. 새 아이콘 라이브러리
  없이 기존 `TableIcon` SVG 관례로만 해결했다.
- **주의사항**: "표 삭제"는 의도적으로 아이콘을 바꾸지 않았다 — 셋 다 다르게 만들기보다,
  "행/열 삭제"라는 유사한 두 동작을 서로 구분하고 "표 삭제"(확인 Modal이 있는 별도
  파괴성 등급)는 기존 범용 휴지통으로 남겨 오히려 "이건 다른 종류의 삭제"라는 신호를
  준다.
- **우려사항**: 없음 — aria-label/Tooltip 등 기존 접근성 동작은 그대로다(테스트로 확인).

## 산출물
- `docs/superpowers/tasks/P17-3-table-toolbar-delete-icons/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
