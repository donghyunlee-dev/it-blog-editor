# P1-9c: `documents/[pageId]/images/route.ts` 테스트를 추가한다

## 배경
- 2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 나온 항목으로, [P1-9a](../P1-9a-documents-route-test/task.md)/[P1-9b](../P1-9b-document-detail-route-test/task.md)와 같은 시리즈다.
- `src/app/api/editor/documents/[pageId]/images/route.ts`(`POST`)는 대부분의 검증(파일 누락/형식/10MB 크기 상한, P0-4a)을 `registerImage`(도메인 계층)에 위임하지만, `formData.get("file")` 값이 `File`이 아니면 `null`로 바꿔 넘기는 로직(`file instanceof File ? file : null`)은 라우트 자신이 갖고 있어 그 부분은 직접 검증한다.

## 수용 기준 (Acceptance Criteria)
- [x] 정상 요청이면 소유자를 확인한 뒤 `registerImage(pageId, file)`를 호출하고, 그 결과(`attachmentId`/`url`)를 201로 반환한다.
- [x] 소유자가 아니면 401을 반환하고 `registerImage`를 호출하지 않는다.
- [x] `formData`에 `file` 필드가 없으면(또는 File이 아닌 값이면) `registerImage(pageId, null)`로 호출한다(라우트 자신의 `instanceof File` 변환 로직 검증).
- [x] `registerImage`가 `ValidationError`를 던지면(형식/크기/누락) 400을 반환한다.

## 결정이 필요한 사항
없음.

## 범위 밖
- `registerImage`/`uploadAttachment` 자체의 검증 로직(형식·크기 상한 값)은 `images.test.ts`의 책임이라 다루지 않는다.
