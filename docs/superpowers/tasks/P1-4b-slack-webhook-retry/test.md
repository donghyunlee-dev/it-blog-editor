# P1-4b: Slack 웹훅 전송 자체가 실패할 때의 재시도/폴백을 추가한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/notifications/slack.test.ts` | 통과 (6/6, 이 파일의 첫 테스트) |
| `npm test`(전체) | 통과 (232/232 — 변경 전 226/226에서 6건 순증, 회귀 없음) |
| `npx tsc --noEmit` | 통과(처음 시도에서 mock 함수 인자 타입 미지정으로 `fetchMock.mock.calls[0]`가 빈 튜플로 추론되는 오류가 있어, 다른 테스트 파일들과 같은 방식으로 `(_url: string, _init?: RequestInit)` 타입을 명시해 해결) |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
실제 Slack 웹훅으로 정상 전송이 되는지는 P1-4a PR 검증 때 이미 확인했다(`[TEST]` 라벨을 붙인 메시지 전송, 200 OK 확인). 이번 변경은 그 성공 경로를 바꾸지 않고 실패 시 재시도 루프만 추가하는 것이라, 정상 케이스에 대한 재검증은 다시 하지 않았다.

재시도 로직 자체(429/5xx 재시도, `Retry-After` 준수, 4xx 즉시 실패, 재시도 소진)는 실제 Slack 서버의 오류 응답을 안전하게 재현할 방법이 없어 mock 기반 단위 테스트로 검증했다 — 이 정책은 이미 P0-7/P1-3에서 실제 인스턴스(Confluence)로 같은 알고리즘을 검증한 적이 있어, Slack에 대해서도 추가 실제 검증 없이 충분하다고 판단했다(HTTP 상태 코드 기반 재시도는 대상 서비스가 Confluence든 Slack이든 동일한 표준 동작을 전제로 한다).

## 발견된 문제와 조치
- **원인**: `slack.test.ts`의 `fetchMock`을 인자 타입 없이 `vi.fn(async () => ...)`로 선언해, TypeScript가 콜백 시그니처를 `() => ...`로 추론했다. 이 때문에 `fetchMock.mock.calls[0]`의 타입이 길이 0인 튜플이 되어 `const [url, init] = ...` 구조분해에서 `TS2493`/`TS18048` 오류가 났다.
- **조치**: 다른 테스트 파일들의 관례대로 `vi.fn(async (_url: string, _init?: RequestInit) => ...)`로 인자 타입을 명시했다.
- **재검증 결과**: `npx tsc --noEmit` 통과.

## 검증 중 새로 발견한 결정 사항
없음. 다만 `notifyUpstreamFailure`가 이 재시도를 `await`한 채로 API 응답 생성 경로에 있어, Slack이 느리게 응답하거나 `Retry-After`로 긴 대기를 요구하면 사용자에게 가는 502 응답도 그만큼 지연될 수 있다는 점을 확인했다 — 의도적으로 고치지 않았다(`result.md` "주의사항" 참고: 서버리스 환경에서 응답 전에 await하지 않으면 알림 자체가 유실될 수 있어, 지금 단계에서는 지연을 감수하는 쪽이 안전하다고 판단).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
