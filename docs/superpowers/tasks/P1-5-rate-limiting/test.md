# P1-5: 민감 API 엔드포인트에 레이트리밋을 추가한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run "src/lib/rate-limit.test.ts"` | 통과 (5/5) |
| `npx vitest run "src/app/api/editor/documents/route.test.ts"` | 통과 (8/8, 신규 1건 포함) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/images/route.test.ts"` | 통과 (5/5, 신규 1건 포함) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/publish/route.test.ts"` | 통과 (3/3, 신규 1건 포함) |
| `npm test` (전체) | 통과 (336/336) |
| `npm run lint` | 통과 (기존 무관 경고 2건만 남음) |
| `npm run build` | 통과 |

## 수동 검증 (필요 시)
불필요 — 순수 유닛/라우트 테스트로 충분히 검증된다(고정 윈도우 로직 자체가 시간 의존적이라 `now` 주입으로 결정적 테스트를 확보했다).

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음 — 이번 작업 전 대화로 임계값(사용자당 분당 30회)을 이미 확정했다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
