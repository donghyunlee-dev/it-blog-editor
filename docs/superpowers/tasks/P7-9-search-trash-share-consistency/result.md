# P7-9: 검색·삭제된 문서·공유 문서와의 통합 정합성 — 결과

## 커밋
- `b1d6bf2` feat: 검색·삭제된 문서 복구·공유 문서와 폴더 기능의 정합성 확보 (P7-9)

## 변경 파일
- `src/lib/editor/documents.ts` — `reconcileFolderAfterRestore(pageId, accountFolderId)` 추가. 문서의 `folderId` property를 읽어, 그 값이 `null`이 아니면 계정의 현재 폴더 트리(`listFolders`)에 실제로 존재하는지 확인하고, 존재하지 않으면 `deletePageProperty`로 지운다(미분류로 되돌림). 폴더가 그대로 있거나 애초에 미분류였으면 아무것도 하지 않는다.
- `src/lib/editor/deleted-documents.ts` — `restoreDocument`가 `movePage` 성공 뒤(그리고 `hidePageFromOthers` 직후) `reconcileFolderAfterRestore`를 호출한다. 이것으로 "휴지통에 있는 동안 소속 폴더가 삭제됐을 수 있다"는 갭이 복구 시점에 자동으로 보정된다.
- `src/lib/editor/deleted-documents.test.ts` — 신규 테스트 3개: 폴더가 그대로 있으면 건드리지 않음, 폴더가 삭제됐으면 `deletePageProperty("doc-1", "folderId")` 호출, 애초에 미분류였으면 아무것도 안 함. 기존 테스트용 `stubGetPageProperty` 헬퍼에 `folderId`/`folderIndex` 옵션을 추가했다(기존 테스트는 두 옵션 다 생략해 회귀 없음).
- `src/components/editor/GlobalSearchModal.tsx` — `folders?: FolderNode[]` prop 추가, `buildFolderPath`(P7-7에서 만든 순수 함수)로 각 검색 결과의 폴더 경로("업무/하위")를 계산하는 `folderLabel()` 헬퍼를 추가하고, 결과 목록 행(제목 옆)과 미리보기 패널(제목 아래)에 렌더링한다. 폴더가 없는 문서(대부분)는 기존과 동일하다.
- `src/components/editor/EditorShell.tsx` — `<GlobalSearchModal folders={folders} />`로 이미 갖고 있던 `folders` prop을 그대로 전달.
- `src/components/editor/GlobalSearchModal.test.tsx` — 신규 테스트 2개: `folders`가 주어지고 문서에 `folderId`가 있으면 목록·미리보기 양쪽에 경로가 보임, `folderId`가 없으면 안 보임.
- `src/components/editor/EditorSidebar.test.tsx` — 신규 회귀 테스트 1개: 공유받은 문서가 `folderId`를 갖고 있어도(소유자 쪽 배정일 뿐) 사이드바 폴더 트리 안에는 나타나지 않고 "공유받은 문서" 영역에만 있다.

## 자체 검토
- **긍정**: 세 항목 모두 새 API·새 컴포넌트 없이 P7-3/P7-7이 이미 만든 산출물(`folderId` 필드, `buildFolderPath`, `setDocumentFolder`가 확립한 `deletePageProperty` 패턴)을 조합해 끝났다. 특히 삭제된 문서 복구 갭은 실제 코드를 추적해 찾아낸 진짜 버그였다 — `reassignDocumentsFolder`가 `listChildPages`(활성 문서만)를 훑는다는 걸 확인하지 않았다면 놓쳤을 것이다.
- **주의사항**: `reconcileFolderAfterRestore`는 폴더가 삭제됐을 때 "미분류로 되돌린다"만 하고, "삭제된 폴더의 부모로 승격시킨다"(일반 폴더 삭제 시의 정책, `deleteFolder`/`reassignDocumentsFolder`)까지는 하지 않는다 — 휴지통에 있던 문서 하나하나가 어느 조상까지 함께 사라졌는지 재구성하려면 그 시점의 폴더 트리 스냅샷이 필요한데 갖고 있지 않아, 가장 안전한 기본값(미분류)으로 정했다(task.md "결정이 필요한 사항" 참고).
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 세 시나리오(검색 결과 폴더 경로, 복구 시 정합성, 공유 문서 독립성) 모두 수동 검증하지 못했다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트로만 검증했다.

## 산출물
- `docs/superpowers/tasks/P7-9-search-trash-share-consistency/{task,plan,result,test}.md`
