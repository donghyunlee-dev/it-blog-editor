# P5-1: 계정 데이터 모델 확장 — 구현 계획

## Global Constraints
- 기존 도메인 계층 패턴을 그대로 따른다: 저수준 연동(`src/lib/confluence/client.ts`의 `getPageProperty`/`upsertPageProperty`) → 도메인 함수(`src/lib/editor/account.ts`) → 이후 API 라우트(P5-2)가 이 도메인 함수를 호출한다.
- `deleted-documents.ts`/`publish.ts`가 이미 쓰고 있는 "property가 없으면 기본값으로 취급"(하위 호환) 패턴을 그대로 재사용한다 — 마이그레이션 스크립트를 따로 두지 않는다(data-spec.md 마이그레이션 정책과 일치).

## Files
- Create: `src/lib/editor/account.ts`
- Create: `src/lib/editor/account.test.ts`
- Modify: `src/lib/editor/folder.ts` (`createPersonalFolder`가 기본 `accountMeta`도 함께 생성)

## Steps
- [ ] **Step 1**: `src/lib/editor/account.ts`에 `AccountMeta` 타입, `ACCOUNT_META_PROPERTY_KEY` 상수, `DEFAULT_ACCOUNT_META`, `getAccountMeta(accountFolderId)`(없으면 기본값 반환), `needsOnboarding(meta)` 작성.
- [ ] **Step 2**: 같은 파일에 `saveAccountMeta(accountFolderId, { name, team })` 작성 — 기존 값을 먼저 읽어 `onboardedAt`을 최초 1회만 채우고 upsert.
- [ ] **Step 3**: `folder.ts`의 `createPersonalFolder`가 페이지 생성 직후 `account.ts`의 헬퍼로 기본 `accountMeta`를 명시적으로 기록하도록 연결(순환 참조 없음 — `account.ts`는 `folder.ts`를 import하지 않는다).
- [ ] **Step 4**: `account.test.ts`에 task.md의 4가지 수용 기준을 각각 검증하는 테스트 작성(`getPageProperty`/`upsertPageProperty`를 `vi.mock`, 기존 `deleted-documents.test.ts` 관례 재사용).

각 Step은 `npm test -- account`로 검증 가능한 단위로 쪼갠다.
