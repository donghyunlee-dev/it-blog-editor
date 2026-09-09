# P7-7: 문서 편집 화면 브레드크럼 — 결과

## 커밋
- `b414797` feat: 문서 편집 화면에 폴더 경로 브레드크럼 추가 (P7-7)
- `f2d5f79` fix: 이전 커밋에 실수로 포함된 .claude/launch.json 삭제 되돌리기(세션 워크트리 특유의 무관한 변경 — 실수로 이번 브랜치에 커밋됐던 것을 되돌렸다. 순 diff는 0)

## 변경 파일
- `src/lib/editor/documents.ts` — `DocumentDetail`에 `folderId: string | null` 추가, `getDocumentDetail`이 `folderId` property를 함께 조회(기존 `fetchDocumentEntry`의 방식과 동일).
- `src/lib/editor/folders.ts` — `buildFolderPath(folders, folderId)` 순수 함수 추가. `folderId`부터 루트까지 조상 체인을 루트 우선 순서로 반환하고, `null`이거나 트리에 없는 값이면 빈 배열을 반환한다(오래된 참조를 예외 없이 흡수).
- `src/app/editor/[pageId]/page.tsx` — `document.folderId && document.ownerEmail`일 때만 `findPersonalFolder(document.ownerEmail)` → `listFolders` → `buildFolderPath`를 호출해 `folderPath`를 계산, `DocumentEditor`에 전달. 폴더가 없는 문서(대부분)는 이 조회 자체를 건너뛴다.
- `src/components/editor/DocumentEditor.tsx` — 헤더의 뒤로가기 링크를 `flex min-w-0 flex-1` 그룹으로 감싸고, `folderPath`가 있으면 그 옆에 `<nav aria-label="문서 위치">` 브레드크럼을 추가한다. 각 폴더 이름은 `guardNavigate`로 이탈 확인을 거치는 `/editor?folder={id}` 링크다. `folderPath` 기본값은 빈 배열이라 대부분의 문서·`mode="create"`에서는 기존 헤더와 완전히 같다.
- `src/components/editor/EditorSidebar.tsx` — `useSearchParams`로 `folder` 쿼리를 읽어, 대상 폴더가 실제로 존재하면 조상 체인 전부를 펼치고(`expandedFolders` 갱신 + localStorage 저장), 해당 폴더 행(`id="sidebar-folder-{id}"`)으로 스크롤한 뒤 1.6초 동안 `bg-brand/10`로 강조하고, `router.replace("/editor")`로 쿼리를 지운다. 대상이 없으면(삭제된 폴더의 오래된 링크 등) 조용히 무시한다.
- `vitest.setup.ts` — jsdom에 없는 `Element.prototype.scrollIntoView`를 no-op으로 스텁(기존 `matchMedia` 스텁과 같은 이유).
- 테스트: `src/lib/editor/folders.test.ts`(`buildFolderPath` 4개), `src/lib/editor/documents.test.ts`(`getDocumentDetail`의 `folderId` 반환), `src/components/editor/DocumentEditor.test.tsx`(브레드크럼 렌더링 조건 4개), `src/components/editor/EditorSidebar.test.tsx`(도착 시 펼침·스크롤·쿼리 제거 3개), `src/components/editor/EditorShell.test.tsx`/`src/app/api/editor/documents/[pageId]/share/route.test.ts`(타입 변경에 따른 기존 모킹/리터럴 갱신).

## 자체 검토
- **긍정**: 새 API·새 화면 없이 기존 P7-3(`setDocumentFolder`/`FOLDER_PROPERTY_KEY`)·P7-4(사이드바 트리)의 산출물을 조합만 해서 완성했다. 폴더가 없는 문서(대부분)는 추가 Confluence 조회가 전혀 없어 회귀 위험이 낮다.
- **주의사항**: 브레드크럼이 항상 **문서 소유자**의 폴더 트리 기준이라는 점 — 공유받은 사람이 문서를 열어도 자기 폴더가 아니라 소유자의 폴더 경로가 보인다(P7-3이 애초에 "폴더는 소유자 개인의 조직 체계"로 설계했으므로 일관된 동작이지만, 처음 보면 헷갈릴 수 있어 task.md에 명시적으로 적어뒀다).
- **버그를 하나 만들었다가 테스트로 잡음**: `EditorSidebar.test.tsx`의 `next/navigation` 모킹이 `useRouter()`를 호출마다 새 객체 리터럴로 반환하고 있었는데, 실제 Next.js의 `useRouter()`는 `useMemo`로 감싸 항상 같은 참조를 반환한다(`node_modules/next/dist/client/components/navigation.js` 확인). 이번에 추가한 effect가 `router`를 의존성 배열에 넣자, 테스트 모킹의 이 불안정한 참조 때문에 렌더마다 effect가 재실행 → setState → 재렌더로 이어지는 무한 루프가 생겨 테스트가 타임아웃났다. 원인을 실제 Next 소스로 확인한 뒤, 프로덕션 코드가 아니라 **테스트 모킹**을 고쳤다(`router` 객체 자체를 `vi.hoisted`로 한 번만 생성해 항상 같은 참조를 돌려주도록). 실제 앱 코드에는 문제가 없었다.
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 "브레드크럼 클릭 → 사이드바 스크롤·강조" 흐름을 수동 검증하지 못했다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트(단위/컴포넌트)로만 검증했다.

## 산출물
- `docs/superpowers/tasks/P7-7-editor-breadcrumb/{task,plan,result,test}.md`
