# P1-9d: `folder/route.ts` 테스트 — 구현 계획

## Global Constraints
- P1-9a~c가 세운 관례(인증·도메인 함수 `vi.mock`)를 그대로 따른다.

## Files
- Create: `src/app/api/editor/folder/route.test.ts`

## Steps
- [x] **Step 1**: `@/lib/auth-guard`, `@/lib/editor/folder`(`findPersonalFolder`, `createPersonalFolder`)를 `vi.mock`.
- [x] **Step 2**: `GET` 3건, `POST` 3건 작성.
- [x] **Step 3**: `npm test -- folder/route`로 검증.
- [x] **Step 4**: `npm run lint`, `npm run build` 실행.
