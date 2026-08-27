# P0-5a: slug 중복 검사 반복 비용을 캐시로 완화 — 구현 결과 보고서

## 구현 내용
- `client.ts`의 `findPublishedPageBySlug`를 재작성했다 — 기존에는 특정 slug 하나를 찾을 때까지 Space를 스캔했는데, 이제는 **게시 중인 모든 문서의 `{viewerId}:{slug}` → 페이지** 전체를 한 번에 인덱싱(`buildSlugIndex`)해서 모듈 레벨 캐시(`slugIndexCache`, TTL 15초)에 담아 둔다. 캐시가 없거나 spaceId가 다르거나 TTL이 지났을 때만 다시 스캔하고, 그 외에는 `Map.get`으로 즉시 응답한다.
- `invalidateSlugIndexCache()`(신규 export)를 `publish.ts`의 게시 성공 경로(`upsertPageProperty(PUBLISH_PROPERTY_KEY, ...)` 직후)에서 호출해, 이 프로세스가 방금 쓴 slug를 스스로 놓치는 일이 없게 했다.
- 테스트 전용 `__resetSlugIndexCacheForTests()`를 export해 `client.test.ts`의 `beforeEach`에서 호출한다 — 이름에 `ForTests`를 넣어 프로덕션 코드에서 잘못 쓰이지 않게 했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/confluence/client.ts` | `findPublishedPageBySlug` 캐시 재작성, `invalidateSlugIndexCache`/`__resetSlugIndexCacheForTests` 추가 |
| `src/lib/confluence/client.test.ts` | 신규 캐시 동작 테스트 3개, `beforeEach`에 캐시 리셋 추가 |
| `src/lib/editor/publish.ts` | 게시 성공 시 `invalidateSlugIndexCache()` 호출 |
| `src/lib/editor/publish.test.ts` | 신규 테스트 1개 |

## 자체 검토 (Self-Review)

### 긍정 사항
- TDD로 진행했다 — `client.test.ts`/`publish.test.ts` 모두 먼저 실패를 확인한 뒤 구현했다.
- 기존 `findPublishedPageBySlug` 시그니처·반환 타입을 그대로 유지해 `publish.ts` 호출부를 전혀 바꾸지 않았다.
- 캐시 검증 중 발견한 함정을 재사용 가능한 형태로 남겼다 — 기존 두 개의 `findPublishedPageBySlug` 테스트(둘 다 spaceId="1")가 모듈 레벨 캐시 도입으로 서로 오염될 뻔한 것을 `beforeEach` 리셋으로 미리 막았고, 이 패턴은 앞으로 이 파일에 캐시를 더 추가할 때도 그대로 재사용할 수 있다.

### 주의사항
- **완전한 정확성을 보장하지 않는다** — `task.md`에 명시한 대로, 이 프로세스가 아닌 다른 프로세스/인스턴스가 TTL(15초) 안에 새로 게시한 slug는 캐시가 알아채지 못할 수 있다. 사용자 규모("조직·다수(10명+)")와 게시 빈도를 고려하면 실제 충돌 확률은 낮다고 판단했지만, 완전한 해결은 아니다 — 근본적인 구조 개선은 P0-5b(Issue #3)의 몫이다.
- TTL 테스트(`vi.useFakeTimers()`)는 `Date.now()`를 가짜 타이머로 흘려보내는 방식이라, 실제 시스템 시계가 아니라 `client.ts`가 `Date.now()`를 직접 참조하는 구조에 의존한다 — 향후 시간 소스를 바꾸면(예: 주입 가능한 clock) 이 테스트도 함께 손봐야 한다.

### 우려사항
- 없음.
