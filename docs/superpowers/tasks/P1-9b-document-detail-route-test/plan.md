# P1-9b: `documents/[pageId]/route.ts` 테스트 — 구현 계획

## Global Constraints
- P1-9a/`versions/route.test.ts`가 세운 관례(인증·도메인 함수 `vi.mock`, `Request` 직접 생성 + `{ params: Promise.resolve({ pageId }) }`)를 그대로 따른다.

## Files
- Create: `src/app/api/editor/documents/[pageId]/route.test.ts`

## Steps
- [x] **Step 1**: `@/lib/auth-guard`, `@/lib/editor/documents`(`updateDocument`, `deleteDocument`, `requireDocumentOwner`)를 `vi.mock`.
- [x] **Step 2**: `PUT` 테스트 4건(정상 위임+200, 소유자 아님→401, version 누락/비숫자→400, ConflictError→409) 작성.
- [x] **Step 3**: `DELETE` 테스트 3건(정상 위임+204, 소유자 아님→401, NotFoundError→404) 작성.
- [x] **Step 4**: `npm test -- "documents/\[pageId\]/route"`로 검증.
- [x] **Step 5**: `npm run lint`, `npm run build` 실행.
