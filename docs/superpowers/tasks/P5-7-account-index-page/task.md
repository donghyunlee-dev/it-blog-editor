# P5-7: 최상단 계정 관리 페이지

## 배경
Phase 5(사용자 계정 관리)의 마지막 항목. `docs/product/prd.md` 체크리스트 P5-7,
`docs/product/data-spec.md`의 "AccountIndex" 테이블, `docs/product/api-spec.md`의
`GET /api/editor/account/search`에 이미 상세 스펙이 합의돼 있다 — 이번 작업은 그 스펙을
그대로 구현하는 것이다. Phase 6(페이지 공유)의 P6-2(계정 검색 API 연동)가 이 항목의 검색
API를 재사용하므로, 응답 스키마는 이후 재사용을 고려해 확정한다.

## 수용 기준 (Acceptance Criteria)
- [ ] Space 최상단(홈페이지 바로 하위)에 제목 "계정 관리"인 `AccountIndex` 페이지가 존재하지
      않으면, 계정 정보가 처음 upsert되는 시점(계정 폴더 생성/온보딩 완료/정보 수정/접속 권한
      변경)에 자동으로 생성된다.
- [ ] 계정 폴더 생성, 온보딩 완료(`saveAccountMeta` 최초 호출), 정보 수정(`saveAccountMeta`
      재호출), 접속 권한 변경(`setAccessEnabled`, P5-6 스크립트) 각각의 시점에 `AccountIndex`의
      `accountIndex` property에서 해당 이메일 항목이 upsert된다(이메일 기준, 없으면 추가·있으면
      갱신).
- [ ] `GET /api/editor/account/search?q=`가 이름·이메일·팀 부분 일치(대소문자 무시)로
      `accountIndex`를 필터링해 반환한다. `q`가 빈 문자열이면 전체 목록을 반환한다(화면 최초
      진입 시 전체 목록 표시에 사용). `q` 파라미터 자체가 없으면 400(`INVALID_REQUEST`).
      로그인하지 않았으면 401, 접속 차단 계정이면 403.
- [ ] `/editor/accounts` 화면에 전체 계정을 "이름(이메일)", 팀, 접속 허용 뱃지(허용/차단)
      3열로 보여주고, 검색어를 입력하면 위 API로 다시 조회한다. 조회 전용 — 이 화면에서
      접속 허용 여부를 바꿀 수 없다(P5-6 스크립트 전용이라는 기존 결정 유지).
- [ ] 사이드바에서 `/editor/accounts`로 진입할 수 있는 링크가 있다.
- [ ] 검색 API 호출이 실패하면 오류를 안내한다(Toast).

## 결정이 필요한 사항
없음 — Phase 5 착수 시 이미 합의된 결정(`prd.md`의 "핵심 결정") 범위 안의 구현이라 추가
결정 사항이 없다.

## 범위 밖
- 이 화면에서 접속 허용/차단을 바꾸는 것 — 계속 `scripts/set-account-access.ts` 전용(P5-6
  결정 유지).
- 검색 디바운스 UI — P6-2(공유 대상 검색 연동)에서 다룬다(`prd.md` P6-2 참고). 이 화면은
  입력 변경마다 바로 조회해도 되는 관리자용 화면이라 이번 범위에서는 넣지 않는다.
- `accountIndex` 배열 동시 upsert 경쟁 상황에 대한 락/재시도 — 이미 `architecture.md`/
  `data-spec.md`에 "규모가 커지면 재검토"로 기록된 기존 한계를 그대로 수용한다.
