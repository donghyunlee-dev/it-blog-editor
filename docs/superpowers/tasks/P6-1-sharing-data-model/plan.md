# P6-1: 공유 데이터 모델 확장 — 구현 계획

## Global Constraints
- `sharing.ts`는 순수 도메인 계층이다 — 권한 검사(소유자만 공유 가능 등)는 하지 않는다.
  그건 이 함수들을 호출할 API 라우트(P6-3)의 몫이다(`account.ts`/`account-index.ts`가
  권한 검사 없이 순수 property read/write만 하는 것과 같은 관례).
- `deletedDocuments`/`accountIndex`와 같은 기존 property 패턴을 그대로 따른다 — property가
  없으면 기본값(빈 배열 등)으로 취급하고, 존재 자체를 강제로 만들지 않는다(문서에 restriction
  이 없듯, 공유하지 않은 문서는 `sharingMeta` property 자체가 없는 게 자연스럽다).
- `sharedWith` 중복 추가·존재하지 않는 항목 제거는 모두 조용히 무시한다(idempotent) —
  호출자가 이미 공유됐는지 미리 확인할 필요가 없게 한다.

## Files
- Create: `src/lib/editor/sharing.ts`, `src/lib/editor/sharing.test.ts`

## Steps
- [ ] **Step 1**: `SharingMeta`/`SharedDocumentRef` 타입과 property key 상수 정의.
- [ ] **Step 2**: `getSharingMeta(pageId)` — 없으면 `{ sharedWith: [] }` 반환.
- [ ] **Step 3**: `shareDocument(pageId, email)` / `unshareDocument(pageId, email)` —
  `sharedWith` 배열만 변경, `lastEditedBy`는 그대로 보존. 중복 추가·존재하지 않는 항목
  제거 idempotent 테스트 포함.
- [ ] **Step 4**: `updateLastEditedBy(pageId, { email, name })` — `sharedWith`를 보존한 채
  `lastEditedBy: { email, name, editedAt: new Date().toISOString() }`로 갱신.
- [ ] **Step 5**: `getSharedDocumentRefs(accountFolderId)` — 없으면 빈 배열 반환.
- [ ] **Step 6**: `npx vitest run src/lib/editor/sharing.test.ts`로 전부 통과 확인 후 전체
  스위트/lint/typecheck/build 실행.
- [ ] **Step 7**: `docs/product/prd.md` P6-1 체크리스트 완료 표시.

각 Step은 `npm test -- <파일명>`으로 검증 가능한 단위로 쪼갠다.
