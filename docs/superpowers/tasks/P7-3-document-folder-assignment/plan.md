# P7-3: 문서-폴더 배정 API — 구현 계획

## Global Constraints
- `folders.ts`는 여전히 문서를 몰라야 한다(순환 참조 방지) — 문서 재배정 오케스트레이션은
  API 라우트에서 두 도메인 함수를 순서대로 호출해 조립한다.
- 기존 `DocumentSummary`/`createDocument` 호출부(테스트 포함)가 깨지지 않도록 `folderId`는
  선택적으로 다루되, 응답에는 항상 포함시킨다(`null` 기본값).

## Files
- Modify: `src/lib/editor/documents.ts`, `.test.ts`
- Modify: `src/lib/editor/folders.ts`, `.test.ts`(`deleteFolder` 반환값 변경)
- Modify: `src/app/api/editor/documents/route.ts`, `.test.ts`(POST에 `folderId` 반영)
- Create: `src/app/api/editor/documents/[pageId]/folder/route.ts`, `.test.ts`
- Modify: `src/app/api/editor/folders/[folderId]/route.ts`, `.test.ts`(DELETE 오케스트레이션)
- Modify: `docs/product/data-spec.md`, `docs/product/api-spec.md`

## Steps
- [x] **Step 1**: `documents.ts`에 `FOLDER_PROPERTY_KEY` 상수, `DocumentSummary.folderId`
  추가, `fetchDocumentEntry`가 그 property를 함께 읽도록 수정.
- [x] **Step 2**: `CreateDocumentInput.folderId?`(선택) 추가, `createDocument`가
  `folders.ts`의 `listFolders`로 존재 검증 후 property를 쓰도록(값이 있을 때만) 수정.
- [x] **Step 3**: `setDocumentFolder(pageId, accountFolderId, folderId)`와
  `reassignDocumentsFolder(accountFolderId, fromFolderId, toFolderId)`를 `documents.ts`에
  추가.
- [x] **Step 4**: `folders.ts`의 `deleteFolder` 반환 타입을 `Promise<FolderNode>`로 바꿔
  삭제된 노드를 반환한다. 기존 테스트의 `await deleteFolder(...)` 호출은 반환값을 안 써도
  되지만, 새 테스트로 반환값을 검증한다.
- [x] **Step 5**: 새 라우트 `documents/[pageId]/folder/route.ts`(PUT) 추가 — 소유자 검증
  후 `setDocumentFolder` 호출.
- [x] **Step 6**: `documents/route.ts`(POST)가 body의 `folderId`를 `createDocument`로
  전달하도록 수정.
- [x] **Step 7**: `folders/[folderId]/route.ts`(DELETE)가 `deleteFolder`의 반환값
  (`parentId`)으로 `reassignDocumentsFolder`를 호출하도록 수정.
- [x] **Step 8**: 각 파일의 테스트를 갱신·추가하고 `npx vitest run`으로 전체 확인.
- [x] **Step 9**: `data-spec.md`(Document 테이블에 `folderId` property)·`api-spec.md`(새
  라우트, 변경된 요청/응답) 갱신.
- [x] **Step 10**: 전체 스위트·lint·tsc·build, 실제 Confluence 인스턴스로 end-to-end
  검증(폴더 지정 생성 → 이동 → 폴더 삭제 시 문서 승격 확인 → 정리).
