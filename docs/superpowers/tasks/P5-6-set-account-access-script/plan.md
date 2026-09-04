# P5-6: 관리자 접속 권한 변경 스크립트 — 구현 계획

## Global Constraints
- `scripts/reset-account.ts`와 같은 관례를 따른다 — `tsx --env-file=.env`로 실행, `@/*` 경로 별칭으로 실제 도메인 함수를 재사용(저수준 Confluence 호출을 다시 구현하지 않는다).
- 이름·팀 등 `accountMeta`의 다른 필드는 건드리지 않는다 — `getAccountMeta`로 기존 값을 먼저 읽고 `accessEnabled`만 바꿔 다시 쓴다.

## Files
- Modify: `src/lib/editor/account.ts` (`setAccessEnabled` 추가)
- Modify: `src/lib/editor/account.test.ts`
- Create: `scripts/set-account-access.ts`
- Modify: `package.json` (`set-account-access` 스크립트 명령 추가)
- Modify: `docs/product/architecture.md` (개발용 CLI 스크립트 절에 추가)

## Steps
- [ ] **Step 1**: `account.ts`에 `setAccessEnabled(accountFolderId, accessEnabled)` 추가 — 기존 `accountMeta`를 읽어 `accessEnabled`만 바꿔 저장. 테스트 작성.
- [ ] **Step 2**: `scripts/set-account-access.ts` 작성 — `<email> <on|off>` 인자 파싱, `findPersonalFolder`로 폴더 조회, 없으면 안내 후 종료, 있으면 `setAccessEnabled` 호출 후 결과 출력.
- [ ] **Step 3**: `package.json`에 `"set-account-access": "tsx --env-file=.env scripts/set-account-access.ts"` 추가.
- [ ] **Step 4**: 실제 테스트 계정(`donghyun.lee@s-food.com`)으로 `off` → 확인 → `off`을 되돌려 놓지 않으면 다음 테스트가 막히므로 다시 `on`으로 실행해 원상복구.

각 Step은 `npm test -- account`로 검증 가능한 단위로 쪼갠다(스크립트 자체는 실제 Confluence 인스턴스로 수동 검증).
