# P1-9c: `documents/[pageId]/images/route.ts` 테스트 — 구현 계획

## Global Constraints
- P1-9a/P1-9b가 세운 관례(인증·도메인 함수 `vi.mock`, `Request` 직접 생성)를 그대로 따른다.
- Node 전역 `FormData`/`File`(Node 18+ undici 기반)을 그대로 사용한다 — 별도 폴리필 불필요.

## Files
- Create: `src/app/api/editor/documents/[pageId]/images/route.test.ts`

## Steps
- [x] **Step 1**: `@/lib/auth-guard`, `@/lib/editor/documents`(`requireDocumentOwner`), `@/lib/editor/images`(`registerImage`)를 `vi.mock`.
- [x] **Step 2**: 정상 업로드(File 포함 FormData) → 201 + 위임 확인, 소유자 아님 → 401, file 필드 없음 → `registerImage(pageId, null)` 호출, ValidationError → 400. 4건 작성.
- [x] **Step 3**: `npm test -- images/route`로 검증.
- [x] **Step 4**: `npm run lint`, `npm run build` 실행.
