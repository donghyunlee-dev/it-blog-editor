# P5-6: 관리자 접속 권한 변경 스크립트

## 배경
- Phase 5(사용자 계정 관리)의 여섯 번째 항목. P5-3(접속 권한 게이트)이 `accountMeta.accessEnabled`를 강제하는 쪽을 만들었지만, 그 값을 실제로 바꾸는 방법이 아직 없다 — 관리자가 계정을 차단/재허용할 수 있어야 한다.
- 2026-09-03 사용자와의 대화로 이미 결정됨: 이번 범위에서는 별도 관리자 화면(UI) 없이, 로컬에서 실행하는 스크립트로만 운영한다.
- 관련 문서: [prd.md의 Phase 5](../../../product/prd.md#-단계별-개발-계획)(P5-6), [architecture.md의 "계정 접속 차단"](../../../product/architecture.md)

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run set-account-access -- <email> <on|off>`로 특정 계정의 `accountMeta.accessEnabled`를 직접 바꿀 수 있다.
- [ ] `on`은 `accessEnabled: true`(접속 허용), `off`는 `accessEnabled: false`(접속 차단)로 저장한다.
- [ ] 계정 폴더가 없는 이메일을 지정하면 무엇이 문제인지 안내하고 오류 없이 종료한다.
- [ ] 이름/팀 등 `accountMeta`의 다른 필드는 건드리지 않는다(접속 허용 여부만 바꾼다).
- [ ] 위 동작(도메인 함수 단위)을 검증하는 자동화 테스트가 있다.
- [ ] 실제 테스트 계정을 대상으로 스크립트를 직접 실행해 반영을 확인한다(scripts/reset-account.ts처럼 실제 Confluence 인스턴스에 쓰기 작업을 하는 도구이므로).

## 결정이 필요한 사항
없음 — 이미 확정([prd.md](../../../product/prd.md#phase-5--사용자-계정-관리-신규-2026-09-03-계획) 참고).

## 범위 밖
- 관리자 전용 화면(UI)은 이번 범위에 없다 — 스크립트만 만든다.
- 계정 목록 조회·검색(최상단 계정 관리 페이지)은 P5-7에서 다룬다.
