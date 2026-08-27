# P0-6: 내부 오류 응답 새니타이즈 — 구현 결과 보고서

## 구현 내용
- `toErrorResponse`의 분류되지 않은 오류(UPSTREAM_ERROR/502) 분기에서, 클라이언트 응답 메시지를 원문 그대로 담던 것을 고정 문구("일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.")로 바꿨다.
- 원문 상세는 `console.error`로 서버 로그에 남긴다.
- Slack 알림(`notifyUpstreamFailure`)에는 지금처럼 원문을 그대로 전달한다 — 운영자 전용 채널이라 상세가 필요하다.
- 4개 도메인 에러(`UnauthorizedError`/`ValidationError`/`NotFoundError`/`ConflictError`) 분기는 건드리지 않았다 — 이미 안전한, 의도된 사용자 메시지다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/api-response.ts` | UPSTREAM_ERROR 분기 새니타이즈, `console.error` 로깅 추가 |
| `src/lib/api-response.test.ts` | 신규 — 이 파일은 지금까지 테스트가 없었다 |

## 자체 검토 (Self-Review)

### 긍정 사항
- TDD로 진행했다 — 먼저 실패를 확인한 뒤 구현했다(도메인 에러 4개 테스트는 기존 동작 그대로라 처음부터 통과, 새니타이즈 관련 3개만 의도대로 실패).
- `api-response.ts`는 모든 API 라우트가 거치는 공통 경로인데 지금까지 테스트가 없었다 — 이번에 8개 테스트로 도메인 에러 매핑 4개 + 새니타이즈 동작까지 함께 커버했다.
- 기존에 이 함수를 거치는 다른 파일들의 테스트(`DocumentEditor.test.tsx` 등)를 확인했다 — 전부 `fetch`를 직접 모킹해 API 응답을 자체적으로 구성하고 있어 `toErrorResponse`의 실제 구현과는 독립적이었고, 이번 변경으로 깨진 테스트가 없었다.

### 주의사항
- 없음.

### 우려사항
- 없음.
