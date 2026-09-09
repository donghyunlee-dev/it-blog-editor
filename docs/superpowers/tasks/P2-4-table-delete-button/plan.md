# P2-4: 표 삭제 버튼 추가 — 구현 계획

## Global Constraints
- 파괴적 동작(표 전체 삭제)은 `window.confirm()`을 쓰지 않고 `@sfood/ui`의 `Modal`로 확인받는다(CLAUDE.md UI 규칙).
- 한 화면에 `Button variant="primary"`는 1개만 둔다는 규칙과 무관 — 이 버튼은 `TableToolbarButton`(내부적으로 `variant="ghost"`)을 그대로 재사용한다.
- `TableToolbar`는 TipTap `NodeView`(`StickyTableView`) 안에서 `ReactRenderer`로 마운트되는 진짜 React 컴포넌트라 `useState`를 그대로 쓸 수 있다(포털이 아니라 DOM에 직접 마운트되므로 `Modal`의 `fixed inset-0` 오버레이도 그대로 전체 화면을 덮는다 — `@sfood/ui`의 `Modal` 구현 확인, 별도 `createPortal` 불필요).
- 기존 아이콘(`TrashIcon`)을 재사용한다 — 행/열 삭제와 같은 휴지통 아이콘을 쓰되 툴바 위치·툴팁 텍스트로 구분한다(기존 주석의 선례와 동일).

## Files
- Modify: `src/components/editor/RichTextEditor.tsx` (`TableToolbar`에 "표 삭제" 버튼 + 확인 Modal 추가)
- Modify: `src/components/editor/RichTextEditor.test.tsx` (새 테스트 추가)

## Steps
- [ ] **Step 1**: `TableToolbar`의 `useEditorState` selector에 `canDeleteTable: currentEditor.can().deleteTable()`을 추가한다.
- [ ] **Step 2**: `TableToolbar` 함수 컴포넌트 내부에 `const [confirmOpen, setConfirmOpen] = useState(false)`를 추가하고, 기존 셀 병합/분할 그룹 뒤에 구분선 + "표 삭제" `TableToolbarButton`(클릭 시 `setConfirmOpen(true)`)을 추가한다.
- [ ] **Step 3**: `DocumentEditor.tsx`의 "문서 삭제" Modal과 동일한 패턴으로 확인 `Modal`을 렌더링한다 — 취소(`variant="secondary"`, `onClose`)/확인(`variant="danger"`, `deleteTable()` 실행 후 모달 닫기) 버튼.
- [ ] **Step 4**: `npm test -- RichTextEditor.test.tsx`로 기존 P1-7a 표 컨트롤 테스트가 깨지지 않는지 확인한다.
- [ ] **Step 5**: 새 테스트 추가 — "표 삭제 버튼 클릭 시 확인 Modal이 뜨고, 확인하면 표가 삭제된다", "확인 Modal에서 취소하면 표가 유지된다", "표가 여러 개일 때 삭제해도 다른 표는 유지된다".
- [ ] **Step 6**: `npm run lint`, `npm run build`로 최종 확인.

각 Step은 `npm test -- RichTextEditor.test.tsx`로 검증 가능한 단위로 쪼갠다.
