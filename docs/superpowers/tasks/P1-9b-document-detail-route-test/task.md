# P1-9b: `documents/[pageId]/route.ts`(수정·삭제) 테스트를 추가한다

## 배경
- 2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 나온 항목으로, `docs/product/prd.md`의 Phase 4 P1 체크리스트에 해당한다. [P1-9a](../P1-9a-documents-route-test/task.md)와 같은 시리즈다.
- `src/app/api/editor/documents/[pageId]/route.ts`(`PUT`/`DELETE`)는 소유자 검증(`requireDocumentOwner`)과 낙관적 동시성 검증(`version` 필드 필수, P0-3)을 함께 갖고 있어 P1-9a보다 검증할 분기가 조금 더 많다.

## 수용 기준 (Acceptance Criteria)
- [x] `PUT`: 정상 요청이면 `requireDocumentOwner(pageId, email)`로 소유자를 확인한 뒤 `updateDocument`에 `pageId`/`title`/`doc`/`expectedVersion`을 그대로 전달하고, 그 결과를 200으로 반환한다.
- [x] `PUT`: 소유자가 아니면(`requireDocumentOwner`가 `UnauthorizedError`를 던지면) 401을 반환하고 `updateDocument`를 호출하지 않는다.
- [x] `PUT`: 요청 본문에 `version`이 숫자가 아니면(누락 포함) `ValidationError`(400)를 반환하고 `updateDocument`를 호출하지 않는다(라우트 자신이 직접 던지는 유일한 검증 — P0-3의 버전 검사 전제).
- [x] `PUT`: `updateDocument`가 `ConflictError`를 던지면(동시 수정) 409를 반환한다.
- [x] `DELETE`: 정상 요청이면 소유자를 확인한 뒤 `deleteDocument(pageId)`를 호출하고 204(본문 없음)를 반환한다.
- [x] `DELETE`: 소유자가 아니면 401을 반환하고 `deleteDocument`를 호출하지 않는다.
- [x] `DELETE`: `deleteDocument`가 `NotFoundError`를 던지면 404를 반환한다.

## 결정이 필요한 사항
없음.

## 범위 밖
- `updateDocument`/`deleteDocument`/`requireDocumentOwner` 자체의 도메인 로직(버전 비교, sourceDocument 처리 등)은 `documents.test.ts`의 책임이라 다루지 않는다.
