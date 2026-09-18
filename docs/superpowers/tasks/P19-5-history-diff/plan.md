# P19-5: 이력 diff — 구현 계획

## Global Constraints
- 읽기 전용 유지(P1-2a) — 이 작업도 보기 기능만 추가한다.
- diff는 순수 텍스트 기준(task.md 결정)으로, 리치 텍스트 구조 비교는 하지 않는다.
- 버전이 많은 문서에서 과거 본문을 전부 미리 가져오지 않는다 — 목록은 서버 프리페치(P19-1)
  그대로 두고, diff만 펼칠 때 클라이언트에서 온디맨드로 조회한다.

## Files
- Add dependency: `diff`(jsdiff) — 순수 텍스트 word diff 계산.
- Modify: `src/lib/confluence/client.ts` — `getHistoricalPageBody(pageId, version)` 추가
  (v1 레거시 content API로 과거 버전 storage HTML 조회).
- Modify: `src/lib/editor/documents.ts` — `storageHtmlToPlainText`(HTML→순수 텍스트),
  `VersionDiffPart` 타입, `getVersionDiff(pageId, versionNumber)` 추가.
- Create: `src/app/api/editor/documents/[pageId]/versions/[version]/diff/route.ts` — GET,
  `requireDocumentAccess` 후 `getVersionDiff` 호출.
- Modify: `src/components/editor/VersionHistoryPage.tsx` — `"use client"`로 전환, 버전
  행마다 "변경 내용 보기" 토글 + 온디맨드 fetch + 결과 캐시(같은 버전 재조회 방지).
- Modify: `src/app/editor/history/[pageId]/page.tsx` — `VersionHistoryPage`에 `pageId` prop
  전달.
- Modify: `src/lib/editor/documents.test.ts`, `src/components/editor/VersionHistoryPage.test.tsx`
  — 신규 테스트.

## Steps
- [x] **Step 1**: `npm install diff` — 실제 레지스트리 접근 확인 후 설치(`@types/diff`는
      diff v9가 자체 타입을 포함해 불필요 — 설치 후 제거).
- [x] **Step 2**: `client.ts`에 `getHistoricalPageBody` 추가 — 실제 Confluence API로
      과거 버전 본문이 실제로 오는지 확인(스크립트, `test.md` 참고).
- [x] **Step 3**: `documents.ts`에 `storageHtmlToPlainText`/`VersionDiffPart`/
      `getVersionDiff` 추가.
- [x] **Step 4**: diff API 라우트 작성.
- [x] **Step 5**: `VersionHistoryPage.tsx` 클라이언트 전환 + UI, `page.tsx` prop 전달.
- [x] **Step 6**: 관련 테스트 작성, `npx vitest run <바뀐 파일들>`.
- [x] **Step 7**: 실제 Confluence 인스턴스로 `getVersionDiff` 왕복 검증(스크립트).
- [x] **Step 8**: `npx eslint`, `npm run build`.
