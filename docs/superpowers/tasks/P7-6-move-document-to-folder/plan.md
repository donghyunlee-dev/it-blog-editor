# P7-6: 문서를 폴더로 이동하는 UI — 구현 계획

## Global Constraints
- 새 API를 만들지 않는다 — P7-3에서 이미 만든 `PUT /api/editor/documents/{pageId}/folder`(`{ folderId: string | null }`, 소유자 전용)를 그대로 쓴다.
- 새 컴포넌트(`MoveDocumentModal.tsx`)는 `FolderFormModal.tsx`와 같은 `Modal`+`FormField`+`useToast` 골격을 그대로 따르되, 이름 입력 대신 대상 폴더 `Select`를 쓴다. 이 컴포넌트도 호출부(`EditorSidebar.tsx`)가 대상 문서가 바뀔 때마다 새로 마운트하므로, `FolderFormModal.tsx`와 같은 이유로 `useEffect` 없이 `useState` 초기값만으로 충분하다.
- 문서 행(`renderDocumentRow`)의 "이동" 액션 버튼은 P7-5가 `renderFolderNode`에 적용한 hover/focus-reveal 패턴(`group` + `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`)을 그대로 재사용한다.
- 대상 폴더 `<select>` 옵션의 계층 표시는 전각 공백("　", U+3000)을 깊이만큼 반복해 앞에 붙인다 — 일반 ASCII 공백은 브라우저가 `<option>` 렌더링 시 접어버릴 수 있어 쓰지 않는다.

## Files
- Create: `src/components/editor/MoveDocumentModal.tsx`
- Create: `src/components/editor/MoveDocumentModal.test.tsx`
- Modify: `src/components/editor/EditorSidebar.tsx` (이동 버튼·상태·폴더 flat 목록·모달 렌더링 추가)
- Modify: `src/components/editor/EditorSidebar.test.tsx` (신규 describe 블록)

## Steps
- [x] **Step 1**: `MoveDocumentModal.tsx` — `document`/`folderOptions`/`onSaved` props, `Select`로 대상 폴더 선택, 저장 시 `PUT /api/editor/documents/{pageId}/folder`.
- [x] **Step 2**: `EditorSidebar.tsx`에 폴더 트리를 부모→자식 순서로 평평하게 편 `flatFolderOptions`(useMemo)를 추가한다.
- [x] **Step 3**: `renderDocumentRow`를 `<Link>` 단독 렌더링에서 `<li className="group ...">` 안에 `<Link className="flex-1">` + hover-reveal "이동" `<button>`을 나란히 두는 구조로 재구성한다(중첩 인터랙티브 엘리먼트를 피하기 위해 `<Link>` 밖으로 버튼을 뺀다). 폴더가 하나도 없으면 버튼을 숨긴다.
- [x] **Step 4**: `moveDocumentTarget` 상태와 `MoveDocumentModal` 렌더링을 `EditorSidebar.tsx` 하단(기존 `FolderFormModal` 옆)에 추가한다.
- [x] **Step 5**: `MoveDocumentModal.test.tsx` — 초기 선택값(미분류/현재 폴더), 저장 시 올바른 payload, 성공/실패 Toast, 들여쓴 옵션 라벨을 검증한다.
- [x] **Step 6**: `EditorSidebar.test.tsx` — 이동 버튼 노출 조건(폴더 있음/없음), 모달 오픈, 저장 시 API 호출·`router.refresh()`를 검증한다.
- [x] **Step 7**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- EditorSidebar.test.tsx MoveDocumentModal.test.tsx`로 검증 가능한 단위로 쪼갠다.
