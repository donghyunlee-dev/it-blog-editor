# P1-6b: 태그 형식·길이·개수 상한을 서버에서 검증한다

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 지적된 항목. `setTags`(`src/lib/editor/tags.ts`)는 클라이언트가 보낸 태그 목록을 그대로 Confluence 라벨로 저장하려 시도할 뿐, 형식·길이·개수 어느 것도 검증하지 않는다. `TagInput.tsx`(클라이언트)가 빈 문자열/중복은 걸러주지만, 이건 UI 편의일 뿐 API를 직접 호출하는 다른 클라이언트를 막지 못한다(방어 계층 없음).

Confluence 라벨 자체의 형식 제약을 조사했다: 공백은 하이픈으로 자동 변환되고 대문자는 자동으로 소문자로 바뀐다(우리 쪽에서 막을 필요 없음 — 이미 `setTags`의 대소문자 무시 비교 로직이 이 전제 위에 있다). 다만 `:`, `?`, `@` 같은 특수문자는 라벨 이름에 쓸 수 없고, 길이 상한은 255자다. 지금은 이런 값을 보내면 Confluence가 요청 자체를 거부하는데, 그 오류가 분류되지 않은 오류로 처리돼(P0-6) 사용자에게는 "일시적인 오류, 다시 시도하라"는 잘못된 502 메시지가 뜬다 — 실제로는 형식이 잘못됐을 뿐이라 다시 시도해도 계속 실패한다.

Sources: [Use labels to organize your content](https://support.atlassian.com/confluence-cloud/docs/use-labels-to-organize-your-content/)

## 수용 기준 (Acceptance Criteria)
- [ ] `setTags`가 문서당 태그 개수 상한(20개)을 초과하면 `ValidationError`(400)를 던진다.
- [ ] 태그 하나의 길이 상한(50자, Confluence 자체 상한 255자보다 훨씬 보수적)을 초과하면 `ValidationError`를 던진다.
- [ ] 빈 문자열(공백만 있는 태그 포함)이 섞여 있으면 `ValidationError`를 던진다 — 클라이언트가 걸러주는 것과 별개로 서버도 방어한다.
- [ ] Confluence 라벨이 허용하지 않는 특수문자(`:`, `?`, `@`)가 포함되면 사전에(Confluence API를 호출하기 전에) `ValidationError`를 던진다.
- [ ] 위 사전 검사를 통과했는데도 Confluence가 형식 문제로 400을 반환하면(우리가 미처 알지 못한 다른 제약), 분류되지 않은 502 대신 `ValidationError`(400)로 변환한다 — 완전한 형식 규칙을 재구현하는 대신, Confluence 자신의 판단을 신뢰하되 사용자에게는 명확한 메시지로 바꿔준다.
- [ ] 공백은 하이픈으로, 대문자는 소문자로 자동 변환되는 Confluence의 기존 동작은 막지 않는다(이건 "형식 위반"이 아니라 Confluence의 정상 동작).

## 결정이 필요한 사항
없음 — 개수(20개)·길이(50자) 상한은 P0-4b(이미지 개수)·P1-6a(제목 길이)와 같은 근거(순수 UX 가드레일, Confluence 자체 하드 리밋보다 훨씬 보수적인 기본값)로 직접 정했다. 금지 문자(`:`, `?`, `@`)는 추측이 아니라 Confluence 공식 문서에서 확인된 값이다.

## 범위 밖
- Confluence 라벨 형식 규칙 전체를 클라이언트/서버에 완전히 재구현하는 것 — 대신 사전 검사(알려진 금지 문자)와 사후 변환(Confluence의 400 응답을 ValidationError로) 두 겹으로 방어한다.
- `TagInput.tsx`에 서버와 동일한 실시간 글자 수/개수 안내 UI를 추가하는 것 — 이번엔 서버 검증만 다룬다.
