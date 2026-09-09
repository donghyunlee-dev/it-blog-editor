# P1-12: 이미지 다운로드 URL 인증 문제 수정 — 구현 결과 보고서

## 구현 내용
- `src/lib/confluence/client.ts`에 `downloadAttachment(pageId, filename)`을 추가했다 —
  파일명으로 첨부파일을 조회해 최신 다운로드 링크를 얻고, 그 링크를 다시 서버의 API 토큰
  인증으로 fetch해 바이트+`Content-Type`을 반환한다. 링크를 업로드 시점에 저장해두는 대신
  매번 파일명으로 다시 찾아, 버전 등 쿼리 파라미터가 낡는 문제를 피했다. `uploadAttachment`가
  반환하는 `ConfluenceAttachment`에도 `filename`을 추가했다(POST 라우트가 프록시 URL을
  만들 때 필요).
- 새 라우트 `GET /api/editor/documents/{pageId}/images/{filename}`을 추가했다 — 다른 문서
  API와 동일하게 세션·문서 접근 권한(`requireDocumentAccess`, 소유자·공유받은 사람 모두
  허용)을 확인한 뒤 `downloadAttachment`로 받은 바이트를 그대로 응답 본문으로 돌려준다.
- 기존 `POST .../images/route.ts`가 `registerImage`(→`uploadAttachment`)의 Confluence 원본
  다운로드 URL을 그대로 돌려주던 것을, 위 새 프록시 라우트를 가리키는 상대 경로로 바꿨다 —
  클라이언트(`uploadImage`, `insertUploadedImage`)는 그 값을 그대로 `<img src>`에 쓰기만
  하므로 수정하지 않았다.
