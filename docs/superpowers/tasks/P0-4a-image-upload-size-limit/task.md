# P0-4a: 이미지 업로드 최대 파일 크기를 제한한다

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 P0로 지적된 항목. `registerImage`(`src/lib/editor/images.ts`)는 MIME 타입만 검사할 뿐 파일 크기 상한이 없어, 큰 파일이 그대로 Confluence 첨부파일 API로 전달된다. 개수 상한(P0-4b, UX 가드레일)과 달리 이 항목은 실제 보안/비용 경계라 값 결정이 필요했고, [Issue #2](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/2)로 분리해뒀다.

**결정 확인**: Issue #2에 2026-08-28 "10MB로 이미지 업로드 크기를 제한한다"는 결정이 등록되어(추천안 10MB 그대로 채택), 이 값으로 착수한다.

관련 문서: [prd.md](../../../product/prd.md) Phase 4 P0-4a, [P0-4b-image-upload-count-limit/task.md](../P0-4b-image-upload-count-limit/task.md)(개수 상한과의 역할 분리 근거)

## 수용 기준 (Acceptance Criteria)
- [ ] 이미지 파일 크기가 10MB(10 * 1024 * 1024 바이트)를 초과하면 `registerImage`가 `ValidationError`(400)를 던지고, Confluence 첨부파일 업로드(`uploadAttachment`)는 호출되지 않는다.
- [ ] 10MB 이하(경계값 10MB 정확히 포함)는 기존과 동일하게 정상 업로드된다.
- [ ] 기존 MIME 타입 검사·파일 누락 검사 동작에는 변화가 없다.
- [ ] `POST /api/editor/documents/{pageId}/images` 라우트는 이 검증을 그대로 전달만 한다(라우트 자체 수정 불필요 — `toErrorResponse`가 기존처럼 `ValidationError`를 400으로 매핑).

## 결정이 필요한 사항
없음 — [Issue #2](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/2)에서 10MB로 이미 결정됨. 착수 후 이슈를 닫고 [_pending-decisions.md](../_pending-decisions.md) 상태를 갱신한다.

## 범위 밖
- 클라이언트 쪽 사전 검사(업로드 전 파일 크기를 미리 알려주는 UX)는 다루지 않는다 — 기존 MIME 타입 검사도 서버 단일 검증 지점만 두고 있어(`registerImage`), 같은 패턴을 유지한다. 서버가 어차피 formData를 파싱한 뒤 즉시 거부하므로 Confluence로의 실제 전송은 막힌다.
- Content-Length 기반의 스트림 조기 차단(파일 바이트를 다 받기 전에 거부)은 다루지 않는다 — Next.js API 라우트가 `request.formData()`로 전체 바디를 파싱하는 기존 구조를 바꿔야 해 범위를 벗어난다.
