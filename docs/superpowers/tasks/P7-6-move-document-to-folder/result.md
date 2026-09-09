# P7-6: 문서를 폴더로 이동하는 UI — 결과

## 커밋
- `687ed3c` feat: 문서를 다른 폴더로 이동하는 UI 추가 (P7-6)

## 변경 파일
- `src/components/editor/MoveDocumentModal.tsx` (신규) — 대상 폴더를 고르는 Modal. `document`(대상 문서)·`folderOptions`(들여쓴 flat 목록)·`onSaved`를 props로 받는다. `FolderFormModal.tsx`와 동일하게 `useState` 초기값만으로 대상 문서가 바뀔 때의 재마운트를 처리하고(별도 `useEffect` 동기화 없음), 저장 시 `PUT /api/editor/documents/{pageId}/folder`를 `{ folderId: string | null }` 바디로 호출한다.
- `src/components/editor/MoveDocumentModal.test.tsx` (신규) — 6개 테스트: 제목/초기 선택값(미분류·현재 폴더), 저장 payload(폴더 선택/미분류 되돌리기), 성공/실패 Toast, 하위 폴더 들여쓰기 라벨.
- `src/components/editor/EditorSidebar.tsx` (수정):
  - `MoveToFolderIcon` 아이콘 추가(나머지 아이콘과 같은 손그림 SVG 스타일).
  - `flatFolderOptions`(useMemo) — 폴더 트리를 부모→자식 순서로 평평하게 펴고, 깊이만큼 전각 공백("　")을 이름 앞에 붙인다.
  - `moveDocumentTarget` 상태와 `<MoveDocumentModal>` 렌더링(기존 `FolderFormModal` 옆).
  - `renderDocumentRow`를 `<Link>` 단독 렌더링에서 `<li className="group ...">` 안에 `<Link className="flex-1">` + hover/focus-reveal "이동" `<button>`을 나란히 두는 구조로 재구성(중첩 인터랙티브 엘리먼트 회피). `flatFolderOptions.length === 0`이면(계정에 폴더가 전혀 없음) 버튼 자체를 렌더링하지 않아 기존 "폴더 없는 계정은 그대로" 원칙(P7-4/P7-5)을 유지한다.
- `src/components/editor/EditorSidebar.test.tsx` (수정) — 신규 describe 블록 `"EditorSidebar 문서를 폴더로 이동(P7-6)"`(7개 테스트): 이동 버튼 노출 조건(폴더 있음/없음), 모달 오픈 시 옵션 목록(들여쓴 하위 폴더 포함), 저장 시 API 호출·Toast·`router.refresh()`, 미분류로 되돌리기, 실패 Toast.

## 자체 검토
- **긍정**: P7-3(API)·P7-5(UI 패턴) 두 선행 작업의 산출물을 그대로 재사용해 새 서버 코드 없이 순수 프론트엔드 작업으로 끝났다. `flatFolderOptions.length === 0`일 때 버튼을 숨기는 조건 덕분에 폴더 기능을 아직 안 쓰는 계정(대부분의 현재 사용자)은 기존 사이드바와 완전히 동일하게 보인다(회귀 없음).
- **주의사항**: `renderDocumentRow`가 반환하는 `<li>`의 `paddingLeft`가 기존에는 `<Link>`에 있었는데 이번에 `<li>` 자체로 옮겨갔다 — 인라인 스타일 위치가 바뀐 것뿐이라 시각적으로는 동일하다(기존 테스트 중 이 스타일 위치에 의존하는 것은 없어 갱신할 테스트가 없었다).
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저(Confluence 인스턴스)로 "이동" 버튼 클릭 → 모달 → 저장 흐름을 수동 검증하지 못했다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트(단위/컴포넌트)로만 검증했다.

## 산출물
- `docs/superpowers/tasks/P7-6-move-document-to-folder/{task,plan,result,test}.md`
