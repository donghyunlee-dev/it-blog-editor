# P7-3: 문서-폴더 배정 API

## 배경
- P7-1(폴더 데이터 모델)·P7-2(폴더 CRUD)가 폴더 트리 자체를 갖췄다. 이 항목은 그 트리에
  실제 문서를 걸어주는 마지막 연결 고리다 — 문서 property에 `folderId`(문서당 최대 1개)를
  추가하고, 새 문서 생성 시 지정·기존 문서 이동을 API로 노출한다.
- **P7-2에서 명시적으로 미뤄둔 의무를 이 항목에서 완성한다**: P7-2의 `deleteFolder`는
  하위 *폴더*만 승격시키고, "문서도 같은 방식으로 승격돼야 한다"는 것을 JSDoc과
  `docs/superpowers/tasks/P7-2-folder-crud/task.md`의 "범위 밖"에 명시적으로 남겨뒀다.
  이제 문서가 `folderId`를 가질 수 있게 됐으니, 폴더 삭제 시 그 폴더에 있던 문서도 상위
  폴더로 승격시키는 오케스트레이션을 완성해 PRD P7-2 수용 기준의 "문서 수 불변"을
  마무리한다.

## 수용 기준 (Acceptance Criteria)
- [x] 문서 property `folderId`(`string | null`, 없으면 `null` — 기존 문서는 전부
      "미분류" 상태로 시작, 별도 마이그레이션 스크립트 없음)가 `documents.ts`에 추가된다.
- [x] `listDocuments`/`searchDocuments`/`listSharedDocuments`가 반환하는
      `DocumentSummary`에 `folderId`가 포함된다.
- [x] `POST /api/editor/documents`(문서 생성)가 선택적 `folderId`를 받는다 — 지정하면
      그 폴더가 실제로 존재하는지 검증(`folders.ts`의 `listFolders` 재사용), 없으면
      `ValidationError`.
- [x] 새 라우트 `PUT /api/editor/documents/{pageId}/folder` — 기존 문서를 다른 폴더로
      옮긴다(`{ folderId: string | null }`, `null`은 "미분류"로 되돌리기). 소유자만
      가능(`requireDocumentOwner`) — 폴더는 소유자 개인의 조직 체계라 공유받은 사람이
      남의 문서를 자기 폴더 구조에 끼워 넣을 수는 없어야 한다는 판단(GitHub Issue 없이
      직접 정함, `requireDocumentOwner`를 삭제 전용으로 좁혔던 P6-6 판단과 같은 결).
- [x] `folders.ts`의 `deleteFolder`가 삭제된 노드(특히 `parentId`)를 반환하도록 바뀐다 —
      호출부가 그 값으로 문서 재배정을 오케스트레이션할 수 있어야 한다.
- [x] `DELETE /api/editor/folders/{folderId}`가 폴더 삭제 후, 그 폴더에 있던 문서를 전부
      삭제된 폴더의 `parentId`로 재배정한다(P7-2에서 미뤄둔 승격 정책의 완성) — 문서
      재배정 로직은 `documents.ts`에 새로 추가하는 `reassignDocumentsFolder`가 맡는다
      (순환 참조를 피하기 위해 `folders.ts`는 문서를 몰라야 한다 — API 라우트 계층에서
      두 도메인 함수를 순서대로 호출해 조율한다).

## 결정이 필요한 사항
없음 — 폴더 배정을 소유자 전용으로 좁힌 것은 P6-6의 기존 판단과 같은 근거의 구현
디테일이라 GitHub Issue 없이 직접 정한다.

## 범위 밖
- 사이드바 폴더 트리 UI(P7-4), 새 폴더 UI(P7-5), 문서 이동 UI(P7-6)는 이번 범위가 아니다
  — 도메인·API 계층까지만.
- 폴더 목록 조회 시 문서 개수를 함께 내려주는 것(사이드바에 "3개 문서" 같은 표시)은
  요청되지 않았다 — 필요해지면 P7-4에서 별도로 다룬다.
