# P1-9a: `documents/route.ts` 테스트 — 구현 계획

## Global Constraints
- `[pageId]/versions/route.test.ts`가 이미 세운 관례(인증·도메인 함수를 `vi.mock`으로 모듈째 대체, `Request`를 직접 생성해 라우트 함수 호출)를 그대로 따른다 — 이 프로젝트에 새 테스트 패턴을 만들지 않는다.
- 라우트 자체의 책임(위임 + status 매핑)만 검증하고, 도메인 함수 내부 로직은 다시 검증하지 않는다.

## Files
- Create: `src/app/api/editor/documents/route.test.ts`

## Steps
- [x] **Step 1**: `@/lib/auth-guard`(`requireSessionEmail`), `@/lib/editor/folder`(`findPersonalFolder`), `@/lib/editor/documents`(`createDocument`, `listDocuments`)를 `vi.mock`.
- [x] **Step 2**: `GET` 테스트 3건(폴더 없음/폴더 있음/세션 없음) 작성.
- [x] **Step 3**: `POST` 테스트 4건(폴더 없음→404, 정상 생성→201+파라미터 전달 확인, title/doc 기본값 채움, ValidationError→400) 작성.
- [x] **Step 4**: `npm test -- documents/route`로 검증.
- [x] **Step 5**: `npm run lint`, `npm run build` 실행.
