# P6-1: 공유 데이터 모델 확장

## 배경
Phase 6(페이지 공유)의 첫 항목. `docs/product/prd.md` 체크리스트 P6-1,
`docs/product/data-spec.md`의 Document `sharingMeta`/AccountFolder `sharedDocumentRefs`
테이블에 스키마가 이미 합의돼 있다. 이번 작업은 그 스키마를 실제로 읽고 쓰는 도메인 함수
(`src/lib/editor/sharing.ts`)를 만드는 것으로, API 라우트나 UI는 포함하지 않는다(그건
P6-3부터). Phase 6의 P6-2·P6-3(계정 검색 연동·공유 팝업)은 사용자가 명시적으로 요청하기
전까지 착수하지 않기로 했으므로(P5-7 correction 참고), 이번 작업은 그 이후 항목이 필요할 때
바로 쓸 수 있는 순수 도메인 계층만 준비한다.

## 수용 기준 (Acceptance Criteria)
- [ ] `getSharingMeta(pageId)`가 문서의 `sharingMeta` property를 읽는다. property가 없으면
      `{ sharedWith: [] }`(하위 호환 기본값)를 반환한다.
- [ ] `shareDocument(pageId, email)`이 `sharedWith`에 이메일을 추가한다. 이미 포함돼 있으면
      중복 추가하지 않는다(idempotent).
- [ ] `unshareDocument(pageId, email)`이 `sharedWith`에서 이메일을 제거한다. 원래 없던
      이메일을 제거해도 에러 없이 그대로 둔다(idempotent).
- [ ] `updateLastEditedBy(pageId, editor)`가 `lastEditedBy`(이메일·이름·수정 시각)를
      갱신하면서 `sharedWith`는 그대로 보존한다(P6-7에서 문서 저장 시 호출할 용도로 미리
      준비 — 이번 항목에서 실제로 연결하지는 않는다).
- [ ] `getSharedDocumentRefs(accountFolderId)`가 계정 폴더의 `sharedDocumentRefs` property를
      읽는다. property가 없으면 빈 배열을 반환한다(P6-5가 이후 사용할 읽기 전용 함수 —
      이번 항목에서는 쓰기 경로를 연결하지 않는다, 아래 "범위 밖" 참고).
- [ ] 위 함수들은 모두 실제 Confluence content property read/write(`getPageProperty`/
      `upsertPageProperty`)를 사용하고, 유닛 테스트로 mock 검증한다.

## 결정이 필요한 사항
없음 — data-spec.md에 스키마가 이미 합의돼 있고, 함수 범위는 PRD 체크리스트(P6-1/P6-4의
항목 분리)를 그대로 따른다.

## 범위 밖
- `sharedWith` 변경 시 대상 계정의 `sharedDocumentRefs`를 함께 갱신하는 것 — PRD 체크리스트가
  이를 P6-4로 별도 분리해뒀다. 이번 항목은 두 property를 각각 읽고 쓰는 순수 함수만 만들고,
  "공유하면 상대방 인덱스에도 기록된다"는 연결은 P6-4에서 한다.
- `POST/DELETE /api/editor/documents/{pageId}/share` API 라우트, 공유 버튼/팝업 UI — P6-3
  범위(사용자 요청 시 착수).
- `requireDocumentOwner` 확장(공유받은 사람도 통과) — P6-6 범위.
- 문서 저장(PUT) 시 `updateLastEditedBy`를 실제로 호출하는 배선, 편집 화면에 마지막 수정자
  표시, 409 응답에 `lastEditedBy` 포함 — P6-7 범위.
