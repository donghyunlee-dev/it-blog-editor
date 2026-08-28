# P1-3: `confluenceRequest`에 429/5xx 대상 재시도·지수 백오프를 추가한다 — 구현 결과 보고서

## 구현 내용
`src/lib/confluence/client.ts`의 `confluenceRequest`에 재시도 루프를 추가했다.

- 재시도 대상은 **GET(멱등) 요청 + 429 또는 5xx 응답**뿐이다. `init.method`가 없거나(fetch 기본값) `"GET"`일 때만 재시도 후보로 본다 — Confluence Cloud API에 idempotency key가 없어 POST/PUT/DELETE(비멱등)를 재시도하면 실제로 이미 반영된 요청을 중복 실행할 위험이 있기 때문이다(예: 응답만 유실된 `createPage`가 재시도로 페이지를 두 번 만듦).
- 최대 3회까지 재시도한다(최초 1회 + 재시도 3회 = 최대 4회 시도). 지연은 `300ms * 2^attempt` + 0~100ms jitter의 지수 백오프이며, 429 응답에 `Retry-After` 헤더(초 단위)가 있으면 그 값을 지수 백오프 계산값 대신 그대로 사용한다.
- 재시도를 모두 소진하거나 애초에 재시도 대상이 아니면(비멱등 요청, 4xx 중 429 제외) 기존과 동일하게 `response.text()`를 읽어 `ConfluenceApiError`를 던진다 — 에러 타입·메시지 포맷·도메인 계층(`documents.ts` 등)의 404/409 처리에 변화 없음.
- `confluenceRequest` 호출부(26곳) 중 어디도 수정하지 않았다 — 재시도는 저수준 연동 계층 안에서 완결된다.
- `uploadAttachment`(별도 raw `fetch`)는 범위 밖으로 명시적으로 제외했다(task.md 참고).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/confluence/client.ts` | `confluenceRequest`에 재시도 루프(`MAX_RETRIES=3`, 지수 백오프+jitter, `Retry-After` 우선 처리) 추가. `sleep`/`isRetryableMethod`/`isRetryableStatus`/`computeDelayMs` 헬퍼 추가 |
| `src/lib/confluence/client.test.ts` | "confluenceRequest 재시도(P1-3)" describe 블록에 5개 테스트 추가(성공적 재시도, 재시도 소진, Retry-After 준수, POST 미재시도, GET 404 미재시도) |
| `docs/superpowers/tasks/P1-3-confluence-retry-backoff/{task,plan,result,test}.md` | 이 작업의 task/plan/result/test 4파일 신규 작성 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `93e4899` | fix: add retry with exponential backoff for 429/5xx on confluenceRequest |

## 자체 검토 (Self-Review)
### 긍정 사항
- P1-2b 검증 중 실제로 관측된 사례(`DELETE` 호출이 한 번 500을 반환했다가 즉시 재시도로 성공)가 이 기능의 필요성을 뒷받침한다 — 실제 문제를 해결한다.
- 재시도 대상을 GET으로 한정해, "재시도가 오히려 데이터를 더 망가뜨릴 위험"(중복 생성 등)을 원천적으로 차단했다.
- `confluenceRequest` 내부에만 로직이 있어 26개 호출부 중 어느 것도 손대지 않았다 — 회귀 위험이 낮다.

### 주의사항
- PUT으로 구현된 `updatePage`/`upsertPageProperty`/`movePage`/`restrictPageToAccount` 등은 여전히 5xx를 만나면 재시도 없이 바로 실패한다. 이는 의도된 설계(비멱등 요청 재시도 위험 회피)이지, 놓친 부분이 아니다.
- 최대 대기 시간은 지수 백오프만으로는 약 300+600+1200=2.1초(+jitter)로 짧지만, `Retry-After` 헤더가 큰 값(예: 60초)을 보내면 그만큼 사용자가 오래 기다리게 된다. 이번 범위에서는 상한(cap)을 두지 않았다 — 실사용에서 문제가 되면 후속 조치로 상한을 추가할 수 있다.

### 우려사항
- 없음.
