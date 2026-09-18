# P19-4: 이력에 작성자 표시 — 구현 계획

## Global Constraints
- Confluence `version.authorId`는 쓰지 않는다(서비스 계정 고정값). `version.message`만
  저장자 식별에 쓴다.
- 기존 저장 흐름(낙관적 동시성 검사, `sourceDocument` property 갱신 순서)은 그대로 둔다 —
  `updatePage` 호출에 `message` 필드만 추가한다.

## Files
- Modify: `src/lib/confluence/client.ts` — `updatePage`에 `message?: string` 추가, 항상
  `version.message`로 보낸다(없으면 빈 문자열).
- Modify: `src/lib/editor/documents.ts` — `updateDocument`가 `updatePage` 호출 시
  `formatAccountLabel(input.editor.email, input.editor.name)`를 `message`로 전달.
  `DocumentVersion`에 `author: string | null` 추가, `getDocumentVersionHistory`가
  `version.message`를 매핑(빈 문자열은 `null`).
- Modify: `src/components/editor/VersionHistoryPage.tsx` — 각 버전 행에 작성자(또는 "작성자
  정보 없음") 표시.
- Modify: `src/lib/editor/documents.test.ts` — `updateDocument`가 `updatePage`에 `message`를
  전달하는지 기존 테스트에 assertion 추가, `getDocumentVersionHistory` 신규 테스트.
- Modify: `src/components/editor/VersionHistoryPage.test.tsx` — 작성자 표시/미표시 케이스 추가.
- Modify: `src/app/api/editor/documents/[pageId]/versions/route.test.ts` — `DocumentVersion`
  타입에 `author` 필드가 추가되며 깨지는 mock 데이터 보정.

## Steps
- [x] **Step 1**: `client.ts`의 `updatePage`에 `message` 파라미터 추가.
- [x] **Step 2**: `documents.ts`의 `updateDocument`/`DocumentVersion`/
      `getDocumentVersionHistory` 수정.
- [x] **Step 3**: `VersionHistoryPage.tsx`에 작성자 표시 추가.
- [x] **Step 4**: 관련 테스트 전부 갱신·추가, `npx vitest run <바뀐 파일들>`.
- [x] **Step 5**: `npx eslint`, `npm run build`.
