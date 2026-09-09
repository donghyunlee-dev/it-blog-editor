# P7-1: 폴더 데이터 모델 확정 — 구현 계획

## Global Constraints
- `src/lib/editor/sharing.ts`의 `getSharedDocumentRefs`/`upsertSharedDocumentRef` 패턴을
  그대로 따른다 — 계정 폴더 property 하나를 통째로 읽고 쓰는 단순한 형태를 유지한다.
- 문서 쪽 property(`sourceDocument` 등)는 전혀 건드리지 않는다.

## Files
- Modify: `docs/product/data-spec.md`
- Create: `src/lib/editor/folders.ts`
- Create: `src/lib/editor/folders.test.ts`

## Steps
- [ ] **Step 1**: `data-spec.md`의 AccountFolder 테이블에 `folderIndex` property 행을
  추가한다(`sharedDocumentRefs` 행 바로 아래).
- [ ] **Step 2**: `folders.ts`에 `FolderNode` 타입, `FOLDER_INDEX_PROPERTY_KEY` 상수,
  `MAX_FOLDER_DEPTH = 5` 상수를 정의한다.
- [ ] **Step 3**: `listFolders(accountFolderId)` 구현 — `getPageProperty` 후 없으면 `[]`.
- [ ] **Step 4**: 깊이 계산 헬퍼(`computeDepth(folders, parentId)`)를 만들고,
  `createFolder`에서 이름 검증 → 부모 존재 검증 → 깊이 검증 → `order` 계산 →
  `randomUUID()`로 id 발급 → `upsertPageProperty` 순서로 구현한다.
- [ ] **Step 5**: `deleteFolder(accountFolderId, folderId)` 구현 — 대상이 없으면
  `NotFoundError`, 있으면 필터링 후 `upsertPageProperty`.
- [ ] **Step 6**: `folders.test.ts` 작성 — `npx vitest run src/lib/editor/folders.test.ts`로
  검증(빈 목록 기본값, 생성 성공, 이름 검증, 부모 없음 검증, 깊이 5단계 초과 검증, order
  자동 계산, 삭제 성공/실패).
- [ ] **Step 7**: 전체 스위트·lint·tsc·build 재확인.
