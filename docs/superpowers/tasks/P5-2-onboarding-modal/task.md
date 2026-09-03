# P5-2: 온보딩 팝업

## 배경
- Phase 5(사용자 계정 관리)의 두 번째 항목. P5-1(계정 데이터 모델 확장)에서 만든 `accountMeta`/`needsOnboarding`을 실제로 사용하는 첫 화면이다 — 이름·팀이 비어 있는 계정(신규 가입자, 또는 이 기능 도입 이전에 만들어진 기존 계정)이 `/editor`에 들어오면 이름·팀을 입력받는다.
- 관련 문서: [prd.md의 Phase 5](../../../product/prd.md#-단계별-개발-계획)(P5-2), [prd.md 화면 정의의 "온보딩 팝업"](../../../product/prd.md#-화면-정의), [api-spec.md의 GET·PUT /api/editor/account](../../../product/api-spec.md)

## 수용 기준 (Acceptance Criteria)
- [ ] `GET /api/editor/account`가 세션 이메일의 계정 정보(`email`, `name`, `team`, `needsOnboarding`)를 반환한다.
- [ ] `PUT /api/editor/account`가 이름·팀을 저장한다. 이름 또는 팀이 비어 있으면(공백만 있는 경우 포함) 400(`INVALID_REQUEST`)을 반환한다.
- [ ] `/editor` 진입 시 `needsOnboarding`이 true면 이름·팀 입력 Modal이 자동으로 뜬다. `needsOnboarding`이 false면 뜨지 않는다.
- [ ] 온보딩 Modal은 저장(제출) 전까지 Escape 키·배경 클릭·닫기 버튼으로 닫을 수 없다.
- [ ] 저장에 성공하면 Modal이 닫히고 성공 Toast가 뜬다. 저장에 실패하면(예: 서버 오류) Modal은 열린 채로 오류 메시지를 보여준다.
- [ ] 위 API·컴포넌트 동작을 검증하는 자동화 테스트가 있다.

## 결정이 필요한 사항
없음 — Phase 5 착수 전 사용자와의 대화로 이미 확정([prd.md](../../../product/prd.md#phase-5--사용자-계정-관리-신규-2026-09-03-계획) 참고).

## 범위 밖
- 접속 권한 게이트(로그인은 됐지만 접속 차단된 계정을 막는 것)는 P5-3에서 다룬다.
- 로그인 후 언제든 이름·팀을 다시 수정하는 계정 정보 팝업(별도 진입점)은 P5-4에서 다룬다 — 이 항목은 온보딩(최초 1회, 강제) 흐름만 다룬다. 다만 저장에 쓰는 API(`PUT /api/editor/account`)는 두 항목이 공유한다.
- 계정 표시 형식("이름(이메일)") 통일은 P5-5에서 다룬다.
