# P5-7: 최상단 계정 관리 페이지 — 구현 계획

## Global Constraints
- 기존 계정 폴더 자동 생성 패턴(`ensurePersonalFolder`)과 동일하게, `AccountIndex` 페이지도
  "쓰기 시점에만 자동 생성, 읽기(검색)에서는 생성하지 않음"을 지킨다 — 계정이 하나도 없는
  초기 상태에서 검색 API를 호출해도 빈 배열만 반환하고 페이지를 만들지 않는다.
- `saveAccountMeta`/`setAccessEnabled`/`initializeAccountMeta`가 각자 `accountMeta`를 쓴
  *직후* 같은 최신 값으로 `accountIndex`를 upsert한다 — 호출자가 별도로 동기화를 잊지
  않도록 도메인 함수 내부에서 강제한다(기존 "accessEnabled는 setAccessEnabled로만" 패턴과
  같은 방식으로 설계를 코드로 강제).
- `account-index.ts`는 `folder.ts`를 import하지 않는다(순환 참조 방지 — `folder.ts` →
  `account.ts` → `account-index.ts` → `folder.ts`가 되는 것을 피한다). Space 홈페이지 조회는
  `@/lib/confluence/client`의 `getConfiguredSpace`를 직접 다시 호출한다(`folder.ts`의 비공개
  헬퍼와 로직은 같지만 별도 모듈이라 공유 헬퍼를 새로 만들 필요는 없음 — 두 파일 모두 각자
  private 헬퍼 유지).
- `@sfood/ui`의 `ListSearchTable` 템플릿을 그대로 쓴다(목록+검색 화면이라는 요구사항과 정확히
  일치, CLAUDE.md "템플릿 우선" 원칙). 제네릭 `T extends Record<string, unknown>` 제약을
  만족시키려면 행 타입에 `Record<string, unknown>`을 교차시켜야 한다(TS 인터페이스는 인덱스
  시그니처가 없으면 이 제약을 통과하지 못함).

## Files
- Create: `src/lib/editor/account-index.ts`, `src/lib/editor/account-index.test.ts`
- Create: `src/app/api/editor/account/search/route.ts`, `src/app/api/editor/account/search/route.test.ts`
- Create: `src/app/editor/accounts/page.tsx`, `src/app/editor/accounts/page.test.tsx`
- Modify: `src/lib/editor/account.ts` (email 파라미터 추가 + accountIndex 동기화),
  `src/lib/editor/account.test.ts`
- Modify: `src/lib/editor/folder.ts` (`initializeAccountMeta` 호출에 email 전달)
- Modify: `src/app/api/editor/account/route.ts` (`saveAccountMeta` 호출부), `route.test.ts`
- Modify: `scripts/set-account-access.ts` (`setAccessEnabled` 호출부)
- Modify: `src/components/editor/EditorSidebar.tsx` (`/editor/accounts` 진입 링크), `EditorSidebar.test.tsx`
- Modify: `docs/product/prd.md`, `docs/product/api-spec.md`(응답에 `accessEnabled` 필드 명시),
  `docs/product/design.md`(컴포넌트 매핑 표에 `ListSearchTable`/`StatusBadge` 추가)

## Steps
- [ ] **Step 1**: `src/lib/editor/account-index.ts` 작성 — `AccountIndexEntry`,
  `upsertAccountIndexEntry`, `searchAccounts`. `src/lib/confluence/client`만 mock해 유닛 테스트
  (`account-index.test.ts`) 작성: 페이지 없을 때 생성 후 upsert, 이미 있을 때 재사용, 같은
  이메일 재upsert 시 교체(중복 추가 아님), 검색어 부분일치·대소문자 무시, 빈 검색어는 전체
  반환, 페이지 자체가 없으면 검색은 빈 배열.
- [ ] **Step 2**: `account.ts`의 `saveAccountMeta`/`setAccessEnabled`/`initializeAccountMeta`에
  `email` 파라미터를 추가하고 각 함수가 `accountMeta` 저장 직후 `upsertAccountIndexEntry`를
  호출하도록 수정. `account-index` 모듈은 `account.test.ts`에서 mock 처리해 새 인자 전달과
  호출 여부만 검증.
- [ ] **Step 3**: 호출부 갱신 — `folder.ts`(`createPersonalFolder`), `route.ts`(PUT),
  `scripts/set-account-access.ts`. 각 파일의 기존 테스트가 새 시그니처로도 통과하는지 확인
  (`route.test.ts`는 `saveAccountMeta` 호출 인자 검증 부분 갱신 필요).
- [ ] **Step 4**: `GET /api/editor/account/search` 라우트 작성 — `q` 파라미터 필수(없으면
  400), `searchAccounts` 호출, 응답에 `email`/`name`/`team`/`accessEnabled`만 노출
  (`accountFolderId`는 내부 필드라 응답에서 제외). 유닛 테스트로 401/403/400/200 각각 확인.
- [ ] **Step 5**: `/editor/accounts` 화면 작성 — `ListSearchTable`(columns: 계정/팀/접속,
  `StatusBadge`로 허용·차단 표시) + 마운트 시 빈 검색어로 전체 조회 + 실패 시 `Toast`.
  React Testing Library로 목록 렌더링·검색 입력 시 API 재호출·실패 시 토스트 노출 검증.
- [ ] **Step 6**: `EditorSidebar.tsx`의 "문서 관련 기능" 영역에 "계정 관리" 링크 추가
  (`/editor/accounts`, "삭제된 문서" 버튼과 같은 스타일).
- [ ] **Step 7**: 임시 미인증 미리보기 라우트로 `/editor/accounts` 화면을 실제 브라우저에서
  스크린샷 검증(라이트/다크) 후 삭제. `npx vitest run`/`npm run lint`/`npx tsc --noEmit`/
  `npm run build` 전체 통과 확인.
- [ ] **Step 8**: 문서 동기화 — `prd.md` P5-7 체크리스트 완료 표시 + Phase 5 완료 처리,
  `api-spec.md` 응답 예시에 `accessEnabled` 반영, `design.md` 컴포넌트 매핑 표 갱신.

각 Step은 `npm test -- <파일명>`으로 검증 가능한 단위로 쪼갠다.
