# P6-4: 공유받은 문서 인덱스 기록

## 배경
Phase 6(페이지 공유)의 항목. `docs/product/prd.md` 체크리스트 P6-4. P6-1(`docs/superpowers/
tasks/P6-1-sharing-data-model/task.md`)에서 의도적으로 범위를 나눠뒀던 부분 — `shareDocument`/
`unshareDocument`가 문서의 `sharingMeta.sharedWith`만 바꾸고, 공유 대상 계정 폴더의
`sharedDocumentRefs`(P1-2b `deletedDocuments`와 같은 패턴)는 건드리지 않았다. 이번 작업이
그 나머지 절반을 채운다 — 공유 추가/해제 시 두 property가 항상 같이 갱신되도록 한다.

P6-2·P6-3(계정 검색·공유 팝업)이 아직 사용자 요청 대기 중이라 실제 "공유하기" 진입점(UI)은
없다. 이번 항목은 `shareDocument`/`unshareDocument`(도메인 함수)가 두 property를 함께
갱신하도록 만드는 것까지이고, API 라우트·UI는 P6-3에서 이 함수를 그대로 호출하기만 하면
된다.

## 수용 기준 (Acceptance Criteria)
- [ ] `shareDocument(pageId, target, document)`— `target`(공유 대상 이메일·계정 폴더 ID),
      `document`(문서 소유자 이메일·표시 제목)를 받아 문서의 `sharingMeta.sharedWith`에
      이메일을 추가하는 동시에, 대상 계정 폴더의 `sharedDocumentRefs`에
      `{pageId, ownerEmail, documentTitle, sharedAt}` 항목을 추가한다.
- [ ] `unshareDocument(pageId, target)` — `sharedWith`에서 이메일을 제거하는 동시에, 대상
      계정 폴더의 `sharedDocumentRefs`에서 해당 `pageId` 항목을 제거한다.
- [ ] 이미 공유된 대상을 다시 공유해도(idempotent) 중복 추가되지 않고, 원래 공유돼 있지
      않은 대상을 해제해도 에러 없이 그대로 둔다 — P6-1의 기존 idempotent 동작을 유지한다.
- [ ] 같은 문서를 다시 공유(재공유)하면 `sharedDocumentRefs`의 기존 항목을 교체한다(중복
      추가 아님, `documentTitle`이 그 사이 바뀌었을 수 있으므로 최신 값으로 갱신).

## 결정이 필요한 사항
없음 — data-spec.md에 스키마가 이미 합의돼 있고, P6-1의 task.md가 이미 이 항목으로 범위를
넘겨뒀다.

## 범위 밖
- `POST/DELETE /api/editor/documents/{pageId}/share` API 라우트, 공유 버튼/팝업 UI — P6-3
  범위(사용자 요청 시 착수).
- `GET /api/editor/documents/shared`(공유받은 문서 목록 조회 API·사이드바 UI) — P6-5 범위.
