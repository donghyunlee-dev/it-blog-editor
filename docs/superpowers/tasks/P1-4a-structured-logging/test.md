# P1-4a: 구조화 로깅을 도입한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/logger.test.ts` | 통과 (6/6, 신규) |
| `npx vitest run src/lib/api-response.test.ts src/lib/editor/documents.test.ts src/lib/editor/tag-suggestions.test.ts` | 통과 (38/38, 기존 테스트 수정 없이 그대로 통과) |
| `npm test`(전체) | 통과 (226/226 — 변경 전 220/220에서 6건 순증) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
실제 Confluence 인스턴스 검증은 하지 않았다. 이번 변경은 로그 출력 형식(문자열 → JSON 한 줄)만 바꾸는 순수 내부 로직이고, Confluence API 호출이나 응답 처리 자체는 전혀 건드리지 않아 새로운 API 가정이 없다고 판단했다(P0-4a와 동일한 근거).

출력이 실제로 유효한 JSON 한 줄인지는 `logger.test.ts`에서 `JSON.parse(spy.mock.calls[0][0])`로 파싱해 필드(level/message/timestamp/context)를 검증하는 방식으로 확인했다(위 자동화 테스트 참고) — 별도 수동 확인은 추가로 하지 않았다.

## 발견된 문제와 조치
- **원인**: 없음(회귀 없이 진행됨).
- 참고: 작업 중 `toErrorResponse`가 기존에 `error.message`만 로그에 남기고 `ConfluenceApiError.status` 등을 버리고 있던 정보 손실을 발견해 `serializeError`로 함께 고쳤다(버그라기보다 이번 작업의 목적에 부합하는 개선).

## 검증 중 새로 발견한 결정 사항
없음 — Issue #4에서 이미 결정됨.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
