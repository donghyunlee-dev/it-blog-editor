# P5-3: 접속 권한 게이트 — 구현 계획

## Global Constraints
- API 쪽 검사는 라우트마다 따로 추가하지 않고 공통 인증 경계(`src/lib/auth-guard.ts`의 `requireSessionEmail`) 안에 넣는다 — 이미 모든 `/api/editor/**` 라우트가 이 함수를 호출하므로, 여기 한 곳만 고치면 "공통 처리" 요구사항(api-spec.md)을 만족한다.
- 계정 폴더가 아직 없으면(이론상 `/editor`를 한 번도 거치지 않은 세션) 접속 차단 검사 자체를 건너뛴다 — `findPersonalFolder`만 쓰고 `ensurePersonalFolder`(폴더 자동 생성)는 쓰지 않는다. auth-guard는 인증 경계이지 계정 폴더 프로비저닝 책임까지 지지 않는다.
- 접속 차단이 온보딩보다 먼저 검사되도록 `/editor/layout.tsx`에서 순서를 지킨다(task.md 수용 기준 3번).

## Files
- Modify: `src/lib/editor/errors.ts` (`AccessDisabledError` 추가)
- Modify: `src/lib/api-response.ts` (`ACCESS_DISABLED` → 403 매핑)
- Modify: `src/lib/auth-guard.ts` (`requireSessionEmail`에 접속 차단 검사 추가)
- Create: `src/lib/auth-guard.test.ts`
- Modify: `src/app/editor/layout.tsx` (접속 차단 검사를 온보딩 검사보다 먼저, 차단 시 리다이렉트 없이 화면 렌더링)
- Create: `src/components/AccessBlockedScreen.tsx`
- Create: `src/components/AccessBlockedScreen.test.tsx`

## Steps
- [ ] **Step 1**: `errors.ts`에 `AccessDisabledError` 추가, `api-response.ts`의 `toErrorResponse`에 403(`ACCESS_DISABLED`) 분기 추가.
- [ ] **Step 2**: `auth-guard.ts`의 `requireSessionEmail`이 세션 확인 후 `findPersonalFolder`로 계정 폴더를 조회하고(있을 때만) `getAccountMeta`로 `accessEnabled`를 확인해 `false`면 `AccessDisabledError`를 던지도록 수정. `auth-guard.test.ts` 작성(계정 폴더 없음/접속 허용/접속 차단 3가지 경로).
- [ ] **Step 3**: `AccessBlockedScreen.tsx` 작성 — `AuthSplitShell` + `Alert` + 로그아웃 폼. `AccessBlockedScreen.test.tsx` 작성.
- [ ] **Step 4**: `editor/layout.tsx`에서 `accountMeta.accessEnabled` 검사를 `needsOnboarding` 검사보다 먼저 수행하도록 재배치, 차단 시 `AccessBlockedScreen`을 그 자리에서 반환(리다이렉트 없음).

각 Step은 `npm test -- auth-guard`/`AccessBlockedScreen`으로 검증 가능한 단위로 쪼갠다.
