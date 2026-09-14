# P16-1: 삭제된 문서 전용 페이지 — 결과

## 커밋
- `61a69d9` feat: "삭제된 문서"를 팝업 대신 전용 페이지로 전환 + 상세 정보 표시 (P16-1)

## 변경 파일
- `src/lib/editor/documents.ts`
  - `DeletedDocumentEntry`에 `tags: string[]`, `isPublished: boolean`,
    `folderId: string | null`을 추가했다.
  - `recordDeletedDocument(pageId, title, tags, isPublished, folderId)`로 시그니처를
    확장했다.
  - `deleteDocument()`가 `deletePage()` 호출 직전(페이지가 아직 실제로 존재하는 마지막
    시점)에 `getTags`·`publishMetadata` property·`folderId` property를 기존
    `sourceDocument` 조회와 `Promise.all`로 묶어 함께 읽고 `recordDeletedDocument`에
    전달한다. 셋 중 하나라도 실패하면(예: 네트워크 오류) 기존과 동일하게 전체 기록을
    건너뛰고 로그만 남긴다(삭제 자체는 계속 진행) — 실패 허용 범위를 넓히지 않았다.
- `src/lib/editor/deleted-documents.ts`
  - `listDeletedDocuments`가 계정의 `listFolders()`도 함께 조회해 `folderId → name` 맵을
    만들고, 각 항목에 `folderName`(현재 트리에서 찾은 이름, 없으면 `null`)을 얹은
    `DeletedDocumentSummary[]`를 반환하도록 바꿨다.
  - `tags`/`isPublished`/`folderId`가 없는(이 변경 이전에 기록된) 옛 항목은 기본값(빈
    배열/`false`/`null`)으로 보정한다.
- `src/app/editor/trash/page.tsx`(신규) — 세션 확인 후 `listDeletedDocuments(email)`을
  서버에서 조회해 `DeletedDocumentsPage`에 `initialDocuments`로 내려준다(다른 `/editor/*`
  페이지와 같은 패턴 — 클라이언트 마운트 후 fetch하지 않는다).
- `src/components/editor/DeletedDocumentsPage.tsx`(신규, `DeletedDocumentsModal.tsx` 대체)
  - 상단 검색 입력(제목·태그, 사이드바 검색과 같은 로직), 하단 목록.
  - 각 행에 `StatusIcon`(게시 상태), 제목, 삭제일시·원래 폴더(`folderName ?? "미분류"`),
    `Tag` chips(태그), 복구 버튼을 보여준다.
  - 복구 성공 시 로컬 상태에서 제거 + Toast + `router.refresh()`(사이드바 갱신).
- `src/components/editor/EditorSidebar.tsx`
  - `deletedDocsOpen` state, `DeletedDocumentsModal` import·`Modal` 렌더를 제거했다.
  - "삭제된 문서" 트리거를 `<button onClick={... Modal 열기}>`에서 `/editor/trash`로 가는
    `<Link>`(다른 nav 링크와 같은 `guardNavigate` 패턴, `aria-current`로 활성 표시)로
    바꿨다.
- 삭제: `src/components/editor/DeletedDocumentsModal.tsx`,
  `src/components/editor/DeletedDocumentsModal.test.tsx`.
- 신규: `src/components/editor/DeletedDocumentsPage.test.tsx` — 목록/검색/복구 성공·실패·
  상세 정보(게시 상태·태그·폴더) 표시를 검증.
- `src/lib/editor/documents.test.ts`, `src/lib/editor/deleted-documents.test.ts`,
  `src/app/api/editor/documents/deleted/route.test.ts`, `EditorSidebar.test.tsx` — 새
  필드·동작에 맞춰 갱신.
- `docs/product/design.md`, `docs/product/prd.md` — P16-1 경위·결정 사항을 갱신했다
  (Modal→페이지 전환 이유, 삭제 시점 스냅샷 근거, Phase 16 체크리스트 신규 추가).

## 자체 검토
- **긍정**: 복구(`restoreDocument`) 로직 자체는 전혀 건드리지 않았다 — 폴더 복원 정책(P7-9)이
  이미 페이지의 `folderId` property를 그대로 신뢰하는 구조라, 이번에 추가한 스냅샷은 순수하게
  "화면에 더 보여주기 위한 것"이지 복구 동작에 관여하지 않는다(관심사 분리가 자연스럽게
  유지됨).
- **주의사항**: `deleteDocument()`가 이제 삭제 시점에 3번의 추가 조회(태그·게시·폴더)를
  한다 — 기존에도 `sourceDocument` 조회가 있었으니 순서상 하나 더 늘어난 것은 아니고
  `Promise.all`로 병렬화했지만, Confluence API 호출 횟수 자체는 늘었다. 삭제는 사용자
  상호작용당 1회뿐이라 성능에 실질적 영향은 없다고 판단했다.
- **우려사항**: 폴더 이름을 조회 시점에 다시 찾는 방식(`folderName`)은 삭제된 문서 목록을
  볼 때마다 그 계정의 전체 폴더 트리를 한 번 더 조회한다는 뜻이다 — 폴더 개수가 아주 많은
  계정이면(현재는 아무도 그렇지 않다) 약간의 추가 비용이지만, 페이지당 1회 조회이고 이미
  `findPersonalFolder`/`listDeletedDocuments`도 매번 하는 조회 패턴이라 새로운 종류의
  비용은 아니다.

## 산출물
- `docs/superpowers/tasks/P16-1-deleted-documents-page/{task,plan,result,test}.md`
- `src/lib/editor/documents.ts`, `documents.test.ts`
- `src/lib/editor/deleted-documents.ts`, `deleted-documents.test.ts`
- `src/app/editor/trash/page.tsx`
- `src/components/editor/DeletedDocumentsPage.tsx`, `DeletedDocumentsPage.test.tsx`
- `src/components/editor/EditorSidebar.tsx`, `EditorSidebar.test.tsx`
- `src/app/api/editor/documents/deleted/route.test.ts`
- `docs/product/design.md`, `docs/product/prd.md`
