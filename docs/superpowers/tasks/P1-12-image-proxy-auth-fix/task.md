# P1-12: 에디터에 삽입한 이미지가 안 보이는 문제(다운로드 URL 인증 누락) 수정

## 배경
- 사용자가 실제 Edge 브라우저로 에디터를 쓰던 중 발견해 보고: "에디터 모드에 캡쳐한 사진을
  넣으면 사진 아이콘만 보이고 실제 사진이 안 들어가."
- 원인 조사: 드래그앤드롭·붙여넣기·슬래시 메뉴("이미지") 세 경로 모두 `POST
  /api/editor/documents/{pageId}/images`로 파일을 업로드하고, 응답의 `url`을 그대로 TipTap
  이미지 노드의 `src`로 쓴다(`RichTextEditor.tsx`의 `insertUploadedImage`). 그런데 그 `url`은
  `uploadAttachment`(`src/lib/confluence/client.ts`)가 Confluence API 응답의
  `_links.download`를 그대로 이어붙인 **Confluence 원본 다운로드 링크**였다 — 이 앱은 서버가
  API 토큰(Basic Auth)으로만 Confluence를 대신 호출할 뿐, 브라우저에는 그 자격증명이 전혀
  없다. 브라우저의 `<img src>`가 이 URL을 직접 요청하면 인증 없이 나가므로 Confluence가
  거부하고, 결과적으로 깨진 이미지(사진 아이콘)만 보인다.
- 이미지 노드의 JSON(`sourceDocument.doc`)에는 이 깨진 `src`가 그대로 저장되므로, 즉시
  미리보기뿐 아니라 문서를 다시 열 때도 계속 깨져 보인다(단, Confluence에 저장되는 실제
  본문(storage format)은 `filename` 속성 기준의 `<ac:image><ri:attachment .../></ac:image>`
  매크로를 쓰므로 — `tiptap-to-storage.ts` 참고 — **Confluence 페이지 자체를 직접 열어보면
  이미지가 정상 표시된다**. 깨지는 건 에디터 화면(TipTap 미리보기)뿐이다).
- 이 항목은 원래 "이미지 첨부"(Phase 0/1, `docs/product/prd.md` 251번째 줄)로 이미 완료
  표시돼 있던 기능의 실사용 버그다 — 새 Phase 없이 P1 번호를 이어 P1-12로 기록한다.

## 수용 기준 (Acceptance Criteria)
- [ ] `POST /api/editor/documents/{pageId}/images`가 반환하는 `url`이 Confluence 원본 링크가
      아니라, 브라우저가 인증 없이도 열 수 있는 우리 앱 자신의 라우트를 가리킨다.
- [ ] 새 라우트 `GET /api/editor/documents/{pageId}/images/{filename}`가 서버(API 토큰
      인증)를 대신 거쳐 Confluence 첨부파일 바이트를 그대로 내려준다.
- [ ] 그 라우트는 다른 문서 API와 동일하게 로그인 세션을 요구하고, 소유자뿐 아니라 공유받은
      사람도 볼 수 있다(`requireDocumentAccess`, P6-6과 같은 기준).
- [ ] Confluence에 저장되는 본문(storage format)의 `<ac:image>` 직렬화는 이번 변경으로
      전혀 바뀌지 않는다(계속 `filename` 속성 기준 — `src` 값과 무관).
- [ ] 기존 `uploadImage`(클라이언트) 쪽 코드는 수정 없이 그대로 동작한다 — 서버가 돌려주는
      `url` 값만 바뀌므로 클라이언트는 그 값을 그대로 쓰기만 하면 된다.

## 결정이 필요한 사항
없음 — 서버가 이미 갖고 있는 Confluence 인증을 대신 거쳐 전달하는 프록시는 아키텍처상
자연스러운 해법이라 GitHub Issue 없이 직접 정한다.

## 범위 밖
- **이미 저장된 기존 문서**의 이미지 노드는 깨진 원본 URL을 여전히 그대로 갖고 있어, 이
  수정 이후에도 다시 열면 계속 깨져 보인다(재업로드해야 정상화된다) — 저장된 문서를
  일괄 마이그레이션하는 것은 이번 범위가 아니다. 다만 이 세션에서 실제로 브라우저를 통해
  이미지를 성공적으로 삽입해본 사례가 이전에 없었던 것으로 보여(관련 작업 문서마다 "AX
  Auth 로그인 제약으로 실제 화면 확인 못함"이 반복됨), 실제로 영향받는 기존 문서가
  존재할 가능성은 낮게 본다.
- 클립보드로 붙여넣은 이미지의 파일명이 비어있거나 같은 문서에서 중복될 때 Confluence가
  같은 파일명의 첨부를 새 버전으로 덮어써 버릴 수 있는 문제(파일명 충돌)는 이번 버그와는
  별개의 잠재적 문제로, 이번 수정 범위가 아니다.
- Word/Google Docs에서 붙여넣은 리치 HTML에 포함된 외부 `<img>` 참조가 안 보이는 문제
  (P1-7d에서 이미 원인만 확인하고 범위 밖으로 남겨둔 별개 이슈)는 이 항목과 무관하다.
