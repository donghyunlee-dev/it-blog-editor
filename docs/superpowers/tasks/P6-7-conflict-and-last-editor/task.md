# P6-7: 동시 편집 충돌 감지 + 마지막 수정자 표시

## 배경
Phase 6(페이지 공유)의 항목. `docs/product/prd.md` 체크리스트 P6-7, `docs/product/api-spec.md`의
`PUT /api/editor/documents/{pageId}`에 이미 "저장 성공 시 `sharingMeta.lastEditedBy` 갱신,
409 응답에 `lastEditedBy` 포함"이 스펙으로 합의돼 있다. P6-1(공유 데이터 모델)에서 만든
`updateLastEditedBy`/`getSharingMeta`를 실제로 문서 저장 경로에 배선하는 작업이다.

P6-3(공유 버튼/팝업)·P6-6(공유 문서 접근 권한 확장)이 아직 없어 현재는 문서 소유자
한 명만 저장할 수 있지만("소유자만" 제약은 그대로 유지), 한 사람이 여러 탭/기기에서 동시에
편집하는 경우에도 이미 유효한 기능이고 P6-6이 나중에 들어오면 별도 배선 없이 그대로
확장된다.

## 수용 기준 (Acceptance Criteria)
- [ ] 문서 저장(`PUT /api/editor/documents/{pageId}`)이 성공하면 `sharingMeta.lastEditedBy`
      가 저장자(이메일·이름·시각)로 갱신된다.
- [ ] 저장 성공 응답(`{ pageId, version }`)에 `lastEditedBy`가 함께 포함된다.
- [ ] 버전 충돌(409)이 발생하면 응답 본문에 `lastEditedBy`가 포함되고, 오류 메시지에도
      마지막으로 저장한 사람이 누구인지 안내한다. 기존 P0-3 버전 검사 로직(page
      version/sourceDocument property version 두 갈래)은 그대로 재사용한다.
- [ ] 문서 편집 화면 하단 풋터에 "마지막 수정자"가 있으면 표시된다(없으면 — 생성 직후
      아직 한 번도 수정 저장을 거치지 않은 문서 — 표시하지 않는다).
- [ ] 저장(수동 저장·자동 저장 모두) 성공 시 화면의 마지막 수정자 표시가 새로고침 없이
      즉시 갱신된다.

## 결정이 필요한 사항
없음 — api-spec.md에 이미 합의된 스펙을 그대로 구현한다.

## 범위 밖
- P6-3(공유 버튼/팝업), P6-6(공유 문서 접근 권한 확장, `requireDocumentOwner`가 소유자만
  통과시키는 것을 그대로 둠) — 이번 항목과 독립적으로 이미 계획돼 있다.
- 실시간 잠금/공동편집 — Phase 6 착수 시 이미 기각된 범위(architecture.md 참고).
