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
