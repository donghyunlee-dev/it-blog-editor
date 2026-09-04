# P5-3: 접속 권한 게이트 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/auth-guard.test.ts src/components/AccessBlockedScreen.test.tsx` | 통과 (6/6) |
| `npx vitest run` (전체 스위트) | 통과 (43 파일 / 388건) |
| `npm run lint` | 통과(기존 경고 2건 외 신규 문제 없음) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과 |

## 수동 검증
AX Auth 로그인 제약으로 이 세션에서 실제 계정으로 로그인해 `/editor`에서 차단 화면을 보는
것까지는 확인하지 못했다. 대신 `AccessBlockedScreen`을 실제 프로덕션과 동일한 `logoutAction`
(`"use server"` Server Action)으로 임시 라우트(검증 후 삭제, 커밋되지 않음)에 렌더링해 이
세션의 dev 서버로 확인했다 — 로그인·환영 화면과 같은 브랜드 셸 안에 차단 안내와 로그아웃
버튼이 정상적으로 뜨는 것을 스크린샷으로 확인했다.

이 과정에서 처음엔 검증용으로 임의의 `async () => {}` 함수를 `onLogout`에 넘겼다가 서버
오류가 나는 것을 발견했다 — 아래 "발견된 문제와 조치" 참고.

## 발견된 문제와 조치
- **원인**: `AccessBlockedScreen`은 서버 컴포넌트라, `<form action={onLogout}>`에 넘기는
  값은 `"use server"`로 선언된 진짜 Server Action이어야 한다. 검증용 임시 라우트에서
  아무 표시 없는 일반 함수(`async () => {}`)를 넘겼더니 "Functions cannot be passed
  directly to Client Components unless you explicitly expose it by marking it with
  'use server'." 런타임 오류(500)가 발생했다.
- **조치**: 검증용 임시 라우트가 실제 프로덕션과 동일하게 `src/lib/actions/logout.ts`의
  `logoutAction`(이미 `"use server"`로 선언됨)을 그대로 넘기도록 고쳤다. 이 제약을
  `AccessBlockedScreen`의 `onLogout` prop 타입 옆에 주석으로 남겨, 다음에 이 컴포넌트를
  건드릴 때 같은 실수를 반복하지 않게 했다.
- **재검증 결과**: 차단 화면이 오류 없이 정상 렌더링됨을 스크린샷으로 확인했다. 실제
  프로덕션 경로(`/editor/layout.tsx`가 `logoutAction`을 넘기는 경로)는 처음부터 이 요건을
  충족하고 있어 영향 없다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
