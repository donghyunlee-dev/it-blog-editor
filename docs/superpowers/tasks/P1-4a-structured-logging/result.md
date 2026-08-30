# P1-4a: 구조화 로깅을 도입한다 — 구현 결과 보고서

## 구현 내용
`src/lib/logger.ts`를 새로 만들어 `logger.info/warn/error(message, context?)`를 제공한다. 출력은 `{level, message, timestamp, context?}` 형태의 JSON 한 줄이며, level에 따라 `console.log`/`console.warn`/`console.error`로 나간다. 별도 로깅 SaaS는 도입하지 않았다([Issue #4](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/4) 결정: "slack만 유지") — 배포 환경이 정해지면(P2-3) 표준 로그 수집기(예: CloudWatch Logs)가 이 stdout/stderr JSON을 그대로 걷어가게 하는 것이 목표다.

`serializeError(error)`도 함께 제공한다 — `Error`는 `message`/`stack`이 기본적으로 열거 불가능해 `JSON.stringify(error)`가 `{}`만 남기는 문제를 피하려고, `name`/`message`/`stack`과 `ConfluenceApiError.status`처럼 도메인별로 덧붙인 속성까지 평범한 객체로 옮긴다.

기존에 산발적으로 있던 `console.error` 4곳을 `logger.error`로 교체하고, 원인 파악에 필요한 맥락(pageId, email)을 함께 남기도록 했다:
- `api-response.ts`의 `notifyUpstreamFailure`(Slack 알림 자체 실패) — Slack 발송 로직은 그대로 두고 로그만 구조화.
- `api-response.ts`의 `toErrorResponse`(분류되지 않은 오류) — 기존엔 `error.message`만 남기고 있었는데, 이제 `serializeError(error)`로 원본 `error` 전체(예: `ConfluenceApiError.status`)를 남긴다 — 이번 작업으로 발견한 기존 로그의 정보 손실을 함께 메웠다.
- `documents.ts`의 `deleteDocument`(삭제된 문서 레지스트리 기록 실패) — `pageId` context 추가.
- `tag-suggestions.ts`(태그 자동완성 조회 실패) — `email` context 추가.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/logger.ts` | 신규 — `logger`, `serializeError` |
| `src/lib/logger.test.ts` | 신규 — 6개 테스트 |
| `src/lib/api-response.ts` | 두 `console.error`를 `logger.error`로 교체(하나는 `serializeError`로 정보 보강) |
| `src/lib/editor/documents.ts` | `deleteDocument` catch를 `logger.error` + `pageId` context로 교체 |
| `src/lib/editor/tag-suggestions.ts` | catch를 `logger.error` + `email` context로 교체 |
| `docs/product/prd.md` | P1-4a 체크리스트 완료 표시 |
| `docs/superpowers/tasks/_pending-decisions.md` | P1-4a 상태를 "반영됨"으로 갱신 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|

## 자체 검토 (Self-Review)
### 긍정 사항
- 기존 테스트(console.error를 직접 spy하던 `api-response.test.ts` 등)가 코드 수정 없이 그대로 통과했다 — JSON으로 감싼 로그 줄도 원본 메시지 문자열을 부분 문자열로 그대로 포함하기 때문이다. 회귀 위험이 낮았다.
- 작업 중 `toErrorResponse`가 기존에는 `error.message`만 로그에 남기고 `ConfluenceApiError.status` 등 나머지 정보를 버리고 있었다는 걸 발견해 함께 고쳤다 — 구조화 로깅이 실제로 디버깅 정보를 늘린 사례.

### 주의사항
- Slack 알림 로직 자체는 건드리지 않았다 — 구조화 로깅과 별개로 Slack 메시지 포맷은 이전과 동일하다.
- 실제 배포 환경(CloudWatch 등)에 이 JSON 로그가 잘 수집되는지는 검증하지 못했다 — 배포 방식(P2-3, Issue #6)이 아직 결정되지 않아 검증할 실제 환경이 없다. 형식 자체(JSON 한 줄)는 대부분의 로그 수집기가 요구하는 표준적인 형태다.
- 실제 Confluence 인스턴스 검증은 하지 않았다 — 이번 변경은 로그 포맷만 바꾸는 순수 내부 로직이라 새로운 Confluence API 가정이 없다(P0-4a와 같은 판단).

### 우려사항
- 없음.
