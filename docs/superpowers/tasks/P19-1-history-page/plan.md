# P19-1: 문서 "이력" 페이지 전환 — 구현 계획

## Global Constraints
- 읽기 전용 유지(P1-2a) — 되돌리기 등 쓰기 동작을 추가하지 않는다.
- `requireDocumentAccess`로 소유자·공유받은 사람만 접근 가능해야 한다(공유 안 된 남의
  문서 pageId를 직접 URL로 넣으면 막혀야 함).
- `/editor/trash`(서버 컴포넌트가 데이터를 미리 조회해 `initial*` prop으로 내려주는 패턴)를
  그대로 따른다.

## Files
- Create: `src/app/editor/history/[pageId]/page.tsx` — 서버 컴포넌트, trash/page.tsx와 동일한
  구조(auth 체크 → `requireDocumentAccess` → `getDocumentVersionHistory` → prop으로 전달).
- Create: `src/components/editor/VersionHistoryPage.tsx` — `DeletedDocumentsPage.tsx`와 같은
  레이아웃(제목/부제, `max-w-[830px]`, `EmptyState`, 카드형 리스트)으로 버전 목록을 보여준다.
  `VersionHistory.tsx`의 포맷 함수(`formatVersionTimestamp`)와 렌더링 내용을 그대로 재사용.
- Create: `src/components/editor/VersionHistoryPage.test.tsx` — `VersionHistory.test.tsx`의
  케이스를 서버 prop 기반으로 옮긴다(로딩/에러 상태는 서버 컴포넌트가 이미 fetch를
  끝내므로 없음 — 성공/빈 목록 케이스만).
- Modify: `src/components/editor/EditorSidebar.tsx` — "이력" 메뉴 항목 `onClick`을
  `setHistoryDocumentTarget(document)` 대신 `router.push(`/editor/history/${document.pageId}`)`로
  변경. `historyDocumentTarget` state, 관련 `Modal`, `VersionHistory` import 제거.
- Modify: `src/components/editor/EditorSidebar.test.tsx` — "이력 모달" 관련 테스트를
  "이력 페이지로 이동" 테스트로 교체(`push` mock이 올바른 경로로 호출되는지 확인).
- Delete: `src/components/editor/VersionHistory.tsx`, `src/components/editor/VersionHistory.test.tsx`
  (기능이 `VersionHistoryPage.tsx`로 대체됨 — Modal 전용이었던 클라이언트 fetch 컴포넌트는
  더 이상 쓰이지 않음).
- Modify: `src/components/editor/ShareForm.tsx` — 주석에서 `VersionHistory.tsx`를 예시로 든
  부분을 삭제된 파일 대신 다른 예시(`PublishForm.tsx`)로만 남기도록 수정.
- Keep as-is: `src/app/api/editor/documents/[pageId]/versions/route.ts`,
  `.../versions/route.test.ts`, `src/lib/editor/documents.ts`의 `getDocumentVersionHistory`
  (라우트는 트래시의 `GET .../deleted`처럼 클라이언트에서 안 쓰여도 유지하는 선례를 따름 —
  서버 컴포넌트는 `getDocumentVersionHistory`를 직접 호출).

## Steps
- [ ] **Step 1**: `VersionHistoryPage.tsx` 작성 — `initialVersions: DocumentVersion[]` prop을
      받아 `DeletedDocumentsPage.tsx`와 같은 레이아웃으로 렌더링(제목 "문서 이력", 버전 없음
      시 `EmptyState`, 있으면 카드 리스트). `npx vitest run VersionHistoryPage.test.tsx`.
- [ ] **Step 2**: `src/app/editor/history/[pageId]/page.tsx` 작성 — `trash/page.tsx`와 동일한
      auth/redirect 패턴 + `requireDocumentAccess` + `getDocumentVersionHistory` 호출.
- [ ] **Step 3**: `EditorSidebar.tsx`에서 "이력" 메뉴 항목을 페이지 이동으로 바꾸고 관련 Modal/
      state/import 제거. `EditorSidebar.test.tsx`의 관련 테스트 갱신.
      `npx vitest run EditorSidebar.test.tsx`.
- [ ] **Step 4**: `VersionHistory.tsx`/`VersionHistory.test.tsx` 삭제, `ShareForm.tsx` 주석 정리.
- [ ] **Step 5**: `npx eslint <바뀐 파일들>`, `npm run build`.
