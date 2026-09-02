# P1-9d: `folder/route.ts` 테스트를 추가한다

## 배경
- 2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 나온 항목으로, P1-9a~c와 같은 시리즈다.
- `src/app/api/editor/folder/route.ts`(`GET`/`POST`)는 개인 폴더 존재 확인·생성을 담당하는 가장 단순한 라우트다.

## 수용 기준 (Acceptance Criteria)
- [x] `GET`: 폴더가 없으면 `{ exists: false }`를 200으로 반환한다.
- [x] `GET`: 폴더가 있으면 `{ exists: true, accountFolderId, spaceKey }`를 200으로 반환한다.
- [x] `GET`: 세션이 없으면 401을 반환한다.
- [x] `POST`: 정상 요청이면 `createPersonalFolder(email)`를 호출해 `{ accountFolderId, spaceKey }`를 201로 반환한다.
- [x] `POST`: `createPersonalFolder`가 `ConflictError`를 던지면(이미 존재) 409를 반환한다.
- [x] `POST`: 세션이 없으면 401을 반환하고 `createPersonalFolder`를 호출하지 않는다.

## 결정이 필요한 사항
없음.

## 범위 밖
- `findPersonalFolder`/`createPersonalFolder` 자체의 도메인 로직(Confluence 페이지 조회/생성)은 `folder.test.ts`의 책임이라 다루지 않는다.
