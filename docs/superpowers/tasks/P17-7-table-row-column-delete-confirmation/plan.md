# P17-7: 표 행/열 삭제 확인 절차 일관성 — 구현 계획

## Global Constraints
- 사용자가 "즉시 실행 유지"를 선택했으므로 `RichTextEditor.tsx`의 행/열 삭제 핸들러는
  건드리지 않는다 — 이 작업은 코드 변경이 아니라 재검토 결론을 문서화하는 것이다.

## Files
- Modify: `docs/product/prd.md` (P17-7 항목 완료 표시 + 재검토 결론 기록)
- Create: `docs/superpowers/tasks/P17-7-table-row-column-delete-confirmation/{task,plan,result,test}.md`

## Steps
- [x] **Step 1**: 코드 확인 — `TableToolbar`의 행/열 삭제 vs 표 전체 삭제 처리 방식
      차이를 정확히 파악한다.
- [x] **Step 2**: 사용자에게 "행/열 삭제도 Modal 확인을 거칠지" 직접 확인한다
      (AskUserQuestion, 3개 선택지 + 추천안).
- [x] **Step 3**: 결정("즉시 실행 유지")에 따라 재검토 결론과 근거를 task.md/result.md
      에 기록한다.
- [x] **Step 4**: 기존 표 삭제 관련 테스트(`RichTextEditor.test.tsx`의 "표 행/열
      컨트롤(P1-7a)"/"표 삭제(P2-4)")가 이 결론과 어긋나지 않는지 재확인한다(코드
      변경이 없으므로 새 테스트는 추가하지 않는다).
- [x] **Step 5**: `docs/product/prd.md`의 P17-7 체크리스트 항목을 완료로 표시하고
      재검토 결론을 반영한다.
