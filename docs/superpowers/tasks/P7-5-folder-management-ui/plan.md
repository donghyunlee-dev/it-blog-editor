# P7-5: 새 폴더 만들기·이름 변경·삭제 UI — 구현 계획

## Global Constraints
- 삭제는 `window.confirm()` 대신 `Modal`을 쓴다(CLAUDE.md 규칙). 취소=`variant="secondary"`, 삭제 확인=`variant="danger"` — `DocumentEditor.tsx`의 "문서 삭제" Modal과 동일한 패턴.
- 새 아이콘(+, 연필, 휴지통)은 `EditorSidebar.tsx`가 이미 쓰는 스타일(`viewBox 0 0 20 20`, `stroke="currentColor"`)로 직접 그린다 — `@sfood/ui`의 `Icon`은 `search`/`comment`만 제공해 대응 요소가 없다(기존 `FolderIcon`/`ChevronIcon` 선례와 동일한 이유).
- 폴더 목록 갱신은 `router.refresh()`(서버 컴포넌트 재조회) 하나로 처리한다 — `DeletedDocumentsModal.tsx`의 `onRestored` 선례와 같은 패턴, 별도 클라이언트 상태 동기화 계층을 만들지 않는다.

## Files
- Create: `src/components/editor/FolderFormModal.tsx` (생성/이름변경 공용 폼)
- Create: `src/components/editor/FolderFormModal.test.tsx`
- Modify: `src/components/editor/EditorSidebar.tsx` (진입점·액션 버튼·삭제 확인 Modal 추가)
- Modify: `src/components/editor/EditorSidebar.test.tsx` (기존 들여쓰기 테스트 갱신, 신규 테스트)

## Steps
- [x] **Step 1**: `FolderFormModal.tsx` — 생성/이름변경 모드를 하나의 폼으로 처리, `AccountInfoModal.tsx`의 FormField+Input+useToast 패턴을 그대로 따른다.
- [x] **Step 2**: `EditorSidebar.tsx`에 폴더 트리 위 "새 폴더" 진입점을 추가한다(폴더 유무와 무관하게 항상 보임).
- [x] **Step 3**: `renderFolderNode`를 토글 버튼 + hover/focus 시 나타나는 액션 버튼 3개(하위 폴더 추가/이름변경/삭제)로 재구성한다. 들여쓰기는 버튼이 아니라 감싸는 행(div)으로 옮긴다.
- [x] **Step 4**: 삭제 확인 `Modal`을 추가하고 `handleDeleteFolder`로 `DELETE /api/editor/folders/{folderId}`를 호출한다.
- [ ] **Step 5**: `FolderFormModal.test.tsx` — 생성/이름변경 각각 올바른 엔드포인트·payload로 호출하는지, 성공/실패 시 Toast가 뜨는지 검증한다.
- [ ] **Step 6**: `EditorSidebar.test.tsx` — 새 폴더 버튼 클릭 시 모달이 뜨는지, 각 폴더 행의 액션 버튼이 올바른 모드로 모달을 여는지, 삭제 확인 흐름(취소/확인)을 검증한다. 기존 들여쓰기 테스트를 새 DOM 구조(버튼이 아니라 감싸는 div가 padding을 가짐)에 맞게 갱신한다.
- [ ] **Step 7**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- EditorSidebar.test.tsx FolderFormModal.test.tsx`로 검증 가능한 단위로 쪼갠다.
