# P1-3: `confluenceRequest`에 429/5xx 대상 재시도·지수 백오프를 추가한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/confluence/client.test.ts` | 통과 (23/23, 신규 5건 포함) |
| `npm test`(전체) | 통과 (219/219 — 변경 전 214/214에서 5건 순증, 회귀 없음) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고: `postcss.config.js`/`tailwind.config.js`) |
| `npm run build` | 통과 — 기존 라우트 전체(`/api/health/confluence` 포함) 정상 등록 |

## 수동 검증

### 실제 Confluence 인스턴스 검증 (2026-08-28)
`.env`에 이미 구성된 서비스 계정 자격증명으로 실제 Confluence 인스턴스에 대해 확인했다(값은
읽지 않고 존재 여부만 사전 확인 — `CONFLUENCE_BASE_URL`/`CONFLUENCE_EMAIL`/`CONFLUENCE_API_TOKEN`/
`CONFLUENCE_SPACE_KEY` 모두 설정됨).

절차: `npm run dev`(포트 3100)로 dev 서버를 띄운 뒤, 기존 헬스체크 엔드포인트
`GET /api/health/confluence`(내부적으로 `getCurrentConfluenceUser()` → `confluenceRequest`를
그대로 경유하는 순수 GET 요청)를 호출했다. 이 엔드포인트는 읽기 전용이라 부작용이 없다.

결과: `{"status":"ok","user":{...}}` 형태로 정상 응답(실제 계정 정보 포함 — 개인정보라
이 문서에는 옮겨 적지 않는다). 재시도 루프를 통과한 뒤에도 정상 응답 경로(200, JSON 파싱,
반환값)가 기존과 동일하게 동작함을 확인했다 — 즉 이번 변경이 정상 경로에 회귀를 일으키지
않았다.

실제 Confluence Cloud에서 429/5xx를 의도적으로 재현하는 것은 안전하게 트리거할 방법이 없어
(레이트리밋을 실제로 유발하거나 서버 장애를 흉내낼 수 없음) 재시도 로직 자체의 정확성은
위 자동화 테스트(mock fetch + fake timer)로 검증했다. 이는 P1-2a가 실제 인스턴스로 검증하지
못했던 것과 같은 종류의 한계이며, 이번 P1-3의 필요성 자체도 P1-2b 검증 중 실제로 관측된
사례(`DELETE` 호출이 실제 인스턴스에서 한 번 500을 반환한 사례, `P1-2b-restore-deleted-document/test.md`
참고)에서 나왔다.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