- Confluence에 저장되는 실제 본문(`tiptap-to-storage.ts`의 `<ac:image>` 직렬화)은 여전히
  `filename` 속성 기준이라 이번 변경과 무관함을 코드로 재확인했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/confluence/client.ts`, `.test.ts` | `downloadAttachment` 추가, `ConfluenceAttachment.filename` 추가 |
| `src/app/api/editor/documents/[pageId]/images/route.ts`, `.test.ts` | 응답 `url`을 프록시 라우트로 변경 |
| `src/app/api/editor/documents/[pageId]/images/[filename]/route.ts`, `.test.ts` | 신규 GET 프록시 |
| `src/lib/editor/images.test.ts` | `ConfluenceAttachment` 타입 변경(`filename` 추가) 반영 |
| `docs/product/api-spec.md` | 이미지 업로드 응답 형식·새 GET 엔드포인트 문서화 |
| `docs/superpowers/tasks/P1-12-image-proxy-auth-fix/{task,plan,result,test}.md` | 신규 |
| `docs/product/prd.md` | P1-12 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | fix: 에디터에 삽입한 이미지가 안 보이는 문제 수정 (P1-12) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 근본 원인(브라우저에 Confluence 인증 자격증명이 없다는 것)까지 코드로 추적해, 증상만
  가리는 임시방편이 아니라 아키텍처적으로 올바른 해법(서버 프록시)을 택했다.
- Confluence에 저장되는 본문 직렬화(`ac:image`/`ri:attachment`)는 애초에 `filename` 기준
  이라 이번 변경과 무관하다는 것을 코드로 직접 확인해, "저장은 되는데 에디터 미리보기만
  깨진다"는 증상과 원인이 정확히 들어맞음을 검증했다.
- `downloadAttachment`가 업로드 시점 링크를 캐싱하지 않고 매번 파일명으로 다시 찾게 해,
  Confluence 다운로드 링크의 쿼리 파라미터(버전 등)가 시간이 지나 낡아도 안전하다.

### 주의사항
- **이미 저장된 기존 문서의 이미지는 이 수정 이후에도 계속 깨져 보인다** — `sourceDocument.doc`
  에 저장된 옛 `src`(Confluence 원본 URL)가 그대로 남아있기 때문이다. `task.md`의 "범위 밖"에
  근거를 남겼다 — 이 세션 이전에 실제 브라우저로 이미지 삽입이 성공적으로 확인된 사례가
  없어(관련 작업 문서마다 "AX Auth 로그인 제약으로 확인 못함" 반복), 실제 영향받는 문서가
  존재할 가능성은 낮다고 판단했다. 사용자가 기존 문서에서도 이미지가 깨져 보인다고 하면
  별도로 재업로드를 안내하거나, 필요 시 마이그레이션을 추가로 논의한다.
- 클립보드 붙여넣기 파일명 충돌(같은 문서에 같은 파일명으로 두 번 업로드 시 Confluence가
  새 버전으로 덮어쓸 수 있는 문제)은 이번 버그와 별개로 존재할 수 있는 잠재 이슈로 남겨뒀다
  (`task.md` "범위 밖" 참고) — 이번 보고와는 무관해 손대지 않았다.

### 우려사항
- 없음.

## 후속 수정(2026-09-09, 머지 후 실사용 재확인 중 발견)
프록시 라우트를 머지한 뒤 사용자가 실제 Edge에서 재확인하다 두 번째 문제에 부딪혔다 —
캡쳐한 스크린샷을 붙여넣으면 업로드 자체가 `400 Bad Request`로 실패했다:
`"Cannot add a new attachment with same file name as an existing attachment: image.png"`.
`task.md`의 "범위 밖"에 잠재 위험으로 남겨뒀던 파일명 충돌 문제가 실제로 발생한 것이다.

**원인**: 클립보드로 붙여넣은 스크린샷은 브라우저/OS가 `image.png`처럼 특징 없는 이름을
붙이는 경우가 많은데, `uploadAttachment`가 `file.name`을 그대로 Confluence 첨부파일명으로
써서 같은 문서에 그 이름의 첨부가 이미 있으면(예: 이전에 붙여넣은 다른 스크린샷) Confluence
가 업로드 자체를 거부했다.

**조치**: `client.ts`에 `withUniqueFilenameSuffix(filename)`을 추가해 매번 짧은 고유 접미사
(타임스탬프+랜덤 문자열)를 붙인 파일명으로 Confluence에 업로드하고, 그 파일명을 그대로
`ConfluenceAttachment.filename`으로 반환한다 — 원본 `File`의 바이트·MIME 타입은 그대로 두고
전송용 파일명만 바꾼다. 파일명은 이 앱의 어떤 화면에도 사용자에게 노출되지 않아(내부
식별·Confluence storage 매크로 참조용) 안전하게 바꿀 수 있음을 grep으로 확인했다.

**재검증 결과**: `npx vitest run`(전체 스위트, 55 파일/507건)·`npm run lint`·
`npx tsc --noEmit`·`npm run build` 모두 통과. 실제 재확인은 사용자가 Edge에서 다시 진행한다.

## 세 번째 후속 수정(2026-09-09, 파일명 충돌 수정의 부작용으로 발견)
파일명 충돌 수정을 머지한 뒤 사용자가 다시 확인하다 "Confluence 페이지를 직접 열어보니
에디터와 완전히 다른(무관한) 사진이 보인다"고 보고했다. 사용자의 실제 문서(pageId
`221347841`)를 조사 스크립트로 직접 살펴봤다.

**원인**: `sourceDocument`(TipTap JSON)의 이미지 노드 3개 모두 `src`는 각자 정확한 고유
URL을 가리켰지만(그래서 에디터 미리보기는 맞았다), `filename` 속성은 셋 다 그냥
`"image.png"`였다 — `image-upload.ts`의 `uploadImage()`가 서버 응답의 `filename`을 쓰지
않고 원본 `File.name`을 그대로 돌려주는 문제가 남아있었다(파일명 충돌 수정 당시 서버
(`uploadAttachment`)만 고치고 클라이언트를 함께 고치지 않은 실수). 그 결과 저장된
Confluence storage format이 `<ac:image ri:filename="image.png">`를 세 번 반복했고, 이는
파일명 충돌 수정 이전에 만들어진 진짜 "image.png"라는 이름의 옛 첨부파일 하나를 가리켜,
Confluence 페이지를 직접 열면 최근에 붙여넣은 사진이 아니라 그 무관한 옛 첨부파일이 세 번
반복해서 보였다.

**조치**: `POST .../images` 응답에 `filename`(서버가 실제로 저장한 고유 파일명)을 추가하고,
`uploadImage()`가 `file.name` 대신 그 값을 그대로 반환하도록 고쳤다.

**재검증 결과**: `image-upload.test.ts`·`images/route.test.ts`에 "응답 filename이 원본
File.name과 다른 경우"를 명시적으로 검증하는 테스트로 갱신 — 10/10 통과. 전체 스위트 55
파일/507건, lint·tsc·build 모두 통과.

**남은 것**: 사용자의 실제 문서(pageId `221347841`)에는 이미 잘못된 `filename="image.png"`
가 3번 저장돼 있다 — 코드 수정은 향후 업로드에만 적용되고, 이 기존 문서의 데이터 자체를
고치는 것은 실제 Confluence 쓰기가 필요해 사용자 승인 후 별도로 진행한다(P1-11과 같은
판단 기준).

## 네 번째 조정(2026-09-09, 사용자 요청 — 고유 접미사를 UUID로)
`withUniqueFilenameSuffix`가 처음엔 `Date.now().toString(36)` + 4자리 랜덤 문자열을
접미사로 썼는데, 사용자가 "파일 이름에도 uuid 같은 겹치지 않는 파일명을 추가해야 할 것
같다"고 요청했다. `documents.ts`가 Confluence 페이지 title의 전역 유일성을 확보하려
`randomUUID()`(Node `crypto`)를 이미 같은 목적으로 쓰고 있어(`internalKey`), 새 스킴을
만드는 대신 그 선례를 그대로 재사용했다 — `withUniqueFilenameSuffix`가 이제
`randomUUID()`를 접미사로 붙인다. 관련 테스트의 정규식도 UUID 형식(`[0-9a-f]{8}-...`)에
맞춰 갱신했다.

