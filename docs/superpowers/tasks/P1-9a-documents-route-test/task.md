# P1-9a: `documents/route.ts`(목록 조회·생성) 테스트를 추가한다

## 배경
- 2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 나온 항목으로, `docs/product/prd.md`의 Phase 4 P1 체크리스트 "`documents/route.ts`(목록 조회·생성) 테스트를 추가한다"에 해당한다.
- `src/app/api/editor/documents/route.ts`(`GET`/`POST`)는 지금까지 테스트가 없는 유일한 API 라우트 그룹 중 하나였다. 반면 같은 디렉터리의 `[pageId]/versions/route.test.ts` 등은 이미 "인증/도메인 함수를 모듈째 모킹하고 HTTP status·응답 형태만 검증"하는 관례를 갖고 있어(`@/lib/auth-guard`, `@/lib/editor/documents`를 `vi.mock`), 그 관례를 그대로 따른다.

## 수용 기준 (Acceptance Criteria)
- [x] `GET`: 개인 폴더가 없으면 `{ documents: [] }`를 200으로 반환하고 `listDocuments`를 호출하지 않는다.
- [x] `GET`: 개인 폴더가 있으면 `listDocuments(accountFolderId)`를 호출해 그 결과를 `{ documents }`로 200 반환한다.
- [x] `GET`: 세션이 없으면(`requireSessionEmail`이 `UnauthorizedError`를 던지면) 401을 반환하고 `findPersonalFolder`/`listDocuments`를 호출하지 않는다.
- [x] `POST`: 개인 폴더가 없으면 `NotFoundError`(404)를 반환하고 `createDocument`를 호출하지 않는다.
- [x] `POST`: 정상 요청이면 `createDocument`에 `accountFolderId`/`title`/`doc`/`actualAuthorEmail`을 그대로 전달하고, 그 결과를 201로 반환한다.
- [x] `POST`: 요청 본문에 `title`/`doc`가 없으면 각각 빈 문자열(`""`)·빈 문서(`{type:"doc",content:[]}`)로 기본값을 채워 `createDocument`를 호출한다(라우트 자체는 무검증이고 실제 검증은 `createDocument` 쪽 책임 — 그 위임이 그대로 이뤄지는지만 확인).
- [x] `POST`: `createDocument`가 `ValidationError`를 던지면 400을 반환한다.

## 결정이 필요한 사항
없음.

## 범위 밖
- `listDocuments`/`createDocument`/`findPersonalFolder` 자체의 도메인 로직 검증은 `src/lib/editor/documents.test.ts`/`folder.test.ts`의 책임이라 다루지 않는다(이 라우트 테스트는 위임이 올바른지, HTTP status 매핑이 올바른지만 검증).
- `folder/route.ts` 테스트는 P1-9d로 별도 진행한다.
