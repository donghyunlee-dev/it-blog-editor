# P1-2a: 버전 이력 조회 화면 — 구현 계획

## Global Constraints
- 읽기 전용 — 쓰기(restore) 동작을 만들지 않는다.
- 기존 계층 원칙을 따른다: `confluence/client.ts`(저수준) → `editor/documents.ts`(도메인) → API route → 컴포넌트.
- `requireDocumentOwner`를 반드시 거친다(다른 라우트들과 동일).

## Files
- Modify: `src/lib/confluence/client.ts`, `src/lib/confluence/client.test.ts`
- Modify: `src/lib/editor/documents.ts`, `src/lib/editor/documents.test.ts`
- Create: `src/app/api/editor/documents/[pageId]/versions/route.ts`, `route.test.ts`
- Create: `src/components/editor/VersionHistory.tsx`, `VersionHistory.test.tsx`
- Modify: `src/components/editor/DocumentEditor.tsx`, `DocumentEditor.test.tsx`

## Steps
- [ ] **Step 1**: `client.test.ts`에 실패하는 테스트를 먼저 추가한다 — `listPageVersions`가 `_links.next` 커서를 따라 전체 버전을 모으는지, 최신순(createdAt 내림차순)으로 정렬해 반환하는지.
- [ ] **Step 2**: `client.ts`에 `ConfluencePageVersion` 타입과 `listPageVersions(pageId)`를 추가한다(`listAllSpacePages`와 같은 커서 패턴 재사용).
- [ ] **Step 3**: `documents.test.ts`에 실패하는 테스트를 추가한다 — `getDocumentVersionHistory`가 가장 높은 버전 번호에 `isCurrent: true`를 붙이는지.
- [ ] **Step 4**: `documents.ts`에 `DocumentVersion` 타입과 `getDocumentVersionHistory(pageId)`를 추가한다.
- [ ] **Step 5**: `versions/route.test.ts`를 먼저 작성하고(인증·소유권·성공 경로), `versions/route.ts`(`GET`)를 구현한다 — 기존 `tags/route.ts` 패턴을 그대로 따른다.
- [ ] **Step 6**: `VersionHistory.test.tsx`를 먼저 작성하고(로딩·성공·실패·현재 버전 표시), `VersionHistory.tsx`를 구현한다 — `pageId`를 받아 마운트 시 `fetch`, 목록을 보여준다.
- [ ] **Step 7**: `DocumentEditor.test.tsx`에 "이력 버튼 클릭 시 Modal이 열린다" 테스트를 추가하고, `DocumentEditor.tsx`에 헤더 버튼 + Modal(`<VersionHistory pageId={pageId} />` 포함)을 추가한다.
- [ ] **Step 8**: 각 단계마다 해당 테스트 파일로 개별 검증한 뒤, `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 최종 확인한다.
- [ ] **Step 9**: PRD 갱신, `docs/superpowers/tasks/P1-2a-revision-history-view/{result,test}.md` 작성.
- [ ] **Step 10**: 브랜치 push 후 `gh pr create`로 PR 생성 — 본문에 "실제 Confluence 인스턴스 미검증" 사실을 명시한다(`task.md` 참고).
