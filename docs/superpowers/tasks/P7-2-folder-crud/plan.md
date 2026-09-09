# P7-2: 폴더 CRUD 도메인 함수·API — 구현 계획

## Global Constraints
- `createFolder`/`deleteFolder`(P7-1)의 기존 동작·시그니처는 하위 호환을 유지한다 —
  이름 중복 검증을 `createFolder`에 추가하는 것 외에는 바꾸지 않는다.
- API 라우트는 `documents/route.ts`의 관례(GET은 빈 값 반환, mutating 메서드는
  `NotFoundError`)를 그대로 따른다.

## Files
- Modify: `src/lib/editor/folders.ts`, `.test.ts`
- Create: `src/app/api/editor/folders/route.ts`, `.test.ts`
- Create: `src/app/api/editor/folders/[folderId]/route.ts`, `.test.ts`
- Modify: `docs/product/api-spec.md`

## Steps
- [ ] **Step 1**: `folders.ts`에 이름 중복 검증 헬퍼(`assertNoSiblingWithSameName`)를
  추가하고 `createFolder`에 적용한다.
- [ ] **Step 2**: `renameFolder(accountFolderId, folderId, name)`을 추가한다 — 존재 검증,
  이름 검증, 자기 자신을 제외한 형제 중복 검증, 업데이트.
- [ ] **Step 3**: `deleteFolder`를 확장해, 삭제 대상의 직속 자식(`parentId === folderId`)을
  삭제 대상의 `parentId`로 재배정한 뒤 대상 자체를 제거하는 것을 한 번의
  `upsertPageProperty`로 반영한다.
- [ ] **Step 4**: `folders.test.ts`에 새 케이스 추가 후 `npx vitest run
  src/lib/editor/folders.test.ts`로 확인.
- [ ] **Step 5**: `src/app/api/editor/folders/route.ts`(GET/POST)와
  `src/app/api/editor/folders/[folderId]/route.ts`(PUT/DELETE)를 추가하고 각각 테스트를
  작성한다(`documents/route.ts`/`documents/[pageId]/route.ts` 테스트 관례 그대로).
- [ ] **Step 6**: `api-spec.md`에 네 엔드포인트를 문서화한다.
- [ ] **Step 7**: 전체 스위트·lint·tsc·build 재확인, 실제 Confluence 인스턴스로 end-to-end
  검증(생성→이름변경→하위 폴더 있는 상태로 삭제→승격 확인→정리).
