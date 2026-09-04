# P5-3: 접속 권한 게이트 — 구현 결과 보고서

## 구현 내용
- `src/lib/editor/errors.ts`에 `AccessDisabledError`를 추가하고, `src/lib/api-response.ts`의 `toErrorResponse`가 이를 403(`ACCESS_DISABLED`)으로 변환하도록 했다.
- `src/lib/auth-guard.ts`의 `requireSessionEmail`(모든 `/api/editor/**` 라우트가 이미 호출하는 공통 인증 경계)에 접속 차단 검사를 추가했다 — 세션 확인 후 계정 폴더가 있으면 `accountMeta.accessEnabled`를 확인해 `false`면 `AccessDisabledError`를 던진다. 계정 폴더가 아직 없으면(이론상 `/editor`를 한 번도 거치지 않은 세션) 검사를 건너뛴다 — 이 함수는 인증 경계이지 폴더를 새로 만들 책임까지는 지지 않는다. 라우트마다 개별 수정이 필요 없어 "공통 처리" 요구사항(api-spec.md)을 한 곳에서 만족한다.
- `src/app/editor/layout.tsx`가 `accountMeta.accessEnabled` 검사를 `needsOnboarding` 검사보다 먼저 수행하도록 재배치했다 — 접속 차단이 온보딩보다 우선한다는 예외 규칙(prd.md)을 지킨다. 차단되면 리다이렉트 없이 그 자리에서 `AccessBlockedScreen`을 반환한다.
- `src/components/AccessBlockedScreen.tsx`를 신설했다 — 로그인·환영 화면과 같은 `AuthSplitShell`을 재사용하고, `Alert`로 차단 안내를, `<form action={onLogout}>`으로 로그아웃 진입점을 둔다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/errors.ts` | `AccessDisabledError` 추가 |
| `src/lib/api-response.ts` | `AccessDisabledError` → 403(`ACCESS_DISABLED`) 매핑 추가 |
| `src/lib/auth-guard.ts` | `requireSessionEmail`에 접속 차단 검사 추가 |
| `src/lib/auth-guard.test.ts` | 신규 — 세션 없음/폴더 없음/허용/차단 4가지 경로 |
| `src/app/editor/layout.tsx` | 접속 차단 검사를 온보딩 검사보다 먼저 수행, 차단 시 `AccessBlockedScreen` 렌더링 |
| `src/components/AccessBlockedScreen.tsx` | 신규 |
| `src/components/AccessBlockedScreen.test.tsx` | 신규 — 2건 |
| `docs/product/prd.md` | 화면 정의·체크리스트 갱신 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: enforce the account access gate (Phase 5, P5-3) |

## 자체 검토 (Self-Review)
### 긍정 사항
- API 쪽 검사를 라우트마다 추가하는 대신 이미 모든 라우트가 거치는 `requireSessionEmail` 한 곳에 넣어, 앞으로 새 라우트가 추가돼도 이 검사를 빠뜨릴 수 없는 구조로 만들었다.
- 임시 라우트로 `AccessBlockedScreen`을 실제로 렌더링해보다가, `onLogout`에 `"use server"`로 선언되지 않은 임의 함수를 넘기면(내가 임시로 만든 검증용 함수) Next.js가 "Functions cannot be passed directly to Client Components..." 런타임 오류를 낸다는 것을 직접 발견했다 — 서버 컴포넌트의 `<form action>`은 반드시 진짜 Server Action이어야 한다는 제약을 코드 주석으로 남겼다. 실제 프로덕션 코드(`src/lib/actions/logout.ts`의 `logoutAction`, `"use server"` 선언됨)는 이 요건을 충족해 문제없이 동작함을 재확인했다.

### 주의사항
- `requireSessionEmail`이 이제 요청마다 계정 폴더 조회(`findPersonalFolder`) + `accountMeta` 조회(`getAccountMeta`)를 추가로 한다 — Confluence API 호출이 늘어난다. 이 프로젝트 규모(조직·다수 10명+)에서는 감내할 수준으로 판단했다(별도 캐싱 없음). 트래픽이 커지면 P0-5a(slug 캐시)와 같은 종류의 완화책을 재검토할 수 있다.

### 우려사항
- 없음 — 실제 브라우저로 차단 화면 렌더링까지 확인했다(AX Auth 로그인 제약으로 `/editor` 자체에 실제 차단된 세션으로 도달해보지는 못했지만, `AccessBlockedScreen`을 프로덕션과 동일한 `logoutAction`으로 직접 렌더링해 확인했다).
