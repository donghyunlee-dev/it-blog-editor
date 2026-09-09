# P7-7: 문서 편집 화면 브레드크럼 — 구현 계획

## Global Constraints
- 새 API를 만들지 않는다 — 기존 `getDocumentDetail`/`listFolders`를 조합해 서버 컴포넌트(`page.tsx`)에서 폴더 경로를 미리 계산해 내려준다(클라이언트가 별도로 폴더 트리를 다시 조회하지 않는다).
- 폴더가 없는 문서(대부분)는 이 기능과 관련된 추가 Confluence 조회 자체를 건너뛴다 — `document.folderId`가 `null`이면 `findPersonalFolder`/`listFolders` 호출 자체를 하지 않는다.
- 폴더 전용 상세 화면을 새로 만들지 않는다 — 브레드크럼 클릭은 항상 `/editor?folder={id}`로 이동하고, 이미 있는 사이드바 폴더 트리(P7-4)가 그 쿼리를 읽어 펼치고 스크롤한다.

## Files
- Modify: `src/lib/editor/documents.ts` (`DocumentDetail.folderId` 추가, `getDocumentDetail`이 함께 조회)
- Modify: `src/lib/editor/folders.ts` (`buildFolderPath` 순수 함수 추가)
- Modify: `src/app/editor/[pageId]/page.tsx` (문서 소유자의 폴더 트리로 `folderPath` 계산, `DocumentEditor`에 전달)
- Modify: `src/components/editor/DocumentEditor.tsx` (`folderPath` prop, 헤더에 브레드크럼 렌더링)
- Modify: `src/components/editor/EditorSidebar.tsx` (`?folder={id}` 쿼리를 읽어 조상 폴더를 펼치고 스크롤·강조, 처리 후 `router.replace`로 쿼리 제거)
- Modify: `src/lib/editor/documents.test.ts`, `src/lib/editor/folders.test.ts`, `src/components/editor/DocumentEditor.test.tsx`, `src/components/editor/EditorSidebar.test.tsx`, `src/components/editor/EditorShell.test.tsx`, `src/app/api/editor/documents/[pageId]/share/route.test.ts` (신규 테스트 + `DocumentDetail` 타입 변경에 따른 기존 리터럴 갱신)
- Modify: `vitest.setup.ts` (jsdom에 없는 `Element.prototype.scrollIntoView` 스텁 추가)

## Steps
- [x] **Step 1**: `documents.ts` — `DocumentDetail`에 `folderId: string | null` 추가, `getDocumentDetail`이 `folderId` property를 함께 조회하도록 확장(기존 `fetchDocumentEntry`와 같은 방식).
- [x] **Step 2**: `folders.ts` — `buildFolderPath(folders, folderId)` 순수 함수 추가(조상 체인을 루트 우선 순서로 반환, 없는 값이면 빈 배열).
- [x] **Step 3**: `page.tsx` — `document.folderId`가 있을 때만 `findPersonalFolder(document.ownerEmail)` → `listFolders` → `buildFolderPath`를 호출해 `folderPath`를 계산, `DocumentEditor`에 전달.
- [x] **Step 4**: `DocumentEditor.tsx` — 헤더의 뒤로가기 링크를 `flex-1` 그룹으로 감싸고, `folderPath`가 있으면 그 옆에 브레드크럼(`<nav aria-label="문서 위치">`)을 추가한다. 각 폴더는 `guardNavigate`로 이탈 확인을 거치는 `/editor?folder={id}` 링크다.
- [x] **Step 5**: `EditorSidebar.tsx` — `useSearchParams`로 `folder` 쿼리를 읽어, 대상 폴더의 조상 체인을 전부 펼치고(`expandedFolders` 갱신 + localStorage 저장), 해당 행으로 스크롤 후 1.6초 하이라이트, 마지막으로 `router.replace("/editor")`로 쿼리를 지운다.
- [x] **Step 6**: 테스트 — `buildFolderPath`(순수 함수), `getDocumentDetail`의 `folderId` 반환, `DocumentEditor`의 브레드크럼 렌더링 조건, `EditorSidebar`의 폴더 펼침·스크롤·쿼리 제거 동작.
- [x] **Step 7**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- documents.test.ts folders.test.ts DocumentEditor.test.tsx EditorSidebar.test.tsx`로 검증 가능한 단위로 쪼갠다.
