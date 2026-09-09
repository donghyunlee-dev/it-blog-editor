# P1-12: 이미지 다운로드 URL 인증 문제 수정 — 구현 계획

## Global Constraints
- Confluence 저장 본문(storage format)의 `<ac:image>` 직렬화(`tiptap-to-storage.ts`)는
  `filename` 속성 기준이라 이번 변경과 무관하다 — 건드리지 않는다.
- 클라이언트 쪽(`src/lib/editor/image-upload.ts`, `RichTextEditor.tsx`)은 서버가 돌려주는
  `url`을 그대로 쓰기만 하므로 수정하지 않는다 — 서버 응답 값만 바꾼다.

## Files
- Modify: `src/lib/confluence/client.ts`(`downloadAttachment` 추가, `ConfluenceAttachment`에
  `filename` 추가)
- Modify: `src/app/api/editor/documents/[pageId]/images/route.ts`(응답 `url`을 프록시
  라우트로 변경)
- Create: `src/app/api/editor/documents/[pageId]/images/[filename]/route.ts`(새 GET 프록시)
- Modify: `src/lib/confluence/client.test.ts`, `src/app/api/editor/documents/[pageId]/images/route.test.ts`,
  `src/lib/editor/images.test.ts`(타입 변경 반영)
- Create: `src/app/api/editor/documents/[pageId]/images/[filename]/route.test.ts`
- Modify: `docs/product/api-spec.md`(이미지 업로드 응답 형식, 새 GET 엔드포인트 문서화)

## Steps
- [ ] **Step 1**: `client.ts`에 `downloadAttachment(pageId, filename)` 추가 — 파일명으로
  첨부파일을 조회(`GET .../child/attachment?filename=...`)해 최신 다운로드 링크를 얻고,
  그 링크를 다시 인증 헤더와 함께 fetch해 바이트+content-type을 반환한다.
  `ConfluenceAttachment`에 `filename` 필드도 추가한다.
- [ ] **Step 2**: 새 라우트 `images/[filename]/route.ts`의 `GET`을 추가 — 세션·문서 접근
  권한 확인 후 `downloadAttachment`를 호출해 바이트를 그대로 응답 본문으로 돌려준다.
- [ ] **Step 3**: 기존 `POST .../images/route.ts`가 `attachment.url` 대신
  `/api/editor/documents/{pageId}/images/{filename}`을 반환하도록 바꾼다.
- [ ] **Step 4**: 관련 테스트 추가·갱신 후 `npx vitest run`으로 전체 확인.
- [ ] **Step 5**: `api-spec.md` 갱신, lint·tsc·build 재확인.

## 2026-09-09 추가 — 파일명 충돌 수정
- [ ] **Step 6**: `client.ts`에 `withUniqueFilenameSuffix(filename)` 헬퍼를 추가하고,
  `uploadAttachment`가 Confluence에 보내는 파일명(`form.append`의 세 번째 인자)과
  반환하는 `filename`을 이 헬퍼로 고유화한다(원본 `File`의 바이트·MIME 타입은 그대로 —
  전송용 파일명만 바꾼다).
- [ ] **Step 7**: `client.test.ts`에 `uploadAttachment` 테스트 추가 — 고유 접미사가 붙는지,
  같은 원본 파일명이라도 매번 다른 결과가 나오는지, 업로드 실패 시 `ConfluenceApiError`를
  던지는지.
- [ ] **Step 8**: 전체 스위트·lint·tsc·build 재확인.

## 2026-09-09 세 번째 추가 — 클라이언트가 원본 파일명을 되돌려 쓰던 문제 수정
- [ ] **Step 9**: `POST .../images/route.ts`의 성공 응답에 `filename: attachment.filename`을
  추가한다.
- [ ] **Step 10**: `src/lib/editor/image-upload.ts`의 `uploadImage()`가 `file.name` 대신
  서버 응답의 `data.filename`을 반환하도록 고친다(주석의 잘못된 전제도 함께 바로잡는다).
- [ ] **Step 11**: `image-upload.test.ts`·`images/route.test.ts`를 "응답 filename ≠ 원본
  File.name"인 경우로 갱신해, 이 버그가 재발하면 테스트가 잡아내게 한다.
- [ ] **Step 12**: 전체 스위트·lint·tsc·build 재확인.
