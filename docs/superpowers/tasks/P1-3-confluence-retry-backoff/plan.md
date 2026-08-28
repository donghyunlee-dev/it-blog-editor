# P1-3: `confluenceRequest`에 429/5xx 대상 재시도·지수 백오프를 추가한다 — 구현 계획

> `task.md`의 수용 기준을 만족하는 구현 접근.

## Global Constraints
- `ConfluenceApiError`의 생성자 시그니처·메시지 포맷은 그대로 유지한다 — 도메인 계층(`src/lib/editor/documents.ts` 등)이 `error.status`로 404/409를 구분하는 기존 코드를 건드리지 않는다.
- 재시도는 `init.method`가 없거나(fetch 기본값 GET) `"GET"`인 요청에만 적용한다. `listChildPages`/`listPageVersions`/`listAllSpacePages`/`buildSlugIndex` 등 페이지네이션 루프는 각 페이지 요청이 개별 GET이므로 자동으로 이득을 본다.
- 테스트는 실제 시간을 기다리지 않는다 — `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()`로 지연을 즉시 통과시킨다.
- 재시도 로직은 `confluenceRequest` 내부에만 존재해야 한다(호출부 26곳을 개별 수정하지 않는다) — 저수준 연동 계층 안에서 완결되어야 한다는 기존 아키텍처 원칙(architecture.md의 계층 원칙)을 따른다.

## Files
- Modify: `src/lib/confluence/client.ts` — `confluenceRequest`에 재시도 루프 추가
- Modify: `src/lib/confluence/client.test.ts` — 재시도 동작 테스트 추가

## Steps
- [ ] **Step 1**: `confluenceRequest` 안에 재시도 판단 함수를 추가한다 — `shouldRetry(method, status)`는 `(method === undefined || method === "GET") && (status === 429 || status >= 500)`일 때만 `true`. 재시도 루프는 최대 3회(`MAX_RETRIES = 3`), 시도 간 지연은 `baseDelayMs(300) * 2 ** attempt` + 0~100ms 랜덤 jitter로 계산하는 `sleep` 유틸을 같은 파일에 둔다.
- [ ] **Step 2**: 429 응답의 `Retry-After` 헤더(초 단위 정수 가정)를 읽어 있으면 그 값(ms 변환)을 지수 백오프 계산값 대신 사용하도록 분기를 추가한다.
- [ ] **Step 3**: 재시도를 모두 소진했을 때는 기존과 동일하게 `response.text()`를 읽어 `ConfluenceApiError`를 던지도록 하고(현재 로직 재사용), 재시도 가능 조건이 아닌 실패(4xx 등)는 첫 시도에서 바로 그 경로로 빠지게 한다. `npm test -- client.test.ts`로 기존 테스트 전체가 그대로 통과하는지 확인한다.
- [ ] **Step 4**: `client.test.ts`에 다음 케이스를 추가한다(모두 `vi.useFakeTimers()` 사용):
  - GET 요청이 500 → 500 → 200 순서로 응답하면 세 번째 시도에서 성공하고 최종 결과가 정상 반환되는지
  - GET 요청이 계속 503을 반환하면 4번째(최초 1회 + 재시도 3회) 시도 후 `ConfluenceApiError`를 던지는지, 그리고 `fetch`가 정확히 4번 호출됐는지
  - 429 응답에 `Retry-After: "2"` 헤더가 있으면 재시도 전 대기 시간이 그 값을 따르는지(타이머 advance 검증)
  - POST 요청(`createPage` 등 기존 함수 경유)이 500을 받으면 재시도 없이 즉시 `ConfluenceApiError`를 던지는지
  - GET 요청이 404를 받으면 재시도 없이 즉시 던지는지(회귀 방지 — 기존 도메인 에러 구분에 영향 없음 확인)
  `npm test -- client.test.ts`로 검증.
- [ ] **Step 5**: `npm run lint`와 `tsc --noEmit`(또는 프로젝트의 타입체크 스크립트)로 전체 회귀를 확인한다.

각 Step은 `npm test -- client.test.ts`로 검증 가능한 단위로 쪼갰다.
