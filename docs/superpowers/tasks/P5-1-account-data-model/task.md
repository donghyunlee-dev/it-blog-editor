# P5-1: 계정 데이터 모델 확장

## 배경
- Phase 5(사용자 계정 관리)의 첫 항목. 지금까지 계정 폴더(`AccountFolder`)는 이메일 제목의 빈 페이지일 뿐, 이름·팀·접속 허용 여부 같은 계정 정보를 담지 못했다. 이후 항목(온보딩 팝업 P5-2, 접속 권한 게이트 P5-3, 계정 정보 수정 P5-4 등)이 모두 이 데이터 모델 위에서 동작하므로 가장 먼저 필요하다.
- 관련 문서: [prd.md의 Phase 5](../../../product/prd.md#-단계별-개발-계획)(P5-1), [data-spec.md의 AccountFolder(`accountMeta`)](../../../product/data-spec.md), [architecture.md의 접속 권한 게이트](../../../product/architecture.md)

## 수용 기준 (Acceptance Criteria)
- [ ] 계정 폴더(`AccountFolder`)를 새로 생성하면 `accountMeta` content property가 기본값 `{ name: "", team: "", accessEnabled: true }`로 함께 생성된다.
- [ ] `accountMeta` property가 아직 없는 기존 계정 폴더를 조회하면(하위 호환), 위와 동일한 기본값을 코드에서 보정해 반환한다 — Confluence에 실제로 쓰기가 일어나지는 않는다(읽기 전용 보정).
- [ ] 이름·팀을 저장하면(`saveAccountMeta`) `accountMeta.name`/`team`이 갱신되고, `accountMeta.onboardedAt`이 처음 저장될 때 한 번만 채워진다(이후 재수정해도 값이 바뀌지 않음).
- [ ] 이름·팀이 하나라도 비어 있으면 온보딩 미완료로 판단하는 헬퍼(`needsOnboarding`)가 있다.
- [ ] 위 4가지를 검증하는 유닛 테스트가 있고 `npm test -- account`로 통과한다.

## 결정이 필요한 사항
없음 — 2026-09-03 사용자와의 대화로 이번 Phase의 핵심 결정(신규 가입자 기본 접속 허용, 관리자 수동 운영, 계정 관리 페이지 기반 검색, 버전 충돌 감지+마지막 수정자 표시)이 이미 확정됐다([prd.md](../../../product/prd.md#phase-5--사용자-계정-관리-신규-2026-09-03-계획) 참고).

## 범위 밖
- 접속 권한 게이트(요청 차단)는 P5-3에서 다룬다 — 이 항목은 데이터 모델과 저장/조회 함수만 만든다.
- 온보딩 팝업 UI, 계정 정보 수정 팝업 UI는 각각 P5-2, P5-4에서 다룬다.
- "계정 관리" 인덱스 페이지(`accountIndex`) 갱신은 P5-7에서 다룬다.
- `accessEnabled` 값을 바꾸는 기능(관리자 스크립트)은 P5-6에서 다룬다 — 이 항목은 읽기만 한다.
